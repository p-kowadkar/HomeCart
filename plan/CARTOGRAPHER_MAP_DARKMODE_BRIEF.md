# Cartographer Supplementary Brief: Map Feature + Dark Mode

> **Apply this AFTER the main brief is shipped and Magic Lens + Recipe Import are demo-ready.**
> If time runs short, do **Phase 1 (Dark Mode)** only -- it transforms the app's feel in 30 minutes.
> Phase 2 (Map) is a 3-4 hour build. Skip if demo is in less than 2 hours.

---

## Phase 0: Read this first

**What we're adding:**
1. **Dark mode by default** across the entire app (Phase 1, ~30 min)
2. **Map integration** at three points (Phase 2, ~3 hr):
   - After Magic Lens scan: "Get the real thing" → map filtered to stores likely to carry it
   - After Recipe Import: "Find stores for this list" → ranked stores by ingredient coverage
   - Standalone Map tab: "Show me everything around me" with cuisine filters

**Stack additions:**
- `react-native-maps` (already supports Expo via config plugin)
- `expo-location` (for user's current position)
- Google Maps SDK for iOS + Android (free unlimited)
- Google Places API (New) -- Text Search endpoint
- Supabase: 2 new tables (`store_cache`, `chain_personas`)

**Cost reality:**
- Map display: free unlimited
- Places searches: Pro tier ($32/1K) but 5K/month free → covers entire hackathon
- Cache aggressively in `store_cache` to stay under free tier in production

---

## Phase 1: Dark Mode (do this first)

### 1.1: Create theme system

Create `app/src/theme/colors.ts`:

```typescript
export const darkColors = {
  // Backgrounds
  bg: '#0A0E14',           // near-black, easier on OLED than #000
  surface: '#151A21',      // cards, sheets
  surfaceElevated: '#1C232C', // modals, dropdowns
  border: '#1F2630',
  borderSubtle: '#2A323D',
  
  // Text
  textPrimary: '#F5F7FA',
  textSecondary: '#A0AAB8',
  textTertiary: '#6B7280',
  textInverse: '#0A0E14',
  
  // Accents
  primary: '#3B82F6',      // blue (kept from existing)
  primarySubtle: 'rgba(59, 130, 246, 0.15)',
  
  // Match score colors
  scoreHigh: '#10B981',    // green: 80-100
  scoreMid: '#F59E0B',     // amber: 50-79
  scoreLow: '#EF4444',     // red: 0-49
  
  // Cultural authenticity highlight
  cultural: '#F472B6',     // pink, used for "specialty store" badges
  culturalSubtle: 'rgba(244, 114, 182, 0.12)',
  
  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  
  // Camera/scan overlay
  scanOverlay: 'rgba(10, 14, 20, 0.6)',
  scanFrame: '#3B82F6',
};

export const lightColors = {
  // Stub for future toggle -- inverse of dark
  bg: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceElevated: '#FFFFFF',
  border: '#E5E7EB',
  borderSubtle: '#F3F4F6',
  textPrimary: '#0A0E14',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  primary: '#3B82F6',
  primarySubtle: 'rgba(59, 130, 246, 0.08)',
  scoreHigh: '#059669',
  scoreMid: '#D97706',
  scoreLow: '#DC2626',
  cultural: '#DB2777',
  culturalSubtle: 'rgba(219, 39, 119, 0.08)',
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  scanOverlay: 'rgba(255, 255, 255, 0.6)',
  scanFrame: '#3B82F6',
};

export type ThemeColors = typeof darkColors;
```

### 1.2: Create theme context

Create `app/src/theme/ThemeContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, ThemeColors } from './colors';

type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  colors: ThemeColors;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('dark'); // dark default for hackathon
  const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme());

  useEffect(() => {
    AsyncStorage.getItem('theme_mode').then((saved) => {
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        setModeState(saved);
      }
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme));
    return () => sub.remove();
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem('theme_mode', newMode);
  };

  const effectiveScheme = mode === 'system' ? (systemScheme ?? 'dark') : mode;
  const isDark = effectiveScheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ colors, mode, setMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
```

### 1.3: Wrap App.tsx

```typescript
// In App.tsx, wrap root with ThemeProvider AFTER AuthProvider:
<AuthProvider>
  <ThemeProvider>
    <NavigationContainer theme={navTheme}>
      {/* ... */}
    </NavigationContainer>
  </ThemeProvider>
</AuthProvider>
```

Add a navigation theme that uses dark colors:

```typescript
import { DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { darkColors } from './src/theme/colors';

const navTheme = {
  ...NavDarkTheme,
  colors: {
    ...NavDarkTheme.colors,
    background: darkColors.bg,
    card: darkColors.surface,
    text: darkColors.textPrimary,
    border: darkColors.border,
    primary: darkColors.primary,
    notification: darkColors.cultural,
  },
};
```

Set `StatusBar` to light: `<StatusBar style="light" />`

### 1.4: Update ALL screens to use `useTheme()`

For every screen file in `app/src/screens/`, replace hardcoded colors with `useTheme().colors.X`.

**Pattern -- before:**
```typescript
const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF' },
  text: { color: '#000000' },
});
```

**Pattern -- after:**
```typescript
const Component = () => {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    container: { backgroundColor: colors.bg },
    text: { color: colors.textPrimary },
  });
  return ...;
};
```

Or use a `makeStyles(colors)` pattern if you prefer styles outside the component:
```typescript
const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { backgroundColor: colors.bg },
  text: { color: colors.textPrimary },
});

const Component = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return ...;
};
```

**Screens to update:**
- `OnboardingScreen.tsx` -- pickers, input boxes, buttons
- `ScanScreen.tsx` / `MagicLensScreen.tsx` -- result cards, score badges (use `scoreHigh`/`scoreMid`/`scoreLow`)
- `ListScreen.tsx` -- recipe input, ingredient cards
- `ProfileScreen.tsx` -- settings, theme toggle
- Any other screens

**Match score badge logic:**
```typescript
const scoreColor = score >= 80 ? colors.scoreHigh : score >= 50 ? colors.scoreMid : colors.scoreLow;
const scoreBgColor = score >= 80 ? 'rgba(16, 185, 129, 0.15)' : score >= 50 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)';
```

### 1.5: Add theme toggle to ProfileScreen

```typescript
const { mode, setMode, colors } = useTheme();

<View style={styles.section}>
  <Text style={styles.sectionTitle}>Appearance</Text>
  {(['dark', 'light', 'system'] as const).map(option => (
    <TouchableOpacity
      key={option}
      onPress={() => setMode(option)}
      style={[styles.optionRow, mode === option && { backgroundColor: colors.primarySubtle }]}
    >
      <Text style={{ color: colors.textPrimary }}>{option.charAt(0).toUpperCase() + option.slice(1)}</Text>
      {mode === option && <Text style={{ color: colors.primary }}>✓</Text>}
    </TouchableOpacity>
  ))}
</View>
```

**That's Phase 1. Verify the app feels right in dark mode before moving on.**

---

## Phase 2: Map Feature

### 2.1: Cloud Console setup (do this BEFORE coding)

In Google Cloud Console (same project as your existing Places API):
1. Enable **Maps SDK for iOS**
2. Enable **Maps SDK for Android**
3. (Already done from main brief: Places API (New))
4. Create a single API key (or use existing) -- restrict it to:
   - Application restrictions: iOS apps + Android apps (add bundle IDs after first build)
   - API restrictions: Maps SDK for iOS, Maps SDK for Android, Places API (New)

Add to `.env`:
```
GOOGLE_MAPS_API_KEY=your_key_here
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
```

### 2.2: Install dependencies

```bash
cd app
npx expo install react-native-maps expo-location
```

### 2.3: Configure app.json

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.cartographer.app",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Cartographer needs your location to show nearby grocery stores."
      }
    },
    "android": {
      "package": "com.cartographer.app",
      "permissions": ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"]
    },
    "plugins": [
      "expo-camera",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow Cartographer to use your location to find nearby stores."
        }
      ],
      [
        "react-native-maps",
        {
          "iosGoogleMapsApiKey": "YOUR_KEY_HERE",
          "androidGoogleMapsApiKey": "YOUR_KEY_HERE"
        }
      ]
    ]
  }
}
```

**CRITICAL:** After this, you MUST rebuild with EAS (or `npx expo prebuild --clean` + dev build). Expo Go cannot use react-native-maps with custom API keys. Use `eas build --profile development --platform ios` (or android).

### 2.4: SQL migration -- store cache + chain personas

Add to your migrations:

```sql
-- Cache for nearby store searches (key: rounded lat/lon + cuisine)
create table public.store_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,  -- "lat:40.72,lon:-74.04,cuisine:indian"
  results jsonb not null,           -- array of store objects
  created_at timestamptz default now()
);

