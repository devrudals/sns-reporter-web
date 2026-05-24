const fs = require('fs');

let code = fs.readFileSync('src/app/(authenticated)/layout.tsx', 'utf8');

// Replace ADMIN block
const adminBlockOld = `
          <div style={{ padding: '0 1.5rem 0.5rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginTop: '1.5rem', letterSpacing: '0.05em' }}>ADMIN</div>
          <Link href="/admin/users" className={getLinkClass('/admin/users')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            회원 명단 관리
          </Link>
          <Link href="/admin/settings" className={getLinkClass('/admin/settings')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            마감일 설정
          </Link>
`.trim();

const adminBlockNew = `          {isAdmin && (
            <>
              <div style={{ padding: '0 1.5rem 0.5rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginTop: '1.5rem', letterSpacing: '0.05em' }}>ADMIN</div>
              <Link href="/admin/users" className={getLinkClass('/admin/users')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                회원 명단 관리
              </Link>
              <Link href="/admin/settings" className={getLinkClass('/admin/settings')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                마감일 설정
              </Link>
            </>
          )}`;

const testModeBlockOld = `
        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>테스트 모드 전환</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link 
              href="/dashboard?admin=true"
              style={{ width: '100%', textAlign: 'center', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.75rem', fontWeight: 600, color: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              관리자 현황 뷰
            </Link>
            <Link 
              href="/dashboard"
              style={{ width: '100%', textAlign: 'center', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.75rem', fontWeight: 600, color: 'white' }}
            >
              일반 현황 뷰
            </Link>
          </div>
          </div>
`.trim();

const testModeBlockNew = `        {isAdmin && (
          <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>테스트 모드 전환</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link 
                href="/dashboard?admin=true"
                style={{ width: '100%', textAlign: 'center', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.75rem', fontWeight: 600, color: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                관리자 현황 뷰
              </Link>
              <Link 
                href="/dashboard"
                style={{ width: '100%', textAlign: 'center', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.75rem', fontWeight: 600, color: 'white' }}
              >
                일반 현황 뷰
              </Link>
            </div>
          </div>
        )}`;

code = code.replace(adminBlockOld, adminBlockNew);
code = code.replace(testModeBlockOld, testModeBlockNew);

fs.writeFileSync('src/app/(authenticated)/layout.tsx', code);
console.log('Admin patches reapplied');
