import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDataset, getDatasetProfile, getDatasetEda, applyCleaning } from '../services/api';
import { ArrowLeft, Loader, Database, Sparkles, RefreshCw, BarChart2, Hash, Type } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { AiPlotInsight } from '../components/AiPlotInsight';

export default function DatasetDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [dataset, setDataset] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [eda, setEda] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [cleaning, setCleaning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const ds = await getDataset(id);
            setDataset(ds);
            const prof = await getDatasetProfile(id);
            setProfile(prof);
            try {
                const edaData = await getDatasetEda(id);
                setEda(edaData);
            } catch (edaErr) {
                console.error('Error fetching EDA details:', edaErr);
            }
            setError(null);
        } catch (err: any) {
            console.error('Error fetching dataset details:', err);
            setError('Failed to load dataset details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handleAutoClean = async () => {
        if (!id) return;
        try {
            setCleaning(true);
            const config = {
                missing_strategy: "auto",
                outlier_method: "auto",
                drop_duplicates: true
            };
            const result = await applyCleaning(id, config);
            // Navigate to the new cleaned dataset details page
            if (result && result.cleaned_dataset_id) {
                navigate(`/dataset/${result.cleaned_dataset_id}`);
            } else {
                // If it cleaned in place (not standard for this app, but just in case)
                fetchData();
            }
        } catch (err: any) {
            console.error('Error applying auto-cleaning:', err);
            alert('Failed to apply intelligent auto-cleaning. Check console for details.');
        } finally {
            setCleaning(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader className="animate-spin text-blue-500 mb-4" size={40} />
                <p className="text-gray-400 font-medium animate-pulse">Loading dataset details...</p>
            </div>
        );
    }

    if (error || !dataset || !profile) {
        return (
            <div className="max-w-6xl mx-auto mt-8">
                <button onClick={() => navigate('/dashboard')} className="flex items-center text-blue-400 mb-4 hover:text-blue-300 transition-colors">
                    <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
                </button>
                <div className="bg-red-900/20 text-red-400 p-6 rounded-xl border border-red-900/50 flex flex-col items-center justify-center min-h-[300px]">
                    <p className="font-semibold text-lg">{error || 'Dataset not found.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto mt-8 mb-16 px-4 animate-fade-in relative z-10 pb-12">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>

            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 relative z-10">
                <div>
                    <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-500 hover:text-blue-400 mb-6 transition-colors font-bold uppercase tracking-widest text-xs">
                        <ArrowLeft size={16} className="mr-2" /> Return to Dashboard
                    </button>
                    <h1 className="text-4xl lg:text-5xl font-extrabold text-white flex items-center gap-4 tracking-tight drop-shadow-md">
                        <div className="bg-blue-900/30 p-2.5 rounded-2xl border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                            <Database className="text-blue-400" size={32} />
                        </div>
                        {dataset.original_filename}
                    </h1>
                    <div className="flex items-center gap-4 mt-4">
                        <span className="bg-dark-800/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/5 text-sm font-bold text-gray-300 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                            {dataset.file_type}
                        </span>
                        <span className="text-gray-500 font-mono text-sm border-l border-white/10 pl-4">{new Date(dataset.created_at).toLocaleString()}</span>
                    </div>
                </div>

                <button
                    onClick={handleAutoClean}
                    disabled={cleaning}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] font-bold tracking-wide flex items-center gap-3 transition-all duration-300 disabled:opacity-50 disabled:shadow-none transform hover:-translate-y-1"
                >
                    {cleaning ? <RefreshCw className="animate-spin text-indigo-200" size={20} /> : <Sparkles className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" size={20} />}
                    {cleaning ? 'Initializing Auto-Clean...' : 'Intelligent Auto-Clean'}
                </button>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12 relative z-10">
                <div className="bg-dark-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col group hover:border-white/10 transition-colors">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2 group-hover:text-blue-400 transition-colors">Total Rows</span>
                    <span className="text-4xl font-black text-gray-100 tracking-tighter">{dataset.row_count?.toLocaleString()}</span>
                </div>
                <div className="bg-dark-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col group hover:border-white/10 transition-colors">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2 group-hover:text-cyan-400 transition-colors">Total Features</span>
                    <span className="text-4xl font-black text-gray-100 tracking-tighter">{dataset.column_count?.toLocaleString()}</span>
                </div>
                <div className="bg-dark-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col group hover:border-white/10 transition-colors">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2 group-hover:text-indigo-400 transition-colors">Storage Size</span>
                    <span className="text-4xl font-black text-gray-100 tracking-tighter">{(dataset.file_size / 1024).toFixed(2)} <span className="text-xl text-gray-500">KB</span></span>
                </div>
                <div className="bg-dark-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">System Status</span>
                    <span className="text-lg font-bold text-emerald-400 flex items-center gap-2 mt-2 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)] relative z-10 tracking-wide">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border border-emerald-300/50"></span>
                        Ready for Analysis
                    </span>
                </div>
            </div>

            {/* Activity Log Section */}
            <div className="mb-12 bg-dark-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <ActivityTimeline datasetId={id as string} />
            </div>

            {/* Column Profiles */}
            <div className="mb-6 relative z-10 flex items-center gap-4">
                <div className="bg-dark-800 border border-white/10 p-2 rounded-xl shadow-inner">
                    <BarChart2 className="text-indigo-400" size={24} />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-100 tracking-tight">Feature Topology</h2>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 relative z-10">
                {profile.columns.map((col: any) => (
                    <div key={col.name} className="bg-dark-800/60 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col group hover:border-white/10 transition-colors relative">
                        <div className="bg-dark-900/40 px-8 py-5 border-b border-white/5 flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-dark-800 border border-white/5 shadow-inner">
                                    {col.is_numeric ? <Hash size={18} className="text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" /> : <Type size={18} className="text-purple-400 drop-shadow-[0_0_5px_rgba(192,132,252,0.5)]" />}
                                </div>
                                <h3 className="font-bold text-xl text-gray-100 tracking-tight truncate max-w-[200px]" title={col.name}>{col.name}</h3>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest bg-dark-900 px-3 py-1.5 rounded-lg border border-white/5 text-gray-400 shadow-inner">
                                {col.type}
                            </span>
                        </div>

                        <div className="p-8 flex-1 flex flex-col bg-dark-900/20 relative z-10">
                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div className="bg-dark-900/50 p-4 rounded-2xl border border-white/5">
                                    <p className="text-xs text-gray-500 mb-1.5 font-bold uppercase tracking-widest">Null Values</p>
                                    <p className={`font-black text-2xl ${col.missing > 0 ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)] text-glow' : 'text-emerald-400'}`}>
                                        {col.missing.toLocaleString()}
                                        <span className="text-xs font-bold font-mono ml-2 opacity-70">
                                            ({((col.missing / dataset.row_count) * 100).toFixed(1)}%)
                                        </span>
                                    </p>
                                </div>
                                <div className="bg-dark-900/50 p-4 rounded-2xl border border-white/5">
                                    <p className="text-xs text-gray-500 mb-1.5 font-bold uppercase tracking-widest">Cardinality</p>
                                    <p className="font-black text-2xl text-gray-100">{col.unique.toLocaleString()}</p>
                                </div>
                                {col.is_numeric && (
                                    <>
                                        <div className="bg-dark-900/50 p-4 rounded-2xl border border-white/5">
                                            <p className="text-xs text-gray-500 mb-1.5 font-bold uppercase tracking-widest">Mean Divergence</p>
                                            <p className="font-mono font-bold text-lg text-blue-300">{col.mean !== null ? col.mean.toFixed(2) : 'N/A'}</p>
                                        </div>
                                        <div className="bg-dark-900/50 p-4 rounded-2xl border border-white/5">
                                            <p className="text-xs text-gray-500 mb-1.5 font-bold uppercase tracking-widest">Distribution Range</p>
                                            <p className="font-mono font-bold text-gray-300 text-sm mt-1 bg-dark-900 px-2 py-1 rounded inline-block border border-white/5">
                                                {col.min !== null ? col.min.toFixed(1) : '—'} <span className="text-gray-600 mx-1">to</span> {col.max !== null ? col.max.toFixed(1) : '—'}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Chart Area */}
                            <div className="mt-auto h-40 w-full relative">
                                {col.is_numeric && col.histogram ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={col.histogram.bins.slice(0, -1).map((b: number, i: number) => ({ bin: b.toFixed(1), count: col.histogram.counts[i] }))}>
                                            <Tooltip cursor={{ fill: '#ffffff0a' }} contentStyle={{ borderRadius: '16px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }} />
                                            <Bar dataKey="count" fill="url(#colorCyan)" radius={[4, 4, 0, 0]} />
                                            <defs>
                                                <linearGradient id="colorCyan" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.8} />
                                                    <stop offset="100%" stopColor="#0891b2" stopOpacity={0.3} />
                                                </linearGradient>
                                            </defs>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : !col.is_numeric && col.value_counts ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={col.value_counts.labels.map((l: string, i: number) => ({ label: l, count: col.value_counts.values[i] }))}>
                                            <Tooltip cursor={{ fill: '#ffffff0a' }} contentStyle={{ borderRadius: '16px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }} />
                                            <Bar dataKey="count" fill="url(#colorPurple)" radius={[4, 4, 0, 0]} />
                                            <XAxis dataKey="label" hide />
                                            <defs>
                                                <linearGradient id="colorPurple" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#c084fc" stopOpacity={0.8} />
                                                    <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.3} />
                                                </linearGradient>
                                            </defs>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center bg-dark-900/30 rounded-2xl border border-white/5 text-gray-600 text-sm font-bold uppercase tracking-widest shadow-inner">
                                        Topology Unmapped
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Advanced EDA Correlation Matrix */}
            {eda && eda.correlation && eda.correlation.length > 0 && (
                <div className="mt-12 relative z-10">
                    <div className="mb-6 flex items-center gap-4">
                        <div className="bg-dark-800 border border-white/10 p-2 rounded-xl shadow-inner">
                            <BarChart2 className="text-cyan-400" size={24} />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-100 tracking-tight">Feature Correlation Matrix</h2>
                    </div>
                    
                    <div className="bg-dark-800/60 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden p-6 w-full overflow-x-auto">
                        <table className="min-w-full text-sm text-center">
                            <thead>
                                <tr>
                                    <th className="p-3 bg-dark-900/50 text-gray-400 font-bold border border-white/10 rounded-tl-xl border-collapse border-spacing-0">Feature</th>
                                    {eda.features.map((f: string) => (
                                        <th key={f} className="p-3 bg-dark-900/50 text-gray-400 font-bold border-b border-t border-r border-white/10">{f}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {eda.correlation.map((row: any) => (
                                    <tr key={row.feature}>
                                        <td className="p-3 bg-dark-900/50 text-gray-200 font-bold border-l border-r border-b border-white/10">{row.feature}</td>
                                        {eda.features.map((f: string) => {
                                            const val = row[f];
                                            let bgColor = 'bg-dark-900/10';
                                            let textColor = 'text-gray-400';
                                            if (val !== null && val !== undefined) {
                                                if (val >= 0.7) { bgColor = 'bg-emerald-500/30'; textColor = 'text-emerald-300'; }
                                                else if (val >= 0.4) { bgColor = 'bg-emerald-500/10'; textColor = 'text-emerald-400'; }
                                                else if (val <= -0.7) { bgColor = 'bg-red-500/30'; textColor = 'text-red-300'; }
                                                else if (val <= -0.4) { bgColor = 'bg-red-500/10'; textColor = 'text-red-400'; }
                                                else { bgColor = 'bg-dark-800/40'; textColor = 'text-gray-400'; }
                                            }
                                            return (
                                                <td key={f} className={`p-3 border-r border-b border-white/10 ${bgColor} ${textColor} font-mono font-medium`} title={val !== null ? val.toFixed(4) : 'N/A'}>
                                                    {val !== null ? val.toFixed(2) : '-'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <AiPlotInsight
                        datasetId={id as string}
                        plotData={{
                            type: "Correlation Matrix",
                            stats: {
                                features: eda.features,
                                highest_correlations: eda.correlation.map((row: any) => {
                                    let maxInner = 0;
                                    let feat = "";
                                    for(const c of eda.features) {
                                        if (row[c] && c !== row.feature && Math.abs(row[c]) > Math.abs(maxInner)) {
                                            maxInner = row[c];
                                            feat = c;
                                        }
                                    }
                                    return `${row.feature} & ${feat}: ${maxInner.toFixed(2)}`;
                                }).slice(0, 5) // top 5 examples
                            }
                        }}
                    />
                </div>
            )}
        </div>
    );
}
