import React, { useState } from 'react';
import { Sparkles, Loader } from 'lucide-react';
import { apiClient } from '../services/api';

export function AiPlotInsight({ datasetId, plotData }: { datasetId: string, plotData: any }) {
    const [insight, setInsight] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchInsight = async () => {
        setLoading(true);
        try {
            const res = await apiClient.post(`/datasets/${datasetId}/plot-interpretation`, plotData);
            setInsight(res.data.interpretation);
        } catch (err) {
            setInsight("Failed to fetch insight from AI.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 flex flex-col items-start w-full relative z-10">
            <div className="flex items-center justify-between w-full mb-2">
                <h4 className="text-indigo-400 font-bold flex items-center gap-2"><Sparkles size={16} /> AI Plot Interpretation</h4>
                {!insight && !loading && (
                    <button onClick={fetchInsight} className="text-xs font-bold uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition-colors shadow-[0_0_10px_rgba(79,70,229,0.3)]">
                        Generate Insight
                    </button>
                )}
            </div>
            
            {loading && <div className="text-indigo-300 text-sm flex items-center italic mb-2 mt-2"><Loader size={14} className="animate-spin mr-2" /> AI is analyzing the plot...</div>}
            
            {insight && (
                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {insight}
                </div>
            )}
        </div>
    );
}
