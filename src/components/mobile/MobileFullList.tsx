'use client';

import React, { useState, useEffect, useRef } from 'react';

interface MobileFullListProps {
  contents: any[];
  selectedItem: any;
  onSelectItem: (item: any) => void;
  // GNB 돋보기 아이콘을 누를 때마다 증가하는 카운터 — 필터 섹션을 펼치고 검색창에
  // 포커스를 준다(이미 펼쳐진 상태에서 다시 눌러도 재포커스되도록 boolean이 아닌 카운터).
  revealSearch?: number;
}

const parseBody = (item: any) => {
  try {
    if (item.content_body && item.content_body.startsWith('{')) {
      return JSON.parse(item.content_body);
    }
  } catch (e) {}
  return {};
};

const getTargetMonth = (item: any) => {
  const bodyObj = parseBody(item);
  const dateStr = item.target_date || bodyObj.desiredDate || bodyObj.targetDate || item.created_at;
  if (!dateStr) return null;
  const month = Number(String(dateStr).split('-')[1]);
  return Number.isFinite(month) && month >= 1 && month <= 12 ? month : null;
};

// Figma의 "월 선택 드롭다운" 컴포넌트(3variant로만 있던 것)를 전체 6개 2개월 구간으로 확장.
const BIMONTH_RANGES = [
  { label: '1, 2월', start: 1 },
  { label: '3, 4월', start: 3 },
  { label: '5, 6월', start: 5 },
  { label: '7, 8월', start: 7 },
  { label: '9, 10월', start: 9 },
  { label: '11, 12월', start: 11 },
];

// 팀(소속)과 콘텐츠 유형은 서로 다른 축이라 하나의 칩 목록에 섞여 있으면 헷갈린다 —
// 두 줄(소속 / 유형)로 나눠 AND 조건으로 함께 필터링한다.
const TEAM_FILTERS = [
  { label: '전체', value: 'all' },
  { label: '유튜브', value: '유튜브' },
  { label: '인스타', value: '인스타' },
  { label: '블로그', value: '블로그' },
];
const TYPE_FILTERS = [
  { label: '전체', value: 'all' },
  { label: '카드뉴스', value: '카드뉴스' },
  { label: '롱폼', value: '영상(롱폼)' },
  { label: '숏폼', value: '영상(숏폼)' },
  { label: '글 기사', value: '글 기사' },
];

