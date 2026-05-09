import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const REGIONS = [
  { id: 'china', name: 'China', flag: '🇨🇳' },
  { id: 'india', name: 'India', flag: '🇮🇳' },
  { id: 'france', name: 'France', flag: '🇫🇷' },
  { id: 'brazil', name: 'Brazil', flag: '🇧🇷' },
  { id: 'usa', name: 'USA', flag: '🇺🇸' },
  { id: 'japan', name: 'Japan', flag: '🇯🇵' },
  { id: 'mexico', name: 'Mexico', flag: '🇲🇽' },
  { id: 'nigeria', name: 'Nigeria', flag: '🇳🇬' },
];

const LANGUAGES = ['English', 'Spanish', 'Mandarin', 'Hindi', 'French', 'Japanese', 'Portuguese'];

const DIETARY = ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-Free', 'Lactose-Free'];

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [region, setRegion] = useState('');
  const [language, setLanguage] = useState('English');
  const [dietary, setDietary] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDietary = (item: string) => {
    setDietary(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleComplete = async () => {
    if (!user) return;
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          home_country: region,
          preferred_language: language,
          dietary_preferences: dietary,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      await refreshProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.header}>Where are you from?</Text>
      <Text style={styles.subheader}>Help us tailor your cartography journey by selecting your home region.</Text>
      <View style={styles.grid}>
        {REGIONS.map(item => (
          <TouchableOpacity 
            key={item.id} 
            style={[styles.flagCard, region === item.id && styles.selectedCard]}
            onPress={() => setRegion(item.id)}
          >
            <Text style={styles.flagIcon}>{item.flag}</Text>
            <Text style={styles.flagName}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.header}>Preferred Language</Text>
      <Text style={styles.subheader}>Select the language you'd like the AI to use for translations.</Text>
      <View style={styles.list}>
        {LANGUAGES.map(item => (
          <TouchableOpacity 
            key={item} 
            style={[styles.listItem, language === item && styles.selectedListItem]}
            onPress={() => setLanguage(item)}
          >
            <Text style={[styles.listText, language === item && styles.selectedListText]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.header}>Dietary Preferences</Text>
      <Text style={styles.subheader}>Optional: Tell us about your dietary needs so we can suggest the right brands.</Text>
      <View style={styles.chipContainer}>
        {DIETARY.map(item => (
          <TouchableOpacity 
            key={item} 
            style={[styles.chip, dietary.includes(item) && styles.selectedChip]}
            onPress={() => toggleDietary(item)}
          >
            <Text style={[styles.chipText, dietary.includes(item) && styles.selectedChipText]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.nextButton, (!region && step === 1) && styles.disabledButton]} 
          onPress={() => step < 3 ? setStep(step + 1) : handleComplete()}
          disabled={(!region && step === 1) || isSubmitting}
        >
          <Text style={styles.nextButtonText}>{step === 3 ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F1F5F9',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  scrollContent: {
    padding: 24,
  },
  stepContainer: {
    flex: 1,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  subheader: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 32,
    lineHeight: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  flagCard: {
    width: (width - 64) / 3,
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 8,
  },
  selectedCard: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  flagIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  flagName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
  },
  list: {
    gap: 12,
  },
  listItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedListItem: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  listText: {
    fontSize: 16,
    color: '#1E293B',
  },
  selectedListText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  selectedChip: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  chipText: {
    fontSize: 14,
    color: '#475569',
  },
  selectedChipText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  nextButton: {
    flex: 2,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
  },
});
