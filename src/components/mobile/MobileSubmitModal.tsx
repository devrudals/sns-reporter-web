'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useSwipeDownToDismiss } from './useSwipeDownToDismiss';

interface MobileSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'proposal' | 'final';
  user?: any;
  allProfiles?: any[];
  // 완성본 업로드가 이미 존재하는 콘텐츠에 연결돼야 할 때(전체 리스트/캘린더에서
  // 특정 콘텐츠를 선택해 업로드하는 경우) 넘겨준다. 있으면 새 글을 만드는 대신 이
  // 콘텐츠 행을 완성본 전용 필드로 업데이트한다(PC FinalSubmitForm과 동일 매핑).
  // 없으면(대시보드/전체 리스트의 범용 "완성본 업로드" 진입) 기존처럼 새 글을 생성.
  targetItem?: any;
}

export default function MobileSubmitModal({ isOpen, onClose, mode, user, allProfiles = [], targetItem }: MobileSubmitModalProps) {
  const supabase = createClient();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form States using EXACT system values
  const [title, setTitle] = useState('');
  const [team, setTeam] = useState(user?.user_metadata?.team || '인스타');
  const [contentType, setContentType] = useState('카드뉴스');
  const [articleType, setArticleType] = useState('개인기사');
  const [targetMonth, setTargetMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [intent, setIntent] = useState('');
  const [description, setDescription] = useState('');
  const [filmingPlan, setFilmingPlan] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [keywords, setKeywords] = useState('');
  const [finalUrl, setFinalUrl] = useState('');
  // 완성본 전용 — 기존 "기획 의도"/"구성 및 내용 설명" textarea를 완성본 모드에서는
  // 본문/캡션 내용으로 재활용한다(아래 isAttachingFinal 분기 참고).
  const [postContent, setPostContent] = useState('');

  const isAttachingFinal = mode === 'final' && !!targetItem;

  // PC Crew Selection State
  const authorName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '기자';
  const [crew, setCrew] = useState<string[]>([authorName]);
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'my_team' | 'other_teams'>('my_team');
  const [dbProfiles, setDbProfiles] = useState<any[]>(allProfiles);

  // Fetch real reporter profiles from DB if allProfiles is empty
  useEffect(() => {
    if (allProfiles && allProfiles.length > 0) {
      setDbProfiles(allProfiles);
    } else {
      const fetchProfiles = async () => {
        const { data } = await supabase.from('contents').select('author_name, team').not('author_name', 'is', null);
        if (data) {
          const uniqueProfiles: any[] = [];
          const seen = new Set();
          data.forEach(item => {
            if (item.author_name && !seen.has(item.author_name)) {
              seen.add(item.author_name);
              uniqueProfiles.push({ author_name: item.author_name, team: item.team || 'SNS기자단' });
            }
          });
          setDbProfiles(uniqueProfiles);
        }
      };
      fetchProfiles();
    }
  }, [allProfiles, supabase]);

  // 완성본을 특정 콘텐츠에 연결하는 경우, 그 콘텐츠에 이미 저장된 완성본 필드(재제출/
  // 수정하기로 다시 열린 경우 포함)로 폼을 미리 채운다 — PC FinalSubmitForm의 프리필과
  // 동일한 필드 매핑(postContent/desiredDate/finalKeywords/finalCrew/finalDescription).
  // 폼이 열릴 때(또는 대상이 바뀔 때)마다 "초기 상태" 스니펫도 함께 저장해두는데,
  // 이걸 나중에 취소 버튼에서 변경 여부를 판단하는 기준으로 쓴다(아래 handleCancel).
  const initialSnapshotRef = useRef('');
  useEffect(() => {
    if (!isOpen) return;
    if (isAttachingFinal) {
      let bodyObj: any = {};
      try {
        if (targetItem.content_body && targetItem.content_body.startsWith('{')) {
          bodyObj = JSON.parse(targetItem.content_body);
        }
      } catch (e) {}
      const prefillFinalUrl = targetItem.final_url || bodyObj.docsUrl || '';
      const prefillPostContent = bodyObj.postContent || '';
      const prefillDescription = bodyObj.finalDescription || '';
      const prefillKeywords = bodyObj.finalKeywords || targetItem.keywords || '';
      const prefillDesiredDate = bodyObj.desiredDate || targetItem.target_date || '';
      const crewSource = bodyObj.finalCrew || bodyObj.crew || '';
      const prefillCrew = crewSource
        ? String(crewSource).split(',').map((s: string) => s.trim()).filter(Boolean)
        : [authorName];

      setFinalUrl(prefillFinalUrl);
      setPostContent(prefillPostContent);
      setDescription(prefillDescription);
      setKeywords(prefillKeywords);
      setDesiredDate(prefillDesiredDate);
      setCrew(prefillCrew);

      initialSnapshotRef.current = JSON.stringify({
        finalUrl: prefillFinalUrl, postContent: prefillPostContent, description: prefillDescription,
        keywords: prefillKeywords, desiredDate: prefillDesiredDate, crew: prefillCrew,
      });
    } else {
      initialSnapshotRef.current = JSON.stringify({
        title: '', team: user?.user_metadata?.team || '인스타', contentType: '카드뉴스', articleType: '개인기사',
        intent: '', description: '', filmingPlan: '', desiredDate: '', deadline: '', keywords: '', finalUrl: '',
        postContent: '', crew: [authorName],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, targetItem, isAttachingFinal]);

  const currentSnapshot = () => JSON.stringify({
    title, team, contentType, articleType, intent, description, filmingPlan,
    desiredDate, deadline, keywords, finalUrl, postContent, crew,
  });

  const { handleProps, rootStyle } = useSwipeDownToDismiss(onClose);

  if (!isOpen) return null;

  const handleCancel = () => {
    const hasChanges = currentSnapshot() !== initialSnapshotRef.current;
    if (hasChanges && !window.confirm('변경 사항이 있습니다. 저장하지 않고 나가시겠습니까?')) {
      return;
    }
    onClose();
  };

  const toggleCrewMember = (profileName: string) => {
    if (crew.includes(profileName)) {
      if (profileName !== authorName) {
        setCrew(crew.filter(n => n !== profileName));
      }
    } else {
      setCrew([...crew, profileName]);
    }
  };

  const handleRemoveCrew = (nameToRemove: string) => {
    if (nameToRemove === authorName && crew.length === 1) return; // keep author if only one
    setCrew(crew.filter(n => n !== nameToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAttachingFinal && !title.trim()) {
      alert('제목을 입력해 주세요.');
      return;
    }

    if (mode === 'final' && !finalUrl.trim()) {
      alert('구글 드라이브 / URL 링크를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setSuccessMsg('');

    try {
      const crewString = crew.join(', ');

      if (isAttachingFinal) {
        // 이 콘텐츠(targetItem)에 완성본을 연결 — 새 글을 만들지 않고 기존 행을
        // 완성본 전용 필드로 업데이트한다. PC FinalSubmitForm.tsx의 handleSubmit과
        // 동일한 필드 매핑(postContent/finalKeywords/finalCrew/finalDescription).
        const { data: current } = await supabase.from('contents').select('content_body').eq('id', targetItem.id).single();
        let bodyData: any = {};
        try { if (current?.content_body) bodyData = JSON.parse(current.content_body); } catch (e) {}

        const updatedBody = {
          ...bodyData,
          postContent,
          desiredDate,
          finalKeywords: keywords,
          finalCrew: crewString,
          finalDescription: description,
          finalSubmittedAt: bodyData.finalSubmittedAt || new Date().toISOString(),
        };

        const { error } = await supabase.from('contents')
          .update({
            final_url: finalUrl,
            content_body: JSON.stringify(updatedBody),
            status: 'final_submitted',
          })
          .eq('id', targetItem.id);

        if (error) throw error;

        setSuccessMsg('완성본이 성공적으로 업로드되었습니다! 🎉');
        setTimeout(() => {
          setIsSubmitting(false);
          setSuccessMsg('');
          onClose();
          router.refresh();
        }, 1000);
        return;
      }

      const authorEmail = user?.email || 'user@yonsei.ac.kr';

      const bodyObj = {
        authorEmail,
        desiredDate,
        deadline,
        intent,
        description,
        filmingPlan,
        articleType,
        targetMonth,
        crew: crewString,
        docsUrl: finalUrl
      };

      const payload = {
        title,
        team,
        content_type: contentType,
        author_name: authorName,
        status: mode === 'final' ? 'final_submitted' : 'pending',
        intent,
        description,
        keywords,
        final_url: mode === 'final' ? finalUrl : null,
        target_date: desiredDate || null,
        content_body: JSON.stringify(bodyObj),
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('contents').insert([payload]);

      if (error) {
        throw error;
      }

      setSuccessMsg(mode === 'final' ? '완성본이 성공적으로 업로드되었습니다! 🎉' : '기획안이 성공적으로 제출되었습니다! 🎉');
      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessMsg('');
        onClose();
        router.refresh();
      }, 1000);

    } catch (err: any) {
      alert(`제출 중 오류가 발생했습니다: ${err.message || err}`);
      setIsSubmitting(false);
    }
  };

  const filteredProfiles = dbProfiles.filter(p => {
    if (!p.author_name) return false;
    if (memberSearchQuery && !p.author_name.includes(memberSearchQuery)) return false;
    if (activeTab === 'my_team') {
      return team && p.team === team;
    } else {
      return !team || p.team !== team;
    }
  });

  return (
    <div
      className="absolute inset-0 z-50 bg-[#F4F5F7] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 ease-out"
      style={rootStyle}
    >
      {/* 종이를 아래에서 위로 꺼낸 모션의 반대 동작 — 이 핸들을 아래로 스와이프하면 닫힌다.
          예전엔 진한 네이비 배경 헤더 바 하나가 이어져 있었는데, 앱 전체에 이미 적용된
          "헤더 해체" 원칙(GNB·상세보기와 동일)에 맞춰 배경 없는 손잡이로 바꿨다. */}
      <div {...handleProps} className="safe-pt pt-2.5 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
        <div className="w-10 h-1.5 rounded-full bg-slate-300" />
      </div>

      {/* 1. Header — 이어진 네이비 바 대신 아이콘+타이틀 칩과 닫기 버튼을 각자 독립된
          글래스 조각으로 분리(GNB·상세보기와 같은 패턴). */}
      <header className="px-4 py-3 flex items-center justify-between gap-2">
        <div className="glass-cta flex items-center gap-2 px-3.5 py-2 rounded-2xl">
          <span className="text-base">{mode === 'final' ? '📤' : '✍️'}</span>
          <h2 className="text-sm font-black text-slate-900 tracking-tight">
            {mode === 'final' ? '완성본 업로드' : '기획안 작성'}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="glass-cta w-9 h-9 rounded-full flex items-center justify-center text-slate-700 font-bold text-sm active:scale-95 transition-transform"
        >
          ✕
        </button>
      </header>

      {/* 2. Main Full Screen Form Body (100% PC Specs & Crew Selector) */}
      <form onSubmit={handleSubmit} className="flex-1 p-5 overflow-y-auto overflow-x-hidden space-y-4 max-w-xl mx-auto w-full pb-32 text-slate-900">
        
        {successMsg && (
          <div className="p-4 bg-emerald-50 text-emerald-800 font-extrabold text-sm rounded-2xl text-center border border-emerald-200 animate-in fade-in shadow-xs">
            {successMsg}
          </div>
        )}

        {/* 완성본을 특정 콘텐츠에 연결하는 경우 — 제목/분류는 그 콘텐츠(기획안)에
            이미 정해져 있는 값이라 다시 입력받지 않고, 대상이 무엇인지만 보여준다
            (PC FinalSubmitForm의 "선택된 기획안" 카드와 동일한 역할). */}
        {isAttachingFinal ? (
          <div className="p-4 bg-[#EBF3FF] border border-[#99B3D6]/60 rounded-2xl space-y-1">
            <div className="text-[10px] font-bold text-[#003378]">완성본을 업로드할 콘텐츠</div>
            <div className="text-sm font-black text-[#002454] leading-snug">{targetItem.title}</div>
            <div className="text-xs font-medium text-[#1A4B8C]">
              {targetItem.team || '팀'} · {targetItem.content_type || '콘텐츠'}
            </div>
          </div>
        ) : (
          <>
            {/* 1. 제목 (가제) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111111] block">
                제목 (가제) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="내용을 입력해 주세요"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-[#111111] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            {/* 2. 콘텐츠 분류 Grid (4열 PC 스펙 1:1) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111111] block">콘텐츠 분류</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <select
                  value={team}
                  onChange={e => setTeam(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                >
                  <option value="인스타">인스타 팀</option>
                  <option value="유튜브">유튜브 팀</option>
                  <option value="블로그">블로그 팀</option>
                  <option value="단장 팀">단장 팀</option>
                </select>

                <input
                  type="month"
                  value={targetMonth}
                  onChange={e => setTargetMonth(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />

                <select
                  value={articleType}
                  onChange={e => setArticleType(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                >
                  <option value="개인기사">개인기사</option>
                  <option value="팀기사">팀기사</option>
                </select>

                <select
                  value={contentType}
                  onChange={e => setContentType(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                >
                  <option value="카드뉴스">카드뉴스</option>
                  <option value="영상(숏폼)">영상(숏폼)</option>
                  <option value="영상(롱폼)">영상(롱폼)</option>
                  <option value="글 기사">글 기사</option>
                  <option value="사진/기타">사진/기타</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* 3. 구글 드라이브 / URL 링크 (완성본 필수, 기획안 선택) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#111111] block">
            {mode === 'final' ? '구글 드라이브 / URL 링크 *' : '기획안 문서 URL 연결'}
          </label>
          <input
            type="url"
            required={mode === 'final'}
            placeholder="https://drive.google.com/file/d/..."
            value={finalUrl}
            onChange={e => setFinalUrl(e.target.value)}
            className="w-full px-4 py-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        {/* 4. 참여인원 (크루) - PC 1:1 선택/추가/삭제 시스템 */}
        <div className="space-y-1.5 relative">
          <label className="text-xs font-bold text-[#111111] block">참여인원 (크루)</label>
          
          <div className="bg-white p-3.5 border border-slate-200 rounded-2xl shadow-2xs flex items-center gap-3 overflow-x-auto">
            {/* Added Crew Avatars */}
            {crew.map((memberName) => (
              <div key={memberName} className="flex flex-col items-center relative flex-shrink-0">
                <div className="w-11 h-11 rounded-full bg-[#002454] text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-xs">
                  {memberName.slice(0, 2)}
                </div>
                <span className="text-[11px] font-bold text-slate-800 mt-1">{memberName}</span>

                {/* Remove Red Badge */}
                {crew.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCrew(memberName)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white font-extrabold text-[10px] flex items-center justify-center border border-white shadow-2xs hover:bg-red-600 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {/* Plus Button to Open PC Selection Modal */}
            <button
              type="button"
              onClick={() => setShowMemberSelect(!showMemberSelect)}
              className="w-11 h-11 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 font-bold text-lg hover:border-blue-500 hover:text-blue-600 transition-all flex-shrink-0"
              title="크루원 추가"
            >
              +
            </button>
          </div>

          {/* Member Selection Drawer (PC 1:1 System) */}
          {showMemberSelect && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in zoom-in-95 duration-150">
              {/* Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setActiveTab('my_team')}
                  className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors ${
                    activeTab === 'my_team' ? 'border-blue-900 text-blue-900 bg-white' : 'border-transparent text-slate-500'
                  }`}
                >
                  우리 팀 ({team})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('other_teams')}
                  className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors ${
                    activeTab === 'other_teams' ? 'border-blue-900 text-blue-900 bg-white' : 'border-transparent text-slate-500'
                  }`}
                >
                  다른 팀
                </button>
              </div>

              {/* Search Field */}
              <div className="p-3 border-b border-slate-100">
                <input
                  type="text"
                  placeholder="크루원 이름 검색..."
                  value={memberSearchQuery}
                  onChange={e => setMemberSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Members List */}
              <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                {filteredProfiles.length > 0 ? (
                  filteredProfiles.map(p => {
                    const isSelected = crew.includes(p.author_name);
                    return (
                      <div
                        key={p.author_name}
                        onClick={() => toggleCrewMember(p.author_name)}
                        className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <span>{p.author_name} <span className="text-[10px] text-slate-400 font-medium">({p.team})</span></span>
                        {isSelected && <span className="text-blue-600 font-extrabold">✓</span>}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 font-medium">검색된 단원이 없습니다.</div>
                )}
              </div>

              {/* Close Bar */}
              <div className="p-2.5 border-t border-slate-100 bg-slate-50 text-center">
                <button
                  type="button"
                  onClick={() => setShowMemberSelect(false)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  닫기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5. 기획 의도 및 배경 — 완성본 연결 모드에서는 완성본 전용 필드인 "본문 /
            캡션 내용"(postContent)로 재활용한다(PC 완성본 폼에 있는 필드, 기획안의
            기획 의도와는 다른 값). */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#111111] block">
            {isAttachingFinal ? '본문 / 캡션 내용' : '기획 의도 및 배경'}
          </label>
          <textarea
            rows={4}
            placeholder={isAttachingFinal ? '실제로 게시된(될) 본문이나 캡션 내용을 입력해 주세요.' : '기획 의도 및 배경을 상세히 입력해 주세요.'}
            value={isAttachingFinal ? postContent : intent}
            onChange={e => (isAttachingFinal ? setPostContent(e.target.value) : setIntent(e.target.value))}
            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-2xs leading-relaxed"
          />
        </div>

        {/* 6. 구성 및 내용 설명 — 완성본 연결 모드에서는 "비고"(finalDescription)로. */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#111111] block">
            {isAttachingFinal ? '비고' : '구성 및 내용 설명'}
          </label>
          <textarea
            rows={4}
            placeholder={isAttachingFinal ? '전달하고 싶은 추가 메모가 있다면 입력해 주세요.' : '구성 및 세부 내용 구성을 작성해 주세요.'}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-2xs leading-relaxed"
          />
        </div>

        {/* 7. 촬영 계획 — 기획안 전용 필드라 완성본 연결 모드에서는 숨긴다. */}
        {!isAttachingFinal && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111111] block">촬영 계획</label>
            <textarea
              rows={3}
              placeholder="촬영 장소, 준비물 및 촬영 일정을 작성해 주세요."
              value={filmingPlan}
              onChange={e => setFilmingPlan(e.target.value)}
              className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-2xs leading-relaxed"
            />
          </div>
        )}

        {/* 8. 희망 업로드 시기 & 데드라인 — 데드라인은 기획안 전용 개념이라 완성본
            연결 모드에서는 희망 업로드 시기만 단독으로 보여준다. */}
        {isAttachingFinal ? (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111111] block">희망 업로드 시기</label>
            <input
              type="date"
              value={desiredDate}
              onChange={e => setDesiredDate(e.target.value)}
              className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-medium shadow-2xs"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111111] block">희망 업로드 시기</label>
              <input
                type="date"
                value={desiredDate}
                onChange={e => setDesiredDate(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-medium shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111111] block">데드라인</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-medium shadow-2xs"
              />
            </div>
          </div>
        )}

        {/* 9. 해시태그 / 키워드 */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#111111] block">해시태그 / 키워드 (쉼표 구분)</label>
          <input
            type="text"
            placeholder="연세대, 축제, 카드뉴스"
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-medium shadow-2xs"
          />
        </div>
      </form>

      {/* 3. Sticky Bottom Action Bar — 제출/취소의 "자리"만 서로 바꾼 것으로, 각
          버튼의 크기(너비 비율)는 그대로 유지한다(제출은 flex-1로 넓게, 취소는
          w-1/3로 좁게 — 왼쪽/오른쪽만 바뀜). 취소는 변경된 값이 있으면 확인
          알럿을 띄운 뒤에만 닫는다(handleCancel). 예전엔 두 버튼을 흰 배경+상단
          보더로 이어붙인 도크 위에 얹었는데, 상세보기 푸터와 같은 이유로 그
          연결 배경을 없애 버튼이 콘텐츠 위에 직접 뜨도록 하고 재질도 글래스로
          바꿨다(제출=.glass-cta-primary, 취소=.glass-cta+.glass-cta-strong). */}
      <footer className="absolute bottom-0 left-0 right-0 p-4 z-40 max-w-xl mx-auto flex items-center gap-2 safe-pb">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="glass-cta-primary flex-1 py-4 text-white font-extrabold rounded-2xl text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
        >
          {isSubmitting ? (
            <span>처리 중...</span>
          ) : (
            <span>{mode === 'final' ? '완성본 업로드하기 ➔' : '기획안 제출하기 ➔'}</span>
          )}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="glass-cta glass-cta-strong w-1/3 py-4 text-[#002454] font-extrabold rounded-2xl text-xs active:scale-95 transition-transform"
        >
          취소
        </button>
      </footer>
    </div>
  );
}
