// BYOK (bring your own key) storage layer.
// Keys live in expo-secure-store: Android Keystore on Android, Keychain on iOS — both
// hardware-backed. The keys are never logged, never persisted on the backend, never
// shipped over the wire except as request headers to the user's own provider on the
// single API call that needs them.

import * as SecureStore from 'expo-secure-store';

export type LLMProvider = 'openrouter' | 'openai' | 'anthropic' | 'auto';

export interface ByokKeys {
  llmKey?: string;
  gcpKey?: string;
  tavilyKey?: string;
  firecrawlKey?: string;
}

const KEY_NAMES = {
  llmKey: 'byok_llm_key',
  gcpKey: 'byok_gcp_key',
  tavilyKey: 'byok_tavily_key',
  firecrawlKey: 'byok_firecrawl_key',
} as const;

export async function loadByokKeys(): Promise<ByokKeys> {
  const [llmKey, gcpKey, tavilyKey, firecrawlKey] = await Promise.all([
    SecureStore.getItemAsync(KEY_NAMES.llmKey),
    SecureStore.getItemAsync(KEY_NAMES.gcpKey),
    SecureStore.getItemAsync(KEY_NAMES.tavilyKey),
    SecureStore.getItemAsync(KEY_NAMES.firecrawlKey),
  ]);
  return {
    llmKey: llmKey || undefined,
    gcpKey: gcpKey || undefined,
    tavilyKey: tavilyKey || undefined,
    firecrawlKey: firecrawlKey || undefined,
  };
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

export function providerDisplayName(p: LLMProvider): string {
  switch (p) {
    case 'anthropic': return 'Anthropic';
    case 'openrouter': return 'OpenRouter';
    case 'openai': return 'OpenAI';
    default: return 'Auto-detect from key';
  }
}
