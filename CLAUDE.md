# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

HomeCart (formerly "Cartographer" — the repo dir name still reflects the old brand) is a hackathon-won, Android-only React Native app that helps immigrants navigate US grocery shopping. Three flows: **Magic Lens** scan (camera → cultural equivalent JSON), **Recipe Importer** (dish name → ingredient list with availability classification), **Cultural Map** (Google Places with cuisine + product-aware ranking). The hackathon is done; the repo is now in **polish-and-ship** mode targeting a LinkedIn launch via Android sideload.

Distribution model: signed APKs from EAS Build (no Play Store). Two build profiles live in `app/frontend/eas.json` — `preview` (shared-quota path, uses operator's OpenRouter key, 10 scans + 3 recipes per user per day) and `byok-preview` (`EXPO_PUBLIC_BYOK_ONLY=true`, blocks main UI until user supplies their own LLM key). One bundle ID (`com.homecart.app`) for both.

## High-level architecture

Three deployable surfaces, one Postgres schema, one budget envelope to protect:

**`app/backend/`** — FastAPI on Render free tier at `https://homecart-backend.onrender.com`. Three real endpoints:
- `POST /scan` — vision LLM call returning structured JSON about a product image
- `POST /recipe` — text LLM call returning structured JSON ingredients for a dish
- `POST /stores/nearby` — Google Places (New) Text Search with cuisine + product-aware ranking

UptimeRobot pings `/healthz` every 5 min to fight Render's 15-min idle spin-down. Render reads `app/backend/render.yaml` as a Blueprint on push to `main`.

**`app/frontend/`** — Expo SDK 54 / React Native 0.81 / `react-native-maps` 1.27 (1.20 had the Android view-marker rendering bug). New Architecture is enabled in `app.json`; `app.config.js` deliberately does NOT override it. Tab navigator with 5 tabs (`Home`, `Map`, `MagicLens` center FAB, `List`→labelled "Recipes", `Profile`). `App.tsx` gates rendering on: auth state → profile loaded → onboarding complete → (if `BYOK_ONLY`) BYOK configured → MainTabNavigator.

**`app/migrations/`** — Numbered SQL files (`001` → `005`) applied manually to Supabase via the SQL editor. There is no migration runner; commit order is human-enforced. `005_daily_usage.sql` is the rate-limit table; **must be applied to Supabase before the backend's `_enforce_daily_quota` will work**.

### Critical cross-cutting flows

**BYOK headers** — `app/frontend/lib/api.ts` `apiFetch()` automatically attaches `X-User-LLM-Key`, `X-User-LLM-Vision-Model`, `X-User-LLM-Text-Model`, `X-User-GCP-Key`, `X-User-Tavily-Key`, `X-User-Firecrawl-Key`, `X-User-Id` to every backend call. Values come from SecureStore (hardware-backed: Android Keystore / iOS Keychain) via `lib/byok.ts`. Backend `get_byok` dependency in `main.py` extracts them; `providers.py` routes by key prefix (`sk-ant-` → Anthropic native Messages API, `sk-or-` → OpenRouter, `sk-` → OpenAI direct).

**Parameter normalization** in `providers.py` `_normalize_openai_body()` — OpenAI reasoning models (o-series, all GPT-5.x matching the regex `(^|/)(o[1-9](-|$)|gpt-5(\.|$|-))`) reject `max_tokens` (use `max_completion_tokens`) and `temperature`; Gemini models reject `frequency_penalty`, `presence_penalty`, `n`, `logprobs`. **Never bypass this normalizer** when adding new providers or models.

**Rate limiting** — `main.py` `_enforce_daily_quota(user_id, kind)` is called BEFORE every LLM call, but ONLY when `byok.llm_key` is empty. BYOK users have unlimited usage (they pay their own provider). Reads + upserts the `daily_usage` table; raises 429 with `{error: "quota_exceeded", suggest_byok: true, ...}` when over. Frontend `MagicLensScreen.tsx` and `ListScreen.tsx` catch 429 and show a friendly modal pointing the user to Settings.

**Provider defaults vs user-selected models** — `PROVIDER_DEFAULTS` in `providers.py` defines the fallback model per (provider, kind=vision|text). User-supplied `X-User-LLM-Vision-Model` / `X-User-LLM-Text-Model` headers override these. Current free-tier defaults: `openai/gpt-5.4-nano` (vision) + `deepseek/deepseek-v4-flash` (text) via OpenRouter — chosen for ~13× cost reduction vs Claude defaults without sacrificing reliability on cultural-grocery classification.

**Store ranking** — `main.py` `stores_nearby` is product-context-aware. `availability_breadth` ∈ `{mainstream, both, specialty_only}` determines weighting: specialty-only products penalize non-specialty stores by 60; mainstream products drop specialty-tier bonuses; "both" sorts pure-distance-first with authenticity as tiebreaker. Recipe coverage flow ranks by `(matched_items DESC, distance ASC)`.

## Common commands

### Backend (run from `app/backend/`)

```bash
source venv/bin/activate                                  # activate the existing venv
uvicorn main:app --host 0.0.0.0 --port 8000 --reload      # local dev (LAN-accessible for device testing)
python seed_chains.py                                     # populate chain_personas table (idempotent)
python seed_equivalences.py                               # populate equivalences seed data
```

`.env` lives at `app/backend/.env` (gitignored) and must contain `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_MAPS_API_KEY`. Same vars must be set in the Render dashboard for production.

There are no tests in this repo — `_classify_chain`, `_haversine`, and the parameter normalizer are exercised only via real API calls.

### Frontend (run from `app/frontend/`)

```bash
npx expo start --dev-client          # Metro bundler; for use with a dev-build APK on device
npx expo start --tunnel              # if LAN routing is broken; serves over ngrok
npx tsc --noEmit                     # type-check (note: @expo/vector-icons resolution errors are pre-existing tsc-only noise; ignore)
```

### EAS Build (run from `app/frontend/`)

The EAS CLI has a known LRU constructor bug at v17+. **Always pin to v16:**

```bash
npx --yes eas-cli@16 build --profile development --platform android   # dev build with LAN backend
npx --yes eas-cli@16 build --profile preview      --platform android  # shared-quota APK (Render backend, rate-limited)
npx --yes eas-cli@16 build --profile byok-preview --platform android  # BYOK-only APK (LinkedIn distribution)
npx --yes eas-cli@16 build:list                                       # find install URLs for past builds
npx --yes eas-cli@16 env:list   --environment development             # see EAS-side env vars
npx --yes eas-cli@16 env:create --environment development --name GOOGLE_MAPS_API_KEY --visibility sensitive
```

Local keystore lives at `app/frontend/credentials/keystore.jks` (gitignored) — referenced by `credentials.json`. **If lost, you can never push updates to existing installs.** Back it up.

### Migrations

Open Supabase SQL editor → paste the contents of `app/migrations/00X_*.sql` → Run. Numbered files are applied in order, but `001` is destructive (`DROP TABLE`) — assume only later migrations need re-running.

### Production deploy

`git push homecart dev:main` triggers Render auto-deploy via the Blueprint. The `homecart` remote points at `https://github.com/p-kowadkar/HomeCart`. The `origin` remote points at the original hackathon team repo (`saumaykilla/Cartographer`, dev branch). Push to both when shipping anything user-facing.

## Conventions and gotchas

**Two git remotes, different default branches.** `origin` uses `dev`; `homecart` uses `main`. Use `git push origin dev && git push homecart dev:main`. Don't accidentally rebase the divergent histories — they share only the file tree, not the branch model.

**Repo dir vs product name.** The folder is still `Cartographer/`. The bundle ID, EAS slug, and display name are `homecart` / `HomeCart`. Don't rename the folder — too many tools (EAS, Render, IDE workspace) have absolute paths baked in.

**No backend-side migration runner.** When you add a new `.sql` file to `app/migrations/`, you must apply it to Supabase manually before deploying backend code that depends on it. The `daily_usage` rate-limit gate WILL crash with `relation "daily_usage" does not exist` if migration 005 isn't applied yet.

**`@app.get` does NOT auto-handle HEAD in FastAPI.** UptimeRobot's free tier sends HEAD only. `/healthz` uses `@app.api_route(["GET", "HEAD"])` — preserve this if refactoring.

**Reasoning model parameters.** All GPT-5.x and o-series models require `max_completion_tokens` (not `max_tokens`) and reject `temperature`. The regex in `providers.py:_OPENAI_REASONING_RE` catches them — update the regex, not the call sites, when new families ship.

**SecureStore can throw at startup.** `App.tsx` calls `loadByokKeys()` when `BYOK_ONLY=true`; if SecureStore fails (corrupted entry, expo-secure-store version mismatch, etc.) it can crash on mount. If debugging a launch crash, check `adb logcat | grep -i "homecart\|reactnative\|securestore"` for the underlying error before assuming a JS bug.

**Free-tier API ceilings.** OpenRouter spending cap is the real safety net (set at $20). Google Maps free tier is generous ($200/mo, ~6000 Places searches). Render free tier: 750 hrs/mo + 15-min idle spin-down (UptimeRobot pings every 5 min). Supabase free tier: 50k MAU, 500MB DB.

**Hackathon-era code in `prd/` and `plan/`.** These are historical design docs from the hackathon, not current spec. Don't update them when shipping new features; they're frozen artifacts.

## Files most likely to need editing for common tasks

| Task | Touch |
|---|---|
| New LLM endpoint or model | `app/backend/providers.py` (defaults + adapter), `app/frontend/lib/models.ts` (curated list) |
| New BYOK provider | `app/backend/providers.py` `detect_provider` + `PROVIDER_DEFAULTS`, `app/frontend/lib/byok.ts` `detectLLMProvider`, `app/frontend/lib/models.ts` (model list) |
| New backend endpoint | `app/backend/main.py`, attach `byok: BYOK = Depends(get_byok)` if it does LLM work |
| New rate-limit kind | Add column to `daily_usage`, extend `_enforce_daily_quota`, add `SCAN_DAILY_LIMIT`-style env var |
| Map ranking tweak | `app/backend/main.py` `stores_nearby` (~ line 670), reuses `_classify_chain` + `_haversine` + cache helpers in the same file |
| New tab / screen | `app/frontend/App.tsx` `MainTabNavigator`, add screen file to `screens/`, share `theme/ThemeContext` for colors |
