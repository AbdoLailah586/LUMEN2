import React, { useState, useEffect } from "react";
import { Sparkles, Upload, Settings, Play, CheckCircle2, AlertCircle, Clock, Database, BarChart3 } from "lucide-react";
import { getCVModels, startCVFineTune, getCVFineTuneStatus } from "../../services/api";

export const FineTuneForm: React.FC = () => {
    const [models, setModels] = useState<any[]>([]);
    const [selectedModel, setSelectedModel] = useState("");
    const [mode, setMode] = useState("lightweight");
    const [dataset, setDataset] = useState<File | null>(null);
    const [epochs, setEpochs] = useState(10);
    const [lr, setLr] = useState(0.001);
    const [batchSize, setBatchSize] = useState(32);
    const [loading, setLoading] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
    const [status, setStatus] = useState<any | null>(null);

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const res = await getCVModels("classification");
                setModels(res.models || []);
                if (res.models && res.models.length > 0) setSelectedModel(res.models[0].slug);
            } catch (error) {
                console.error("Failed to fetch models", error);
            }
        };
        fetchModels();
    }, []);

    // Status Polling
    useEffect(() => {
        let interval: any;
        if (jobId && (!status || (status.status !== "completed" && status.status !== "failed"))) {
            interval = setInterval(async () => {
                try {
                    const res = await getCVFineTuneStatus(jobId);
                    setStatus(res);
                    if (res.status === "completed" || res.status === "failed") {
                        clearInterval(interval);
                    }
                } catch (error) {
                    console.error("Failed to fetch status", error);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [jobId, status]);

    const handleStartTraining = async () => {
        if (!dataset || !selectedModel) return;
        setLoading(true);
        try {
            const res = await startCVFineTune(dataset, {
                base_model: selectedModel,
                mode,
                epochs,
                learning_rate: lr,
                batch_size: batchSize
            });
            setJobId(res.job_id);
            setStatus({ status: "pending", progress: 0 });
        } catch (error) {
            console.error("Failed to start training", error);
        }
        setLoading(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* LHS: Configuration Form */}
            <div className="lg:col-span-7 space-y-8">
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                    
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center border border-violet-500/20">
                            <Sparkles className="w-6 h-6 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Custom Model Fine-Tuning</h2>
                            <p className="text-slate-400 text-sm">Adapt state-of-the-art backbones to your specific visual domain.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Dataset Upload */}
                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Database className="w-3 h-3" /> Labeled Dataset (ZIP)
                            </label>
                            <div className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
                                dataset ? "border-emerald-500/50 bg-emerald-500/5" : "border-slate-800 hover:border-slate-700 bg-slate-900/50"
                            }`}>
                                <input 
                                    type="file" 
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                    accept=".zip"
                                    onChange={(e) => e.target.files && setDataset(e.target.files[0])}
                                />
                                {dataset ? (
                                    <>
                                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                                        <p className="text-sm font-bold text-white">{dataset.name}</p>
                                        <p className="text-xs text-slate-500 mt-1">{(dataset.size / (1024 * 1024)).toFixed(2)} MB • Ready to process</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-slate-600 mb-2" />
                                        <p className="text-sm font-medium text-slate-300">Drop ZIP file here</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Structure: train/class_name/images...</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Model & Mode */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">Base Backbone</label>
                                <select 
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500 transition-all text-sm font-medium"
                                >
                                    {models.map(m => (
                                        <option key={m.slug} value={m.slug}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">Training Mode</label>
                                <select 
                                    value={mode}
                                    onChange={(e) => setMode(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500 transition-all text-sm font-medium"
                                >
                                    <option value="lightweight">Lightweight (Fastest)</option>
                                    <option value="full">Full Fine-Tuning (Accurate)</option>
                                    <option value="lora">LoRA (Parameter Efficient)</option>
                                </select>
                            </div>
                        </div>

                        {/* Hyperparameters */}
                        <div className="p-6 bg-slate-800/30 rounded-2xl border border-slate-800 space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Settings className="w-4 h-4 text-slate-500" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hyperparameters</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-4">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Epochs</span>
                                        <span className="text-violet-400 font-bold">{epochs}</span>
                                    </div>
                                    <input 
                                        type="range" min="1" max="100" value={epochs} 
                                        onChange={(e) => setEpochs(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-violet-500" 
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold block">Learning Rate</label>
                                    <input 
                                        type="number" step="0.0001" value={lr}
                                        onChange={(e) => setLr(parseFloat(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold block">Batch Size</label>
                                    <input 
                                        type="number" value={batchSize}
                                        onChange={(e) => setBatchSize(parseInt(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleStartTraining}
                            disabled={loading || !dataset || jobId !== null}
                            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${
                                loading || !dataset || jobId !== null
                                ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                                : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 hover:-translate-y-0.5"
                            }`}
                        >
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play className="w-5 h-5 fill-white" />}
                            Initialize GPU Training Job
                        </button>
                    </div>
                </div>
            </div>

            {/* RHS: Job Status & Metrics */}
            <div className="lg:col-span-5 space-y-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm h-full flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-800 pb-4">Training Monitor</h3>
                    
                    {!jobId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-700/50 relative">
                                <Clock className="w-10 h-10 text-slate-700" />
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-slate-700 animate-pulse" />
                                </div>
                            </div>
                            <h4 className="text-slate-300 font-bold mb-2">Idle Mode</h4>
                            <p className="text-xs text-slate-500">Configure and start a training job to see live performance telemetry and epoch progress.</p>
                        </div>
                    ) : (
                        <div className="flex-1 space-y-8 animate-in fade-in duration-500">
                            {/* Status Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${
                                        status?.status === "completed" ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" :
                                        status?.status === "failed" ? "bg-red-500" : "bg-violet-500 animate-pulse"
                                    }`} />
                                    <span className="text-sm font-bold text-white capitalize">{status?.status || "Starting..."}</span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono">ID: {jobId.slice(0, 8)}...</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Pipeline Completion</span>
                                    <span className="text-white font-black">{Math.round(status?.progress || 0)}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-950 rounded-full border border-slate-800 p-0.5 overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                                        style={{ width: `${status?.progress || 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Live Metrics Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl text-center">
                                    <BarChart3 className="w-4 h-4 text-violet-400 mx-auto mb-2" />
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Loss</p>
                                    <p className="text-xl font-black text-white">{status?.results?.current_metrics?.val_loss?.toFixed(4) || "0.0000"}</p>
                                </div>
                                <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl text-center">
                                    <BarChart3 className="w-4 h-4 text-emerald-400 mx-auto mb-2" />
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Accuracy</p>
                                    <p className="text-xl font-black text-white">{status?.results?.current_metrics?.val_accuracy?.toFixed(2) || "0.00"}%</p>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-2xl">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-4 h-4 text-violet-400 mt-0.5" />
                                    <p className="text-[10px] text-slate-400 leading-relaxed">
                                        GPU resources have been allocated. Weights are saved after each successful epoch to prevent data loss. 
                                        Final model artifact will be available for download and inference upon completion.
                                    </p>
                                </div>
                            </div>

                            {status?.status === "completed" && (
                                <div className="pt-4 mt-auto border-t border-slate-800">
                                    <button 
                                        className="w-full py-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition-all"
                                        onClick={() => window.location.reload()}
                                    >
                                        Training Complete - View in Inference
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
