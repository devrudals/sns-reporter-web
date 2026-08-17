'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface MobileCommentsPageProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  user?: any;
  // 하단 기획안/완성본 탭 전용 — 상세보기 푸터와 똑같은 이동/업로드 로직을 여기서도
  // 그대로 쓴다(코멘트 페이지 안에서도 기획안·완성본으로 곧장 넘어갈 수 있어야 함).
  onOpenDetail?: (item: any, type: 'proposal' | 'final') => void;
  onEdit?: (item: any, type: 'proposal' | 'final') => void;
  // 기획안/완성본/채팅방 3요소 중 처음 들어오는 경우엔 기존 시트(아래→위) 모션을,
  // 이미 셋 중 하나를 보고 있다가 이 페이지로 넘어오는 경우엔 좌우 슬라이드 모션을
  // 쓴다(요청 반영) — 셸이 트리오 안에서의 이동 방향을 계산해 넘겨준다.
  enterAnim?: 'sheet' | 'slide-left' | 'slide-right';
}

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

const MAX_TEXTAREA_PX = 116; // 대략 4~5줄

// 전체 리스트의 💬 아이콘, 상세보기 하단 "채팅방" 탭 양쪽에서 공통으로 여는 페이지.
// 말풍선(채팅 앱) 스타일 대신 PC ContentsLayout.tsx의 댓글 UI(헤더는 제외 — 기획안/
// 완성본으로 나눈 탭 카운터는 필요 없다고 확정됨)를 그대로 참고해 아바타+이름+시간,
// 본문, 좋아요/답글 액션이 있는 리스트형으로 재구성했다. 입력창은 카카오톡처럼
// 한 줄 높이로 시작해 4~5줄까지 자동으로 늘어나며, 실제로 새 댓글/답글을 작성하고
// 좋아요를 토글할 수 있다(PC의 handleAddComment/handleToggleLike와 동일한 데이터
// 갱신 방식 — content_body.discussions 배열을 갱신 후 저장).
export default function MobileCommentsPage({ isOpen, onClose, item, user, onOpenDetail, onEdit, enterAnim = 'sheet' }: MobileCommentsPageProps) {
  const supabase = createClient();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [localDiscussions, setLocalDiscussions] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: number; author: string; type: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  // 진입(animate-in slide-in-from-bottom)의 대칭 — 닫힐 때도 즉시 사라지지 않고
  // 슬라이드다운+페이드아웃을 재생한 뒤 실제로 onClose(언마운트)를 호출한다.
  const [isClosingSheet, setIsClosingSheet] = useState(false);
  const SHEET_CLOSE_MS = 200;
  const handleClose = () => {
    setIsClosingSheet(true);
    setTimeout(onClose, SHEET_CLOSE_MS);
  };
  // 메시지 목록이 이미 맨 위(scrollTop 0)에 있을 때 아래로 당기면(=풀-투-디스미스)
  // 상세보기와 동일하게 뒤로가기로 이어진다. 중간 스크롤 위치에서 위로 올려 맨
  // 위까지 도달하는 일반 스크롤과 구분하기 위해 제스처 시작·종료 시점 모두
  // scrollTop이 0이어야 한다.
  const pullStart = useRef<{ x: number; y: number; scrollTopAtStart: number } | null>(null);
  const onPullPointerDown = (e: React.PointerEvent) => {
    pullStart.current = { x: e.clientX, y: e.clientY, scrollTopAtStart: scrollRef.current?.scrollTop ?? 0 };
  };
  const onPullPointerUp = (e: React.PointerEvent) => {
    const start = pullStart.current;
    pullStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const currentScrollTop = scrollRef.current?.scrollTop ?? 0;
    if (dy > 70 && dy > Math.abs(dx) * 1.5 && start.scrollTopAtStart === 0 && currentScrollTop === 0) {
      handleClose();
    }
  };

  // 항목이 바뀔 때마다(혹은 페이지가 새로 열릴 때) 그 항목의 실제 discussions로
  // 로컬 상태를 다시 채운다 — 좋아요/새 댓글은 이 로컬 상태를 먼저 낙관적으로
  // 갱신해 저장 왕복을 기다리지 않고 즉시 반영되게 한다.
  useEffect(() => {
    const bodyObj = parseBody(item);
    setLocalDiscussions(Array.isArray(bodyObj.discussions) ? bodyObj.discussions : []);
    setInputText('');
    setReplyTarget(null);
    if (isOpen) setIsClosingSheet(false);
  }, [item?.id, isOpen]);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isOpen, item?.id]);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 1800);
    return () => clearTimeout(t);
  }, [toastMsg]);

  if (!isOpen || !item) return null;

  const bodyObj = parseBody(item);
  const isAdmin = user?.email === 'admin@admin.com' || user?.user_metadata?.is_admin === true;
  const isOwnContent = !!(user?.email && bodyObj.authorEmail && user.email === bodyObj.authorEmail);
  const hasFinalContent = ['final_submitted', 'final_revision', 'completed', 'uploaded'].includes(item.status) || !!item.final_url;
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '기자';

  const persist = async (nextDiscussions: any[]) => {
    const updatedBody = { ...bodyObj, discussions: nextDiscussions };
    await supabase.from('contents').update({ content_body: JSON.stringify(updatedBody) }).eq('id', item.id);
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
    persist(next).finally(() => setIsSending(false));
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
    return (
      <div key={comment.id} className={depth > 0 ? 'pl-9 mt-3 border-l-2 border-slate-100' : 'mt-4 first:mt-0'}>
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

  // 트리오(기획안/완성본/채팅방) 안에서 넘어온 경우엔 좌우 슬라이드로, 트리오 밖(리스트 등)
  // 에서 처음 들어온 경우엔 기존 시트(아래→위) 모션으로 — 셸이 계산해 넘겨준 값을 그대로 쓴다.
  const enterClass = enterAnim === 'slide-right'
    ? 'animate-in fade-in slide-in-from-right duration-250 ease-out'
    : enterAnim === 'slide-left'
    ? 'animate-in fade-in slide-in-from-left duration-250 ease-out'
    : 'animate-in fade-in slide-in-from-bottom duration-300 ease-out';

  return (
    <div className={`absolute inset-0 z-50 bg-[#F4F5F7] flex flex-col overflow-hidden ${
      isClosingSheet
        ? 'animate-out fade-out slide-out-to-bottom duration-200 ease-in fill-mode-forwards'
        : enterClass
    }`}>
      <header className="safe-pt px-3 pt-3 pb-3 flex items-center gap-2.5 flex-shrink-0">
        <button
          onClick={handleClose}
          className="glass-cta w-9 h-9 rounded-full flex items-center justify-center text-slate-700 text-lg flex-shrink-0 active:scale-95 transition-transform cursor-pointer"
        >
          ‹
        </button>
        <div className="glass-cta flex-1 min-w-0 px-4 py-2 rounded-full">
          <div className="text-sm font-black text-slate-900 truncate leading-tight">{item.title}</div>
          <div className="text-[10px] text-slate-500 font-bold truncate">{item.author_name} · {item.team || '팀'}</div>
        </div>
      </header>

      <div ref={scrollRef} onPointerDown={onPullPointerDown} onPointerUp={onPullPointerUp} className="flex-1 overflow-y-auto px-4 pb-3">
        {rootComments.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-xs text-slate-400 font-medium px-8">
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

      {toastMsg && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center pointer-events-none px-8">
          <div className="bg-black/85 text-white text-sm font-bold px-5 py-3 rounded-2xl text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
            {toastMsg}
          </div>
        </div>
      )}

      {/* 입력창 — 카카오톡처럼 한 줄 높이로 시작해 4~5줄까지만 자동으로 늘어나고
          그 이상은 내부 스크롤(MAX_TEXTAREA_PX). 하단 기획안/완성본/채팅방/닫기
          내비게이션 "위쪽"에 위치해야 한다는 요청대로 그 내비게이션보다 앞선
          순서로 배치했다. 내비게이션이 absolute라 일반 흐름을 차지하지 않는데,
          그러면 이 입력창이 문서 흐름상 화면 맨 아래까지 내려가 내비게이션
          뒤에 가려진다 — 내비게이션이 차지하는 높이(3.625rem)+여백(0.75rem)만큼
          마진을 줘서 그 위에 뜨도록 한다. */}
      <div className="px-3 flex-shrink-0" style={{ marginBottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}>
        {replyTarget && (
          <div className="flex items-center gap-2 px-3 py-1.5 mb-1.5 bg-[#EBF3FF] rounded-xl text-xs">
            <span className="text-[#003378] font-bold flex-1 truncate">{replyTarget.author}님에게 답장</span>
            <button onClick={() => setReplyTarget(null)} className="text-[#003378] font-black">✕</button>
          </div>
        )}
        <div className="flex items-end gap-2 bg-white rounded-2xl border border-slate-200 px-3 py-2 shadow-xs">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => { setInputText(e.target.value); autoGrow(); }}
            placeholder="댓글을 입력하세요"
            className="flex-1 resize-none outline-none text-sm text-slate-800 placeholder:text-slate-400 leading-relaxed py-0.5 max-h-[7.25rem] overflow-y-auto"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className="w-8 h-8 rounded-full bg-[#002454] disabled:bg-slate-300 flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform cursor-pointer disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
              <path d="M4 12h15M13 6l6 6-6 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 하단 기획안/완성본/채팅방 + 닫기 — 상세보기 푸터와 동일한 구조를 그대로
          유지해야 한다는 요청 반영. 채팅방은 지금 보고 있는 화면이라 활성 탭으로
          표시. */}
      <div className="absolute inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-2">
        <nav className="flex-1 min-w-0">
          <div className="glass-navbar flex items-center h-[3.625rem] rounded-full p-1 gap-1">
            <button
              onClick={() => onOpenDetail?.(item, 'proposal')}
              className="flex flex-1 flex-col items-center justify-center h-full rounded-full transition-all duration-300 active:scale-95"
            >
              <span className="text-lg">📋</span>
              <span className="text-[0.6rem] mt-0.5 font-bold tracking-tight text-[#757575]">기획안</span>
            </button>
            <button
              onClick={() => {
                // 기획안/완성본은 onOpenDetail(→MobileShell의 handleOpenDetail)이 상세보기를
                // 열면서 이 코멘트 페이지도 함께 닫아준다(그 함수 안에서 처리) — 여기서
                // onClose()를 또 호출하면 상세보기의 onClose prop이(요청#9 반영) 상세보기
                // 자체도 같이 닫아버려서, 방금 연 상세보기가 즉시 닫히는 충돌이 있었다.
                if (hasFinalContent) { onOpenDetail?.(item, 'final'); }
                else if (isOwnContent) { onEdit?.(item, 'final'); onClose(); }
                else { setToastMsg('아직 완성본이 업로드 되지 않았습니다'); }
              }}
              className="flex flex-1 flex-col items-center justify-center h-full rounded-full transition-all duration-300 active:scale-95"
            >
              <span className="text-lg">🎬</span>
              <span className="text-[0.6rem] mt-0.5 font-bold tracking-tight text-[#757575]">완성본</span>
            </button>
            <button className="flex flex-1 flex-col items-center justify-center h-full rounded-full transition-all duration-300 active:scale-95 glass-navbar-active">
              <span className="text-lg">💬</span>
              <span className="text-[0.6rem] mt-0.5 font-bold tracking-tight text-white">채팅방</span>
            </button>
          </div>
        </nav>
        <button
          onClick={handleClose}
          className="glass-cta w-[3.625rem] h-[3.625rem] rounded-full flex items-center justify-center text-slate-700 text-lg flex-shrink-0 active:scale-95 transition-transform cursor-pointer"
        >
          {/* U턴 화살표로 바꿨던 것을 요청대로 다시 "✕"로 되돌린다. */}
          ✕
        </button>
      </div>
    </div>
  );
}
