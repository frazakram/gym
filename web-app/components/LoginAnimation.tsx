'use client';

import { useEffect, useState, useRef } from 'react';

type AnimState = 'new' | 'loggedOut' | 'returning';

interface AnimData {
  state: AnimState;
  words: string[];
  stats: { value: string; label: string }[];
  greeting: string;
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
    };
  }

  // returning after time away
  const days = lastLoginDate ? daysSince(lastLoginDate) : 0;
  let words: string[];
  if (days < 2) {
    words = ['STILL GOING', 'LOCKED IN', 'DAY BY DAY', 'RELENTLESS'];
  } else if (days < 7) {
    words = ['BACK AT IT', 'PICK UP WHERE YOU LEFT', 'NEVER LATE', 'KEEP PUSHING'];
  } else {
    words = ['COMEBACK TIME', 'RESET. REBUILD.', 'START AGAIN', 'IT\'S NOT TOO LATE'];
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
  };
}

export default function LoginAnimation() {
  const [data, setData] = useState<AnimData | null>(null);
  const [wordIdx, setWordIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [typing, setTyping] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setData(resolveAnimData());
  }, []);

  // Typewriter effect
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

  const accentColor =
    data.state === 'new'
      ? 'text-blue-400'
      : data.state === 'loggedOut'
      ? 'text-green-400'
      : 'text-orange-400';

  const barColor =
    data.state === 'new'
      ? 'bg-blue-500'
      : data.state === 'loggedOut'
      ? 'bg-green-500'
      : 'bg-orange-500';

  return (
    <div className="flex flex-col justify-center h-full px-8 py-12 select-none">
      {/* Greeting + typewriter */}
      <div className="mb-10">
        <p className="text-sm font-semibold tracking-[0.25em] text-gray-400 dark:text-gray-500 mb-2 uppercase">
          {data.greeting}
        </p>
        <div className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white leading-tight min-h-[3.5rem]">
          <span className={accentColor}>{displayed}</span>
          <span className="animate-pulse ml-0.5 opacity-70">|</span>
        </div>
      </div>

      {/* Divider */}
      <div className={`h-0.5 w-12 ${barColor} rounded-full mb-10`} />

      {/* Stats row */}
      <div className="flex gap-8">
        {data.stats.map((s, i) => (
          <div key={i} className="flex flex-col gap-1">
            <span className={`text-2xl font-bold tabular-nums ${accentColor}`}>{s.value}</span>
            <span className="text-xs tracking-widest text-gray-400 dark:text-gray-500 uppercase">{s.label}</span>
          </div>
        ))}
      </div>

      {/* State-specific tagline */}
      <p className="mt-10 text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
        {data.state === 'new' && 'AI-powered workouts and diet plans personalized to your body and goals.'}
        {data.state === 'loggedOut' && 'Your last session stats are saved. Ready to beat them?'}
        {data.state === 'returning' && 'Every rep counts. Your progress is waiting.'}
      </p>
    </div>
  );
}
