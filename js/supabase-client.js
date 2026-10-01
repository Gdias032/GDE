const SUPABASE_URL = 'https://sqrxliosgsjaszjdznpd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxcnhsaW9zZ3NqYXN6amR6bnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyODY2NTQsImV4cCI6MjEwNTg2MjY1NH0.VTAUI8ZgH3dRZYrAsvcYtSfMkQnHOBnyykIi1EDdxuU';

// Inicializa o cliente do Supabase
// Como esse script carrega logo após o CDN do supabase, a variável global supabase estará disponível
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

