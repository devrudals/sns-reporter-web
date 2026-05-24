const fs = require('fs');

let code = fs.readFileSync('src/app/(authenticated)/dashboard/page.tsx', 'utf8');

// Separate notices
code = code.replace(
  '  const rawContents = (contents || []).map(item => {',
  '  const dbNotices = (contents || []).filter(c => c.content_type === \'NOTICE\');\n  const rawContents = (contents || []).filter(c => c.content_type !== \'NOTICE\').map(item => {'
);

// Pass dbNotices to NoticeList
code = code.replace(
  '<NoticeList />',
  '<NoticeList dbNotices={dbNotices} />'
);

fs.writeFileSync('src/app/(authenticated)/dashboard/page.tsx', code);
console.log('dashboard page patched');
