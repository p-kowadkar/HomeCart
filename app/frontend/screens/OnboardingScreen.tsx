import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

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
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [language, setLanguage] = useState('English');
  const [confidence, setConfidence] = useState(3);
  const [dietary, setDietary] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const TOTAL_STEPS = 4;
  const selectedCountry = COUNTRIES.find(c => c.id === selectedCountryId);

  const toggleDietary = (item: string) =>
    setDietary(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);

  const handleComplete = async () => {
    if (!user || !selectedCountryId) return;
    setIsSubmitting(true);
    const countryName = selectedCountry?.name || selectedCountryId;
    const homeCuisines = selectedRegion ? [countryName, `${countryName} (${selectedRegion})`] : [countryName];
    try {
      const { error } = await supabase.from('profiles').upsert({
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

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.header, { color: colors.textPrimary }]}>Where are you from?</Text>
      <Text style={[styles.subheader, { color: colors.textSecondary }]}>
        Select your home country and region so we can tailor ingredient translations to your cuisine.
      </Text>

      <View style={styles.grid}>
        {COUNTRIES.map(item => {
          const selected = selectedCountryId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.flagCard,
                { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border },
                selected && { backgroundColor: colors.primarySubtle },
              ]}
              onPress={() => { setSelectedCountryId(item.id); setSelectedRegion(''); }}
            >
              <Text style={styles.flagIcon}>{item.flag}</Text>
              <Text style={[styles.flagName, { color: selected ? colors.primary : colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedCountry && selectedCountry.regions.length > 0 && (
        <View style={styles.regionSection}>
          <Text style={[styles.regionHeader, { color: colors.textTertiary }]}>REGION (OPTIONAL)</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={selectedCountry.regions}
            keyExtractor={r => r}
            contentContainerStyle={styles.regionList}
            renderItem={({ item: region }) => {
              const sel = selectedRegion === region;
              return (
                <TouchableOpacity
                  style={[
                    styles.regionChip,
                    { backgroundColor: sel ? colors.primary : colors.surface, borderColor: sel ? colors.primary : colors.border },
                  ]}
                  onPress={() => setSelectedRegion(sel ? '' : region)}
                >
                  <Text style={{ color: sel ? '#fff' : colors.textPrimary, fontWeight: sel ? '700' : '500', fontSize: 13 }}>{region}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.header, { color: colors.textPrimary }]}>Preferred Language</Text>
      <Text style={[styles.subheader, { color: colors.textSecondary }]}>Select the language you'd like AI responses in.</Text>
      <View style={styles.list}>
        {LANGUAGES.map(item => {
          const sel = language === item;
          return (
            <TouchableOpacity
              key={item}
              style={[
                styles.listItem,
                { backgroundColor: colors.surface, borderColor: sel ? colors.primary : colors.border },
                sel && { backgroundColor: colors.primarySubtle },
              ]}
              onPress={() => setLanguage(item)}
            >
              <Text style={{ color: sel ? colors.primary : colors.textPrimary, fontWeight: sel ? '700' : '500', fontSize: 15 }}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.header, { color: colors.textPrimary }]}>Cooking Confidence</Text>
      <Text style={[styles.subheader, { color: colors.textSecondary }]}>This helps us pitch recipes at the right level.</Text>

      <View style={[styles.confidenceCard, { backgroundColor: colors.primarySubtle, borderColor: colors.primary + '40' }]}>
        <Text style={[styles.confidenceLevel, { color: colors.primary }]}>{confidence}/5</Text>
        <Text style={[styles.confidenceDesc, { color: colors.textPrimary }]}>{CONFIDENCE_LABELS[confidence]}</Text>
      </View>

      <View style={styles.confidenceRow}>
        {[1, 2, 3, 4, 5].map(n => {
          const sel = confidence === n;
          return (
            <TouchableOpacity
              key={n}
              style={[
                styles.confidenceBtn,
                { backgroundColor: sel ? colors.primary : colors.surface, borderColor: sel ? colors.primary : colors.border },
              ]}
              onPress={() => setConfidence(n)}
            >
              <Text style={{ color: sel ? '#fff' : colors.textTertiary, fontWeight: '700', fontSize: 18 }}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.header, { color: colors.textPrimary }]}>Dietary Preferences</Text>
      <Text style={[styles.subheader, { color: colors.textSecondary }]}>Optional: tell us about your dietary needs so we suggest the right brands.</Text>
      <View style={styles.chipContainer}>
        {DIETARY.map(item => {
          const sel = dietary.includes(item);
          return (
            <TouchableOpacity
              key={item}
              style={[
                styles.chip,
                { backgroundColor: sel ? colors.primary : colors.surface, borderColor: sel ? colors.primary : colors.border },
              ]}
              onPress={() => toggleDietary(item)}
            >
              <Text style={{ color: sel ? '#fff' : colors.textPrimary, fontWeight: sel ? '700' : '500', fontSize: 14 }}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const canAdvance = () => step === 1 ? !!selectedCountryId : true;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
        <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%`, backgroundColor: colors.primary }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {step > 1 && (
          <TouchableOpacity
            style={[styles.backButton, { borderColor: colors.border }]}
            onPress={() => setStep(step - 1)}
          >
            <Text style={[styles.backButtonText, { color: colors.textPrimary }]}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextButton,
            { backgroundColor: canAdvance() ? colors.primary : colors.surface, opacity: isSubmitting ? 0.6 : 1 },
          ]}
          onPress={() => step < TOTAL_STEPS ? setStep(step + 1) : handleComplete()}
          disabled={!canAdvance() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.nextButtonText, { color: canAdvance() ? '#fff' : colors.textTertiary }]}>
              {step === TOTAL_STEPS ? 'Get Started' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressBar: { height: 3, width: '100%' },
  progressFill: { height: '100%' },
  scrollContent: { padding: 24, paddingBottom: 16 },
  stepContainer: { flex: 1 },
  header: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  subheader: { fontSize: 14, marginBottom: 28, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
  flagCard: {
    width: (width - 68) / 3,
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  flagIcon: { fontSize: 26, marginBottom: 4 },
  flagName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  regionSection: { marginTop: 24 },
  regionHeader: { fontSize: 11, fontWeight: '700', marginBottom: 10, letterSpacing: 1 },
  regionList: { gap: 8 },
  regionChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  list: { gap: 10 },
  listItem: { padding: 16, borderRadius: 14, borderWidth: 1 },
  confidenceCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
  },
  confidenceLevel: { fontSize: 44, fontWeight: '800' },
  confidenceDesc: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  confidenceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  confidenceBtn: {
    flex: 1, height: 56, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center',
  },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, borderWidth: 1 },
  footer: { padding: 20, flexDirection: 'row', gap: 10, borderTopWidth: 1 },
  backButton: { flex: 1, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  backButtonText: { fontSize: 15, fontWeight: '600' },
  nextButton: { flex: 2, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  nextButtonText: { fontSize: 15, fontWeight: '700' },
});
