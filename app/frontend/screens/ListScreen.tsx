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

export default function ListScreen({ navigation }: { navigation?: any }) {
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
        <Text style={styles.subtitle}>Type a dish from home — I'll build your shopping list.</Text>

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

        {dishName && ingredients.length > 0 && navigation && (
          <TouchableOpacity
            style={styles.findStoresButton}
            onPress={() => navigation.navigate('Map', {
              cuisine: profile?.home_country,
              neededItems: ingredients.map((i) => i.original_ingredient),
              productName: `${dishName} ingredients`,
            })}
          >
            <Text style={styles.findStoresText}>Find stores for this list →</Text>
          </TouchableOpacity>
        )}

        {dishName && ingredients.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.dishHeader}>{dishName}</Text>
            {ingredients.map((ing, idx) => (
              <View key={idx} style={styles.ingredientCard}>
                <View style={styles.ingredientHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.originalName}>{ing.original_ingredient}</Text>
                    <Text style={styles.usName}>{ing.us_brand ? `${ing.us_brand} — ` : ''}{ing.us_equivalent_product}</Text>
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
  findStoresButton: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8, marginBottom: 4 },
  findStoresText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
