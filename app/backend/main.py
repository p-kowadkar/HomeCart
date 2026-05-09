from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from supabase import create_client, Client
import os
import json
import httpx
from math import radians, sin, cos, sqrt, atan2
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Cartographer Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", os.environ.get("SUPABASE_KEY", ""))
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ============================
# MODELS
# ============================
class UserProfile(BaseModel):
    home_country: Optional[str] = None
    home_region: Optional[str] = None
    home_cuisines: list[str] = []
    cooking_confidence: int = 3
    dietary_preferences: list[str] = []


class ScanRequest(BaseModel):
    image_base64: str
    user_profile: UserProfile


class RecipeImportRequest(BaseModel):
    dish_name: str
    user_profile: UserProfile


# ============================
# AUTH HELPER
# ============================
async def get_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    try:
        user = supabase.auth.get_user(token)
        return user.user.id if user and user.user else None
    except Exception:
        return None


# ============================
# CLAUDE API HELPERS
# ============================
async def call_claude_vision(image_base64: str, prompt: str, max_tokens: int = 800) -> str:
    async with httpx.AsyncClient(timeout=45) as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-5",
                "max_tokens": max_tokens,
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": image_base64}},
                        {"type": "text", "text": prompt},
                    ]
                }]
            }
        )
        r.raise_for_status()
        return r.json()["content"][0]["text"]


async def call_claude_text(prompt: str, max_tokens: int = 1500, model: str = "claude-haiku-4-5") -> str:
    async with httpx.AsyncClient(timeout=45) as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": model,
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}]
            }
        )
        r.raise_for_status()
        return r.json()["content"][0]["text"]


def parse_json_from_response(text: str) -> dict:
    """Strip markdown fences and parse JSON."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()
    return json.loads(text)


def lookup_equivalence(detected_product: str, home_cuisines: list[str]) -> Optional[dict]:
    """Try to find a curated match before calling LLM."""
    if not detected_product:
        return None
    product_lower = detected_product.lower()
    for cuisine in home_cuisines:
        # "India (Karnataka)" -> "India"
        cuisine_clean = cuisine.split(" (")[0]
        try:
            results = supabase.table("equivalences").select("*").eq("home_cuisine", cuisine_clean).execute()
            for row in results.data:
                if row["us_equivalent"].lower() in product_lower or product_lower in row["us_equivalent"].lower():
                    return row
        except Exception:
            continue
    return None


# ============================
# ROUTES
# ============================
@app.get("/")
async def root():
    return {"status": "Cartographer API running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/scan")
async def scan_product(req: ScanRequest, user_id: Optional[str] = Depends(get_user_id)):
    cuisines_str = ", ".join(req.user_profile.home_cuisines) if req.user_profile.home_cuisines else "Unknown"
    dietary_str = ", ".join(req.user_profile.dietary_preferences) if req.user_profile.dietary_preferences else "none"

    prompt = f"""You are Cartographer, a culturally-aware grocery assistant for immigrants.

USER CONTEXT:
- Home country: {req.user_profile.home_country or 'Unknown'}
- Home region: {req.user_profile.home_region or 'Unknown'}
- Home cuisines: {cuisines_str}
- Cooking confidence (1-5): {req.user_profile.cooking_confidence}
- Dietary restrictions: {dietary_str}

TASK:
1. Identify the product in the image (name, brand if visible, category).
2. Translate it to the user's home cuisine. Is this product close to something they'd use at home? What dish?
3. Score how close it is to the "real thing" they'd use back home (0-100, where 100 = identical).
4. Suggest the IDEAL product they'd want from a specialty store catering to their cuisine, if applicable.
5. If the user could make a closer alternative at home (and their cooking confidence allows), describe it briefly.
6. Give one practical tip for using this product or substituting it.

Output ONLY valid JSON (no preamble, no markdown fences):
{{
  "detected_product": "<product name>",
  "detected_brand": "<brand or null>",
  "detected_category": "<rice|flour|cheese|spice|sauce|etc>",
  "cultural_equivalent": "<one sentence: what is this in their cuisine?>",
  "match_score": <0-100>,
  "real_version_name": "<ideal product from specialty store, or null>",
  "ai_tip": "<one practical tip>",
  "can_make_at_home": <true/false>,
  "home_recipe_summary": "<one sentence on how to make it, or null>"
}}

