import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Linking, Modal,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { darkMapStyle } from './mapStyle';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';

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
  store_types?: string[];
  is_preferred?: boolean;
  is_specialty: boolean;
  cultural_score: number;
  final_score: number;
  coverage_matched?: number;
  coverage_total?: number;
  coverage_items?: string[];
}

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface NeededItem {
  name: string;
  preferred_store_types: string[];
}

interface ProductContext {
  availability_breadth?: 'mainstream' | 'specialty_only' | 'both';
  preferred_store_types?: string[];
  needed_items?: NeededItem[];
}

interface MapScreenProps {
  route?: {
    params?: {
      cuisine?: string;
      productName?: string;
      product_context?: ProductContext;
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

// JS port of the backend's haversine — used to decide when the user has panned far
// enough from the last fetched center to surface "Search this area".
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapScreen({ route }: MapScreenProps) {
  const { colors, isDark } = useTheme();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const initialCuisine = route?.params?.cuisine;
  const productName = route?.params?.productName;
  const productContext = route?.params?.product_context;

  const mapRef = useRef<MapView | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
  const [lastFetchedCenter, setLastFetchedCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [activeCuisine, setActiveCuisine] = useState<string | undefined>(initialCuisine);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showStoreList, setShowStoreList] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  // react-native-maps + Android needs tracksViewChanges=true briefly while the view-based
  // Marker children paint, otherwise the marker snapshots a zero-size empty view and stays
  // invisible. We turn it on every time stores change, then turn off after ~600ms.
  const [tracksChanges, setTracksChanges] = useState(true);

  const fetchStores = useCallback(
    async (lat: number, lon: number, cuisine?: string, pc?: ProductContext) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const body: any = { lat, lon, cuisine: cuisine ?? null };
        if (pc && (pc.availability_breadth || (pc.preferred_store_types && pc.preferred_store_types.length))) {
          body.product_context = pc;
        }
        const r = await apiFetch('/stores/nearby', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession?.access_token}`,
          },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const txt = await r.text();
          throw new Error(`Server ${r.status}: ${txt.slice(0, 100)}`);
        }
        const data = await r.json();
        setStores(data.stores || []);
        setLastFetchedCenter({ lat, lon });
        setShowSearchHere(false);
        setHasFetched(true);
        if ((data.stores || []).length === 0) {
          setErrorMsg('No stores found nearby. Try a different cuisine or pan to a denser area.');
        }
      } catch (e: any) {
        console.error('Stores fetch failed:', e);
        setErrorMsg(e.message || 'Failed to load stores');
        setStores([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // On mount: get location, decide whether to auto-fetch.
  // Auto-fetch ONLY if we arrived with a cuisine, product name, or product_context.
  // Otherwise the user pressed the Map tab cold — show the empty-state hint.
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
      setUserLocation({ lat, lon });
      setMapRegion({ latitude: lat, longitude: lon, latitudeDelta: 0.05, longitudeDelta: 0.05 });
      const hasContext = !!initialCuisine || !!productName || !!productContext;
      if (hasContext) {
        await fetchStores(lat, lon, initialCuisine, productContext);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeCuisine = async (cuisine?: string) => {
    setActiveCuisine(cuisine);
    if (!mapRegion) return;
    // In recipe-coverage flow we keep product_context so coverage stays meaningful.
    // Otherwise the chip means "switch to cuisine filter" so we drop it.
    const isRecipeCoverage = !!productContext?.needed_items?.length;
    await fetchStores(
      mapRegion.latitude,
      mapRegion.longitude,
      cuisine,
      isRecipeCoverage ? productContext : undefined,
    );
  };

  const onRegionChangeComplete = (region: MapRegion) => {
    setMapRegion(region);
    if (!lastFetchedCenter) return;
    const moved = haversineKm(region.latitude, region.longitude, lastFetchedCenter.lat, lastFetchedCenter.lon);
    if (moved > 1) setShowSearchHere(true);
  };

  const onSearchThisArea = async () => {
    if (!mapRegion) return;
    setShowSearchHere(false);
    await fetchStores(mapRegion.latitude, mapRegion.longitude, activeCuisine, productContext);
  };

  const onRecenter = () => {
    if (!userLocation || !mapRef.current) return;
    mapRef.current.animateToRegion(
      { latitude: userLocation.lat, longitude: userLocation.lon, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      500,
    );
  };

  // Fit the map to all current stores, leaving room at the bottom for the open list sheet
  // so markers don't get hidden under it.
  const fitToAllStores = useCallback(() => {
    if (!mapRef.current || stores.length === 0) return;
    const coords = stores.map(s => ({ latitude: s.lat, longitude: s.lon }));
    if (userLocation) coords.push({ latitude: userLocation.lat, longitude: userLocation.lon });
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: insets.top + 120, right: 60, bottom: 560, left: 60 },
      animated: true,
    });
  }, [stores, userLocation, insets.top]);

  // Pan to a single store and open its detail sheet. Used from the list rows.
  const focusOnStore = useCallback((store: Store) => {
    setShowStoreList(false);
    setSelectedStore(store);
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        { latitude: store.lat, longitude: store.lon, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        500,
      );
    }
  }, []);

  // When the user opens the store list modal, frame the map so all stores fit above the sheet.
  useEffect(() => {
    if (showStoreList) {
      // small delay so the modal layout settles first
      const t = setTimeout(fitToAllStores, 250);
      return () => clearTimeout(t);
    }
  }, [showStoreList, fitToAllStores]);

  // Whenever the store list changes, briefly enable tracksViewChanges so each marker's
  // view-based child has time to render before we lock in its appearance.
  useEffect(() => {
    if (stores.length === 0) return;
    setTracksChanges(true);
    const t = setTimeout(() => setTracksChanges(false), 600);
    return () => clearTimeout(t);
  }, [stores]);

  const cuisineColor = (s: Store) => {
    const cs = s.cuisines || [];
    if (s.is_preferred) return colors.primary;
    if (cs.includes('indian') || cs.includes('south_asian')) return '#F97316';
    if (cs.includes('italian')) return '#22C55E';
    if (cs.includes('korean') || cs.includes('chinese')) return '#EF4444';
    if (cs.includes('japanese')) return '#EC4899';
    if (cs.includes('mexican')) return '#FBBF24';
    if (cs.includes('middle_eastern') || cs.includes('turkish')) return '#A855F7';
    if (cs.includes('caribbean') || cs.includes('african') || cs.includes('nigerian')) return '#F472B6';
    return colors.textTertiary;
  };

  const scoreColor = (s: number) => (s >= 80 ? '#10B981' : s >= 50 ? '#F59E0B' : '#EF4444');
  const scoreBg = (s: number) =>
    s >= 80 ? 'rgba(16,185,129,0.15)' : s >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';

  if (!mapRegion) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const isRecipeFlow = !!productContext?.needed_items?.length;
  const totalNeeded = productContext?.needed_items?.length || 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Context banner (when navigated from scan/recipe). Pushed down by the device's status-bar inset
          so it never lands behind the Android system clock/icons. */}
      {productName && (
        <View style={[styles.bannerSafe, { paddingTop: insets.top + 8 }]}>
          <View style={[styles.contextBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 11, letterSpacing: 0.5 }}>FINDING STORES FOR</Text>
            <Text
              style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600', marginTop: 2 }}
              numberOfLines={2}
            >
              {productName}
            </Text>
          </View>
        </View>
      )}

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={mapRegion}
        onRegionChangeComplete={onRegionChangeComplete}
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
            tracksViewChanges={tracksChanges}
            anchor={{ x: 0.5, y: 0.5 }}
            title={store.name}
            description={
              isRecipeFlow
                ? `${store.coverage_matched}/${store.coverage_total} items · ${store.distance_km.toFixed(1)} km`
                : `Match ${Math.round(store.final_score)} · ${store.distance_km.toFixed(1)} km`
            }
          >
            <View
              style={[
                styles.markerPin,
                {
                  backgroundColor: cuisineColor(store),
                  borderColor: colors.bg,
                },
                store.is_specialty && styles.markerSpecialty,
              ]}
            >
              <Text style={styles.markerText}>
                {isRecipeFlow ? store.coverage_matched : Math.round(store.final_score)}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Cuisine filter chips — hidden in recipe-coverage flow because they conflict with
          the coverage view (tapping a cuisine narrows the store set but the user almost always
          wants the full coverage ranking). */}
      {!isRecipeFlow && (
        <View style={[styles.filterRow, { top: productName ? insets.top + 92 : insets.top + 12 }]}>
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
      )}

      {/* "Search this area" pill — appears after the user pans >1 km from the last fetched center */}
      {showSearchHere && !loading && (
        <TouchableOpacity
          onPress={onSearchThisArea}
          style={[
            styles.searchHere,
            {
              top: isRecipeFlow
                ? (productName ? insets.top + 90 : insets.top + 12)
                : (productName ? insets.top + 150 : insets.top + 70),
              backgroundColor: colors.primary,
            },
          ]}
        >
          <MaterialCommunityIcons name="magnify" size={16} color="#fff" />
          <Text style={styles.searchHereText}>Search this area</Text>
        </TouchableOpacity>
      )}

      {/* Recenter FAB — bottom-right above tab bar */}
      <TouchableOpacity
        onPress={onRecenter}
        style={[styles.fab, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <MaterialCommunityIcons name="crosshairs-gps" size={22} color={colors.primary} />
      </TouchableOpacity>

      {/* Empty-state hint card — only on cold open with no context */}
      {!hasFetched && !loading && !productName && (
        <View pointerEvents="box-none" style={styles.hintWrap}>
          <View style={[styles.hintCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="map-search-outline" size={32} color={colors.primary} />
            <Text style={[styles.hintTitle, { color: colors.textPrimary }]}>Pick a cuisine to see stores</Text>
            <Text style={[styles.hintBody, { color: colors.textSecondary }]}>
              Tap a chip above, scan a product, or import a recipe — I'll show you the right kind of store nearby.
            </Text>
          </View>
        </View>
      )}

      {/* Store detail bottom sheet (from marker tap) */}
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
            {isRecipeFlow ? (
              <View style={[styles.scorePill, { backgroundColor: scoreBg(((selectedStore.coverage_matched || 0) / Math.max(1, selectedStore.coverage_total || 1)) * 100) }]}>
                <Text style={{ color: scoreColor(((selectedStore.coverage_matched || 0) / Math.max(1, selectedStore.coverage_total || 1)) * 100), fontWeight: '700', fontSize: 13 }}>
                  {selectedStore.coverage_matched}/{selectedStore.coverage_total} items
                </Text>
              </View>
            ) : (
              <View style={[styles.scorePill, { backgroundColor: scoreBg(selectedStore.final_score) }]}>
                <Text style={{ color: scoreColor(selectedStore.final_score), fontWeight: '700', fontSize: 13 }}>
                  Match {Math.round(selectedStore.final_score)}
                </Text>
              </View>
            )}
            {selectedStore.is_specialty && (
              <View style={[styles.scorePill, { backgroundColor: colors.culturalSubtle }]}>
                <Text style={{ color: colors.cultural, fontWeight: '700', fontSize: 11, letterSpacing: 0.5 }}>
                  SPECIALTY
                </Text>
              </View>
            )}
            {selectedStore.is_preferred && !selectedStore.is_specialty && (
              <View style={[styles.scorePill, { backgroundColor: colors.primarySubtle }]}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 11, letterSpacing: 0.5 }}>
                  RECOMMENDED
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
                `https://www.google.com/maps/dir/?api=1&destination=${selectedStore.lat},${selectedStore.lon}`,
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

      {/* Error toast (only when not loading and no sheet open) */}
      {!loading && !selectedStore && !showStoreList && errorMsg && (
        <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.warning, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>⚠️ Heads up</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>{errorMsg}</Text>
        </View>
      )}

      {/* Tappable count pill → opens store list sheet */}
      {!loading && !selectedStore && !showStoreList && !errorMsg && stores.length > 0 && (
        <TouchableOpacity
          onPress={() => setShowStoreList(true)}
          style={[styles.countPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <MaterialCommunityIcons name="format-list-bulleted" size={14} color={colors.textPrimary} />
          <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600', marginLeft: 6 }}>
            {stores.length} store{stores.length === 1 ? '' : 's'} {isRecipeFlow ? `· ${totalNeeded} items` : 'nearby'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Full store list sheet */}
      <Modal visible={showStoreList} animationType="slide" transparent onRequestClose={() => setShowStoreList(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.listSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.listSheetHeader}>
              <View>
                <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>
                  {isRecipeFlow ? `Stores for ${totalNeeded} items` : `${stores.length} stores nearby`}
                </Text>
                {isRecipeFlow && (
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                    Ranked by ingredients covered
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowStoreList(false)} style={styles.closeBtn}>
                <Text style={{ color: colors.textSecondary, fontSize: 26, lineHeight: 28 }}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {stores.map(store => {
                const expanded = expandedRowId === store.place_id;
                const coveragePct = isRecipeFlow
                  ? ((store.coverage_matched || 0) / Math.max(1, store.coverage_total || 1)) * 100
                  : store.final_score;
                return (
                  <View
                    key={store.place_id}
                    style={[styles.listRow, { borderColor: colors.border }]}
                  >
                    <View style={styles.listRowMain}>
                      {/* Tap main row → close modal + pan map to this store + open detail sheet */}
                      <TouchableOpacity
                        onPress={() => focusOnStore(store)}
                        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                      >
                        <View style={[styles.listMarker, { backgroundColor: cuisineColor(store) }]}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                            {isRecipeFlow ? store.coverage_matched : Math.round(store.final_score)}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <View style={styles.listRowTitle}>
                            <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                              {store.name}
                            </Text>
                            {isRecipeFlow && (
                              <Text style={{ color: scoreColor(coveragePct), fontSize: 13, fontWeight: '700' }}>
                                {store.coverage_matched}/{store.coverage_total}
                              </Text>
                            )}
                          </View>
                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                            {store.distance_km.toFixed(1)} km
                            {store.rating != null ? ` · ⭐ ${store.rating.toFixed(1)}` : ''}
                            {store.is_specialty ? ' · SPECIALTY' : ''}
                            {store.is_preferred && !store.is_specialty ? ' · RECOMMENDED' : ''}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      {/* Chevron is a SEPARATE tap target — toggles inline coverage breakdown without dismissing the list */}
                      {isRecipeFlow && (
                        <TouchableOpacity
                          onPress={() => setExpandedRowId(expanded ? null : store.place_id)}
                          style={styles.chevronBtn}
                        >
                          <MaterialCommunityIcons
                            name={expanded ? 'chevron-up' : 'chevron-down'}
                            size={22}
                            color={colors.textTertiary}
                          />
                        </TouchableOpacity>
                      )}
                    </View>

                    {isRecipeFlow && expanded && (
                      <View style={[styles.coverageExpand, { borderColor: colors.borderSubtle }]}>
                        {(store.coverage_items || []).map(item => (
                          <Text key={item} style={{ color: colors.textSecondary, fontSize: 13, paddingVertical: 3 }}>
                            ✓ {item}
                          </Text>
                        ))}
                        {(store.coverage_total || 0) > (store.coverage_matched || 0) && (
                          <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>
                            Missing {((store.coverage_total || 0) - (store.coverage_matched || 0))} item(s) — try a different store for those.
                          </Text>
                        )}
                      </View>
                    )}

                    {!isRecipeFlow && (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(
                            `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lon}`,
                          )
                        }
                        style={[styles.dirChip, { backgroundColor: colors.primarySubtle }]}
                      >
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Directions →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  searchHere: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 6,
    zIndex: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  searchHereText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 7,
  },
  hintWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  hintCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    maxWidth: 320,
  },
  hintTitle: { fontSize: 16, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  hintBody: { fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  markerPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  markerSpecialty: { borderWidth: 3 },
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
  errorCard: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  countPill: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  listSheet: {
    height: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 20,
    paddingBottom: 0,
  },
  listSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  listRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  listRowMain: { flexDirection: 'row', alignItems: 'center' },
  chevronBtn: { padding: 8, marginLeft: 4 },
  listMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listRowTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coverageExpand: {
    marginTop: 10,
    marginLeft: 48,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dirChip: {
    alignSelf: 'flex-start',
    marginLeft: 48,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
});
