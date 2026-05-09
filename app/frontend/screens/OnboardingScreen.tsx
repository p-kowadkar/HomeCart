import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  SafeAreaView, Dimensions, FlatList,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

// Full country + region list. After country selection a horizontal region picker
// appears. Both home_country (id) and home_region (string) are persisted.
const COUNTRIES = [
  // South Asia
  { id: 'india', name: 'India', flag: '🇮🇳', regions: ['North Indian', 'South Indian', 'Bengali', 'Gujarati', 'Punjabi', 'Maharashtrian', 'Karnataka', 'Kerala', 'Tamil', 'Hyderabadi', 'Goan'] },
  { id: 'pakistan', name: 'Pakistan', flag: '🇵🇰', regions: ['Punjabi', 'Sindhi', 'Pashtun', 'Balochi'] },
  { id: 'bangladesh', name: 'Bangladesh', flag: '🇧🇩', regions: ['Dhaka', 'Chittagong', 'Sylhet'] },
  { id: 'srilanka', name: 'Sri Lanka', flag: '🇱🇰', regions: ['Sinhalese', 'Tamil'] },
  { id: 'nepal', name: 'Nepal', flag: '🇳🇵', regions: ['Newari', 'Thakali', 'Tibetan'] },

  // East Asia
  { id: 'china', name: 'China', flag: '🇨🇳', regions: ['Sichuan', 'Cantonese', 'Hunan', 'Shanghainese', 'Northeastern', 'Xinjiang', 'Yunnan'] },
  { id: 'japan', name: 'Japan', flag: '🇯🇵', regions: ['Kansai', 'Kanto', 'Okinawan', 'Hokkaido'] },
  { id: 'korea', name: 'South Korea', flag: '🇰🇷', regions: ['Seoul', 'Jeolla', 'Gyeongsang', 'Jeju'] },
  { id: 'taiwan', name: 'Taiwan', flag: '🇹🇼', regions: ['Taipei', 'Hakka', 'Aboriginal'] },

  // Southeast Asia
  { id: 'vietnam', name: 'Vietnam', flag: '🇻🇳', regions: ['Northern', 'Central', 'Southern'] },
  { id: 'thailand', name: 'Thailand', flag: '🇹🇭', regions: ['Central', 'Northern', 'Northeastern (Isan)', 'Southern'] },
  { id: 'philippines', name: 'Philippines', flag: '🇵🇭', regions: ['Luzon', 'Visayas', 'Mindanao'] },
  { id: 'indonesia', name: 'Indonesia', flag: '🇮🇩', regions: ['Javanese', 'Sumatran', 'Balinese', 'Padang'] },
  { id: 'malaysia', name: 'Malaysia', flag: '🇲🇾', regions: ['Malay', 'Chinese-Malay', 'Indian-Malay', 'Nyonya'] },
  { id: 'singapore', name: 'Singapore', flag: '🇸🇬', regions: ['Chinese-Singaporean', 'Malay-Singaporean', 'Indian-Singaporean', 'Peranakan'] },

  // Europe
  { id: 'italy', name: 'Italy', flag: '🇮🇹', regions: ['Sicilian', 'Tuscan', 'Lombard', 'Neapolitan', 'Roman', 'Venetian', 'Calabrian', 'Sardinian', 'Emilian'] },
  { id: 'france', name: 'France', flag: '🇫🇷', regions: ['Parisian', 'Provençal', 'Norman', 'Alsatian', 'Lyonnaise', 'Basque'] },
  { id: 'spain', name: 'Spain', flag: '🇪🇸', regions: ['Catalan', 'Andalusian', 'Basque', 'Galician', 'Castilian', 'Valencian'] },
  { id: 'portugal', name: 'Portugal', flag: '🇵🇹', regions: ['Lisbon', 'Porto', 'Alentejo', 'Azorean'] },
  { id: 'greece', name: 'Greece', flag: '🇬🇷', regions: ['Mainland', 'Cretan', 'Aegean'] },
  { id: 'germany', name: 'Germany', flag: '🇩🇪', regions: ['Bavarian', 'Berlin', 'Swabian', 'Northern'] },
  { id: 'poland', name: 'Poland', flag: '🇵🇱', regions: ['Kraków', 'Warsaw', 'Silesian'] },
  { id: 'turkey', name: 'Turkey', flag: '🇹🇷', regions: ['Istanbul', 'Anatolian', 'Aegean', 'Black Sea', 'Southeastern'] },
  { id: 'russia', name: 'Russia', flag: '🇷🇺', regions: ['Moscow', 'Siberian', 'Caucasian'] },
  { id: 'ukraine', name: 'Ukraine', flag: '🇺🇦', regions: ['Western', 'Central', 'Eastern'] },

  // Middle East
  { id: 'iran', name: 'Iran', flag: '🇮🇷', regions: ['Persian', 'Azeri', 'Kurdish'] },
  { id: 'lebanon', name: 'Lebanon', flag: '🇱🇧', regions: ['Beirut', 'Bekaa'] },
  { id: 'israel', name: 'Israel', flag: '🇮🇱', regions: ['Ashkenazi', 'Sephardic', 'Mizrahi'] },
  { id: 'egypt', name: 'Egypt', flag: '🇪🇬', regions: ['Cairo', 'Alexandrian', 'Upper Egyptian'] },

  // Africa
  { id: 'nigeria', name: 'Nigeria', flag: '🇳🇬', regions: ['Yoruba', 'Igbo', 'Hausa'] },
  { id: 'ghana', name: 'Ghana', flag: '🇬🇭', regions: ['Ashanti', 'Northern', 'Coastal'] },
  { id: 'ethiopia', name: 'Ethiopia', flag: '🇪🇹', regions: ['Amhara', 'Tigray', 'Oromo'] },
  { id: 'morocco', name: 'Morocco', flag: '🇲🇦', regions: ['Fez', 'Marrakesh', 'Berber'] },
  { id: 'southafrica', name: 'South Africa', flag: '🇿🇦', regions: ['Cape Malay', 'Zulu', 'Afrikaner'] },
  { id: 'kenya', name: 'Kenya', flag: '🇰🇪', regions: ['Coastal', 'Highland'] },

  // Americas
  { id: 'mexico', name: 'Mexico', flag: '🇲🇽', regions: ['Oaxacan', 'Yucatecan', 'Northern', 'Central', 'Pueblan'] },
  { id: 'brazil', name: 'Brazil', flag: '🇧🇷', regions: ['Bahian', 'Mineiro', 'Gaúcho', 'Amazonian'] },
  { id: 'argentina', name: 'Argentina', flag: '🇦🇷', regions: ['Buenos Aires', 'Patagonian', 'Northwestern'] },
  { id: 'peru', name: 'Peru', flag: '🇵🇪', regions: ['Coastal', 'Andean', 'Amazonian'] },
  { id: 'colombia', name: 'Colombia', flag: '🇨🇴', regions: ['Andean', 'Caribbean', 'Pacific'] },
  { id: 'venezuela', name: 'Venezuela', flag: '🇻🇪', regions: ['Caracas', 'Andean', 'Llanero'] },
  { id: 'cuba', name: 'Cuba', flag: '🇨🇺', regions: ['Havana', 'Eastern'] },
  { id: 'jamaica', name: 'Jamaica', flag: '🇯🇲', regions: ['Kingston', 'Mountain'] },
  { id: 'usa', name: 'USA', flag: '🇺🇸', regions: ['Southern', 'Tex-Mex', 'Cajun', 'New England', 'Soul Food'] },
];

