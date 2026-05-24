import re

def add_suspense(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    if "export default async function" in code:
        # Rename default export to internal component
        code = re.sub(r"export default async function ([\w]+)", r"async function \1Content", code)
        
        # Extract the component name that was just renamed
        match = re.search(r"async function ([\w]+)Content", code)
        if match:
            comp_name = match.group(1)
            
            # Add Suspense and new default export
            wrapper = f"""
import {{ Suspense }} from 'react';
import Loading from '../loading';

export default function {comp_name}({{ searchParams }}: PageProps) {{
  return (
    <Suspense fallback={{<Loading />}}>
      <{comp_name}Content searchParams={{searchParams}} />
    </Suspense>
  );
}}
"""
            code = code + wrapper
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(code)
            print(f"Added Suspense to {filepath}")

add_suspense('src/app/(authenticated)/dashboard/page.tsx')
add_suspense('src/app/(authenticated)/contents/page.tsx')
