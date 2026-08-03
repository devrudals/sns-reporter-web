'use client';

import React, { useState, useEffect } from 'react';
import ContentsLayout from './ContentsLayout';
import { useModal } from '@/contexts/ModalContext';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// ────────── Helper Types & Utilities ──────────

const getTypeStyle = (typeStr: string) => {
  switch(typeStr) {
    case '영상(롱폼)': return { bg: '#1E3A8A', text: '#ffffff', label: '▶ 롱폼' };
    case '영상(숏폼)': return { bg: '#2563EB', text: '#ffffff', label: '▶ 숏폼' };
    case '카드뉴스': return { bg: '#0284C7', text: '#ffffff', label: '📰 카드뉴스' };
    case '글 기사':
    case '기사': return { bg: '#16A34A', text: '#ffffff', label: '✍️ 글 기사' };
    default: return { bg: '#64748B', text: '#ffffff', label: typeStr || '📝 기타' };
  }
};

const getTeamPlatformIcon = (team: string) => {
  if (team === '유튜브') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#FEF2F2', color: '#DC2626', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800, border: '1px solid #FCA5A5' }}>
        <svg fill="#DC2626" viewBox="0 0 24 24" width="12" height="12"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
        유튜브
      </div>
    );
  }
  if (team === '인스타') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#FDF2F8', color: '#DB2777', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800, border: '1px solid #FBCFE8' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
        인스타
      </div>
    );
  }
  if (team === '블로그') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#F0FDF4', color: '#16A34A', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800, border: '1px solid #86EFAC' }}>
        <span style={{ fontSize: '11px', fontWeight: 900 }}>b</span>
        블로그
      </div>
    );
  }
  if (team === '단장 팀') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800, border: '1px solid #BFDBFE' }}>
        <span style={{ fontSize: '10px', fontWeight: 900 }}>Y</span>
        단장팀
      </div>
    );
  }
  return <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>{team || '팀없음'}</span>;
};

const formatDate = (isoString: string) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

