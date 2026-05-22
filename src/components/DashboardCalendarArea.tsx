'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

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
  weather
}: { 
  year: number; 
  month: number; 
  contents: any[];
  weather: WeatherData | null;
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
    switch (status) {
      case 'revision':
      case 'final_revision':
        return '#EF4444'; // Red
      case 'pending':
        return '#F59E0B'; // Yellow
      case 'approved':
        return '#10B981'; // Green
      case 'completed':
      case 'uploaded':
        return '#003378'; // Blue
      default:
        return '#EC4899'; // Pink
    }
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

            return (
              <div key={idx} style={{ 
                padding: '0.25rem 0', 
                textAlign: 'center', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '2px', 
                position: 'relative',
                minHeight: '62px' // Comfortable height to prevent layout shifts
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

                {/* Content status dots */}
                {events.length > 0 && (
                  <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', marginTop: '3px' }}>
                    {events.slice(0, 3).map((item, i) => (
                      <div 
                        key={i} 
                        style={{ 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          backgroundColor: getStatusDotColor(item.status) 
                        }} 
                        title={item.title}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthTable({ year, month, myContents }: { year: number; month: number; myContents: any[] }) {
  const getTeamColor = (team: string) => {
    switch (team) {
      case '유튜브': return { bg: '#fee2e2', text: '#ef4444' };
      case '인스타': return { bg: '#fce7f3', text: '#ec4899' };
      case '블로그': return { bg: '#dcfce7', text: '#22c55e' };
      case '단장 팀': return { bg: '#e0e7ff', text: '#4f46e5' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const getTypeColor = (t: string) => {
    switch (t) {
      case '영상(롱폼)': return { bg: '#ffedd5', text: '#f97316' };
      case '영상(숏폼)': return { bg: '#fef3c7', text: '#d97706' };
      case '카드뉴스': return { bg: '#dbeafe', text: '#3b82f6' };
      case '글 기사': return { bg: '#ecfdf5', text: '#10b981' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const getTeamPlatformIcon = (team: string) => {
    const t = team || '';
    if (t === '유튜브') {
      return (
        <div style={{ 
          width: '22px', 
          height: '22px', 
          backgroundColor: '#ef4444', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(239, 68, 68, 0.15)'
        }} title="유튜브">
          <svg fill="#ffffff" viewBox="0 0 24 24" width="10" height="10">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </div>
      );
    }
    if (t === '인스타' || t === '인스타그램') {
      return (
        <div style={{ 
          width: '22px', 
          height: '22px', 
          borderRadius: '50%', 
          background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: 'white',
          boxShadow: '0 2px 4px rgba(220, 39, 67, 0.15)'
        }} title="인스타그램">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
        </div>
      );
    }
    if (t === '블로그' || t === '네이버블로그') {
      return (
        <div style={{ 
          width: '22px', 
          height: '22px', 
          backgroundColor: '#03c75a', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(3, 199, 90, 0.15)'
        }} title="네이버블로그">
          <span style={{ color: 'white', fontSize: '11px', fontWeight: 'bold', fontFamily: 'serif', marginTop: '-2px' }}>b</span>
        </div>
      );
    }
    return (
      <div style={{ 
        width: '22px', 
        height: '22px', 
        backgroundColor: '#4f46e5', 
        borderRadius: '50%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(79, 70, 229, 0.15)'
      }} title={t}>
        <span style={{ color: 'white', fontSize: '9px', fontWeight: '800' }}>T</span>
      </div>
    );
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const monthPrefix = `${year}-${pad(month + 1)}`;
  const filteredContents = myContents.filter(c => {
    const dateStr = c.created_at ? c.created_at.split('T')[0] : '';
    return dateStr.startsWith(monthPrefix);
  });

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', height: '100%', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #E6EBF2', backgroundColor: '#F8FAFC' }}>
            {['색상', '날짜', '플랫폼', '콘텐츠 제목', '구분', '참여인원', '희망일', '기획안 / 완성본 / 업로드'].map(h => (
              <th key={h} style={{ padding: '0.85rem 0.75rem', fontWeight: 700, color: '#64748B', fontSize: '0.78rem', whiteSpace: 'nowrap', textAlign: 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredContents.length === 0 && (
            <tr><td colSpan={8} style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#CBD5E1', fontSize: '0.9rem' }}>해당 월에 콘텐츠가 없습니다</td></tr>
          )}
          {filteredContents.map(item => {
            const tc = getTeamColor(item.team || '');
            const tyc = getTypeColor(item.content_type || '');
            const statusDot: Record<string, string> = {
              pending: '#F59E0B', revision: '#EF4444', approved: '#10B981',
              final_submitted: '#3B82F6', final_revision: '#EF4444', completed: '#003378', uploaded: '#002454'
            };
            const dot = statusDot[item.status] || '#CBD5E1';
            
            // Extract crew/participants
            let crewString = item.author_name || '-';
            let desiredDate = '';
            let crewCount = 1;
            if (item.content_body?.startsWith('{')) {
              try {
                const pb = JSON.parse(item.content_body);
                if (typeof pb.crew === 'string' && pb.crew.trim() !== '') {
                  crewString = pb.crew;
                  crewCount = pb.crew.split(',').map((s: string) => s.trim()).filter(Boolean).length;
                } else if (Array.isArray(pb.crew)) {
                  crewString = pb.crew.map((c: any) => c.name || '').filter(Boolean).join(', ');
                  crewCount = pb.crew.filter((c: any) => c.name || '').length;
                }
                desiredDate = pb.desiredDate || '';
              } catch {}
            }
            const isTeam = crewCount >= 2;

            return (
              <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.2s ease' }} className="hover-row">
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: dot, margin: '0 auto', boxShadow: `0 0 6px ${dot}` }} />
                </td>
                <td style={{ padding: '0.75rem', color: '#64748B', whiteSpace: 'nowrap', fontSize: '0.78rem', fontWeight: 600 }}>
                  {new Date(item.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  {item.parsedPublishDate && <div style={{ fontSize: '0.7rem', color: '#003378', fontWeight: 700, marginTop: '2px' }}>📅 {item.parsedPublishDate.substring(5)}</div>}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                    {item.team && getTeamPlatformIcon(item.team)}
                    {item.content_type && (
                      <span style={{ 
                        fontSize: '0.74rem', 
                        fontWeight: 750, 
                        color: '#475569', 
                        display: 'inline-block', 
                        whiteSpace: 'nowrap',
                        marginTop: '2px'
                      }}>
                        {item.content_type}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '0.75rem', fontWeight: 700, color: '#1E293B', maxWidth: '240px' }}>
                  <Link href={`/proposals/submit?id=${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={item.title}>
                      {item.title}
                    </div>
                  </Link>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 500, marginTop: '2px' }}>{item.author_name}</div>
                </td>
                <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 750, 
                    padding: '3px 8px', 
                    borderRadius: '6px',
                    backgroundColor: isTeam ? '#FEF3C7' : '#F0FDF4',
                    color: isTeam ? '#B45309' : '#15803D',
                    border: isTeam ? '1px solid #FDE68A' : '1px solid #BBF7D0'
                  }}>
                    {isTeam ? `팀기사 (${crewCount}명)` : '개인기사'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                  <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }} title={crewString}>
                    {crewString}
                  </div>
                </td>
                <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                  {desiredDate ? (
                    <span style={{ 
                      fontSize: '0.72rem', 
                      color: '#1D4ED8', 
                      fontWeight: 700,
                      backgroundColor: '#EFF6FF',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid #BFDBFE'
                    }}>
                      {desiredDate.substring(5)}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#CBD5E1', fontStyle: 'italic' }}>미설정</span>
                  )}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  {(() => {
                    const s = item.status;
                    const step1 = ['approved','final_submitted','final_revision','completed','uploaded'].includes(s);
                    const step2 = ['completed','uploaded'].includes(s);
                    const step3 = s === 'uploaded';
                    
                    const Check = ({ done, warn }: { done: boolean; warn?: boolean }) => (
                      <div style={{
                        width: '26px', height: '26px', borderRadius: '50%',
                        backgroundColor: done ? '#10B981' : 'transparent',
                        border: done ? 'none' : `2px solid ${warn ? '#F59E0B' : '#D1D5DB'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.3s ease'
                      }}>
                        {done ? (
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : warn ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#F59E0B' }}>!</span>
                        ) : null}
                      </div>
                    );
                    const Line = ({ active }: { active: boolean }) => (
                      <div style={{ flex: 1, height: '2px', backgroundColor: active ? '#10B981' : '#E2E8F0', minWidth: '12px', transition: 'all 0.3s ease' }} />
                    );
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', maxWidth: '110px' }}>
                        <Check done={step1} warn={s === 'revision'} />
                        <Line active={step1 && step2} />
                        <Check done={step2} warn={s === 'final_revision'} />
                        <Line active={step2 && step3} />
                        <Check done={step3} />
                      </div>
                    );
                  })()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardCalendarArea({ rawContents, myContents }: { rawContents: any[]; myContents: any[] }) {
  const [baseDate, setBaseDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

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
          <MonthCalendar year={y1} month={m1} contents={rawContents} weather={weather} />
          <MonthTable year={y1} month={m1} myContents={myContents} />
        </div>
        
        {/* Month 2 (Next Month) */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'stretch' }}>
          <MonthCalendar year={y2} month={m2} contents={rawContents} weather={weather} />
          <MonthTable year={y2} month={m2} myContents={myContents} />
        </div>
      </div>
    </div>
  );
}
