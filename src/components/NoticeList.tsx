'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface NoticeItem {
  id: string;
  title: string;
  date: string;
  category: string;
  isImportant: boolean;
}

const DEFAULT_NOTICES: NoticeItem[] = [
  {
    id: 'notice-1',
    title: '[필독] 기획안 작성 시 주의사항',
    date: '2026-05-20',
    category: '미디어센터',
    isImportant: true
  },
  {
    id: 'notice-2',
    title: '캠퍼스 내 드론 촬영 관련 제한구역 안내',
    date: '2026-05-18',
    category: '미디어센터',
    isImportant: false
  },
  {
    id: 'notice-3',
    title: '상반기 우수 기자단 시상식 일정',
    date: '2026-05-12',
    category: '단장단',
    isImportant: false
  },
  {
    id: 'notice-4',
    title: '(신입부원 필독) 교내 주요 행사 프레스증 발급 신청 안내',
    date: '2026-05-08',
    category: '단장단',
    isImportant: false
  }
];

export default function NoticeList({ dbNotices = [] }: { dbNotices?: any[] }) {
  const [readIds, setReadIds] = useState<string[]>([]);

  // Load read notice IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('read_notices');
      if (stored) {
        setReadIds(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load read notices', e);
    }
  }, []);

  const markAsRead = (id: string) => {
    if (readIds.includes(id)) return;
    const newRead = [...readIds, id];
    setReadIds(newRead);
    try {
      localStorage.setItem('read_notices', JSON.stringify(newRead));
    } catch (e) {
      console.error('Failed to save read notice', e);
    }
  };

  // Merge database notices if any exist, otherwise use defaults
  const notices: NoticeItem[] = dbNotices.length > 0
    ? dbNotices.map((n, idx) => ({
        id: n.id || `db-${idx}`,
        title: n.title,
        date: n.created_at ? n.created_at.split('T')[0] : '2026-05-20',
        category: n.category || '공지사항',
        isImportant: !!n.is_important
      }))
    : DEFAULT_NOTICES;

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case '미디어센터': return { bg: '#E2E8F0', text: '#475569' };
      case '단장단': return { bg: '#E6EBF2', text: '#003378' };
      default: return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  return (
    <div className="card" style={{ 
      display: 'flex', 
      flexDirection: 'column',
      padding: '1.5rem',
      borderRadius: '24px',
      height: '320px',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
      border: '1px solid #E2E8F0',
      background: '#FFFFFF'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ fontWeight: 850, fontSize: '1.1rem', color: '#1E293B', margin: 0 }}>공지사항</h3>
        <Link href="/notices" style={{ fontSize: '0.8rem', color: '#94A3B8', textDecoration: 'none', fontWeight: 700 }}>
          전체보기 →
        </Link>
      </div>

      {/* List container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', flex: 1 }}>
        {notices.map(notice => {
          const isUnread = !readIds.includes(notice.id);
          const catColors = getCategoryColor(notice.category);
          
          return (
            <Link 
              key={notice.id} 
              href={`/notices?id=${notice.id}`}
              onClick={() => markAsRead(notice.id)}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '16px', 
                  backgroundColor: isUnread ? '#FFFBEB' : '#FFFFFF', 
                  border: isUnread ? '1.5px solid #FDE68A' : '1px solid #E2E8F0',
                  boxShadow: isUnread ? '0 4px 12px rgba(253, 230, 138, 0.15)' : 'none',
                  transition: 'all 0.25s ease',
                  position: 'relative'
                }}
                className="hover-scale"
              >
                {/* Category badge */}
                <span style={{ 
                  background: isUnread ? '#FCD34D' : catColors.bg, 
                  color: isUnread ? '#78350F' : catColors.text, 
                  borderRadius: '8px', 
                  padding: '3px 8px', 
                  fontSize: '0.7rem', 
                  fontWeight: 800, 
                  whiteSpace: 'nowrap', 
                  flexShrink: 0 
                }}>
                  {notice.category}
                </span>

                {/* Notice Title */}
                <span style={{ 
                  fontSize: '0.88rem', 
                  fontWeight: isUnread ? 800 : 500, 
                  color: isUnread ? '#78350F' : '#334155', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  flex: 1
                }}>
                  {notice.title}
                </span>

                {/* Unread Exclamation Mark or Date */}
                {isUnread ? (
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#F59E0B',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    flexShrink: 0,
                    boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                  }}>
                    !
                  </div>
                ) : (
                  <span style={{ 
                    fontSize: '0.72rem', 
                    color: '#94A3B8', 
                    whiteSpace: 'nowrap', 
                    flexShrink: 0 
                  }}>
                    {notice.date}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
