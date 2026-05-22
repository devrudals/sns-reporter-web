import re

with open('OtherProposalsCarousel_orig.tsx', 'r', encoding='utf-16') as f:
    content = f.read()

# 1. Add import
if "import { useModal }" not in content:
    content = content.replace("import Link from 'next/link';", "import Link from 'next/link';\nimport { useModal } from '@/contexts/ModalContext';")

# 2. Add useModal hook inside the component
hook_anchor = "const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});"
if "const { openContentModal }" not in content:
    content = content.replace(hook_anchor, hook_anchor + "\n    const { openContentModal } = useModal();")

# 3. Replace click handler for the card wrapper
# The original code has: <div onClick={() => setShowModalForId(currentItem.id)}>
content = content.replace("onClick={() => setShowModalForId(currentItem.id)}", "onClick={() => openContentModal(currentItem.id.toString())}")

# 4. Remove the raw modal logic starting at: {showModalForId && rawProposal && mounted && createPortal(
# We will just find this block and delete everything until the end of the file except the final closing tags of the component.
# Actually, let's locate the exact start of the modal.
modal_start = "{showModalForId && rawProposal && mounted && createPortal("
if modal_start in content:
    start_idx = content.find(modal_start)
    end_idx = content.rfind("</div>\n  );\n}")
    
    if start_idx != -1 and end_idx != -1:
        content = content[:start_idx] + content[end_idx:]

with open('src/components/OtherProposalsCarousel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Restored and patched Carousel cleanly!")
