'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';
import AdminStatusManager from './AdminStatusManager';

const parseCommentMarkdown = (text: string): string => {
  if (!text) return '';
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:800">$1</strong>');
  escaped = escaped.replace(/__(.*?)__/g, '<strong style="font-weight:800">$1</strong>');
  escaped = escaped.replace(/\*(.*?)\*/g, '<em style="font-style:italic">$1</em>');
  escaped = escaped.replace(/_(.*?)_/g, '<em style="font-style:italic">$1</em>');
  escaped = escaped.replace(/~~(.*?)~~/g, '<del>$1</del>');
  escaped = escaped.replace(/\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#3B82F6;text-decoration:underline">$1</a>');
  escaped = escaped.replace(/\n/g, '<br />');
  return escaped;
};

interface ContentDetailModalProps {
  contentId: string | null;
  onClose: () => void;
}

export default function ContentDetailModal({ contentId, onClose }: ContentDetailModalProps) {
  const supabase = createClient();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSecret, setIsSecret] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('contents')
          .select('author_name')
          .eq('title', `PROFILE_${user.email}`)
          .single();
        const displayName = profile?.author_name || user.user_metadata?.full_name || user.email?.split('@')[0] || '익명';
        setCurrentUser({ email: user.email, name: displayName, isAdmin: user.email?.includes('admin') });
      }
    };
    loadUser();
  }, [supabase]);

  // Load content by ID
  useEffect(() => {
    if (!contentId) return;
    const loadContent = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('contents')
        .select('*')
        .eq('id', contentId)
        .single();
      if (data) setContent(data);
      setLoading(false);
    };
    loadContent();
  }, [contentId, supabase]);

  // Block body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const getBodyObj = useCallback(() => {
    try { return JSON.parse(content?.content_body || '{}'); }
    catch { return {}; }
  }, [content]);

  const discussions: any[] = getBodyObj().discussions || [];

  // Can view a secret comment?
  const canViewSecret = (msg: any) => {
    if (!msg.isSecret) return true;
    if (!currentUser) return false;
    const authorName = content?.author_name || '';
    const crewStr = getBodyObj().crew || '';
    if (currentUser.isAdmin) return true;
    if (currentUser.name && (authorName.includes(currentUser.name) || crewStr.includes(currentUser.name))) return true;
    if (currentUser.email && crewStr.includes(currentUser.email)) return true;
    return false;
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() && !attachedImage) return;
    if (!content || !currentUser) return;
    setIsSaving(true);
    try {
      const bodyObj = getBodyObj();
      let emailInJson = '';
      try { emailInJson = bodyObj.authorEmail; } catch {}
      const isAuthor = emailInJson === currentUser.email || content.author_name === currentUser.email || content.author_name?.includes(currentUser.name);
      const isAdmin = currentUser.isAdmin;

      const message = {
        id: Date.now(),
        parentId: null,
        type: 'proposal',
        role: isAdmin ? 'admin' : (isAuthor ? 'writer' : 'crew'),
        text: newComment,
        createdAt: new Date().toISOString(),
        author: currentUser.name,
        likes: 0,
        likedBy: [],
        attachments: attachedImage ? [{ type: 'image', url: attachedImage }] : [],
        isSecret: isSecret,
      };

      const updatedBody = {
        ...bodyObj,
        discussions: [...(bodyObj.discussions || []), message],
      };

      const { error } = await supabase
        .from('contents')
        .update({ content_body: JSON.stringify(updatedBody) })
        .eq('id', content.id);

      if (error) {
        alert('댓글 저장 실패: ' + error.message);
      } else {
        setContent({ ...content, content_body: JSON.stringify(updatedBody) });
        setNewComment('');
        setAttachedImage(null);
        setIsSecret(false);
      }
    } catch (err: any) {
      alert('오류: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('이미지 최대 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setAttachedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const yy = d.getFullYear().toString().slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}/${mm}/${dd}`;
  };

  if (!mounted) return null;

  const bodyObj = getBodyObj();
  const proposalDiscussions = discussions.filter((d: any) => d.type !== 'final');

  return createPortal(
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
        zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .cdm-scroll::-webkit-scrollbar { width: 4px; }
        .cdm-scroll::-webkit-scrollbar-track { background: transparent; }
        .cdm-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
      `}</style>

      <div style={{
        width: '100%', maxWidth: '1100px', height: '90vh',
        backgroundColor: '#f8fafc', borderRadius: '28px',
        boxShadow: '0 40px 100px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.25s ease-out',
        overflow: 'hidden', position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#ffffff', borderBottom: '1px solid #E2E8F0',
          padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A' }}>기획안 상세보기</span>
            {content && (
              <span style={{
                fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#EFF6FF',
                color: '#1D4ED8', padding: '4px 10px', borderRadius: '20px'
              }}>
                {content.author_name} / {content.created_at ? formatDate(content.created_at) : ''}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px', height: '36px', borderRadius: '50%', border: 'none',
              backgroundColor: '#F1F5F9', color: '#64748B', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
            }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', gap: '0', overflow: 'hidden' }}>
          {/* Left: Proposal Detail */}
          <div className="cdm-scroll" style={{
            flex: 1, overflowY: 'auto', padding: '28px',
            borderRight: '1px solid #E2E8F0', backgroundColor: '#ffffff'
          }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94A3B8', fontSize: '1rem' }}>
                불러오는 중...
              </div>
            ) : !content ? (
              <div style={{ textAlign: 'center', color: '#94A3B8', padding: '3rem' }}>콘텐츠를 찾을 수 없습니다.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Title */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>제목 (가제)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', lineHeight: 1.3 }}>{content.title}</div>
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {content.team && (
                    <span style={{ padding: '6px 14px', borderRadius: '20px', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontSize: '0.82rem', fontWeight: 700 }}>
                      📺 {content.team}
                    </span>
                  )}
                  {content.content_type && (
                    <span style={{ padding: '6px 14px', borderRadius: '20px', backgroundColor: '#F0FDF4', color: '#16A34A', fontSize: '0.82rem', fontWeight: 700 }}>
                      {content.content_type}
                    </span>
                  )}
                  {bodyObj.targetMonth && (
                    <span style={{ padding: '6px 14px', borderRadius: '20px', backgroundColor: '#FFF7ED', color: '#EA580C', fontSize: '0.82rem', fontWeight: 700 }}>
                      📅 {bodyObj.targetMonth}
                    </span>
                  )}
                  {bodyObj.articleType && (
                    <span style={{ padding: '6px 14px', borderRadius: '20px', backgroundColor: '#FDF4FF', color: '#9333EA', fontSize: '0.82rem', fontWeight: 700 }}>
                      {bodyObj.articleType}
                    </span>
                  )}
                </div>

                {/* Crew */}
                {bodyObj.crew && (
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px 20px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', marginBottom: '8px' }}>참여인원 (크루)</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {bodyObj.crew.split(',').map((name: string, i: number) => (
                        <span key={i} style={{ padding: '5px 12px', backgroundColor: '#1E3A8A', color: 'white', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 700 }}>
                          {name.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Docs URL */}
                {bodyObj.docsUrl && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', marginBottom: '6px' }}>📄 기획안 문서 URL</div>
                    <a href={bodyObj.docsUrl} target="_blank" rel="noreferrer" style={{ color: '#3B82F6', fontSize: '0.85rem', fontWeight: 600, wordBreak: 'break-all', textDecoration: 'underline' }}>
                      {bodyObj.docsUrl}
                    </a>
                  </div>
                )}

                {/* Intent */}
                {bodyObj.intent && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', marginBottom: '6px' }}>💡 기획의도</div>
                    <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', fontSize: '0.9rem', color: '#334155', lineHeight: 1.7, fontWeight: 500 }}>
                      {bodyObj.intent}
                    </div>
                  </div>
                )}

                {/* Composition */}
                {bodyObj.composition && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', marginBottom: '6px' }}>🎬 구성 및 내용</div>
                    <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', fontSize: '0.9rem', color: '#334155', lineHeight: 1.7, fontWeight: 500 }}>
                      {bodyObj.composition}
                    </div>
                  </div>
                )}

                {/* Keywords/Hashtags */}
                {content.keywords && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', marginBottom: '6px' }}>#해시태그</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {content.keywords.split(',').map((k: string, i: number) => (
                        <span key={i} style={{ padding: '4px 10px', backgroundColor: '#F1F5F9', color: '#475569', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                          #{k.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div style={{ display: 'flex', gap: '16px' }}>
                  {bodyObj.desiredDate && (
                    <div style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '14px 18px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', marginBottom: '4px' }}>희망 업로드 시기</div>
                      <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>{bodyObj.desiredDate}</div>
                    </div>
                  )}
                  {bodyObj.deadline && (
                    <div style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '14px 18px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', marginBottom: '4px' }}>데드라인</div>
                      <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>{bodyObj.deadline}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Comments Panel */}
          <div style={{
            width: '380px', flexShrink: 0, display: 'flex', flexDirection: 'column',
            backgroundColor: '#FAFBFC'
          }}>
            {/* ====== ADMIN SECTION ====== */}
            {currentUser?.isAdmin && content && (
              <div style={{ padding: '18px 20px 0 20px' }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '2px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E40AF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    👑 관리자 전용 상태 변경
                  </div>
                  <AdminStatusManager item={content} />
                </div>
              </div>
            )}
            {/* =============================== */}

            {/* Comments Header */}
            <div style={{
              padding: '18px 20px', borderBottom: '1px solid #E2E8F0',
              backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>기획안 피드백</span>
              <span style={{
                backgroundColor: '#1E3A8A', color: 'white', borderRadius: '999px',
                padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700
              }}>
                {proposalDiscussions.length}
              </span>
            </div>

            {/* Comments List */}
            <div className="cdm-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {proposalDiscussions.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94A3B8', padding: '3rem 1rem', fontSize: '0.9rem' }}>
                  등록된 피드백이 없습니다. 첫 의견을 남겨보세요!
                </div>
              ) : (
                proposalDiscussions.map((msg: any, idx: number) => {
                  const isVisible = canViewSecret(msg);
                  const roleColors: Record<string, { bg: string; text: string; label: string }> = {
                    admin: { bg: '#FEF3C7', text: '#92400E', label: '관리자' },
                    writer: { bg: '#EFF6FF', text: '#1D4ED8', label: '작성자' },
                    crew: { bg: '#F0FDF4', text: '#15803D', label: '크루' },
                  };
                  const roleStyle = roleColors[msg.role] || roleColors.crew;

                  return (
                    <div key={msg.id || idx} style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      marginBottom: '10px',
                      border: msg.isSecret ? '1.5px dashed #CBD5E1' : '1px solid #E2E8F0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      opacity: (!isVisible && msg.isSecret) ? 0.7 : 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            backgroundColor: '#1E3A8A', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 800
                          }}>
                            {msg.author?.[0] || '?'}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>{msg.author}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                              {msg.createdAt ? formatDate(msg.createdAt) : ''}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {msg.isSecret && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, backgroundColor: '#F1F5F9', color: '#64748B', padding: '2px 7px', borderRadius: '6px' }}>
                              🔒 비밀
                            </span>
                          )}
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: roleStyle.bg, color: roleStyle.text, padding: '2px 8px', borderRadius: '6px' }}>
                            {roleStyle.label}
                          </span>
                        </div>
                      </div>

                      {/* Comment Text */}
                      {!isVisible && msg.isSecret ? (
                        <div style={{ fontSize: '0.85rem', color: '#94A3B8', fontStyle: 'italic', padding: '4px 0' }}>
                          🔒 비밀댓글입니다.
                        </div>
                      ) : (
                        <>
                          <div
                            style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, fontWeight: 500 }}
                            dangerouslySetInnerHTML={{ __html: parseCommentMarkdown(msg.text) }}
                          />
                          {(msg.attachments || []).length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                              {msg.attachments.map((att: any, i: number) => (
                                att.type === 'image' ? (
                                  <img key={i} src={att.url} alt="첨부 이미지" style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '4px' }} />
                                ) : null
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Input */}
            <div style={{
              padding: '16px', borderTop: '1px solid #E2E8F0',
              backgroundColor: '#ffffff', flexShrink: 0
            }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="기획안 피드백을 남겨주세요... (B, I, S, 이모지, 사진 지원)"
                style={{
                  width: '100%', minHeight: '80px', padding: '12px',
                  border: '1.5px solid #E2E8F0', borderRadius: '12px',
                  fontSize: '0.85rem', resize: 'vertical', outline: 'none',
                  fontFamily: 'inherit', color: '#334155', lineHeight: 1.6,
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#1E3A8A'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; }}
              />

              {/* Attached image preview */}
              {attachedImage && (
                <div style={{ position: 'relative', marginTop: '8px', display: 'inline-block' }}>
                  <img src={attachedImage} alt="첨부" style={{ maxHeight: '80px', borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                  <button
                    onClick={() => setAttachedImage(null)}
                    style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', border: 'none', backgroundColor: '#EF4444', color: 'white', cursor: 'pointer', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >✕</button>
                </div>
              )}

              {/* Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/* Image upload */}
                  <label style={{ cursor: 'pointer', padding: '5px 8px', borderRadius: '8px', backgroundColor: '#F1F5F9', color: '#64748B', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    📎
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                  </label>

                  {/* Secret comment checkbox */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px', backgroundColor: isSecret ? '#FFF7ED' : '#F1F5F9', border: isSecret ? '1.5px solid #F97316' : '1.5px solid transparent', transition: 'all 0.2s' }}>
                    <input
                      type="checkbox"
                      checked={isSecret}
                      onChange={(e) => setIsSecret(e.target.checked)}
                      style={{ width: '14px', height: '14px', accentColor: '#F97316', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isSecret ? '#EA580C' : '#64748B', whiteSpace: 'nowrap' }}>
                      🔒 비밀댓글
                    </span>
                  </label>
                </div>

                <button
                  onClick={handleSubmitComment}
                  disabled={isSaving || (!newComment.trim() && !attachedImage)}
                  style={{
                    padding: '8px 18px', backgroundColor: '#1E3A8A', color: 'white',
                    border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800,
                    cursor: isSaving || (!newComment.trim() && !attachedImage) ? 'not-allowed' : 'pointer',
                    opacity: isSaving || (!newComment.trim() && !attachedImage) ? 0.6 : 1,
                    transition: 'all 0.2s', whiteSpace: 'nowrap'
                  }}
                >
                  {isSaving ? '저장 중...' : '의견 보내기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
