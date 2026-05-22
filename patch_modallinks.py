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
    
    # 1. Replace specific <Link> tags with <ModalLink>
    def link_replacer(match):
        attrs = match.group(1)
        inner = match.group(2)
        
        # Check if the link should be intercepted
        href_match = re.search(r"href=\{?['`\"](/proposals/submit.*?|/final-works/submit.*?|/contents\?openModalId=.*?)['`\"]\}?", attrs)
        
        if href_match:
            return f"<ModalLink {attrs}>{inner}</ModalLink>"
        return match.group(0)

    new_content = re.sub(r"<Link\s+(.*?)\s*>(.*?)</Link>", link_replacer, content, flags=re.DOTALL)
    
    # 2. Add ModalLink import if we used it
    if "<ModalLink" in new_content and "import ModalLink" not in new_content:
        import_str = "import ModalLink from '@/components/ModalLink';\n"
        import_matches = list(re.finditer(r"^import\s+.*?;$", new_content, re.MULTILINE))
        if import_matches:
            last_import = import_matches[-1]
            new_content = new_content[:last_import.end()] + '\n' + import_str + new_content[last_import.end():]
        else:
            new_content = import_str + new_content

    # 3. Special cases for router.push directly opening modal
    if "router.push" in new_content:
        # We need to make sure components that use router.push for modals now use ModalContext.
        # It's better to just use ModalLink for all links.
        # But wait, dashboard/page.tsx has onClick router.push? No, dashboard uses Links.
        # OtherProposalsCarousel uses onClick={() => router.push(`/contents?openModalId=${currentItem.id}`)}
        pass

    if new_content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Patched {filepath}")
    else:
        print(f"No changes for {filepath}")

for f in files_to_patch:
    patch_file(f)