create index idx_store_cache_key on public.store_cache(cache_key);
create index idx_store_cache_created on public.store_cache(created_at);

-- Hand-curated chain personas
create table public.chain_personas (
  id uuid primary key default gen_random_uuid(),
  chain_name text not null,         -- exact match against place displayName
  chain_aliases text[] default '{}', -- alt names: ["whole foods market", "wfm"]
  cuisines text[] not null,         -- which cuisines this chain serves: ["italian", "general"]
  authenticity_tier int not null,   -- 1=specialty ethnic, 2=premium general, 3=mainstream, 4=budget
  price_tier int not null,          -- 1=budget, 2=mid, 3=premium
  notes text                        -- "Best for South Asian basics, frozen section is huge"
);

create index idx_chain_personas_name on public.chain_personas(chain_name);
create index idx_chain_personas_cuisines on public.chain_personas using gin(cuisines);

alter table public.store_cache enable row level security;
alter table public.chain_personas enable row level security;

-- Anyone authenticated can read both
create policy "Authenticated users can read store_cache"
  on public.store_cache for select to authenticated using (true);
create policy "Authenticated users can read chain_personas"
  on public.chain_personas for select to authenticated using (true);

-- Backend service role writes to store_cache
create policy "Service role manages store_cache"
  on public.store_cache for all to service_role using (true) with check (true);
