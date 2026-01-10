'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, useSpring, AnimatePresence } from 'framer-motion'

interface LoginMascotProps {
  isPasswordFocused: boolean
  isLoginFailed: boolean
}

export function LoginMascot({ isPasswordFocused, isLoginFailed }: LoginMascotProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Pointer state (mouse or touch)
  const pointer = useRef({ x: 0, y: 0 })

  // Springs for each "feature" (we keep a simple index map)
  const springs = useRef({
    purple: { x: useSpring(0, { stiffness: 220, damping: 22 }), y: useSpring(0, { stiffness: 220, damping: 22 }) },
    gray: { x: useSpring(0, { stiffness: 220, damping: 22 }), y: useSpring(0, { stiffness: 220, damping: 22 }) },
    orange: { x: useSpring(0, { stiffness: 220, damping: 22 }), y: useSpring(0, { stiffness: 220, damping: 22 }) },
    yellow: { x: useSpring(0, { stiffness: 220, damping: 22 }), y: useSpring(0, { stiffness: 220, damping: 22 }) },
    beak: { x: useSpring(0, { stiffness: 220, damping: 22 }), y: useSpring(0, { stiffness: 220, damping: 22 }) },
  }).current

  // Refs to the svg eye elements; used to compute centers dynamically
  const purpleEyesRef = useRef<{ left: SVGCircleElement | null; right: SVGCircleElement | null }>({ left: null, right: null })
  const grayEyesRef = useRef<{ left: SVGCircleElement | null; right: SVGCircleElement | null }>({ left: null, right: null })
  const orangeEyesRef = useRef<SVGCircleElement | null>(null)
  const yellowEyeRef = useRef<SVGCircleElement | null>(null)
  const beakRef = useRef<SVGPathElement | null>(null)

  // Utility: get center for an SVG element
  function getElementCenter(el: Element | null) {
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }

  // Track pointer (mouse + touch)
  useEffect(() => {
    const onMove = (clientX: number, clientY: number) => {
      pointer.current.x = clientX
      pointer.current.y = clientY
    }

    const mouseHandler = (e: MouseEvent) => onMove(e.clientX, e.clientY)
    const touchHandler = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY)
    }

    window.addEventListener('mousemove', mouseHandler)
    window.addEventListener('touchmove', touchHandler, { passive: true })

    return () => {
      window.removeEventListener('mousemove', mouseHandler)
      window.removeEventListener('touchmove', touchHandler)
    }
  }, [])

  // Main loop to update springs based on current pointer
  useEffect(() => {
    let raf = 0
    const maxOffset = 8 // max pixel offset for pupils/beak
    const update = () => {
      // If password is focused -> center (0,0)
      if (isPasswordFocused) {
        Object.values(springs).forEach(s => {
          s.x.set(0)
          s.y.set(0)
        })
        raf = requestAnimationFrame(update)
        return
      }

      // compute centers for each feature and update springs to point toward pointer
      const p = pointer.current

      // helper to compute target offset for a feature
      const computeOffset = (el: Element | null, clamp = maxOffset) => {
        const center = getElementCenter(el)
        if (!center) return { tx: 0, ty: 0 }
        const dx = p.x - center.x
        const dy = p.y - center.y
        const dist = Math.hypot(dx, dy) || 1
        // smaller movement when far to keep subtlety
        const strength = Math.min(clamp, dist / 25)
        return { tx: (dx / dist) * strength, ty: (dy / dist) * strength }
      }

      // Purple (two pupils share same offset)
      const purpleCenterEl = purpleEyesRef.current.left || purpleEyesRef.current.right
      const purple = computeOffset(purpleCenterEl, 8)
      springs.purple.x.set(purple.tx)
      springs.purple.y.set(purple.ty)

      // Gray (two pupils)
      const grayCenterEl = grayEyesRef.current.left || grayEyesRef.current.right
      const gray = computeOffset(grayCenterEl, 7.5)
      springs.gray.x.set(gray.tx)
      springs.gray.y.set(gray.ty)

      // Orange eyes (three dots) -> share same offset
      const orange = computeOffset(orangeEyesRef.current, 6.5)
      springs.orange.x.set(orange.tx)
      springs.orange.y.set(orange.ty)

      // Yellow single eye
      const yellow = computeOffset(yellowEyeRef.current, 6)
      springs.yellow.x.set(yellow.tx)
      springs.yellow.y.set(yellow.ty)

      // Beak: we want the beak to *point* at the pointer => move beak end using slightly larger offset
      const beakOffset = computeOffset(beakRef.current, 12)
      springs.beak.x.set(beakOffset.tx)
      springs.beak.y.set(beakOffset.ty)

      raf = requestAnimationFrame(update)
    }

    raf = requestAnimationFrame(update)
    return () => cancelAnimationFrame(raf)
  }, [isPasswordFocused, springs])

  // When login fails, we briefly drive a stronger shake. We just toggle an internal key to restart animation if repeated.
  const [shakeKey, setShakeKey] = useState(0)
  useEffect(() => {
    if (isLoginFailed) {
      setShakeKey(k => k + 1)
    }
  }, [isLoginFailed])

  // Layout: width/height are fixed to match original art. Keep same viewBox for pixel-perfect look.
  // Note: we animate fill color of pupils to red on isLoginFailed to show error.
  return (
    <div ref={containerRef} id="login-mascot-group" className="relative w-full h-full flex items-center justify-center select-none">
      <svg width="420" height="500" viewBox="0 0 420 500" fill="none" className="pointer-events-none" aria-hidden>
        <AnimatePresence>
          <motion.g
            key={shakeKey}
            // Shake animation when login fails: small x oscillation
            animate={isLoginFailed ? { x: [0, -10, 8, -6, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.6, times: [0, 0.12, 0.36, 0.6, 0.85, 1] }}
            style={{ originX: 0.5, originY: 0.5 }}
          >
            {/* Purple Tall Character - back left */}
            <motion.g
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 140, damping: 18, delay: 0.05 }}
            >
              <rect x="120" y="70" width="100" height="380" rx="24" fill="#7C3AED" />

              {/* white sclera */}
              <circle cx="150" cy="130" r="12" fill="white" />
              <circle cx="190" cy="130" r="12" fill="white" />

              {/* pupils (motion) */}
              <motion.circle
                ref={el => (purpleEyesRef.current.left = el)}
                cx="150"
                cy="130"
                r="5"
                fill={isLoginFailed ? '#EF4444' : '#0F172A'}
                style={{ x: springs.purple.x, y: springs.purple.y }}
              />
              <motion.circle
                ref={el => (purpleEyesRef.current.right = el)}
                cx="190"
                cy="130"
                r="5"
                fill={isLoginFailed ? '#EF4444' : '#0F172A'}
                style={{ x: springs.purple.x, y: springs.purple.y }}
              />

              {/* subtle mouth / expression morph */}
              <motion.path
                initial={false}
                animate={isLoginFailed ? { d: 'M140 190 Q160 175 180 190' } : { d: 'M160 170 L160 190' }}
                stroke="#6D28D9"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </motion.g>

            {/* Dark Gray Character - middle */}
            <motion.g
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 140, damping: 18, delay: 0.12 }}
            >
              <rect x="170" y="170" width="90" height="280" rx="24" fill="#1E293B" />

              <circle cx="200" cy="230" r="11" fill="white" />
              <circle cx="230" cy="230" r="11" fill="white" />

              <motion.circle
                ref={el => (grayEyesRef.current.left = el)}
                cx="200"
                cy="230"
                r="5"
                fill={isLoginFailed ? '#EF4444' : '#0F172A'}
                style={{ x: springs.gray.x, y: springs.gray.y }}
              />
              <motion.circle
                ref={el => (grayEyesRef.current.right = el)}
                cx="230"
                cy="230"
                r="5"
                fill={isLoginFailed ? '#EF4444' : '#0F172A'}
                style={{ x: springs.gray.x, y: springs.gray.y }}
              />
            </motion.g>

            {/* Orange Semi-Circle - front left bottom */}
            <motion.g
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 140, damping: 18, delay: 0.2 }}
            >
              <path d="M 10 450 C 10 260, 270 260, 270 450 Z" fill="#F97316" />

              <motion.circle
                ref={el => (orangeEyesRef.current = el)}
                cx="115"
                cy="335"
                r="5"
                fill={isLoginFailed ? '#EF4444' : '#0F172A'}
                style={{ x: springs.orange.x, y: springs.orange.y }}
              />
              <motion.circle
                cx="138"
                cy="335"
                r="5"
                fill={isLoginFailed ? '#EF4444' : '#0F172A'}
                style={{ x: springs.orange.x, y: springs.orange.y }}
              />
              <motion.circle
                cx="161"
                cy="325"
                r="5"
                fill={isLoginFailed ? '#EF4444' : '#0F172A'}
                style={{ x: springs.orange.x, y: springs.orange.y }}
              />
            </motion.g>

            {/* Yellow Pill Character - front right */}
            <motion.g
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 140, damping: 18, delay: 0.28 }}
            >
              <rect x="240" y="270" width="90" height="180" rx="45" fill="#F59E0B" />

              <motion.circle
                ref={el => (yellowEyeRef.current = el)}
                cx="300"
                cy="320"
                r="4"
                fill={isLoginFailed ? '#EF4444' : '#0F172A'}
                style={{ x: springs.yellow.x, y: springs.yellow.y }}
              />

              {/* Beak -- animate the whole path based on springs.beak */}
              <motion.path
                ref={beakRef}
                d="M 300 345 L 380 330"
                stroke="#0F172A"
                strokeWidth="4"
                strokeLinecap="round"
                style={{ x: springs.beak.x, y: springs.beak.y }}
              />
            </motion.g>

            {/* Hands that slide up to cover eyes when password focused */}
            <AnimatePresence>
              {isPasswordFocused && (
                <motion.g
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                >
                  {/* Purple character hands (over purple eyes) */}
                  <motion.ellipse
                    cx="130"
                    cy="120"
                    rx="22"
                    ry="28"
                    fill="#8B5CF6"
                    opacity={0.95}
                    animate={{ cx: [130, 145], opacity: [0.95, 1] }}
                    transition={{ duration: 0.25 }}
                  />
                  <motion.ellipse
                    cx="210"
                    cy="120"
                    rx="22"
                    ry="28"
                    fill="#8B5CF6"
                    opacity={0.95}
                    animate={{ cx: [210, 195], opacity: [0.95, 1] }}
                    transition={{ duration: 0.25 }}
                  />

                  {/* Gray character hands */}
                  <motion.ellipse
                    cx="180"
                    cy="220"
                    rx="20"
                    ry="24"
                    fill="#334155"
                    opacity={0.95}
                    animate={{ cx: [180, 180], cy: [220, 210] }}
                    transition={{ duration: 0.25 }}
                  />
                  <motion.ellipse
                    cx="250"
                    cy="220"
                    rx="20"
                    ry="24"
                    fill="#334155"
                    opacity={0.95}
                    animate={{ cx: [250, 250], cy: [220, 210] }}
                    transition={{ duration: 0.25 }}
                  />
                </motion.g>
              )}
            </AnimatePresence>
          </motion.g>
        </AnimatePresence>
      </svg>
    </div>
  )
}