If the image is unclear or not a food product, use match_score: 0 and explain in cultural_equivalent.
"""

    try:
        response_text = await call_claude_vision(req.image_base64, prompt)
        result = parse_json_from_response(response_text)

        # Persist scan if user authenticated
        if user_id:
            try:
                supabase.table("scans").insert({
                    "user_id": user_id,
                    "detected_product": result.get("detected_product"),
                    "detected_brand": result.get("detected_brand"),
                    "detected_category": result.get("detected_category"),
                    "cultural_equivalent": result.get("cultural_equivalent"),
                    "match_score": result.get("match_score"),
                    "ai_tip": result.get("ai_tip"),
                    "can_make_at_home": result.get("can_make_at_home", False),
                    "home_recipe_summary": result.get("home_recipe_summary"),
                    "real_version_name": result.get("real_version_name"),
                    "raw_vision_response": result,
                }).execute()
            except Exception as e:
                print(f"[scan] Failed to persist: {e}")

        return result
    except json.JSONDecodeError as e:
        raise HTTPException(500, f"AI response parse error: {e}")
    except httpx.HTTPError as e:
        raise HTTPException(500, f"AI API error: {e}")


@app.post("/recipe")
async def import_recipe(req: RecipeImportRequest, user_id: Optional[str] = Depends(get_user_id)):
    cuisines_str = ", ".join(req.user_profile.home_cuisines) if req.user_profile.home_cuisines else "Unknown"
    dietary_str = ", ".join(req.user_profile.dietary_preferences) if req.user_profile.dietary_preferences else "none"

    prompt = f"""You are Cartographer, helping an immigrant shop for their home cuisine in American grocery stores.

USER:
- Home cuisines: {cuisines_str}
- Cooking confidence (1-5): {req.user_profile.cooking_confidence}
- Dietary: {dietary_str}

DISH: {req.dish_name}

TASK:
1. List the 8-15 essential ingredients for this dish.
2. For each, give the closest US grocery store equivalent (specific brand if possible).
3. Match score 0-100 (100 = identical to home version).
4. Aisle hint (where in a typical American grocery store).
5. One AI tip (substitute hint, brand to look for, what to avoid).
6. Can they make it at home from simpler ingredients?

