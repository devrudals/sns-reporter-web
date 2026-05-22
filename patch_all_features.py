import re

filepath = 'src/components/ContentsLayout.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ---------------------------------------------------------
# Feature 1: openModalId and modalOnly logic
# ---------------------------------------------------------

# Add the useEffect for openModalId
if "openModalId, contents, initialContents" not in content:
    state_anchor = "const [isModalOpen, setIsModalOpen] = useState(false);"
    effect_code = """
  useEffect(() => {
    if (openModalId) {
      const target = contents.find(c => c.id === openModalId) || (initialContents && initialContents.find(c => c.id === openModalId));
      if (target) {
        setSelectedContent(target);
        setIsModalOpen(true);
      }
    }
  }, [openModalId, contents, initialContents]);
"""
    content = content.replace(state_anchor, state_anchor + "\n" + effect_code)

# Hide main layout if modalOnly
main_layout_anchor = "<div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 80px)', backgroundColor: '#f3f4f6', padding: '20px' }}>"
if main_layout_anchor in content:
    content = content.replace(main_layout_anchor, "<div style={modalOnly ? { display: 'none' } : { display: 'flex', gap: '20px', height: 'calc(100vh - 80px)', backgroundColor: '#f3f4f6', padding: '20px' }}>")

# Trigger onModalClose
close_btn_anchor = "onClick={() => setIsModalOpen(false)}"
content = content.replace(close_btn_anchor, "onClick={() => { setIsModalOpen(false); if (onModalClose) onModalClose(); }}")

# ---------------------------------------------------------
# Feature 2: Secret Comments
# ---------------------------------------------------------

# Add state
if "isSecretComment" not in content:
    state_anchor_2 = "const [isSavingComment, setIsSavingComment] = useState(false);"
    content = content.replace(state_anchor_2, state_anchor_2 + "\n  const [isSecretComment, setIsSecretComment] = useState(false);")

# Add canViewSecret
can_view_func = """
  const canViewSecret = (msg: any) => {
    if (!msg.isSecret) return true;
    const authorName = selectedContent?.author_name || '';
    
    // Parse crew
    const crewStr = (() => {
      try {
        return JSON.parse(selectedContent?.content_body || '{}').crew || '';
      } catch (e) { return ''; }
    })();

    const currentUserFullName = currentUserName || '';
    const isAdmin = currentUserEmail === 'admin';
    return isAdmin || (currentUserFullName && (authorName.includes(currentUserFullName) || crewStr.includes(currentUserFullName))) || (currentUserEmail && crewStr.includes(currentUserEmail));
  };
"""
submit_anchor = "const handleCommentSubmit = async () => {"
content = content.replace(submit_anchor, can_view_func + "\n  " + submit_anchor)

# Attach isSecret to payload
payload_anchor = "attachments: messageAttachment\n      }"
content = content.replace(payload_anchor, "attachments: messageAttachment,\n        isSecret: isSecretComment\n      }")

# Obscure secret comments in the map
# We only want to apply this to the comment text rendering.
# Find: dangerouslySetInnerHTML={{ __html: parseCommentMarkdown(msg.text) }}
content = content.replace("dangerouslySetInnerHTML={{ __html: parseCommentMarkdown(msg.text) }}", "dangerouslySetInnerHTML={{ __html: canViewSecret(msg) ? parseCommentMarkdown(msg.text) : '🔒 비밀댓글입니다.' }}")

# Hide attachments
content = content.replace("{(msg.attachments?.length > 0) && (", "{((canViewSecret(msg) ? msg.attachments : [])?.length > 0) && (")

# Add checkbox UI
checkbox_ui = """
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input type="checkbox" id="secretComment" checked={isSecretComment} onChange={e => setIsSecretComment(e.target.checked)} style={{ cursor: 'pointer' }} />
                                    <label htmlFor="secretComment" style={{ fontSize: '0.8rem', color: '#64748B', cursor: 'pointer', fontWeight: 600 }}>비밀댓글로 작성</label>
                                  </div>
"""
submit_btn_anchor = "<button onClick={handleCommentSubmit}"
content = content.replace(submit_btn_anchor, checkbox_ui + "\n" + submit_btn_anchor)

# ---------------------------------------------------------
# Feature 3: Inline Final Submit Form and Crew permissions
# ---------------------------------------------------------

if "import FinalSubmitForm" not in content:
    content = content.replace("import Link from 'next/link';", "import Link from 'next/link';\nimport FinalSubmitForm from '@/components/FinalSubmitForm';")

if "const [isEditingFinalWork" not in content:
    state_anchor_3 = "const [isSavingProposal, setIsSavingProposal] = useState(false);"
    content = content.replace(state_anchor_3, state_anchor_3 + "\n  const [isEditingFinalWork, setIsEditingFinalWork] = useState(false);")

# isEditable update
crew_logic = """
    const crewStr = (() => {
      try {
        return JSON.parse(selectedContent.content_body || '{}').crew || '';
      } catch (e) { return ''; }
    })();
    const isParticipant = crewStr.includes(currentUserName) || (currentUserEmail && crewStr.includes(currentUserEmail));
    const isEditable = isOwn || isAdministrator || isParticipant;
"""
content = re.sub(r"const isEditable = isOwn \|\| isAdministrator;\s*", crew_logic, content)

# Modify button to toggle editing mode
button_regex = r"<ModalLink href=\{`/final-works/submit\?id=\$\{selectedContent\.id\}`\}\s*style=\{\{(.*?)\}\}\s*>(.*?)</ModalLink>"
def btn_replacer(m):
    return f"<button onClick={{() => setIsEditingFinalWork(true)}} style={{{{{m.group(1)}, border: 'none', cursor: 'pointer'}}}}>{m.group(2)}</button>"
content = re.sub(button_regex, btn_replacer, content, flags=re.DOTALL)

# Insert the FinalSubmitForm
# We find:
# {isFinalWorkView ? (
#   /* 완성본 보기 모드 - 좌측 화면 */
#   <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>

view_anchor = r"(\{isFinalWorkView \? \(\s*/\*\s*완성본\s*보기\s*모드\s*-\s*좌측\s*화면\s*\*/\s*<div style=\{\{\s*display:\s*'flex',\s*flexDirection:\s*'column',\s*gap:\s*'24px',\s*animation:\s*'fadeIn 0\.3s ease-out'\s*\}\}>)"

replacement = r"\1"
# Wait, let's just insert it gracefully using string replace instead of complex regex.
target_str = """                        {isFinalWorkView ? (
                          /* 완성본 보기 모드 - 좌측 화면 */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>"""

new_str = """                        {isFinalWorkView ? (
                          isEditingFinalWork ? (
                            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                              <FinalSubmitForm 
                                embeddedId={selectedContent.id.toString()}
                                onCancel={() => setIsEditingFinalWork(false)}
                                onSuccess={() => window.location.reload()}
                              />
                            </div>
                          ) : (
                          /* 완성본 보기 모드 - 좌측 화면 */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>"""

content = content.replace(target_str, new_str)

# Now we need to add the closing parenthesis for the isEditingFinalWork ternary.
# We will find the end of the `isFinalWorkView` true block.
# The `isFinalWorkView` true block ends right before the `) : (` that leads to the 기획안 폼 모드.
target_close_str = """                            </div>
                          </div>

                        ) : (

                            /* 기획안 폼 모드 - 좌측 화면 */"""

new_close_str = """                            </div>
                          </div>
                          )
                        ) : (

                            /* 기획안 폼 모드 - 좌측 화면 */"""

content = content.replace(target_close_str, new_close_str)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch all successful!")
