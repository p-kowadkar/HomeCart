# HomeCart

> Your AI grocery companion for navigating American shelves with home in mind.

HomeCart helps immigrants and travelers translate familiar food products into their US grocery-store equivalents, find specialty stores that carry the *real* thing, and plan recipe shopping trips with confidence. Scan a label, get the cultural translation. Type a dish from back home, get a fully ranked shopping list. Tap **Find stores** — see exactly where the items live, ranked by who covers the most.

Built as a hackathon project (the team won 🥇) and now being polished into a real shippable Android app.

---

## Features

- **🔍 Magic Lens** — point your camera at any US grocery product. Claude vision reads the label, returns a "cultural equivalent" rooted in your home cuisine, a match score, and a *real version* you'd ideally want from a specialty store.
- **📒 Recipe Importer** — type a dish ("biryani", "pasta carbonara"). HomeCart returns 8–15 ingredients each with US equivalents, aisle hints, match scores, and `availability_breadth` classification (mainstream vs specialty).
- **🗺️ Cultural Map** — Google Places-backed map with cuisine filters and product-aware ranking. Specialty-only products (Alphonso mango, fresh paneer) show only ethnic stores; mainstream products (cauliflower, chicken) show closest mainstream + specialty mix. Recipe-coverage view ranks stores by ingredients-covered (e.g., "Patel Brothers — 13/15 items").
- **🔑 BYOK (Bring Your Own Key)** — plug your own OpenRouter / OpenAI / Anthropic key for LLM calls, your own GCP key for Maps/Places, optional Tavily and Firecrawl keys. Keys live in hardware-backed secure storage (Android Keystore / iOS Keychain) and never persist on the backend.
- **🌑 Dark mode by default**, theme-aware throughout.
- **Android sideload** via EAS — install from a URL, no Play Store needed.

---

## Architecture

```mermaid
flowchart TB
    subgraph Mobile["📱 React Native + Expo (Android)"]
        UI[Tab Screens<br/>Home · Map · MagicLens · Recipes · Profile]
        Settings[Settings<br/>BYOK key input]
        SecureStore[(SecureStore<br/>Android Keystore /<br/>iOS Keychain)]
        apiFetch[apiFetch wrapper<br/>auto-attaches BYOK headers]
        Settings -->|saves| SecureStore
        SecureStore -->|read at request time| apiFetch
        UI -->|/scan /recipe /stores/nearby| apiFetch
    end

    subgraph Backend["🐍 FastAPI on Render"]
        Endpoints["/scan · /recipe · /stores/nearby · /healthz"]
        get_byok[get_byok dependency<br/>extracts X-User-* headers]
        Providers[providers.py<br/>OpenRouter / OpenAI / Anthropic<br/>auto-routed by key prefix]
        Ranker[Store ranking engine<br/>cuisine / product-aware<br/>recipe coverage]
        Endpoints --> get_byok
        get_byok --> Providers
        get_byok --> Ranker
    end

    subgraph External["☁️ External services"]
        OpenRouter[OpenRouter<br/>Claude Sonnet 4.6 + Haiku 4.5]
        OpenAI[OpenAI<br/>GPT-4o · GPT-4o-mini]
        Anthropic[Anthropic Messages API<br/>Claude 4.x direct]
        Places[Google Places API New<br/>Text Search]
        Supabase[(Supabase<br/>Postgres + Auth<br/>RLS-protected)]
        UptimeRobot[UptimeRobot<br/>5-min keep-alive]
    end

    apiFetch -.HTTPS.-> Endpoints
    Providers -->|sk-or-*| OpenRouter
    Providers -->|sk-*| OpenAI
    Providers -->|sk-ant-*| Anthropic
    Ranker --> Places
    Ranker --> Supabase
    Endpoints --> Supabase
    UptimeRobot -.GET /healthz every 5m.-> Endpoints
```

---

## How it works

### Magic Lens scan flow

```mermaid
sequenceDiagram
    actor User
    participant App as 📱 App (MagicLens)
    participant API as FastAPI /scan
    participant LLM as Claude (vision)
    participant DB as Supabase

    User->>App: Tap shutter
    App->>App: takePictureAsync → base64
    App->>API: POST /scan { image_base64, user_profile }
    API->>LLM: vision call with prompt<br/>(detect product + cultural equivalent +<br/>availability_breadth + preferred_store_types)
    LLM-->>API: JSON { detected_product, cultural_equivalent,<br/>match_score, ai_tip, real_version_name,<br/>availability_breadth, preferred_store_types }
    API->>DB: insert into scans (persisted history)
    API-->>App: ScanResult
    App->>User: Show match card with score, tip, "Get the real thing →"
    User->>App: Tap "Get the real thing"
    App->>App: navigate('Map', { product_context })
```

### Recipe → store coverage flow

