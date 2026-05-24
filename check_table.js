const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const envLines = envLocal.split('\n');
const env = {};
for (const line of envLines) {
  if (line.includes('=')) {
    const [key, ...val] = line.split('=');
    env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
  }
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkNotices() {
  const { data, error } = await supabase.from('notices').select('*').limit(1);
  if (error) {
    console.log("No notices table:", error.message);
  } else {
    console.log("notices table exists!");
  }
}

checkNotices();