```

### 2.5: Seed chain personas

Create `app/backend/seed_chains.py`:

```python
import os
from supabase import create_client

CHAINS = [
    # Specialty ethnic (tier 1)
    {"chain_name": "Patel Brothers", "chain_aliases": ["patel bros"], "cuisines": ["indian", "south_asian", "pakistani", "bangladeshi", "sri_lankan"], "authenticity_tier": 1, "price_tier": 2,
     "notes": "Best for South Asian basics. Huge frozen aisle, fresh paneer, regional spice mixes."},
    {"chain_name": "H Mart", "chain_aliases": ["h-mart", "hmart"], "cuisines": ["korean", "chinese", "japanese", "vietnamese", "filipino", "east_asian"], "authenticity_tier": 1, "price_tier": 2,
     "notes": "Korean-anchored pan-Asian. Banchan section, fresh seafood, kimchi, K-snacks."},
    {"chain_name": "99 Ranch Market", "chain_aliases": ["99 ranch", "ranch 99"], "cuisines": ["chinese", "taiwanese", "vietnamese", "east_asian"], "authenticity_tier": 1, "price_tier": 2,
     "notes": "Chinese/Taiwanese-anchored. Dim sum freezer, live seafood, regional Chinese sauces."},
    {"chain_name": "Mitsuwa", "chain_aliases": ["mitsuwa marketplace"], "cuisines": ["japanese"], "authenticity_tier": 1, "price_tier": 3,
     "notes": "Japanese specialty. Imported snacks, fresh sashimi, dashi packs."},
    {"chain_name": "Seafood City", "chain_aliases": [], "cuisines": ["filipino"], "authenticity_tier": 1, "price_tier": 2,
     "notes": "Filipino specialty. Lechon, pancit, ube, banana ketchup."},
    {"chain_name": "El Super", "chain_aliases": [], "cuisines": ["mexican"], "authenticity_tier": 1, "price_tier": 1,
     "notes": "Mexican-anchored. Tortilleria, fresh masa, dried chiles, mexican cheeses."},
    {"chain_name": "Northgate Gonzalez Market", "chain_aliases": ["northgate market"], "cuisines": ["mexican"], "authenticity_tier": 1, "price_tier": 1,
     "notes": "Mexican specialty. Carnicería, regional Mexican products."},
    {"chain_name": "Eataly", "chain_aliases": [], "cuisines": ["italian"], "authenticity_tier": 1, "price_tier": 3,
     "notes": "Italian specialty. Imported pasta, DOP/IGP cheeses, San Marzano tomatoes, fresh pasta."},
    {"chain_name": "Compare Foods", "chain_aliases": [], "cuisines": ["caribbean", "dominican", "puerto_rican", "latin"], "authenticity_tier": 1, "price_tier": 1,
     "notes": "Latin/Caribbean. Plantains, yuca, sofrito, queso fresco."},
    {"chain_name": "Sahadi's", "chain_aliases": [], "cuisines": ["lebanese", "syrian", "palestinian", "middle_eastern"], "authenticity_tier": 1, "price_tier": 2,
     "notes": "Middle Eastern specialty. Bulk spices, olive oils, halva, za'atar."},

    # Premium general (tier 2)
    {"chain_name": "Whole Foods Market", "chain_aliases": ["whole foods", "wfm"], "cuisines": ["general", "italian", "mediterranean", "japanese"], "authenticity_tier": 2, "price_tier": 3,
     "notes": "Premium mainstream. Decent international section. Strong on Italian, Mediterranean, organic basics."},
    {"chain_name": "Wegmans", "chain_aliases": [], "cuisines": ["general", "italian", "mediterranean"], "authenticity_tier": 2, "price_tier": 2,
     "notes": "Quality mainstream. Strong international + prepared foods. Italian section is solid."},
    {"chain_name": "Trader Joe's", "chain_aliases": ["trader joes", "tjs"], "cuisines": ["general", "mediterranean", "italian"], "authenticity_tier": 2, "price_tier": 2,
     "notes": "Curated mainstream. Decent fusion options. Don't expect specialty ethnic."},
    {"chain_name": "Fresh Market", "chain_aliases": ["the fresh market"], "cuisines": ["general", "italian"], "authenticity_tier": 2, "price_tier": 3,
     "notes": "Premium boutique. Limited international depth."},

    # Mainstream (tier 3)
    {"chain_name": "Stop & Shop", "chain_aliases": ["stop and shop"], "cuisines": ["general"], "authenticity_tier": 3, "price_tier": 2,
     "notes": "Mainstream supermarket. Limited international but covers basics."},
    {"chain_name": "ShopRite", "chain_aliases": [], "cuisines": ["general"], "authenticity_tier": 3, "price_tier": 2,
     "notes": "Mainstream supermarket. Has some international aisle."},
    {"chain_name": "Kroger", "chain_aliases": [], "cuisines": ["general"], "authenticity_tier": 3, "price_tier": 2,
     "notes": "Mainstream supermarket nationwide. International aisle varies by store."},
    {"chain_name": "Safeway", "chain_aliases": [], "cuisines": ["general"], "authenticity_tier": 3, "price_tier": 2,
     "notes": "Mainstream West Coast. Limited international."},
    {"chain_name": "Publix", "chain_aliases": [], "cuisines": ["general"], "authenticity_tier": 3, "price_tier": 2,
     "notes": "Mainstream Southeast. Decent Latin section."},

    # Budget (tier 4)
    {"chain_name": "Walmart", "chain_aliases": ["walmart supercenter", "walmart neighborhood market"], "cuisines": ["general"], "authenticity_tier": 4, "price_tier": 1,
     "notes": "Budget mainstream. Limited international beyond Latin basics."},
    {"chain_name": "Aldi", "chain_aliases": [], "cuisines": ["general"], "authenticity_tier": 4, "price_tier": 1,
     "notes": "Budget mainstream. Mostly private label, limited international."},
    {"chain_name": "Food Bazaar", "chain_aliases": ["food bazaar supermarket"], "cuisines": ["latin", "caribbean", "asian", "general"], "authenticity_tier": 2, "price_tier": 1,
     "notes": "Budget pan-international. NYC-area chain. Good cross-cultural ingredient coverage."},
]

