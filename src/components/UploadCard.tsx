'use client';

import { useState } from 'react';
import Link from 'next/link';

interface UploadCardProps {
  pendingFinalCount?: number;
}

export default function UploadCard({ pendingFinalCount = 0 }: UploadCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      style={{ 
        background: '#C0CFE4', /* 파란색 1.5단계 */
        borderRadius: '24px', 
        padding: '2rem', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: '260px',
        height: '260px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 15px 35px -10px rgba(15, 23, 42, 0.05)'
      }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Default Hover Area */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isOpen ? 0 : 1,
        transform: isOpen ? 'scale(0.8) translateY(-20px)' : 'scale(1) translateY(0)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isOpen ? 'none' : 'auto'
      }}>
        <div style={{ 
          width: '84px', height: '84px', borderRadius: '50%', 
          border: '2px solid #003378', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontSize: '2.8rem', fontWeight: 300, color: '#003378',
          marginBottom: '1rem',
          backgroundColor: 'transparent',
          transition: 'all 0.3s ease'
        }}>
          +
        </div>
        <span style={{ fontWeight: 800, color: '#003378', fontSize: '1.05rem', marginBottom: '0.4rem' }}>업로드</span>
        <span style={{
          backgroundColor: '#002454',
          color: 'white',
          fontSize: '0.72rem',
          fontWeight: 800,
          padding: '4px 12px',
          borderRadius: '999px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
        }}>
          미제출 완성본 ({pendingFinalCount})
        </span>
      </div>

      {/* Hovered Options */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        flexDirection: 'row',
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'scale(1) translateY(0)' : 'scale(1.05) translateY(10px)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isOpen ? 'auto' : 'none',
        padding: '2rem 1rem'
      }}>
        {/* Left: 기획안 */}
        <Link href="/proposals/submit" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#003378' }}>
          <div style={{ transition: 'transform 0.2s ease', display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="hover-scale">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', opacity: 0.85 }}>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span style={{ fontWeight: 800, fontSize: '0.98rem' }}>기획안</span>
          </div>
        </Link>

        {/* Divider */}
        <div style={{ width: '1.5px', backgroundColor: '#003378', opacity: 0.15, margin: '1rem 0' }}></div>

        {/* Right: 완성본 */}
        <Link href="/final-works/submit" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#003378' }}>
          <div style={{ transition: 'transform 0.2s ease', display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="hover-scale">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', opacity: 0.85 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span style={{ fontWeight: 800, fontSize: '0.98rem' }}>완성본</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
