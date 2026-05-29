'use client';

import React, { useState, useEffect } from 'react';

interface CalendarPickerProps {
  initialStartDate?: string;
  initialEndDate?: string;
  mode: 'single' | 'range' | 'disabled';
  onApply: (startDate: string, endDate: string) => void;
}

const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarPicker({ initialStartDate, initialEndDate, mode, onApply }: CalendarPickerProps) {
  const [currentDate, setCurrentDate] = useState(new Date(initialStartDate || Date.now()));
  
  const parseLocalDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d));
  };

  const [startDate, setStartDate] = useState<Date | null>(parseLocalDate(initialStartDate));
  const [endDate, setEndDate] = useState<Date | null>(parseLocalDate(initialEndDate));

  useEffect(() => {
    setStartDate(parseLocalDate(initialStartDate));
    setEndDate(parseLocalDate(initialEndDate));
    if (initialStartDate) {
      setCurrentDate(parseLocalDate(initialStartDate) || new Date());
    }
  }, [initialStartDate, initialEndDate]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const handleDateClick = (day: number) => {
    if (mode === 'disabled') return;

    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
    if (mode === 'single') {
      setStartDate(clickedDate);
      setEndDate(null);
      onApply(formatDate(clickedDate), formatDate(clickedDate));
      return;
    }

    if (mode === 'range') {
      if (!startDate || (startDate && endDate)) {
        // Start new selection
        setStartDate(clickedDate);
        setEndDate(null);
      } else if (startDate && !endDate) {
        let finalStart = startDate;
        let finalEnd = clickedDate;
        
        if (clickedDate < startDate) {
          finalStart = clickedDate;
          finalEnd = startDate;
        }
        
        setStartDate(finalStart);
        setEndDate(finalEnd);
        onApply(formatDate(finalStart), formatDate(finalEnd));
      }
    }
  };

  const isSelected = (day: number) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const time = d.getTime();
    if (startDate && startDate.getTime() === time) return true;
    if (endDate && endDate.getTime() === time) return true;
    return false;
  };

  const isInRange = (day: number) => {
    if (!startDate || !endDate) return false;
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getTime();
    return d > startDate.getTime() && d < endDate.getTime();
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // Empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} style={{ padding: '10px' }} />);
    }
    
    // Days
    for (let i = 1; i <= daysInMonth; i++) {
      const selected = isSelected(i);
      const inRange = isInRange(i);
      const d = new Date(year, month, i);
      const isStart = startDate && startDate.getTime() === d.getTime();
      const isEnd = endDate && endDate.getTime() === d.getTime();
      const isSingle = isStart && (!endDate || startDate.getTime() === endDate.getTime());

      let wrapperStyle: React.CSSProperties = {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '32px',
        margin: '2px 0'
      };

      if (inRange) {
        wrapperStyle.backgroundColor = '#E6F0FF';
      } else if (selected && !isSingle) {
        if (isStart) {
          wrapperStyle.background = 'linear-gradient(to right, transparent 50%, #E6F0FF 50%)';
        } else if (isEnd) {
          wrapperStyle.background = 'linear-gradient(to right, #E6F0FF 50%, transparent 50%)';
        }
      }

      days.push(
        <div key={i} style={wrapperStyle}>
          <div
            onClick={() => handleDateClick(i)}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              backgroundColor: selected ? '#0066FF' : 'transparent',
              color: selected ? '#FFFFFF' : '#334155',
              fontWeight: selected ? 'bold' : 'normal',
              cursor: mode === 'disabled' ? 'not-allowed' : 'pointer',
              zIndex: 1,
              transition: 'all 0.2s'
            }}
          >
            {i}
          </div>
        </div>
      );
    }
    
    return days;
  };

  const getModeText = () => {
    if (mode === 'disabled') return '선택 불가';
    if (mode === 'single') return '단일 날짜 선택';
    return '기간 선택';
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '24px 12px',
      width: '100%',
      maxWidth: '100%',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      opacity: mode === 'disabled' ? 0.6 : 1,
      pointerEvents: mode === 'disabled' ? 'none' : 'auto',
      transition: 'opacity 0.3s'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ backgroundColor: '#F1F5F9', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>
          {getModeText()}
        </div>
      </div>

      {/* Month Navigator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
        <button type="button" onClick={handlePrevMonth} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#334155' }}>{'<'}</button>
        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
          {currentDate.getMonth() + 1}월
        </div>
        <button type="button" onClick={handleNextMonth} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#334155' }}>{'>'}</button>
      </div>

      {/* Calendar Grid */}
      <div>
        {/* Weekdays */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '8px' }}>
          {DAYS_OF_WEEK.map(day => (
            <div key={day} style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{day}</div>
          ))}
        </div>
        
        {/* Days */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {renderCalendar()}
        </div>
      </div>
    </div>
  );
}
