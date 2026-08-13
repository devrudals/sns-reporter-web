'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface MobileDashboardProps {
  contents: any[];
  notices: any[];
  deadlines?: any;
  allProfiles?: any[];
  onOpenDetail: (item: any, type: 'proposal' | 'final') => void;
  onOpenSubmit?: (mode: 'proposal' | 'final') => void;
}

export default function MobileDashboard({ contents, notices, deadlines = {}, allProfiles = [], onOpenDetail, onOpenSubmit }: MobileDashboardProps) {
  const [activeTabDrawer, setActiveTabDrawer] = useState<'none' | 'final_preview' | 'proposal_preview'>('none');
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<any>(null);

  // Calculate D-Day Helper
  const calcDDay = (dateStr: string | null) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length < 3) return null;
    const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'D-DAY';
    if (diff > 0) return `D-${diff}`;
    return `D+${Math.abs(diff)}`;
  };

  const proposalDDay = calcDDay(deadlines.proposalDeadline) || 'D-2';
  const finalDDay = calcDDay(deadlines.finalDeadline) || 'D-17';
  const proposalTitle = deadlines.proposalTitle || '기획안 마감';
  const finalTitle = deadlines.finalTitle || '완성본 마감';

  // Real Database Contents Pending Approvals
  const pendingItems = contents.filter(c => 
    ['pending', 'revision', 'final_submitted', 'final_revision', 'approved'].includes(c.status)
  ).slice(0, 6);

  // Dynamic Featured Latest Content Item from real DB
  const featuredItem = contents.length > 0 ? contents[0] : null;

  return (
    <div className="space-y-4 pb-24 text-slate-900 select-none">
      {/* 1. Top D-Day Banner Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Proposal Deadline Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/80 p-4 rounded-2xl border border-blue-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[100px]">
          <div className="text-xs font-bold text-blue-700 tracking-wide">기획안 마감</div>
          <div className="text-3xl font-black text-[#002454] my-1 tracking-tight">{proposalDDay}</div>
          <div className="text-xs font-semibold text-blue-800 truncate">{proposalTitle}</div>
          <div className="absolute -right-4 -bottom-4 w-14 h-14 bg-blue-500/10 rounded-full blur-xs" />
        </div>

        {/* Final Work Deadline Card */}
        <div className="bg-gradient-to-br from-[#002454] to-blue-900 p-4 rounded-2xl text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[100px]">
          <div className="text-xs font-bold text-blue-200 tracking-wide">완성본 마감</div>
          <div className="text-3xl font-black text-white my-1 tracking-tight">{finalDDay}</div>
          <div className="text-xs font-semibold text-blue-100 truncate">{finalTitle}</div>
          <div className="absolute -right-4 -bottom-4 w-14 h-14 bg-white/10 rounded-full blur-xs" />
        </div>
      </div>

      {/* 2. 승인 대기 중 Section */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/70 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-black text-base text-slate-900">승인 대기 중</span>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-black rounded-full">
              {pendingItems.length}
            </span>
          </div>
          <Link href="/proposals" className="text-xs font-extrabold text-slate-400 hover:text-blue-600">
            전체보기 ›
          </Link>
        </div>

        <div className="space-y-2.5">
          {pendingItems.length > 0 ? (
            pendingItems.map((item, idx) => {
              const isFinal = item.status === 'final_submitted' || item.status === 'final_revision' || item.status === 'completed';
              return (
                <div
                  key={item.id || idx}
                  onClick={() => {
                    setSelectedDrawerItem(item);
                    setActiveTabDrawer(isFinal ? 'final_preview' : 'proposal_preview');
                  }}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer ${
                    isFinal 
                      ? 'bg-emerald-50/70 border-emerald-200/80 hover:bg-emerald-50' 
                      : 'bg-amber-50/70 border-amber-200/80 hover:bg-amber-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span className={`px-2.5 py-1 text-xs font-black rounded-lg flex-shrink-0 ${
                      isFinal ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {isFinal ? '완성본' : '기획안'}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate leading-snug">{item.title}</div>
                      <div className="text-xs font-medium text-slate-500 truncate mt-0.5">
                        {item.team || '팀'} • {item.author_name} ({item.content_type})
                      </div>
                    </div>
                  </div>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${
                    isFinal ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {isFinal ? '+' : '!'}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-5 bg-slate-50 rounded-xl text-center text-xs text-slate-400 font-medium">
              현재 대기 중인 항목이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 3. Featured / Recent Content Card */}
      {featuredItem && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/70 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#002454] to-indigo-600 p-0.5">
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-xs font-black text-blue-900">
                  {featuredItem.author_name ? featuredItem.author_name.slice(0, 2) : '기자'}
                </div>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">{featuredItem.author_name}</div>
                <div className="text-xs text-slate-400 font-medium">{featuredItem.team || 'SNS 기자단'}</div>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg">최신 콘텐츠</span>
          </div>

          {/* Dynamic Visual Banner */}
          <div className="w-full h-36 bg-gradient-to-br from-[#002454] via-indigo-700 to-purple-600 rounded-xl flex flex-col justify-end text-white relative overflow-hidden p-4 shadow-inner">
            <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/40 backdrop-blur-xs rounded-lg text-xs font-bold">
              {featuredItem.content_type}
            </div>
            <div className="relative z-10 space-y-1">
              <div className="text-sm font-black line-clamp-1">{featuredItem.title}</div>
              <div className="text-xs text-blue-100 font-medium">{featuredItem.team}</div>
            </div>
          </div>

          {/* Title & Tags */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 leading-snug">{featuredItem.title}</h4>
            {featuredItem.keywords && (
              <div className="flex flex-wrap gap-1.5">
                {String(featuredItem.keywords).split(',').map((tag: string, idx: number) => (
                  <span key={idx} className="text-xs text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                    #{tag.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-1 border-t border-slate-100">
            <button 
              onClick={() => onOpenDetail(featuredItem, 'proposal')}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200/80"
            >
              📄 기획안 보기
            </button>
            <button 
              onClick={() => onOpenDetail(featuredItem, 'final')}
              className="flex-1 py-3 bg-[#002454] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
            >
              🎬 완성본 보기
            </button>
          </div>
        </div>
      )}

      {/* 4. 공지사항 Section */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/70 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="font-black text-base text-slate-900">공지사항</span>
          <Link href="/notices" className="text-xs font-extrabold text-slate-400 hover:text-blue-600">
            전체보기 ›
          </Link>
        </div>

        <div className="space-y-2">
          {notices && notices.length > 0 ? (
            notices.slice(0, 4).map((notice, idx) => (
              <div key={notice.id || idx} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded flex-shrink-0">
                    공지
                  </span>
                  <span className="text-sm font-semibold text-slate-800 truncate">{notice.title}</span>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                  {notice.created_at ? notice.created_at.split('T')[0] : ''}
                </span>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">등록된 공지사항이 없습니다.</div>
          )}
        </div>
      </div>

      {/* 5. Mobile Quick Action Buttons (Opens MobileSubmitModal) */}
      <div className="absolute bottom-18 left-3.5 right-3.5 z-20 flex items-center gap-3">
        <button 
          onClick={() => onOpenSubmit ? onOpenSubmit('proposal') : null}
          className="flex-1 py-3 px-4 bg-white text-blue-900 font-black text-sm rounded-xl shadow-lg border border-blue-200 flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
        >
          <span>✍️</span>
          <span>기획안 작성</span>
        </button>
        <button 
          onClick={() => onOpenSubmit ? onOpenSubmit('final') : null}
          className="flex-1 py-3 px-4 bg-[#002454] text-white font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
        >
          <span>📤</span>
          <span>완성본 업로드</span>
        </button>
      </div>

      {/* Drawer Overlay for Preview */}
      {activeTabDrawer !== 'none' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center" onClick={() => setActiveTabDrawer('none')}>
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto" />
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                {activeTabDrawer === 'final_preview' ? '완성본 미리보기' : '기획안 미리보기'}
              </h3>
              <button onClick={() => setActiveTabDrawer('none')} className="text-slate-400 font-bold text-lg">✕</button>
            </div>

            {selectedDrawerItem && (
              <div className="space-y-3.5 text-slate-800">
                <div className="text-base font-bold text-slate-900">{selectedDrawerItem.title}</div>
                <div className="text-xs font-medium text-slate-500">
                  {selectedDrawerItem.team} • {selectedDrawerItem.author_name} ({selectedDrawerItem.content_type})
                </div>
                
                <button 
                  onClick={() => {
                    const type = activeTabDrawer === 'final_preview' ? 'final' : 'proposal';
                    const item = selectedDrawerItem;
                    setActiveTabDrawer('none');
                    onOpenDetail(item, type);
                  }}
                  className="w-full py-3.5 bg-[#002454] text-white font-bold rounded-xl text-sm shadow-md"
                >
                  상세 페이지 보기 ➔
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
