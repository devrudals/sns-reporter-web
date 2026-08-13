'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface MobileSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'proposal' | 'final';
  user?: any;
}

export default function MobileSubmitModal({ isOpen, onClose, mode, user }: MobileSubmitModalProps) {
  const supabase = createClient();
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
  const [selectedCrew, setSelectedCrew] = useState<string[]>([]);

  // Crew list sample for interactive chips
  const sampleCrewList = ['안정윤', '이경민', '용준안', '김서연', '현나리', '최예인'];

  if (!isOpen) return null;

  const toggleCrewMember = (name: string) => {
    if (selectedCrew.includes(name)) {
      setSelectedCrew(selectedCrew.filter(n => n !== name));
    } else {
      setSelectedCrew([...selectedCrew, name]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
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
      const authorName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '기자';
      const authorEmail = user?.email || 'user@yonsei.ac.kr';

      const crewString = selectedCrew.length > 0 ? selectedCrew.join(', ') : authorName;

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
        window.location.reload();
      }, 1000);

    } catch (err: any) {
      alert(`제출 중 오류가 발생했습니다: ${err.message || err}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#F4F5F7] flex flex-col w-full h-full min-h-screen overflow-hidden animate-in fade-in duration-200"
    >
      {/* 1. Header Navigation Bar (Full Screen View Header) */}
      <header className="bg-[#002454] text-white px-5 py-4 flex items-center justify-between shadow-md sticky top-0 z-30 font-['Pretendard']">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{mode === 'final' ? '📤' : '✍️'}</span>
          <h2 className="text-base font-black tracking-tight">
            {mode === 'final' ? '모바일 완성본 업로드' : '모바일 기획안 작성'}
          </h2>
        </div>
        <button 
          onClick={onClose} 
          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition-colors text-sm"
        >
          ✕
        </button>
      </header>

      {/* 2. Main Full Screen Form Body (100% PC Specs & Figma Matching) */}
      <form onSubmit={handleSubmit} className="flex-1 p-5 overflow-y-auto space-y-4 max-w-xl mx-auto w-full pb-32 font-['Pretendard'] text-slate-900">
        
        {successMsg && (
          <div className="p-4 bg-emerald-50 text-emerald-800 font-extrabold text-sm rounded-2xl text-center border border-emerald-200 animate-in fade-in shadow-xs">
            {successMsg}
          </div>
        )}

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

        {/* 4. 참여인원 (크루) Interactive Chips */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#111111] block">참여인원 (크루원 선택)</label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-white p-3 border border-slate-200 rounded-2xl shadow-2xs">
            {sampleCrewList.map((name, i) => {
              const isSelected = selectedCrew.includes(name);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleCrewMember(name)}
                  className={`flex flex-col items-center p-1 rounded-xl transition-all cursor-pointer ${
                    isSelected ? 'scale-105' : 'opacity-70'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border-2 ${
                    isSelected ? 'bg-[#002454] text-white border-blue-500 shadow-md' : 'bg-slate-100 text-slate-600 border-white'
                  }`}>
                    {name.slice(0, 2)}
                  </div>
                  <span className={`text-[10px] font-bold mt-1 ${isSelected ? 'text-blue-900 font-extrabold' : 'text-slate-500'}`}>
                    {name} {isSelected && '✓'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. 기획 의도 및 배경 */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#111111] block">기획 의도 및 배경</label>
          <textarea
            rows={4}
            placeholder="기획 의도 및 배경을 상세히 입력해 주세요."
            value={intent}
            onChange={e => setIntent(e.target.value)}
            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-2xs leading-relaxed"
          />
        </div>

        {/* 6. 구성 및 내용 설명 */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#111111] block">구성 및 내용 설명</label>
          <textarea
            rows={4}
            placeholder="구성 및 세부 내용 구성을 작성해 주세요."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-2xs leading-relaxed"
          />
        </div>

        {/* 7. 촬영 계획 */}
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

        {/* 8. 희망 업로드 시기 & 데드라인 Grid */}
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

      {/* 3. Sticky Bottom Action Bar (Full Screen Navigation) */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-40 max-w-xl mx-auto flex items-center gap-2 font-['Pretendard']">
        <button
          type="button"
          onClick={onClose}
          className="w-1/3 py-4 bg-slate-100 text-slate-700 font-extrabold rounded-2xl text-xs hover:bg-slate-200 transition-colors"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 py-4 bg-[#002454] text-white font-extrabold rounded-2xl text-sm hover:bg-blue-900 transition-colors shadow-lg flex items-center justify-center gap-1.5"
        >
          {isSubmitting ? (
            <span>처리 중...</span>
          ) : (
            <span>{mode === 'final' ? '완성본 업로드하기 ➔' : '기획안 제출하기 ➔'}</span>
          )}
        </button>
      </footer>
    </div>
  );
}
