import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    getDatasets, getDatasetPreview, startTraining, getTrainingJobStatus,
    getTrainingResults, suggestModel,
} from "../services/api";
import {
    Cpu, Database, Play, Loader2, CheckCircle2, AlertCircle,
    Settings, Activity, Target, Clock, Sparkles, Terminal,
} from "lucide-react";
import { AISuggestButton } from "../components/AI/AISuggestButton";
import { TrainingConsole, TrainingLogEntry } from "../components/Training/TrainingConsole";
import { TRAINING_MODELS } from "../components/Training/trainingModels";

const clampProgress = (value: number) =>
    Math.min(100, Math.max(0, Math.round(value ?? 0)));

const inferTaskType = (col: { name: string; type: string } | undefined): "classification" | "regression" => {
    if (!col) return "classification";
    const t = String(col.type).toLowerCase();
    if (t.includes("bool")) return "classification";
    if (t.includes("object") || t.includes("str") || t.includes("category")) return "classification";
    if (t.includes("int")) return "classification";
    return "regression";
};

export const TrainingPage: React.FC = () => {
    const { datasetId: urlDatasetId } = useParams<{ datasetId: string }>();
    const navigate = useNavigate();

    const [datasets, setDatasets] = useState<any[]>([]);
    const [selectedDatasetId, setSelectedDatasetId] = useState<string>(urlDatasetId || "");
    const [preview, setPreview] = useState<any>(null);

    const [targetColumn, setTargetColumn] = useState<string>("");
    const [selectedModels, setSelectedModels] = useState<string[]>(["XGBoost", "RandomForest"]);
    const [params, setParams] = useState({
        learning_rate: 0.1,
        max_depth: 6,
        n_estimators: 100,
        cv_folds: 5,
        tuning_timeout_seconds: 60,
    });
    const [taskType, setTaskType] = useState<"classification" | "regression">("classification");
    const [autoDetectTaskType, setAutoDetectTaskType] = useState(true);
    const [enableHyperparameterTuning, setEnableHyperparameterTuning] = useState(true);
    const [enableEnsemble, setEnableEnsemble] = useState(true);

    const [aiLoading, setAiLoading] = useState(false);
    const [aiReasoning, setAiReasoning] = useState<string | null>(null);

    const [jobId, setJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<string | null>(null);
    const [jobProgress, setJobProgress] = useState(0);
    const [trainingLogs, setTrainingLogs] = useState<TrainingLogEntry[]>([]);
    const [currentStep, setCurrentStep] = useState<string | undefined>();
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [executionMode, setExecutionMode] = useState<string | null>(null);

    useEffect(() => { fetchDatasets(); }, []);

    useEffect(() => {
        if (selectedDatasetId) loadPreview(selectedDatasetId);
    }, [selectedDatasetId]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (jobId && jobStatus !== "completed" && jobStatus !== "failed") {
            interval = setInterval(async () => {
                try {
                    const status = await getTrainingJobStatus(jobId);
                    setJobStatus(status.status);
                    setJobProgress(clampProgress(status.progress));
                    if (status.training_log) setTrainingLogs(status.training_log);
                    if (status.current_step) setCurrentStep(status.current_step);

                    if (status.status === "completed") {
                        const res = await getTrainingResults(jobId);
                        setResults(res);
                        if (res.training_log) setTrainingLogs(res.training_log);
                        clearInterval(interval);
                    } else if (status.status === "failed") {
                        setError(status.error || "Training job failed.");
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error("Polling failed:", err);
                }
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [jobId, jobStatus]);

    useEffect(() => {
        if (jobStatus !== "pending" || !jobId) return;
        const timer = setTimeout(() => {
            setError(
                "Training has not started after 20 seconds. Restart the backend, or start a worker: " +
                "celery -A app.core.celery_app worker --loglevel=info -P solo"
            );
        }, 20000);
        return () => clearTimeout(timer);
    }, [jobStatus, jobId]);

    const fetchDatasets = async () => {
        try {
            setDatasets(await getDatasets());
        } catch (err) {
            console.error("Failed to fetch datasets:", err);
        }
    };

    const loadPreview = async (id: string) => {
        try {
            const data = await getDatasetPreview(id);
            setPreview(data);
            if (data.columns?.length > 0) {
                const lastCol = data.columns[data.columns.length - 1];
                setTargetColumn(lastCol.name);
                setTaskType(inferTaskType(lastCol));
            }
        } catch (err) {
            console.error("Failed to load preview:", err);
        }
    };

    const handleAISuggest = async () => {
        if (!selectedDatasetId || !targetColumn) {
            alert("Please select a dataset and target column first.");
            return;
        }
        setAiLoading(true);
        try {
            const res = await suggestModel(selectedDatasetId, targetColumn, taskType);
            const recommendation = res.suggestions.recommended_models[0];
            if (recommendation) {
                setSelectedModels([recommendation.name]);
                if (recommendation.hyperparameters) {
                    setParams((prev) => ({ ...prev, ...recommendation.hyperparameters }));
                }
                setAiReasoning(recommendation.reason);
            }
        } catch {
            alert("AI suggestion failed.");
        } finally {
            setAiLoading(false);
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
        setTrainingLogs([]);
        setJobProgress(0);
        setExecutionMode(null);

        try {
            const config = {
                target_column: targetColumn,
                models: selectedModels,
                parameters: params,
                task_type: taskType,
                auto_detect_task_type: autoDetectTaskType,
                enable_hyperparameter_tuning: enableHyperparameterTuning,
                enable_ensemble: enableEnsemble,
            };
            const response = await startTraining(selectedDatasetId, config);
            setJobId(response.job_id);
            setJobStatus("pending");
            setExecutionMode(response.execution_mode || null);
            if (response.execution_mode === "local") {
                setTrainingLogs([{
                    timestamp: new Date().toISOString(),
                    type: "system",
                    message: "No Celery worker detected — training in the API process.",
                }]);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to start training.");
        }
    };

    const toggleModel = (model: string) => {
        setSelectedModels((prev) =>
            prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
        );
    };

    const selectAllModels = () => setSelectedModels(TRAINING_MODELS.map((m) => m.id));
    const clearModels = () => setSelectedModels([]);

    const isRunning = !!jobId && jobStatus !== "completed" && jobStatus !== "failed";

    if (results) {
        return (
            <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
                <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-3xl text-center">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} className="text-green-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Training Complete!</h2>
                    <p className="text-slate-400">
                        Best model: <span className="text-green-400 font-bold">{results.best_model}</span>
                    </p>
                </div>

                {results.overall_recommendation && (
                    <div className={`p-5 rounded-2xl border ${
                        results.overall_recommendation.severity === "success"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                            : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                    }`}>
                        <p className="font-medium">{results.overall_recommendation.summary}</p>
                        <p className="text-sm mt-1 opacity-80">{results.overall_recommendation.action}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(results.metric_feedback || []).map((fb: any) => (
                        <div key={fb.metric} className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl">
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{fb.metric}</p>
                            <p className="text-2xl font-bold text-white">{fb.value?.toFixed(4)}</p>
                            <span className={`text-[10px] font-bold uppercase mt-1 inline-block px-2 py-0.5 rounded-full ${
                                fb.color === "green" ? "bg-emerald-500/20 text-emerald-400" :
                                fb.color === "blue" ? "bg-blue-500/20 text-blue-400" :
                                fb.color === "amber" ? "bg-amber-500/20 text-amber-400" :
                                "bg-red-500/20 text-red-400"
                            }`}>{fb.label}</span>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => navigate(`/results/${jobId}`)}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all"
                    >
                        View Full Results
                    </button>
                    <button
                        onClick={() => { setResults(null); setJobId(null); setJobStatus(null); setTrainingLogs([]); }}
                        className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 rounded-xl transition-all"
                    >
                        Train Another
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10 animate-fade-in pb-24">
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

                <div className="flex flex-wrap items-center gap-4">
                    <AISuggestButton onClick={handleAISuggest} loading={aiLoading} label="AI Recommend Model" />
                    {isRunning ? (
                        <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-white/5 min-w-[280px]">
                            <div className="flex-1 space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                                    <span className="text-blue-400 animate-pulse">{jobStatus}...</span>
                                    <span className="text-white">{clampProgress(jobProgress)}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
                                        style={{ width: `${clampProgress(jobProgress)}%` }}
                                    />
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
            </div>

            {executionMode === "local" && !error && (
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl text-blue-300 text-sm">
                    Running in local mode (no Celery worker). Training still works — keep this window open.
                </div>
            )}

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-4 text-red-400">
                    <AlertCircle size={24} />
                    <p className="text-sm font-medium whitespace-pre-wrap">{error}</p>
                </div>
            )}

            {aiReasoning && (
                <div className="bg-purple-600/10 border border-purple-500/20 p-4 rounded-2xl flex items-start gap-4 text-purple-300">
                    <Sparkles size={20} className="mt-1 shrink-0" />
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">AI Reasoning</p>
                        <p className="text-sm italic">"{aiReasoning}"</p>
                    </div>
                </div>
            )}

            {/* Training console — visible during and after training starts */}
            {(isRunning || trainingLogs.length > 0) && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Terminal size={16} className="text-cyan-400" />
                        Live Training Output
                    </h3>
                    <TrainingConsole
                        logs={trainingLogs}
                        currentStep={currentStep}
                        isRunning={isRunning}
                        progress={jobProgress}
                    />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Dataset & Target */}
                    <div className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl space-y-6">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                Learning Task
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {(["classification", "regression"] as const).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        disabled={isRunning || autoDetectTaskType}
                                        onClick={() => setTaskType(type)}
                                        className={`p-4 rounded-2xl border text-left transition-all disabled:opacity-50 ${
                                            taskType === type
                                                ? "bg-blue-500/15 border-blue-500/40 ring-1 ring-blue-500/30"
                                                : "bg-slate-800/40 border-white/5 hover:border-white/10"
                                        }`}
                                    >
                                        <p className={`font-bold text-sm capitalize ${taskType === type ? "text-blue-400" : "text-slate-200"}`}>
                                            {type}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            {type === "classification"
                                                ? "Predict categories / labels"
                                                : "Predict numeric values"}
                                        </p>
                                    </button>
                                ))}
                            </div>
                            <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-800/50">
                                <input
                                    type="checkbox"
                                    checked={autoDetectTaskType}
                                    onChange={(e) => setAutoDetectTaskType(e.target.checked)}
                                    disabled={isRunning}
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600"
                                />
                                <span className="text-xs text-slate-400">
                                    Auto-detect from target column (overrides manual choice when enabled)
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Database size={14} /> Source Dataset
                            </label>
                            <select
                                value={selectedDatasetId}
                                onChange={(e) => setSelectedDatasetId(e.target.value)}
                                disabled={isRunning}
                                className="w-full bg-slate-800 border border-white/10 text-white p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                            >
                                <option value="">Select a dataset...</option>
                                {datasets.map((ds) => (
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
                                onChange={(e) => {
                                    const col = preview?.columns?.find((c: any) => c.name === e.target.value);
                                    setTargetColumn(e.target.value);
                                    if (col) setTaskType(inferTaskType(col));
                                }}
                                disabled={!preview || isRunning}
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
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                Algorithm Selection ({selectedModels.length} selected)
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={selectAllModels} disabled={isRunning} className="text-[10px] text-blue-400 hover:text-blue-300 disabled:opacity-50">Select all</button>
                                <span className="text-slate-700">|</span>
                                <button onClick={clearModels} disabled={isRunning} className="text-[10px] text-slate-500 hover:text-slate-300 disabled:opacity-50">Clear</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {TRAINING_MODELS.map((model) => (
                                <div
                                    key={model.id}
                                    onClick={() => !isRunning && toggleModel(model.id)}
                                    className={`p-4 rounded-2xl transition-all border flex items-center gap-3 ${
                                        isRunning ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                                    } ${
                                        selectedModels.includes(model.id)
                                            ? "bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/20"
                                            : "bg-slate-800/40 border-white/5 hover:border-white/10 hover:bg-slate-800/60"
                                    }`}
                                >
                                    <div className="text-xl">{model.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-bold text-sm truncate ${selectedModels.includes(model.id) ? "text-blue-400" : "text-slate-200"}`}>
                                            {model.name}
                                        </h4>
                                        <p className="text-[10px] text-slate-500 truncate">{model.desc}</p>
                                    </div>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                        selectedModels.includes(model.id) ? "bg-blue-500 border-blue-400" : "border-slate-600"
                                    }`}>
                                        {selectedModels.includes(model.id) && <CheckCircle2 size={10} className="text-white" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Hyperparameters */}
                <div className="space-y-8">
                    <div className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl space-y-8">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Settings size={14} /> Hyperparameters & Optimization
                        </h3>

                        <div className="space-y-3 pb-4 border-b border-white/5">
                            <p className="text-sm font-medium text-slate-300">
                                Selected task: <span className="text-blue-400 capitalize">{taskType}</span>
                                {autoDetectTaskType && <span className="text-slate-500 text-xs ml-2">(auto-detect on)</span>}
                            </p>
                            {[
                                { checked: enableHyperparameterTuning, set: setEnableHyperparameterTuning, label: "Optuna hyperparameter tuning" },
                                { checked: enableEnsemble, set: setEnableEnsemble, label: "Voting ensemble (top 3 models)" },
                            ].map((opt) => (
                                <label key={opt.label} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-800/50">
                                    <input
                                        type="checkbox"
                                        checked={opt.checked}
                                        onChange={(e) => opt.set(e.target.checked)}
                                        disabled={isRunning}
                                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600"
                                    />
                                    <span className="text-xs text-slate-400">{opt.label}</span>
                                </label>
                            ))}
                        </div>

                        <div className="space-y-6">
                            {[
                                { key: "cv_folds", label: "Cross Validation (K-Folds)", min: 2, max: 10, step: 1, color: "text-blue-400", accent: "accent-blue-500" },
                                { key: "learning_rate", label: "Learning Rate", min: 0.01, max: 0.5, step: 0.01, color: "text-amber-400", accent: "accent-amber-500" },
                                { key: "max_depth", label: "Max Depth", min: 2, max: 20, step: 1, color: "text-purple-400", accent: "accent-purple-500" },
                                { key: "n_estimators", label: "N Estimators", min: 50, max: 500, step: 50, color: "text-cyan-400", accent: "accent-cyan-500" },
                            ].map((slider) => (
                                <div key={slider.key} className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-slate-300">{slider.label}</label>
                                        <span className={`${slider.color} font-mono font-bold`}>
                                            {params[slider.key as keyof typeof params]}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={slider.min}
                                        max={slider.max}
                                        step={slider.step}
                                        value={params[slider.key as keyof typeof params]}
                                        onChange={(e) => setParams({ ...params, [slider.key]: parseFloat(e.target.value) })}
                                        disabled={isRunning}
                                        className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer ${slider.accent} disabled:opacity-50`}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="pt-6 border-t border-white/5 space-y-4">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                                <span className="flex items-center gap-1"><Clock size={12} /> Estimated Time</span>
                                <span className="text-slate-300">~{selectedModels.length * 1}-{selectedModels.length * 3} min</span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                                <span className="flex items-center gap-1"><Activity size={12} /> Parallelization</span>
                                <span className="text-slate-300">Up to 4 threads</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrainingPage;
