'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import NoticeCreateModal from '@/components/NoticeCreateModal';
import ModalLink from '@/components/ModalLink'; // Optional, if we want to use the modal context for viewing, but we'll use a local modal or expandable row

interface Notice {
  id: string;
  title: string;
  content_body: string;
  author_name: string;
  created_at: string;
  status: string;
}

export default function NoticesClient({ notices, isAdmin }: { notices: Notice[], isAdmin: boolean }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const searchParams = useSearchParams();
  const initialId = searchParams?.get('id') || null;
  const [expandedId, setExpandedId] = useState<string | null>(initialId);

  useEffect(() => {
    if (initialId) setExpandedId(initialId);
  }, [initialId]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="flex-col gap-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>공지사항</h2>
        
        {isAdmin && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary" 
            style={{ fontSize: '0.9rem', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#002454', color: 'white', border: 'none', fontWeight: 600 }}
          >
            + 공지 작성하기
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '1rem', fontWeight: 500, width: '10%' }}>종류</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '60%' }}>제목</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '15%' }}>작성자</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '15%' }}>등록일</th>
            </tr>
          </thead>
          <tbody>
            {notices.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>등록된 공지사항이 없습니다.</td>
              </tr>
            ) : notices.map((notice) => {
              const isImportant = notice.status === 'IMPORTANT';
              const isExpanded = expandedId === notice.id;
              
              return (
                <React.Fragment key={notice.id}>
                  <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--color-border)', backgroundColor: isImportant ? '#eff6ff' : 'white', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1rem' }}>
                      {isImportant ? (
                        <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>중요</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>일반</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: isImportant ? 600 : 400 }}>
                      <a onClick={(e) => { e.preventDefault(); toggleExpand(notice.id); }} href="#" style={{ cursor: 'pointer', color: '#0f172a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {notice.title}
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                      </a>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{notice.author_name}</td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{new Date(notice.created_at).toLocaleDateString()}</td>
                  </tr>
                  {isExpanded && (
                    <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: isImportant ? '#eff6ff' : '#fafafa' }}>
                      <td colSpan={4} style={{ padding: '1.5rem 2rem', color: '#334155', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {notice.content_body}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreateModal && <NoticeCreateModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