// Helper for card trigger subtext
const getItemTriggerInfo = (item: any) => {
  let bodyObj: any = {};
  try { bodyObj = JSON.parse(item.content_body || '{}'); } catch {}

  const discussions: any[] = bodyObj.discussions || [];
  const lastComment = discussions.length > 0 ? discussions[discussions.length - 1] : null;

  if (item.status === 'pending') {
    if (discussions.length > 0 && lastComment?.role === 'writer') {
      return { text: `💬 새 댓글: "${lastComment.text}"`, bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
    }
    return { text: '🚀 최초 제출된 기획안', bg: '#FFF7ED', color: '#C2410C', border: '#FFEDD5' };
  }

  if (item.status === 'review_required') {
    if (lastComment?.role === 'writer') {
      return { text: `💬 단원 댓글: "${lastComment.text}"`, bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
    }
    return { text: '✏️ 단원이 내용 수정함 (재검토 요청)', bg: '#FFF7ED', color: '#C2410C', border: '#FFEDD5' };
  }

  if (item.status === 'revision') {
    if (lastComment?.role === 'admin') {
      return { text: `💬 피드백: "${lastComment.text}"`, bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' };
    }
    return { text: '✏️ 기획안 수정 대기 중', bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' };
  }

  if (item.status === 'approved') {
    return { text: '🎬 기획안 승인됨 (완성본 대기)', bg: '#EFF6FF', color: '#2563EB', border: '#DBEAFE' };
  }

  if (item.status === 'final_submitted') {
    return { text: '🎬 완성본 최초/재제출됨', bg: '#EEF2FF', color: '#4338CA', border: '#C7D2FE' };
  }

  if (item.status === 'final_revision') {
    if (lastComment?.role === 'admin') {
      return { text: `💬 완성본 피드백: "${lastComment.text}"`, bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' };
    }
    return { text: '🛠️ 완성본 수정 대기 중', bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' };
  }

  if (item.status === 'completed') {
    const desiredDate = bodyObj.desiredDate;
    return { text: desiredDate ? `📅 희망 업로드일: ${desiredDate}` : '🚀 완성본 승인 (업로드 예약 필요)', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' };
  }

  if (item.status === 'uploaded') {
    const uploadedDate = item.updated_at ? formatDate(item.updated_at) : '';
    return { text: `🎉 최종 업로드 완료 ${uploadedDate ? `(${uploadedDate})` : ''}`, bg: '#F1F5F9', color: '#334155', border: '#CBD5E1' };
  }

  if (item.status === 'rejected') {
    return { text: '🚫 반려된 콘텐츠', bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5' };
  }

  return { text: '상태 대기 중', bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' };
};

// ────────── Main Component ──────────

export default function AdminBoardClient({ contents: initialContents = [], allProfiles = [] }: { contents: any[]; allProfiles?: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  const { openContentModal } = useModal();

  const [contentsList, setContentsList] = useState<any[]>(initialContents);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showRejected, setShowRejected] = useState<boolean>(false);
  const [showOnly7DaysCompleted, setShowOnly7DaysCompleted] = useState<boolean>(true);
  const [showFullTable, setShowFullTable] = useState<boolean>(false);

  // Drag State
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Right Click Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: any } | null>(null);

  // Keep state synced with props
  useEffect(() => {
    setContentsList(initialContents);
  }, [initialContents]);

  // Close Context Menu on click anywhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Update Status Helper
  const updateStatus = async (item: any, newStatus: string) => {
    if (!item || item.status === newStatus) return;
    
    // Optimistic UI update
    setContentsList(prev => prev.map(c => c.id === item.id ? { ...c, status: newStatus, updated_at: new Date().toISOString() } : c));
    
    const { error } = await supabase
      .from('contents')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
      alert('상태 변경 실패: ' + error.message);
      setContentsList(initialContents);
    } else {
      router.refresh();
    }
  };

  // Helper for formatting author generation name
  const formatCrewName = (name: string) => {
    if (!name) return '';
    if (/^\d+기\s+/.test(name)) return name;
    if (/^\d+\s+/.test(name)) return name.replace(/^(\d+)\s+/, '$1기 ');
    const cleanName = name.replace(/^\d+(기)?\s+/, '');
    const profile = allProfiles.find(p => p.author_name === cleanName || p.author_name === name);
    if (profile && profile.keywords) {
      const kw = profile.keywords.toString().trim();
      const generation = kw.endsWith('기') ? kw : `${kw}기`;
      return `${generation} ${cleanName}`;
    }
    return cleanName;
  };

  // 🔍 Filter items
  const filteredContents = contentsList.filter(item => {
    if (!showRejected && item.status === 'rejected') return false;
    
    if (selectedTeam !== 'all') {
      if (!item.team || !item.team.includes(selectedTeam)) return false;
    }

    if (selectedType !== 'all') {
      if (item.content_type !== selectedType) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = item.title?.toLowerCase().includes(q);
      const authorMatch = item.author_name?.toLowerCase().includes(q);
      const teamMatch = item.team?.toLowerCase().includes(q);
      if (!titleMatch && !authorMatch && !teamMatch) return false;
    }

    return true;
  });

  // ────────── 5 Kanban Columns ──────────

  // 1. 검토 필요 (Active)
  const colReviewRequired = filteredContents.filter(c => ['pending', 'final_submitted', 'review_required'].includes(c.status));

  // 2. 수정 대기 (Passive)
  const colRevisionPending = filteredContents.filter(c => ['revision', 'final_revision'].includes(c.status));

  // 3. 완성본 대기 (Passive)
  const colAwaitingFinal = filteredContents.filter(c => c.status === 'approved');

  // 4. 업로드 필요 (Active)
  const colNeedsUpload = filteredContents.filter(c => c.status === 'completed');

  // 5. 완료 (최근 7일간) (Passive)
  const nowMs = Date.now();
  const colCompleted = filteredContents.filter(c => {
    if (c.status !== 'uploaded') return false;
    if (!showOnly7DaysCompleted) return true;
    const itemDate = new Date(c.updated_at || c.created_at).getTime();
    return (nowMs - itemDate) <= (7 * 24 * 60 * 60 * 1000);
  });

  // Rejected list
  const colRejected = filteredContents.filter(c => c.status === 'rejected');

  const KANBAN_COLUMNS = [
    {
      id: 'review_required',
      title: '검토 필요',
      badge: 'Active',
      badgeType: 'active',
      desc: '관리자의 즉시 검토 및 조치가 필요한 건 (최초/수정/댓글)',
      items: colReviewRequired,
      dropTargetStatus: 'pending',
      headerBg: '#FFF7ED',
      headerBorder: '#FFEDD5',
      headerColor: '#C2410C',
      pillBg: '#FFEDD5',
      pillColor: '#9A3412'
    },
    {
      id: 'revision_pending',
      title: '수정 대기',
      badge: 'Passive',
      badgeType: 'passive',
      desc: '피드백 작성 후 단원의 수정 제출을 대기하는 건',
      items: colRevisionPending,
      dropTargetStatus: 'revision',
      headerBg: '#FEF3C7',
      headerBorder: '#FDE68A',
      headerColor: '#B45309',
      pillBg: '#FDE68A',
      pillColor: '#78350F'
    },
    {
      id: 'awaiting_final',
      title: '완성본 대기',
      badge: 'Passive',
      badgeType: 'passive',
      desc: '기획안 승인 후 단원의 완성본 제출을 대기하는 건',
      items: colAwaitingFinal,
      dropTargetStatus: 'approved',
      headerBg: '#EFF6FF',
      headerBorder: '#DBEAFE',
      headerColor: '#1D4ED8',
      pillBg: '#DBEAFE',
      pillColor: '#1E40AF'
    },
    {
      id: 'needs_upload',
      title: '업로드 필요',
      badge: 'Active',
      badgeType: 'active',
      desc: '최종 승인 완료되어 채널 업로드 예약을 집행해야 하는 건',
      items: colNeedsUpload,
      dropTargetStatus: 'completed',
      headerBg: '#ECFDF5',
      headerBorder: '#A7F3D0',
      headerColor: '#047857',
      pillBg: '#A7F3D0',
      pillColor: '#065F46'
    },
    {
      id: 'completed',
      title: '완료 (최근 7일)',
      badge: 'Passive',
      badgeType: 'passive',
      desc: '최근 7일 이내 최종 업로드가 완료된 건',
      items: colCompleted,
      dropTargetStatus: 'uploaded',
      headerBg: '#F1F5F9',
      headerBorder: '#E2E8F0',
      headerColor: '#334155',
      pillBg: '#E2E8F0',
      pillColor: '#1E293B'
    }
  ];

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', id.toString());
    setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const idStr = e.dataTransfer.getData('text/plain');
    if (!idStr) return;
    const contentId = parseInt(idStr, 10);
    const item = contentsList.find(c => c.id === contentId);
    if (item) {
      updateStatus(item, targetStatus);
    }
  };

  // Card Renderer
  const renderKanbanCard = (item: any) => {
    let bodyObj: any = {};
    try { bodyObj = JSON.parse(item.content_body || '{}'); } catch {}
    
    const typeStyle = getTypeStyle(item.content_type);
    const triggerInfo = getItemTriggerInfo(item);

    const mainAuthor = item.author_name || '';
    let allCrew = [mainAuthor];
    if (bodyObj.crew && typeof bodyObj.crew === 'string') {
      allCrew = bodyObj.crew.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    const mainAuthorNameOnly = mainAuthor ? mainAuthor.replace(/^\d+(기)?\s+/, '') : '';
    const others = allCrew.filter(c => {
      const cClean = c.replace(/^\d+(기)?\s+/, '');
      return cClean !== mainAuthorNameOnly && !mainAuthorNameOnly.includes(cClean);
    });

    const articleType = bodyObj.articleType || '개인기사';

    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, item.id)}
        onClick={() => openContentModal(item.id.toString())}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY, item });
        }}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '14px 16px',
          marginBottom: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          border: '1px solid #E2E8F0',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          userSelect: 'none'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.08)';
          e.currentTarget.style.borderColor = '#CBD5E1';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
          e.currentTarget.style.borderColor = '#E2E8F0';
        }}
      >
        {/* Top badges: Type & Team */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ backgroundColor: typeStyle.bg, color: typeStyle.text, padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 }}>
            {typeStyle.label}
          </span>
          {getTeamPlatformIcon(item.team)}
        </div>

        {/* Title */}
        <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#0F172A', fontWeight: 800, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.title}
        </h4>

        {/* Category & Authors */}
        <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, color: '#334155', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
            {articleType}
          </span>
          <span style={{ color: '#64748B' }}>•</span>
          <span style={{ fontWeight: 700 }}>
            {formatCrewName(mainAuthor)}{others.length > 0 ? `, ${others.map(formatCrewName).join(', ')}` : ''}
          </span>
        </div>

        {/* Dynamic Trigger Subtext Box */}
        <div style={{
          backgroundColor: triggerInfo.bg,
          color: triggerInfo.color,
          border: `1px solid ${triggerInfo.border}`,
          borderRadius: '8px',
          padding: '6px 10px',
          fontSize: '0.73rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {triggerInfo.text}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Page Header & Controls ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '20px 24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
              📌 콘텐츠 현황 관리 (칸반보드)
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '0.85rem', fontWeight: 600 }}>
              관리자 액션 중심의 5단계 칸반보드입니다. 마우스 드래그 앤 드롭 또는 우클릭으로 진행 상태를 즉시 변경할 수 있습니다.
            </p>
          </div>

          {/* Quick Stats Summary */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ backgroundColor: '#FFF7ED', border: '1px solid #FFEDD5', color: '#C2410C', padding: '6px 14px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800 }}>
              ⚡ 검토 필요: {colReviewRequired.length}건
            </div>
            <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', padding: '6px 14px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800 }}>
              🚀 업로드 필요: {colNeedsUpload.length}건
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              placeholder="제목, 작성자, 팀명 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                backgroundColor: '#F8FAFC'
              }}
            />
            <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>

          {/* Team Filter */}
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.82rem', fontWeight: 700, backgroundColor: '#ffffff', color: '#334155', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">🌐 전체 팀</option>
            <option value="블로그">📝 블로그</option>
            <option value="인스타">📸 인스타</option>
            <option value="유튜브">▶️ 유튜브</option>
            <option value="단장 팀">👑 단장 팀</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.82rem', fontWeight: 700, backgroundColor: '#ffffff', color: '#334155', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">📂 전체 유형</option>
            <option value="영상(롱폼)">▶ 롱폼</option>
            <option value="영상(숏폼)">▶ 숏폼</option>
            <option value="카드뉴스">📰 카드뉴스</option>
            <option value="글 기사">✍️ 글 기사</option>
          </select>

          {/* Toggles */}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={showOnly7DaysCompleted}
              onChange={(e) => setShowOnly7DaysCompleted(e.target.checked)}
              style={{ accentColor: '#003378' }}
            />
            완료란 최근 7일만 표기
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#EF4444', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={showRejected}
              onChange={(e) => setShowRejected(e.target.checked)}
              style={{ accentColor: '#EF4444' }}
            />
            반려된 항목 포함 ({colRejected.length})
          </label>

          {/* View Toggle */}
          <button
            onClick={() => setShowFullTable(!showFullTable)}
            style={{
              padding: '7px 14px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              backgroundColor: showFullTable ? '#003378' : '#F1F5F9',
              color: showFullTable ? '#ffffff' : '#334155',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            {showFullTable ? '📋 테이블 숨기기' : '📋 테이블 전체보기'}
          </button>
        </div>
      </div>

      {/* ── 5-COLUMN KANBAN BOARD ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(280px, 1fr))',
        gap: '16px',
        overflowX: 'auto',
        paddingBottom: '12px'
      }}>
        {KANBAN_COLUMNS.map(col => {
          const isOver = dragOverColumn === col.id;
          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.dropTargetStatus)}
              style={{
                backgroundColor: isOver ? '#F0F9FF' : '#F8FAFC',
                borderRadius: '20px',
                padding: '16px 14px',
                border: isOver ? '2px dashed #2563EB' : '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '650px',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Column Header */}
              <div style={{
                backgroundColor: col.headerBg,
                border: `1px solid ${col.headerBorder}`,
                borderRadius: '14px',
                padding: '12px 14px',
                marginBottom: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.98rem', fontWeight: 900, color: col.headerColor }}>
                      {col.title}
                    </span>
                    <span style={{
                      backgroundColor: col.headerColor,
                      color: 'white',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 900
                    }}>
                      {col.items.length}
                    </span>
                  </div>

                  {/* Active / Passive Badge */}
                  <span style={{
                    backgroundColor: col.pillBg,
                    color: col.pillColor,
                    borderRadius: '8px',
                    padding: '2px 7px',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}>
                    {col.badge}
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, lineHeight: 1.3 }}>
                  {col.desc}
                </span>
              </div>

              {/* Cards Container */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {col.items.length === 0 ? (
                  <div style={{
                    border: '2px dashed #E2E8F0',
                    borderRadius: '14px',
                    padding: '36px 12px',
                    textAlign: 'center',
                    color: '#94A3B8',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    backgroundColor: '#ffffff'
                  }}>
                    해당 항목 없음
                  </div>
                ) : (
                  col.items.map(item => renderKanbanCard(item))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Optional Rejected Items Section */}
      {showRejected && colRejected.length > 0 && (
        <div style={{
          backgroundColor: '#FEF2F2',
          borderRadius: '20px',
          padding: '20px',
          border: '1px solid #FCA5A5'
        }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', fontWeight: 900, color: '#DC2626' }}>
            🚫 반려된 콘텐츠 목록 ({colRejected.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {colRejected.map(item => renderKanbanCard(item))}
          </div>
        </div>
      )}

      {/* ── OPTIONAL FULL CONTENT TABLE ── */}
      {showFullTable && (
        <div style={{ backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)', border: '1px solid #E2E8F0' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', fontWeight: 900, fontSize: '1rem', color: '#0F172A' }}>
            📋 전체 콘텐츠 테이블 목록
          </div>
          <div style={{ display: 'flex', padding: '12px 16px', backgroundColor: '#f8fafc', borderBottom: '2px solid #E6EBF2', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', gap: '10px' }}>
            <div style={{ width: '80px' }}>유형</div>
            <div style={{ flex: 2 }}>제목</div>
            <div style={{ flex: 1 }}>팀 / 플랫폼</div>
            <div style={{ flex: 1 }}>작성자</div>
            <div style={{ width: '120px', textAlign: 'center' }}>상태</div>
          </div>
          <div>
            {filteredContents.map(item => (
              <div
                key={item.id}
                onClick={() => openContentModal(item.id.toString())}
                style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', gap: '10px', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                <div style={{ width: '80px', fontWeight: 700 }}>{item.content_type}</div>
                <div style={{ flex: 2, fontWeight: 700, color: '#0F172A' }}>{item.title}</div>
                <div style={{ flex: 1 }}>{getTeamPlatformIcon(item.team)}</div>
                <div style={{ flex: 1, color: '#475569', fontWeight: 600 }}>{formatCrewName(item.author_name)}</div>
                <div style={{ width: '120px', textAlign: 'center', fontWeight: 800, color: '#1E40AF' }}>{item.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RIGHT-CLICK CONTEXT MENU ── */}
      {contextMenu && (
        <div style={{
          position: 'fixed',
          top: contextMenu.y,
          left: contextMenu.x,
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
          border: '1px solid #E2E8F0',
          padding: '6px',
          zIndex: 9999,
          minWidth: '190px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}>
          <div style={{ padding: '6px 10px', fontSize: '0.72rem', fontWeight: 900, color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }}>
            ⚡ 상태 이관 및 조치
          </div>

          <button
            onClick={() => openContentModal(contextMenu.item.id.toString())}
            style={{ textAlign: 'left', padding: '8px 10px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#0F172A' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🔍 상세보기 및 피드백 작성
          </button>

          <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '2px 0' }}></div>

          <button
            onClick={() => updateStatus(contextMenu.item, 'pending')}
            style={{ textAlign: 'left', padding: '8px 10px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#C2410C' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FFF7ED'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ⚡ [검토 필요]로 이관
          </button>

          <button
            onClick={() => updateStatus(contextMenu.item, 'revision')}
            style={{ textAlign: 'left', padding: '8px 10px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#B45309' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEF3C7'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ✏️ [수정 대기]로 이관
          </button>

          <button
            onClick={() => updateStatus(contextMenu.item, 'approved')}
            style={{ textAlign: 'left', padding: '8px 10px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#1D4ED8' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EFF6FF'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🎬 [완성본 대기]로 이관
          </button>

          <button
            onClick={() => updateStatus(contextMenu.item, 'completed')}
            style={{ textAlign: 'left', padding: '8px 10px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#047857' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ECFDF5'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🚀 [업로드 필요]로 이관
          </button>

          <button
            onClick={() => updateStatus(contextMenu.item, 'uploaded')}
            style={{ textAlign: 'left', padding: '8px 10px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🎉 [최종 완료] 처리
          </button>

          <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '2px 0' }}></div>

          <button
            onClick={() => updateStatus(contextMenu.item, 'rejected')}
            style={{ textAlign: 'left', padding: '8px 10px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#DC2626' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEF2F2'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🚫 [반려] 처리
          </button>
        </div>
      )}

      {/* Modal Integration */}
      {selectedItem && (
        <ContentsLayout
          modalOnly={true}
          openModalId={selectedItem.id}
          onModalClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
