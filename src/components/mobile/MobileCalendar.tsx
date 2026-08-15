'use client';

import React, { useState } from 'react';

interface MobileCalendarProps {
  contents: any[];
  allProfiles?: any[];
  onOpenDetail: (item: any, type: 'proposal' | 'final') => void;
  // 날짜팝업(캘린더2) 안의 콘텐츠 카드 탭 전용 — Figma 캘린더4/5(기획안/완성본
  // 미리보기)와 동일하게, 곧장 전체화면이 아니라 peek 상태로 상세보기를 연다.
  onOpenPeek: (item: any, type: 'proposal' | 'final') => void;
}

const parseBody = (item: any) => {
  try {
    if (item.content_body && item.content_body.startsWith('{')) {
      return JSON.parse(item.content_body);
    }
  } catch (e) {}
  return {};
};

export default function MobileCalendar({ contents, allProfiles = [], onOpenDetail, onOpenPeek }: MobileCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date()); // Defaults to Today's current date
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate()); // Defaults to Today's day number
  const [activeStep, setActiveStep] = useState<'main' | 'date_popup'>('main');
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid'); // View Mode Toggle: Grid vs List
  // 팝업 안에서는 "날짜"가 스와이프 단위다 — 한 날짜의 콘텐츠 여러 개는 세로로
  // 나열하고, 좌우 스와이프는 콘텐츠가 있는 다음/이전 "날짜"로 넘어간다(빈 날짜는
  // 건너뜀). 예: 15일 2개 / 17일 1개 있으면 16일은 스와이프에서 그냥 지나침.
  const [popupDateIndex, setPopupDateIndex] = useState(0);
  const popupScrollRef = React.useRef<HTMLDivElement>(null);

  // 슬라이드가 컨테이너 전체 너비가 아니라 80%만 차지하고 다음/이전 카드가 양옆으로
  // 살짝 비쳐 보이는 "peek 카러셀"이라, clientWidth 기준 나눗셈으로는 인덱스를 정확히
  // 못 구한다 — 실제 자식 요소들의 위치를 재서 현재 스크롤 중심에 가장 가까운
  // 슬라이드를 직접 찾는다(패딩/간격 값이 바뀌어도 항상 정확함).
  const handlePopupScroll = () => {
    const el = popupScrollRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let closestIdx = 0;
    let closestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const dist = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center);
      if (dist < closestDist) { closestDist = dist; closestIdx = i; }
    });
    setPopupDateIndex(closestIdx);
  };

  const scrollPopupTo = (idx: number) => {
    const el = popupScrollRef.current;
    if (!el) return;
    const target = el.children[idx] as HTMLElement | undefined;
    if (!target) return;
    el.scrollTo({ left: target.offsetLeft - (el.clientWidth - target.clientWidth) / 2, behavior: 'smooth' });
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

  // Helper for prev/next month
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
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
  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date().getDate());
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

  const selectedDateStr = displayDay
    ? new Date(year, month, displayDay).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
    : '날짜를 선택하세요';

  const selectedDayItems = displayDay ? getEventsForDay(displayDay) : [];

  return (
    <div className="space-y-4 pb-28 text-slate-900 select-none">
      
      {/* ========================================================= */}
      {/* STATE 1: 캘린더 메인 (월간 캘린더 & 조절 바) — Timeblocks 참고 캡처처럼 흰색
          카드 배경 위에 얹힌 형태가 아니라, 셸의 기본 배경(<main>) 위에 캘린더가
          직접 구성되도록 카드 스타일(bg-white/rounded-3xl/shadow/border)을 제거했다. */}
      {/* ========================================================= */}
      <div className="space-y-4">

        {/* Top Controls: Year/Month Range Dropdowns & View Toggle —
            flex-wrap so 360px-wide phones reflow to two lines instead of clipping */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5">
            {/* Year Range Dropdown */}
            <select
              value={year}
              onChange={handleYearChange}
              className="w-auto bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003378]/50"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>

            {/* Month Range Dropdown */}
            <select
              value={month}
              onChange={handleMonthChange}
              className="w-auto bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003378]/50"
            >
              {monthNames.map((mName, idx) => (
                <option key={idx} value={idx}>{mName}</option>
              ))}
            </select>
          </div>

          {/* Action Buttons: View Toggle & Today */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewType(viewType === 'grid' ? 'list' : 'grid')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors border border-slate-200 flex items-center gap-1 whitespace-nowrap"
            >
              <span>{viewType === 'grid' ? '📋 리스트 보기' : '📅 달력 보기'}</span>
            </button>

            <button
              onClick={handleToday}
              className="px-3 py-1.5 bg-[#C0CFE4] text-[#003378] rounded-xl text-xs font-black hover:bg-[#AFC2DC] transition-colors border border-[#C0CFE4] whitespace-nowrap"
            >
              Today
            </button>
          </div>
        </div>

        {/* Prev / Next Month Navigator */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {year}년 {month + 1}월 일정표
            </h2>
            <div className="text-xs text-slate-400 font-bold mt-0.5">총 {monthEvents.length}개 콘텐츠</div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold transition-colors text-sm"
            >
              ‹
            </button>
            <button
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold transition-colors text-sm"
            >
              ›
            </button>
          </div>
        </div>

        {/* 좌우 스와이프로 월 이동 — grid/list 뷰 공통 */}
        <div onPointerDown={handleMonthSwipeStart} onPointerUp={handleMonthSwipeEnd} className="space-y-4">
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
                한 화면에 다 안 들어가면 세로 스크롤(<main>이 이미 지원)로 본다. */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, idx) => {
                if (!cell.day) {
                  return <div key={idx} className="min-h-[5.5rem] bg-slate-50/40 rounded-lg" />;
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
                    className={`min-h-[5.5rem] p-1 rounded-lg flex flex-col gap-0.5 transition-all cursor-pointer overflow-hidden ${
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

                return (
                  <div
                    key={item.id || idx}
                    onClick={() => onOpenDetail(item, isFinal ? 'final' : 'proposal')}
                    className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 hover:bg-[#C0CFE4]/25 hover:border-[#C0CFE4] transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-center flex-shrink-0 w-11 h-11 flex items-center justify-center bg-white border border-slate-200 rounded-xl">
                        <div className="text-base font-black text-slate-900">{targetDate ? targetDate.slice(8) : '--'}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate leading-snug">{item.title}</div>
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
        <div
          className="fixed inset-0 z-50 bg-white/75 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-200"
          onClick={() => setActiveStep('main')}
        >
          <div 
            className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 space-y-4 max-h-[80vh] overflow-y-auto animate-in zoom-in-95 duration-200 shadow-2xl border border-slate-100"
            onClick={e => e.stopPropagation()}
          >
            {/* Popup Header with Date & Weather Icon — 좌우 화살표는 콘텐츠가 있는
                다음/이전 "날짜"로 이동(빈 날짜는 건너뜀), 스와이프와 동일한 동작 */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <button
                onClick={() => scrollPopupTo(Math.max(0, popupDateIndex - 1))}
                disabled={!tappedDayHasContent || popupDateIndex === 0}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0 disabled:opacity-30"
              >
                ‹
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate">{selectedDateStr}</h3>
                <span className="text-lg flex-shrink-0">⛅</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => scrollPopupTo(Math.min(datesWithContent.length - 1, popupDateIndex + 1))}
                  disabled={!tappedDayHasContent || popupDateIndex === datesWithContent.length - 1}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm disabled:opacity-30"
                >
                  ›
                </button>
                <button
                  onClick={() => setActiveStep('main')}
                  className="text-slate-400 font-bold hover:text-slate-600 text-lg pl-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 날짜 단위 스와이프 캐러셀(Figma: 팝업 카드 스와이프는 "날짜"를 넘기는
                것이었다 — 한 날짜의 콘텐츠 여러 개는 세로로 나열, 좌우 스와이프는
                콘텐츠가 있는 다음/이전 날짜로 이동하고 빈 날짜는 건너뛴다) */}
            {tappedDayHasContent ? (
              <>
                {/* Figma 조사 기록(캘린더2/3): 카드가 화면을 꽉 채우는 게 아니라 다음/이전
                    날짜 카드가 양옆으로 살짝 비쳐 보이는 peek 카러셀 구조 — 슬라이드 폭을
                    "컨테이너 100% - 6rem"으로 고정해 남는 6rem이 좌우 peek로 자연스럽게
                    나뉘도록 한다(퍼센트 padding+퍼센트 width를 같이 쓰면 서로 다른
                    기준(부모 vs 컨테이너 content box)에 대해 계산되어 중첩 축소되는
                    버그가 있어 고정 단위로 전환). 첫/마지막 슬라이드에만 같은 6rem의
                    절반(ml-12/mr-12)을 여백으로 줘서, 스냅 센터링이 끝 슬라이드까지도
                    똑같이 가운데로 당겨올 수 있는 스크롤 여유 공간을 확보한다. */}
                <div className="-mx-5">
                  <div
                    ref={popupScrollRef}
                    onScroll={handlePopupScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-3"
                  >
                    {datesWithContent.map((day, dateIdx) => {
                      const dayItems = getEventsForDay(day);
                      return (
                        <div
                          key={day}
                          className={`flex-shrink-0 snap-center ${dateIdx === 0 ? 'ml-12' : ''} ${dateIdx === datesWithContent.length - 1 ? 'mr-12' : ''}`}
                          style={{ width: 'calc(100% - 6rem)' }}
                        >
                          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5">
                            {dayItems.map((item, idx) => {
                              const isFinal = item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';
                              return (
                                <div
                                  key={item.id || idx}
                                  onClick={() => {
                                    setActiveStep('main');
                                    onOpenPeek(item, isFinal ? 'final' : 'proposal');
                                  }}
                                  className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 hover:bg-[#C0CFE4]/25 hover:border-[#C0CFE4] transition-all cursor-pointer active:scale-[0.99] shadow-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-[#C0CFE4] text-[#003378] flex items-center justify-center text-xs font-black">
                                      {item.team ? item.team.slice(0, 1) : '인'}
                                    </span>
                                    <span className={`px-2.5 py-0.5 text-white text-xs font-black rounded-md ${
                                      isFinal ? 'bg-[#00A859]' : 'bg-[#FFB800]'
                                    }`}>
                                      {isFinal ? '완성본' : '기획안'}
                                    </span>
                                  </div>

                                  <div className="text-sm font-bold text-slate-900 leading-snug">{item.title}</div>
                                  <div className="text-xs text-slate-500 font-medium">
                                    {item.content_type || '기사'} • {item.author_name} ({item.team || '팀'})
                                  </div>
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
                  <div className="flex items-center justify-center gap-1.5">
                    {datesWithContent.map((day, i) => (
                      <button
                        key={day}
                        onClick={() => scrollPopupTo(i)}
                        className={`h-1.5 rounded-full transition-all ${i === popupDateIndex ? 'w-4 bg-[#002454]' : 'w-1.5 bg-slate-200'}`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl font-medium">
                이 날짜에 등록된 콘텐츠가 없습니다.
              </div>
            )}

            <button
              onClick={() => setActiveStep('main')}
              className="w-full py-3.5 bg-[#002454] text-white font-extrabold rounded-xl text-xs hover:bg-blue-900 transition-colors shadow-md"
            >
              닫기 ( Today 캘린더로 돌아가기 )
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
