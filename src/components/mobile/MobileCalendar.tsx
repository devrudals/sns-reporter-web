'use client';

import React, { useState } from 'react';

interface MobileCalendarProps {
  contents: any[];
  allProfiles?: any[];
  onOpenDetail: (item: any, type: 'proposal' | 'final') => void;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function MobileCalendar({ contents, allProfiles = [], onOpenDetail }: MobileCalendarProps) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [activePopup, setActivePopup] = useState<boolean>(true);
  const [previewMode, setPreviewMode] = useState<'none' | 'proposal_preview' | 'final_preview'>('none');
  const [previewItem, setPreviewItem] = useState<any>(null);

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

  const selectedDateStr = selectedDay ? `${MONTH_NAMES[month].slice(0, 3)} ${selectedDay}, ${year}` : '';
  const selectedDayItems = selectedDay ? getItemsForDay(selectedDay) : [];

  return (
    <div className="space-y-4 pb-24 text-slate-900 select-none">
      {/* 1. Calendar Header & Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/70 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              {MONTH_NAMES[month]} {year}
            </h2>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-black rounded-full">
              {month + 1}월
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center font-extrabold text-sm"
            >
              ‹
            </button>
            <button 
              onClick={() => {
                const now = new Date();
                setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelectedDay(now.getDate());
              }}
              className="px-3 py-1.5 rounded-lg bg-[#002454] text-white font-black text-xs"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center font-extrabold text-sm"
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

        {/* Calendar Days Grid (Cell height 72px) */}
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
                    setActivePopup(true);
                  }
                }}
                className={`min-h-[70px] p-1 rounded-xl flex flex-col items-center justify-between transition-all cursor-pointer ${
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

      {/* 2. Selected Date Items Sheet */}
      {activePopup && selectedDay && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-200/70 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2.5">
              <span className="text-lg font-black text-slate-900">{selectedDateStr}</span>
              <span className="text-xs px-2.5 py-0.5 bg-blue-50 text-blue-700 font-extrabold rounded-full">
                {selectedDayItems.length}건 등록됨
              </span>
            </div>
            <button 
              onClick={() => setActivePopup(false)}
              className="text-xs text-slate-400 font-bold hover:text-slate-600"
            >
              닫기 ✕
            </button>
          </div>

          {/* Cards for Selected Date */}
          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {selectedDayItems.length > 0 ? (
              selectedDayItems.map((item, idx) => {
                const isFinal = item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';
                return (
                  <div 
                    key={item.id || idx} 
                    className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 text-white text-xs font-black rounded ${
                        isFinal ? 'bg-emerald-600' : 'bg-amber-500'
                      }`}>
                        {isFinal ? '완성본' : '기획안'}
                      </span>
                      <span className="text-xs text-slate-500 font-bold">{item.team}</span>
                    </div>

                    <div className="text-sm font-bold text-slate-900 leading-snug">{item.title}</div>
                    <div className="text-xs text-slate-500">작성자: {item.author_name} ({item.content_type})</div>
                    
                    <div className="flex gap-2 pt-1">
                      <button 
                        onClick={() => {
                          setPreviewItem(item);
                          setPreviewMode('proposal_preview');
                        }}
                        className="flex-1 py-2 bg-blue-50 text-blue-800 font-bold text-xs rounded-lg border border-blue-100"
                      >
                        기획안 미리보기
                      </button>
                      <button 
                        onClick={() => {
                          setPreviewItem(item);
                          setPreviewMode('final_preview');
                        }}
                        className="flex-1 py-2 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-100"
                      >
                        완성본 미리보기
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl font-medium">
                이 날짜에 등록된 콘텐츠가 없습니다.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Real Item Preview Modal (Centered Window) */}
      {previewMode !== 'none' && previewItem && (
        <div 
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewMode('none')}
        >
          <div 
            className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 space-y-4 max-h-[80vh] overflow-y-auto animate-in zoom-in-95 duration-200 shadow-2xl border border-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-black ${
                previewMode === 'final_preview' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {previewMode === 'final_preview' ? '완성본 미리보기' : '기획안 미리보기'}
              </span>
              <button onClick={() => setPreviewMode('none')} className="text-slate-400 font-bold text-lg hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3.5 text-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                {previewItem.title}
              </h3>
              
              <div className="text-xs text-slate-500 font-medium">
                {previewItem.team} • {previewItem.author_name} ({previewItem.content_type})
              </div>

              {previewMode === 'final_preview' && (previewItem.final_url) && (
                <div className="p-3.5 bg-gradient-to-r from-[#002454] to-blue-800 text-white rounded-xl text-xs space-y-1">
                  <div className="font-bold">구글 드라이브 / URL</div>
                  <div className="underline truncate break-all">{previewItem.final_url}</div>
                </div>
              )}

              {previewItem.intent && (
                <div className="bg-slate-50 p-3.5 rounded-xl border text-xs space-y-1">
                  <div className="font-bold text-slate-700">기획 의도</div>
                  <p className="text-slate-600 leading-relaxed font-normal">{
                    typeof previewItem.intent === 'string'
                      ? previewItem.intent.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim()
                      : previewItem.intent
                  }</p>
                </div>
              )}

              <button 
                onClick={() => {
                  const type = previewMode === 'final_preview' ? 'final' : 'proposal';
                  const item = previewItem;
                  setPreviewMode('none');
                  onOpenDetail(item, type);
                }}
                className="w-full py-3.5 bg-[#002454] text-white font-bold rounded-xl text-sm shadow-md hover:bg-blue-900 transition-colors"
              >
                전체 상세보기 열기 ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
