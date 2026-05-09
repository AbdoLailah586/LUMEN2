import React from 'react';
import { Check, X, Info } from 'lucide-react';

interface SuggestionCardProps {
    title: string;
    description: string;
    reason: string;
    onAccept: () => void;
    onReject: () => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({ title, description, reason, onAccept, onReject }) => {
    return (
        <div className="bg-slate-800/50 border border-purple-500/30 p-4 rounded-2xl space-y-3 animate-slide-up">
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-white text-sm">{title}</h4>
                <div className="flex gap-2">
                    <button onClick={onReject} className="p-1.5 bg-slate-700 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all">
                        <X size={14} />
                    </button>
                    <button onClick={onAccept} className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all shadow-lg shadow-purple-500/20">
                        <Check size={14} />
                    </button>
                </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
            <div className="flex items-start gap-2 p-2.5 bg-purple-900/20 rounded-xl border border-purple-500/10">
                <Info size={12} className="text-purple-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-purple-300 italic">{reason}</p>
            </div>
        </div>
    );
};
