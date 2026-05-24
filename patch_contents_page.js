const fs = require('fs');

let code = fs.readFileSync('src/app/(authenticated)/contents/page.tsx', 'utf8');

code = code.replace(
  ".neq('content_type', 'SYSTEM_PROFILE')",
  ".neq('content_type', 'SYSTEM_PROFILE')\n    .neq('content_type', 'NOTICE')"
);

fs.writeFileSync('src/app/(authenticated)/contents/page.tsx', code);
console.log('contents page patched');
