'use client';

import React, { useState } from 'react';
import MobileDashboard from './MobileDashboard';
import MobileCalendar from './MobileCalendar';
import MobileFullList from './MobileFullList';
import MobileProfile from './MobileProfile';
import MobileDetailModal from './MobileDetailModal';

interface MobileShellProps {
  contents: any[];
  notices: any[];
  deadlines?: any;
  allProfiles?: any[];
  user: any;
  onLogout?: () => void;
}

export default function MobileShell({ contents, notices, deadlines = {}, allProfiles = [], user, onLogout }: MobileShellProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'list' | 'profile'>('dashboard');
  const [detailModalItem, setDetailModalItem] = useState<any>(null);
  const [detailModalType, setDetailModalType] = useState<'proposal' | 'final'>('proposal');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpenDetail = (item: any, type: 'proposal' | 'final') => {
    setDetailModalItem(item);
    setDetailModalType(type);
    setIsDetailOpen(true);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: '대시보드',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'calendar',
      label: '캘린더',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'list',
      label: '전체 리스트',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      )
    },
    {
      id: 'profile',
      label: '프로필',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  return (
    <div className="w-full min-h-screen bg-slate-200/60 flex items-center justify-center p-0 sm:p-6 overflow-x-hidden">
      {/* Premium iPhone Container Frame */}
      <div className="w-full sm:w-[412px] h-screen sm:h-[870px] bg-[#F4F5F7] sm:rounded-[44px] shadow-2xl sm:border-[8px] sm:border-slate-900 overflow-hidden flex flex-col relative">
        
        {/* iPhone Speaker Notch for Desktop View */}
        <div className="hidden sm:flex justify-center items-center pt-2 pb-1 bg-white border-b border-slate-100 z-40">
          <div className="w-20 h-4 bg-slate-900 rounded-full flex items-center justify-end px-2 gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-800" />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-900/80" />
          </div>
        </div>

        {/* Top App Header */}
        <header className="bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-200/70 sticky top-0 z-30 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#002454] flex items-center justify-center text-white font-black text-xs shadow-xs">
              Y
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 tracking-tight">연세 미디어센터</div>
              <div className="text-[9px] text-slate-500 font-semibold">SNS 기자단 모바일</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                localStorage.setItem('pref_view_mode', 'desktop');
                window.location.href = '/dashboard';
              }}
              className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-extrabold hover:bg-slate-200 transition-colors border border-slate-200"
            >
              💻 PC 뷰
            </button>
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors text-xs"
            >
              🔍
            </button>
            <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs">
              🔔
            </div>
          </div>
        </header>

        {/* Search Overlay Input Bar if toggled */}
        {isSearchOpen && (
          <div className="bg-white px-4 py-2 border-b border-slate-200 animate-in slide-in-from-top-2 duration-150 z-30">
            <input
              type="text"
              placeholder="통합 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
        )}

        {/* Main Content Body Container */}
        <main className="flex-1 p-3.5 overflow-y-auto relative pb-24">
          {activeTab === 'dashboard' && (
            <MobileDashboard contents={contents} notices={notices} deadlines={deadlines} allProfiles={allProfiles} onOpenDetail={handleOpenDetail} />
          )}

          {activeTab === 'calendar' && (
            <MobileCalendar contents={contents} allProfiles={allProfiles} onOpenDetail={handleOpenDetail} />
          )}

          {activeTab === 'list' && (
            <MobileFullList contents={contents} onOpenDetail={handleOpenDetail} />
          )}

          {activeTab === 'profile' && (
            <MobileProfile user={user} onLogout={onLogout} />
          )}
        </main>

        {/* Bottom App Navigation Bar (Contained STRICTLY inside mobile frame) */}
        <nav className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-30 px-2 py-1 shadow-lg">
          <div className="flex items-center justify-around h-14">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex flex-col items-center justify-center w-full h-full transition-all active:scale-95 ${
                    isActive ? 'text-blue-600 font-bold' : 'text-slate-400 font-medium'
                  }`}
                >
                  {item.icon(isActive)}
                  <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Detail Modal Overlay */}
        <MobileDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          type={detailModalType}
          item={detailModalItem}
        />
      </div>
    </div>
  );
}
