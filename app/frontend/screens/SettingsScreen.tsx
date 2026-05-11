import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Modal, Linking, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import {
  ByokKeys, LLMProvider, loadByokKeys, saveByokKeys, clearAllByokKeys,
  detectLLMProvider, resolveProvider, providerDisplayName,
} from '../lib/byok';
import {
  ModelOption, modelsForProvider, visionModels,
  defaultVisionModel, defaultTextModel, formatPrice,
} from '../lib/models';
import { fetchOpenRouterModels, sortByPrice } from '../lib/openrouter';

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

const PROVIDERS: { value: LLMProvider; label: string }[] = [
  { value: 'auto', label: 'Auto-detect from key' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
];

export default function SettingsScreen({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keys, setKeys] = useState<ByokKeys>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [orModels, setOrModels] = useState<ModelOption[]>([]);
  const [orFetching, setOrFetching] = useState(false);
  const [modelPicker, setModelPicker] = useState<null | { kind: 'vision' | 'text' }>(null);

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

  const effectiveProvider = resolveProvider(keys);

  // Live-fetch OpenRouter models when settings open AND provider resolves to openrouter.
  useEffect(() => {
    if (!visible || effectiveProvider !== 'openrouter') return;
    setOrFetching(true);
    fetchOpenRouterModels()
      .then(setOrModels)
      .catch(() => setOrModels([]))  // silently fall back to hardcoded list
      .finally(() => setOrFetching(false));
  }, [visible, effectiveProvider]);

  const availableModels = useMemo(
    () => modelsForProvider(effectiveProvider, orModels),
    [effectiveProvider, orModels],
  );

  const visionOnly = useMemo(() => sortByPrice(visionModels(availableModels)), [availableModels]);
  const allModels = useMemo(() => sortByPrice(availableModels), [availableModels]);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveByokKeys(keys);
      Alert.alert('Saved', 'Your keys and model picks are stored securely on this device only.');
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
            Alert.alert('Cleared', 'All BYOK settings removed from this device.');
          },
        },
      ],
    );
  };

  // When user pastes a key OR changes provider, pre-fill sensible model defaults.
  const onProviderChange = (p: LLMProvider) => {
    const resolved = p === 'auto' ? detectLLMProvider(keys.llmKey) : p;
    setKeys(prev => ({
      ...prev,
      llmProvider: p,
      llmVisionModel: prev.llmVisionModel || defaultVisionModel(resolved),
      llmTextModel: prev.llmTextModel || defaultTextModel(resolved),
    }));
  };

  const onLlmKeyChange = (v: string) => {
    setKeys(prev => {
      const next = { ...prev, llmKey: v };
      // If provider is auto, populate defaults based on detected key prefix
      if (!prev.llmProvider || prev.llmProvider === 'auto') {
        const detected = detectLLMProvider(v);
        if (!next.llmVisionModel) next.llmVisionModel = defaultVisionModel(detected);
        if (!next.llmTextModel) next.llmTextModel = defaultTextModel(detected);
      }
      return next;
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="formSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>API Keys (BYOK)</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Use your own provider credits and pick your own models. Keys stay on this device.
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
            <Section title="LLM Provider" icon="brain"
              description="One key, with optional explicit provider + model overrides. Without an LLM key, HomeCart's free-tier limits apply (10 scans + 3 recipes/day)."
              colors={colors}>
              <KeyInput
                value={keys.llmKey || ''}
                onChangeText={onLlmKeyChange}
                placeholder="sk-or-... / sk-... / sk-ant-..."
                reveal={!!reveal.llmKey}
                onToggleReveal={() => setReveal(r => ({ ...r, llmKey: !r.llmKey }))}
                colors={colors}
              />

              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>PROVIDER</Text>
              <View style={styles.providerRow}>
                {PROVIDERS.map(p => {
                  const isActive = (keys.llmProvider || 'auto') === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      onPress={() => onProviderChange(p.value)}
                      style={[
                        styles.providerChip,
                        { borderColor: isActive ? colors.primary : colors.border,
                          backgroundColor: isActive ? colors.primarySubtle : 'transparent' },
                      ]}
                    >
                      <Text style={{ color: isActive ? colors.primary : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {keys.llmProvider === 'auto' || !keys.llmProvider ? (
                <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
                  Effective: {providerDisplayName(effectiveProvider)} (from key prefix)
                </Text>
              ) : null}

              {effectiveProvider !== 'auto' && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary, marginTop: 18 }]}>
                    VISION MODEL (for product scans)
                    {orFetching && effectiveProvider === 'openrouter' && (
                      <Text style={{ color: colors.textTertiary, fontSize: 10 }}>  · fetching…</Text>
                    )}
                  </Text>
                  <ModelButton
                    model={visionOnly.find(m => m.id === keys.llmVisionModel) || null}
                    fallbackLabel={keys.llmVisionModel || 'Pick a model'}
                    colors={colors}
                    onPress={() => setModelPicker({ kind: 'vision' })}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.textTertiary, marginTop: 14 }]}>
                    TEXT MODEL (for recipe parsing)
                  </Text>
                  <ModelButton
                    model={allModels.find(m => m.id === keys.llmTextModel) || null}
                    fallbackLabel={keys.llmTextModel || 'Pick a model'}
                    colors={colors}
                    onPress={() => setModelPicker({ kind: 'text' })}
                  />
                </>
              )}

              <View style={styles.linkRow}>
                {LLM_PROVIDER_LINKS.map(l => (
                  <TouchableOpacity key={l.url} onPress={() => Linking.openURL(l.url)}>
                    <Text style={[styles.linkText, { color: colors.primary }]}>{l.label} →</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Section>

            <Section title="Google Maps / Places" icon="map"
              description="For the store-finder on the Map tab. Optional — without this, HomeCart's default Maps key is used."
              colors={colors}>
              <KeyInput
                value={keys.gcpKey || ''}
                onChangeText={v => setKeys({ ...keys, gcpKey: v })}
                placeholder="AIza..."
                reveal={!!reveal.gcpKey}
                onToggleReveal={() => setReveal(r => ({ ...r, gcpKey: !r.gcpKey }))}
                colors={colors}
              />
              <TouchableOpacity onPress={() => Linking.openURL(GCP_LINK)}>
                <Text style={[styles.linkText, { color: colors.primary }]}>Google Cloud credentials →</Text>
              </TouchableOpacity>
            </Section>

            <Section title="Tavily (optional)" icon="magnify"
              description="Web search fallback when Google Places returns nothing useful. 1000 free credits/month."
              colors={colors}>
              <KeyInput
                value={keys.tavilyKey || ''}
                onChangeText={v => setKeys({ ...keys, tavilyKey: v })}
                placeholder="tvly-..."
                reveal={!!reveal.tavilyKey}
                onToggleReveal={() => setReveal(r => ({ ...r, tavilyKey: !r.tavilyKey }))}
                colors={colors}
              />
              <TouchableOpacity onPress={() => Linking.openURL(TAVILY_LINK)}>
                <Text style={[styles.linkText, { color: colors.primary }]}>Get a Tavily key →</Text>
              </TouchableOpacity>
            </Section>

            <Section title="Firecrawl (optional)" icon="fire"
              description='Scrape "where to buy" pages from supermarket websites to enrich scans. 500 free credits.'
              colors={colors}>
              <KeyInput
                value={keys.firecrawlKey || ''}
                onChangeText={v => setKeys({ ...keys, firecrawlKey: v })}
                placeholder="fc-..."
                reveal={!!reveal.firecrawlKey}
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
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ModelPickerModal
          visible={!!modelPicker}
          kind={modelPicker?.kind || 'vision'}
          models={modelPicker?.kind === 'vision' ? visionOnly : allModels}
          currentId={modelPicker?.kind === 'vision' ? keys.llmVisionModel : keys.llmTextModel}
          colors={colors}
          onPick={(id) => {
            if (modelPicker?.kind === 'vision') setKeys(k => ({ ...k, llmVisionModel: id }));
            else setKeys(k => ({ ...k, llmTextModel: id }));
            setModelPicker(null);
          }}
          onClose={() => setModelPicker(null)}
        />
      </SafeAreaView>
    </Modal>
  );
}

function Section({ title, icon, description, colors, children }: {
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

function KeyInput({ value, onChangeText, placeholder, reveal, onToggleReveal, colors }: {
  value: string; onChangeText: (v: string) => void; placeholder: string;
  reveal: boolean; onToggleReveal: () => void; colors: any;
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

function ModelButton({ model, fallbackLabel, colors, onPress }: {
  model: ModelOption | null; fallbackLabel: string; colors: any; onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.modelButton, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.modelButtonLabel, { color: colors.textPrimary }]}>
          {model?.label || fallbackLabel}
        </Text>
        {model && (
          <Text style={[styles.modelButtonPrice, { color: colors.textTertiary }]}>
            {formatPrice(model.inputPerM)} in · {formatPrice(model.outputPerM)} out per 1M tokens
          </Text>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

function ModelPickerModal({ visible, kind, models, currentId, colors, onPick, onClose }: {
  visible: boolean; kind: 'vision' | 'text'; models: ModelOption[]; currentId?: string;
  colors: any; onPick: (id: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="formSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Pick {kind === 'vision' ? 'vision' : 'text'} model
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {kind === 'vision' ? 'Used for scanning product images.' : 'Used for parsing recipes.'}
              {' '}Sorted cheapest first.
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ color: colors.textSecondary, fontSize: 28, lineHeight: 30 }}>×</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={models}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 20, paddingTop: 0 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => {
            const isActive = item.id === currentId;
            return (
              <TouchableOpacity
                onPress={() => onPick(item.id)}
                style={[styles.modelRow, {
                  backgroundColor: colors.surface,
                  borderColor: isActive ? colors.primary : colors.border,
                  borderWidth: isActive ? 2 : 1,
                }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modelRowLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                  <Text style={[styles.modelRowId, { color: colors.textTertiary }]}>{item.id}</Text>
                  <Text style={[styles.modelRowPrice, { color: colors.textSecondary }]}>
                    {formatPrice(item.inputPerM)} in · {formatPrice(item.outputPerM)} out / 1M
                    {item.vision ? '  · 👁 vision' : ''}
                  </Text>
                  {item.notes && (
                    <Text style={[styles.modelRowNotes, { color: colors.textTertiary }]}>{item.notes}</Text>
                  )}
                </View>
                {isActive && (
                  <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>No models available. Pick a provider first.</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
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
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  fieldHint: { fontSize: 11, marginTop: 6 },
  providerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  providerChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  modelButton: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, gap: 8,
  },
  modelButtonLabel: { fontSize: 14, fontWeight: '600' },
  modelButtonPrice: { fontSize: 11, marginTop: 2 },
  modelRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, gap: 12 },
  modelRowLabel: { fontSize: 15, fontWeight: '600' },
  modelRowId: { fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  modelRowPrice: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  modelRowNotes: { fontSize: 11, marginTop: 4, lineHeight: 15, fontStyle: 'italic' },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  linkText: { fontSize: 12, fontWeight: '600' },
  clearLink: { padding: 16, alignItems: 'center', marginTop: 12 },
  footer: { padding: 20, paddingBottom: 28, borderTopWidth: 1 },
  saveBtn: { padding: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
