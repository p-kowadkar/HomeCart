# Cartographer -- Claude Code Implementation Brief

**Paste this entire file into Claude Code. It contains everything needed to fix bugs, add features, and ship a demo-ready app within 90 minutes.**

---

## CONTEXT

You are completing a hackathon project called **Cartographer** -- a React Native (Expo) + FastAPI + Supabase mobile app that helps immigrants navigate American grocery stores. It uses Claude Vision to scan products and translate them culturally to the user's home cuisine.

The repo has a working auth + onboarding skeleton but several critical bugs and missing features. Your job is to fix everything and ship the AI-driven demo features.

**Demo flow** (this is what judges will see):
1. User onboards: picks country (e.g., India + Karnataka, or Italy + Sicily), language, cooking confidence, dietary preferences
2. User opens Magic Lens, points camera at a product (e.g., bag of Goya rice)
3. Claude Vision identifies the product
4. App returns: cultural equivalent ("for biryani, India Gate Sella is closer to home"), Match Score (0-100), AI tip, and a "make it at home" option if applicable
5. User can also import a recipe ("biryani") and get a US-shoppable ingredient list with Match Scores

**Priority order:** Fix bugs FIRST, then ship Magic Lens, then Recipe Importer, then polish.

---

## CRITICAL BUGS TO FIX FIRST (15 minutes max)

### Bug 1: Profile schema is broken

`app/migrations/001_initial_schema.sql` defines `profiles.id` as auto-generated UUID, but `AuthContext.tsx` queries `profiles` using `auth.users.id`. The query will always return empty.

**Fix:** Replace `app/migrations/001_initial_schema.sql` with a new migration that:
- References `auth.users(id)` for the profile ID
- Includes ALL the columns the app actually uses (the current schema is missing several)
- Adds proper RLS policies (currently RLS is enabled with NO policies, which silently breaks everything)

Use this SQL:

