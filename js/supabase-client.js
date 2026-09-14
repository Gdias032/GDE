const SUPABASE_URL = 'https://vbsjqgkgohlkmrdrtvou.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XESn26mvZWr8Ax-7dyVzNg_uTEgZpMW';

// Inicializa o cliente do Supabase
// Como esse script carrega logo após o CDN do supabase, a variável global supabase estará disponível
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
