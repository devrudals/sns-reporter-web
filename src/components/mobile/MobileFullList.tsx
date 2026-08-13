'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface MobileFullListProps {
  contents: any[];
  onOpenDetail: (item: any, type: 'proposal' | 'final') => void;
}

export default function MobileFullList({ contents, onOpenDetail }: MobileFullListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [displayCount, setDisplayCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const filteredContents = contents.filter(item => {
    if (selectedFilter !== 'all') {
      if (item.team !== selectedFilter && item.content_type !== selectedFilter) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title?.toLowerCase().includes(q) ||
        item.author_name?.toLowerCase().includes(q) ||
        item.team?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const displayedItems = filteredContents.slice(0, displayCount);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayCount(prev => prev + 20);
      setIsLoadingMore(false);
    }, 300);
  };

  const getPlatformIcon = (contentType: string) => {
    if (!contentType) return '📝';
    if (contentType.includes('영상') || contentType.includes('유튜브') || contentType.includes('릴스') || contentType.includes('숏폼')) return '🎬';
    if (contentType.includes('카드뉴스') || contentType.includes('인스타')) return '📸';
    if (contentType.includes('글') || contentType.includes('블로그')) return '✍️';
    return '📄';
  };

  return (
    <div className="space-y-4 pb-28 text-slate-900 select-none relative min-h-[680px]">
      {/* 1. Top Header & Search Input (Figma Design 1~3) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/80 space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">전체 리스트</h2>
          <span className="text-xs text-slate-400 font-extrabold">총 {filteredContents.length}개</span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="제목, 작성자, 팀 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <span className="absolute left-3.5 top-3 text-slate-400 text-base">🔍</span>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { label: '전체', value: 'all' },
            { label: '유튜브', value: '유튜브' },
            { label: '인스타', value: '인스타' },
            { label: '블로그', value: '블로그' },
            { label: '카드뉴스', value: '카드뉴스' },
            { label: '영상', value: '영상(롱폼)' }
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => setSelectedFilter(filter.value)}
              className={`px-3.5 py-2 rounded-xl font-extrabold whitespace-nowrap transition-all text-xs ${
                selectedFilter === filter.value
                  ? 'bg-[#002454] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Content Item Rows List (Figma Design 1:1 Matching) */}
      <div className="space-y-2.5">
        {displayedItems.length > 0 ? (
          displayedItems.map((item, idx) => {
            const isFinal = item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';
            const hasDriveLink = !!(item.final_url || (item.content_body && item.content_body.includes('http')));

            return (
              <div
                key={item.id || idx}
                onClick={() => onOpenDetail(item, isFinal ? 'final' : 'proposal')}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 hover:border-blue-300 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Platform Icon Badge */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                    isFinal ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-900'
                  }`}>
                    {getPlatformIcon(item.content_type)}
                  </div>

                  {/* Title & Author Info */}
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-sm font-bold text-slate-900 leading-snug truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-500 font-medium truncate">
                      {item.content_type || '기사'} - {item.author_name} ({item.team || '팀'})
                    </div>
                  </div>
                </div>

                {/* Right Badge: Google Drive Icon Badge if Final Work */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isFinal && hasDriveLink && (
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 shadow-2xs" title="구글 드라이브 링크 포함">
                      {/* Google Drive Triangular Logo representation */}
                      <svg className="w-4 h-4 text-blue-600" viewBox="0 0 87.3 78" fill="currentColor">
                        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.55z" fill="#0066da"/>
                        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.45-1.2 3-1.2 4.55h27.5z" fill="#00ac47"/>
                        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.5-2.6 7.6-13.15c.8-1.45 1.2-3 1.2-4.55h-27.45l6.05 10.5z" fill="#ea4335"/>
                        <path d="m43.65 25 13.75-23.8c-1.4-.8-2.95-1.2-4.55-1.2h-18.4c-1.6 0-3.15.4-4.55 1.2z" fill="#00832d"/>
                        <path d="m59.8 43.1-16.15-28-16.15 28h32.3z" fill="#2684fc"/>
                        <path d="m73.55 76.8 13.75-23.8c.8-1.45 1.2-3 1.2-4.55 0-1.55-.4-3.1-1.2-4.55l-25.4-44c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 28.7 49.7z" fill="#ffba00"/>
                      </svg>
                    </div>
                  )}
                  <span className={`px-2.5 py-1 text-[11px] font-black rounded-lg ${
                    isFinal ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {isFinal ? '완성본' : '기획안'}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center text-sm text-slate-400 border border-slate-200/80">
            검색 결과가 없습니다.
          </div>
        )}
      </div>

      {/* 3. Infinite Loading / Load More Bar (Figma Design 3) */}
      {displayedItems.length < filteredContents.length && (
        <div className="pt-2">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="w-full py-3.5 bg-white border border-slate-200/80 text-slate-800 font-extrabold text-sm rounded-2xl shadow-xs hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            {isLoadingMore ? (
              <span className="text-blue-600 font-extrabold animate-spin">⏳ 로딩 중...</span>
            ) : (
              <span>40개 로드 완료 (더보기 +)</span>
            )}
          </button>
        </div>
      )}

      {/* 4. Bottom Floating Quick Action Buttons (기획안 작성 / 완성본 업로드 추가) */}
      <div className="absolute bottom-18 left-3.5 right-3.5 z-20 flex items-center gap-3">
        <Link 
          href="/proposals/submit"
          className="flex-1 py-3.5 px-4 bg-white text-blue-900 font-black text-sm rounded-xl shadow-lg border border-blue-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <span>✍️</span>
          <span>기획안 작성</span>
        </Link>
        <Link 
          href="/final-works/submit"
          className="flex-1 py-3.5 px-4 bg-[#002454] text-white font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <span>📤</span>
          <span>완성본 업로드</span>
        </Link>
      </div>
    </div>
  );
}
