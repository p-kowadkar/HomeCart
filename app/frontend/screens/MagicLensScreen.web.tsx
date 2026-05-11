import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function MagicLensScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={styles.icon}>📷</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Magic Lens unavailable on web</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        Use the app on your phone to scan grocery products with your camera.
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
