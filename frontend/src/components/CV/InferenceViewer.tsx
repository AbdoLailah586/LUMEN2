import React, { useState, useRef, useEffect } from "react";
import { Zap, Upload, Search, Trash2, Camera } from "lucide-react";
import { getCVModels, runCVInference } from "../../services/api";

export const InferenceViewer: React.FC = () => {
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [models, setModels] = useState<any[]>([]);
    const [selectedModel, setSelectedModel] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const res = await getCVModels();
                setModels(res.models || []);
                if (res.models && res.models.length > 0) setSelectedModel(res.models[0].slug);
            } catch (error) {
                console.error("Failed to fetch models", error);
            }
        };
        fetchModels();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreview(URL.createObjectURL(file));
            setResult(null);
        }
    };

    const handleRunInference = async () => {
        if (!image || !selectedModel) return;
        setLoading(true);
        try {
            const res = await runCVInference(image, selectedModel);
            setResult(res.result);
            if (res.result.task === "detection") {
                drawBoundingBoxes(res.result.detections);
            }
        } catch (error) {
            console.error("Inference failed", error);
        }
        setLoading(false);
    };

    const drawBoundingBoxes = (detections: any[]) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx || !preview) return;

        const img = new Image();
        img.src = preview;
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            detections.forEach(det => {
                const [x1, y1, x2, y2] = det.bbox;
                ctx.strokeStyle = "#ec4899"; // pink-500
                ctx.lineWidth = Math.max(img.width / 200, 2);
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

                ctx.fillStyle = "#ec4899";
                const fontSize = Math.max(img.width / 50, 12);
                ctx.font = `bold ${fontSize}px Inter, sans-serif`;
                const label = `${det.class} ${Math.round(det.confidence * 100)}%`;
                const textWidth = ctx.measureText(label).width;
                ctx.fillRect(x1, y1 - fontSize - 5, textWidth + 10, fontSize + 5);
                
                ctx.fillStyle = "white";
                ctx.fillText(label, x1 + 5, y1 - 5);
            });
        };
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* LHS: Image Viewer */}
            <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm shadow-2xl relative flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center border border-pink-500/20">
                                <Camera className="w-5 h-5 text-pink-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Visual Inspector</h2>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Inference Pipeline</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <select 
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-pink-500 min-w-[150px]"
                            >
                                {models.map(m => (
                                    <option key={m.slug} value={m.slug}>{m.name}</option>
                                ))}
                            </select>
                            <button 
                                onClick={handleRunInference}
                                disabled={loading || !image}
                                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                                    loading || !image 
                                    ? "bg-slate-800 text-slate-600" 
                                    : "bg-pink-500 text-white shadow-lg shadow-pink-500/20 hover:bg-pink-400"
                                }`}
                            >
                                {loading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-3 h-3 fill-white" />}
                                Run Inference
                            </button>
                        </div>
                    </div>

                    <div className="relative flex-1 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden group">
                        {preview ? (
                            <div className="w-full h-full flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                                {result?.task === "detection" ? (
                                    <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
                                ) : (
                                    <img src={preview} className="max-w-full max-h-full object-contain" />
                                )}
                                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => {setImage(null); setPreview(null); setResult(null);}} className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg backdrop-blur-sm">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                                <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Upload className="w-8 h-8 text-slate-700" />
                                </div>
                                <h3 className="text-slate-300 font-bold mb-2">No Image Selected</h3>
                                <p className="text-xs text-slate-500 max-w-xs">Upload a photo to analyze. Supports Classification, Object Detection, and Semantic Segmentation.</p>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/*" />
                                <button className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors">Browse Files</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* RHS: Intelligence Results */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm h-full flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-800 pb-4">Predictions</h3>
                    
                    {!result && !loading && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-50">
                            <Search className="w-10 h-10 text-slate-700 mb-4" />
                            <p className="text-xs text-slate-500">Awaiting inference output from the vision engine.</p>
                        </div>
                    )}

                    {loading && (
                        <div className="flex-1 space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    )}

                    {result && (
                        <div className="flex-1 space-y-6 animate-in fade-in duration-500">
                            {result.task === "classification" && (
                                <div className="space-y-4">
                                    {result.predictions.map((p: any, i: number) => (
                                        <div key={i} className={`p-4 rounded-2xl border transition-all ${i === 0 ? "bg-pink-500/10 border-pink-500/30" : "bg-slate-800/30 border-slate-800"}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className={`text-xs font-bold ${i === 0 ? "text-white" : "text-slate-400"}`}>{p.class_id}</span>
                                                <span className={`text-[10px] font-black ${i === 0 ? "text-pink-400" : "text-slate-500"}`}>{Math.round(p.confidence * 100)}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-1000 ${i === 0 ? "bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]" : "bg-slate-700"}`} 
                                                    style={{ width: `${p.confidence * 100}%` }} 
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {result.task === "detection" && (
                                <div className="space-y-3">
                                    <div className="p-4 bg-pink-500/10 border border-pink-500/30 rounded-2xl mb-6">
                                        <p className="text-[10px] text-pink-400 font-bold uppercase tracking-widest mb-1">Total Objects</p>
                                        <p className="text-3xl font-black text-white">{result.detections.length}</p>
                                    </div>
                                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                        {result.detections.map((d: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-slate-800/40 border border-slate-800 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-pink-500" />
                                                    <span className="text-xs font-bold text-white capitalize">{d.class}</span>
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-500">{(d.confidence * 100).toFixed(1)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Meta Info */}
                            <div className="mt-auto pt-6 border-t border-slate-800">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Latency</p>
                                        <p className="text-xs font-bold text-white">42ms</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Architecture</p>
                                        <p className="text-xs font-bold text-white uppercase">{selectedModel.split('_')[0]}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
