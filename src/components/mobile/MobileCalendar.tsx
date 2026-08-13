'use client';

import React, { useState } from 'react';

interface MobileCalendarProps {
  contents: any[];
  allProfiles?: any[];
  onOpenDetail: (item: any, type: 'proposal' | 'final') => void;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const stripHtml = (htmlStr: any) => {
  if (!htmlStr || typeof htmlStr !== 'string') return htmlStr || '';
  return htmlStr
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
};

export default function MobileCalendar({ contents, allProfiles = [], onOpenDetail }: MobileCalendarProps) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  
  // States: 'main' | 'date_popup' | 'preview'
  const [activeStep, setActiveStep] = useState<'main' | 'date_popup' | 'preview'>('main');
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [previewTab, setPreviewTab] = useState<'proposal' | 'final'>('proposal');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    if (i < firstDay) {
      cells.push({ day: prevMonthDays - firstDay + i + 1, isCurrentMonth: false });
    } else if (i < firstDay + daysInMonth) {
      cells.push({ day: i - firstDay + 1, isCurrentMonth: true });
    } else {
      cells.push({ day: i - (firstDay + daysInMonth) + 1, isCurrentMonth: false });
    }
  }

  // Get items for a given day from real Supabase DB
  const getItemsForDay = (day: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const targetStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    
    return contents.filter(c => {
      const dateStr = c.created_at ? c.created_at.split('T')[0] : '';
      let bodyObj: any = {};
      try {
        if (c.content_body && c.content_body.startsWith('{')) {
          bodyObj = JSON.parse(c.content_body);
        }
      } catch (e) {}
      return dateStr === targetStr || bodyObj.desiredDate === targetStr || c.target_date === targetStr;
    });
  };

  const selectedDateStr = selectedDay ? `Wed, ${MONTH_NAMES[month].slice(0, 3)} ${selectedDay}` : '';
  const selectedDayItems = selectedDay ? getItemsForDay(selectedDay) : [];

  const parseBody = (item: any) => {
    if (!item) return {};
    try {
      if (item.content_body && item.content_body.startsWith('{')) {
        return JSON.parse(item.content_body);
      }
    } catch (e) {}
    return {};
  };

  return (
    <div className="space-y-4 pb-24 text-slate-900 select-none relative min-h-[680px]">
      {/* ========================================================= */}
      {/* STATE 1: 캘린더 1 (메인 월간 캘린더) */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/70 space-y-4">
        {/* Month Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {MONTH_NAMES[month]} {year}
            </h2>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 text-xs font-black rounded-full">
              {month + 1}월
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center font-extrabold text-sm"
            >
              ‹
            </button>
            <button 
              onClick={() => {
                const now = new Date();
                setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelectedDay(now.getDate());
              }}
              className="px-3 py-1.5 rounded-xl bg-[#002454] text-white font-black text-xs"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center font-extrabold text-sm"
            >
              ›
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-100 pb-2">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, idx) => (
            <span key={d} className={`text-xs font-black ${
              idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-600' : 'text-slate-400'
            }`}>
              {d}
            </span>
          ))}
        </div>

        {/* Calendar Grid (Cell height 72px) */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            const dayEvents = cell.isCurrentMonth ? getItemsForDay(cell.day) : [];
            const isSelected = cell.isCurrentMonth && selectedDay === cell.day;
            const isSunday = idx % 7 === 0;
            const isSaturday = idx % 7 === 6;

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
                            isFinal ? 'bg-emerald-600' : 'bg-blue-600'
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
      </div>

      {/* ========================================================= */}
      {/* STATE 2: 캘린더 2 (선택 일자 팝업 / 바텀시트) */}
      {/* ========================================================= */}
      {activeStep === 'date_popup' && selectedDay && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-200"
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
                  const bodyObj = parseBody(item);
                  return (
                    <div 
                      key={item.id || idx}
                      onClick={() => {
                        setPreviewItem(item);
                        setPreviewTab('proposal');
                        setActiveStep('preview');
                      }}
                      className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 hover:bg-slate-100/80 transition-all cursor-pointer active:scale-[0.99] shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-black">
                            {item.team ? item.team.slice(0, 1) : '인'}
                          </span>
                          <span className={`px-2.5 py-0.5 text-white text-xs font-black rounded-md ${
                            isFinal ? 'bg-emerald-600' : 'bg-amber-500'
                          }`}>
                            {isFinal ? '완성본' : '기획안'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-bold">터치하여 보기 ➔</span>
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
              className="w-full py-3 bg-slate-100 text-slate-700 font-extrabold rounded-xl text-xs hover:bg-slate-200 transition-colors"
            >
              ← Today 캘린더로 돌아가기
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STATE 3: 캘린더 4 / 캘린더 5 (기획안 / 완성본 미리보기 스와이프 모달) */}
      {/* ========================================================= */}
      {activeStep === 'preview' && previewItem && (
        <div 
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-200"
          onClick={() => setActiveStep('date_popup')}
        >
          <div 
            className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100"
            onClick={e => e.stopPropagation()}
          >
            {/* Top Swipe Instruction Banner (Figma 1:1 Design) */}
            <div className="bg-[#002454] px-4 py-2.5 text-white flex items-center justify-between text-xs font-extrabold">
              <span>{previewTab === 'proposal' ? '📝 기획안 미리보기' : '🎬 완성본 미리보기'}</span>
              <button 
                onClick={() => setPreviewTab(previewTab === 'proposal' ? 'final' : 'proposal')}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold transition-all flex items-center gap-1"
              >
                <span>{previewTab === 'proposal' ? '오른쪽으로 스와이프 (완성본) ➔' : '← 왼쪽으로 스와이프 (기획안)'}</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4.5 text-slate-800 flex-1">
              <div className="flex items-center justify-between border-b pb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-black ${
                  previewTab === 'final' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {previewTab === 'final' ? '완성본' : '기획안'}
                </span>
                <button onClick={() => setActiveStep('date_popup')} className="text-slate-400 font-bold text-lg hover:text-slate-600">✕</button>
              </div>

              {/* Title & Author */}
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-snug">{previewItem.title}</h3>
                <div className="text-xs text-slate-500 font-medium mt-1">
                  작성자: {previewItem.author_name} / {previewItem.created_at ? previewItem.created_at.split('T')[0] : ''}
                </div>
              </div>

              {/* Category Badges Row (Figma Design) */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <span className="text-xs font-bold text-slate-500">콘텐츠 분류:</span>
                <span className="px-2.5 py-1 bg-white border rounded-lg text-xs font-bold text-slate-800">{previewItem.team || '유튜브'}</span>
                <span className="px-2.5 py-1 bg-white border rounded-lg text-xs font-bold text-slate-800">{previewItem.content_type || '카드뉴스'}</span>
              </div>

              {/* Crew / Participants Circles (Figma Design) */}
              {allProfiles.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-800">참여인원 (크루)</div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {allProfiles.slice(0, 5).map((p, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-[#002454] text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-xs">
                          {p.author_name ? p.author_name.slice(0, 2) : '기자'}
                        </div>
                        <span className="text-[9px] font-bold text-slate-600 mt-0.5">{p.author_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Intent / Description */}
              {previewItem.intent && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 text-xs space-y-1">
                  <div className="font-bold text-slate-800">기획 의도 및 배경</div>
                  <p className="text-slate-600 leading-relaxed font-normal">{stripHtml(previewItem.intent)}</p>
                </div>
              )}

              {previewItem.description && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 text-xs space-y-1">
                  <div className="font-bold text-slate-800">구성 및 내용 설명</div>
                  <p className="text-slate-600 leading-relaxed font-normal">{stripHtml(previewItem.description)}</p>
                </div>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button 
                onClick={() => onOpenDetail(previewItem, previewTab)}
                className="w-full py-3.5 bg-[#002454] text-white font-extrabold rounded-xl text-sm shadow-md hover:bg-blue-900 transition-colors flex items-center justify-center gap-2"
              >
                <span>전체 상세보기 (시스템 바로가기)</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
