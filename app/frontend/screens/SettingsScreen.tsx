import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Modal, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import {
  ByokKeys, loadByokKeys, saveByokKeys, clearAllByokKeys,
  detectLLMProvider, providerDisplayName,
} from '../lib/byok';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface ProviderLink {
  label: string;
  url: string;
}

const LLM_PROVIDER_LINKS: ProviderLink[] = [
  { label: 'Get an OpenRouter key', url: 'https://openrouter.ai/keys' },
  { label: 'Get an OpenAI key', url: 'https://platform.openai.com/api-keys' },
  { label: 'Get an Anthropic key', url: 'https://console.anthropic.com/settings/keys' },
];

const GCP_LINK = 'https://console.cloud.google.com/apis/credentials';
const TAVILY_LINK = 'https://app.tavily.com/home';
const FIRECRAWL_LINK = 'https://www.firecrawl.dev/app/api-keys';

export default function SettingsScreen({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keys, setKeys] = useState<ByokKeys>({});
  const [reveal, setReveal] = useState<Record<keyof ByokKeys, boolean>>({
    llmKey: false, gcpKey: false, tavilyKey: false, firecrawlKey: false,
  });

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      try {
        const loaded = await loadByokKeys();
        setKeys(loaded);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const detectedProvider = detectLLMProvider(keys.llmKey);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveByokKeys(keys);
      Alert.alert('Saved', 'Your keys are stored securely on this device only.');
      onClose();
    } catch (e: any) {
      Alert.alert('Save failed', e.message || 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const onClearAll = () => {
    Alert.alert(
      'Clear all keys?',
      'HomeCart will go back to using its default keys for all API calls.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllByokKeys();
            setKeys({});
            Alert.alert('Cleared', 'All BYOK keys removed from this device.');
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="formSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>API Keys (BYOK)</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Use your own provider credits. Keys never leave your device except as headers on the API call.
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ color: colors.textSecondary, fontSize: 28, lineHeight: 30 }}>×</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* LLM */}
            <Section
              title="LLM Provider"
              icon="brain"
              description="One key, provider auto-detected from prefix. OpenRouter routes Claude with your credits; direct OpenAI / Anthropic also supported."
              colors={colors}
            >
              <KeyInput
                value={keys.llmKey || ''}
                onChangeText={v => setKeys({ ...keys, llmKey: v })}
                placeholder="sk-or-... / sk-... / sk-ant-..."
                reveal={reveal.llmKey}
                onToggleReveal={() => setReveal(r => ({ ...r, llmKey: !r.llmKey }))}
                colors={colors}
              />
              {!!keys.llmKey && (
                <View style={[styles.detectChip, { backgroundColor: colors.primarySubtle }]}>
                  <MaterialCommunityIcons name="check-circle" size={13} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 12, marginLeft: 6, fontWeight: '600' }}>
                    Detected: {providerDisplayName(detectedProvider)}
                  </Text>
                </View>
              )}
              <View style={styles.linkRow}>
                {LLM_PROVIDER_LINKS.map(l => (
                  <TouchableOpacity key={l.url} onPress={() => Linking.openURL(l.url)}>
                    <Text style={[styles.linkText, { color: colors.primary }]}>{l.label} →</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Section>

            {/* GCP */}
            <Section
              title="Google Maps / Places"
              icon="map"
              description="For the store-finder on the Map tab. Needs Places API (New) + Maps SDK enabled."
              colors={colors}
            >
              <KeyInput
                value={keys.gcpKey || ''}
                onChangeText={v => setKeys({ ...keys, gcpKey: v })}
                placeholder="AIza..."
                reveal={reveal.gcpKey}
                onToggleReveal={() => setReveal(r => ({ ...r, gcpKey: !r.gcpKey }))}
                colors={colors}
              />
              <TouchableOpacity onPress={() => Linking.openURL(GCP_LINK)}>
                <Text style={[styles.linkText, { color: colors.primary }]}>Google Cloud credentials →</Text>
              </TouchableOpacity>
            </Section>

            {/* Tavily */}
            <Section
              title="Tavily (optional)"
              icon="magnify"
              description="Web search fallback when Google Places returns nothing useful in your area. 1000 free credits/month."
              colors={colors}
            >
              <KeyInput
                value={keys.tavilyKey || ''}
                onChangeText={v => setKeys({ ...keys, tavilyKey: v })}
                placeholder="tvly-..."
                reveal={reveal.tavilyKey}
                onToggleReveal={() => setReveal(r => ({ ...r, tavilyKey: !r.tavilyKey }))}
                colors={colors}
              />
              <TouchableOpacity onPress={() => Linking.openURL(TAVILY_LINK)}>
                <Text style={[styles.linkText, { color: colors.primary }]}>Get a Tavily key →</Text>
              </TouchableOpacity>
            </Section>

            {/* Firecrawl */}
            <Section
              title="Firecrawl (optional)"
              icon="fire"
              description='Scrape "where to buy" pages from supermarket websites to enrich scans. 500 free credits.'
              colors={colors}
            >
              <KeyInput
                value={keys.firecrawlKey || ''}
                onChangeText={v => setKeys({ ...keys, firecrawlKey: v })}
                placeholder="fc-..."
                reveal={reveal.firecrawlKey}
                onToggleReveal={() => setReveal(r => ({ ...r, firecrawlKey: !r.firecrawlKey }))}
                colors={colors}
              />
              <TouchableOpacity onPress={() => Linking.openURL(FIRECRAWL_LINK)}>
                <Text style={[styles.linkText, { color: colors.primary }]}>Get a Firecrawl key →</Text>
              </TouchableOpacity>
            </Section>

            <TouchableOpacity onPress={onClearAll} style={styles.clearLink}>
              <Text style={{ color: colors.error, fontSize: 13, fontWeight: '600' }}>Clear all keys</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.5 : 1 }]}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save keys</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Section({
  title, icon, description, colors, children,
}: {
  title: string; icon: any; description: string; colors: any; children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: colors.primarySubtle }]}>
          <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>{description}</Text>
      {children}
    </View>
  );
}

function KeyInput({
  value, onChangeText, placeholder, reveal, onToggleReveal, colors,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  reveal: boolean;
  onToggleReveal: () => void;
  colors: any;
}) {
  return (
    <View style={[styles.inputRow, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        secureTextEntry={!reveal}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        style={[styles.input, { color: colors.textPrimary }]}
      />
      <TouchableOpacity onPress={onToggleReveal} style={styles.revealBtn}>
        <MaterialCommunityIcons name={reveal ? 'eye-off' : 'eye'} size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  closeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingTop: 0, paddingBottom: 24 },
  section: { padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionDesc: { fontSize: 12, lineHeight: 17, marginTop: 6, marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, fontFamily: 'monospace' },
  revealBtn: { padding: 12 },
  detectChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginTop: 10 },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  linkText: { fontSize: 12, fontWeight: '600' },
  clearLink: { padding: 16, alignItems: 'center', marginTop: 12 },
  footer: { padding: 20, paddingBottom: 28, borderTopWidth: 1 },
  saveBtn: { padding: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
