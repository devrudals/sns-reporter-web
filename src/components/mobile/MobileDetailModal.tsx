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
      className="fixed inset-0 z-50 bg-[#FFFFFF] flex flex-col w-full h-full min-h-screen overflow-hidden animate-in fade-in duration-200"
    >
      {/* 1. Figma Header (대시보드 4 & 5 1:1) */}
      <header className="bg-white px-5 py-4 flex items-center justify-between border-b border-[#E5E7EB] sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-extrabold text-[#111111] font-['Pretendard']">
            {isFinal ? '완성본' : '기획안'}
          </h2>
          <button
            onClick={() => setCurrentTab(currentTab === 'proposal' ? 'final' : 'proposal')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-200"
          >
            {currentTab === 'proposal' ? '완성본 뷰 ➔' : '기획안 뷰 ➔'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-normal text-[#666666] font-['Pretendard']">
            작성자: {item.author_name} / {item.created_at ? item.created_at.split('T')[0] : ''}
          </span>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors text-base"
          >
            ✕
          </button>
        </div>
      </header>

      {/* 2. Main Full Screen Content Body (Figma Exact Box System #EDEDED) */}
      <main className="flex-1 p-5 overflow-y-auto space-y-5 max-w-xl mx-auto w-full pb-32">
        
        {/* ========================================================= */}
        {/* SCENARIO A: 대시보드 4 완성본 (Figma 1:1) */}
        {/* ========================================================= */}
        {isFinal ? (
          <div className="space-y-4 font-['Pretendard']">
            
            {/* Figma Google Drive Big Card (#3A3D40) */}
            <div className="w-full bg-[#3A3D40] rounded-[16px] overflow-hidden shadow-lg space-y-0">
              <div className="p-6 flex flex-col items-center justify-center relative text-white min-h-[160px] bg-gradient-to-b from-[#3A3D40] to-[#2B2D30]">
                {/* Drive Triangular Graphic SVG */}
                <svg className="w-20 h-20 text-emerald-400 my-2 opacity-90" viewBox="0 0 87.3 78" fill="currentColor">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.55z" fill="#0066da"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.45-1.2 3-1.2 4.55h27.5z" fill="#00ac47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.5-2.6 7.6-13.15c.8-1.45 1.2-3 1.2-4.55h-27.45l6.05 10.5z" fill="#ea4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.4-.8-2.95-1.2-4.55-1.2h-18.4c-1.6 0-3.15.4-4.55 1.2z" fill="#00832d"/>
                  <path d="m59.8 43.1-16.15-28-16.15 28h32.3z" fill="#2684fc"/>
                  <path d="m73.55 76.8 13.75-23.8c.8-1.45 1.2-3 1.2-4.55 0-1.55-.4-3.1-1.2-4.55l-25.4-44c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 28.7 49.7z" fill="#ffba00"/>
                </svg>
                {driveUrl && (
                  <a
                    href={driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-3.5 right-3.5 px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-md text-xs font-semibold backdrop-blur-xs flex items-center gap-1"
                  >
                    <span>Open Drive</span>
                    <span>↗</span>
                  </a>
                )}
              </div>

              {/* White Text Area */}
              <div className="bg-white p-4 space-y-1 border-t border-slate-100">
                <h3 className="text-base font-extrabold text-[#111111] leading-snug">{item.title}</h3>
                <div className="text-xs text-[#666666] font-medium">
                  {item.author_name} / SNS기자단 활동 (Yon) / 26-1 / {item.team || '인스타 팀'} / {item.content_type || '릴스'}
                </div>
                {driveUrl && (
                  <a 
                    href={driveUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-[#00A859] underline underline-offset-2 break-all line-clamp-1 block hover:text-emerald-700 pt-1"
                  >
                    {driveUrl}
                  </a>
                )}
              </div>
            </div>

            {/* Figma Field Box System (#EDEDED rounded-[10px]) */}
            <div className="space-y-4">
              {/* 1. 구글 드라이브 링크 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] block">구글 드라이브 링크</label>
                <div className="w-full bg-[#EDEDED] rounded-[10px] p-3 text-xs text-[#333333] font-mono break-all min-h-[44px] flex items-center">
                  {driveUrl ? (
                    <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      {driveUrl}
                    </a>
                  ) : (
                    <span className="text-[#999999]">내용을 입력해주세요</span>
                  )}
                </div>
              </div>

              {/* 2. 본문 / 캡션 내용 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] block">본문 / 캡션 내용</label>
                <div className="w-full bg-[#EDEDED] rounded-[10px] p-3 text-xs text-[#333333] leading-relaxed min-h-[100px] whitespace-pre-wrap">
                  {cleanIntent || cleanDescription || <span className="text-[#999999]">내용을 입력해주세요</span>}
                </div>
              </div>

              {/* 3. 배경 음악 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] block">배경 음악</label>
                <div className="w-full bg-[#EDEDED] rounded-[10px] p-3 text-xs text-[#333333] min-h-[44px] flex items-center">
                  <span className="text-[#999999]">내용을 입력해주세요</span>
                </div>
              </div>

              {/* 4. 사용 툴 / 템플릿 출처 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] block">사용 툴 / 템플릿 출처</label>
                <div className="w-full bg-[#EDEDED] rounded-[10px] p-3 text-xs text-[#333333] min-h-[44px] flex items-center">
                  {item.team ? `제작 | ${item.team}` : <span className="text-[#999999]">내용을 입력해주세요</span>}
                </div>
              </div>

              {/* 5. 제작 인원 (자동완성, 수정가능하도록 접근 오픈) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] block">제작 인원 (자동완성, 수정가능하도록 접근 오픈)</label>
                <div className="w-full bg-[#EDEDED] rounded-[10px] p-3 text-xs text-[#333333] min-h-[44px] flex items-center font-medium">
                  제작 | {crewList.join(' ')}
                </div>
              </div>

              {/* 6. #해시태그 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] block">#해시태그</label>
                <div className="flex flex-wrap gap-1.5">
                  {item.keywords ? (
                    String(item.keywords).split(',').map((kw: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 bg-[#D9E8FF] text-[#002454] rounded-lg text-xs font-bold flex items-center gap-1">
                        <span>#{kw.trim()}</span>
                        <span className="text-slate-400">×</span>
                      </span>
                    ))
                  ) : (
                    <div className="w-full bg-[#EDEDED] rounded-[10px] p-3 text-xs text-[#999999]">
                      그래도 수정/추가가 가능하게 여기에 입력해주세요... ×
                    </div>
                  )}
                </div>
              </div>

              {/* 7. 비고 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] block">비고</label>
                <div className="w-full bg-[#EDEDED] rounded-[10px] p-3 text-xs text-[#333333] min-h-[44px] flex items-center">
                  <span className="text-[#999999]">내용을 입력해주세요</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* SCENARIO B: 대시보드 5 기획안 (Figma 1:1) */
          /* ========================================================= */
          <div className="space-y-4 font-['Pretendard']">
            {/* 1. 제목 (가제) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111111] block">제목 (가제)</label>
              <div className="w-full bg-[#EDEDED] rounded-[10px] p-3.5 text-sm font-bold text-[#111111]">
                {item.title || <span className="text-[#999999] font-normal">내용을 입력해주세요</span>}
              </div>
            </div>

            {/* 2. 콘텐츠 분류 Dropdown Chips (Figma 1:1) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111111] block">콘텐츠 분류</label>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-[#F4F5F7] border border-[#E5E7EB] rounded-[8px] p-2 text-center text-xs font-bold text-[#333333] flex items-center justify-center gap-1">
                  <span>{item.team || '유튜브'}</span>
                  <span className="text-slate-400 text-[10px]">∨</span>
                </div>
                <div className="bg-[#F4F5F7] border border-[#E5E7EB] rounded-[8px] p-2 text-center text-xs font-bold text-[#333333] flex items-center justify-center gap-1">
                  <span>5월</span>
                  <span className="text-slate-400 text-[10px]">∨</span>
                </div>
                <div className="bg-[#F4F5F7] border border-[#E5E7EB] rounded-[8px] p-2 text-center text-xs font-bold text-[#333333] flex items-center justify-center gap-1">
                  <span>팀기사</span>
                  <span className="text-slate-400 text-[10px]">∨</span>
                </div>
                <div className="bg-[#F4F5F7] border border-[#E5E7EB] rounded-[8px] p-2 text-center text-xs font-bold text-[#333333] flex items-center justify-center gap-1">
                  <span>{item.content_type || '카드뉴스'}</span>
                  <span className="text-slate-400 text-[10px]">∨</span>
                </div>
              </div>
            </div>

            {/* 3. 참여인원 (크루) Circles (Figma 1:1) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111111] block">참여인원 (크루)</label>
              <div className="flex items-center gap-3 overflow-x-auto pb-1 bg-white p-2 border border-slate-100 rounded-xl">
                {crewList.map((name, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-[#002454] text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-xs">
                      {name.slice(0, 2)}
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 mt-1">{name}</span>
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 text-slate-400 flex items-center justify-center text-base font-bold cursor-pointer">
                  +
                </div>
              </div>
            </div>

            {/* 4. 기획의도 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111111] block">기획의도</label>
              <div className="w-full bg-[#EDEDED] rounded-[10px] p-3.5 text-xs text-[#333333] leading-relaxed min-h-[100px] whitespace-pre-wrap">
                {cleanIntent || <span className="text-[#999999]">내용을 입력해주세요</span>}
              </div>
            </div>

            {/* 5. 구성 및 내용 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111111] block">구성 및 내용</label>
              <div className="w-full bg-[#EDEDED] rounded-[10px] p-3.5 text-xs text-[#333333] leading-relaxed min-h-[120px] whitespace-pre-wrap">
                {cleanDescription || <span className="text-[#999999]">내용을 입력해주세요</span>}
              </div>
            </div>

            {/* 6. 촬영 계획 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111111] block">촬영 계획</label>
              <div className="w-full bg-[#EDEDED] rounded-[10px] p-3.5 text-xs text-[#333333] leading-relaxed min-h-[90px]">
                <span className="text-[#999999]">내용을 입력해주세요</span>
              </div>
            </div>

            {/* 7. #해시태그 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111111] block">#해시태그</label>
              <div className="flex flex-wrap gap-1.5">
                {item.keywords ? (
                  String(item.keywords).split(',').map((kw: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 bg-[#D9E8FF] text-[#002454] rounded-lg text-xs font-bold flex items-center gap-1">
                      <span>#{kw.trim()}</span>
                      <span className="text-slate-400">×</span>
                    </span>
                  ))
                ) : (
                  <div className="w-full bg-[#EDEDED] rounded-[10px] p-3 text-xs text-[#999999]">
                    여기에 입력해주세요... ×
                  </div>
                )}
              </div>
            </div>

            {/* 8. 희망 업로드 시기 & 데드라인 Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] block">희망 업로드 시기</label>
                <div className="w-full bg-[#EDEDED] rounded-[10px] p-3 text-xs text-[#333333] min-h-[44px] flex items-center justify-between">
                  <span>{bodyObj.desiredDate || item.target_date || 'YYYY.MM.DD'}</span>
                  <span>🗓️</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] block">데드라인</label>
                <div className="w-full bg-[#EDEDED] rounded-[10px] p-3 text-xs text-[#333333] min-h-[44px] flex items-center justify-between">
                  <span>YYYY.MM.DD</span>
                  <span>🗓️</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. Figma Sticky Footer Buttons (대시보드 4 & 5 1:1) */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E5E7EB] z-40 max-w-xl mx-auto flex items-center gap-2">
        <a
          href="https://ymcrental.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3.5 px-4 bg-[#8DA3C4] text-white font-extrabold rounded-lg text-xs tracking-tight shadow-xs hover:bg-slate-500 transition-colors flex items-center justify-center gap-1.5"
        >
          <span>📍 장비대여 시스템 바로가기</span>
          <span>➔</span>
        </a>
        <button
          onClick={onClose}
          className="px-5 py-3.5 bg-[#002454] text-white font-black rounded-lg text-xs shadow-xs hover:bg-blue-900 transition-colors"
        >
          닫기
        </button>
      </footer>
    </div>
  );
}
