'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BIMONTH_RANGES, bimonthLabel, shiftBimonth, toBimonthStart } from '@/utils/bimonth';

interface ContentsHeaderProps {
  /** 검색 결과를 그리는 중이면 월 이동이 의미가 없다 — 목록은 전 기간이다. */
  isSearching?: boolean;
  selectedYear: number;
  selectedMonth: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  /** 소속(팀)·유형은 서로 다른 축이라 각각 다중선택이다. 빈 배열이면 전체 노출. */
  selectedTeams: string[];
  onToggleTeam: (value: string) => void;
  selectedTypes: string[];
  onToggleType: (value: string) => void;
  filterByMine: boolean;
  onFilterByMineChange: (mine: boolean) => void;
  selectedForDeleteCount: number;
  onDeleteSelected: () => void;
  onOpenDrafts: () => void;
  onOpenNewFinalModal: () => void;
  /** 미리보기 칸이 넓어진 상태 — 좁아진 목록에서는 작성 관련 버튼을 숨긴다. */
  compact?: boolean;
}

// 모바일 전체 리스트가 쓰는 것과 같은 두 축의 필터 — 소속과 유형을 섞어 한
// 목록에 두면 무엇을 고르는 건지 헷갈려 두 줄로 나눈다.
const TEAM_FILTERS = ['유튜브', '인스타', '블로그'];
const TYPE_FILTERS = [
  { label: '카드뉴스', value: '카드뉴스' },
  { label: '롱폼', value: '영상(롱폼)' },
  { label: '숏폼', value: '영상(숏폼)' },
  { label: '글 기사', value: '글 기사' },
];

