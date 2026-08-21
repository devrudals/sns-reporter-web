'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import ModalLink from '@/components/ModalLink';
import { useModalA11y } from '@/hooks/useModalA11y';

export default function MissingFinalWorksPopup({ items, customTrigger }: { items: any[], customTrigger?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const popupMouseDownOnBackdrop = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useModalA11y(panelRef, isOpen, () => setIsOpen(false));

  useEffect(() => {
    setMounted(true);
  }, []);

  if (items.length === 0 && !customTrigger) return null;

  const modalContent = isOpen && mounted ? createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} 
        onMouseDown={(e) => {
          popupMouseDownOnBackdrop.current = (e.target === e.currentTarget);
        }}
        onClick={(e) => {
          if (popupMouseDownOnBackdrop.current && e.target === e.currentTarget) {
            setIsOpen(false);
          }
          popupMouseDownOnBackdrop.current = false;
        }}
      />
      <div ref={panelRef} tabIndex={-1} style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', zIndex: 10000 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          미제출 완성본 목록
          <button onClick={() => setIsOpen(false)} aria-label="닫기" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
              미제출 완성본이 없습니다.
            </div>
          ) : (
            items.map(item => {
              const calcDDay = (dateStr: string) => {
                if (!dateStr) return null;
                const [y, m, d] = dateStr.split('-');
                const target = new Date(Number(y), Number(m) - 1, Number(d));
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              };

              const formatDDay = (d: number | null) => {
                if (d === null) return '미설정';
                if (d === 0) return 'D-Day';
                if (d < 0) return `D+${Math.abs(d)}`;
                return `D-${d}`;
              };

              const d = calcDDay(item.deadline);
              const itemColor = d !== null && d <= 0 ? '#ef4444' : d !== null && d <= 3 ? '#f59e0b' : '#3b82f6';

              return (
                <ModalLink key={item.id} href={`/final-works/submit?id=${item.id}`} style={{ display: 'block', textDecoration: 'none', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#FFFFFF', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s ease', cursor: 'pointer' }}
                  onClick={() => setIsOpen(false)}
                  onMouseEnter={(e: any) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e: any) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: '65%' }}>
                      <div title={item.title} style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </div>
                      {(item.team || item.content_type) && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {item.team} {item.team && item.content_type ? '·' : ''} {item.content_type}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '0.1rem' }}>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                        {item.deadline}
                      </span>
                      <span style={{ color: itemColor, fontSize: '0.85rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
                        {formatDDay(d)}
                      </span>
                    </div>
                  </div>
                </ModalLink>
              );
            })
          )}
        </div>
        <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.75rem', color: '#475569' }}>
          클릭하면 완성본 제출 화면으로 이동합니다.
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {customTrigger ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="미제출 완성본 목록 열기"
          onClick={() => setIsOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(true); } }}
          style={{ flex: 1, height: '100%', display: 'flex', justifyContent: 'center' }}
        >
          {customTrigger}
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label={`미제출 완성본 ${items.length}건 목록 열기`}
          onClick={() => setIsOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(true); } }}
          style={{ background: '#FEF3C7', borderRadius: '12px', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 700, color: '#B45309', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span style={{ background: '#F59E0B', color: 'white', borderRadius: '999px', padding: '2px 8px', fontSize: '0.75rem' }}>{items.length}</span>
          미제출 완성본
        </div>
      )}
      {modalContent}
    </>
  );
}

