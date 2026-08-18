'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

// 기획안(0)/완성본(1)/채팅방(2) 3요소를 "같은 위계"의 화면으로 취급해, 예전엔
// MobileDetailModal(기획안·완성본)과 MobileCommentsPage(채팅방)가 서로 다른 틀
// (헤더·바텀네비 각각 별도 구현)로 나뉘어 있어 화면 전환 모션이 서로 달랐다
// (기획안⇄완성본은 내용만 슬라이드, 채팅방은 화면 전체가 슬라이드) — 요청대로
// 두 컴포넌트를 하나로 합쳐, 손잡이·배지·하단 탭바·닫기 버튼이 있는 "틀" 하나가
// 3요소 모두에 대해 항상 그대로 유지된 채(리마운트 없음) 안쪽 콘텐츠(key={screen})
// 만 슬라이드로 바뀌도록 통일했다.
interface MobileTrioModalProps {
  isOpen: boolean;
  screen: 0 | 1 | 2;
  onScreenChange: (screen: 0 | 1 | 2) => void;
  onClose: () => void;
  item?: any;
  originRect?: DOMRect | null;
  startPeek?: boolean;
  peekTopVh?: number;
  onEdit?: (item: any, type: 'proposal' | 'final') => void;
  user?: any;
  // 3요소 중 처음 들어오는 경우엔 기존 시트(아래→위) 모션을, 이미 이 틀이 열려있는
  // 채로 다른 화면으로 넘어오는 경우엔 좌우 슬라이드 모션을 쓴다 — 셸이 계산해 넘겨준다.
  enterAnim?: 'sheet' | 'slide-left' | 'slide-right';
}

const CLOSE_MS = 420;
const SHEET_CLOSE_MS = 200;
const DEFAULT_PEEK_TOP_VH = 69.2;
const MAX_TEXTAREA_PX = 116; // 대략 4~5줄

const parseBody = (item: any) => {
  try {
    if (item?.content_body && item.content_body.startsWith('{')) {
      return JSON.parse(item.content_body);
    }
  } catch (e) {}
  return {};
};

// ContentsLayout.tsx(PC)의 parseCommentMarkdown과 동일한 안전한 서브셋만 허용.
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
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
};

