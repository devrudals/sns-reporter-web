'use client';

import React from 'react';

interface MobileDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'proposal' | 'final';
  item?: any;
}

export default function MobileDetailModal({ isOpen, onClose, type, item }: MobileDetailModalProps) {
  if (!isOpen || !item) return null;

  let bodyObj: any = {};
  try {
    if (item.content_body && item.content_body.startsWith('{')) {
      bodyObj = JSON.parse(item.content_body);
    }
  } catch (e) {}

  const isFinal = type === 'final' || item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-300">
      <div 
        className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Handle */}
        <div className="w-full py-3 flex justify-center items-center cursor-pointer border-b border-slate-100" onClick={onClose}>
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
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
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-800">
          {/* Title */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-snug">{item.title || '제목 없음'}</h3>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{item.team || '팀 미정'}</span>
              <span>•</span>
              <span>{item.author_name || '기자'}</span>
              <span>•</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">{item.content_type}</span>
            </div>
          </div>

          {/* Final Work Link Banner if Final */}
          {isFinal && (item.final_url || bodyObj.docsUrl) && (
            <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold tracking-wide uppercase text-blue-100">구글 드라이브 / 링크</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">Open Drive ↗</span>
              </div>
              <a 
                href={item.final_url || bodyObj.docsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-semibold underline underline-offset-2 break-all line-clamp-2 hover:text-blue-100"
              >
                {item.final_url || bodyObj.docsUrl}
              </a>
            </div>
          )}

          {/* Details Sections */}
          <div className="space-y-4 text-xs">
            {/* Intent / Purpose */}
            {(item.intent || bodyObj.intent) && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="font-bold text-slate-700 mb-1">기획 의도 및 배경</div>
                <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{item.intent || bodyObj.intent}</p>
              </div>
            )}

            {/* Description / Content Structure */}
            {(item.description || bodyObj.description) && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="font-bold text-slate-700 mb-1">구성 및 내용 설명</div>
                <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{item.description || bodyObj.description}</p>
              </div>
            )}

            {/* Target Date / Timeliness */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-slate-400 text-[11px] mb-0.5">희망 업로드일</div>
                <div className="font-bold text-slate-700">{bodyObj.desiredDate || item.target_date || '미설정'}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-slate-400 text-[11px] mb-0.5">진척도 / 상태</div>
                <div className="font-bold text-blue-600">{item.status || '대기'}</div>
              </div>
            </div>

            {/* Keywords */}
            {(item.keywords || bodyObj.keywords) && (
              <div>
                <div className="font-bold text-slate-700 mb-1.5">해시태그 / 키워드</div>
                <div className="flex flex-wrap gap-1.5">
                  {String(item.keywords || bodyObj.keywords).split(',').map((kw: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-medium">
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
            className="flex-1 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-300 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
