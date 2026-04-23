import React, { useState } from "react";

export const ModelConfigPanel: React.FC = () => {
    const [selectedModels, setSelectedModels] = useState<string[]>(["RandomForest", "XGBoost"]);
    const [cvFolds, setCvFolds] = useState(5);
    const [gpuEnabled, setGpuEnabled] = useState(false);

    const toggleModel = (model: string) => {
        if (selectedModels.includes(model)) {
            setSelectedModels(selectedModels.filter(m => m !== model));
        } else {
            setSelectedModels([...selectedModels, model]);
        }
    };

    return (
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-8 max-w-5xl mx-auto shadow-2xl mt-8">
            <div className="flex justify-between items-end mb-8 border-b border-slate-800 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Model Configuration</h2>
                    <p className="text-slate-400">Select algorithms and tune hyper-parameters before execution</p>
                </div>
                <div className="flex items-center space-x-3 bg-slate-900 rounded-xl p-1.5 border border-slate-800">
                    <span className="text-sm font-medium text-slate-400 px-3">Hardware Acceleration</span>
                    <button 
                        onClick={() => setGpuEnabled(!gpuEnabled)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${gpuEnabled ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                    >
                        GPU {gpuEnabled ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Available Models Array */}
                <div className="md:col-span-4 space-y-4">
                    <h3 className="text-sm font-bold tracking-widest text-slate-500 uppercase mb-4">Algorithms</h3>
                    
                    {[
                        {id: "RandomForest", name: "Random Forest", desc: "Robust ensemble tree"},
                        {id: "XGBoost", name: "XGBoost", desc: "Extreme Gradient Boosting"},
                        {id: "LightGBM", name: "LightGBM", desc: "Fast histogram boosting"},
                        {id: "CatBoost", name: "CatBoost", desc: "Handles categoricals natively"},
                    ].map(model => (
                        <div 
                            key={model.id}
                            onClick={() => toggleModel(model.id)}
                            className={`p-4 rounded-xl cursor-pointer transition-all border duration-200 ${selectedModels.includes(model.id) ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800'}`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className={`font-semibold ${selectedModels.includes(model.id) ? 'text-blue-400' : 'text-slate-300'}`}>{model.name}</h4>
                                    <p className="text-xs text-slate-500 mt-1">{model.desc}</p>
                                </div>
                                <div className={`w-5 h-5 rounded flex items-center justify-center border ${selectedModels.includes(model.id) ? 'bg-blue-500 border-blue-400' : 'border-slate-700 bg-slate-800'}`}>
                                    {selectedModels.includes(model.id) && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Hyperparameters Workspace */}
                <div className="md:col-span-8 bg-slate-900 rounded-2xl p-6 border border-slate-800">
                    <h3 className="text-sm font-bold tracking-widest text-slate-500 uppercase mb-6">Cross Validation & Tuning</h3>
                    
                    {/* Folds Slider */}
                    <div className="mb-8 p-5 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-slate-300 font-medium text-sm">Cross-Validation Folds (K-Fold)</label>
                            <span className="text-blue-400 font-mono font-bold bg-blue-500/10 px-3 py-1 rounded border border-blue-500/20">{cvFolds}</span>
                        </div>
                        <input 
                            type="range" 
                            min="2" max="10" 
                            value={cvFolds} 
                            onChange={(e) => setCvFolds(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-2">
                            <span>Fast</span>
                            <span>Robust</span>
                        </div>
                    </div>

                    {/* Dynamic Params based on selection */}
                    <div className="space-y-6">
                        {selectedModels.includes("XGBoost") && (
                            <div className="p-5 border border-slate-700/50 rounded-xl">
                                <h4 className="text-slate-300 font-medium mb-4 flex items-center">
                                    <span className="w-2 h-2 rounded-full bg-orange-500 mr-2"></span> XGBoost Params
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">Learning Rate</label>
                                        <input type="number" defaultValue={0.1} step={0.01} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:border-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">Max Depth</label>
                                        <input type="number" defaultValue={6} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:border-blue-500 outline-none" />
                                    </div>
                                </div>
                            </div>
                        )}
                        
                         {selectedModels.length === 0 && (
                            <div className="flex flex-col items-center justify-center p-12 py-16 border border-dashed border-slate-700 rounded-xl text-slate-500">
                                <svg className="w-12 h-12 mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                                <p>Select at least one algorithm to configure parameters.</p>
                            </div>
                         )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end mt-8 pt-6 border-t border-slate-800">
                <button className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all">
                    Initiate Pipeline Training
                </button>
            </div>
        </div>
    );
};
