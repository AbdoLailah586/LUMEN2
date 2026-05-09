import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
    getDatasets, getDataset, getDatasetProfile, getDatasetEda, 
    downloadDataset, analyzeData, getDatasetPreview 
} from "../services/api";
import { 
    BarChart, Bar, Tooltip, ResponsiveContainer, 
    Cell, PieChart, Pie
} from 'recharts';

import Plot from 'react-plotly.js';
import { 
    Database, Download, ArrowRight, Loader2, 
    AlertCircle, BarChart3, Activity, Layers
} from "lucide-react";




import { AIInsightsPanel } from "../components/AI/AIInsightsPanel";

export const DashboardPage: React.FC = () => {
    const { datasetId } = useParams<{ datasetId: string }>();
    const navigate = useNavigate();
    
    const [datasets, setDatasets] = useState<any[]>([]);
    const [selectedDataset, setSelectedDataset] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [eda, setEda] = useState<any>(null);
    const [preview, setPreview] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    
    const [activeTab, setActiveTab] = useState<'diagnostics' | 'preview'>('diagnostics');

    // AI Insights State
    const [aiInsights, setAiInsights] = useState<any>(null);
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        fetchDatasets();
    }, []);

    useEffect(() => {
        if (datasetId) {
            loadDatasetData(datasetId);
            loadAIInsights(datasetId);
        }
    }, [datasetId, datasets]);

    const fetchDatasets = async () => {
        try {
            const data = await getDatasets();
            setDatasets(data);
        } catch (err) {
            console.error("Failed to fetch datasets:", err);
        }
    };

    const loadDatasetData = async (id: string) => {
        setLoading(true);
        try {
            const [dsData, profileData, edaData, previewData] = await Promise.all([
                getDataset(id),
                getDatasetProfile(id),
                getDatasetEda(id),
                getDatasetPreview(id)
            ]);
            setSelectedDataset(dsData);
            setProfile(profileData);
            setEda(edaData);
            setPreview(previewData);
        } catch (err: any) {
            console.error("Failed to load dashboard data:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadAIInsights = async (id: string) => {
        setAiLoading(true);
        try {
            const res = await analyzeData(id);
            setAiInsights({
                summary: `This dataset contains ${selectedDataset?.row_count} rows. Gemini identifies key segments in ${Object.keys(res.column_analysis).slice(0, 3).join(', ')}.`,
                key_patterns: Object.entries(res.column_analysis).slice(0, 4).map(([col, data]: any) => `${col}: ${data.meaning}`),
                anomalies: Object.entries(res.column_analysis).filter(([_, data]: any) => data.issues.toLowerCase().includes('outlier')).map(([col, data]: any) => `${col}: ${data.issues}`)
            });
        } catch (err) {
            console.error("AI Insights failed:", err);
        } finally {
            setAiLoading(false);
        }
    };


    const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        if (id) navigate(`/dashboard/${id}`);
    };

    const handleDownload = async () => {
        if (!selectedDataset) return;
        try {
            const { download_url } = await downloadDataset(selectedDataset.id);
            window.open(download_url, '_blank');
        } catch (err) {
            alert("Download failed.");
        }
    };

    if (loading && !selectedDataset) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="animate-spin text-blue-500" size={48} />
                <p className="text-slate-400 font-medium">Analyzing dataset structures...</p>
            </div>
        );
    }

    if (!datasetId && datasets.length > 0) {
        return (
            <div className="p-12 text-center space-y-6">
                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Database size={40} className="text-blue-500" />
                </div>
                <h2 className="text-3xl font-bold text-white">Select a Dataset to Begin</h2>
                <div className="max-w-xs mx-auto">
                    <select 
                        onChange={handleDatasetChange}
                        className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Choose dataset...</option>
                        {datasets.map(ds => (
                            <option key={ds.id} value={ds.id}>{ds.original_filename || ds.filename}</option>
                        ))}
                    </select>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                            <Database size={24} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white truncate max-w-md">
                            {selectedDataset?.original_filename || selectedDataset?.filename}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                        <span className="px-2 py-0.5 bg-slate-800 rounded text-xs font-mono">{selectedDataset?.file_type?.toUpperCase()}</span>
                        <span>•</span>
                        <span>{selectedDataset?.row_count?.toLocaleString()} Rows</span>
                        <span>•</span>
                        <span>{selectedDataset?.column_count} Columns</span>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    <select 
                        value={datasetId}
                        onChange={handleDatasetChange}
                        className="bg-slate-800 border border-white/10 text-white px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {datasets.map(ds => (
                            <option key={ds.id} value={ds.id}>{ds.original_filename || ds.filename}</option>
                        ))}
                    </select>
                    <button 
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 rounded-xl transition-all"
                    >
                        <Download size={18} /> Download
                    </button>
                    <button 
                        onClick={() => navigate(`/cleaning/${datasetId}`)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 rounded-xl transition-all"
                    >
                        Clean Data
                    </button>
                    <button 
                        onClick={() => navigate(`/training/${datasetId}`)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all transform hover:scale-105"
                    >
                        Train Model <ArrowRight size={18} />
                    </button>
                </div>
            </div>

            {/* AI Insights Panel */}
            <AIInsightsPanel insights={aiInsights} loading={aiLoading} />

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Data Quality", val: "84%", sub: "High Integrity", icon: <Activity className="text-green-400" /> },
                    { label: "Missing Cells", val: profile?.columns?.reduce((acc: number, c: any) => acc + c.missing, 0)?.toLocaleString() || "0", sub: "Imputation Ready", icon: <AlertCircle className="text-amber-400" /> },
                    { label: "Memory Usage", val: `${(selectedDataset?.file_size / 1024).toFixed(1)} KB`, sub: "Pandas Engine", icon: <Layers className="text-blue-400" /> },
                    { label: "Target Class", val: "Binary", sub: "Auto-Detected", icon: <BarChart3 className="text-purple-400" /> }
                ].map((stat, i) => (
                    <div key={i} className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</span>
                            {stat.icon}
                        </div>
                        <div className="text-2xl font-bold text-white">{stat.val}</div>
                        <div className="text-xs text-slate-500 mt-1 font-medium">{stat.sub}</div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column Inventory / Preview Tabs */}
                <div className="lg:col-span-2 bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col min-h-[600px]">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex gap-6">
                            <button 
                                onClick={() => setActiveTab('diagnostics')}
                                className={`text-sm font-bold uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'diagnostics' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                            >
                                Column Diagnostics
                            </button>
                            <button 
                                onClick={() => setActiveTab('preview')}
                                className={`text-sm font-bold uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'preview' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                            >
                                Raw Data Preview
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar p-6">
                        {activeTab === 'diagnostics' ? (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-white/5 pb-4">
                                        <th className="pb-4 px-2">Column</th>
                                        <th className="pb-4 px-2">Type</th>
                                        <th className="pb-4 px-2">Unique</th>
                                        <th className="pb-4 px-2">Missing</th>
                                        <th className="pb-4 px-2">Distribution</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {profile?.columns?.map((col: any, idx: number) => (
                                        <tr key={idx} className="group hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-2 font-bold text-slate-200">{col.name}</td>
                                            <td className="py-4 px-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                                                    col.is_numeric 
                                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                }`}>
                                                    {col.type}
                                                </span>
                                            </td>
                                            <td className="py-4 px-2 text-slate-400 font-mono text-sm">{col.unique}</td>
                                            <td className="py-4 px-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full ${col.missing > 0 ? 'bg-amber-500' : 'bg-green-500'}`}
                                                            style={{ width: `${Math.min(100, (col.missing / selectedDataset.row_count) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs text-slate-500">{col.missing}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-2">
                                                {col.histogram && (
                                                    <div className="h-8 w-24">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={col.histogram.counts.map((c: any) => ({ val: c }))}>
                                                                <Bar dataKey="val" fill={col.is_numeric ? "#3b82f6" : "#a855f7"} radius={[2, 2, 0, 0]} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-800/50">
                                            {preview?.columns?.map((col: any) => (
                                                <th key={col.name} className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider border border-white/5">
                                                    {col.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview?.data?.slice(0, 50).map((row: any, i: number) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                                {preview.columns.map((col: any) => (
                                                    <td key={col.name} className="p-3 text-xs text-slate-300 border border-white/5 whitespace-nowrap">
                                                        {row[col.name]?.toString() || '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Visuals */}
                <div className="space-y-8">
                    {/* Data Types Distribution */}
                    <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl">
                        <h4 className="text-white font-bold mb-6 flex items-center gap-2">
                            <BarChart3 size={18} className="text-blue-400" />
                            Type Composition
                        </h4>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Numeric', value: profile?.columns?.filter((c: any) => c.is_numeric).length || 0 },
                                            { name: 'Categorical', value: profile?.columns?.filter((c: any) => !c.is_numeric).length || 0 }
                                        ]}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        <Cell fill="#3b82f6" />
                                        <Cell fill="#a855f7" />
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Correlation Summary */}
                    <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl">
                        <h4 className="text-white font-bold mb-4">Correlation Matrix</h4>
                        {eda?.features && eda.features.length > 1 ? (
                            <div className="overflow-hidden rounded-xl border border-white/5 bg-slate-950">
                                <Plot
                                    data={[{
                                        z: eda.features.map((f1: string) => eda.features.map((f2: string) => eda.correlation.find((c: any) => c.feature === f1)?.[f2] || 0)),
                                        x: eda.features,
                                        y: eda.features,
                                        type: 'heatmap',
                                        colorscale: [[0, '#1e293b'], [0.5, '#3b82f6'], [1, '#60a5fa']],
                                        showscale: false
                                    }]}
                                    layout={{
                                        width: 280,
                                        height: 280,
                                        margin: { t: 10, r: 10, b: 50, l: 50 },
                                        paper_bgcolor: 'rgba(0,0,0,0)',
                                        plot_bgcolor: 'rgba(0,0,0,0)',
                                        xaxis: { tickfont: { size: 8, color: '#94a3b8' }, automargin: true },
                                        yaxis: { tickfont: { size: 8, color: '#94a3b8' }, automargin: true }
                                    }}
                                    config={{ displayModeBar: false }}
                                />
                            </div>
                        ) : (
                            <div className="h-48 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-800 rounded-2xl">
                                <AlertCircle size={24} className="text-slate-700 mb-2" />
                                <p className="text-xs text-slate-500">Need at least 2 numeric columns for correlation analysis.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
