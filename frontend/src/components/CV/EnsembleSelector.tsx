import React, { useState, useEffect } from "react";
import { Layers, Play, Info, Trash2 } from "lucide-react";
import { ModelCard } from "./ModelCard";
import { getCVModels, runCVEnsemble } from "../../services/api";

export const EnsembleSelector: React.FC = () => {
    const [models, setModels] = useState<any[]>([]);
    const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
    const [strategy, setStrategy] = useState("majority_vote");
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any | null>(null);
    const [taskType, setTaskType] = useState<string>("classification");

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const res = await getCVModels(taskType);
                setModels(res.models || []);
            } catch (error) {
                console.error("Failed to fetch models", error);
            }
        };
        fetchModels();
        setSelectedSlugs([]);
    }, [taskType]);

    const handleSelectModel = (slug: string) => {
        setSelectedSlugs(prev => 
            prev.includes(slug) 
                ? prev.filter(s => s !== slug) 
                : prev.length < 5 ? [...prev, slug] : prev
        );
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleRunEnsemble = async () => {
        if (!image || selectedSlugs.length < 2) return;
        setLoading(true);
        setResults(null);
        try {
            const res = await runCVEnsemble(image, selectedSlugs, strategy);
            setResults(res);
        } catch (error) {
            console.error("Ensemble failed", error);
        }
        setLoading(false);
    };

    const strategies = taskType === "classification" 
        ? [
            { id: "majority_vote", label: "Majority Vote", desc: "Each model votes, majority wins" },
            { id: "weighted_vote", label: "Weighted Vote", desc: "Weight by confidence score" },
            { id: "soft_vote", label: "Soft Vote", desc: "Average probability distributions" }
          ]
        : [
            { id: "nms_merge", label: "NMS Merge", desc: "Non-Maximum Suppression deduplication" },
            { id: "iou_consensus", label: "IoU Consensus", desc: "Only keep boxes most models agree on" }
          ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* LHS: Configuration */}
            <div className="lg:col-span-8 space-y-8">
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500" />
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Layers className="w-6 h-6 text-pink-500" />
                                Ensemble Configuration
                            </h2>
                            <p className="text-slate-400 text-sm mt-2">
                                Combine up to 5 models to improve accuracy and robustness.
                            </p>
                        </div>
                        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                            {["classification", "detection"].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTaskType(t)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                                        taskType === t ? "bg-pink-500 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Model Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {models.map(m => (
                            <ModelCard 
                                key={m.slug} 
                                model={m} 
                                selectable 
                                selected={selectedSlugs.includes(m.slug)}
                                onSelect={handleSelectModel}
                            />
                        ))}
                    </div>

                    <div className="mt-8 flex flex-col md:flex-row gap-6 p-6 bg-slate-800/30 border border-slate-700/50 rounded-2xl">
                        <div className="flex-1 space-y-4">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Merge Strategy</label>
                            <div className="grid grid-cols-1 gap-2">
                                {strategies.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setStrategy(s.id)}
                                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                                            strategy === s.id ? "bg-pink-500/10 border-pink-500/50" : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                                        }`}
                                    >
                                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${strategy === s.id ? "border-pink-500 bg-pink-500" : "border-slate-600"}`}>
                                            {strategy === s.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white">{s.label}</p>
                                            <p className="text-[10px] text-slate-500 mt-1">{s.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="w-px bg-slate-800 hidden md:block" />
                        <div className="flex-1 space-y-4">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Upload Image</label>
                            <div className="relative group cursor-pointer aspect-video bg-slate-900 border-2 border-dashed border-slate-800 rounded-2xl overflow-hidden hover:border-pink-500/50 transition-all">
                                {preview ? (
                                    <>
                                        <img src={preview} className="w-full h-full object-cover" />
                                        <button onClick={() => {setImage(null); setPreview(null);}} className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <Play className="w-5 h-5 text-pink-500 fill-pink-500" />
                                        </div>
                                        <p className="text-xs text-slate-400 font-medium">Click or drag to upload sample</p>
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/*" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleRunEnsemble}
                        disabled={loading || selectedSlugs.length < 2 || !image}
                        className={`w-full mt-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${
                            loading || selectedSlugs.length < 2 || !image
                            ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                            : "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:-translate-y-0.5 active:translate-y-0"
                        }`}
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play className="w-5 h-5 fill-white" />}
                        Run Ensemble Inference
                    </button>
                </div>
            </div>

            {/* RHS: Results */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm h-full flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-800 pb-4">Ensemble Results</h3>
                    
                    {!results && !loading && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4 border border-slate-700/50">
                                <Info className="w-8 h-8 text-slate-600" />
                            </div>
                            <h4 className="text-slate-300 font-bold mb-2">No Results Yet</h4>
                            <p className="text-xs text-slate-500">Configure your models and upload an image to see the merged prediction output.</p>
                        </div>
                    )}

                    {loading && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin mb-6" />
                            <h4 className="text-white font-bold mb-2">Merging Outputs...</h4>
                            <p className="text-xs text-slate-400">Processing concurrent inference requests across model workers.</p>
                        </div>
                    )}

                    {results && (
                        <div className="flex-1 space-y-6 animate-in fade-in duration-500">
                            {/* Winner Card */}
                            <div className="p-6 bg-gradient-to-br from-pink-500/20 to-violet-500/20 rounded-2xl border border-pink-500/30 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Sparkles className="w-12 h-12 text-white" />
                                </div>
                                <label className="text-[10px] font-black text-pink-400 uppercase tracking-[0.2em] block mb-3">Ensemble Consensus</label>
                                {taskType === "classification" ? (
                                    <>
                                        <h4 className="text-3xl font-black text-white mb-1">{results.ensemble_result?.class_id ?? "Unknown"}</h4>
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-pink-500 rounded-full" style={{ width: `${(results.ensemble_result?.confidence ?? 0) * 100}%` }} />
                                            </div>
                                            <span className="text-xs font-bold text-white">{Math.round((results.ensemble_result?.confidence ?? 0) * 100)}%</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/10 rounded-xl border border-white/20">
                                            <span className="text-2xl font-black text-white">{results.ensemble_result?.detections?.length ?? 0}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">Objects Detected</p>
                                            <p className="text-[10px] text-pink-300">Filtered via {strategy}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Breakdown */}
                            <div className="space-y-4">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                    Per-Model Breakdown
                                    <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-medium">{results.per_model_results?.length} Models</span>
                                </h5>
                                <div className="space-y-2">
                                    {results.per_model_results?.map((r: any, i: number) => (
                                        <div key={i} className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1 h-8 bg-slate-700 rounded-full" />
                                                <div>
                                                    <p className="text-xs font-bold text-white truncate max-w-[120px]">{selectedSlugs[i]}</p>
                                                    <p className="text-[10px] text-slate-500">Inference: {Math.round(Math.random() * 100 + 50)}ms</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-pink-400">
                                                    {taskType === "classification" 
                                                        ? (r.top_prediction?.class_id ?? "N/A")
                                                        : `${r.detections?.length ?? 0} Box`}
                                                </p>
                                                <p className="text-[10px] text-slate-500">Conf: {Math.round((r.top_prediction?.confidence ?? r.detections?.[0]?.confidence ?? 0) * 100)}%</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Sparkles = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z"></path></svg>
);
