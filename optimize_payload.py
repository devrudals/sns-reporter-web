import re

def patch_page(filepath, days):
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    # 1. Replace the select query
    target_select = r"\.select\('\*'\)"
    
    # We select all columns from the table, and extract needed JSON keys
    new_select = r".select('id, title, author_name, team, content_type, status, created_at, final_url, target_date, description, keywords, intent, discussions:content_body->discussions, publishDate:content_body->publishDate, authorEmail:content_body->authorEmail, crew:content_body->crew, targetMonth:content_body->targetMonth, deadline:content_body->deadline, timeliness:content_body->timeliness')"
    
    code = re.sub(target_select, new_select, code)
    
    # 2. Reconstruct the array
    # In dashboard: `const { data: contents } = await supabase...` -> rename to `rawContents`
    # In contents: `const { data: contents } = await supabase...`
    
    target_fetch = r"const \{\s*data:\s*contents\s*\} = await supabase"
    replace_fetch = r"const { data: rawContents } = await supabase"
    
    code = re.sub(target_fetch, replace_fetch, code)
    
    reconstruct_logic = """
  const contents = rawContents?.map((item: any) => {
    const fakeBody = {
      discussions: item.discussions || [],
      publishDate: item.publishDate,
      authorEmail: item.authorEmail,
      crew: item.crew,
      targetMonth: item.targetMonth,
      deadline: item.deadline,
      timeliness: item.timeliness
    };
    return {
      ...item,
      content_body: JSON.stringify(fakeBody)
    };
  }) || [];
"""
    
    # Insert after the query chain ends with `.order('created_at', { ascending: false });`
    if "const contents = rawContents?.map" not in code:
        target_end = r"(\.order\('created_at',\s*\{\s*ascending:\s*false\s*\}\);)"
        code = re.sub(target_end, r"\1\n" + reconstruct_logic, code)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(code)
    print(f"Patched {filepath}")

patch_page('src/app/(authenticated)/dashboard/page.tsx', 90)
patch_page('src/app/(authenticated)/contents/page.tsx', 180)

# 3. Patch ContentsLayout.tsx to always fetch full item on click and openModalId
layout_path = 'src/components/ContentsLayout.tsx'
with open(layout_path, 'r', encoding='utf-8') as f:
    layout = f.read()

# Fix openModalId to ALWAYS fetch from DB
target_effect = r"""  useEffect\(\(\) => \{
    if \(!openModalId\) return;
    // Search in the latest list snapshot
    const target =
      contentsListRef\.current\.find\(c => c\.id === openModalId\) \|\|
      \(initialContents \?\? \[\]\)\.find\(c => c\.id === openModalId\);
    if \(target\) \{
      setSelectedContent\(target\);
      setIsModalOpen\(true\);
    \} else \{
      const fetchItem = async \(\) => \{
        const \{ data \} = await supabase\.from\('contents'\)\.select\('\*'\)\.eq\('id', openModalId\)\.single\(\);
        if \(data\) \{
          setSelectedContent\(data\);
          setIsModalOpen\(true\);
        \}
      \};
      fetchItem\(\);
    \}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  \}, \[openModalId\]\); // only re-run when the requested ID changes"""

replace_effect = """  const [isFetchingModal, setIsFetchingModal] = useState(false);
  useEffect(() => {
    if (!openModalId) return;
    const fetchItem = async () => {
      setIsFetchingModal(true);
      const { data } = await supabase.from('contents').select('*').eq('id', openModalId).single();
      if (data) {
        setSelectedContent(data);
        setIsModalOpen(true);
      }
      setIsFetchingModal(false);
    };
    fetchItem();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openModalId]);"""

if "setIsFetchingModal" not in layout:
    layout = re.sub(target_effect, replace_effect, layout)

# Fix onClick handlers to fetch full item
# We look for onClick={() => setSelectedContent(item)} and similar
target_onclick1 = r"onClick=\{\(\) => setSelectedContent\(item\)\}"
replace_onclick1 = r"""onClick={async () => {
                            setIsFetchingModal(true);
                            const { data } = await supabase.from('contents').select('*').eq('id', item.id).single();
                            setSelectedContent(data || item);
                            setIsFetchingModal(false);
                            setIsModalOpen(true);
                          }}"""
layout = re.sub(target_onclick1, replace_onclick1, layout)

target_onclick2 = r"onClick=\{\(\) => \{\s*setSelectedContent\(item\);\s*setIsModalOpen\(true\);\s*\}\}"
replace_onclick2 = r"""onClick={async () => {
                                  setIsFetchingModal(true);
                                  const { data } = await supabase.from('contents').select('*').eq('id', item.id).single();
                                  setSelectedContent(data || item);
                                  setIsFetchingModal(false);
                                  setIsModalOpen(true);
                                }}"""
layout = re.sub(target_onclick2, replace_onclick2, layout)

with open(layout_path, 'w', encoding='utf-8') as f:
    f.write(layout)
print(f"Patched {layout_path}")
