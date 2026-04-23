import React from "react";
import { FeatureEngineeringPanel } from "../components/Features/FeatureEngineeringPanel";

export const FeatureEngineeringPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#050b14] p-8">
            <div className="max-w-7xl mx-auto space-y-12">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                    <div>
                        <div className="flex items-center space-x-3 text-slate-500 text-sm mb-2 font-medium">
                            <span>Dataset</span>
                            <span>/</span>
                            <span className="text-teal-400">Feature Engineering</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight">Signal Generation</h1>
                    </div>
                    <button className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-teal-500/25">
                        Proceed to Modeling &rarr;
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* LHS: Panel Array */}
                    <div className="xl:col-span-8 flex flex-col gap-8">
                        <FeatureEngineeringPanel />
                        
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                            <h3 className="text-lg font-bold text-slate-300 mb-6 drop-shadow-md border-b border-slate-800 pb-4">Automated Synthetics Log</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-teal-500/20 rounded text-teal-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-200">Date Segmented: <span className="font-mono text-xs ml-1 text-slate-400">TransactionDate</span></p>
                                            <p className="text-xs text-slate-500">Created 4 new features (Year, Month, Day, DayOfWeek)</p>
                                        </div>
                                    </div>
                                    <button className="text-xs text-rose-400 hover:underline">Undo</button>
                                </div>
                                
                                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-purple-500/20 rounded text-purple-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-200">Target Encoded: <span className="font-mono text-xs ml-1 text-slate-400">Cabin</span></p>
                                            <p className="text-xs text-slate-500">Replaced high-cardinality strings with historical survival rates</p>
                                        </div>
                                    </div>
                                    <button className="text-xs text-rose-400 hover:underline">Undo</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RHS: Heatmap Insight */}
                    <div className="xl:col-span-4 space-y-6">
                         <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden h-full">
                            <h3 className="text-lg font-bold text-slate-300 mb-6 drop-shadow-md">Live Correlation Monitor</h3>
                            
                            <div className="aspect-square relative rounded-xl border border-slate-800 bg-slate-800/30 flex items-center justify-center p-4">
                                {/* Visual Mock of a Correlation Matrix */}
                                <div className="grid grid-cols-5 gap-1 w-full h-full">
                                    {Array.from({length: 25}).map((_, i) => {
                                        // Generate a random gradient intensity map
                                        const intensity = Math.random();
                                        const color = intensity > 0.7 ? 'bg-teal-500' : intensity > 0.4 ? 'bg-teal-700' : intensity > 0.2 ? 'bg-slate-600' : 'bg-slate-800';
                                        return (
                                            <div key={i} className={`${color} rounded-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer`} title={`Correlation: ${(intensity * 100).toFixed(1)}%`}></div>
                                        )
                                    })}
                                </div>
                                
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="bg-slate-900/80 backdrop-blur border border-slate-700 px-4 py-2 rounded-lg text-center shadow-2xl pb-3">
                                        <p className="text-teal-400 font-bold mb-0.5">Strongest Signal</p>
                                        <p className="text-xs text-slate-300"><span className="font-mono">Sex_Encoded</span> (74%)</p>
                                    </div>
                                </div>
                            </div>
                            
                            <p className="text-sm text-slate-500 mt-6 leading-relaxed">
                                The heatmap dynamically updates as you synthesize new features. Engineering signals that correlate strongly with your target metric will exponentially improve model performance downstream.
                            </p>
                         </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
