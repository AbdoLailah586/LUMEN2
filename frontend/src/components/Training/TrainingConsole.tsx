import React, { useEffect, useRef } from "react";
import { Terminal, Code2, CheckCircle2, AlertCircle, Info, Loader2 } from "lucide-react";

export interface TrainingLogEntry {
    timestamp: string;
    type: string;
    message: string;
    code?: string;
}

interface Props {
    logs: TrainingLogEntry[];
    currentStep?: string;
    isRunning: boolean;
    progress: number;
}

const typeIcon = (type: string) => {
    switch (type) {
        case "code": return <Code2 size={13} className="text-cyan-400" />;
        case "success": return <CheckCircle2 size={13} className="text-emerald-400" />;
        case "error": return <AlertCircle size={13} className="text-red-400" />;
        case "system": return <Terminal size={13} className="text-violet-400" />;
        default: return <Info size={13} className="text-blue-400" />;
    }
};

const formatTime = (iso: string) => {
    try {
        return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
        return "";
    }
};

export const TrainingConsole: React.FC<Props> = ({ logs, currentStep, isRunning, progress }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs.length]);

    const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

    return (
        <div className="bg-slate-950/80 border border-white/10 rounded-3xl overflow-hidden flex flex-col h-[480px]">
            {/* Title bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-slate-900/80">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500/80" />
                        <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                        <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Terminal size={14} className="text-cyan-400" />
                        Training Notebook
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {currentStep && (
                        <span className="text-[10px] font-mono text-indigo-400 uppercase">{currentStep}</span>
                    )}
                    {isRunning && <Loader2 size={14} className="animate-spin text-blue-400" />}
                    <span className="text-xs font-bold text-white font-mono">{clampedProgress}%</span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-slate-800">
                <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${clampedProgress}%` }}
                />
            </div>

            {/* Log cells */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar font-mono text-xs">
                {logs.length === 0 && (
                    <p className="text-slate-600 italic text-center py-8">
                        Waiting for training to start...
                    </p>
                )}

                {logs.map((entry, idx) => (
                    <div key={idx} className="animate-fade-in">
                        {/* Markdown-style cell header */}
                        <div className="flex items-center gap-2 mb-1.5 text-slate-500">
                            {typeIcon(entry.type)}
                            <span className="text-[10px]">[{formatTime(entry.timestamp)}]</span>
                            <span className={`text-[10px] uppercase font-bold ${
                                entry.type === "error" ? "text-red-400" :
                                entry.type === "success" ? "text-emerald-400" :
                                entry.type === "code" ? "text-cyan-400" : "text-slate-400"
                            }`}>
                                {entry.type}
                            </span>
                        </div>

                        {entry.code ? (
                            <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden">
                                <div className="px-3 py-1.5 bg-slate-800/60 border-b border-white/5 text-[10px] text-slate-500">
                                    Python
                                </div>
                                <pre className="p-3 text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                                    {entry.code}
                                </pre>
                                {entry.message && (
                                    <div className="px-3 py-2 border-t border-white/5 text-slate-400 text-[11px]">
                                        # {entry.message}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className={`pl-5 ${
                                entry.type === "error" ? "text-red-300" :
                                entry.type === "success" ? "text-emerald-300" : "text-slate-300"
                            }`}>
                                {entry.message}
                            </p>
                        )}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};

export default TrainingConsole;
