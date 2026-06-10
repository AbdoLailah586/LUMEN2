import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { aiAutoClean, getDatasets, getDataset, getDatasetPreview, applyCleaning, suggestCleaning, previewCleaning } from "../services/api";
import {
    Eraser, Check, Loader2,
    Table as TableIcon, Settings2, ArrowRight,
    Sparkles, Wand2, Sliders, Type, Binary,
    RefreshCcw, RotateCcw, Search, Eye, Bookmark
} from "lucide-react";

import { AISuggestButton } from "../components/AI/AISuggestButton";
import { SuggestionCard } from "../components/AI/SuggestionCard";
import { CleaningPreviewPanel, CleaningPreviewData } from "../components/Cleaning/CleaningPreviewPanel";
import { CLEANING_PRESETS, CleaningPreset } from "../components/Cleaning/cleaningPresets";

const DEFAULT_CONFIG = {
    drop_columns: [] as string[],
    missing_strategy: "auto",
    missing_fill_value: "",
    outlier_method: "none",
    outlier_action: "clip",
    outlier_threshold: 3.0,
    scaling_method: "none",
    encoding_method: "none",
    drop_duplicates: false,
    apply_log_transform: false,
    strip_whitespace: false,
    lowercase_text: false,
};

const NUMERIC_IMPUTATION = ["auto", "mean", "median", "mode", "zero", "constant", "forward_fill", "backward_fill", "drop_rows", "none"];
const TEXT_IMPUTATION = ["mode", "constant", "forward_fill", "backward_fill", "drop_rows", "none"];