Output ONLY valid JSON (no preamble, no markdown):
{{
  "dish_name": "{req.dish_name}",
  "ingredients": [
    {{
      "original_ingredient": "<home name>",
      "us_equivalent_product": "<closest US product>",
      "us_brand": "<specific brand or null>",
      "match_score": <0-100>,
      "aisle_location": "<aisle hint>",
      "ai_tip": "<one tip>",
      "can_make_at_home": <true/false>
    }}
  ]
}}
"""

    try:
        response_text = await call_claude_text(prompt, max_tokens=2500)
        result = parse_json_from_response(response_text)

        # Persist if authenticated
        list_id = None
        if user_id:
            try:
                list_resp = supabase.table("shopping_lists").insert({
                    "user_id": user_id,
                    "title": f"{req.dish_name} -- shopping list",
                    "source_dish": req.dish_name,
                    "status": "planning",
                }).execute()
                list_id = list_resp.data[0]["id"]

                items = [
                    {
                        "list_id": list_id,
                        "original_ingredient": ing.get("original_ingredient"),
                        "us_equivalent_product": ing.get("us_equivalent_product"),
                        "us_equivalent_brand": ing.get("us_brand"),
                        "match_score": ing.get("match_score"),
                        "aisle_location": ing.get("aisle_location"),
                        "ai_tip": ing.get("ai_tip"),
                        "can_make_at_home": ing.get("can_make_at_home", False),
                    }
                    for ing in result.get("ingredients", [])
                ]
                if items:
                    supabase.table("list_items").insert(items).execute()
            except Exception as e:
                print(f"[recipe] Failed to persist: {e}")

        result["list_id"] = list_id
        return result
    except json.JSONDecodeError as e:
        raise HTTPException(500, f"AI response parse error: {e}")
    except httpx.HTTPError as e:
        raise HTTPException(500, f"AI API error: {e}")


@app.get("/profile/{user_id}")
async def get_profile(user_id: str):
    response = supabase.table("profiles").select("*").eq("id", user_id).execute()
    return response.data[0] if response.data else {"error": "Profile not found"}


# ============================
# STORES NEARBY
# ============================

PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

# Cuisine -> search terms for Google Places Text Search
CUISINE_QUERIES: dict[str, list[str]] = {
    "india": ["indian grocery", "south asian grocery", "patel brothers"],
    "indian": ["indian grocery", "south asian grocery", "patel brothers"],
    "south_asian": ["indian grocery", "pakistani grocery", "bangladeshi grocery"],
    "pakistan": ["pakistani grocery", "halal grocery", "south asian grocery"],
    "china": ["chinese grocery", "99 ranch", "asian supermarket"],
    "chinese": ["chinese grocery", "99 ranch", "asian supermarket"],
    "korea": ["korean grocery", "h mart", "asian supermarket"],
    "korean": ["korean grocery", "h mart", "asian supermarket"],
    "japan": ["japanese grocery", "mitsuwa", "japanese market"],
    "japanese": ["japanese grocery", "mitsuwa", "japanese market"],
    "vietnam": ["vietnamese grocery", "asian supermarket"],
    "vietnamese": ["vietnamese grocery", "asian supermarket"],
    "philippines": ["filipino grocery", "seafood city"],
    "filipino": ["filipino grocery", "seafood city"],
    "thailand": ["thai grocery", "asian supermarket"],
    "mexico": ["mexican grocery", "mexican market", "carniceria"],
    "mexican": ["mexican grocery", "mexican market", "carniceria"],
    "italy": ["italian grocery", "italian deli", "eataly"],
    "italian": ["italian grocery", "italian deli", "eataly"],
    "lebanon": ["middle eastern grocery", "halal grocery", "lebanese grocery"],
    "middle_eastern": ["middle eastern grocery", "halal grocery"],
    "turkey": ["turkish grocery", "middle eastern grocery"],
    "turkish": ["turkish grocery", "middle eastern grocery"],
    "nigeria": ["nigerian grocery", "african grocery", "west african grocery"],
    "nigerian": ["nigerian grocery", "african grocery"],
    "poland": ["polish grocery", "eastern european grocery"],
    "polish": ["polish grocery", "eastern european grocery"],
}
DEFAULT_QUERIES = ["grocery store", "supermarket", "international market"]


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in km between two coordinates."""
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


def _cache_key(lat: float, lon: float, cuisine: Optional[str]) -> str:
    # Round to 2 decimal places (~1.1 km grid) so nearby users share cache hits
    return f"lat:{round(lat, 2)},lon:{round(lon, 2)},cuisine:{cuisine or 'general'}"


