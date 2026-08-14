'use client';

import React, { useState, useEffect } from 'react';
import MobileDashboard from './MobileDashboard';
import MobileCalendar from './MobileCalendar';
import MobileFullList from './MobileFullList';
import MobileProfile from './MobileProfile';
import MobileDetailModal from './MobileDetailModal';
import MobileSubmitModal from './MobileSubmitModal';
import MobilePaperPreview from './MobilePaperPreview';

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

        {/* Top Header */}
        <header className="safe-pt bg-white px-4 py-3.5 border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
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
              className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-extrabold hover:bg-slate-200 transition-colors border border-slate-200"
            >
              💻 PC 뷰
            </button>
            <button
              onClick={() => {
                setActiveTab('list');
                setListSearchTrigger(t => t + 1);
              }}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors text-sm"
            >
              🔍
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">
              🔔
            </div>
          </div>
        </header>

        {/* Main Content Body */}
        <main
          className={`flex-1 p-4 overflow-y-auto relative min-h-0 ${
            activeTab === 'dashboard'
              ? 'pb-[calc(10rem+env(safe-area-inset-bottom))]'
              : activeTab === 'list' && selectedListItem
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

        {/* Quick Action Buttons (대시보드 전용) — fixed to the shell so they never
            scroll away with content, per Figma's fixed-composition intent */}
        {activeTab === 'dashboard' && (
          <div className="absolute left-3.5 right-3.5 z-20 flex items-center gap-3 bottom-[calc(5.125rem+env(safe-area-inset-bottom))]">
            <button
              onClick={() => handleOpenSubmit('proposal')}
              className="glass-cta flex-1 py-3 px-4 text-[#002454] font-black text-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
            >
              <span>✍️</span>
              <span>기획안 작성</span>
            </button>
            <button
              onClick={() => handleOpenSubmit('final')}
              className="glass-cta-primary flex-1 py-3 px-4 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
            >
              <span>📤</span>
              <span>완성본 업로드</span>
            </button>
          </div>
        )}

        {/* 전체 리스트 전용 — 선택한 콘텐츠의 기획안/완성본을 Figma 원본처럼 "축소된 실제
            폼 문서" 형태로 미리보기(MobilePaperPreview). 높이(9rem)는 Figma REST API로
            확인한 이 화면(전체 리스트 1(메인), 863:17013) 고유의 리스트 공간 비율에서
            나온 값. 한때 <main>과 겹치지 않는 flex 형제로 뒀었지만, 도크/카드를 완전
            투명하게 만들면서 사용자가 "리스트가 뒤로 비쳐 보여야 한다"고 다시 요청해
            리스트 위에 겹치는 절대배치 오버레이로 되돌렸다 — 그래서 <main>에도 다시
            이 도크 높이만큼의 하단 padding을 둬서 마지막 항목이 가려지지 않게 한다. */}
        {activeTab === 'list' && selectedListItem && (() => {
          const item = selectedListItem;
          let bodyObj: any = {};
          try {
            if (item.content_body && item.content_body.startsWith('{')) bodyObj = JSON.parse(item.content_body);
          } catch {}
          const hasFinal = ['final_submitted', 'final_revision', 'completed', 'uploaded'].includes(item.status) || !!item.final_url;
          const isOwnContent = !!(user?.email && bodyObj.authorEmail && user.email === bodyObj.authorEmail);
          const finalState: 'view' | 'locked' | 'upload' = hasFinal ? 'view' : isOwnContent ? 'upload' : 'locked';

          return (
            <div
              key={item.id}
              className="absolute inset-x-0 bottom-0 z-20 h-[9rem] pt-2.5 px-3.5 overflow-y-auto"
              style={{ paddingBottom: 'calc(4.375rem + env(safe-area-inset-bottom))' }}
            >
              <div className="w-9 h-1 rounded-full bg-slate-300 mx-auto mb-2" />
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <MobilePaperPreview
                    item={item}
                    kind="proposal"
                    onOpen={(rect) => handleOpenDetail(item, 'proposal', rect)}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <MobilePaperPreview
                    item={item}
                    kind="final"
                    state={finalState}
                    onOpen={(rect) => {
                      if (finalState === 'upload') handleOpenSubmit('final');
                      else handleOpenDetail(item, 'final', rect);
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })()}

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
