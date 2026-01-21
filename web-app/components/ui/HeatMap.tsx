'use client'

import { useMemo } from 'react'

interface HeatMapProps {
    /** Array of completion data: { date: string, value: number (0-1) } */
    data: Array<{ date: string; value: number }>
    /** Number of weeks to display */
    weeks?: number
    /** Callback when a cell is clicked */
    onCellClick?: (date: string, value: number) => void
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function HeatMap({ data, weeks = 12, onCellClick }: HeatMapProps) {
    const grid = useMemo(() => {
        // Create a map of date -> value for quick lookup
        const dataMap = new Map(data.map(d => [d.date, d.value]))

        // Generate grid: weeks x 7 days
        const today = new Date()
        const cells: Array<{ date: string; value: number; dayOfWeek: number; weekIndex: number }> = []

        // Go back 'weeks' worth of weeks
        const startDate = new Date(today)
        startDate.setDate(startDate.getDate() - (weeks * 7) + 1)

        // Adjust to start from Monday
        const dayOfWeek = startDate.getDay()
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        startDate.setDate(startDate.getDate() - diff)

        for (let week = 0; week < weeks; week++) {
            for (let day = 0; day < 7; day++) {
                const cellDate = new Date(startDate)
                cellDate.setDate(startDate.getDate() + week * 7 + day)
                const dateStr = cellDate.toISOString().split('T')[0]
                const isFuture = cellDate > today

                cells.push({
                    date: dateStr,
                    value: isFuture ? -1 : (dataMap.get(dateStr) ?? 0),
                    dayOfWeek: day,
                    weekIndex: week,
                })
            }
        }

        return cells
    }, [data, weeks])

    const getColorClass = (value: number) => {
        if (value < 0) return 'bg-slate-800/30' // Future dates
        if (value === 0) return 'bg-slate-700/40'
        if (value < 0.25) return 'bg-[#FF6F61]/20'
        if (value < 0.5) return 'bg-[#FF6F61]/40'
        if (value < 0.75) return 'bg-[#FF6F61]/60'
        if (value < 1) return 'bg-[#FF6F61]/80'
        return 'bg-[#FF6F61] shadow-[0_0_8px_rgba(255,111,97,0.4)]'
    }

    const getTooltip = (date: string, value: number) => {
        if (value < 0) return 'Future'
        if (value === 0) return `${date}: No activity`
        return `${date}: ${Math.round(value * 100)}% complete`
    }

    // Group cells by week for rendering
    const weekGroups = useMemo(() => {
        const groups: typeof grid[] = []
        for (let i = 0; i < weeks; i++) {
            groups.push(grid.filter(c => c.weekIndex === i))
        }
        return groups
    }, [grid, weeks])

    return (
        <div className="w-full">
            {/* Day labels */}
            <div className="flex gap-1 mb-1">
                <div className="w-6" /> {/* Spacer for week labels */}
                {DAYS.map((day, i) => (
                    <div key={day} className="flex-1 text-[9px] text-slate-500 text-center">
                        {i % 2 === 0 ? day.charAt(0) : ''}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="flex gap-0.5">
                {weekGroups.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-0.5 flex-1">
                        {week.map((cell) => (
                            <button
                                key={cell.date}
                                onClick={() => cell.value >= 0 && onCellClick?.(cell.date, cell.value)}
                                title={getTooltip(cell.date, cell.value)}
                                disabled={cell.value < 0}
                                className={`
                  aspect-square rounded-sm transition-all duration-200
                  ${getColorClass(cell.value)}
                  ${cell.value >= 0 ? 'hover:ring-1 hover:ring-white/30 hover:scale-110 cursor-pointer' : 'cursor-default'}
                `}
                            />
                        ))}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-1 mt-3 text-[10px] text-slate-400">
                <span>Less</span>
                <div className="w-2.5 h-2.5 rounded-sm bg-slate-700/40" />
                <div className="w-2.5 h-2.5 rounded-sm bg-[#FF6F61]/25" />
                <div className="w-2.5 h-2.5 rounded-sm bg-[#FF6F61]/50" />
                <div className="w-2.5 h-2.5 rounded-sm bg-[#FF6F61]/75" />
                <div className="w-2.5 h-2.5 rounded-sm bg-[#FF6F61]" />
                <span>More</span>
            </div>
        </div>
    )
}
