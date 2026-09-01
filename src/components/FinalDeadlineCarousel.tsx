'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ModalLink from '@/components/ModalLink';
import DeadlineEditModal from '@/components/DeadlineEditModal';

interface DeadlineItem {
  id: number;
  title: string;
  deadline: string; // YYYY-MM-DD
  team?: string;
  content_type?: string;
}

interface FinalDeadlineCarouselProps {
  items: DeadlineItem[];
  globalFinalDeadline?: string | null;
  globalFinalLabel?: string | null;
  globalFinalSubLabel?: string | null;
  isAdmin?: boolean;
}

export default function FinalDeadlineCarousel({ items, globalFinalDeadline, globalFinalLabel, globalFinalSubLabel, isAdmin }: FinalDeadlineCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  // 이 카드는 개별 콘텐츠 마감일을 순환 표시하는 자기 동작(전체 마감일 목록
  // 보기)이 이미 클릭에 걸려 있어, 마감일 "설정" 진입점은 별도의 톱니바퀴
  // 아이콘으로 분리했다(요청 반영: 기획안 마감과 마찬가지로 완성본 마감도
  // 클릭해서 조정할 수 있게, 관리자에게만 노출).
  const [showEditModal, setShowEditModal] = useState(false);

  const calcDDay = useCallback((dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    const target = new Date(Number(y), Number(m) - 1, Number(d));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, []);

  const formatDDay = (d: number) => {
    if (d === 0) return 'D-Day';
    if (d < 0) return `D+${Math.abs(d)}`;
    return `D-${d}`;
  };

  // Auto-rotate every 4 seconds
  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [items.length]);

  // If no individual deadlines, show global deadline
  if (items.length === 0) {
    const gDay = globalFinalDeadline ? calcDDay(globalFinalDeadline) : null;
    return (
      <div
        className="motion-card final-card-bg"
        onClick={() => { if (isAdmin) setShowEditModal(true); }}
        title={isAdmin ? '클릭해서 완성본 마감일 조정' : undefined}
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '24px',
          padding: '1.25rem 1.5rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 10px 24px -6px rgba(0, 0, 0, 0.08), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)',
          position: 'relative',
          cursor: isAdmin ? 'pointer' : 'default',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ color: 'var(--color-text-heading)', fontSize: '0.82rem', fontWeight: 700 }}>
            {globalFinalLabel || '완성본 마감'}
          </span>
          {globalFinalDeadline && (
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 600, opacity: 0.85 }}>
              {globalFinalDeadline}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ color: 'var(--color-text-heading)', fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: '1.1' }}>
            {gDay !== null ? formatDDay(gDay) : '미설정'}
          </div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 600, opacity: 0.85 }}>
            {globalFinalSubLabel || '마감일 없음'}
          </span>
        </div>

        {showEditModal && <DeadlineEditModal type="final" onClose={() => setShowEditModal(false)} />}
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const dDay = calcDDay(currentItem.deadline);
  const dDayColor = dDay <= 0 ? '#EF4444' : dDay <= 3 ? '#D97706' : 'var(--color-text-heading)';

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const modalContent = showAll && mounted ? createPortal(
    <div className="animate-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} onClick={() => setShowAll(false)} />
      <div className="animate-scale-in card" style={{ position: 'relative', backgroundColor: 'var(--color-card-bg)', borderRadius: '24px', padding: '1.5rem', width: '90%', maxWidth: '420px', boxShadow: '0 25px 60px rgba(0, 36, 84, 0.25)', zIndex: 10000 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-heading)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          전체 마감일
          <button onClick={() => setShowAll(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
          {items
            .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
            .map((item) => {
              const d = calcDDay(item.deadline);
              const itemColor = d <= 0 ? '#ef4444' : d <= 3 ? '#f59e0b' : '#3b82f6';
              return (
                <ModalLink key={item.id} href={`/final-works/submit?id=${item.id}`} style={{ display: 'block', textDecoration: 'none', padding: '1.2rem', borderRadius: '14px', backgroundColor: 'var(--color-surface)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', transition: 'all 0.2s ease', cursor: 'pointer' }}
                  onClick={() => setShowAll(false)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: '65%' }}>
                      <div style={{ color: 'var(--color-text-main)', fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </div>
                      {(item.team || item.content_type) && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {item.team} {item.team && item.content_type ? '·' : ''} {item.content_type}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '0.1rem' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                        {item.deadline}
                      </span>
                      <span style={{ color: itemColor, fontSize: '0.85rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
                        {formatDDay(d)}
                      </span>
                    </div>
                  </div>
                </ModalLink>
              );
            })}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div 
      className="motion-card final-card-bg"
      style={{ 
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: '24px', 
        padding: '1.25rem 1.5rem', 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        boxShadow: '0 10px 24px -6px rgba(0, 0, 0, 0.08), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ color: 'var(--color-text-heading)', fontSize: '0.82rem', fontWeight: 700 }}>
            완성본 마감
          </span>
          {isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}
              title="완성본 마감일 조정"
              style={{ background: 'rgba(0,36,84,0.08)', border: 'none', borderRadius: '6px', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#002454', cursor: 'pointer', flexShrink: 0 }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
          )}
        </div>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 600, opacity: 0.85 }}>
          {currentItem.deadline}
        </span>
      </div>

      {/* D-Day Number + Title */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ 
          color: dDayColor, 
          fontSize: '2.4rem', 
          fontWeight: 800, 
          letterSpacing: '-1.5px', 
          lineHeight: '1.1',
          transition: 'color 0.3s ease'
        }}>
          {formatDDay(dDay)}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: '55%' }}>
          <span style={{
            color: 'var(--color-text-muted)',
            fontSize: '0.72rem',
            fontWeight: 600, 
            marginBottom: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            display: 'block',
            textAlign: 'right'
          }}>
            {currentItem.title}
          </span>
          
          {/* Progress dots indicator */}
          {items.length > 1 && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              {items.map((_, idx) => (
                <div 
                  key={idx}
                  style={{
                    width: idx === currentIndex ? '14px' : '5px',
                    height: '5px',
                    borderRadius: '3px',
                    backgroundColor: idx === currentIndex ? '#002454' : 'rgba(0, 36, 84, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* "전체 보기" modal button */}
      <button
        onClick={() => setShowAll(true)}
        style={{
          marginTop: '8px',
          background: 'rgba(0, 36, 84, 0.08)',
          border: 'none',
          borderRadius: '8px',
          color: '#002454',
          fontSize: '0.68rem',
          fontWeight: 600,
          padding: '5px 10px',
          cursor: 'pointer',
          alignSelf: 'flex-start',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 36, 84, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 36, 84, 0.08)';
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
        전체 마감일 ({items.length}건)
      </button>

      {/* Modal Popup for all deadlines list */}
      {modalContent}

      {showEditModal && <DeadlineEditModal type="final" onClose={() => setShowEditModal(false)} />}
    </div>
  );
}
