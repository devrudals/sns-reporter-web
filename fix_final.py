import re

filepath = 'src/components/ContentsLayout.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: contents -> contentsList in useEffect
content = content.replace("contents.find", "contentsList.find")
content = content.replace("[openModalId, contents, initialContents]", "[openModalId, contentsList, initialContents]")

# Fix 2: Add canViewSecret
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

if "canViewSecret =" not in content:
    # insert before `// Comments addition logic`
    anchor = "// Comments addition logic"
    if anchor in content:
        content = content.replace(anchor, can_view_func + "\n  " + anchor)

# Fix 3: add checkbox to `handleAddComment` area
checkbox_ui = """
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input type="checkbox" id="secretComment" checked={isSecretComment} onChange={e => setIsSecretComment(e.target.checked)} style={{ cursor: 'pointer' }} />
                                    <label htmlFor="secretComment" style={{ fontSize: '0.8rem', color: '#64748B', cursor: 'pointer', fontWeight: 600 }}>비밀댓글로 작성</label>
                                  </div>
"""
submit_btn_anchor = "<button onClick={handleAddComment}"
if checkbox_ui not in content and submit_btn_anchor in content:
    content = content.replace(submit_btn_anchor, checkbox_ui + "\n" + submit_btn_anchor)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed errors!")
