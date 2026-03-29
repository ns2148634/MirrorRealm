// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// 使用 Vite 的環境變數讀取方式
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);