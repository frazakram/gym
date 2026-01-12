'use client'

interface DaySelectorProps {
  selectedDay: number // 0-6 for Mon-Sun
  onDayChange: (day: number) => void
  daysInRoutine?: number // Number of days in the routine
}

export function DaySelector({ selectedDay, onDayChange, daysInRoutine = 7 }: DaySelectorProps) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const today = (new Date().getDay() + 6) % 7 // Convert Sun=0 to Mon=0

  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 px-4 py-3 min-w-max">
        {days.slice(0, daysInRoutine).map((day, index) => {
          const isSelected = selectedDay === index
          const isToday = today === index
          
          return (
            <button
              key={day}
              onClick={() => onDayChange(index)}
              className={`
                relative px-4 py-2.5 rounded-xl min-w-[60px] font-semibold text-sm
                transition-all duration-200
                ${isSelected 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20' 
                  : 'glass-soft text-slate-300 hover:text-white hover:bg-white/10'
                }
              `}
            >
              <span>{day}</span>
              {isToday && !isSelected && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
