import re

filepath = 'src/components/ContentsLayout.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add openModalId effect
if "openModalId, contents, initialContents" not in content:
    state_match = re.search(r"const \[isModalOpen, setIsModalOpen\] = useState\(false\);", content)
    if state_match:
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
        content = content[:state_match.end()] + effect_code + content[state_match.end():]

# 2. Hide main layout if modalOnly
main_div = r"<div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 80px)', backgroundColor: '#f3f4f6', padding: '20px' }}>"
if main_div in content:
    content = content.replace(
        main_div,
        "<div style={modalOnly ? { display: 'none' } : { display: 'flex', gap: '20px', height: 'calc(100vh - 80px)', backgroundColor: '#f3f4f6', padding: '20px' }}>"
    )

# 3. Handle modal close with onModalClose
close_btn1 = r"onClick={() => setIsModalOpen(false)}"
content = content.replace(close_btn1, "onClick={() => { setIsModalOpen(false); if (onModalClose) onModalClose(); }}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("modalOnly logic applied!")
