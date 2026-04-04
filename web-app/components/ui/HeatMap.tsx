'use client'

import { useMemo } from 'react'

interface HeatMapProps {
    data: Array<{ date: string; value: number }>
    weeks?: number
    onCellClick?: (date: string, value: number) => void
}

const DAY_LABELS = ['M', '', 'W', '', 'F', '', 'S']

export function HeatMap({ data, weeks = 8, onCellClick }: HeatMapProps) {
    const grid = useMemo(() => {
        const dataMap = new Map(data.map(d => [d.date, d.value]))
        const today = new Date()
        const cells: Array<{ date: string; value: number; dayOfWeek: number; weekIndex: number }> = []

        const startDate = new Date(today)
        startDate.setDate(startDate.getDate() - (weeks * 7) + 1)
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

    const weekGroups = useMemo(() => {
        const groups: typeof grid[] = []
        for (let i = 0; i < weeks; i++) {
            groups.push(grid.filter(c => c.weekIndex === i))
        }
        return groups
    }, [grid, weeks])

    // Solid opaque colors that stand out against the dark glass card
    const cellStyle = (value: number): React.CSSProperties => {
        if (value < 0) return { backgroundColor: 'transparent' }
        if (value === 0) return { backgroundColor: '#252540', border: '1px solid #35355a' }
        if (value < 0.5) return { backgroundColor: '#6d3fc4', border: '1px solid #7d4fd4' }
        if (value < 1) return { backgroundColor: '#8b5cf6', border: '1px solid #9b6cff' }
        return { backgroundColor: '#a78bfa', border: '1px solid #b79bff', boxShadow: '0 0 4px rgba(139,92,246,0.4)' }
    }

    return (
        <div className="w-full">
            <div className="flex gap-[5px]">
                {/* Day labels */}
                <div className="flex flex-col gap-[5px] shrink-0 w-3.5">
                    {DAY_LABELS.map((label, i) => (
                        <div key={i} className="h-3.5 flex items-center justify-end">
                            <span className="text-[9px] text-white/40 leading-none">{label}</span>
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div className="flex-1 grid gap-[5px]" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
                    {weekGroups.map((week, wi) => (
                        <div key={wi} className="flex flex-col gap-[5px]">
                            {week.map((cell) => (
                                <div
                                    key={cell.date}
                                    onClick={() => cell.value >= 0 && onCellClick?.(cell.date, cell.value)}
                                    title={cell.value < 0 ? '' : cell.value === 0 ? `${cell.date}: Rest` : `${cell.date}: ${Math.round(cell.value * 100)}%`}
                                    className={`h-3.5 rounded-[4px] ${cell.value >= 0 ? 'hover:brightness-125 cursor-pointer' : ''}`}
                                    style={cellStyle(cell.value)}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-1.5 mt-2.5 text-[9px] text-white/40">
                <span>Less</span>
                <div className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: '#252540', border: '1px solid #35355a' }} />
                <div className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: '#6d3fc4' }} />
                <div className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: '#8b5cf6' }} />
                <div className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: '#a78bfa' }} />
                <span>More</span>
            </div>
        </div>
    )
}
