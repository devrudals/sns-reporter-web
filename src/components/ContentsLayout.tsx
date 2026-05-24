'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import FinalSubmitForm from '@/components/FinalSubmitForm';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import RichTextEditor from '@/components/RichTextEditor';
import ModalLink from '@/components/ModalLink';
import AdminStatusManager from '@/components/AdminStatusManager';


// Helper to parse simple markdown to HTML (Bold, Italic, Strikethrough, Safe Links)
const parseCommentMarkdown = (text: string): string => {
  if (!text) return '';
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 800 !important; display: inline;">$1</strong>');
  escaped = escaped.replace(/__(.*?)__/g, '<strong style="font-weight: 800 !important; display: inline;">$1</strong>');
  escaped = escaped.replace(/\*(.*?)\*/g, '<em style="font-style: italic !important; display: inline;">$1</em>');
  escaped = escaped.replace(/_(.*?)_/g, '<em style="font-style: italic !important; display: inline;">$1</em>');
  escaped = escaped.replace(/~~(.*?)~~/g, '<del style="text-decoration: line-through !important; display: inline;">$1</del>');
  escaped = escaped.replace(/\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #3B82F6; font-weight: 700; text-decoration: underline;">$1</a>');
  escaped = escaped.replace(/\n/g, '<br />');
  return escaped;
};

// Helper to get all replies for a given root comment recursively, ordered flat for Thread layout
const getAllReplies = (rootId: number, allComments: any[]): any[] => {
  const result: any[] = [];
  const traverse = (parentId: number, currentDepth: number) => {
    const children = allComments.filter((c: any) => c.parentId === parentId);
    // Sort children by createdAt/id to keep chronological order
    children.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const child of children) {
      result.push({
        ...child,
        depth: currentDepth
      });
      traverse(child.id, currentDepth + 1);
    }
  };
  traverse(rootId, 1);
  return result;
};

type ContentItem = {
  id: number;
  title: string;
  author_name: string;
  team: string;
  content_type: string;
  status: string;
  created_at: string;
  final_url?: string;
  isMine: boolean;
  parsedCrew: string;
  articleType: string;
  docsUrl: string;
  targetMonth: string;
  finalSubmittedAt: string;
  content_body: string;
  keywords?: string;
  intent?: string;
  description?: string;
};

