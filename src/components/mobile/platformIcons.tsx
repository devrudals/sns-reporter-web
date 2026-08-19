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

// 캘린더 그리드의 플랫폼별 이벤트 막대 색(유튜브 레드/인스타그램 오렌지 #FCAF45/
// 네이버 그린)과 아이콘 자체의 색을 통일해달라는 요청으로, 그라디언트 대신 같은
// 오렌지 단색(#FCAF45, 인스타그램 공식 그라디언트에도 쓰이는 톤)을 쓴다 — 유튜브의
// 빨강과는 색상환에서 뚜렷이 떨어져 있어 목록에서 구분하기 쉽다.
export const InstagramIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <rect x="1" y="1" width="22" height="22" rx="6" fill="#FCAF45" />
    <rect x="6.3" y="6.3" width="11.4" height="11.4" rx="3.6" fill="none" stroke="white" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="3.1" fill="none" stroke="white" strokeWidth="1.8" />
    <circle cx="16.4" cy="7.6" r="1.05" fill="white" />
  </svg>
);

// 네이버(포털) "N" 로고가 아니라 네이버블로그 자체의 로고(초록 필기체 소문자 "b")로
// 교체 — 사용자가 실제 로고 이미지를 보내줘서 그 모양(세로 기둥이 둥근 볼로 이어지는
// 굵은 손글씨체 b)에 맞춰 다시 그렸다. 다른 두 아이콘과 같은 "색 배지 + 흰색 심볼"
// 틀은 유지하되(아이콘 세트 전체의 통일감), 심볼 자체를 정확한 로고 형태로 바꿨다.
export const NaverBlogIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <rect x="1" y="1" width="22" height="22" rx="6" fill="#03C75A" />
    <rect x="6.4" y="4.6" width="3.3" height="13.4" rx="1.65" fill="white" />
    <circle cx="13.4" cy="14.6" r="4.35" fill="none" stroke="white" strokeWidth="3.1" />
  </svg>
);

export const GenericPostIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h13l3 3v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
    <path d="M8 12h8M8 16h5" />
  </svg>
);
