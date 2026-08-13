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

  const driveUrl = item.final_url || bodyObj.docsUrl || bodyObj.driveUrl || '';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 transition-opacity duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-black ${
              isFinal ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {isFinal ? '완성본 🎬' : '기획안 📝'}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              작성자: {item.author_name} / {item.created_at ? item.created_at.split('T')[0] : ''}
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-700 font-black transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Modal Scroll Content Body (Figma Design 4 & 5 1:1) */}
        <div className="p-5 overflow-y-auto space-y-4.5 text-slate-800 flex-1">
          {/* ========================================================= */}
          {/* SCENARIO A: 완성본 Modal (Figma 전체 리스트 4) */}
          {/* ========================================================= */}
          {isFinal ? (
            <div className="space-y-4">
              {/* Google Drive Visual Banner */}
              <div className="w-full bg-slate-900 rounded-2xl p-4 text-white shadow-md relative overflow-hidden space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 87.3 78" fill="currentColor">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.55z" fill="#0066da"/>
                      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.45-1.2 3-1.2 4.55h27.5z" fill="#00ac47"/>
                      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.5-2.6 7.6-13.15c.8-1.45 1.2-3 1.2-4.55h-27.45l6.05 10.5z" fill="#ea4335"/>
                      <path d="m43.65 25 13.75-23.8c-1.4-.8-2.95-1.2-4.55-1.2h-18.4c-1.6 0-3.15.4-4.55 1.2z" fill="#00832d"/>
                      <path d="m59.8 43.1-16.15-28-16.15 28h32.3z" fill="#2684fc"/>
                      <path d="m73.55 76.8 13.75-23.8c.8-1.45 1.2-3 1.2-4.55 0-1.55-.4-3.1-1.2-4.55l-25.4-44c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 28.7 49.7z" fill="#ffba00"/>
                    </svg>
                    <span className="text-xs font-bold tracking-wide text-slate-200">Google Drive</span>
                  </div>
                  {driveUrl && (
                    <a
                      href={driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-full text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <span>Open Drive</span>
                      <span>↗</span>
                    </a>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-extrabold leading-snug">{item.title}</h3>
                  <div className="text-xs text-slate-300 font-medium">
                    {item.team || 'SNS기자단'} ({item.content_type}) - {item.author_name}
                  </div>
                </div>

                {driveUrl && (
                  <div className="text-xs font-mono text-blue-300 underline underline-offset-2 break-all line-clamp-1">
                    {driveUrl}
                  </div>
                )}
              </div>

              {/* Specification Cards */}
              <div className="space-y-3 text-xs">
                {/* 1. 구글 드라이브 링크 */}
                {driveUrl && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                    <div className="font-bold text-slate-800 mb-1">구글 드라이브 링크</div>
                    <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-mono break-all">
                      {driveUrl}
                    </a>
                  </div>
                )}

                {/* 2. 기획 / 홍보 내용 */}
                {(cleanIntent || cleanDescription) && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                    <div className="font-bold text-slate-800 mb-1">기획 / 홍보 내용</div>
                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{cleanIntent || cleanDescription}</p>
                  </div>
                )}

                {/* 3. 피드 승인 & 제작 인원 */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    <div className="text-slate-400 text-[11px] font-medium mb-0.5">피드 승인 / 상태</div>
                    <div className="font-extrabold text-emerald-600 uppercase">{item.status || '완료'}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    <div className="text-slate-400 text-[11px] font-medium mb-0.5">제작 인원</div>
                    <div className="font-bold text-slate-800">{item.author_name}</div>
                  </div>
                </div>

                {/* 4. 해시태그 & 비고 */}
                {item.keywords && (
                  <div>
                    <div className="font-bold text-slate-800 mb-1.5">해시태그 / 키워드</div>
                    <div className="flex flex-wrap gap-1.5">
                      {String(item.keywords).split(',').map((kw: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold">
                          #{kw.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* SCENARIO B: 기획안 Modal (Figma 전체 리스트 5) */
            /* ========================================================= */
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-snug">{item.title || '제목 없음'}</h3>
                <div className="text-xs text-slate-500 font-medium mt-1">
                  작성자: {item.author_name} / {item.created_at ? item.created_at.split('T')[0] : ''}
                </div>
              </div>

              {/* Category Chips (유튜브, 5월, 팀기사, 카드뉴스) */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <span className="text-xs font-bold text-slate-500">콘텐츠 분류:</span>
                <span className="px-2.5 py-1 bg-white border rounded-lg text-xs font-bold text-slate-800">{item.team || '유튜브'}</span>
                <span className="px-2.5 py-1 bg-white border rounded-lg text-xs font-bold text-slate-800">{item.content_type || '카드뉴스'}</span>
              </div>

              {/* Crew / Participants Circles */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-800">참여인원 (크루)</div>
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#002454] text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-xs">
                      {item.author_name ? item.author_name.slice(0, 2) : '기자'}
                    </div>
                    <span className="text-[9px] font-bold text-slate-600 mt-0.5">{item.author_name}</span>
                  </div>
                </div>
              </div>

              {/* Intent / Purpose */}
              {cleanIntent && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 text-xs space-y-1">
                  <div className="font-bold text-slate-800">기획 의도 및 배경</div>
                  <p className="text-slate-600 leading-relaxed font-normal">{cleanIntent}</p>
                </div>
              )}

              {/* Description */}
              {cleanDescription && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 text-xs space-y-1">
                  <div className="font-bold text-slate-800">구성 및 내용 설명</div>
                  <p className="text-slate-600 leading-relaxed font-normal">{cleanDescription}</p>
                </div>
              )}

              {/* Target Upload Date */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 text-xs">
                <div className="text-slate-400 text-[11px] font-medium mb-0.5">희망 업로드 시기</div>
                <div className="font-bold text-slate-800">{bodyObj.desiredDate || item.target_date || '미설정'}</div>
              </div>

              {/* Keywords */}
              {item.keywords && (
                <div>
                  <div className="font-bold text-slate-800 mb-1.5 text-xs">해시태그 / 키워드</div>
                  <div className="flex flex-wrap gap-1.5">
                    {String(item.keywords).split(',').map((kw: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                        #{kw.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer Button (Figma Design 4 & 5: 기획안으로 시스템 바로가기) */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-[#002454] text-white font-extrabold rounded-xl text-xs hover:bg-blue-900 transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <span>기획안으로 시스템 바로가기 ➔</span>
          </button>
        </div>
      </div>
    </div>
  );
}
