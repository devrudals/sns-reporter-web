'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import ModalLink from '@/components/ModalLink';

export default function MissingFinalWorksPopup({ items, customTrigger }: { items: any[], customTrigger?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (items.length === 0 && !customTrigger) return null;

  const modalContent = isOpen && mounted ? createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} onClick={() => setIsOpen(false)} />
      <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', zIndex: 10000 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          미제출 완성본 목록
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
              미제출 완성본이 없습니다.
            </div>
          ) : (
            items.map(item => (
              <ModalLink key={item.id} href={`/final-works/submit?id=${item.id}`} style={{ display: 'block', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', textDecoration: 'none', color: 'inherit', transition: 'background-color 0.2s' }}
                onMouseEnter={(e: any) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e: any) => e.currentTarget.style.backgroundColor = 'white'}
                onClick={() => setIsOpen(false)}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>{item.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.team} · {item.content_type}</div>
              </ModalLink>
            ))
          )}
        </div>
        <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
          클릭하면 완성본 제출 화면으로 이동합니다.
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {customTrigger ? (
        <div onClick={() => setIsOpen(true)} style={{ flex: 1, height: '100%', display: 'flex', justifyContent: 'center' }}>
          {customTrigger}
        </div>
      ) : (
        <div 
          onClick={() => setIsOpen(true)}
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

