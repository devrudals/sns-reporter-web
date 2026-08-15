'use client';

import React, { useState, useEffect } from 'react';

const getTypeIcon = (contentType: string) => {
  if (!contentType) return '📝';
  if (contentType.includes('영상') || contentType.includes('유튜브') || contentType.includes('릴스') || contentType.includes('숏폼')) return '🎬';
  if (contentType.includes('카드뉴스') || contentType.includes('인스타')) return '📸';
  if (contentType.includes('글') || contentType.includes('블로그')) return '✍️';
  return '📄';
};

interface MobileDashboardProps {
  contents: any[];
  notices: any[];
  deadlines?: any;
  allProfiles?: any[];
  onOpenDetail: (item: any, type: 'proposal' | 'final') => void;
  // 승인대기 항목/미리보기 캐러셀 탭 전용 — 상세보기 UI 그대로를 화면 69.2% 지점에서
  // peek 상태로 열고, 탭/스와이프업하면 전체화면으로 펼쳐진다(Figma peek 컴포넌트와 동일).
  onOpenPeek: (item: any, type: 'proposal' | 'final') => void;
  onNavigateToList: () => void;
}

export default function MobileDashboard({ contents, notices, deadlines = {}, allProfiles = [], onOpenDetail, onOpenPeek, onNavigateToList }: MobileDashboardProps) {
  const [showAllNotices, setShowAllNotices] = useState(false);

  // Calculate D-Day Helper
  const calcDDay = (dateStr: string | null) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length < 3) return null;
    const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'D-DAY';
    if (diff > 0) return `D-${diff}`;
    return `D+${Math.abs(diff)}`;
  };

  // Matches the PC dashboard's fallback convention (src/app/(authenticated)/dashboard/page.tsx):
  // an unconfigured deadline shows "미설정", never a fabricated D-day count.
  const proposalDDay = calcDDay(deadlines.proposalDeadline) ?? '미설정';
  const finalDDay = calcDDay(deadlines.finalDeadline) ?? '미설정';
  const proposalTitle = deadlines.proposalTitle || '26-1분기 (5월 콘텐츠)';
  const finalTitle = deadlines.finalTitle || '마감일 없음';

  // Real Database Contents Pending Approvals
  const pendingItems = contents.filter(c => 
    ['pending', 'revision', 'final_submitted', 'final_revision', 'approved'].includes(c.status)
  ).slice(0, 6);

  // Preview Carousel — cycles through pending items (falls back to latest content)
  const carouselItems = pendingItems.length > 0 ? pendingItems : contents.slice(0, 6);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const activeCarouselItem = carouselItems.length > 0 ? carouselItems[carouselIndex % carouselItems.length] : null;

  useEffect(() => {
    setCarouselIndex(0);
  }, [carouselItems.length]);

  useEffect(() => {
    if (carouselItems.length <= 1) return;
    const timer = setInterval(() => {
      setCarouselIndex(i => (i + 1) % carouselItems.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [carouselItems.length]);

  const openPreview = (item: any) => {
    const isFinal = item.status === 'final_submitted' || item.status === 'final_revision' || item.status === 'completed';
    onOpenPeek(item, isFinal ? 'final' : 'proposal');
  };

  return (
    <div className="space-y-4 text-slate-900 select-none">
      {/* 1. Top D-Day Banner Grid (Figma "디데이" component tokens: bg/text colors, 8px radius) */}
      <div className="grid grid-cols-2 gap-[0.6rem]">
        {/* Proposal Deadline Card */}
        <div className="bg-[#C0CFE4] p-3.5 rounded-lg shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] flex flex-col justify-between">
          <div className="text-[0.6rem] font-normal text-[#003378] tracking-wide">기획안 마감</div>
          <div className="text-[1.68rem] leading-tight font-semibold text-[#003378] my-1 tracking-tight">{proposalDDay}</div>
          <div className="text-[0.6rem] font-normal text-[#003378] truncate">{proposalTitle}</div>
        </div>

        {/* Final Work Deadline Card */}
        <div className="bg-[#003378] p-3.5 rounded-lg shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] flex flex-col justify-between">
          <div className="text-[0.6rem] font-normal text-[#FAFAFA] tracking-wide">완성본 마감</div>
          <div className="text-[1.68rem] leading-tight font-semibold text-[#FAFAFA] my-1 tracking-tight">{finalDDay}</div>
          <div className="text-[0.6rem] font-normal text-[#99B3D6] truncate">{finalTitle}</div>
        </div>
      </div>

      {/* 2. 승인 대기 중 Section */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/70 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-black text-base text-slate-900">승인 대기 중</span>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-black rounded-full">
              {pendingItems.length}
            </span>
          </div>
          <button onClick={onNavigateToList} className="text-xs font-extrabold text-slate-400 hover:text-blue-600">
            전체보기 ›
          </button>
        </div>

        <div className="space-y-2.5">
          {pendingItems.length > 0 ? (
            pendingItems.map((item, idx) => {
              const isFinal = item.status === 'final_submitted' || item.status === 'final_revision' || item.status === 'completed';
              const hasDriveLink = !!(item.final_url || (item.content_body && item.content_body.includes('http')));
              return (
                <div
                  key={item.id || idx}
                  onClick={() => openPreview(item)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer ${
                    isFinal
                      ? 'bg-emerald-50/70 border-emerald-200/80 hover:bg-emerald-50'
                      : 'bg-amber-50/70 border-amber-200/80 hover:bg-amber-50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate leading-snug">{item.title}</div>
                    <div className="text-xs font-medium text-slate-500 truncate mt-0.5">
                      {item.team || '팀'} • {item.author_name} ({item.content_type})
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
            <div className="p-5 bg-slate-50 rounded-xl text-center text-xs text-slate-400 font-medium">
              현재 대기 중인 항목이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 3. Preview Carousel — auto-advances through pending items every 4s, manual arrows,
          tap opens the peek drawer (Figma: 프리뷰 캐러셀 자동전환 + 수동 화살표 → 대시보드2/3 peek) */}
      {activeCarouselItem && (
        <div className="bg-white rounded-2xl p-[0.7rem] shadow-sm border border-slate-200/70">
          <div className="flex items-center gap-[0.7rem]">
            {/* Thumbnail with manual prev/next arrows */}
            <div
              onClick={() => openPreview(activeCarouselItem)}
              className="relative flex-shrink-0 w-[7.875rem] aspect-[126/201.6] rounded-lg overflow-hidden bg-gradient-to-br from-[#002454] via-indigo-700 to-purple-600 flex items-center justify-center text-4xl cursor-pointer"
            >
              <span key={activeCarouselItem.id || carouselIndex} className="animate-in fade-in zoom-in-95 duration-300">
                {getTypeIcon(activeCarouselItem.content_type)}
              </span>
              {carouselItems.length > 1 && (
                <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setCarouselIndex(i => (i - 1 + carouselItems.length) % carouselItems.length); }}
                    className="w-7 h-7 rounded-full bg-white/90 shadow-xs flex items-center justify-center text-[#2F80ED] text-xs font-black active:scale-90 transition-transform"
                  >
                    ‹
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCarouselIndex(i => (i + 1) % carouselItems.length); }}
                    className="w-7 h-7 rounded-full bg-white/90 shadow-xs flex items-center justify-center text-[#2F80ED] text-xs font-black active:scale-90 transition-transform"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            {/* Content column */}
            <div
              key={`content-${activeCarouselItem.id || carouselIndex}`}
              onClick={() => openPreview(activeCarouselItem)}
              className="min-w-0 flex-1 space-y-1.5 cursor-pointer animate-in fade-in duration-300"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#002454] text-white text-[9px] font-black flex items-center justify-center flex-shrink-0">
                  {activeCarouselItem.author_name ? activeCarouselItem.author_name.replace(/^\d+기\s*/, '').slice(0, 1) : '기'}
                </span>
                <span className="text-[0.6rem] font-medium text-slate-500 truncate">
                  {activeCarouselItem.team || 'SNS 기자단'} · {activeCarouselItem.author_name}
                </span>
              </div>
              <div className="text-[0.7rem] font-semibold text-[#383838] leading-snug line-clamp-2">
                {activeCarouselItem.title}
              </div>
              {activeCarouselItem.keywords && (
                <div className="text-[0.35rem] text-[#383838] truncate">
                  {String(activeCarouselItem.keywords).split(',').slice(0, 3).map((k: string) => `#${k.trim()}`).join(' ')}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons + dot indicators */}
          <div className="flex items-center gap-1.5 mt-[0.7rem]">
            <button
              onClick={() => onOpenDetail(activeCarouselItem, 'proposal')}
              className="glass-cta flex-1 py-2 text-[#002454] rounded-lg text-[0.6rem] font-bold flex items-center justify-center gap-1"
            >
              📄 기획안 보기
            </button>
            <button
              onClick={() => onOpenDetail(activeCarouselItem, 'final')}
              className="glass-cta-primary flex-1 py-2 text-white rounded-lg text-[0.6rem] font-bold flex items-center justify-center gap-1"
            >
              🎬 완성본 보기
            </button>
          </div>

          {carouselItems.length > 1 && (
            <div className="flex items-center justify-center gap-1 mt-2.5">
              {carouselItems.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCarouselIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === carouselIndex ? 'w-4 bg-[#002454]' : 'w-1.5 bg-slate-200'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. 공지사항 Section */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/70 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="font-black text-base text-slate-900">공지사항</span>
          <button onClick={() => setShowAllNotices(true)} className="text-xs font-extrabold text-slate-400 hover:text-blue-600">
            전체보기 ›
          </button>
        </div>

        <div className="space-y-2">
          {notices && notices.length > 0 ? (
            notices.slice(0, 4).map((notice, idx) => (
              <div key={notice.id || idx} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded flex-shrink-0">
                    공지
                  </span>
                  <span className="text-sm font-semibold text-slate-800 truncate">{notice.title}</span>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                  {notice.created_at ? notice.created_at.split('T')[0] : ''}
                </span>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">등록된 공지사항이 없습니다.</div>
          )}
        </div>
      </div>

      {/* Full Notices List Overlay — mobile has no dedicated notices tab, so
          "전체보기" opens an in-shell sheet instead of leaving to the PC /notices route */}
      {showAllNotices && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center" onClick={() => setShowAllNotices(false)}>
          <div
            className="w-full max-w-md bg-white rounded-t-3xl p-5 space-y-3 max-h-[75vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto" />
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900">공지사항 전체보기</h3>
              <button onClick={() => setShowAllNotices(false)} className="text-slate-400 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-2">
              {notices && notices.length > 0 ? (
                notices.map((notice, idx) => (
                  <div key={notice.id || idx} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded shrink-0">공지</span>
                      <span className="text-sm font-semibold text-slate-800 truncate">{notice.title}</span>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">
                      {notice.created_at ? notice.created_at.split('T')[0] : ''}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">등록된 공지사항이 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
