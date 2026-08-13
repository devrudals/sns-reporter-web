'use client';

import React, { useState } from 'react';

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
    }, 400);
  };

  const getBadgeStyle = (typeStr: string) => {
    switch (typeStr) {
      case '영상(롱폼)':
      case '영상(숏폼)': return 'bg-blue-100 text-blue-800 border-blue-200';
      case '카드뉴스': return 'bg-sky-100 text-sky-800 border-sky-200';
      case '글 기사':
      case '기사': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-3 pb-24 text-slate-900 select-none">
      {/* 1. Top Header & Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 tracking-tight">전체 리스트</h2>
          <span className="text-xs text-slate-400 font-bold">총 {filteredContents.length}개</span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="제목, 작성자, 팀 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
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
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all text-[11px] ${
                selectedFilter === filter.value
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. List Items Container */}
      <div className="space-y-2">
        {displayedItems.length > 0 ? (
          displayedItems.map((item, idx) => {
            const isFinal = item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';
            return (
              <div
                key={item.id || idx}
                onClick={() => onOpenDetail(item, isFinal ? 'final' : 'proposal')}
                className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 space-y-2 active:scale-[0.99] transition-transform cursor-pointer"
              >
                {/* Badges Row */}
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-md font-bold border ${getBadgeStyle(item.content_type)}`}>
                      {item.content_type || '기사'}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded">
                      {item.team || '팀'}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    isFinal ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {isFinal ? '완성본' : '기획안'}
                  </span>
                </div>

                {/* Title */}
                <div className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                  {item.title}
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-50 pt-2">
                  <span className="font-semibold text-slate-600">{item.author_name}</span>
                  <span>{item.created_at ? item.created_at.split('T')[0] : ''}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center text-xs text-slate-400 border border-slate-100">
            검색 결과가 없습니다.
          </div>
        )}
      </div>

      {/* 3. Load More / Pagination Bar (전체 리스트 3) */}
      {displayedItems.length < filteredContents.length && (
        <div className="pt-2">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="w-full py-3 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl shadow-xs hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            {isLoadingMore ? (
              <span className="text-blue-600 font-extrabold animate-spin">⏳ 로딩 중...</span>
            ) : (
              <span>40개 로드 완료 (더보기 +)</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
