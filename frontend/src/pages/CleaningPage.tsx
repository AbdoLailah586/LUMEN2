import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { aiAutoClean, getDatasets, getDataset, getDatasetPreview, applyCleaning, suggestCleaning } from "../services/api";
import { 
    Eraser, Check, Loader2, 
    Table as TableIcon, RefreshCcw, Filter, ChevronLeft, ChevronRight, Settings2, ArrowRight,
    Sparkles, Wand2
} from "lucide-react";

import { AISuggestButton } from "../components/AI/AISuggestButton";
import { SuggestionCard } from "../components/AI/SuggestionCard";

export const CleaningPage: React.FC = () => {
    const { datasetId } = useParams<{ datasetId: string }>();
    const navigate = useNavigate();
    
    const [datasets, setDatasets] = useState<any[]>([]);
    const [selectedDataset, setSelectedDataset] = useState<any>(null);
    const [preview, setPreview] = useState<any>(null);
    const [applying, setApplying] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiCleaning, setAiCleaning] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);

    
    // Cleaning Config
    const [cleaningConfig, setCleaningConfig] = useState<any>({
        drop_columns: [],
        missing_strategy: "mean",
        outlier_method: "zscore",
        outlier_action: "clip",
        drop_duplicates: false
    });

    const [columnStrategies, setColumnStrategies] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchDatasets();
    }, []);

    useEffect(() => {
        if (datasetId) {
            loadDataset(datasetId);
        }
    }, [datasetId]);

    const fetchDatasets = async () => {
        try {
            const data = await getDatasets();
            setDatasets(data);
        } catch (err) {
            console.error("Failed to fetch datasets:", err);
        }
    };

    const loadDataset = async (id: string) => {
        try {
            const [ds, prev] = await Promise.all([
                getDataset(id),
                getDatasetPreview(id)
            ]);
            setSelectedDataset(ds);
            setPreview(prev);
            
            // Initialize column strategies
            const initialStrats: Record<string, string> = {};
            prev.columns.forEach((col: any) => {
                initialStrats[col.name] = col.type.includes('float') || col.type.includes('int') ? 'mean' : 'mode';
            });
            setColumnStrategies(initialStrats);
        } catch (err) {
            console.error("Failed to load dataset preview:", err);
        }
    };

    const handleAISuggest = async () => {
        if (!datasetId) return;
        setAiLoading(true);
        try {
            const res = await suggestCleaning(datasetId);
            setAiSuggestions(res.suggestions);
        } catch (err) {
            alert("AI analysis failed.");
        } finally {
            setAiLoading(false);
        }
    };

    const applyAISuggestion = (suggestion: any) => {
        const { column, action, params } = suggestion;
        
        if (action === 'drop_column') {
            setCleaningConfig((prev: any) => ({
                ...prev,
                drop_columns: [...new Set([...prev.drop_columns, column])]
            }));
        } else if (action === 'fill_missing') {
            setColumnStrategies(prev => ({
                ...prev,
                [column]: params?.strategy || 'mean'
            }));
        }
        
        // Remove from list
        setAiSuggestions(prev => prev.filter(s => s !== suggestion));
    };

    const handleAIAutoClean = async () => {
        if (!datasetId) return;
        if (!window.confirm("AI will automatically clean your data using generated Python code. Proceed?")) return;
        
        setAiCleaning(true);
        try {
            const result = await aiAutoClean(datasetId);
            alert("AI Cleaning Complete! Code used:\n\n" + result.code_used);
            navigate(`/dashboard/${result.cleaned_dataset_id}`);
        } catch (err) {
            console.error(err);
            alert("AI Autonomous Cleaning failed.");
        } finally {
            setAiCleaning(false);
        }
    };

    const handleApplyCleaning = async () => {
        if (!datasetId) return;
        setApplying(true);
        try {
            const finalConfig = {
                ...cleaningConfig,
                column_strategies: columnStrategies
            };
            const result = await applyCleaning(datasetId, finalConfig);
            alert("Cleaning Applied! New dataset created.");
            navigate(`/dashboard/${result.cleaned_dataset_id}`);
        } catch (err) {
            alert("Cleaning failed.");
        } finally {
            setApplying(false);
        }
    };

    const toggleColumnDrop = (colName: string) => {
        setCleaningConfig((prev: any) => ({
            ...prev,
            drop_columns: prev.drop_columns.includes(colName)
                ? prev.drop_columns.filter((c: string) => c !== colName)
                : [...prev.drop_columns, colName]
        }));
    };

    if (!datasetId && datasets.length > 0) {
        return (
            <div className="p-12 text-center space-y-6">
                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Eraser size={40} className="text-blue-500" />
                </div>
                <h2 className="text-3xl font-bold text-white">Select a Dataset to Clean</h2>
                <div className="max-w-xs mx-auto">
                    <select 
                        onChange={(e) => navigate(`/cleaning/${e.target.value}`)}
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
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500 rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                            <Eraser size={24} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white">Data Sanitization</h1>
                    </div>
                    <p className="text-slate-400 font-medium">
                        {selectedDataset?.original_filename || 'Loading dataset...'}
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    <AISuggestButton 
                        onClick={handleAISuggest} 
                        loading={aiLoading} 
                        label="AI Suggest Cleaning" 
                    />
                    <button 
                        onClick={handleAIAutoClean}
                        disabled={aiCleaning}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
                    >
                        {aiCleaning ? <Loader2 size={18} className="animate-spin" /> : <><Wand2 size={18} /> AI Auto-Clean</>}
                    </button>
                    <button 
                        onClick={() => navigate(`/dashboard/${datasetId}`)}
                        className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 rounded-xl transition-all"
                    >
                        Dashboard
                    </button>
                    <button 
                        onClick={handleApplyCleaning}
                        disabled={applying}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                    >
                        {applying ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Apply Cleaning</>}
                    </button>
                    <button 
                        onClick={() => navigate(`/training/${datasetId}`)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all transform hover:scale-105"
                    >
                        Train Model <ArrowRight size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Configuration Sidebar */}
                <div className="space-y-6">
                    {/* AI Suggestions Section */}
                    {aiSuggestions.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles size={14} /> AI Recommendations ({aiSuggestions.length})
                            </h3>
                            <div className="space-y-3 max-h-[500px] overflow-y-auto no-scrollbar pr-1">
                                {aiSuggestions.map((s, idx) => (
                                    <SuggestionCard 
                                        key={idx}
                                        title={`${s.column}: ${s.action.replace('_', ' ')}`}
                                        description={`Proposed strategy for ${s.column}.`}
                                        reason={s.reason}
                                        onAccept={() => applyAISuggestion(s)}
                                        onReject={() => setAiSuggestions(prev => prev.filter(item => item !== s))}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl space-y-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Settings2 size={18} className="text-blue-400" />
                            Global Policies
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Outlier Detection</label>
                                <select 
                                    value={cleaningConfig.outlier_method}
                                    onChange={(e) => setCleaningConfig({...cleaningConfig, outlier_method: e.target.value})}
                                    className="w-full bg-slate-800 border border-white/10 text-white p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="none">None</option>
                                    <option value="zscore">Z-Score (Standard)</option>
                                    <option value="iqr">IQR (Robust)</option>
                                </select>
                            </div>

                            <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={cleaningConfig.drop_duplicates}
                                    onChange={(e) => setCleaningConfig({...cleaningConfig, drop_duplicates: e.target.checked})}
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-300 font-medium">Remove Duplicate Rows</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Main Data Preview and Column Config */}
                <div className="xl:col-span-3 space-y-8">
                    <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-800/20">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <TableIcon size={20} className="text-indigo-400" />
                                Column-Level Operations
                            </h3>
                            <div className="flex gap-2">
                                <button className="p-2 text-slate-500 hover:text-white transition-colors"><RefreshCcw size={16} /></button>
                                <button className="p-2 text-slate-500 hover:text-white transition-colors"><Filter size={16} /></button>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-white/5">
                                        <th className="py-4 px-6">Column</th>
                                        <th className="py-4 px-6">Type</th>
                                        <th className="py-4 px-6">Missing</th>
                                        <th className="py-4 px-6">Strategy</th>
                                        <th className="py-4 px-6">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {preview?.columns?.map((col: any, i: number) => (
                                        <tr key={i} className={`group hover:bg-white/5 transition-colors ${cleaningConfig.drop_columns.includes(col.name) ? 'opacity-40 grayscale line-through' : ''}`}>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-200">{col.name}</span>
                                                    <span className="text-[10px] text-slate-600 font-mono">#{i}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-xs text-slate-400 uppercase font-medium">{col.type}</td>
                                            <td className="py-4 px-6">
                                                <span className={`text-xs font-bold ${col.missing > 0 ? 'text-amber-400' : 'text-green-500'}`}>
                                                    {col.missing}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <select 
                                                    value={columnStrategies[col.name] || 'mean'}
                                                    onChange={(e) => setColumnStrategies({...columnStrategies, [col.name]: e.target.value})}
                                                    disabled={cleaningConfig.drop_columns.includes(col.name)}
                                                    className="bg-slate-800 border border-white/10 text-white text-xs p-1.5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 transition-all focus:bg-slate-700"
                                                >
                                                    <option value="mean">Mean</option>
                                                    <option value="median">Median</option>
                                                    <option value="mode">Mode</option>
                                                    <option value="zero">Zero</option>
                                                </select>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button 
                                                    onClick={() => toggleColumnDrop(col.name)}
                                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                                        cleaningConfig.drop_columns.includes(col.name)
                                                        ? 'bg-amber-500/20 text-amber-500 border border-amber-500/20'
                                                        : 'bg-slate-800 text-slate-500 hover:text-red-400 border border-white/5'
                                                    }`}
                                                >
                                                    {cleaningConfig.drop_columns.includes(col.name) ? 'Restore' : 'Drop'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="p-4 bg-slate-800/30 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
                            <span>Showing first 500 rows for AI precision</span>
                            <div className="flex gap-4">
                                <button className="flex items-center gap-1 hover:text-white transition-colors disabled:opacity-30" disabled><ChevronLeft size={14} /> Previous</button>
                                <button className="flex items-center gap-1 hover:text-white transition-colors">Next <ChevronRight size={14} /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CleaningPage;
