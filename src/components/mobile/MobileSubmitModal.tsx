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
  const [team, setTeam] = useState(user?.user_metadata?.team || '유튜브');
  const [contentType, setContentType] = useState('카드뉴스');
  const [intent, setIntent] = useState('');
  const [description, setDescription] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [keywords, setKeywords] = useState('');
  const [finalUrl, setFinalUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('제목을 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setSuccessMsg('');

    try {
      const authorName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '기자';
      const authorEmail = user?.email || 'user@yonsei.ac.kr';

      const bodyObj = {
        authorEmail,
        desiredDate,
        intent,
        description,
        articleType: contentType,
        docsUrl: mode === 'final' ? finalUrl : ''
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
      }, 1200);

    } catch (err: any) {
      alert(`제출 중 오류가 발생했습니다: ${err.message || err}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 transition-opacity duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-[#002454] text-white">
          <div className="flex items-center gap-2">
            <span className="text-base">{mode === 'final' ? '📤' : '✍️'}</span>
            <span className="text-base font-extrabold tracking-tight">
              {mode === 'final' ? '모바일 완성본 업로드' : '모바일 기획안 작성'}
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-slate-800 flex-1">
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 text-emerald-800 font-extrabold text-sm rounded-xl text-center border border-emerald-200 animate-in fade-in">
              {successMsg}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">제목 (가제) <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              placeholder="내용을 입력해 주세요"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Team & Content Type Grid (Exact System Options) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">콘텐츠 팀 선택 <span className="text-red-500">*</span></label>
              <select
                value={team}
                onChange={e => setTeam(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="유튜브">유튜브</option>
                <option value="인스타">인스타</option>
                <option value="블로그">블로그</option>
                <option value="단장 팀">단장 팀</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">종류 선택 <span className="text-red-500">*</span></label>
              <select
                value={contentType}
                onChange={e => setContentType(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="카드뉴스">카드뉴스</option>
                <option value="영상(숏폼)">영상(숏폼)</option>
                <option value="영상(롱폼)">영상(롱폼)</option>
                <option value="글 기사">글 기사</option>
                <option value="사진/기타">사진/기타</option>
              </select>
            </div>
          </div>

          {/* Google Drive Link if Final mode */}
          {mode === 'final' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">구글 드라이브 / URL 링크 <span className="text-red-500">*</span></label>
              <input
                type="url"
                required
                placeholder="https://drive.google.com/file/d/..."
                value={finalUrl}
                onChange={e => setFinalUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Intent */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">기획 의도 및 배경</label>
            <textarea
              rows={3}
              placeholder="기획 의도 및 배경을 입력해 주세요."
              value={intent}
              onChange={e => setIntent(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">구성 및 내용 설명</label>
            <textarea
              rows={3}
              placeholder="구성 및 세부 내용을 입력해 주세요."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Target Date & Keywords Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">희망 업로드 시기</label>
              <input
                type="date"
                value={desiredDate}
                onChange={e => setDesiredDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">해시태그 / 키워드</label>
              <input
                type="text"
                placeholder="연세대, 축제"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-[#002454] text-white font-extrabold rounded-xl text-xs hover:bg-blue-900 transition-colors shadow-md flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <span>제출 중...</span>
              ) : (
                <span>{mode === 'final' ? '완성본 업로드' : '기획안 제출하기'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
