import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function MagicLensScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.cameraPreview}>
        <MaterialCommunityIcons name="camera-iris" size={80} color="#CBD5E1" />
        <Text style={styles.cameraText}>Magic Lens Preview</Text>
      </View>
      
      <View style={styles.controls}>
        <Text style={styles.title}>Magic Lens</Text>
        <Text style={styles.subtitle}>Scan any product to translate and check dietary compatibility.</Text>
        
        <TouchableOpacity style={styles.scanButton}>
          <MaterialCommunityIcons name="scan-helper" size={32} color="#fff" />
          <Text style={styles.scanButtonText}>Analyze Product</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  cameraText: {
    color: '#94A3B8',
    marginTop: 16,
    fontSize: 16,
  },
  controls: {
    backgroundColor: '#fff',
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 24,
  },
  scanButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 12,
  },
});
