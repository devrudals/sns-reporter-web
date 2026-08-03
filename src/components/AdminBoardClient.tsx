'use client';

import React, { useState, useEffect } from 'react';
import ContentsLayout from './ContentsLayout';
import DashboardCalendarArea from './DashboardCalendarArea';
import { useModal } from '@/contexts/ModalContext';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// ────────── Helper Types & Utilities ──────────

const getTypeStyle = (typeStr: string) => {
  switch(typeStr) {
    case '영상(롱폼)': return { bg: '#EFF6FF', text: '#1D4ED8', label: '▶ 롱폼' };
    case '영상(숏폼)': return { bg: '#EEF2FF', text: '#4338CA', label: '▶ 숏폼' };
    case '카드뉴스': return { bg: '#F0F9FF', text: '#0369A1', label: '📰 카드뉴스' };
    case '글 기사':
    case '기사': return { bg: '#F0FDF4', text: '#15803D', label: '✍️ 글 기사' };
    default: return { bg: '#F1F5F9', text: '#475569', label: typeStr || '📝 기타' };
  }
};

const getTeamPlatformBadge = (team: string) => {
  if (team === '유튜브') {
    return (
      <span style={{ backgroundColor: '#FEF2F2', color: '#DC2626', padding: '2px 7px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
        <svg fill="#DC2626" viewBox="0 0 24 24" width="10" height="10"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
        유튜브
      </span>
    );
  }
  if (team === '인스타') {
    return (
      <span style={{ backgroundColor: '#FDF2F8', color: '#DB2777', padding: '2px 7px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
        인스타
      </span>
    );
  }
  if (team === '블로그') {
    return (
      <span style={{ backgroundColor: '#F0FDF4', color: '#16A34A', padding: '2px 7px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
        <span style={{ fontSize: '10px', fontWeight: 900 }}>b</span>
        블로그
      </span>
    );
  }
  if (team === '단장 팀') {
    return (
      <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '2px 7px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
        <span style={{ fontSize: '10px', fontWeight: 900 }}>Y</span>
        단장팀
      </span>
    );
  }
  return <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>{team || '팀없음'}</span>;
};

const formatDate = (isoString: string) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

// Clean Helper for card trigger subtext
const getItemTriggerInfo = (item: any) => {
  let bodyObj: any = {};
  try { bodyObj = JSON.parse(item.content_body || '{}'); } catch {}

  const discussions: any[] = bodyObj.discussions || [];
  const lastComment = discussions.length > 0 ? discussions[discussions.length - 1] : null;

  if (item.status === 'pending') {
    if (discussions.length > 0 && lastComment?.role === 'writer') {
      return { text: `💬 새 댓글: "${lastComment.text}"`, bg: '#EFF6FF', color: '#1E40AF' };
    }
    return { text: '🚀 최초 제출된 기획안', bg: '#FFF7ED', color: '#C2410C' };
  }

  if (item.status === 'review_required') {
    if (lastComment?.role === 'writer') {
      return { text: `💬 단원 댓글: "${lastComment.text}"`, bg: '#EFF6FF', color: '#1E40AF' };
    }
    return { text: '✏️ 단원이 내용 수정함 (재검토 요청)', bg: '#FFF7ED', color: '#C2410C' };
  }

  if (item.status === 'revision') {
    if (lastComment?.role === 'admin') {
      return { text: `💬 피드백: "${lastComment.text}"`, bg: '#F8FAFC', color: '#475569' };
    }
    return { text: '✏️ 기획안 수정 대기 중', bg: '#FEF3C7', color: '#92400E' };
  }

  if (item.status === 'approved') {
    return { text: '🎬 기획안 승인됨 (완성본 대기)', bg: '#EFF6FF', color: '#1D4ED8' };
  }

  if (item.status === 'final_submitted') {
    return { text: '🎬 완성본 최초/재제출됨', bg: '#EEF2FF', color: '#3730A3' };
  }

  if (item.status === 'final_revision') {
    if (lastComment?.role === 'admin') {
      return { text: `💬 완성본 피드백: "${lastComment.text}"`, bg: '#F8FAFC', color: '#475569' };
    }
    return { text: '🛠️ 완성본 수정 대기 중', bg: '#FEF3C7', color: '#92400E' };
  }

  if (item.status === 'completed') {
    const desiredDate = bodyObj.desiredDate;
    return { text: desiredDate ? `📅 희망 업로드일: ${desiredDate}` : '🚀 완성본 승인 (업로드 예약 필요)', bg: '#ECFDF5', color: '#065F46' };
  }

  if (item.status === 'uploaded') {
    const uploadedDate = item.updated_at ? formatDate(item.updated_at) : '';
    return { text: `🎉 업로드 완료 ${uploadedDate ? `(${uploadedDate})` : ''}`, bg: '#F1F5F9', color: '#334155' };
  }

  if (item.status === 'rejected') {
    return { text: '🚫 반려된 콘텐츠', bg: '#FEF2F2', color: '#991B1B' };
  }

  return { text: '상태 대기 중', bg: '#F1F5F9', color: '#64748B' };
};

// Clean author format helper (removing department parentheses to prevent line clutter!)
const formatCleanCrewName = (name: string) => {
  if (!name) return '';
  // Clean department in parentheses like "(경영대학 경영학과)" -> ""
  const cleanName = name.replace(/\([^)]*\)/g, '').trim();
  return cleanName;
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

  useEffect(() => {
    setContentsList(initialContents);
  }, [initialContents]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Update Status Helper
  const updateStatus = async (item: any, newStatus: string) => {
    if (!item || item.status === newStatus) return;
    
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

  const formatCrewWithGeneration = (name: string) => {
    if (!name) return '';
    const clean = formatCleanCrewName(name);
    if (/^\d+기\s+/.test(clean)) return clean;
    if (/^\d+\s+/.test(clean)) return clean.replace(/^(\d+)\s+/, '$1기 ');
    const pureName = clean.replace(/^\d+(기)?\s+/, '');
    const profile = allProfiles.find(p => p.author_name === pureName || p.author_name === clean);
    if (profile && profile.keywords) {
      const kw = profile.keywords.toString().trim();
      const generation = kw.endsWith('기') ? kw : `${kw}기`;
      return `${generation} ${pureName}`;
    }
    return pureName;
  };

  // Filter contents
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

  // 5 Columns
  const colReviewRequired = filteredContents.filter(c => ['pending', 'final_submitted', 'review_required'].includes(c.status));
  const colRevisionPending = filteredContents.filter(c => ['revision', 'final_revision'].includes(c.status));
  const colAwaitingFinal = filteredContents.filter(c => c.status === 'approved');
  const colNeedsUpload = filteredContents.filter(c => c.status === 'completed');

  const nowMs = Date.now();
  const colCompleted = filteredContents.filter(c => {
    if (c.status !== 'uploaded') return false;
    if (!showOnly7DaysCompleted) return true;
    const itemDate = new Date(c.updated_at || c.created_at).getTime();
    return (nowMs - itemDate) <= (7 * 24 * 60 * 60 * 1000);
  });

  const colRejected = filteredContents.filter(c => c.status === 'rejected');

  const KANBAN_COLUMNS = [
    {
      id: 'review_required',
      title: '검토 필요',
      count: colReviewRequired.length,
      badge: 'ACTIVE',
      accentColor: '#F97316', // Orange
      items: colReviewRequired,
      dropTargetStatus: 'pending'
    },
    {
      id: 'revision_pending',
      title: '수정 대기',
      count: colRevisionPending.length,
      badge: 'PASSIVE',
      accentColor: '#EAB308', // Amber
      items: colRevisionPending,
      dropTargetStatus: 'revision'
    },
    {
      id: 'awaiting_final',
      title: '완성본 대기',
      count: colAwaitingFinal.length,
      badge: 'PASSIVE',
      accentColor: '#3B82F6', // Blue
      items: colAwaitingFinal,
      dropTargetStatus: 'approved'
    },
    {
      id: 'needs_upload',
      title: '업로드 필요',
      count: colNeedsUpload.length,
      badge: 'ACTIVE',
      accentColor: '#10B981', // Emerald
      items: colNeedsUpload,
      dropTargetStatus: 'completed'
    },
    {
      id: 'completed',
      title: '완료 (최근 7일)',
      count: colCompleted.length,
      badge: 'PASSIVE',
      accentColor: '#64748B', // Slate
      items: colCompleted,
      dropTargetStatus: 'uploaded'
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
    const mainAuthorNameOnly = formatCleanCrewName(mainAuthor).replace(/^\d+(기)?\s+/, '');
    const others = allCrew.filter(c => {
      const cClean = formatCleanCrewName(c).replace(/^\d+(기)?\s+/, '');
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
          borderRadius: '12px',
          padding: '12px 14px',
          marginBottom: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          border: '1px solid #E2E8F0',
          cursor: 'pointer',
          transition: 'all 0.15s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          userSelect: 'none'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)';
          e.currentTarget.style.borderColor = '#CBD5E1';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
          e.currentTarget.style.borderColor = '#E2E8F0';
        }}
      >
        {/* Top Badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <span style={{ backgroundColor: typeStyle.bg, color: typeStyle.text, padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
            {typeStyle.label}
          </span>
          {getTeamPlatformBadge(item.team)}
        </div>

        {/* Title */}
        <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#0F172A', fontWeight: 800, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.title}
        </h4>

        {/* Category & Clean Author formatting */}
        <div style={{ fontSize: '0.74rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: 800, color: '#334155', backgroundColor: '#F1F5F9', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
            {articleType}
          </span>
          <span>•</span>
          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {formatCrewWithGeneration(mainAuthor)}{others.length > 0 ? `, ${others.map(formatCrewWithGeneration).join(', ')}` : ''}
          </span>
        </div>

        {/* Subtle Status Pill */}
        <div style={{
          backgroundColor: triggerInfo.bg,
          color: triggerInfo.color,
          borderRadius: '6px',
          padding: '5px 8px',
          fontSize: '0.72rem',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ── Sleek Single-Row Top Control Bar ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '14px 20px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Left: Title & Quick Summary Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
            📌 콘텐츠 현황 관리
          </h2>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ backgroundColor: '#FFF7ED', color: '#C2410C', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
              ⚡ 검토 필요 {colReviewRequired.length}건
            </span>
            <span style={{ backgroundColor: '#ECFDF5', color: '#047857', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
              🚀 업로드 필요 {colNeedsUpload.length}건
            </span>
          </div>
        </div>

        {/* Right: Search & Filters Toolbar (1 Clean Row) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '200px' }}>
            <input
              type="text"
              placeholder="제목, 작성자 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.8rem',
                fontWeight: 600,
                outline: 'none',
                backgroundColor: '#F8FAFC'
              }}
            />
            <svg style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>

          {/* Team Filter */}
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#ffffff', color: '#334155', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">전체 팀</option>
            <option value="블로그">블로그</option>
            <option value="인스타">인스타</option>
            <option value="유튜브">유튜브</option>
            <option value="단장 팀">단장 팀</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#ffffff', color: '#334155', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">전체 유형</option>
            <option value="영상(롱폼)">롱폼</option>
            <option value="영상(숏폼)">숏폼</option>
            <option value="카드뉴스">카드뉴스</option>
            <option value="글 기사">글 기사</option>
          </select>

          {/* Toggles */}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={showOnly7DaysCompleted}
              onChange={(e) => setShowOnly7DaysCompleted(e.target.checked)}
              style={{ accentColor: '#003378' }}
            />
            최근 7일만
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#EF4444', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={showRejected}
              onChange={(e) => setShowRejected(e.target.checked)}
              style={{ accentColor: '#EF4444' }}
            />
            반려 포함 ({colRejected.length})
          </label>

          {/* View Toggle */}
          <button
            onClick={() => setShowFullTable(!showFullTable)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: showFullTable ? '#003378' : '#F1F5F9',
              color: showFullTable ? '#ffffff' : '#334155',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            {showFullTable ? '테이블 닫기' : '테이블 보기'}
          </button>
        </div>
      </div>

      {/* ── 5-COLUMN KANBAN BOARD ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(260px, 1fr))',
        gap: '12px',
        overflowX: 'auto',
        paddingBottom: '8px'
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
                borderRadius: '16px',
                padding: '12px 10px',
                border: isOver ? '2px dashed #2563EB' : '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '620px',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Clean Minimal Column Header */}
              <div style={{
                backgroundColor: '#ffffff',
                borderTop: `4px solid ${col.accentColor}`,
                borderRadius: '10px',
                padding: '10px 12px',
                marginBottom: '12px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0F172A' }}>
                    {col.title}
                  </span>
                  <span style={{
                    backgroundColor: col.accentColor,
                    color: 'white',
                    borderRadius: '10px',
                    padding: '1px 7px',
                    fontSize: '0.72rem',
                    fontWeight: 900
                  }}>
                    {col.count}
                  </span>
                </div>

                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: col.badge === 'ACTIVE' ? col.accentColor : '#94A3B8',
                  letterSpacing: '0.05em'
                }}>
                  {col.badge}
                </span>
              </div>

              {/* Cards Container */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {col.items.length === 0 ? (
                  <div style={{
                    border: '1.5px dashed #E2E8F0',
                    borderRadius: '12px',
                    padding: '32px 10px',
                    textAlign: 'center',
                    color: '#94A3B8',
                    fontSize: '0.78rem',
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

      {/* Rejected Items Box */}
      {showRejected && colRejected.length > 0 && (
        <div style={{
          backgroundColor: '#FEF2F2',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #FCA5A5'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 900, color: '#DC2626' }}>
            🚫 반려된 콘텐츠 목록 ({colRejected.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
            {colRejected.map(item => renderKanbanCard(item))}
          </div>
        </div>
      )}

      {/* ── CALENDAR & INTERACTIVE LIST SECTION (Bidirectional Sync) ── */}
      <div style={{
        marginTop: '12px',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        border: '1px solid #E2E8F0'
      }}>
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0F172A' }}>
              🗓️ 전체 콘텐츠 캘린더 & 양방향 연동 리스트
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
              캘린더 날짜 마우스 호버 시 해당 날짜의 콘텐츠만 필터링되며, 우측 리스트 항목 마우스 호버 시 캘린더 해당 날짜가 강조 표시됩니다.
            </p>
          </div>
        </div>

        <DashboardCalendarArea contents={filteredContents} allProfiles={allProfiles} />
      </div>

      {/* ── RIGHT-CLICK CONTEXT MENU ── */}
      {contextMenu && (
        <div style={{
          position: 'fixed',
          top: contextMenu.y,
          left: contextMenu.x,
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 16px 36px rgba(0,0,0,0.18)',
          border: '1px solid #E2E8F0',
          padding: '6px',
          zIndex: 9999,
          minWidth: '180px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}>
          <div style={{ padding: '6px 10px', fontSize: '0.72rem', fontWeight: 900, color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }}>
            ⚡ 상태 이관 및 조치
          </div>

          <button
            onClick={() => openContentModal(contextMenu.item.id.toString())}
            style={{ textAlign: 'left', padding: '7px 10px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#0F172A' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🔍 상세보기 및 피드백 작성
          </button>

          <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '2px 0' }}></div>

          <button
            onClick={() => updateStatus(contextMenu.item, 'pending')}
            style={{ textAlign: 'left', padding: '7px 10px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#C2410C' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FFF7ED'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ⚡ [검토 필요]로 이관
          </button>

          <button
            onClick={() => updateStatus(contextMenu.item, 'revision')}
            style={{ textAlign: 'left', padding: '7px 10px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#B45309' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEF3C7'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ✏️ [수정 대기]로 이관
          </button>

          <button
            onClick={() => updateStatus(contextMenu.item, 'approved')}
            style={{ textAlign: 'left', padding: '7px 10px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#1D4ED8' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EFF6FF'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🎬 [완성본 대기]로 이관
          </button>

          <button
            onClick={() => updateStatus(contextMenu.item, 'completed')}
            style={{ textAlign: 'left', padding: '7px 10px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#047857' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ECFDF5'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🚀 [업로드 필요]로 이관
          </button>

          <button
            onClick={() => updateStatus(contextMenu.item, 'uploaded')}
            style={{ textAlign: 'left', padding: '7px 10px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🎉 [최종 완료] 처리
          </button>

          <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '2px 0' }}></div>

          <button
            onClick={() => updateStatus(contextMenu.item, 'rejected')}
            style={{ textAlign: 'left', padding: '7px 10px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#DC2626' }}
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
