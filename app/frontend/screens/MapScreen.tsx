import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Linking, SafeAreaView,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme } from '../theme/ThemeContext';
import { darkMapStyle } from './mapStyle';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

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

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
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

const CUISINE_FILTERS = [
  { key: undefined, label: 'All' },
  { key: 'indian', label: 'Indian' },
  { key: 'italian', label: 'Italian' },
  { key: 'korean', label: 'Korean' },
  { key: 'chinese', label: 'Chinese' },
  { key: 'mexican', label: 'Mexican' },
  { key: 'japanese', label: 'Japanese' },
  { key: 'middle_eastern', label: 'Middle Eastern' },
];

export default function MapScreen({ route }: MapScreenProps) {
  const { colors, isDark } = useTheme();
  const { session } = useAuth();
  const initialCuisine = route?.params?.cuisine;
  const productName = route?.params?.productName;

  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [activeCuisine, setActiveCuisine] = useState<string | undefined>(initialCuisine);

  const fetchStores = useCallback(async (lat: number, lon: number, cuisine?: string) => {
    setLoading(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const r = await fetch(`${API_URL}/stores/nearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession?.access_token}`,
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
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 40.7128;
      let lon = -74.0060;
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      }
      setMapRegion({ latitude: lat, longitude: lon, latitudeDelta: 0.05, longitudeDelta: 0.05 });
      await fetchStores(lat, lon, activeCuisine);
    })();
  }, []);

  const onChangeCuisine = async (cuisine?: string) => {
    setActiveCuisine(cuisine);
    if (mapRegion) {
      await fetchStores(mapRegion.latitude, mapRegion.longitude, cuisine);
    }
  };

  const cuisineColor = (cuisines: string[]) => {
    if (cuisines.includes('indian') || cuisines.includes('south_asian')) return '#F97316';
    if (cuisines.includes('italian')) return '#22C55E';
    if (cuisines.includes('korean') || cuisines.includes('chinese')) return '#EF4444';
    if (cuisines.includes('japanese')) return '#EC4899';
    if (cuisines.includes('mexican')) return '#FBBF24';
    if (cuisines.includes('middle_eastern') || cuisines.includes('turkish')) return '#A855F7';
    if (cuisines.includes('caribbean') || cuisines.includes('african') || cuisines.includes('nigerian')) return '#F472B6';
    return colors.primary;
  };

  const scoreColor = (s: number) => s >= 80 ? '#10B981' : s >= 50 ? '#F59E0B' : '#EF4444';
  const scoreBg = (s: number) =>
    s >= 80 ? 'rgba(16,185,129,0.15)' : s >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';

  if (!mapRegion) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Context banner (when navigated from scan/recipe) */}
      {productName && (
        <SafeAreaView style={styles.bannerSafe}>
          <View style={[styles.contextBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 11, letterSpacing: 0.5 }}>FINDING STORES FOR</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600', marginTop: 2 }}>{productName}</Text>
          </View>
        </SafeAreaView>
      )}

      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={mapRegion}
        customMapStyle={isDark ? darkMapStyle : []}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {stores.map(store => (
          <Marker
            key={store.place_id}
            coordinate={{ latitude: store.lat, longitude: store.lon }}
            onPress={() => setSelectedStore(store)}
          >
            {/* Simple numeric pin — using View-based marker (note: needs newArchEnabled:false on Android) */}
            <View style={[
              styles.markerPin,
              {
                backgroundColor: cuisineColor(store.cuisines),
                borderColor: colors.bg,
                borderWidth: store.is_specialty ? 3 : 2,
              },
            ]}>
              <Text style={styles.markerText}>{Math.round(store.final_score)}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Cuisine filter chips */}
      <View style={[styles.filterRow, { top: productName ? 120 : 60 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {CUISINE_FILTERS.map(({ key, label }) => (
            <TouchableOpacity
              key={key ?? 'all'}
              onPress={() => onChangeCuisine(key)}
              style={[
                styles.chip,
                {
                  backgroundColor: activeCuisine === key ? colors.primary : colors.surface,
                  borderColor: activeCuisine === key ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={{
                color: activeCuisine === key ? '#FFF' : colors.textPrimary,
                fontSize: 13,
                fontWeight: '500',
              }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Store detail bottom sheet */}
      {selectedStore && (
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>
                {selectedStore.name}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                {selectedStore.distance_km.toFixed(1)} km · {selectedStore.address.split(',').slice(0, 2).join(',')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedStore(null)} style={styles.closeBtn}>
              <Text style={{ color: colors.textSecondary, fontSize: 26, lineHeight: 28 }}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scoreRow}>
            <View style={[styles.scorePill, { backgroundColor: scoreBg(selectedStore.final_score) }]}>
              <Text style={{ color: scoreColor(selectedStore.final_score), fontWeight: '700', fontSize: 13 }}>
                Match {Math.round(selectedStore.final_score)}
              </Text>
            </View>
            {selectedStore.is_specialty && (
              <View style={[styles.scorePill, { backgroundColor: colors.culturalSubtle }]}>
                <Text style={{ color: colors.cultural, fontWeight: '700', fontSize: 11, letterSpacing: 0.5 }}>
                  SPECIALTY
                </Text>
              </View>
            )}
            {selectedStore.rating != null && (
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                ⭐ {selectedStore.rating.toFixed(1)} ({selectedStore.rating_count})
              </Text>
            )}
          </View>

          {selectedStore.notes && (
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 10, lineHeight: 20 }}>
              {selectedStore.notes}
            </Text>
          )}

          <TouchableOpacity
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${selectedStore.lat},${selectedStore.lon}`
              )
            }
            style={[styles.directionsBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 15 }}>Get Directions</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading pill */}
      {loading && (
        <View style={[styles.loadingPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={{ color: colors.textPrimary, marginLeft: 8, fontSize: 13 }}>Finding stores…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bannerSafe: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  contextBanner: {
    margin: 12,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterRow: { position: 'absolute', left: 0, right: 0, zIndex: 9 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  markerPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  closeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  scorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  directionsBtn: { marginTop: 16, padding: 14, borderRadius: 12, alignItems: 'center' },
  loadingPill: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
});
