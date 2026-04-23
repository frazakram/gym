'use client';

import { useEffect, useState, useRef } from 'react';

type AnimState = 'new' | 'loggedOut' | 'returning';

interface AnimData {
  state: AnimState;
  words: string[];
  greeting: string;
  // only set for returning/loggedOut states
  streak?: string;
  week?: string;
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
  const lastStreak = localStorage.getItem('lastStreak');
  const lastWeek = localStorage.getItem('lastWeek');

  if (!hasAccount) {
    return {
      state: 'new',
      greeting: 'YOUR FITNESS,',
      words: ['STRONGER', 'CONSISTENT', 'FOCUSED', 'UNBEATABLE', 'ON TRACK'],
    };
  }

  if (justLoggedOut === 'true') {
    return {
      state: 'loggedOut',
      greeting: 'WELCOME BACK,',
      words: ['BACK AGAIN', 'CONSISTENT', 'NOT DONE YET', 'STILL GOING'],
      streak: lastStreak && lastStreak !== '0' ? lastStreak : undefined,
      week: lastWeek ?? String(getWeekNumber()),
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
    streak: lastStreak && lastStreak !== '0' ? lastStreak : undefined,
    week: String(getWeekNumber()),
  };
}

// ─── Feature pills — static across all states ────────────────────────────────

const PILLS = [
  {
    accent: '#7c3aed',
    title: 'Learns your gym, week by week',
    subtitle: 'Adapts your routine based on your equipment, body type and actual session logs',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true">
        {/* Dumbbell */}
        <rect x="1" y="9.5" width="4" height="5" rx="1.2" />
        <rect x="19" y="9.5" width="4" height="5" rx="1.2" />
        <rect x="5" y="10.5" width="14" height="3" rx="1" />
        <rect x="5" y="8.5" width="2.5" height="7" rx="1" />
        <rect x="16.5" y="8.5" width="2.5" height="7" rx="1" />
      </svg>
    ),
  },
  {
    accent: '#22c55e',
    title: 'Diet built around your food',
    subtitle: 'Custom meal plans using ingredients you actually eat — not generic Western templates',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true">
        {/* Bowl with leaf */}
        <path d="M4 11h16c0 4.42-3.58 8-8 8s-8-3.58-8-8z" />
        <path d="M12 3c-1.5 0-3 1.2-3 3 0 1 .5 1.8 1.2 2.3C11 9 12 9 12 9s1-.3 1.8-1.2C14.5 7 14.5 6 14.5 6c0-1.8-1-3-2.5-3z" />
      </svg>
    ),
  },
  {
    accent: '#f59e0b',
    title: 'Tracks every session, improves every week',
    subtitle: 'Each workout you log makes the next plan smarter — your data, your routine',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {/* Trending chart */}
        <polyline points="3 17 8 11 13 14 20 6" />
        <polyline points="15 6 20 6 20 11" />
      </svg>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginAnimation() {
  const [data, setData] = useState<AnimData | null>(null);
  const [wordIdx, setWordIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [typing, setTyping] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setData(resolveAnimData());
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
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

  const showPersonalLine = data.state !== 'new' && (data.streak || data.week);

  const labelColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(30,41,59,0.55)';
  const headlineColor = isDark ? 'white' : '#0f172a';
  const streakColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(30,41,59,0.5)';
  const pillTitleColor = isDark ? 'white' : '#0f172a';
  const pillSubtitleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(30,41,59,0.6)';

  return (
    <>
      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .login-cursor { animation: blink 1s step-end infinite; }
        @keyframes pillIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .login-pill {
          animation: pillIn 0.4s ease both;
          transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
        }
        .login-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(124, 58, 237, 0.18);
        }
        .login-pill:nth-child(1) { animation-delay: 0.05s; }
        .login-pill:nth-child(2) { animation-delay: 0.15s; }
        .login-pill:nth-child(3) { animation-delay: 0.25s; }
        @keyframes underlineGrow {
          from { width: 0; opacity: 0; }
          to { width: 48px; opacity: 1; }
        }
        .login-underline { animation: underlineGrow 0.7s ease 0.2s both; }
      `}</style>

      <div style={{ padding: '48px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', userSelect: 'none' }}>

        {/* Greeting label */}
        <p style={{ fontSize: '11px', letterSpacing: '4px', color: labelColor, marginBottom: '12px', textTransform: 'uppercase' }}>
          {data.greeting}
        </p>

        {/* Typewriter */}
        <div style={{ fontSize: '52px', fontWeight: 700, color: headlineColor, letterSpacing: '-1px', minHeight: '72px', lineHeight: 1.1 }}>
          {displayed}
          <span className="login-cursor" style={{ color: '#7c3aed', marginLeft: '2px' }}>|</span>
        </div>

        {/* Purple underline */}
        <div className="login-underline" style={{ height: '2px', background: '#7c3aed', margin: '16px 0 28px 0', borderRadius: '1px' }} />

        {/* Personalized streak line for returning users */}
        {showPersonalLine && (
          <p style={{ fontSize: '11px', letterSpacing: '2px', color: streakColor, marginBottom: '20px', textTransform: 'uppercase' }}>
            {data.streak ? `${data.streak}-day streak` : ''}
            {data.streak && data.week ? '  ·  ' : ''}
            {data.week ? `Week ${data.week}` : ''}
          </p>
        )}

        {/* Feature pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {PILLS.map((pill, i) => (
            <div
              key={i}
              className="login-pill"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: isDark ? `${pill.accent}14` : `${pill.accent}1f`,
                border: `0.5px solid ${pill.accent}${isDark ? '33' : '55'}`,
              }}
            >
              {/* Icon box */}
              <div style={{
                width: '32px',
                height: '32px',
                minWidth: '32px',
                borderRadius: '8px',
                background: isDark ? `${pill.accent}28` : pill.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {pill.icon}
              </div>

              {/* Text */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: pillTitleColor, lineHeight: 1.3 }}>
                  {pill.title}
                </span>
                <span style={{ fontSize: '11px', color: pillSubtitleColor, lineHeight: 1.5 }}>
                  {pill.subtitle}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}
