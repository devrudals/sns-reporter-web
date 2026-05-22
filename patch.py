import re

with open('src/components/ContentsLayout.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Imports
code = code.replace(
    "import RichTextEditor from '@/components/RichTextEditor';",
    "import RichTextEditor from '@/components/RichTextEditor';\nimport { createPortal } from 'react-dom';"
)

# 2. Props
old_props = r"export default function ContentsLayout\(\{\s*initialContents,\s*currentUserEmail,\s*currentUserName\s*\}\:\s*\{\s*initialContents\: ContentItem\[\],\s*currentUserEmail\: string \| null,\s*currentUserName\: string \| null\s*\}\) \{"
new_props = """export default function ContentsLayout({ 
  initialContents, 
  currentUserEmail, 
  currentUserName,
  openModalId,
  modalOnly = false,
  onModalClose
}: { 
  initialContents: ContentItem[], 
  currentUserEmail: string | null,
  currentUserName: string | null,
  openModalId?: number,
  modalOnly?: boolean,
  onModalClose?: () => void
}) {"""
code = re.sub(old_props, new_props, code)

# 3. Auto-open modal logic
old_sort = "const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);"
new_sort = """const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Auto-open modal if query param is present
  useEffect(() => {
    if (openModalId && initialContents.length > 0) {
      const target = initialContents.find(c => c.id === openModalId);
      if (target) {
        setSelectedContent(target);
        setIsModalOpen(true);
      }
    }
  }, [openModalId, initialContents]);"""
code = code.replace(old_sort, new_sort)

# 4. Secret comment state and logic
code = code.replace(
    "const [isSavingComment, setIsSavingComment] = useState(false);",
    "const [isSavingComment, setIsSavingComment] = useState(false);\n  const [isSecretComment, setIsSecretComment] = useState(false);"
)

old_toggle = r"\s*setIsSavingComment\(false\);\n\s*\}\n\s*\};\n\s*// Comments Like Toggle logic"
new_toggle = """
      setIsSavingComment(false);
    }
  };

  const canViewSecret = (msg: any) => {
    if (!msg.isSecret) return true;
    if (!currentUserEmail) return false;
    if (currentUserEmail === 'admin@ymc.com' || currentUserEmail.includes('admin')) return true;
    const myName = currentUserName || currentUserEmail.split('@')[0];
    if (msg.author === myName) return true;
    if (!selectedContent) return false;
    let emailInJson = '';
    try { emailInJson = JSON.parse(selectedContent.content_body || '{}').authorEmail; } catch (e) {}
    if (emailInJson === currentUserEmail || selectedContent.author_name === currentUserEmail || selectedContent.author_name.includes(myName)) return true;
    let crewStr = '';
    try { crewStr = JSON.parse(selectedContent.content_body || '{}').crew || ''; } catch (e) {}
    if (crewStr && crewStr.includes(myName)) return true;
    return false;
  };

  // Comments Like Toggle logic"""
code = re.sub(old_toggle, new_toggle, code)

code = re.sub(
    r"author:\s*displayName,\s*likes:\s*0,\s*likedBy:\s*\[\]\s*as\s*string\[\],\s*attachments:\s*messageAttachment",
    "author: displayName,\n        likes: 0,\n        likedBy: [] as string[],\n        attachments: messageAttachment,\n        isSecret: isSecretComment",
    code
)

# 5. Hide main layout if modalOnly
code = code.replace(
    "<div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 80px)', backgroundColor: '#f3f4f6', padding: '20px' }}>",
    "<div style={modalOnly ? { display: 'none' } : { display: 'flex', gap: '20px', height: 'calc(100vh - 80px)', backgroundColor: '#f3f4f6', padding: '20px' }}>"
)

# 6. Wrap Modal in createPortal
code = code.replace(
    "{/* 4. Fullscreen Split Popup Modal */}\n                {isModalOpen && (",
    '{/* 4. Fullscreen Split Popup Modal */}\n                {isModalOpen && typeof document !== "undefined" && createPortal('
)
code = code.replace(
    "{/* 4. Fullscreen Split Popup Modal */}\r\n                {isModalOpen && (",
    '{/* 4. Fullscreen Split Popup Modal */}\r\n                {isModalOpen && typeof document !== "undefined" && createPortal('
)

code = code.replace(
    "onClick={() => setIsModalOpen(false)}",
    "onClick={() => { setIsModalOpen(false); if (onModalClose) onModalClose(); }}"
)

# 7. Find the end of the modal to close createPortal
code = code.replace(
    """                          <span style={{ fontSize: '1.2rem' }}>←</span> 뒤로가기
                        </div>
                      </div>
                    </div>
                  </div>
                )}""",
    """                          <span style={{ fontSize: '1.2rem' }}>←</span> 뒤로가기
                        </div>
                      </div>
                    </div>
                  </div>
                , document.body)}"""
)

# 8. Add Secret Comment Checkbox and apply canViewSecret to masking
code = code.replace(
    "dangerouslySetInnerHTML={{ __html: parseCommentMarkdown(msg.text) }}",
    "dangerouslySetInnerHTML={{ __html: canViewSecret(msg) ? parseCommentMarkdown(msg.text) : '비밀댓글입니다. 🔒' }}"
)

code = code.replace(
    "{(msg.attachments ?? []).length > 0 && (",
    "{((canViewSecret(msg) ? msg.attachments : []) ?? []).length > 0 && ("
)

code = re.sub(
    r"fontWeight:\s*500\n\s*\}\}>",
    "fontWeight: 500,\n            opacity: (!canViewSecret(msg) && msg.isSecret) ? 0.6 : 1\n          }}>",
    code
)
code = re.sub(
    r"fontWeight:\s*500\r\n\s*\}\}>",
    "fontWeight: 500,\n            opacity: (!canViewSecret(msg) && msg.isSecret) ? 0.6 : 1\n          }}>",
    code
)

old_btn = r"<button\s+onClick=\{\(\) => handleAddComment\(null, '', false\)\}"
new_btn = """<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '6px' }}>
                                    <input type="checkbox" id="secretComment" checked={isSecretComment} onChange={e => setIsSecretComment(e.target.checked)} style={{ cursor: 'pointer' }} />
                                    <label htmlFor="secretComment" style={{ fontSize: '0.8rem', color: '#64748B', cursor: 'pointer', fontWeight: 600 }}>비밀댓글로 남기기</label>
                                  </div>
                                  <button 
                                    onClick={() => handleAddComment(null, '', false)}"""
code = re.sub(old_btn, new_btn, code)

old_close = r"\{isSavingComment \? \'\.\.\.\' \: \'의견 보내기\'\}\s*</button>\s*</div>\s*</div>\s*</div>\s*</div>"
new_close = """{isSavingComment ? '...' : '의견 보내기'}
                                </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>"""
code = re.sub(old_close, new_close, code)

with open('src/components/ContentsLayout.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patch applied successfully")