```sql
-- Drop and recreate -- this is a hackathon, no data migration needed

DROP TABLE IF EXISTS list_items CASCADE;
DROP TABLE IF EXISTS shopping_lists CASCADE;
DROP TABLE IF EXISTS scans CASCADE;
DROP TABLE IF EXISTS equivalences CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================
-- PROFILES (one per auth user)
-- =============================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    
    -- Cultural identity
    home_country TEXT,
    home_region TEXT,
    home_cuisines TEXT[] DEFAULT '{}',
    repertoire TEXT[] DEFAULT '{}',
    preferred_language TEXT DEFAULT 'English',
    
    -- Dietary
    dietary_preferences TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    
    -- Cooking confidence (1-5)
    cooking_confidence INT DEFAULT 3 CHECK (cooking_confidence BETWEEN 1 AND 5),
    
    -- Location
    home_lat NUMERIC,
    home_lng NUMERIC,
    home_city TEXT,
    
    -- State
    onboarding_completed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================
-- SCANS (every product scanned)
-- =============================
CREATE TABLE scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    image_url TEXT,
    
    detected_product TEXT,
    detected_brand TEXT,
    detected_category TEXT,
    
    cultural_equivalent TEXT,
    match_score INT CHECK (match_score BETWEEN 0 AND 100),
    ai_tip TEXT,
    can_make_at_home BOOLEAN DEFAULT FALSE,
    home_recipe_summary TEXT,
    real_version_name TEXT,
    
    raw_vision_response JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scans_user_time ON scans(user_id, created_at DESC);

-- =============================
-- SHOPPING LISTS (recipe imports)
-- =============================
CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_dish TEXT,
    status TEXT CHECK (status IN ('planning', 'shopping', 'completed')) DEFAULT 'planning',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lists_user ON shopping_lists(user_id);

CREATE TABLE list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    
    original_ingredient TEXT NOT NULL,
    us_equivalent_brand TEXT,
    us_equivalent_product TEXT,
    match_score INT CHECK (match_score BETWEEN 0 AND 100),
    aisle_location TEXT,
    ai_tip TEXT,
    can_make_at_home BOOLEAN DEFAULT FALSE,
    
    is_checked BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_list_items_list ON list_items(list_id);

-- =============================
-- EQUIVALENCES (curated cultural data)
-- =============================
CREATE TABLE equivalences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_item TEXT NOT NULL,
    home_cuisine TEXT NOT NULL,
    us_equivalent TEXT NOT NULL,
    us_brand TEXT,
    match_score INT CHECK (match_score BETWEEN 0 AND 100),
    notes TEXT,
    can_make_at_home BOOLEAN DEFAULT FALSE,
    home_recipe_summary TEXT,
    aisle_hint TEXT
);

CREATE INDEX idx_equiv_lookup ON equivalences(home_cuisine, home_item);

-- =============================
-- RLS POLICIES (essential)
-- =============================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE equivalences ENABLE ROW LEVEL SECURITY;

-- Profiles: users see/edit own only
CREATE POLICY "users_own_profile" ON profiles FOR ALL TO authenticated 
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Scans: users see/edit own only
CREATE POLICY "users_own_scans" ON scans FOR ALL TO authenticated 
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Lists: users see/edit own only
CREATE POLICY "users_own_lists" ON shopping_lists FOR ALL TO authenticated 
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- List items: users see/edit items in their own lists
CREATE POLICY "users_own_list_items" ON list_items FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM shopping_lists sl WHERE sl.id = list_items.list_id AND sl.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM shopping_lists sl WHERE sl.id = list_items.list_id AND sl.user_id = auth.uid()));

-- Equivalences: global read (it's curated data)
CREATE POLICY "everyone_reads_equivalences" ON equivalences FOR SELECT TO authenticated USING (true);

-- =============================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

After running this SQL in Supabase, the app's auth + onboarding flow will work end-to-end.

### Bug 2: AuthContext profile fetch handles missing profile incorrectly

In `app/frontend/context/AuthContext.tsx`, the `fetchProfile` function sets `profile = null` on PGRST116 error, but `App.tsx` checks `profile === undefined` for loading and `!profile?.onboarding_completed` for routing. The undefined check causes flicker.

**Fix:** Update `AuthContext.tsx` so that:
- `profile` starts as `undefined` (loading)
- After fetch attempt, becomes the data OR an empty object `{}` (NOT null), so `onboarding_completed` checks work cleanly
- Add a `loading` state separately from profile state

### Bug 3: Onboarding doesn't capture what we need

`OnboardingScreen.tsx` writes `home_country`, `preferred_language`, `dietary_preferences`, `onboarding_completed`. The new schema needs more.

**Fix:** Update `OnboardingScreen.tsx` to also capture:
- `home_region` (regional specificity -- Karnataka, Sicily, Oaxaca, etc.)
- `cooking_confidence` (1-5 slider)
- `home_cuisines` (derived from country/region selection, can be auto-set)

Also expand the country list (see Feature 1).

---

## FEATURE 1: Expanded country/region list

Replace the `REGIONS` array in `OnboardingScreen.tsx` with this comprehensive list. Use a 2-step picker: country first, then region within that country.

```typescript
const COUNTRIES = [
  // South Asia
  { id: 'india', name: 'India', flag: '🇮🇳', regions: ['North Indian', 'South Indian', 'Bengali', 'Gujarati', 'Punjabi', 'Maharashtrian', 'Karnataka', 'Kerala', 'Tamil', 'Hyderabadi', 'Goan'] },
  { id: 'pakistan', name: 'Pakistan', flag: '🇵🇰', regions: ['Punjabi', 'Sindhi', 'Pashtun', 'Balochi'] },
  { id: 'bangladesh', name: 'Bangladesh', flag: '🇧🇩', regions: ['Dhaka', 'Chittagong', 'Sylhet'] },
  { id: 'srilanka', name: 'Sri Lanka', flag: '🇱🇰', regions: ['Sinhalese', 'Tamil'] },
  { id: 'nepal', name: 'Nepal', flag: '🇳🇵', regions: ['Newari', 'Thakali', 'Tibetan'] },
  
  // East Asia
  { id: 'china', name: 'China', flag: '🇨🇳', regions: ['Sichuan', 'Cantonese', 'Hunan', 'Shanghainese', 'Northeastern', 'Xinjiang', 'Yunnan'] },
  { id: 'japan', name: 'Japan', flag: '🇯🇵', regions: ['Kansai', 'Kanto', 'Okinawan', 'Hokkaido'] },
  { id: 'korea', name: 'South Korea', flag: '🇰🇷', regions: ['Seoul', 'Jeolla', 'Gyeongsang', 'Jeju'] },
  { id: 'taiwan', name: 'Taiwan', flag: '🇹🇼', regions: ['Taipei', 'Hakka', 'Aboriginal'] },
  
  // Southeast Asia
  { id: 'vietnam', name: 'Vietnam', flag: '🇻🇳', regions: ['Northern', 'Central', 'Southern'] },
  { id: 'thailand', name: 'Thailand', flag: '🇹🇭', regions: ['Central', 'Northern', 'Northeastern (Isan)', 'Southern'] },
  { id: 'philippines', name: 'Philippines', flag: '🇵🇭', regions: ['Luzon', 'Visayas', 'Mindanao'] },
  { id: 'indonesia', name: 'Indonesia', flag: '🇮🇩', regions: ['Javanese', 'Sumatran', 'Balinese', 'Padang'] },
  { id: 'malaysia', name: 'Malaysia', flag: '🇲🇾', regions: ['Malay', 'Chinese-Malay', 'Indian-Malay', 'Nyonya'] },
  { id: 'singapore', name: 'Singapore', flag: '🇸🇬', regions: ['Chinese-Singaporean', 'Malay-Singaporean', 'Indian-Singaporean', 'Peranakan'] },
  
  // Europe
  { id: 'italy', name: 'Italy', flag: '🇮🇹', regions: ['Sicilian', 'Tuscan', 'Lombard', 'Neapolitan', 'Roman', 'Venetian', 'Calabrian', 'Sardinian', 'Emilian'] },
  { id: 'france', name: 'France', flag: '🇫🇷', regions: ['Parisian', 'Provençal', 'Norman', 'Alsatian', 'Lyonnaise', 'Basque'] },
  { id: 'spain', name: 'Spain', flag: '🇪🇸', regions: ['Catalan', 'Andalusian', 'Basque', 'Galician', 'Castilian', 'Valencian'] },
  { id: 'portugal', name: 'Portugal', flag: '🇵🇹', regions: ['Lisbon', 'Porto', 'Alentejo', 'Azorean'] },
  { id: 'greece', name: 'Greece', flag: '🇬🇷', regions: ['Mainland', 'Cretan', 'Aegean'] },
  { id: 'germany', name: 'Germany', flag: '🇩🇪', regions: ['Bavarian', 'Berlin', 'Swabian', 'Northern'] },
  { id: 'poland', name: 'Poland', flag: '🇵🇱', regions: ['Kraków', 'Warsaw', 'Silesian'] },
  { id: 'turkey', name: 'Turkey', flag: '🇹🇷', regions: ['Istanbul', 'Anatolian', 'Aegean', 'Black Sea', 'Southeastern'] },
  { id: 'russia', name: 'Russia', flag: '🇷🇺', regions: ['Moscow', 'Siberian', 'Caucasian'] },
  { id: 'ukraine', name: 'Ukraine', flag: '🇺🇦', regions: ['Western', 'Central', 'Eastern'] },
  
  // Middle East
  { id: 'iran', name: 'Iran', flag: '🇮🇷', regions: ['Persian', 'Azeri', 'Kurdish'] },
  { id: 'lebanon', name: 'Lebanon', flag: '🇱🇧', regions: ['Beirut', 'Bekaa'] },
  { id: 'israel', name: 'Israel', flag: '🇮🇱', regions: ['Ashkenazi', 'Sephardic', 'Mizrahi'] },
  { id: 'egypt', name: 'Egypt', flag: '🇪🇬', regions: ['Cairo', 'Alexandrian', 'Upper Egyptian'] },
  
  // Africa
  { id: 'nigeria', name: 'Nigeria', flag: '🇳🇬', regions: ['Yoruba', 'Igbo', 'Hausa'] },
  { id: 'ghana', name: 'Ghana', flag: '🇬🇭', regions: ['Ashanti', 'Northern', 'Coastal'] },
  { id: 'ethiopia', name: 'Ethiopia', flag: '🇪🇹', regions: ['Amhara', 'Tigray', 'Oromo'] },
  { id: 'morocco', name: 'Morocco', flag: '🇲🇦', regions: ['Fez', 'Marrakesh', 'Berber'] },
  { id: 'southafrica', name: 'South Africa', flag: '🇿🇦', regions: ['Cape Malay', 'Zulu', 'Afrikaner'] },
  { id: 'kenya', name: 'Kenya', flag: '🇰🇪', regions: ['Coastal', 'Highland'] },
  
  // Americas
  { id: 'mexico', name: 'Mexico', flag: '🇲🇽', regions: ['Oaxacan', 'Yucatecan', 'Northern', 'Central', 'Pueblan'] },
  { id: 'brazil', name: 'Brazil', flag: '🇧🇷', regions: ['Bahian', 'Mineiro', 'Gaúcho', 'Amazonian'] },
  { id: 'argentina', name: 'Argentina', flag: '🇦🇷', regions: ['Buenos Aires', 'Patagonian', 'Northwestern'] },
  { id: 'peru', name: 'Peru', flag: '🇵🇪', regions: ['Coastal', 'Andean', 'Amazonian'] },
  { id: 'colombia', name: 'Colombia', flag: '🇨🇴', regions: ['Andean', 'Caribbean', 'Pacific'] },
  { id: 'venezuela', name: 'Venezuela', flag: '🇻🇪', regions: ['Caracas', 'Andean', 'Llanero'] },
  { id: 'cuba', name: 'Cuba', flag: '🇨🇺', regions: ['Havana', 'Eastern'] },
  { id: 'jamaica', name: 'Jamaica', flag: '🇯🇲', regions: ['Kingston', 'Mountain'] },
  { id: 'usa', name: 'USA', flag: '🇺🇸', regions: ['Southern', 'Tex-Mex', 'Cajun', 'New England', 'Soul Food'] },
];
```

In the onboarding, after country selection show a horizontal scroll of regions. Save BOTH `home_country` (id) and `home_region` (the chosen region string) to the profile.

Auto-derive `home_cuisines` as `[country_name, "${country_name} (${region})"]` (e.g. `["India", "India (Karnataka)"]`).

---

## FEATURE 2: Magic Lens (the killer demo moment)

This is the highest-priority feature. **It's what wins.**

### Frontend: Replace `app/frontend/screens/MagicLensScreen.tsx`

Use `expo-camera` to capture a photo, send it to the backend, and display the result.

```typescript
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

