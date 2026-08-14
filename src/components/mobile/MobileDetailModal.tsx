'use client';

import React, { useState, useRef, useLayoutEffect } from 'react';

interface MobileDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'proposal' | 'final';
  item?: any;
  // 탭한 미리보기 카드의 뷰포트 좌표(MobilePaperPreview가 측정) — 있으면 그 카드
  // 위치/크기에서 전체화면으로 커지는 FLIP 전환을, 없으면 기본 하단 슬라이드업을 쓴다.
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
}

const CLOSE_MS = 420;
const DEFAULT_PEEK_TOP_VH = 69.2;

// Matches ContentsLayout.tsx's parseCommentMarkdown: escape first, then apply a
// small safe markdown subset, so plain-text comments render with **bold** etc.
const parseCommentMarkdown = (text: string) => {
  if (!text) return '';
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:800">$1</strong>');
  escaped = escaped.replace(/\*(.*?)\*/g, '<em style="font-style:italic">$1</em>');
  escaped = escaped.replace(/~~(.*?)~~/g, '<del>$1</del>');
  escaped = escaped.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#3B82F6;font-weight:700;text-decoration:underline">$1</a>');
  escaped = escaped.replace(/\n/g, '<br />');
  return escaped;
};

const relativeTime = (iso: string) => {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
};

