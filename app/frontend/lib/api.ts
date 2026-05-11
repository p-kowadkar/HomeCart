// HTTP client wrapper that attaches BYOK headers to every backend call.
// Reads keys from SecureStore at request time so a user's "Save" in Settings
// takes effect on the very next API call without a reload.

import { loadByokKeys } from './byok';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const keys = await loadByokKeys();
  const byokHeaders: Record<string, string> = {};
  if (keys.llmKey) byokHeaders['X-User-LLM-Key'] = keys.llmKey;
  if (keys.gcpKey) byokHeaders['X-User-GCP-Key'] = keys.gcpKey;
  if (keys.tavilyKey) byokHeaders['X-User-Tavily-Key'] = keys.tavilyKey;
  if (keys.firecrawlKey) byokHeaders['X-User-Firecrawl-Key'] = keys.firecrawlKey;

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Bypass-Tunnel-Reminder': '1',
      ...byokHeaders,
      ...(options.headers || {}),
    },
  });
}

export { API_URL };
