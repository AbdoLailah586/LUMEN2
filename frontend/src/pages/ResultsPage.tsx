import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTrainingJobs, getTrainingResults, getModel, downloadModel, exportCode } from "../services/api";
import Plot from "react-plotly.js";
import {
    Trophy, Download, Code, Loader2,
    BarChart, Activity, Layers, Target, TrendingUp,
    AlertTriangle, CheckCircle2, Clock, Cpu, ArrowRight, Star,
} from "lucide-react";

const gradeStyles: Record<string, string> = {
    green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    blue: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    red: "bg-red-500/15 text-red-400 border-red-500/25",
    slate: "bg-slate-500/15 text-slate-400 border-slate-500/25",
    purple: "bg-purple-500/15 text-purple-400 border-purple-500/25",
};

export const ResultsPage: React.FC = () => {
    const { jobId: urlJobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();

    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<string>(urlJobId || "");
    const [results, setResults] = useState<any>(null);
    const [model, setModel] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => { fetchJobs(); }, []);

    useEffect(() => {
        if (selectedJobId) loadResults(selectedJobId);
    }, [selectedJobId]);

    const fetchJobs = async () => {
        try {
            const data = await getTrainingJobs();
            const completedJobs = data.filter((j: any) => j.status === "completed");
            setJobs(completedJobs);
            if (!selectedJobId && completedJobs.length > 0) {
                setSelectedJobId(completedJobs[0].id);
            }
        } catch (err) {
            console.error("Failed to fetch jobs:", err);
        }
    };

    const loadResults = async (id: string) => {
        setLoading(true);
        try {
            const res = await getTrainingResults(id);
            setResults(res);
            if (res.model_id) {
                setModel(await getModel(res.model_id));
            }
        } catch (err) {
            console.error("Failed to load results:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadModel = async () => {
        if (!model?.id) {
            alert("No model artifact available for this job.");
            return;
        }
        try {
            const filename = `${(model.name || model.model_type || "model").replace(/\s+/g, "_")}.joblib`;
            await downloadModel(model.id, filename);
        } catch {
            alert("Download failed. The model file may be missing on the server.");
        }
    };

    const handleExportCode = async () => {
        if (!model) return;
        try {
            const { code } = await exportCode(model.id);
            const blob = new Blob([code], { type: "text/plain" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `inference_${model.name.replace(/\s+/g, "_").toLowerCase()}.py`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            alert("Export failed.");
        }
    };

    if (loading && !results) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="animate-spin text-green-500" size={48} />
                <p className="text-slate-400 font-medium">Synthesizing model performance data...</p>
            </div>
        );
    }

    if (!selectedJobId && jobs.length === 0 && !loading) {
        return (
            <div className="p-12 text-center space-y-6">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy size={40} className="text-slate-600" />
                </div>
                <h2 className="text-2xl font-bold text-white">No Completed Training Jobs Found</h2>
                <p className="text-slate-500 max-w-sm mx-auto">You need to train a model before you can analyze results.</p>
                <button
                    onClick={() => navigate("/training")}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
                >
                    Start Training Now
                </button>
            </div>
        );
    }

    const effectiveTaskType = results?.training_summary?.task_type || results?.task_type || "classification";
    const isRegression = effectiveTaskType === "regression";
    const formatMetric = (val: any) => {
        if (val === null || val === undefined) return "N/A";
        if (typeof val === "number") return val.toFixed(4);
        return String(val);
    };

    const confusionMatrix = results?.confusion_matrix;
    const feedback: any[] = results?.metric_feedback || [];
    const comparison: any[] = results?.model_comparison || [];
    const summary = results?.training_summary || {};
    const recommendation = results?.overall_recommendation;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500 rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                            <Trophy size={24} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white">Performance Insights</h1>
                    </div>
                    <p className="text-slate-400 font-medium flex items-center gap-2 flex-wrap">
                        Champion: <span className="text-green-400 font-bold">{results?.best_model || model?.name || "—"}</span>
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-800 text-slate-300 border border-white/10">
                            {isRegression ? "Regression" : "Classification"}
                        </span>
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <select
                        value={selectedJobId}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                        className="bg-slate-800 border border-white/10 text-white px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                    >
                        {jobs.map((job) => (
                            <option key={job.id} value={job.id}>
                                Job: {job.id.substring(0, 8)} ({new Date(job.created_at).toLocaleDateString()})
                            </option>
                        ))}
                    </select>
                    <button onClick={handleExportCode} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 rounded-xl transition-all">
                        <Code size={18} /> Export Code
                    </button>
                    <button
                        onClick={handleDownloadModel}
                        disabled={!model?.id}
                        className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Download size={18} /> Download Model
                    </button>
                </div>
            </div>

            {/* Overall recommendation */}
            {recommendation && (
                <div className={`p-6 rounded-3xl border flex items-start gap-4 ${
                    recommendation.severity === "success"
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : "bg-amber-500/10 border-amber-500/20"
                }`}>
                    {recommendation.severity === "success"
                        ? <CheckCircle2 size={24} className="text-emerald-400 shrink-0 mt-0.5" />
                        : <AlertTriangle size={24} className="text-amber-400 shrink-0 mt-0.5" />}
                    <div>
                        <h3 className="font-bold text-white mb-1">Model Assessment</h3>
                        <p className="text-slate-300 text-sm">{recommendation.summary}</p>
                        <p className="text-slate-400 text-sm mt-2 flex items-center gap-1">
                            <ArrowRight size={14} /> {recommendation.action}
                        </p>
                    </div>
                </div>
            )}

            {/* Training summary */}
            {summary.optimization_steps?.length > 0 && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-indigo-300 mb-2">Optimizations Applied</h3>
                    <ul className="text-xs text-slate-400 space-y-1">
                        {summary.optimization_steps.map((step: string, i: number) => (
                            <li key={i}>• {step}</li>
                        ))}
                    </ul>
                    {summary.task_type_reason && (
                        <p className="text-xs text-slate-500 mt-2">
                            Task: {summary.task_type}
                            {summary.configured_task_type && summary.configured_task_type !== summary.task_type
                                ? ` (auto-corrected from ${summary.configured_task_type})`
                                : ""}
                            — {summary.task_type_reason}
                        </p>
                    )}
                </div>
            )}

            {summary.baseline_accuracy != null && (
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 text-sm text-slate-400">
                    <span className="text-slate-300 font-medium">Baseline context: </span>
                    Always predicting the majority class would score{" "}
                    <span className="text-white font-mono">{(summary.baseline_accuracy as number).toFixed(4)}</span> accuracy.
                    {results?.metrics?.accuracy != null && (
                        <>
                            {" "}Your model scored{" "}
                            <span className="text-green-400 font-mono">{results.metrics.accuracy.toFixed(4)}</span>
                            {" "}(
                            {results.metrics.accuracy >= summary.baseline_accuracy ? "+" : ""}
                            {(results.metrics.accuracy - summary.baseline_accuracy).toFixed(4)} vs baseline).
                        </>
                    )}
                </div>
            )}

            {Object.keys(summary).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { label: "Train Rows", val: summary.rows_train, icon: <Activity size={14} /> },
                        { label: "Test Rows", val: summary.rows_test, icon: <Target size={14} /> },
                        { label: "Features", val: summary.features, icon: <Layers size={14} /> },
                        { label: "Models Trained", val: summary.models_trained, icon: <Cpu size={14} /> },
                        { label: "CV Folds", val: summary.cv_folds, icon: <BarChart size={14} /> },
                    ].map((s) => (
                        <div key={s.label} className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                                {s.icon} {s.label}
                            </div>
                            <p className="text-xl font-bold text-white">{s.val ?? "—"}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Metrics with feedback */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {feedback.map((fb) => (
                    <div key={fb.metric} className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{fb.metric}</p>
                                <p className="text-3xl font-bold text-white mt-1">{formatMetric(fb.value)}</p>
                            </div>
                            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${gradeStyles[fb.color] || gradeStyles.slate}`}>
                                {fb.label}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                            {fb.suggestion}
                        </p>
                    </div>
                ))}
            </div>

            {/* Model comparison table */}
            {comparison.length > 0 && (
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Cpu size={20} className="text-indigo-400" />
                            Model Comparison
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Cross-validation scores across all trained models</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-white/5">
                                    <th className="py-3 px-6">Model</th>
                                    <th className="py-3 px-6">CV Score</th>
                                    <th className="py-3 px-6">Std Dev</th>
                                    <th className="py-3 px-6">Metric</th>
                                    <th className="py-3 px-6">Time</th>
                                    <th className="py-3 px-6">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {comparison.map((m) => (
                                    <tr key={m.model_name} className={`hover:bg-white/5 ${m.is_best ? "bg-emerald-500/5" : ""}`}>
                                        <td className="py-3 px-6 font-bold text-slate-200 flex items-center gap-2">
                                            {m.is_best && <Star size={14} className="text-amber-400 fill-amber-400" />}
                                            {m.model_name}
                                        </td>
                                        <td className="py-3 px-6 font-mono text-white">
                                            {m.cv_mean_score != null ? m.cv_mean_score.toFixed(4) : "—"}
                                        </td>
                                        <td className="py-3 px-6 font-mono text-slate-400">
                                            {m.cv_std_score != null ? `±${m.cv_std_score.toFixed(4)}` : "—"}
                                        </td>
                                        <td className="py-3 px-6 text-slate-400">{m.metric_used || "—"}</td>
                                        <td className="py-3 px-6 text-slate-400 flex items-center gap-1">
                                            <Clock size={12} />
                                            {m.training_time_seconds != null ? `${m.training_time_seconds}s` : "—"}
                                        </td>
                                        <td className="py-3 px-6">
                                            {m.status === "failed" ? (
                                                <span className="text-[10px] font-bold uppercase text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">Failed</span>
                                            ) : m.is_best ? (
                                                <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Best</span>
                                            ) : (
                                                <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">OK</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* SHAP */}
                <div className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl space-y-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Layers size={20} className="text-blue-400" />
                        Feature Importance (SHAP)
                    </h3>
                    <div className="h-[400px]">
                        {results?.feature_importance && Object.keys(results.feature_importance).length > 0 ? (
                            <Plot
                                data={[{
                                    y: Object.keys(results.feature_importance).slice(0, 10).reverse(),
                                    x: Object.values(results.feature_importance).slice(0, 10).reverse() as number[],
                                    type: "bar",
                                    orientation: "h",
                                    marker: { color: "#3b82f6", line: { color: "#60a5fa", width: 1 } },
                                }]}
                                layout={{
                                    autosize: true,
                                    margin: { t: 0, r: 20, b: 40, l: 120 },
                                    paper_bgcolor: "rgba(0,0,0,0)",
                                    plot_bgcolor: "rgba(0,0,0,0)",
                                    xaxis: { gridcolor: "#1e293b", tickfont: { color: "#94a3b8" } },
                                    yaxis: { tickfont: { color: "#f8fafc", size: 10 } },
                                }}
                                config={{ displayModeBar: false, responsive: true }}
                                style={{ width: "100%", height: "100%" }}
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center border border-dashed border-slate-800 rounded-2xl">
                                <p className="text-slate-500 italic">No feature importance data available.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Confusion matrix / regression */}
                <div className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl space-y-6 text-center">
                    {!isRegression ? (
                        <>
                            <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                                <Activity size={20} className="text-green-400" />
                                Confusion Matrix
                            </h3>
                            <div className="flex flex-col items-center justify-center h-[400px]">
                                {confusionMatrix?.length > 0 ? (
                                    <>
                                        <div className="bg-slate-950 border border-white/5 rounded-2xl p-8 shadow-inner">
                                            <div className="grid grid-cols-2 gap-2 w-64 h-64">
                                                {[
                                                    { val: confusionMatrix[0]?.[0], label: "TP", good: true },
                                                    { val: confusionMatrix[0]?.[1], label: "FP", good: false },
                                                    { val: confusionMatrix[1]?.[0], label: "FN", good: false },
                                                    { val: confusionMatrix[1]?.[1], label: "TN", good: true },
                                                ].map((cell) => (
                                                    <div key={cell.label} className={`border flex flex-col items-center justify-center rounded-xl p-4 ${
                                                        cell.good ? "bg-green-500/20 border-green-500/30" : "bg-red-500/10 border-red-500/20"
                                                    }`}>
                                                        <span className="text-2xl font-bold text-white">{cell.val ?? "—"}</span>
                                                        <span className={`text-[10px] uppercase font-bold ${cell.good ? "text-green-400" : "text-red-400"}`}>{cell.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-6 max-w-xs mx-auto">
                                            Test-set confusion matrix for the champion model.
                                        </p>
                                    </>
                                ) : (
                                    <div className="h-full flex items-center justify-center border border-dashed border-slate-800 rounded-2xl px-6">
                                        <p className="text-slate-500 italic">No confusion matrix available.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                                <TrendingUp size={20} className="text-green-400" />
                                Regression Error Breakdown
                            </h3>
                            <div className="flex flex-col items-center justify-center h-[400px] space-y-6">
                                <div className="bg-slate-950 border border-white/5 rounded-2xl p-8 shadow-inner w-full max-w-sm space-y-4">
                                    {["r2", "rmse", "mae", "mse"].map((key) => (
                                        <div key={key} className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
                                            <span className="text-slate-400 text-sm uppercase">{key}</span>
                                            <span className="text-white font-bold font-mono">{formatMetric(results?.metrics?.[key])}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResultsPage;
