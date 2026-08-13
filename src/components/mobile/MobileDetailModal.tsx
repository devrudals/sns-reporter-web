'use client';

import React from 'react';

interface MobileDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'proposal' | 'final';
  item?: any;
}

const stripHtml = (htmlStr: any) => {
  if (!htmlStr || typeof htmlStr !== 'string') return htmlStr || '';
  return htmlStr
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

export default function MobileDetailModal({ isOpen, onClose, type, item }: MobileDetailModalProps) {
  if (!isOpen || !item) return null;

  let bodyObj: any = {};
  try {
    if (item.content_body && item.content_body.startsWith('{')) {
      bodyObj = JSON.parse(item.content_body);
    }
  } catch (e) {}

  const isFinal = type === 'final' || item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';

  const rawIntent = item.intent || bodyObj.intent || '';
  const cleanIntent = stripHtml(rawIntent);

  const rawDescription = item.description || bodyObj.description || '';
  const cleanDescription = stripHtml(rawDescription);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 transition-opacity duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-black ${
              isFinal ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {isFinal ? '완성본' : '기획안'}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              작성일: {item.created_at ? item.created_at.split('T')[0] : ''}
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-700 font-black transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 overflow-y-auto space-y-4.5 text-slate-800">
          {/* Title */}
          <div>
            <h3 className="text-base font-extrabold text-slate-900 leading-snug">{item.title || '제목 없음'}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500 font-medium">
              <span className="font-bold text-slate-700">{item.team || '팀 미정'}</span>
              <span>•</span>
              <span className="font-bold text-slate-700">{item.author_name || '기자'}</span>
              <span>•</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">{item.content_type}</span>
            </div>
          </div>

          {/* Final Work Link Banner if Final */}
          {isFinal && (item.final_url || bodyObj.docsUrl) && (
            <div className="p-4 bg-gradient-to-r from-[#002454] to-blue-800 rounded-2xl text-white shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold tracking-wide uppercase text-blue-100">구글 드라이브 / 링크</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Open Drive ↗</span>
              </div>
              <a 
                href={item.final_url || bodyObj.docsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs font-bold underline underline-offset-2 break-all line-clamp-2 hover:text-blue-100"
              >
                {item.final_url || bodyObj.docsUrl}
              </a>
            </div>
          )}

          {/* Details Sections */}
          <div className="space-y-3.5 text-xs">
            {/* Intent / Purpose */}
            {cleanIntent && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                <div className="font-bold text-slate-800 mb-1 text-xs">기획 의도 및 배경</div>
                <p className="text-slate-600 whitespace-pre-wrap leading-relaxed font-normal text-xs">{cleanIntent}</p>
              </div>
            )}

            {/* Description / Content Structure */}
            {cleanDescription && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                <div className="font-bold text-slate-800 mb-1 text-xs">구성 및 내용 설명</div>
                <p className="text-slate-600 whitespace-pre-wrap leading-relaxed font-normal text-xs">{cleanDescription}</p>
              </div>
            )}

            {/* Target Date / Timeliness */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <div className="text-slate-400 text-[11px] mb-0.5 font-medium">희망 업로드일</div>
                <div className="font-bold text-slate-800 text-xs">{bodyObj.desiredDate || item.target_date || '미설정'}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <div className="text-slate-400 text-[11px] mb-0.5 font-medium">진척도 / 상태</div>
                <div className="font-extrabold text-blue-700 text-xs uppercase">{item.status || '대기'}</div>
              </div>
            </div>

            {/* Keywords */}
            {(item.keywords || bodyObj.keywords) && (
              <div>
                <div className="font-bold text-slate-800 mb-1.5 text-xs">해시태그 / 키워드</div>
                <div className="flex flex-wrap gap-1.5">
                  {String(item.keywords || bodyObj.keywords).split(',').map((kw: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                      #{kw.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#002454] text-white font-bold rounded-xl text-xs hover:bg-blue-900 transition-colors shadow-sm"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
