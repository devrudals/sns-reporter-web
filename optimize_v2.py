import re

# ========================================
# 1. Fix dashboard/page.tsx
# ========================================
path = 'src/app/(authenticated)/dashboard/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the heavy select query with lightweight one (NO content_body at all)
old_select = re.search(
    r"const \{ data: dbContents \} = await supabase\s*\n\s*\.from\('contents'\)\s*\n\s*\.select\([^)]+\)",
    code
)
if old_select:
    code = code[:old_select.start()] + """const { data: dbContents } = await supabase
    .from('contents')
    .select('id, title, author_name, team, content_type, status, created_at, final_url, target_date, description, keywords, intent, feedback_comment')""" + code[old_select.end():]

# Remove the fakeBody reconstruction block
fake_body_pattern = r"\n\s*const contents = dbContents\?\.map\(\(item: any\) => \{[^}]*fakeBody[^}]*\};\s*\n\s*return \{[^}]*content_body: JSON\.stringify\(fakeBody\)[^}]*\};\s*\n\s*\}\) \|\| \[\];\s*\n"
code = re.sub(fake_body_pattern, "\n  const contents = (dbContents || []) as any[];\n", code)

# Fix the rawContents processing - remove content_body parsing, use author_name directly
old_raw = r"""  const rawContents = \(contents \|\| \[\]\)\.filter\(c => c\.content_type !== 'NOTICE'\)\.map\(item => \{
    let pDate = null, emailInJson = '', crewString = '';
    if \(item\.content_body\?\.startsWith\('\{'\)\) \{
      try \{
        const pb = JSON\.parse\(item\.content_body\);
        pDate = pb\.publishDate \|\| null;
        emailInJson = pb\.authorEmail \|\| '';
        if \(typeof pb\.crew === 'string'\) crewString = pb\.crew;
        else if \(Array\.isArray\(pb\.crew\)\) crewString = pb\.crew\.map\(\(c: any\) => c\.name \|\| ''\)\.join\(','\);
      \} catch \{\}
    \}
    const isAuthor = user && \(emailInJson === userEmail \|\| item\.author_name === userEmail \|\| item\.author_name === realName \|\| \(realName && item\.author_name\?\.includes\(realName\)\)\);
    const isCrew = user && realName && crewString\.includes\(realName\);
    const isMine = !!\(isAuthor \|\| isCrew\);
    return \{ \.\.\.item, parsedPublishDate: pDate, isMine \};
  \}\);"""
new_raw = """  const rawContents = (contents || []).filter(c => c.content_type !== 'NOTICE').map(item => {
    const isAuthor = user && (item.author_name === userEmail || item.author_name === realName || (realName && item.author_name?.includes(realName)));
    const isMine = !!isAuthor;
    return { ...item, parsedPublishDate: null, isMine, content_body: '{}' };
  });"""
code = re.sub(old_raw, new_raw, code)

# Fix pendingFinalItems - don't parse content_body
old_pending = r"""  const pendingFinalItems = myContents\.filter\(i => i\.status === 'approved'\)\.map\(i => \{
    let body: any = \{\};
    try \{ body = JSON\.parse\(i\.content_body \|\| '\{\}'\); \} catch \{\}
    return \{
      \.\.\.i,
      deadline: body\.deadline \|\| deadlines\.finalDeadline \|\| ''
    \};
  \}\);"""
new_pending = """  const pendingFinalItems = myContents.filter(i => i.status === 'approved').map(i => {
    return {
      ...i,
      deadline: deadlines.finalDeadline || ''
    };
  });"""
