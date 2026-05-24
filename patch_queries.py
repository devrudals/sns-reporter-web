import re

def patch_file(filepath, days):
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    # Find the query
    target = r"(\.neq\('status',\s*'draft'\))\s*\n\s*(\.order\('created_at')"
    
    replace = r"\1\n    .gte('created_at', new Date(Date.now() - " + str(days) + r" * 24 * 60 * 60 * 1000).toISOString())\n    \2"
    
    if ".gte('created_at'" not in code:
        code = re.sub(target, replace, code)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(code)
        print(f"Patched {filepath}")
    else:
        print(f"Already patched {filepath}")

patch_file('src/app/(authenticated)/dashboard/page.tsx', 90)
patch_file('src/app/(authenticated)/contents/page.tsx', 180)
