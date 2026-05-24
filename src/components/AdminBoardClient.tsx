'use client';

import React, { useState } from 'react';
import ContentsLayout from './ContentsLayout';

export default function AdminBoardClient({ contents }: { contents: any[] }) {
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Group by status
  // Proposals awaiting approval
  const pendingProposals = contents.filter(c => ['pending', 'revision'].includes(c.status));
  // Final works awaiting approval
  const pendingFinals = contents.filter(c => ['final_submitted', 'final_revision'].includes(c.status));
  // Approved/Completed Final Works
  const completedFinals = contents.filter(c => ['completed', 'uploaded'].includes(c.status));

  // Team columns
  const teams = [
    { id: '블로그', name: '블로그', color: '#16a34a', bg: '#dcfce7', icon: '📝' },
    { id: '인스타', name: '인스타', color: '#eab308', bg: '#fef3c7', icon: '📸' },
    { id: '유튜브', name: '유튜브', color: '#1d4ed8', bg: '#dbeafe', icon: '▶️' }
  ];

  const renderCard = (item: any) => {
    return (
      <div 
        key={item.id} 
        onClick={() => setSelectedItem(item)}
        style={{ 
          backgroundColor: '#f8fafc', 
          borderRadius: '8px', 
          padding: '1rem', 
          marginBottom: '0.75rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          cursor: 'pointer',
          border: '1px solid #e2e8f0',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          transition: 'transform 0.15s, box-shadow 0.15s'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        }}
      >
        <div style={{ backgroundColor: '#e2e8f0', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', minWidth: '60px', textAlign: 'center' }}>
          {item.content_type || '기타'}
        </div>
        <div>
          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: 800 }}>{item.title}</h4>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {item.team || '팀 없음'} - {item.author_name}
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (title: string, items: any[]) => {
    return (
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem' }}>
          {title} ({items.length})
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          {teams.map(team => {
            const teamItems = items.filter(item => item.team === team.id || item.team?.includes(team.id));
            return (
              <div key={team.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ 
                  backgroundColor: team.color, 
                  color: 'white', 
                  padding: '0.8rem', 
                  borderRadius: '12px',
                  fontWeight: 800,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '1rem',
                  marginBottom: '0.5rem'
                }}>
                  <span>{team.icon}</span> {teamItems.length}개
                </div>
                
                <div style={{ minHeight: '100px', backgroundColor: team.bg, borderRadius: '12px', padding: '1rem' }}>
                  {teamItems.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'rgba(0,0,0,0.3)', fontSize: '0.85rem', fontWeight: 600, padding: '2rem 0' }}>
                      대기 중인 항목 없음
                    </div>
                  ) : (
                    teamItems.map(item => renderCard(item))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>콘텐츠 현황 관리</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>카드 클릭 시 상세 상태를 변경하고 피드백을 남길 수 있습니다.</p>
      </div>

      {renderSection('승인대기 기획안', pendingProposals)}
      {renderSection('승인대기 완성본', pendingFinals)}
      {renderSection('통과된 완성본', completedFinals)}

      {/* Modal for detail & status update */}
      {selectedItem && (
        <ContentsLayout 
          modalOnly={true}
          openModalId={selectedItem.id} 
          onModalClose={() => setSelectedItem(null)} 
        />
      )}
    </div>
  );
}
