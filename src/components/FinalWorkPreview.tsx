'use client';

import React from 'react';

/**
 * 완성본 미리보기 — 전체 콘텐츠 오른쪽 칸과 대시보드 '최근에 올라온 콘텐츠'가
 * 같은 모습이어야 한다는 요청에 따라, 두 곳이 이 부품 하나를 함께 쓴다.
 * 예전에는 각자 다른 마크업을 갖고 있어 한쪽만 고쳐도 서로 어긋났다.
 *
 * 부모 요소의 크기를 그대로 채우므로, 부모에 높이와 `overflow: hidden`을 준다.
 */

export const getYoutubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const getGoogleDriveInfo = (url: string): { id: string; type: string } | null => {
  if (!url) return null;
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return { id: folderMatch[1], type: 'folder' };
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return { id: fileMatch[1], type: 'file' };
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return { id: idMatch[1], type: url.includes('folderview') ? 'folder' : 'file' };
  return null;
};

interface FinalWorkPreviewProps {
  finalUrl?: string | null;
  title?: string | null;
  /** 제목 아래 한 줄. 접힌 상태에서는 자리가 없어 감춘다. */
  meta?: React.ReactNode;
  /** 카드가 제목 줄만 남기고 접힌 상태 — 글자와 여백을 줄이고 버튼을 감춘다. */
  compact?: boolean;
}

export default function FinalWorkPreview({
  finalUrl,
  title,
  meta,
  compact = false,
}: FinalWorkPreviewProps) {
  const ytId = finalUrl ? getYoutubeVideoId(finalUrl) : null;
  const gdInfo = finalUrl ? getGoogleDriveInfo(finalUrl) : null;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--color-surface)',
        flexShrink: 0,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* 카드 전체가 상세보기를 여는 버튼이라, 임베드는 클릭을 가로채지 않게 둔다. */}
      {!finalUrl ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)', zIndex: 10, gap: '8px' }}>
          {/* 접히면 아이콘까지 넣을 자리가 없어 문구만 작게 남긴다. */}
          {!compact && (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
              <text x="12" y="9" textAnchor="middle" fontSize="6" fontWeight="bold" stroke="none" fill="var(--color-text-muted)">?</text>
            </svg>
          )}
          <span style={{ fontWeight: 700, color: 'var(--color-text-muted)', fontSize: compact ? '0.72rem' : '0.8rem' }}>
            아직 업로드되지 않았습니다
          </span>
        </div>
      ) : ytId ? (
        <iframe
          title="완성본 영상 미리보기"
          src={`https://www.youtube.com/embed/${ytId}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
          loading="lazy"
          allowFullScreen
        />
      ) : gdInfo ? (
        <iframe
          title="완성본 드라이브 미리보기"
          src={gdInfo.type === 'folder' ? `https://drive.google.com/embeddedfolderview?id=${gdInfo.id}#grid` : `https://drive.google.com/file/d/${gdInfo.id}/preview`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
          loading="lazy"
          allowFullScreen
        />
      ) : (
        /* 유튜브도 드라이브도 아닌 링크 — 임베드할 수 없으니 표지만 그린다. */
        <>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.06, background: 'radial-gradient(circle, #34A853 0%, #4285F4 50%, #FBBC05 100%)' }} />
          <svg viewBox="0 0 100 100" width="60" height="60" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.06))' }}>
            <path d="M30 75 L15 50 L45 50 Z" fill="#FBBC05" />
            <path d="M30 75 L60 75 L45 50 Z" fill="#4285F4" />
            <path d="M45 50 L60 75 L75 50 Z" fill="#34A853" />
            <path d="M45 50 L75 50 L60 25 Z" fill="#EA4335" />
            <path d="M15 50 L45 50 L30 25 Z" fill="#FBBC05" opacity="0.9" />
            <path d="M30 25 L60 25 L45 50 Z" fill="#34A853" opacity="0.9" />
          </svg>
        </>
      )}

      {finalUrl && !compact && (
        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 11 }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); window.open(finalUrl, '_blank'); }}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              color: '#ffffff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.72rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
            }}
          >
            새 창에서 열기
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </button>
        </div>
      )}

      {/* 카드가 낮아 제목 줄을 아래에 따로 두면 잘린다. 미리보기를 가리지 않도록
          어두운 띠를 깔고 그 위에 얹는다. */}
      {title && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 12,
            padding: compact ? '4px 12px 3px 12px' : '10px 14px 8px 14px',
            background: compact
              ? 'rgba(15, 23, 42, 0.82)'
              : 'linear-gradient(to top, rgba(15, 23, 42, 0.92) 0%, rgba(15, 23, 42, 0.75) 60%, rgba(15, 23, 42, 0) 100%)',
            pointerEvents: 'none',
          }}
        >
          <h3 style={{ margin: 0, fontSize: compact ? '0.74rem' : '0.9rem', fontWeight: 800, color: '#F8FAFC', lineBreak: 'anywhere', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </h3>
          {meta && (
            <div style={{ display: compact ? 'none' : 'flex', marginTop: '2px', fontSize: '0.72rem', color: '#CBD5E1', fontWeight: 600, flexWrap: 'nowrap', gap: '4px', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {meta}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
