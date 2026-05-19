'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

type ContentItem = {
  id: number;
  title: string;
  author_name: string;
  team: string;
  content_type: string;
  status: string;
  created_at: string;
  final_url?: string;
  isMine: boolean;
  parsedCrew: string;
  articleType: string;
  docsUrl: string;
  targetMonth: string;
  finalSubmittedAt: string;
  content_body: string;
};

export default function ContentsLayout({ 
  initialContents, 
  currentUserEmail, 
  currentUserName 
}: { 
  initialContents: ContentItem[], 
  currentUserEmail: string | null,
  currentUserName: string | null
}) {
  const [filterType, setFilterType] = useState('ALL');
  const [filterByMine, setFilterByMine] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  
  // 'preview', 'proposal', 'feedback'
  const [expandedSection, setExpandedSection] = useState<'preview' | 'proposal' | 'feedback'>('preview');

  const displayContents = useMemo(() => {
    let filtered = initialContents;
    if (filterByMine) {
      filtered = filtered.filter(item => item.isMine);
    }
    if (filterType !== 'ALL') {
      filtered = filtered.filter(item => item.content_type === filterType || item.team === filterType);
    }
    return filtered;
  }, [initialContents, filterByMine, filterType]);

  const groupedContents = useMemo(() => {
     const groups: Record<string, ContentItem[]> = {};
     displayContents.forEach(item => {
        let monthStr = item.targetMonth;
        if (!monthStr) {
          const d = new Date(item.created_at);
          monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        const [y, m] = monthStr.split('-');
        const groupKey = `${y.slice(2)}-${parseInt(m, 10)}`;
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(item);
     });
     // Sort keys descending (e.g. 26-1 -> 25-12 -> 25-11)
     const sortedKeys = Object.keys(groups).sort((a, b) => {
         const [yA, mA] = a.split('-').map(Number);
         const [yB, mB] = b.split('-').map(Number);
         if (yA !== yB) return yB - yA;
         return mB - mA;
     });
     return { groups, sortedKeys };
  }, [displayContents]);

  const getTypeStyle = (typeStr: string) => {
    switch(typeStr) {
      case '영상(롱폼)': return { bg: '#1e3a8a', text: '#ffffff', label: '롱폼' };
      case '영상(숏폼)': return { bg: '#2563eb', text: '#ffffff', label: '숏폼' };
      case '카드뉴스': return { bg: '#0284c7', text: '#ffffff', label: '카드뉴스' };
      case '글 기사': 
      case '기사': return { bg: '#16a34a', text: '#ffffff', label: '기사' };
      default: return { bg: '#64748b', text: '#ffffff', label: typeStr || '기타' };
    }
  };

  const getTeamPlatformIcon = (team: string) => {
    if (team === '유튜브') {
      return (
        <div style={{ width: '24px', height: '24px', backgroundColor: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg fill="#ffffff" viewBox="0 0 24 24" width="12" height="12">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </div>
      );
    }
    if (team === '인스타') {
      return (
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
        </div>
      );
    }
    if (team === '블로그') {
      return (
        <div style={{ width: '24px', height: '24px', backgroundColor: '#03c75a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', fontFamily: 'serif', marginTop: '-2px' }}>b</span>
        </div>
      );
    }
    return <div style={{ width: '24px', height: '24px', backgroundColor: '#94a3b8', borderRadius: '50%' }}></div>;
  };

  const getProgressState = (status: string) => {
    if (status === 'uploaded') return ['green', 'green', 'green'];
    if (status === 'completed') return ['green', 'green', 'white']; 
    if (status === 'final_revision') return ['green', 'yellow', 'white'];
    if (['final_submitted', 'approved'].includes(status)) return ['green', 'white', 'white'];
    if (status === 'revision') return ['yellow', 'white', 'white'];
    return ['white', 'white', 'white']; 
  };

  const ProgressCircles = ({ status }: { status: string }) => {
    const states = getProgressState(status);
    
    return (
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
        {states.map((s, i) => (
          <div key={i} style={{
            width: '18px', height: '18px',
            borderRadius: '50%',
            backgroundColor: s === 'green' ? '#059669' : s === 'yellow' ? '#fbbf24' : '#ffffff',
            border: s === 'white' ? '1px solid #cbd5e1' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
          }}>
            {s === 'yellow' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="5" y1="12" x2="19" y2="12"></line></svg>}
          </div>
        ))}
      </div>
    );
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    const yy = d.getFullYear().toString().slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}/${mm}/${dd}`;
  };

  const hasDiscussions = (bodyStr: string) => {
    try {
      const obj = JSON.parse(bodyStr);
      return obj.discussions && obj.discussions.length > 0;
    } catch(e) { return false; }
  };

  const getYoutubeVideoId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getGoogleDriveInfo = (url: string) => {
    if (!url) return null;
    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return { id: folderMatch[1], type: 'folder' };
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return { id: fileMatch[1], type: 'file' };
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return { id: idMatch[1], type: url.includes('folderview') ? 'folder' : 'file' };
    return null;
  };

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 80px)', backgroundColor: '#f3f4f6', padding: '20px' }}>
      
      {/* Left Pane - List */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>콘텐츠 목록</h2>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', backgroundColor: '#f8fafc', fontWeight: 600, color: '#334155' }}
            >
              <option value="ALL">ALL</option>
              <option value="유튜브">유튜브</option>
              <option value="인스타">인스타</option>
              <option value="블로그">블로그</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#1e3a8a', cursor: 'pointer' }}>
              <input type="checkbox" checked={filterByMine} onChange={(e) => setFilterByMine(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#1e3a8a' }}/>
              내 콘텐츠만 보기
            </label>
          </div>
          <Link href="/proposals/submit" style={{ backgroundColor: '#1e3a8a', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            + 새 기획안 작성
          </Link>
        </div>

        {/* List Header Row */}
        <div style={{ display: 'flex', padding: '12px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', gap: '10px' }}>
          <div style={{ width: '24px' }}></div>
          <div style={{ width: '40px', textAlign: 'center' }}>채널</div>
          <div style={{ width: '60px', textAlign: 'center' }}>유형</div>
          <div style={{ flex: '2' }}>제목</div>
          <div style={{ flex: '1' }}>참여인원</div>
          <div style={{ width: '60px', textAlign: 'center' }}>기사</div>
          <div style={{ width: '80px', textAlign: 'center' }}>작성일</div>
          <div style={{ width: '60px', textAlign: 'center' }}>피드백</div>
          <div style={{ width: '80px', textAlign: 'center' }}>진척도</div>
        </div>

        {/* List Body */}
        <div style={{ flex: '1', overflowY: 'auto', backgroundColor: '#ffffff' }}>
          {displayContents.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>해당하는 콘텐츠가 없습니다.</div>
          ) : (
            <div style={{ padding: '0 24px 24px 24px' }}>
              {groupedContents.sortedKeys.map(groupKey => (
                <div key={groupKey} style={{ marginTop: '20px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa', marginBottom: '8px', paddingLeft: '8px' }}>
                    {groupKey}
                  </div>
                  <div style={{ borderTop: '2px solid #e0e7ff', paddingTop: '8px' }}>
                    {groupedContents.groups[groupKey].map(item => {
                      const typeStyle = getTypeStyle(item.content_type);
                      const isSelected = selectedContent?.id === item.id;
                      
                      return (
                        <div 
                          key={item.id} 
                          onClick={() => setSelectedContent(item)}
                          style={{ 
                            display: 'flex', padding: '12px 8px', borderBottom: '1px solid #f1f5f9', gap: '10px', 
                            alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s',
                            backgroundColor: isSelected ? '#f0f9ff' : 'transparent',
                            borderRadius: '8px'
                          }}
                          onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#f8fafc')}
                          onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <div style={{ width: '24px', display: 'flex', alignItems: 'center' }}>
                            <input type="checkbox" onClick={(e) => e.stopPropagation()} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#1e3a8a' }} />
                          </div>
                          <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                            {getTeamPlatformIcon(item.team)}
                          </div>
                          <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                            <span style={{ backgroundColor: typeStyle.bg, color: typeStyle.text, padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {typeStyle.label}
                            </span>
                          </div>
                          <div style={{ flex: '2', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem' }}>
                            {item.title}
                          </div>
                          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.articleType === '개인기사' ? item.parsedCrew || item.author_name : item.team}
                            </span>
                            {item.articleType !== '개인기사' && (
                              <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.parsedCrew || item.author_name}
                              </span>
                            )}
                          </div>
                          <div style={{ width: '60px', textAlign: 'center', fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
                            {item.articleType || '개인기사'}
                          </div>
                          <div style={{ width: '80px', textAlign: 'center', fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
                            {formatDate(item.created_at)}
                          </div>
                          <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: '32px', height: '24px', border: '1px solid #cbd5e1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: hasDiscussions(item.content_body) ? '#f0f9ff' : 'transparent', color: hasDiscussions(item.content_body) ? '#3b82f6' : '#cbd5e1' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                              </svg>
                            </div>
                          </div>
                          <div style={{ width: '80px', display: 'flex', justifyContent: 'center' }}>
                            <ProgressCircles status={item.status} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane - Accordions */}
      <div style={{ width: '420px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {!selectedContent ? (
          <div style={{ flex: '1', backgroundColor: '#ffffff', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '20px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.5 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
            리스트에서 콘텐츠를 선택하면<br/>상세 내용이 표시됩니다.
          </div>
        ) : (() => {
            let bodyObj: any = {};
            try { bodyObj = JSON.parse(selectedContent.content_body); } catch(e) {}
            const discussions = bodyObj.discussions || [];
            
            const ytId = selectedContent.final_url ? getYoutubeVideoId(selectedContent.final_url) : null;
            const gdInfo = selectedContent.final_url ? getGoogleDriveInfo(selectedContent.final_url) : null;

            return (
              <>
                {/* 1. Preview Panel */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', overflow: 'hidden', transition: 'all 0.3s' }}>
                  <div 
                    onClick={() => setExpandedSection(expandedSection === 'preview' ? 'preview' : 'preview')} 
                    style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>완성본 미리보기</h3>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ transform: expandedSection === 'preview' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                  
                  {expandedSection === 'preview' && (
                    <div style={{ padding: '0 20px 20px 20px' }}>
                      <div style={{ width: '100%', height: '200px', backgroundColor: '#e2e8f0', borderRadius: '12px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {ytId ? (
                             <iframe src={`https://www.youtube.com/embed/${ytId}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} frameBorder="0" allowFullScreen />
                         ) : gdInfo ? (
                             <iframe src={gdInfo.type === 'folder' ? `https://drive.google.com/embeddedfolderview?id=${gdInfo.id}#list` : `https://drive.google.com/file/d/${gdInfo.id}/preview`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} frameBorder="0" allowFullScreen />
                         ) : (
                             <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #4285F4 25%, #34A853 25%, #34A853 50%, #FBBC05 50%, #FBBC05 75%, #EA4335 75%)', opacity: 0.9 }}>
                                 <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                     <button type="button" style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#475569', border: 'none', padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Open Drive <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                     </button>
                                 </div>
                             </div>
                         )}
                      </div>
                      <div style={{ marginTop: '16px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{selectedContent.title}</h4>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, marginBottom: '8px' }}>
                          {selectedContent.author_name} / {selectedContent.team} / {selectedContent.content_type}
                        </div>
                        {selectedContent.final_url && (
                          <a href={selectedContent.final_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: '#10b981', textDecoration: 'none', wordBreak: 'break-all', fontWeight: 500 }}>
                            {selectedContent.final_url}
                          </a>
                        )}
                      </div>
                      <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                        <Link href={`/final-works/submit?id=${selectedContent.id}`} style={{ flex: 1, textAlign: 'center', backgroundColor: '#1e3a8a', color: 'white', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>
                          완성본 수정/보기
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Proposal Panel */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', overflow: 'hidden', transition: 'all 0.3s' }}>
                  <div 
                    onClick={() => setExpandedSection(expandedSection === 'proposal' ? 'preview' : 'proposal')} 
                    style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      기획안
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Link href={`/proposals/submit?id=${selectedContent.id}`} onClick={e => e.stopPropagation()} style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path></svg>
                        외부에서 불러오기
                      </Link>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ transform: expandedSection === 'proposal' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                  
                  {expandedSection === 'proposal' && (
                    <div style={{ padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#64748b', marginTop: '-10px' }}>
                        작성자: {selectedContent.author_name} / {formatDate(selectedContent.created_at)}
                      </div>
                      
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px', display: 'block' }}>제목 (가제)</label>
                        <div style={{ backgroundColor: '#f3f4f6', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', color: '#334155' }}>
                          {selectedContent.title}
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px', display: 'block' }}>콘텐츠 분류</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ flex: 1, backgroundColor: '#f3f4f6', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', color: '#334155', textAlign: 'center' }}>{selectedContent.team}</div>
                          <div style={{ flex: 1, backgroundColor: '#f3f4f6', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', color: '#334155', textAlign: 'center' }}>{bodyObj.targetMonth || '미정'}</div>
                          <div style={{ flex: 1, backgroundColor: '#f3f4f6', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', color: '#334155', textAlign: 'center' }}>{selectedContent.articleType || '개인기사'}</div>
                          <div style={{ flex: 1, backgroundColor: '#f3f4f6', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', color: '#334155', textAlign: 'center' }}>{selectedContent.content_type}</div>
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px', display: 'block' }}>참여인원 (크루)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>
                              {selectedContent.author_name[0] || '익'}
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#475569', marginTop: '4px' }}>{selectedContent.author_name}</span>
                          </div>
                          {(selectedContent.parsedCrew || '').split(',').map((c, i) => c.trim() && (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>
                                {c.trim()[0] || '크'}
                              </div>
                              <span style={{ fontSize: '0.7rem', color: '#475569', marginTop: '4px' }}>{c.trim()}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px', display: 'block' }}>기획의도</label>
                        <div style={{ backgroundColor: '#f3f4f6', padding: '14px', borderRadius: '8px', minHeight: '80px', fontSize: '0.85rem', color: '#334155' }}>
                          {bodyObj.intent ? (
                            <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: bodyObj.intent }} />
                          ) : '내용이 없습니다.'}
                        </div>
                      </div>
                      
                      <div style={{ marginTop: '4px' }}>
                        <Link href={`/proposals/submit?id=${selectedContent.id}`} style={{ display: 'block', textAlign: 'center', backgroundColor: '#f1f5f9', color: '#1e3a8a', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', border: '1px solid #cbd5e1' }}>
                          기획안 전체 내용 보기
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Feedback Panel */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', overflow: 'hidden', transition: 'all 0.3s', flex: expandedSection === 'feedback' ? '1' : 'none', display: 'flex', flexDirection: 'column' }}>
                  <div 
                    onClick={() => setExpandedSection(expandedSection === 'feedback' ? 'preview' : 'feedback')} 
                    style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      기획안 피드백 <span style={{ color: '#3b82f6' }}>{discussions.length}</span>
                      <span style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 500 }}>/ 완성본 0</span>
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                    </div>
                  </div>
                  
                  {expandedSection === 'feedback' && (
                    <div style={{ padding: '0 20px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                        {discussions.length === 0 ? (
                           <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', marginTop: '20px' }}>피드백이 없습니다.</div>
                        ) : (
                           discussions.map((msg: any, i: number) => (
                             <div key={i} style={{ display: 'flex', gap: '12px' }}>
                               <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: msg.role === 'admin' ? '#f43f5e' : '#1e3a8a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>
                                 {msg.author?.[0] || '익'}
                               </div>
                               <div>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                   <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{msg.author}</span>
                                   <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                     {new Date(msg.createdAt).toLocaleDateString('ko-KR')}
                                   </span>
                                 </div>
                                 <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                                   {msg.text}
                                 </div>
                               </div>
                             </div>
                           ))
                        )}
                      </div>
                      <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
                        <input 
                          type="text" 
                          placeholder="댓글을 입력하세요 (기획안 수정 페이지에서 작성 가능)" 
                          disabled
                          style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.85rem', backgroundColor: 'transparent' }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
        })()}
      </div>
    </div>
  );
}
