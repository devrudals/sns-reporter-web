'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';

interface MobileDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'proposal' | 'final';
  item?: any;
  // 탭한 카드의 뷰포트 좌표(호출부가 getBoundingClientRect()로 측정) — 있으면 그 카드
  // 위치/크기에서 전체화면으로 커지는 FLIP 전환을, 없으면 기본 하단 슬라이드업을 쓴다.
  // 현재는 이 prop을 넘기는 호출부가 없어 FLIP 경로가 실제로 쓰이진 않지만, 카드 기반
  // 진입점이 다시 생기면 재사용할 수 있게 남겨둔다.
  originRect?: DOMRect | null;
  // 미리보기 진입 전용 — Figma REST API로 확인한 실제 peek 컴포넌트(기획안/완성본,
  // componentId 856:37923/856:37924)는 이 상세보기와 동일한 콘텐츠를 peek 상태로
  // 보여주다가, 탭하거나 위로 스와이프하면 0%(전체화면)까지 차오른다. true면 peek
  // 상태로 열린다.
  startPeek?: boolean;
  // peek 시작 지점(화면 높이 대비 %) — 화면마다 Figma에 실측된 값이 다르다: 대시보드
  // 69.2%(605/874), 캘린더 36.4%(318/874, 캘린더4/5). startPeek일 때만 의미가 있고,
  // 생략하면 대시보드 기본값을 쓴다.
  peekTopVh?: number;
  // 우상단 연필 아이콘 전용 — 현재는 MobileSubmitModal이 빈 폼만 지원해서 기존
  // 항목 데이터를 미리 채워주지는 못한다(진짜 "수정"이 되려면 그 모달에 별도로
  // pre-fill/수정 모드를 만들어야 함). 지금은 같은 종류(기획안/완성본)의 작성 폼을
  // 여는 것으로 최소 구현.
  onEdit?: (item: any, type: 'proposal' | 'final') => void;
  // 하단 "완성본" 탭 전용 — 완성본이 아직 없는 콘텐츠에서 완성본 쪽으로 넘어가려 할 때
  // "내 콘텐츠인지" 판단해 업로드로 보낼지, 권한 없음 토스트를 띄울지 가른다.
  user?: any;
  // 하단 "채팅방" 탭 전용 — 피드백은 더 이상 이 상세보기 안에 인라인으로 없고, 별도
  // 코멘트 페이지(MobileCommentsPage)로 완전히 분리됐다.
  onOpenComments?: (item: any) => void;
  // 기획안/완성본/채팅방 3요소 중 처음 들어오는 경우엔 기존 시트(아래→위) 모션을,
  // 이미 셋 중 하나를 보고 있다가 이 화면으로 넘어오는 경우엔 좌우 슬라이드 모션을
  // 쓴다(요청 반영) — 셸이 트리오 안에서의 이동 방향을 계산해 넘겨준다.
  enterAnim?: 'sheet' | 'slide-left' | 'slide-right';
  // 호출부(셸)가 "상세보기를 열어라"라고 명시적으로 호출할 때마다 1씩 증가하는 값.
  // 하단 완성본/기획안 탭은 이 모달 내부에서 currentTab을 직접 바꾸는데(로컬 상태),
  // 그 상태로 코멘트 페이지 등 다른 경로를 거쳐 "기획안으로 돌아가라"처럼 호출부가
  // 넘기는 type이 이전과 같은 값(예: 계속 'proposal')이면 isOpen/type/originRect/
  // startPeek이 하나도 안 바뀌어 아래 동기화 effect가 재실행되지 않고, 로컬에서
  // 바꿔둔 currentTab('final')이 그대로 남아 있는 버그가 있었다(실기기 회귀
  // 테스트로 발견). 값 자체의 변화 여부와 무관하게 "호출부가 명시적으로 열라고
  // 했다"는 사실만으로 매번 재동기화하도록 이 토큰을 의존성에 추가한다.
  openToken?: number;
}

const CLOSE_MS = 420;
const DEFAULT_PEEK_TOP_VH = 69.2;

