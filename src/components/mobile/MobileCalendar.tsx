'use client';

import React, { useState, useEffect, useLayoutEffect } from 'react';
import { DriveColorIcon, DriveLockedIcon, DriveAddIcon } from './driveIcons';

interface MobileCalendarProps {
  contents: any[];
  allProfiles?: any[];
  // 그리드/리스트 전환 상태를 셸로 끌어올렸다 — 리스트뷰일 때만 셸의 하단 액션바를
  // 띄워야 하기 때문(MobileShell 참고).
  viewType: 'grid' | 'list';
  onViewTypeChange: (v: 'grid' | 'list') => void;
  // 리스트뷰 및 날짜팝업 공통 — 전체 리스트/대시보드와 동일한 선택 상태를 공유한다
  // (MobileFullList와 같은 selectedItem/onSelectItem 패턴). 날짜팝업에서 선택된
  // 콘텐츠는 이제(전체 리스트와 동일하게) 그 항목 블록 자체가 늘어나는 인라인
  // 확장으로 액션 아이콘을 보여준다 — 더 이상 셸의 플로팅 액션바를 쓰지 않는다.
  selectedItem: any;
  onSelectItem: (item: any) => void;
  // 날짜팝업이 열려있는지를 셸에 알린다(리스트뷰의 플로팅 액션바 노출 판단용 — 날짜팝업
  // 자체는 더 이상 그 플로팅바를 쓰지 않지만, 리스트뷰 전환 등 다른 판단에 여전히 쓰인다).
  onPopupOpenChange?: (open: boolean) => void;
  // 날짜팝업 인라인 확장 아이콘 3개(📋/드라이브상태/💬)가 쓰는 셸의 공용 핸들러 —
  // MobileFullList와 동일한 시그니처.
  user?: any;
  onOpenDetail: (item: any, type: 'proposal' | 'final') => void;
  onOpenSubmit: (mode: 'proposal' | 'final', targetItem?: any) => void;
  onOpenComments: (item: any) => void;
}

const parseBody = (item: any) => {
  try {
    if (item.content_body && item.content_body.startsWith('{')) {
      return JSON.parse(item.content_body);
    }
  } catch (e) {}
  return {};
};

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getPlatformIcon = (contentType: string) => {
  if (!contentType) return '📝';
  if (contentType.includes('영상') || contentType.includes('유튜브') || contentType.includes('릴스') || contentType.includes('숏폼')) return '🎬';
  if (contentType.includes('카드뉴스') || contentType.includes('인스타')) return '📸';
  if (contentType.includes('글') || contentType.includes('블로그')) return '✍️';
  return '📄';
};

