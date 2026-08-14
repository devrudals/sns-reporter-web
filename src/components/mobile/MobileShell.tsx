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

  // 전체 리스트에서 선택된 콘텐츠 — 하단 축소 미리보기 패널(기획안/완성본)이 이 값을 읽는다.
  // 셸 레벨에서 렌더링해야 스크롤 컨테이너가 아닌 화면에 고정된다(기존 퀵액션 버튼과 동일한 이유).
  const [selectedListItem, setSelectedListItem] = useState<any>(null);

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

  const handleOpenSubmit = (mode: 'proposal' | 'final') => {
    setSubmitModalMode(mode);
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

        {/* Top Header — 예전엔 하나로 이어진 글래스 바였는데, 요청에 따라 같은 자리에서
            각자 독립된 글래스 조각(로고/타이틀, PC 뷰, 검색, 알림)으로 해체했다. <header>
            자체는 배경 없는 투명 레이아웃 컨테이너일 뿐이고, 각 조각이 개별적으로
            .glass-cta를 써서 그 조각 뒤만 블러한다 — 조각 사이 간격은 완전히 투명해
            페이지 콘텐츠가 또렷하게 비친다.
            원래 sticky였는데, 이 셸 구조에서는 <header>·<main>이 스크롤되지 않는
            바깥 flex-col의 형제라 sticky가 실질적으로 아무 효과가 없었다(스크롤
            컨테이너가 없으니 "붙을" 대상이 없음) — 즉 header는 그냥 자기 자리를
            차지하는 별도 구획이었고, main 콘텐츠가 실제로 그 뒤를 지나가지 않았다.
            바텀 navbar처럼 absolute로 바꿔서 진짜로 main 위에 뜨는 오버레이가 되도록
            했다 — 이제 스크롤되는 콘텐츠가 글래스 조각들 사이 틈으로 실제로 지나간다. */}
        <header className="safe-pt px-4 py-3.5 absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2">
          <div className="glass-cta flex items-center gap-2.5 px-3 py-2 rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-[#002454] flex items-center justify-center text-white font-black text-sm shadow-xs">
              Y
            </div>
            <div>
              <div className="text-sm font-black text-slate-900 tracking-tight">연세 미디어센터</div>
              <div className="text-[10px] text-slate-500 font-semibold">SNS 기자단 모바일</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                localStorage.setItem('pref_view_mode', 'desktop');
                window.location.href = '/dashboard';
              }}
              className="glass-cta px-3 py-2 rounded-2xl text-xs font-extrabold text-slate-700 active:scale-95 transition-transform cursor-pointer"
            >
              💻 PC 뷰
            </button>
            <button
              onClick={() => {
                setActiveTab('list');
                setListSearchTrigger(t => t + 1);
              }}
              className="glass-cta w-9 h-9 rounded-full flex items-center justify-center text-slate-700 text-sm active:scale-95 transition-transform cursor-pointer"
            >
              🔍
            </button>
            <div className="glass-cta w-9 h-9 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
              🔔
            </div>
          </div>
        </header>

        {/* Main Content Body — 헤더가 이제 absolute 오버레이라 <main>이 화면 맨 위(y=0)
            부터 시작한다. pt로 헤더 높이만큼 첫 콘텐츠가 가려지지 않게 여백을 준다. */}
        <main
          className={`flex-1 pt-[calc(4.5rem+env(safe-area-inset-top))] p-4 overflow-y-auto relative min-h-0 ${
            activeTab === 'dashboard' || activeTab === 'list'
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
              onOpenDetail={handleOpenDetail}
              onOpenPeek={handleOpenPeek}
              onNavigateToList={() => setActiveTab('list')}
            />
          )}

          {activeTab === 'calendar' && (
            <MobileCalendar
              contents={contents}
              allProfiles={allProfiles}
              onOpenDetail={handleOpenDetail}
              onOpenPeek={(item, type) => handleOpenPeek(item, type, 36.4)}
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
        {(activeTab === 'dashboard' || activeTab === 'list') && (
          <div className="absolute left-3.5 right-3.5 z-20 flex items-center gap-3 bottom-[calc(5.125rem+env(safe-area-inset-bottom))]">
            {activeTab === 'list' && selectedListItem ? (() => {
              const item = selectedListItem;
              const hasFinal = ['final_submitted', 'final_revision', 'completed', 'uploaded'].includes(item.status) || !!item.final_url;
              return (
                <React.Fragment key={item.id}>
                  <button
                    onClick={() => handleOpenDetail(item, 'proposal')}
                    className="glass-cta-kraft flex-1 h-14 rounded-xl flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                    title="기획안 상세보기"
                  >
                    <span className="text-xl">📋</span>
                  </button>
                  <button
                    onClick={() => { if (hasFinal) handleOpenDetail(item, 'final'); }}
                    disabled={!hasFinal}
                    className={`flex-1 h-14 rounded-xl flex items-center justify-center transition-transform ${
                      hasFinal ? 'glass-cta-primary glass-cta-primary-strong active:scale-95 cursor-pointer' : 'glass-cta-disabled cursor-not-allowed'
                    }`}
                    title={hasFinal ? '완성본 상세보기' : '완성본 없음'}
                  >
                    <svg className={`w-6 h-6 ${hasFinal ? '' : 'opacity-30 grayscale'}`} viewBox="0 0 87.3 78">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                    </svg>
                  </button>
                </React.Fragment>
              );
            })() : (
              <>
                <button
                  onClick={() => handleOpenSubmit('proposal')}
                  className="glass-cta glass-cta-strong flex-1 h-14 px-4 text-[#002454] font-black text-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
                >
                  <span>✍️</span>
                  <span>기획안 작성</span>
                </button>
                <button
                  onClick={() => handleOpenSubmit('final')}
                  className="glass-cta-primary flex-1 h-14 px-4 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
                >
                  <span>📤</span>
                  <span>완성본 업로드</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Bottom App Navigation Bar — floating glass capsule (Figma "bottom navbar" component,
            exact liquid-glass material via .glass-navbar in globals.css: 5%-opacity white +
            10px backdrop blur + layered ambient/inner shadows; active tab is a 40%-black tint) */}
        <nav className="font-mobile-sf absolute inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30">
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
            handleOpenSubmit(editType);
          }}
        />

        {/* Mobile Submission Form Modal */}
        <MobileSubmitModal
          isOpen={submitModalMode !== 'none'}
          onClose={() => setSubmitModalMode('none')}
          mode={submitModalMode === 'final' ? 'final' : 'proposal'}
          user={user}
          allProfiles={allProfiles}
        />
      </div>
    </div>
  );
}