```mermaid
flowchart LR
    Dish["User types<br/>'butter chicken'"] --> Recipe[POST /recipe]
    Recipe --> Claude[Claude Haiku 4.5<br/>via OpenRouter]
    Claude --> Ings["8–15 ingredients<br/>each tagged with<br/>availability_breadth +<br/>preferred_store_types"]
    Ings --> Save[(Supabase<br/>shopping_lists +<br/>list_items)]
    Ings --> Display[Recipes screen<br/>shows ingredient cards]
    Display --> Either{User chooses}
    Either -->|per-ingredient| Single["Tap one row →<br/>Map filtered to<br/>that single item"]
    Either -->|whole list| Multi["Tap 'Find stores<br/>for this list' →<br/>aggregate product_context"]
    Multi --> Nearby["POST /stores/nearby<br/>with needed_items"]
    Single --> Nearby
    Nearby --> Places[Google Places<br/>Text Search]
    Nearby --> Personas[(chain_personas<br/>30 chains classified)]
    Places --> Rank["Per-store coverage:<br/>count how many<br/>preferred_store_types<br/>match each ingredient"]
    Personas --> Rank
    Rank --> Filter["Drop 0-coverage stores;<br/>sort by distance ASC,<br/>coverage DESC"]
    Filter --> Map["Map sheet:<br/>Patel Brothers 13/15<br/>Whole Foods 11/15<br/>Walmart 9/15"]
```

### BYOK request routing

```mermaid
flowchart TB
    Settings[Settings screen] -->|user pastes key| SS[(SecureStore)]
    Request[Any /scan /recipe /stores/nearby call] --> apiFetch
    SS -->|loadByokKeys| apiFetch
    apiFetch -->|attach headers<br/>X-User-LLM-Key<br/>X-User-GCP-Key<br/>X-User-Tavily-Key<br/>X-User-Firecrawl-Key| Backend
    Backend --> get_byok[get_byok Depends]
    get_byok --> Detect{LLM key<br/>prefix?}
    Detect -->|sk-ant-*| Anth[Anthropic adapter<br/>native Messages API<br/>image.source.base64]
    Detect -->|sk-or-*| OR[OpenRouter adapter<br/>OpenAI-compat shape<br/>anthropic/claude-* models]
    Detect -->|sk-*| OAI[OpenAI adapter<br/>OpenAI-compat shape<br/>gpt-4o + gpt-4o-mini]
    Detect -->|no key| Env[fallback to env<br/>OPENROUTER_API_KEY]
    Anth & OR & OAI & Env --> Reply[Assistant text]
```

---

## Tech stack

| Layer | Tech |
|---|---|
| Mobile UI | Expo SDK 54, React Native 0.81, TypeScript, react-native-maps 1.27 |
| Native build | EAS Build (development + preview profiles), expo-dev-client, expo-secure-store, expo-camera, expo-location |
| Navigation | @react-navigation/bottom-tabs 7 |
| Auth + DB | Supabase (Postgres + Auth + RLS) |
| Backend | FastAPI, uvicorn, httpx, Pydantic |
| LLM gateway | OpenRouter (default) → Claude Sonnet 4.6 vision + Haiku 4.5 text. Pluggable: OpenAI direct, Anthropic direct |
| Maps | Google Maps SDK + Places API (New) Text Search |
| Hosting | Render free tier + UptimeRobot keep-alive |
| Secure storage | Android Keystore (hardware-backed) / iOS Keychain |

---

## Getting started

### Prerequisites

- Node 20+
- Python 3.12+
- Supabase project (free tier OK) with Auth enabled
- Google Cloud project with **Places API (New)** + **Maps SDK Android** enabled
- OpenRouter account (or your own OpenAI/Anthropic API key)

### Backend

```bash
cd app/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Create .env (gitignored) with these keys:
cat > .env <<EOF
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
OPENROUTER_API_KEY=sk-or-v1-...
GOOGLE_MAPS_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...   # optional fallback
EOF

# Apply migrations via Supabase SQL Editor (one at a time):
#   app/migrations/001_initial_schema.sql
#   app/migrations/002_store_cache_chains.sql
#   app/migrations/003_product_availability.sql
#   app/migrations/004_fix_handle_new_user.sql

# Seed the chain_personas table (30 grocery chains classified by cuisine + tier):
python seed_chains.py

# Run dev server (bind 0.0.0.0 so a phone on your LAN can reach it):
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd app/frontend
npm install

# Create .env with:
#   EXPO_PUBLIC_API_URL=http://<your-lan-ip>:8000
#   EXPO_PUBLIC_SUPABASE_URL=...
#   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
#   GOOGLE_MAPS_API_KEY=...    # baked into Android native config at prebuild

# Option A — Expo Go for dev (camera + map will be limited):
npx expo start

# Option B — full-feature EAS dev build (recommended):
npx eas-cli@16 build --profile development --platform android
# Install the resulting APK, then run `npx expo start` to serve JS to it
```

