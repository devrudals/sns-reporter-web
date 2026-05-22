import re

with open('src/app/(authenticated)/layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_str = "import { ModalProvider } from '@/contexts/ModalContext';"
if import_str not in content:
    content = content.replace("import NotificationsPopup from \"@/components/NotificationsPopup\";", "import NotificationsPopup from \"@/components/NotificationsPopup\";\n" + import_str)

wrap_start = r"return \(\s*<div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>"
wrap_end = r"</div>\s*\);\s*}\s*$"

if "<ModalProvider>" not in content:
    content = re.sub(r"return \(\s*(<div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>)", r"return (\n    <ModalProvider>\n      \1", content)
    content = re.sub(r"(</div>\s*)\);\s*}", r"\1    </ModalProvider>\n  );\n}", content)

with open('src/app/(authenticated)/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("layout.tsx patched")
