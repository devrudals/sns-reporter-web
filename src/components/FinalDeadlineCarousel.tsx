'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface DeadlineItem {
  id: number;
  title: string;
  deadline: string; // YYYY-MM-DD
}

interface FinalDeadlineCarouselProps {
  items: DeadlineItem[];
  globalFinalDeadline?: string | null;
  globalFinalLabel?: string | null;
}

export default function FinalDeadlineCarousel({ items, globalFinalDeadline, globalFinalLabel }: FinalDeadlineCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

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
      <div style={{ 
        background: 'linear-gradient(135deg, #002454 0%, #003378 100%)', 
        borderRadius: '24px', 
        padding: '1.25rem 1.5rem', 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        boxShadow: '0 10px 25px rgba(0, 51, 120, 0.25)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ color: '#99B3D6', fontSize: '0.82rem', fontWeight: 800 }}>
            {globalFinalLabel || '완성본 마감'}
          </span>
          {globalFinalDeadline && (
            <span style={{ color: '#99B3D6', fontSize: '0.72rem', fontWeight: 700 }}>
              {globalFinalDeadline}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ color: '#FFFFFF', fontSize: '2.6rem', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: '1.1' }}>
            {gDay !== null ? formatDDay(gDay) : '미설정'}
          </div>
          <span style={{ color: '#99B3D6', fontSize: '0.72rem', fontWeight: 700 }}>
            마감일 없음
          </span>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const dDay = calcDDay(currentItem.deadline);
  const dDayColor = dDay <= 0 ? '#FF6B6B' : dDay <= 3 ? '#FBBF24' : '#FFFFFF';

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #002454 0%, #003378 100%)', 
      borderRadius: '24px', 
      padding: '1.25rem 1.5rem', 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'space-between',
      boxShadow: '0 10px 25px rgba(0, 51, 120, 0.25)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ color: '#99B3D6', fontSize: '0.82rem', fontWeight: 800 }}>
          완성본 마감
        </span>
        <span style={{ color: '#99B3D6', fontSize: '0.72rem', fontWeight: 700 }}>
          {currentItem.deadline}
        </span>
      </div>

      {/* D-Day Number + Title */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ 
          color: dDayColor, 
          fontSize: '2.6rem', 
          fontWeight: 900, 
          letterSpacing: '-1.5px', 
          lineHeight: '1.1',
          transition: 'color 0.3s ease'
        }}>
          {formatDDay(dDay)}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: '55%' }}>
          <span style={{ 
            color: '#CADCF0', 
            fontSize: '0.72rem', 
            fontWeight: 700, 
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
                    backgroundColor: idx === currentIndex ? '#FFFFFF' : 'rgba(153, 179, 214, 0.5)',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* "전체 보기" toggle button */}
      <button
        onClick={() => setShowAll(!showAll)}
        style={{
          marginTop: '8px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '8px',
          color: '#CADCF0',
          fontSize: '0.68rem',
          fontWeight: 700,
          padding: '4px 10px',
          cursor: 'pointer',
          alignSelf: 'flex-start',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {showAll ? (
            <polyline points="18 15 12 9 6 15" />
          ) : (
            <polyline points="6 9 12 15 18 9" />
          )}
        </svg>
        {showAll ? '접기' : `전체 마감일 (${items.length}건)`}
      </button>

      {/* Expandable all deadlines list */}
      {showAll && (
        <div style={{
          marginTop: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          maxHeight: '120px',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {items
            .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
            .map((item) => {
              const d = calcDDay(item.deadline);
              const itemColor = d <= 0 ? '#FF6B6B' : d <= 3 ? '#FBBF24' : '#CADCF0';
              return (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <span style={{
                    color: '#CADCF0',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '55%'
                  }}>
                    {item.title}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'rgba(202,220,240,0.6)', fontSize: '0.62rem', fontWeight: 600 }}>
                      {item.deadline}
                    </span>
                    <span style={{
                      color: itemColor,
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      letterSpacing: '-0.5px'
                    }}>
                      {formatDDay(d)}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
