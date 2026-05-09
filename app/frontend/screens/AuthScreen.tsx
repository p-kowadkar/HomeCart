import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, Alert, ActivityIndicator, TextInput, ScrollView, KeyboardAvoidingView } from 'react-native';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleEmailAuth = async () => {
    if (!email || !password || (isSignUp && !name)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });
        if (error) throw error;
        if (data.session) {
          Alert.alert('Success', 'Account created and logged in!');
        } else {
          Alert.alert('Success', 'Please check your email for the confirmation link.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('[Auth] Email auth error:', err);
      Alert.alert('Authentication Error', err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>Cartographer</Text>
            <Text style={styles.subtitle}>Your AI Grocery Companion</Text>
            
            <View style={styles.form}>
              {isSignUp && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="John Doe"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                onPress={handleEmailAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>



              <TouchableOpacity 
                style={styles.toggleButton}
                onPress={() => setIsSignUp(!isSignUp)}
              >
                <Text style={styles.toggleText}>
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footerText}>
              By continuing, you agree to the{'\n'}
              <Text style={styles.link}>Terms of Service</Text> and <Text style={styles.link}>Privacy Policy</Text>.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 40,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    height: 52,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#1E293B',
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  toggleButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  toggleText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '600',
  },
  footerText: {
    marginTop: 40,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: '#3B82F6',
    fontWeight: '500',
  },
});
