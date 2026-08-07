import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://shavkajkdpqgntionokp.supabase.co';
// Chave publica anon do seu projeto Supabase para autenticacao segura no client mobile
const supabaseAnonKey = 'sb_publishable_V2hyxIKREYJhx4PyxFccGA_ZndQ2';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
