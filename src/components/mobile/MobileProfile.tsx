'use client';

import React from 'react';

interface MobileProfileProps {
  user: any;
  onLogout?: () => void;
}

export default function MobileProfile({ user, onLogout }: MobileProfileProps) {
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '기자';
  const userTeam = user?.user_metadata?.team || 'SNS기자단';
  const userEmail = user?.email || 'user@yonsei.ac.kr';

  return (
    <div className="space-y-4 pb-24 text-slate-900 select-none">
      {/* Profile Header Card */}
      <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-4">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-full bg-white/20 p-1 backdrop-blur-xs flex-shrink-0">
            <img 
              src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${userName}&background=random`} 
              alt="Profile" 
              className="w-full h-full rounded-full object-cover" 
            />
          </div>
          <div>
            <h2 className="text-lg font-black">{userName} 님</h2>
            <div className="text-xs text-blue-200">{userTeam}</div>
            <div className="text-[11px] text-blue-300/80 mt-0.5">{userEmail}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-white/10 text-xs font-semibold relative z-10">
          <div className="flex-1 bg-white/10 p-2.5 rounded-xl text-center backdrop-blur-xs">
            <div className="text-[10px] text-blue-200">소속</div>
            <div className="font-bold text-white mt-0.5">{userTeam}</div>
          </div>
          <div className="flex-1 bg-white/10 p-2.5 rounded-xl text-center backdrop-blur-xs">
            <div className="text-[10px] text-blue-200">권한</div>
            <div className="font-bold text-white mt-0.5">SNS 기자단 단원</div>
          </div>
        </div>

        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-500/20 rounded-full blur-xl" />
      </div>

      {/* Quick Menu Links */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-1">
        <div className="text-xs font-extrabold text-slate-400 px-2 py-1">바로가기 메뉴</div>

        <a 
          href="https://ymcrental.vercel.app/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-800"
        >
          <div className="flex items-center gap-2.5">
            <span>🎥</span>
            <span>미디어센터 장비대여 시스템</span>
          </div>
          <span className="text-slate-400">›</span>
        </a>

        <a 
          href="https://www.youtube.com/@ysuniversity" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-800"
        >
          <div className="flex items-center gap-2.5">
            <span>▶️</span>
            <span>연세대학교 공식 유튜브</span>
          </div>
          <span className="text-slate-400">›</span>
        </a>

        <a 
          href="https://www.instagram.com/yonsei_official/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-800"
        >
          <div className="flex items-center gap-2.5">
            <span>📷</span>
            <span>연세대학교 공식 인스타그램</span>
          </div>
          <span className="text-slate-400">›</span>
        </a>
      </div>

      {/* Logout Action */}
      {onLogout && (
        <div className="pt-2">
          <button
            onClick={onLogout}
            className="w-full py-3 bg-red-50 text-red-600 font-bold text-xs rounded-2xl hover:bg-red-100 transition-colors"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