export default function MobileDetailModal({ isOpen, onClose, type, item, originRect, startPeek, peekTopVh, onEdit, user, onOpenComments, enterAnim = 'sheet', openToken }: MobileDetailModalProps) {
  const effectivePeekTopVh = peekTopVh ?? DEFAULT_PEEK_TOP_VH;
  const [currentTab, setCurrentTab] = useState<'proposal' | 'final'>(type || 'proposal');
  // 기획안⇄완성본 전환(하단 탭 탭, 좌우 스와이프, 또는 코멘트 페이지에서 넘어와
  // type prop이 바뀌는 경우 전부 포함) 시 콘텐츠 영역이 좌우로 슬라이드하도록—
  // 탭이 바뀔 때마다 이전 탭과 비교해 방향을 계산해두고, 콘텐츠를 currentTab으로
  // key를 걸어 리마운트시켜 매번 애니메이션이 재생되게 한다.
  const prevTabRef = useRef<'proposal' | 'final'>(currentTab);
  const [tabSlideDir, setTabSlideDir] = useState<'left' | 'right'>('right');
  useEffect(() => {
    if (prevTabRef.current !== currentTab) {
      setTabSlideDir(currentTab === 'final' ? 'right' : 'left');
      prevTabRef.current = currentTab;
    }
  }, [currentTab]);
  const modalRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'entering' | 'open' | 'closing'>(originRect ? 'entering' : 'open');
  const [originTransform, setOriginTransform] = useState<string | undefined>(undefined);
  const [viewState, setViewState] = useState<'peek' | 'full'>(startPeek ? 'peek' : 'full');
  // peek로 들어온 모달을 닫을 때 — 열릴 때(아래에서 peek/full로 올라옴)와 대칭으로,
  // peek든 full이든 화면 아래로 완전히 사라지는 슬라이드다운 모션을 재생한다.
  const [isClosingPeek, setIsClosingPeek] = useState(false);
  // 일반(peek 아닌) 진입 — 지금은 사실상 유일한 경로 — 의 뒤로가기/닫기 모션.
  // 열릴 때(animate-in slide-in-from-bottom)의 대칭으로 슬라이드다운+페이드아웃을
  // 재생한 뒤 실제 언마운트(onClose)로 넘어간다.
  const [isClosingSheet, setIsClosingSheet] = useState(false);
  const SHEET_CLOSE_MS = 200;
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  // 좌상단 배지 탭 → 완성본이 없는데 권한도 없을 때 잠깐 띄우는 중앙 토스트
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 1800);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // 내용 블록 탭-투-카피 — 정지 상태에서 한 번 탭하면 "탭하여 복사" 확인 상태로
  // 바뀌고, 그 상태에서 한 번 더 탭하면 실제로 클립보드에 복사되며 잠깐 "복사됨"
  // 표시가 뜬다. 피그마 실제 상세보기 프레임(캘린더 6/7)의 프로토타입 인터랙션을
  // REST API로 직접 조사했지만 뒤로가기/호버 미리보기 외에는 이 복사 인터랙션이
  // 없어(요청 당시 첨부하려던 참고 이미지도 용량 초과로 전달되지 못함) 정확한
  // 원본 모션을 확인하지 못했다 — 설명된 2단계 탭 동작을 최대한 그대로 구현했다.
  const [copyArmedField, setCopyArmedField] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  // <br>/</p>/</div> 등 블록 경계 태그를 textContent가 읽기 전에 개행으로 바꿔둬야
  // 줄바꿈이 살아남는다 — textContent는 태그를 전부 제거만 할 뿐 그 자리에 아무
  // 공백도 넣어주지 않아서, 이 전처리 없이는 문단이 전부 한 줄로 붙어버렸다.
  const htmlToPlainText = (html: string) => {
    if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '');
    const withBreaks = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n');
    const div = document.createElement('div');
    div.innerHTML = withBreaks;
    return (div.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  };
  const handleBlockTap = (fieldKey: string, getPlainText: () => string) => {
    if (copyArmedField === fieldKey) {
      navigator.clipboard?.writeText(getPlainText()).catch(() => {});
      setCopyArmedField(null);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 1300);
    } else {
      setCopyArmedField(fieldKey);
    }
  };
  const renderCopyableBlock = (fieldKey: string, label: string, html: string) => {
    const isArmed = copyArmedField === fieldKey;
    const isCopied = copiedField === fieldKey;
    return (
      <div
        onClick={(e) => { e.stopPropagation(); handleBlockTap(fieldKey, () => htmlToPlainText(html)); }}
        className="relative bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5 cursor-pointer active:scale-[0.99] transition-transform overflow-hidden"
      >
        <div className="text-xs font-bold text-slate-800">{label}</div>
        <div
          className="rich-text-content text-xs text-slate-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {(isArmed || isCopied) && (
          <div className={`absolute inset-0 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-black animate-in fade-in duration-150 ${
            isCopied ? 'bg-[#002454]/95 text-white' : 'bg-white/95 text-[#002454] border-2 border-[#002454]'
          }`}>
            {isCopied ? <>✓ 복사되었습니다</> : <>📋 탭하여 복사</>}
          </div>
        )}
      </div>
    );
  };
  // #해시태그 카드도 나머지 블록과 동일한 탭-투-카피 상호작용을 쓰되, "#키워드1
  // #키워드2 #키워드3" 형태(공백 구분)로 복사한다(요청 반영).
  const renderHashtagBlock = (fieldKey: string, hashtags: string[]) => {
    const isArmed = copyArmedField === fieldKey;
    const isCopied = copiedField === fieldKey;
    return (
      <div
        onClick={(e) => { e.stopPropagation(); handleBlockTap(fieldKey, () => hashtags.map(kw => `#${kw}`).join(' ')); }}
        className="relative bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 cursor-pointer active:scale-[0.99] transition-transform overflow-hidden"
      >
        <div className="text-xs font-bold text-slate-800">#해시태그</div>
        <div className="flex flex-wrap gap-1.5">
          {hashtags.map((kw, i) => (
            <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold">
              #{kw}
            </span>
          ))}
        </div>
        {(isArmed || isCopied) && (
          <div className={`absolute inset-0 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-black animate-in fade-in duration-150 ${
            isCopied ? 'bg-[#002454]/95 text-white' : 'bg-white/95 text-[#002454] border-2 border-[#002454]'
          }`}>
            {isCopied ? <>✓ 복사되었습니다</> : <>📋 탭하여 복사</>}
          </div>
        )}
      </div>
    );
  };

  // FLIP: 카드의 화면 좌표(originRect)에서 시작해 부모(셸 프레임) 전체 크기로 커지는
  // transform을 계산하고, 다음 프레임에 identity로 되돌려 실제 애니메이션을 재생한다.
  // peek로 여는 경우(startPeek)는 이 FLIP을 쓰지 않고 별도의 peek↔full transform을 쓴다.
  useLayoutEffect(() => {
    if (!isOpen) return;
    setViewState(startPeek ? 'peek' : 'full');
    setIsClosingPeek(false);
    setIsClosingSheet(false);
    // 이 모달은 열림/닫힘과 무관하게 항상 마운트된 채로 재사용된다(isOpen이
    // false일 때 그냥 null을 렌더링할 뿐) — 그래서 currentTab을 useState 초기값으로만
    // 두면 첫 오픈 이후엔 절대 안 바뀌어, 완성본이 있는 콘텐츠를 한 번이라도
    // 완성본 탭으로 봤다면 그 뒤로 다른 콘텐츠를 기획안(type='proposal')으로 열어도
    // currentTab이 'final'에 그대로 머물러 있었다. 열릴 때마다 호출부가 넘긴 type으로
    // 명시적으로 다시 맞춘다. isOpen이 이미 true인 채로(예: 코멘트 페이지에서 같은
    // 상세보기가 열려있는 상태로 기획안↔완성본 탭만 바꿔 다시 onOpenDetail을 호출한
    // 경우) type만 바뀌는 경우도 있어 type도 의존성 배열에 넣어야 한다 — isOpen만
    // 보면 그 경우 이 effect 자체가 재실행되지 않아 currentTab이 갱신되지 않았다.
    setCurrentTab(type || 'proposal');
    const el = modalRef.current;
    const parent = el?.parentElement;
    if (!el || !parent || !originRect || startPeek) {
      setPhase('open');
      return;
    }
    const target = parent.getBoundingClientRect();
    const scaleX = originRect.width / target.width;
    const scaleY = originRect.height / target.height;
    const translateX = originRect.left - target.left;
    const translateY = originRect.top - target.top;
    setOriginTransform(`translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`);
    setPhase('entering');
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase('open')));
  }, [isOpen, type, originRect, startPeek, openToken]);

  const closeAnimated = () => {
    // Figma 조사로 확정된 설계(캘린더4~7): peek→full로 들어온 경우 "닫기"는 한 번에
    // 사라지지 않고 한 단계씩 되돌아간다 — full에서는 peek로, peek에서는 완전히 닫힌다.
    if (startPeek && viewState === 'full') {
      setViewState('peek');
      return;
    }
    if (startPeek) {
      setIsClosingPeek(true);
      setTimeout(onClose, CLOSE_MS);
    } else if (originRect) {
      setPhase('closing');
      setTimeout(onClose, CLOSE_MS);
    } else {
      setIsClosingSheet(true);
      setTimeout(onClose, SHEET_CLOSE_MS);
    }
  };

  const onHandlePointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    if (viewState === 'peek') return; // peek는 탭/스와이프업으로만 확장, 드래그 추종은 full에서만
    setDragY(Math.max(0, e.clientY - dragStartY.current));
  };
  const onHandlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (viewState === 'peek') {
      // 위로 스와이프하면 확장, 그 외엔 탭으로 간주해 마찬가지로 확장(핸들을 눌렀으니
      // 의도가 명확함 — 짧은 탭도 살짝의 pointer 이동으로 dy가 발생하지만 문턱값 이내).
      // 아래로 스와이프하면 완전히 닫는다(뒤 배경 탭과 동일한 동작).
      const dy = e.clientY - dragStartY.current;
      if (dy < -30 || Math.abs(dy) < 8) setViewState('full');
      else if (dy > 30) closeAnimated();
      setDragY(0);
      return;
    }
    if (dragY > 120) {
      closeAnimated();
    }
    setDragY(0);
  };

  // 미리보기/상세보기 내용 위에서 좌우로 스와이프하면 기획안⇄완성본 탭이 바뀐다(peek·
  // full 상태 모두 — 버튼 대신 제스처로도 전환 가능하게). 스와이프로 처리된 제스처는
  // 뒤이어 발생하는 합성 click까지 peek→full 확장으로 이어지지 않도록(peek일 때만
  // 의미 있음, full에서는 무해) suppressNextClick으로 막는다.
  const tabSwipeStart = useRef<{ x: number; y: number; scrollTopAtStart: number } | null>(null);
  const suppressNextClick = useRef(false);
  const mainRef = useRef<HTMLElement>(null);
  const onTabSwipePointerDown = (e: React.PointerEvent) => {
    tabSwipeStart.current = { x: e.clientX, y: e.clientY, scrollTopAtStart: mainRef.current?.scrollTop ?? 0 };
  };
  const onTabSwipePointerUp = (e: React.PointerEvent) => {
    const start = tabSwipeStart.current;
    tabSwipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      // 실사용 피드백으로 방향 정정 — 우측 스와이프(dx>0) → 기획안, 좌측(dx<0) → 완성본.
      setCurrentTab(dx > 0 ? 'proposal' : 'final');
      suppressNextClick.current = true;
      return;
    }
    // 최상단 풀-투-디스미스 — 스크롤이 이미 맨 위(scrollTop 0)에 있는 상태에서 아래로
    // 당기면(수정하기가 보이는 중간 스크롤 위치에서 위로 올려 맨 위에 도달하는 것과는
    // 구분됨 — 그건 그냥 정상 스크롤이 되어 맨 위에서 멈춘다) 뒤로가기와 같은 닫기
    // 모션으로 이어진다. 제스처 시작·종료 시점 모두 scrollTop이 0이어야 "이미 맨
    // 위에서 당긴" 것으로 인정 — 중간에서 맨 위까지 올라온 일반 스크롤은 걸러낸다.
    const currentScrollTop = mainRef.current?.scrollTop ?? 0;
    if (
      dy > 70 && dy > Math.abs(dx) * 1.5 &&
      start.scrollTopAtStart === 0 && currentScrollTop === 0
    ) {
      closeAnimated();
    }
  };

  if (!isOpen || !item) return null;

  const peekTransform = `translateY(${effectivePeekTopVh}dvh)`;
  const transform = isClosingPeek
    ? 'translateY(100dvh)'
    : viewState === 'peek'
    ? peekTransform
    : phase === 'entering' || phase === 'closing'
    ? originTransform
    : dragY
    ? `translateY(${dragY}px)`
    : undefined;
  // 살짝의 opacity 페이드를 transform과 함께 걸어서, 축소된 미니어처 텍스트가 원래
  // 크기로 확대되며 생기는 픽셀 늘어남을 시각적으로 덜 도드라지게 한다.
  const opacity = originRect && (phase === 'entering' || phase === 'closing') ? 0.5 : 1;
  const rootStyle: React.CSSProperties = {
    transform,
    opacity,
    transformOrigin: 'top left',
    transition: (phase === 'entering' || isDragging)
      ? 'none'
      : 'transform 0.42s cubic-bezier(0.22,1,0.36,1), opacity 0.42s cubic-bezier(0.22,1,0.36,1)',
  };
  const handleProps = {
    onPointerDown: onHandlePointerDown,
    onPointerMove: onHandlePointerMove,
    onPointerUp: onHandlePointerUp,
    onPointerCancel: onHandlePointerUp,
    style: { touchAction: 'none' as const },
  };

  let bodyObj: any = {};
  try {
    if (item.content_body && item.content_body.startsWith('{')) {
      bodyObj = JSON.parse(item.content_body);
    }
  } catch (e) {}

  // "지금 보여줄 화면"은 오직 currentTab만 따른다 — 예전엔 item.status가 완성본
  // 계열이면 무조건 true로 OR돼 있어서, 완성본이 이미 있는 콘텐츠는 호출부가
  // type='proposal'(예: 📋 아이콘)로 열어도 무조건 완성본 화면부터 보여주는
  // 버그가 있었다. "이 콘텐츠에 완성본이 있는지"는 아래 hasFinalContent가 이미
  // item.status 기준으로 따로 계산한다 — 그거면 충분하고 화면 전환과는 무관하다.
  const isFinal = currentTab === 'final';
  // 배지 탭 로직 전용 — isFinal은 currentTab에도 좌우되는 "지금 보여줄 화면" 판단이라,
  // "이 콘텐츠에 완성본이 실제로 있는지"만 따로 계산한다(currentTab과 무관).
  const hasFinalContent = ['final_submitted', 'final_revision', 'completed', 'uploaded'].includes(item.status) || !!item.final_url;
  const isOwnContent = !!(user?.email && bodyObj.authorEmail && user.email === bodyObj.authorEmail);

  // 기획안 필드 (PC ProposalSubmitForm/ContentsLayout과 동일한 매핑)
  const intentHtml = item.intent || bodyObj.intent || '';
  const compositionHtml = bodyObj.composition || '';
  const filmingPlanHtml = bodyObj.contentBody || '';
  const remarksHtml = item.description || bodyObj.description || '';

  // 완성본 필드 — 기존에는 기획안의 intent/keywords를 그대로 재사용해 완성본 뷰에
  // 잘못된(기획안) 내용이 표시되고 있었다. PC(ContentsLayout.tsx의 finalData)와
  // 동일하게 완성본 전용 필드로 분리한다.
  const postContentHtml = bodyObj.postContent || '';
  const finalDescriptionHtml = bodyObj.finalDescription || '';
  const finalKeywordsRaw = bodyObj.finalKeywords || '';

  const driveUrl = item.final_url || bodyObj.docsUrl || bodyObj.driveUrl || '';

  // Clean crew list without dummy placeholders
  let crewList: string[] = [];
  if (bodyObj.crew) {
    if (typeof bodyObj.crew === 'string') {
      crewList = bodyObj.crew.split(',').map((s: string) => s.trim()).filter(Boolean);
    } else if (Array.isArray(bodyObj.crew)) {
      crewList = bodyObj.crew.map((c: any) => c.name || c).filter(Boolean);
    }
  }
  if (crewList.length === 0 && item.author_name) {
    crewList = [item.author_name];
  }

  const toHashtags = (raw: any) =>
    raw
      ? String(raw).split(',').map(k => k.trim().replace(/^#+/, '')).filter(Boolean)
      : [];
  const proposalHashtags = toHashtags(item.keywords);
  const finalHashtags = finalKeywordsRaw ? toHashtags(finalKeywordsRaw) : proposalHashtags;

  return (
    <>
      {/* peek 상태에서만 보이는 딤 배경 — 탭하면 전체 닫기(Figma: 뒤 배경 탭 → 메인) */}
      {viewState === 'peek' && (
        <div
          className="absolute inset-0 z-40 bg-black/50 backdrop-blur-xs animate-in fade-in duration-300"
          onClick={closeAnimated}
        />
      )}
      <div
        ref={modalRef}
        onClick={() => {
          if (suppressNextClick.current) { suppressNextClick.current = false; return; }
          if (viewState === 'peek') setViewState('full');
        }}
        className={`absolute inset-0 z-50 bg-[#F4F5F7] flex flex-col overflow-hidden ${viewState === 'peek' ? 'rounded-t-[1.75rem] shadow-2xl cursor-pointer' : ''} ${
          originRect || viewState === 'peek'
            ? ''
            : isClosingSheet
            ? 'animate-out fade-out slide-out-to-bottom duration-200 ease-in fill-mode-forwards'
            : enterAnim === 'slide-right'
            ? 'animate-in fade-in slide-in-from-right duration-250 ease-out'
            : enterAnim === 'slide-left'
            ? 'animate-in fade-in slide-in-from-left duration-250 ease-out'
            : 'animate-in fade-in slide-in-from-bottom duration-300 ease-out'
        }`}
        style={rootStyle}
      >
      {/* 종이를 아래에서 위로 꺼낸 모션의 반대 동작 — peek에서는 탭/위로 스와이프하면
          전체화면으로 펼쳐지고, full에서는 아래로 스와이프하면 닫힌다. navy 헤더를
          없앤 뒤로는 이 핸들도 셸 배경과 어울리게 밝은 톤으로 바꿨다. */}
      <div {...handleProps} className="safe-pt pt-2.5 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
        <div className="w-10 h-1.5 rounded-full bg-slate-300" />
      </div>

      {/* 하단 "완성본" 탭 액션의 안내 토스트 — 화면 정중앙, 검은 배경/흰 글씨로 잠시 노출 */}
      {toastMsg && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none px-8">
          <div className="bg-black/85 text-white text-sm font-bold px-5 py-3 rounded-2xl text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
            {toastMsg}
          </div>
        </div>
      )}

      {/* 2. Main Scrollable Content Body (No Dummy Text, Pristine Layout) — peek
          상태에서는 고정된 미리보기 도크라 위아래 스크롤이 되면 안 된다(스크롤과
          좌우 스와이프 제스처가 충돌하기도 함) — full로 펼쳐졌을 때만 스크롤 허용. */}
      <main
        ref={mainRef}
        onPointerDown={onTabSwipePointerDown}
        onPointerUp={onTabSwipePointerUp}
        className={`flex-1 p-4 sm:p-5 overflow-x-hidden space-y-4 max-w-xl mx-auto w-full pb-28 text-slate-900 ${
          viewState === 'peek' ? 'overflow-y-hidden' : 'overflow-y-auto'
        }`}>

        {/* 기획안/완성본 표시 + 작성자/날짜 — 예전엔 화면 위에 항상 떠 있는 글래스
            배지·칩이었는데, 스크롤과 함께 흐르는 일반 레이어로 내리고(제목 바로 위)
            글래스 재질도 뺐다(납작한 단색 배지). 이제 순수 정보 표시용이라 탭해도
            아무 동작을 하지 않는다 — 기획안⇄완성본 전환은 하단 탭으로 옮겨갔다. */}
        <div className="flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-xs font-black text-white ${isFinal ? 'bg-[#00A859]' : 'bg-[#FFB800]'}`}>
            {isFinal ? '완성본 🎬' : '기획안 📝'}
          </span>
          <div className="text-right text-[11px] text-slate-500 font-bold leading-tight">
            <div>{item.author_name}</div>
            {item.created_at && <div>{item.created_at.split('T')[0]}</div>}
          </div>
        </div>

        {/* SCENARIO A: 완성본 뷰 */}
        <div
          key={currentTab}
          className={tabSlideDir === 'right' ? 'animate-in fade-in slide-in-from-right-8 duration-200 ease-out' : 'animate-in fade-in slide-in-from-left-8 duration-200 ease-out'}
        >
        {isFinal ? (
          <div className="space-y-4">

            {/* Google Drive Visual Banner Card */}
            <div className="w-full bg-[#1E293B] rounded-2xl p-5 text-white shadow-md space-y-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <svg className="w-8 h-8" viewBox="0 0 87.3 78">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                  </svg>
                  <span className="text-sm font-black text-slate-200">Google Drive</span>
                </div>
                {driveUrl && (
                  <a
                    href={driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                  >
                    <span>Open Drive ↗</span>
                  </a>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-white leading-snug">{item.title}</h3>
                <div className="text-xs text-slate-300 font-medium">
                  {item.author_name} • {item.team || 'SNS 기자단'} • {item.content_type || '콘텐츠'}
                </div>
              </div>

              {driveUrl && (
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-blue-300 underline break-all line-clamp-1 block hover:text-blue-100"
                >
                  {driveUrl}
                </a>
              )}
            </div>

            {/* Clean Real Content Cards — 완성본 전용 필드(postContent/finalDescription)를
                사용한다. 기획안의 intent/keywords를 그대로 재사용하던 이전 버그 수정. */}
            <div className="space-y-3">
              {postContentHtml && renderCopyableBlock('postContent', '본문 / 캡션 내용', postContentHtml)}
              {finalDescriptionHtml && renderCopyableBlock('finalDescription', '비고', finalDescriptionHtml)}

              {/* 제작 인원 */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                <div className="text-xs font-bold text-slate-800">제작 인원</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {crewList.map((name, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl">
                      <div className="w-6 h-6 rounded-full bg-[#002454] text-white font-black text-[10px] flex items-center justify-center">
                        {name.slice(0, 2)}
                      </div>
                      <span className="text-xs font-bold text-slate-800">{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* #해시태그 */}
              {finalHashtags.length > 0 && renderHashtagBlock('finalHashtags', finalHashtags)}
            </div>
          </div>
        ) : (
          /* SCENARIO B: 기획안 뷰 */
          <div className="space-y-4">
            {/* Title Card — 작성자/날짜는 카드 밖 우상단의 독립 플로팅 칩으로 분리했다
                (위쪽 배지와 대칭 위치, 이 파일 상단 참고). */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-xs font-bold text-slate-400">제목 (가제)</div>
              <h3 className="text-lg font-black text-slate-900 leading-snug">{item.title}</h3>
            </div>

            {/* Content Category Chips */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="text-xs font-bold text-slate-800">콘텐츠 분류</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3.5 py-1.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold">{item.team || '유튜브'}</span>
                <span className="px-3.5 py-1.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold">{item.content_type || '카드뉴스'}</span>
                {bodyObj.articleType && (
                  <span className="px-3.5 py-1.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold">{bodyObj.articleType}</span>
                )}
              </div>
            </div>

            {/* Crew Circles */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="text-xs font-bold text-slate-800">참여인원 (크루)</div>
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {crewList.map((name, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-[#002454] text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-xs">
                      {name.slice(0, 2)}
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 mt-1">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 기획 의도 및 배경 (rich text) */}
            {intentHtml && renderCopyableBlock('intent', '기획 의도 및 배경', intentHtml)}

            {/* 구성 및 내용 (PC의 bodyObj.composition — 이전엔 이 필드 자체가 없었음) */}
            {compositionHtml && renderCopyableBlock('composition', '구성 및 내용', compositionHtml)}

            {/* 촬영 계획 (PC의 bodyObj.contentBody — 이전엔 누락) */}
            {filmingPlanHtml && renderCopyableBlock('filmingPlan', '촬영 계획', filmingPlanHtml)}

            {/* 비고 (DB description 컬럼 — 이전엔 "구성 및 내용 설명"으로 오표기) */}
            {remarksHtml && renderCopyableBlock('remarks', '비고', remarksHtml)}

            {/* Target Upload Date & Deadline */}
            {(bodyObj.desiredDate || item.target_date || bodyObj.deadline) && (
              <div className="grid grid-cols-2 gap-3">
                {(bodyObj.desiredDate || item.target_date) && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                    <div className="text-xs font-bold text-slate-800">희망 업로드 시기</div>
                    <div className="text-xs font-bold text-slate-800">{bodyObj.desiredDate || item.target_date}</div>
                  </div>
                )}
                {bodyObj.deadline && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                    <div className="text-xs font-bold text-slate-800">데드라인</div>
                    <div className="text-xs font-bold text-slate-800">{bodyObj.deadline}</div>
                  </div>
                )}
              </div>
            )}

            {/* Clean Hashtags */}
            {proposalHashtags.length > 0 && renderHashtagBlock('proposalHashtags', proposalHashtags)}
          </div>
        )}
        </div>

        {/* 수정하기 — 예전엔 우상단에 고정으로 떠 있었는데, 요청대로 콘텐츠와 함께
            스크롤되는 일반 흐름 요소로 내려 맨 아래에 배치했다. */}
        <button
          onClick={() => onEdit?.(item, isFinal ? 'final' : 'proposal')}
          className="glass-cta glass-cta-strong w-full py-3.5 text-[#002454] font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
        >
          <span>✏️</span>
          <span>수정하기</span>
        </button>
      </main>

      {/* 3. Bottom Nav — 예전엔 "수정하기"/"닫기" 두 버튼이었는데, 피드백이 별도 코멘트
          페이지로 완전히 분리되면서 그 진입점(채팅방)까지 포함해 셸의 메인 하단
          내비게이션과 똑같은 구조로 바꿨다: 기획안/완성본/채팅방 3개가 하나의 글래스
          캡슐 안에서 서로 연결된 탭(.glass-navbar + .glass-navbar-active)이고, 그
          오른쪽에 닫기(✕) 전용 버튼이 검색 버튼처럼 따로 떨어져 있다. */}
      <div className="absolute inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-2">
        <nav className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
          <div className="glass-navbar flex items-center h-[3.625rem] rounded-full p-1 gap-1">
            <button
              onClick={() => setCurrentTab('proposal')}
              className={`flex flex-1 flex-col items-center justify-center h-full rounded-full transition-all duration-300 active:scale-95 ${!isFinal ? 'glass-navbar-active' : ''}`}
            >
              <span className="text-lg">📋</span>
              <span className={`text-[0.6rem] mt-0.5 font-bold tracking-tight ${!isFinal ? 'text-white' : 'text-[#757575]'}`}>기획안</span>
            </button>
            <button
              onClick={() => {
                if (hasFinalContent) {
                  setCurrentTab('final');
                } else if (isOwnContent) {
                  onEdit?.(item, 'final');
                } else {
                  setToastMsg('아직 완성본이 업로드 되지 않았습니다');
                }
              }}
              className={`flex flex-1 flex-col items-center justify-center h-full rounded-full transition-all duration-300 active:scale-95 ${isFinal ? 'glass-navbar-active' : ''}`}
            >
              <span className="text-lg">🎬</span>
              <span className={`text-[0.6rem] mt-0.5 font-bold tracking-tight ${isFinal ? 'text-white' : 'text-[#757575]'}`}>완성본</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenComments?.(item); }}
              className="flex flex-1 flex-col items-center justify-center h-full rounded-full transition-all duration-300 active:scale-95"
            >
              <span className="text-lg">💬</span>
              <span className="text-[0.6rem] mt-0.5 font-bold tracking-tight text-[#757575]">채팅방</span>
            </button>
          </div>
        </nav>
        <button
          onClick={(e) => { e.stopPropagation(); closeAnimated(); }}
          aria-label="닫기"
          className="glass-cta w-[3.625rem] h-[3.625rem] rounded-full flex items-center justify-center text-slate-700 text-lg flex-shrink-0 active:scale-95 transition-transform cursor-pointer"
        >
          ✕
        </button>
      </div>
      </div>
    </>
  );
}
