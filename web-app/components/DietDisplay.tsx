
import React, { useState } from 'react';
import { WeeklyDiet } from '@/types';
import { ChevronDown, ChevronUp, Salad, Flame, Utensils } from 'lucide-react';

interface DietDisplayProps {
  diet: WeeklyDiet | null;
}

export const DietDisplay: React.FC<DietDisplayProps> = ({ diet }) => {
  const [expanded, setExpanded] = useState(false);

  if (!diet) return null;

  return (
    <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden mt-8">
      <div 
        className="p-6 cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
            <Salad className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Weekly Meal Plan</h2>
            <p className="text-sm text-white/50">Personalized nutrition to fuel your gains</p>
          </div>
        </div>
        
        {expanded ? <ChevronUp className="w-5 h-5 text-white/50" /> : <ChevronDown className="w-5 h-5 text-white/50" />}
      </div>

      {expanded && (
        <div className="px-6 pb-6 space-y-6">
          {diet.days.map((day, i) => (
            <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <h3 className="font-bold text-lg text-green-400">{day.day}</h3>
                <div className="flex gap-4 text-sm text-white/60">
                  <div className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span>{day.total_calories} kcal</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Utensils className="w-4 h-4 text-blue-400" />
                    <span>{day.total_protein}g Protein</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                {day.meals.map((meal, j) => (
                  <div key={j} className="flex flex-col sm:flex-row sm:items-start gap-4 p-3 bg-black/20 rounded-lg">
                     <div className="min-w-[120px]">
                        <span className="text-sm font-semibold text-white/90 block">{meal.name}</span>
                        <div className="text-xs text-white/40 mt-1 space-y-0.5">
                           <div>{meal.calories} kcal</div>
                           <div>P: {meal.protein}g C: {meal.carbs}g F: {meal.fats}g</div>
                        </div>
                     </div>
                     <div className="flex-1">
                        <p className="text-sm text-white/70 leading-relaxed">{meal.ingredients}</p>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
