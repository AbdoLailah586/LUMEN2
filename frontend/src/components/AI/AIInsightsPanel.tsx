import React from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';

interface AIInsightsPanelProps {
    insights: {
        summary?: string;
        key_patterns?: string[];
        anomalies?: string[];
    };
    loading: boolean;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ insights, loading }) => {
    if (loading) {
        return (
            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl animate-pulse space-y-4">
                <div className="h-6 w-48 bg-slate-800 rounded"></div>
                <div className="space-y-2">
                    <div className="h-4 w-full bg-slate-800 rounded"></div>
                    <div className="h-4 w-full bg-slate-800 rounded"></div>
                    <div className="h-4 w-3/4 bg-slate-800 rounded"></div>
                </div>
            </div>
        );
    }

    if (!insights || (!insights.summary && !insights.key_patterns)) return null;

    return (
        <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles size={20} className="text-purple-400" />
                AI Automated Insights
            </h3>
            
            {insights.summary && (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Lightbulb size={12} /> Executive Summary
                    </label>
                    <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-purple-500 pl-4 py-1 bg-purple-500/5 rounded-r-lg">
                        "{insights.summary}"
                    </p>
                </div>
            )}

            {insights.key_patterns && insights.key_patterns.length > 0 && (
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={12} /> Key Patterns & Correlations
                    </label>
                    <ul className="space-y-2">
                        {insights.key_patterns.map((pattern, i) => (
                            <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                                {pattern}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {insights.anomalies && insights.anomalies.length > 0 && (
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 text-amber-500">
                        <AlertTriangle size={12} /> Detected Anomalies
                    </label>
                    <ul className="space-y-2">
                        {insights.anomalies.map((anomaly, i) => (
                            <li key={i} className="text-xs text-slate-400 flex items-start gap-2 p-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
                                <span className="text-amber-500">•</span>
                                {anomaly}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
