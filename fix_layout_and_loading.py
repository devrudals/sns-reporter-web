import shutil
import re

# 1. Copy loading.tsx
src_loading = 'src/app/(authenticated)/loading.tsx'
shutil.copy(src_loading, 'src/app/(authenticated)/dashboard/loading.tsx')
shutil.copy(src_loading, 'src/app/(authenticated)/contents/loading.tsx')

# 2. Fix flexShrink in ContentsLayout
path = 'src/components/ContentsLayout.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target = r"(width:\s*'100%',\s*height:\s*'140px',\s*backgroundColor:\s*'#F8FAFC',)"
replace = r"\1 flexShrink: 0,"

code = re.sub(target, replace, code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print('Done copying loading.tsx and fixing flexShrink!')
