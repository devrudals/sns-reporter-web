'use client';

import React, { useState } from 'react';

interface MobileCalendarProps {
  contents: any[];
  allProfiles?: any[];
  onOpenDetail: (item: any, type: 'proposal' | 'final') => void;
}

const parseBody = (item: any) => {
  try {
    if (item.content_body && item.content_body.startsWith('{')) {
      return JSON.parse(item.content_body);
    }
  } catch (e) {}
  return {};
};

export default function MobileCalendar({ contents, allProfiles = [], onOpenDetail }: MobileCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date()); // Defaults to Today's current date
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate()); // Defaults to Today's day number
  const [activeStep, setActiveStep] = useState<'main' | 'date_popup'>('main');
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid'); // View Mode Toggle: Grid vs List

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

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

  // Filter events for entire current month (List View)
  const monthEvents = contents.filter(item => {
    const bodyObj = parseBody(item);
    const targetDate = item.target_date || bodyObj.desiredDate || bodyObj.targetDate || item.created_at?.split('T')[0];
    if (!targetDate) return false;
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return targetDate.startsWith(prefix);
  });

  const selectedDateStr = selectedDay
    ? new Date(year, month, selectedDay).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
    : '날짜를 선택하세요';

  const selectedDayItems = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="space-y-4 pb-28 text-slate-900 select-none">
      
      {/* ========================================================= */}
      {/* STATE 1: 캘린더 메인 (월간 캘린더 & 조절 바) */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200/80 space-y-4 font-['Pretendard']">
        
        {/* Top Controls: Year/Month Range Dropdowns & View Toggle */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5">
            {/* Year Range Dropdown */}
            <select
              value={year}
              onChange={handleYearChange}
              className="bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>

            {/* Month Range Dropdown */}
            <select
              value={month}
              onChange={handleMonthChange}
              className="bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors border border-slate-200 flex items-center gap-1"
            >
              <span>{viewType === 'grid' ? '📋 리스트 보기' : '📅 달력 보기'}</span>
            </button>

            <button
              onClick={handleToday}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-black hover:bg-blue-100 transition-colors border border-blue-200"
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

        {/* GRID VIEW MODE */}
        {viewType === 'grid' ? (
          <>
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-100 pb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <span key={d} className={`text-xs font-extrabold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-600' : 'text-slate-400'}`}>
                  {d}
                </span>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell, idx) => {
                if (!cell.day) {
                  return <div key={idx} className="h-16 bg-slate-50/50 rounded-xl" />;
                }

                const dayEvents = getEventsForDay(cell.day);
                const isSelected = selectedDay === cell.day;
                const dayOfWeek = (firstDayOfWeek + cell.day - 1) % 7;
                const isSunday = dayOfWeek === 0;
                const isSaturday = dayOfWeek === 6;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (cell.isCurrentMonth) {
                        setSelectedDay(cell.day);
                        setActiveStep('date_popup');
                      }
                    }}
                    className={`min-h-[72px] p-1 rounded-xl flex flex-col items-center justify-between transition-all cursor-pointer ${
                      !cell.isCurrentMonth ? 'opacity-30' : 'hover:bg-slate-50'
                    } ${isSelected ? 'bg-blue-50/90 ring-2 ring-blue-600 shadow-xs' : ''}`}
                  >
                    {/* Day Number */}
                    <span className={`text-xs sm:text-sm font-black w-7 h-7 rounded-full flex items-center justify-center ${
                      isSelected 
                        ? 'bg-[#002454] text-white' 
                        : isSunday 
                        ? 'text-red-500' 
                        : isSaturday 
                        ? 'text-blue-600' 
                        : 'text-slate-800'
                    }`}>
                      {cell.day}
                    </span>

                    {/* DB Event Badges */}
                    <div className="w-full space-y-0.5 mt-0.5">
                      {dayEvents.length > 0 ? (
                        dayEvents.slice(0, 2).map((item, i) => {
                          const isFinal = item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';
                          return (
                            <div 
                              key={i} 
                              className={`w-full text-white text-[9px] font-bold px-1 py-0.5 rounded truncate text-center ${
                                isFinal ? 'bg-[#00A859]' : 'bg-[#FFB800]'
                              }`}
                            >
                              {item.title}
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-4" />
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

                return (
                  <div
                    key={item.id || idx}
                    onClick={() => onOpenDetail(item, isFinal ? 'final' : 'proposal')}
                    className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-center flex-shrink-0 px-2.5 py-1 bg-white border border-slate-200 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-400">일정</div>
                        <div className="text-sm font-black text-slate-900">{targetDate ? targetDate.slice(8) : '--'}일</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate leading-snug">{item.title}</div>
                        <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                          {item.team || '팀'} • {item.author_name} ({item.content_type})
                        </div>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 text-xs font-black text-white rounded-lg flex-shrink-0 ${
                      isFinal ? 'bg-[#00A859]' : 'bg-[#FFB800]'
                    }`}>
                      {isFinal ? '완성본' : '기획안'}
                    </span>
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

      {/* ========================================================= */}
      {/* STATE 2: 캘린더 2 (선택 일자 팝업 / 바텀시트) */}
      {/* ========================================================= */}
      {activeStep === 'date_popup' && selectedDay && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-200 font-['Pretendard']"
          onClick={() => setActiveStep('main')}
        >
          <div 
            className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 space-y-4 max-h-[80vh] overflow-y-auto animate-in zoom-in-95 duration-200 shadow-2xl border border-slate-100"
            onClick={e => e.stopPropagation()}
          >
            {/* Popup Header with Date & Weather Icon */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedDateStr}</h3>
                <span className="text-lg">⛅</span>
              </div>
              <button 
                onClick={() => setActiveStep('main')}
                className="text-slate-400 font-bold hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            {/* List of Content Cards for Selected Date */}
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {selectedDayItems.length > 0 ? (
                selectedDayItems.map((item, idx) => {
                  const isFinal = item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';
                  return (
                    <div 
                      key={item.id || idx}
                      onClick={() => {
                        setActiveStep('main');
                        onOpenDetail(item, isFinal ? 'final' : 'proposal');
                      }}
                      className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer active:scale-[0.99] shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-black">
                            {item.team ? item.team.slice(0, 1) : '인'}
                          </span>
                          <span className={`px-2.5 py-0.5 text-white text-xs font-black rounded-md ${
                            isFinal ? 'bg-[#00A859]' : 'bg-[#FFB800]'
                          }`}>
                            {isFinal ? '완성본' : '기획안'}
                          </span>
                        </div>
                        <span className="text-xs text-blue-700 font-extrabold">전체 상세보기 ➔</span>
                      </div>

                      <div className="text-sm font-bold text-slate-900 leading-snug">{item.title}</div>
                      <div className="text-xs text-slate-500 font-medium">
                        {item.content_type || '기사'} • {item.author_name} ({item.team || '팀'})
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl font-medium">
                  이 날짜에 등록된 콘텐츠가 없습니다.
                </div>
              )}
            </div>

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
