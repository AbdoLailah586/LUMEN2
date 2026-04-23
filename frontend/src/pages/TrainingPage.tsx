import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDatasets, getDatasetPreview, startTraining, getTrainingJobStatus, getTrainingResults } from "../services/api";
import { 
    Cpu, Database, Play, Loader2, CheckCircle2, AlertCircle, 
    ArrowRight, Settings, BarChart, Activity, Layers, Target, Clock
} from "lucide-react";

export const TrainingPage: React.FC = () => {
    const { datasetId: urlDatasetId } = useParams<{ datasetId: string }>();
    const navigate = useNavigate();

    const [datasets, setDatasets] = useState<any[]>([]);
    const [selectedDatasetId, setSelectedDatasetId] = useState<string>(urlDatasetId || "");
    const [preview, setPreview] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    
    // Training Config
    const [targetColumn, setTargetColumn] = useState<string>("");
    const [selectedModels, setSelectedModels] = useState<string[]>(["XGBoost"]);
    const [params, setParams] = useState<any>({
        learning_rate: 0.1,
        max_depth: 6,
        n_estimators: 100,
        cv_folds: 5
    });
    
    // Job State
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<string | null>(null);
    const [jobProgress, setJobProgress] = useState(0);
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchDatasets();
    }, []);

    useEffect(() => {
        if (selectedDatasetId) {
            loadPreview(selectedDatasetId);
        }
    }, [selectedDatasetId]);

    useEffect(() => {
        let interval: any;
        if (jobId && jobStatus !== "completed" && jobStatus !== "failed") {
            interval = setInterval(async () => {
                try {
                    const status = await getTrainingJobStatus(jobId);
                    setJobStatus(status.status);
                    setJobProgress(status.progress);
                    if (status.status === "completed") {
                        const res = await getTrainingResults(jobId);
                        setResults(res);
                        clearInterval(interval);
                    } else if (status.status === "failed") {
                        setError(status.error || "Training job failed.");
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error("Polling failed:", err);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [jobId, jobStatus]);

    const fetchDatasets = async () => {
        try {
            const data = await getDatasets();
            setDatasets(data);
            if (!selectedDatasetId && data.length > 0) {
                // setSelectedDatasetId(data[0].id);
            }
        } catch (err) {
            console.error("Failed to fetch datasets:", err);
        }
    };

    const loadPreview = async (id: string) => {
        setLoading(true);
        try {
            const data = await getDatasetPreview(id);
            setPreview(data);
            if (data.columns && data.columns.length > 0) {
                // Heuristic: pick the last column as default target
                setTargetColumn(data.columns[data.columns.length - 1].name);
            }
        } catch (err) {
            console.error("Failed to load preview:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleStartTraining = async () => {
        if (!selectedDatasetId || !targetColumn || selectedModels.length === 0) {
            alert("Please select a dataset, target column, and at least one model.");
            return;
        }

        setError(null);
        setJobId(null);
        setResults(null);
        
        try {
            const config = {
                target: targetColumn,
                models: selectedModels,
                parameters: params
            };
            const response = await startTraining(selectedDatasetId, config);
            setJobId(response.job_id);
            setJobStatus("pending");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to start training.");
        }
    };

    const toggleModel = (model: string) => {
        setSelectedModels(prev => 
            prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]
        );
    };

    if (results) {
        return (
            <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
                <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-3xl text-center">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} className="text-green-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Training Complete!</h2>
                    <p className="text-slate-400">Your model has been optimized and is ready for deployment.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(results.metrics || {}).map(([metric, value]: [string, any]) => (
                        <div key={metric} className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{metric}</p>
                            <p className="text-2xl font-bold text-white">{typeof value === 'number' ? value.toFixed(4) : value}</p>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center gap-4">
                    <button 
                        onClick={() => navigate(`/results/${jobId}`)}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all"
                    >
                        View Detailed Insights
                    </button>
                    <button 
                        onClick={() => { setResults(null); setJobId(null); }}
                        className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 rounded-xl transition-all"
                    >
                        Train Another
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                            <Cpu size={24} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white">Model Orchestration</h1>
                    </div>
                    <p className="text-slate-400 font-medium">Configure and trigger parallelized AutoML pipelines.</p>
                </div>
                
                {jobId ? (
                    <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-white/5 min-w-[300px]">
                        <div className="flex-1 space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                                <span className="text-blue-400 animate-pulse">{jobStatus}...</span>
                                <span className="text-white">{Math.round(jobProgress * 100)}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500 transition-all duration-500"
                                    style={{ width: `${jobProgress * 100}%` }}
                                ></div>
                            </div>
                        </div>
                        <Loader2 className="animate-spin text-blue-500" size={24} />
                    </div>
                ) : (
                    <button 
                        onClick={handleStartTraining}
                        disabled={!selectedDatasetId || !targetColumn}
                        className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-2xl shadow-xl shadow-amber-600/20 transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
                    >
                        <Play size={20} fill="currentColor" /> Initiate Training
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-4 text-red-400">
                    <AlertCircle size={24} />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LHS: Configuration */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Dataset & Target Selection */}
                    <div className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Database size={14} /> Source Dataset
                            </label>
                            <select 
                                value={selectedDatasetId}
                                onChange={(e) => setSelectedDatasetId(e.target.value)}
                                className="w-full bg-slate-800 border border-white/10 text-white p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            >
                                <option value="">Select a dataset...</option>
                                {datasets.map(ds => (
                                    <option key={ds.id} value={ds.id}>{ds.original_filename || ds.filename}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Target size={14} /> Target Variable (Y)
                            </label>
                            <select 
                                value={targetColumn}
                                onChange={(e) => setTargetColumn(e.target.value)}
                                disabled={!preview}
                                className="w-full bg-slate-800 border border-white/10 text-white p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                            >
                                <option value="">Select target...</option>
                                {preview?.columns?.map((col: any) => (
                                    <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Model Selection */}
                    <div className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Algorithm Selection</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { id: "XGBoost", name: "XGBoost", desc: "Extreme Gradient Boosting", icon: "⚡" },
                                { id: "RandomForest", name: "Random Forest", desc: "Robust Bagging Ensemble", icon: "🌲" },
                                { id: "LightGBM", name: "LightGBM", desc: "Fast Histogram-based Boosting", icon: "🚀" },
                                { id: "CatBoost", name: "CatBoost", desc: "Categorical-aware Boosting", icon: "🐱" }
                            ].map(model => (
                                <div 
                                    key={model.id}
                                    onClick={() => toggleModel(model.id)}
                                    className={`p-5 rounded-2xl cursor-pointer transition-all border flex items-center gap-4 ${
                                        selectedModels.includes(model.id) 
                                        ? 'bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/20' 
                                        : 'bg-slate-800/40 border-white/5 hover:border-white/10 hover:bg-slate-800/60'
                                    }`}
                                >
                                    <div className="text-2xl">{model.icon}</div>
                                    <div className="flex-1">
                                        <h4 className={`font-bold ${selectedModels.includes(model.id) ? 'text-blue-400' : 'text-slate-200'}`}>{model.name}</h4>
                                        <p className="text-xs text-slate-500">{model.desc}</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                                        selectedModels.includes(model.id) ? 'bg-blue-500 border-blue-400' : 'border-slate-600'
                                    }`}>
                                        {selectedModels.includes(model.id) && <CheckCircle2 size={12} className="text-white" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RHS: Hyperparameters */}
                <div className="space-y-8">
                    <div className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl space-y-8">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Settings size={14} /> Hyperparameters
                        </h3>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-slate-300">Cross Validation (K-Folds)</label>
                                    <span className="text-blue-400 font-mono font-bold">{params.cv_folds}</span>
                                </div>
                                <input 
                                    type="range" min="2" max="10" step="1"
                                    value={params.cv_folds}
                                    onChange={(e) => setParams({...params, cv_folds: parseInt(e.target.value)})}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-slate-300">Learning Rate</label>
                                    <span className="text-amber-400 font-mono font-bold">{params.learning_rate}</span>
                                </div>
                                <input 
                                    type="range" min="0.01" max="0.5" step="0.01"
                                    value={params.learning_rate}
                                    onChange={(e) => setParams({...params, learning_rate: parseFloat(e.target.value)})}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-slate-300">Max Depth</label>
                                    <span className="text-purple-400 font-mono font-bold">{params.max_depth}</span>
                                </div>
                                <input 
                                    type="range" min="2" max="20" step="1"
                                    value={params.max_depth}
                                    onChange={(e) => setParams({...params, max_depth: parseInt(e.target.value)})}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/5 space-y-4">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                                <span className="flex items-center gap-1"><Clock size={12} /> Estimated Time</span>
                                <span className="text-slate-300">~2-5 Minutes</span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                                <span className="flex items-center gap-1"><Activity size={12} /> Parallelization</span>
                                <span className="text-slate-300">Enabled (4x Threads)</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl">
                        <p className="text-xs text-slate-500 leading-relaxed italic text-center">
                            "AutoML will automatically grid-search optimal parameters within your defined boundaries."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrainingPage;
