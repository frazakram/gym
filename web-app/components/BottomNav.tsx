'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Calendar,
  ClipboardCheck,
  User,
  Plus,
  BarChart3,
  Utensils,
  MessageCircle,
  Ruler,
} from 'lucide-react'

interface BottomNavProps {
  activeView: 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach' | 'measurements'
  onViewChange: (view: 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach' | 'measurements') => void
}

/* ─── Arc geometry ─── */
const R       = 120          // arc radius in px
const SZ      = 48           // icon circle diameter
const HALF    = SZ / 2

// 4 items spread evenly across a 120° arc (from 150° down to 30°)
const ITEMS = [
  { id: 'analytics'    as const, label: 'Analytics', icon: BarChart3,     color: '#A78BFA', bg: 'rgba(139,92,246,0.20)', border: 'rgba(139,92,246,0.40)', angle: 150 },
  { id: 'diet'         as const, label: 'Diet',      icon: Utensils,      color: '#6EE7B7', bg: 'rgba(16,185,129,0.20)', border: 'rgba(16,185,129,0.40)', angle: 110 },
  { id: 'coach'        as const, label: 'Coach',     icon: MessageCircle, color: '#FCD34D', bg: 'rgba(245,158,11,0.20)', border: 'rgba(245,158,11,0.40)', angle: 70  },
  { id: 'measurements' as const, label: 'Body',      icon: Ruler,         color: '#67E8F9', bg: 'rgba(34,211,238,0.20)', border: 'rgba(34,211,238,0.40)', angle: 30  },
]

function arc(deg: number) {
  const r = (deg * Math.PI) / 180
  return { x: Math.cos(r) * R, y: -Math.sin(r) * R }   // y negative = up
}

export function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  const [open, setOpen] = useState(false)

  const pick = (id: typeof activeView) => { onViewChange(id); setOpen(false) }

  type NI = { id: 'home'|'routine'|'workout'|'profile'; label: string; icon: React.ComponentType<{className?:string}> }

