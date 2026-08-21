'use client';

import { useState } from 'react';
import { 
  InstagramIcon, 
  YoutubeIcon, 
  NaverBlogIcon 
} from '@/components/platformIcons';

type TabType = 'workflow' | 'platforms' | 'brand' | 'planning' | 'copyright';

export default function GuidelinesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('workflow');
  const [activePlatform, setActivePlatform] = useState<'instagram_card' | 'reels_shorts' | 'youtube_long' | 'naver_blog'>('instagram_card');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="flex flex-col gap-8" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '6rem' }}>
      
      {/* Swiss Style & Glassmorphism Global Scoped CSS */}
      <style>{`
        .swiss-panel {
          background: rgba(255, 255, 255, 0.72);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          backdrop-filter: blur(28px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.75);
          border-top: 1.5px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 20px 45px -15px rgba(0, 36, 84, 0.07), 0 0 0 1px rgba(226, 232, 240, 0.4);
          border-radius: 24px;
        }
        
        .swiss-hero-glass {
          background: linear-gradient(135deg, rgba(0, 36, 84, 0.96) 0%, rgba(10, 20, 38, 0.98) 60%, rgba(15, 23, 42, 0.96) 100%);
          -webkit-backdrop-filter: blur(36px);
          backdrop-filter: blur(36px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-top: 1.5px solid rgba(255, 255, 255, 0.25);
          box-shadow: 0 30px 60px -15px rgba(0, 36, 84, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.15);
          border-radius: 28px;
        }

        .swiss-dark-card {
          background: linear-gradient(145deg, rgba(0, 36, 84, 0.88) 0%, rgba(15, 23, 42, 0.94) 100%);
          -webkit-backdrop-filter: blur(20px);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-top: 1.5px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 16px 36px -10px rgba(0, 36, 84, 0.35), inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .swiss-dark-card:hover {
          transform: translateY(-3px);
          border-color: rgba(96, 165, 250, 0.35);
          border-top-color: rgba(147, 197, 253, 0.5);
          box-shadow: 0 22px 48px -12px rgba(0, 36, 84, 0.5), 0 0 0 1px rgba(96, 165, 250, 0.2);
        }

        .swiss-nav-pill {
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .swiss-num {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-feature-settings: "tnum" 1, "cv01" 1;
          font-variant-numeric: tabular-nums;
        }

        .swiss-tag {
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
      `}</style>

      {/* 1. Header Banner: Swiss Typographic Monument */}
      <header className="swiss-hero-glass p-8 md:p-12 relative overflow-hidden text-white">
        {/* Subtle Ambient Light Rings */}
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37, 99, 235, 0.25) 0%, rgba(0, 36, 84, 0) 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '15%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, rgba(0, 36, 84, 0) 70%)', pointerEvents: 'none' }} />
        
        <div className="relative z-10 flex flex-col gap-6">
          
          {/* Metadata Top Bar */}
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider text-blue-200">
                OFFICIAL EDITORIAL STANDARD
              </span>
              <span className="text-xs text-slate-300 font-semibold tracking-wide">
                YONSEI MEDIA CENTER
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-6 text-xs text-slate-300 font-medium">
              <span>채널 규모: <strong className="text-white font-bold">50만+</strong></span>
              <span>•</span>
              <span>적용 채널: <strong className="text-white font-bold">4개 공식 플랫폼</strong></span>
              <span>•</span>
              <span>승인 프로세스: <strong className="text-white font-bold">2단계 필수 검수</strong></span>
            </div>
          </div>

          {/* Main Swiss Typographic Headline */}
          <div className="flex flex-col gap-3">
            <h1 style={{ 
              fontSize: 'clamp(2rem, 4.5vw, 2.85rem)', 
              fontWeight: 900, 
              letterSpacing: '-0.04em', 
              lineHeight: 1.15, 
              margin: 0,
              color: '#FFFFFF'
            }}>
              SNS기자단 콘텐츠 제작 가이드라인
            </h1>
            <p className="text-slate-200 text-sm md:text-base leading-relaxed max-w-3xl font-normal">
              연세대학교 공식 채널의 일관된 브랜드 정체성과 알고리즘 최적화를 위한 <strong>5단계 제작 워크플로우</strong>, 
              플랫폼별 <strong>Safe Zone(안전 규격)</strong>, 공식 비주얼 에셋 및 저작권 수칙을 안내합니다.
            </p>
          </div>
        </div>
      </header>

      {/* 2. Main Tab Navigation (Swiss Modular Glass Segmented Control) */}
      <nav 
        className="swiss-panel p-2"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '8px'
        }}
      >
        {[
          { id: 'workflow', index: '01', label: '워크플로우', sub: '기획 ➔ 승인 ➔ 발행 5단계' },
          { id: 'platforms', index: '02', label: '플랫폼 시각 규격', sub: '카드뉴스·릴스·유튜브 Safe Zone' },
          { id: 'brand', index: '03', label: '브랜드 & 비주얼', sub: '공식 컬러 HEX·권장 서체' },
          { id: 'planning', index: '04', label: '기획 & 섭외', sub: 'Want-Can-Hit 3원칙·DM 양식' },
          { id: 'copyright', index: '05', label: '저작권 & 법적 수칙', sub: '초상권·BGM 라이선스·출처' },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className="swiss-nav-pill group text-left flex flex-col justify-between"
              style={{
                padding: '14px 16px',
                borderRadius: '16px',
                border: isActive ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid transparent',
                background: isActive 
                  ? 'linear-gradient(135deg, #002454 0%, #0F172A 100%)' 
                  : 'transparent',
                color: isActive ? '#FFFFFF' : '#334155',
                cursor: 'pointer',
                boxShadow: isActive ? '0 12px 25px -6px rgba(0, 36, 84, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)' : 'none',
                minHeight: '74px'
              }}
            >
              <div className="flex items-center justify-between w-full">
                <span className="swiss-tag swiss-num" style={{ color: isActive ? '#93C5FD' : '#94A3B8' }}>
                  SECTION // {tab.index}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                )}
              </div>
              <div>
                <div style={{ fontSize: '0.94rem', fontWeight: 800, letterSpacing: '-0.02em', color: isActive ? '#FFFFFF' : '#0F172A' }}>
                  {tab.label}
                </div>
                <div style={{ fontSize: '0.72rem', color: isActive ? '#CBD5E1' : '#64748B', fontWeight: 500, marginTop: '2px' }}>
                  {tab.sub}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* ===================== TAB 1: WORKFLOW ===================== */}
      {activeTab === 'workflow' && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-300">
          
          {/* Timeline Process */}
          <section className="swiss-panel p-8 md:p-10">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-8 pb-4 border-b border-slate-200/80">
              <div>
                <div className="swiss-tag text-blue-900 font-extrabold mb-1">
                  PRODUCTION PROTOCOL // 5-STEP PIPELINE
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight m-0">
                  콘텐츠 제작 및 승인 5단계 파이프라인
                </h2>
              </div>
              <p className="text-slate-500 text-xs md:text-sm m-0 max-w-md">
                기획안 등록부터 최종 발행까지 전 과정은 검수 피드백을 통해 체계적으로 관리됩니다.
              </p>
            </div>

            {/* Workflow Steps Grid in Pure Swiss Dark Glass */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
              {[
                { step: '01', title: '기획안 작성', badge: '신규 제출', desc: '주제, 기획의도, 형식, 키워드 및 희망 업로드 일정을 대시보드에 등록합니다.' },
                { step: '02', title: '피드백 & 승인', badge: '관리자 검토', desc: '미디어센터 및 단장단이 중복 여부와 시의성을 검토하여 승인/수정 피드백을 전달합니다.' },
                { step: '03', title: '취재 및 제작', badge: '직접 취재', desc: '승인 완료 후 본격적인 현장 취재, 인터뷰 섭외 및 영상/카드뉴스 편집을 진행합니다.' },
                { step: '04', title: '완성본 제출', badge: '최종본 등록', desc: '제작 완료된 최종본 링크(구글 드라이브) 및 캡션 원고를 대시보드에 제출합니다.' },
                { step: '05', title: '최종 검수 & 발행', badge: '공식 업로드', desc: '최종 승인 후 대시보드 상태가 업로드 완료로 변경되며 공식 SNS 채널에 송출됩니다.' },
              ].map((s) => (
                <div 
                  key={s.step} 
                  className="swiss-dark-card flex flex-col justify-between"
                  style={{ 
                    padding: '1.6rem 1.4rem', 
                    minHeight: '220px'
                  }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="swiss-num" style={{ fontSize: '2rem', fontWeight: 900, color: '#60A5FA', lineHeight: 1, letterSpacing: '-0.04em' }}>
                      {s.step}
                    </span>
                    <span style={{ 
                      fontSize: '0.68rem', 
                      fontWeight: 800, 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                      color: '#93C5FD', 
                      padding: '4px 9px', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(147, 197, 253, 0.25)',
                      backdropFilter: 'blur(8px)',
                      letterSpacing: '0.04em'
                    }}>
                      {s.badge}
                    </span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                      {s.title}
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#CBD5E1', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Key Directives: Strict Protocols */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            
            {/* Directive 1 */}
            <div className="swiss-dark-card p-6 md:p-8" style={{ borderLeft: '2px solid #EF4444' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="swiss-tag text-red-400">
                  CRITICAL DIRECTIVE
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/60 font-bold">
                  필수 준수
                </span>
              </div>
              <h3 className="text-base md:text-lg font-black text-white mb-2 tracking-tight">
                사전 승인 없는 자체 업로드 절대 금지
              </h3>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                모든 콘텐츠는 <strong className="text-white font-bold">기획안 승인 ➔ 완성본 검수</strong>의 2중 피드백을 필수로 거칩니다. 승인되지 않은 콘텐츠는 임의로 공식 채널에 업로드될 수 없습니다.
              </p>
            </div>

            {/* Directive 2 */}
            <div className="swiss-dark-card p-6 md:p-8" style={{ borderLeft: '2px solid #3B82F6' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="swiss-tag text-blue-400">
                  FAST-TRACK DIRECTIVE
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-bold">
                  긴급 승인
                </span>
              </div>
              <h3 className="text-base md:text-lg font-black text-white mb-2 tracking-tight">
                시의성 긴급 콘텐츠 Fast-Track 소통
              </h3>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                축제, 합격자 발표, 행사 등 타이밍이 중요한 콘텐츠는 정기 마감일과 무관하게 <strong className="text-white font-bold">기획 단계부터 미디어센터와 실시간 소통</strong>하여 긴급 승인 후 즉시 취재 가능합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: PLATFORM VISUAL SPECS ===================== */}
      {activeTab === 'platforms' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          
          {/* Sub Platform Selector Pills */}
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'instagram_card', label: '인스타그램 카드뉴스 (4:5)', icon: <InstagramIcon className="w-4 h-4" /> },
              { id: 'reels_shorts', label: '릴스 / 숏폼 (9:16 Safe Zone)', icon: <InstagramIcon className="w-4 h-4" /> },
              { id: 'youtube_long', label: '유튜브 롱폼 & 썸네일 (16:9)', icon: <YoutubeIcon className="w-4 h-4" /> },
              { id: 'naver_blog', label: '네이버 블로그 (1:1 & SEO)', icon: <NaverBlogIcon className="w-4 h-4" /> },
            ].map(p => {
              const isSelected = activePlatform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePlatform(p.id as any)}
                  className="swiss-nav-pill flex items-center gap-2.5 px-5 py-3 rounded-xl cursor-pointer text-xs md:text-sm font-bold"
                  style={{
                    border: isSelected ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(226, 232, 240, 0.8)',
                    backgroundColor: isSelected ? '#002454' : 'rgba(255, 255, 255, 0.75)',
                    color: isSelected ? '#FFFFFF' : '#475569',
                    backdropFilter: 'blur(12px)',
                    boxShadow: isSelected ? '0 10px 25px -5px rgba(0, 36, 84, 0.35)' : 'none'
                  }}
                >
                  {p.icon}
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Platform 1: Instagram Card News */}
          {activePlatform === 'instagram_card' && (
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
              
              {/* Visual Blueprint Simulator */}
              <div className="swiss-panel p-8 flex flex-col items-center">
                <div className="swiss-tag text-pink-600 font-extrabold mb-5">
                  CANVAS SPEC // 4:5 RATIO (1080 × 1350 PX)
                </div>
                
                {/* 4:5 Frame (1080 x 1350) */}
                <div 
                  style={{ 
                    width: '240px', 
                    height: '300px', 
                    backgroundColor: '#0F172A', 
                    borderRadius: '20px', 
                    border: '2px solid rgba(225, 48, 108, 0.8)', 
                    boxShadow: '0 20px 40px rgba(225, 48, 108, 0.2)',
                    display: 'flex', 
                    flexDirection: 'column', 
                    padding: '14px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ position: 'absolute', inset: '14px', border: '1px dashed rgba(255, 255, 255, 0.25)', borderRadius: '12px', pointerEvents: 'none' }} />
                  
                  {/* Top Bar */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-blue-500" />
                      <span className="text-[10px] font-bold text-white">yonsei_official</span>
                    </div>
                    <span className="swiss-num text-[10px] text-slate-400 font-bold">1 / 8</span>
                  </div>

                  {/* Hero Cover Area */}
                  <div className="flex-1 rounded-xl bg-slate-900/90 border border-white/10 flex flex-col items-center justify-center p-3 text-center">
                    <span className="text-[10px] text-pink-400 font-extrabold mb-1">HOOKING TITLE</span>
                    <span className="text-xs font-black text-white leading-tight">
                      한눈에 들어오는<br/>핵심 제목 3줄 이내
                    </span>
                    <div className="mt-2.5 px-2 py-0.5 bg-blue-600/80 text-white rounded text-[9px] font-bold">
                      텍스트 면적 40% 미만 유지
                    </div>
                  </div>

                  {/* Bottom Indicator */}
                  <div className="flex justify-center gap-1 mt-2.5">
                    <div className="w-4 h-1 bg-pink-500 rounded" />
                    <div className="w-1 h-1 bg-slate-600 rounded" />
                    <div className="w-1 h-1 bg-slate-600 rounded" />
                  </div>
                </div>

                <div className="text-xs text-slate-500 mt-5 font-bold">
                  표준 해상도: <strong className="text-slate-900">1080 × 1350 px</strong> (4:5 Ratio)
                </div>
              </div>

              {/* Rules & Best Practices */}
              <div className="swiss-panel p-8 flex flex-col gap-5">
                <div>
                  <div className="swiss-tag text-blue-900 font-extrabold mb-1">
                    PRODUCTION RULES // INSTAGRAM CAROUSEL
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight m-0">
                    인스타그램 카드뉴스 제작 핵심 수칙
                  </h3>
                </div>
                
                <div className="flex flex-col gap-3.5">
                  <div className="swiss-dark-card p-5">
                    <div className="text-xs font-bold text-blue-400 mb-1 swiss-tag">STRUCTURE</div>
                    <h4 className="text-sm md:text-base font-bold text-white mb-1.5">슬라이드 8~10장 황금 구성</h4>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                      <strong className="text-blue-200 font-bold">표지(Hooking)</strong> ➔ <strong className="text-blue-200 font-bold">도입(문제제기/공감)</strong> ➔ <strong className="text-blue-200 font-bold">본문 3~7장(실질 꿀팁·스토리)</strong> ➔ <strong className="text-blue-200 font-bold">엔딩(저장·공유 CTA)</strong> 흐름을 준수하세요.
                    </p>
                  </div>

                  <div className="swiss-dark-card p-5">
                    <div className="text-xs font-bold text-blue-400 mb-1 swiss-tag">VISUAL MARGIN</div>
                    <h4 className="text-sm md:text-base font-bold text-white mb-1.5">텍스트 면적 40% 미만 & 여백 확보</h4>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                      모바일 피드에서 글자가 빽빽하면 스크롤을 멈추지 않습니다. 외곽에서 최소 <strong className="text-blue-200 font-bold">60px 이상의 안전 여백</strong>을 두고 한 슬라이드당 핵심 문장 1~2개로 압축하세요.
                    </p>
                  </div>

                  <div className="swiss-dark-card p-5">
                    <div className="text-xs font-bold text-blue-400 mb-1 swiss-tag">ALGORITHM SEO</div>
                    <h4 className="text-sm md:text-base font-bold text-white mb-1.5">해시태그는 핵심 5개 이하로 제한</h4>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                      알고리즘 최적화를 위해 무분별한 20~30개 태그 대신 <strong className="text-blue-200 font-bold">대시보드 AI 추천 해시태그</strong>를 활용하여 핵심 키워드 위주로 최대 5개까지만 기재합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Platform 2: Reels & Shorts */}
          {activePlatform === 'reels_shorts' && (
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
              
              {/* 9:16 Safe Zone Simulator */}
              <div className="swiss-panel p-8 flex flex-col items-center">
                <div className="swiss-tag text-purple-600 font-extrabold mb-5">
                  CANVAS SPEC // 9:16 SAFE ZONE (1080 × 1920 PX)
                </div>

                {/* Smartphone 9:16 Frame */}
                <div 
                  style={{ 
                    width: '210px', 
                    height: '370px', 
                    backgroundColor: '#0F172A', 
                    borderRadius: '28px', 
                    border: '3px solid #334155', 
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    position: 'relative', 
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  {/* Top Danger Zone */}
                  <div style={{ height: '52px', backgroundColor: 'rgba(239, 68, 68, 0.35)', borderBottom: '1px dashed #EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FEE2E2', fontSize: '0.62rem', fontWeight: 800 }}>
                    상단 UI 가림 영역 (15%)
                  </div>

                  {/* Center Golden Safe Zone */}
                  <div style={{ flex: 1, margin: '8px 38px 8px 14px', border: '1.5px solid #10B981', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#34D399', marginBottom: '4px' }}>핵심 안전 영역</span>
                    <span style={{ fontSize: '0.6rem', color: '#F8FAFC', lineHeight: 1.4, fontWeight: 500 }}>
                      자막 / 주요 피사체 / 텍스트는<br/>반드시 이 박스 안에 배치
                    </span>
                  </div>

                  {/* Right Danger Zone */}
                  <div style={{ position: 'absolute', right: '4px', top: '100px', bottom: '90px', width: '28px', backgroundColor: 'rgba(239, 68, 68, 0.35)', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around', padding: '6px 0' }}>
                    <span style={{ fontSize: '0.55rem', color: 'white' }}>ACTION</span>
                  </div>

                  {/* Bottom Danger Zone */}
                  <div style={{ height: '80px', backgroundColor: 'rgba(239, 68, 68, 0.35)', borderTop: '1px dashed #EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FEE2E2', fontSize: '0.62rem', fontWeight: 800, padding: '0 10px', textAlign: 'center' }}>
                    하단 캡션·계정명·음원 가림 (25%)
                  </div>
                </div>

                <div className="text-xs text-slate-500 mt-5 font-bold">
                  표준 규격: <strong className="text-slate-900">1080 × 1920 px</strong> (FHD / 60fps 권장)
                </div>
              </div>

              {/* Reels Rules */}
              <div className="swiss-panel p-8 flex flex-col gap-5">
                <div>
                  <div className="swiss-tag text-purple-900 font-extrabold mb-1">
                    PRODUCTION RULES // REELS & SHORTS
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight m-0">
                    릴스 & 숏폼 알고리즘 최적화 수칙
                  </h3>
                </div>

                <div className="flex flex-col gap-3.5">
                  <div className="swiss-dark-card p-5">
                    <div className="text-xs font-bold text-purple-400 mb-1 swiss-tag">RETENTION HOOK</div>
                    <h4 className="text-sm md:text-base font-bold text-white mb-1.5">첫 1.5초 이탈 방지 (Visual Hooking)</h4>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                      영상 시작 직후 질문, 시각적 충격, 또는 명확한 텍스트 훅으로 시선을 사로잡아야 시청 지속시간(Retention)이 확보됩니다.
                    </p>
                  </div>

                  <div className="swiss-dark-card p-5">
                    <div className="text-xs font-bold text-purple-400 mb-1 swiss-tag">SUBTITLE POSITION</div>
                    <h4 className="text-sm md:text-base font-bold text-white mb-1.5">자막은 화면 중앙(40~60%) 배치 필수</h4>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                      하단 25%는 계정명과 캡션 글씨가 덮으므로, <strong className="text-blue-200 font-bold">자막은 화면 중앙(높이 40~60% 지점)</strong>에 배치해야 완벽히 노출됩니다.
                    </p>
                  </div>

                  <div className="swiss-dark-card p-5">
                    <div className="text-xs font-bold text-purple-400 mb-1 swiss-tag">AUDIO MIXING</div>
                    <h4 className="text-sm md:text-base font-bold text-white mb-1.5">오디오 자체 믹싱 및 마스터링 권장</h4>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                      싱크 밀림을 방지하기 위해 BGM과 나레이션, 효과음을 편집 툴에서 완벽히 믹싱한 단일 MP4 파일로 제출하세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Platform 3: YouTube Long-form */}
          {activePlatform === 'youtube_long' && (
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
              
              {/* YouTube Thumbnail Canvas */}
              <div className="swiss-panel p-8 flex flex-col items-center">
                <div className="swiss-tag text-red-600 font-extrabold mb-5">
                  CANVAS SPEC // 16:9 THUMBNAIL (1280 × 720 PX)
                </div>

                <div 
                  style={{ 
                    width: '280px', 
                    height: '158px', 
                    backgroundColor: '#0F172A', 
                    borderRadius: '16px', 
                    border: '2px solid #DC2626', 
                    position: 'relative', 
                    padding: '14px', 
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 15px 35px rgba(220, 38, 38, 0.25)'
                  }}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-yellow-300 font-extrabold">좌측 / 중앙 집중 배치</span>
                    <span className="text-xs font-black text-white leading-tight">
                      한눈에 꽂히는<br/>썸네일 볼드 폰트
                    </span>
                  </div>

                  {/* Bottom Right Duration Badge Danger Zone */}
                  <div className="swiss-num self-end bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-extrabold">
                    12:45 (타임코드 가림 영역)
                  </div>
                </div>

                <div className="text-xs text-slate-500 mt-5 font-bold">
                  영상: <strong className="text-slate-900">1920 × 1080</strong> / 썸네일: <strong className="text-slate-900">1280 × 720 px</strong>
                </div>
              </div>

              {/* YouTube Rules */}
              <div className="swiss-panel p-8 flex flex-col gap-5">
                <div>
                  <div className="swiss-tag text-red-900 font-extrabold mb-1">
                    PRODUCTION RULES // YOUTUBE LONG-FORM
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight m-0">
                    유튜브 롱폼 제작 핵심 수칙
                  </h3>
                </div>

                <div className="flex flex-col gap-3.5">
                  <div className="swiss-dark-card p-5">
                    <div className="text-xs font-bold text-red-400 mb-1 swiss-tag">ASSET LIBRARY</div>
                    <h4 className="text-sm md:text-base font-bold text-white mb-1.5">미디어센터 유료 소스 구독 지원 활용</h4>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                      고품질 자막 템플릿, 음원, 트랜지션 소스를 위해 미디어센터 구독 계정(Envato / Motion Array)을 적극 활용하세요.
                    </p>
                  </div>

                  <div className="swiss-dark-card p-5">
                    <div className="text-xs font-bold text-red-400 mb-1 swiss-tag">TIME-CODE OVERLAY</div>
                    <h4 className="text-sm md:text-base font-bold text-white mb-1.5">우측 하단 타임코드 가림 영역 회피</h4>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                      유튜브 UI에서 우측 하단은 영상 재생 시간(예: 10:24) 뱃지가 가리므로 주요 인물이나 텍스트를 배치하지 마세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Platform 4: Naver Blog */}
          {activePlatform === 'naver_blog' && (
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
              
              <div className="swiss-panel p-8 flex flex-col items-center">
                <div className="swiss-tag text-green-600 font-extrabold mb-5">
                  CANVAS SPEC // 1:1 SQUARE (1000 × 1000 PX)
                </div>

                <div 
                  style={{ 
                    width: '200px', 
                    height: '200px', 
                    backgroundColor: '#0F172A', 
                    borderRadius: '20px', 
                    border: '2px solid #16A34A', 
                    padding: '16px',
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    textAlign: 'center', 
                    gap: '8px',
                    boxShadow: '0 15px 35px rgba(22, 163, 74, 0.2)'
                  }}
                >
                  <span className="text-xs font-extrabold text-green-400 swiss-tag">NAVER BLOG</span>
                  <span className="text-sm font-black text-white">대표 썸네일</span>
                  <span className="swiss-num text-xs text-green-300 font-bold">1000 × 1000 px</span>
                </div>

                <div className="text-xs text-slate-500 mt-5 font-bold">
                  권장 분량: <strong className="text-slate-900">3,000자 이상 & 사진 15장 이상</strong>
                </div>
              </div>

              <div className="swiss-panel p-8 flex flex-col gap-5">
                <div>
                  <div className="swiss-tag text-green-900 font-extrabold mb-1">
                    PRODUCTION RULES // NAVER BLOG SEO
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight m-0">
                    네이버 블로그 상위 노출(SEO) 수칙
                  </h3>
                </div>

                <div className="flex flex-col gap-3.5">
                  <div className="swiss-dark-card p-5">
                    <div className="text-xs font-bold text-green-400 mb-1 swiss-tag">KEYWORD PLACEMENT</div>
                    <h4 className="text-sm md:text-base font-bold text-white mb-1.5">핵심 검색 키워드의 자연스러운 배치</h4>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                      제목과 본문 서두/결미에 <strong className="text-green-300 font-bold">'연세대학교', '수강신청', '백양로'</strong> 등 실제 학우 및 수험생들이 검색하는 키워드를 균형 있게 반복 기재하세요.
                    </p>
                  </div>

                  <div className="swiss-dark-card p-5">
                    <div className="text-xs font-bold text-green-400 mb-1 swiss-tag">ORIGINAL MEDIA</div>
                    <h4 className="text-sm md:text-base font-bold text-white mb-1.5">직접 촬영한 고화질 원본 사진 활용</h4>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                      외부 캡처 대신 직접 촬영한 고해상도 사진을 문단 사이마다 균형 있게 배치하여 체류 시간을 늘립니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 3: BRAND & VISUAL ASSETS ===================== */}
      {activeTab === 'brand' && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-300">
          
          {/* Color Palette Card */}
          <section className="swiss-panel p-8 md:p-10">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-8 pb-4 border-b border-slate-200/80">
              <div>
                <div className="swiss-tag text-blue-900 font-extrabold mb-1">
                  VISUAL IDENTITY // COLOR STANDARDS
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight m-0">
                  연세대학교 공식 브랜드 컬러 팔레트
                </h2>
              </div>
              <p className="text-slate-500 text-xs md:text-sm m-0">
                카드를 클릭하면 디자인 툴에서 바로 사용할 수 있도록 HEX 코드가 클립보드에 자동 복사됩니다.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {[
                { name: 'Yonsei Deep Blue', sub: '공식 메인 로고 및 헤더', hex: '#002454', text: '#FFFFFF', isDark: true },
                { name: 'Yonsei Royal Blue', sub: '버튼, 뱃지 및 강조 그래픽', hex: '#1E3A8A', text: '#FFFFFF', isDark: true },
                { name: 'Yonsei Point Blue', sub: '하이라이트 및 액티브 상태', hex: '#2563EB', text: '#FFFFFF', isDark: true },
                { name: 'Yonsei Soft Sky', sub: '카드 배경 및 칩 뱃지', hex: '#EAF2FF', text: '#002454', isDark: false },
              ].map(c => (
                <div
                  key={c.hex}
                  onClick={() => copyToClipboard(c.hex, c.name)}
                  className="swiss-dark-card cursor-pointer p-6 flex flex-col justify-between"
                  style={{
                    backgroundColor: c.isDark ? c.hex : 'rgba(0, 36, 84, 0.88)',
                    minHeight: '160px'
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-200">{c.name}</span>
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-white/30" 
                        style={{ backgroundColor: c.hex }}
                      />
                    </div>
                    <div className="swiss-num text-2xl font-black text-white tracking-wider">
                      {c.hex}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-6 pt-3 border-t border-white/10">
                    <span className="text-xs text-slate-300 font-medium">{c.sub}</span>
                    <span className="text-[11px] font-bold bg-white/15 px-2.5 py-1 rounded-md text-blue-200 backdrop-blur-sm">
                      {copiedText === c.name ? '✓ 복사됨' : '클릭 복사'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Typography Guide */}
          <section className="swiss-panel p-8 md:p-10">
            <div className="mb-6">
              <div className="swiss-tag text-blue-900 font-extrabold mb-1">
                TYPOGRAPHIC SPEC // FREE COMMERCIAL LICENSES
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight m-0">
                공식 권장 서체 표준 (OFL 1.1)
              </h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              <div className="swiss-dark-card p-6 flex flex-col justify-between">
                <div>
                  <div className="swiss-tag text-blue-400 mb-1">HEADLINE & HOOKING TITLE</div>
                  <h3 className="text-lg font-black text-white my-2">Pretendard / Gmarket Sans</h3>
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                    모바일 피드에서 뛰어난 가독성을 제공하며 볼드 웨이트가 두꺼워 표지 후킹 타이틀에 최적화되어 있습니다.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <span>추천 웨이트: <strong className="text-white">Bold 700 / Black 900</strong></span>
                  <span className="bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold">OFL 라이선스</span>
                </div>
              </div>

              <div className="swiss-dark-card p-6 flex flex-col justify-between">
                <div>
                  <div className="swiss-tag text-emerald-400 mb-1">BODY & SUBTITLE</div>
                  <h3 className="text-lg font-black text-white my-2">KoPubWorld돋움 / Noto Sans KR</h3>
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                    긴 줄글 기사나 영상 자막에서도 글자 뭉개짐 없이 선명하고 정갈하게 읽히는 본문 전용 서체입니다.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <span>추천 웨이트: <strong className="text-white">Medium 500 / SemiBold 600</strong></span>
                  <span className="bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold">OFL 라이선스</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ===================== TAB 4: PLANNING & INTERVIEW ===================== */}
      {activeTab === 'planning' && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-300">
          
          {/* 3 Step Framework */}
          <section className="swiss-panel p-8 md:p-10">
            <div className="mb-6">
              <div className="swiss-tag text-blue-900 font-extrabold mb-1">
                EDITORIAL MATRIX // WANT × CAN × HIT
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight m-0">
                기획 소재 발굴 3원칙
              </h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div className="swiss-dark-card p-6">
                <div className="swiss-tag text-blue-400 mb-2">STEP 01 // WANT (하고 싶은 것)</div>
                <h3 className="text-base font-bold text-white mb-2">취재 열정과 명확한 동기</h3>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                  내가 진심으로 흥미를 가지고 취재할 수 있는 주제인가? (예: 숨겨진 학식 꿀조합, 교환학생 리얼 후기, 이색 동아리 인터뷰)
                </p>
              </div>

              <div className="swiss-dark-card p-6">
                <div className="swiss-tag text-emerald-400 mb-2">STEP 02 // CAN (할 수 있는 것)</div>
                <h3 className="text-base font-bold text-white mb-2">현실적 리소스 및 섭외 가능성</h3>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                  실제 취재 및 인터뷰 섭외가 가능한가? 마감 일정(D-Day) 내 제작 가능한 리소스와 대여 장비가 확보되었는가?
                </p>
              </div>

              <div className="swiss-dark-card p-6">
                <div className="swiss-tag text-amber-400 mb-2">STEP 03 // HIT (반응이 좋은 것)</div>
                <h3 className="text-base font-bold text-white mb-2">공감대와 보관 가치(Save)</h3>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                  학우들이 <strong className="text-white font-bold">'저장(Save)'</strong>하고 <strong className="text-white font-bold">'친구에게 공유'</strong>할 만한 실질적인 정보와 공감대가 담겨 있는가?
                </p>
              </div>
            </div>
          </section>

          {/* Official DM Template Copy */}
          <section className="swiss-panel p-8 md:p-10">
            <div className="flex justify-between items-center flex-wrap gap-4 mb-5">
              <div>
                <div className="swiss-tag text-blue-900 font-extrabold mb-1">
                  OFFICIAL COMMUNICATION // CASTING TEMPLATE
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight m-0">
                  공식 섭외 DM 템플릿
                </h3>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(
                  `안녕하세요, 연세대학교 공식 SNS 기자단 OOO 기자입니다!\n\n이번에 [기획 주제: 예) 연세인 인터뷰] 콘텐츠를 준비하던 중 학우님의 멋진 활동을 접하게 되어 공식 채널을 통해 소개해 드리고자 연락드렸습니다.\n\n- 소요 시간: 약 20~30분 내외 (서면/대면 협의 가능)\n- 혜택: 연세대학교 공식 인스타그램/유튜브 소개 및 소정의 기념품\n\n부담 없이 편하게 답변 주시면 감사하겠습니다. 늘 응원합니다! 😊`,
                  'DM Template'
                )}
                className="swiss-nav-pill bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold cursor-pointer shadow-md"
              >
                {copiedText === 'DM Template' ? '✓ 템플릿 복사 완료' : '📋 섭외 템플릿 복사'}
              </button>
            </div>

            <div className="swiss-dark-card p-6 font-mono text-xs md:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
{`안녕하세요, 연세대학교 공식 SNS 기자단 OOO 기자입니다!

이번에 [기획 주제: 예) 연세인 인터뷰] 콘텐츠를 준비하던 중 학우님의 멋진 활동을 접하게 되어 공식 채널을 통해 소개해 드리고자 연락드렸습니다.

- 소요 시간: 약 20~30분 내외 (서면/대면 협의 가능)
- 혜택: 연세대학교 공식 인스타그램/유튜브 소개 및 소정의 기념품

부담 없이 편하게 답변 주시면 감사하겠습니다. 늘 응원합니다! 😊`}
            </div>
          </section>
        </div>
      )}

      {/* ===================== TAB 5: COPYRIGHT & LEGAL ===================== */}
      {activeTab === 'copyright' && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-300">
          <section className="swiss-panel p-8 md:p-10">
            <div className="mb-6">
              <div className="swiss-tag text-blue-900 font-extrabold mb-1">
                LEGAL COMPLIANCE // ETHICS & COPYRIGHT
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight m-0">
                저작권 및 초상권 필수 준수 사항
              </h2>
            </div>

            <div className="flex flex-col gap-4">
              <div className="swiss-dark-card p-6" style={{ borderLeft: '2px solid #EF4444' }}>
                <div className="swiss-tag text-red-400 mb-1">DIRECTIVE 01 // PORTRAIT RIGHTS</div>
                <h3 className="text-base font-bold text-white mb-2">
                  초상권 및 촬영 동의서 (필수)
                </h3>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                  얼굴이 노출되는 인터뷰 대상자에게는 반드시 <strong className="text-white font-bold">'촬영 및 게시 동의'</strong>를 사전 구두/서면으로 받아야 합니다. 지나가는 행인의 얼굴이 식별 가능할 경우 블러(모자이크) 처리가 필수입니다.
                </p>
              </div>

              <div className="swiss-dark-card p-6" style={{ borderLeft: '2px solid #3B82F6' }}>
                <div className="swiss-tag text-blue-400 mb-1">DIRECTIVE 02 // COMMERCIAL LICENSE</div>
                <h3 className="text-base font-bold text-white mb-2">
                  상업용 폰트 및 BGM 라이선스
                </h3>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                  개인용 무료 폰트/음원이라도 학교 공식 채널(50만 계정)에 업로드 시 라이선스 위반이 될 수 있습니다. 반드시 <strong className="text-blue-300 font-bold">'OFL(Open Font License)'</strong> 폰트 및 미디어센터가 구독 중인 공식 음원 라이브러리를 사용하세요.
                </p>
              </div>

              <div className="swiss-dark-card p-6" style={{ borderLeft: '2px solid #10B981' }}>
                <div className="swiss-tag text-emerald-400 mb-1">DIRECTIVE 03 // ATTRIBUTION SYNTAX</div>
                <h3 className="text-base font-bold text-white mb-2">
                  인용 자료 및 통계 출처 표기 표준
                </h3>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed m-0">
                  외부 뉴스, 논문, 통계 자료를 인용할 때는 슬라이드 하단에 <code className="bg-white/10 text-blue-200 px-2 py-0.5 rounded font-mono text-xs">[출처: OOO통계청 2025]</code> 형식으로 명확히 출처를 기재합니다.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
