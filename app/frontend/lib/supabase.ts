import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// AsyncStorage (not SecureStore) for the Supabase session: sessions include
// the full JWT + refresh token + user metadata which routinely exceeds 2KB,
// and Android's Keystore caps SecureStore payloads at 2048 bytes (silent
// failure on some devices). The session is still app-sandbox protected.
// SecureStore stays in lib/byok.ts for the BYOK API keys (small, sensitive).

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
