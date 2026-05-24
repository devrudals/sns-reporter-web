const fs = require('fs');

const filePath = 'src/components/ContentsLayout.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes('import AdminStatusManager')) {
  content = content.replace(
    "import ModalLink from '@/components/ModalLink';",
    "import ModalLink from '@/components/ModalLink';\nimport AdminStatusManager from '@/components/AdminStatusManager';"
  );
}

// 2. Add AdminStatusManager in the Right Panel
const targetHtml = `{/* Modal Right Panel: 피드백 & 완성본 스트림 (독립 카드 스택 형태) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                        {/* 1. "완성본 보기" Card */}`;

const replacementHtml = `{/* Modal Right Panel: 피드백 & 완성본 스트림 (독립 카드 스택 형태) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                        
                        {/* ==== ADMIN STATUS MANAGER ==== */}
                        {isAdministrator && selectedContent && (
                          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.12)', border: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
                             <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E40AF', marginBottom: '12px' }}>👑 관리자 전용 상태 설정</div>
                             <AdminStatusManager item={selectedContent} />
                          </div>
                        )}
                        {/* =============================== */}

                        {/* 1. "완성본 보기" Card */}`;

if (!content.includes('👑 관리자 전용 상태 설정')) {
  content = content.replace(targetHtml, replacementHtml);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patch applied successfully.');
