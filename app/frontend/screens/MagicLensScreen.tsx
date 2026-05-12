import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { apiFetchJson, QuotaExceededError } from '../lib/api';

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
  availability_breadth?: 'mainstream' | 'specialty_only' | 'both';
  preferred_store_types?: string[];
};

export default function MagicLensScreen({ navigation }: { navigation?: any }) {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: colors.bg }]}>
        <MaterialCommunityIcons name="camera-off" size={80} color={colors.textTertiary} />
        <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>Camera Access Needed</Text>
        <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
          Magic Lens needs your camera to scan products and translate them to your home cuisine.
        </Text>
        <TouchableOpacity style={[styles.permissionButton, { backgroundColor: colors.primary }]} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const captureAndScan = async () => {
    if (!cameraRef.current) return;
    try {
      setScanning(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      if (!photo?.base64) {
        Alert.alert('Error', 'Failed to capture image');
        setScanning(false);
        return;
      }
      setCapturedImage(`data:image/jpeg;base64,${photo.base64}`);

      const data = await apiFetchJson('/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: photo.base64,
          user_profile: {
            home_country: profile?.home_country,
            home_region: profile?.home_region,
            home_cuisines: profile?.home_cuisines || [],
            cooking_confidence: profile?.cooking_confidence || 3,
            dietary_preferences: profile?.dietary_preferences || [],
          },
        }),
      });
      setResult(data);
    } catch (err: any) {
      if (err instanceof QuotaExceededError) {
        Alert.alert(
          'Daily limit reached',
          err.message + ' Open the Profile tab → Settings to add your own LLM key for unlimited use.',
          [{ text: 'Got it' }],
        );
        return;
      }
      console.error('Scan error:', err);
      Alert.alert('Scan Failed', err.message || 'Try again');
    } finally {
      setScanning(false);
    }
  };

  const reset = () => { setCapturedImage(null); setResult(null); };

  if (result) {
    return (
      <ScanResultView
        result={result}
        image={capturedImage}
        onReset={reset}
        onFindStores={result.real_version_name ? () => navigation?.navigate('Map', {
          cuisine: profile?.home_country,
          productName: result.real_version_name,
          product_context: {
            availability_breadth: result.availability_breadth,
            preferred_store_types: result.preferred_store_types || [],
          },
        }) : undefined}
        colors={colors}
      />
    );
  }

  return (
    <View style={styles.cameraWrap}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <SafeAreaView style={styles.overlay} edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerPill}>
              <MaterialCommunityIcons name="scan-helper" size={16} color="#fff" />
              <Text style={styles.headerText}>Point at any grocery product</Text>
            </View>
          </View>

          <View style={styles.targetFrame}>
            <View style={[styles.corner, styles.cornerTL, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: colors.primary }]} />
          </View>

          <View style={styles.captureContainer}>
            {scanning ? (
              <View style={styles.scanning}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.scanningText}>Reading the label…</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.captureButton} onPress={captureAndScan}>
                <View style={styles.captureInner} />
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

function ScanResultView({
  result, image, onReset, onFindStores, colors,
}: {
  result: ScanResult; image: string | null; onReset: () => void; onFindStores?: () => void; colors: any;
}) {
  const scoreColor = result.match_score >= 75 ? colors.scoreHigh : result.match_score >= 50 ? colors.scoreMid : colors.scoreLow;

  return (
    <SafeAreaView style={[styles.resultContainer, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
        {image && <Image source={{ uri: image }} style={styles.resultImage} />}

        <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.productName, { color: colors.textPrimary }]}>{result.detected_product}</Text>
          {!!result.detected_brand && <Text style={[styles.productBrand, { color: colors.textSecondary }]}>{result.detected_brand}</Text>}

          <View style={[styles.scoreCircle, { backgroundColor: scoreColor }]}>
            <Text style={styles.scoreNumber}>{result.match_score}</Text>
            <Text style={styles.scoreLabel}>MATCH</Text>
          </View>

          <View style={[styles.section, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>FOR YOUR CUISINE</Text>
            <Text style={[styles.sectionText, { color: colors.textPrimary }]}>{result.cultural_equivalent}</Text>
          </View>

          {!!result.real_version_name && (
            <View style={[styles.section, { backgroundColor: colors.scoreHigh + '15', borderColor: colors.scoreHigh + '30' }]}>
              <Text style={[styles.sectionLabel, { color: colors.scoreHigh }]}>THE REAL THING</Text>
              <Text style={[styles.sectionText, { color: colors.textPrimary }]}>{result.real_version_name}</Text>
            </View>
          )}

          <View style={[styles.section, { backgroundColor: colors.primarySubtle, borderColor: colors.primary + '30' }]}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>💡 AI TIP</Text>
            <Text style={[styles.sectionText, { color: colors.textPrimary }]}>{result.ai_tip}</Text>
          </View>

          {result.can_make_at_home && !!result.home_recipe_summary && (
            <View style={[styles.section, { backgroundColor: colors.cultural + '15', borderColor: colors.cultural + '30' }]}>
              <Text style={[styles.sectionLabel, { color: colors.cultural }]}>🏠 MAKE IT AT HOME</Text>
              <Text style={[styles.sectionText, { color: colors.textPrimary }]}>{result.home_recipe_summary}</Text>
            </View>
          )}
        </View>

        {onFindStores && (
          <TouchableOpacity style={[styles.findStoresButton, { backgroundColor: colors.primary }]} onPress={onFindStores}>
            <MaterialCommunityIcons name="store-marker" size={18} color="#fff" />
            <Text style={styles.findStoresText}>Get the real thing</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.scanAgainButton, { borderColor: colors.border }]} onPress={onReset}>
          <Text style={[styles.scanAgainText, { color: colors.textPrimary }]}>Scan another</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cameraWrap: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  header: { padding: 20, alignItems: 'center' },
  headerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  headerText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  targetFrame: {
    position: 'absolute', top: '28%', left: '12%', right: '12%', bottom: '32%',
  },
  corner: { position: 'absolute', width: 28, height: 28, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  captureContainer: { padding: 32, alignItems: 'center' },
  captureButton: {
    width: 78, height: 78, borderRadius: 39, backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  captureInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  scanning: { alignItems: 'center' },
  scanningText: { color: '#fff', marginTop: 12, fontSize: 15, fontWeight: '600' },

  permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  permissionTitle: { fontSize: 22, fontWeight: '700', marginTop: 20 },
  permissionText: { fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  permissionButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 24 },
  permissionButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  resultContainer: { flex: 1 },
  resultContent: { padding: 20, paddingBottom: 40 },
  resultImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: 16 },
  resultCard: { borderRadius: 20, padding: 20, borderWidth: 1 },
  productName: { fontSize: 22, fontWeight: '700' },
  productBrand: { fontSize: 13, marginTop: 4 },
  scoreCircle: {
    width: 96, height: 96, borderRadius: 48, alignSelf: 'center',
    justifyContent: 'center', alignItems: 'center', marginVertical: 20,
  },
  scoreNumber: { color: '#fff', fontSize: 32, fontWeight: '800' },
  scoreLabel: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  section: { padding: 14, borderRadius: 12, marginTop: 10, borderWidth: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  sectionText: { fontSize: 14, lineHeight: 20 },
  findStoresButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, borderRadius: 14, marginTop: 16,
  },
  findStoresText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  scanAgainButton: { padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 10, borderWidth: 1 },
  scanAgainText: { fontWeight: '600', fontSize: 14 },
});
