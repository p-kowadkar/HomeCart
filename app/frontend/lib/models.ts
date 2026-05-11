// Curated model catalog for the BYOK Settings model picker.
//
// OpenAI and Anthropic don't expose free public /models endpoints with pricing,
// so we hardcode their current (May 2026) lineups. OpenRouter has 300+ models
// and a public /api/v1/models endpoint — see lib/openrouter.ts for live fetch.
// The OPENROUTER list here is the offline fallback when the fetch fails.

import { LLMProvider } from './byok';

export interface ModelOption {
  id: string;                  // provider-native model ID (what we send in headers)
  label: string;               // display name
  vision: boolean;             // image input support
  inputPerM: number;           // $ per million input tokens
  outputPerM: number;          // $ per million output tokens
  notes?: string;              // one-line "what's it good for"
}

// --- OpenAI direct (sk-...) ---
// Verified May 2026. All GPT-5.x and o-series support vision. Note: backend
// parameter adapter strips max_tokens/temperature and adds max_completion_tokens
// for all of these (they're all reasoning models).
export const OPENAI_MODELS: ModelOption[] = [
  { id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano',  vision: true, inputPerM: 0.20, outputPerM: 1.25,  notes: 'Cheapest credible vision + text. Recommended default.' },
  { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini',  vision: true, inputPerM: 0.75, outputPerM: 4.50,  notes: 'Balanced vision.' },
  { id: 'gpt-5.4',      label: 'GPT-5.4',       vision: true, inputPerM: 2.50, outputPerM: 15.00, notes: 'Flagship vision.' },
  { id: 'gpt-5.5',      label: 'GPT-5.5',       vision: true, inputPerM: 5.00, outputPerM: 30.00, notes: 'Flagship; complex reasoning.' },
  { id: 'o3',           label: 'o3',            vision: true, inputPerM: 2.00, outputPerM: 8.00,  notes: 'General reasoning model.' },
  { id: 'o4-mini',      label: 'o4-mini',       vision: true, inputPerM: 4.00, outputPerM: 16.00, notes: 'Cheap reasoning model.' },
];

// --- Anthropic direct (sk-ant-...) ---
// API IDs use dashes (not dots) on the native Messages API.
export const ANTHROPIC_MODELS: ModelOption[] = [
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5',  vision: true, inputPerM: 1.00, outputPerM: 5.00,  notes: 'Fast, near-frontier. Recommended default.' },
  { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6', vision: true, inputPerM: 3.00, outputPerM: 15.00, notes: 'Best speed/intelligence balance.' },
  { id: 'claude-opus-4-7',           label: 'Claude Opus 4.7',   vision: true, inputPerM: 5.00, outputPerM: 25.00, notes: 'Most capable; agentic.' },
];

// --- OpenRouter offline fallback ---
// Live fetch from openrouter.ai/api/v1/models is preferred. This list ships
// in the binary as a fallback for offline / fetch-failure cases.
export const OPENROUTER_FALLBACK: ModelOption[] = [
  // Cheap vision
  { id: 'google/gemini-3.1-flash-lite',    label: 'Gemini 3.1 Flash Lite',  vision: true, inputPerM: 0.25, outputPerM: 1.50,  notes: 'GA. Cheap, fast, vision.' },
  { id: 'google/gemini-2.5-flash-lite',    label: 'Gemini 2.5 Flash Lite',  vision: true, inputPerM: 0.10, outputPerM: 0.40,  notes: 'Cheapest vision. Quality risk on small text.' },
  { id: 'openai/gpt-5.4-nano',             label: 'GPT-5.4 Nano',           vision: true, inputPerM: 0.20, outputPerM: 1.25,  notes: 'Recommended cheap vision.' },
  { id: 'meta-llama/llama-4-maverick',     label: 'Llama 4 Maverick',       vision: true, inputPerM: 0.15, outputPerM: 0.60,  notes: 'Cheap vision.' },
  { id: 'qwen/qwen3-vl-235b-a22b-instruct',label: 'Qwen3 VL 235B',          vision: true, inputPerM: 0.20, outputPerM: 0.88,  notes: 'Cheap vision.' },
  { id: 'anthropic/claude-haiku-4.5',      label: 'Claude Haiku 4.5',       vision: true, inputPerM: 1.00, outputPerM: 5.00,  notes: 'Cheap vision.' },
  // Mid vision
  { id: 'google/gemini-3-flash-preview',   label: 'Gemini 3 Flash (preview)', vision: true, inputPerM: 0.50, outputPerM: 3.00,  notes: 'Mid vision.' },
  { id: 'openai/gpt-5.4-mini',             label: 'GPT-5.4 Mini',           vision: true, inputPerM: 0.75, outputPerM: 4.50,  notes: 'Mid vision.' },
  // Flagship vision
  { id: 'google/gemini-3.1-pro-preview',   label: 'Gemini 3.1 Pro (preview)', vision: true, inputPerM: 2.00, outputPerM: 12.00, notes: 'Flagship vision.' },
  { id: 'google/gemini-2.5-pro',           label: 'Gemini 2.5 Pro',         vision: true, inputPerM: 1.25, outputPerM: 10.00, notes: 'Flagship vision.' },
  { id: 'anthropic/claude-sonnet-4.6',     label: 'Claude Sonnet 4.6',      vision: true, inputPerM: 3.00, outputPerM: 15.00, notes: 'Flagship vision.' },
  { id: 'openai/gpt-5.4',                  label: 'GPT-5.4',                vision: true, inputPerM: 2.50, outputPerM: 15.00, notes: 'Flagship vision.' },
  { id: 'x-ai/grok-4',                     label: 'Grok 4',                 vision: true, inputPerM: 3.00, outputPerM: 15.00, notes: 'Flagship vision.' },
  // Cheap text
  { id: 'deepseek/deepseek-v4-flash',      label: 'DeepSeek V4 Flash',      vision: false, inputPerM: 0.14, outputPerM: 0.28,  notes: 'Recommended cheap text.' },
  { id: 'deepseek/deepseek-v4-pro',        label: 'DeepSeek V4 Pro',        vision: false, inputPerM: 0.44, outputPerM: 0.87,  notes: 'Cheap flagship text.' },
  { id: 'mistralai/mistral-medium-3.1',    label: 'Mistral Medium 3.1',     vision: false, inputPerM: 0.40, outputPerM: 2.00,  notes: 'Cheap text.' },
  // Flagship text
  { id: 'openai/gpt-5.5',                  label: 'GPT-5.5',                vision: true, inputPerM: 5.00, outputPerM: 30.00, notes: 'Flagship text.' },
  { id: 'anthropic/claude-opus-4.7',       label: 'Claude Opus 4.7',        vision: true, inputPerM: 5.00, outputPerM: 25.00, notes: 'Flagship text.' },
];

export function modelsForProvider(provider: LLMProvider, fetched?: ModelOption[]): ModelOption[] {
  if (provider === 'openrouter') return fetched && fetched.length ? fetched : OPENROUTER_FALLBACK;
  if (provider === 'openai') return OPENAI_MODELS;
  if (provider === 'anthropic') return ANTHROPIC_MODELS;
  return [];  // 'auto' — no list until provider resolves
}

export function visionModels(all: ModelOption[]): ModelOption[] {
  return all.filter(m => m.vision);
}

export function defaultVisionModel(provider: LLMProvider): string {
  if (provider === 'openai') return 'gpt-5.4-nano';
  if (provider === 'anthropic') return 'claude-haiku-4-5-20251001';
  return 'openai/gpt-5.4-nano';  // OpenRouter default
}

export function defaultTextModel(provider: LLMProvider): string {
  if (provider === 'openai') return 'gpt-5.4-nano';
  if (provider === 'anthropic') return 'claude-haiku-4-5-20251001';
  return 'deepseek/deepseek-v4-flash';
}

export function formatPrice(perM: number): string {
  return perM < 1 ? `$${perM.toFixed(2)}` : `$${perM.toFixed(0)}`;
}
