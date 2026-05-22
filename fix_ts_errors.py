import re

# 1. Fix ContentsLayout.tsx
filepath = 'src/components/ContentsLayout.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# The current signature is:
# export default function ContentsLayout({ 
#   initialContents, 
#   currentUserEmail, 
#   currentUserName 
# }: { 
#   initialContents: ContentItem[], 
#   currentUserEmail: string | null,
#   currentUserName: string | null
# }) {

# Wait, since my `patch_contents.py` didn't touch the signature, it probably just relies on what's already there.
# Let's replace the whole signature.
new_sig = """export default function ContentsLayout({ 
  initialContents = [], 
  currentUserEmail = null, 
  currentUserName = null,
  openModalId,
  modalOnly = false,
  onModalClose
}: { 
  initialContents?: ContentItem[], 
  currentUserEmail?: string | null,
  currentUserName?: string | null,
  openModalId?: number,
  modalOnly?: boolean,
  onModalClose?: () => void
}) {"""
content = re.sub(r"export default function ContentsLayout\(\{.*?\}: \{.*?\}\) \{", new_sig, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Fix ProposalSubmitForm.tsx
filepath = 'src/components/ProposalSubmitForm.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"export default function ProposalSubmitPage\(\) \{[\s\S]*?\}", "", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed TS errors")
