'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface ProposalItem {
  id: string;
  author_name: string;
  generation: string;
  role: string;
  title: string;
  hashtags: string[];
  intent: string;
  body: string;
  likes: number;
  commentsCount: number;
  avatarUrl: string;
}

const DEFAULT_PROPOSALS: ProposalItem[] = [
  {
    id: 'prop-1',
    author_name: '현나리',
    generation: '21기',
    role: '인스타 팀장',
    title: '3D 프린팅, 나도 할 수 있다! 동아리 Y-TOOLS를 소개합니다',
    hashtags: ['동아리', '3D프린팅', '3D모델링', '연세대학교'],
    intent: '매주 송도에서 활발하게 활동하고 있는 메이킹 동아리 Y-TOOLS와, 연세대 재학생이라면 누릴 수 있는 메이커스페이스 i7의 존재를 알리고자 합니다.',
    body: "보통 동아리라고 하면 신촌에서 활동할 것을 예상하나, 매주 송도에서 활발하게 활동하고 있는 동아리가 존재한다는 것을 알리고자 합니다. 또한 메이킹 동아리인만큼 3D 프린팅, UV 프린팅, 레이저 커팅, 도색 등의 기회를 연세대 재학생으로서 누릴 수 있는 '메이커스페이스 i7'라는 이색 장소의 존재도 함께 리마인드할 수 있을 것으로 예상됩니다.",
    likes: 12,
    commentsCount: 3,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100'
  },
  {
    id: 'prop-2',
    author_name: '김서연',
    generation: '23기',
    role: '유튜브 크리에이터',
    title: '신촌 숨은 맛집 투어! 연대생이 보장하는 가성비 맛집 5선',
    hashtags: ['신촌맛집', '가성비맛집', '연세대', '대학생활'],
    intent: '과도한 물가 상승 속에서 신촌 근처의 저렴하고 든든한 로컬 맛집 리스트를 공개하여, 새내기 및 재학생들의 식비 부담을 줄이고자 합니다.',
    body: "정문 기준 도보 이동 거리와 함께 생생한 추천 메뉴 및 솔직 후기를 영상 형식의 기획안으로 구성했습니다. 새내기들이나 송도에서 방금 신촌으로 올라온 2학년들이 쉽게 찾아갈 수 있도록 지도와 함께 제공합니다.",
    likes: 24,
    commentsCount: 8,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100&h=100'
  },
  {
    id: 'prop-3',
    author_name: '안재원',
    generation: '24기',
    role: '블로그 에디터',
    title: '연세대학교 공학관 속 숨겨진 휴식 및 명당 스팟 zip',
    hashtags: ['공학관', '캠퍼스명당', '꿀팁', '대학생활'],
    intent: '공학관은 복잡하고 삭막하다는 편견을 깨고, 학생들이 공강 시간에 활용할 수 있는 숨은 아늑한 장소들을 소개하고자 합니다.',
    body: "각 층별 콘센트 유무, 뷰가 좋은 야외 테라스 위치, 조용한 세미나룸 예약 방법까지 디테일하게 수록하여 학생 편의를 극대화하고자 기획했습니다.",
    likes: 18,
    commentsCount: 5,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100'
  }
];

