import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './context/AuthContext';
import AuthScreen from './screens/AuthScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import ListScreen from './screens/ListScreen';
import ProfileScreen from './screens/ProfileScreen';
import MagicLensScreen from './screens/MagicLensScreen';

const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          height: 90,
          paddingBottom: 30,
          paddingTop: 10,
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: '#ffffff',
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#94A3B8',
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-variant" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-marker-radius" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="MagicLens" 
        component={MagicLensScreen} 
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: '#3B82F6',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 30,
              borderWidth: 4,
              borderColor: '#fff',
              shadowColor: '#3B82F6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }}>
              <MaterialCommunityIcons name="scan-helper" size={32} color="#fff" />
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="List" 
        component={ListScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-list" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (profile === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!profile?.onboarding_completed) {
    return <OnboardingScreen />;
  }

  return (
    <NavigationContainer>
      <MainTabNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 32,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
