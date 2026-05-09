import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, profile, signOut } = useAuth();

  const QUICK_ACTIONS = [
    { id: 'scan', name: 'Scan Label', icon: 'camera-scan', color: '#3B82F6' },
    { id: 'list', name: 'New List', icon: 'playlist-plus', color: '#10B981' },
    { id: 'diet', name: 'Dietary Check', icon: 'leaf', color: '#F59E0B' },
    { id: 'history', name: 'History', icon: 'history', color: '#8B5CF6' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, {user?.user_metadata?.full_name || 'Traveler'}! 👋</Text>
            <Text style={styles.location}>Explore groceries in {profile?.home_country || 'your region'}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileInitial}>
                {(user?.user_metadata?.full_name || 'T')[0]}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Search Bar Placeholder */}
        <TouchableOpacity style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={24} color="#94A3B8" />
          <Text style={styles.searchText}>Search for products or brands...</Text>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            {QUICK_ACTIONS.map(action => (
              <TouchableOpacity key={action.id} style={styles.actionCard}>
                <View style={[styles.iconContainer, { backgroundColor: action.color + '15' }]}>
                  <MaterialCommunityIcons name={action.icon as any} size={28} color={action.color} />
                </View>
                <Text style={styles.actionName}>{action.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Local Favorites / Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Local Essentials</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {[1, 2, 3].map(i => (
              <TouchableOpacity key={i} style={styles.featuredCard}>
                <View style={styles.cardImagePlaceholder}>
                   <MaterialCommunityIcons name="food-apple" size={40} color="#CBD5E1" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Local Brand {i}</Text>
                  <Text style={styles.cardSubtitle}>Fresh & Local</Text>
                  <View style={styles.tagContainer}>
                    <Text style={styles.tag}>Localized</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Sign Out for now */}
        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  location: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 32,
  },
  searchText: {
    marginLeft: 12,
    color: '#94A3B8',
    fontSize: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  actionCard: {
    width: (width - 56) / 2,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  featuredCard: {
    width: 240,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardImagePlaceholder: {
    height: 120,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  tagContainer: {
    marginTop: 12,
    flexDirection: 'row',
  },
  tag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  seeAll: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 20,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: '#EF4444',
    fontWeight: '600',
  }
});
