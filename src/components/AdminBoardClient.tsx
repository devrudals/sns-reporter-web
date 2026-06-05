'use client';

import React, { useState, useEffect } from 'react';
import ContentsLayout from './ContentsLayout';
import { useModal } from '@/contexts/ModalContext';

// ────────── Shared Helpers ──────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const getWeatherInfo = (code: number) => {
  if (code === 0) return { icon: '☀️', text: '맑음', color: '#F59E0B' };
  if (code === 1) return { icon: '🌤️', text: '대체로 맑음', color: '#F59E0B' };
  if (code === 2) return { icon: '⛅', text: '구름 조금', color: '#64748B' };
  if (code === 3) return { icon: '☁️', text: '흐림', color: '#94A3B8' };
  if ([45, 48].includes(code)) return { icon: '🌫️', text: '안개', color: '#94A3B8' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(code)) return { icon: '🌧️', text: '비', color: '#3B82F6' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: '❄️', text: '눈', color: '#60A5FA' };
  if ([95, 96, 99].includes(code)) return { icon: '⛈️', text: '뇌우', color: '#8B5CF6' };
  return { icon: '☀️', text: '맑음', color: '#F59E0B' };
};

interface WeatherData {
  current?: { temperature_2m: number; weather_code: number };
  daily?: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] };
}

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
        <svg fill="#ffffff" viewBox="0 0 24 24" width="12" height="12"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
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
  if (team === '단장 팀') {
    return (
      <div style={{ width: '24px', height: '24px', backgroundColor: '#003378', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'white', fontSize: '10px', fontWeight: 900 }}>Y</span>
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
          width: '18px', height: '18px', borderRadius: '50%',
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

const getDiscussionsCount = (bodyStr: string) => {
  try {
    const obj = JSON.parse(bodyStr);
    return obj.discussions && obj.discussions.length > 0 ? obj.discussions.length : 0;
  } catch(e) { return 0; }
};

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '임시저장', color: '#4b5563', bg: '#e5e7eb' },
  pending: { label: '기획안 대기', color: '#B45309', bg: '#FEF3C7' },
  revision: { label: '기획안 수정요청', color: '#B91C1C', bg: '#FEE2E2' },
  rejected: { label: '반려', color: '#4b5563', bg: '#e5e7eb' },
  approved: { label: '기획안 통과', color: '#047857', bg: '#D1FAE5' },
  final_submitted: { label: '완성본 대기', color: '#1D4ED8', bg: '#DBEAFE' },
  final_revision: { label: '완성본 수정요청', color: '#B91C1C', bg: '#FEE2E2' },
  completed: { label: '업로드 대기', color: '#003378', bg: '#E6EBF2' },
  uploaded: { label: '업로드 완료', color: '#047857', bg: '#D1FAE5' }
};


// ────────── Calendar Component ──────────

