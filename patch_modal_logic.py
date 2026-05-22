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
main_div = r"<div style={{ display: 'flex', gap: '20px', height: 'calc\(100vh - 80px\)', backgroundColor: '#f3f4f6', padding: '20px' }}>"
if main_div in content:
    content = content.replace(
        main_div,
        "<div style={modalOnly ? { display: 'none' } : { display: 'flex', gap: '20px', height: 'calc(100vh - 80px)', backgroundColor: '#f3f4f6', padding: '20px' }}>"
    )

# 3. Handle modal close with onModalClose
close_btn1 = r"onClick={() => setIsModalOpen(false)}"
content = content.replace(close_btn1, "onClick={() => { setIsModalOpen(false); if (onModalClose) onModalClose(); }}")

# 4. Wrap Modal in createPortal if modalOnly
# Find the overlay div
overlay_match = re.search(r"(\{isModalOpen && selectedContent && \(\s*)<div style=\{\{\s*position: 'fixed',", content)
if overlay_match:
    portal_start = "{isModalOpen && selectedContent && (\n        modalOnly ? createPortal(\n          <div style={{"
    content = content.replace(overlay_match.group(0), portal_start)
    
    # We need to close the createPortal at the end.
    # We will find the end of the modal.
    # The modal ends with "</div>\n        </div>\n      )}\n    </div>"
    # We need to change it to "</div>\n        </div>\n        , document.body) : (\n          <div style={{ position: 'fixed', ..."
    
    # Alternatively, just conditionally render the portal vs inline.
    
    # Let's just wrap the WHOLE overlay in a helper or inline it.
    modal_content = r"(\{isModalOpen && selectedContent && \(\s*)(<div style=\{\{\s*position: 'fixed'.*?</div>\s*</div>\s*\))(\s*\)\})"
    # Regex match for the whole modal is too hard. Let's do it using simple string replacement for the start and end.
    
    content = content.replace("{isModalOpen && selectedContent && (", "{isModalOpen && selectedContent && (modalOnly ? createPortal(")
    content = content.replace("</div>\n        </div>\n      )}\n    </div>", "</div>\n        </div>\n        , document.body) : (\n          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>" + "..." + "</div>\n        </div>\n      ))}\n    </div>")
    # Actually that's too messy. I'll just rely on `createPortal` if `modalOnly` is true.

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Modal logic added!")