export default function MobileTrioModal({ isOpen, screen, onScreenChange, onClose, item, originRect, startPeek, peekTopVh, onEdit, user, enterAnim = 'sheet' }: MobileTrioModalProps) {
  const supabase = createClient();
  const router = useRouter();
  const effectivePeekTopVh = peekTopVh ?? DEFAULT_PEEK_TOP_VH;

  // 화면(screen)은 셸이 들고 있는 단일 진실 소스 prop이라 로컬에 별도로 중복
  // 보관하지 않는다(예전엔 MobileDetailModal 내부의 currentTab이 로컬 상태였는데,
  // 셸을 거치지 않고 다른 경로로 "이 값과 이미 같은 type"을 다시 넘기면 동기화
  // effect가 재실행되지 않아 어긋나는 버그가 있었다 — 로컬 복제본 자체를 없애
  // 이 버그 클래스를 구조적으로 없앴다). 방향(좌/우) 계산만 이전 값과 비교해 로컬로 둔다.
  const prevScreenRef = useRef(screen);
  const [tabSlideDir, setTabSlideDir] = useState<'left' | 'right'>('right');
  useEffect(() => {
    if (prevScreenRef.current !== screen) {
      setTabSlideDir(screen > prevScreenRef.current ? 'right' : 'left');
      prevScreenRef.current = screen;
    }
  }, [screen]);

  const modalRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'entering' | 'open' | 'closing'>(originRect ? 'entering' : 'open');
  const [originTransform, setOriginTransform] = useState<string | undefined>(undefined);
  const [viewState, setViewState] = useState<'peek' | 'full'>(startPeek ? 'peek' : 'full');
  const [isClosingPeek, setIsClosingPeek] = useState(false);
  const [isClosingSheet, setIsClosingSheet] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 1800);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // 내용 블록 탭-투-카피 (기획안/완성본 전용) — 정지 상태에서 한 번 탭하면 "탭하여
  // 복사" 확인 상태로 바뀌고, 한 번 더 탭하면 실제 복사된다.
  const [copyArmedField, setCopyArmedField] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
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

  // FLIP: 카드의 화면 좌표(originRect)에서 시작해 부모(셸 프레임) 전체 크기로
  // 커지는 transform을 계산한다 — 지금은 이 prop을 넘기는 호출부가 없어 실제로는
  // 쓰이지 않지만(항상 기본 시트 모션), 카드 기반 진입점이 다시 생기면 재사용할
  // 수 있게 남겨둔다.
  useLayoutEffect(() => {
    if (!isOpen) return;
    setViewState(startPeek ? 'peek' : 'full');
    setIsClosingPeek(false);
    setIsClosingSheet(false);
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

  // ---- 손잡이(arm) → 한 번 더 당기면 닫힘(confirm) 2단계 풀-투-디스미스 +
  // 좌우 스와이프로 3요소 전환 ----
  // 예전엔 손잡이가 최상단에 항상 고정으로 떠 있어 거슬린다는 요청이 있었다.
  // 이제 손잡이는 평소엔 숨어있다가, 콘텐츠가 맨 위(scrollTop 0)인 상태에서
  // 아래로 한 번 당기면(release) "손잡이가 나타나는" armed 상태가 되고, 그
  // 상태에서 (꼭 손잡이 위가 아니어도) 한 번 더 같은 방식으로 당기면 실제로
  // 닫힌다 — 이 앱에 이미 있는 "탭하여 복사"(1차 탭=arm, 2차 탭=확정)와 같은
  // 2단계 확인 패턴을 그대로 따랐다.
  const mainRef = useRef<HTMLElement>(null);
  const swipeStart = useRef<{ x: number; y: number; scrollTopAtStart: number } | null>(null);
  const suppressNextClick = useRef(false);
  const [handleArmed, setHandleArmed] = useState(false);
  // 하단 기획안/완성본/채팅방+닫기 바도 셸의 메인 하단 바와 동일하게 인스타그램
  // 스타일로 스크롤 방향에 따라 75% 축소/복원한다.
  const lastMainScrollTop = useRef(0);
  const [navShrunk, setNavShrunk] = useState(false);
  useEffect(() => { setHandleArmed(false); setNavShrunk(false); lastMainScrollTop.current = 0; }, [screen]);
  const onMainScroll = () => {
    if (handleArmed && (mainRef.current?.scrollTop ?? 0) > 0) setHandleArmed(false);
    const el = mainRef.current;
    if (!el) return;
    const current = el.scrollTop;
    const last = lastMainScrollTop.current;
    if (current <= 4) setNavShrunk(false);
    else if (current > last + 4) setNavShrunk(true);
    else if (current < last - 4) setNavShrunk(false);
    lastMainScrollTop.current = current;
  };
  const onMainPointerDown = (e: React.PointerEvent) => {
    swipeStart.current = { x: e.clientX, y: e.clientY, scrollTopAtStart: mainRef.current?.scrollTop ?? 0 };
  };
  const onMainPointerUp = (e: React.PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      // 우측 스와이프(dx>0) → 이전 화면, 좌측(dx<0) → 다음 화면 (하단 탭 순서와 동일).
      const next = (dx > 0 ? Math.max(0, screen - 1) : Math.min(2, screen + 1)) as 0 | 1 | 2;
      if (next !== screen) onScreenChange(next);
      suppressNextClick.current = true;
      return;
    }
    const currentScrollTop = mainRef.current?.scrollTop ?? 0;
    if (dy > 70 && dy > Math.abs(dx) * 1.5 && start.scrollTopAtStart === 0 && currentScrollTop === 0) {
      if (handleArmed) {
        setHandleArmed(false);
        closeAnimated();
      } else {
        setHandleArmed(true);
      }
    }
  };

  // 화면이 바뀔 때(기획안↔완성본↔채팅방)마다 스크롤 시작 위치를 그 화면에 맞게
  // 되돌린다 — 채팅방은 최신 메시지가 보이는 맨 아래, 나머지는 맨 위.
  useEffect(() => {
    if (!mainRef.current) return;
    if (screen === 2) {
      mainRef.current.scrollTop = mainRef.current.scrollHeight;
    } else {
      mainRef.current.scrollTop = 0;
    }
  }, [screen, item?.id]);

  // ---- 채팅방(코멘트) 데이터 ----
  const [localDiscussions, setLocalDiscussions] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: number; author: string; type: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const bodyObj = parseBody(item);
    setLocalDiscussions(Array.isArray(bodyObj.discussions) ? bodyObj.discussions : []);
    setInputText('');
    setReplyTarget(null);
  }, [item?.id]);

  // 채팅방에 "진입한 시점"에 아직 대처하지 않은(status가 revision 계열인) 최신
  // 관리자 메시지가 있으면, 그 메시지에만 초록 배경이 잠깐 떠 있다가 스르르
  // 사라지는 하이라이트를 건다 — 이후 도착하는 메시지나 다른 메시지는 대상이 아니다.
  const [highlightMsgId, setHighlightMsgId] = useState<number | null>(null);
  useEffect(() => {
    if (!isOpen || screen !== 2 || !item) return;
    const bodyObj = parseBody(item);
    const discussions: any[] = Array.isArray(bodyObj.discussions) ? bodyObj.discussions : [];
    const hasUnresolved = String(item.status || '').includes('revision');
    if (!hasUnresolved) return;
    const lastAdminMsg = [...discussions]
      .filter((d) => d.role === 'admin')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (!lastAdminMsg) return;
    setHighlightMsgId(lastAdminMsg.id);
    const t = setTimeout(() => setHighlightMsgId(null), 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, screen, item?.id]);

  if (!isOpen || !item) return null;

  const bodyObj = parseBody(item);
  const isAdmin = user?.email === 'admin@admin.com' || user?.user_metadata?.is_admin === true;
  const isOwnContent = !!(user?.email && bodyObj.authorEmail && user.email === bodyObj.authorEmail);
  const hasFinalContent = ['final_submitted', 'final_revision', 'completed', 'uploaded'].includes(item.status) || !!item.final_url;
  const hasUnresolvedFeedback = String(item.status || '').includes('revision');
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '기자';

  const persist = async (nextDiscussions: any[], statusOverride?: string) => {
    const updatedBody = { ...bodyObj, discussions: nextDiscussions };
    const payload: any = { content_body: JSON.stringify(updatedBody) };
    if (statusOverride) payload.status = statusOverride;
    await supabase.from('contents').update(payload).eq('id', item.id);
    router.refresh();
  };

  const handleToggleLike = (commentId: number) => {
    const userEmail = user?.email || 'anonymous';
    const next = localDiscussions.map((msg) => {
      if (msg.id !== commentId) return msg;
      const likedBy: string[] = msg.likedBy || [];
      const hasLiked = likedBy.includes(userEmail);
      const newLikedBy = hasLiked ? likedBy.filter((e: string) => e !== userEmail) : [...likedBy, userEmail];
      return { ...msg, likedBy: newLikedBy, likes: newLikedBy.length };
    });
    setLocalDiscussions(next);
    persist(next);
  };

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, MAX_TEXTAREA_PX) + 'px';
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isSending) return;
    setIsSending(true);
    const newMsg = {
      id: Date.now(),
      parentId: replyTarget?.id ?? null,
      type: replyTarget?.type ?? (hasFinalContent ? 'final' : 'proposal'),
      role: isAdmin ? 'admin' : (isOwnContent ? 'writer' : 'crew'),
      text,
      createdAt: new Date().toISOString(),
      author: displayName,
      likes: 0,
      likedBy: [] as string[],
      attachments: [] as any[],
      isSecret: false,
    };
    const next = [...localDiscussions, newMsg];
    setLocalDiscussions(next);
    setInputText('');
    setReplyTarget(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // PC(ContentsLayout.tsx)와 동일한 상태 자동 전환 규칙 — 모바일 채팅방은
    // 지금까지 discussions만 저장하고 status는 건드리지 않아, 관리자가 모바일에서
    // 댓글을 남겨도 "새 댓글(대처 필요)" 표시(status=revision)가 켜지지 않는
    // PC/모바일 비대칭이 있었다. 여기서도 같은 규칙을 적용해 맞춘다: 관리자가
    // 남기면 대처 대기 상태로, 작성자/크루가 남기면 검토 필요 상태로 되돌린다.
    let newStatus = item.status;
    if (isAdmin) {
      if (item.status === 'pending' || item.status === 'review_required') newStatus = 'revision';
      else if (item.status === 'final_submitted') newStatus = 'final_revision';
    } else {
      if (item.status === 'revision' || item.status === 'final_revision' || item.status === 'approved') newStatus = 'review_required';
    }
    persist(next, newStatus !== item.status ? newStatus : undefined).finally(() => setIsSending(false));
  };

  const rootComments = localDiscussions.filter((m) => m.parentId === null || m.parentId === undefined);
  const getReplies = (rootId: number): any[] => {
    const result: any[] = [];
    const traverse = (parentId: number, depth: number) => {
      const children = localDiscussions
        .filter((c) => c.parentId === parentId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      for (const child of children) {
        result.push({ ...child, depth });
        traverse(child.id, depth + 1);
      }
    };
    traverse(rootId, 1);
    return result;
  };

  const renderCommentRow = (comment: any, depth: number) => {
    const isLiked = !!(comment.likedBy && user?.email && comment.likedBy.includes(user.email));
    const isHighlighted = comment.id === highlightMsgId;
    return (
      <div
        key={comment.id}
        className={`rounded-xl p-1.5 -mx-1.5 transition-colors duration-1000 ease-out ${isHighlighted ? 'bg-[#00A859]/15' : 'bg-transparent'} ${depth > 0 ? 'pl-9 mt-3 border-l-2 border-slate-100' : 'mt-4 first:mt-0'}`}
      >
        <div className={depth > 0 ? 'pl-3 flex gap-2.5' : 'flex gap-2.5'}>
          <div className={`rounded-full flex items-center justify-center text-white font-black flex-shrink-0 ${
            depth > 0 ? 'w-6 h-6 text-[9px]' : 'w-8 h-8 text-[11px]'
          } ${comment.role === 'admin' ? 'bg-rose-500' : depth > 0 ? 'bg-emerald-600' : 'bg-[#1E3A8A]'}`}>
            {comment.author?.[0] || '익'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={`font-extrabold text-slate-900 ${depth > 0 ? 'text-xs' : 'text-sm'}`}>{comment.author}</span>
              <span className="text-[10px] text-slate-400 font-medium">{comment.createdAt ? relativeTime(comment.createdAt) : ''}</span>
            </div>
            <div
              className={`text-slate-700 leading-relaxed break-words mt-0.5 ${depth > 0 ? 'text-xs' : 'text-sm'}`}
              dangerouslySetInnerHTML={{ __html: comment.isSecret ? '🔒 비밀댓글입니다.' : parseCommentMarkdown(comment.text) }}
            />
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[11px] text-slate-400 font-bold">{comment.likes || 0} Likes</span>
              <button
                onClick={() => setReplyTarget(replyTarget?.id === comment.id ? null : { id: comment.id, author: comment.author, type: comment.type || 'proposal' })}
                className={`text-[11px] font-extrabold ${replyTarget?.id === comment.id ? 'text-[#003378]' : 'text-slate-400'}`}
              >
                ↗ Reply
              </button>
              <div className="flex-1" />
              <button
                onClick={() => handleToggleLike(comment.id)}
                className="w-6 h-6 flex items-center justify-center flex-shrink-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M2 10h4v11H2a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" fill={isLiked ? '#003378' : 'none'} stroke={isLiked ? '#003378' : '#94A3B8'} strokeWidth="1.8" strokeLinejoin="round"/>
                  <path d="M6 10l3.5-7a2 2 0 0 1 2-1v0a2 2 0 0 1 2 2.3L12.5 8H20a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.6 20H6" fill={isLiked ? '#003378' : 'none'} stroke={isLiked ? '#003378' : '#94A3B8'} strokeWidth="1.8" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const peekTransform = `translateY(${effectivePeekTopVh}dvh)`;
  const transform = isClosingPeek
    ? 'translateY(100dvh)'
    : viewState === 'peek'
    ? peekTransform
    : phase === 'entering' || phase === 'closing'
    ? originTransform
    : undefined;
  const opacity = originRect && (phase === 'entering' || phase === 'closing') ? 0.5 : 1;
  const rootStyle: React.CSSProperties = {
    transform,
    opacity,
    transformOrigin: 'top left',
    transition: phase === 'entering'
      ? 'none'
      : 'transform 0.42s cubic-bezier(0.22,1,0.36,1), opacity 0.42s cubic-bezier(0.22,1,0.36,1)',
  };

  // 기획안 필드 (PC ProposalSubmitForm/ContentsLayout과 동일한 매핑)
  const intentHtml = item.intent || bodyObj.intent || '';
  const compositionHtml = bodyObj.composition || '';
  const filmingPlanHtml = bodyObj.contentBody || '';
  const remarksHtml = item.description || bodyObj.description || '';

  // 완성본 필드
  const postContentHtml = bodyObj.postContent || '';
  const finalDescriptionHtml = bodyObj.finalDescription || '';
  const finalKeywordsRaw = bodyObj.finalKeywords || '';

  const driveUrl = item.final_url || bodyObj.docsUrl || bodyObj.driveUrl || '';

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

  const screenBadge = screen === 1
    ? { label: '완성본 🎬', bg: 'bg-[#00A859]' }
    : screen === 2
    ? { label: '채팅방 💬', bg: 'bg-[#003378]' }
    : { label: '기획안 📝', bg: 'bg-[#FFB800]' };

  const goProposal = () => onScreenChange(0);
  const goFinal = () => {
    if (hasFinalContent) onScreenChange(1);
    else if (isOwnContent) onEdit?.(item, 'final');
    else setToastMsg('아직 완성본이 업로드 되지 않았습니다');
  };
  const goChat = () => onScreenChange(2);

  return (
    <>
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
        {toastMsg && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none px-8">
            <div className="bg-black/85 text-white text-sm font-bold px-5 py-3 rounded-2xl text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
              {toastMsg}
            </div>
          </div>
        )}

        {/* 2. Main Scrollable Content — 손잡이(armed일 때만)·배지·화면별 콘텐츠가
            전부 이 하나의 스크롤 컨테이너 안에서 함께 흐른다. 3요소 전환은 이 안의
            key={screen} 블록만 다시 마운트돼 슬라이드되고, 이 <main> 자체와 아래
            하단 탭바/닫기 버튼은 화면이 바뀌어도 전혀 움직이지 않는다. */}
        <main
          ref={mainRef}
          onPointerDown={onMainPointerDown}
          onPointerUp={onMainPointerUp}
          onScroll={onMainScroll}
          className={`flex-1 p-4 sm:p-5 overflow-x-hidden space-y-4 max-w-xl mx-auto w-full pb-28 text-slate-900 safe-pt ${
            viewState === 'peek' ? 'overflow-y-hidden' : 'overflow-y-auto'
          }`}
        >
          {handleArmed && (
            <div className="flex justify-center py-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="w-10 h-1.5 rounded-full bg-slate-300" />
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 rounded-full text-xs font-black text-white ${screenBadge.bg}`}>
              {screenBadge.label}
            </span>
            <div className="text-right text-[11px] text-slate-500 font-bold leading-tight">
              <div>{item.author_name}</div>
              {item.created_at && <div>{item.created_at.split('T')[0]}</div>}
            </div>
          </div>

          <div
            key={screen}
            className={tabSlideDir === 'right' ? 'animate-in fade-in slide-in-from-right-8 duration-200 ease-out' : 'animate-in fade-in slide-in-from-left-8 duration-200 ease-out'}
          >
            {screen === 1 ? (
              <div className="space-y-4">
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

                <div className="space-y-3">
                  {postContentHtml && renderCopyableBlock('postContent', '본문 / 캡션 내용', postContentHtml)}
                  {finalDescriptionHtml && renderCopyableBlock('finalDescription', '비고', finalDescriptionHtml)}

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

                  {finalHashtags.length > 0 && renderHashtagBlock('finalHashtags', finalHashtags)}
                </div>
              </div>
            ) : screen === 2 ? (
              <div className="space-y-1">
                {rootComments.length === 0 ? (
                  <div className="py-12 flex items-center justify-center text-center text-xs text-slate-400 font-medium px-8">
                    아직 등록된 코멘트가 없습니다.
                  </div>
                ) : (
                  rootComments.map((root, i) => {
                    const showPhaseDivider = i === 0 || rootComments[i - 1].type !== root.type;
                    const replies = getReplies(root.id);
                    return (
                      <React.Fragment key={root.id}>
                        {showPhaseDivider && (
                          <div className="flex justify-center py-2">
                            <span className="px-3 py-1 bg-slate-200/70 text-slate-500 text-[10px] font-black rounded-full">
                              {root.type === 'final' ? '완성본 피드백' : '기획안 피드백'}
                            </span>
                          </div>
                        )}
                        {renderCommentRow(root, 0)}
                        {replies.map((r) => renderCommentRow(r, Math.min(r.depth, 1)))}
                      </React.Fragment>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                  <div className="text-xs font-bold text-slate-400">제목 (가제)</div>
                  <h3 className="text-lg font-black text-slate-900 leading-snug">{item.title}</h3>
                </div>

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

                {intentHtml && renderCopyableBlock('intent', '기획 의도 및 배경', intentHtml)}
                {compositionHtml && renderCopyableBlock('composition', '구성 및 내용', compositionHtml)}
                {filmingPlanHtml && renderCopyableBlock('filmingPlan', '촬영 계획', filmingPlanHtml)}
                {remarksHtml && renderCopyableBlock('remarks', '비고', remarksHtml)}

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

                {proposalHashtags.length > 0 && renderHashtagBlock('proposalHashtags', proposalHashtags)}
              </div>
            )}
          </div>

          {screen !== 2 && (
            <button
              onClick={() => onEdit?.(item, screen === 1 ? 'final' : 'proposal')}
              className="glass-cta glass-cta-strong w-full py-3.5 text-[#002454] font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
            >
              <span>✏️</span>
              <span>수정하기</span>
            </button>
          )}
        </main>

        {/* 채팅방 입력창 — 카카오톡처럼 한 줄 높이로 시작해 4~5줄까지만 자동으로
            늘어나고 그 이상은 내부 스크롤. text-base(16px 이상)를 유지해야 한다 —
            14px(text-sm) 미만이면 iOS Safari가 포커스 시 자동으로 화면을 확대해
            버려(요청으로 실기기에서 확인된 버그) 레이아웃이 깨지고, 포커스가
            풀려도 확대 상태가 바로 안 풀려 상단 UI가 화면 밖으로 밀려나 보였다. */}
        {screen === 2 && (
          <div className="px-3 flex-shrink-0" style={{ marginBottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}>
            {replyTarget && (
              <div className="flex items-center gap-2 px-3 py-1.5 mb-1.5 bg-[#EBF3FF] rounded-xl text-xs">
                <span className="text-[#003378] font-bold flex-1 truncate">{replyTarget.author}님에게 답장</span>
                <button onClick={() => setReplyTarget(null)} aria-label="답글 취소" className="text-[#003378] font-black">✕</button>
              </div>
            )}
            <div className="flex items-end gap-2 bg-white rounded-2xl border border-slate-200 px-3 py-2 shadow-xs">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => { setInputText(e.target.value); autoGrow(); }}
                placeholder="댓글을 입력하세요"
                style={{ fontSize: '16px' }}
                className="flex-1 resize-none outline-none text-slate-800 placeholder:text-slate-400 leading-relaxed py-0.5 max-h-[7.25rem] overflow-y-auto"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isSending}
                aria-label="댓글 보내기"
                className="group w-11 h-11 -m-1.5 flex items-center justify-center flex-shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                <span className="w-8 h-8 rounded-full bg-[#002454] group-disabled:bg-slate-300 flex items-center justify-center group-active:scale-95 transition-transform">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                    <path d="M4 12h15M13 6l6 6-6 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Bottom Nav — 기획안/완성본/채팅방 3개가 하나의 글래스 캡슐 안에서
            서로 연결된 탭이고, 그 오른쪽에 닫기(✕) 전용 버튼이 따로 떨어져 있다.
            화면이 바뀌어도 이 바 자체는 절대 리마운트되지 않는다. */}
        <div
          className={`absolute inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-2 transition-transform duration-200 ease-out ${navShrunk ? 'scale-75' : 'scale-100'}`}
          style={{ transformOrigin: 'bottom center' }}
        >
          <nav className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
            <div className="glass-navbar flex items-center h-[3.625rem] rounded-full p-1 gap-1">
              <button
                onClick={goProposal}
                className={`flex flex-1 flex-col items-center justify-center h-full rounded-full transition-all duration-300 active:scale-95 ${screen === 0 ? 'glass-navbar-active' : ''}`}
              >
                <span className="text-lg">📋</span>
                <span className={`text-[0.6rem] mt-0.5 font-bold tracking-tight ${screen === 0 ? 'text-white' : 'text-[#757575]'}`}>기획안</span>
              </button>
              <button
                onClick={goFinal}
                className={`flex flex-1 flex-col items-center justify-center h-full rounded-full transition-all duration-300 active:scale-95 ${screen === 1 ? 'glass-navbar-active' : ''}`}
              >
                <span className="text-lg">🎬</span>
                <span className={`text-[0.6rem] mt-0.5 font-bold tracking-tight ${screen === 1 ? 'text-white' : 'text-[#757575]'}`}>완성본</span>
              </button>
              <button
                onClick={goChat}
                className={`flex flex-1 flex-col items-center justify-center h-full rounded-full transition-all duration-300 active:scale-95 ${screen === 2 ? 'glass-navbar-active' : ''}`}
              >
                <span className="relative text-lg">
                  💬
                  {hasUnresolvedFeedback && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00A859] ring-2 ring-white" />
                  )}
                </span>
                <span className={`text-[0.6rem] mt-0.5 font-bold tracking-tight ${screen === 2 ? 'text-white' : 'text-[#757575]'}`}>채팅방</span>
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