function AdminCalendar({
  year, month, weather
}: {
  year: number; month: number; weather: WeatherData | null;
}) {
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const today = new Date();

  const cells: Array<number | null> = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevDays = getDaysInMonth(year, month - 1);
  const fullCells = cells.map((d, i) => {
    if (d !== null) return { day: d, current: true };
    if (i < firstDay) return { day: prevDays - firstDay + i + 1, current: false };
    return { day: i - firstDay - daysInMonth + 1, current: false };
  });

  const isToday = (day: number) =>
    year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
  const isSun = (idx: number) => idx % 7 === 0;
  const isSat = (idx: number) => idx % 7 === 6;

  const getForecastIcon = (day: number) => {
    if (!weather || !weather.daily) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    const idx = weather.daily.time.indexOf(dateStr);
    if (idx !== -1) return getWeatherInfo(weather.daily.weather_code[idx]).icon;
    return null;
  };

  return (
    <div style={{ background: 'white', borderRadius: '24px', padding: '1.25rem 1.5rem', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)', border: '1px solid #E2E8F0', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
            {MONTH_NAMES[month]} {year}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '0.6rem' }}>
          {DAYS.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.78rem', fontWeight: 800, color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#94A3B8', padding: '0.25rem 0' }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px 4px' }}>
          {fullCells.map((cell, idx) => {
            const today_ = cell.current && isToday(cell.day);
            const textColor = !cell.current ? '#E2E8F0' : isSun(idx) ? '#EF4444' : isSat(idx) ? '#3B82F6' : '#334155';
            const cellWeatherIcon = cell.current ? getForecastIcon(cell.day) : null;
            return (
              <div key={idx} style={{
                padding: '0.25rem 0', textAlign: 'center', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '2px', position: 'relative', minHeight: '62px', cursor: 'default'
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  backgroundColor: today_ ? '#003378' : 'transparent',
                  color: today_ ? 'white' : textColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.88rem', fontWeight: today_ ? 900 : 700
                }}>
                  {cell.day}
                </div>
                {cellWeatherIcon ? (
                  <span style={{ fontSize: '1.05rem', lineHeight: '1.1', marginTop: '2px', display: 'block' }}>{cellWeatherIcon}</span>
                ) : (
                  <div style={{ height: '1.05rem', marginTop: '2px' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ────────── Content Table ──────────

function AdminContentTable({ year, month, contents, allProfiles }: { year: number; month: number; contents: any[]; allProfiles: any[] }) {
  const { openContentModal } = useModal();
  const pad = (n: number) => String(n).padStart(2, '0');
  const monthPrefix = `${year}-${pad(month + 1)}`;

  const filteredContents = contents.filter(c => {
    let bodyObj: any = {};
    try { bodyObj = JSON.parse(c.content_body || '{}'); } catch {}
    const dateStr = c.created_at ? c.created_at.split('T')[0] : '';
    let cMonth = bodyObj.targetMonth || dateStr.substring(0, 7);
    return cMonth === monthPrefix;
  });

  filteredContents.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const formatCrewName = (name: string) => {
    if (!name) return '';
    if (/^\d+기\s+/.test(name)) return name;
    if (/^\d+\s+/.test(name)) return name.replace(/^(\d+)\s+/, '$1기 ');
    const cleanName = name.replace(/^\d+(기)?\s+/, '');
    const profile = allProfiles.find(p => p.author_name === cleanName || p.author_name === name);
    if (profile && profile.keywords) {
      const kw = profile.keywords.toString().trim();
      const generation = kw.endsWith('기') ? kw : `${kw}기`;
      return `${generation} ${cleanName}`;
    }
    return cleanName;
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', height: '100%', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', padding: '12px 16px', backgroundColor: '#f8fafc', borderBottom: '2px solid #E6EBF2', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', gap: '10px' }}>
        <div style={{ width: '60px', textAlign: 'center' }}>희망일</div>
        <div style={{ width: '40px', textAlign: 'center' }}>채널</div>
        <div style={{ width: '60px', textAlign: 'center' }}>유형</div>
        <div style={{ flex: '2' }}>제목</div>
        <div style={{ flex: '1', textAlign: 'center' }}>참여인원</div>
        <div style={{ width: '60px', textAlign: 'center' }}>기사</div>
        <div style={{ width: '80px', textAlign: 'center' }}>작성일</div>
        <div style={{ width: '60px', textAlign: 'center' }}>피드백</div>
        <div style={{ width: '80px', textAlign: 'center' }}>진척도</div>
      </div>
      <div style={{ flex: '1', overflowY: 'auto', backgroundColor: '#ffffff' }}>
        {filteredContents.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#CBD5E1', fontSize: '0.9rem' }}>해당 월의 콘텐츠가 없습니다</div>
        ) : (
          <div style={{ padding: '0 16px 16px 16px' }}>
            {filteredContents.map(item => {
              let bodyObj: any = {};
              try { bodyObj = JSON.parse(item.content_body || '{}'); } catch {}
              const typeStyle = getTypeStyle(item.content_type);
              const mainAuthor = item.author_name;
              let allCrew = [mainAuthor];
              if (bodyObj.crew && typeof bodyObj.crew === 'string') {
                allCrew = bodyObj.crew.split(',').map((s:string) => s.trim()).filter(Boolean);
              }
              const mainAuthorNameOnly = mainAuthor ? mainAuthor.replace(/^\d+(기)?\s+/, '') : '';
              const others = allCrew.filter(c => {
                const cClean = c.replace(/^\d+(기)?\s+/, '');
                return cClean !== mainAuthorNameOnly && !mainAuthorNameOnly.includes(cClean);
              });
              const desiredDate = bodyObj.desiredDate || '';
              const articleType = bodyObj.articleType || '개인기사';

              return (
                <div
                  key={item.id}
                  onClick={() => openContentModal(item.id.toString())}
                  style={{ display: 'flex', padding: '12px 8px', borderBottom: '1px solid #f1f5f9', gap: '10px', alignItems: 'center', transition: 'all 0.2s', borderRadius: '8px', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                    {desiredDate ? (
                      <span style={{ fontSize: '0.72rem', color: '#1D4ED8', fontWeight: 700, backgroundColor: '#EFF6FF', padding: '3px 8px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                        {desiredDate.substring(5)}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#CBD5E1', fontStyle: 'italic' }}>미설정</span>
                    )}
                  </div>
                  <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>{getTeamPlatformIcon(item.team)}</div>
                  <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                    <span style={{ backgroundColor: typeStyle.bg, color: typeStyle.text, padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{typeStyle.label}</span>
                  </div>
                  <div style={{ flex: '2', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem' }}>{item.title}</div>
                  <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
                    {articleType === '개인기사' ? (
                      <span style={{ fontSize: '0.85rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <strong style={{ fontWeight: 800 }}>{formatCrewName(mainAuthor)}</strong>{others.length > 0 ? `, ${others.map(formatCrewName).join(', ')}` : ''}
                      </span>
                    ) : (
                      <>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.team}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <strong style={{ fontWeight: 800 }}>{formatCrewName(mainAuthor)}</strong>{others.length > 0 ? `, ${others.map(formatCrewName).join(', ')}` : ''}
                        </span>
                      </>
                    )}
                  </div>
                  <div style={{ width: '60px', textAlign: 'center', fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>{articleType}</div>
                  <div style={{ width: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#1e3a8a', backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, width: '100%', textAlign: 'center' }}>
                      기 {formatDate(item.created_at)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: bodyObj.finalSubmittedAt ? '#059669' : '#94a3b8', backgroundColor: bodyObj.finalSubmittedAt ? '#ecfdf5' : '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, width: '100%', textAlign: 'center' }}>
                      완 {bodyObj.finalSubmittedAt ? formatDate(bodyObj.finalSubmittedAt) : '-'}
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
        )}
      </div>
    </div>
  );
}


// ────────── Full List Table (all contents) ──────────

function FullContentList({ contents, allProfiles }: { contents: any[]; allProfiles: any[] }) {
  const { openContentModal } = useModal();
  const [listTab, setListTab] = useState<'active' | 'uploaded'>('active');

  const activeContents = contents.filter(c => !['draft', 'uploaded'].includes(c.status));
  const uploadedContents = contents.filter(c => c.status === 'uploaded');
  const displayContents = listTab === 'active' ? activeContents : uploadedContents;

  const formatCrewName = (name: string) => {
    if (!name) return '';
    if (/^\d+기\s+/.test(name)) return name;
    if (/^\d+\s+/.test(name)) return name.replace(/^(\d+)\s+/, '$1기 ');
    const cleanName = name.replace(/^\d+(기)?\s+/, '');
    const profile = allProfiles.find(p => p.author_name === cleanName || p.author_name === name);
    if (profile && profile.keywords) {
      const kw = profile.keywords.toString().trim();
      const generation = kw.endsWith('기') ? kw : `${kw}기`;
      return `${generation} ${cleanName}`;
    }
    return cleanName;
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)', border: '1px solid #E2E8F0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0' }}>
        <h3 style={{ fontWeight: 900, fontSize: '1.1rem', color: '#0F172A', margin: 0 }}>📋 전체 콘텐츠 목록</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['active', 'uploaded'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setListTab(tab)}
              style={{
                padding: '6px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
                border: listTab === tab ? 'none' : '1px solid #e2e8f0',
                backgroundColor: listTab === tab ? '#003378' : '#ffffff',
                color: listTab === tab ? '#ffffff' : '#64748b',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {tab === 'active' ? `진행중 (${activeContents.length})` : `업로드 완료 (${uploadedContents.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Column Headers */}
      <div style={{ display: 'flex', padding: '12px 16px', backgroundColor: '#f8fafc', borderBottom: '2px solid #E6EBF2', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', gap: '10px' }}>
        <div style={{ width: '60px', textAlign: 'center' }}>희망일</div>
        <div style={{ width: '40px', textAlign: 'center' }}>채널</div>
        <div style={{ width: '60px', textAlign: 'center' }}>유형</div>
        <div style={{ flex: '2' }}>제목</div>
        <div style={{ flex: '1', textAlign: 'center' }}>참여인원</div>
        <div style={{ width: '60px', textAlign: 'center' }}>기사</div>
        <div style={{ width: '80px', textAlign: 'center' }}>상태</div>
        <div style={{ width: '60px', textAlign: 'center' }}>피드백</div>
        <div style={{ width: '80px', textAlign: 'center' }}>진척도</div>
      </div>

      {/* Rows */}
      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {displayContents.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#CBD5E1', fontSize: '0.9rem' }}>해당 콘텐츠가 없습니다</div>
        ) : (
          <div style={{ padding: '0 16px 16px 16px' }}>
            {displayContents.map(item => {
              let bodyObj: any = {};
              try { bodyObj = JSON.parse(item.content_body || '{}'); } catch {}
              const typeStyle = getTypeStyle(item.content_type);
              const mainAuthor = item.author_name;
              let allCrew = [mainAuthor];
              if (bodyObj.crew && typeof bodyObj.crew === 'string') {
                allCrew = bodyObj.crew.split(',').map((s:string) => s.trim()).filter(Boolean);
              }
              const mainAuthorNameOnly = mainAuthor ? mainAuthor.replace(/^\d+(기)?\s+/, '') : '';
              const others = allCrew.filter(c => {
                const cClean = c.replace(/^\d+(기)?\s+/, '');
                return cClean !== mainAuthorNameOnly && !mainAuthorNameOnly.includes(cClean);
              });
              const desiredDate = bodyObj.desiredDate || '';
              const articleType = bodyObj.articleType || '개인기사';
              const statusInfo = statusLabels[item.status] || { label: item.status, color: '#64748b', bg: '#f1f5f9' };

              return (
                <div
                  key={item.id}
                  onClick={() => openContentModal(item.id.toString())}
                  style={{ display: 'flex', padding: '12px 8px', borderBottom: '1px solid #f1f5f9', gap: '10px', alignItems: 'center', transition: 'all 0.2s', borderRadius: '8px', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                    {desiredDate ? (
                      <span style={{ fontSize: '0.72rem', color: '#1D4ED8', fontWeight: 700, backgroundColor: '#EFF6FF', padding: '3px 8px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                        {desiredDate.substring(5)}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#CBD5E1', fontStyle: 'italic' }}>미설정</span>
                    )}
                  </div>
                  <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>{getTeamPlatformIcon(item.team)}</div>
                  <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                    <span style={{ backgroundColor: typeStyle.bg, color: typeStyle.text, padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{typeStyle.label}</span>
                  </div>
                  <div style={{ flex: '2', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem' }}>{item.title}</div>
                  <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <strong style={{ fontWeight: 800 }}>{formatCrewName(mainAuthor || '')}</strong>{others.length > 0 ? `, ${others.map(formatCrewName).join(', ')}` : ''}
                    </span>
                  </div>
                  <div style={{ width: '60px', textAlign: 'center', fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>{articleType}</div>
                  <div style={{ width: '80px', display: 'flex', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: statusInfo.color, backgroundColor: statusInfo.bg, padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                      {statusInfo.label}
                    </span>
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
        )}
      </div>
    </div>
  );
}


// ────────── Main Component ──────────

export default function AdminBoardClient({ contents, allProfiles = [] }: { contents: any[]; allProfiles?: any[] }) {
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  const [baseDate, setBaseDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // 3 stages
  const pendingProposals = contents.filter(c => c.status === 'pending');
  const pendingFinals = contents.filter(c => c.status === 'final_submitted');
  const awaitingSchedule = contents.filter(c => c.status === 'completed');

  // Teams
  const teams = [
    { id: '블로그', name: '블로그', color: '#16a34a', bg: '#dcfce7', icon: '📝' },
    { id: '인스타', name: '인스타', color: '#eab308', bg: '#fef3c7', icon: '📸' },
    { id: '유튜브', name: '유튜브', color: '#1d4ed8', bg: '#dbeafe', icon: '▶️' }
  ];

  // Weather fetch
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setWeatherLoading(true);
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=37.5598&longitude=126.9385&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=14&timezone=Asia%2FSeoul'
        );
        if (res.ok) setWeather(await res.json());
      } catch (e) {
        console.error('Failed to fetch weather', e);
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchWeather();
  }, []);

  const handlePrev = () => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNext = () => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const y1 = baseDate.getFullYear();
  const m1 = baseDate.getMonth();
  const y2 = m1 === 11 ? y1 + 1 : y1;
  const m2 = m1 === 11 ? 0 : m1 + 1;

  const currentWeather = weather?.current;
  const currentWeatherInfo = currentWeather ? getWeatherInfo(currentWeather.weather_code) : null;

  const renderCard = (item: any) => (
    <div
      key={item.id}
      onClick={() => setSelectedItem(item)}
      style={{
        backgroundColor: '#f8fafc', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer', border: '1px solid #e2e8f0',
        display: 'flex', gap: '1rem', alignItems: 'center', transition: 'transform 0.15s, box-shadow 0.15s'
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'; }}
    >
      <div style={{ backgroundColor: '#e2e8f0', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', minWidth: '60px', textAlign: 'center' }}>
        {item.content_type || '기타'}
      </div>
      <div>
        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: 800 }}>{item.title}</h4>
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {item.team || '팀 없음'} - {item.author_name}
        </div>
      </div>
    </div>
  );

  const renderSection = (title: string, items: any[], headerColor: string) => (
    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', flex: '1', minWidth: 0 }}>
      <div style={{
        backgroundColor: headerColor, color: 'white', padding: '0.8rem 1.2rem', borderRadius: '12px',
        fontWeight: 800, fontSize: '1rem', marginBottom: '1.25rem', textAlign: 'center',
        boxShadow: `0 4px 12px ${headerColor}33`
      }}>
        {title} ({items.length})
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {teams.map(team => {
          const teamItems = items.filter(item => item.team === team.id || item.team?.includes(team.id));
          return (
            <div key={team.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{
                backgroundColor: team.color, color: 'white', padding: '0.6rem',
                borderRadius: '10px', fontWeight: 800, display: 'flex',
                justifyContent: 'center', alignItems: 'center', gap: '0.4rem',
                fontSize: '0.9rem'
              }}>
                <span>{team.icon}</span> {teamItems.length}개
              </div>
              <div style={{ minHeight: '80px', backgroundColor: team.bg, borderRadius: '10px', padding: '0.75rem' }}>
                {teamItems.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'rgba(0,0,0,0.2)', fontSize: '0.82rem', fontWeight: 600, padding: '1.5rem 0' }}>
                    대기 중인 항목 없음
                  </div>
                ) : (
                  teamItems.map(item => renderCard(item))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>콘텐츠 현황 관리</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>카드 클릭 시 상세 상태를 변경하고 피드백을 남길 수 있습니다.</p>
      </div>

      {/* ── SECTION 1: 3-Stage Board ── */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {renderSection('기획안 (승인대기)', pendingProposals, '#B45309')}
        {renderSection('완성본 (승인대기)', pendingFinals, '#1D4ED8')}
        {renderSection('완성본 (예약대기)', awaitingSchedule, '#003378')}
      </div>

      {/* ── SECTION 2: Calendar ── */}
      <div style={{ marginBottom: '2.5rem' }}>
        {/* Calendar Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontWeight: 900, fontSize: '1.2rem', color: '#0F172A', margin: 0 }}>📅 예약 현황 캘린더</h3>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE',
              borderRadius: '999px', padding: '4px 14px', fontSize: '0.78rem',
              color: '#1E40AF', fontWeight: 700, boxShadow: '0 2px 4px rgba(37, 99, 235, 0.04)'
            }}>
              <span style={{ fontSize: '0.9rem' }}>📍</span>
              <span>신촌 캠퍼스</span>
              <span style={{ color: '#93C5FD' }}>|</span>
              {weatherLoading ? (
                <span style={{ color: '#64748B', fontWeight: 600 }}>날씨 불러오는 중...</span>
              ) : currentWeatherInfo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.95rem' }}>{currentWeatherInfo.icon}</span>
                  <span style={{ color: '#1D4ED8' }}>{currentWeatherInfo.text}</span>
                  <span style={{ color: '#0F172A', fontWeight: 800 }}>{currentWeather?.temperature_2m}°C</span>
                </div>
              ) : (
                <span style={{ color: '#EF4444' }}>날씨 정보 없음</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={handlePrev} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button onClick={handleNext} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>

        {/* 2-Month View */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'stretch' }}>
            <AdminCalendar year={y1} month={m1} weather={weather} />
            <AdminContentTable year={y1} month={m1} contents={contents} allProfiles={allProfiles} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'stretch' }}>
            <AdminCalendar year={y2} month={m2} weather={weather} />
            <AdminContentTable year={y2} month={m2} contents={contents} allProfiles={allProfiles} />
          </div>
        </div>
      </div>

      {/* ── SECTION 3: Full Content List ── */}
      <FullContentList contents={contents} allProfiles={allProfiles} />

      {/* Modal for detail & status update */}
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
