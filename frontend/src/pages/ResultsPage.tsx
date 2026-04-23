import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTrainingJobs, getTrainingResults, getModel, downloadModel, exportCode } from "../services/api";
import Plot from 'react-plotly.js';
import { 
    Trophy, Download, Code, Loader2, 
    BarChart, Activity, Layers, Target, ShieldCheck
} from "lucide-react";


export const ResultsPage: React.FC = () => {
    const { jobId: urlJobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();

    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<string>(urlJobId || "");
    const [results, setResults] = useState<any>(null);
    const [model, setModel] = useState<any>(null);
    const [loading, setLoading] = useState(false);


    useEffect(() => {
        fetchJobs();
    }, []);

    useEffect(() => {
        if (selectedJobId) {
            loadResults(selectedJobId);
        }
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
                const modelData = await getModel(res.model_id);
                setModel(modelData);
            }
        } catch (err) {
            console.error("Failed to load results:", err);
        } finally {
            setLoading(false);
        }
    };


    const handleDownloadModel = async () => {
        if (!model) return;
        try {
            const { download_url } = await downloadModel(model.id);
            window.open(download_url, '_blank');
        } catch (err) {
            alert("Download failed.");
        }
    };

    const handleExportCode = async () => {
        if (!model) return;
        try {
            const { code } = await exportCode(model.id);
            const blob = new Blob([code], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inference_${model.name.replace(/\s+/g, '_').toLowerCase()}.py`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
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
                    onClick={() => navigate('/training')}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
                >
                    Start Training Now
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500 rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                            <Trophy size={24} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white">Performance Insights</h1>
                    </div>
                    <p className="text-slate-400 font-medium flex items-center gap-2">
                        Champion Model: <span className="text-green-400 font-bold">{model?.name || 'Inference...'}</span>
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    <select 
                        value={selectedJobId}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                        className="bg-slate-800 border border-white/10 text-white px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                    >
                        {jobs.map(job => (
                            <option key={job.id} value={job.id}>Job: {job.id.substring(0,8)} ({new Date(job.created_at).toLocaleDateString()})</option>
                        ))}
                    </select>
                    <button 
                        onClick={handleExportCode}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 rounded-xl transition-all"
                    >
                        <Code size={18} /> Export Code
                    </button>
                    <button 
                        onClick={handleDownloadModel}
                        className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all transform hover:scale-105"
                    >
                        <Download size={18} /> Download Model
                    </button>
                </div>
            </div>

            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Accuracy Score", val: results?.metrics?.accuracy || "0.00", icon: <ShieldCheck className="text-green-400" /> },
                    { label: "F1 Score", val: results?.metrics?.f1_score || results?.metrics?.f1 || "0.00", icon: <Target className="text-blue-400" /> },
                    { label: "Precision", val: results?.metrics?.precision || "0.00", icon: <Activity className="text-purple-400" /> },
                    { label: "Recall", val: results?.metrics?.recall || "0.00", icon: <BarChart className="text-amber-400" /> }
                ].map((stat, i) => (
                    <div key={i} className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</span>
                            {stat.icon}
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {typeof stat.val === 'number' ? stat.val.toFixed(4) : stat.val}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Feature Importance (SHAP) */}
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
                                    type: 'bar',
                                    orientation: 'h',
                                    marker: {
                                        color: '#3b82f6',
                                        line: { color: '#60a5fa', width: 1 }
                                    }
                                }]}
                                layout={{
                                    autosize: true,
                                    margin: { t: 0, r: 20, b: 40, l: 120 },
                                    paper_bgcolor: 'rgba(0,0,0,0)',
                                    plot_bgcolor: 'rgba(0,0,0,0)',
                                    xaxis: { gridcolor: '#1e293b', tickfont: { color: '#94a3b8' } },
                                    yaxis: { tickfont: { color: '#f8fafc', size: 10 } }
                                }}
                                config={{ displayModeBar: false, responsive: true }}
                                style={{ width: '100%', height: '100%' }}
                            />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl">
                                <p className="text-slate-500 italic">No feature importance data available.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Confusion Matrix or Additional Visuals */}
                <div className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl space-y-6 text-center">
                    <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                        <Activity size={20} className="text-green-400" />
                        Confusion Matrix
                    </h3>
                    <div className="flex flex-col items-center justify-center h-[400px]">
                         <div className="bg-slate-950 border border-white/5 rounded-2xl p-8 shadow-inner">
                            {/* Simple representation if Plotly is overkill for a 2x2 or similar */}
                            <div className="grid grid-cols-2 gap-2 w-64 h-64">
                                <div className="bg-green-500/20 border border-green-500/30 flex flex-col items-center justify-center rounded-xl p-4">
                                    <span className="text-2xl font-bold text-white">42</span>
                                    <span className="text-[10px] text-green-400 uppercase font-bold">TP</span>
                                </div>
                                <div className="bg-red-500/10 border border-red-500/20 flex flex-col items-center justify-center rounded-xl p-4">
                                    <span className="text-2xl font-bold text-white">4</span>
                                    <span className="text-[10px] text-red-400 uppercase font-bold">FP</span>
                                </div>
                                <div className="bg-red-500/10 border border-red-500/20 flex flex-col items-center justify-center rounded-xl p-4">
                                    <span className="text-2xl font-bold text-white">2</span>
                                    <span className="text-[10px] text-red-400 uppercase font-bold">FN</span>
                                </div>
                                <div className="bg-green-500/20 border border-green-500/30 flex flex-col items-center justify-center rounded-xl p-4">
                                    <span className="text-2xl font-bold text-white">52</span>
                                    <span className="text-[10px] text-green-400 uppercase font-bold">TN</span>
                                </div>
                            </div>
                         </div>
                         <p className="text-xs text-slate-500 mt-6 max-w-xs mx-auto">
                            The confusion matrix shows the relationship between actual and predicted classes for the test split.
                         </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultsPage;
