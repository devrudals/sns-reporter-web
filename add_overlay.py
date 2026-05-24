import re

path = 'src/components/ContentsLayout.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target = r"return \(\s*<div style=\{\{ display: 'flex', flexDirection: 'column', height: '100%' \}\}>\s*<div className=\"toolbar\""
replace = r"""return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {isFetchingModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(2px)' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      )}
      <div className="toolbar\""""

if "position: 'fixed', inset: 0, zIndex: 99999" not in code:
    code = re.sub(target, replace, code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Added overlay")
