import React, { useState, useRef, useEffect } from "react";
import { uploadFile, getDatasets, deleteDataset } from "../services/api";
import { useNavigate } from "react-router-dom";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, Trash2, FileText, Database, ArrowRight } from "lucide-react";

export const UploadPage: React.FC = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [datasets, setDatasets] = useState<any[]>([]);
    const [loadingDatasets, setLoadingDatasets] = useState(true);

    useEffect(() => {
        fetchDatasets();
    }, []);

    const fetchDatasets = async () => {
        try {
            setLoadingDatasets(true);
            const data = await getDatasets();
            setDatasets(data);
        } catch (err) {
            console.error("Failed to fetch datasets:", err);
        } finally {
            setLoadingDatasets(false);
        }
    };

    const handleFile = async (file: File) => {
        if (!file) return;
        
        setError(null);
        setSuccess(false);
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const response = await uploadFile(file, (progressEvent) => {
                if (progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            setSuccess(true);
            await fetchDatasets();
            setTimeout(() => {
                navigate(`/dashboard/${response.id || response.dataset_id}`);
            }, 1500);
        } catch (err: any) {
            console.error("Upload failed:", err);
            setError(err.response?.data?.detail || err.message || "Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this dataset?")) return;
        
        try {
            await deleteDataset(id);
            setDatasets(datasets.filter(d => d.id !== id));
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Failed to delete dataset.");
        }
    };

    const handleBrowseFiles = () => {
        fileInputRef.current?.click();
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };
    
    return (
        <div className="min-h-screen bg-[#050B14] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
                        Deploy Intelligence <span className="text-blue-500">In Seconds</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Upload raw datasets. LUMEN automatically infers schemas, sanitizes outliers, and engineers features for production-ready ML.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Upload Zone */}
                    <div className="lg:col-span-2">
                        <div 
                            className={`relative h-[400px] overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 ${dragActive ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 bg-slate-900/50 hover:border-blue-500/50'}`}
                            onDragEnter={() => setDragActive(true)}
                            onDragLeave={() => setDragActive(false)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault(); 
                                setDragActive(false);
                                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                    handleFile(e.dataTransfer.files[0]);
                                }
                            }}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={onFileChange} 
                                className="hidden" 
                                accept=".csv,.json,.xlsx,.xls,.parquet,.sqlite,.db"
                            />
                            
                            {isUploading ? (
                                <div className="w-full max-w-md space-y-6 text-center">
                                    <div className="relative h-4 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                        <div 
                                            className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300 ease-out"
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-blue-400 font-bold animate-pulse flex items-center justify-center gap-2">
                                        <Loader2 size={18} className="animate-spin" />
                                        Uploading Dataset... {uploadProgress}%
                                    </p>
                                </div>
                            ) : success ? (
                                <div className="text-center animate-bounce-in">
                                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                                        <CheckCircle2 size={40} className="text-green-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Upload Successful!</h3>
                                    <p className="text-slate-400">Redirecting to analysis dashboard...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-xl border border-slate-700 group-hover:scale-110 transition-transform">
                                        <UploadCloud size={40} className="text-blue-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Drop your dataset here</h3>
                                    <p className="text-slate-400 mb-8 text-center max-w-sm">
                                        CSV, Excel, JSON, Parquet, or SQLite. Up to 100MB.
                                    </p>
                                    <button 
                                        onClick={handleBrowseFiles}
                                        className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105"
                                    >
                                        Browse Local Files
                                    </button>
                                </>
                            )}

                            {error && (
                                <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-400 animate-shake max-w-md">
                                    <AlertCircle size={24} className="flex-shrink-0" />
                                    <div className="text-left text-sm">
                                        <p className="font-bold text-white">Upload Error</p>
                                        <p className="opacity-90">{error}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* History Sidebar */}
                    <div className="bg-dark-800/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col h-[400px] lg:h-auto overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Database size={20} className="text-blue-400" />
                                Recent Data
                            </h3>
                            <span className="text-xs font-mono text-slate-500">{datasets.length} Items</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {loadingDatasets ? (
                                <div className="flex flex-col items-center justify-center h-full space-y-3">
                                    <Loader2 className="animate-spin text-slate-600" size={32} />
                                    <p className="text-slate-500 text-sm">Loading history...</p>
                                </div>
                            ) : datasets.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 p-4">
                                    <FileText className="text-slate-700" size={48} />
                                    <p className="text-slate-500 text-sm">No datasets uploaded yet.</p>
                                </div>
                            ) : (
                                datasets.map((ds) => (
                                    <div 
                                        key={ds.id}
                                        onClick={() => navigate(`/dashboard/${ds.id}`)}
                                        className="group p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all cursor-pointer flex items-center gap-3 relative"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                            <FileText size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-200 truncate">{ds.original_filename || ds.filename}</p>
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">{ds.file_type} • {(ds.file_size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <button 
                                            onClick={(e) => handleDelete(e, ds.id)}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <ArrowRight size={14} className="text-slate-700 group-hover:text-blue-400 transform group-hover:translate-x-1 transition-all" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
                    {[
                        { title: "Smart Schema", desc: "Automatic detection of categorical, numeric, and date features.", icon: "🎯" },
                        { title: "Auto-Sanitize", desc: "Intelligent handling of missing values and statistical outliers.", icon: "🛡️" },
                        { title: "GDPR Ready", desc: "Data is encrypted in transit and at rest with PII detection.", icon: "🔒" }
                    ].map((feat, i) => (
                        <div key={i} className="p-6 bg-slate-900/40 rounded-2xl border border-white/5">
                            <div className="text-3xl mb-4">{feat.icon}</div>
                            <h4 className="text-white font-bold mb-2">{feat.title}</h4>
                            <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UploadPage;
