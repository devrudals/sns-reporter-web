const fs = require('fs');
let code = fs.readFileSync('src/app/(authenticated)/notices/NoticesClient.tsx', 'utf8');

// Add useSearchParams
code = code.replace(
  "import React, { useState } from 'react';",
  "import React, { useState, useEffect } from 'react';\nimport { useSearchParams } from 'next/navigation';"
);

// Initialize expandedId
code = code.replace(
  "const [expandedId, setExpandedId] = useState<string | null>(null);",
  "const searchParams = useSearchParams();\n  const initialId = searchParams?.get('id') || null;\n  const [expandedId, setExpandedId] = useState<string | null>(initialId);\n\n  useEffect(() => {\n    if (initialId) setExpandedId(initialId);\n  }, [initialId]);"
);

fs.writeFileSync('src/app/(authenticated)/notices/NoticesClient.tsx', code);
console.log('NoticesClient patched');
