
import React from 'react';
import { WeeklyDiet } from '@/types';
import { DietDisplay } from '@/components/DietDisplay';
import { Utensils } from 'lucide-react';

interface DietViewProps {
  diet: WeeklyDiet | null;
  onGenerateDiet: () => void;
  generating: boolean;
}

export const DietView: React.FC<DietViewProps> = ({ diet, onGenerateDiet, generating }) => {
  if (!diet) {
    return (
      <div className="pb-24 px-4 py-6 text-center">
        <div className="glass rounded-2xl p-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
            <Utensils className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Nutrition Plan</h2>
          <p className="text-slate-300/70 mb-6">
            Generate a personalized meal plan tailored to your goal, diet type (e.g., Keto, Vegan), and calorie needs.
          </p>
          <button
            onClick={onGenerateDiet}
            disabled={generating}
            className="py-3 px-8 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold disabled:opacity-50 shadow-lg shadow-green-500/20 hover:shadow-green-500/30 transition-all"
          >
            {generating ? 'Generating Plan...' : 'Generate New Diet Plan'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Your Diet Plan</h1>
        <button
          onClick={onGenerateDiet}
          disabled={generating}
          className="text-xs px-3 py-1.5 rounded-lg glass-soft text-slate-300 hover:text-white transition"
        >
          {generating ? 'Refreshing...' : 'Regenerate'}
        </button>
      </div>
      
      <DietDisplay diet={diet} />
      
      <div className="mt-8 p-4 glass rounded-xl text-center">
         <p className="text-sm text-slate-400">
           This plan is based on your profile preferences. Go to the Profile tab to update your diet type, calories, or allergies.
         </p>
      </div>
    </div>
  );
};