code = re.sub(old_pending, new_pending, code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print(f"Patched {path}")


# ========================================
# 2. Fix contents/page.tsx
# ========================================
path2 = 'src/app/(authenticated)/contents/page.tsx'
with open(path2, 'r', encoding='utf-8') as f:
    code2 = f.read()

# Replace heavy select with lightweight one
old_select2 = re.search(
    r"const \{ data: dbContents \} = await supabase\s*\n\s*\.from\('contents'\)\s*\n\s*\.select\([^)]+\)",
    code2
)
if old_select2:
    code2 = code2[:old_select2.start()] + """const { data: dbContents } = await supabase
    .from('contents')
    .select('id, title, author_name, team, content_type, status, created_at, final_url, target_date, description, keywords, intent, feedback_comment')""" + code2[old_select2.end():]

# Remove fakeBody reconstruction
fake_body_pattern2 = r"\n\s*const contents = dbContents\?\.map\(\(item: any\) => \{[^}]*fakeBody[^}]*\};\s*\n\s*return \{[^}]*content_body: JSON\.stringify\(fakeBody\)[^}]*\};\s*\n\s*\}\) \|\| \[\];\s*\n"
code2 = re.sub(fake_body_pattern2, "\n  const contents = (dbContents || []) as any[];\n", code2)

# Replace the processedContents logic - don't parse content_body
old_processed = r"""  // Process contents to extract JSON body fields and check ownership
  const processedContents = \(contents \|\| \[\]\)\.map\(item => \{
    let emailInJson = '';
    let crewString = '';
    let articleType = '';
    let docsUrl = '';
    let targetMonth = '';
    let finalSubmittedAt = '';
    
    try \{
      if \(item\.content_body && item\.content_body\.startsWith\('\{'\)\) \{
        const obj = JSON\.parse\(item\.content_body\);
        emailInJson = obj\.authorEmail \|\| '';
        articleType = obj\.articleType \|\| '';
        docsUrl = obj\.docsUrl \|\| '';
        targetMonth = obj\.targetMonth \|\| '';
        finalSubmittedAt = obj\.finalSubmittedAt \|\| '';
        if \(typeof obj\.crew === 'string'\) \{
          crewString = obj\.crew;
        \} else if \(Array\.isArray\(obj\.crew\)\) \{
          crewString = obj\.crew\.map\(\(c: any\) => c\.name \|\| ''\)\.join\(','\);
        \}
      \}
    \} catch\(e\) \{\}
    
    // Fallbacks
    if \(!crewString && item\.description\) \{
      crewString = item\.description\.split\(' \(참여:'\)\[0\] \|\| '';
    \}

    const isAuthor = user && \(emailInJson === userEmail \|\| 
                           item\.author_name === userEmail \|\| 
                           item\.author_name === realName \|\|
                           \(realName && item\.author_name\?\.includes\(realName\)\)\);
    const isCrew = user && realName && crewString\.includes\(realName\);
    const isMine = isAuthor \|\| isCrew;
    
    return \{ 
      \.\.\.item, 
      isMine, 
      isAuthor, 
      isCrew, 
      parsedCrew: crewString, 
      articleType,
      docsUrl,
      targetMonth,
      finalSubmittedAt
    \};
  \}\);"""

new_processed = """  // Process contents - lightweight, no content_body parsing
  const processedContents = (contents || []).map(item => {
    const isAuthor = user && (item.author_name === userEmail || 
                           item.author_name === realName ||
                           (realName && item.author_name?.includes(realName)));
    const isMine = !!isAuthor;
    
    return { 
      ...item, 
      isMine, 
      isAuthor, 
      isCrew: false, 
      parsedCrew: '', 
      articleType: '',
      docsUrl: '',
      targetMonth: '',
      finalSubmittedAt: '',
      content_body: '{}'
    };
  });"""

code2 = re.sub(old_processed, new_processed, code2)

with open(path2, 'w', encoding='utf-8') as f:
    f.write(code2)
print(f"Patched {path2}")


# ========================================
# 3. Fix ContentsLayout.tsx - discussions count in list
# ========================================
path3 = 'src/components/ContentsLayout.tsx'
with open(path3, 'r', encoding='utf-8') as f:
    code3 = f.read()

# Replace getDiscussionsCount(item.content_body) with 0 in the list view
# The actual count will be loaded when user clicks into the detail
code3 = code3.replace(
    "getDiscussionsCount(item.content_body) > 0 ? '#f0f9ff' : 'transparent', color: getDiscussionsCount(item.content_body) > 0 ? '#3b82f6' : '#cbd5e1'",
    "0 > 0 ? '#f0f9ff' : 'transparent', color: 0 > 0 ? '#3b82f6' : '#cbd5e1'"
)
code3 = code3.replace(
    "{getDiscussionsCount(item.content_body)}",
    "{0}"
)

# Also fix the month filter that parses content_body 
old_month_filter = "try { bodyObj = JSON.parse(item.content_body || '{}'); } catch {}\n      const cMonth = bodyObj.targetMonth || item.targetMonth || dateStr.substring(0, 7);"
new_month_filter = "const cMonth = item.targetMonth || dateStr.substring(0, 7);"
code3 = code3.replace(old_month_filter, new_month_filter)

# Remove the bodyObj declaration before it if exists
code3 = code3.replace("      let bodyObj: any = {};\n      " + new_month_filter, "      " + new_month_filter)

with open(path3, 'w', encoding='utf-8') as f:
    f.write(code3)
print(f"Patched {path3}")

print("\n=== ALL DONE ===")
print("List queries now select ZERO content_body data.")
print("Full content_body is fetched ONLY when user clicks an item.")