type ScanResult = {
  detected_product: string;
  detected_brand?: string;
  detected_category?: string;
  cultural_equivalent: string;
  match_score: number;
  ai_tip: string;
  can_make_at_home: boolean;
  home_recipe_summary?: string;
  real_version_name?: string;
};

export default function MagicLensScreen() {
  const { user, profile } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator color="#3B82F6" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialCommunityIcons name="camera-off" size={80} color="#94A3B8" />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionText}>Magic Lens needs camera to scan products.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const captureAndScan = async () => {
    if (!cameraRef.current) return;
    try {
      setScanning(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
      });
      
      if (!photo?.base64) {
        Alert.alert('Error', 'Failed to capture image');
        setScanning(false);
        return;
      }
      
      setCapturedImage(`data:image/jpeg;base64,${photo.base64}`);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${API_URL}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          image_base64: photo.base64,
          user_profile: {
            home_country: profile?.home_country,
            home_region: profile?.home_region,
            home_cuisines: profile?.home_cuisines || [],
            cooking_confidence: profile?.cooking_confidence || 3,
            dietary_preferences: profile?.dietary_preferences || [],
          }
        }),
      });
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API error: ${errText}`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error('Scan error:', err);
      Alert.alert('Scan Failed', err.message || 'Try again');
    } finally {
      setScanning(false);
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setResult(null);
  };

  if (result) {
    return <ScanResultView result={result} image={capturedImage} onReset={reset} />;
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Point at any product</Text>
          </View>
          
          <View style={styles.targetFrame} />
          
          <View style={styles.captureContainer}>
            {scanning ? (
              <View style={styles.scanning}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.scanningText}>Reading the label...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.captureButton} onPress={captureAndScan}>
                <View style={styles.captureInner} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

function ScanResultView({ result, image, onReset }: { result: ScanResult; image: string | null; onReset: () => void }) {
  const scoreColor = result.match_score >= 75 ? '#10B981' : result.match_score >= 50 ? '#F59E0B' : '#EF4444';
  
  return (
    <ScrollView style={styles.resultContainer} contentContainerStyle={styles.resultContent}>
      {image && <Image source={{ uri: image }} style={styles.resultImage} />}
      
      <View style={styles.resultCard}>
        <Text style={styles.productName}>{result.detected_product}</Text>
        {result.detected_brand && <Text style={styles.productBrand}>{result.detected_brand}</Text>}
        
        <View style={[styles.scoreCircle, { backgroundColor: scoreColor }]}>
          <Text style={styles.scoreNumber}>{result.match_score}</Text>
          <Text style={styles.scoreLabel}>MATCH</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>For your cuisine</Text>
          <Text style={styles.sectionText}>{result.cultural_equivalent}</Text>
        </View>
        
        {result.real_version_name && (
          <View style={[styles.section, styles.greenSection]}>
            <Text style={styles.sectionLabel}>The real thing</Text>
            <Text style={styles.sectionText}>{result.real_version_name}</Text>
          </View>
        )}
        
        <View style={[styles.section, styles.tipSection]}>
          <Text style={styles.sectionLabel}>💡 AI Tip</Text>
          <Text style={styles.sectionText}>{result.ai_tip}</Text>
        </View>
        
        {result.can_make_at_home && result.home_recipe_summary && (
          <View style={[styles.section, styles.recipeSection]}>
            <Text style={styles.sectionLabel}>🏠 Make it at home</Text>
            <Text style={styles.sectionText}>{result.home_recipe_summary}</Text>
          </View>
        )}
      </View>
      
      <TouchableOpacity style={styles.scanAgainButton} onPress={onReset}>
        <Text style={styles.scanAgainText}>Scan another</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  header: { padding: 20, paddingTop: 60, alignItems: 'center' },
  headerText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  targetFrame: {
    position: 'absolute', top: '30%', left: '15%', right: '15%', bottom: '35%',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 16,
  },
  captureContainer: { padding: 40, alignItems: 'center' },
  captureButton: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  scanning: { alignItems: 'center' },
  scanningText: { color: '#fff', marginTop: 12, fontSize: 16, fontWeight: '600' },
  permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#fff' },
  permissionTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 20, color: '#1E293B' },
  permissionText: { fontSize: 16, color: '#64748B', textAlign: 'center', marginTop: 8 },
  permissionButton: { backgroundColor: '#3B82F6', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, marginTop: 24 },
  permissionButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  resultContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  resultContent: { padding: 20, paddingBottom: 40 },
  resultImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: 20 },
  resultCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, elevation: 2 },
  productName: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
  productBrand: { fontSize: 14, color: '#64748B', marginTop: 4 },
  scoreCircle: {
    width: 100, height: 100, borderRadius: 50, alignSelf: 'center',
    justifyContent: 'center', alignItems: 'center', marginVertical: 20,
  },
  scoreNumber: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  scoreLabel: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  section: { backgroundColor: '#F1F5F9', padding: 16, borderRadius: 12, marginTop: 12 },
  greenSection: { backgroundColor: '#D1FAE5' },
  tipSection: { backgroundColor: '#DBEAFE' },
  recipeSection: { backgroundColor: '#FEF3C7' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, letterSpacing: 0.5 },
  sectionText: { fontSize: 15, color: '#1E293B', lineHeight: 22 },
  scanAgainButton: { backgroundColor: '#0F172A', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  scanAgainText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
```

