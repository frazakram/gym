'use client'

import { useState, useEffect } from 'react'
import { motion, useSpring } from 'framer-motion'

interface LoginMascotProps {
    isPasswordFocused: boolean
    isLoginFailed: boolean
}

export function LoginMascot({ isPasswordFocused, isLoginFailed }: LoginMascotProps) {
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

    // Smile animation for Orange character
    const smileProgress = useSpring(0, { stiffness: 100, damping: 20 })

    // Interpolate between flat/small smile and big happy smile
    // We use a query parameter-like syntax for the path to interpolate d attribute properly if we were using a simpler library,
    // but with Framer Motion we can interpolate numbers in strings if the structure matches.
    // Small smile: "M 128 335 Q 138 338 148 335" (Control point y=338)
    // Big smile:   "M 125 332 Q 138 355 151 332" (Wider, Control point y=355)
    // To ensure smooth interpolation, we should keep point counts identical.
    /* 
      Start: M 128 335 Q 138 338 148 335 
      End:   M 125 332 Q 138 358 151 332
    */

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
            { x: rect.left + 170, y: rect.top + 80, springX: purplePupilX, springY: purplePupilY }, // Purple Eye - Moved UP to 80
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

        // Calculate smile intensity based on mouse X position
        // Map X from 0 (left) to window.innerWidth (right) -> 0 to 1
        // We want it happier as it gets closer to the login form (right side)
        const width = window.innerWidth
        const xNorm = Math.max(0, Math.min(1, mousePos.x / width))

        // Intensity curve: 
        // 0.0 - 0.5 (Left side): 0 to 0.3 (Slight smile)
        // 0.5 - 1.0 (Right side): 0.3 to 1.0 (Big smile)
        let intensity = 0
        if (xNorm < 0.5) {
            intensity = xNorm * 0.6 // 0 -> 0.3
        } else {
            intensity = 0.3 + ((xNorm - 0.5) * 1.4) // 0.3 -> 1.0
        }

        smileProgress.set(intensity)
    }, [mousePos, isPasswordFocused, purplePupilX, purplePupilY, grayPupilX, grayPupilY, yellowPupilX, yellowPupilY, orangePupilX, orangePupilY, yellowNoseX, yellowNoseY])

    return (
        <div id="login-mascot-group" className="relative w-full h-full flex items-center justify-center">
            <svg width="400" height="500" viewBox="0 0 400 500" fill="none" className="select-none">
                <motion.g
                    animate={isLoginFailed ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    {/* Purple Rectangle Character (tallest, back left) */}
                    <motion.g
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.1 }}
                    >
                        {/* Extended height to touch base (y=450) - Taller (y=20) */}
                        <rect x="120" y="20" width="100" height="430" rx="24" fill="#7C3AED" />

                        {/* Eyes - WHITE sclera with dark pupils (Red on error) - Moved UP to 80 */}
                        <circle cx="150" cy="80" r="10" fill="white" />
                        <motion.circle
                            cx="150" cy="80" r="4"
                            animate={{ fill: isLoginFailed ? "#EF4444" : "#1e293b" }}
                            style={{ x: purplePupilX, y: purplePupilY }}
                        />

                        <circle cx="190" cy="80" r="10" fill="white" />
                        <motion.circle
                            cx="190" cy="80" r="4"
                            animate={{ fill: isLoginFailed ? "#EF4444" : "#1e293b" }}
                            style={{ x: purplePupilX, y: purplePupilY }}
                        />

                        {/* Mouth - Morphs to frown on error */}
                        {/* Mouth - Dynamic Smile/Vertical expression */}
                        <PurpleMouth
                            progress={smileProgress}
                            isFailed={isLoginFailed}
                        />
                    </motion.g>

                    {/* Dark Gray Rectangle Character (middle) */}
                    <motion.g
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.2 }}
                    >
                        {/* Elongated to touch base (y=450) and darker color */}
                        <rect x="170" y="170" width="90" height="280" rx="24" fill="#1E293B" />

                        {/* Eyes - WHITE sclera with dark pupils (Red on error) */}
                        <circle cx="200" cy="230" r="9" fill="white" />
                        <motion.circle
                            cx="200" cy="230" r="4"
                            animate={{ fill: isLoginFailed ? "#EF4444" : "#1e293b" }}
                            style={{ x: grayPupilX, y: grayPupilY }}
                        />

                        <circle cx="230" cy="230" r="9" fill="white" />
                        <motion.circle
                            cx="230" cy="230" r="4"
                            animate={{ fill: isLoginFailed ? "#EF4444" : "#1e293b" }}
                            style={{ x: grayPupilX, y: grayPupilY }}
                        />
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

                        {/* Eyes (Three simple dots in a curve: two low, one high) - Red on error */}
                        <motion.circle
                            cx="115" cy="335" r="5"
                            animate={{ fill: isLoginFailed ? "#EF4444" : "#1e293b" }}
                            style={{ x: orangePupilX, y: orangePupilY }}
                        />


                        {/* Mouth - Dynamic Smile replacing the middle dot */}
                        <Mouth
                            progress={smileProgress}
                            isFailed={isLoginFailed}
                            x={orangePupilX}
                            y={orangePupilY}
                        />

                        <motion.circle
                            cx="161" cy="325" r="5"
                            animate={{ fill: isLoginFailed ? "#EF4444" : "#1e293b" }}
                            style={{ x: orangePupilX, y: orangePupilY }}
                        />
                    </motion.g>

                    {/* Yellow Pill Shape Character (front right) */}
                    <motion.g
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.4 }}
                    >
                        {/* Darker Yellow */}
                        <rect x="240" y="270" width="90" height="180" rx="45" fill="#F59E0B" />

                        {/* Single eye - Just a dark pupil (no sclera) - Red on error */}
                        <motion.circle
                            cx="300" cy="320" r="3.5"
                            animate={{ fill: isLoginFailed ? "#EF4444" : "#1e293b" }}
                            style={{ x: yellowPupilX, y: yellowPupilY }}
                        />

                        {/* Beak/mouth - Pointing OUTSIDE the body AND Tracking Cursor */}
                        <YellowMouth
                            progress={smileProgress}
                            isFailed={isLoginFailed}
                            x={yellowNoseX}
                            y={yellowNoseY}
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
                            {/* Purple character hands - Moved UP to 80 to cover eyes */}
                            <ellipse cx="130" cy="80" rx="20" ry="25" fill="#8B5CF6" opacity="0.9" />
                            <ellipse cx="210" cy="80" rx="20" ry="25" fill="#8B5CF6" opacity="0.9" />

                            {/* Gray character hands */}
                            <ellipse cx="180" cy="230" rx="18" ry="22" fill="#334155" opacity="0.9" />
                            <ellipse cx="250" cy="230" rx="18" ry="22" fill="#334155" opacity="0.9" />
                        </motion.g>
                    )}
                </motion.g>
            </svg>
        </div >
    )
}

