'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { commitHashtag, dropLastHashtag, removeHashtag, splitHashtags } from '@/utils/hashtagInput';
import { createClient } from '@/utils/supabase/client';
import { cleanAuthorName } from '@/utils/dateUtils';
import UserAvatar from '@/components/UserAvatar';
import { useRouter, useSearchParams } from 'next/navigation';
import RichTextEditor from '@/components/RichTextEditor';
import Link from 'next/link';

export interface FinalSubmitFormProps {
  initialId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
}

const globalFinalCache: Record<string, any> = {};

export default function FinalSubmitForm({ initialId: embeddedId, onSuccess, onCancel, isModal = false }: FinalSubmitFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const initialId = embeddedId || searchParams?.get('id');

  const [isLoadingProps, setIsLoadingProps] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 확정된 태그(formData.keywords)와 지금 치고 있는 글자를 분리한다 —
  // 한 문자열에 같이 담으면 한글 조합 중에 자모가 분리돼 태그가 됐다(모바일과 동일 구조).
  const [keywordInput, setKeywordInput] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [availableProposals, setAvailableProposals] = useState<any[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [authorName, setAuthorName] = useState('');
  const [drafts, setDrafts] = useState<any[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isCrewEditable, setIsCrewEditable] = useState(false);
  
  const [formData, setFormData] = useState(() => {
    let initialData = {
      proposalId: '',
      finalUrl: '',
      postContent: '',
      desiredDate: '',
      discussions: [] as any[],
      keywords: '',
      crew: '',
      description: ''
    };
    
    const cacheKey = initialId || 'new';
    if (globalFinalCache[cacheKey]) {
      initialData = { ...initialData, ...globalFinalCache[cacheKey] };
    }
    return initialData;
  });

  useEffect(() => {
    const cacheKey = initialId || 'new';
    globalFinalCache[cacheKey] = formData;
  }, [formData, initialId]);



  const [newComment, setNewComment] = useState('');

  const getYoutubeVideoId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getGoogleDriveInfo = (url: string) => {
    if (!url) return null;
    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return { id: folderMatch[1], type: 'folder' };
    
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return { id: fileMatch[1], type: 'file' };
    
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return { id: idMatch[1], type: url.includes('folderview') ? 'folder' : 'file' };

    return null;
  };

  const formatCrewName = (name: string) => {
    if (!name) return '';
    const pureName = cleanAuthorName(name);
    if (/^\d+기\s+/.test(pureName)) return pureName;
    if (/^\d+\s+/.test(pureName)) return pureName.replace(/^(\d+)\s+/, '$1기 ');
    const cleanName = pureName.replace(/^\d+(기)?\s+/, '');
    const profile = allProfiles.find(p => cleanAuthorName(p.author_name) === cleanName || cleanAuthorName(p.author_name) === pureName);
    if (profile && profile.keywords) {
      const kw = profile.keywords.toString().trim();
      const generation = kw.endsWith('기') ? kw : `${kw}기`;
      return `${generation} ${cleanName}`;
    }
    return pureName;
  };

  const hasFetchedId = useRef<string | null>(null);

  const handleClose = useCallback(() => {
    if (!isReadOnly && !isSubmitting && (formData.finalUrl || formData.postContent)) {
      if (confirm('작성 중인 내용이 있습니다. 정말 나가시겠습니까?')) {
        if (onCancel) onCancel();
        else router.back();
      }
    } else {
      if (onCancel) onCancel();
      else router.back();
    }
  }, [isReadOnly, isSubmitting, formData.finalUrl, formData.postContent, onCancel, router]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isReadOnly && !isSubmitting && (formData.finalUrl || formData.postContent)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    const handleModalClose = () => {
      handleClose();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('request-modal-close', handleModalClose);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('request-modal-close', handleModalClose);
    };
  }, [isReadOnly, isSubmitting, formData, handleClose]);

  useEffect(() => {
    const currentId = initialId || 'new';
    if (hasFetchedId.current === currentId) return;
    hasFetchedId.current = currentId;

    const fetchInitialData = async () => {
      // Load profiles first for formatting crew
      let loadedProfiles: any[] = [];
      try {
        const crewRes = await fetch('/api/crew');
        if (crewRes.ok) {
          const crewData = await crewRes.json();
          loadedProfiles = crewData.map((u: any) => ({
            author_name: u.name,
            team: u.team,
            keywords: u.email
          }));
          setAllProfiles(loadedProfiles);
        }
      } catch (e) {
        console.error('Failed to load crew members', e);
      }

      const formatCrew = (name: string) => {
        if (!name) return '';
        const trimmed = name.trim();
        if (/^\d+기\s+/.test(trimmed)) return trimmed;
        if (/^\d+\s+/.test(trimmed)) return trimmed.replace(/^(\d+)\s+/, '$1기 ');
        const cleanName = trimmed.replace(/^\d+(기)?\s+/, '');
        const profile = loadedProfiles.find(p => p.author_name === cleanName || p.author_name === trimmed);
        if (profile && profile.keywords) {
          const kw = profile.keywords.toString().trim();
          const generation = kw.endsWith('기') ? kw : `${kw}기`;
          return `${generation} ${cleanName}`;
        }
        return trimmed;
      };

      const formatCrewList = (str: string) => str ? str.split(',').map(s => formatCrew(s)).join(', ') : '';

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userEmail = currentUser?.email;

      const { data: profileRow } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${userEmail}`).single();
      const userName = cleanAuthorName(profileRow?.author_name || currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name);
      setAuthorName(userName || '이름 없음');

      const { data: props } = await supabase
        .from('contents')
        .select('id, title, author_name, content_type')
        .in('status', ['approved', 'final_submitted', 'revision', 'completed', 'uploaded']);
      
      let allProps = props || [];

      const isAdminFlag = searchParams?.get('admin') === 'true' || userEmail === 'admin@ymc.com' || userEmail?.includes('admin');

      if (initialId) {
        const { data: current, error } = await supabase.from('contents').select('*').eq('id', initialId).single();
        if (current) {
          setSelectedProposal(current);
          
          if (!allProps.find(p => p.id.toString() === initialId)) {
            allProps = [{ id: current.id, title: current.title, author_name: current.author_name, content_type: current.content_type }, ...allProps];
          }

          let discussions: any[] = [];
          let postContent = '';
          let desiredDate = '';
          let keywords = current.keywords || '';
          let crew = '';
          let description = '';

          try {
            const body = JSON.parse(current.content_body);
            discussions = body.discussions || [];
            postContent = body.postContent || '';
            desiredDate = body.desiredDate || '';
            description = body.finalDescription || '';
            
            if (['approved', 'final_submitted', 'completed', 'uploaded', 'revision'].includes(current.status)) {
                keywords = body.finalKeywords || current.keywords || '';
                crew = body.finalCrew || body.crew || (current.description ? current.description.split(' (참여:')[0] : '');
            } else {
                keywords = current.keywords || '';
                crew = body.crew || (current.description ? current.description.split(' (참여:')[0] : '');
            }
            crew = formatCrewList(crew);
          } catch(e) {}

          setFormData(prev => {
            const newForm = {
              ...prev,
              proposalId: current.id.toString(),
              finalUrl: current.final_url || prev.finalUrl || '',
              postContent: postContent || prev.postContent || '',
              desiredDate: desiredDate || prev.desiredDate || '',
              discussions: discussions.length > 0 ? discussions : prev.discussions,
              keywords: keywords || prev.keywords || '',
              crew: crew || prev.crew || '',
              description: description || prev.description || ''
            };
            return newForm;
          });

          const isOwn = currentUser && (current.author_name === userEmail || (userName && current.author_name?.includes(userName)));
          const isParticipant = crew && (crew.includes(userEmail || '') || (userName && crew.includes(userName)));
          const authorFlag = !!isOwn || !!isParticipant;
          setIsAuthor(authorFlag);
          
          if (!isAdminFlag && !authorFlag) {
             setIsReadOnly(true);
          } else {
             setIsReadOnly(current.status !== 'approved');
          }
        }
      }

      if (!isAdminFlag && userEmail) {
          // Filter available proposals to those the user is author or participant of
          allProps = allProps.filter(p => {
             if (p.author_name === userEmail || (userName && p.author_name?.includes(userName))) return true;
             return false; // we'd need body to fully check crew, but this list is just for selection. If embeddedId is used, selection is hidden anyway.
          });
      }

      setAvailableProposals(allProps);
      setIsAdmin(!!isAdminFlag);
      setIsLoadingProps(false);
    };

    fetchInitialData();
  }, [initialId, searchParams, supabase]);

  const loadDrafts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profileRow } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${user.email}`).single();
    const userName = cleanAuthorName(profileRow?.author_name || user.user_metadata?.full_name || user.user_metadata?.name);

    const { data } = await supabase.from('contents').select('*').eq('status', 'approved').order('created_at', { ascending: false });
    const myDrafts = (data || []).filter(d => {
        let emailInJson = '';
        let hasDraftData = false;
        try { 
           const body = JSON.parse(d.content_body);
           emailInJson = body.authorEmail; 
           if (d.final_url || body.postContent || body.finalKeywords) {
              hasDraftData = true;
           }
        } catch(e) {}
        
        const isMine = emailInJson === user.email || d.author_name === user.email || d.author_name === userName || (userName && d.author_name?.includes(userName));
        return isMine && hasDraftData;
    });
    setDrafts(myDrafts);
    setShowDrafts(true);
  };

  const useDraft = (draft: any) => {
    let postContent = '';
    let desiredDate = '';
    let keywords = draft.keywords || '';
    let crew = '';
    let description = '';

    try {
      const body = JSON.parse(draft.content_body);
      postContent = body.postContent || '';
      desiredDate = body.desiredDate || '';
      description = body.finalDescription || '';
      keywords = body.finalKeywords || draft.keywords || '';
      crew = body.finalCrew || body.crew || (draft.description ? draft.description.split(' (참여:')[0] : '');
    } catch(e) {}

    setFormData(prev => ({
       ...prev,
       proposalId: draft.id.toString(),
       finalUrl: draft.final_url || '',
       postContent: postContent,
       desiredDate: desiredDate,
       keywords: keywords,
       crew: crew,
       description: description
    }));
    
    setSelectedProposal(draft);
    setShowDrafts(false);
    setIsReadOnly(false);
  };

  const handleDeleteDraft = async (draftId: number) => {
    if (!confirm('완성본 임시저장 내역을 삭제하시겠습니까? 기획안 데이터는 유지됩니다.')) return;
    
    const { data: current } = await supabase.from('contents').select('content_body').eq('id', draftId).single();
    let updatedBody = {};
    if (current?.content_body) {
       try {
         updatedBody = JSON.parse(current.content_body);
         delete (updatedBody as any).postContent;
         delete (updatedBody as any).finalKeywords;
         delete (updatedBody as any).finalCrew;
         delete (updatedBody as any).finalDescription;
         delete (updatedBody as any).finalSubmittedAt;
       } catch(e) {}
    }

    await supabase.from('contents').update({
       final_url: null,
       content_body: JSON.stringify(updatedBody)
    }).eq('id', draftId);
    
    setDrafts(prev => prev.filter(d => d.id !== draftId));
  };

  const handleDelete = async () => {
    if (!initialId) return;
    if (!confirm('완성본 제출 기록을 삭제하시겠습니까? 기획안 자체는 삭제되지 않으며 상태만 되돌아갑니다.')) return;
    
    setIsSubmitting(true);
    const { error } = await supabase.from('contents').update({
        status: 'approved',
        final_url: null
    }).eq('id', initialId);
    
    setIsSubmitting(false);

    if (error) {
        alert('삭제(되돌리기) 중 오류가 발생했습니다: ' + error.message);
    } else {
        alert('성공적으로 삭제되었습니다. 해당 기획안은 다시 완성본 대기 상태로 변경됩니다.');
        delete globalFinalCache[initialId || 'new'];
        if (onSuccess) onSuccess();
        else {
          router.push('/contents');
          router.refresh();
        }
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !initialId) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${user?.email}`).single();
    const displayName = cleanAuthorName(profile?.author_name || user?.user_metadata?.full_name || user?.user_metadata?.name) || user?.email?.split('@')[0] || 'Unknown';

    const message = {
      id: Date.now(),
      role: isAdmin ? 'admin' : 'writer',
      text: newComment,
      createdAt: new Date().toISOString(),
      author: displayName
    };
    
    const updatedDiscussions = [...formData.discussions, message];
    setFormData(prev => ({ ...prev, discussions: updatedDiscussions }));
    setNewComment('');

    const { data: current } = await supabase.from('contents').select('content_body').eq('id', initialId).single();
    let updatedBody = {};
    if (current?.content_body) updatedBody = JSON.parse(current.content_body);

    await supabase.from('contents').update({
        content_body: JSON.stringify({
            ...updatedBody,
            discussions: updatedDiscussions
        })
    }).eq('id', initialId);
  };

  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (!formData.proposalId) {
      alert('대상 기획안을 선택해주세요.');
      return;
    }
    setIsSubmitting(true);

    const { data: current } = await supabase.from('contents').select('content_body').eq('id', formData.proposalId).single();
    let bodyData: any = {};
    try {
      if (current?.content_body) bodyData = JSON.parse(current.content_body);
    } catch(e) {}

    const updatedBody = {
      ...bodyData,
      postContent: formData.postContent,
      desiredDate: formData.desiredDate,
      discussions: formData.discussions,
      finalKeywords: formData.keywords,
      finalCrew: formData.crew,
      finalDescription: formData.description,
      finalSubmittedAt: bodyData.finalSubmittedAt || new Date().toISOString()
    };

    const targetStatus = isDraft ? 'approved' : 'final_submitted';

    const { error } = await supabase.from('contents')
      .update({
        final_url: formData.finalUrl,
        content_body: JSON.stringify(updatedBody),
        status: targetStatus
      })
      .eq('id', formData.proposalId);

    if (error) {
      alert('제출 중 오류가 발생했습니다: ' + error.message);
    } else {
      delete globalFinalCache[initialId || 'new'];
      alert(isDraft ? '임시저장 되었습니다.' : '완성본이 성공적으로 제출되었습니다.');
      if (onSuccess) onSuccess(); else { 
          router.push('/contents'); router.refresh(); 
      }
    }
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (isLoadingProps) return <div className="container">데이터 불러오는 중...</div>;

  return (
    <div className={embeddedId ? '' : 'container'} style={{ paddingBottom: embeddedId ? '0' : '4rem', width: '100%', height: embeddedId ? '100%' : 'auto' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'var(--color-panel)', borderRadius: '16px', padding: embeddedId ? '1.5rem' : '3rem', boxShadow: embeddedId ? 'none' : '0 4px 20px rgba(0,0,0,0.05)', position: 'relative' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--color-text-heading)', paddingBottom: '1rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button type="button" onClick={handleClose} aria-label="닫기" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-heading)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <h2 style={{ fontSize: embeddedId ? '1.5rem' : '2rem', fontWeight: 800, margin: 0, color: 'var(--color-text-heading)' }}>완성본 {isReadOnly && '미리보기'}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <button type="button" onClick={loadDrafts} style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', border: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              임시저장함
            </button>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              작성자: {authorName} / {new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '')}
            </div>
          </div>
        </div>

        {showDrafts && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--color-panel)', zIndex: 100, borderRadius: '16px', padding: '2rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-heading)', margin: 0 }}>완성본 임시저장함</h3>
              <button type="button" onClick={() => setShowDrafts(false)} aria-label="닫기" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              {drafts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-panel-alt)', borderRadius: '12px' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 1rem', opacity: 0.5 }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path></svg>
                  <p style={{ margin: 0, fontWeight: 600 }}>완성본 임시저장 내역이 없습니다.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {drafts.map(d => {
                    let dEmail = '';
                    let body = {};
                    try { 
                        body = JSON.parse(d.content_body);
                        dEmail = (body as any).authorEmail; 
                    } catch(e) {}
                    return (
                      <div
                        key={d.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`임시저장 "${d.title}" 불러오기`}
                        style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-panel)', transition: 'all 0.2s', cursor: 'pointer' }}
                        onClick={() => useDraft(d)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); useDraft(d); } }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-text-muted)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)' }}>{d.title}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {new Date(d.created_at).toLocaleDateString('ko-KR')} · {d.team} · {d.content_type}
                          </span>
                        </div>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteDraft(d.id); }} aria-label="임시저장 삭제" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.8rem' }}>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={isSubmitting}
                style={{ flex: 1, padding: '1rem', backgroundColor: '#1e3a8a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                {isSubmitting ? '저장 중...' : '지금 작성 중인 내용 임시저장하기'}
              </button>
            </div>
          </div>
        )}

        <form autoComplete="off" onSubmit={(e) => handleSubmit(e, false)} className="flex-col gap-6">
          {/* 기획안 선택 (선택 시 해당 정보 표시용) */}
          <div className="flex-col gap-2" style={{ display: initialId ? 'none' : 'flex' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-main)' }}>대상 기획안 선택</label>
            <select 
              name="proposalId"
              value={formData.proposalId} 
              onChange={(e) => {
                 handleChange(e);
                 const propId = e.target.value;
                 if (propId) {
                    supabase.from('contents').select('*').eq('id', propId).single().then(({data}) => {
                       setSelectedProposal(data);
                       try {
                          const body = JSON.parse(data.content_body);
                          setFormData(prev => ({
                             ...prev,
                             keywords: data.keywords || '',
                             crew: prev.crew || body.crew || (data.description ? data.description.split(' (참여:')[0] : '')
                          }));
                       } catch(e) {}
                    });
                 } else {
                    setSelectedProposal(null);
                 }
              }}
              required
              style={{ border: 'none', backgroundColor: 'var(--input-glass-bg)', padding: '1rem', borderRadius: '8px', fontSize: '1rem', outline: 'none' }}
              disabled={!!initialId || isReadOnly || isSubmitting}
            >
              <option value="">-- 제출할 기획안을 선택하세요 --</option>
              {availableProposals.map(p => (
                <option key={p.id} value={p.id}>{`[${p.author_name}] ${p.title}`}</option>
              ))}
            </select>
          </div>

          {/* Preview Area */}
          {selectedProposal && (
            <div style={{ marginBottom: '1rem' }}>
              {(() => {
                const ytId = getYoutubeVideoId(formData.finalUrl);
                const gdInfo = getGoogleDriveInfo(formData.finalUrl);
                
                return (
                  <div style={{ position: 'relative', width: '100%', borderRadius: '16px', overflow: 'hidden', backgroundColor: 'var(--color-surface)', display: 'flex', flexDirection: 'column' }}>
                    {/* Cover image or Embed */}
                    <div style={{ width: '100%', height: '300px', backgroundColor: 'var(--color-panel-alt)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '16px' }}>
                       {ytId ? (
                           <iframe 
                             src={`https://www.youtube.com/embed/${ytId}`} 
                             style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} 
                             frameBorder="0" 
                             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                             allowFullScreen
                           />
                       ) : gdInfo ? (
                           <iframe 
                             src={gdInfo.type === 'folder' 
                               ? `https://drive.google.com/embeddedfolderview?id=${gdInfo.id}#list`
                               : `https://drive.google.com/file/d/${gdInfo.id}/preview`} 
                             style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} 
                             frameBorder="0" 
                             allowFullScreen
                           />
                       ) : (
                           // Placeholder cover (Google Drive colors)
                           <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #4285F4 25%, #34A853 25%, #34A853 50%, #FBBC05 50%, #FBBC05 75%, #EA4335 75%)', opacity: 0.9 }}>
                               <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                                   <button type="button" style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#475569', border: 'none', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                                      Open Drive <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                   </button>
                               </div>
                           </div>
                       )}
                    </div>
                    {/* Proposal Info */}
                    <div style={{ paddingTop: '1.5rem', backgroundColor: 'var(--color-surface)' }}>
                      <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>{selectedProposal.title}</h3>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.8rem', fontWeight: 500 }}>
                        {selectedProposal.author_name} / {selectedProposal.team} / {selectedProposal.content_type}
                      </div>
                      {formData.finalUrl && (
                        <a href={formData.finalUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#10b981', textDecoration: 'none', wordBreak: 'break-all', fontWeight: 500 }}>
                          {formData.finalUrl}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 구글 드라이브 링크 */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)' }}>구글 드라이브 / 유튜브 링크 <span style={{color: '#ef4444'}}>*</span></label>
            <input
              type="url"
              name="finalUrl"
              value={formData.finalUrl}
              onChange={handleChange}
              placeholder="https://drive.google.com/file/d/..."
              required
              disabled={isReadOnly || isSubmitting}
              style={{ border: 'none', backgroundColor: 'var(--input-glass-bg)', padding: '0.875rem 1rem', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 500, outline: 'none' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--color-tint-warning)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--color-tint-warning-text)', fontWeight: 500 }}>
              <span>💡</span>
              <span>구글 드라이브 공유 설정을 <strong>'링크가 있는 모든 사용자 (뷰어)'</strong>로 지정해야 미리보기가 정상 표시됩니다.</span>
            </div>
          </div>

          {/* 본문 / 캡션 내용 */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)' }}>본문 / 캡션 내용</label>
            <div style={{ backgroundColor: 'var(--input-glass-bg)', borderRadius: '8px', padding: '0.5rem', border: 'none' }}>
                <RichTextEditor 
                  value={formData.postContent} 
                  onChange={(val) => setFormData({...formData, postContent: val})} 
                  placeholder="내용을 입력해주세요" 
                  disabled={isReadOnly || isSubmitting} 
                  minHeight="150px" 
                />
            </div>
          </div>

          {/* 해시태그 */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)' }}>#해시태그 (쉼표 또는 스페이스로 구분, 기획안 연동)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--input-glass-bg)', padding: '0.5rem', borderRadius: '8px' }}>
              <div style={{ backgroundColor: '#1e3a8a', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
              <input type="text" name="keywords" value={keywordInput}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (/[,\s]$/.test(raw)) {
                    // 방금 구분자를 쳤다 — 그 직전 단어만 태그로 확정하고 입력창을 비운다.
                    setFormData(prev => ({ ...prev, keywords: commitHashtag(prev.keywords, raw.slice(0, -1)) }));
                    setKeywordInput('');
                  } else {
                    // 조합 중인 한글이 깨지지 않도록 입력 중에는 문자열을 건드리지 않는다.
                    setKeywordInput(raw);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setFormData(prev => ({ ...prev, keywords: commitHashtag(prev.keywords, keywordInput) }));
                    setKeywordInput('');
                  } else if (e.key === 'Backspace' && keywordInput === '') {
                    // 입력창이 빈 상태에서 백스페이스 — 마지막 태그를 지운다.
                    setFormData(prev => ({ ...prev, keywords: dropLastHashtag(prev.keywords) }));
                  }
                }}
                placeholder="기획안을 선택하면 자동으로 불러와집니다. (쉼표 또는 스페이스로 구분)" disabled={isReadOnly || isSubmitting} style={{ border: 'none', backgroundColor: 'transparent', flex: 1, outline: 'none', fontSize: '0.9rem', fontWeight: 500 }} />
            </div>
            {formData.keywords && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                {splitHashtags(formData.keywords).map((kw, i) => (
                  <span key={i} style={{ backgroundColor: 'var(--color-chip-bg)', color: 'var(--color-chip-text)', padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {kw}
                    {!isReadOnly && !isSubmitting && (
                        <button type="button" onClick={() => {
                            setFormData({ ...formData, keywords: removeHashtag(formData.keywords, kw) });
                        }} style={{ background: 'none', border: 'none', color: 'var(--color-chip-text)', cursor: 'pointer', padding: 0, fontSize: '12px' }}>✕</button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 제작 인원 */}
          <div className="flex-col gap-2">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>제작 인원 (자동완성, 수정가능하도록 접근 오픈)</label>
              {!isReadOnly && !isSubmitting && (
                <button type="button" onClick={() => setIsCrewEditable(!isCrewEditable)} style={{ backgroundColor: isCrewEditable ? 'var(--color-panel-alt)' : '#1e3a8a', color: isCrewEditable ? 'var(--color-text-muted)' : 'white', border: isCrewEditable ? '1px solid var(--color-border)' : 'none', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {isCrewEditable ? '수정 완료' : '수정하기'}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
               {/* Avatars */}
               {formData.crew ? formData.crew.split(',').map(s=>s.trim()).filter(Boolean).map((name, index) => {
                 const formattedName = formatCrewName(name);
                 const cleanName = name.replace(/^\d+(기)?\s+/, '');
                 const cleanAuthorName = authorName?.replace(/^\d+(기)?\s+/, '');
                 const firstLetter = cleanName[0] || '?';
                 const isFirst = index === 0;
                 return (
                 <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', position: 'relative' }}>
                    <UserAvatar rawName={name} size={56} className={isFirst ? "bg-[#1E3A8A]" : "bg-[#0284C7]"} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)' }}>{formattedName}</span>
                    
                    {!isReadOnly && !isSubmitting && isCrewEditable && cleanName !== cleanAuthorName && (
                      <button type="button" onClick={() => {
                        const newCrew = formData.crew.split(',').map(s=>s.trim()).filter(n => n !== name).join(', ');
                        setFormData({...formData, crew: newCrew});
                      }} style={{ position: 'absolute', top: '-4px', right: '-4px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ef4444', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}>
                        ✕
                      </button>
                    )}
                 </div>
               )}) : null}
               
               {!isReadOnly && !isSubmitting && isCrewEditable && (
                 <div style={{ position: 'relative' }}>
                   <button type="button" onClick={() => setShowMemberSelect(!showMemberSelect)} style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px dashed var(--color-border)', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', cursor: 'pointer', alignSelf: 'flex-start' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                   </button>

                   {showMemberSelect && (
                     <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '10px', width: '300px', backgroundColor: 'var(--color-panel)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid var(--color-border)', zIndex: 100, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                       <div style={{ padding: '0.8rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-panel-alt)' }}>
                         <input
                           type="text"
                           placeholder="이름 검색..."
                           value={memberSearchQuery}
                           onChange={e => setMemberSearchQuery(e.target.value)}
                           style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: 'var(--input-glass-bg)', color: 'var(--color-text-main)' }}
                         />
                       </div>
                       <div style={{ maxHeight: '250px', overflowY: 'auto', padding: '0.5rem' }}>
                         {allProfiles
                           .filter(p => p.author_name && (!memberSearchQuery || p.author_name.includes(memberSearchQuery)))
                           .map(p => {
                             const cleanNameP = p.author_name.replace(/^\d+(기)?\s+/, '');
                             const isSelected = formData.crew ? formData.crew.split(',').map(s=>s.trim().replace(/^\d+(기)?\s+/, '')).includes(cleanNameP) : false;
                             return (
                               <div 
                                 key={p.author_name + p.team} 
                                 onClick={() => {
                                     let crewArray = formData.crew ? formData.crew.split(',').map(s => s.trim()).filter(Boolean) : [];
                                     const cleanAuthorName = authorName?.replace(/^\d+(기)?\s+/, '');
                                     if (isSelected) {
                                         if (cleanNameP !== cleanAuthorName) {
                                            crewArray = crewArray.filter(name => name.replace(/^\d+(기)?\s+/, '') !== cleanNameP);
                                         }
                                     } else {
                                         crewArray.push(p.author_name);
                                     }
                                     setFormData({ ...formData, crew: crewArray.join(', ') });
                                 }}
                                 style={{ padding: '0.6rem 0.8rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isSelected ? 'var(--color-tint-accent)' : 'transparent', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--color-chip-text)' : 'var(--color-text-main)' }}
                               >
                                 <span>{cleanAuthorName(p.author_name)} {p.team && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>({p.team})</span>}</span>
                                 {isSelected && <span>✓</span>}
                               </div>
                             );
                           })}
                       </div>
                     </div>
                   )}
                 </div>
               )}
            </div>
          </div>

          {/* 비고 */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-main)' }}>비고</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="내용을 입력해주세요"
              rows={3}
              disabled={isReadOnly || isSubmitting}
              style={{ border: 'none', backgroundColor: 'var(--input-glass-bg)', padding: '1rem', borderRadius: '8px', outline: 'none', resize: 'vertical' }}
            />
          </div>

          {/* Buttons */}
          {!isReadOnly && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" onClick={loadDrafts} disabled={isSubmitting} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '2px solid #1e3a8a', backgroundColor: 'var(--color-panel)', color: '#1e3a8a', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                임시저장함
              </button>
              <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: 'none', backgroundColor: '#1e3a8a', color: '#ffffff', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>
                {isSubmitting ? '처리 중...' : '제출하기'}
              </button>
            </div>
          )}

          {isReadOnly && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" onClick={handleClose} disabled={isSubmitting} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '2px solid var(--color-border)', backgroundColor: 'var(--color-panel)', color: 'var(--color-text-muted)', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>
                목록으로
              </button>
              {initialId && (isAdmin || isAuthor) && (
                <button type="button" onClick={() => setIsReadOnly(false)} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: 'none', backgroundColor: '#1e3a8a', color: '#ffffff', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>
                  수정하기
                </button>
              )}
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