def seed():
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    sb = create_client(url, key)
    
    sb.table('chain_personas').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
    
    for chain in CHAINS:
        sb.table('chain_personas').insert(chain).execute()
        print(f"  + {chain['chain_name']}")
    
    print(f"\nSeeded {len(CHAINS)} chains")

if __name__ == '__main__':
    seed()
```

Run: `python seed_chains.py`

### 2.6: Backend `/stores/nearby` endpoint

Add to `app/backend/main.py`:

```python
import hashlib
import httpx
from datetime import datetime, timedelta

PLACES_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY')
PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'

# Cuisine -> search keywords mapping
CUISINE_QUERIES = {
    'indian': ['indian grocery', 'south asian grocery', 'patel brothers'],
    'south_asian': ['indian grocery', 'pakistani grocery', 'bangladeshi grocery'],
    'pakistani': ['pakistani grocery', 'halal grocery', 'south asian grocery'],
    'chinese': ['chinese grocery', '99 ranch', 'asian supermarket'],
    'korean': ['korean grocery', 'h mart', 'asian supermarket'],
    'japanese': ['japanese grocery', 'mitsuwa', 'japanese market'],
    'vietnamese': ['vietnamese grocery', 'asian supermarket'],
    'filipino': ['filipino grocery', 'seafood city'],
    'thai': ['thai grocery', 'asian supermarket'],
    'mexican': ['mexican grocery', 'mexican market', 'carniceria'],
    'italian': ['italian grocery', 'italian deli', 'eataly'],
    'middle_eastern': ['middle eastern grocery', 'halal grocery', 'lebanese grocery'],
    'turkish': ['turkish grocery', 'middle eastern grocery'],
    'mediterranean': ['mediterranean grocery', 'greek grocery'],
    'caribbean': ['caribbean grocery', 'jamaican grocery', 'west indian grocery'],
    'african': ['african grocery', 'west african grocery'],
    'nigerian': ['nigerian grocery', 'african grocery'],
    'polish': ['polish grocery', 'eastern european grocery'],
}
DEFAULT_QUERIES = ['grocery store', 'supermarket']