  const Tab = ({ item, isActive }: { item: NI; isActive: boolean }) => {
    const Icon = item.icon
    return (
      <button onClick={() => pick(item.id)}
        className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px]">
        {isActive && (
          <motion.div layoutId="nav-pill"
            className="absolute -top-0.5 w-6 h-[3px] rounded-full bg-[#8B5CF6] shadow-[0_0_8px_rgba(139,92,246,0.6)]"
            transition={{ type:'spring', stiffness:400, damping:30 }} />
        )}
        <div className={isActive ? 'text-[#8B5CF6] drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]' : 'text-slate-400'}>
          <Icon className="w-5 h-5" />
        </div>
        <AnimatePresence>
          {isActive && (
            <motion.span initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
              className="text-[10px] font-medium text-[#8B5CF6]">{item.label}</motion.span>
          )}
        </AnimatePresence>
      </button>
    )
  }

  /* The arc origin sits at the center of the FAB.
     Nav bar height ≈ 56 px, bar has pb-2 (8 px) below it.
     FAB is lifted -mt-6 (24 px) above bar top → center ≈ 56/2+8 = 36px from viewport bottom + 24-28 ≈ 60px.
     We'll use bottom:68 so the arc radiates from ~center of FAB. */
  const ORIGIN_BOTTOM = 68

  return (
    <>
      {/* ── Backdrop ── */}
      <AnimatePresence>
        {open && (
          <motion.div key="bd"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            transition={{duration:0.25}}
            className="fixed inset-0 bg-black/70 backdrop-blur-lg"
            style={{zIndex:40}}
            onClick={() => setOpen(false)} />
        )}
      </AnimatePresence>

      {/* ── Arc fan-out ── */}
      <AnimatePresence>
        {open && (
          <div className="fixed pointer-events-none"
            style={{ zIndex:51, bottom: ORIGIN_BOTTOM, left:'50%', width:0, height:0 }}>

            {/* Dashed semicircle guide */}
            <motion.svg
              width={R*2+60} height={R+40}
              viewBox={`${-R-30} ${-R-30} ${R*2+60} ${R+40}`}
              fill="none"
              className="absolute pointer-events-none"
              style={{ bottom: -20, left: '50%', transform:'translateX(-50%)' }}
              initial={{opacity:0}} animate={{opacity:0.6}} exit={{opacity:0}} transition={{duration:0.35}}>
              <motion.path
                d={`M ${arc(155).x} ${arc(155).y} A ${R} ${R} 0 0 1 ${arc(25).x} ${arc(25).y}`}
                stroke="url(#arcGrad)" strokeWidth="1" strokeDasharray="4 6"
                initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:0.5, ease:'easeOut'}} />
              <defs>
                <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(139,92,246,0.25)" />
                  <stop offset="50%" stopColor="rgba(34,211,238,0.2)" />
                  <stop offset="100%" stopColor="rgba(139,92,246,0.25)" />
                </linearGradient>
              </defs>
            </motion.svg>

            {/* ── Individual arc items ── */}
            {ITEMS.map((item, i) => {
              const pos = arc(item.angle)
              const Icon = item.icon
              const active = activeView === item.id
              return (
                <motion.div key={item.id}
                  className="absolute pointer-events-auto"
                  style={{ left:0, top:0 }}
                  initial={{ x: -HALF, y: -HALF, scale:0, opacity:0 }}
                  animate={{ x: pos.x - HALF, y: pos.y - HALF, scale:1, opacity:1 }}
                  exit={{   x: -HALF, y: -HALF, scale:0, opacity:0,
                            transition:{ delay:(ITEMS.length-1-i)*0.04, duration:0.18 }}}
                  transition={{ delay: i*0.065, type:'spring', stiffness:400, damping:22 }}>

                  {/* Label above icon */}
                  <motion.span
                    initial={{opacity:0, y:4}} animate={{opacity:1, y:0}}
                    transition={{delay: i*0.065+0.22, duration:0.18}}
                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-md backdrop-blur-sm pointer-events-none"
                    style={{ bottom: SZ + 6, color:item.color, background:item.bg, border:`1px solid ${item.border}` }}>
                    {item.label}
                  </motion.span>

                  {/* Circle button */}
                  <motion.button onClick={() => pick(item.id)}
                    whileHover={{scale:1.15}} whileTap={{scale:0.88}}
                    className="relative flex items-center justify-center rounded-full backdrop-blur-xl"
                    style={{
                      width: SZ, height: SZ,
                      background: item.bg,
                      border: `1.5px solid ${item.border}`,
                      boxShadow: `0 0 20px ${item.bg}, 0 0 8px ${item.border}, 0 4px 14px rgba(0,0,0,0.3)`,
                    }}>
                    {active && (
                      <motion.div className="absolute inset-[-3px] rounded-full"
                        style={{border:`2px solid ${item.color}`, boxShadow:`0 0 12px ${item.border}`}}
                        initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} />
                    )}
                    <Icon style={{color:item.color, width:20, height:20}} />
                  </motion.button>
                </motion.div>
              )
            })}
          </div>
        )}
      </AnimatePresence>

      {/* ── Bottom Nav Bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 safe-area-bottom" style={{zIndex:50}}>
        <div className="max-w-md mx-auto px-4 pb-2">
          <div className="flex items-center justify-between bg-[#0A0A14]/95 backdrop-blur-xl rounded-2xl border border-[#8B5CF6]/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] px-2 py-1">

            {/* Left tabs */}
            <div className="flex items-center">
              {([{id:'home' as const,label:'Home',icon:Home},{id:'routine' as const,label:'Routine',icon:Calendar}] as NI[])
                .map(t=><Tab key={t.id} item={t} isActive={activeView===t.id}/>)}
            </div>

            {/* ── FAB ── */}
            <div className="relative -mt-6">
              <AnimatePresence>
                {open && (
                  <>
                    <motion.div key="r1"
                      initial={{scale:1,opacity:0.4}} animate={{scale:2.4,opacity:0}} exit={{opacity:0}}
                      transition={{duration:0.9,ease:'easeOut',repeat:Infinity,repeatDelay:0.5}}
                      className="absolute inset-0 rounded-full"
                      style={{background:'radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%)'}} />
                    <motion.div key="r2"
                      initial={{scale:1,opacity:0.25}} animate={{scale:1.8,opacity:0}} exit={{opacity:0}}
                      transition={{duration:0.7,ease:'easeOut',repeat:Infinity,repeatDelay:0.7,delay:0.25}}
                      className="absolute inset-0 rounded-full bg-[#22D3EE]/20" />
                  </>
                )}
              </AnimatePresence>

              <motion.button
                onClick={() => setOpen(v=>!v)}
                whileTap={{scale:0.82}}
                animate={{ scale: open?1.15:1, rotate: open?45:0 }}
                transition={{type:'spring',stiffness:500,damping:24}}
                className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#8B5CF6] via-[#7C3AED] to-[#22D3EE] transition-shadow duration-300"
                style={{
                  boxShadow: open
                    ? '0 0 32px rgba(139,92,246,0.6), 0 0 64px rgba(34,211,238,0.25)'
                    : '0 4px 24px rgba(139,92,246,0.4), 0 0 40px rgba(34,211,238,0.1)',
                }}>
                <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
              </motion.button>
            </div>

            {/* Right tabs */}
            <div className="flex items-center">
              {([{id:'workout' as const,label:'Workout',icon:ClipboardCheck},{id:'profile' as const,label:'Profile',icon:User}] as NI[])
                .map(t=><Tab key={t.id} item={t} isActive={activeView===t.id}/>)}
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