async def _search_places(query: str, lat: float, lon: float, radius_m: int = 10000) -> list:
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        # Only request fields we use — keeps us in the cheaper tier
        "X-Goog-FieldMask": (
            "places.id,places.displayName,places.formattedAddress,"
            "places.location,places.rating,places.userRatingCount,"
            "places.priceLevel,places.businessStatus"
        ),
    }
    body = {
        "textQuery": query,
        "locationBias": {
            "circle": {
                "center": {"latitude": lat, "longitude": lon},
                "radius": float(radius_m),
            }
        },
        "maxResultCount": 10,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(PLACES_TEXT_SEARCH_URL, headers=headers, json=body)
        r.raise_for_status()
        return r.json().get("places", [])


def _classify_chain(display_name: str, chains: list) -> Optional[dict]:
    """Match a place's display name against known chain personas."""
    name_lower = display_name.lower()
    for c in chains:
        if c["chain_name"].lower() in name_lower:
            return c
        for alias in (c.get("chain_aliases") or []):
            if alias.lower() in name_lower:
                return c
    return None


class NearbyStoresRequest(BaseModel):
    lat: float
    lon: float
    cuisine: Optional[str] = None
    needed_items: Optional[List[str]] = None


@app.post("/stores/nearby")
async def stores_nearby(req: NearbyStoresRequest, user_id: Optional[str] = Depends(get_user_id)):
    if not GOOGLE_MAPS_API_KEY:
        raise HTTPException(503, "Google Maps API key not configured")

    cache_key = _cache_key(req.lat, req.lon, req.cuisine)

    # Check 24-hour cache
    try:
        cached = supabase.table("store_cache").select("*").eq("cache_key", cache_key).execute()
        if cached.data:
            created = datetime.fromisoformat(cached.data[0]["created_at"].replace("Z", "+00:00"))
            if datetime.now(timezone.utc) - created < timedelta(hours=24):
                return {"stores": cached.data[0]["results"], "from_cache": True}
    except Exception as e:
        print(f"[stores] Cache read failed: {e}")

    # Determine search queries from cuisine
    queries = CUISINE_QUERIES.get(req.cuisine or "", DEFAULT_QUERIES)[:3]

    # Fetch from Google Places (cap at 3 queries to stay efficient)
    all_places: list = []
    seen_ids: set = set()
    for q in queries:
        try:
            places = await _search_places(q, req.lat, req.lon)
            for p in places:
                pid = p.get("id", "")
                if pid and pid not in seen_ids:
                    seen_ids.add(pid)
                    all_places.append(p)
        except Exception as e:
            print(f"[stores] Places query '{q}' failed: {e}")

    # Load chain personas for classification
    try:
        chains = supabase.table("chain_personas").select("*").execute().data or []
    except Exception:
        chains = []

    # Rank and enrich results
    results = []
    for p in all_places:
        display_name = p.get("displayName", {}).get("text", "")
        loc = p.get("location", {})
        plat = loc.get("latitude", 0.0)
        plon = loc.get("longitude", 0.0)
        dist_km = _haversine(req.lat, req.lon, plat, plon)

        chain = _classify_chain(display_name, chains)

        # Cultural relevance score (0-100)
        cultural_score = 40  # default: unknown store
        if chain:
            tier = chain["authenticity_tier"]
            cuisine_match = req.cuisine and req.cuisine in chain["cuisines"]
            if cuisine_match and tier == 1:
                cultural_score = 95
            elif cuisine_match and tier == 2:
                cultural_score = 70
            elif tier == 1:
                cultural_score = 60  # specialty ethnic but different cuisine — still knowledgeable
            elif tier == 2:
                cultural_score = 50
            elif tier == 3:
                cultural_score = 35
            else:
                cultural_score = 20
        else:
            # Unknown store — if it came up in a cuisine-specific query, likely a match
            if req.cuisine and queries != DEFAULT_QUERIES:
                cultural_score = 80  # independent specialty store

        # Distance penalty: -3.3 points per km, capped at -50
        dist_penalty = min(50.0, dist_km * 3.3)
        final_score = max(0.0, cultural_score - dist_penalty)

        results.append({
            "place_id": p.get("id", ""),
            "name": display_name,
            "address": p.get("formattedAddress", ""),
            "lat": plat,
            "lon": plon,
            "rating": p.get("rating"),
            "rating_count": p.get("userRatingCount"),
            "price_level": p.get("priceLevel"),
            "distance_km": round(dist_km, 2),
            "chain_name": chain["chain_name"] if chain else None,
            "cuisines": chain["cuisines"] if chain else [],
            "authenticity_tier": chain["authenticity_tier"] if chain else None,
            "price_tier": chain["price_tier"] if chain else None,
            "notes": chain["notes"] if chain else None,
            "is_specialty": cultural_score >= 80,
            "cultural_score": round(cultural_score),
            "final_score": round(final_score, 1),
        })

    # Sort: best score first, tie-break by distance
    results.sort(key=lambda r: (-r["final_score"], r["distance_km"]))
    results = results[:15]

    # Write to cache (fire-and-forget — don't fail the request on cache write error)
    try:
        supabase.table("store_cache").upsert({"cache_key": cache_key, "results": results}).execute()
    except Exception as e:
        print(f"[stores] Cache write failed: {e}")

    return {"stores": results, "from_cache": False}