export default function MobileFullList({ contents, selectedItem, onSelectItem, revealSearch }: MobileFullListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [bimonthStart, setBimonthStart] = useState<number | null>(null);
  const [showBimonthPicker, setShowBimonthPicker] = useState(false);
  const [displayCount, setDisplayCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // 검색바/달력 버튼/소속·유형 필터를 기본적으로 숨겨두고, GNB 돋보기 탭으로만 드러낸다.
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // GNB 돋보기를 다시 누르면(revealSearch 증가) 현재 열려있는지에 따라 토글한다 —
  // 열려 있었다면 닫고(+키보드 내리기), 닫혀 있었다면 연다(+포커스). 검색 input을
  // 조건부 마운트하지 않고 max-height로만 접어둔 덕분에(아래 JSX 참고) DOM에는 항상
  // 존재하므로, 별도 딜레이 없이 바로 focus/blur해도 안전하다.
  useEffect(() => {
    if (!revealSearch) return;
    setShowFilters(prev => !prev);
  }, [revealSearch]);

  // focus/blur는 상태 업데이터 함수 밖, 별도 effect에서 처리한다 — 업데이터 함수는
  // React가 Strict Mode에서 순수성 검증을 위해 두 번 호출할 수 있어 그 안에서 DOM
  // 부수효과(focus/blur)를 실행하면 안 된다. showFilters가 바뀐 "원인"과 무관하게
  // (GNB 토글이든 취소 버튼이든) 최종 값에 따라 한 곳에서만 포커스를 맞춘다.
  useEffect(() => {
    if (showFilters) searchInputRef.current?.focus();
    else searchInputRef.current?.blur();
  }, [showFilters]);

  const closeFilters = () => setShowFilters(false);

  const filteredContents = contents.filter(item => {
    if (selectedTeam !== 'all' && item.team !== selectedTeam) return false;
    if (selectedType !== 'all' && item.content_type !== selectedType) return false;
    if (bimonthStart !== null) {
      const m = getTargetMonth(item);
      if (m === null || (m !== bimonthStart && m !== bimonthStart + 1)) return false;
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
  const hasMore = displayedItems.length < filteredContents.length;

  // 리스트에서 콘텐츠를 선택하면 셸 레벨 하단 패널에 그 콘텐츠의 기획안/완성본
  // 축소 미리보기가 뜬다(MobileShell 참고). 선택된 항목이 필터링돼 사라지면
  // 보이는 첫 항목으로 다시 맞춘다.
  useEffect(() => {
    if (displayedItems.length === 0) {
      if (selectedItem) onSelectItem(null);
      return;
    }
    const stillVisible = selectedItem && displayedItems.some(i => i.id === selectedItem.id);
    if (!stillVisible) onSelectItem(displayedItems[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredContents.length, selectedTeam, selectedType, bimonthStart, searchQuery]);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Scroll-triggered auto-load (Figma: 리스트를 끝까지 당기면 로딩 화면으로 전환) —
  // reinterpreted for the web as an intersection-observed infinite scroll with
  // a real spinner, since a literal pull-to-refresh drag gesture conflicts with
  // native browser scroll on most mobile browsers.
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsLoadingMore(true);
        setTimeout(() => {
          setDisplayCount(prev => prev + 20);
          setIsLoadingMore(false);
        }, 500);
      }
    }, { rootMargin: '120px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  const getPlatformIcon = (contentType: string) => {
    if (!contentType) return '📝';
    if (contentType.includes('영상') || contentType.includes('유튜브') || contentType.includes('릴스') || contentType.includes('숏폼')) return '🎬';
    if (contentType.includes('카드뉴스') || contentType.includes('인스타')) return '📸';
    if (contentType.includes('글') || contentType.includes('블로그')) return '✍️';
    return '📄';
  };

  const activeBimonthLabel = bimonthStart !== null
    ? BIMONTH_RANGES.find(r => r.start === bimonthStart)?.label
    : null;

  return (
    <div className="space-y-4 text-slate-900 select-none relative">
      {/* 1. Header & Search Input — 검색바/달력 버튼/필터 칩은 기본 숨김, GNB 돋보기로만
          펼쳐진다(revealSearch). 조건부 마운트 대신 max-height로 접어서 input이 항상
          DOM에 존재하게 해야 펼친 직후 focus()가 실기기에서 안정적으로 키보드를 띄운다. */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">전체 리스트</h2>
          <span className="text-xs text-slate-400 font-extrabold">총 {filteredContents.length}개</span>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            showFilters ? 'max-h-[18rem] opacity-100 mt-3.5' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="space-y-3.5">
            {/* Search Bar + 분기별(2개월 단위) 달력 필터 아이콘 */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="제목, 작성자, 팀 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#F4F5F7] border border-slate-200/80 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <span className="absolute left-3.5 top-3 text-slate-400 text-base">🔍</span>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowBimonthPicker(v => !v)}
                  className={`w-[2.75rem] h-[2.75rem] rounded-xl flex items-center justify-center text-lg border transition-all flex-shrink-0 relative ${
                    bimonthStart !== null
                      ? 'bg-[#002454] border-[#002454] text-white'
                      : 'bg-[#F4F5F7] border-slate-200/80 text-slate-600'
                  }`}
                  title="분기별(2개월 단위) 보기"
                >
                  📅
                  {bimonthStart !== null && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#FFB800] border-2 border-white" />
                  )}
                </button>
                {showBimonthPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowBimonthPicker(false)} />
                    <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in zoom-in-95 duration-150">
                      <button
                        onClick={() => { setBimonthStart(null); setShowBimonthPicker(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${bimonthStart === null ? 'bg-blue-50 text-[#002454]' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        전체 기간
                      </button>
                      {BIMONTH_RANGES.map(range => (
                        <button
                          key={range.start}
                          onClick={() => { setBimonthStart(range.start); setShowBimonthPicker(false); }}
                          className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${bimonthStart === range.start ? 'bg-blue-50 text-[#002454]' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={closeFilters}
                className="text-xs font-extrabold text-slate-400 hover:text-blue-600 flex-shrink-0 px-1"
              >
                취소
              </button>
            </div>

            {activeBimonthLabel && (
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 bg-blue-50 text-[#002454] text-[11px] font-black rounded-lg flex items-center gap-1.5">
                  {activeBimonthLabel} 콘텐츠
                  <button onClick={() => setBimonthStart(null)} className="text-blue-400 hover:text-blue-700">✕</button>
                </span>
              </div>
            )}

            {/* Filter Chips — 소속(팀)과 유형(콘텐츠 종류)은 별개 축이라 두 줄로 나누고
                AND 조건으로 함께 적용한다 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                <span className="text-[10px] font-black text-slate-400 flex-shrink-0 w-8">소속</span>
                {TEAM_FILTERS.map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setSelectedTeam(filter.value)}
                    className={`px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition-all text-xs ${
                      selectedTeam === filter.value
                        ? 'bg-[#002454] text-white shadow-xs'
                        : 'bg-[#F4F5F7] text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[10px] font-black text-slate-400 flex-shrink-0 w-8">유형</span>
                {TYPE_FILTERS.map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setSelectedType(filter.value)}
                    className={`px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition-all text-xs ${
                      selectedType === filter.value
                        ? 'bg-[#00A859] text-white shadow-xs'
                        : 'bg-[#F4F5F7] text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Content Item Rows List — 탭하면 하단 패널에 미리보기가 뜬다(선택), 상세보기로
          바로 이동하지 않는다. 상세보기 진입은 하단 미리보기 카드를 눌러야 한다. */}
      <div className="space-y-2.5">
        {displayedItems.length > 0 ? (
          displayedItems.map((item, idx) => {
            const isFinal = item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';
            const hasDriveLink = !!(item.final_url || (item.content_body && item.content_body.includes('http')));
            const isSelected = selectedItem?.id === item.id;

            return (
              <div
                key={item.id || idx}
                onClick={() => onSelectItem(item)}
                className={`bg-white rounded-xl p-3.5 shadow-xs border transition-all active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected ? 'border-[#002454] ring-2 ring-[#002454]/20' : 'border-slate-200/80 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Platform Logo Badge */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                    isFinal ? 'bg-[#E8F8F0] text-[#00A859]' : 'bg-[#EBF3FF] text-[#002454]'
                  }`}>
                    {getPlatformIcon(item.content_type)}
                  </div>

                  {/* Title & Author / Team Info */}
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-sm font-bold text-slate-900 leading-snug truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-500 font-medium truncate">
                      {item.content_type || '기사'} - {item.author_name} ({item.team || '팀'})
                    </div>
                  </div>
                </div>

                {/* Right Badges: Google Drive logo + Status Pill */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isFinal && hasDriveLink && (
                    <div className="w-8 h-8 rounded-lg bg-[#F4F5F7] border border-slate-200/80 flex items-center justify-center text-blue-700 shadow-2xs" title="Google Drive Link">
                      <svg className="w-4 h-4" viewBox="0 0 87.3 78" fill="currentColor">
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
                    isFinal ? 'bg-[#00A859] text-white' : 'bg-[#FFB800] text-white'
                  }`}>
                    {isFinal ? '완성본' : '기획안'}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl p-8 text-center text-sm text-slate-400 border border-slate-200/80">
            검색 결과가 없습니다.
          </div>
        )}
      </div>

      {/* 3. Scroll-triggered auto-load sentinel with a real spinner */}
      {hasMore && (
        <div ref={sentinelRef} className="py-4 flex items-center justify-center">
          {isLoadingMore ? (
            <div className="w-6 h-6 rounded-full border-[3px] border-slate-200 border-t-[#002454] animate-spin" />
          ) : (
            <span className="text-xs text-slate-400 font-bold">{filteredContents.length - displayedItems.length}개 더 남음</span>
          )}
        </div>
      )}
    </div>
  );
}
