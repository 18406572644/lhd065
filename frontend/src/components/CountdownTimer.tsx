import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, message } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, BellOutlined } from '@ant-design/icons';

interface CountdownTimerProps {
  minutes: number;
  stepName?: string;
  onComplete?: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ minutes, stepName, onComplete }) => {
  const [totalSeconds, setTotalSeconds] = useState(minutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioRef.current;
      for (let i = 0; i < 3; i++) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.5 + 0.3);
        oscillator.start(ctx.currentTime + i * 0.5);
        oscillator.stop(ctx.currentTime + i * 0.5 + 0.3);
      }
    } catch (e) {
      console.log('Audio not supported');
    }
  }, []);

  useEffect(() => {
    if (isRunning && totalSeconds > 0) {
      intervalRef.current = window.setInterval(() => {
        setTotalSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            playBeep();
            message.success(`时间到！${stepName ? stepName + ' ' : ''}步骤完成`);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, playBeep, stepName, onComplete]);

  useEffect(() => {
    setTotalSeconds(minutes * 60);
    setIsRunning(false);
  }, [minutes]);

  const toggleTimer = () => {
    if (totalSeconds <= 0) {
      setTotalSeconds(minutes * 60);
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTotalSeconds(minutes * 60);
  };

  const displayMinutes = Math.floor(totalSeconds / 60);
  const displaySeconds = totalSeconds % 60;
  const timeString = `${String(displayMinutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;
  const progress = minutes > 0 ? ((minutes * 60 - totalSeconds) / (minutes * 60)) * 100 : 0;
  const isComplete = totalSeconds === 0;

  return (
    <div className="countdown-display">
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <BellOutlined style={{ color: isComplete ? '#66BB6A' : '#FF8A65', fontSize: 18 }} />
          <span style={{ fontWeight: 500, color: '#5A5A5A' }}>
            {isComplete ? '完成！' : `倒计时 ${minutes} 分钟`}
          </span>
        </div>
        <div
          className="countdown-time"
          style={{ color: isComplete ? '#66BB6A' : isRunning ? '#FF5722' : '#FF8A65' }}
        >
          {timeString}
        </div>
        <div style={{ height: 6, background: '#F5F0E6', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: isComplete
                ? 'linear-gradient(90deg, #66BB6A, #8BC34A)'
                : 'linear-gradient(90deg, #FF8A65, #FF5722)',
              borderRadius: 3,
              transition: 'width 1s linear',
            }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={toggleTimer}
          style={{
            width: 48,
            height: 48,
            fontSize: 22,
            background: isComplete ? '#66BB6A' : '#8BC34A',
            border: 'none',
          }}
        />
        <Button
          shape="circle"
          size="large"
          icon={<ReloadOutlined />}
          onClick={resetTimer}
          style={{ width: 48, height: 48, fontSize: 18 }}
        />
      </div>
    </div>
  );
};

export default CountdownTimer;
