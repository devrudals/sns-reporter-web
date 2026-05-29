'use client';

import React, { useState, useEffect } from 'react';

interface CalendarPickerProps {
  initialStartDate?: string;
  initialEndDate?: string;
  onApply: (startDate: string, endDate: string) => void;
  onClose: () => void;
}

const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarPicker({ initialStartDate, initialEndDate, onApply, onClose }: CalendarPickerProps) {
  const [currentDate, setCurrentDate] = useState(new Date(initialStartDate || Date.now()));
  
  const [startDate, setStartDate] = useState<Date | null>(initialStartDate ? new Date(initialStartDate) : null);
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate ? new Date(initialEndDate) : null);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
    if (!startDate || (startDate && endDate)) {
      // Start new selection
      setStartDate(clickedDate);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (clickedDate < startDate) {
        setStartDate(clickedDate);
      } else {
        setEndDate(clickedDate);
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
      const isSingle = isStart && !endDate;

      let wrapperStyle: React.CSSProperties = {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '40px',
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
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              backgroundColor: selected ? '#0066FF' : 'transparent',
              color: selected ? '#FFFFFF' : '#334155',
              fontWeight: selected ? 'bold' : 'normal',
              cursor: 'pointer',
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

  const handleApply = () => {
    const pad = (n: number) => String(n).padStart(2, '0');
    let startStr = '';
    let endStr = '';
    if (startDate) {
      startStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
    }
    if (endDate) {
      endStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;
    } else if (startDate) {
      endStr = startStr; // If only one date is selected, range is same day
    }
    onApply(startStr, endStr);
  };

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      left: '0',
      marginTop: '8px',
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      border: '1px solid #e2e8f0',
      padding: '24px',
      width: '340px',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ backgroundColor: '#F1F5F9', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>
          날짜 조정 가능
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
      </div>

      {/* Month Navigator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
        <button onClick={handlePrevMonth} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#334155' }}>{'<'}</button>
        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
          {currentDate.getMonth() + 1}월
        </div>
        <button onClick={handleNextMonth} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#334155' }}>{'>'}</button>
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

      {/* Footer / Apply */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
        <button 
          onClick={handleApply}
          style={{ 
            backgroundColor: '#0066FF', 
            color: 'white', 
            border: 'none', 
            borderRadius: '12px', 
            padding: '12px 24px', 
            fontWeight: 800, 
            fontSize: '1rem', 
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 102, 255, 0.3)'
          }}
        >
          적용
        </button>
      </div>
    </div>
  );
}
