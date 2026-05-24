const fs = require('fs');
let content = fs.readFileSync('src/components/ContentsLayout.tsx', 'utf8');

// Add isGlobalAdmin state
if (!content.includes('isGlobalAdmin')) {
  content = content.replace(
    "const [currentUserName, setCurrentUserName] = useState<string | null>(initialUserName);",
    "const [currentUserName, setCurrentUserName] = useState<string | null>(initialUserName);\n  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);"
  );
}

// Modify the fetchUser effect to also check admin status
const fetchUserTarget = `  useEffect(() => {
    async function fetchUser() {
      if (!initialUserEmail) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserEmail(user.email || null);
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (profile) setCurrentUserName(profile.name || profile.author_name || null);
        }
      } else {
        setCurrentUserEmail(initialUserEmail);
        setCurrentUserName(initialUserName);
      }
    }
    fetchUser();
  }, [initialUserEmail, initialUserName, supabase]);`;

const fetchUserReplace = `  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsGlobalAdmin(user.email === 'admin@admin.com' || user.email?.includes('admin') || user.user_metadata?.is_admin === true);
      }
      
      if (!initialUserEmail) {
        if (user) {
          setCurrentUserEmail(user.email || null);
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (profile) setCurrentUserName(profile.name || profile.author_name || null);
        }
      } else {
        setCurrentUserEmail(initialUserEmail);
        setCurrentUserName(initialUserName);
      }
    }
    fetchUser();
  }, [initialUserEmail, initialUserName, supabase]);`;

content = content.replace(fetchUserTarget, fetchUserReplace);

// Update isAdministrator to use isGlobalAdmin
const adminTarget = `const isAdministrator = currentUserEmail === 'admin@ymc.com' || currentUserEmail?.includes('admin');`;
const adminReplace = `const isAdministrator = currentUserEmail === 'admin@ymc.com' || currentUserEmail?.includes('admin') || isGlobalAdmin;`;
content = content.replace(adminTarget, adminReplace);

// Update condition for AdminStatusManager
const statusTarget = `{isAdministrator && selectedContent && (`;
const statusReplace = `{(isAdministrator || isGlobalAdmin) && selectedContent && (`;
content = content.replace(statusTarget, statusReplace);

fs.writeFileSync('src/components/ContentsLayout.tsx', content);
console.log('Admin check applied.');
