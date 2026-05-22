import re

filepath = 'src/components/ContentsLayout.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
if "import FinalSubmitForm" not in content:
    content = content.replace("import Link from 'next/link';", "import Link from 'next/link';\nimport FinalSubmitForm from '@/components/FinalSubmitForm';")

# 2. Add state
if "const [isEditingFinalWork" not in content:
    state_anchor = "const [isSavingProposal, setIsSavingProposal] = useState(false);"
    content = content.replace(state_anchor, state_anchor + "\n  const [isEditingFinalWork, setIsEditingFinalWork] = useState(false);")

# 3. Update isEditable to include crew
if "const isEditable = isOwn || isAdministrator" in content and "crewStr.includes" not in content:
    crew_logic = """
    const crewStr = (() => {
      try {
        return JSON.parse(selectedContent.content_body || '{}').crew || '';
      } catch (e) { return ''; }
    })();
    const isParticipant = crewStr.includes(currentUserName) || (currentUserEmail && crewStr.includes(currentUserEmail));
    const isEditable = isOwn || isAdministrator || isParticipant;
"""
    content = re.sub(
        r"const isEditable = isOwn \|\| isAdministrator;\s*",
        crew_logic,
        content
    )

# 4. Replace <ModalLink href={`/final-works/submit?id=...`}> with button and toggle logic
if "setIsEditingFinalWork(true)" not in content:
    link_regex = r"<ModalLink href=\{`/final-works/submit\?id=\$\{selectedContent\.id\}`\}\s*style=\{\{(.*?)\}\}\s*>(.*?)</ModalLink>"
    
    # We replace it with a button
    def button_replacer(m):
        style = m.group(1)
        inner = m.group(2)
        return f"<button onClick={{() => setIsEditingFinalWork(true)}} style={{{{{style}, border: 'none', cursor: 'pointer'}}}}>{inner}</button>"

    content = re.sub(link_regex, button_replacer, content, flags=re.DOTALL)

# 5. Render FinalSubmitForm inside the isFinalWorkView condition
if "isEditingFinalWork ?" not in content:
    # Anchor: {isFinalWorkView ? (
    # We want to replace `{isFinalWorkView ? (`
    # With `{isFinalWorkView ? ( isEditingFinalWork ? (<FinalSubmitForm ... />) : (`
    
    # And we find the end of the `isFinalWorkView` true branch.
    # It usually ends right before `) : (` followed by `/* 기획안 작성 모드`
    
    view_mode_anchor = r"(\{isFinalWorkView \? \(\s*)(<div style=\{\{ animation: 'fadeIn 0\.3s ease-out', display: 'flex', flexDirection: 'column', gap: '20px' \}\}>)"
    
    replacement = r"\1isEditingFinalWork ? (\n                            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>\n                              <FinalSubmitForm \n                                embeddedId={selectedContent.id.toString()}\n                                onCancel={() => setIsEditingFinalWork(false)}\n                                onSuccess={() => window.location.reload()}\n                              />\n                            </div>\n                          ) : (\n                          \2"
                          
    content = re.sub(view_mode_anchor, replacement, content)
    
    # Now we need to add the closing parenthesis for `isEditingFinalWork ? ... : (...)`
    # We look for the exact line:
    #                           </div>
    #                         ) : (
    #                           /* 기획안 작성
    
    close_anchor = r"(\s*)</div>\s*\)\s*:\s*\(\s*/\*\s*기획안"
    close_replacement = r"\1</div>\n\1  )\n\1) : (\n\1  /* 기획안"
    content = re.sub(close_anchor, close_replacement, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch inline edit applied")
