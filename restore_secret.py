import re

filepath = 'src/components/ContentsLayout.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add isSecretComment state
state_match = re.search(r"const \[isSavingComment, setIsSavingComment\] = useState\(false\);", content)
if state_match:
    content = content[:state_match.end()] + "\n  const [isSecretComment, setIsSecretComment] = useState(false);" + content[state_match.end():]

# 2. Add canViewSecret function
can_view_func = """
  const canViewSecret = (msg: any) => {
    if (!msg.isSecret) return true;
    const authorName = selectedContent?.author_name || '';
    const crewString = selectedContent?.content_body?.crew || '';
    const currentUserFullName = currentUserName || '';
    const isAdmin = currentUserEmail === 'admin';
    return isAdmin || (currentUserFullName && (authorName.includes(currentUserFullName) || crewString.includes(currentUserFullName)));
  };
"""
# insert before handleCommentSubmit
submit_match = re.search(r"const handleCommentSubmit = async \(\) => \{", content)
if submit_match:
    content = content[:submit_match.start()] + can_view_func + content[submit_match.start():]

# 3. Add isSecret: isSecretComment to new comment object
comment_obj_match = re.search(r"attachments: messageAttachment(,?)\n\s*\}", content)
if comment_obj_match:
    content = content[:comment_obj_match.end() - 1] + ",\n        isSecret: isSecretComment\n      }" + content[comment_obj_match.end():]

# 4. Modify comment rendering to obscure secret comments
# Find dangerouslySetInnerHTML={{ __html: parseCommentMarkdown(msg.text) }}
content = content.replace(
    "dangerouslySetInnerHTML={{ __html: parseCommentMarkdown(msg.text) }}",
    "dangerouslySetInnerHTML={{ __html: canViewSecret(msg) ? parseCommentMarkdown(msg.text) : '🔒 비밀댓글입니다.' }}"
)

# Hide attachments for secret comments
content = content.replace(
    "{(msg.attachments?.length > 0) && (",
    "{((canViewSecret(msg) ? msg.attachments : [])?.length > 0) && ("
)

# Apply opacity to secret comments
content = content.replace(
    "backgroundColor: '#ffffff',",
    "backgroundColor: '#ffffff',\n            opacity: (!canViewSecret(msg) && msg.isSecret) ? 0.6 : 1,"
)
content = content.replace(
    "backgroundColor: '#EFF6FF',",
    "backgroundColor: '#EFF6FF',\n            opacity: (!canViewSecret(msg) && msg.isSecret) ? 0.6 : 1,"
)

# 5. Add Secret Checkbox
checkbox_ui = """
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input type="checkbox" id="secretComment" checked={isSecretComment} onChange={e => setIsSecretComment(e.target.checked)} style={{ cursor: 'pointer' }} />
                                    <label htmlFor="secretComment" style={{ fontSize: '0.8rem', color: '#64748B', cursor: 'pointer', fontWeight: 600 }}>비밀댓글로 작성</label>
                                  </div>
"""
# Find button onClick={handleCommentSubmit}
btn_match = re.search(r"<button onClick=\{handleCommentSubmit\}", content)
if btn_match:
    content = content[:btn_match.start()] + checkbox_ui + content[btn_match.start():]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Secret comment logic restored!")
