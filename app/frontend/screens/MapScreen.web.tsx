import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function MapScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.icon]}>🗺️</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Map unavailable on web</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        Open the app on your phone to find nearby stores.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
