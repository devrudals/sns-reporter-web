'use client';

import React, { useRef, useEffect } from 'react';

interface MobileCommentsPageProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  user?: any;
}

const parseBody = (item: any) => {
  try {
    if (item?.content_body && item.content_body.startsWith('{')) {
      return JSON.parse(item.content_body);
    }
  } catch (e) {}
  return {};
};

// MobileDetailModal의 parseCommentMarkdown과 동일한 안전한 마크다운 서브셋(굵게/기울임/
// 취소선/링크/줄바꿈)만 허용 — escape를 먼저 하므로 사용자 입력의 HTML 인젝션은 막힌다.
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

// 전체 리스트의 📋/구글드라이브 아이콘 옆, 세 번째 아이콘(💬)으로 들어오는 전용 페이지.
// 기존에는 기획안/완성본 상세보기 안에 "피드백" 섹션으로만 존재했는데, 그 섹션을 완전히
// 분리해 독립된 실제 메신저 스타일 말풍선 UI로 새로 만들었다(모바일은 열람 전용이라
// 입력창은 없음). 기획안 단계/완성본 단계 피드백을 하나의 스레드로 통합해서 보여주되,
// 단계가 바뀌는 지점마다 작은 구분 배지를 넣어 맥락을 잃지 않게 했다.
export default function MobileCommentsPage({ isOpen, onClose, item, user }: MobileCommentsPageProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isOpen, item?.id]);

  if (!isOpen || !item) return null;

  const bodyObj = parseBody(item);
  const discussions: any[] = Array.isArray(bodyObj.discussions) ? bodyObj.discussions : [];

  const isAdmin = user?.email === 'admin@admin.com' || user?.user_metadata?.is_admin === true;
  // 말풍선 개별 메시지에는 작성자 이메일이 저장되지 않고 role(admin/writer/crew)만 있어,
  // "내 메시지"는 이메일 대조 대신 role 기준으로 판단한다 — 지금 보는 사람이 관리자면
  // admin 역할 메시지가 내 쪽, 크루(작성자 포함)면 admin이 아닌 메시지가 내 쪽이 된다.
  const isMine = (msg: any) => (isAdmin ? msg.role === 'admin' : msg.role !== 'admin');

  return (
    <div className="absolute inset-0 z-50 bg-[#F4F5F7] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 ease-out">
      <header className="safe-pt px-3 pt-3 pb-3 flex items-center gap-2.5 flex-shrink-0">
        <button
          onClick={onClose}
          className="glass-cta w-9 h-9 rounded-full flex items-center justify-center text-slate-700 text-lg flex-shrink-0 active:scale-95 transition-transform cursor-pointer"
        >
          ‹
        </button>
        <div className="glass-cta flex-1 min-w-0 px-4 py-2 rounded-full">
          <div className="text-sm font-black text-slate-900 truncate leading-tight">{item.title}</div>
          <div className="text-[10px] text-slate-500 font-bold truncate">{item.author_name} · {item.team || '팀'}</div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
        {discussions.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-xs text-slate-400 font-medium px-8">
            아직 등록된 코멘트가 없습니다.
          </div>
        ) : (
          discussions.map((msg: any, i: number) => {
            const mine = isMine(msg);
            const showPhaseDivider = i === 0 || discussions[i - 1].type !== msg.type;
            return (
              <React.Fragment key={msg.id || i}>
                {showPhaseDivider && (
                  <div className="flex justify-center py-1">
                    <span className="px-3 py-1 bg-slate-200/70 text-slate-500 text-[10px] font-black rounded-full">
                      {msg.type === 'final' ? '완성본 피드백' : '기획안 피드백'}
                    </span>
                  </div>
                )}
                <div className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                  {!mine && (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-[10px] flex-shrink-0 ${
                      msg.role === 'admin' ? 'bg-rose-500' : 'bg-[#1E3A8A]'
                    }`}>
                      {msg.author?.[0] || '익'}
                    </div>
                  )}
                  <div className={`max-w-[72%] flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
                    {!mine && <span className="text-[10px] text-slate-500 font-bold px-1">{msg.author}</span>}
                    <div
                      className={`px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl ${
                        mine
                          ? 'bg-[#002454] text-white rounded-br-md'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-md'
                      }`}
                      dangerouslySetInnerHTML={{ __html: msg.isSecret ? '🔒 비밀댓글입니다.' : parseCommentMarkdown(msg.text) }}
                    />
                    <span className="text-[10px] text-slate-400 font-medium px-1">{msg.createdAt ? relativeTime(msg.createdAt) : ''}</span>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
