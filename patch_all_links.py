import re
import os

files_to_patch = [
    'src/components/UploadCard.tsx',
    'src/components/DashboardCalendarArea.tsx',
    'src/components/ContentsLayout.tsx',
    'src/app/(authenticated)/dashboard/page.tsx',
    'src/app/(authenticated)/search/page.tsx',
    'src/app/(authenticated)/proposals/page.tsx',
    'src/components/OtherProposalsCarousel.tsx'
]

def patch_file(filepath):
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}, not found")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # 1. Add useModal import if we are going to modify
    if 'useModal' not in content:
        import_str = "import { useModal } from '@/contexts/ModalContext';\n"
        # Find the last import
        import_matches = list(re.finditer(r"^import\s+.*?;$", content, re.MULTILINE))
        if import_matches:
            last_import = import_matches[-1]
            content = content[:last_import.end()] + '\n' + import_str + content[last_import.end():]
        else:
            content = import_str + content

    # 2. Add const { openProposalModal, openFinalWorkModal, openContentModal } = useModal();
    # Find the main component function definition
    func_match = re.search(r"export default function \w+\(.*?\)\s*\{", content)
    if func_match:
        hook_str = "\n  const { openProposalModal, openFinalWorkModal, openContentModal } = useModal();\n"
        content = content[:func_match.end()] + hook_str + content[func_match.end():]

    # 3. Replace <Link href="/proposals/submit"> with <button onClick={() => openProposalModal()}>
    # Pattern: <Link href="/proposals/submit" style={...} className="...">...</Link>
    # Note: Link might have className or style
    def link_replacer(match):
        attrs = match.group(1)
        inner = match.group(2)
        
        # Determine the action based on href
        href_match = re.search(r"href=\{?['`\"](/proposals/submit(?:\?id=\$\{([a-zA-Z0-9_.]+)\})?|/final-works/submit(?:\?id=\$\{([a-zA-Z0-9_.]+)\})?|/contents\?openModalId=\$\{([a-zA-Z0-9_.]+)\})['`\"]\}?", attrs)
        
        if not href_match:
            if 'href="/proposals/submit"' in attrs:
                return f'<button onClick={{() => openProposalModal()}} {attrs.replace("""href="/proposals/submit\"""", """style={{ cursor: 'pointer', ...style, background: 'none', border: 'none', padding: 0 }}""").replace("style={{", "style={{ cursor: \'pointer\', background: \'none\', border: \'none\', padding: 0, textAlign: \'left\', font: \'inherit\', ").replace("className=", "className=")}>{inner}</button>'
            if 'href="/final-works/submit"' in attrs:
                return f'<button onClick={{() => openFinalWorkModal()}} {attrs.replace("""href="/final-works/submit\"""", """style={{ cursor: 'pointer', ...style, background: 'none', border: 'none', padding: 0 }}""").replace("style={{", "style={{ cursor: \'pointer\', background: \'none\', border: \'none\', padding: 0, textAlign: \'left\', font: \'inherit\', ").replace("className=", "className=")}>{inner}</button>'
            return match.group(0)

        href_val = href_match.group(1)
        prop_id = href_match.group(2)
        final_id = href_match.group(3)
        content_id = href_match.group(4)
        
        action = ""
        if prop_id:
            action = f"onClick={{(e) => {{ e.preventDefault(); openProposalModal({prop_id}); }}}}"
        elif "/proposals/submit" in href_val:
            action = f"onClick={{(e) => {{ e.preventDefault(); openProposalModal(); }}}}"
        elif final_id:
            action = f"onClick={{(e) => {{ e.preventDefault(); openFinalWorkModal({final_id}); }}}}"
        elif "/final-works/submit" in href_val:
            action = f"onClick={{(e) => {{ e.preventDefault(); openFinalWorkModal(); }}}}"
        elif content_id:
            action = f"onClick={{(e) => {{ e.preventDefault(); openContentModal({content_id}); }}}}"
            
        # Clean attrs to remove href
        attrs_clean = re.sub(r"href=\{?['`\"].*?['`\"]\}?\s*", "", attrs)
        
        # Inject button styles so it behaves like a link
        if "style={{" in attrs_clean:
            attrs_clean = attrs_clean.replace("style={{", "style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left', font: 'inherit', ")
        else:
            attrs_clean += " style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left', font: 'inherit' }}"
            
        return f"<button {action} {attrs_clean}>{inner}</button>"

    content = re.sub(r"<Link\s+(.*?)\s*>(.*?)</Link>", link_replacer, content, flags=re.DOTALL)

    # 4. Special cases for router.push in onClick
    content = re.sub(r"router\.push\(['`]/contents\?openModalId=\$\{([a-zA-Z0-9_.]+)\}.*?['`]\)", r"openContentModal(\1)", content)
    content = re.sub(r"router\.push\(['`]/proposals/submit\?id=\$\{([a-zA-Z0-9_.]+)\}.*?['`]\)", r"openProposalModal(\1)", content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {filepath}")
    else:
        print(f"No changes for {filepath}")

for f in files_to_patch:
    patch_file(f)
