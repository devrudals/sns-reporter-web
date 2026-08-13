'use client';

import React, { useState } from 'react';

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
  const [currentTab, setCurrentTab] = useState<'proposal' | 'final'>(type || 'proposal');

  if (!isOpen || !item) return null;

  let bodyObj: any = {};
  try {
    if (item.content_body && item.content_body.startsWith('{')) {
      bodyObj = JSON.parse(item.content_body);
    }
  } catch (e) {}

  const isFinal = currentTab === 'final' || item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';

  const rawIntent = item.intent || bodyObj.intent || '';
  const cleanIntent = stripHtml(rawIntent);

  const rawDescription = item.description || bodyObj.description || '';
  const cleanDescription = stripHtml(rawDescription);

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

  // Clean hashtags (remove duplicate '#' prefix)
  const cleanHashtags = item.keywords
    ? String(item.keywords)
        .split(',')
        .map(k => k.trim().replace(/^#+/, ''))
        .filter(Boolean)
    : [];

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#F4F5F7] flex flex-col w-full h-full min-h-screen overflow-hidden animate-in fade-in duration-200"
    >
      {/* 1. Header Navigation Bar */}
      <header className="bg-[#002454] text-white px-4 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-30 font-['Pretendard']">
        <div className="flex items-center gap-2.5">
          <span className={`px-2.5 py-1 text-xs font-black rounded-lg ${isFinal ? 'bg-[#00A859]' : 'bg-[#FFB800]'} text-white`}>
            {isFinal ? '완성본 🎬' : '기획안 📝'}
          </span>
          <button
            onClick={() => setCurrentTab(currentTab === 'proposal' ? 'final' : 'proposal')}
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
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition-colors text-sm"
          >
            ✕
          </button>
        </div>
      </header>

      {/* 2. Main Scrollable Content Body (No Dummy Text, Pristine Layout) */}
      <main className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 max-w-xl mx-auto w-full pb-28 font-['Pretendard'] text-slate-900">
        
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

            {/* Clean Real Content Cards */}
            <div className="space-y-3">
              {/* 본문 / 캡션 내용 */}
              {(cleanIntent || cleanDescription) && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
                  <div className="text-xs font-bold text-slate-800">본문 / 캡션 내용</div>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {cleanIntent || cleanDescription}
                  </p>
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
              {cleanHashtags.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                  <div className="text-xs font-bold text-slate-800">#해시태그</div>
                  <div className="flex flex-wrap gap-1.5">
                    {cleanHashtags.map((kw, i) => (
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

            {/* Real Intent & Description */}
            {cleanIntent && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
                <div className="text-xs font-bold text-slate-800">기획 의도 및 배경</div>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{cleanIntent}</p>
              </div>
            )}

            {cleanDescription && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
                <div className="text-xs font-bold text-slate-800">구성 및 내용 설명</div>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{cleanDescription}</p>
              </div>
            )}

            {/* Target Upload Date */}
            {(bodyObj.desiredDate || item.target_date) && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="text-xs font-bold text-slate-800">희망 업로드 시기</div>
                <div className="text-xs font-bold text-slate-800">{bodyObj.desiredDate || item.target_date}</div>
              </div>
            )}

            {/* Clean Hashtags */}
            {cleanHashtags.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                <div className="text-xs font-bold text-slate-800">#해시태그</div>
                <div className="flex flex-wrap gap-1.5">
                  {cleanHashtags.map((kw, i) => (
                    <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold">
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. Clean Single Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-40 max-w-xl mx-auto flex items-center justify-center">
        <button
          onClick={onClose}
          className="w-full py-4 bg-[#002454] text-white font-extrabold rounded-2xl text-sm hover:bg-blue-900 transition-colors shadow-lg flex items-center justify-center gap-2"
        >
          <span>닫기 (목록으로 돌아가기)</span>
        </button>
      </footer>
    </div>
  );
}
