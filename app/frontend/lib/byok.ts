// BYOK (bring your own key) storage layer.
// Keys live in expo-secure-store: Android Keystore on Android, Keychain on iOS — both
// hardware-backed. The keys are never logged, never persisted on the backend, never
// shipped over the wire except as request headers to the user's own provider on the
// single API call that needs them.
//
// Scope: LLM provider keys ONLY. Maps, Tavily, Firecrawl are operator-managed —
// see the BYOK redesign rationale in CLAUDE.md (under "Conventions and gotchas").

import * as SecureStore from 'expo-secure-store';

export type LLMProvider = 'openrouter' | 'openai' | 'anthropic';

export interface ByokKeys {
  llmKey?: string;
  llmVisionModel?: string;        // provider-native model ID (depends on detected provider)
  llmTextModel?: string;
}

const KEY_NAMES = {
  llmKey: 'byok_llm_key',
  llmVisionModel: 'byok_llm_vision_model',
  llmTextModel: 'byok_llm_text_model',
} as const;

// Legacy SecureStore entries written by older builds. Wiped on app start to prevent
// stale state from being forwarded as headers and silently breaking things.
const LEGACY_KEY_NAMES = [
  'byok_llm_provider',   // explicit provider override — removed; we detect from key prefix
  'byok_gcp_key',        // BYOK Maps removed — operator covers it
  'byok_tavily_key',     // forward-looking stub never wired up
  'byok_firecrawl_key',  // forward-looking stub never wired up
];

export async function loadByokKeys(): Promise<ByokKeys> {
  const entries = await Promise.all(
    (Object.entries(KEY_NAMES) as [keyof ByokKeys, string][]).map(async ([k, name]) => {
      const v = await SecureStore.getItemAsync(name);
      return [k, v || undefined] as const;
    }),
  );
  return Object.fromEntries(entries) as ByokKeys;
}

export async function saveByokKeys(keys: ByokKeys): Promise<void> {
  // Persist non-empty entries; delete empties so a saved-then-cleared field goes away.
  const ops: Promise<void>[] = [];
  for (const [k, secureKey] of Object.entries(KEY_NAMES) as [keyof ByokKeys, string][]) {
    const value = keys[k];
    if (value && value.trim()) {
      ops.push(SecureStore.setItemAsync(secureKey, value.trim()));
    } else {
      ops.push(SecureStore.deleteItemAsync(secureKey).catch(() => undefined as any));
    }
  }
  await Promise.all(ops);
}

export async function clearAllByokKeys(): Promise<void> {
  await Promise.all(
    Object.values(KEY_NAMES).map(name =>
      SecureStore.deleteItemAsync(name).catch(() => undefined),
    ),
  );
}

// One-shot cleanup of SecureStore entries written by older builds. Safe to call on every
// cold start — SecureStore.deleteItemAsync is a no-op when the key is absent.
export async function clearLegacyByokKeys(): Promise<void> {
  await Promise.all(
    LEGACY_KEY_NAMES.map(name =>
      SecureStore.deleteItemAsync(name).catch(() => undefined),
    ),
  );
}

// Detect the LLM provider from a key prefix. THIS is the source of truth — the backend
// uses the same logic in providers.py:detect_provider, so what we show in the UI matches
// what actually gets called. Never reintroduce an "explicit provider override" — it
// silently diverges the frontend model list from the backend's routing.
export function detectLLMProvider(key?: string): LLMProvider {
  if (!key) return 'openrouter';
  if (key.startsWith('sk-ant-')) return 'anthropic';
  if (key.startsWith('sk-or-')) return 'openrouter';
  if (key.startsWith('sk-')) return 'openai';
  return 'openrouter';
}

export function providerDisplayName(p: LLMProvider): string {
  switch (p) {
    case 'anthropic': return 'Anthropic';
    case 'openrouter': return 'OpenRouter';
    case 'openai': return 'OpenAI';
  }
}