const LANGUAGES = ['English', 'Spanish', 'Mandarin', 'Hindi', 'French', 'Japanese', 'Portuguese', 'Arabic', 'Korean', 'Vietnamese'];

const DIETARY = ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-Free', 'Lactose-Free', 'Pescatarian'];

const CONFIDENCE_LABELS: Record<number, string> = {
  1: 'Beginner — I follow recipes closely',
  2: 'Casual — I cook simple dishes',
  3: 'Home cook — I improvise sometimes',
  4: 'Confident — I experiment freely',
  5: 'Expert — I cook from memory',
};

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  // Step 1: country + region
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  // Step 2: language
  const [language, setLanguage] = useState('English');
  // Step 3: cooking confidence
  const [confidence, setConfidence] = useState(3);
  // Step 4: dietary
  const [dietary, setDietary] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const TOTAL_STEPS = 4;

  const selectedCountry = COUNTRIES.find(c => c.id === selectedCountryId);

  const toggleDietary = (item: string) => {
    setDietary(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleComplete = async () => {
    if (!user || !selectedCountryId) return;
    setIsSubmitting(true);

    const countryName = selectedCountry?.name || selectedCountryId;
    // Auto-derive cuisines from country + region selection
    const homeCuisines = selectedRegion
      ? [countryName, `${countryName} (${selectedRegion})`]
      : [countryName];

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          home_country: selectedCountryId,
          home_region: selectedRegion || null,
          home_cuisines: homeCuisines,
          preferred_language: language,
          cooking_confidence: confidence,
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

  // Step 1: Country grid + region horizontal scroll
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.header}>Where are you from?</Text>
      <Text style={styles.subheader}>Select your home country and region so we can tailor ingredient translations.</Text>

      {/* Country grid */}
      <View style={styles.grid}>
        {COUNTRIES.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.flagCard, selectedCountryId === item.id && styles.selectedCard]}
            onPress={() => {
              setSelectedCountryId(item.id);
              setSelectedRegion(''); // reset region when country changes
            }}
          >
            <Text style={styles.flagIcon}>{item.flag}</Text>
            <Text style={styles.flagName}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Region picker — shown after country selected */}
      {selectedCountry && selectedCountry.regions.length > 0 && (
        <View style={styles.regionSection}>
          <Text style={styles.regionHeader}>Region (optional)</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={selectedCountry.regions}
            keyExtractor={r => r}
            contentContainerStyle={styles.regionList}
            renderItem={({ item: region }) => (
              <TouchableOpacity
                style={[styles.regionChip, selectedRegion === region && styles.selectedRegionChip]}
                onPress={() => setSelectedRegion(selectedRegion === region ? '' : region)}
              >
                <Text style={[styles.regionChipText, selectedRegion === region && styles.selectedRegionChipText]}>
                  {region}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );

  // Step 2: Language
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.header}>Preferred Language</Text>
      <Text style={styles.subheader}>Select the language you'd like AI responses in.</Text>
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

  // Step 3: Cooking confidence slider
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.header}>Cooking Confidence</Text>
      <Text style={styles.subheader}>This helps us pitch recipes at the right level.</Text>

      <View style={styles.confidenceCard}>
        <Text style={styles.confidenceLevel}>{confidence}/5</Text>
        <Text style={styles.confidenceDesc}>{CONFIDENCE_LABELS[confidence]}</Text>
      </View>

      {/* Simple 1-5 button row — no extra dependency needed */}
      <View style={styles.confidenceRow}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity
            key={n}
            style={[styles.confidenceBtn, confidence === n && styles.selectedConfidenceBtn]}
            onPress={() => setConfidence(n)}
          >
            <Text style={[styles.confidenceBtnText, confidence === n && styles.selectedConfidenceBtnText]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Step 4: Dietary preferences
  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.header}>Dietary Preferences</Text>
      <Text style={styles.subheader}>Optional: tell us about your dietary needs so we suggest the right brands.</Text>
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

  const canAdvance = () => {
    if (step === 1) return !!selectedCountryId;
    return true;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, !canAdvance() && styles.disabledButton]}
          onPress={() => step < TOTAL_STEPS ? setStep(step + 1) : handleComplete()}
          disabled={!canAdvance() || isSubmitting}
        >
          <Text style={styles.nextButtonText}>{step === TOTAL_STEPS ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  progressBar: { height: 4, backgroundColor: '#F1F5F9', width: '100%' },
  progressFill: { height: '100%', backgroundColor: '#3B82F6' },
  scrollContent: { padding: 24 },
  stepContainer: { flex: 1 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#0F172A', marginBottom: 8 },
  subheader: { fontSize: 16, color: '#64748B', marginBottom: 32, lineHeight: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' },
  flagCard: {
    width: (width - 64) / 3,
    aspectRatio: 1,
    borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff', padding: 8,
  },
  selectedCard: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  flagIcon: { fontSize: 28, marginBottom: 6 },
  flagName: { fontSize: 11, fontWeight: '500', color: '#475569', textAlign: 'center' },
  // Region picker
  regionSection: { marginTop: 24 },
  regionHeader: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 10, letterSpacing: 0.5 },
  regionList: { gap: 8 },
  regionChip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0',
    backgroundColor: '#fff', marginRight: 8,
  },
  selectedRegionChip: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  regionChipText: { fontSize: 14, color: '#475569' },
  selectedRegionChipText: { color: '#3B82F6', fontWeight: '600' },
  // Language list
  list: { gap: 12 },
  listItem: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  selectedListItem: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  listText: { fontSize: 16, color: '#1E293B' },
  selectedListText: { color: '#3B82F6', fontWeight: '600' },
  // Confidence
  confidenceCard: {
    backgroundColor: '#EFF6FF', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 32,
  },
  confidenceLevel: { fontSize: 48, fontWeight: 'bold', color: '#3B82F6' },
  confidenceDesc: { fontSize: 15, color: '#1E293B', marginTop: 8, textAlign: 'center' },
  confidenceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  confidenceBtn: {
    flex: 1, height: 56, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff',
  },
  selectedConfidenceBtn: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  confidenceBtnText: { fontSize: 20, fontWeight: '700', color: '#94A3B8' },
  selectedConfidenceBtnText: { color: '#3B82F6' },
  // Dietary chips
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff' },
  selectedChip: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  chipText: { fontSize: 14, color: '#475569' },
  selectedChipText: { color: '#3B82F6', fontWeight: '600' },
  // Footer
  footer: { padding: 24, flexDirection: 'row', gap: 12 },
  backButton: { flex: 1, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#475569' },
  nextButton: { flex: 2, height: 56, borderRadius: 12, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  disabledButton: { backgroundColor: '#94A3B8' },
});
