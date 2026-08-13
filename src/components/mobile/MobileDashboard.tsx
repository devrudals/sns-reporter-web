'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface MobileDashboardProps {
  contents: any[];
  notices: any[];
  deadlines?: any;
  allProfiles?: any[];
  onOpenDetail: (item: any, type: 'proposal' | 'final') => void;
}

export default function MobileDashboard({ contents, notices, deadlines = {}, allProfiles = [], onOpenDetail }: MobileDashboardProps) {
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

  let featuredBody: any = {};
  try {
    if (featuredItem?.content_body && featuredItem.content_body.startsWith('{')) {
      featuredBody = JSON.parse(featuredItem.content_body);
    }
  } catch (e) {}

  return (
    <div className="space-y-4 pb-24 text-slate-900 select-none">
      {/* 1. Top D-Day Banner Grid (Dynamic from DB) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Proposal Deadline Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/70 p-3.5 rounded-2xl border border-blue-200/60 shadow-xs relative overflow-hidden">
          <div className="text-[10px] font-bold text-blue-600 tracking-wide">기획안 마감</div>
          <div className="text-2xl font-black text-blue-900 my-1">{proposalDDay}</div>
          <div className="text-[10px] font-medium text-blue-700 truncate">{proposalTitle}</div>
          <div className="absolute -right-3 -bottom-3 w-12 h-12 bg-blue-500/10 rounded-full blur-xs" />
        </div>

        {/* Final Work Deadline Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-3.5 rounded-2xl text-white shadow-md relative overflow-hidden">
          <div className="text-[10px] font-bold text-blue-200 tracking-wide">완성본 마감</div>
          <div className="text-2xl font-black text-white my-1">{finalDDay}</div>
          <div className="text-[10px] font-medium text-blue-100 truncate">{finalTitle}</div>
          <div className="absolute -right-3 -bottom-3 w-12 h-10 bg-white/10 rounded-full blur-xs" />
        </div>
      </div>

      {/* 2. 승인 대기 중 Section (Dynamic from DB) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">승인 대기 중</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-extrabold rounded-full">
              {pendingItems.length}
            </span>
          </div>
          <Link href="/proposals" className="text-[11px] font-semibold text-slate-400 hover:text-blue-600">
            전체보기 ›
          </Link>
        </div>

        <div className="space-y-2">
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
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer ${
                    isFinal 
                      ? 'bg-emerald-50/60 border-emerald-200/80 hover:bg-emerald-50' 
                      : 'bg-amber-50/60 border-amber-200/80 hover:bg-amber-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md flex-shrink-0 ${
                      isFinal ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {isFinal ? '완성본' : '기획안'}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{item.title}</div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {item.team || '팀'} • {item.author_name} ({item.content_type})
                      </div>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    isFinal ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {isFinal ? '+' : '!'}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
              현재 대기 중인 항목이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 3. Featured / Recent Content Card (Dynamic from DB) */}
      {featuredItem && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5">
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-xs font-extrabold text-blue-700">
                  {featuredItem.author_name ? featuredItem.author_name.slice(0, 2) : '기자'}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">{featuredItem.author_name}</div>
                <div className="text-[10px] text-slate-400">{featuredItem.team || 'SNS 기자단'}</div>
              </div>
            </div>
            <span className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 font-bold rounded-lg">최신 콘텐츠</span>
          </div>

          {/* Dynamic Visual Banner */}
          <div className="w-full h-32 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl flex flex-col justify-end text-white relative overflow-hidden p-3.5 shadow-inner">
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/30 backdrop-blur-xs rounded text-[9px] font-bold">
              {featuredItem.content_type}
            </div>
            <div className="relative z-10 space-y-0.5">
              <div className="text-xs font-black line-clamp-1">{featuredItem.title}</div>
              <div className="text-[10px] text-blue-100 opacity-90">{featuredItem.team}</div>
            </div>
          </div>

          {/* Title & Tags */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-900 leading-snug">{featuredItem.title}</h4>
            {featuredItem.keywords && (
              <div className="flex flex-wrap gap-1">
                {String(featuredItem.keywords).split(',').map((tag: string, idx: number) => (
                  <span key={idx} className="text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                    #{tag.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <button 
              onClick={() => onOpenDetail(featuredItem, 'proposal')}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
            >
              📄 기획안 보기
            </button>
            <button 
              onClick={() => onOpenDetail(featuredItem, 'final')}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
            >
              🎬 완성본 보기
            </button>
          </div>
        </div>
      )}

      {/* 4. 공지사항 Section (Dynamic from DB) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm text-slate-900">공지사항</span>
          <Link href="/notices" className="text-[11px] font-semibold text-slate-400 hover:text-blue-600">
            전체보기 ›
          </Link>
        </div>

        <div className="space-y-2">
          {notices && notices.length > 0 ? (
            notices.slice(0, 4).map((notice, idx) => (
              <div key={notice.id || idx} className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded flex-shrink-0">
                    공지
                  </span>
                  <span className="text-xs font-semibold text-slate-800 truncate">{notice.title}</span>
                </div>
                <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">
                  {notice.created_at ? notice.created_at.split('T')[0] : ''}
                </span>
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-slate-400">등록된 공지사항이 없습니다.</div>
          )}
        </div>
      </div>

      {/* 5. Floating Quick Action Buttons */}
      <div className="absolute bottom-16 left-3 right-3 z-20 flex items-center gap-2.5">
        <Link 
          href="/proposals/submit"
          className="flex-1 py-2.5 px-3 bg-white text-blue-800 font-extrabold text-xs rounded-xl shadow-md border border-blue-200/80 flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
        >
          <span>✍️</span>
          <span>기획안 작성</span>
        </Link>
        <Link 
          href="/final-works/submit"
          className="flex-1 py-2.5 px-3 bg-[#002454] text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
        >
          <span>📤</span>
          <span>완성본 업로드</span>
        </Link>
      </div>

      {/* Drawer Overlay for Selected DB Item Preview */}
      {activeTabDrawer !== 'none' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center" onClick={() => setActiveTabDrawer('none')}>
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto" />
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-sm text-slate-900">
                {activeTabDrawer === 'final_preview' ? '완성본 미리보기' : '기획안 미리보기'}
              </h3>
              <button onClick={() => setActiveTabDrawer('none')} className="text-slate-400 font-bold">✕</button>
            </div>

            {selectedDrawerItem && (
              <div className="space-y-3 text-slate-800">
                <div className="text-sm font-bold text-slate-900">{selectedDrawerItem.title}</div>
                <div className="text-xs text-slate-500">
                  {selectedDrawerItem.team} • {selectedDrawerItem.author_name} ({selectedDrawerItem.content_type})
                </div>
                
                <button 
                  onClick={() => {
                    const type = activeTabDrawer === 'final_preview' ? 'final' : 'proposal';
                    const item = selectedDrawerItem;
                    setActiveTabDrawer('none');
                    onOpenDetail(item, type);
                  }}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl text-xs shadow-md"
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
