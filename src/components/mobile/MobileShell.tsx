'use client';

import React, { useState, useEffect } from 'react';
import MobileDashboard from './MobileDashboard';
import MobileCalendar from './MobileCalendar';
import MobileFullList from './MobileFullList';
import MobileProfile from './MobileProfile';
import MobileDetailModal from './MobileDetailModal';
import MobileSubmitModal from './MobileSubmitModal';
import MobileCommentsPage from './MobileCommentsPage';

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

  // 상세보기 오버레이 — 예전엔 item/type/isOpen/originRect/startPeek이 각자 별도의
  // useState였다(5개). 항상 handleOpenDetail 한 곳에서만 함께 바뀌는 값들인데도
  // 따로 떨어져 있다 보니, 한쪽만 갱신되고 다른 쪽이 이전 값에 머무는 식의 경합이
  // 이번 세션에서 실제 버그(코멘트→상세보기 전환이 도로 닫히던 문제)로 이어진 적이
  // 있어 하나의 객체로 묶었다 — 이제 한 번의 setState로만 갱신되므로 그런 부분
  // 갱신이 구조적으로 불가능하다.
  const [detailOverlay, setDetailOverlay] = useState<{
    isOpen: boolean;
    item: any;
    type: 'proposal' | 'final';
    originRect: DOMRect | null;
    startPeek: boolean;
  }>({ isOpen: false, item: null, type: 'proposal', originRect: null, startPeek: false });
  // handleOpenDetail이 명시적으로 호출될 때마다 1씩 증가 — MobileDetailModal에
  // openToken으로 전달돼, 필드 값 자체는 이전과 같아도(예: 코멘트 페이지를 거쳐
  // 다시 '기획안'으로 돌아오는데 셸 쪽 type이 이미 'proposal'이었던 경우) 항상
  // currentTab을 재동기화하도록 강제한다(회귀 테스트로 발견한 버그 수정 — 상세보기
  // 내부의 완성본/기획안 탭 전환이 로컬 상태라서 셸이 모르는 채로 어긋날 수 있었다).
  const [detailOpenToken, setDetailOpenToken] = useState(0);
  // peek 시작 지점(%) — 이제 peek을 여는 진입점이 없어(요청 반영으로 대시보드
  // 캐러셀도 상세보기로 직행) 항상 기본값에 머문다. MobileDetailModal의 peek
  // prop 자체는 그대로 남겨두되(startPeek이 항상 false라 실질적으로 비활성),
  // 값을 바꿀 호출자가 없으므로 상태 대신 상수로 둔다.
  const detailPeekTopVh = 69.2;
  // GNB 돋보기 아이콘을 누를 때마다 증가 — 전체 리스트 탭으로 이동시키고, 그 화면 자체의
  // 검색 필터 섹션을 펼치며 검색창에 포커스를 주는 신호로 쓴다(MobileFullList 참고).
  const [listSearchTrigger, setListSearchTrigger] = useState(0);

  // 코멘트(채팅방) 페이지 — 전체 리스트의 확장 영역 💬 아이콘, 상세보기 하단의
  // "채팅방" 탭 양쪽에서 모두 이 하나의 핸들러로 연다. 상세보기와 마찬가지로
  // item/isOpen을 하나의 객체로 묶었다.
  const [commentsOverlay, setCommentsOverlay] = useState<{ isOpen: boolean; item: any }>({
    isOpen: false,
    item: null,
  });
  const handleOpenComments = (item: any) => {
    setTrioEnterAnim(computeTrioEnter(2));
    setTrioScreen(2);
    setCommentsOverlay({ isOpen: true, item });
  };

  // Submit Modal state — mode/targetItem을 하나의 객체로 묶었다(항상 handleOpenSubmit
  // 한 곳에서만 함께 바뀜).
  const [submitOverlay, setSubmitOverlay] = useState<{ mode: 'proposal' | 'final' | 'none'; targetItem: any }>({
    mode: 'none',
    targetItem: null,
  });

  // 전체 리스트 또는 캘린더 리스트뷰에서 선택된 콘텐츠 — 하단 액션바(기획안/완성본
  // 아이콘 버튼)가 이 값을 읽는다. 두 화면이 같은 상태를 공유하므로 셸 레벨에서
  // 렌더링해야 스크롤 컨테이너가 아닌 화면에 고정된다(기존 퀵액션 버튼과 동일한 이유).
  const [selectedListItem, setSelectedListItem] = useState<any>(null);
  // 캘린더 화면 자체의 그리드/리스트 전환 상태를 셸로 끌어올렸다 — 하단 액션바를
  // "캘린더가 지금 리스트뷰인지"에 따라 보여줄지 말지 셸에서 판단해야 하기 때문
  // (그리드뷰에서는 이제 날짜팝업 자체가 전체 리스트와 동일한 인라인 확장 방식을
  // 쓰므로 이 플로팅 액션바가 필요 없다).
  const [calendarViewType, setCalendarViewType] = useState<'grid' | 'list'>('grid');

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

  // 웹앱 전반에서 "브라우저 문서 자체"의 상하 스크롤을 막는다(요청 반영 — 예전엔
  // MobileCalendar 안에서 그리드뷰/날짜팝업일 때만 조건부로 걸었는데, 화면마다
  // 따로 챙기기보다 이 셸이 떠 있는 동안은 항상 걸어두는 게 맞다는 요청). 이 앱은
  // 항상 h-dvh로 뷰포트를 꽉 채우고 각 화면이 자기 안의 <main>(overflow-y-auto)
  // 으로 내부 스크롤을 이미 처리하므로, document.body/html 자체가 스크롤될 일이
  // 없어야 한다 — 실제로 스크롤이 필요한 화면(예: 캘린더 리스트뷰, 전체 리스트)의
  // 내부 스크롤 컨테이너는 이 잠금과 무관하게 각자의 overflow 설정대로 정상
  // 동작한다(document 레벨 잠금은 자식 스크롤 컨테이너의 동작에 영향을 주지 않음).
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, []);

  // 기획안/완성본/채팅방 3요소를 "같은 위계"의 화면으로 취급해, 이 중 하나에서
  // 다른 하나로 넘어갈 때는 좌우로 슬라이드하는 모션을(탭 전환처럼), 이 셋 중
  // 아무것도 안 보이는 상태에서 처음 들어올 때만 기존의 아래→위 시트 모션을
  // 쓰도록 구분한다(요청 반영). 순서는 하단 탭 배치와 같은 기획안(0)/완성본(1)/
  // 채팅방(2) — 인덱스가 커지는 방향으로 이동하면 오른쪽에서, 작아지는 방향으로
  // 이동하면 왼쪽에서 새 화면이 들어오는 것으로 정의했다.
  const [trioScreen, setTrioScreen] = useState<0 | 1 | 2 | null>(null);
  const [trioEnterAnim, setTrioEnterAnim] = useState<'sheet' | 'slide-left' | 'slide-right'>('sheet');
  useEffect(() => {
    if (!detailOverlay.isOpen && !commentsOverlay.isOpen) setTrioScreen(null);
  }, [detailOverlay.isOpen, commentsOverlay.isOpen]);
  const computeTrioEnter = (nextScreen: 0 | 1 | 2) => {
    if (trioScreen === null) return 'sheet' as const;
    if (nextScreen === trioScreen) return 'sheet' as const;
    return nextScreen > trioScreen ? ('slide-right' as const) : ('slide-left' as const);
  };

  const handleOpenDetail = (item: any, type: 'proposal' | 'final', originRect?: DOMRect) => {
    const nextScreen: 0 | 1 = type === 'proposal' ? 0 : 1;
    setTrioEnterAnim(computeTrioEnter(nextScreen));
    setTrioScreen(nextScreen);
    setDetailOverlay({ isOpen: true, item, type, originRect: originRect || null, startPeek: false });
    setDetailOpenToken(t => t + 1);
    // 코멘트 페이지의 기획안/완성본 탭에서 이 함수를 호출해 상세보기로 넘어갈 때,
    // 코멘트 페이지 자신은 여기서 함께 닫는다 — 코멘트 쪽 onClick이 별도로
    // onClose()까지 호출하면, 그 onClose prop 자체가(요청#9 반영으로) 상세보기도
    // 같이 닫아버리게 되어 있어서 방금 이 함수가 연 상세보기를 도로 닫아버리는
    // 충돌이 있었다(기획안/완성본 아이콘 중 어느 걸 눌러도 3요소가 같은 위계로
    // 서로 오가야 한다는 요청과 충돌하던 버그) — 상세보기를 여는 이 지점에서
    // 코멘트를 닫는 걸로 일원화해 그 충돌을 없앴다.
    setCommentsOverlay(prev => ({ ...prev, isOpen: false }));
  };

  const handleOpenSubmit = (mode: 'proposal' | 'final', targetItem?: any) => {
    setSubmitOverlay({ mode, targetItem: targetItem || null });
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
    }
  ];
  // 프로필 탭은 하단 4탭 캡슐에서 제거하고, 대신 대시보드 맨 아래 Family site/
  // 프로필 링크에서 진입한다(요청 반영) — activeTab의 'profile' 값 자체와 그
  // 렌더 분기는 그대로 유지, 진입 경로만 하단 nav에서 대시보드 하단 버튼으로 바뀐다.

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
            여백을 준다(노치 대응). 캘린더 그리드뷰는 상하 스크롤 자체가 필요 없다는
            요청으로 overflow-hidden — 월 이동은 좌우 스와이프로만 하고, 리스트뷰(항목이
            많아 스크롤이 필요)는 그대로 overflow-y-auto 유지. */}
        <main
          className={`flex-1 safe-pt p-4 relative min-h-0 ${
            activeTab === 'calendar' && calendarViewType === 'grid' ? 'overflow-hidden' : 'overflow-y-auto'
          } ${
            activeTab === 'dashboard'
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
              onNavigateToList={() => setActiveTab('list')}
              selectedItem={selectedListItem}
              onSelectItem={setSelectedListItem}
              user={user}
              onOpenDetail={handleOpenDetail}
              onOpenSubmit={handleOpenSubmit}
              onOpenComments={handleOpenComments}
              onOpenProfile={() => setActiveTab('profile')}
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
              user={user}
              onOpenDetail={handleOpenDetail}
              onOpenSubmit={handleOpenSubmit}
              onOpenComments={handleOpenComments}
            />
          )}

          {activeTab === 'list' && (
            <MobileFullList
              contents={contents}
              selectedItem={selectedListItem}
              onSelectItem={setSelectedListItem}
              revealSearch={listSearchTrigger}
              user={user}
              onOpenDetail={handleOpenDetail}
              onOpenSubmit={handleOpenSubmit}
              onOpenComments={handleOpenComments}
            />
          )}

          {activeTab === 'profile' && (
            <MobileProfile user={user} onLogout={onLogout} />
          )}
        </main>

        {/* 하단 2버튼 액션 바 — 이제 대시보드(선택 없는 기본 상태)에서만 쓰인다.
            전체 리스트/캘린더(그리드 날짜팝업·리스트뷰 모두)/대시보드 승인대기
            리스트는 전부 "선택 시 그 블록 자체가 늘어나며 인라인 아이콘이 나타나는"
            방식으로 통일됐다(MobileFullList 참고) — 이 플로팅 바는 콘텐츠 생성
            진입점(기획안 작성/완성본 업로드) 전용으로만 남았다. fixed to the shell
            so it never scrolls away. */}
        {/* 이 줄의 모든 flex-1 버튼은 px-4를 똑같이 갖고 있어야 한다 — 아이콘 전용
            버튼(패딩 없음)과 아이콘+텍스트 버튼(px-4 있음)을 나란히 두면, 겉보기엔
            flex-basis:0%/min-w-0로 정확히 반반 나뉠 것 같지만 실제로는 패딩이 있는
            쪽이 패딩만큼 더 넓게 자라는 걸 실측으로 확인했다(패딩을 양쪽 다 0으로
            맞추면 즉시 정확히 반반이 됨) — 그래서 폭을 맞추려면 padding 자체를
            대칭으로 맞추는 것 말고는 방법이 없다. */}
        {/* 승인대기 리스트에서 내 콘텐츠를 선택하면(그 블록이 인라인으로 확장되는 동안)
            이 생성 버튼 바가 화면 아래로 살짝 가라앉으며 사라지고, 선택을 해제하면
            다시 떠오른다(요청 반영) — 탭 전환(activeTab)과는 별개로, 같은 대시보드
            탭 안에서 selectedListItem 유무에 따라 항상 마운트된 채 opacity/위치만
            전환한다(트랜지션이 끊기지 않도록 mount/unmount 대신 순수 CSS transition). */}
        {activeTab === 'dashboard' && (
          <div
            className={`absolute left-3.5 right-3.5 z-20 flex items-center gap-3 bottom-[calc(5.125rem+env(safe-area-inset-bottom))] transition-all duration-200 ease-out ${
              selectedListItem ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
            }`}
          >
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
            aria-label="검색"
            className="glass-cta w-[3.625rem] h-[3.625rem] rounded-full flex items-center justify-center text-slate-700 text-lg flex-shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            🔍
          </button>
        </div>

        {/* Detail Modal Overlay */}
        <MobileDetailModal
          isOpen={detailOverlay.isOpen}
          onClose={() => setDetailOverlay(prev => ({ ...prev, isOpen: false }))}
          type={detailOverlay.type}
          item={detailOverlay.item}
          originRect={detailOverlay.originRect}
          startPeek={detailOverlay.startPeek}
          openToken={detailOpenToken}
          peekTopVh={detailPeekTopVh}
          user={user}
          onEdit={(editItem, editType) => {
            setDetailOverlay(prev => ({ ...prev, isOpen: false }));
            handleOpenSubmit(editType, editItem);
          }}
          onOpenComments={handleOpenComments}
          enterAnim={trioEnterAnim}
        />

        {/* Mobile Submission Form Modal */}
        <MobileSubmitModal
          isOpen={submitOverlay.mode !== 'none'}
          onClose={() => setSubmitOverlay({ mode: 'none', targetItem: null })}
          mode={submitOverlay.mode === 'final' ? 'final' : 'proposal'}
          targetItem={submitOverlay.targetItem}
          user={user}
          allProfiles={allProfiles}
        />

        {/* Comments (채팅방) Page */}
        <MobileCommentsPage
          isOpen={commentsOverlay.isOpen}
          onClose={() => {
            // 상세보기의 "채팅방" 탭을 거쳐 들어온 경우, 상세보기(isOpen)는
            // 뒤에서 계속 열려있는 채로 코멘트 페이지만 그 위를 덮고 있었다 — 그래서
            // 코멘트를 닫으면 다시 상세보기로 "돌아가"는 것처럼 보였다. 상세보기의
            // 자체 닫기(X)와 동일하게 항상 메인화면까지 나가도록, 코멘트를 닫을 때
            // 상세보기도 함께 닫는다(상세보기가 애초에 안 열려있었으면 무해한 no-op).
            setCommentsOverlay(prev => ({ ...prev, isOpen: false }));
            setDetailOverlay(prev => ({ ...prev, isOpen: false }));
          }}
          item={commentsOverlay.item}
          user={user}
          onOpenDetail={handleOpenDetail}
          onEdit={(editItem, editType) => handleOpenSubmit(editType, editItem)}
          enterAnim={trioEnterAnim}
        />
      </div>
    </div>
  );
}
