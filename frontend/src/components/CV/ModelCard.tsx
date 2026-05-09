import React, { useState } from "react";
import { Cpu, Zap, HardDrive, Scale, Download, CheckCircle2 } from "lucide-react";

interface ModelData {
  slug: string;
  name: string;
  task_type: string;
  backbone: string;
  input_size: number;
  accuracy: number;
  speed_fps: number;
  model_size_mb: number;
  license: string;
  source: string;
  description: string;
  tags?: string[];
}

interface Props {
  model: ModelData;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (slug: string) => void;
  onLoad?: (slug: string) => void;
}

const TASK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  classification: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30" },
  detection: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  segmentation: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
};

const SOURCE_LABELS: Record<string, string> = {
  torchvision: "TorchVision",
  timm: "TIMM",
  ultralytics: "Ultralytics",
  transformers: "HuggingFace",
};

export const ModelCard: React.FC<Props> = ({ model, selectable, selected, onSelect, onLoad }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const colors = TASK_COLORS[model.task_type] || TASK_COLORS.classification;

  const handleLoad = async () => {
    setIsLoading(true);
    if (onLoad) onLoad(model.slug);
    // Simulate load delay for UX
    await new Promise((r) => setTimeout(r, 800));
    setIsLoaded(true);
    setIsLoading(false);
  };

  const accPct = Math.min(model.accuracy, 100);
  const speedNorm = Math.min(model.speed_fps / 3200, 1) * 100;

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden ${
        selected
          ? "border-pink-500 bg-pink-500/5 shadow-lg shadow-pink-500/10"
          : "border-slate-800 bg-slate-900 hover:border-slate-600 hover:shadow-xl hover:shadow-slate-900/50"
      }`}
    >
      {/* Glassmorphism shimmer on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="relative p-5 space-y-4">
        {/* Top: Name + Task Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate group-hover:text-pink-300 transition-colors">
              {model.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{SOURCE_LABELS[model.source] || model.source}</p>
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text} border ${colors.border}`}>
            {model.task_type}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{model.description}</p>

        {/* Metrics */}
        <div className="space-y-2.5">
          {/* Accuracy */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 flex items-center gap-1"><Scale className="w-3 h-3" /> Accuracy</span>
              <span className="text-white font-semibold">{model.accuracy}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all duration-700" style={{ width: `${accPct}%` }} />
            </div>
          </div>

          {/* Speed */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 flex items-center gap-1"><Zap className="w-3 h-3" /> Speed</span>
              <span className="text-white font-semibold">{model.speed_fps.toLocaleString()} FPS</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-700" style={{ width: `${speedNorm}%` }} />
            </div>
          </div>

          {/* Info Row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> {model.model_size_mb} MB</span>
              <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {model.input_size}px</span>
            </div>
            <span className="text-[10px] text-slate-600">{model.license}</span>
          </div>
        </div>

        {/* Tags */}
        {model.tags && model.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {model.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-400">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {selectable ? (
            <button
              onClick={() => onSelect?.(model.slug)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                selected
                  ? "bg-pink-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              {selected ? <><CheckCircle2 className="w-3.5 h-3.5" /> Selected</> : "Select"}
            </button>
          ) : (
            <button
              onClick={handleLoad}
              disabled={isLoading || isLoaded}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isLoaded
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : isLoading
                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-wait"
                  : "bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:from-pink-400 hover:to-violet-400 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30"
              }`}
            >
              {isLoaded ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /> Loaded</>
              ) : isLoading ? (
                <><div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" /> Loading...</>
              ) : (
                <><Download className="w-3.5 h-3.5" /> Load Model</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