function Mouth({ progress, isFailed, x, y }: { progress: any, isFailed: boolean, x: any, y: any }) {
    // We use a transform here to map the progress (0-1) to the path string
    // Start (Neutral): M 128 335 Q 138 338 148 335
    // End (Happy):     M 125 332 Q 138 358 151 332

    // If failed, we want a frown/check
    // Frown: M 128 345 Q 138 330 148 345

    // Since complex path interpolation can be tricky with just springs in 'd',
    // we'll calculate the control points directly.

    const [pathD, setPathD] = useState("M 128 343 Q 138 346 148 343")

    useEffect(() => {
        const unsubscribe = progress.on("change", (latest: number) => {
            if (isFailed) return

            // Interpolate points
            const startX = 128 - (3 * latest) // 128 -> 125
            const startY = 343 - (3 * latest) // 343 -> 340
            const endX = 148 + (3 * latest)   // 148 -> 151
            const endY = 343 - (3 * latest)   // 343 -> 340

            const controlY = 346 + (20 * latest) // 346 -> 366

            setPathD(`M ${startX} ${startY} Q 138 ${controlY} ${endX} ${endY}`)
        })
        return unsubscribe
    }, [progress, isFailed])

    const failedPath = "M 125 353 Q 138 335 151 353" // Deeper Frown for clarity

    return (
        <motion.path
            d={isFailed ? failedPath : pathD}
            stroke={isFailed ? "#EF4444" : "#1e293b"}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            style={{ x, y }}
        />
    )
}

function PurpleMouth({ progress, isFailed }: { progress: any, isFailed: boolean }) {
    const [pathD, setPathD] = useState("M 163 140 Q 170 143 177 140") // Small smile centered at 170

    useEffect(() => {
        const unsubscribe = progress.on("change", (latest: number) => {
            if (isFailed) return

            // Neutral: M 163 140 Q 170 143 177 140
            // Happy:   M 155 140 Q 170 160 185 140

            // Interpolate
            const startX = 163 - (8 * latest)
            const startY = 140 // Constant Y for symmetry
            const endX = 177 + (8 * latest)
            const endY = 140 // Constant Y for symmetry
            const controlY = 143 + (17 * latest)

            setPathD(`M ${startX} ${startY} Q 170 ${controlY} ${endX} ${endY}`)
        })
        return unsubscribe
    }, [progress, isFailed])

    const failedPath = "M 155 150 Q 170 130 185 150"

    return (
        <motion.path
            d={isFailed ? failedPath : pathD}
            stroke="#1e293b"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
        />
    )
}

function YellowMouth({ progress, isFailed, x, y }: { progress: any, isFailed: boolean, x: any, y: any }) {
    // Requirements: 
    // - Straight line for Happy/Neutral (No curvature)
    // - "Shrinky" (shorter/compressed) straight line for Failed state

    // Normal (Happy/Neutral): Full length straight line
    // M 300 345 L 380 330
    const normalPath = "M 300 345 L 380 330"

    // Failed: Compressed straight line (Shrunk towards center)
    // Center approx: (340, 337.5)
    // Shrunk Start: ~320 341
    // Shrunk End:   ~360 334
    const failedPath = "M 320 341 L 360 334"

    return (
        <motion.path
            d={isFailed ? failedPath : normalPath}
            stroke="#1e293b"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            style={{ x, y }}
            animate={{ d: isFailed ? failedPath : normalPath }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
    )
}
