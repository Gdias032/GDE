const SUPABASE_URL = 'https://fllpzltsmvjlouubnlxn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZOt2EHoQwTaSWgL-Xl81zg_NjrVVP7f';

// Inicializa o cliente do Supabase
// Como esse script carrega logo após o CDN do supabase, a variável global supabase estará disponível
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

