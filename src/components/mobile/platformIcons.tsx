'use client';

import React from 'react';

// 콘텐츠 카드의 플랫폼 로고 3종 — 이전엔 🎬(영상)/📸(카드뉴스·인스타)/✍️(글·블로그)
// 이모지로 콘텐츠 유형을 추정해서 보여줬는데, 실제 플랫폼(유튜브/인스타그램/네이버
// 블로그) 로고로 교체해달라는 요청 반영. 이모지 없이 텍스트로만 판단하던 기존
// 분류 로직(content_type 문자열 포함 여부)은 그대로 두고, 반환값만 아이콘
// 컴포넌트로 바꿨다.
export const YoutubeIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <rect x="1" y="4" width="22" height="16" rx="5" fill="#FF0000" />
    <path d="M10 8.3v7.4l6.4-3.7z" fill="white" />
  </svg>
);

export const InstagramIcon = ({ className = 'w-4 h-4' }: { className?: string }) => {
  const gradientId = React.useId();
  return (
    <svg className={className} viewBox="0 0 24 24">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDD55" />
          <stop offset="30%" stopColor="#FF543E" />
          <stop offset="60%" stopColor="#C837AB" />
          <stop offset="100%" stopColor="#5851DB" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6" fill={`url(#${gradientId})`} />
      <rect x="6.3" y="6.3" width="11.4" height="11.4" rx="3.6" fill="none" stroke="white" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.1" fill="none" stroke="white" strokeWidth="1.8" />
      <circle cx="16.4" cy="7.6" r="1.05" fill="white" />
    </svg>
  );
};

export const NaverBlogIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <rect x="1" y="1" width="22" height="22" rx="5" fill="#03C75A" />
    <path d="M7 6h3.3l3.9 5.7V6H17.5v12h-3.3l-3.9-5.7V18H7z" fill="white" />
  </svg>
);

export const GenericPostIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h13l3 3v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
    <path d="M8 12h8M8 16h5" />
  </svg>
);
