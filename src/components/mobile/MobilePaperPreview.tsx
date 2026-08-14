'use client';

import React, { useRef } from 'react';

// Figma의 전체 리스트 하단 컴포넌트는 실제로 "기획안"/"완성본" 폼 전체를 약 46% 크기로
// 축소한 미니어처다(node 863:80116, 863:141799 — 실제 폼과 동일한 필드 구성을 그대로
// 담고 있음). 여기서는 실제 폼을 그대로 그린 뒤 CSS transform: scale로 시각적으로
// 축소해 "종이 문서" 느낌을 재현한다 — 타이핑된 값 몇 개만 있는 텍스트 버튼이 아니라.

const NATURAL_WIDTH = 320;
const SCALE = 0.5;

const stripHtml = (html: any) => {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
};

const parseBody = (item: any) => {
  try {
    if (item.content_body && item.content_body.startsWith('{')) return JSON.parse(item.content_body);
  } catch {}
  return {};
};

const FieldBox: React.FC<{ label: string; children?: React.ReactNode; lines?: number }> = ({ label, children, lines = 1 }) => (
  <div className="space-y-1">
    <div className="text-[9px] font-bold text-slate-900">{label}</div>
    <div
      className="bg-[#EDEDED] rounded-md px-2 py-1.5 text-[8px] text-slate-600 font-medium leading-snug"
      style={{ display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden', minHeight: lines === 1 ? '20px' : `${lines * 11 + 8}px` }}
    >
      {children}
    </div>
  </div>
);

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[7.5px] font-bold text-slate-700 whitespace-nowrap">{children}</span>
);

interface PaperPreviewProps {
  item: any;
  kind: 'proposal' | 'final';
  onOpen: (rect: DOMRect) => void;
  state?: 'view' | 'locked' | 'upload';
}

export default function MobilePaperPreview({ item, kind, onOpen, state = 'view' }: PaperPreviewProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const bodyObj = parseBody(item);
  const locked = state === 'locked';

  const handleClick = () => {
    if (locked) return;
    const rect = outerRef.current?.getBoundingClientRect();
    if (rect) onOpen(rect);
  };

  const overlay = state === 'locked' ? (
    <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1.5">
      <span className="text-lg">🔒</span>
      <span className="text-[10px] font-extrabold text-slate-500">완성본 없음</span>
    </div>
  ) : state === 'upload' ? (
    <div className="absolute inset-0 z-10 bg-white/85 flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-blue-300 rounded-2xl m-1">
      <span className="text-xl">📤</span>
      <span className="text-[10px] font-extrabold text-[#002454]">완성본 업로드하기</span>
    </div>
  ) : null;

  const crewList: string[] = (() => {
    if (typeof bodyObj.crew === 'string') return bodyObj.crew.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (Array.isArray(bodyObj.crew)) return bodyObj.crew.map((c: any) => c.name || c).filter(Boolean);
    return item.author_name ? [item.author_name] : [];
  })();

  const hashtags = (raw: any) => (raw ? String(raw).split(',').map((k: string) => k.trim().replace(/^#+/, '')).filter(Boolean) : []);

  if (kind === 'proposal') {
    const naturalHeight = 610;
    return (
      <div
        ref={outerRef}
        onClick={handleClick}
        className="relative overflow-hidden rounded-2xl bg-[#FAFAFA] shadow-xs border border-slate-200/70 cursor-pointer active:scale-[0.98] transition-transform"
        style={{ width: '100%', height: naturalHeight * SCALE }}
      >
        <div
          style={{ width: NATURAL_WIDTH, transform: `scale(${SCALE})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}
          className="p-3 space-y-2"
        >
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 bg-[#FFB800] text-white text-[8px] font-black rounded">기획안</span>
            <span className="text-[7px] text-slate-500 font-medium truncate">{item.author_name} · {item.created_at ? item.created_at.split('T')[0] : ''}</span>
          </div>

          <FieldBox label="제목 (가제)">{item.title}</FieldBox>

          <div className="space-y-1">
            <div className="text-[9px] font-bold text-slate-900">콘텐츠 분류</div>
            <div className="flex flex-wrap gap-1">
              <Chip>{item.team || '팀'}</Chip>
              <Chip>{item.content_type || '기사'}</Chip>
              {bodyObj.articleType && <Chip>{bodyObj.articleType}</Chip>}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[9px] font-bold text-slate-900">참여인원 (크루)</div>
            <div className="flex items-center gap-1">
              {crewList.slice(0, 4).map((name, i) => (
                <div key={i} className="w-4 h-4 rounded-full bg-[#002454] text-white text-[6px] font-black flex items-center justify-center border border-white">
                  {name.slice(0, 1)}
                </div>
              ))}
            </div>
          </div>

          <FieldBox label="기획 의도" lines={2}>{stripHtml(item.intent || bodyObj.intent) || '—'}</FieldBox>
          <FieldBox label="구성 및 내용" lines={2}>{stripHtml(bodyObj.composition) || '—'}</FieldBox>
          <FieldBox label="촬영 계획" lines={2}>{stripHtml(bodyObj.contentBody) || '—'}</FieldBox>

          {item.keywords && (
            <div className="space-y-1">
              <div className="text-[9px] font-bold text-slate-900">#해시태그</div>
              <div className="flex flex-wrap gap-1">
                {hashtags(item.keywords).slice(0, 4).map((k, i) => <Chip key={i}>#{k}</Chip>)}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <FieldBox label="희망 업로드 시기">{bodyObj.desiredDate || item.target_date || '—'}</FieldBox>
            <FieldBox label="데드라인">{bodyObj.deadline || '—'}</FieldBox>
          </div>

          <FieldBox label="비고">{stripHtml(item.description) || '—'}</FieldBox>

          <div className="h-6 rounded-md bg-[#003378]" />
        </div>
      </div>
    );
  }

  // 완성본
  const naturalHeight = 430;
  const getEmoji = (t: string) => {
    if (!t) return '📝';
    if (t.includes('영상') || t.includes('숏폼')) return '🎬';
    if (t.includes('카드뉴스') || t.includes('인스타')) return '📸';
    return '📄';
  };
  const finalHashtagsRaw = bodyObj.finalKeywords || item.keywords;

  return (
    <div
      ref={outerRef}
      onClick={handleClick}
      className={`relative overflow-hidden rounded-2xl bg-[#FAFAFA] shadow-xs border border-slate-200/70 transition-transform ${locked ? 'cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}`}
      style={{ width: '100%', height: naturalHeight * SCALE }}
    >
      {overlay}
      <div
        style={{ width: NATURAL_WIDTH, transform: `scale(${SCALE})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}
        className={`p-3 space-y-2 ${state !== 'view' ? 'opacity-40 grayscale' : ''}`}
      >
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 bg-[#00A859] text-white text-[8px] font-black rounded">완성본</span>
          <span className="text-[7px] text-slate-500 font-medium truncate">{item.author_name} · {item.created_at ? item.created_at.split('T')[0] : ''}</span>
        </div>

        <div className="w-full h-16 rounded-lg bg-gradient-to-br from-[#002454] via-indigo-700 to-purple-600 flex items-center justify-center text-2xl text-white">
          {getEmoji(item.content_type)}
        </div>

        <FieldBox label="본문 / 캡션 내용" lines={2}>{stripHtml(bodyObj.postContent) || stripHtml(item.intent || bodyObj.intent) || '—'}</FieldBox>
        <FieldBox label="비고" lines={2}>{stripHtml(bodyObj.finalDescription) || '—'}</FieldBox>

        <div className="space-y-1">
          <div className="text-[9px] font-bold text-slate-900">제작 인원</div>
          <div className="flex items-center gap-1">
            {crewList.slice(0, 4).map((name, i) => (
              <div key={i} className="w-4 h-4 rounded-full bg-[#002454] text-white text-[6px] font-black flex items-center justify-center border border-white">
                {name.slice(0, 1)}
              </div>
            ))}
          </div>
        </div>

        {finalHashtagsRaw && (
          <div className="space-y-1">
            <div className="text-[9px] font-bold text-slate-900">#해시태그</div>
            <div className="flex flex-wrap gap-1">
              {hashtags(finalHashtagsRaw).slice(0, 4).map((k, i) => <Chip key={i}>#{k}</Chip>)}
            </div>
          </div>
        )}

        <div className="h-6 rounded-md bg-[#00A859]" />
      </div>
    </div>
  );
}
