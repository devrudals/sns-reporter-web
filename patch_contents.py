import re

with open('src/components/ContentsLayout.tsx', 'r', encoding='utf-8') as f:
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

# 4. Replace <Link href={`/final-works/submit?id=...`}> with button and toggle logic
if "setIsEditingFinalWork(true)" not in content:
    link_regex = r"<Link href=\{`/final-works/submit\?id=\$\{selectedContent\.id\}`\}\s*style=\{\{(.*?)\}\}\s*>\s*🛠️ 완성본 수정 / 변경 화면으로 가기\s*</Link>"
    
    button_html = """<button onClick={() => setIsEditingFinalWork(true)} style={{ \\1, border: 'none', cursor: 'pointer' }}>
                                🛠️ 완성본 수정 / 변경 화면으로 가기
                              </button>"""
    
    content = re.sub(link_regex, button_html, content)

# 5. Render FinalSubmitForm inside the isFinalWorkView condition
if "<FinalSubmitForm" not in content:
    # We find the start of the final work view mode
    view_mode_anchor = r"{isFinalWorkView \? \(\s*/\*\s*완성본 뷰 모드 - 좌측 화면\s*\*/\s*<div style={{ animation: 'fadeIn 0\.3s ease-out', display: 'flex', flexDirection: 'column', gap: '20px' }}>"
    
    replacement = """{isFinalWorkView ? (
                          isEditingFinalWork ? (
                            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                              <FinalSubmitForm 
                                embeddedId={selectedContent.id.toString()}
                                onCancel={() => setIsEditingFinalWork(false)}
                                onSuccess={() => window.location.reload()}
                              />
                            </div>
                          ) : (
                          /* 완성본 뷰 모드 - 좌측 화면 */
                          <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '20px' }}>"""
                          
    content = re.sub(view_mode_anchor, replacement, content)
    
    # Now we need to add an extra closing parenthesis `)` at the end of the `isFinalWorkView` block?
    # No, we used `isEditingFinalWork ? ( ... ) : (` which means the existing `)` matches the newly opened `(` for the false branch!
    # Let's verify the existing structure:
    # {isFinalWorkView ? (
    #   <div ...> ... </div>
    # ) : (
    #   <div ...> ... </div>
    # )}
    # If we replace `{isFinalWorkView ? (` with `{isFinalWorkView ? ( isEditingFinalWork ? (...) : (`
    # Then the structure becomes:
    # {isFinalWorkView ? (
    #   isEditingFinalWork ? ( ... ) : (
    #     <div ...> ... </div>
    #   ) // WAIT, WE DID NOT ADD THIS CLOSING PARENTHESIS
    # ) : (
    #   <div ...> ... </div>
    # )}
    # Actually, we need to add a closing parenthesis for the false branch of `isEditingFinalWork`.
    # Let's find where the `isFinalWorkView` block ends. It ends at `) : (` for the Proposal Form mode.
    
    # We search for:
    #                           </div>
    #                         ) : (
    #                           /* 기획안 폼 모드 - 좌측 화면 */
    
    close_anchor = r"(\s*)</div>\s*\)\s*:\s*\(\s*/\*\s*기획안 폼 모드 - 좌측 화면\s*\*/"
    close_replacement = r"\1</div>\n\1  )\n\1) : (\n\1  /* 기획안 폼 모드 - 좌측 화면 */"
    content = re.sub(close_anchor, close_replacement, content)

with open('src/components/ContentsLayout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied")
