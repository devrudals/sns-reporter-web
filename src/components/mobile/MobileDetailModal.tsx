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

  // Parse crew members
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

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#F4F5F7] flex flex-col w-full h-full min-h-screen overflow-hidden animate-in fade-in duration-200"
    >
      {/* 1. Top Fixed Navigation Header */}
      <header className="bg-[#002454] text-white px-4 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {/* Mode Switcher Toggle */}
          <button
            onClick={() => setCurrentTab(currentTab === 'proposal' ? 'final' : 'proposal')}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-black transition-all"
          >
            <span>{currentTab === 'proposal' ? '📝 기획안 뷰' : '🎬 완성본 뷰'}</span>
            <span className="text-[10px] text-blue-200">(전환 ⇄)</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-blue-200 font-semibold">
            작성자: {item.author_name} / {item.created_at ? item.created_at.split('T')[0] : ''}
          </span>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-black transition-colors text-sm"
          >
            ✕
          </button>
        </div>
      </header>

      {/* 2. Main Full Screen Scrollable Content Body (1:1 PC Spec & Figma Matching) */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 max-w-2xl mx-auto w-full pb-28">
        
        {/* SCENARIO A: 완성본 뷰 (Figma 전체 리스트 4 1:1) */}
        {isFinal ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3.5 py-1 bg-[#00A859] text-white text-xs font-black rounded-lg shadow-xs">
                완성본 🎬
              </span>
              <span className="text-xs text-slate-500 font-bold">진척도: {item.status || '완료'}</span>
            </div>

            {/* Google Drive Visual Banner Card (Figma 1:1 Specs) */}
            <div className="w-full bg-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <svg className="w-7 h-7 text-emerald-400" viewBox="0 0 87.3 78" fill="currentColor">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.55z" fill="#0066da"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.45-1.2 3-1.2 4.55h27.5z" fill="#00ac47"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.5-2.6 7.6-13.15c.8-1.45 1.2-3 1.2-4.55h-27.45l6.05 10.5z" fill="#ea4335"/>
                    <path d="m43.65 25 13.75-23.8c-1.4-.8-2.95-1.2-4.55-1.2h-18.4c-1.6 0-3.15.4-4.55 1.2z" fill="#00832d"/>
                    <path d="m59.8 43.1-16.15-28-16.15 28h32.3z" fill="#2684fc"/>
                    <path d="m73.55 76.8 13.75-23.8c.8-1.45 1.2-3 1.2-4.55 0-1.55-.4-3.1-1.2-4.55l-25.4-44c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 28.7 49.7z" fill="#ffba00"/>
                  </svg>
                  <span className="text-sm font-black tracking-wide text-slate-200">Google Drive</span>
                </div>
                {driveUrl && (
                  <a
                    href={driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Open Drive</span>
                    <span>↗</span>
                  </a>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black leading-snug">{item.title}</h3>
                <div className="text-xs text-slate-300 font-medium">
                  {item.author_name} / SNS기자단 활동 ({item.team || '인스타 팀'}) / {item.content_type || '릴스'}
                </div>
              </div>

              {driveUrl && (
                <a 
                  href={driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-blue-300 underline underline-offset-2 break-all line-clamp-1 block hover:text-blue-100"
                >
                  {driveUrl}
                </a>
              )}
            </div>

            {/* Specification Cards (1:1 PC Field Specs) */}
            <div className="space-y-3.5">
              {/* 1. 구글 드라이브 링크 */}
              {driveUrl && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                  <div className="text-xs font-bold text-slate-800">구글 드라이브 링크</div>
                  <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline font-mono break-all font-medium">
                    {driveUrl}
                  </a>
                </div>
              )}

              {/* 2. 본문 / 캡션 내용 */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="text-xs font-bold text-slate-800">본문 / 캡션 내용</div>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {cleanIntent || cleanDescription || '등록된 본문 내용이 없습니다.'}
                </p>
              </div>

              {/* 3. 배경 음악 & 사용 툴/템플릿 출처 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                  <div className="text-xs font-bold text-slate-800">배경 음악</div>
                  <div className="text-xs text-slate-600 font-medium">자체 음원 / 인스타 트렌드 BGM</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                  <div className="text-xs font-bold text-slate-800">사용 툴 / 템플릿 출처</div>
                  <div className="text-xs text-slate-600 font-medium">{item.team || '연세 미디어센터 템플릿'}</div>
                </div>
              </div>

              {/* 4. 제작 인원 (크루 프로필) */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                <div className="text-xs font-bold text-slate-800">제작 인원 (자동완성, 접근 오픈)</div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
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

              {/* 5. 해시태그 */}
              {item.keywords && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                  <div className="text-xs font-bold text-slate-800">#해시태그</div>
                  <div className="flex flex-wrap gap-1.5">
                    {String(item.keywords).split(',').map((kw: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold">
                        #{kw.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* SCENARIO B: 기획안 뷰 (Figma 1/2 1:1) */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3.5 py-1 bg-[#FFB800] text-white text-xs font-black rounded-lg shadow-xs">
                기획안 📝
              </span>
              <span className="text-xs text-slate-500 font-bold">상태: {item.status || '대기'}</span>
            </div>

            {/* Title Card */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="text-xs font-bold text-slate-400">제목 (가제)</div>
              <h3 className="text-lg font-black text-slate-900 leading-snug">{item.title || '제목 없음'}</h3>
            </div>

            {/* Content Category Chips */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="text-xs font-bold text-slate-800">콘텐츠 분류</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold">{item.team || '유튜브'}</span>
                <span className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold">{item.content_type || '카드뉴스'}</span>
                <span className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold">
                  {bodyObj.articleType || '개인기사'}
                </span>
              </div>
            </div>

            {/* Crew / Participants Circles (Figma Exact Style) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="text-xs font-bold text-slate-800">참여인원 (크루)</div>
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {crewList.map((name, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-[#002454] text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-sm">
                      {name.slice(0, 2)}
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 mt-1">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Intent / Description Cards */}
            {cleanIntent && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
                <div className="text-xs font-bold text-slate-800">기획 의도 및 배경</div>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{cleanIntent}</p>
              </div>
            )}

            {cleanDescription && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
                <div className="text-xs font-bold text-slate-800">구성 및 내용 설명</div>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{cleanDescription}</p>
              </div>
            )}

            {/* Target Upload Date */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-xs font-bold text-slate-800">희망 업로드 시기</div>
              <div className="text-xs font-bold text-slate-700">{bodyObj.desiredDate || item.target_date || '미설정'}</div>
            </div>

            {/* Keywords */}
            {item.keywords && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                <div className="text-xs font-bold text-slate-800">#해시태그</div>
                <div className="flex flex-wrap gap-1.5">
                  {String(item.keywords).split(',').map((kw: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold">
                      #{kw.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. Sticky Bottom Action Bar (Figma 1:1 Spec) */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 max-w-2xl mx-auto">
        <button
          onClick={onClose}
          className="w-full py-3.5 bg-[#002454] text-white font-extrabold rounded-xl text-sm hover:bg-blue-900 transition-colors shadow-lg flex items-center justify-center gap-2"
        >
          <span>기획안으로 시스템 바로가기 ➔</span>
        </button>
      </footer>
    </div>
  );
}
