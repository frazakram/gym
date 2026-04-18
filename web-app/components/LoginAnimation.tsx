'use client';

import { useEffect, useState, useRef } from 'react';

type AnimState = 'new' | 'loggedOut' | 'returning';

interface AnimData {
  state: AnimState;
  words: string[];
  stats: { value: string; label: string }[];
  greeting: string;
  tagline: string;
}

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
}

function resolveAnimData(): AnimData {
  const hasAccount = localStorage.getItem('hasAccount');
  const justLoggedOut = localStorage.getItem('justLoggedOut');
  const lastLoginDate = localStorage.getItem('lastLoginDate');
  const lastStreak = localStorage.getItem('lastStreak') || '0';
  const lastCalories = localStorage.getItem('lastCalories') || '0';
  const lastWeek = localStorage.getItem('lastWeek') || String(getWeekNumber());
  const bestStreak = localStorage.getItem('bestStreak') || '0';

  if (!hasAccount) {
    return {
      state: 'new',
      greeting: 'YOUR FITNESS,',
      words: ['STRONGER', 'CONSISTENT', 'FOCUSED', 'UNBEATABLE', 'ON TRACK'],
      stats: [
        { value: '10,000+', label: 'PLANS GENERATED' },
        { value: '₹1/mo', label: 'TO START' },
        { value: '5 MIN', label: 'SETUP TIME' },
      ],
      tagline: 'AI-powered workouts and diet plans personalized to your body and goals.',
    };
  }

  if (justLoggedOut === 'true') {
    return {
      state: 'loggedOut',
      greeting: 'WELCOME BACK,',
      words: ['BACK AGAIN', 'CONSISTENT', 'NOT DONE YET', 'STILL GOING'],
      stats: [
        { value: lastStreak + ' days', label: 'LAST STREAK' },
        { value: lastCalories + ' kcal', label: 'LAST SESSION' },
        { value: 'Week ' + lastWeek, label: 'LAST WEEK' },
      ],
      tagline: 'Your last session stats are saved. Ready to beat them?',
    };
  }

  const days = lastLoginDate ? daysSince(lastLoginDate) : 0;
  let words: string[];
  if (days < 2) {
    words = ['STILL GOING', 'LOCKED IN', 'DAY BY DAY', 'RELENTLESS'];
  } else if (days < 7) {
    words = ['BACK AT IT', 'PICK UP WHERE YOU LEFT', 'NEVER LATE', 'KEEP PUSHING'];
  } else {
    words = ['COMEBACK TIME', 'RESET. REBUILD.', 'START AGAIN', "IT'S NOT TOO LATE"];
  }

  return {
    state: 'returning',
    greeting: days >= 7 ? 'BEEN A WHILE,' : 'GOOD TO SEE YOU,',
    words,
    stats: [
      { value: days === 0 ? 'Today' : days + ' days', label: 'DAYS AWAY' },
      { value: bestStreak + ' days', label: 'BEST STREAK' },
      { value: 'Week ' + getWeekNumber(), label: 'CURRENT WEEK' },
    ],
    tagline: 'Every rep counts. Your progress is waiting.',
  };
}

const ACCENT: Record<AnimState, string> = {
  new: '#60a5fa',
  loggedOut: '#4ade80',
  returning: '#fb923c',
};

export default function LoginAnimation() {
  const [data, setData] = useState<AnimData | null>(null);
  const [wordIdx, setWordIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [typing, setTyping] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setData(resolveAnimData());
  }, []);

  useEffect(() => {
    if (!data) return;
    const word = data.words[wordIdx];
    let i = typing ? 0 : word.length;

    if (intervalRef.current) clearInterval(intervalRef.current);

    if (typing) {
      intervalRef.current = setInterval(() => {
        i++;
        setDisplayed(word.slice(0, i));
        if (i >= word.length) {
          clearInterval(intervalRef.current!);
          setTimeout(() => setTyping(false), 1400);
        }
      }, 60);
    } else {
      intervalRef.current = setInterval(() => {
        i--;
        setDisplayed(word.slice(0, i));
        if (i <= 0) {
          clearInterval(intervalRef.current!);
          setWordIdx(prev => (prev + 1) % data.words.length);
          setTyping(true);
        }
      }, 35);
    }

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [data, wordIdx, typing]);

  if (!data) return null;

  const accent = ACCENT[data.state];

  return (
    <>
      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .login-cursor { animation: blink 1s step-end infinite; }
      `}</style>

      <div
        style={{ padding: '48px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', userSelect: 'none' }}
      >
        {/* Greeting label */}
        <p style={{ fontSize: '11px', letterSpacing: '4px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', textTransform: 'uppercase' }}>
          {data.greeting}
        </p>

        {/* Typewriter text */}
        <div style={{ fontSize: '52px', fontWeight: 700, color: 'white', letterSpacing: '-1px', minHeight: '72px', lineHeight: 1.1 }}>
          {displayed}
          <span className="login-cursor" style={{ color: '#7c3aed', marginLeft: '2px' }}>|</span>
        </div>

        {/* Purple underline */}
        <div style={{ width: '48px', height: '2px', background: '#7c3aed', margin: '16px 0 32px 0', borderRadius: '1px' }} />

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-end' }}>
          {data.stats.map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: accent, lineHeight: 1 }}>{s.value}</span>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Bottom tagline */}
        <p style={{ marginTop: 'auto', paddingTop: '48px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, maxWidth: '320px' }}>
          {data.tagline}
        </p>
      </div>
    </>
  );
}