export default function MobileCalendar({ contents, allProfiles = [], viewType, onViewTypeChange, selectedItem, onSelectItem, onPopupOpenChange, user, onOpenDetail, onOpenSubmit, onOpenComments }: MobileCalendarProps) {
  // 완성본 미업로드+권한 없음 상태에서 잠김 아이콘을 눌렀을 때 뜨는 안내 토스트 —
  // MobileFullList와 동일한 패턴.
  const [lockedToastVisible, setLockedToastVisible] = useState(false);
  useEffect(() => {
    if (!lockedToastVisible) return;
    const t = setTimeout(() => setLockedToastVisible(false), 1800);
    return () => clearTimeout(t);
  }, [lockedToastVisible]);
  const [currentDate, setCurrentDate] = useState(new Date()); // Defaults to Today's current date
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate()); // Defaults to Today's day number
  const [activeStep, setActiveStep] = useState<'main' | 'date_popup'>('main');
  // 팝업 안에서는 "날짜"가 스와이프 단위다 — 한 날짜의 콘텐츠 여러 개는 세로로
  // 나열하고, 좌우 스와이프는 콘텐츠가 있는 다음/이전 "날짜"로 넘어간다(빈 날짜는
  // 건너뜀). 예: 15일 2개 / 17일 1개 있으면 16일은 스와이프에서 그냥 지나침.
  const [popupDateIndex, setPopupDateIndex] = useState(0);
  // 이전엔 네이티브 가로 스크롤(overflow-x-auto + snap)로 카드를 넘겼는데, "스크롤
  // 느낌이 강하다"는 피드백으로 스크롤 자체를 없애고 transform 기반 스와이프로
  // 바꿨다 — popupViewportRef가 잘려 보이는 창(overflow-hidden), popupScrollRef가
  // 그 안에서 translateX로 움직이는 실제 카드 행이다. 자식 카드들의 offsetLeft는
  // (transform은 레이아웃에 영향을 주지 않으므로) 항상 정적 flex 레이아웃 기준 그대로라,
  // 이전 scrollPopupTo와 똑같은 중앙 정렬 계산식을 그대로 재사용할 수 있다.
  const popupViewportRef = React.useRef<HTMLDivElement>(null);
  const popupScrollRef = React.useRef<HTMLDivElement>(null);
  const [popupTranslateX, setPopupTranslateX] = useState(0);

  // useLayoutEffect(브라우저가 그리기 전에 동기 실행)라 팝업이 막 열렸을 때 "0(초기값)
  // 위치 → 올바른 위치"로 잘못된 좌표가 실제로 화면에 그려지는 순간 자체가 없다 —
  // 그 이후(스와이프/점/오늘 버튼으로) 인덱스가 바뀔 때만 진짜로 눈에 보이는
  // transform 전환(트랜지션)이 재생된다.
  useLayoutEffect(() => {
    const viewport = popupViewportRef.current;
    const row = popupScrollRef.current;
    const target = row?.children[popupDateIndex] as HTMLElement | undefined;
    if (!viewport || !target) return;
    setPopupTranslateX(-(target.offsetLeft - (viewport.clientWidth - target.clientWidth) / 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupDateIndex, activeStep]);

  // 월 스와이프와 동일한 관례: 드래그 중 위치를 따라가지 않고, 손을 뗐을 때 총
  // 이동량(dx)만 보고 한 칸(다음/이전 날짜)만 딱 잘라 넘긴다 — "블록에서 블록으로"
  // 이동한 느낌을 주는 핵심(연속적으로 끌리는 스크롤이 아니라 이산적인 스텝).
  const dateSwipeStart = React.useRef<{ x: number; y: number } | null>(null);
  const handleDateSwipeStart = (e: React.PointerEvent) => {
    dateSwipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const handleDateSwipeEnd = (e: React.PointerEvent) => {
    const start = dateSwipeStart.current;
    dateSwipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) setPopupDateIndex(i => Math.max(0, i - 1));
      else setPopupDateIndex(i => Math.min(datesWithContent.length - 1, i + 1));
    }
  };

  // 팝업 열림 여부를 셸에 알린다 — 셸의 공용 하단 액션바를 팝업(z-50 dim) 위로
  // 띄울지 판단하는 데 쓰인다.
  useEffect(() => {
    onPopupOpenChange?.(activeStep === 'date_popup');
  }, [activeStep, onPopupOpenChange]);

  // 웹 환경이라 브라우저 자체의 상하 스크롤(body/html)이 좌우 스와이프 제스처와
  // 종종 충돌한다는 피드백 — <main>에 준 overflow-hidden은 그리드뷰의 스크롤
  // "컨테이너" 자체만 잠그고, 날짜팝업은 그 밖(fixed inset-0)이라 전혀 영향을
  // 안 받았다. 또 모바일 브라우저는 CSS overflow와 별개로 터치 제스처의 첫 방향만
  // 보고 스크롤로 낚아채기도 한다 — document.body/html에 직접 overflow:hidden을
  // 걸어 페이지 레벨 스크롤 자체를 완전히 막는다(그리드뷰이거나 날짜팝업이
  // 열려있는 동안만, 벗어나면 원래 값으로 복원).
  useEffect(() => {
    const shouldLock = viewType === 'grid' || activeStep === 'date_popup';
    if (!shouldLock) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [viewType, activeStep]);

  // 다른 날짜 슬라이드로 넘어가면(스와이프든 "오늘로 이동"이든) 이전 날짜에서
  // 선택했던 항목이 화면 밖으로 사라지므로 선택도 함께 초기화한다 — 안 보이는
  // 항목을 대상으로 액션바가 뜬 채 남아있는 걸 방지.
  useEffect(() => {
    onSelectItem(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupDateIndex]);

  const closePopup = () => {
    setActiveStep('main');
    onSelectItem(null);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Rolling window instead of a hardcoded array so the dropdown never goes stale
  const todayYear = new Date().getFullYear();
  const yearOptions = [todayYear - 1, todayYear, todayYear + 1, todayYear + 2];

  const monthNames = [
    '1월 (Jan)', '2월 (Feb)', '3월 (Mar)', '4월 (Apr)', '5월 (May)', '6월 (Jun)',
    '7월 (Jul)', '8월 (Aug)', '9월 (Sep)', '10월 (Oct)', '11월 (Nov)', '12월 (Dec)'
  ];

  // 월 전환 모션 방향 — 다음 달로 가면(시간이 앞으로 흐르니) 새 달이 오른쪽에서
  // 들어오고, 이전 달로 가면 왼쪽에서 들어온다. 아래 렌더에서 이 값에 따라
  // slide-in-from-left/right 클래스를 고른다.
  const [monthEnterDir, setMonthEnterDir] = useState<'left' | 'right'>('right');

  // Helper for prev/next month
  const handlePrevMonth = () => {
    setMonthEnterDir('left');
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setMonthEnterDir('right');
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // 좌우 스와이프로도 월 이동 — 화살표 버튼과 동일한 동작을 제스처로 제공.
  const monthSwipeStart = React.useRef<{ x: number; y: number } | null>(null);
  const handleMonthSwipeStart = (e: React.PointerEvent) => {
    monthSwipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const handleMonthSwipeEnd = (e: React.PointerEvent) => {
    const start = monthSwipeStart.current;
    monthSwipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) handlePrevMonth();
      else handleNextMonth();
    }
  };
  // "Today"는 이제 단순히 오늘 날짜로 선택만 옮기는 게 아니라, 그 날짜를 탭했을 때와
  // 완전히 동일하게 날짜팝업을 바로 연다. datesWithContent는 지금 보고 있는(바뀌기
  // 전) 달 기준 렌더값이라, 다른 달을 보던 중이면 그대로 못 쓴다 — 오늘이 속한 달의
  // 콘텐츠 날짜 목록을 이 자리에서 다시 계산해 정확한 팝업 인덱스를 구한다.
  const handleToday = () => {
    const today = new Date();
    const ty = today.getFullYear();
    const tm = today.getMonth();
    const td = today.getDate();
    setCurrentDate(today);
    setSelectedDay(td);
    const datesForToday = Array.from(new Set(
      contents
        .map(item => {
          const bodyObj = parseBody(item);
          const targetDate = item.target_date || bodyObj.desiredDate || bodyObj.targetDate || item.created_at?.split('T')[0];
          if (!targetDate) return null;
          const prefix = `${ty}-${String(tm + 1).padStart(2, '0')}`;
          return targetDate.startsWith(prefix) ? Number(targetDate.split('-')[2]) : null;
        })
        .filter((d): d is number => d !== null)
    )).sort((a, b) => a - b);
    setPopupDateIndex(Math.max(0, datesForToday.indexOf(td)));
    setActiveStep('date_popup');
  };
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(Number(e.target.value), month, 1));
  };
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(year, Number(e.target.value), 1));
  };

  // Days calculation
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Grid cells (padding prev month days)
  const calendarCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push({ day: null, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({ day: d, isCurrentMonth: true });
  }

  // Filter events for day
  const getEventsForDay = (dayNum: number) => {
    const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return contents.filter(item => {
      const bodyObj = parseBody(item);
      const targetDate = item.target_date || bodyObj.desiredDate || bodyObj.targetDate || item.created_at?.split('T')[0];
      return targetDate === targetDateStr;
    });
  };

  // Filter events for entire current month (List View) — 날짜순 정렬까지 하려면
  // 필터와 정렬 둘 다에서 같은 날짜 추출 로직이 필요해 헬퍼로 뺐다.
  const getEventDateStr = (item: any) => {
    const bodyObj = parseBody(item);
    return item.target_date || bodyObj.desiredDate || bodyObj.targetDate || item.created_at?.split('T')[0] || '';
  };
  const monthEvents = contents
    .filter(item => {
      const targetDate = getEventDateStr(item);
      if (!targetDate) return false;
      const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
      return targetDate.startsWith(prefix);
    })
    .sort((a, b) => getEventDateStr(a).localeCompare(getEventDateStr(b)));

  // 이번 달에서 콘텐츠가 있는 날짜만 오름차순으로 — 팝업 좌우 스와이프가 넘나드는 단위.
  const datesWithContent = Array.from(
    new Set(
      monthEvents
        .map(item => {
          const bodyObj = parseBody(item);
          const targetDate = item.target_date || bodyObj.desiredDate || bodyObj.targetDate || item.created_at?.split('T')[0];
          return targetDate ? Number(targetDate.split('-')[2]) : null;
        })
        .filter((d): d is number => d !== null)
    )
  ).sort((a, b) => a - b);

  const tappedDayHasContent = selectedDay !== null && datesWithContent.includes(selectedDay);
  const displayDay = tappedDayHasContent
    ? datesWithContent[Math.min(popupDateIndex, datesWithContent.length - 1)]
    : selectedDay;

  const selectedDayItems = displayDay ? getEventsForDay(displayDay) : [];

  return (
    <div className="space-y-4 pb-28 text-slate-900 select-none">
      
      {/* ========================================================= */}
      {/* STATE 1: 캘린더 메인 (월간 캘린더 & 조절 바) — Timeblocks 참고 캡처처럼 흰색
          카드 배경 위에 얹힌 형태가 아니라, 셸의 기본 배경(<main>) 위에 캘린더가
          직접 구성되도록 카드 스타일(bg-white/rounded-3xl/shadow/border)을 제거했다. */}
      {/* ========================================================= */}
      <div className="space-y-4">

        {/* Top Controls: Year/Month Range Dropdowns & View Toggle — 각자 독립된
            글래스 조각(다른 화면들과 동일한 "해체된 글래스" 관례)이고, main의
            스크롤 컨테이너 상단에 sticky로 고정해 그리드/리스트를 내려도 계속
            보인다. "n월 일정표" 제목·좌우 화살표 내비게이터는 요청대로 제거 —
            월 이동은 이 바의 드롭다운과 아래 좌우 스와이프 제스처로 충분하다. */}
        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-y-2 gap-x-2 py-1">
          <div className="flex items-center gap-1.5">
            {/* Year Range Dropdown */}
            <select
              value={year}
              onChange={handleYearChange}
              className="glass-cta w-auto rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003378]/50"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>

            {/* Month Range Dropdown */}
            <select
              value={month}
              onChange={handleMonthChange}
              className="glass-cta w-auto rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003378]/50"
            >
              {monthNames.map((mName, idx) => (
                <option key={idx} value={idx}>{mName}</option>
              ))}
            </select>
          </div>

          {/* Action Buttons: View Toggle & Today */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onViewTypeChange(viewType === 'grid' ? 'list' : 'grid')}
              className="glass-cta px-2.5 py-1.5 rounded-xl text-xs font-black text-slate-700 flex items-center gap-1 whitespace-nowrap active:scale-95 transition-transform"
            >
              <span>{viewType === 'grid' ? '📋 리스트 보기' : '📅 달력 보기'}</span>
            </button>

            <button
              onClick={handleToday}
              className="glass-cta-sky px-3 py-1.5 rounded-xl text-xs font-black text-[#003378] whitespace-nowrap active:scale-95 transition-transform"
            >
              Today
            </button>
          </div>
        </div>

        {/* 좌우 스와이프로 월 이동 — grid/list 뷰 공통. `key`를 연/월로 걸어 달이
            바뀔 때마다 이 서브트리를 통째로 재마운트시키고, 그 순간 tailwindcss-animate의
            enter 애니메이션(슬라이드+페이드)이 자동으로 재생된다 — 부드럽게 스크롤되는
            느낌이 아니라 "블록이 옆에서 들어와 자리 잡는" 느낌을 내려는 의도(요청:
            Figma Smart Animate "Gentle" 정도, 과하지 않게). 스크롤 자체가 필요 없다는
            요청에 맞춰 이 화면은(그리드뷰일 때) 셸의 <main>도 overflow-hidden으로
            잠근다(MobileShell 참고) — 상하 스크롤 없이 좌우 스와이프로만 달을 넘긴다. */}
        <div
          key={`${year}-${month}`}
          onPointerDown={handleMonthSwipeStart}
          onPointerUp={handleMonthSwipeEnd}
          className={`space-y-4 animate-in fade-in duration-200 ease-out ${monthEnterDir === 'left' ? 'slide-in-from-left-8' : 'slide-in-from-right-8'}`}
          style={{ touchAction: 'pan-x' }}
        >
        {/* GRID VIEW MODE */}
        {viewType === 'grid' ? (
          <>
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-100 pb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <span key={d} className={`text-xs font-extrabold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-[#003378]' : 'text-slate-400'}`}>
                  {d}
                </span>
              ))}
            </div>

            {/* Calendar Days Grid — Timeblocks 스타일 참고로 재구성: 정사각형 셀 대신
                세로로 넉넉한 셀에 이벤트를 꽉 찬 너비의 막대(pill)로 여러 개 쌓아
                보여준다(기존엔 aspect-square + 최대 2개 축소 뱃지라 가독성이 떨어졌음).
                한 화면에 다 안 들어가면 세로 스크롤(<main>이 이미 지원)로 본다.
                셀 높이는 min-height가 아니라 고정 height다 — min-height를 쓰면 CSS
                grid가 각 행(row) 트랙 높이를 그 행에서 가장 이벤트 많은 셀의 콘텐츠에
                맞춰 자동으로 늘리고, 기본 align-items:stretch 때문에 같은 행의 다른
                셀들까지 전부 그 늘어난 높이로 따라 늘어난다(실측: 이벤트 3개짜리
                날짜가 있던 마지막 줄만 88px→98px로 비정상적으로 커졌었음) — 고정
                height + overflow-hidden으로 모든 셀이 콘텐츠 양과 무관하게 항상
                같은 크기를 유지하도록 했다. */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, idx) => {
                if (!cell.day) {
                  return <div key={idx} className="h-[6.25rem] bg-slate-50/40 rounded-lg" />;
                }

                const dayEvents = getEventsForDay(cell.day);
                const isSelected = selectedDay === cell.day;
                const dayOfWeek = (firstDayOfWeek + cell.day - 1) % 7;
                const isSunday = dayOfWeek === 0;
                const isSaturday = dayOfWeek === 6;
                const visibleEvents = dayEvents.slice(0, 3);
                const moreCount = dayEvents.length - visibleEvents.length;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (cell.isCurrentMonth) {
                        setSelectedDay(cell.day);
                        const idx = datesWithContent.indexOf(cell.day);
                        setPopupDateIndex(idx >= 0 ? idx : 0);
                        setActiveStep('date_popup');
                      }
                    }}
                    className={`h-[6.25rem] p-1 rounded-lg flex flex-col gap-0.5 transition-all cursor-pointer overflow-hidden ${
                      !cell.isCurrentMonth ? 'opacity-30' : 'hover:bg-slate-50'
                    } ${isSelected ? 'bg-[#C0CFE4]/50 ring-2 ring-[#003378] shadow-xs' : ''}`}
                  >
                    {/* Day Number — Figma spec uses Inter specifically for the calendar grid numerals.
                        Timeblocks처럼 좌측 상단에 작게 배치해 아래 이벤트 막대들이 넓게 쓰이게 한다. */}
                    <span style={{ fontFamily: 'Inter, sans-serif' }} className={`text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'bg-[#002454] text-white'
                        : isSunday
                        ? 'text-red-500'
                        : isSaturday
                        ? 'text-[#003378]'
                        : 'text-slate-800'
                    }`}>
                      {cell.day}
                    </span>

                    {/* DB Event Bars — 꽉 찬 너비 막대로, 최대 3개 + 남은 개수 표시 */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      {visibleEvents.map((item, i) => {
                        const isFinal = item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';
                        return (
                          <div
                            key={i}
                            className={`w-full text-white text-[8.5px] font-bold px-1 py-[3px] rounded truncate leading-tight ${
                              isFinal ? 'bg-[#00A859]' : 'bg-[#FFB800]'
                            }`}
                          >
                            {item.title}
                          </div>
                        );
                      })}
                      {moreCount > 0 && (
                        <div className="text-[8px] text-slate-400 font-bold px-1">+{moreCount}개</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* LIST VIEW MODE */
          <div className="space-y-2.5 pt-2">
            {monthEvents.length > 0 ? (
              monthEvents.map((item, idx) => {
                const isFinal = item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';
                const bodyObj = parseBody(item);
                const targetDate = item.target_date || bodyObj.desiredDate || item.created_at?.split('T')[0];
                const hasDriveLink = !!(item.final_url || (item.content_body && item.content_body.includes('http')));
                const isSelected = selectedItem?.id === item.id;

                return (
                  <div
                    key={item.id || idx}
                    onClick={() => onSelectItem(isSelected ? null : item)}
                    className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.99] border ${
                      isSelected ? 'bg-[#EAF2FF] border-[#002454] ring-2 ring-[#002454]/20' : 'bg-slate-50 border-slate-200/80 hover:bg-[#C0CFE4]/25 hover:border-[#C0CFE4]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-center flex-shrink-0 w-11 h-11 flex items-center justify-center bg-white border border-slate-200 rounded-xl">
                        <div className="text-base font-black text-slate-900">{targetDate ? targetDate.slice(8) : '--'}</div>
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-bold truncate leading-snug ${isSelected ? 'text-[#002454]' : 'text-slate-900'}`}>{item.title}</div>
                        <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                          {item.team || '팀'} • {item.author_name} ({item.content_type})
                        </div>
                      </div>
                    </div>

                    {isFinal && hasDriveLink && (
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-blue-700 shadow-2xs flex-shrink-0" title="Google Drive Link">
                        <svg className="w-4 h-4" viewBox="0 0 87.3 78">
                          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl font-medium">
                {year}년 {month + 1}월에 등록된 콘텐츠 스케줄이 없습니다.
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* STATE 2: 캘린더 2 (선택 일자 팝업 / 바텀시트) */}
      {/* ========================================================= */}
      {activeStep === 'date_popup' && selectedDay && (
        // Figma 실제 프레임("캘린더 2(팝업)", 841:80023)을 스크린샷으로 다시 대조한
        // 결과 — 헤더 바(화살표+X)와 흰 카드로 감싼 하나의 팝업 쉘이 아니라, 날짜/날씨
        // 라벨이 카드 밖에 독립적으로 떠 있고 "카드 자체가 곧 그 날짜"인 구조였다.
        // 별도 닫기 버튼도 없다 — 배경(Dim)을 탭하면 닫히고, Today 버튼을 누르면
        // 오늘 날짜 카드로 곧장 이동한다. 날짜/날씨 라벨은 화면 기준 왼쪽 정렬이
        // 아니라 "그 날짜 카드 자신의" 좌상단에 위치해야 한다는 피드백으로, 카드
        // 밖 공용 요소가 아니라 각 날짜 카드 내부(및 빈 상태 박스 내부) 첫 줄로
        // 옮겼다 — 카드가 스와이프로 넘어가면 라벨도 자연히 그 카드와 함께 움직인다.
        <div
          className="fixed inset-0 z-50 bg-white/75 backdrop-blur-xs flex flex-col items-center justify-center gap-3 transition-opacity duration-200 overscroll-none"
          onClick={closePopup}
          style={{ touchAction: 'none' }}
        >
          {tappedDayHasContent ? (
            <>
              {/* 카드가 화면을 꽉 채우는 게 아니라 다음/이전 날짜 카드가 양옆으로 아주
                  살짝(Figma 실측 기준 한 20px 안팎) 비쳐 보이는 peek 카러셀 — 슬라이드
                  폭을 "컨테이너 100% - 2.75rem"으로 고정해 남는 여백이 좌우 peek로
                  자연스럽게 나뉘도록 한다. 흰 카드 스타일은(예전엔 팝업 전체를 감싸던
                  바깥 셸에 있었던 것을) 이제 각 날짜 슬라이드 자신에게 준다 — "하나의
                  블록이 하나의 날짜"라 카드 자체가 곧 그 날짜의 콘텐츠 목록이다.
                  popupViewportRef(바깥, overflow-hidden으로 잘리는 창)와 popupScrollRef
                  (안쪽, translateX로 옆 카드로 옮겨가는 실제 행) 두 겹 구조 — 네이티브
                  스크롤을 완전히 없애고 스와이프(아래 handleDateSwipe*)로만 카드를
                  넘긴다("스크롤 느낌이 강하다"는 피드백 반영). */}
              <div
                ref={popupViewportRef}
                className="w-full max-w-sm sm:max-w-md overflow-hidden"
                onClick={e => e.stopPropagation()}
                onPointerDown={handleDateSwipeStart}
                onPointerUp={handleDateSwipeEnd}
                style={{ touchAction: 'pan-x' }}
              >
                <div
                  ref={popupScrollRef}
                  className="flex items-start gap-3"
                  style={{
                    transform: `translateX(${popupTranslateX}px)`,
                    transition: 'transform 0.28s cubic-bezier(0.22,1.1,0.36,1)',
                  }}
                >
                  {datesWithContent.map((day, dateIdx) => {
                    const dayItems = getEventsForDay(day);
                    return (
                      <div
                        key={day}
                        className={`flex-shrink-0 bg-white rounded-3xl shadow-2xl border border-slate-100 h-[60vh] overflow-y-auto ${dateIdx === 0 ? 'ml-5' : ''} ${dateIdx === datesWithContent.length - 1 ? 'mr-5' : ''}`}
                        style={{ width: 'calc(100% - 2.75rem)' }}
                      >
                        {/* Figma 원본(컴포넌트 863:18256)의 행 구조: 아이콘+제목/부제
                            한 줄짜리 컴팩트한 행 + 그 아래 최근 피드백 한 줄(점 구분자) —
                            실제 discussions 데이터가 있을 때만 피드백 줄을 보여준다.
                            탭하면 곧장 미리보기를 여는 대신, 대시보드/전체 리스트와
                            동일하게 "선택"만 한다 — 선택된 항목의 기획안/완성본
                            상세보기·업로드 버튼은 셸의 공용 하단 액션바가 그린다
                            (아래 items-start: 이 날짜 카드가 콘텐츠 개수가 다른 옆
                            날짜 카드와 같은 flex row에 있다 보니, 기본 align-items
                            stretch 때문에 콘텐츠가 적은 카드까지 옆 카드 높이만큼
                            빈 여백으로 늘어나 보이던 문제를 막는다). */}
                        <div className="p-4 space-y-2">
                          {/* 날짜/날씨 라벨 — 이 카드 자신의 날짜 기준, 카드 좌상단(패딩
                              바로 안쪽) 첫 줄. "요일, 월-날짜" 영문 축약형, 왼쪽 정렬. */}
                          <div className="flex items-center gap-1.5 pb-1">
                            <h3 className="text-lg font-black text-slate-900 tracking-tight truncate">
                              {WEEKDAYS_EN[new Date(year, month, day).getDay()]}, {MONTHS_EN[month]}-{day}
                            </h3>
                            <span className="text-lg flex-shrink-0">⛅</span>
                          </div>
                          {dayItems.map((item, idx) => {
                            const isFinal = item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';
                            const hasDriveLink = !!(item.final_url || (item.content_body && item.content_body.includes('http')));
                            const bodyObj = parseBody(item);
                            const discussions = Array.isArray(bodyObj.discussions) ? bodyObj.discussions : [];
                            const latestFeedback = discussions.length > 0 ? discussions[discussions.length - 1] : null;
                            const isItemSelected = selectedItem?.id === item.id;
                            let authorEmail = '';
                            try { authorEmail = JSON.parse(item.content_body || '{}').authorEmail || ''; } catch {}
                            return (
                              <div
                                key={item.id || idx}
                                onClick={() => onSelectItem(isItemSelected ? null : item)}
                                className={`rounded-2xl overflow-hidden transition-all cursor-pointer active:scale-[0.99] shadow-xs border ${
                                  isItemSelected
                                    ? 'bg-[#EAF2FF] border-[#002454] ring-2 ring-[#002454]/20'
                                    : 'bg-slate-50 border-slate-200/80 hover:bg-[#C0CFE4]/25 hover:border-[#C0CFE4]'
                                }`}
                              >
                                <div className="p-3 flex items-center gap-2.5">
                                  <span className="text-lg flex-shrink-0">{getPlatformIcon(item.content_type)}</span>
                                  <div className="min-w-0 flex-1">
                                    <div className={`text-sm font-bold truncate leading-snug ${isItemSelected ? 'text-[#002454]' : 'text-slate-900'}`}>{item.title}</div>
                                    <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                                      {item.content_type || '기사'} - {item.author_name} ({item.team || '팀'})
                                    </div>
                                  </div>
                                  {/* 기획안/완성본 구분은 텍스트 배지가 아니라 다른 화면들과
                                      동일하게 드라이브 아이콘 유무로만 — 선택 전(비확장)
                                      상태에서만 정보성으로 표시. */}
                                  {!isItemSelected && isFinal && hasDriveLink && (
                                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center flex-shrink-0" title="Google Drive Link">
                                      <DriveColorIcon className="w-3.5 h-3.5" />
                                    </div>
                                  )}
                                </div>
                                {latestFeedback && (
                                  <div className="px-3 pb-2.5 pt-2 border-t border-slate-200/70 flex items-start gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1 flex-shrink-0" />
                                    <span className="text-[11px] text-slate-500 leading-snug line-clamp-1">
                                      {latestFeedback.type === 'final' ? '완성본' : '기획안'} - {latestFeedback.text}
                                    </span>
                                  </div>
                                )}
                                {/* 선택 시 인라인 확장 — 전체 리스트와 완전히 동일한 3버튼
                                    구조(📋/완성본 상태별/💬), flex-1로 균등 분배. 더 이상
                                    셸의 플로팅 액션바에 의존하지 않는다. */}
                                {isItemSelected && (() => {
                                  const isAdminUser = user?.email === 'admin@admin.com' || user?.user_metadata?.is_admin === true;
                                  const isOwnContent = !!(user?.email && authorEmail && user.email === authorEmail);
                                  const canManage = isAdminUser || isOwnContent;
                                  return (
                                    <div className="px-3 pb-3 pt-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => onOpenDetail(item, 'proposal')}
                                        className="flex-1 h-10 rounded-lg bg-[#FFF6E0] border border-[#FFE1A0] flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                                        title="기획안 상세보기"
                                      >
                                        <span className="text-lg">📋</span>
                                      </button>
                                      {isFinal && hasDriveLink ? (
                                        <button
                                          onClick={() => onOpenDetail(item, 'final')}
                                          className="flex-1 h-10 rounded-lg bg-[#EBF3FF] border border-[#C0CFE4] flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                                          title="완성본 상세보기"
                                        >
                                          <DriveColorIcon />
                                        </button>
                                      ) : canManage ? (
                                        <button
                                          onClick={() => onOpenSubmit('final', item)}
                                          className="flex-1 h-10 rounded-lg bg-[#F4F5F7] border border-slate-200 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                                          title="완성본 업로드"
                                        >
                                          <DriveAddIcon />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => setLockedToastVisible(true)}
                                          className="flex-1 h-10 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                                          title="완성본이 아직 업로드되지 않았습니다"
                                        >
                                          <DriveLockedIcon />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => onOpenComments(item)}
                                        className="flex-1 h-10 rounded-lg bg-[#F4F5F7] border border-slate-200 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                                        title="코멘트"
                                      >
                                        <span className="text-base">💬</span>
                                      </button>
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {datesWithContent.length > 1 && (
                <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                  {datesWithContent.map((day, i) => (
                    <button
                      key={day}
                      onClick={() => setPopupDateIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${i === popupDateIndex ? 'w-4 bg-[#002454]' : 'w-1.5 bg-slate-200'}`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div
              className="mx-5 p-4 bg-white rounded-2xl font-medium shadow-xl border border-slate-100"
              onClick={e => e.stopPropagation()}
            >
              {displayDay && (
                <div className="flex items-center gap-1.5 pb-1">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight truncate">
                    {WEEKDAYS_EN[new Date(year, month, displayDay).getDay()]}, {MONTHS_EN[month]}-{displayDay}
                  </h3>
                  <span className="text-lg flex-shrink-0">⛅</span>
                </div>
              )}
              <div className="py-6 text-center text-xs text-slate-400">
                이 날짜에 등록된 콘텐츠가 없습니다.
              </div>
            </div>
          )}

          {/* Today 버튼 — 날짜 카드(또는 빈 상태 카드) 바로 아래, 중앙 정렬로 상시
              노출한다(요청: 콘텐츠 유무와 무관하게 항상 접근 가능해야 함). 상단 스티키
              바의 "Today"와 같은 재질·라벨을 써서 같은 기능(handleToday)의 지름길임을
              시각적으로도 알 수 있게 했다. */}
          <div className="flex justify-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={handleToday}
              className="glass-cta-sky px-3 py-1.5 rounded-xl text-xs font-black text-[#003378] active:scale-95 transition-transform"
            >
              Today
            </button>
          </div>

          {lockedToastVisible && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none px-8" onClick={e => e.stopPropagation()}>
              <div className="bg-black/85 text-white text-sm font-bold px-5 py-3 rounded-2xl text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
                완성본이 아직 업로드되지 않았습니다
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
