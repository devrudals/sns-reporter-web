'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ModalLink from '@/components/ModalLink';
import { useModal } from '@/contexts/ModalContext';


const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Weather code interpretation helper
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
  current?: {
    temperature_2m: number;
    weather_code: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

function MonthCalendar({ 
  year, 
  month, 
  contents,
  weather,
  hoveredDate,
  clickedDate,
  setHoveredDate,
  setClickedDate
}: { 
  year: number; 
  month: number; 
  contents: any[];
  weather: WeatherData | null;
  hoveredDate: string | null;
  clickedDate: string | null;
  setHoveredDate: (d: string | null) => void;
  setClickedDate: (d: string | null) => void;
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

  const getEventsForDay = (day: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const target = `${year}-${pad(month + 1)}-${pad(day)}`;
    return contents.filter(c => {
      const dateStr = c.created_at ? c.created_at.split('T')[0] : '';
      return dateStr === target;
    });
  };

  const isToday = (day: number) =>
    year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

  const isSun = (idx: number) => idx % 7 === 0;
  const isSat = (idx: number) => idx % 7 === 6;

  // Status mapping to dots in the Figma design
  const getStatusDotColor = (status: string) => {
    return '#1E293B';
  };

  // Weather icon search helper
  const getForecastIcon = (day: number) => {
    if (!weather || !weather.daily) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    const idx = weather.daily.time.indexOf(dateStr);
    if (idx !== -1) {
      const code = weather.daily.weather_code[idx];
      return getWeatherInfo(code).icon;
    }
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

        {/* Days grid headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '0.6rem' }}>
          {DAYS.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.78rem', fontWeight: 800, color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#94A3B8', padding: '0.25rem 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px 4px' }}>
          {fullCells.map((cell, idx) => {
            const events = cell.current ? getEventsForDay(cell.day) : [];
            const today_ = cell.current && isToday(cell.day);
            const textColor = !cell.current ? '#E2E8F0' : isSun(idx) ? '#EF4444' : isSat(idx) ? '#3B82F6' : '#334155';
            const cellWeatherIcon = cell.current ? getForecastIcon(cell.day) : null;

            const pad = (n: number) => String(n).padStart(2, '0');
            const cellDateStr = `${year}-${pad(month + 1)}-${pad(cell.day)}`;
            // Remove activeDate and isFaded logic for disabled filtering
            // const activeDate = clickedDate || hoveredDate;
            // const isFaded = activeDate && activeDate !== cellDateStr;

            return (
              <div key={idx} 
                style={{ 
                padding: '0.25rem 0', 
                textAlign: 'center', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '2px', 
                position: 'relative',
                minHeight: '62px',
                cursor: 'default',
                opacity: 1,
                transition: 'opacity 0.2s ease'
              }}>
                {/* Date text container */}
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: today_ ? '#003378' : 'transparent',
                  color: today_ ? 'white' : textColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.88rem',
                  fontWeight: today_ ? 900 : 700,
                  transition: 'all 0.2s ease',
                }}>
                  {cell.day}
                </div>

                {/* Weather indicator icon - UNDER the number, larger */}
                {cellWeatherIcon ? (
                  <span style={{ 
                    fontSize: '1.05rem', // Larger weather icon
                    lineHeight: '1.1',
                    marginTop: '2px',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))',
                    display: 'block'
                  }}>
                    {cellWeatherIcon}
                  </span>
                ) : (
                  // Spacer to maintain height if no weather icon is present
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

// Helper functions for MonthTable
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

const getDiscussionsCount = (bodyStr: string) => {
  try {
    const obj = JSON.parse(bodyStr);
    return obj.discussions && obj.discussions.length > 0 ? obj.discussions.length : 0;
  } catch(e) { return 0; }
};

function MonthTable({ year, month, myContents, activeDate, allProfiles = [] }: { year: number; month: number; myContents: any[]; activeDate: string | null; allProfiles?: any[] }) {
  const { openContentModal } = useModal();
  const pad = (n: number) => String(n).padStart(2, '0');
  const monthPrefix = `${year}-${pad(month + 1)}`;
  
  const filteredContents = myContents.filter(c => {
    let bodyObj: any = {};
    try { bodyObj = JSON.parse(c.content_body || '{}'); } catch {}
    
    // Default match month prefix
    const dateStr = c.created_at ? c.created_at.split('T')[0] : '';
    let cMonth = bodyObj.targetMonth || dateStr.substring(0, 7);
    if (cMonth !== monthPrefix) return false;

    // Filter by activeDate and timeliness
    if (activeDate) {
      const timeliness = bodyObj.timeliness || '상관없음';
      if (timeliness !== '상관없음' && bodyObj.desiredDate !== activeDate) {
        return false;
      }
    }
    return true;
  });

  filteredContents.sort((a, b) => {
    let aBody: any = {}, bBody: any = {};
    try { aBody = JSON.parse(a.content_body || '{}'); } catch {}
    try { bBody = JSON.parse(b.content_body || '{}'); } catch {}
    
    const timeOrder = { '상관없음': 0, '보통': 1, '중요': 2 } as Record<string, number>;
    const valA = timeOrder[aBody.timeliness || '상관없음'];
    const valB = timeOrder[bBody.timeliness || '상관없음'];
    
    if (valA !== valB) return valA - valB; // 상관없음(0) -> 보통(1) -> 중요(2)
    
    const dateA = aBody.desiredDate || a.created_at;
    const dateB = bBody.desiredDate || b.created_at;
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    return 0;
  });

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
      
      {/* List Header */}
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

      {/* List Body */}
      <div style={{ flex: '1', overflowY: 'auto', backgroundColor: '#ffffff' }}>
        {filteredContents.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#CBD5E1', fontSize: '0.9rem' }}>해당 조건의 콘텐츠가 없습니다</div>
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
              const mainAuthorNameOnly = mainAuthor.replace(/^\d+(기)?\s+/, '');
              const others = allCrew.filter(c => {
                const cClean = c.replace(/^\d+(기)?\s+/, '');
                return cClean !== mainAuthorNameOnly && !mainAuthorNameOnly.includes(cClean);
              });
              const desiredDate = bodyObj.desiredDate || '';
              const articleType = bodyObj.articleType || item.articleType || '개인기사';
              
              return (
                <div 
                  key={item.id} 
                  onClick={() => openContentModal(item.id.toString())}
                  style={{ 
                    display: 'flex', padding: '12px 8px', borderBottom: '1px solid #f1f5f9', gap: '10px', 
                    alignItems: 'center', transition: 'all 0.2s', borderRadius: '8px', cursor: 'pointer'
                  }}
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
                    {articleType === '개인기사' ? (
                      <span style={{ fontSize: '0.85rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <strong style={{ fontWeight: 800 }}>{formatCrewName(mainAuthor)}</strong>{others.length > 0 ? `, ${others.map(formatCrewName).join(', ')}` : ''}
                      </span>
                    ) : (
                      <>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.team}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <strong style={{ fontWeight: 800 }}>{formatCrewName(mainAuthor)}</strong>{others.length > 0 ? `, ${others.map(formatCrewName).join(', ')}` : ''}
                        </span>
                      </>
                    )}
                  </div>
                  <div style={{ width: '60px', textAlign: 'center', fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
                    {articleType}
                  </div>
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

export default function DashboardCalendarArea({ rawContents, myContents, allProfiles = [] }: { rawContents: any[]; myContents: any[]; allProfiles?: any[] }) {
  const [baseDate, setBaseDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [clickedDate, setClickedDate] = useState<string | null>(null);
  const activeDate = clickedDate || hoveredDate;

  // Real-time Weather Integration with Open-Meteo API (14-day forecast for 2 weeks)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setWeatherLoading(true);
        // Yonsei University Sinchon campus (Latitude: 37.5598, Longitude: 126.9385)
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=37.5598&longitude=126.9385&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=14&timezone=Asia%2FSeoul'
        );
        if (res.ok) {
          const data = await res.json();
          setWeather(data);
        }
      } catch (e) {
        console.error('Failed to fetch weather from Open-Meteo', e);
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchWeather();
  }, []);

  const handlePrev = () => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNext = () => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // Calculated Month 1 and Month 2
  const y1 = baseDate.getFullYear();
  const m1 = baseDate.getMonth();
  const y2 = m1 === 11 ? y1 + 1 : y1;
  const m2 = m1 === 11 ? 0 : m1 + 1;

  const currentWeather = weather?.current;
  const currentWeatherInfo = currentWeather ? getWeatherInfo(currentWeather.weather_code) : null;

  return (
    <div>
      {/* Calendar Header with real-time Weather Widget */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontWeight: 900, fontSize: '1.2rem', color: '#0F172A', margin: 0 }}>전체 콘텐츠 캘린더</h3>
          
          {/* Weather Widget */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '999px',
            padding: '4px 14px',
            fontSize: '0.78rem',
            color: '#1E40AF',
            fontWeight: 700,
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.04)'
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

        {/* Prev / Next Page Buttons */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button 
            onClick={handlePrev} 
            style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%', 
              backgroundColor: '#FFFFFF', 
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              color: '#475569', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            className="hover-scale"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button 
            onClick={handleNext} 
            style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%', 
              backgroundColor: '#FFFFFF', 
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              color: '#475569', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            className="hover-scale"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
      
      {/* 2-Month Double Stack View (This Month & Next Month) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Month 1 (This Month) */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'stretch' }}>
          <MonthCalendar year={y1} month={m1} contents={rawContents} weather={weather} hoveredDate={hoveredDate} clickedDate={clickedDate} setHoveredDate={setHoveredDate} setClickedDate={setClickedDate} />
          <MonthTable year={y1} month={m1} myContents={myContents} activeDate={activeDate} allProfiles={allProfiles} />
        </div>
        
        {/* Month 2 (Next Month) */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'stretch' }}>
          <MonthCalendar year={y2} month={m2} contents={rawContents} weather={weather} hoveredDate={hoveredDate} clickedDate={clickedDate} setHoveredDate={setHoveredDate} setClickedDate={setClickedDate} />
          <MonthTable year={y2} month={m2} myContents={myContents} activeDate={activeDate} allProfiles={allProfiles} />
        </div>
      </div>
    </div>
  );
}
