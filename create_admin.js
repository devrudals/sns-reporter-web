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

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createMasterAdmin() {
  console.log("Creating admin@admin.com...");
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'admin@admin.com',
    password: '000000',
    email_confirm: true,
    user_metadata: {
      name: '마스터 관리자',
      full_name: '마스터 관리자',
      team: '운영진',
      is_admin: true
    }
  });

  if (error) {
    if (error.message.includes('already registered')) {
      console.log("Admin already exists. Updating metadata...");
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) return console.error(listError);
      
      const adminUser = usersData.users.find(u => u.email === 'admin@admin.com');
      if (adminUser) {
        await supabaseAdmin.auth.admin.updateUserById(adminUser.id, {
          password: '000000',
          user_metadata: {
            name: '마스터 관리자',
            full_name: '마스터 관리자',
            team: '운영진',
            is_admin: true
          }
        });
        console.log("Admin updated.");
      }
    } else {
      console.error("Error creating user:", error);
    }
  } else {
    console.log("Admin created successfully:", data.user?.id);
  }
}

createMasterAdmin();
