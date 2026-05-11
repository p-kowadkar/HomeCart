// Live model fetch from OpenRouter's public /models endpoint.
// No API key required. Used by SettingsScreen to keep the OpenRouter model
// dropdowns current without app-store updates as new models drop.

import { ModelOption } from './models';

interface RawModel {
  id: string;
  name?: string;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { input_modalities?: string[] };
  context_length?: number;
}

const ENDPOINT = 'https://openrouter.ai/api/v1/models';
const CACHE_TTL_MS = 1000 * 60 * 60;  // 1 hour
let cache: { ts: number; models: ModelOption[] } | null = null;

export async function fetchOpenRouterModels(force = false): Promise<ModelOption[]> {
  if (!force && cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.models;
  }
  const res = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`OpenRouter /models returned ${res.status}`);
  const body = await res.json() as { data: RawModel[] };

  const models: ModelOption[] = (body.data || [])
    .map(toOption)
    .filter(m => m.inputPerM >= 0 && m.outputPerM >= 0);

  cache = { ts: Date.now(), models };
  return models;
}

function toOption(m: RawModel): ModelOption {
  const promptPerToken = parseFloat(m.pricing?.prompt ?? '0');
  const completionPerToken = parseFloat(m.pricing?.completion ?? '0');
  const vision = !!m.architecture?.input_modalities?.includes('image');
  return {
    id: m.id,
    label: m.name || m.id,
    vision,
    inputPerM: promptPerToken * 1_000_000,
    outputPerM: completionPerToken * 1_000_000,
  };
}

// Sort cheapest-first within a capability filter.
export function sortByPrice(models: ModelOption[]): ModelOption[] {
  return [...models].sort((a, b) => (a.outputPerM + a.inputPerM) - (b.outputPerM + b.inputPerM));
}