export default function OtherProposalsCarousel({ dbProposals = [] }: { dbProposals?: any[] }) {
  // Convert DB proposals to ProposalItem format if any exist
  const formattedDbProposals: ProposalItem[] = dbProposals
    .filter(p => p.status === 'approved' || p.status === 'final_submitted')
    .map((p, idx) => {
      let hashtags: string[] = ['연세대학교'];
      let bodyText = p.content_body || '기획안 본문 요약 내용이 없습니다.';
      let intentText = '';
      if (bodyText.startsWith('{')) {
        try {
          const pb = JSON.parse(bodyText);
          intentText = (pb.intent || '').replace(/<[^>]*>/g, '').trim();
          bodyText = (pb.contentBody || pb.composition || pb.summary || pb.description || pb.goal || p.title || '').replace(/<[^>]*>/g, '').trim();
          if (pb.keywords) {
            hashtags = typeof pb.keywords === 'string' 
              ? pb.keywords.split(',').map((k: string) => k.trim())
              : Array.isArray(pb.keywords) ? pb.keywords : hashtags;
          }
        } catch {}
      }
      
      // Clean HTML tags from bodyText if any
      bodyText = bodyText.replace(/<[^>]*>/g, '').trim();

      return {
        id: p.id,
        author_name: p.author_name || '기자',
        generation: p.keywords ? `${p.keywords}기` : '기자단',
        role: p.team ? `${p.team} 팀원` : '기자',
        title: p.title,
        hashtags: hashtags.filter(Boolean),
        intent: intentText || '기획 의도가 등록되지 않았습니다.',
        body: bodyText,
        likes: Math.floor(Math.random() * 15) + 3,
        commentsCount: Math.floor(Math.random() * 5) + 1,
        avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + idx}?auto=format&fit=crop&q=80&w=100&h=100` // fallback avatar
      };
    });

  const proposals = formattedDbProposals.length > 0 ? formattedDbProposals : DEFAULT_PROPOSALS;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  const currentItem = proposals[currentIndex] || DEFAULT_PROPOSALS[0];

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? proposals.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev === proposals.length - 1 ? 0 : prev + 1));
  };

  const toggleLike = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setLikedMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const isLiked = !!likedMap[currentItem.id];
  const displayLikes = currentItem.likes + (isLiked ? 1 : 0);

  return (
    <div className="card" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1rem', 
      padding: '1.5rem',
      borderRadius: '24px',
      overflow: 'hidden',
      height: '320px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
      border: '1px solid #E2E8F0',
      background: '#FFFFFF',
      position: 'relative'
    }}>
      {/* Top Header: Title & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <h3 style={{ fontWeight: 850, fontSize: '1.1rem', color: '#1E293B', margin: 0 }}>다른 사람들의 기획안</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 700 }}>
            {currentIndex + 1} / {proposals.length}
          </span>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button 
              onClick={handlePrev}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: '#F1F5F9',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#475569',
                transition: 'all 0.2s ease',
              }}
              className="hover-scale"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <button 
              onClick={handleNext}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: '#F1F5F9',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#475569',
                transition: 'all 0.2s ease',
              }}
              className="hover-scale"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Divider line */}
      <div style={{ height: '1px', backgroundColor: '#F1F5F9', width: '100%', margin: '-0.25rem 0 0.25rem 0' }} />

      {/* Profile and Details Container - 2-column layout */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '1.25rem',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Left Column: Author, Title, Hashtags, Actions */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          flex: '0 0 38%',
          overflow: 'hidden'
        }}>
          {/* Author Profile & Click-through link */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <img 
                src={currentItem.avatarUrl} 
                alt={currentItem.author_name}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1.5px solid #E2E8F0'
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E293B' }}>
                  {currentItem.generation} {currentItem.author_name}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                  {currentItem.role}
                </span>
              </div>
            </div>
            <Link href={`/proposals/submit?id=${currentItem.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.2s' }} className="hover-stroke">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </Link>
          </div>

          {/* Title & Hashtags */}
          <div style={{ margin: '0.5rem 0 0.35rem 0', overflow: 'hidden' }}>
            <h4 style={{
              fontSize: '0.95rem',
              fontWeight: 800,
              color: '#0F172A',
              lineHeight: '1.35',
              marginBottom: '0.3rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
              {currentItem.title}
            </h4>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {currentItem.hashtags.map((tag, idx) => (
                <span key={idx} style={{
                  fontSize: '0.68rem',
                  color: '#64748B',
                  fontWeight: 600,
                  backgroundColor: '#F1F5F9',
                  padding: '2px 7px',
                  borderRadius: '5px'
                }}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Interactive Liked & Comment Badges */}
          <div style={{ display: 'flex', gap: '0.65rem', marginTop: 'auto' }}>
            <button 
              onClick={(e) => toggleLike(e, currentItem.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '5px 12px',
                borderRadius: '999px',
                border: isLiked ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                backgroundColor: isLiked ? '#EFF6FF' : '#FFFFFF',
                color: isLiked ? '#2563EB' : '#64748B',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
              className="hover-scale"
            >
              <svg 
                width="13" height="13" viewBox="0 0 24 24" 
                fill={isLiked ? 'currentColor' : 'none'} 
                stroke="currentColor" strokeWidth="2.5" 
                strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
              <span>추천 {displayLikes}</span>
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '5px 12px',
              borderRadius: '999px',
              backgroundColor: '#E6EBF2',
              color: '#003378',
              fontSize: '0.75rem',
              fontWeight: 850,
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>{currentItem.commentsCount}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Intent + Body Text */}
        <div style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          borderLeft: '2px solid #F1F5F9',
          paddingLeft: '1.1rem',
          overflow: 'hidden',
          gap: '0.7rem'
        }}>
          {/* 기획 의도 */}
          <div>
            <div style={{ 
              fontSize: '0.68rem', 
              fontWeight: 800, 
              color: '#003378', 
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{ 
                display: 'inline-block', 
                width: '3px', 
                height: '12px', 
                backgroundColor: '#003378', 
                borderRadius: '2px' 
              }} />
              기획 의도
            </div>
            <p style={{
              fontSize: '0.78rem',
              color: '#334155',
              lineHeight: '1.55',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              fontWeight: 600,
              wordBreak: 'keep-all'
            }}>
              {currentItem.intent}
            </p>
          </div>

          {/* 내용 */}
          <div>
            <div style={{ 
              fontSize: '0.68rem', 
              fontWeight: 800, 
              color: '#64748B', 
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{ 
                display: 'inline-block', 
                width: '3px', 
                height: '12px', 
                backgroundColor: '#94A3B8', 
                borderRadius: '2px' 
              }} />
              내용
            </div>
            <p style={{
              fontSize: '0.78rem',
              color: '#475569',
              lineHeight: '1.55',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              fontWeight: 500,
              wordBreak: 'keep-all'
            }}>
              {currentItem.body}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
