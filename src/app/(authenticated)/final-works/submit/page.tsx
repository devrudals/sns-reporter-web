'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import RichTextEditor from '@/components/RichTextEditor';
import Link from 'next/link';

function FinalSubmitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const initialId = searchParams?.get('id');

  const [isLoadingProps, setIsLoadingProps] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [availableProposals, setAvailableProposals] = useState<any[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [authorName, setAuthorName] = useState('');
  
  const [formData, setFormData] = useState({
    proposalId: '',
    finalUrl: '',
    postContent: '',
    desiredDate: '',
    discussions: [] as any[],
    uploadedFileUrl: '',
    uploadedFileName: '',
    bgm: '',
    tools: '',
    keywords: '',
    crew: '',
    description: ''
  });
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
         setFormData(prev => ({ ...prev, uploadedFileName: '업로드 오류 (100MB 초과)' }));
         alert('최대 100MB까지만 시스템에 직접 업로드할 수 있습니다.\n용량이 큰 영상은 유튜브나 구글 드라이브 주소를 본문에 삽입해주세요.');
         return;
      }
      
      try {
        setFormData(prev => ({ ...prev, uploadedFileName: '업로드 중...' }));
        
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const path = `${uniqueSuffix}_${sanitizedName}`;

        const uploadPromise = supabase.storage
          .from('final_works')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false
          });

        const timeoutPromise = new Promise<{data: any, error: any}>((resolve) => 
            setTimeout(() => resolve({ data: null, error: { message: '네트워크 상태 지연으로 인해 시간이 초과되었습니다.' } }), 30000)
        );

        const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

        if (error) {
          console.error('Upload Error:', error);
          if (error.message.includes('Bucket not found') || error.message.includes('not exist')) {
             setFormData(prev => ({ ...prev, uploadedFileName: '오류: final_works 버킷 누락' }));
             alert('Supabase 스토리지에 "final_works"라는 이름의 공개(Public) 버킷을 먼저 생성해주세요!');
          } else {
             setFormData(prev => ({ ...prev, uploadedFileName: `업로드 실패: ${error.message}` }));
             alert(`업로드 실패: ${error.message}`);
          }
          return;
        }

        const { data: { publicUrl } } = supabase.storage.from('final_works').getPublicUrl(path);
        
        setFormData(prev => ({ ...prev, uploadedFileUrl: publicUrl, uploadedFileName: file.name }));
      } catch (err: any) {
        console.error('File upload failed:', err);
        setFormData(prev => ({ ...prev, uploadedFileName: `업로드 오류: ${err.message}` }));
      }
    } else {
      setFormData(prev => ({ ...prev, uploadedFileUrl: '', uploadedFileName: '' }));
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userEmail = currentUser?.email;

      const { data: profileRow } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${userEmail}`).single();
      const userName = profileRow?.author_name || currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || null;
      setAuthorName(userName || '이름 없음');

      const { data: props } = await supabase
        .from('contents')
        .select('id, title, author_name, content_type')
        .in('status', ['approved', 'final_submitted', 'revision', 'completed', 'uploaded']);
      
      let allProps = props || [];

      const isAdminFlag = searchParams?.get('admin') === 'true';
      if (!isAdminFlag && userEmail) {
          allProps = allProps.filter(p => 
            p.author_name === userEmail || 
            (userName && p.author_name?.includes(userName))
          );
      }

      if (initialId) {
        const { data: current, error } = await supabase.from('contents').select('*').eq('id', initialId).single();
        if (current) {
          setSelectedProposal(current);
          
          if (!allProps.find(p => p.id.toString() === initialId)) {
            allProps = [{ id: current.id, title: current.title, author_name: current.author_name, content_type: current.content_type }, ...allProps];
          }

          let discussions = [];
          let postContent = '';
          let desiredDate = '';
          let uploadedFileUrl = '';
          let uploadedFileName = '';
          let bgm = '';
          let tools = '';
          let keywords = current.keywords || '';
          let crew = '';
          let description = '';

          try {
            const body = JSON.parse(current.content_body);
            discussions = body.discussions || [];
            postContent = body.postContent || '';
            desiredDate = body.desiredDate || '';
            uploadedFileUrl = body.uploadedFileUrl || '';
            uploadedFileName = body.uploadedFileName || '';
            bgm = body.bgm || '';
            tools = body.tools || '';
            description = body.finalDescription || '';
            
            if (['final_submitted', 'completed', 'uploaded', 'revision'].includes(current.status)) {
                keywords = body.finalKeywords || current.keywords || '';
                crew = body.finalCrew || body.crew || (current.description ? current.description.split(' (참여:')[0] : '');
            } else {
                keywords = current.keywords || '';
                crew = body.crew || (current.description ? current.description.split(' (참여:')[0] : '');
            }
          } catch(e) {}

          setFormData({
            proposalId: current.id.toString(),
            finalUrl: current.final_url || '',
            postContent: postContent,
            desiredDate: desiredDate,
            discussions: discussions,
            uploadedFileUrl: uploadedFileUrl,
            uploadedFileName: uploadedFileName,
            bgm,
            tools,
            keywords,
            crew,
            description
          });

          const isOwn = currentUser && (current.author_name === userEmail || (userName && current.author_name?.includes(userName)));
          
          setIsAuthor(!!isOwn);
          // if it's already submitted (or uploaded), make it readonly initially unless admin/author wants to edit
          setIsReadOnly(['final_submitted', 'completed', 'uploaded'].includes(current.status));
        }
      }

      setAvailableProposals(allProps);
      setIsAdmin(isAdminFlag);
      setIsLoadingProps(false);
    };

    fetchInitialData();
  }, [initialId, searchParams, supabase]);

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
        router.push('/final-works');
        router.refresh();
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !initialId) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${user?.email}`).single();
    const displayName = profile?.author_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Unknown';

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
      uploadedFileUrl: formData.uploadedFileUrl,
      uploadedFileName: formData.uploadedFileName,
      bgm: formData.bgm,
      tools: formData.tools,
      finalKeywords: formData.keywords,
      finalCrew: formData.crew,
      finalDescription: formData.description,
      finalSubmittedAt: bodyData.finalSubmittedAt || new Date().toISOString()
    };

    const targetStatus = isDraft ? 'approved' : 'final_submitted'; // 임시저장이면 상태 유지 (approved), 제출이면 final_submitted

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
      alert(isDraft ? '임시저장 되었습니다.' : '완성본이 성공적으로 제출되었습니다.');
      router.push('/final-works');
      router.refresh();
    }
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (isLoadingProps) return <div className="container">데이터 불러오는 중...</div>;

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', padding: '3rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>완성본</h2>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
              작성자: {authorName} / {new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '')}
            </div>
          </div>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="flex-col gap-6">
          {/* 기획안 선택 (선택 시 해당 정보 표시용) */}
          <div className="flex-col gap-2" style={{ display: initialId ? 'none' : 'flex' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>대상 기획안 선택</label>
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
                             keywords: prev.keywords || data.keywords || '',
                             crew: prev.crew || body.crew || (data.description ? data.description.split(' (참여:')[0] : '')
                          }));
                       } catch(e) {}
                    });
                 } else {
                    setSelectedProposal(null);
                 }
              }}
              required
              style={{ border: 'none', backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '8px', fontSize: '1rem', outline: 'none' }}
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
                  <div style={{ position: 'relative', width: '100%', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
                    {/* Cover image or Embed */}
                    <div style={{ width: '100%', height: '300px', backgroundColor: '#e2e8f0', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '16px' }}>
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
                    <div style={{ paddingTop: '1.5rem', backgroundColor: '#ffffff' }}>
                      <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>{selectedProposal.title}</h3>
                      <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.8rem', fontWeight: 500 }}>
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
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>구글 드라이브 / 유튜브 링크 <span style={{color: '#ef4444'}}>*</span></label>
            <input 
              type="url" 
              name="finalUrl" 
              value={formData.finalUrl} 
              onChange={handleChange} 
              placeholder="내용을 입력해주세요" 
              required 
              disabled={isReadOnly || isSubmitting} 
              style={{ border: 'none', backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '8px', fontSize: '1rem', outline: 'none' }} 
            />
          </div>

          {/* 본문 / 캡션 내용 */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>본문 / 캡션 내용</label>
            <div style={{ backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '0.5rem', border: 'none' }}>
                <RichTextEditor 
                  value={formData.postContent} 
                  onChange={(val) => setFormData({...formData, postContent: val})} 
                  placeholder="내용을 입력해주세요" 
                  disabled={isReadOnly || isSubmitting} 
                  minHeight="150px" 
                />
            </div>
          </div>

          {/* 배경 음악 */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>배경 음악</label>
            <input 
              type="text" 
              name="bgm" 
              value={formData.bgm} 
              onChange={handleChange} 
              placeholder="내용을 입력해주세요" 
              disabled={isReadOnly || isSubmitting} 
              style={{ border: 'none', backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '8px', fontSize: '1rem', outline: 'none' }} 
            />
          </div>

          {/* 사용툴 / 템플릿 출처 */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>사용툴 / 템플릿 출처</label>
            <input 
              type="text" 
              name="tools" 
              value={formData.tools} 
              onChange={handleChange} 
              placeholder="내용을 입력해주세요" 
              disabled={isReadOnly || isSubmitting} 
              style={{ border: 'none', backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '8px', fontSize: '1rem', outline: 'none' }} 
            />
          </div>

          {/* 해시태그 */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>#해시태그</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f3f4f6', padding: '0.5rem', borderRadius: '8px' }}>
              <div style={{ backgroundColor: '#1e3a8a', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
              <input type="text" name="keywords" value={formData.keywords} onChange={handleChange} placeholder="여기에 있는 해시태그는 기획안에서 불러오기..." disabled={isReadOnly || isSubmitting} style={{ border: 'none', backgroundColor: 'transparent', flex: 1, outline: 'none', fontSize: '0.9rem' }} />
            </div>
            {formData.keywords && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                {formData.keywords.split(' ').map(kw => kw.trim()).filter(Boolean).map((kw, i) => (
                  <span key={i} style={{ backgroundColor: '#93c5fd', color: '#1e3a8a', padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {kw} 
                    {!isReadOnly && !isSubmitting && (
                        <button type="button" onClick={() => {
                            const newKws = formData.keywords.split(' ').filter(k => k.trim() !== kw).join(' ');
                            setFormData({...formData, keywords: newKws});
                        }} style={{ background: 'none', border: 'none', color: '#1e3a8a', cursor: 'pointer', padding: 0, fontSize: '12px' }}>✕</button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 제작 인원 */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>제작 인원 (자동완성, 수정가능하도록 접근 오픈)</label>
            <input 
              type="text" 
              name="crew" 
              value={formData.crew} 
              onChange={handleChange} 
              placeholder="내용을 입력해주세요" 
              disabled={isReadOnly || isSubmitting} 
              style={{ border: 'none', backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '8px', fontSize: '1rem', outline: 'none' }} 
            />
          </div>

          {/* 비고 */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>비고</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              placeholder="내용을 입력해주세요" 
              rows={3} 
              disabled={isReadOnly || isSubmitting} 
              style={{ border: 'none', backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '8px', outline: 'none', resize: 'vertical' }} 
            />
          </div>

          {/* 직접 첨부 (옵션) */}
          <div className="flex-col gap-2" style={{ display: isReadOnly && !formData.uploadedFileUrl ? 'none' : 'flex' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>파일 직접 첨부 (선택 사항)</label>
            {!isReadOnly && (
              <input 
                type="file" 
                onChange={handleFileChange}
                disabled={isSubmitting}
                style={{ padding: '1rem', border: '1px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#f3f4f6', width: '100%', outline: 'none' }}
              />
            )}
            {formData.uploadedFileName && (
              <div style={{ marginTop: '0.5rem' }}>
                {formData.uploadedFileName.includes('업로드 중') ? (
                  <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>⏳ {formData.uploadedFileName}</span>
                ) : formData.uploadedFileName.includes('오류') || formData.uploadedFileName.includes('실패') ? (
                  <span style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 600 }}>❌ {formData.uploadedFileName}</span>
                ) : formData.uploadedFileUrl ? (
                  <a 
                    href={formData.uploadedFileUrl} 
                    download={formData.uploadedFileName} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ fontSize: '0.95rem', color: '#0ea5e9', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', borderRadius: '8px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', textDecoration: 'none', fontWeight: 600 }}
                  >
                    💾 첨부된 파일: {formData.uploadedFileName}
                  </a>
                ) : null}
              </div>
            )}
          </div>

          {/* 실시간 논의 공간 (채팅) */}
          {initialId && (isAdmin || isAuthor) && (
            <div style={{ marginTop: '1rem', borderTop: '2px solid #e2e8f0', paddingTop: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                💬 실시간 논의 공간
                <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#94a3b8' }}>작성자와 관리자만 볼 수 있습니다.</span>
              </h3>
              
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '1rem', minHeight: '200px', maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                {formData.discussions.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '2rem' }}>아직 대화 내용이 없습니다.</div>
                ) : (
                  formData.discussions.map((msg) => (
                    <div key={msg.id} style={{ alignSelf: msg.role === (isAdmin ? 'admin' : 'writer') ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                      <div style={{ fontSize: '0.75rem', marginBottom: '0.2rem', color: '#64748b', textAlign: msg.role === (isAdmin ? 'admin' : 'writer') ? 'right' : 'left' }}>
                        {msg.author} ({msg.role === 'admin' ? '관리자' : '글쓴이'})
                      </div>
                      <div style={{ backgroundColor: msg.role === 'admin' ? '#1e3a8a' : 'white', color: msg.role === 'admin' ? 'white' : '#0f172a', padding: '0.7rem 1rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '0.9rem', whiteSpace: 'pre-wrap', border: msg.role !== 'admin' ? '1px solid #e2e8f0' : 'none' }}>
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <textarea 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  placeholder="의견을 입력하세요... (Enter로 전송)"
                  style={{ flex: 1, minHeight: '50px', maxHeight: '100px', padding: '0.7rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
                />
                <button 
                  type="button" 
                  onClick={handleAddComment}
                  style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '0 1.5rem', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                >
                  전송
                </button>
              </div>
            </div>
          )}

          {/* Buttons */}
          {!isReadOnly && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" onClick={(e) => handleSubmit(e, true)} disabled={isSubmitting} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '2px solid #1e3a8a', backgroundColor: '#ffffff', color: '#1e3a8a', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>
                임시저장
              </button>
              <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: 'none', backgroundColor: '#1e3a8a', color: '#ffffff', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>
                {isSubmitting ? '처리 중...' : '제출하기'}
              </button>
            </div>
          )}

          {isReadOnly && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => router.back()} disabled={isSubmitting} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '2px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>
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

export default function FinalWorksSubmitPage() {
    return (
        <Suspense fallback={<div>로딩 중...</div>}>
            <FinalSubmitForm />
        </Suspense>
    );
}