Add to `app/frontend/package.json` dependencies:
```json
"expo-camera": "~16.0.0"
```

Add to `app/frontend/app.json` plugins array:
```json
[
  "expo-camera",
  { "cameraPermission": "Allow Cartographer to access your camera to scan grocery products." }
]
```

### Backend: Build the `/scan` endpoint

Replace `app/backend/main.py`:

```python
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from supabase import create_client, Client
import os
import json
import base64
import httpx
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
```

Add to `app/backend/requirements.txt`:
```
fastapi
uvicorn[standard]
supabase
python-dotenv
pydantic
pydantic-settings
httpx
```

Add to `app/backend/.env.example`:
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ANTHROPIC_API_KEY=
```

---

## FEATURE 3: Recipe Importer (Plan 4)

Replace `app/frontend/screens/ListScreen.tsx` to add recipe import.

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

type Ingredient = {
  original_ingredient: string;
  us_equivalent_product: string;
  us_brand?: string;
  match_score: number;
  aisle_location: string;
  ai_tip: string;
  can_make_at_home: boolean;
};

export default function ListScreen() {
  const { profile } = useAuth();
  const [dish, setDish] = useState('');
  const [loading, setLoading] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [dishName, setDishName] = useState('');

  const importRecipe = async () => {
    if (!dish.trim()) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`${API_URL}/recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          dish_name: dish,
          user_profile: {
            home_country: profile?.home_country,
            home_region: profile?.home_region,
            home_cuisines: profile?.home_cuisines || [],
            cooking_confidence: profile?.cooking_confidence || 3,
            dietary_preferences: profile?.dietary_preferences || [],
          }
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setIngredients(data.ingredients || []);
      setDishName(data.dish_name || dish);
      setDish('');
    } catch (err: any) {
      Alert.alert('Recipe Import Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) => score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Recipe Importer</Text>
        <Text style={styles.subtitle}>Type a dish from home -- I'll build your shopping list.</Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="e.g. biryani, pasta carbonara..."
            value={dish}
            onChangeText={setDish}
            onSubmitEditing={importRecipe}
          />
          <TouchableOpacity style={styles.importButton} onPress={importRecipe} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <MaterialCommunityIcons name="auto-fix" size={24} color="#fff" />}
          </TouchableOpacity>
        </View>

        {dishName && ingredients.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.dishHeader}>{dishName}</Text>
            {ingredients.map((ing, idx) => (
              <View key={idx} style={styles.ingredientCard}>
                <View style={styles.ingredientHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.originalName}>{ing.original_ingredient}</Text>
                    <Text style={styles.usName}>{ing.us_brand ? `${ing.us_brand} -- ` : ''}{ing.us_equivalent_product}</Text>
                  </View>
                  <View style={[styles.scoreBadge, { backgroundColor: scoreColor(ing.match_score) }]}>
                    <Text style={styles.scoreBadgeText}>{ing.match_score}</Text>
                  </View>
                </View>
                
                <View style={styles.aisleRow}>
                  <MaterialCommunityIcons name="map-marker" size={14} color="#64748B" />
                  <Text style={styles.aisleText}>{ing.aisle_location}</Text>
                </View>
                
                <View style={styles.tipBox}>
                  <Text style={styles.tipText}>💡 {ing.ai_tip}</Text>
                </View>
                
                {ing.can_make_at_home && (
                  <Text style={styles.makeAtHome}>🏠 You can make this at home</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0F172A', marginTop: 12 },
  subtitle: { fontSize: 16, color: '#64748B', marginTop: 4, marginBottom: 24 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  importButton: { backgroundColor: '#3B82F6', width: 56, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dishHeader: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', marginBottom: 16 },
  ingredientCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  ingredientHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  originalName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  usName: { fontSize: 14, color: '#3B82F6', marginTop: 4 },
  scoreBadge: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  scoreBadgeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  aisleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  aisleText: { fontSize: 13, color: '#64748B' },
  tipBox: { backgroundColor: '#DBEAFE', padding: 10, borderRadius: 8, marginTop: 10 },
  tipText: { fontSize: 13, color: '#1E40AF', lineHeight: 18 },
  makeAtHome: { fontSize: 12, color: '#92400E', marginTop: 8, fontWeight: '600' },
});
```

---

## FEATURE 4: Curated equivalence seed data

Create `app/backend/seed_equivalences.py`. This is the moat: real, hand-verified data so the demo doesn't rely on LLM hallucination.

```python
"""
Seed the equivalences table with curated cultural translation data.
Run: python seed_equivalences.py
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(os.environ["SUPABASE_URL"], os.environ.get("SUPABASE_SERVICE_KEY"))

EQUIVALENCES = [
    # ========== INDIAN ==========
    {"home_item": "paneer", "home_cuisine": "Indian", "us_equivalent": "queso fresco", "us_brand": "Cacique", "match_score": 65, "notes": "Queso fresco is softer and slightly saltier. For grilled paneer dishes, halloumi works better. Best option: make it at home with whole milk + lemon juice in 20 min.", "can_make_at_home": True, "home_recipe_summary": "Boil 4 cups whole milk, add 2 tbsp lemon juice, strain through cheesecloth, press for 20 min.", "aisle_hint": "Cheese aisle / Hispanic foods"},
    {"home_item": "atta (whole wheat flour)", "home_cuisine": "Indian", "us_equivalent": "whole wheat flour", "us_brand": "Bob's Red Mill", "match_score": 70, "notes": "Bob's Red Mill stone ground is closest. Indian atta is finer milled -- sift twice for soft rotis.", "can_make_at_home": False, "aisle_hint": "Baking aisle"},
    {"home_item": "ghee", "home_cuisine": "Indian", "us_equivalent": "clarified butter / ghee", "us_brand": "4th & Heart", "match_score": 95, "notes": "4th & Heart Original Ghee is excellent. Or make at home: simmer unsalted butter 15 min, strain.", "can_make_at_home": True, "home_recipe_summary": "Simmer 1 lb unsalted butter on low for 15-20 min until milk solids brown, strain.", "aisle_hint": "Health foods / butter aisle"},
    {"home_item": "basmati rice", "home_cuisine": "Indian", "us_equivalent": "basmati rice", "us_brand": "India Gate / Tilda", "match_score": 90, "notes": "India Gate Sella (parboiled) for biryani, Royal/Tilda for everyday. Avoid generic 'long grain'.", "can_make_at_home": False, "aisle_hint": "Rice aisle / International"},
    {"home_item": "curd / dahi", "home_cuisine": "Indian", "us_equivalent": "plain whole milk yogurt", "us_brand": "Fage 5%", "match_score": 75, "notes": "Fage Total 5% is thick like Indian curd. For thinner curd, mix with milk. Avoid Greek strained.", "can_make_at_home": True, "home_recipe_summary": "Heat milk to 110°F, mix in 2 tbsp existing yogurt, leave warm 8 hours.", "aisle_hint": "Dairy"},
    {"home_item": "moong dal", "home_cuisine": "Indian", "us_equivalent": "split yellow mung beans", "us_brand": "Swad / 24 Mantra", "match_score": 95, "notes": "Best at Indian grocery. Whole Foods carries it under 'split mung'.", "can_make_at_home": False, "aisle_hint": "Beans/legumes aisle"},
    {"home_item": "garam masala", "home_cuisine": "Indian", "us_equivalent": "garam masala", "us_brand": "MDH / Everest", "match_score": 90, "notes": "MDH and Everest brands are most authentic. McCormick version is bland.", "can_make_at_home": True, "home_recipe_summary": "Roast 2 tbsp coriander, 1 tbsp cumin, 1 tbsp cardamom, 1 cinnamon stick, grind.", "aisle_hint": "Spices / International"},
    {"home_item": "asafoetida (hing)", "home_cuisine": "Indian", "us_equivalent": "hing powder", "us_brand": "Vandevi / LG", "match_score": 90, "notes": "Only available at Indian grocery stores. There's no American substitute -- worth a special trip.", "can_make_at_home": False, "aisle_hint": "Indian grocery only"},
    {"home_item": "fresh curry leaves", "home_cuisine": "Indian", "us_equivalent": "frozen curry leaves", "us_brand": "Swad", "match_score": 70, "notes": "Frozen retains flavor better than dried. Bay leaves are NOT a substitute -- different flavor entirely.", "can_make_at_home": False, "aisle_hint": "Indian grocery freezer section"},
    {"home_item": "mustard oil", "home_cuisine": "Indian", "us_equivalent": "mustard oil", "us_brand": "KTC / Pure", "match_score": 85, "notes": "US-sold mustard oil is labeled 'for external use' due to FDA. Most home cooks heat it past smoke point first to remove erucic acid concerns.", "can_make_at_home": False, "aisle_hint": "Indian grocery"},
    
    # ========== ITALIAN ==========
    {"home_item": "ricotta salata", "home_cuisine": "Italian", "us_equivalent": "ricotta salata", "us_brand": "Locatelli", "match_score": 80, "notes": "Whole Foods or Italian deli only. Aged feta is a poor substitute -- too salty, wrong texture. Eataly carries DOP version.", "can_make_at_home": False, "aisle_hint": "Specialty cheese counter"},
    {"home_item": "pecorino romano", "home_cuisine": "Italian", "us_equivalent": "pecorino romano DOP", "us_brand": "Locatelli / Fulvi", "match_score": 95, "notes": "Locatelli is the standard. Avoid pre-grated -- flavor degrades fast. Get a wedge.", "can_make_at_home": False, "aisle_hint": "Cheese counter"},
    {"home_item": "guanciale", "home_cuisine": "Italian", "us_equivalent": "guanciale", "us_brand": "Niman Ranch / Bellentani", "match_score": 90, "notes": "Pancetta is acceptable. American bacon is NOT -- too smoky for proper carbonara/amatriciana.", "can_make_at_home": False, "aisle_hint": "Italian deli / specialty meats"},
    {"home_item": "san marzano tomatoes", "home_cuisine": "Italian", "us_equivalent": "San Marzano DOP tomatoes", "us_brand": "Cento / La Valle", "match_score": 90, "notes": "Look for 'DOP' seal -- many fakes. Cento Certified are reliable. Hunt's whole peeled work in a pinch.", "can_make_at_home": False, "aisle_hint": "Canned tomatoes"},
    {"home_item": "fresh mozzarella di bufala", "home_cuisine": "Italian", "us_equivalent": "buffalo mozzarella", "us_brand": "BelGioioso / Mozzarella Co.", "match_score": 75, "notes": "Whole Foods stocks BelGioioso. For real bufala, find an Italian deli -- imported is in water packets.", "can_make_at_home": False, "aisle_hint": "Cheese counter"},
    {"home_item": "00 flour (tipo 00)", "home_cuisine": "Italian", "us_equivalent": "00 flour", "us_brand": "Caputo", "match_score": 95, "notes": "Caputo Pizzeria is the standard. King Arthur 00 also works. All-purpose flour is an OK substitute for pasta but not pizza.", "can_make_at_home": False, "aisle_hint": "Baking / Italian"},
    {"home_item": "polenta", "home_cuisine": "Italian", "us_equivalent": "stone-ground cornmeal", "us_brand": "Bob's Red Mill / Bramata", "match_score": 80, "notes": "Bob's Red Mill yellow corn polenta is excellent. Avoid 'instant' -- terrible texture.", "can_make_at_home": False, "aisle_hint": "Baking / grains"},
    {"home_item": "primo sale (fresh sheep cheese)", "home_cuisine": "Italian", "us_equivalent": "primo sale", "us_brand": "(specialty only)", "match_score": 50, "notes": "Almost impossible to find. Ricotta salata is closest. Or make it: sheep milk + rennet + salt, 24 hours.", "can_make_at_home": True, "home_recipe_summary": "Heat 1 gal sheep milk to 90°F, add rennet, set 30 min, drain, salt, press 24 hr.", "aisle_hint": "Specialty Italian deli"},
    {"home_item": "pasta secca artigianale", "home_cuisine": "Italian", "us_equivalent": "bronze-die pasta", "us_brand": "De Cecco / Rustichella", "match_score": 80, "notes": "Look for 'bronze die' on packaging -- holds sauce better. Barilla is acceptable but not artisanal.", "can_make_at_home": False, "aisle_hint": "Pasta aisle"},
    {"home_item": "extra virgin olive oil", "home_cuisine": "Italian", "us_equivalent": "Italian EVOO", "us_brand": "California Olive Ranch / Frantoia", "match_score": 75, "notes": "California Olive Ranch Reserve is excellent value. Avoid blends labeled 'Mediterranean' -- often non-Italian.", "can_make_at_home": False, "aisle_hint": "Oils"},
    
    # ========== MEXICAN ==========
    {"home_item": "queso fresco", "home_cuisine": "Mexican", "us_equivalent": "queso fresco", "us_brand": "Cacique / V&V Supremo", "match_score": 95, "notes": "Cacique is widely available and authentic. Don't substitute with cotija -- too salty.", "can_make_at_home": False, "aisle_hint": "Hispanic foods / dairy"},
    {"home_item": "Mexican crema", "home_cuisine": "Mexican", "us_equivalent": "Mexican crema", "us_brand": "Cacique", "match_score": 90, "notes": "Cacique brand is authentic. Sour cream is too thick and tangy -- thin with milk in a pinch.", "can_make_at_home": False, "aisle_hint": "Dairy / Hispanic foods"},
    {"home_item": "masa harina", "home_cuisine": "Mexican", "us_equivalent": "masa harina", "us_brand": "Maseca", "match_score": 95, "notes": "Maseca is the universal brand. For tortillas: use 'instantánea'; for tamales: 'para tamales'.", "can_make_at_home": False, "aisle_hint": "Hispanic foods"},
    {"home_item": "dried guajillo chiles", "home_cuisine": "Mexican", "us_equivalent": "dried guajillo chiles", "us_brand": "El Guapo / Mexico Lindo", "match_score": 95, "notes": "Available at any Hispanic grocery. Toast briefly before using.", "can_make_at_home": False, "aisle_hint": "Hispanic foods / dried chiles"},
    {"home_item": "epazote", "home_cuisine": "Mexican", "us_equivalent": "dried epazote", "us_brand": "Hispanic specialty", "match_score": 70, "notes": "Fresh is rare in US -- find at Mexican grocery. Dried works for beans. No substitute -- unique flavor.", "can_make_at_home": False, "aisle_hint": "Mexican grocery"},
    {"home_item": "cotija cheese", "home_cuisine": "Mexican", "us_equivalent": "cotija cheese", "us_brand": "Cacique", "match_score": 90, "notes": "Cacique is good. Aged feta works in a pinch but more salty/tangy.", "can_make_at_home": False, "aisle_hint": "Cheese / Hispanic foods"},
    {"home_item": "Oaxacan chocolate", "home_cuisine": "Mexican", "us_equivalent": "Mexican chocolate", "us_brand": "Ibarra / Taza", "match_score": 80, "notes": "Ibarra (in tablets) is widely available. Taza Stone Ground is more artisan but pricier.", "can_make_at_home": False, "aisle_hint": "International foods"},
    
    # ========== CHINESE ==========
    {"home_item": "light soy sauce (生抽)", "home_cuisine": "Chinese", "us_equivalent": "light soy sauce", "us_brand": "Pearl River Bridge / Lee Kum Kee", "match_score": 95, "notes": "Pearl River Bridge Superior is the standard. Kikkoman is Japanese-style -- different flavor profile.", "can_make_at_home": False, "aisle_hint": "Asian grocery / international"},
    {"home_item": "dark soy sauce (老抽)", "home_cuisine": "Chinese", "us_equivalent": "dark soy sauce", "us_brand": "Pearl River Bridge", "match_score": 95, "notes": "Different from light -- thicker, sweeter, used for color. Don't substitute regular soy sauce.", "can_make_at_home": False, "aisle_hint": "Asian grocery"},
    {"home_item": "Shaoxing wine", "home_cuisine": "Chinese", "us_equivalent": "Shaoxing rice wine", "us_brand": "Pagoda / Gold Plum", "match_score": 90, "notes": "Pagoda is widely available. Dry sherry is acceptable substitute. Don't use 'cooking wine' (salted).", "can_make_at_home": False, "aisle_hint": "Asian grocery"},
    {"home_item": "doubanjiang (Sichuan chili bean paste)", "home_cuisine": "Chinese", "us_equivalent": "Pixian doubanjiang", "us_brand": "Pixian Douban / Lee Kum Kee", "match_score": 95, "notes": "Pixian is THE authentic brand. Lee Kum Kee version is more accessible at Asian groceries.", "can_make_at_home": False, "aisle_hint": "Asian grocery"},
    {"home_item": "Chinese black vinegar (镇江)", "home_cuisine": "Chinese", "us_equivalent": "Chinkiang vinegar", "us_brand": "Gold Plum / Chinkiang", "match_score": 95, "notes": "Gold Plum Chinkiang is authentic. Balsamic is NOT a substitute -- different fermentation.", "can_make_at_home": False, "aisle_hint": "Asian grocery"},
    {"home_item": "fresh wonton wrappers", "home_cuisine": "Chinese", "us_equivalent": "wonton wrappers", "us_brand": "Twin Marquis / Nasoya", "match_score": 80, "notes": "Twin Marquis (in Asian groceries) is best. Nasoya at regular stores is OK but thicker.", "can_make_at_home": True, "home_recipe_summary": "2 cups flour + 1 egg + 1/3 cup water + pinch salt, knead 10 min, rest, roll thin, cut squares.", "aisle_hint": "Refrigerated / Asian grocery"},
    
    # ========== KOREAN ==========
    {"home_item": "gochujang", "home_cuisine": "Korean", "us_equivalent": "gochujang", "us_brand": "Mother-in-Law / Chung Jung One", "match_score": 95, "notes": "Both brands authentic. Mother-in-Law is more accessible. Sriracha is NOT a substitute.", "can_make_at_home": False, "aisle_hint": "International / Korean grocery"},
    {"home_item": "kimchi", "home_cuisine": "Korean", "us_equivalent": "fresh kimchi", "us_brand": "Mother-in-Law / Jongga", "match_score": 90, "notes": "Mother-in-Law is widely available at Whole Foods. Avoid pre-fermented jars sitting at room temp.", "can_make_at_home": True, "home_recipe_summary": "Salt napa cabbage 2 hours, mix with gochugaru, garlic, ginger, fish sauce, ferment 3 days room temp.", "aisle_hint": "Refrigerated international"},
    {"home_item": "doenjang (Korean soybean paste)", "home_cuisine": "Korean", "us_equivalent": "doenjang", "us_brand": "Sempio / Chung Jung One", "match_score": 95, "notes": "Korean grocery preferred. Japanese miso is similar but sweeter -- doenjang is more pungent.", "can_make_at_home": False, "aisle_hint": "Asian / Korean grocery"},
    {"home_item": "gochugaru (Korean chili flakes)", "home_cuisine": "Korean", "us_equivalent": "Korean red pepper flakes", "us_brand": "Wang / Chung Jung One", "match_score": 95, "notes": "Coarse texture is essential -- different from generic crushed red pepper.", "can_make_at_home": False, "aisle_hint": "Korean grocery"},
    {"home_item": "Korean rice cakes (tteok)", "home_cuisine": "Korean", "us_equivalent": "frozen tteokbokki rice cakes", "us_brand": "Assi / Pulmuone", "match_score": 95, "notes": "Frozen at any Korean grocery. Soak frozen ones 30 min before cooking.", "can_make_at_home": False, "aisle_hint": "Korean grocery freezer"},
    
    # ========== VIETNAMESE ==========
    {"home_item": "fish sauce (nước mắm)", "home_cuisine": "Vietnamese", "us_equivalent": "Vietnamese fish sauce", "us_brand": "Red Boat 40°N / Three Crabs", "match_score": 95, "notes": "Red Boat 40°N is premium. Three Crabs is everyday standard. Avoid Thai brands -- different style.", "can_make_at_home": False, "aisle_hint": "Asian / international"},
    {"home_item": "rice paper wrappers (bánh tráng)", "home_cuisine": "Vietnamese", "us_equivalent": "spring roll rice paper", "us_brand": "Three Ladies / Red Rose", "match_score": 95, "notes": "Three Ladies brand is most authentic and widely available.", "can_make_at_home": False, "aisle_hint": "Asian aisle"},
    {"home_item": "Vietnamese coffee (cà phê)", "home_cuisine": "Vietnamese", "us_equivalent": "Trung Nguyên coffee", "us_brand": "Trung Nguyên / Café du Monde (chicory)", "match_score": 85, "notes": "Trung Nguyên 'Sang Tao' is authentic. Café du Monde is the chicory base used in coffee shops.", "can_make_at_home": False, "aisle_hint": "Coffee aisle / international"},
    
    # ========== FILIPINO ==========
    {"home_item": "coconut vinegar (suka)", "home_cuisine": "Filipino", "us_equivalent": "coconut vinegar", "us_brand": "Datu Puti", "match_score": 95, "notes": "Datu Puti is the household brand. Distilled white vinegar is NOT a substitute -- different fruity flavor.", "can_make_at_home": False, "aisle_hint": "Filipino grocery / international"},
    {"home_item": "fish sauce (patis)", "home_cuisine": "Filipino", "us_equivalent": "Filipino fish sauce", "us_brand": "Rufina / Datu Puti", "match_score": 90, "notes": "Filipino patis is lighter than Vietnamese nuoc mam. Rufina is a household name.", "can_make_at_home": False, "aisle_hint": "Filipino grocery"},
    {"home_item": "calamansi", "home_cuisine": "Filipino", "us_equivalent": "calamansi or lime+orange juice", "us_brand": "(frozen Filipino grocery)", "match_score": 60, "notes": "Fresh is rare. Frozen calamansi at Filipino grocery is good. Mix lime + orange juice 3:1 in a pinch.", "can_make_at_home": False, "aisle_hint": "Filipino grocery freezer"},
    
    # ========== NIGERIAN ==========
    {"home_item": "egusi (melon seeds)", "home_cuisine": "Nigerian", "us_equivalent": "ground egusi", "us_brand": "African grocery", "match_score": 90, "notes": "Available at African groceries. Pre-ground is convenient. Pumpkin seeds are NOT a substitute -- different flavor.", "can_make_at_home": False, "aisle_hint": "African grocery"},
    {"home_item": "palm oil", "home_cuisine": "Nigerian", "us_equivalent": "red palm oil", "us_brand": "Zomi / Praise", "match_score": 95, "notes": "Look for unrefined red palm oil at African groceries. NOT same as palm KERNEL oil.", "can_make_at_home": False, "aisle_hint": "African grocery"},
    {"home_item": "scotch bonnet peppers", "home_cuisine": "Nigerian", "us_equivalent": "scotch bonnet or habanero", "us_brand": "(produce)", "match_score": 85, "notes": "Habaneros are interchangeable -- same heat, similar fruity profile. Caribbean groceries carry both.", "can_make_at_home": False, "aisle_hint": "Produce / Caribbean grocery"},
    
    # ========== POLISH ==========
    {"home_item": "kielbasa", "home_cuisine": "Polish", "us_equivalent": "Polish smoked kielbasa", "us_brand": "Hillshire Farm (basic) / Krakus / Polana", "match_score": 75, "notes": "Polana or Krakus at Polish delis are authentic. Hillshire Farm is cheap but lacks depth.", "can_make_at_home": False, "aisle_hint": "Polish deli / international"},
    {"home_item": "twaróg (Polish farmer cheese)", "home_cuisine": "Polish", "us_equivalent": "farmer cheese", "us_brand": "Friendship / Polana", "match_score": 85, "notes": "Friendship Farmer Cheese works for pierogi. Polish delis carry imported twaróg.", "can_make_at_home": True, "home_recipe_summary": "Heat 1 gal milk + 2 cups buttermilk to 180°F, drain through cheesecloth, press 1 hour.", "aisle_hint": "Dairy"},
    {"home_item": "kapusta kiszona (sour kraut)", "home_cuisine": "Polish", "us_equivalent": "Polish-style sauerkraut", "us_brand": "Krakus / Bubbies", "match_score": 90, "notes": "Krakus jarred is authentic. Bubbies (refrigerated) is unpasteurized = more probiotic.", "can_make_at_home": False, "aisle_hint": "Pickled / international"},
    
    # ========== TURKISH ==========
    {"home_item": "Turkish yogurt (süzme)", "home_cuisine": "Turkish", "us_equivalent": "strained yogurt", "us_brand": "Karoun / Fage", "match_score": 80, "notes": "Karoun Mediterranean is closest. Fage Total 5% is acceptable but slightly tangier.", "can_make_at_home": True, "home_recipe_summary": "Strain plain yogurt through cheesecloth 4-6 hours in refrigerator.", "aisle_hint": "Dairy / Mediterranean"},
    {"home_item": "sumac", "home_cuisine": "Turkish", "us_equivalent": "ground sumac", "us_brand": "Sadaf / Penzeys", "match_score": 95, "notes": "Sadaf is authentic. Penzeys is high quality. No substitute -- unique sour-fruity flavor.", "can_make_at_home": False, "aisle_hint": "Spices / Middle Eastern"},
    {"home_item": "Turkish bulgur", "home_cuisine": "Turkish", "us_equivalent": "fine bulgur", "us_brand": "Duru / Sunnyland", "match_score": 95, "notes": "Duru #1 fine grind for kibbeh; #3 coarse for pilaf. Bob's Red Mill is OK alternative.", "can_make_at_home": False, "aisle_hint": "Grains / Middle Eastern"},
    {"home_item": "Aleppo pepper", "home_cuisine": "Turkish", "us_equivalent": "Aleppo pepper / pul biber", "us_brand": "Penzeys / Sadaf", "match_score": 90, "notes": "Penzeys Aleppo is reliable. Don't substitute crushed red pepper -- Aleppo is fruitier, less hot.", "can_make_at_home": False, "aisle_hint": "Middle Eastern / specialty spices"},
]


def seed():
    print(f"Seeding {len(EQUIVALENCES)} equivalences...")
    # Clear existing
    supabase.table("equivalences").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    # Insert new
    for batch_start in range(0, len(EQUIVALENCES), 20):
        batch = EQUIVALENCES[batch_start:batch_start+20]
        supabase.table("equivalences").insert(batch).execute()
    print(f"Done. Total: {len(EQUIVALENCES)}")


if __name__ == "__main__":
    seed()
```

Run after schema migration: `python seed_equivalences.py`

Then update the `/scan` endpoint to query this table FIRST before calling Claude, falling back to LLM only on miss. Add this helper to `main.py`:

```python
def lookup_equivalence(detected_product: str, home_cuisines: list[str]) -> Optional[dict]:
    """Try to find a curated match before calling LLM."""
    if not detected_product:
        return None
    product_lower = detected_product.lower()
    for cuisine in home_cuisines:
        cuisine_clean = cuisine.split(" (")[0]  # "India (Karnataka)" -> "India"
        try:
            results = supabase.table("equivalences").select("*").eq("home_cuisine", cuisine_clean).execute()
            for row in results.data:
                if row["us_equivalent"].lower() in product_lower or product_lower in row["us_equivalent"].lower():
                    return row
        except Exception:
            continue
    return None
```

---

## FEATURE 5: HomeScreen polish

Update `HomeScreen.tsx` so the country tag shows the actual cuisine, and recent scans show. Also make Magic Lens button navigate properly. Add navigation hooks.

---

## DEPLOYMENT CHECKLIST

```bash
# 1. Run new SQL migration in Supabase SQL editor
# 2. Seed equivalences
cd app/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Fill in keys
python seed_equivalences.py

# 3. Run backend locally
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 4. Frontend
cd ../frontend
echo "EXPO_PUBLIC_API_URL=http://YOUR-LAPTOP-LAN-IP:8000" >> .env  # MUST be LAN IP, not localhost, for phone to reach
echo "EXPO_PUBLIC_SUPABASE_URL=..." >> .env
echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=..." >> .env
npm install
npx expo start --tunnel  # tunnel mode lets judges scan QR over any network
```

---

## DEMO SCRIPT (60-90 seconds)

```
0:00 -- Open app, sign in (pre-onboarded as "Karnataka, India")
0:05 -- Tap Magic Lens, point at a Goya rice bag
0:10 -- "Reading the label..."
0:15 -- Result: "Goya Parboiled Long-Grain | Match: 65"
       "For your biryani, India Gate Sella Basmati is closer to home."
       Tip: "Soak this 30 min instead of 20 if you use it tonight."
0:25 -- Tap "Scan another", point at a parmesan wedge
0:30 -- Result for an Italian secondary user: "Parmigiano Reggiano DOP | Match: 95"
0:40 -- Switch tabs to Lists, type "biryani", tap import
0:50 -- 12 ingredients appear with US brands, match scores, aisle hints
1:00 -- Done.
```

---

## STRETCH (only if everything above works)

- Map screen: Google Places API call for nearest "Indian grocery" / "Italian deli"
- Persist scan history on home screen
- "Make it at home" button that expands the recipe into a checklist

---

**Summary for Claude Code:** Read this brief end to end. Run the SQL migration, then the Python seed, then build the Magic Lens screen, then the Recipe Importer, then expand onboarding countries, then test end-to-end. Commit after each feature. Ship in 90 minutes.
