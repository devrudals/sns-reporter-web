import re

with open('src/components/ProposalSubmitForm.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the component signature
sig_old = "function ProposalSubmitForm() {"
sig_new = """export interface ProposalSubmitFormProps {
  embeddedId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export default function ProposalSubmitForm({ embeddedId, onSuccess, onCancel, isModal = false }: ProposalSubmitFormProps) {"""
content = content.replace(sig_old, sig_new)

# Replace idToEdit
content = content.replace("const idToEdit = searchParams?.get('id');", "const idToEdit = embeddedId || searchParams?.get('id');")

# Replace router.back()
content = content.replace("onClick={() => router.back()}", "onClick={() => onCancel ? onCancel() : router.back()}")

# Replace router.push('/proposals') and router.push('/contents')
content = re.sub(r"router\.push\(['`]/proposals['`]\);?\s*router\.refresh\(\);?", "if (onSuccess) onSuccess(); else { router.push('/proposals'); router.refresh(); }", content)
content = re.sub(r"router\.push\(['`]/contents\?openModalId=\$\{data\[0\]\.id\}['`]\);?", "if (onSuccess) onSuccess(); else { router.push(`/contents?openModalId=${data[0].id}`); }", content)

# Remove the Suspense wrapper at the bottom if it exists
suspense_wrapper_pattern = r"export default function ProposalsSubmitPage\(\) \{[\s\S]*?\}"
content = re.sub(suspense_wrapper_pattern, "", content)

# If the container div has top margin/padding, reduce it when isModal
container_start = r"<div className=\"container\" style={{ paddingBottom: '4rem' }}>"
container_new = r"<div className={isModal ? '' : 'container'} style={{ paddingBottom: isModal ? '0' : '4rem', width: '100%' }}>"
content = content.replace(container_start, container_new)

card_start = r"<div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', padding: '3rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', position: 'relative' }}>"
card_new = r"<div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: isModal ? '0' : '16px', padding: isModal ? '1.5rem' : '3rem', boxShadow: isModal ? 'none' : '0 4px 20px rgba(0,0,0,0.05)', position: 'relative' }}>"
content = content.replace(card_start, card_new)

with open('src/components/ProposalSubmitForm.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("ProposalSubmitForm patched")