def _cache_key(lat: float, lon: float, cuisine: str) -> str:
    # Round to 2 decimals (~1.1 km grid) for cache hits
    return f"lat:{round(lat, 2)},lon:{round(lon, 2)},cuisine:{cuisine}"

async def _search_places(query: str, lat: float, lon: float, radius_m: int = 10000):
    headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_API_KEY,
        # FieldMask: limit response to keep us in Pro tier
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.priceLevel,places.businessStatus',
    }
    body = {
        'textQuery': query,
        'locationBias': {
            'circle': {
                'center': {'latitude': lat, 'longitude': lon},
                'radius': radius_m,
            }
        },
        'maxResultCount': 10,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(PLACES_TEXT_SEARCH_URL, headers=headers, json=body)
        r.raise_for_status()
        return r.json().get('places', [])

async def _classify_chain(display_name: str, sb) -> dict | None:
    # Try direct match
    name_lower = display_name.lower()
    chains = sb.table('chain_personas').select('*').execute().data
    for c in chains:
        if c['chain_name'].lower() in name_lower or any(alias.lower() in name_lower for alias in (c['chain_aliases'] or [])):
            return c
    return None

class NearbyStoresRequest(BaseModel):
    lat: float
    lon: float
    cuisine: str | None = None  # if None, use generic queries
    needed_items: list[str] | None = None  # for recipe-context ranking

@app.post("/stores/nearby")
async def stores_nearby(req: NearbyStoresRequest, user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    cache_key = _cache_key(req.lat, req.lon, req.cuisine or 'general')
    
    # Check cache (24hr TTL)
    cached = sb.table('store_cache').select('*').eq('cache_key', cache_key).execute().data
    if cached:
        created = datetime.fromisoformat(cached[0]['created_at'].replace('Z', '+00:00'))
        if datetime.now(created.tzinfo) - created < timedelta(hours=24):
            return {'stores': cached[0]['results'], 'from_cache': True}
    
    # Build query list
    queries = CUISINE_QUERIES.get(req.cuisine, DEFAULT_QUERIES) if req.cuisine else DEFAULT_QUERIES
    
    # Fetch from Places (parallel)
    all_places = []
    seen_ids = set()
    for q in queries[:3]:  # cap at 3 queries to stay efficient
        try:
            places = await _search_places(q, req.lat, req.lon)
            for p in places:
                if p['id'] not in seen_ids:
                    seen_ids.add(p['id'])
                    all_places.append(p)
        except Exception as e:
            print(f"Places query failed for '{q}': {e}")
    
    # Rank + enrich with chain personas
    results = []
    for p in all_places:
        display_name = p.get('displayName', {}).get('text', '')
        chain = await _classify_chain(display_name, sb)
        
        # Distance
        loc = p.get('location', {})
        plat, plon = loc.get('latitude', 0), loc.get('longitude', 0)
        dist_km = _haversine(req.lat, req.lon, plat, plon)
        
        # Composite score
        cultural_score = 0
        if chain:
            tier = chain['authenticity_tier']
            cuisine_match = req.cuisine in chain['cuisines'] if req.cuisine else False
            if cuisine_match and tier == 1:
                cultural_score = 95  # specialty ethnic, exact cuisine
            elif cuisine_match and tier == 2:
                cultural_score = 70  # premium general, has the section
            elif tier == 1:
                cultural_score = 60  # specialty ethnic, different cuisine but ethnic-savvy
            elif tier == 2:
                cultural_score = 50
            else:
                cultural_score = 30
        else:
            # Independent store -- assume specialty if name contains cuisine keywords
            if req.cuisine and any(q.split()[0] in display_name.lower() for q in queries[:2]):
                cultural_score = 85  # likely independent specialty
            else:
                cultural_score = 40
        
        # Distance penalty (linear: 0km = 0 penalty, 15km = -50)
        dist_penalty = min(50, dist_km * 3.3)
        final_score = max(0, cultural_score - dist_penalty)
        
        results.append({
            'place_id': p['id'],
            'name': display_name,
            'address': p.get('formattedAddress', ''),
            'lat': plat,
            'lon': plon,
            'rating': p.get('rating'),
            'rating_count': p.get('userRatingCount'),
            'price_level': p.get('priceLevel'),
            'distance_km': round(dist_km, 2),
            'chain_name': chain['chain_name'] if chain else None,
            'cuisines': chain['cuisines'] if chain else [],
            'authenticity_tier': chain['authenticity_tier'] if chain else None,
            'price_tier': chain['price_tier'] if chain else None,
            'notes': chain['notes'] if chain else None,
            'is_specialty': cultural_score >= 80,
            'cultural_score': cultural_score,
            'final_score': final_score,
        })
    
    # Sort by final_score desc, distance asc
    results.sort(key=lambda r: (-r['final_score'], r['distance_km']))
    results = results[:15]  # cap
    
    # Cache
    sb.table('store_cache').upsert({'cache_key': cache_key, 'results': results}).execute()
    
    return {'stores': results, 'from_cache': False}

def _haversine(lat1, lon1, lat2, lon2):
    from math import radians, sin, cos, sqrt, atan2
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))
```

### 2.7: Dark map style JSON

Create `app/src/screens/mapStyle.ts`:

```typescript
// Generated from mapstyle.withgoogle.com -- "Night" preset, customized
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0A0E14' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0E14' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A0AAB8' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#F5F7FA' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },  // hide Google's POI markers, we add our own
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#151A21' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#10B981' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1F2630' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1F2630' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2A323D' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#2A323D' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#A0AAB8' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0A0E14' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3B82F6' }] },
];
```

### 2.8: MapScreen.tsx

Create `app/src/screens/MapScreen.tsx`:

```typescript
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme } from '../theme/ThemeContext';
import { darkMapStyle } from './mapStyle';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://YOUR_LAN_IP:8000';

