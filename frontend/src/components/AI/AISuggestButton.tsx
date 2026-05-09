import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface AISuggestButtonProps {
    onClick: () => void;
    loading: boolean;
    label: string;
}

export const AISuggestButton: React.FC<AISuggestButtonProps> = ({ onClick, loading, label }) => {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all transform hover:scale-105 disabled:opacity-50"
        >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {label}
        </button>
    );
};