export default function ContentsHeader({
  isSearching = false,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  selectedTeams,
  onToggleTeam,
  selectedTypes,
  onToggleType,
  filterByMine,
  onFilterByMineChange,
  selectedForDeleteCount,
  onDeleteSelected,
  onOpenDrafts,
  onOpenNewFinalModal,
  compact = false,
}: ContentsHeaderProps) {
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  // 목록 단위가 '월'에서 '분기(2개월 구간)'로 바뀌었으므로 화살표도 구간 단위로
  // 움직인다. 들어온 selectedMonth가 짝수여도 구간 시작월로 맞춰 계산한다.
  const bimonthStart = toBimonthStart(selectedMonth);

  // 좁아진 상태에서는 걸려 있는 필터만 남긴다. 아무것도 안 걸렸으면 통째로 사라진다.
  const visibleTeams = compact ? TEAM_FILTERS.filter(t => selectedTeams.includes(t)) : TEAM_FILTERS;
  const visibleTypes = compact ? TYPE_FILTERS.filter(t => selectedTypes.includes(t.value)) : TYPE_FILTERS;

  const moveBimonth = (direction: 1 | -1) => {
    const next = shiftBimonth(selectedYear, bimonthStart, direction);
    onMonthChange(next.start);
    onYearChange(next.year);
  };

  const handlePrevMonth = () => moveBimonth(-1);
  const handleNextMonth = () => moveBimonth(1);

  return (
    <div style={{
      padding: '16px 20px',
      backgroundColor: 'var(--color-card-bg)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid var(--color-border)',
      position: 'relative',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      {/* Left: Month Navigation & Filter Controls */}
      {/* 압축 상태(미리보기 확대)에서는 줄바꿈 대신 안에서 줄어든다(요청 반영) —
          남는 필터 개수가 적어 거의 항상 한 줄에 들어가지만, 만에 하나 좁아도
          칩 글자가 말줄임표로 줄어들 뿐 다음 줄로 넘어가지 않는다. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '8px' : '12px', flexWrap: compact ? 'nowrap' : 'wrap', minWidth: 0, overflow: compact ? 'hidden' : 'visible' }}>
        {isSearching ? (
          <h2 className="typo-h1" style={{ margin: 0, whiteSpace: 'nowrap', color: 'var(--color-text-heading)' }}>
            전체 기간 검색 결과
          </h2>
        ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            type="button"
            onClick={handlePrevMonth}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
            title="이전 분기"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          
          <div style={{ position: 'relative' }}>
            <h2 
              onClick={() => setShowMonthDropdown(!showMonthDropdown)}
              className="typo-h1"
              style={{ margin: 0, whiteSpace: 'nowrap', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-heading)' }}
            >
              {bimonthLabel(bimonthStart)} 콘텐츠 목록
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showMonthDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </h2>
            
            {/* Month Dropdown Grid */}
            {showMonthDropdown && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowMonthDropdown(false)} />
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '12px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--color-card-shadow)', zIndex: 50, width: '240px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <button 
                      type="button"
                      onClick={() => onYearChange(selectedYear - 1)}
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-muted)', borderRadius: '8px', padding: '6px', display: 'flex' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <div className="typo-h2" style={{ margin: 0, color: 'var(--color-text-heading)' }}>{selectedYear}년</div>
                    <button 
                      type="button"
                      onClick={() => onYearChange(selectedYear + 1)}
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-muted)', borderRadius: '8px', padding: '6px', display: 'flex' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {BIMONTH_RANGES.map(range => {
                      const isSelected = bimonthStart === range.start;
                      return (
                        <button
                          key={range.start}
                          type="button"
                          onClick={() => {
                            onMonthChange(range.start);
                            setShowMonthDropdown(false);
                          }}
                          style={{
                            padding: '10px 0',
                            border: 'none',
                            borderRadius: '10px',
                            backgroundColor: isSelected ? 'var(--color-primary, #1e3a8a)' : 'transparent',
                            color: isSelected ? 'white' : 'var(--color-text-main)',
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-surface)' }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                          {range.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <button 
            type="button"
            onClick={handleNextMonth}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
            title="다음 분기"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
        )}

        {/* 예전에는 채널 하나만 고르는 드롭다운이었다. 접히지 않고 늘 보이는
            칩 두 줄로 바꿔 지금 무엇이 걸려 있는지 한눈에 보이게 한다(요청 반영). */}
        {/* 목록이 좁아지면 켜져 있는 필터만 남긴다 — 지금 무엇이 걸렸는지는
            계속 보이되, 고르는 자리는 차지하지 않게 한다(요청 반영). */}
        <div role="group" aria-label="소속으로 거르기" style={{ display: visibleTeams.length ? 'flex' : 'none', alignItems: 'center', gap: compact ? '4px' : '6px', minWidth: 0, flexShrink: 1 }}>
          {visibleTeams.map(team => {
            const on = selectedTeams.includes(team);
            return (
              <button
                key={team}
                type="button"
                aria-pressed={on}
                onClick={() => onToggleTeam(team)}
                style={{
                  padding: compact ? '4px 8px' : '5px 12px',
                  borderRadius: '999px',
                  border: `1px solid ${on ? 'transparent' : 'var(--color-border)'}`,
                  backgroundColor: on ? 'var(--color-primary, #1e3a8a)' : 'var(--input-glass-bg)',
                  color: on ? '#ffffff' : 'var(--color-text-main)',
                  fontSize: compact ? '0.7rem' : '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  minWidth: 0,
                  flexShrink: 1,
                  overflow: 'hidden',
                }}
              >
                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team}</span>
              </button>
            );
          })}
        </div>

        {visibleTeams.length > 0 && visibleTypes.length > 0 && (
          <span aria-hidden="true" style={{ width: '1px', height: '18px', backgroundColor: 'var(--color-border)' }} />
        )}

        <div role="group" aria-label="콘텐츠 유형으로 거르기" style={{ display: visibleTypes.length ? 'flex' : 'none', alignItems: 'center', gap: compact ? '4px' : '6px', minWidth: 0, flexShrink: 1 }}>
          {visibleTypes.map(type => {
            const on = selectedTypes.includes(type.value);
            return (
              <button
                key={type.value}
                type="button"
                aria-pressed={on}
                onClick={() => onToggleType(type.value)}
                style={{
                  padding: compact ? '4px 8px' : '5px 12px',
                  borderRadius: '999px',
                  border: `1px solid ${on ? 'transparent' : 'var(--color-border)'}`,
                  backgroundColor: on ? 'var(--color-primary, #1e3a8a)' : 'var(--input-glass-bg)',
                  color: on ? '#ffffff' : 'var(--color-text-main)',
                  fontSize: compact ? '0.7rem' : '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  minWidth: 0,
                  flexShrink: 1,
                  overflow: 'hidden',
                }}
              >
                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{type.label}</span>
              </button>
            );
          })}
        </div>
        
        {(!compact || filterByMine) && (
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-heading)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input 
            type="checkbox" 
            checked={filterByMine} 
            onChange={(e) => onFilterByMineChange(e.target.checked)} 
            style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
          />
          내 콘텐츠만 보기
        </label>
        )}
      </div>

      {/* Right: Actions Toolbar */}
      {/* 칩이 늘어나 줄이 넘어가도 작성 버튼은 오른쪽 끝에 남는다. */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginLeft: 'auto' }}>
        {selectedForDeleteCount > 0 && (
          <button
            type="button"
            onClick={onDeleteSelected}
            title="선택된 항목 삭제"
            style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        )}
        {!compact && (
          <>
        <button 
          type="button"
          onClick={onOpenDrafts}
          title="통합 임시저장함"
          style={{ backgroundColor: 'var(--input-glass-bg)', color: 'var(--color-text-main)', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
        </button>
        <Link 
          href="/proposals/submit" 
          style={{ backgroundColor: 'var(--input-glass-bg)', color: 'var(--color-text-main)', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
        >
          + 새 기획안
        </Link>
        <button 
          type="button"
          onClick={onOpenNewFinalModal}
          style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
        >
          + 새 완성본
        </button>
          </>
        )}
      </div>
    </div>
  );
}
