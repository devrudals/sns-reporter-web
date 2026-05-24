const fs = require('fs');

let code = fs.readFileSync('src/app/(authenticated)/layout.tsx', 'utf8');

// Remove URL admin bypass logic
code = code.replace(
  /const urlParams = new URLSearchParams.*?isAdmin = sessionStorage\.getItem\('isAdminBypass'\) === 'true';\s*\}/s,
  'let isAdmin = currentUser?.email === \'admin@admin.com\' || currentUser?.user_metadata?.is_admin === true;'
);

// Remove handleLogout sessionStorage clear
code = code.replace(
  /sessionStorage\.removeItem\('isAdminBypass'\);\s*/,
  ''
);

// We need to only render the ADMIN section if `user` is admin.
// Wait, in `layout.tsx` the `isAdmin` variable is currently local to `restoreProfile`.
// We need an `isAdmin` state variable!
code = code.replace(
  'const [isSidebarOpen, setIsSidebarOpen] = useState(true);',
  'const [isSidebarOpen, setIsSidebarOpen] = useState(true);\n  const [isAdmin, setIsAdmin] = useState(false);'
);

code = code.replace(
  'let isAdmin = currentUser?.email === \'admin@admin.com\' || currentUser?.user_metadata?.is_admin === true;',
  `let isAdminUser = currentUser?.email === 'admin@admin.com' || currentUser?.user_metadata?.is_admin === true;
      setIsAdmin(isAdminUser);`
);

// Fix the pseudo-admin assignment
code = code.replace(
  /if \(!currentUser && isAdmin\).*?return;\s*\}/s,
  ''
);

// Wrap ADMIN section in {isAdmin && ( ... )}
// The ADMIN section starts with <div style={{ padding: '0 1.5rem 0.5rem 1.5rem', ... }}>ADMIN</div>
// And ends before the "테스트 모드 전환" div.

const adminMenuStart = code.indexOf('<div style={{ padding: \'0 1.5rem 0.5rem 1.5rem\', fontSize: \'0.75rem\', fontWeight: 600, color: \'rgba(255,255,255,0.6)\', marginTop: \'1.5rem\', letterSpacing: \'0.05em\' }}>ADMIN</div>');
const adminMenuEnd = code.indexOf('</nav>', adminMenuStart);

if (adminMenuStart !== -1 && adminMenuEnd !== -1) {
  let adminMenu = code.substring(adminMenuStart, adminMenuEnd);
  adminMenu = `{isAdmin && (\n            <>\n              ${adminMenu.replace(/\n/g, '\n              ')}\n            </>\n          )}`;
  code = code.substring(0, adminMenuStart) + adminMenu + code.substring(adminMenuEnd);
}

// Remove "테스트 모드 전환" entirely
const testModeStart = code.indexOf('<div style={{ padding: \'1.5rem\', borderTop: \'1px solid rgba(255,255,255,0.1)\' }}>');
const testModeEnd = code.indexOf('</aside>', testModeStart);

if (testModeStart !== -1 && testModeEnd !== -1) {
  // Just delete the whole test mode div
  code = code.substring(0, testModeStart) + code.substring(testModeEnd);
}

fs.writeFileSync('src/app/(authenticated)/layout.tsx', code);
console.log('layout patched');
