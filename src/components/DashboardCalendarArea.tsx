'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ModalLink from '@/components/ModalLink';
import { useModal } from '@/contexts/ModalContext';
import { DriveColorIcon } from './mobile/driveIcons';
import { YoutubeIcon, InstagramIcon, NaverBlogIcon, GenericPostIcon } from '@/components/platformIcons';


const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Weather code interpretation helper
const getWeatherInfo = (code: number) => {
  if (code === 0) return { icon: '☀️', text: '맑음', color: '#F59E0B' };
  if (code === 1) return { icon: '🌤️', text: '대체로 맑음', color: '#F59E0B' };
  if (code === 2) return { icon: '⛅', text: '구름 조금', color: '#64748B' };
  if (code === 3) return { icon: '☁️', text: '흐림', color: '#94A3B8' };
  if ([45, 48].includes(code)) return { icon: '🌫️', text: '안개', color: '#94A3B8' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(code)) return { icon: '🌧️', text: '비', color: '#3B82F6' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: '❄️', text: '눈', color: '#60A5FA' };
  if ([95, 96, 99].includes(code)) return { icon: '⛈️', text: '뇌우', color: '#8B5CF6' };
  return { icon: '☀️', text: '맑음', color: '#F59E0B' };
};

interface WeatherData {
  current?: {
    temperature_2m: number;
    weather_code: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

// Helper function for date matching (supports single date, range, ISO prefix)
// ※ 리스트 호버 방향(콘텐츠→캘린더)에서만 사용 (getRangeMatchInfo 보조용)
const isDateMatched = (cellDateStr: string, hoveredDateStr: string | null | undefined): boolean => {
  if (!cellDateStr || !hoveredDateStr) return false;
  const cleanHovered = hoveredDateStr.trim();
  if (cleanHovered === cellDateStr || cleanHovered.startsWith(cellDateStr) || cellDateStr.startsWith(cleanHovered)) {
    return true;
  }
  if (cleanHovered.includes('~')) {
    const parts = cleanHovered.split('~').map(s => s.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      return cellDateStr >= parts[0] && cellDateStr <= parts[1];
    }
  }
  return false;
};

// 캘린더 날짜 셀의 범위 매칭 정보 타입
interface RangeMatchInfo {
  isMatched: boolean;
  isRange: boolean;
  isStart: boolean;
  isEnd: boolean;
  isMiddle: boolean;
}

// 캘린더 셀이 hoveredDate(단일 or 범위) 에 해당하는지 + 위치 판별
const getRangeMatchInfo = (
  cellDateStr: string, 
  hoveredDateStr: string | null | undefined
): RangeMatchInfo => {
  if (!cellDateStr || !hoveredDateStr) {
    return { isMatched: false, isRange: false, isStart: false, isEnd: false, isMiddle: false };
  }
  
  const cleanHovered = hoveredDateStr.trim();

  // 범위 날짜 (e.g. "2026-05-10 ~ 2026-05-15")
  if (cleanHovered.includes('~')) {
    const parts = cleanHovered.split('~').map(s => s.trim().split('T')[0]);
    if (parts.length === 2 && parts[0] && parts[1]) {
      const start = parts[0];
      const end = parts[1];
      if (cellDateStr >= start && cellDateStr <= end) {
        return {
          isMatched: true,
          isRange: start !== end,
          isStart: cellDateStr === start,
          isEnd: cellDateStr === end,
          isMiddle: cellDateStr > start && cellDateStr < end
        };
      }
    }
  }

  // 단일 날짜 — ISO 접두 비교 포함
  const cleanCell = cellDateStr.split('T')[0];
  const cleanHoveredDate = cleanHovered.split('T')[0];
  const matched = cleanCell === cleanHoveredDate || cleanHovered.startsWith(cellDateStr) || cellDateStr.startsWith(cleanHoveredDate);
  return {
    isMatched: matched,
    isRange: false,
    isStart: matched,
    isEnd: matched,
    isMiddle: false
  };
};

// 리스트 row가 캘린더 hoveredDate(단일 날짜)에 해당하는지 판별
// 인자: contentDateStr(콘텐츠 희망일, 단일 or 범위), calHoveredDate(캘린더에서 hover된 단일 날짜)
const isContentMatchedByCalHover = (contentDateStr: string, calHoveredDate: string | null): boolean => {
  if (!contentDateStr || !calHoveredDate) return false;
  const cleanHovered = calHoveredDate.trim().split('T')[0];

  if (contentDateStr.includes('~')) {
    const parts = contentDateStr.split('~').map(s => s.trim().split('T')[0]);
    if (parts.length === 2 && parts[0] && parts[1]) {
      return cleanHovered >= parts[0] && cleanHovered <= parts[1];
    }
  }
  const cleanContent = contentDateStr.split('T')[0];
  return cleanContent === cleanHovered || contentDateStr.startsWith(cleanHovered) || cleanHovered.startsWith(cleanContent);
};

function MonthCalendar({ 
  year, 
  month, 
  contents, 
  weather, 
  hoveredDate, 
  clickedDate, 
  setHoveredDate, 
  setClickedDate,
  onPrev,
  onNext 
}: { 
  year: number; 
  month: number; 
  contents: any[]; 
  weather: WeatherData | null; 
  hoveredDate: string | null; 
  clickedDate: string | null; 
  setHoveredDate: (d: string | null) => void; 
  setClickedDate: (d: string | null) => void; 
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  const isToday = (d: number) => year === currentYear && month === currentMonth && d === currentDate;
  const isSun = (idx: number) => idx % 7 === 0;
  const isSat = (idx: number) => idx % 7 === 6;

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDaysInMonth = new Date(year, month, 0).getDate();

  const cells: { day: number; current: boolean }[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    cells.push({ day: prevDaysInMonth - i, current: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, current: true });
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, current: false });
  }
  const fullCells = cells.slice(0, cells.length > 35 && cells[35].current ? 42 : 35);

  const getForecastIcon = (day: number) => {
    if (!weather?.daily?.time) return null;
    const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    const idx = weather.daily.time.indexOf(dateStr);
    if (idx !== -1 && weather.daily.weather_code) {
      const code = weather.daily.weather_code[idx];
      return getWeatherInfo(code).icon;
    }
    return null;
  };

  return (
    <div className="card motion-card backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-white/90 dark:border-white/10 rounded-3xl p-5 shadow-[0_12px_32px_-8px_rgba(0,36,84,0.06),_inset_0_1px_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5),_inset_0_1px_1px_0_rgba(255,255,255,0.08)] flex flex-col">
      {/* Month Title & Month Navigation Buttons */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
          <span className="text-slate-950 dark:text-white tracking-tighter tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 900 }}>{month + 1}월</span>
          <span className="text-slate-600 dark:text-slate-500 font-extrabold uppercase tracking-wider" style={{ fontSize: '0.78rem' }}>{year}</span>
        </div>
        
        {(onPrev || onNext) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {onPrev && (
              <button 
                onClick={onPrev} 
                title="이전 달"
                className="motion-btn motion-scale bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200"
                style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  boxShadow: '0 2px 6px rgba(0, 36, 84, 0.04)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            )}
            {onNext && (
              <button 
                onClick={onNext} 
                title="다음 달"
                className="motion-btn motion-scale bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200"
                style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  boxShadow: '0 2px 6px rgba(0, 36, 84, 0.04)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Days grid headers - Swiss Grotesque uppercase micro-typography */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '0.6rem' }}>
          {DAYS.map((d, i) => (
            <div 
              key={d} 
              className={`text-center text-[0.72rem] font-black tracking-widest uppercase py-1 ${i === 0 ? 'text-rose-600 dark:text-rose-400' : i === 6 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-500'}`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px 0px' }}>
          {fullCells.map((cell, idx) => {
            const today_ = cell.current && isToday(cell.day);
            const cellDateStr = cell.current ? `${year}-${pad(month + 1)}-${pad(cell.day)}` : '';
            const rangeInfo = cell.current ? getRangeMatchInfo(cellDateStr, hoveredDate) : { isMatched: false, isRange: false, isStart: false, isEnd: false, isMiddle: false };
            const isHovered = rangeInfo.isMatched;
            const isWeekStart = idx % 7 === 0;
            const isWeekEnd = idx % 7 === 6;

            const isStartEdge = rangeInfo.isStart || isWeekStart;
            const isEndEdge = rangeInfo.isEnd || isWeekEnd;

            const cellWeatherIcon = cell.current ? getForecastIcon(cell.day) : null;

            return (
              <div 
                key={idx} 
                onMouseEnter={() => {
                  if (cell.current) setHoveredDate(cellDateStr);
                }}
                onMouseLeave={() => {
                  if (cell.current) setHoveredDate(null);
                }}
                style={{ 
                  padding: '0.25rem 0', 
                  textAlign: 'center', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '2px', 
                  position: 'relative',
                  minHeight: '60px',
                  cursor: cell.current ? 'pointer' : 'default',
                  zIndex: isHovered ? 10 : 1,
                  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {/* Continuous Range Strip Background Box for Date Ranges */}
                {isHovered && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '2px',
                      bottom: '2px',
                      left: isStartEdge ? '3px' : '0px',
                      right: isEndEdge ? '3px' : '0px',
                      backgroundColor: rangeInfo.isRange ? 'rgba(0, 71, 186, 0.14)' : 'rgba(0, 71, 186, 0.22)',
                      borderTop: '2px solid #0047BA',
                      borderBottom: '2px solid #0047BA',
                      borderLeft: isStartEdge ? '2px solid #0047BA' : 'none',
                      borderRight: isEndEdge ? '2px solid #0047BA' : 'none',
                      borderTopLeftRadius: isStartEdge ? '12px' : '0px',
                      borderBottomLeftRadius: isStartEdge ? '12px' : '0px',
                      borderTopRightRadius: isEndEdge ? '12px' : '0px',
                      borderBottomRightRadius: isEndEdge ? '12px' : '0px',
                      boxShadow: rangeInfo.isRange
                        ? '0 2px 8px rgba(0, 71, 186, 0.1)'
                        : '0 3px 12px rgba(0, 71, 186, 0.18)',
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Date text — Today는 딥네이비 원형, 호버/선택 상태별 선명한 대비 */}
                <div className={`relative z-[2] w-7 h-7 rounded-full flex items-center justify-center text-[0.85rem] tabular-nums transition-all duration-150 ${
                  today_
                    ? 'bg-[#002454] dark:bg-blue-600 text-white font-black shadow-xs ring-2 ring-blue-500/20'
                    : isHovered
                    ? 'text-[#002454] dark:text-blue-300 font-black scale-105'
                    : !cell.current
                    ? 'text-slate-300 dark:text-slate-600 font-normal'
                    : isSun(idx)
                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                    : isSat(idx)
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-slate-800 dark:text-slate-100 font-semibold'
                }`}>
                  {cell.day}
                </div>

                {/* Weather indicator icon - UNDER the number */}
                {cellWeatherIcon ? (
                  <span style={{ 
                    position: 'relative',
                    zIndex: 2,
                    fontSize: '1rem',
                    lineHeight: '1.1',
                    marginTop: '2px',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))',
                    display: 'block'
                  }}>
                    {cellWeatherIcon}
                  </span>
                ) : (
                  <div style={{ height: '1rem', marginTop: '2px' }} />
                )}

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Helper functions for MonthTable
const getTypeStyle = (typeStr: string, team?: string) => {
  let label = typeStr || '기타';
  if (typeStr === '영상(롱폼)') label = '롱폼';
  else if (typeStr === '영상(숏폼)') label = '숏폼';
  else if (typeStr === '글 기사') label = '기사';

  // 모바일 로고 색상 체계와 일치 (유튜브: 레드, 인스타: 노랑/앰버 #FCAF45, 블로그: 그린 #03C75A, 단장팀: 블루)
  switch(team) {
    case '유튜브': 
      return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', label };
    case '인스타': 
      return { bg: '#FEF3C7', text: '#78350F', border: '#FCD34D', label };
    case '블로그': 
      return { bg: '#DCFCE7', text: '#14532D', border: '#86EFAC', label };
    case '단장 팀':
    case '단장단 팀': 
      return { bg: '#EFF6FF', text: '#1E3A8A', border: '#BFDBFE', label };
    default: 
      return { bg: '#F1F5F9', text: '#334155', border: '#E2E8F0', label };
  }
};

const getTeamPlatformIcon = (team: string) => {
  if (team === '유튜브') {
    return <YoutubeIcon className="w-5 h-5 flex-shrink-0" style={{ width: '20px', height: '20px' }} />;
  }
  if (team === '인스타') {
    return <InstagramIcon className="w-5 h-5 flex-shrink-0" style={{ width: '20px', height: '20px' }} />;
  }
  if (team === '블로그') {
    return <NaverBlogIcon className="w-5 h-5 flex-shrink-0" style={{ width: '20px', height: '20px' }} />;
  }
  return <GenericPostIcon className="w-5 h-5 flex-shrink-0" style={{ width: '20px', height: '20px' }} />;
};

const formatDate = (isoString: string) => {
  const d = new Date(isoString);
  const yy = d.getFullYear().toString().slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
};

const getDiscussionsCount = (bodyStr: string) => {
  try {
    const obj = JSON.parse(bodyStr || '{}');
    return obj.discussions && obj.discussions.length > 0 ? obj.discussions.length : 0;
  } catch(e) { return 0; }
};

const getTimelinessStyle = (timeliness: string) => {
  switch (timeliness) {
    case '중요':
      return {
        color: '#991B1B',
        bg: '#FEF2F2',
        border: '#FECDD3',
        label: '중요'
      };
    case '보통':
      return {
        color: '#1E40AF',
        bg: '#EFF6FF',
        border: '#BFDBFE',
        label: '보통'
      };
    default:
      return {
        color: '#475569',
        bg: '#F1F5F9',
        border: '#E2E8F0',
        label: '상시'
      };
  }
};

const formatDesiredDateDisplay = (start: string, end?: string) => {
  if (!start) return null;
  const cleanStart = start.split('T')[0];
  const s = cleanStart.length >= 10 ? cleanStart.substring(5, 10).replace('-', '.') : cleanStart;
  if (!end || end === start) return s;
  const cleanEnd = end.split('T')[0];
  const e = cleanEnd.length >= 10 ? cleanEnd.substring(5, 10).replace('-', '.') : cleanEnd;
  return `${s}~${e}`;
};

function MonthTable({ 
  year, 
  month, 
  myContents, 
  activeDate, 
  hoveredDate, 
  setHoveredDate,
  allProfiles = [] 
}: { 
  year: number; 
  month: number; 
  myContents: any[]; 
  activeDate: string | null; 
  hoveredDate?: string | null;
  setHoveredDate?: (d: string | null) => void;
  allProfiles?: any[];
}) {
  const { openContentModal } = useModal();
  const pad = (n: number) => String(n).padStart(2, '0');
  const monthPrefix = `${year}-${pad(month + 1)}`;
  
  const filteredContents = myContents.filter(c => {
    let bodyObj: any = {};
    try { bodyObj = JSON.parse(c.content_body || '{}'); } catch {}
    
    const dateStr = c.created_at ? c.created_at.split('T')[0] : '';
    let cMonth = bodyObj.targetMonth || c.targetMonth || dateStr.substring(0, 7);
    return cMonth === monthPrefix;
  });

  filteredContents.sort((a, b) => {
    let bodyA: any = {};
    let bodyB: any = {};
    try { bodyA = JSON.parse(a.content_body || '{}'); } catch {}
    try { bodyB = JSON.parse(b.content_body || '{}'); } catch {}

    const dateA = bodyA.desiredDate || a.desiredDate || a.target_date || bodyA.targetDate || bodyA.deadline || '9999-99-99';
    const dateB = bodyB.desiredDate || b.desiredDate || b.target_date || bodyB.targetDate || bodyB.deadline || '9999-99-99';

    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }

    const timelinessRank = (t: string) => (t === '중요' ? 1 : t === '보통' ? 2 : 3);
    const rankA = timelinessRank(bodyA.timeliness || (dateA !== '9999-99-99' ? '보통' : '상관없음'));
    const rankB = timelinessRank(bodyB.timeliness || (dateB !== '9999-99-99' ? '보통' : '상관없음'));
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const createdA = new Date(a.created_at || 0).getTime();
    const createdB = new Date(b.created_at || 0).getTime();
    return createdB - createdA;
  });

  const formatCrewName = (name: string) => {
    if (!name) return '';
    if (/^\d+기\s+/.test(name)) return name;
    if (/^\d+\s+/.test(name)) return name.replace(/^(\d+)\s+/, '$1기 ');
    
    const cleanName = name.replace(/^\d+(기)?\s+/, '');
    const profile = allProfiles.find(p => p.author_name === cleanName || p.author_name === name);
    if (profile && profile.keywords) {
      const kw = profile.keywords.toString().trim();
      const generation = kw.endsWith('기') ? kw : `${kw}기`;
      return `${generation} ${cleanName}`;
    }
    return cleanName;
  };

  return (
    <div className="card motion-card backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-white/90 dark:border-white/10 rounded-3xl overflow-hidden shadow-[0_12px_32px_-8px_rgba(0,36,84,0.06),_inset_0_1px_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5),_inset_0_1px_1px_0_rgba(255,255,255,0.08)] flex flex-col" style={{ padding: 0, height: 'auto', minHeight: '440px' }}>
      
      <div style={{ overflowX: 'auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ minWidth: '650px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Swiss Grid Table Header */}
          <div className="flex p-3 px-4 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-700/90 text-[11px] font-black tracking-wider uppercase text-slate-600 dark:text-slate-400 gap-2.5 select-none">
            <div style={{ width: '84px', textAlign: 'center' }}>희망일</div>
            <div style={{ width: '40px', textAlign: 'center' }}>채널</div>
            <div style={{ width: '60px', textAlign: 'center' }}>형식</div>
            <div style={{ flex: '2', minWidth: '140px' }}>제목</div>
            <div style={{ flex: '1', minWidth: '100px', textAlign: 'left' }}>참여인원</div>
            <div style={{ width: '56px', textAlign: 'center' }}>구분</div>
            <div style={{ width: '84px', textAlign: 'center' }}>일정</div>
            <div style={{ width: '50px', textAlign: 'center' }}>피드백</div>
            <div style={{ width: '56px', textAlign: 'center' }}>드라이브</div>
          </div>

          {/* List Body */}
          <div style={{ flex: '1', backgroundColor: 'transparent' }}>
            {filteredContents.length === 0 ? (
              <div className="text-slate-600 dark:text-slate-500" style={{ padding: '60px 20px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                해당 월의 등록된 콘텐츠가 없습니다.
              </div>
            ) : (
              <div style={{ padding: '0 12px 12px 12px' }}>
            {filteredContents.map(item => {
              let bodyObj: any = {};
              try { bodyObj = JSON.parse(item.content_body || '{}'); } catch {}
              
              const typeStyle = getTypeStyle(item.content_type, item.team);
              const mainAuthor = item.author_name;
              let allCrew = [mainAuthor];
              if (bodyObj.crew && typeof bodyObj.crew === 'string') {
                allCrew = bodyObj.crew.split(',').map((s:string) => s.trim()).filter(Boolean);
              }
              const mainAuthorNameOnly = mainAuthor.replace(/^\d+(기)?\s+/, '');
              const others = allCrew.filter(c => {
                const cClean = c.replace(/^\d+(기)?\s+/, '');
                return cClean !== mainAuthorNameOnly && !mainAuthorNameOnly.includes(cClean);
              });
              const desiredDate = bodyObj.desiredDate || item.desiredDate || item.target_date || bodyObj.targetDate || bodyObj.deadline || '';
              const desiredDateEnd = bodyObj.desiredDateEnd || item.desiredDateEnd || bodyObj.targetDateEnd || '';
              const timeliness = bodyObj.timeliness || (desiredDate ? '중요' : '상관없음');
              const timeStyle = getTimelinessStyle(timeliness);
              const dateDisplay = formatDesiredDateDisplay(desiredDate, desiredDateEnd);

              const articleType = bodyObj.articleType || item.articleType || '개인기사';
              const isFinal = item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';
              const hasDriveLink = !!(item.final_url || (item.content_body && item.content_body.includes('http')));
              
              const targetDateForHover = desiredDate
                ? (desiredDateEnd && desiredDateEnd !== desiredDate ? `${desiredDate} ~ ${desiredDateEnd}` : desiredDate)
                : (item.target_date || (item.created_at ? item.created_at.split('T')[0] : ''));

              const isRowHovered = !!(hoveredDate && (
                hoveredDate === targetDateForHover ||
                isContentMatchedByCalHover(targetDateForHover, hoveredDate)
              ));
              
              return (
                <div 
                  key={item.id} 
                  className={`group motion-row ${isRowHovered ? 'bg-blue-50/90 dark:bg-blue-950/40 shadow-[inset_3.5px_0_0_#002454] dark:shadow-[inset_3.5px_0_0_#3B82F6]' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/60'}`}
                  onClick={() => openContentModal(item.id.toString())}
                  onMouseEnter={() => {
                    if (targetDateForHover) setHoveredDate?.(targetDateForHover);
                  }}
                  onMouseLeave={() => {
                    setHoveredDate?.(null);
                  }}
                  style={{ 
                    display: 'flex', padding: '11px 12px', borderBottom: '1px solid rgba(226, 232, 240, 0.65)', gap: '10px', 
                    alignItems: 'center', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ width: '84px', display: 'flex', justifyContent: 'center' }}>
                    {dateDisplay ? (
                      <span style={{ 
                        fontSize: '0.74rem', 
                        color: timeStyle.color, 
                        fontWeight: 800, 
                        backgroundColor: timeStyle.bg, 
                        padding: '3px 7px', 
                        borderRadius: '6px', 
                        border: `1px solid ${timeStyle.border}`,
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {dateDisplay}
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[0.72rem] font-bold px-2 py-0.5 rounded-md whitespace-nowrap">
                        상시
                      </span>
                    )}
                  </div>
                  <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                    <div className="w-7 h-7 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shadow-2xs">
                      {getTeamPlatformIcon(item.team)}
                    </div>
                  </div>
                  <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                    <span style={{ backgroundColor: typeStyle.bg, color: typeStyle.text, border: `1px solid ${typeStyle.border}`, padding: '2px 7px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {typeStyle.label}
                    </span>
                  </div>
                  <div className="text-slate-950 dark:text-white font-bold text-[0.88rem] truncate tracking-tight group-hover:text-[#002454] dark:group-hover:text-blue-400 transition-colors" style={{ flex: '2', minWidth: '140px' }}>
                    {item.title}
                  </div>
                  <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: '100px', justifyContent: 'center' }}>
                    {articleType === '개인기사' ? (
                      <span className="text-slate-700 dark:text-slate-200 text-[0.82rem] truncate">
                        <strong className="font-extrabold text-slate-950 dark:text-white">{formatCrewName(mainAuthor)}</strong>{others.length > 0 ? `, ${others.map(formatCrewName).join(', ')}` : ''}
                      </span>
                    ) : (
                      <>
                        <span className="text-slate-900 dark:text-white font-extrabold text-[0.82rem] truncate">
                          {item.team}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-[0.72rem] truncate font-medium">
                          <strong className="font-bold text-slate-700 dark:text-slate-300">{formatCrewName(mainAuthor)}</strong>{others.length > 0 ? `, ${others.map(formatCrewName).join(', ')}` : ''}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-[0.76rem] font-bold text-center" style={{ width: '56px' }}>
                    {articleType}
                  </div>
                  <div style={{ width: '84px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <div className="text-[#1E3A8A] dark:text-blue-200 bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 rounded px-1.5 py-0.5 text-[0.68rem] font-bold text-center w-full tabular-nums">
                      기 {formatDate(item.created_at)}
                    </div>
                    <div className={`rounded px-1.5 py-0.5 text-[0.68rem] font-bold text-center w-full tabular-nums ${bodyObj.finalSubmittedAt ? 'text-[#14532D] dark:text-emerald-200 bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60' : 'text-slate-600 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40'}`}>
                      완 {bodyObj.finalSubmittedAt ? formatDate(bodyObj.finalSubmittedAt) : '-'}
                    </div>
                  </div>
                  <div style={{ width: '50px', display: 'flex', justifyContent: 'center' }}>
                    <div className={`w-7 h-6 border rounded-md flex items-center justify-center text-[0.78rem] font-extrabold ${getDiscussionsCount(item.content_body) > 0 ? 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 shadow-2xs' : 'border-slate-200 dark:border-slate-700 bg-transparent text-slate-500 dark:text-slate-600'}`}>
                      {getDiscussionsCount(item.content_body)}
                    </div>
                  </div>
                  <div style={{ width: '56px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {isFinal && hasDriveLink ? (
                      <div 
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                        title="Google Drive Link"
                      >
                        <DriveColorIcon className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600 text-[0.8rem]">-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardCalendarArea({ rawContents, myContents, allProfiles = [] }: { rawContents: any[]; myContents: any[]; allProfiles?: any[] }) {
  const [baseDate, setBaseDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [clickedDate, setClickedDate] = useState<string | null>(null);
  const activeDate = clickedDate || hoveredDate;

  // 콘텐츠 호버 시 캘린더 하이라이트만 동기화 (리스트 개수 및 월 전환은 수동 조작으로만 유지)
  const handleContentHover = (targetDateStr: string | null) => {
    setHoveredDate(targetDateStr);
  };

  // Real-time Smooth Scroll-following inside container
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    let scrollEl: HTMLElement | Window | null = null;
    let curr = containerRef.current?.parentElement;
    while (curr) {
      const style = window.getComputedStyle(curr);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        scrollEl = curr;
        break;
      }
      curr = curr.parentElement;
    }
    if (!scrollEl) scrollEl = window;

    const handleScroll = () => {
      if (!containerRef.current || !calendarRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const calendarHeight = calendarRef.current.offsetHeight;
      const containerHeight = containerRef.current.offsetHeight;
      const maxTranslate = Math.max(0, containerHeight - calendarHeight);

      // 상단에서 20px 위치를 유지하며 우측 리스트 높이 범위 내에서 따라다님
      const topOffset = 20;
      let target = -containerRect.top + topOffset;

      if (target < 0) target = 0;
      if (target > maxTranslate) target = maxTranslate;

      setTranslateY(target);
    };

    const target = scrollEl;
    target.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      target.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Real-time Weather Integration with Open-Meteo API (14-day forecast for 2 weeks)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setWeatherLoading(true);
        // Yonsei University Sinchon campus (Latitude: 37.5598, Longitude: 126.9385)
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=37.5598&longitude=126.9385&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=14&timezone=Asia%2FSeoul'
        );
        if (res.ok) {
          const data = await res.json();
          setWeather(data);
        }
      } catch (e) {
        console.error('Failed to fetch weather from Open-Meteo', e);
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchWeather();
  }, []);

  const handlePrev = () => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNext = () => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // Current selected month
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const currentWeather = weather?.current;
  const currentWeatherInfo = currentWeather ? getWeatherInfo(currentWeather.weather_code) : null;

  return (
    <div>
      {/* Swiss Style Header with Frosted Glass Weather Capsule */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <h3 className="font-black text-xl text-slate-950 dark:text-white tracking-tight m-0 flex items-center gap-2.5">
            전체 콘텐츠 캘린더
          </h3>
          <span className="bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-md px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
            {month + 1}월 현황
          </span>
          
          {/* Weather Widget Capsule */}
          <div className="flex items-center gap-2 backdrop-blur-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-full px-3.5 py-1 text-xs text-slate-700 dark:text-slate-200 font-bold shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            <span>신촌 캠퍼스</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            {weatherLoading ? (
              <span className="text-slate-600 dark:text-slate-500 font-medium">날씨 확인 중...</span>
            ) : currentWeatherInfo ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.95rem' }}>{currentWeatherInfo.icon}</span>
                <span className="text-slate-600 dark:text-slate-300 font-semibold">{currentWeatherInfo.text}</span>
                <span className="text-slate-950 dark:text-white font-black tabular-nums">{currentWeather?.temperature_2m}°C</span>
              </div>
            ) : (
              <span style={{ color: '#EF4444' }}>날씨 정보 없음</span>
            )}
          </div>
        </div>

        {/* Prev / Next Page Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button 
            onClick={handlePrev} 
            title="이전 달"
            className="motion-btn motion-scale w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button 
            onClick={handleNext} 
            title="다음 달"
            className="motion-btn motion-scale w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
      
      {/* Single Month Calendar & Content Table View */}
      <div 
        ref={containerRef}
        className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 items-start" 
        style={{ position: 'relative', alignItems: 'start' }}
      >
        <div 
          ref={calendarRef}
          style={{ 
            transform: `translateY(${translateY}px)`,
            transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
            zIndex: 10,
            height: 'fit-content',
            willChange: 'transform'
          }}
        >
          <MonthCalendar year={year} month={month} contents={rawContents} weather={weather} hoveredDate={hoveredDate} clickedDate={clickedDate} setHoveredDate={setHoveredDate} setClickedDate={setClickedDate} onPrev={handlePrev} onNext={handleNext} />
        </div>
        <MonthTable year={year} month={month} myContents={rawContents} activeDate={activeDate} hoveredDate={hoveredDate} setHoveredDate={handleContentHover} allProfiles={allProfiles} />
      </div>
    </div>
  );
}
