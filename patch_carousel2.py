import re

filepath = 'src/components/OtherProposalsCarousel.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
if "import { useModal }" not in content:
    content = content.replace("import Link from 'next/link';", "import Link from 'next/link';\nimport { useModal } from '@/contexts/ModalContext';")

# 2. Add useModal hook inside the component
hook_anchor = "const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});"
if "const { openContentModal }" not in content:
    content = content.replace(hook_anchor, hook_anchor + "\n    const { openContentModal } = useModal();")

# 3. Replace click handler
content = content.replace("onClick={() => setShowModalForId(currentItem.id)}", "onClick={() => openContentModal(currentItem.id.toString())}")

# 4. Remove custom modal
modal_start_regex = r"\{showModalForId && rawProposal && mounted && createPortal\([\s\S]*\}\s*</style>\s*</div>\s*\)\;?"
content = re.sub(modal_start_regex, "", content)

# Remove the fallback modal logic if there's any other modal logic
# Because we used createPortal, the above regex should match.
# Wait, looking at the previous output, the old modal regex was:
# r"\{\s*showModalForId\s*&&\s*rawProposal\s*&&\s*mounted\s*&&\s*createPortal\([\s\S]*?\}\s*<\/style>\s*<\/div>\s*\)\;"
old_modal_regex = r"\{\s*showModalForId\s*&&\s*rawProposal\s*&&\s*mounted\s*&&\s*createPortal\([\s\S]*?\}\s*<\/style>\s*<\/div>\s*\)\;?"
content = re.sub(old_modal_regex, "", content)

# Just in case `rawProposal` wasn't used or it was simplified, I can find the start of the modal:
# {showModalForId && mounted && createPortal(
fallback_regex = r"\{\s*showModalForId\s*&&\s*mounted\s*&&\s*createPortal\([\s\S]*?\}\s*<\/style>\s*<\/div>\s*\)\;?"
content = re.sub(fallback_regex, "", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched OtherProposalsCarousel!")
