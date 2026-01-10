'use client'

import { useState, useEffect } from 'react'
import { motion, useSpring } from 'framer-motion'

interface LoginMascotProps {
    isPasswordFocused: boolean
}

export function LoginMascot({ isPasswordFocused }: LoginMascotProps) {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

    // Smooth spring animations for all character pupils
    const purplePupilX = useSpring(0, { stiffness: 200, damping: 20 })
    const purplePupilY = useSpring(0, { stiffness: 200, damping: 20 })
    const grayPupilX = useSpring(0, { stiffness: 200, damping: 20 })
    const grayPupilY = useSpring(0, { stiffness: 200, damping: 20 })
    const yellowPupilX = useSpring(0, { stiffness: 200, damping: 20 })
    const yellowPupilY = useSpring(0, { stiffness: 200, damping: 20 })
    const orangePupilX = useSpring(0, { stiffness: 200, damping: 20 })
    const orangePupilY = useSpring(0, { stiffness: 200, damping: 20 })
    const yellowNoseX = useSpring(0, { stiffness: 200, damping: 20 })
    const yellowNoseY = useSpring(0, { stiffness: 200, damping: 20 })

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY })
        }

        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    // Calculate pupil positions based on mouse position
    useEffect(() => {
        if (isPasswordFocused) {
            // Center all pupils when password is focused
            purplePupilX.set(0)
            purplePupilY.set(0)
            grayPupilX.set(0)
            grayPupilY.set(0)
            yellowPupilX.set(0)
            yellowPupilY.set(0)
            orangePupilX.set(0)
            orangePupilY.set(0)
            yellowNoseX.set(0)
            yellowNoseY.set(0)
            return
        }

        const mascotElement = document.getElementById('login-mascot-group')
        if (!mascotElement) return

        const rect = mascotElement.getBoundingClientRect()

        // Eye/Nose positions for each character
        const features = [
            { x: rect.left + 170, y: rect.top + 130, springX: purplePupilX, springY: purplePupilY }, // Purple Eye
            { x: rect.left + 215, y: rect.top + 230, springX: grayPupilX, springY: grayPupilY }, // Gray Eye
            { x: rect.left + 275, y: rect.top + 320, springX: yellowPupilX, springY: yellowPupilY }, // Yellow Eye
            { x: rect.left + 135, y: rect.top + 335, springX: orangePupilX, springY: orangePupilY }, // Orange Eye
            { x: rect.left + 330, y: rect.top + 340, springX: yellowNoseX, springY: yellowNoseY }, // Yellow Nose
        ]

        features.forEach(({ x, y, springX, springY }) => {
            const angle = Math.atan2(mousePos.y - y, mousePos.x - x)
            const distance = Math.min(8, Math.hypot(mousePos.x - x, mousePos.y - y) / 20)

            springX.set(Math.cos(angle) * distance)
            springY.set(Math.sin(angle) * distance)
        })
    }, [mousePos, isPasswordFocused, purplePupilX, purplePupilY, grayPupilX, grayPupilY, yellowPupilX, yellowPupilY, orangePupilX, orangePupilY, yellowNoseX, yellowNoseY])

    return (
        <div id="login-mascot-group" className="relative w-full h-full flex items-center justify-center">
            <svg width="400" height="500" viewBox="0 0 400 500" fill="none" className="select-none">

                {/* Purple Rectangle Character (tallest, back left) */}
                <motion.g
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.1 }}
                >
                    {/* Extended height to touch base (y=450) */}
                    <rect x="120" y="70" width="100" height="380" rx="24" fill="#7C3AED" />

                    {/* Eyes - WHITE sclera with dark pupils */}
                    <circle cx="150" cy="130" r="10" fill="white" />
                    <motion.circle cx="150" cy="130" r="4" fill="#1e293b" style={{ x: purplePupilX, y: purplePupilY }} />

                    <circle cx="190" cy="130" r="10" fill="white" />
                    <motion.circle cx="190" cy="130" r="4" fill="#1e293b" style={{ x: purplePupilX, y: purplePupilY }} />

                    {/* Mouth */}
                    <line x1="160" y1="170" x2="160" y2="190" stroke="#6D28D9" strokeWidth="3" strokeLinecap="round" />
                </motion.g>

                {/* Dark Gray Rectangle Character (middle) */}
                <motion.g
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.2 }}
                >
                    {/* Elongated to touch base (y=450) and darker color */}
                    <rect x="170" y="170" width="90" height="280" rx="24" fill="#1E293B" />

                    {/* Eyes - WHITE sclera with dark pupils */}
                    <circle cx="200" cy="230" r="9" fill="white" />
                    <motion.circle cx="200" cy="230" r="4" fill="#1e293b" style={{ x: grayPupilX, y: grayPupilY }} />

                    <circle cx="230" cy="230" r="9" fill="white" />
                    <motion.circle cx="230" cy="230" r="4" fill="#1e293b" style={{ x: grayPupilX, y: grayPupilY }} />
                </motion.g>

                {/* Orange Semi-Circle Character (front left, bottom) */}
                <motion.g
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.3 }}
                >
                    {/* MASSIVE rounded shape to anchor the group - Darker Orange */}
                    <path
                        d="M 10 450 C 10 260, 270 260, 270 450 Z"
                        fill="#F97316"
                    />

                    {/* Eyes (Three simple dots in a curve: two low, one high) */}
                    <motion.circle cx="115" cy="335" r="5" fill="#1e293b" style={{ x: orangePupilX, y: orangePupilY }} />
                    <motion.circle cx="138" cy="335" r="5" fill="#1e293b" style={{ x: orangePupilX, y: orangePupilY }} />
                    <motion.circle cx="161" cy="325" r="5" fill="#1e293b" style={{ x: orangePupilX, y: orangePupilY }} />
                </motion.g>

                {/* Yellow Pill Shape Character (front right) */}
                <motion.g
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.4 }}
                >
                    {/* Darker Yellow */}
                    <rect x="240" y="270" width="90" height="180" rx="45" fill="#F59E0B" />

                    {/* Single eye - Just a dark pupil (no sclera) */}
                    <motion.circle cx="300" cy="320" r="3.5" fill="#1e293b" style={{ x: yellowPupilX, y: yellowPupilY }} />
                  
                    {/* Beak/mouth - Pointing OUTSIDE the body AND Tracking Cursor */}
                    <motion.path
                        d="M 300 345 L 380 330"
                        stroke="#1e293b"
                        strokeWidth="4"
                        strokeLinecap="round"
                        style={{ x: yellowNoseX, y: yellowNoseY }}
                    />
                </motion.g>

                {/* Hand overlay when password is focused */}
                {isPasswordFocused && (
                    <motion.g
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    >
                        {/* Purple character hands */}
                        <ellipse cx="130" cy="130" rx="20" ry="25" fill="#8B5CF6" opacity="0.9" />
                        <ellipse cx="210" cy="130" rx="20" ry="25" fill="#8B5CF6" opacity="0.9" />

                        {/* Gray character hands */}
                        <ellipse cx="180" cy="230" rx="18" ry="22" fill="#334155" opacity="0.9" />
                        <ellipse cx="250" cy="230" rx="18" ry="22" fill="#334155" opacity="0.9" />
                    </motion.g>
                )}
            </svg>
        </div>
    )
}