export default function MobileDetailModal({ isOpen, onClose, type, item, originRect, startPeek, peekTopVh }: MobileDetailModalProps) {
  const effectivePeekTopVh = peekTopVh ?? DEFAULT_PEEK_TOP_VH;
  const [currentTab, setCurrentTab] = useState<'proposal' | 'final'>(type || 'proposal');
  const modalRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'entering' | 'open' | 'closing'>(originRect ? 'entering' : 'open');
  const [originTransform, setOriginTransform] = useState<string | undefined>(undefined);
  const [viewState, setViewState] = useState<'peek' | 'full'>(startPeek ? 'peek' : 'full');
  // peek로 들어온 모달을 닫을 때 — 열릴 때(아래에서 peek/full로 올라옴)와 대칭으로,
  // peek든 full이든 화면 아래로 완전히 사라지는 슬라이드다운 모션을 재생한다.
  const [isClosingPeek, setIsClosingPeek] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);

  // FLIP: 카드의 화면 좌표(originRect)에서 시작해 부모(셸 프레임) 전체 크기로 커지는
  // transform을 계산하고, 다음 프레임에 identity로 되돌려 실제 애니메이션을 재생한다.
  // peek로 여는 경우(startPeek)는 이 FLIP을 쓰지 않고 별도의 peek↔full transform을 쓴다.
  useLayoutEffect(() => {
    if (!isOpen) return;
    setViewState(startPeek ? 'peek' : 'full');
    setIsClosingPeek(false);
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
  }, [isOpen, originRect, startPeek]);

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
      onClose();
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

  const isFinal = currentTab === 'final' || item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';

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

  const allDiscussions: any[] = Array.isArray(bodyObj.discussions) ? bodyObj.discussions : [];
  const discussions = allDiscussions.filter(d => (isFinal ? d.type === 'final' : (d.type === 'proposal' || !d.type)));

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
        onClick={() => { if (viewState === 'peek') setViewState('full'); }}
        className={`absolute inset-0 z-50 bg-[#F4F5F7] flex flex-col overflow-hidden ${viewState === 'peek' ? 'rounded-t-[1.75rem] shadow-2xl cursor-pointer' : ''} ${originRect || viewState === 'peek' ? '' : 'animate-in slide-in-from-bottom duration-300 ease-out'}`}
        style={rootStyle}
      >
      {/* 종이를 아래에서 위로 꺼낸 모션의 반대 동작 — peek에서는 탭/위로 스와이프하면
          전체화면으로 펼쳐지고, full에서는 아래로 스와이프하면 닫힌다 */}
      <div {...handleProps} className="safe-pt bg-[#002454] pt-2.5 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
        <div className="w-10 h-1.5 rounded-full bg-white/30" />
      </div>

      {/* 1. Header Navigation Bar */}
      <header className="bg-[#002454] text-white px-4 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <span className={`px-2.5 py-1 text-xs font-black rounded-lg ${isFinal ? 'bg-[#00A859]' : 'bg-[#FFB800]'} text-white`}>
            {isFinal ? '완성본 🎬' : '기획안 📝'}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentTab(currentTab === 'proposal' ? 'final' : 'proposal'); }}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold text-blue-100 transition-all flex items-center gap-1"
          >
            <span>{currentTab === 'proposal' ? '완성본 뷰' : '기획안 뷰'}</span>
            <span>⇄</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-blue-200 font-medium">
            작성자: {item.author_name} {item.created_at ? `/ ${item.created_at.split('T')[0]}` : ''}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); closeAnimated(); }}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition-colors text-sm"
          >
            ✕
          </button>
        </div>
      </header>

      {/* 2. Main Scrollable Content Body (No Dummy Text, Pristine Layout) */}
      <main className="flex-1 p-4 sm:p-5 overflow-y-auto overflow-x-hidden space-y-4 max-w-xl mx-auto w-full pb-28 text-slate-900">
        
        {/* SCENARIO A: 완성본 뷰 */}
        {isFinal ? (
          <div className="space-y-4">

            {/* Google Drive Visual Banner Card */}
            <div className="w-full bg-[#1E293B] rounded-2xl p-5 text-white shadow-md space-y-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 87.3 78" fill="currentColor">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.55z" fill="#0066da"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.45-1.2 3-1.2 4.55h27.5z" fill="#00ac47"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.5-2.6 7.6-13.15c.8-1.45 1.2-3 1.2-4.55h-27.45l6.05 10.5z" fill="#ea4335"/>
                    <path d="m43.65 25 13.75-23.8c-1.4-.8-2.95-1.2-4.55-1.2h-18.4c-1.6 0-3.15.4-4.55 1.2z" fill="#00832d"/>
                    <path d="m59.8 43.1-16.15-28-16.15 28h32.3z" fill="#2684fc"/>
                    <path d="m73.55 76.8 13.75-23.8c.8-1.45 1.2-3 1.2-4.55 0-1.55-.4-3.1-1.2-4.55l-25.4-44c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 28.7 49.7z" fill="#ffba00"/>
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
              {postContentHtml && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
                  <div className="text-xs font-bold text-slate-800">본문 / 캡션 내용</div>
                  <div
                    className="rich-text-content text-xs text-slate-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: postContentHtml }}
                  />
                </div>
              )}

              {finalDescriptionHtml && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
                  <div className="text-xs font-bold text-slate-800">비고</div>
                  <div
                    className="rich-text-content text-xs text-slate-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: finalDescriptionHtml }}
                  />
                </div>
              )}

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
              {finalHashtags.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                  <div className="text-xs font-bold text-slate-800">#해시태그</div>
                  <div className="flex flex-wrap gap-1.5">
                    {finalHashtags.map((kw, i) => (
                      <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold">
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* SCENARIO B: 기획안 뷰 */
          <div className="space-y-4">
            {/* Title Card */}
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
            {intentHtml && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
                <div className="text-xs font-bold text-slate-800">기획 의도 및 배경</div>
                <div
                  className="rich-text-content text-xs text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: intentHtml }}
                />
              </div>
            )}

            {/* 구성 및 내용 (PC의 bodyObj.composition — 이전엔 이 필드 자체가 없었음) */}
            {compositionHtml && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
                <div className="text-xs font-bold text-slate-800">구성 및 내용</div>
                <div
                  className="rich-text-content text-xs text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: compositionHtml }}
                />
              </div>
            )}

            {/* 촬영 계획 (PC의 bodyObj.contentBody — 이전엔 누락) */}
            {filmingPlanHtml && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
                <div className="text-xs font-bold text-slate-800">촬영 계획</div>
                <div
                  className="rich-text-content text-xs text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: filmingPlanHtml }}
                />
              </div>
            )}

            {/* 비고 (DB description 컬럼 — 이전엔 "구성 및 내용 설명"으로 오표기) */}
            {remarksHtml && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
                <div className="text-xs font-bold text-slate-800">비고</div>
                <div
                  className="rich-text-content text-xs text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: remarksHtml }}
                />
              </div>
            )}

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
            {proposalHashtags.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                <div className="text-xs font-bold text-slate-800">#해시태그</div>
                <div className="flex flex-wrap gap-1.5">
                  {proposalHashtags.map((kw, i) => (
                    <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold">
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 피드백 (읽기 전용) — PC ContentsLayout의 discussions와 동일한 데이터,
            기획안/완성본 타입별로 필터링. 댓글 작성은 PC에서만 지원(모바일은 열람 전용). */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="text-xs font-bold text-slate-800">
            피드백 <span className="text-blue-600">{discussions.length}</span>
          </div>
          {discussions.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-3">아직 등록된 피드백이 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {discussions.map((msg: any, i: number) => (
                <div key={msg.id || i} className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-[10px] flex-shrink-0 ${
                    msg.role === 'admin' ? 'bg-rose-500' : 'bg-[#1E3A8A]'
                  }`}>
                    {msg.author?.[0] || '익'}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-slate-800 truncate">{msg.author}</span>
                      <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">{msg.createdAt ? relativeTime(msg.createdAt) : ''}</span>
                    </div>
                    <div
                      className="text-xs text-slate-600 leading-relaxed break-words"
                      dangerouslySetInnerHTML={{ __html: msg.isSecret ? '🔒 비밀댓글입니다.' : parseCommentMarkdown(msg.text) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 3. Clean Single Bottom Action Bar */}
      <footer className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-40 max-w-xl mx-auto flex items-center justify-center safe-pb">
        <button
          onClick={(e) => { e.stopPropagation(); closeAnimated(); }}
          className="w-full py-4 bg-[#002454] text-white font-extrabold rounded-2xl text-sm hover:bg-blue-900 transition-colors shadow-lg flex items-center justify-center gap-2"
        >
          <span>닫기 (목록으로 돌아가기)</span>
        </button>
      </footer>
      </div>
    </>
  );
}
