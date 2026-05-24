export default function ResourcesPage() {
  const mockResources = [
    { id: 1, title: '연세대학교 공식 로고 (.ai, .png)', format: 'ZIP', size: '15.2 MB', date: '2026-03-01' },
    { id: 2, title: '26학년도 SNS기자단 인스타그램 카드뉴스 템플릿', format: 'PSD', size: '48.5 MB', date: '2026-03-02' },
    { id: 3, title: '자막 및 스크롤 프리셋 소스 (프리미어 프로)', format: 'PRPROJ', size: '2.1 MB', date: '2026-03-10' },
    { id: 4, title: '동의서 양식 (인터뷰 촬영 대상자용)', format: 'HWP', size: '14 KB', date: '2026-02-15' },
  ];

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'ZIP': return '#fbbf24';
      case 'PSD': return '#3b82f6';
      case 'PRPROJ': return '#8b5cf6';
      case 'HWP': return '#0ea5e9';
      default: return '#9ca3af';
    }
  };


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

        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>자료실</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>기자단 활동에 필요한 양식 및 소스 자료를 다운로드 하세요.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {mockResources.map((resource) => (
          <div key={resource.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'transform 0.2s', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ 
                backgroundColor: getFormatColor(resource.format), 
                color: 'white', 
                padding: '0.2rem 0.6rem', 
                borderRadius: '4px', 
                fontSize: '0.7rem', 
                fontWeight: 700,
                letterSpacing: '0.05em'
              }}>
                {resource.format}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{resource.date}</span>
            </div>
            
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.4, marginBottom: '0.5rem' }}>{resource.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>용량: {resource.size}</p>
            </div>
            
            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', textAlign: 'right' }}>
              <button style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                다운로드
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}
