"""LLM provider router for HomeCart BYOK.

Three adapters: OpenRouter (default), OpenAI direct, Anthropic direct. The active
provider is auto-detected from the API key prefix so the user only has to paste
ONE key into the Settings UI without picking a provider explicitly:

    sk-ant-...   -> Anthropic direct (Messages API shape)
    sk-or-...    -> OpenRouter (OpenAI-compatible chat completions)
    sk-...       -> OpenAI direct (OpenAI chat completions)

If no override key is supplied, the env-configured default (LLM_API_KEY /
OPENROUTER_API_KEY) is used with the env-configured base URL + model IDs.
"""
from __future__ import annotations
import os
from typing import Optional
import httpx
from fastapi import HTTPException


# Env-driven defaults (the operator's keys). These are used when no user override is provided.
ENV_LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "https://openrouter.ai/api/v1")
ENV_LLM_API_KEY = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("LLM_API_KEY", "")
ENV_VISION_MODEL = os.environ.get("LLM_VISION_MODEL", "anthropic/claude-sonnet-4.6")
ENV_TEXT_MODEL = os.environ.get("LLM_TEXT_MODEL", "anthropic/claude-haiku-4.5")

# OpenRouter analytics headers — harmless, helps with leaderboard listing.
LLM_APP_REFERRER = os.environ.get("LLM_APP_REFERRER", "https://homecart.app")
LLM_APP_TITLE = os.environ.get("LLM_APP_TITLE", "HomeCart")


# Per-provider default model IDs when the user supplies their own key.
# These let the user paste a key without thinking about model picking.
PROVIDER_DEFAULTS = {
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "vision_model": "anthropic/claude-sonnet-4.6",
        "text_model": "anthropic/claude-haiku-4.5",
        "shape": "openai",  # OpenAI-compatible chat completions
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "vision_model": "gpt-4o",
        "text_model": "gpt-4o-mini",
        "shape": "openai",
    },
    "anthropic": {
        "base_url": "https://api.anthropic.com/v1",
        "vision_model": "claude-sonnet-4-6",
        "text_model": "claude-haiku-4-5-20251001",
        "shape": "anthropic",  # native Messages API
    },
}


def detect_provider(key: str) -> str:
    """Map an API key prefix to its provider. Defaults to OpenRouter."""
    if not key:
        return "openrouter"
    if key.startswith("sk-ant-"):
        return "anthropic"
    if key.startswith("sk-or-"):
        return "openrouter"
    if key.startswith("sk-"):
        return "openai"
    return "openrouter"  # safe default for unknown prefixes (e.g. older OpenRouter keys)


async def _post_openai_shape(base_url: str, key: str, model: str, messages: list, max_tokens: int) -> str:
    """OpenAI-compatible chat completions (OpenRouter, OpenAI). Returns the assistant text."""
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": LLM_APP_REFERRER,
        "X-Title": LLM_APP_TITLE,
    }
    body = {"model": model, "max_tokens": max_tokens, "messages": messages}
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(f"{base_url}/chat/completions", headers=headers, json=body)
        if r.status_code >= 400:
            raise HTTPException(r.status_code, f"LLM gateway error: {r.text[:300]}")
        return r.json()["choices"][0]["message"]["content"]


def _anthropic_messages_from_openai(messages: list) -> list:
    """Translate an OpenAI-shape message list to Anthropic Messages API content blocks.

    Vision messages in OpenAI use {"type":"image_url","image_url":{"url":"data:..."}}.
    Anthropic uses {"type":"image","source":{"type":"base64","media_type","data"}}.
    """
    out = []
    for m in messages:
        content = m.get("content")
        if isinstance(content, str):
            out.append({"role": m["role"], "content": content})
            continue
        # multimodal: list of parts
        parts = []
        for part in content:
            if part.get("type") == "image_url":
                url = part["image_url"]["url"]
                # data URL: data:image/jpeg;base64,XXXX
                if url.startswith("data:"):
                    header, b64 = url.split(",", 1)
                    media_type = header.split(";")[0].replace("data:", "") or "image/jpeg"
                else:
                    raise HTTPException(400, "Anthropic provider only accepts base64 data URLs for images")
                parts.append({"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}})
            elif part.get("type") == "text":
                parts.append({"type": "text", "text": part["text"]})
        out.append({"role": m["role"], "content": parts})
    return out


async def _post_anthropic_shape(base_url: str, key: str, model: str, messages: list, max_tokens: int) -> str:
    """Anthropic native Messages API. Returns the assistant text from content[0]."""
    anthropic_messages = _anthropic_messages_from_openai(messages)
    headers = {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {"model": model, "max_tokens": max_tokens, "messages": anthropic_messages}
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(f"{base_url}/messages", headers=headers, json=body)
        if r.status_code >= 400:
            raise HTTPException(r.status_code, f"Anthropic error: {r.text[:300]}")
        data = r.json()
        try:
            # Anthropic returns content as a list of {type, text} blocks; first text block has the answer.
            for block in data.get("content", []):
                if block.get("type") == "text":
                    return block["text"]
            raise HTTPException(502, "No text block in Anthropic response")
        except (KeyError, IndexError, TypeError):
            raise HTTPException(502, f"Unexpected Anthropic shape: {str(data)[:300]}")


async def call_llm(
    messages: list,
    max_tokens: int,
    kind: str = "text",  # "text" or "vision"
    override_key: Optional[str] = None,
) -> str:
    """Single entry point for LLM calls. Routes to the right provider based on the key.

    If override_key is supplied, the provider is detected from the key prefix and the
    request is sent direct-to-provider with sensible default model IDs. Otherwise the
    env-configured base URL / key / model IDs are used.
    """
    if override_key:
        provider = detect_provider(override_key)
        cfg = PROVIDER_DEFAULTS[provider]
        model = cfg["vision_model"] if kind == "vision" else cfg["text_model"]
        if cfg["shape"] == "anthropic":
            return await _post_anthropic_shape(cfg["base_url"], override_key, model, messages, max_tokens)
        return await _post_openai_shape(cfg["base_url"], override_key, model, messages, max_tokens)

    # No override → use env defaults (current behaviour). Always OpenAI-shape (OpenRouter).
    if not ENV_LLM_API_KEY:
        raise HTTPException(503, "LLM API key not configured on the server (and no user key supplied)")
    model = ENV_VISION_MODEL if kind == "vision" else ENV_TEXT_MODEL
    return await _post_openai_shape(ENV_LLM_BASE_URL, ENV_LLM_API_KEY, model, messages, max_tokens)


async def llm_vision(image_base64: str, prompt: str, max_tokens: int = 1500, override_key: Optional[str] = None) -> str:
    messages = [{
        "role": "user",
        "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
            {"type": "text", "text": prompt},
        ],
    }]
    return await call_llm(messages, max_tokens=max_tokens, kind="vision", override_key=override_key)


async def llm_text(prompt: str, max_tokens: int = 1500, override_key: Optional[str] = None) -> str:
    messages = [{"role": "user", "content": prompt}]
    return await call_llm(messages, max_tokens=max_tokens, kind="text", override_key=override_key)
