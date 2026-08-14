'use client';

import React, { useState, useEffect } from 'react';
import MobileDashboard from './MobileDashboard';
import MobileCalendar from './MobileCalendar';
import MobileFullList from './MobileFullList';
import MobileProfile from './MobileProfile';
import MobileDetailModal from './MobileDetailModal';
import MobileSubmitModal from './MobileSubmitModal';

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

  // Submit Modal state
  const [submitModalMode, setSubmitModalMode] = useState<'proposal' | 'final' | 'none'>('none');

  // Figma spec is authored at a 16px rem base (402px frame); the app-wide
  // html font-size is 17px for the PC layout, so scope the 16px base to
  // exactly the lifetime of this shell.
  useEffect(() => {
    document.documentElement.classList.add('mobile-rem-base');
    return () => document.documentElement.classList.remove('mobile-rem-base');
  }, []);

  const handleOpenDetail = (item: any, type: 'proposal' | 'final') => {
    setDetailModalItem(item);
    setDetailModalType(type);
    setIsDetailOpen(true);
  };

  const handleOpenSubmit = (mode: 'proposal' | 'final') => {
    setSubmitModalMode(mode);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: '대시보드',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-white' : 'text-[#757575]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'calendar',
      label: '캘린더',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-white' : 'text-[#757575]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'list',
      label: '전체 리스트',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-white' : 'text-[#757575]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      )
    },
    {
      id: 'profile',
      label: '프로필',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-white' : 'text-[#757575]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  return (
    <div className="w-full min-h-dvh bg-[#F4F5F7] lg:bg-slate-200/80 flex items-center justify-center p-0 lg:p-6 overflow-x-hidden">
      {/* Mobile Screen Container Frame */}
      <div className="font-mobile-body w-full h-full min-h-dvh lg:w-[440px] lg:h-[900px] bg-[#F4F5F7] lg:rounded-[44px] lg:shadow-2xl lg:border-[8px] lg:border-slate-900 overflow-hidden flex flex-col relative">
        
        {/* iPhone Speaker Notch for Desktop View */}
        <div className="hidden lg:flex justify-center items-center pt-2.5 pb-1 bg-white border-b border-slate-100 z-40">
          <div className="w-24 h-4 bg-slate-900 rounded-full flex items-center justify-end px-2.5 gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-800" />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-900/80" />
          </div>
        </div>

        {/* Top Header */}
        <header className="bg-white px-4 py-3.5 border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#002454] flex items-center justify-center text-white font-black text-sm shadow-xs">
              Y
            </div>
            <div>
              <div className="text-sm font-black text-slate-900 tracking-tight">연세 미디어센터</div>
              <div className="text-[10px] text-slate-500 font-semibold">SNS 기자단 모바일</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                localStorage.setItem('pref_view_mode', 'desktop');
                window.location.href = '/dashboard';
              }}
              className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-extrabold hover:bg-slate-200 transition-colors border border-slate-200"
            >
              💻 PC 뷰
            </button>
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors text-sm"
            >
              🔍
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">
              🔔
            </div>
          </div>
        </header>

        {/* Search Overlay Input Bar if toggled */}
        {isSearchOpen && (
          <div className="bg-white px-4 py-3 border-b border-slate-200 animate-in slide-in-from-top-2 duration-150 z-30">
            <input
              type="text"
              placeholder="통합 검색어 입력..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              autoFocus
            />
          </div>
        )}

        {/* Main Content Body */}
        <main
          className={`flex-1 p-4 overflow-y-auto relative ${
            activeTab === 'dashboard' || activeTab === 'list'
              ? 'pb-[calc(10rem+env(safe-area-inset-bottom))]'
              : 'pb-[calc(6rem+env(safe-area-inset-bottom))]'
          }`}
        >
          {activeTab === 'dashboard' && (
            <MobileDashboard
              contents={contents}
              notices={notices}
              deadlines={deadlines}
              allProfiles={allProfiles}
              onOpenDetail={handleOpenDetail}
              onNavigateToList={() => setActiveTab('list')}
            />
          )}

          {activeTab === 'calendar' && (
            <MobileCalendar contents={contents} allProfiles={allProfiles} onOpenDetail={handleOpenDetail} />
          )}

          {activeTab === 'list' && (
            <MobileFullList
              contents={contents}
              onOpenDetail={handleOpenDetail}
            />
          )}

          {activeTab === 'profile' && (
            <MobileProfile user={user} onLogout={onLogout} />
          )}
        </main>

        {/* Quick Action Buttons — fixed to the shell (not the scroll container) so
            they never scroll away with content, per Figma's fixed-composition intent */}
        {(activeTab === 'dashboard' || activeTab === 'list') && (
          <div className="absolute left-3.5 right-3.5 z-20 flex items-center gap-3 bottom-[calc(5.125rem+env(safe-area-inset-bottom))]">
            <button
              onClick={() => handleOpenSubmit('proposal')}
              className="flex-1 py-3 px-4 bg-white text-[#002454] font-black text-sm rounded-xl shadow-lg border border-blue-200 flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
            >
              <span>✍️</span>
              <span>기획안 작성</span>
            </button>
            <button
              onClick={() => handleOpenSubmit('final')}
              className="flex-1 py-3 px-4 bg-[#002454] text-white font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
            >
              <span>📤</span>
              <span>완성본 업로드</span>
            </button>
          </div>
        )}

        {/* Bottom App Navigation Bar — floating glass capsule (Figma "bottom navbar" component:
            white translucent pill, backdrop blur, active tab as a dark pill inside) */}
        <nav className="font-mobile-sf absolute inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30">
          <div className="flex items-center h-[3.625rem] rounded-full bg-white/70 backdrop-blur-xl shadow-[0_18px_45px_-12px_rgba(0,0,0,0.25),0_8px_20px_-8px_rgba(0,0,0,0.15)] ring-1 ring-white/70 p-1 gap-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex flex-1 flex-col items-center justify-center h-full rounded-full transition-all duration-300 active:scale-95 ${
                    isActive ? 'bg-[#0B1220] shadow-md' : ''
                  }`}
                >
                  {item.icon(isActive)}
                  <span className={`text-[0.6rem] mt-0.5 font-bold tracking-tight ${isActive ? 'text-white' : 'text-[#757575]'}`}>
                    {item.label}
                  </span>
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

        {/* Mobile Submission Form Modal */}
        <MobileSubmitModal
          isOpen={submitModalMode !== 'none'}
          onClose={() => setSubmitModalMode('none')}
          mode={submitModalMode === 'final' ? 'final' : 'proposal'}
          user={user}
          allProfiles={allProfiles}
        />
      </div>
    </div>
  );
}