export default function ContentsLayout({ 
  initialContents = [], 
  currentUserEmail: initialUserEmail = null, 
  currentUserName: initialUserName = null,
  openModalId,
  modalOnly = false,
  onModalClose
}: { 
  initialContents?: ContentItem[], 
  currentUserEmail?: string | null,
  currentUserName?: string | null,
  openModalId?: number,
  modalOnly?: boolean,
  onModalClose?: () => void
}) {
  const router = useRouter();
  const supabase = createClient();

  const [contentsList, setContentsList] = useState<ContentItem[]>(initialContents);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [filterType, setFilterType] = useState('ALL');
  const [filterByMine, setFilterByMine] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(initialUserEmail);
  const [currentUserName, setCurrentUserName] = useState<string | null>(initialUserName);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      if (!initialUserEmail) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserEmail(user.email || null);
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (profile) setCurrentUserName(profile.name || profile.author_name || null);
        }
      } else {
        setCurrentUserEmail(initialUserEmail);
        setCurrentUserName(initialUserName);
      }
    }
    fetchUser();
  }, [initialUserEmail, initialUserName, supabase]);

  // Pagination & Unsubmitted Modal States
  const [showUnsubmittedModal, setShowUnsubmittedModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Keep a ref so the openModalId effect can read the latest list without re-running on every list change
  const contentsListRef = React.useRef(contentsList);
  useEffect(() => { contentsListRef.current = contentsList; }, [contentsList]);

  useEffect(() => {
    if (!openModalId) return;
    // Search in the latest list snapshot
    const target =
      contentsListRef.current.find(c => c.id === openModalId) ||
      (initialContents ?? []).find(c => c.id === openModalId);
    if (target) {
      setSelectedContent(target);
      setIsModalOpen(true);
    } else {
      const fetchItem = async () => {
        const { data } = await supabase.from('contents').select('*').eq('id', openModalId).single();
        if (data) {
          setSelectedContent(data);
          setIsModalOpen(true);
        }
      };
      fetchItem();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openModalId]); // only re-run when the requested ID changes

  const [isFinalWorkView, setIsFinalWorkView] = useState(false);
  
  // Comments editing and Rich Features
  const [newComment, setNewComment] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [isSecretComment, setIsSecretComment] = useState(false);
  useEffect(() => {
    if (isGlobalAdmin || currentUserEmail?.includes('admin')) {
      setIsSecretComment(true);
    }
  }, [isGlobalAdmin, currentUserEmail]);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyComment, setReplyComment] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [replyAttachedImage, setReplyAttachedImage] = useState<string | null>(null);
  const [attachedLinkUrl, setAttachedLinkUrl] = useState('');
  const [attachedLinkText, setAttachedLinkText] = useState('');
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReplyEmojiPicker, setShowReplyEmojiPicker] = useState<number | null>(null);
  
  // Proposal editing
  const [tempFormData, setTempFormData] = useState({
    title: '',
    team: '',
    targetMonth: '',
    articleType: '',
    contentType: '',
    crew: '',
    docsUrl: '',
    intent: '',
    composition: '',
    contentBody: '',
    keywords: '',
    desiredDate: '',
    deadline: '',
    description: '',
    status: '',
    timeliness: '상관없음'
  });
  const [isSavingProposal, setIsSavingProposal] = useState(false);
  const [isEditingProposal, setIsEditingProposal] = useState(false);
  const [isEditingFinalWork, setIsEditingFinalWork] = useState(false);
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [allProfiles, setAllProfiles] = useState<any[]>([]);

  // NOTE: initialContents is only passed once from a Server Component parent,
  // so no sync effect is needed. Local mutations (comments, edits) update
  // contentsList directly via setContentsList calls throughout this component.

  // Load profiles for member search — stable ref prevents re-triggering
  const supabaseRef = React.useRef(supabase);
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabaseRef.current.from('contents').select('author_name, team, keywords').like('title', 'PROFILE_%');
      if (data) {
        setAllProfiles(data);
      }
    };
    fetchProfiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Copy to tempFormData when selectedContent is loaded/changed
  // Use .id as dep to avoid re-triggering on new object references with same data
  const selectedContentId = selectedContent?.id ?? null;
  useEffect(() => {
    if (selectedContent) {
      let bodyObj: any = {};
      try {
        bodyObj = JSON.parse(selectedContent.content_body || '{}');
      } catch (e) {}
      
      setTempFormData({
        title: selectedContent.title || '',
        team: selectedContent.team || '',
        targetMonth: bodyObj.targetMonth || selectedContent.targetMonth || '',
        articleType: selectedContent.articleType || '',
        contentType: selectedContent.content_type || '',
        crew: bodyObj.crew || selectedContent.parsedCrew || '',
        docsUrl: bodyObj.docsUrl || selectedContent.docsUrl || '',
        intent: bodyObj.intent || '',
        composition: bodyObj.composition || '',
        contentBody: bodyObj.contentBody || '',
        keywords: selectedContent.keywords || '',
        desiredDate: bodyObj.desiredDate || '',
        deadline: bodyObj.deadline || '',
        description: selectedContent.description || '',
        status: selectedContent.status || '',
        timeliness: bodyObj.timeliness || '상관없음'
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContentId]); // only re-run when the selected item actually changes

  
  const canViewSecret = (msg: any) => {
    if (!msg.isSecret) return true;
    const authorName = selectedContent?.author_name || '';
    
    // Parse crew
    const crewStr = (() => {
      try {
        return JSON.parse(selectedContent?.content_body || '{}').crew || '';
      } catch (e) { return ''; }
    })();

    const currentUserFullName = currentUserName || '';
    const isAdmin = currentUserEmail === 'admin';
    return isAdmin || (currentUserFullName && (authorName.includes(currentUserFullName) || crewStr.includes(currentUserFullName))) || (currentUserEmail && crewStr.includes(currentUserEmail));
  };

  // Comments addition logic
  const handleAddComment = async (parentId: number | null = null, replyText: string = '', isReply: boolean = false) => {
    const textToSend = isReply ? replyText : newComment;
    const imgToSend = isReply ? replyAttachedImage : attachedImage;
    
    if (!textToSend.trim() && !imgToSend) return;
    
    if (!isReply) {
      setIsSavingComment(true);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${user?.email}`).single();
      const displayName = profile?.author_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '익명 크루';

      let emailInJson = '';
      try {
        emailInJson = JSON.parse(selectedContent!.content_body).authorEmail;
      } catch (e) {}
      
      const isAuthor = user && (emailInJson === user.email || selectedContent!.author_name === user.email || (displayName && selectedContent!.author_name?.includes(displayName)));
      const isAdmin = currentUserEmail === 'admin@ymc.com' || user?.email?.includes('admin');

      const messageAttachment = imgToSend ? [{ type: 'image' as const, url: imgToSend }] : [];

      const message = {
        id: Date.now(),
        parentId: parentId, // 부모 댓글 ID
        type: isFinalWorkView ? ('final' as const) : ('proposal' as const), // 기획안 피드백 / 완성본 피드백 구분
        role: isAdmin ? ('admin' as const) : (isAuthor ? ('writer' as const) : ('crew' as const)),
        text: textToSend,
        createdAt: new Date().toISOString(),
        author: displayName,
        likes: 0,
        likedBy: [] as string[],
        attachments: messageAttachment,
        isSecret: isSecretComment
      };

      let bodyObj: any = {};
      try {
        bodyObj = JSON.parse(selectedContent!.content_body || '{}');
      } catch (e) {}

      const updatedDiscussions = [...(bodyObj.discussions || []), message];
      const updatedBody = {
        ...bodyObj,
        discussions: updatedDiscussions
      };

      const { error } = await supabase
        .from('contents')
        .update({
          content_body: JSON.stringify(updatedBody)
        })
        .eq('id', selectedContent!.id);

      if (error) {
        alert('피드백 저장에 실패했습니다: ' + error.message);
      } else {
        const updatedItem = {
          ...selectedContent!,
          content_body: JSON.stringify(updatedBody)
        };
        
        setContentsList(prev => prev.map(item => item.id === selectedContent!.id ? updatedItem : item));
        setSelectedContent(updatedItem);
        
        if (isReply) {
          setReplyComment('');
          setReplyAttachedImage(null);
          setActiveReplyId(null);
        } else {
          setNewComment('');
          setAttachedImage(null);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('오류가 발생했습니다: ' + err.message);
    } finally {
      setIsSavingComment(false);
    }
  };

  // Comments Like Toggle logic
  const handleToggleLike = async (commentId: number) => {
    if (!selectedContent) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || 'anonymous';
      
      let bodyObj: any = {};
      try {
        bodyObj = JSON.parse(selectedContent.content_body || '{}');
      } catch (e) {}

      const discussions = bodyObj.discussions || [];
      const updatedDiscussions = discussions.map((msg: any) => {
        if (msg.id === commentId) {
          const likedBy = msg.likedBy || [];
          const hasLiked = likedBy.includes(userEmail);
          let newLikedBy = [];
          if (hasLiked) {
            newLikedBy = likedBy.filter((email: string) => email !== userEmail);
          } else {
            newLikedBy = [...likedBy, userEmail];
          }
          return {
            ...msg,
            likedBy: newLikedBy,
            likes: newLikedBy.length
          };
        }
        return msg;
      });

      const updatedBody = {
        ...bodyObj,
        discussions: updatedDiscussions
      };

      const { error } = await supabase
        .from('contents')
        .update({
          content_body: JSON.stringify(updatedBody)
        })
        .eq('id', selectedContent.id);

      if (error) {
        console.error('좋아요 저장 실패:', error.message);
      } else {
        const updatedItem = {
          ...selectedContent,
          content_body: JSON.stringify(updatedBody)
        };
        setContentsList(prev => prev.map(item => item.id === selectedContent.id ? updatedItem : item));
        setSelectedContent(updatedItem);
      }
    } catch (err) {
      console.error('좋아요 토글 오류:', err);
    }
  };

  // Helper to insert markdown or emoji at textarea cursor, supporting wrapping of selected text!
  const insertTextAtCursor = (markupType: 'bold' | 'italic' | 'strikethrough' | string, isReply: boolean = false) => {
    const targetId = isReply ? `reply-textarea-${activeReplyId}` : 'main-comment-textarea';
    const textarea = document.getElementById(targetId) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentVal = isReply ? replyComment : newComment;
      
      let textToInsert = '';
      let selectionOffset = 0;
      let selectionLength = 0;

      const selectedText = currentVal.substring(start, end);

      if (markupType === 'bold') {
        textToInsert = `**${selectedText || '텍스트'}**`;
        selectionOffset = 2;
        selectionLength = selectedText ? selectedText.length : 3; // "텍스트" length is 3
      } else if (markupType === 'italic') {
        textToInsert = `*${selectedText || '텍스트'}*`;
        selectionOffset = 1;
        selectionLength = selectedText ? selectedText.length : 3;
      } else if (markupType === 'strikethrough') {
        textToInsert = `~~${selectedText || '텍스트'}~~`;
        selectionOffset = 2;
        selectionLength = selectedText ? selectedText.length : 3;
      } else {
        // Plain text (emoji or link)
        textToInsert = markupType;
        selectionOffset = markupType.length;
        selectionLength = 0;
      }

      const newVal = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);
      
      if (isReply) {
        setReplyComment(newVal);
      } else {
        setNewComment(newVal);
      }

      setTimeout(() => {
        textarea.focus();
        if (markupType === 'bold' || markupType === 'italic' || markupType === 'strikethrough') {
          // Select the wrapped text (either the original selected text or the default "텍스트")
          textarea.setSelectionRange(start + selectionOffset, start + selectionOffset + selectionLength);
        } else {
          textarea.setSelectionRange(start + selectionOffset, start + selectionOffset);
        }
      }, 10);
    } else {
      let textToInsert = '';
      if (markupType === 'bold') textToInsert = '**텍스트**';
      else if (markupType === 'italic') textToInsert = '*텍스트*';
      else if (markupType === 'strikethrough') textToInsert = '~~텍스트~~';
      else textToInsert = markupType;

      if (isReply) {
        setReplyComment(prev => prev + textToInsert);
      } else {
        setNewComment(prev => prev + textToInsert);
      }
    }
  };


  // Helper to handle image files and convert them to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isReply: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('이미지 크기는 최대 2MB까지 허용됩니다.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isReply) {
          setReplyAttachedImage(reader.result as string);
        } else {
          setAttachedImage(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Proposal edit saving logic
  const handleSaveProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContent) return;
    setIsSavingProposal(true);

    try {
      const crewCount = tempFormData.crew ? tempFormData.crew.split(',').map(s => s.trim()).filter(Boolean).length : 0;
      const computedArticleType = crewCount > 1 ? '팀기사' : '개인기사';

      let bodyObj: any = {};
      try {
        bodyObj = JSON.parse(selectedContent.content_body || '{}');
      } catch (e) {}

      const updatedBody = {
        ...bodyObj,
        ...tempFormData,
        articleType: computedArticleType,
        crew: tempFormData.crew
      };

      const payload = {
        title: tempFormData.title,
        team: tempFormData.team,
        content_type: tempFormData.contentType,
        keywords: tempFormData.keywords,
        intent: tempFormData.intent,
        description: tempFormData.description,
        content_body: JSON.stringify(updatedBody)
      };

      const { error } = await supabase
        .from('contents')
        .update(payload)
        .eq('id', selectedContent.id);

      if (error) {
        alert('기획안 저장에 실패했습니다: ' + error.message);
      } else {
        alert('기획안이 성공적으로 수정되었습니다.');
        
        const updatedItem = {
          ...selectedContent,
          ...payload,
          articleType: computedArticleType,
          parsedCrew: tempFormData.crew,
          docsUrl: tempFormData.docsUrl
        };
        
        setContentsList(prev => prev.map(item => item.id === selectedContent.id ? updatedItem : item));
        setSelectedContent(updatedItem);
      }
    } catch (err: any) {
      console.error(err);
      alert('오류가 발생했습니다: ' + err.message);
    } finally {
      setIsSavingProposal(false);
    }
  };

  const displayContents = useMemo(() => {
    let result = [...contentsList];

    // Filter by Selected Month & Year
    const pad = (n: number) => String(n).padStart(2, '0');
    const monthPrefix = `${selectedYear}-${pad(selectedMonth)}`;
    result = result.filter(item => {
      const dateStr = item.created_at ? item.created_at.split('T')[0] : '';
      let bodyObj: any = {};
      try { bodyObj = JSON.parse(item.content_body || '{}'); } catch {}
      const cMonth = bodyObj.targetMonth || item.targetMonth || dateStr.substring(0, 7);
      return cMonth === monthPrefix;
    });

    if (filterByMine) {
      result = result.filter(item => item.isMine);
    }
    if (filterType !== 'ALL') {
      result = result.filter(item => item.content_type === filterType || item.team === filterType);
    }
    
    if (sortConfig) {
      result = result.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';
        if (sortConfig.key === 'channel') { valA = a.team; valB = b.team; }
        else if (sortConfig.key === 'type') { valA = a.content_type; valB = b.content_type; }
        else if (sortConfig.key === 'title') { valA = a.title; valB = b.title; }
        else if (sortConfig.key === 'crew') { valA = a.parsedCrew || a.author_name; valB = b.parsedCrew || b.author_name; }
        else if (sortConfig.key === 'articleType') { valA = a.articleType; valB = b.articleType; }
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [contentsList, filterByMine, filterType, sortConfig, selectedYear, selectedMonth]);

  const groupedContents = useMemo(() => {
     if (sortConfig) {
       return { groups: { '전체 정렬 목록': displayContents }, sortedKeys: ['전체 정렬 목록'] };
     }
     const groups: Record<string, ContentItem[]> = {};
     displayContents.forEach(item => {
        let monthStr = item.targetMonth;
        if (!monthStr) {
          const d = new Date(item.created_at);
          monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        const [y, m] = monthStr.split('-');
        const groupKey = `${y.slice(2)}-${parseInt(m, 10)}`;
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(item);
     });
     // Sort keys descending (e.g. 26-1 -> 25-12 -> 25-11)
     const sortedKeys = Object.keys(groups).sort((a, b) => {
         const [yA, mA] = a.split('-').map(Number);
         const [yB, mB] = b.split('-').map(Number);
         if (yA !== yB) return yB - yA;
         return mB - mA;
     });
     return { groups, sortedKeys };
  }, [displayContents]);

  const getTypeStyle = (typeStr: string) => {
    switch(typeStr) {
      case '영상(롱폼)': return { bg: '#1e3a8a', text: '#ffffff', label: '롱폼' };
      case '영상(숏폼)': return { bg: '#2563eb', text: '#ffffff', label: '숏폼' };
      case '카드뉴스': return { bg: '#0284c7', text: '#ffffff', label: '카드뉴스' };
      case '글 기사': 
      case '기사': return { bg: '#16a34a', text: '#ffffff', label: '기사' };
      default: return { bg: '#64748b', text: '#ffffff', label: typeStr || '기타' };
    }
  };

  const getTeamPlatformIcon = (team: string) => {
    if (team === '유튜브') {
      return (
        <div style={{ width: '24px', height: '24px', backgroundColor: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg fill="#ffffff" viewBox="0 0 24 24" width="12" height="12">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </div>
      );
    }
    if (team === '인스타') {
      return (
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
        </div>
      );
    }
    if (team === '블로그') {
      return (
        <div style={{ width: '24px', height: '24px', backgroundColor: '#03c75a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', fontFamily: 'serif', marginTop: '-2px' }}>b</span>
        </div>
      );
    }
    return <div style={{ width: '24px', height: '24px', backgroundColor: '#94a3b8', borderRadius: '50%' }}></div>;
  };

  const getProgressState = (status: string) => {
    if (status === 'uploaded') return ['green', 'green', 'green'];
    if (status === 'completed') return ['green', 'green', 'white']; 
    if (status === 'final_revision') return ['green', 'yellow', 'white'];
    if (['final_submitted', 'approved'].includes(status)) return ['green', 'white', 'white'];
    if (status === 'revision') return ['yellow', 'white', 'white'];
    return ['white', 'white', 'white']; 
  };

  const ProgressCircles = ({ status }: { status: string }) => {
    const states = getProgressState(status);
    
    return (
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
        {states.map((s, i) => (
          <div key={i} style={{
            width: '18px', height: '18px',
            borderRadius: '50%',
            backgroundColor: s === 'green' ? '#059669' : s === 'yellow' ? '#fbbf24' : '#ffffff',
            border: s === 'white' ? '1px solid #cbd5e1' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
          }}>
            {s === 'yellow' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="5" y1="12" x2="19" y2="12"></line></svg>}
          </div>
        ))}
      </div>
    );
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    const yy = d.getFullYear().toString().slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}/${mm}/${dd}`;
  };

  const hasDiscussions = (bodyStr: string) => {
    try {
      const obj = JSON.parse(bodyStr);
      return obj.discussions && obj.discussions.length > 0;
    } catch(e) { return false; }
  };

  const getDiscussionsCount = (bodyStr: string) => {
    try {
      const obj = JSON.parse(bodyStr);
      return obj.discussions && obj.discussions.length > 0 ? obj.discussions.length : 0;
    } catch(e) { return 0; }
  };

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

  return (
    <div style={modalOnly ? { display: 'none' } : { display: 'flex', gap: '20px', height: 'calc(100vh - 80px)', backgroundColor: '#f3f4f6', padding: '20px' }}>
      
      {/* Left Pane - List */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={() => {
                  let m = selectedMonth - 1;
                  let y = selectedYear;
                  if (m < 1) { m = 12; y--; }
                  setSelectedMonth(m);
                  setSelectedYear(y);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              
              <div style={{ position: 'relative' }}>
                <h2 
                  onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                  style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', whiteSpace: 'nowrap', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {selectedMonth}월 콘텐츠 목록
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showMonthDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </h2>
                
                {/* Month Dropdown */}
                {showMonthDropdown && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowMonthDropdown(false)} />
                    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50, display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', backgroundColor: '#f8fafc', fontWeight: 600, color: '#334155' }}
                      >
                        {[...Array(5)].map((_, i) => {
                          const y = new Date().getFullYear() - 2 + i;
                          return <option key={y} value={y}>{y}년</option>;
                        })}
                      </select>
                      <select 
                        value={selectedMonth} 
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', backgroundColor: '#f8fafc', fontWeight: 600, color: '#334155' }}
                      >
                        {[...Array(12)].map((_, i) => (
                          <option key={i+1} value={i+1}>{i+1}월</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => setShowMonthDropdown(false)}
                        style={{ backgroundColor: '#1e3a8a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        목록 보기
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button 
                onClick={() => {
                  let m = selectedMonth + 1;
                  let y = selectedYear;
                  if (m > 12) { m = 1; y++; }
                  setSelectedMonth(m);
                  setSelectedYear(y);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>

            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', backgroundColor: '#f8fafc', fontWeight: 600, color: '#334155', marginLeft: '8px' }}
            >
              <option value="ALL">ALL</option>
              <option value="유튜브">유튜브</option>
              <option value="인스타">인스타</option>
              <option value="블로그">블로그</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#1e3a8a', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={filterByMine} onChange={(e) => setFilterByMine(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#1e3a8a' }}/>
              내 콘텐츠만 보기
            </label>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <ModalLink href="/proposals/submit" style={{ backgroundColor: '#ffffff', color: '#1e3a8a', border: '1.5px solid #1e3a8a', padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              + 새 기획안 작성
            </ModalLink>
            <button 
              onClick={() => setShowUnsubmittedModal(true)}
              style={{ backgroundColor: '#1e3a8a', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
            >
              + 새 완성본 등록
            </button>
          </div>
        </div>

        {/* List Header Row */}
        <div style={{ display: 'flex', padding: '12px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', gap: '10px' }}>
          <div style={{ width: '24px' }}></div>
          <div onClick={() => handleSort('channel')} style={{ width: '40px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>채널 {sortConfig?.key === 'channel' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</div>
          <div onClick={() => handleSort('type')} style={{ width: '60px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>유형 {sortConfig?.key === 'type' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</div>
          <div onClick={() => handleSort('title')} style={{ flex: '2', cursor: 'pointer', userSelect: 'none' }}>제목 {sortConfig?.key === 'title' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</div>
          <div onClick={() => handleSort('crew')} style={{ flex: '1', cursor: 'pointer', userSelect: 'none' }}>참여인원 {sortConfig?.key === 'crew' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</div>
          <div onClick={() => handleSort('articleType')} style={{ width: '60px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>기사 {sortConfig?.key === 'articleType' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</div>
          <div style={{ width: '80px', textAlign: 'center' }}>작성일</div>
          <div style={{ width: '60px', textAlign: 'center' }}>피드백</div>
          <div style={{ width: '80px', textAlign: 'center' }}>진척도</div>
        </div>

        {/* List Body */}
        <div style={{ flex: '1', overflowY: 'auto', backgroundColor: '#ffffff' }}>
          {displayContents.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>해당하는 콘텐츠가 없습니다.</div>
          ) : (
            <div style={{ padding: '0 24px 24px 24px' }}>
              {groupedContents.sortedKeys.map(groupKey => (
                <div key={groupKey} style={{ marginTop: '20px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa', marginBottom: '8px', paddingLeft: '8px' }}>
                    {groupKey}
                  </div>
                  <div style={{ borderTop: '2px solid #e0e7ff', paddingTop: '8px' }}>
                    {groupedContents.groups[groupKey].map(item => {
                      const typeStyle = getTypeStyle(item.content_type);
                      const isSelected = selectedContent?.id === item.id;
                      
                      const mainAuthor = item.author_name;
                      const allCrew = item.parsedCrew ? item.parsedCrew.split(',').map(s => s.trim()).filter(Boolean) : [mainAuthor];
                      const others = allCrew.filter(c => c !== mainAuthor);
                      
                      return (
                        <div 
                          key={item.id} 
                          onClick={() => setSelectedContent(item)}
                          onDoubleClick={() => {
                            setSelectedContent(item);
                            setIsModalOpen(true);
                            setIsFinalWorkView(false);
    setIsEditingProposal(false);
                          }}
                          style={{ 
                            display: 'flex', padding: '12px 8px', borderBottom: '1px solid #f1f5f9', gap: '10px', 
                            alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s',
                            backgroundColor: isSelected ? '#f0f9ff' : 'transparent',
                            borderRadius: '8px'
                          }}
                          onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#f8fafc')}
                          onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <div style={{ width: '24px', display: 'flex', alignItems: 'center' }}>
                            <input type="checkbox" onClick={(e) => e.stopPropagation()} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#1e3a8a' }} />
                          </div>
                          <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                            {getTeamPlatformIcon(item.team)}
                          </div>
                          <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                            <span style={{ backgroundColor: typeStyle.bg, color: typeStyle.text, padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {typeStyle.label}
                            </span>
                          </div>
                          <div style={{ flex: '2', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem' }}>
                            {item.title}
                          </div>
                          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
                            {item.articleType === '개인기사' ? (
                              <span style={{ fontSize: '0.85rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <strong style={{ fontWeight: 800 }}>{mainAuthor}</strong>
                              </span>
                            ) : (
                              <>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {item.team}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  <strong style={{ fontWeight: 800 }}>{mainAuthor}</strong>{others.length > 0 ? `, ${others.join(', ')}` : ''}
                                </span>
                              </>
                            )}
                          </div>
                          <div style={{ width: '60px', textAlign: 'center', fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
                            {item.articleType || '개인기사'}
                          </div>
                          <div style={{ width: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <div style={{ fontSize: '0.7rem', color: '#1e3a8a', backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, width: '100%', textAlign: 'center' }}>
                              기 {formatDate(item.created_at)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: item.finalSubmittedAt ? '#059669' : '#94a3b8', backgroundColor: item.finalSubmittedAt ? '#ecfdf5' : '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, width: '100%', textAlign: 'center' }}>
                              완 {item.finalSubmittedAt ? formatDate(item.finalSubmittedAt) : '-'}
                            </div>
                          </div>
                          <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: '32px', height: '24px', border: '1px solid #cbd5e1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: getDiscussionsCount(item.content_body) > 0 ? '#f0f9ff' : 'transparent', color: getDiscussionsCount(item.content_body) > 0 ? '#3b82f6' : '#cbd5e1', fontSize: '0.85rem', fontWeight: 800 }}>
                              {getDiscussionsCount(item.content_body)}
                            </div>
                          </div>
                          <div style={{ width: '80px', display: 'flex', justifyContent: 'center' }}>
                            <ProgressCircles status={item.status} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane - Accordions Stacked & Popup Modals */}
      <div style={{ width: '420px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '100%' }}>
        <style>{`
          .hover-card {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          .hover-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 30px rgba(0, 0, 0, 0.08) !important;
            border-color: #CBD5E1 !important;
          }
          .hover-underline:hover {
            text-decoration: underline !important;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        {!selectedContent ? (
          <div style={{ flex: '1', backgroundColor: '#ffffff', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '20px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.5 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
            리스트에서 콘텐츠를 선택하면<br/>상세 내용이 표시됩니다.
          </div>
        ) : (() => {
            let bodyObj: any = {};
            try { bodyObj = JSON.parse(selectedContent.content_body || '{}'); } catch(e) {}
            const discussions = bodyObj.discussions || [];
            
            const activeComments = discussions.filter((msg: any) => 
              isFinalWorkView ? msg.type === 'final' : (msg.type === 'proposal' || !msg.type)
            );
            const rootComments = activeComments.filter((msg: any) => msg.parentId === null || msg.parentId === undefined);

            // Recursive Comment Node Renderer for Nested Replies (Infinite Depth Support via Flat List)
            const renderCommentNode = (comment: any, depth: number, hasReplies: boolean, isLastChild: boolean, rootCommentId: number): React.ReactNode => {
              const isLiked = comment.likedBy && currentUserEmail && comment.likedBy.includes(currentUserEmail);

              // Find the parent comment to check if we need to show a mention
              let mentionAuthor = '';
              if (depth > 0 && comment.parentId !== rootCommentId) {
                const parentComment = activeComments.find((c: any) => c.id === comment.parentId);
                if (parentComment) {
                  mentionAuthor = parentComment.author;
                }
              }

              return (
                <div 
                  key={comment.id} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '10px', 
                    position: 'relative',
                    paddingLeft: depth > 0 ? '44px' : '0px'
                  }}
                >
                  {/* Comment Row */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative' }}>
                    {/* Thread Connecting Line if this is root comment and has replies */}
                    {depth === 0 && hasReplies && (
                      <div style={{
                        position: 'absolute',
                        top: '38px',
                        left: '18px',
                        bottom: '-12px', // reaches down past this row to meet the first child's vertical line
                        width: '2px',
                        backgroundColor: '#e2e8f0',
                        zIndex: 1
                      }} />
                    )}

                    {/* Sub connecting lines for child comments */}
                    {depth > 0 && (
                      <>
                        {/* Vertical line from parent down to this child's avatar center */}
                        <div style={{
                          position: 'absolute',
                          left: '18px',
                          top: '-12px',
                          bottom: isLastChild ? 'calc(100% - 14px)' : '-12px',
                          width: '2px',
                          backgroundColor: '#e2e8f0',
                          zIndex: 1
                        }} />
                        {/* Horizontal branch line from the vertical line to this child's avatar */}
                        <div style={{
                          position: 'absolute',
                          left: '18px',
                          top: '14px',
                          width: '40px', // spans from 18px to 58px (44px padding + 14px avatar center)
                          height: '2px',
                          backgroundColor: '#e2e8f0',
                          zIndex: 1
                        }} />
                      </>
                    )}

                    {/* Avatar */}
                    <div style={{ 
                      width: depth === 0 ? '36px' : '28px', 
                      height: depth === 0 ? '36px' : '28px', 
                      borderRadius: '50%', 
                      backgroundColor: comment.role === 'admin' ? '#F43F5E' : (depth === 0 ? '#1E3A8A' : '#10B981'), 
                      flexShrink: 0, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'white', 
                      fontWeight: 800, 
                      fontSize: depth === 0 ? '0.85rem' : '0.75rem',
                      zIndex: 2
                    }}>
                      {comment.author?.[0] || '익'}
                    </div>

                    {/* Comment Body */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: depth === 0 ? '4px' : '3px', flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: depth === 0 ? '0.85rem' : '0.78rem', fontWeight: 800, color: '#0F172A' }}>{comment.author}</span>
                        <span style={{ fontSize: depth === 0 ? '0.72rem' : '0.68rem', color: '#94A3B8', fontWeight: 500 }}>
                          {(() => {
                            const timeDiff = Date.now() - new Date(comment.createdAt).getTime();
                            const minDiff = Math.floor(timeDiff / (1000 * 60));
                            if (minDiff < 60) return `${minDiff} min`;
                            const hourDiff = Math.floor(minDiff / 60);
                            if (hourDiff < 24) return `${hourDiff} hours`;
                            return new Date(comment.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                          })()}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        {mentionAuthor && (
                          <span style={{ color: '#003378', fontWeight: 800, marginRight: '6px', fontSize: depth === 0 ? '0.88rem' : '0.82rem', whiteSpace: 'nowrap' }}>
                            @{mentionAuthor}
                          </span>
                        )}
                        <span 
                          style={{ 
                            fontSize: depth === 0 ? '0.88rem' : '0.82rem', 
                            color: depth === 0 ? '#334155' : '#475569', 
                            lineHeight: depth === 0 ? '1.45' : '1.4', 
                            fontWeight: 500, 
                            lineBreak: 'anywhere' 
                          }}
                          dangerouslySetInnerHTML={{ __html: parseCommentMarkdown(comment.text) }}
                        />
                      </div>

                      {/* Attachments rendering */}
                      {comment.attachments && comment.attachments.map((attach: any, idx: number) => (
                        <div 
                          key={idx} 
                          style={{ 
                            marginTop: '6px', 
                            maxWidth: depth === 0 ? '240px' : '200px', 
                            borderRadius: depth === 0 ? '12px' : '10px', 
                            overflow: 'hidden', 
                            border: '1px solid #e2e8f0', 
                            boxShadow: depth === 0 ? '0 4px 10px rgba(0,0,0,0.05)' : 'none' 
                          }}
                        >
                          <img 
                            src={attach.url} 
                            alt="첨부 이미지" 
                            style={{ 
                              width: '100%', 
                              height: 'auto', 
                              display: 'block', 
                              maxHeight: depth === 0 ? '180px' : '140px', 
                              objectFit: 'cover' 
                            }} 
                          />
                        </div>
                      ))}

                      {/* Actions: Likes and Reply */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                        <button 
                          onClick={() => handleToggleLike(comment.id)}
                          style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', outline: 'none' }}
                        >
                          <svg width={depth === 0 ? '13' : '11'} height={depth === 0 ? '13' : '11'} viewBox="0 0 24 24" fill={isLiked ? '#ef4444' : 'none'} stroke={isLiked ? '#ef4444' : '#94a3b8'} strokeWidth="2.5">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                          </svg>
                          <span style={{ fontSize: depth === 0 ? '0.72rem' : '0.68rem', color: isLiked ? '#ef4444' : '#94A3B8', fontWeight: 700 }}>
                            {comment.likes || 0}
                          </span>
                        </button>

                        <span 
                          onClick={() => {
                            setActiveReplyId(activeReplyId === comment.id ? null : comment.id);
                            setReplyComment('');
                          }} 
                          style={{ 
                            fontSize: depth === 0 ? '0.72rem' : '0.68rem', 
                            color: activeReplyId === comment.id ? '#003378' : '#94A3B8', 
                            fontWeight: 800, 
                            cursor: 'pointer' 
                          }} 
                          className="hover-underline"
                        >
                          Reply
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Inline reply input box right below this comment node */}
                  {activeReplyId === comment.id && (
                    <div style={{ 
                      paddingLeft: depth === 0 ? '48px' : '40px', 
                      marginTop: '6px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '6px', 
                      animation: 'fadeIn 0.2s ease-out' 
                    }}>
                      {replyAttachedImage && (
                        <div style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                          <img src={replyAttachedImage} alt="답글 이미지" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button 
                            onClick={() => setReplyAttachedImage(null)}
                            style={{ position: 'absolute', top: '2px', right: '2px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', fontSize: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ flex: 1, border: '1.5px solid #003378', borderRadius: '10px', display: 'flex', backgroundColor: '#ffffff', overflow: 'hidden', alignItems: 'center', paddingRight: '8px' }}>
                          <textarea 
                            id={`reply-textarea-${comment.id}`}
                            value={replyComment}
                            onChange={(e) => setReplyComment(e.target.value)}
                            placeholder="답글을 작성하세요..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment(comment.id, replyComment, true);
                              }
                            }}
                            rows={1}
                            style={{ 
                              flex: 1, 
                              border: 'none', 
                              outline: 'none', 
                              padding: '8px 12px', 
                              fontSize: '0.82rem', 
                              color: '#1e293b', 
                              fontWeight: 600,
                              resize: 'none',
                              fontFamily: 'inherit',
                              lineHeight: '1.4',
                              height: '36px',
                              display: 'flex',
                              alignItems: 'center',
                              overflowY: 'hidden'
                            }}
                          />
                          
                          {/* Markdown: Bold */}
                          <button 
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); insertTextAtCursor('bold', true); }}
                            style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer', padding: '2px 4px' }}
                            title="볼드 텍스트"
                          >
                            B
                          </button>
                          
                          {/* Markdown: Italic */}
                          <button 
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); insertTextAtCursor('italic', true); }}
                            style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.78rem', fontStyle: 'italic', cursor: 'pointer', padding: '2px 4px' }}
                            title="이탤릭 텍스트"
                          >
                            I
                          </button>

                          {/* Markdown: Strikethrough */}
                          <button 
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); insertTextAtCursor('strikethrough', true); }}
                            style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.78rem', textDecoration: 'line-through', cursor: 'pointer', padding: '2px 4px' }}
                            title="취소선"
                          >
                            S
                          </button>

                          {/* Photo Attach icon */}
                          <button 
                            onClick={() => {
                              const el = document.getElementById(`reply-image-upload-${comment.id}`);
                              if (el) el.click();
                            }}
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', padding: '4px' }}
                            title="사진 첨부"
                          >
                            📎
                          </button>
                          
                          {/* Emoji Picker toggle */}
                          <button 
                            onClick={() => setShowReplyEmojiPicker(showReplyEmojiPicker === comment.id ? null : comment.id)}
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', padding: '4px' }}
                            title="이모지"
                          >
                            😊
                          </button>
                          
                          <input 
                            type="file" 
                            id={`reply-image-upload-${comment.id}`} 
                            accept="image/*" 
                            style={{ display: 'none' }} 
                            onChange={(e) => handleFileChange(e, true)} 
                          />
                        </div>
                        
                        <button 
                          onClick={() => handleAddComment(comment.id, replyComment, true)}
                          disabled={!replyComment.trim() && !replyAttachedImage}
                          style={{ backgroundColor: '#003378', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          등록
                        </button>
                        
                        <button 
                          onClick={() => { setActiveReplyId(null); setReplyComment(''); setReplyAttachedImage(null); }}
                          style={{ backgroundColor: '#f1f5f9', color: '#475569', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          취소
                        </button>
                      </div>

                      {/* Reply Emoji Picker popup */}
                      {showReplyEmojiPicker === comment.id && (
                        <div style={{ display: 'flex', gap: '6px', backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '20px', width: 'fit-content', boxShadow: '0 4px 10px rgba(0,0,0,0.06)' }}>
                          {['😊', '😂', '❤️', '👍', '🔥', '🎉', '😮', '😢', '🤔', '👏'].map((emoji) => (
                            <span 
                              key={emoji} 
                              onMouseDown={(e) => {
                                e.preventDefault();
                                insertTextAtCursor(emoji, true);
                                setShowReplyEmojiPicker(null);
                              }}
                              style={{ cursor: 'pointer', fontSize: '1.05rem', transition: 'transform 0.1s' }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
                            >
                              {emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            };

            const ytId = selectedContent.final_url ? getYoutubeVideoId(selectedContent.final_url) : null;
            const gdInfo = selectedContent.final_url ? getGoogleDriveInfo(selectedContent.final_url) : null;
            const crewCount = tempFormData.crew ? tempFormData.crew.split(',').map(s => s.trim()).filter(Boolean).length : 0;
            const computedArticleType = crewCount > 1 ? '팀기사' : '개인기사';

            let emailInJson = '';
            try {
              emailInJson = bodyObj.authorEmail || '';
            } catch (e) {}

            const isOwnAuthor = currentUserEmail && (
              emailInJson === currentUserEmail || 
              selectedContent.author_name === currentUserEmail || 
              selectedContent.author_name === currentUserName ||
              (currentUserName && selectedContent.author_name?.includes(currentUserName))
            );
            const isCrewMember = currentUserName && selectedContent.parsedCrew?.includes(currentUserName);
            const isOwn = isOwnAuthor || isCrewMember;
            const isAdministrator = currentUserEmail === 'admin@ymc.com' || currentUserEmail?.includes('admin') || isGlobalAdmin;
            
    const crewStr = (() => {
      try {
        return JSON.parse(selectedContent.content_body || '{}').crew || '';
      } catch (e) { return ''; }
    })();
    const isParticipant = crewStr.includes(currentUserName) || (currentUserEmail && crewStr.includes(currentUserEmail));
    const isEditable = isOwn || isAdministrator || isParticipant;
return (
              <>
                {/* 1. Preview Card */}
                <div 
                  onClick={() => { setIsModalOpen(true); setIsFinalWorkView(true); }}
                  style={{ 
                    backgroundColor: '#ffffff', 
                    borderRadius: '20px', 
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.03)', 
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden', 
                    cursor: 'pointer'
                  }}
                  className="hover-card"
                >
                  <div style={{ 
                    width: '100%', 
                    height: '140px', 
                    backgroundColor: '#F8FAFC', 
                    position: 'relative', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderBottom: '1px solid #F1F5F9'
                  }}>
                    {!selectedContent.final_url ? (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#64748b', zIndex: 10, gap: '8px' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                          <line x1="12" y1="22.08" x2="12" y2="12"></line>
                          <text x="12" y="9" textAnchor="middle" fontSize="6" fontWeight="bold" stroke="none" fill="#ffffff">?</text>
                        </svg>
                        <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.8rem' }}>아직 업로드되지 않았습니다</span>
                      </div>
                    ) : null}
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.06, background: 'radial-gradient(circle, #34A853 0%, #4285F4 50%, #FBBC05 100%)' }} />
                    
                    <svg viewBox="0 0 100 100" width="60" height="60" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.06))' }}>
                      <path d="M30 75 L15 50 L45 50 Z" fill="#FBBC05" />
                      <path d="M30 75 L60 75 L45 50 Z" fill="#4285F4" />
                      <path d="M45 50 L60 75 L75 50 Z" fill="#34A853" />
                      <path d="M45 50 L75 50 L60 25 Z" fill="#EA4335" />
                      <path d="M15 50 L45 50 L30 25 Z" fill="#FBBC05" opacity="0.9" />
                      <path d="M30 25 L60 25 L45 50 Z" fill="#34A853" opacity="0.9" />
                    </svg>
                    
                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if(selectedContent.final_url) window.open(selectedContent.final_url, '_blank'); }}
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
                          backdropFilter: 'blur(4px)'
                        }}
                      >
                        Open Drive <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ padding: '16px 20px' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', lineBreak: 'anywhere' }}>
                      {selectedContent.title}
                    </h4>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                      <span>{selectedContent.parsedCrew || selectedContent.author_name}</span>
                      <span style={{ color: '#CBD5E1' }}>/</span>
                      <span>SNS기자단 활동</span>
                      <span style={{ color: '#CBD5E1' }}>/</span>
                      <span>{selectedContent.team}</span>
                      <span style={{ color: '#CBD5E1' }}>/</span>
                      <span>{bodyObj.targetMonth ? bodyObj.targetMonth.split('-')[1] + '월' : 'N월'}</span>
                      <span style={{ color: '#CBD5E1' }}>/</span>
                      <span>{selectedContent.content_type}</span>
                    </div>
                    {selectedContent.final_url && (
                      <div style={{ marginTop: '6px', fontSize: '0.72rem', color: '#10B981', fontWeight: 600, wordBreak: 'break-all', textDecoration: 'underline' }}>
                        {selectedContent.final_url}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Proposal Card */}
                <div 
                  onClick={() => { setIsModalOpen(true); setIsFinalWorkView(false); }}
                  style={{ 
                    backgroundColor: '#ffffff', 
                    borderRadius: '20px', 
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.03)', 
                    border: '1px solid #E2E8F0',
                    padding: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                  className="hover-card"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      기획안 <span style={{ fontSize: '0.8rem', color: '#94A3B8', cursor: 'help' }}>ⓘ</span>
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <div style={{ 
                        backgroundColor: '#FEE2E2', 
                        color: '#EF4444', 
                        padding: '2px 8px', 
                        borderRadius: '6px', 
                        fontSize: '0.68rem', 
                        fontWeight: 800,
                        display: 'inline-block'
                      }}>
                        임시저장함 | 2
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 600 }}>
                        작성자: {selectedContent.author_name.split(' ').pop()} / {formatDate(selectedContent.created_at)}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px', display: 'block' }}>제목 (가제)</label>
                    <div style={{ backgroundColor: '#F1F5F9', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                      {selectedContent.title || '내용을 입력해주세요'}
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px', display: 'block' }}>콘텐츠 분류</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {[
                        selectedContent.team || '플랫폼',
                        bodyObj.targetMonth ? bodyObj.targetMonth.split('-')[1] + '월' : 'N월',
                        computedArticleType,
                        selectedContent.content_type || '유형'
                      ].map((val, i) => (
                        <div key={i} style={{ 
                          backgroundColor: '#F8FAFC', 
                          border: '1px solid #E2E8F0', 
                          padding: '6px 2px', 
                          borderRadius: '8px', 
                          fontSize: '0.7rem', 
                          color: '#64748B', 
                          textAlign: 'center',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {val}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px', display: 'block' }}>참여인원 (크루)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ 
                          width: '30px', 
                          height: '30px', 
                          borderRadius: '50%', 
                          backgroundColor: '#1E3A8A', 
                          color: 'white', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: 800, 
                          fontSize: '0.7rem' 
                        }}>
                          {selectedContent.author_name[0] || '익'}
                        </div>
                        <span style={{ fontSize: '0.62rem', color: '#64748B', marginTop: '2px', fontWeight: 700 }}>
                          {selectedContent.author_name.split(' ').pop()}
                        </span>
                      </div>
                      {(selectedContent.parsedCrew || '').split(',').map((c, i) => c.trim() && (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ 
                            width: '30px', 
                            height: '30px', 
                            borderRadius: '50%', 
                            backgroundColor: '#0284C7', 
                            color: 'white', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: 800, 
                            fontSize: '0.7rem' 
                          }}>
                            {c.trim()[0] || '크'}
                          </div>
                          <span style={{ fontSize: '0.62rem', color: '#64748B', marginTop: '2px', fontWeight: 700 }}>
                            {c.trim().split(' ').pop()}
                          </span>
                        </div>
                      ))}
                      
                      <div style={{ 
                        width: '30px', 
                        height: '30px', 
                        borderRadius: '50%', 
                        border: '1.5px dashed #CBD5E1', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: '#94A3B8',
                        fontWeight: 'bold',
                        fontSize: '0.85rem'
                      }}>
                        +
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px', display: 'block' }}>기획의도</label>
                    <div style={{ backgroundColor: '#F1F5F9', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', color: '#475569', minHeight: '50px', maxHeight: '120px', overflowY: 'auto', lineHeight: '1.4', fontWeight: 500 }}>
                      {bodyObj.intent ? <div dangerouslySetInnerHTML={{ __html: bodyObj.intent }} /> : '-'}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px', display: 'block' }}>구성 및 내용</label>
                    <div style={{ backgroundColor: '#F1F5F9', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', color: '#475569', minHeight: '50px', maxHeight: '160px', overflowY: 'auto', lineHeight: '1.4', fontWeight: 500 }}>
                      {bodyObj.composition ? <div dangerouslySetInnerHTML={{ __html: bodyObj.composition }} /> : '-'}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px', display: 'block' }}>촬영 계획</label>
                    <div style={{ backgroundColor: '#F1F5F9', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', color: '#475569', minHeight: '50px', maxHeight: '160px', overflowY: 'auto', lineHeight: '1.4', fontWeight: 500 }}>
                      {bodyObj.contentBody ? <div dangerouslySetInnerHTML={{ __html: bodyObj.contentBody }} /> : '-'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px', display: 'block' }}>희망 업로드 시기</label>
                      <div style={{ backgroundColor: '#F1F5F9', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                        {bodyObj.desiredDate || '-'}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px', display: 'block' }}>데드라인</label>
                      <div style={{ backgroundColor: '#F1F5F9', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', color: '#EF4444', fontWeight: 600 }}>
                        {bodyObj.deadline || '-'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px', display: 'block' }}>해시태그</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedContent.keywords ? selectedContent.keywords.split(',').map((kw: string, i: number) => (
                        <span key={i} style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                          #{kw.trim()}
                        </span>
                      )) : <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>-</span>}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px', display: 'block' }}>비고</label>
                    <div style={{ backgroundColor: '#F1F5F9', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', color: '#475569', minHeight: '40px', fontWeight: 500 }}>
                      {selectedContent.description || '-'}
                    </div>
                  </div>

                  { (selectedContent.docsUrl || bodyObj.docsUrl) && (
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px', display: 'block' }}>기획안 링크</label>
                      <a href={selectedContent.docsUrl || bodyObj.docsUrl} target="_blank" rel="noreferrer" style={{ display: 'block', backgroundColor: '#F0F9FF', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', color: '#0284C7', textDecoration: 'underline', fontWeight: 600, wordBreak: 'break-all' }}>
                        {selectedContent.docsUrl || bodyObj.docsUrl}
                      </a>
                    </div>
                  )}
                </div>

                {/* 3. Feedback Card */}
                <div 
                  onClick={() => { setIsModalOpen(true); setIsFinalWorkView(false); }}
                  style={{ 
                    backgroundColor: '#ffffff', 
                    borderRadius: '20px', 
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.03)', 
                    border: '1px solid #E2E8F0',
                    padding: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                  className="hover-card"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0F172A' }}>
                      기획안 피드백 <span style={{ color: '#3B82F6' }}>{discussions.length}</span>
                      <span style={{ color: '#CBD5E1', fontSize: '0.85rem', fontWeight: 600 }}> / 완성본 2</span>
                    </h3>
                    
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5">
                      <line x1="7" y1="17" x2="17" y2="7"></line>
                      <polyline points="7 7 17 7 17 17"></polyline>
                    </svg>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {discussions.length === 0 ? (
                      <div style={{ color: '#94A3B8', fontSize: '0.82rem', textAlign: 'center', padding: '12px 0' }}>
                        아직 등록된 피드백이 없습니다.
                      </div>
                    ) : (
                      discussions.map((msg: any, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <div style={{ 
                            width: '28px', 
                            height: '28px', 
                            borderRadius: '50%', 
                            backgroundColor: msg.role === 'admin' ? '#F43F5E' : '#1E3A8A', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: 'white', 
                            fontWeight: 800, 
                            fontSize: '0.68rem',
                            flexShrink: 0
                          }}>
                            {msg.author?.[0] || '익'}
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.author}</span>
                              <span style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 500, flexShrink: 0 }}>
                                {(() => {
                                  const timeDiff = Date.now() - new Date(msg.createdAt).getTime();
                                  const minDiff = Math.floor(timeDiff / (1000 * 60));
                                  if (minDiff < 60) return `${minDiff} min`;
                                  const hourDiff = Math.floor(minDiff / 60);
                                  if (hourDiff < 24) return `${hourDiff} hours`;
                                  return new Date(msg.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                                })()}
                              </span>
                            </div>
                            <span 
                              style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.4', fontWeight: 500, wordBreak: 'break-all', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                              dangerouslySetInnerHTML={{ __html: canViewSecret(msg) ? parseCommentMarkdown(msg.text) : '🔒 비밀댓글입니다.' }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 4. Fullscreen Split Popup Modal */}
                {isModalOpen && typeof document !== 'undefined' && createPortal(
                  <div 
                    onClick={() => { setIsModalOpen(false); if (onModalClose) onModalClose(); }}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      width: '100vw',
                      height: '100vh',
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      zIndex: 1000,
                      animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '92%',
                        maxWidth: '1350px',
                        height: '88vh',
                        display: 'grid',
                        gridTemplateColumns: '1.4fr 1.0fr',
                        gap: '36px',
                        overflow: 'visible',
                        animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    >
                      {/* Modal Left Panel: 기획안 Form OR 완성본 미리보기 플레이어 (독립된 카드 형태) */}
                      <div style={{
                        padding: '2.5rem 3rem',
                        overflowY: 'auto',
                        height: '100%',
                        backgroundColor: '#ffffff',
                        borderRadius: '28px',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.12)',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        {isFinalWorkView ? (
                          isEditingFinalWork ? (
                            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                              <FinalSubmitForm 
                                embeddedId={selectedContent.id.toString()}
                                onCancel={() => setIsEditingFinalWork(false)}
                                onSuccess={() => window.location.reload()}
                              />
                            </div>
                          ) : (
                          /* 완성본 보기 모드 - 좌측 화면 */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #003378', paddingBottom: '1rem', marginBottom: '1rem' }}>
                              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                완성본 미리보기 <span style={{ fontSize: '1.1rem', color: '#10B981', fontWeight: 700 }}>LIVE</span>
                              </h2>
                              <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>
                                작성자: {selectedContent.author_name} / {formatDate(selectedContent.created_at)}
                              </span>
                            </div>

                            <div style={{ width: '100%', height: '420px', backgroundColor: '#0f172a', borderRadius: '20px', overflow: 'hidden', position: 'relative', boxShadow: '0 12px 30px rgba(0,0,0,0.12)' }}>
                              {ytId ? (
                                <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} frameBorder="0" allowFullScreen />
                              ) : gdInfo ? (
                                <iframe src={gdInfo.type === 'folder' ? `https://drive.google.com/embeddedfolderview?id=${gdInfo.id}#list` : `https://drive.google.com/file/d/${gdInfo.id}/preview`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} frameBorder="0" allowFullScreen />
                              ) : (
                                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'white', padding: '30px', textAlign: 'center' }}>
                                  <span style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }}>📂</span>
                                  <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>구글 드라이브 문서 및 미디어 뷰어</span>
                                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 8px 0', maxWidth: '380px' }}>아래 링크 버튼을 클릭하시면 구글 드라이브로 즉시 이동하여 파일을 확인할 수 있습니다.</p>
                                  {selectedContent.final_url && (
                                    <button 
                                      onClick={() => window.open(selectedContent.final_url, '_blank')}
                                      style={{ backgroundColor: '#ffffff', color: '#1e3a8a', border: 'none', padding: '8px 20px', borderRadius: '30px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 20px rgba(255,255,255,0.1)', transition: 'transform 0.2s' }}
                                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
                                    >
                                      새 창에서 원본 파일 열기
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#334155' }}>완성본 공식 연결 링크</span>
                              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '14px', fontSize: '0.85rem', wordBreak: 'break-all', fontWeight: 600, color: '#16a34a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {selectedContent.final_url || '등록된 완성본 링크가 없습니다. 아래 버튼을 통해 등록해보세요.'}
                                </span>
                                {selectedContent.final_url && (
                                  <a href={selectedContent.final_url} target="_blank" rel="noreferrer" style={{ marginLeft: '12px', padding: '4px 10px', backgroundColor: '#16a34a', color: 'white', borderRadius: '8px', fontSize: '0.78rem', textDecoration: 'none', fontWeight: 700 }}>
                                    바로가기 🔗
                                  </a>
                                )}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                              <button onClick={() => setIsEditingFinalWork(true)} style={{ flex: 1, textAlign: 'center', backgroundColor: '#003378', color: 'white', padding: '14px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 15px rgba(0, 51, 120, 0.2)', transition: 'background-color 0.2s' , border: 'none', cursor: 'pointer'}}>
                                🛠️ 완성본 수정 / 변경 화면으로 가기
                              </button>
                              <button 
                                onClick={() => { setIsModalOpen(false); if (onModalClose) onModalClose(); }}
                                style={{ padding: '14px 24px', borderRadius: '12px', border: '1.5px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}
                              >
                                닫기
                              </button>
                            </div>
                          </div>
                          )
                        ) : (
                          /* 기획안 폼 모드 - 좌측 화면 */
                          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #1E3A8A', paddingBottom: '1rem', marginBottom: '2rem' }}>
                              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                기획안 <span style={{ fontSize: '1.2rem', color: '#94A3B8', cursor: 'help' }}>ⓘ</span>
                              </h2>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
                                  작성자: {selectedContent.author_name} / {formatDate(selectedContent.created_at)}
                                </span>
                              </div>
                            </div>

                            {/* Title Input */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                              <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>제목 (가제)</label>
                              <input 
                                type="text" 
                                value={tempFormData.title}
                                onChange={(e) => setTempFormData({...tempFormData, title: e.target.value})}
                                placeholder="내용을 입력해주세요"
                                disabled={!isEditingProposal}
                                style={{ 
                                  border: 'none', 
                                  backgroundColor: '#F1F5F9', 
                                  padding: '0.9rem 1.2rem', 
                                  borderRadius: '10px', 
                                  fontSize: '0.95rem', 
                                  fontWeight: 600,
                                  color: '#1E293B',
                                  outline: 'none',
                                  transition: 'all 0.2s'
                                }} 
                              />
                            </div>

                            {/* Categories */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                              <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>콘텐츠 분류</label>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                <select 
                                  value={tempFormData.team}
                                  onChange={(e) => setTempFormData({...tempFormData, team: e.target.value})}
                                  disabled={!isEditingProposal}
                                  style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '10px', fontWeight: 700, color: '#1E293B', outline: 'none' }}
                                >
                                  <option value="유튜브">유튜브</option>
                                  <option value="인스타">인스타</option>
                                  <option value="블로그">블로그</option>
                                  <option value="단장 팀">단장 팀</option>
                                </select>
                                
                                <input 
                                  type="month" 
                                  value={tempFormData.targetMonth}
                                  onChange={(e) => setTempFormData({...tempFormData, targetMonth: e.target.value})}
                                  disabled={!isEditingProposal}
                                  style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '10px', fontWeight: 700, color: '#1E293B', outline: 'none' }}
                                />
                                
                                <div style={{ border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', padding: '0.75rem', borderRadius: '10px', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.88rem' }}>
                                  {computedArticleType}
                                </div>
                                
                                <select 
                                  value={tempFormData.contentType}
                                  onChange={(e) => setTempFormData({...tempFormData, contentType: e.target.value})}
                                  disabled={!isEditingProposal}
                                  style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '10px', fontWeight: 700, color: '#1E293B', outline: 'none' }}
                                >
                                  <option value="영상(롱폼)">영상(롱폼)</option>
                                  <option value="영상(숏폼)">영상(숏폼)</option>
                                  <option value="카드뉴스">카드뉴스</option>
                                  <option value="글 기사">글 기사</option>
                                  <option value="사진/기타">사진/기타</option>
                                </select>
                              </div>
                            </div>

                            {/* Crew Members */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem', position: 'relative' }}>
                              <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>참여인원 (크루)</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#1E3A8A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                                    {selectedContent.author_name[0] || '익'}
                                  </div>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>{selectedContent.author_name.split(' ').pop()}</span>
                                </div>
                                
                                {tempFormData.crew ? tempFormData.crew.split(',').map((s: string) => s.trim()).filter(Boolean).map((name: string) => (
                                  <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative' }}>
                                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#0284C7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                                      {name[0] || '크'}
                                    </div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>{name.split(' ').pop()}</span>
                                  </div>
                                )) : null}
                                
                              </div>
                            </div>

                            {/* GDocs URL */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                              <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '4px' }}>📄 기획안 문서 URL 연결</label>
                              <div style={{ padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #BAE6FD', backgroundColor: '#F0F9FF', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <p style={{ fontSize: '0.78rem', color: '#0C4A6E', margin: 0, lineHeight: '1.4', fontWeight: 600 }}>
                                  상세 기획안 작성이 필요한 경우, 구글 드라이브에 문서를 생성한 후 아래에 링크를 연결하세요.
                                </p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <input 
                                    type="url" 
                                    value={tempFormData.docsUrl}
                                    onChange={(e) => setTempFormData({...tempFormData, docsUrl: e.target.value})}
                                    placeholder="구글 드라이브 기획안 링크"
                                    disabled={!isEditingProposal}
                                    style={{ backgroundColor: '#ffffff', flex: 1, border: '1px solid #BAE6FD', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', color: '#1E293B', outline: 'none' }}
                                  />
                                  {tempFormData.docsUrl && (
                                    <a href={tempFormData.docsUrl} target="_blank" rel="noreferrer" style={{ padding: '0 12px', backgroundColor: '#0284C7', color: 'white', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', fontSize: '0.8rem', textDecoration: 'none' }}>
                                      🔗 이동
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Intent */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                              <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>기획의도</label>
                              <div style={{ backgroundColor: '#F3F4F6', borderRadius: '10px', padding: '4px' }}>
                                <RichTextEditor 
                                  value={tempFormData.intent} 
                                  onChange={(val) => setTempFormData({...tempFormData, intent: val})} 
                                  placeholder="내용을 입력해주세요" 
                                  disabled={!isEditingProposal} 
                                  minHeight="120px" 
                                />
                              </div>
                            </div>

                            {/* Composition */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                              <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>구성 및 내용</label>
                              <div style={{ backgroundColor: '#F3F4F6', borderRadius: '10px', padding: '4px' }}>
                                <RichTextEditor 
                                  value={tempFormData.composition} 
                                  onChange={(val) => setTempFormData({...tempFormData, composition: val})} 
                                  placeholder="내용을 입력해주세요" 
                                  disabled={!isEditingProposal} 
                                  minHeight="140px" 
                                />
                              </div>
                            </div>

                            {/* Content Body / Shooting Plan */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                              <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>촬영 계획</label>
                              <div style={{ backgroundColor: '#F3F4F6', borderRadius: '10px', padding: '4px' }}>
                                <RichTextEditor 
                                  value={tempFormData.contentBody} 
                                  onChange={(val) => setTempFormData({...tempFormData, contentBody: val})} 
                                  placeholder="내용을 입력해주세요" 
                                  disabled={!isEditingProposal} 
                                  minHeight="120px" 
                                />
                              </div>
                            </div>

                            {/* Keywords */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                              <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>#해시태그</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F1F5F9', padding: '8px 12px', borderRadius: '10px' }}>
                                <span style={{ color: '#64748B', fontWeight: 'bold' }}>#</span>
                                <input 
                                  type="text" 
                                  value={tempFormData.keywords}
                                  onChange={(e) => setTempFormData({...tempFormData, keywords: e.target.value})}
                                  placeholder="여기에 해시태그를 입력해주세요..." 
                                  disabled={!isEditingProposal}
                                  style={{ border: 'none', backgroundColor: 'transparent', flex: 1, outline: 'none', fontSize: '0.9rem', color: '#1E293B', fontWeight: 600 }} 
                                />
                              </div>
                            </div>

                            {/* Dates */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>희망 업로드 시기</label>
                                <input 
                                  type="date" 
                                  value={tempFormData.desiredDate}
                                  onChange={(e) => {
                                    const newDesired = e.target.value;
                                    const newDeadline = newDesired ? new Date(new Date(newDesired).getTime() - 7*24*60*60*1000).toISOString().split('T')[0] : '';
                                    setTempFormData({...tempFormData, desiredDate: newDesired, deadline: newDeadline});
                                  }} 
                                  disabled={!isEditingProposal}
                                  style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '10px', fontWeight: 600, outline: 'none', color: '#1E293B' }} 
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>데드라인</label>
                                <input 
                                  type="date" 
                                  value={tempFormData.deadline}
                                  readOnly onChange={() => {}}
                                  style={{ border: 'none', backgroundColor: '#CBD5E1', padding: '0.75rem', borderRadius: '10px', fontWeight: 600, color: '#475569', outline: 'none' }} 
                                />
                              </div>
                            </div>

                            {/* Timeliness */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                              <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>시의성 중요도</label>
                              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                {[
                                  { level: '상관없음', color: '#93C5FD', bg: '#EFF6FF', hover: '#DBEAFE' },
                                  { level: '보통', color: '#3B82F6', bg: '#EFF6FF', hover: '#DBEAFE' },
                                  { level: '중요', color: '#1E3A8A', bg: '#EFF6FF', hover: '#DBEAFE' }
                                ].map(({ level, color, bg, hover }) => {
                                  let currentTimeliness = '상관없음';
                                  try { currentTimeliness = JSON.parse(selectedContent.content_body || '{}').timeliness || '상관없음'; } catch {}
                                  const isSelected = isEditable ? tempFormData.timeliness === level : currentTimeliness === level;
                                  
                                  return (
                                    <button
                                      key={level}
                                      type="button"
                                      onClick={() => {
                                        if (isEditable && !isSavingProposal) {
                                          setTempFormData({...tempFormData, timeliness: level});
                                        }
                                      }}
                                      disabled={!isEditingProposal}
                                      style={{
                                        flex: 1,
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        border: isSelected ? `2px solid ${color}` : '1px solid #E2E8F0',
                                        backgroundColor: isSelected ? color : '#FFFFFF',
                                        color: isSelected ? '#FFFFFF' : '#475569',
                                        fontSize: '1rem',
                                        fontWeight: isSelected ? 800 : 600,
                                        cursor: (!isEditable || isSavingProposal) ? 'default' : 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isSelected ? `0 4px 12px ${color}40` : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isSelected && isEditable && !isSavingProposal) {
                                          e.currentTarget.style.backgroundColor = '#F8FAFC';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isSelected) {
                                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                                        }
                                      }}
                                    >
                                      <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        border: isSelected ? '2px solid #FFFFFF' : '2px solid #CBD5E1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: isSelected ? '#FFFFFF' : 'transparent'
                                      }}>
                                        {isSelected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />}
                                      </div>
                                      {level}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Description */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '2rem' }}>
                              <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>비고</label>
                              <textarea 
                                value={tempFormData.description}
                                onChange={(e) => setTempFormData({...tempFormData, description: e.target.value})}
                                placeholder="내용을 입력해주세요..." 
                                rows={3} 
                                disabled={!isEditingProposal}
                                style={{ border: 'none', backgroundColor: '#F1F5F9', padding: '1rem', borderRadius: '10px', outline: 'none', resize: 'vertical', fontSize: '0.9rem', fontWeight: 600, color: '#1E293B' }} 
                              />
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                              {isEditable && (
                                <button 
                                  onClick={() => setIsEditingProposal(true)}
                                  style={{ flex: 1, padding: '0.9rem', borderRadius: '10px', border: 'none', backgroundColor: '#1E3A8A', color: '#ffffff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                  이 화면에서 바로 수정하기
                                </button>
                              )}
                              {isEditable && isEditingProposal && (
                                <button 
                                  onClick={(e) => {
                                    handleSaveProposal(e as any).then(() => {
                                      setIsEditingProposal(false);
                                    });
                                  }}
                                  disabled={isSavingProposal}
                                  style={{ flex: 1, padding: '0.9rem', borderRadius: '10px', border: 'none', backgroundColor: '#10B981', color: '#ffffff', fontWeight: 800, fontSize: '1rem', cursor: isSavingProposal ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: isSavingProposal ? 0.7 : 1 }}
                                >
                                  {isSavingProposal ? '저장 중...' : '저장하기'}
                                </button>
                              )}
                              <button 
                                onClick={() => { setIsModalOpen(false); if (onModalClose) onModalClose(); }}
                                style={{ 
                                  flex: isEditable ? 1 : 'none', 
                                  width: isEditable ? 'auto' : '100%',
                                  padding: '0.9rem', 
                                  borderRadius: '10px', 
                                  border: '1.5px solid #CBD5E1', 
                                  backgroundColor: '#ffffff', 
                                  color: '#475569', 
                                  fontWeight: 800, 
                                  fontSize: '1rem', 
                                  cursor: 'pointer' 
                                }}
                              >
                                닫기
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Modal Right Panel: 피드백 & 완성본 스트림 (독립 카드 스택 형태) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                        {/* ==== ADMIN STATUS MANAGER ==== */}
                        {(isAdministrator || isGlobalAdmin) && selectedContent && (
                          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.12)', border: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
                             <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E40AF', marginBottom: '12px' }}>👑 관리자 전용 상태 설정</div>
                             <AdminStatusManager item={selectedContent} />
                          </div>
                        )}
                        {/* =============================== */}
                        {/* 1. "완성본 보기" Card */}
                        <div 
                          onClick={() => setIsFinalWorkView(!isFinalWorkView)}
                          style={{
                            backgroundColor: '#003378',
                            color: 'white',
                            padding: '16px 24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 800,
                            userSelect: 'none',
                            borderRadius: '20px',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#00255c';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#003378';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <span>완성본 보기</span>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            border: '2px solid white',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isFinalWorkView ? '#10B981' : 'transparent',
                            borderColor: isFinalWorkView ? '#10B981' : 'white',
                            transition: 'all 0.2s ease'
                          }}>
                            {isFinalWorkView && (
                              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                                <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        </div>

                        {/* 2. "피드백" Card */}
                        <div style={{ 
                          flex: 1, 
                          backgroundColor: '#ffffff', 
                          borderRadius: '24px', 
                          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.12)', 
                          border: '1px solid #E2E8F0',
                          display: 'flex', 
                          flexDirection: 'column', 
                          overflow: 'hidden'
                        }}>
                          {/* Title Bar */}
                          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0F172A' }}>
                              {isFinalWorkView ? '완성본 피드백' : '기획안 피드백'}{' '}
                              <span style={{ color: '#3B82F6' }}>
                                {activeComments.length}
                              </span>
                              <span style={{ color: '#CBD5E1', fontSize: '0.8rem', fontWeight: 600 }}>
                                {' '}/ {isFinalWorkView ? '기획안' : '완성본'}{' '}
                                {discussions.filter((msg: any) => (isFinalWorkView ? (msg.type === 'proposal' || !msg.type) : msg.type === 'final')).length}
                              </span>
                            </h3>
                            <button 
                              onClick={() => { setIsModalOpen(false); if (onModalClose) onModalClose(); }}
                              style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '1.25rem', cursor: 'pointer', padding: 0 }}
                            >
                              ✕
                            </button>
                          </div>

                          {/* Comments stream list (Threads Style with Recursive Tree Rendering) */}
                          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: '#ffffff' }}>
                            {rootComments.length === 0 ? (
                              <div style={{ color: '#94A3B8', fontSize: '0.88rem', textAlign: 'center', marginTop: '40px', fontWeight: 500 }}>
                                등록된 피드백이 없습니다. 첫 의견을 남겨보세요!
                              </div>
                            ) : (
                              rootComments.map((msg: any) => {
                                const replies = getAllReplies(msg.id, activeComments);
                                return (
                                  <React.Fragment key={msg.id}>
                                    {renderCommentNode(msg, 0, replies.length > 0, false, msg.id)}
                                    {replies.map((reply: any, index: number) => {
                                      const isLast = index === replies.length - 1;
                                      return renderCommentNode(reply, reply.depth, false, isLast, msg.id);
                                    })}
                                  </React.Fragment>
                                );
                              })
                            )}
                          </div>

                          {/* Rich style Comment Input (Main Input) */}
                          <div style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
                            <div style={{ 
                              border: '1.5px solid #CBD5E1', 
                              borderRadius: '16px', 
                              backgroundColor: '#ffffff',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                            }}>
                              {/* Selected image preview */}
                              {attachedImage && (
                                <div style={{ padding: '10px 14px 4px 14px', display: 'flex', position: 'relative' }}>
                                  <div style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                    <img src={attachedImage} alt="첨부파일 미리보기" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button 
                                      onClick={() => setAttachedImage(null)}
                                      style={{
                                        position: 'absolute',
                                        top: '3px',
                                        right: '3px',
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(15, 23, 42, 0.7)',
                                        color: 'white',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '9px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              )}

                              <textarea 
                                id="main-comment-textarea"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder={`${isFinalWorkView ? '완성본 피드백을' : '기획안 피드백을'} 남겨주세요... (B, I, S, 이모지, 사진 지원)`} 
                                rows={3}
                                disabled={isSavingComment}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment(null, '', false);
                                  }
                                }}
                                style={{ 
                                  width: '100%', 
                                  border: 'none', 
                                  outline: 'none', 
                                  padding: '12px 14px', 
                                  fontSize: '0.86rem', 
                                  backgroundColor: 'transparent',
                                  resize: 'none',
                                  color: '#1E293B',
                                  fontWeight: 600,
                                  fontFamily: 'inherit'
                                }} 
                              />
                              
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                padding: '8px 12px', 
                                backgroundColor: '#F8FAFC', 
                                borderTop: '1px solid #F1F5F9' 
                              }}>
                                {/* Rich Toolbar Buttons */}
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
                                  {/* Markdown: Bold */}
                                  <button 
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); insertTextAtCursor('bold', false); }}
                                    style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', padding: '2px 4px' }}
                                    title="볼드 텍스트"
                                  >
                                    B
                                  </button>
                                  
                                  {/* Markdown: Italic */}
                                  <button 
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); insertTextAtCursor('italic', false); }}
                                    style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.85rem', fontStyle: 'italic', cursor: 'pointer', padding: '2px 4px' }}
                                    title="이탤릭 텍스트"
                                  >
                                    I
                                  </button>

                                  {/* Markdown: Strikethrough */}
                                  <button 
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); insertTextAtCursor('strikethrough', false); }}
                                    style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.85rem', textDecoration: 'line-through', cursor: 'pointer', padding: '2px 4px' }}
                                    title="취소선"
                                  >
                                    S
                                  </button>

                                  {/* Link Builder */}
                                  <button 
                                    type="button"
                                    onClick={() => setShowLinkPopover(!showLinkPopover)}
                                    style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.9rem', cursor: 'pointer', padding: '2px 4px' }}
                                    title="링크 빌더"
                                  >
                                    🔗
                                  </button>

                                  {/* Photo Attachment */}
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const el = document.getElementById('main-image-upload');
                                      if (el) el.click();
                                    }}
                                    style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.9rem', cursor: 'pointer', padding: '2px 4px' }}
                                    title="사진 첨부"
                                  >
                                    📎
                                  </button>
                                  <input 
                                    type="file" 
                                    id="main-image-upload" 
                                    accept="image/*" 
                                    style={{ display: 'none' }} 
                                    onChange={(e) => handleFileChange(e, false)} 
                                  />

                                  {/* Emoji Picker Button */}
                                  <button 
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.9rem', cursor: 'pointer', padding: '2px 4px' }}
                                    title="이모지 선택"
                                  >
                                    😊
                                  </button>

                                  {/* Link Insert Popover Tooltip */}
                                  {showLinkPopover && (
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '100%',
                                      left: '20px',
                                      marginBottom: '10px',
                                      backgroundColor: 'white',
                                      borderRadius: '12px',
                                      border: '1px solid #e2e8f0',
                                      padding: '12px',
                                      width: '220px',
                                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '8px',
                                      zIndex: 50
                                    }}>
                                      <input 
                                        type="text" 
                                        placeholder="표시될 이름 (예: 구글)" 
                                        value={attachedLinkText}
                                        onChange={(e) => setAttachedLinkText(e.target.value)}
                                        style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem', outline: 'none' }}
                                      />
                                      <input 
                                        type="url" 
                                        placeholder="https://..." 
                                        value={attachedLinkUrl}
                                        onChange={(e) => setAttachedLinkUrl(e.target.value)}
                                        style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem', outline: 'none' }}
                                      />
                                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            if (attachedLinkUrl.trim()) {
                                              insertTextAtCursor(`[${attachedLinkText || '링크'}](${attachedLinkUrl})`, false);
                                              setAttachedLinkUrl('');
                                              setAttachedLinkText('');
                                              setShowLinkPopover(false);
                                            }
                                          }}
                                          style={{ backgroundColor: '#003378', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                          추가
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            setAttachedLinkUrl('');
                                            setAttachedLinkText('');
                                            setShowLinkPopover(false);
                                          }}
                                          style={{ backgroundColor: '#cbd5e1', color: '#475569', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                          취소
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Main Emoji Picker Popover */}
                                  {showEmojiPicker && (
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '100%',
                                      left: '80px',
                                      marginBottom: '10px',
                                      backgroundColor: 'white',
                                      borderRadius: '24px',
                                      border: '1px solid #cbd5e1',
                                      padding: '8px 12px',
                                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                                      display: 'flex',
                                      gap: '6px',
                                      zIndex: 50,
                                      width: 'fit-content'
                                    }}>
                                      {['😊', '😂', '❤️', '👍', '🔥', '🎉', '😮', '😢', '🤔', '👏'].map((emoji) => (
                                        <span 
                                          key={emoji} 
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            insertTextAtCursor(emoji, false);
                                            setShowEmojiPicker(false);
                                          }}
                                          style={{ cursor: 'pointer', fontSize: '1.1rem', transition: 'transform 0.1s' }}
                                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
                                        >
                                          {emoji}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600, color: '#64748B', cursor: 'pointer', userSelect: 'none' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={isSecretComment} 
                                      onChange={(e) => setIsSecretComment(e.target.checked)} 
                                      style={{ accentColor: '#1E3A8A', width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    🔒 비밀댓글
                                  </label>
                                  <button 
                                    onClick={() => handleAddComment(null, '', false)}
                                  disabled={isSavingComment || (!newComment.trim() && !attachedImage)}
                                  style={{ 
                                    backgroundColor: '#003378', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '8px 18px', 
                                    borderRadius: '10px', 
                                    fontSize: '0.82rem', 
                                    fontWeight: 800, 
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                    boxShadow: '0 4px 8px rgba(0, 51, 120, 0.18)'
                                  }}
                                  onMouseEnter={(e) => !isSavingComment && (newComment.trim() || attachedImage) && (e.currentTarget.style.backgroundColor = '#00255c')}
                                  onMouseLeave={(e) => !isSavingComment && (newComment.trim() || attachedImage) && (e.currentTarget.style.backgroundColor = '#003378')}
                                >
                                  {isSavingComment ? '...' : '의견 보내기'}
                                </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 3. "뒤로가기" Button */}
                        <div 
                          onClick={() => { setIsModalOpen(false); if (onModalClose) onModalClose(); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: '#CBD5E1',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 700,
                            padding: '12px 24px',
                            alignSelf: 'center',
                            transition: 'color 0.2s, transform 0.2s',
                            userSelect: 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ffffff';
                            e.currentTarget.style.transform = 'translateX(-4px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#CBD5E1';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                        >
                          <span style={{ fontSize: '1.2rem' }}>←</span> 뒤로가기
                        </div>
                      </div>
                    </div>
                  </div>
                , document.body)}
              </>
            );
        })()}
      </div>

      {/* Unsubmitted Final Works Modal */}
      {showUnsubmittedModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setShowUnsubmittedModal(false)} />
          <div style={{ position: 'relative', backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', width: '500px', maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>미제출 완성본 목록</h3>
              <button onClick={() => setShowUnsubmittedModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px' }}>
              {(() => {
                const unsubmitted = contentsList.filter(c => {
                  let emailInJson = '';
                  let crewStr = c.parsedCrew || '';
                  try { 
                    const body = JSON.parse(c.content_body || '{}');
                    emailInJson = body.authorEmail || ''; 
                    if (!crewStr && body.crew) {
                      crewStr = typeof body.crew === 'string' ? body.crew : (Array.isArray(body.crew) ? body.crew.map((x:any)=>x.name).join(',') : '');
                    }
                  } catch {}
                  
                  if (!crewStr && c.description) {
                    crewStr = c.description.split(' (참여:')[0] || '';
                  }

                  const isOwnAuthor = currentUserEmail && (
                    emailInJson === currentUserEmail || 
                    c.author_name === currentUserEmail || 
                    c.author_name === currentUserName ||
                    (currentUserName && c.author_name?.includes(currentUserName))
                  );
                  const isCrewMember = currentUserName && crewStr.includes(currentUserName);
                  const isOwn = isOwnAuthor || isCrewMember;
                  
                  return isOwn && !c.final_url && c.status !== 'draft';
                });
                if (unsubmitted.length === 0) {
                  return <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.95rem' }}>미제출된 완성본이 없습니다.</div>;
                }
                return unsubmitted.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      setShowUnsubmittedModal(false);
                      router.push(`/final-works/submit?id=${item.id}`);
                    }}
                    style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: '#ffffff' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>{item.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.team} · {item.content_type}</div>
                  </div>
                ));
              })()}
            </div>
            
            <div style={{ marginTop: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
              클릭하면 완성본 제출 화면으로 이동합니다.
            </div>
          </div>
        </div>
      , document.body)}

    </div>
  );
}
