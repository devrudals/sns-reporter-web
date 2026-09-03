'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ModalLink from '@/components/ModalLink';
import { useModal } from '@/contexts/ModalContext';
import { DriveColorIcon } from './mobile/driveIcons';
import { YoutubeIcon, InstagramIcon, NaverBlogIcon, GenericPostIcon } from '@/components/platformIcons';
import { cleanAuthorName } from '@/utils/dateUtils';


import {
  getContentSchedule,
  overlapsMonth,
  occursOn,
  compareBySchedule,
  getBarStyle,
  BAR_TITLE_MIN_HEIGHT_PX,
  type Timeliness,
} from '@/utils/contentSchedule';

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

// 날씨 뷰가 켜졌을 때 날짜 칸에 깔리는 배경/글자색. 모바일 캘린더가 쓰던
// --m-weather-* 토큰을 그대로 재사용해 두 화면의 날씨 색이 어긋나지 않게 한다.
const getWeatherBgColor = (code: number): string => {
  if (code === 0) return 'var(--m-weather-clear-bg)';
  if (code <= 2) return 'var(--m-weather-partly-bg)';
  if (code === 3) return 'var(--m-weather-cloudy-bg)';
  if (code === 45 || code === 48) return 'var(--m-weather-fog-bg)';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'var(--m-weather-rain-bg)';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'var(--m-weather-snow-bg)';
  if (code >= 95) return 'var(--m-weather-storm-bg)';
  return 'var(--m-weather-default-bg)';
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
// ※ 현재 호출부 없음 — 예전 범위 매칭 헬퍼의 보조용이었다.
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

// 캘린더 셀이 활성 날짜(단일 or 범위)에 걸치는지 판별.
// 예전에는 스트립 배경의 둥근 모서리를 위해 시작/중간/끝까지 돌려줬는데, 이제
// 강조 방식이 "걸치지 않은 칸을 흐리게"로 바뀌어 걸침 여부만 있으면 된다.
const isCellInActiveRange = (
  cellDateStr: string,
  activeDateStr: string | null | undefined
): boolean => {
  if (!cellDateStr || !activeDateStr) return false;

  const cleanActive = activeDateStr.trim();

  // 범위 날짜 (e.g. "2026-05-10 ~ 2026-05-15")
  if (cleanActive.includes('~')) {
    const parts = cleanActive.split('~').map(x => x.trim().split('T')[0]);
    if (parts.length === 2 && parts[0] && parts[1]) {
      return cellDateStr >= parts[0] && cellDateStr <= parts[1];
    }
  }

  // 단일 날짜 — ISO 접두 비교 포함
  const cleanCell = cellDateStr.split('T')[0];
  const cleanActiveDate = cleanActive.split('T')[0];
  return cleanCell === cleanActiveDate || cleanActive.startsWith(cellDateStr) || cellDateStr.startsWith(cleanActiveDate);
};

/**
 * 호버 중인 "콘텐츠"의 상태.
 *
 * 예전에는 호버 대상이 날짜(문자열) 하나였다. 그래서 기간('보통') 콘텐츠에 마우스를
 * 올리면 그 기간에 겹치는 다른 콘텐츠까지 전부 함께 밝아졌고, 같은 날짜의 콘텐츠가
 * 둘이면 어느 쪽을 가리키고 있는지 구분되지 않았다(제보).
 *
 * 이제 호버 대상은 콘텐츠 id다. range는 그 콘텐츠가 걸치는 기간이라, 캘린더에서
 * "이 콘텐츠가 걸치지 않는 날짜 칸"을 흐리게 만드는 데만 쓴다.
 * 날짜 칸 클릭(clickedDate)·날짜 칸 호버(calHoveredDate)는 여전히 "그 날짜의
 * 콘텐츠로 목록을 좁히는" 별개의 개념이라 상태를 따로 둔다.
 */
interface HoveredContent {
  id: string;
  /** 'YYYY-MM-DD' 또는 'YYYY-MM-DD ~ YYYY-MM-DD'. 상시(희망일 없음)면 null. */
  range: string | null;
}

/** 콘텐츠 일정을 isCellInActiveRange가 알아듣는 범위 문자열로. */
const scheduleToRange = (s: { start: string; end: string; isAlways: boolean }): string | null => {
  if (s.isAlways || !s.start) return null;
  return s.end && s.end !== s.start ? `${s.start} ~ ${s.end}` : s.start;
};

// 항상 기준월 + 다음 달까지 이어서 2개월치를 표시한다 (예: 9월 기준이면 9-10월, 10월로 넘어가면 10-11월)
const getMonthSpan = (baseYear: number, baseMonth: number) => {
  const nextYear = baseMonth === 11 ? baseYear + 1 : baseYear;
  const nextMonth = baseMonth === 11 ? 0 : baseMonth + 1;
  return { minYear: baseYear, minMonth: baseMonth, maxYear: nextYear, maxMonth: nextMonth };
};

interface ScheduledEvent {
  id: string;
  title: string;
  /** 'YYYY-MM-DD' */
  start: string;
  /** 'YYYY-MM-DD'. 하루짜리면 start와 같다. */
  end: string;
  timeliness: Timeliness;
  /** 소속 팀(플랫폼) — 막대 색을 정한다. */
  team: string;
}

interface CalendarCell {
  date: Date;
  year: number;
  month: number;
  day: number;
  isDisplayedMonth: boolean;
  isMonthStart: boolean;
}

const buildContinuousCells = (minYear: number, minMonth: number, maxYear: number, maxMonth: number): CalendarCell[] => {
  const firstOfRange = new Date(minYear, minMonth, 1);
  const lastOfRange = new Date(maxYear, maxMonth + 1, 0);

  const gridStart = new Date(firstOfRange);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const gridEnd = new Date(lastOfRange);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const cells: CalendarCell[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const d = cursor.getDate();
    const isDisplayedMonth = cursor >= firstOfRange && cursor <= lastOfRange;
    cells.push({ date: new Date(cursor), year: y, month: m, day: d, isDisplayedMonth, isMonthStart: d === 1 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
};

function ContinuousCalendar({
  baseYear,
  baseMonth,
  weather,
  weatherView = false,
  hoveredDate,
  clickedDate,
  setHoveredDate,
  setClickedDate,
  hoveredContent,
  setHoveredContent,
  onPrev,
  onNext,
  expanded = false,
  contents = []
}: {
  baseYear: number;
  baseMonth: number;
  weather: WeatherData | null;
  /** 날씨 토글 상태 — 켜져 있을 때만 날짜 칸에 날씨 아이콘·배경색을 입힌다. */
  weatherView?: boolean;
  hoveredDate: string | null;
  clickedDate: string | null;
  setHoveredDate: (d: string | null) => void;
  setClickedDate: (d: string | null) => void;
  /** 목록 행 또는 캘린더 막대에 올라가 있는 콘텐츠. 날짜 호버와 별개다. */
  hoveredContent: HoveredContent | null;
  setHoveredContent: (c: HoveredContent | null) => void;
  onPrev?: () => void;
  onNext?: () => void;
  /** 달력에 마우스가 올라가 컬럼이 넓어진 상태 — 막대를 키워 읽고 누르기 쉽게 한다. */
  expanded?: boolean;
  contents?: any[];
}) {
  // 막대를 누르면 그 콘텐츠의 상세보기를 연다(요청 반영) — 목록 행을 누르는 것과
  // 같은 모달이라, 달력에서 본 것을 다시 목록에서 찾을 필요가 없다.
  const { openContentModal } = useModal();
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  // 막대 한 줄과 줄 사이 간격.
  // 예전에는 "막대 영역 예산"을 고정해 두고 레인이 많아지면 막대 높이를 그 안으로
  // 욱여넣었다 — 붐비는 달에서는 막대가 12px 아래로 얇아져 제목이 통째로 빠졌다.
  // 이제 방향을 뒤집는다(요청 반영): 막대 높이는 제목이 읽히는 높이로 항상 고정하고,
  // 레인이 많으면 날짜 칸 자체가 세로로 길어진다. 캘린더가 길어지는 건 허용한다.
  const LANE_GAP_PX = 2;
  const BAR_H_PX = Math.max(13, BAR_TITLE_MIN_HEIGHT_PX);

  const isSun = (idx: number) => idx % 7 === 0;
  const isSat = (idx: number) => idx % 7 === 6;

  const { minYear, minMonth, maxYear, maxMonth } = React.useMemo(
    () => getMonthSpan(baseYear, baseMonth),
    [baseYear, baseMonth]
  );

  const isSingleMonth = minYear === maxYear && minMonth === maxMonth;
  const titleText = isSingleMonth
    ? `${baseMonth + 1}월`
    : minYear === maxYear
    ? `${minMonth + 1}-${maxMonth + 1}월`
    : `${minYear}.${minMonth + 1} - ${maxYear}.${maxMonth + 1}`;
  const titleYearText = isSingleMonth ? `${baseYear}` : minYear === maxYear ? `${minYear}` : '';
  const cells = React.useMemo(
    () => buildContinuousCells(minYear, minMonth, maxYear, maxMonth),
    [minYear, minMonth, maxYear, maxMonth]
  );

  const getForecastCode = (year: number, month: number, day: number): number | null => {
    if (!weather?.daily?.time || !weather.daily.weather_code) return null;
    const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    const idx = weather.daily.time.indexOf(dateStr);
    return idx !== -1 ? weather.daily.weather_code[idx] : null;
  };

  // 흐리기의 기준이 되는 날짜(범위). 콘텐츠 호버가 가장 우선한다 — 목록이나 막대에
  // 마우스를 올린 순간에는 "그 콘텐츠가 걸치는 날짜"만 남기는 게 사용자의 의도다.
  const activeDateStr = hoveredContent?.range || clickedDate || hoveredDate;

  // 선택/호버된 날짜(들)에 해당하는 요일 인덱스(0: Sun ~ 6: Sat) 세트 계산
  const activeDayOfWeekSet = React.useMemo(() => {
    if (!activeDateStr) return new Set<number>();
    const matchingIndices = new Set<number>();
    cells.forEach((cell, idx) => {
      if (cell.isDisplayedMonth) {
        const cellDateStr = `${cell.year}-${pad(cell.month + 1)}-${pad(cell.day)}`;
        if (isCellInActiveRange(cellDateStr, activeDateStr)) {
          matchingIndices.add(idx % 7);
        }
      }
    });
    return matchingIndices;
  }, [cells, activeDateStr]);

  // 캘린더에 놓을 일정만 추린다 — 상시(희망일 없음)는 특정 날짜가 없어 제외한다.
  const scheduled = React.useMemo(
    () =>
      (contents || [])
        .map(item => ({ item, s: getContentSchedule(item) }))
        .filter(x => !x.s.isAlways)
        .map(x => ({
          id: String(x.item.id),
          title: String(x.item.title || ''),
          start: x.s.start,
          end: x.s.end,
          timeliness: x.s.timeliness,
          team: String(x.item.team || ''),
        })),
    [contents]
  );

  // 여러 날에 걸친 일정이 한 주 안에서 "같은 높이"에 놓여야 하나의 막대로 이어져
  // 보인다. 주마다 서로 겹치지 않도록 레인을 그리디로 배정한다(구글 캘린더 방식).
  const laneByWeek = React.useMemo(() => {
    const byWeek = new Map<number, ScheduledEvent[][]>();
    const dayOf = (c: CalendarCell) => `${c.year}-${pad(c.month + 1)}-${pad(c.day)}`;
    const weekCount = Math.ceil(cells.length / 7);

    for (let w = 0; w < weekCount; w++) {
      const weekCells = cells.slice(w * 7, w * 7 + 7).filter(c => c.isDisplayedMonth);
      if (!weekCells.length) continue;
      const weekStart = dayOf(weekCells[0]);
      const weekEnd = dayOf(weekCells[weekCells.length - 1]);

      const inWeek = scheduled
        .filter(e => e.start <= weekEnd && e.end >= weekStart)
        // 먼저 시작하는 것, 같은 날 시작이면 더 긴 것을 위 레인에 둔다.
        .sort((a, b) => (a.start === b.start ? b.end.localeCompare(a.end) : a.start.localeCompare(b.start)));

      const occupiedUntil: string[] = [];
      const lanes: ScheduledEvent[][] = [];
      for (const e of inWeek) {
        const visibleStart = e.start < weekStart ? weekStart : e.start;
        const visibleEnd = e.end > weekEnd ? weekEnd : e.end;
        let lane = 0;
        while (occupiedUntil[lane] && occupiedUntil[lane] >= visibleStart) lane++;
        occupiedUntil[lane] = visibleEnd;
        if (!lanes[lane]) lanes[lane] = [];
        lanes[lane].push(e);
      }
      byWeek.set(w, lanes);
    }
    return byWeek;
  }, [cells, scheduled]);

  // 하루에 몇 개가 있든 "+N"으로 접지 않고 전부 보여준다(요청 반영, 모바일과 동일).
  // 막대 높이는 이 화면에서 가장 붐비는 주와 무관하게 늘 같다 — 주마다 굵기가
  // 들쭉날쭉하면 읽기 어렵고, 얇아지면 제목이 사라지기 때문이다.
  const maxLanes = React.useMemo(
    () => Array.from(laneByWeek.values()).reduce((m, lanes) => Math.max(m, lanes.length), 0),
    [laneByWeek]
  );
  // 달력에 마우스를 올리면 막대를 3.5배로 키운다(요청 반영) — 제목이 훨씬
  // 잘 읽히고 누르기도 쉬워진다. 벗어나면 원래 높이로 돌아온다.
  const barHeightPx = maxLanes > 0 ? Math.round(BAR_H_PX * (expanded ? 3.5 : 1)) : 0;
  // 막대가 차지하는 세로 공간 — 날짜 칸의 최소 높이를 여기에 맞춰 늘린다.
  // 레인이 늘면 이 값이 그대로 커지므로 칸(그리고 캘린더 전체)이 세로로 길어진다.
  const laneAreaPx = maxLanes > 0 ? maxLanes * (barHeightPx + LANE_GAP_PX) : 0;
  // 막대를 뺀 칸의 기본 높이(안쪽 여백 + 날짜 배지 + 날씨 자리).
  const CELL_BASE_H_PX = 54;
  const showBarTitle = barHeightPx >= BAR_TITLE_MIN_HEIGHT_PX;

  return (
    <div className="card motion-card backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 rounded-3xl p-5 shadow-[0_12px_32px_-8px_rgba(0,36,84,0.06),_inset_0_1px_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5),_inset_0_1px_1px_0_rgba(255,255,255,0.08)] flex flex-col">
      {/* Month Title & Month Navigation Buttons — 표시 범위가 여러 달이면 "8-9월"처럼 범위로 표시 */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
          <span className="text-slate-950 dark:text-white tracking-tighter tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 900 }}>{titleText}</span>
          {titleYearText && (
            <span className="text-slate-600 dark:text-slate-500 font-extrabold uppercase tracking-wider" style={{ fontSize: '0.78rem' }}>{titleYearText}</span>
          )}
        </div>

        {(onPrev || onNext) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {onPrev && (
              <button
                onClick={onPrev}
                title="이전 달"
                className="motion-btn motion-scale bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200"
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
                className="motion-btn motion-scale bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200"
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Days grid headers - 선택된 날짜의 요일은 찐하게, 미선택 요일은 완전히 연하게 표시 */}
        <div style={{ display: 'grid', gridTemplateColumns: '20px repeat(7, 1fr)', gap: '4px', marginBottom: '0.6rem' }}>
          <div />
          {DAYS.map((d, i) => {
            const hasActiveSelection = activeDayOfWeekSet.size > 0;
            const isDayActive = activeDayOfWeekSet.has(i);

            let headerClass = '';
            if (hasActiveSelection) {
              if (isDayActive) {
                headerClass = 'text-[#002454] dark:text-blue-400 font-black opacity-100 scale-105';
              } else {
                headerClass = 'text-slate-300 dark:text-slate-700 font-bold opacity-30';
              }
            } else {
              headerClass = i === 0 || i === 6 
                ? 'text-slate-500 dark:text-slate-400 font-black' 
                : 'text-slate-400 dark:text-slate-600 font-black';
            }

            return (
              <div
                key={d}
                className={`text-center text-[0.72rem] tracking-widest uppercase py-1 transition-all duration-150 ${headerClass}`}
              >
                {d}
              </div>
            );
          })}
        </div>

        {/* Continuous Calendar Cells — 여러 달이 이어지는 경우 하나의 그리드로 연속 표시 */}
        <div style={{ display: 'grid', gridTemplateColumns: '20px repeat(7, minmax(0, 1fr))', gap: '6px 0px' }}>
          {cells.map((cell, idx) => {
            const weekOf = Math.floor(idx / 7);
            const lanesThisWeek = laneByWeek.get(weekOf) || [];
            const weekIdx = idx % 7;
            const today_ = cell.isDisplayedMonth && cell.year === currentYear && cell.month === currentMonth && cell.day === currentDate;
            const cellDateStr = cell.isDisplayedMonth ? `${cell.year}-${pad(cell.month + 1)}-${pad(cell.day)}` : '';
            const activeDateStr = hoveredContent?.range || clickedDate || hoveredDate;
            // 활성 콘텐츠(리스트 호버/클릭)가 걸치지 않는 칸은 통째로 흐리게 만든다.
            // 예전처럼 걸치는 칸의 배경을 칠하는 대신 주변을 죽여, 그 콘텐츠의 막대만
            // 도드라져 보이게 하는 방향(요청 반영). 요일 라벨 강조와 같은 결이다.
            const isInActiveRange = cell.isDisplayedMonth && isCellInActiveRange(cellDateStr, activeDateStr);
            const isDimmed = !!activeDateStr && !isInActiveRange;
            const isWeekStart = weekIdx === 0;

            // 날씨는 토글을 켰을 때만 보여준다(요청 반영) — 예전엔 끌 수 없이
            // 늘 이모지가 붙어 있어 일정을 읽는 데 방해가 됐다.
            const cellWeatherCode =
              weatherView && cell.isDisplayedMonth ? getForecastCode(cell.year, cell.month, cell.day) : null;
            const cellWeatherIcon = cellWeatherCode !== null ? getWeatherInfo(cellWeatherCode).icon : null;
            const cellWeatherBg = cellWeatherCode !== null ? getWeatherBgColor(cellWeatherCode) : undefined;

            const cellNode = (
              <div
                key={idx}
                onClick={() => {
                  if (cell.isDisplayedMonth) {
                    setClickedDate(clickedDate === cellDateStr ? null : cellDateStr);
                  }
                }}
                onMouseEnter={() => {
                  if (cell.isDisplayedMonth) setHoveredDate(cellDateStr);
                }}
                onMouseLeave={() => {
                  if (cell.isDisplayedMonth) setHoveredDate(null);
                }}
                style={{
                  padding: '0.25rem 0',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  position: 'relative',
                  // 기간 막대는 시작 칸 안에서 그려져 옆 칸들 위로 넘쳐 흐른다.
                  // 그런데 옆 칸이 DOM 순서상 나중이라 그 막대를 덮어 마우스를
                  // 가로챘다 — 시작일에서만 호버가 먹고 중간·마지막 날짜에서는
                  // 안 먹던 원인(제보). 막대는 언제나 오른쪽으로만 뻗으므로,
                  // 한 주 안에서 왼쪽 칸일수록 z-index를 높여 두면 넘친 막대가
                  // 항상 오른쪽 칸들 위에 온다.
                  zIndex: 8 - weekIdx,
                  minHeight: `${Math.max(60, CELL_BASE_H_PX + laneAreaPx)}px`,
                  // 토큰 값이 그라데이션이라 backgroundColor가 아니라 background여야 한다.
                  background: cellWeatherBg,
                  borderRadius: cellWeatherBg ? '10px' : undefined,
                  cursor: cell.isDisplayedMonth ? 'pointer' : 'default',
                  opacity: isDimmed ? 0.28 : 1,
                  transition: 'opacity 0.18s cubic-bezier(0.4, 0, 0.2, 1), background 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {/* Date text */}
                <div
                  className={`relative z-[2] w-7 h-7 rounded-lg flex items-center justify-center text-[0.85rem] tabular-nums transition-[color,background-color,transform] duration-150 ${
                      today_
                      ? 'bg-[#002454] dark:bg-blue-600 text-white font-black shadow-xs'
                      : !cell.isDisplayedMonth
                      ? 'text-slate-300 dark:text-slate-600 font-normal'
                      : isSun(weekIdx) || isSat(weekIdx)
                      ? 'text-slate-500 dark:text-slate-400 font-semibold'
                      : 'text-slate-800 dark:text-slate-100 font-semibold'
                  }`}
                >
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

                {/* 일정 막대 — 기간(보통) 콘텐츠는 걸쳐 있는 날짜만큼 이어진 하나의
                    막대로 그린다. 각 주의 시작 칸(또는 일정 시작일)에서만 실제 막대를
                    그리고 폭을 며칠치로 늘려, 칸이 나뉘어 있어도 끊기지 않아 보인다.
                    나머지 칸은 같은 높이의 빈 자리만 둬 레인이 어긋나지 않게 한다.
                    레인 수 제한 없이 전부 그리고, 대신 높이를 줄인다(요청 반영). */}
                {cell.isDisplayedMonth && lanesThisWeek.length > 0 && (
                  // 막대는 여러 칸에 걸쳐 그려지는데, 옆 칸이 같은 자리에 두는 빈
                  // 레인 자리(placeholder)가 DOM 순서상 나중이라 그 막대를 덮어
                  // 마우스를 가로챘다 — 막대에 올려도 호버가 걸리지 않던 원인.
                  // 컨테이너는 마우스를 통과시키고, 실제 막대만 다시 받게 한다.
                  <div style={{ position: 'relative', zIndex: 4, width: '100%', display: 'flex', flexDirection: 'column', gap: `${LANE_GAP_PX}px`, marginTop: '3px', pointerEvents: 'none' }}>
                    {lanesThisWeek.map((laneEvents, laneIdx) => {
                      const ev = laneEvents.find(e => e.start <= cellDateStr && cellDateStr <= e.end);
                      if (!ev) return <div key={laneIdx} style={{ height: barHeightPx }} />;

                      const weekCellsAll = cells.slice(weekOf * 7, weekOf * 7 + 7).filter(c => c.isDisplayedMonth);
                      const weekStartStr = weekCellsAll.length ? `${weekCellsAll[0].year}-${pad(weekCellsAll[0].month + 1)}-${pad(weekCellsAll[0].day)}` : cellDateStr;
                      const lastCell = weekCellsAll[weekCellsAll.length - 1];
                      const weekEndStr = lastCell ? `${lastCell.year}-${pad(lastCell.month + 1)}-${pad(lastCell.day)}` : cellDateStr;

                      const visibleStart = ev.start < weekStartStr ? weekStartStr : ev.start;
                      const visibleEnd = ev.end > weekEndStr ? weekEndStr : ev.end;
                      // 이 칸에서 막대를 새로 그릴지(= 이번 주에서 처음 나타나는 날인지)
                      if (cellDateStr !== visibleStart) return <div key={laneIdx} style={{ height: barHeightPx }} />;

                      const span = Math.max(
                        1,
                        Math.round(
                          (new Date(visibleEnd + 'T00:00:00').getTime() - new Date(visibleStart + 'T00:00:00').getTime())
                            / 86400000
                        ) + 1
                      );
                      return (
                        <div key={laneIdx} style={{ position: 'relative', height: barHeightPx }}>
                          <div
                            className="cal-bar"
                            // 위 컨테이너에서 끈 마우스 이벤트를 막대에서만 되살린다.
                            title={`${ev.title} (${ev.start}${ev.end !== ev.start ? ` ~ ${ev.end}` : ''})`}
                            // 막대에 올라가면 그 막대의 "콘텐츠"가 호버 대상이 된다 —
                            // 같은 날짜에 걸친 다른 콘텐츠까지 함께 밝아지지 않게(요청 반영).
                            onMouseEnter={() =>
                              setHoveredContent({
                                id: ev.id,
                                range: ev.end !== ev.start ? `${ev.start} ~ ${ev.end}` : ev.start,
                              })
                            }
                            onMouseLeave={() => setHoveredContent(null)}
                            onClick={e => {
                              // 칸 클릭은 "그 날짜로 목록 좁히기"라 서로 다른 동작이다.
                              e.stopPropagation();
                              openContentModal(String(ev.id));
                            }}
                            style={{
                              ...getBarStyle(ev.team, ev.timeliness),
                              pointerEvents: 'auto',
                              // 막대가 커지면 글자도 같이 키워야 읽기 편해진다.
                              // 여러 줄로 흐르지 않게 .cal-bar의 nowrap은 그대로 둔다.
                              fontSize: expanded ? '12px' : undefined,
                              padding: expanded ? '0 6px' : undefined,
                              // 다른 콘텐츠를 가리키는 중이면 이 막대는 뒤로 물러난다.
                              opacity: hoveredContent && hoveredContent.id !== ev.id ? 0.28 : 1,
                              transition: 'opacity 0.18s cubic-bezier(0.4, 0, 0.2, 1), height 0.25s cubic-bezier(0.4, 0, 0.2, 1), font-size 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              position: 'absolute',
                              top: 0,
                              left: ev.start >= weekStartStr ? '2px' : '0px',
                              height: barHeightPx,
                              width: `calc(${span} * 100% - 4px)`,
                              borderTopLeftRadius: ev.start >= weekStartStr ? '3px' : '0px',
                              borderBottomLeftRadius: ev.start >= weekStartStr ? '3px' : '0px',
                              borderTopRightRadius: ev.end <= weekEndStr ? '3px' : '0px',
                              borderBottomRightRadius: ev.end <= weekEndStr ? '3px' : '0px',
                            }}
                          >
                            {/* 막대가 얇으면 글자가 뭉개져 색 띠만 남긴다(요청 반영). */}
                            {showBarTitle ? ev.title : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );

            // 매 주의 시작(일요일) 칸 앞에만 라벨 컬럼을 추가 — 그 주에 달이 시작하면 작은 월 라벨 표시
            if (!isWeekStart) return cellNode;

            const monthLabelCell = cells
              .slice(idx, idx + 7)
              .find(c => c.isMonthStart && c.isDisplayedMonth);

            return (
              <React.Fragment key={idx}>
                <div
                  className="text-slate-400 dark:text-slate-600"
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    writingMode: monthLabelCell ? 'vertical-rl' : undefined,
                  }}
                >
                  {monthLabelCell ? `${monthLabelCell.month + 1}월` : ''}
                </div>
                {cellNode}
              </React.Fragment>
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

  // 채널 구분은 아이콘으로 이미 표시되므로, 형식 배지는 스위스 스타일의 단일 중립 톤으로 통일
  void team;
  return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', label };
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
        color: '#002454',
        bg: '#EEF2F8',
        border: '#D6DEEA',
        label: '중요'
      };
    case '보통':
      return {
        color: '#475569',
        bg: '#F1F5F9',
        border: '#E2E8F0',
        label: '보통'
      };
    default:
      return {
        color: '#64748B',
        bg: '#F8FAFC',
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
  calActiveDate, 
  clickedDate,
  setClickedDate,
  hoveredContent,
  setHoveredContent,
  compact = false,
  allProfiles = []
}: {
  year: number;
  month: number;
  myContents: any[];
  calActiveDate?: string | null;
  clickedDate?: string | null;
  setClickedDate?: (d: string | null) => void;
  hoveredContent?: HoveredContent | null;
  setHoveredContent?: (c: HoveredContent | null) => void;
  /** 달력이 넓어져 목록이 좁아진 상태 — 부가 열(구분·일정·피드백)을 접는다. */
  compact?: boolean;
  allProfiles?: any[];
}) {
  const { openContentModal } = useModal();
  // 상시 묶음은 기본으로 접어 둔다 — 어느 달을 보든 같은 14건이 목록 위를
  // 차지하면 정작 그 달의 일정이 밀린다.
  const [showAlways, setShowAlways] = useState(false);
  const pad = (n: number) => String(n).padStart(2, '0');
  const monthPrefix = `${year}-${pad(month + 1)}`;
  
  // 이 달에 "실제로 나가는" 콘텐츠. 예전에는 귀속 월(targetMonth)로 걸러서,
  // 8월 콘텐츠인데 희망일이 9월인 항목이 9월 화면에서 통째로 빠졌다.
  // 기간(보통) 콘텐츠는 이 달에 하루라도 걸치면 포함한다.
  const monthlyContents = myContents.filter(c => overlapsMonth(getContentSchedule(c), year, month));

  // 희망일이 없는 '상시' 콘텐츠는 특정 달에 속하지 않는다 — 어느 달을 보든
  // 리스트 맨 위의 접이식 묶음으로 따로 보여준다(요청 반영).
  const alwaysContents = React.useMemo(
    () => myContents.filter(c => getContentSchedule(c).isAlways).sort(compareBySchedule),
    [myContents]
  );

  // 달력 위를 호버하거나 특정 날짜를 클릭했을 때, 해당 날짜에 매칭되는 콘텐츠만 필터링!
  const filteredContents = React.useMemo(() => {
    if (!calActiveDate) return monthlyContents;

    // 기간 콘텐츠는 시작일뿐 아니라 걸쳐 있는 모든 날짜에서 잡혀야 한다.
    return monthlyContents.filter(item => occursOn(getContentSchedule(item), calActiveDate));
  }, [monthlyContents, calActiveDate]);

  // 희망일 빠른 순. 상시는 위쪽 접이식 묶음으로 따로 빠진다(요청 반영).
  filteredContents.sort(compareBySchedule);

  const formatCrewName = (name: string) => {
    if (!name) return '';
    const pureName = cleanAuthorName(name);
    if (/^\d+기\s+/.test(pureName)) return pureName;
    if (/^\d+\s+/.test(pureName)) return pureName.replace(/^(\d+)\s+/, '$1기 ');

    const cleanName = pureName.replace(/^\d+(기)?\s+/, '');
    const profile = allProfiles.find(p => cleanAuthorName(p.author_name) === cleanName || cleanAuthorName(p.author_name) === pureName);
    if (profile && profile.keywords) {
      const kw = profile.keywords.toString().trim();
      const generation = kw.endsWith('기') ? kw : `${kw}기`;
      return `${generation} ${cleanName}`;
    }
    return cleanName;
  };

  // 한 줄을 그리는 방법은 월 목록과 상시 묶음이 같아야 하므로 함수로 뺀다.
  const renderRow = (item: any) => {
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
              
              // 호버 대상은 이제 날짜가 아니라 이 콘텐츠 자신이다(요청 반영).
              // 캘린더에서 흐리기의 기준이 될 기간은 일정 판정의 단일 기준에서 뽑는다.
              const hoverRange = scheduleToRange(getContentSchedule(item, bodyObj));
              const rowId = String(item.id);
              const isRowHovered = hoveredContent?.id === rowId;
              // 흐리기 발동 구간은 왼쪽(희망일·채널·형식·제목)까지다(요청 반영).
              // 처음엔 그 네 칸에 각각 mouseenter를 걸었는데, 칸 사이 10px 간격과
              // 행의 위아래 여백에서는 아무 칸에도 속하지 않아 흐리기가 껐다 켜졌다
              // 하며 화면이 깜빡였다(제보). 그래서 칸이 아니라 "행 전체에서 커서의
              // x 좌표"로 판정한다 — 간격 위에 있어도 왼쪽이면 계속 켜져 있다.
              // 경계는 참여인원 칸의 왼쪽 모서리이며, 상태가 실제로 바뀔 때만
              // setState를 불러 mousemove마다 렌더링이 도는 것을 막는다.
              const handleRowMove = (e: React.MouseEvent<HTMLDivElement>) => {
                const boundary = e.currentTarget.querySelector('[data-dim-boundary]');
                const boundaryX = boundary ? boundary.getBoundingClientRect().left : Infinity;
                const shouldDim = e.clientX < boundaryX;
                if (shouldDim && !isRowHovered) setHoveredContent?.({ id: rowId, range: hoverRange });
                else if (!shouldDim && isRowHovered) setHoveredContent?.(null);
              };

              return (
                <div
                  key={item.id}
                  className={`group motion-row ${isRowHovered ? 'bg-slate-100/90 dark:bg-slate-800/70' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/60'}`}
                  onClick={() => openContentModal(item.id.toString())}
                  onMouseMove={handleRowMove}
                  onMouseLeave={() => setHoveredContent?.(null)}
                  style={{
                    display: 'flex', padding: '11px 12px', borderBottom: '1px solid rgba(226, 232, 240, 0.45)', gap: '10px',
                    alignItems: 'center', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s ease',
                    // 캘린더 쪽 흐리기와 같은 세기·같은 이징으로 맞춘다.
                    opacity: (hoveredContent && !isRowHovered) ? 0.28 : 1
                  }}
                >
                  <div style={{ width: '84px', display: 'flex', justifyContent: 'center' }}>
                    <span className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 text-[0.72rem] font-bold px-2 py-0.5 rounded-md whitespace-nowrap tabular-nums">
                      {dateDisplay || '상시'}
                    </span>
                  </div>
                  <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                    <div className="w-7 h-7 rounded-lg bg-white/90 dark:bg-slate-800/90 flex items-center justify-center shadow-2xs">
                      {getTeamPlatformIcon(item.team)}
                    </div>
                  </div>
                  <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                    <span style={{ backgroundColor: typeStyle.bg, color: typeStyle.text, padding: '2px 7px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {typeStyle.label}
                    </span>
                  </div>
                  <div title={item.title} className="text-slate-950 dark:text-white font-bold text-[0.88rem] truncate tracking-tight group-hover:text-[#002454] dark:group-hover:text-blue-400 transition-colors" style={{ flex: '2', minWidth: compact ? '80px' : '140px' }}>
                    {item.title}
                  </div>
                  <div data-dim-boundary style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: '100px', justifyContent: 'center' }}>
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
                  {!compact && (
                    <div className="text-slate-500 dark:text-slate-400 text-[0.76rem] font-bold text-center" style={{ width: '56px' }}>
                      {articleType}
                    </div>
                  )}
                  {!compact && (
                  <div style={{ width: '84px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <div className="text-[#1E3A8A] dark:text-blue-200 bg-blue-50 dark:bg-blue-950/70 rounded px-1.5 py-0.5 text-[0.7rem] font-bold text-center w-full tabular-nums shadow-2xs">
                      <span title="기획안 제출일">기 {formatDate(item.created_at)}</span>
                    </div>
                    <div className={`rounded px-1.5 py-0.5 text-[0.7rem] font-bold text-center w-full tabular-nums shadow-2xs ${bodyObj.finalSubmittedAt ? 'text-[#14532D] dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/70' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60'}`}>
                      <span title={bodyObj.finalSubmittedAt ? '완성본 제출일' : '완성본 미제출'}>완 {bodyObj.finalSubmittedAt ? formatDate(bodyObj.finalSubmittedAt) : '-'}</span>
                    </div>
                  </div>
                  )}
                  {!compact && (
                  <div style={{ width: '50px', display: 'flex', justifyContent: 'center' }}>
                    <div className={`w-7 h-6 rounded-md flex items-center justify-center text-[0.78rem] font-extrabold ${getDiscussionsCount(item.content_body) > 0 ? 'bg-[#EAF2FF] dark:bg-blue-950/60 text-[#002454] dark:text-blue-200 shadow-2xs' : 'bg-slate-100/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-600'}`}>
                      {getDiscussionsCount(item.content_body)}
                    </div>
                  </div>
                  )}
                  <div style={{ width: '56px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {isFinal && hasDriveLink ? (
                      <div 
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
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
  };

  return (
    <div className="flex flex-col" style={{ padding: 0, height: 'auto', minHeight: '440px' }}>
      
      <div style={{ overflowX: 'auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ minWidth: '650px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* 달력 날짜 필터링 활성 안내 바 */}
          {calActiveDate && (
            <div className="flex items-center justify-between px-4 py-2 bg-blue-50/90 dark:bg-blue-950/50 border-b border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 transition-all">
              <div className="font-bold flex items-center gap-1.5">
                <span>📅</span>
                <span>
                  <strong>{calActiveDate}</strong> {clickedDate ? '선택' : '호버'} 필터링 ({filteredContents.length}건)
                </span>
              </div>
              {clickedDate && setClickedDate && (
                <button
                  onClick={() => setClickedDate(null)}
                  className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  선택 해제 (전체 보기)
                </button>
              )}
            </div>
          )}

          {/* Swiss Grid Table Header */}
          <div className="flex p-3 px-4 rounded-2xl backdrop-blur-md bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.06)] text-[11px] font-black tracking-wider uppercase text-slate-600 dark:text-slate-400 gap-2.5 select-none">
            <div style={{ width: '84px', textAlign: 'center' }}>희망일</div>
            <div style={{ width: '40px', textAlign: 'center' }}>채널</div>
            <div style={{ width: '60px', textAlign: 'center' }}>형식</div>
            <div style={{ flex: '2', minWidth: compact ? '80px' : '140px' }}>제목</div>
            <div style={{ flex: '1', minWidth: '100px', textAlign: 'left' }}>참여인원</div>
            {/* 달력이 넓어지면 목록이 좁아진다 — 우선순위가 낮은 세 열을 접고
                제목은 남은 폭에 맞춰 줄인다(요청 반영). */}
            {!compact && <div style={{ width: '56px', textAlign: 'center' }}>구분</div>}
            {!compact && <div style={{ width: '84px', textAlign: 'center' }} title="기 = 기획안 제출일, 완 = 완성본 제출일">일정 <span style={{ fontWeight: 500, opacity: 0.75 }}>(기/완)</span></div>}
            {!compact && <div style={{ width: '50px', textAlign: 'center' }}>피드백</div>}
            <div style={{ width: '56px', textAlign: 'center' }}>드라이브</div>
          </div>

          {/* 상시 묶음 — 희망일이 없어 특정 달에 속하지 않는 콘텐츠.
              어느 달을 보든 목록 맨 위에서 펼쳐 볼 수 있다(요청 반영). */}
          {alwaysContents.length > 0 && (
            <div style={{ padding: '0 12px' }}>
              <button
                type="button"
                onClick={() => setShowAlways(v => !v)}
                aria-expanded={showAlways}
                className="w-full flex items-center gap-2 px-3 py-2 mt-2 rounded-xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-[12px] font-black text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors"
              >
                <span style={{ transform: showAlways ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▸</span>
                <span>상시</span>
                <span className="font-bold text-slate-500 dark:text-slate-400">({alwaysContents.length}건)</span>
                <span className="ml-auto font-medium text-[11px] text-slate-500 dark:text-slate-400">
                  희망일 없이 언제든 나갈 수 있는 콘텐츠
                </span>
              </button>
              {showAlways && <div style={{ paddingTop: '4px' }}>{alwaysContents.map(renderRow)}</div>}
            </div>
          )}

          {/* List Body */}
          <div style={{ flex: '1', backgroundColor: 'transparent' }}>
            {filteredContents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="text-2xl mb-2">📅</div>
                <div className="text-slate-600 dark:text-slate-400 font-bold text-sm">
                  {calActiveDate ? `${calActiveDate}에 해당하는 콘텐츠가 없습니다.` : '해당 월의 등록된 콘텐츠가 없습니다.'}
                </div>
                {clickedDate && setClickedDate && (
                  <button
                    onClick={() => setClickedDate(null)}
                    className="mt-3 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    전체 목록 보기
                  </button>
                )}
              </div>
            ) : (
              <div style={{ padding: '0 12px 12px 12px' }}>
            {filteredContents.map(renderRow)}
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

  // 날씨는 기본으로 켜 둔다(요청 반영) — 날짜 칸 배경색은 막대 아래에 깔리는
  // 얕은 색이라 일정을 읽는 데 방해가 되지 않고, 매번 켜 줘야 하는 쪽이 번거로웠다.
  // 토글로 끄는 동작은 그대로다.
  const [weatherView, setWeatherView] = useState(true);
  // 달력에 마우스를 올리면 달력 컬럼이 넓어져 리스트와 반반이 된다(요청 반영).
  // 달력에서 벗어나거나 리스트로 옮겨 가면 기본 비율로 돌아온다.
  const [calendarWide, setCalendarWide] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // 상태를 두 갈래로 나눈다(요청 반영).
  //  ① 날짜: 날짜 칸을 호버(calHoveredDate)하거나 클릭(clickedDate)하면 오른쪽 목록을
  //     그 날짜의 콘텐츠로 좁힌다 — 기존 기능 그대로다.
  //  ② 콘텐츠: 목록 행이나 캘린더 막대에 마우스를 올리면 그 "콘텐츠"가 호버 대상이 되어,
  //     캘린더에서는 그 막대만, 목록에서는 그 행만 남고 나머지가 흐려진다.
  // 둘은 서로 다른 개념이라 한 상태로 합치면 안 된다 — 예전엔 합쳐져 있어서 기간
  // 콘텐츠를 호버하면 그 기간에 겹친 다른 콘텐츠까지 전부 함께 강조됐다.
  const [calHoveredDate, setCalHoveredDate] = useState<string | null>(null);
  const [clickedDate, setClickedDate] = useState<string | null>(null);
  const [hoveredContent, setHoveredContent] = useState<HoveredContent | null>(null);

  // 달력에서 발생한 활성 날짜 (달력 호버 또는 클릭) — 목록 필터링의 기준
  const calActiveDate = clickedDate || calHoveredDate;

  // Real-time Smooth Scroll-following inside container
  // (CSS sticky는 이 대시보드의 실제 스크롤 컨테이너가 window가 아닌 내부 div라
  //  동작하지 않아, 실제 스크롤 가능한 조상을 찾아 따라가는 JS transform 방식으로 복원)
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

  // Real-time Weather Integration with Open-Meteo API
  // 달력 한 판을 칠하려면 예보만으로는 모자란다 — 이번 달 지난 날짜도 색이
  // 있어야 하므로 과거 10일치를 함께 받는다(모바일과 같은 범위).
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setWeatherLoading(true);
        // Yonsei University Sinchon campus (Latitude: 37.5598, Longitude: 126.9385)
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=37.5598&longitude=126.9385&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&past_days=10&forecast_days=16&timezone=Asia%2FSeoul'
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
          <span className="bg-white/90 dark:bg-slate-800/90 rounded-md px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
            {month + 1}월 현황
          </span>
          
          {/* 날씨 토글 — 눌렀을 때만 아래 캡슐과 달력 칸 날씨 배경색이 켜진다. */}
          <button
            type="button"
            onClick={() => setWeatherView(v => !v)}
            aria-pressed={weatherView}
            title={weatherView ? '날씨 끄기' : '날씨 보기'}
            className={`motion-btn motion-scale flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black shadow-2xs cursor-pointer transition-[box-shadow,transform] ${
              weatherView
                ? 'bg-[#002454] text-white'
                : 'bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200'
            }`}
          >
            <span>🌤️</span>
            <span>날씨</span>
          </button>

          {/* Weather Widget Capsule */}
          {weatherView && (
          <div className="flex items-center gap-2 backdrop-blur-xl bg-white/90 dark:bg-slate-800/90 rounded-full px-3.5 py-1 text-xs text-slate-700 dark:text-slate-200 font-bold shadow-2xs">
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
          )}
        </div>

        {/* Prev / Next Page Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button 
            onClick={handlePrev} 
            title="이전 달"
            className="motion-btn motion-scale w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer transition-[box-shadow,transform]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button 
            onClick={handleNext} 
            title="다음 달"
            className="motion-btn motion-scale w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer transition-[box-shadow,transform]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
      
      {/* Single Month Calendar & Content Table View */}
      {/* 창 너비와 무관하게 항상 좌우 2열 사이드바 레이아웃을 유지한다. 캘린더 컬럼은
          내부 스크롤/높이 제한 없이 실제 크기 그대로 렌더링되고, JS transform으로
          페이지 스크롤을 따라 내려온다(sticky는 이 페이지의 스크롤 컨테이너 구조상 동작하지 않음). */}
      <div
        ref={containerRef}
        className="grid gap-4 sm:gap-6 items-start"
        style={{
          // 기본 minmax(320px, 380px)와 호버 시 minmax(320px, 50%)는 둘 다 같은
          // 형태라 브라우저가 폭을 보간할 수 있다 — 1fr로 바꾸면 뚝 끊긴다.
          gridTemplateColumns: calendarWide ? 'minmax(320px, 50%) 1fr' : 'minmax(320px, 380px) 1fr',
          transition: 'grid-template-columns 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          ref={calendarRef}
          onMouseEnter={() => setCalendarWide(true)}
          onMouseLeave={() => setCalendarWide(false)}
          style={{
            transform: `translateY(${translateY}px)`,
            transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
            willChange: 'transform'
          }}
        >
          <ContinuousCalendar
            contents={rawContents}
            baseYear={year}
            baseMonth={month}
            weather={weather}
            weatherView={weatherView}
            hoveredDate={calHoveredDate}
            clickedDate={clickedDate}
            setHoveredDate={setCalHoveredDate}
            setClickedDate={setClickedDate}
            hoveredContent={hoveredContent}
            setHoveredContent={setHoveredContent}
            expanded={calendarWide}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        </div>
        <div className="min-w-0" onMouseEnter={() => setCalendarWide(false)}>
          <MonthTable
            year={year}
            month={month}
            myContents={rawContents}
            calActiveDate={calActiveDate}
            clickedDate={clickedDate}
            setClickedDate={setClickedDate}
            hoveredContent={hoveredContent}
            setHoveredContent={setHoveredContent}
            compact={calendarWide}
            allProfiles={allProfiles}
          />
        </div>
      </div>
    </div>
  );
}
