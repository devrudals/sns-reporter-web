'use client';

import React, { useState, useEffect } from 'react';
import MobileDashboard from './MobileDashboard';
import MobileCalendar from './MobileCalendar';
import MobileFullList from './MobileFullList';
import MobileProfile from './MobileProfile';
import MobileDetailModal from './MobileDetailModal';
import MobileSubmitModal from './MobileSubmitModal';

interface MobileShellProps {
  contents: any[];
  notices: any[];
  deadlines?: any;
  allProfiles?: any[];
  user: any;
  onLogout?: () => void;
}

export default function MobileShell({ contents, notices, deadlines = {}, allProfiles = [], user, onLogout }: MobileShellProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'list' | 'profile'>('dashboard');
  const [detailModalItem, setDetailModalItem] = useState<any>(null);
  const [detailModalType, setDetailModalType] = useState<'proposal' | 'final'>('proposal');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  // 탭한 미리보기 카드의 화면상 위치/크기 — 상세보기가 그 지점에서 "종이가 커지는" 것처럼
  // 시작하도록 MobileDetailModal에 전달한다(FLIP 방식 공유 요소 전환).
  const [detailOriginRect, setDetailOriginRect] = useState<DOMRect | null>(null);
  // 미리보기 전용 — Figma의 peek 컴포넌트(탭/스와이프업으로 전체화면까지 차오름)로
  // 열지 여부. FLIP(originRect)과는 별개의 진입 모드.
  const [detailStartPeek, setDetailStartPeek] = useState(false);
  // peek 시작 지점(%) — 화면마다 Figma 실측값이 다르다(대시보드 69.2%, 캘린더 36.4%).
  const [detailPeekTopVh, setDetailPeekTopVh] = useState(69.2);
  // GNB 돋보기 아이콘을 누를 때마다 증가 — 전체 리스트 탭으로 이동시키고, 그 화면 자체의
  // 검색 필터 섹션을 펼치며 검색창에 포커스를 주는 신호로 쓴다(MobileFullList 참고).
  const [listSearchTrigger, setListSearchTrigger] = useState(0);

  // Submit Modal state
  const [submitModalMode, setSubmitModalMode] = useState<'proposal' | 'final' | 'none'>('none');
  // 완성본 업로드가 특정 콘텐츠에 연결돼야 할 때(전체 리스트/캘린더에서 콘텐츠를
  // 선택해 업로드하거나, 상세보기의 배지/수정하기를 거쳐 들어온 경우) 그 콘텐츠를
  // 들고 있는다 — MobileSubmitModal이 이 값이 있으면 새 글을 만들지 않고 그 콘텐츠
  // 행을 업데이트한다.
  const [submitTargetItem, setSubmitTargetItem] = useState<any>(null);

  // 전체 리스트 또는 캘린더 리스트뷰에서 선택된 콘텐츠 — 하단 액션바(기획안/완성본
  // 아이콘 버튼)가 이 값을 읽는다. 두 화면이 같은 상태를 공유하므로 셸 레벨에서
  // 렌더링해야 스크롤 컨테이너가 아닌 화면에 고정된다(기존 퀵액션 버튼과 동일한 이유).
  const [selectedListItem, setSelectedListItem] = useState<any>(null);
  // 캘린더 화면 자체의 그리드/리스트 전환 상태를 셸로 끌어올렸다 — 하단 액션바를
  // "캘린더가 지금 리스트뷰인지"에 따라 보여줄지 말지 셸에서 판단해야 하기 때문
  // (그리드뷰에서는 기존처럼 액션바 없이 날짜 탭→팝업 흐름을 그대로 쓴다).
  const [calendarViewType, setCalendarViewType] = useState<'grid' | 'list'>('grid');
  // 캘린더 날짜팝업(그리드뷰에서 날짜를 탭하면 뜨는 z-50 풀스크린 오버레이)이
  // 열려있는지 — 열려있고 그 안에서 콘텐츠를 선택했을 때는 하단 액션바를 팝업의
  // dim 배경보다 더 위(z-index)로 띄워야 눌러진다.
  const [calendarPopupOpen, setCalendarPopupOpen] = useState(false);

  // 탭을 전환하거나 캘린더 그리드/리스트뷰를 오가면 이전 화면에서 선택했던 콘텐츠가
  // 그대로 남아있지 않도록 선택 상태를 정리한다.
  useEffect(() => {
    setSelectedListItem(null);
  }, [activeTab, calendarViewType]);

  // Figma spec is authored at a 16px rem base (402px frame); the app-wide
  // html font-size is 17px for the PC layout, so scope the 16px base to
  // exactly the lifetime of this shell.
  useEffect(() => {
    document.documentElement.classList.add('mobile-rem-base');
    return () => document.documentElement.classList.remove('mobile-rem-base');
  }, []);

  const handleOpenDetail = (item: any, type: 'proposal' | 'final', originRect?: DOMRect) => {
    setDetailModalItem(item);
    setDetailModalType(type);
    setDetailOriginRect(originRect || null);
    setDetailStartPeek(false);
    setIsDetailOpen(true);
  };

  // 대시보드 승인대기 항목/미리보기 캐러셀, 캘린더 날짜팝업의 항목 탭 — Figma가 실제로
  // 쓰는 것과 같은 peek 상태로 상세보기를 연다(originRect 없이, FLIP 대신 peek 전용
  // transform). peekTopVh는 화면마다 다른 Figma 실측 비율(기본값은 대시보드의 69.2%).
  const handleOpenPeek = (item: any, type: 'proposal' | 'final', peekTopVh: number = 69.2) => {
    setDetailModalItem(item);
    setDetailModalType(type);
    setDetailOriginRect(null);
    setDetailStartPeek(true);
    setDetailPeekTopVh(peekTopVh);
    setIsDetailOpen(true);
  };

  const handleOpenSubmit = (mode: 'proposal' | 'final', targetItem?: any) => {
    setSubmitModalMode(mode);
    setSubmitTargetItem(targetItem || null);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: '대시보드',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-white' : 'text-[#757575]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'calendar',
      label: '캘린더',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-white' : 'text-[#757575]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'list',
      label: '전체 리스트',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-white' : 'text-[#757575]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      )
    },
    {
      id: 'profile',
      label: '프로필',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-white' : 'text-[#757575]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  // 캘린더 날짜팝업(z-50 fixed dim) 안에서 콘텐츠를 선택했을 때만 — 하단 액션바를
  // 팝업 위(z-55)로 띄워야 보이고 눌린다. 다른 화면(대시보드/전체 리스트/캘린더
  // 리스트뷰)에서는 그런 풀스크린 오버레이가 없어 기존처럼 z-20이면 충분하다.
  // isDetailOpen일 때는 제외 — 그 상태에서 z-55로 계속 띄우면 상세보기 모달(z-50)
  // 위에 이 버튼들이 겹쳐 보이게 된다(액션바 버튼을 눌러 상세보기를 연 바로 그
  // 순간 발생). 상세보기를 닫으면 팝업이 다시 보이면서 액션바도 자연스럽게 복귀.
  const inCalendarPopupWithSelection = activeTab === 'calendar' && calendarPopupOpen && !!selectedListItem && !isDetailOpen;

  return (
    <div className="w-full h-dvh bg-[#F4F5F7] lg:bg-slate-200/80 flex items-center justify-center p-0 lg:p-6 overflow-x-hidden lg:overflow-y-auto">
      {/* Mobile Screen Container Frame */}
      <div className="font-mobile-body w-full h-full min-h-dvh lg:w-[440px] lg:h-[900px] bg-[#F4F5F7] lg:rounded-[44px] lg:shadow-2xl lg:border-[8px] lg:border-slate-900 overflow-hidden flex flex-col relative">
        
        {/* iPhone Speaker Notch for Desktop View */}
        <div className="hidden lg:flex justify-center items-center pt-2.5 pb-1 bg-white border-b border-slate-100 z-40">
          <div className="w-24 h-4 bg-slate-900 rounded-full flex items-center justify-end px-2.5 gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-800" />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-900/80" />
          </div>
        </div>

        {/* Figma 원본(863:168576 대시보드 섹션)을 조사해보니 로고/타이틀·알림 벨을 담은
            상단 헤더 자체가 아예 없다 — 화면 맨 위는 상태바 뒤로 흐리게 페이드되는
            블러 스트립뿐. 그래서 헤더를 완전히 제거하고, 헤더에 있던 검색 기능만
            하단 네비게이션으로 옮긴다(아래 nav 참고). */}

        {/* Main Content Body — 더 이상 상단에 떠 있는 헤더가 없으므로 safe-area만큼만
            여백을 준다(노치 대응). */}
        <main
          className={`flex-1 safe-pt p-4 overflow-y-auto relative min-h-0 ${
            activeTab === 'dashboard' || activeTab === 'list' || (activeTab === 'calendar' && calendarViewType === 'list')
              ? 'pb-[calc(10rem+env(safe-area-inset-bottom))]'
              : 'pb-[calc(6rem+env(safe-area-inset-bottom))]'
          }`}
        >
          {activeTab === 'dashboard' && (
            <MobileDashboard
              contents={contents}
              notices={notices}
              deadlines={deadlines}
              allProfiles={allProfiles}
              onOpenPeek={handleOpenPeek}
              onNavigateToList={() => setActiveTab('list')}
              selectedItem={selectedListItem}
              onSelectItem={setSelectedListItem}
            />
          )}

          {activeTab === 'calendar' && (
            <MobileCalendar
              contents={contents}
              allProfiles={allProfiles}
              viewType={calendarViewType}
              onViewTypeChange={setCalendarViewType}
              selectedItem={selectedListItem}
              onSelectItem={setSelectedListItem}
              onPopupOpenChange={setCalendarPopupOpen}
            />
          )}

          {activeTab === 'list' && (
            <MobileFullList
              contents={contents}
              selectedItem={selectedListItem}
              onSelectItem={setSelectedListItem}
              revealSearch={listSearchTrigger}
            />
          )}

          {activeTab === 'profile' && (
            <MobileProfile user={user} onLogout={onLogout} />
          )}
        </main>

        {/* 하단 2버튼 액션 바 — 대시보드/전체 리스트(선택 없음)에서는 기획안 작성·완성본
            업로드 버튼, 전체 리스트에서 콘텐츠를 선택했을 때는 그 항목의 기획안/완성본
            "상세보기"로 바뀐다(문서/드라이브 아이콘만, 작성·업로드 기능이 아니라 이전
            미니카드 도크가 하던 일을 그대로 이어받음). 완성본이 없는 콘텐츠는 드라이브
            아이콘 버튼이 비활성화된다. fixed to the shell so it never scrolls away. */}
        {/* 이 줄의 모든 flex-1 버튼은 px-4를 똑같이 갖고 있어야 한다 — 아이콘 전용
            버튼(패딩 없음)과 아이콘+텍스트 버튼(px-4 있음)을 나란히 두면, 겉보기엔
            flex-basis:0%/min-w-0로 정확히 반반 나뉠 것 같지만 실제로는 패딩이 있는
            쪽이 패딩만큼 더 넓게 자라는 걸 실측으로 확인했다(패딩을 양쪽 다 0으로
            맞추면 즉시 정확히 반반이 됨) — 그래서 폭을 맞추려면 padding 자체를
            대칭으로 맞추는 것 말고는 방법이 없다. */}
        {(activeTab === 'dashboard' || activeTab === 'list' || (activeTab === 'calendar' && calendarViewType === 'list') || inCalendarPopupWithSelection) && (
          <div className={`absolute left-3.5 right-3.5 flex items-center gap-3 bottom-[calc(5.125rem+env(safe-area-inset-bottom))] ${inCalendarPopupWithSelection ? 'z-[55]' : 'z-20'}`}>
            {(activeTab === 'list' || activeTab === 'calendar' || activeTab === 'dashboard') && selectedListItem ? (() => {
              const item = selectedListItem;
              const hasFinal = ['final_submitted', 'final_revision', 'completed', 'uploaded'].includes(item.status) || !!item.final_url;
              let authorEmail = '';
              try { authorEmail = JSON.parse(item.content_body || '{}').authorEmail || ''; } catch {}
              const isAdmin = user?.email === 'admin@admin.com' || user?.user_metadata?.is_admin === true;
              const isOwnContent = !!(user?.email && authorEmail && user.email === authorEmail);
              const canManage = isAdmin || isOwnContent;
              return (
                <React.Fragment key={item.id}>
                  <button
                    onClick={() => handleOpenDetail(item, 'proposal')}
                    className="glass-cta-kraft flex-1 min-w-0 h-[2.625rem] px-4 rounded-xl flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                    title="기획안 상세보기"
                  >
                    <span className="text-xl">📋</span>
                  </button>
                  {hasFinal && (
                    <button
                      onClick={() => handleOpenDetail(item, 'final')}
                      className="glass-cta-primary glass-cta-primary-strong flex-1 min-w-0 h-[2.625rem] px-4 rounded-xl flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                      title="완성본 상세보기"
                    >
                      <svg className="w-6 h-6" viewBox="0 0 87.3 78">
                        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                        <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                        <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                        <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                      </svg>
                    </button>
                  )}
                  {/* 완성본이 없을 때: 수정/업로드 권한이 있는 사람(관리자·작성자)에게는
                      비활성 아이콘 대신 곧장 업로드로 이어지는 활성 버튼을 보여준다 —
                      권한 없는 열람자에게는 여전히 버튼 자체를 숨긴다. */}
                  {!hasFinal && canManage && (
                    <button
                      onClick={() => handleOpenSubmit('final', item)}
                      className="glass-cta-sky flex-1 min-w-0 h-[2.625rem] px-4 text-[#003378] font-normal text-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
                    >
                      <span>📤</span>
                      <span>완성본 업로드</span>
                    </button>
                  )}
                </React.Fragment>
              );
            })() : (
              <>
                <button
                  onClick={() => handleOpenSubmit('proposal')}
                  className="glass-cta glass-cta-strong flex-1 min-w-0 h-[2.625rem] px-4 text-[#002454] font-normal text-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
                >
                  <span>✍️</span>
                  <span>기획안 작성</span>
                </button>
                <button
                  onClick={() => handleOpenSubmit('final')}
                  className="glass-cta-sky flex-1 min-w-0 h-[2.625rem] px-4 text-[#003378] font-normal text-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
                >
                  <span>📤</span>
                  <span>완성본 업로드</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Bottom App Navigation Bar — Figma 원본(852:34431 "bottom navbar" 컴포넌트)을
            직접 조사해보니 4탭 캡슐(287×58)과 검색 위젯(58×58)이 8px 간격으로 나란히
            배치된 하나의 그룹이었다(정사각형 검색 위젯 한 변이 캡슐 높이와 정확히
            같음). 예전엔 검색을 상단 헤더 쪽에 뒀었는데, 헤더 자체가 Figma에 없어서
            검색만 이 위치로 옮기고 헤더는 완전히 제거했다. 캡슐 재질은 그대로
            .glass-navbar(liquid-glass: 5%-opacity white + 10px backdrop blur + layered
            ambient/inner shadows, 활성 탭은 40%-black 틴트), 검색 위젯은 다른 개별
            아이콘 버튼들과 같은 .glass-cta. */}
        <div className="font-mobile-sf absolute inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-2">
          <nav className="flex-1 min-w-0">
            <div className="glass-navbar flex items-center h-[3.625rem] rounded-full p-1 gap-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`flex flex-1 flex-col items-center justify-center h-full rounded-full transition-all duration-300 active:scale-95 ${
                      isActive ? 'glass-navbar-active' : ''
                    }`}
                  >
                    {item.icon(isActive)}
                    <span className={`text-[0.6rem] mt-0.5 font-bold tracking-tight ${isActive ? 'text-white' : 'text-[#757575]'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
          <button
            onClick={() => {
              setActiveTab('list');
              setListSearchTrigger(t => t + 1);
            }}
            className="glass-cta w-[3.625rem] h-[3.625rem] rounded-full flex items-center justify-center text-slate-700 text-lg flex-shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            🔍
          </button>
        </div>

        {/* Detail Modal Overlay */}
        <MobileDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          type={detailModalType}
          item={detailModalItem}
          originRect={detailOriginRect}
          startPeek={detailStartPeek}
          peekTopVh={detailPeekTopVh}
          user={user}
          onEdit={(editItem, editType) => {
            setIsDetailOpen(false);
            handleOpenSubmit(editType, editItem);
          }}
        />

        {/* Mobile Submission Form Modal */}
        <MobileSubmitModal
          isOpen={submitModalMode !== 'none'}
          onClose={() => { setSubmitModalMode('none'); setSubmitTargetItem(null); }}
          mode={submitModalMode === 'final' ? 'final' : 'proposal'}
          targetItem={submitTargetItem}
          user={user}
          allProfiles={allProfiles}
        />
      </div>
    </div>
  );
}
