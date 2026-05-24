const fs = require('fs');

let code = fs.readFileSync('src/components/ContentsLayout.tsx', 'utf8');

// 1. Add isGlobalAdmin state and admin check
if (!code.includes('isGlobalAdmin')) {
  code = code.replace(
    "const [currentUserName, setCurrentUserName] = useState<string | null>(initialUserName);",
    "const [currentUserName, setCurrentUserName] = useState<string | null>(initialUserName);\n  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);"
  );
  
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
  
  code = code.replace(fetchUserTarget, fetchUserReplace);
  
  const adminTarget = `const isAdministrator = currentUserEmail === 'admin@ymc.com' || currentUserEmail?.includes('admin');`;
  const adminReplace = `const isAdministrator = currentUserEmail === 'admin@ymc.com' || currentUserEmail?.includes('admin') || isGlobalAdmin;`;
  code = code.replace(adminTarget, adminReplace);
}

// 2. Add import AdminStatusManager
if (!code.includes('import AdminStatusManager')) {
  code = code.replace(
    "import ModalLink from '@/components/ModalLink';",
    "import ModalLink from '@/components/ModalLink';\nimport AdminStatusManager from '@/components/AdminStatusManager';"
  );
}

// 3. Add AdminStatusManager to Right Panel
const panelRegex = /\{\/\*\s*Modal Right Panel[^]*?height:\s*'100%'\s*\}\}>/;
if (!code.includes('👑 관리자 전용 상태 설정')) {
  code = code.replace(panelRegex, (match) => {
    return match + `\n                        {/* ==== ADMIN STATUS MANAGER ==== */}
                        {(isAdministrator || isGlobalAdmin) && selectedContent && (
                          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.12)', border: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
                             <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E40AF', marginBottom: '12px' }}>👑 관리자 전용 상태 설정</div>
                             <AdminStatusManager item={selectedContent} />
                          </div>
                        )}
                        {/* =============================== */}`;
  });
}

fs.writeFileSync('src/components/ContentsLayout.tsx', code);
console.log('All patches applied via single script.');
