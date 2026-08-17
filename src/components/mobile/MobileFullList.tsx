'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DriveColorIcon, DriveLockedIcon } from './driveIcons';
import { YoutubeIcon, InstagramIcon, NaverBlogIcon, GenericPostIcon } from './platformIcons';

interface MobileFullListProps {
  contents: any[];
  selectedItem: any;
  onSelectItem: (item: any) => void;
  // GNB 돋보기 아이콘을 누를 때마다 증가하는 카운터 — 필터 섹션을 펼치고 검색창에
  // 포커스를 준다(이미 펼쳐진 상태에서 다시 눌러도 재포커스되도록 boolean이 아닌 카운터).
  revealSearch?: number;
  // 항목 선택 시 그 자리에서 늘어나는 영역의 아이콘 3개(📋/드라이브/💬)가 각각
  // 상세보기·업로드·코멘트 페이지를 여는 데 쓴다 — 셸의 공용 핸들러를 그대로 받는다.
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

const getTargetDateParts = (item: any) => {
  const bodyObj = parseBody(item);
  const dateStr = item.target_date || bodyObj.desiredDate || bodyObj.targetDate || item.created_at;
  if (!dateStr) return null;
  const [yStr, mStr] = String(dateStr).split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
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

// 지금이 속한 분기(2개월 구간)의 시작월 — 홀수월(1/3/5/7/9/11)이 각 구간의 시작.
const getCurrentBimonthStart = () => {
  const m = new Date().getMonth() + 1;
  return m % 2 === 1 ? m : m - 1;
};
const getCurrentYear = () => new Date().getFullYear();

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

export default function MobileFullList({ contents, selectedItem, onSelectItem, revealSearch, user, onOpenDetail, onOpenSubmit, onOpenComments }: MobileFullListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  // 요청 반영 — 전체 리스트에 처음 들어왔을 때부터 "전체 기간"이 아니라 지금이
  // 속한 분기(2개월 구간)로 기본 필터링된 상태로 시작한다. 연도까지 함께 기억해야
  // "26년 7,8월"처럼 특정 연도의 분기로 정확히 좁혀진다(연도 없이 월만 보면 다른
  // 해의 같은 달 콘텐츠까지 섞여 나옴).
  const [bimonthStart, setBimonthStart] = useState<number | null>(getCurrentBimonthStart());
  const [bimonthYear, setBimonthYear] = useState<number | null>(getCurrentYear());
  const [showBimonthPicker, setShowBimonthPicker] = useState(false);
  // 드롭다운 안에서 "지금 몇 년치 목록을 보고 있는지" — 실제 적용(bimonthYear)과는
  // 별개로, 드롭다운을 열 때 현재 적용된 연도(또는 기본값)로 초기화한다.
  const [pickerYear, setPickerYear] = useState<number>(getCurrentYear());
  const [displayCount, setDisplayCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // 검색바/달력 버튼/소속·유형 필터를 기본적으로 숨겨두고, GNB 돋보기 탭으로만 드러낸다.
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 완성본 미업로드+권한 없음 상태에서 잠김 아이콘을 눌렀을 때 뜨는 안내 토스트 —
  // MobileDetailModal의 동일한 패턴(화면 중앙, 잠깐 노출 후 자동 소멸).
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 1800);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // GNB 돋보기를 다시 누르면(revealSearch 증가) 현재 열려있는지에 따라 토글한다 —
  // 열려 있었다면 닫고(+키보드 내리기), 닫혀 있었다면 연다(+포커스). 검색 input을
  // 조건부 마운트하지 않고 max-height로만 접어둔 덕분에(아래 JSX 참고) DOM에는 항상
  // 존재하므로, 별도 딜레이 없이 바로 focus/blur해도 안전하다.
  // 다른 탭에서 곧장 검색 버튼을 눌러 이 컴포넌트가 처음 마운트되는 순간에는
  // revealSearch가 이미 1(참) 값으로 들어오는데, React Strict Mode(개발 모드)가
  // 마운트 직후 effect를 정리→재실행 한 번씩 더 시뮬레이션하면서 토글이 두 번
  // 걸려 결국 열리지 않은 것처럼 보이는 버그가 있었다 — 처리한 revealSearch 값을
  // ref로 기억해두고, 같은 값에 대해서는 두 번째 실행을 무시해 멱등하게 만든다.
  const lastRevealRef = useRef(0);
  useEffect(() => {
    if (!revealSearch || revealSearch === lastRevealRef.current) return;
    lastRevealRef.current = revealSearch;
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
      const parts = getTargetDateParts(item);
      if (!parts) return false;
      if (bimonthYear !== null && parts.year !== bimonthYear) return false;
      if (parts.month !== bimonthStart && parts.month !== bimonthStart + 1) return false;
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
  // 축소 미리보기가 뜬다(MobileShell 참고). 아무것도 선택하지 않은 상태는 이제
  // 의도적으로 유효한 상태(도크 대신 대시보드 액션 버튼이 뜸)이므로, 필터링으로
  // 선택이 사라졌을 때만 정리하고 강제로 다른 항목을 다시 골라주지는 않는다.
  useEffect(() => {
    if (!selectedItem) return;
    const stillVisible = displayedItems.some(i => i.id === selectedItem.id);
    if (!stillVisible) onSelectItem(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredContents.length, selectedTeam, selectedType, bimonthStart, bimonthYear, searchQuery]);

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
    if (!contentType) return <GenericPostIcon className="w-5 h-5" />;
    if (contentType.includes('영상') || contentType.includes('유튜브') || contentType.includes('릴스') || contentType.includes('숏폼')) return <YoutubeIcon className="w-5 h-5" />;
    if (contentType.includes('카드뉴스') || contentType.includes('인스타')) return <InstagramIcon className="w-5 h-5" />;
    if (contentType.includes('글') || contentType.includes('블로그')) return <NaverBlogIcon className="w-5 h-5" />;
    return <GenericPostIcon className="w-5 h-5" />;
  };

  // "26년 7, 8월"처럼 2자리 연도 + 월 구간으로 표기한다(요청 반영 — 이전엔 연도
  // 없이 월만 보여줘서 어느 해인지 알 수 없었다. 이 앱 다른 곳의 "26-1분기"
  // 표기 관례와도 자연스럽게 맞다).
  const activeBimonthLabel = bimonthStart !== null && bimonthYear !== null
    ? `${String(bimonthYear).slice(-2)}년 ${BIMONTH_RANGES.find(r => r.start === bimonthStart)?.label}`
    : null;

  // 분기 간 이동 — 6개 2개월 구간을 연도까지 포함해 순환한다. 12월 다음(다음 분기)은
  // 다음 해 1월로, 1월 이전(이전 분기)은 작년 11월로 넘어간다.
  const shiftBimonth = (dir: 1 | -1) => {
    const baseYear = bimonthYear ?? getCurrentYear();
    const baseStart = bimonthStart ?? getCurrentBimonthStart();
    const currentIdx = BIMONTH_RANGES.findIndex(r => r.start === baseStart);
    let nextIdx = currentIdx + dir;
    let nextYear = baseYear;
    if (nextIdx < 0) { nextIdx = BIMONTH_RANGES.length - 1; nextYear -= 1; }
    else if (nextIdx >= BIMONTH_RANGES.length) { nextIdx = 0; nextYear += 1; }
    setBimonthStart(BIMONTH_RANGES[nextIdx].start);
    setBimonthYear(nextYear);
  };

  return (
    <div className="space-y-4 text-slate-900 select-none relative">
      {/* 1. Header & Search Input — 검색바/필터 칩은 기본 숨김, GNB 돋보기로만
          펼쳐진다(revealSearch). 조건부 마운트 대신 max-height로 접어서 input이 항상
          DOM에 존재하게 해야 펼친 직후 focus()가 실기기에서 안정적으로 키보드를 띄운다.
          분기(2개월 구간) 표시·이동은 검색 필터와 달리 항상 보여야 하는 정보라
          이 접히는 영역 밖, 헤더 안에 상시 노출한다(요청 반영). */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">전체 리스트</h2>
          <span className="text-xs text-slate-400 font-extrabold">총 {filteredContents.length}개</span>
        </div>

        {/* 분기(2개월 구간) 상시 내비게이터 — 지금 몇 년 몇 월~몇 월 콘텐츠를 보고
            있는지 항상 보이고, 화살표로 인접 분기(연도 경계 포함)로 바로 이동한다.
            가운데 라벨을 탭하면 이 자리에 바로 드롭다운이 뜬다 — 예전엔 검색 필터
            섹션 안의 작은 달력 아이콘에 매달려 있어 화면 오른쪽 끝에서 잘려 보이는
            문제가 있었는데(요청 반영으로 그 아이콘 자체를 없앰), 이 넓은 라벨
            아래로 옮기고 폭도 이 카드 너비에 맞춰 잘리지 않게 했다. */}
        <div className="relative flex items-center justify-between gap-2 mt-3">
          <button
            onClick={() => shiftBimonth(-1)}
            className="w-8 h-8 rounded-full bg-[#F4F5F7] flex items-center justify-center text-slate-600 font-black active:scale-95 transition-transform flex-shrink-0"
          >
            ‹
          </button>
          <button
            onClick={() => { setPickerYear(bimonthYear ?? getCurrentYear()); setShowBimonthPicker(v => !v); }}
            className="flex-1 text-center text-sm font-black text-[#002454] py-1 rounded-lg active:bg-slate-50 transition-colors"
          >
            {activeBimonthLabel ? `${activeBimonthLabel} 콘텐츠` : '전체 기간'}
          </button>
          <button
            onClick={() => shiftBimonth(1)}
            className="w-8 h-8 rounded-full bg-[#F4F5F7] flex items-center justify-center text-slate-600 font-black active:scale-95 transition-transform flex-shrink-0"
          >
            ›
          </button>

          {showBimonthPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowBimonthPicker(false)} />
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => { setBimonthStart(null); setBimonthYear(null); setShowBimonthPicker(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors border-b border-slate-100 ${bimonthStart === null ? 'bg-blue-50 text-[#002454]' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  전체 기간
                </button>
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100">
                  <button
                    onClick={() => setPickerYear(y => y - 1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 font-black hover:bg-slate-50"
                  >
                    ‹
                  </button>
                  <span className="text-xs font-black text-slate-800">{pickerYear}년</span>
                  <button
                    onClick={() => setPickerYear(y => y + 1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 font-black hover:bg-slate-50"
                  >
                    ›
                  </button>
                </div>
                <div className="grid grid-cols-2 max-h-60 overflow-y-auto">
                  {BIMONTH_RANGES.map(range => (
                    <button
                      key={range.start}
                      onClick={() => { setBimonthStart(range.start); setBimonthYear(pickerYear); setShowBimonthPicker(false); }}
                      className={`text-left px-4 py-2.5 text-xs font-bold transition-colors ${
                        bimonthStart === range.start && bimonthYear === pickerYear ? 'bg-blue-50 text-[#002454]' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-out -mx-1 ${
            showFilters ? 'max-h-[18rem] opacity-100 mt-3.5' : 'max-h-0 opacity-0'
          }`}
        >
          {/* 검색창의 포커스 링(box-shadow)이 부모의 overflow-hidden 경계에 바로 붙어
              위/왼쪽이 잘리던 문제 — 링이 그려질 여백을 p-1로 확보(부모의 -mx-1로
              좌우 정렬은 그대로 유지). */}
          <div className="space-y-3.5 p-1">
            {/* Search Bar — 분기(2개월 구간) 필터는 이제 이 접히는 검색 섹션이 아니라
                위 헤더의 상시 내비게이터(‹ 라벨 ›)로 옮겨갔다(요청 반영 — 여기 있던
                작은 달력 아이콘 버튼은 삭제). */}
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
              <button
                onClick={closeFilters}
                className="text-xs font-extrabold text-slate-400 hover:text-blue-600 flex-shrink-0 px-1"
              >
                취소
              </button>
            </div>

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

      {/* 2. Content Item Rows List — 탭하면 그 자리에서 블록이 늘어나며(아코디언) 기획안
          상세보기(📋)·완성본 상세보기/업로드(드라이브)·코멘트(💬) 아이콘 3개가 늘어난
          영역 안에 나타난다. 더 이상 셸의 플로팅 하단 액션바를 쓰지 않는다 — 전체
          리스트는 순수 조회 화면이 되고, 기획안 작성·완성본 업로드(신규)는 대시보드에서만. */}
      <div className="space-y-2.5">
        {displayedItems.length > 0 ? (
          displayedItems.map((item, idx) => {
            const isFinal = item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';
            const hasDriveLink = !!(item.final_url || (item.content_body && item.content_body.includes('http')));
            const isSelected = selectedItem?.id === item.id;

            let authorEmail = '';
            try { authorEmail = JSON.parse(item.content_body || '{}').authorEmail || ''; } catch {}
            const isAdmin = user?.email === 'admin@admin.com' || user?.user_metadata?.is_admin === true;
            const isOwnContent = !!(user?.email && authorEmail && user.email === authorEmail);
            const canManage = isAdmin || isOwnContent;

            return (
              <div
                key={item.id || idx}
                onClick={() => onSelectItem(isSelected ? null : item)}
                className={`rounded-xl shadow-xs border transition-all cursor-pointer overflow-hidden ${
                  isSelected ? 'bg-[#EAF2FF] border-[#002454] ring-2 ring-[#002454]/20' : 'bg-white border-slate-200/80 hover:border-blue-300'
                }`}
              >
                <div className="p-3.5 active:scale-[0.99] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Platform Logo Badge */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isFinal ? 'bg-[#E8F8F0]' : 'bg-[#EBF3FF]'
                    }`}>
                      {getPlatformIcon(item.content_type)}
                    </div>

                    {/* Title & Author / Team Info */}
                    <div className="min-w-0 space-y-0.5">
                      <div className={`text-sm font-bold leading-snug truncate ${isSelected ? 'text-[#002454]' : 'text-slate-900'}`}>
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 font-medium truncate">
                        {item.content_type || '기사'} - {item.author_name} ({item.team || '팀'})
                      </div>
                    </div>
                  </div>

                  {/* Right Badge: 선택되지 않은 기본 상태에서만 보이는 정보성(비클릭)
                      드라이브 표시 — 선택하면 아래 확장 영역의 실제 클릭 가능한
                      드라이브 버튼으로 대체되므로 중복을 피해 숨긴다. */}
                  {!isSelected && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isFinal && hasDriveLink && (
                        <div className="w-8 h-8 rounded-lg bg-[#F4F5F7] border border-slate-200/80 flex items-center justify-center text-blue-700 shadow-2xs" title="Google Drive Link">
                          <DriveColorIcon />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 선택 시 늘어나는 영역 — 기획안 상세보기(📋) + 완성본 상태별 버튼
                    (있으면 실제 드라이브 아이콘/완성본 상세보기, 없고 권한 있으면 +
                    표시로 업로드, 없고 권한 없으면 흑백 잠김 아이콘) + 코멘트(💬).
                    세 버튼 모두 flex-1로 가로를 균등하게 채운다(요청 반영 — 고정
                    w-10이었던 것을 균등 분배로 변경). */}
                {isSelected && (
                  <div
                    className="px-3.5 pb-3.5 pt-1 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onOpenDetail(item, 'proposal')}
                      className="flex-1 h-10 rounded-lg bg-[#FFB800] border border-[#E6A600] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                      title="기획안 상세보기"
                    >
                      <span className="text-lg">📋</span>
                    </button>

                    {isFinal && hasDriveLink ? (
                      <button
                        onClick={() => onOpenDetail(item, 'final')}
                        className="flex-1 h-10 rounded-lg bg-[#003378] border border-[#002454] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                        title="완성본 상세보기"
                      >
                        <DriveColorIcon />
                      </button>
                    ) : canManage ? (
                      <button
                        onClick={() => onOpenSubmit('final', item)}
                        className="flex-1 h-10 rounded-lg bg-[#EBF3FF] border border-[#C0CFE4] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                        title="완성본 업로드"
                      >
                        <span className="text-lg">📤</span>
                      </button>
                    ) : (
                      // 완성본 미업로드 + 권한 없음: 비활성 대신 클릭 가능한 버튼으로
                      // 두되(요청 반영) 다른 페이지로 이동하지 않고 안내 토스트만 띄운다.
                      // 배경은 "완성본" 슬롯이라 다른 두 상태와 동일한 진한 파란색 유지.
                      <button
                        onClick={() => setToastMsg('완성본이 아직 업로드되지 않았습니다')}
                        className="flex-1 h-10 rounded-lg bg-[#003378] border border-[#002454] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                        title="완성본이 아직 업로드되지 않았습니다"
                      >
                        <DriveLockedIcon />
                      </button>
                    )}

                    <button
                      onClick={() => onOpenComments(item)}
                      className="flex-1 h-10 rounded-lg bg-white border-2 border-slate-300 flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-sm"
                      title="코멘트"
                    >
                      <span className="text-base">💬</span>
                    </button>
                  </div>
                )}
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

      {toastMsg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none px-8">
          <div className="bg-black/85 text-white text-sm font-bold px-5 py-3 rounded-2xl text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
            {toastMsg}
          </div>
        </div>
      )}
    </div>
  );
}
