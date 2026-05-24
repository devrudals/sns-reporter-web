const fs = require('fs');

let code = fs.readFileSync('src/app/(authenticated)/resources/page.tsx', 'utf8');

// Replace the return with a wrapped relative container and an overlay
const replacement = `
  return (
    <div style={{ position: 'relative' }}>
      {/* 불투명한 자물쇠 오버레이 */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '16px'
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '2rem', 
          borderRadius: '50%', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>자료실 준비 중</h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>아직 자료실 기능을 사용할 수 없습니다.</p>
      </div>

      <div className="flex-col gap-4" style={{ filter: 'blur(2px)', pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
`;

code = code.replace(
  '  return (\n    <div className="flex-col gap-4">\n      <div style={{ display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\', marginBottom: \'2rem\' }}>',
  replacement
);

code = code.replace(
  '    </div>\n  );\n}',
  '    </div>\n    </div>\n  );\n}'
);

fs.writeFileSync('src/app/(authenticated)/resources/page.tsx', code);
console.log('resources page patched');
