import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Profile</Text>
      <Text style={styles.subtitle}>{profile?.full_name || 'User'}</Text>
      
      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Region</Text>
        <Text style={styles.infoValue}>{profile?.region || 'Not set'}</Text>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748B',
    marginBottom: 32,
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  signOutButton: {
    marginTop: 'auto',
    backgroundColor: '#FEE2E2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