const isNumericType = (type: string) =>
    type.includes("int") || type.includes("float") || type.includes("number");

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

    const [cleaningConfig, setCleaningConfig] = useState({ ...DEFAULT_CONFIG });
    const [columnStrategies, setColumnStrategies] = useState<Record<string, string>>({});
    const [columnTypeConversions, setColumnTypeConversions] = useState<Record<string, string>>({});
    const [columnFillValues, setColumnFillValues] = useState<Record<string, string>>({});
    const [columnFilter, setColumnFilter] = useState("");
    const [cleaningPreview, setCleaningPreview] = useState<CleaningPreviewData | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState("");

    const updateConfig = (patch: Partial<typeof DEFAULT_CONFIG>) =>
        setCleaningConfig((prev) => ({ ...prev, ...patch }));

    const initColumnSettings = useCallback((columns: any[]) => {
        const initialStrats: Record<string, string> = {};
        const initialTypes: Record<string, string> = {};
        columns.forEach((col: any) => {
            initialStrats[col.name] = isNumericType(col.type) ? "auto" : "mode";
            initialTypes[col.name] = "auto";
        });
        setColumnStrategies(initialStrats);
        setColumnTypeConversions(initialTypes);
        setColumnFillValues({});
    }, []);

    const buildFinalConfig = useCallback(() => ({
        ...cleaningConfig,
        missing_fill_value: cleaningConfig.missing_fill_value || null,
        column_strategies: columnStrategies,
        column_type_conversions: columnTypeConversions,
        column_fill_values: columnFillValues,
    }), [cleaningConfig, columnStrategies, columnTypeConversions, columnFillValues]);

    const configSnapshot = useMemo(
        () => JSON.stringify(buildFinalConfig()),
        [buildFinalConfig]
    );

    const fetchPreview = useCallback(async () => {
        if (!datasetId) return;
        setPreviewLoading(true);
        setPreviewError("");
        try {
            const data = await previewCleaning(datasetId, buildFinalConfig());
            setCleaningPreview(data);
        } catch (err: any) {
            setCleaningPreview(null);
            setPreviewError(
                typeof err.response?.data?.detail === "string"
                    ? err.response.data.detail
                    : "Preview failed. Check your cleaning settings."
            );
        } finally {
            setPreviewLoading(false);
        }
    }, [datasetId, buildFinalConfig]);

    useEffect(() => {
        if (!datasetId) return;
        const timer = setTimeout(fetchPreview, 700);
        return () => clearTimeout(timer);
    }, [datasetId, configSnapshot, fetchPreview]);

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
                getDatasetPreview(id),
            ]);
            setSelectedDataset(ds);
            setPreview(prev);

            initColumnSettings(prev.columns);
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
        } catch {
            alert("AI analysis failed.");
        } finally {
            setAiLoading(false);
        }
    };

    const applyAISuggestion = (suggestion: any) => {
        const { column, action, params } = suggestion;

        if (action === "drop_column") {
            updateConfig({
                drop_columns: [...new Set([...cleaningConfig.drop_columns, column])],
            });
        } else if (action === "fill_missing") {
            setColumnStrategies((prev) => ({
                ...prev,
                [column]: params?.strategy || "mean",
            }));
        } else if (action === "remove_outliers") {
            updateConfig({ outlier_method: "iqr", outlier_action: "drop" });
        } else if (action === "cap_outliers") {
            updateConfig({ outlier_method: "iqr", outlier_action: "clip" });
        } else if (action === "convert_type" && params?.target_type) {
            setColumnTypeConversions((prev) => ({
                ...prev,
                [column]: params.target_type,
            }));
        }

        setAiSuggestions((prev) => prev.filter((s) => s !== suggestion));
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

    const applyPreset = (preset: CleaningPreset) => {
        setCleaningConfig({ ...DEFAULT_CONFIG, ...preset.config } as typeof DEFAULT_CONFIG);
        if (preview?.columns) {
            const strats: Record<string, string> = {};
            preview.columns.forEach((col: any) => {
                strats[col.name] = isNumericType(col.type)
                    ? (preset.columnStrategyDefault || "auto")
                    : "mode";
            });
            setColumnStrategies(strats);
        }
        setColumnTypeConversions({});
        setColumnFillValues({});
    };

    const resetAllSettings = () => {
        setCleaningConfig({ ...DEFAULT_CONFIG });
        if (preview?.columns) initColumnSettings(preview.columns);
        setColumnFilter("");
    };

    const savePresetLocally = () => {
        const name = window.prompt("Name this cleaning preset:");
        if (!name?.trim()) return;
        const saved = JSON.parse(localStorage.getItem("lumen_cleaning_presets") || "[]");
        saved.push({ name: name.trim(), config: buildFinalConfig(), savedAt: Date.now() });
        localStorage.setItem("lumen_cleaning_presets", JSON.stringify(saved));
        alert(`Preset "${name.trim()}" saved.`);
    };

    const loadSavedPreset = () => {
        const saved: { name: string; config: any }[] = JSON.parse(
            localStorage.getItem("lumen_cleaning_presets") || "[]"
        );
        if (saved.length === 0) {
            alert("No saved presets yet.");
            return;
        }
        const names = saved.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
        const choice = window.prompt(`Enter preset number:\n${names}`);
        const idx = parseInt(choice || "", 10) - 1;
        if (idx < 0 || idx >= saved.length) return;
        const preset = saved[idx].config;
        setCleaningConfig({ ...DEFAULT_CONFIG, ...preset });
        if (preset.column_strategies) setColumnStrategies(preset.column_strategies);
        if (preset.column_type_conversions) setColumnTypeConversions(preset.column_type_conversions);
        if (preset.column_fill_values) setColumnFillValues(preset.column_fill_values);
    };

    const handleApplyCleaning = async () => {
        if (!datasetId) return;
        setApplying(true);
        try {
            const result = await applyCleaning(datasetId, buildFinalConfig());
            alert("Cleaning applied! New dataset created.");
            navigate(`/dashboard/${result.cleaned_dataset_id}`);
        } catch {
            alert("Cleaning failed.");
        } finally {
            setApplying(false);
        }
    };

    const toggleColumnDrop = (colName: string) => {
        updateConfig({
            drop_columns: cleaningConfig.drop_columns.includes(colName)
                ? cleaningConfig.drop_columns.filter((c) => c !== colName)
                : [...cleaningConfig.drop_columns, colName],
        });
    };

    const filteredColumns = preview?.columns?.filter((col: any) =>
        col.name.toLowerCase().includes(columnFilter.toLowerCase())
    ) ?? [];

    const activePolicies = [
        cleaningConfig.outlier_method !== "none" ? `Outliers: ${cleaningConfig.outlier_method}` : null,
        cleaningConfig.drop_duplicates ? "Dedup" : null,
        cleaningConfig.strip_whitespace ? "Trim text" : null,
        cleaningConfig.lowercase_text ? "Lowercase" : null,
        cleaningConfig.scaling_method !== "none" ? `Scale: ${cleaningConfig.scaling_method}` : null,
        cleaningConfig.encoding_method !== "none" ? `Encode: ${cleaningConfig.encoding_method}` : null,
        cleaningConfig.apply_log_transform ? "Log transform" : null,
    ].filter((p): p is string => p !== null);

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
                        {datasets.map((ds) => (
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
                        {selectedDataset?.original_filename || "Loading dataset..."}
                    </p>
                    {activePolicies.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {activePolicies.map((p) => (
                                <span key={p} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/20">
                                    {p}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-3">
                    <AISuggestButton onClick={handleAISuggest} loading={aiLoading} label="AI Suggest Cleaning" />
                    <button
                        onClick={handleAIAutoClean}
                        disabled={aiCleaning}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
                    >
                        {aiCleaning ? <Loader2 size={18} className="animate-spin" /> : <><Wand2 size={18} /> AI Auto-Clean</>}
                    </button>
                    <button
                        onClick={fetchPreview}
                        disabled={previewLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 rounded-xl transition-all disabled:opacity-50"
                    >
                        {previewLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                        Preview
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
                <div className="space-y-5">
                    {aiSuggestions.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles size={14} /> AI Recommendations ({aiSuggestions.length})
                            </h3>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
                                {aiSuggestions.map((s, idx) => (
                                    <SuggestionCard
                                        key={idx}
                                        title={`${s.column}: ${s.action.replace(/_/g, " ")}`}
                                        description={`Proposed strategy for ${s.column}.`}
                                        reason={s.reason}
                                        onAccept={() => applyAISuggestion(s)}
                                        onReject={() => setAiSuggestions((prev) => prev.filter((item) => item !== s))}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Presets */}
                    <div className="bg-slate-900/40 border border-white/5 p-5 rounded-3xl space-y-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Bookmark size={16} className="text-violet-400" />
                            Quick Presets
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                            {CLEANING_PRESETS.map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => applyPreset(preset)}
                                    className="text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-white/5 transition-all"
                                >
                                    <span className="text-sm font-bold text-slate-200">{preset.label}</span>
                                    <p className="text-[11px] text-slate-500 mt-0.5">{preset.description}</p>
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={savePresetLocally}
                                className="flex-1 text-xs py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-white/5 transition-colors"
                            >
                                Save preset
                            </button>
                            <button
                                onClick={loadSavedPreset}
                                className="flex-1 text-xs py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-white/5 transition-colors"
                            >
                                Load preset
                            </button>
                            <button
                                onClick={resetAllSettings}
                                title="Reset all settings"
                                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-amber-400 border border-white/5 transition-colors"
                            >
                                <RotateCcw size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Missing Values */}
                    <div className="bg-slate-900/40 border border-white/5 p-5 rounded-3xl space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Sliders size={16} className="text-blue-400" />
                            Missing Values
                        </h3>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Global Fallback</label>
                            <select
                                value={cleaningConfig.missing_strategy}
                                onChange={(e) => updateConfig({ missing_strategy: e.target.value })}
                                className="w-full bg-slate-800 border border-white/10 text-white text-sm p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="none">None (use per-column only)</option>
                                <option value="auto">Auto (skew-aware)</option>
                                <option value="mean">Mean</option>
                                <option value="median">Median</option>
                                <option value="mode">Mode</option>
                                <option value="knn">KNN (numeric)</option>
                                <option value="constant">Constant</option>
                            </select>
                        </div>
                        {cleaningConfig.missing_strategy === "constant" && (
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Fill Value</label>
                                <input
                                    type="text"
                                    value={cleaningConfig.missing_fill_value}
                                    onChange={(e) => updateConfig({ missing_fill_value: e.target.value })}
                                    placeholder="e.g. Unknown"
                                    className="w-full bg-slate-800 border border-white/10 text-white text-sm p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}
                    </div>

                    {/* Outliers */}
                    <div className="bg-slate-900/40 border border-white/5 p-5 rounded-3xl space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Settings2 size={16} className="text-amber-400" />
                            Outlier Detection
                        </h3>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Method</label>
                            <select
                                value={cleaningConfig.outlier_method}
                                onChange={(e) => updateConfig({ outlier_method: e.target.value })}
                                className="w-full bg-slate-800 border border-white/10 text-white text-sm p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="none">None</option>
                                <option value="auto">Auto (skew-aware)</option>
                                <option value="zscore">Z-Score</option>
                                <option value="iqr">IQR (Robust)</option>
                                <option value="isolation_forest">Isolation Forest</option>
                            </select>
                        </div>
                        {cleaningConfig.outlier_method !== "none" && (
                            <>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Action</label>
                                    <select
                                        value={cleaningConfig.outlier_action}
                                        onChange={(e) => updateConfig({ outlier_action: e.target.value })}
                                        className="w-full bg-slate-800 border border-white/10 text-white text-sm p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="clip">Clip (Winsorize)</option>
                                        <option value="drop">Drop Rows</option>
                                    </select>
                                </div>
                                {!["iqr", "isolation_forest"].includes(cleaningConfig.outlier_method) && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                            Z-Score Threshold: {cleaningConfig.outlier_threshold}
                                        </label>
                                        <input
                                            type="range"
                                            min={1.5}
                                            max={5}
                                            step={0.5}
                                            value={cleaningConfig.outlier_threshold}
                                            onChange={(e) => updateConfig({ outlier_threshold: parseFloat(e.target.value) })}
                                            className="w-full accent-indigo-500"
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Transformations */}
                    <div className="bg-slate-900/40 border border-white/5 p-5 rounded-3xl space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Binary size={16} className="text-emerald-400" />
                            Transformations
                        </h3>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Scaling</label>
                            <select
                                value={cleaningConfig.scaling_method}
                                onChange={(e) => updateConfig({ scaling_method: e.target.value })}
                                className="w-full bg-slate-800 border border-white/10 text-white text-sm p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="none">None</option>
                                <option value="standard">Standard Scaler</option>
                                <option value="minmax">Min-Max (0–1)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Categorical Encoding</label>
                            <select
                                value={cleaningConfig.encoding_method}
                                onChange={(e) => updateConfig({ encoding_method: e.target.value })}
                                className="w-full bg-slate-800 border border-white/10 text-white text-sm p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="none">None</option>
                                <option value="label">Label Encoding</option>
                                <option value="onehot">One-Hot Encoding</option>
                            </select>
                        </div>
                        <label className="flex items-center gap-3 p-2.5 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
                            <input
                                type="checkbox"
                                checked={cleaningConfig.apply_log_transform}
                                onChange={(e) => updateConfig({ apply_log_transform: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-300">Log transform (skewed numeric)</span>
                        </label>
                    </div>

                    {/* Text & Quality */}
                    <div className="bg-slate-900/40 border border-white/5 p-5 rounded-3xl space-y-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Type size={16} className="text-cyan-400" />
                            Text & Quality
                        </h3>
                        {[
                            { key: "strip_whitespace" as const, label: "Trim whitespace in text columns" },
                            { key: "lowercase_text" as const, label: "Lowercase text columns" },
                            { key: "drop_duplicates" as const, label: "Remove duplicate rows" },
                        ].map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-3 p-2.5 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={cleaningConfig[key]}
                                    onChange={(e) => updateConfig({ [key]: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-300">{label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Preview + Column table */}
                <div className="xl:col-span-3 space-y-6">
                    <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Eye size={20} className="text-cyan-400" />
                                Before / After Preview
                            </h3>
                            {previewLoading && (
                                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                    <Loader2 size={12} className="animate-spin" /> Updating...
                                </span>
                            )}
                        </div>
                        <CleaningPreviewPanel
                            preview={cleaningPreview}
                            loading={previewLoading && !cleaningPreview}
                            error={previewError}
                        />
                    </div>

                    <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/20">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <TableIcon size={20} className="text-indigo-400" />
                                Column-Level Operations
                            </h3>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Filter columns..."
                                        value={columnFilter}
                                        onChange={(e) => setColumnFilter(e.target.value)}
                                        className="pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-white/10 text-white rounded-lg outline-none focus:ring-1 focus:ring-blue-500 w-40"
                                    />
                                </div>
                                <span className="text-xs text-slate-500">{filteredColumns.length} / {preview?.columns?.length || 0}</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[800px]">
                                <thead>
                                    <tr className="text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-white/5">
                                        <th className="py-4 px-4">Column</th>
                                        <th className="py-4 px-4">Type</th>
                                        <th className="py-4 px-4">Missing</th>
                                        <th className="py-4 px-4">Imputation</th>
                                        <th className="py-4 px-4">Convert To</th>
                                        <th className="py-4 px-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredColumns.map((col: any, i: number) => {
                                        const isDropped = cleaningConfig.drop_columns.includes(col.name);
                                        const strategy = columnStrategies[col.name] || "auto";
                                        const options = isNumericType(col.type) ? NUMERIC_IMPUTATION : TEXT_IMPUTATION;

                                        return (
                                            <tr
                                                key={i}
                                                className={`group hover:bg-white/5 transition-colors ${isDropped ? "opacity-40 grayscale" : ""}`}
                                            >
                                                <td className="py-3 px-4">
                                                    <span className="font-bold text-slate-200 text-sm">{col.name}</span>
                                                </td>
                                                <td className="py-3 px-4 text-xs text-slate-400 uppercase font-medium">{col.type}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-xs font-bold ${col.missing > 0 ? "text-amber-400" : "text-green-500"}`}>
                                                        {col.missing}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex flex-col gap-1">
                                                        <select
                                                            value={strategy}
                                                            onChange={(e) => setColumnStrategies({ ...columnStrategies, [col.name]: e.target.value })}
                                                            disabled={isDropped}
                                                            className="bg-slate-800 border border-white/10 text-white text-xs p-1.5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 w-full min-w-[120px]"
                                                        >
                                                            {options.map((opt) => (
                                                                <option key={opt} value={opt}>
                                                                    {opt.replace(/_/g, " ")}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {strategy === "constant" && (
                                                            <input
                                                                type="text"
                                                                placeholder="Fill value"
                                                                value={columnFillValues[col.name] || ""}
                                                                onChange={(e) => setColumnFillValues({ ...columnFillValues, [col.name]: e.target.value })}
                                                                disabled={isDropped}
                                                                className="bg-slate-800 border border-white/10 text-white text-xs p-1 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <select
                                                        value={columnTypeConversions[col.name] || "auto"}
                                                        onChange={(e) => setColumnTypeConversions({ ...columnTypeConversions, [col.name]: e.target.value })}
                                                        disabled={isDropped}
                                                        className="bg-slate-800 border border-white/10 text-white text-xs p-1.5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                                                    >
                                                        <option value="auto">Keep as-is</option>
                                                        <option value="int">Integer</option>
                                                        <option value="float">Float</option>
                                                        <option value="str">String</option>
                                                        <option value="category">Category</option>
                                                        <option value="datetime">DateTime</option>
                                                    </select>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        onClick={() => toggleColumnDrop(col.name)}
                                                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                                            isDropped
                                                                ? "bg-amber-500/20 text-amber-500 border border-amber-500/20"
                                                                : "bg-slate-800 text-slate-500 hover:text-red-400 border border-white/5"
                                                        }`}
                                                    >
                                                        {isDropped ? "Restore" : "Drop"}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 bg-slate-800/30 border-t border-white/5 text-xs text-slate-500">
                            Pipeline order: drop columns → text cleanup → type conversion → imputation → outliers → scaling/encoding → log transform → deduplicate
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CleaningPage;
