const fs = require('fs');

let code = fs.readFileSync('src/app/(authenticated)/admin/users/page.tsx', 'utf8');

// Add import for AdminRoleButton
if (!code.includes('AdminRoleButton')) {
  code = code.replace(
    'import { supabaseAdmin } from "@/utils/supabase/admin";',
    'import { supabaseAdmin } from "@/utils/supabase/admin";\nimport AdminRoleButton from "@/components/AdminRoleButton";'
  );
}

// Adjust headers
code = code.replace(
  '<th style={{ padding: \'1rem\', fontWeight: 500, width: \'20%\' }}>최초 가입일</th>',
  '<th style={{ padding: \'1rem\', fontWeight: 500, width: \'20%\' }}>최초 가입일</th>\n              <th style={{ padding: \'1rem\', fontWeight: 500, width: \'15%\' }}>권한 관리</th>'
);

// Adjust colSpan if empty
code = code.replace(
  'colSpan={5}',
  'colSpan={6}'
);

// Inside map loop, add td for the role button
const trStart = code.indexOf('<td style={{ padding: \'1rem\', color: \'var(--color-text-muted)\', fontSize: \'0.85rem\' }}>');
if (trStart !== -1) {
  // Find where the date td ends
  const tdEnd = code.indexOf('</td>', trStart) + 5;
  const newTd = `\n                  <td style={{ padding: '1rem' }}>
                    <AdminRoleButton 
                      userId={u.id} 
                      isCurrentlyAdmin={u.user_metadata?.is_admin === true}
                      isMaster={u.email === 'admin@admin.com'}
                    />
                  </td>`;
  code = code.substring(0, tdEnd) + newTd + code.substring(tdEnd);
}

fs.writeFileSync('src/app/(authenticated)/admin/users/page.tsx', code);
console.log('users page patched');
