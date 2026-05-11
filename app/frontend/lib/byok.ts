// BYOK (bring your own key) storage layer.
// Keys live in expo-secure-store: Android Keystore on Android, Keychain on iOS — both
// hardware-backed. The keys are never logged, never persisted on the backend, never
// shipped over the wire except as request headers to the user's own provider on the
// single API call that needs them.

import * as SecureStore from 'expo-secure-store';

export type LLMProvider = 'openrouter' | 'openai' | 'anthropic' | 'auto';

export interface ByokKeys {
  llmKey?: string;
  llmProvider?: LLMProvider;      // explicit override; falls back to auto-detect from key prefix
  llmVisionModel?: string;        // e.g. "openai/gpt-5.4-nano" (OpenRouter) or "gpt-5.4-nano" (OpenAI direct)
  llmTextModel?: string;          // e.g. "deepseek/deepseek-v4-flash"
  gcpKey?: string;
  tavilyKey?: string;
  firecrawlKey?: string;
}

const KEY_NAMES = {
  llmKey: 'byok_llm_key',
  llmProvider: 'byok_llm_provider',
  llmVisionModel: 'byok_llm_vision_model',
  llmTextModel: 'byok_llm_text_model',
  gcpKey: 'byok_gcp_key',
  tavilyKey: 'byok_tavily_key',
  firecrawlKey: 'byok_firecrawl_key',
} as const;

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

// Detect the LLM provider from a key prefix. Mirrors backend logic in providers.py.
export function detectLLMProvider(key?: string): LLMProvider {
  if (!key) return 'auto';
  if (key.startsWith('sk-ant-')) return 'anthropic';
  if (key.startsWith('sk-or-')) return 'openrouter';
  if (key.startsWith('sk-')) return 'openai';
  return 'openrouter';
}

// Resolve the effective provider — user's explicit override wins, otherwise auto-detect.
export function resolveProvider(keys: ByokKeys): LLMProvider {
  if (keys.llmProvider && keys.llmProvider !== 'auto') return keys.llmProvider;
  return detectLLMProvider(keys.llmKey);
}

export function providerDisplayName(p: LLMProvider): string {
  switch (p) {
    case 'anthropic': return 'Anthropic';
    case 'openrouter': return 'OpenRouter';
    case 'openai': return 'OpenAI';
    default: return 'Auto-detect from key';
  }
}