---

## BYOK — bring your own key

Tap **Profile → API Keys (BYOK)**. Paste any of:

| Provider | Detected prefix | Where to get it |
|---|---|---|
| OpenRouter | `sk-or-*` | [openrouter.ai/keys](https://openrouter.ai/keys) |
| OpenAI | `sk-*` (anything else) | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Anthropic | `sk-ant-*` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| Google Maps | starts with `AIza` | [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) |
| Tavily | `tvly-*` | [app.tavily.com/home](https://app.tavily.com/home) |
| Firecrawl | `fc-*` | [firecrawl.dev](https://www.firecrawl.dev/app/api-keys) |

Keys live only in your device's hardware-backed secure store. They're attached as request headers on each API call and **never persisted server-side**. The backend uses them if present, falls back to its env defaults otherwise — so you can run the app even if the operator's free credits run out.

---

## Database schema

```mermaid
erDiagram
    profiles ||--o{ scans : "owns"
    profiles ||--o{ shopping_lists : "owns"
    shopping_lists ||--o{ list_items : "contains"
    profiles {
        uuid id PK "= auth.users.id"
        text home_country
        text home_region
        text_array home_cuisines
        text_array dietary_preferences
        int cooking_confidence "1–5"
        bool onboarding_completed
    }
    scans {
        uuid id PK
        uuid user_id FK
        text detected_product
        text cultural_equivalent
        int match_score
        text real_version_name
        text availability_breadth "mainstream | both | specialty_only"
        text_array preferred_store_types
    }
    shopping_lists {
        uuid id PK
        uuid user_id FK
        text source_dish
        text status "planning | shopping | completed"
    }
    list_items {
        uuid id PK
        uuid list_id FK
        text original_ingredient
        text us_equivalent_product
        int match_score
        text availability_breadth
        text_array preferred_store_types
    }
    chain_personas {
        uuid id PK
        text chain_name "Patel Brothers, H Mart, Costco, ..."
        text_array cuisines
        int authenticity_tier "1=specialty 4=budget"
        int price_tier "1=cheap 3=premium"
        text notes
    }
    store_cache {
        uuid id PK
        text cache_key "lat:X,lon:Y,product:..."
        jsonb results "24hr TTL"
    }
    equivalences {
        uuid id PK
        text home_item
        text home_cuisine
        text us_equivalent
    }
```

All user-owned tables (`profiles`, `scans`, `shopping_lists`, `list_items`) are protected by Row Level Security policies: `auth.uid() = user_id`. The reference tables (`chain_personas`, `store_cache`, `equivalences`) are world-readable by authenticated users.

---

## Deployment

### Backend → Render

```bash
# 1. Push to GitHub.
# 2. Render dashboard → New → Blueprint → pick this repo.
#    Render reads app/backend/render.yaml and provisions a Python service.
# 3. Set env vars in Render: SUPABASE_URL, SUPABASE_SERVICE_KEY,
#    OPENROUTER_API_KEY, GOOGLE_MAPS_API_KEY
# 4. Apply. First deploy takes ~3-5 min.
```

### Keep-alive → UptimeRobot

Render's free tier sleeps after 15 min of inactivity (1-min cold start hurts the demo). UptimeRobot pings `/healthz` every 5 min to keep it warm:

- New monitor → HTTPS → `https://homecart-backend-XXXX.onrender.com/healthz` → 5-minute interval.
- Free plan covers 50 monitors at 5-min intervals. No credit card.

### Mobile → EAS

```bash
cd app/frontend
npx eas-cli@16 build --profile preview --platform android
# Share the resulting EAS build URL — anyone with the URL can sideload the APK.
```

iOS is deferred (requires $99/yr Apple Developer Program). The codebase is iOS-compatible; just no active build path today.

---

## Roadmap

- [x] Magic Lens, Recipe Importer, Map
- [x] Product-aware store ranking (mainstream / specialty / both)
- [x] Per-recipe-ingredient coverage view
- [x] BYOK for LLM, Maps, Tavily, Firecrawl
- [x] OpenRouter LLM gateway with provider fallback
- [x] Android EAS preview build
- [ ] Backend deploy to Render + UptimeRobot keep-alive
- [ ] Tavily fallback for thin-metro store discovery
- [ ] Firecrawl enrichment of `ai_tip` with "where to buy" data
- [ ] iOS build (Apple Developer Program)
- [ ] Play Store listing (privacy policy + content rating + screenshots)
- [ ] App icon + splash branding refresh
- [ ] Sentry crash reporting + PostHog analytics

---

## License

MIT — see [LICENSE](LICENSE) if/when added.

## Acknowledgements

Built by [@p-kowadkar](https://github.com/p-kowadkar) and the hackathon team. Powered by Anthropic Claude (via OpenRouter), Google Maps Platform, and Supabase.
