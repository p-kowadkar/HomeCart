import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useTheme } from '../theme/ThemeContext';

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

export default function MagicLensScreen({ navigation }: { navigation?: any }) {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
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
    return (
      <ScanResultView
        result={result}
        image={capturedImage}
        onReset={reset}
        onFindStores={result.real_version_name ? () => navigation?.navigate('Map', {
          cuisine: profile?.home_country,
          productName: result.real_version_name,
        }) : undefined}
      />
    );
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

function ScanResultView({
  result, image, onReset, onFindStores,
}: {
  result: ScanResult;
  image: string | null;
  onReset: () => void;
  onFindStores?: () => void;
}) {
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

      {onFindStores && (
        <TouchableOpacity style={styles.findStoresButton} onPress={onFindStores}>
          <Text style={styles.findStoresText}>Get the real thing →</Text>
        </TouchableOpacity>
      )}

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
  findStoresButton: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  findStoresText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  scanAgainButton: { backgroundColor: '#0F172A', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  scanAgainText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
