import re

def fix_page(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    # Rename `const { data: rawContents } = await supabase` to `const { data: dbContents } = await supabase`
    code = code.replace("const { data: rawContents } = await supabase", "const { data: dbContents } = await supabase")
    
    # Rename `const contents = rawContents?.map(` to `const contents = dbContents?.map(`
    code = code.replace("const contents = rawContents?.map(", "const contents = dbContents?.map(")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(code)

fix_page('src/app/(authenticated)/dashboard/page.tsx')
fix_page('src/app/(authenticated)/contents/page.tsx')

print("Fixed variable shadowing")