interface Store {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  rating?: number;
  rating_count?: number;
  distance_km: number;
  chain_name?: string | null;
  cuisines: string[];
  authenticity_tier?: number;
  notes?: string;
  is_specialty: boolean;
  cultural_score: number;
  final_score: number;
}

interface MapScreenProps {
  route?: {
    params?: {
      cuisine?: string;
      neededItems?: string[];
      productName?: string;
    };
  };
}

export default function MapScreen({ route }: MapScreenProps) {
  const { colors, isDark } = useTheme();
  const { session } = useAuth();
  const initialCuisine = route?.params?.cuisine;
  const productName = route?.params?.productName;
  
  const [region, setRegion] = useState<any>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [activeCuisine, setActiveCuisine] = useState<string | undefined>(initialCuisine);

  const fetchStores = useCallback(async (lat: number, lon: number, cuisine?: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/stores/nearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ lat, lon, cuisine: cuisine ?? null }),
      });
      const data = await r.json();
      setStores(data.stores || []);
    } catch (e) {
      console.error('Stores fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Fallback: NYC
        setRegion({ latitude: 40.7128, longitude: -74.0060, latitudeDelta: 0.05, longitudeDelta: 0.05 });
        await fetchStores(40.7128, -74.0060, activeCuisine);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const r = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setRegion(r);
      await fetchStores(loc.coords.latitude, loc.coords.longitude, activeCuisine);
    })();
  }, []);

  const onChangeCuisine = async (cuisine?: string) => {
    setActiveCuisine(cuisine);
    if (region) await fetchStores(region.latitude, region.longitude, cuisine);
  };

  const cuisineColor = (cuisines: string[]) => {
    if (cuisines.includes('indian') || cuisines.includes('south_asian')) return '#F97316'; // orange
    if (cuisines.includes('italian')) return '#22C55E';  // green
    if (cuisines.includes('korean') || cuisines.includes('chinese')) return '#EF4444';  // red
    if (cuisines.includes('japanese')) return '#EC4899';  // pink
    if (cuisines.includes('mexican')) return '#FBBF24';  // gold
    if (cuisines.includes('middle_eastern') || cuisines.includes('turkish')) return '#A855F7';  // purple
    if (cuisines.includes('caribbean') || cuisines.includes('african') || cuisines.includes('nigerian')) return '#F472B6';  // pink-magenta
    return colors.primary;
  };

  if (!region) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {productName && (
        <View style={[styles.contextBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>FINDING STORES FOR</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '600' }}>{productName}</Text>
        </View>
      )}
      
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
        customMapStyle={isDark ? darkMapStyle : []}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {stores.map(store => (
          <Marker
            key={store.place_id}
            coordinate={{ latitude: store.lat, longitude: store.lon }}
            pinColor={cuisineColor(store.cuisines)}
            onPress={() => setSelectedStore(store)}
          >
            <View style={[
              styles.markerPin,
              { backgroundColor: cuisineColor(store.cuisines), borderColor: colors.bg },
              store.is_specialty && styles.markerSpecialty,
            ]}>
              <Text style={styles.markerText}>{Math.round(store.final_score)}</Text>
            </View>
          </Marker>
        ))}
      </MapView>
      
      {/* Cuisine filter chips */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {[undefined, 'indian', 'italian', 'korean', 'mexican', 'chinese', 'middle_eastern', 'japanese'].map(c => (
            <TouchableOpacity
              key={c ?? 'all'}
              onPress={() => onChangeCuisine(c)}
              style={[
                styles.chip,
                {
                  backgroundColor: activeCuisine === c ? colors.primary : colors.surface,
                  borderColor: activeCuisine === c ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={{ color: activeCuisine === c ? '#FFF' : colors.textPrimary, fontSize: 13, fontWeight: '500' }}>
                {c ? c.replace('_', ' ') : 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Store detail sheet */}
      {selectedStore && (
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>{selectedStore.name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                {selectedStore.distance_km.toFixed(1)} km · {selectedStore.address.split(',').slice(0, 2).join(',')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedStore(null)} style={styles.closeBtn}>
              <Text style={{ color: colors.textSecondary, fontSize: 22 }}>×</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.scoreRow}>
            <View style={[styles.scorePill, { backgroundColor: scoreBg(selectedStore.final_score) }]}>
              <Text style={{ color: scoreColor(selectedStore.final_score), fontWeight: '700' }}>
                Match {Math.round(selectedStore.final_score)}
              </Text>
            </View>
            {selectedStore.is_specialty && (
              <View style={[styles.scorePill, { backgroundColor: colors.culturalSubtle }]}>
                <Text style={{ color: colors.cultural, fontWeight: '600', fontSize: 12 }}>SPECIALTY</Text>
              </View>
            )}
            {selectedStore.rating != null && (
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                ⭐ {selectedStore.rating.toFixed(1)} ({selectedStore.rating_count})
              </Text>
            )}
          </View>
          
          {selectedStore.notes && (
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8, lineHeight: 20 }}>
              {selectedStore.notes}
            </Text>
          )}
          
          <TouchableOpacity
            onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${selectedStore.lat},${selectedStore.lon}`)}
            style={[styles.directionsBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 15 }}>Get Directions</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {loading && (
        <View style={[styles.loadingPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={{ color: colors.textPrimary, marginLeft: 8, fontSize: 13 }}>Finding stores…</Text>
        </View>
      )}
    </View>
  );
}

const scoreColor = (s: number) => s >= 80 ? '#10B981' : s >= 50 ? '#F59E0B' : '#EF4444';
const scoreBg = (s: number) => s >= 80 ? 'rgba(16,185,129,0.15)' : s >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contextBanner: { position: 'absolute', top: 60, left: 16, right: 16, padding: 12, borderRadius: 12, borderWidth: 1, zIndex: 10 },
  filterRow: { position: 'absolute', top: 130, left: 0, right: 0, zIndex: 9 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  markerPin: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  markerSpecialty: { borderWidth: 3 },
  markerText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 32, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  closeBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  scorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  directionsBtn: { marginTop: 16, padding: 14, borderRadius: 12, alignItems: 'center' },
  loadingPill: { position: 'absolute', bottom: 32, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1 },
});
```

### 2.9: Add MapScreen to navigation

In your main navigator, add:

```typescript
<Tab.Screen name="Map" component={MapScreen} options={{ tabBarIcon: ... }} />
```

Or as a stack screen if you prefer modal access.

### 2.10: Wire integration points

**From MagicLensScreen.tsx -- after a successful scan:**

After the `setResult(data)` call in the scan handler, add a button to the result card:

```typescript
{result.real_version_name && (
  <TouchableOpacity
    onPress={() => navigation.navigate('Map', {
      cuisine: profile?.cuisine_origin,
      productName: result.real_version_name,
    })}
    style={[styles.cta, { backgroundColor: colors.primary }]}
  >
    <Text style={styles.ctaText}>Get the real thing →</Text>
  </TouchableOpacity>
)}
```

**From ListScreen.tsx -- after recipe import succeeds:**

```typescript
{ingredients.length > 0 && (
  <TouchableOpacity
    onPress={() => navigation.navigate('Map', {
      cuisine: profile?.cuisine_origin,
      neededItems: ingredients.map(i => i.name),
    })}
    style={[styles.cta, { backgroundColor: colors.primary, marginTop: 16 }]}
  >
    <Text style={styles.ctaText}>Find stores for this list →</Text>
  </TouchableOpacity>
)}
```

---

## Demo Script Additions

After Magic Lens demo:
> "And here's where it gets actionable -- I tap 'Get the real thing'..."
> [Map opens, dark theme, orange Indian markers cluster nearby]
> "Patel Brothers, 2 km away, match score 95. It tells me they have the frozen aisle and fresh paneer."

After Recipe Import demo:
> "Now I tap 'Find stores for this list' on my biryani recipe..."
> [Map shows specialty Indian + premium general stores ranked]
> "Patel Brothers covers most of it, but for the saffron and a quality basmati I might also want Whole Foods two blocks over."

---

## Cost / Quota Notes

- **Map display:** unlimited free (Maps SDK for mobile)
- **Places Text Search per session:** 3 queries × ~12 fields = 3 Pro tier events per cuisine search
- **24hr cache key** at 0.01° lat/lon precision (~1.1 km grid) means most users in dense areas hit cache
- Hackathon load: well under 5K Pro free events
- Set GCP quota cap at **500 requests/day** for safety: APIs & Services → Quotas → Places API → "Requests per day"

---

## Skip-If-Time-Tight Order

If you're cutting it close, prioritize:

1. **Phase 1 (Dark mode)** -- always do this. 30 min, biggest visual upgrade.
2. **MapScreen with current location + simple markers** -- 90 min if Phase 1 is done.
3. **Chain personas + ranking** -- 45 min, makes the map feel intelligent.
4. **Recipe → Map integration** -- 15 min if MapScreen exists.

If demo is in <2 hours, skip Phase 2 entirely. The dark mode + Magic Lens + Recipe Import is already a strong demo.

---

## Verification checklist

- [ ] App opens in dark mode by default
- [ ] All screens use theme colors (no hardcoded hex)
- [ ] StatusBar is light on dark bg
- [ ] Map renders in dark style on both iOS and Android
- [ ] Markers show with cuisine-coded colors
- [ ] Tapping marker opens detail sheet
- [ ] "Get Directions" opens Google Maps app
- [ ] Cache hit returns within 200ms
- [ ] Magic Lens "Get the real thing" button navigates with correct params
- [ ] Recipe Import "Find stores" button navigates with correct params
