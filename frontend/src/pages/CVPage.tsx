import React, { useState } from "react";
import { ModelCard } from "../components/CV/ModelCard";
import { EnsembleSelector } from "../components/CV/EnsembleSelector";
import { FineTuneForm } from "../components/CV/FineTuneForm";
import { InferenceViewer } from "../components/CV/InferenceViewer";
import { Eye, Layers, Cpu, Zap, Sparkles, ChevronRight } from "lucide-react";

const TABS = [
  { id: "zoo", label: "Model Zoo", icon: Layers, desc: "Browse 20+ pre-trained models" },
  { id: "inference", label: "Inference", icon: Zap, desc: "Run predictions on images" },
  { id: "ensemble", label: "Ensemble", icon: Cpu, desc: "Merge multiple models" },
  { id: "finetune", label: "Fine-Tune", icon: Sparkles, desc: "Train on your data" },
] as const;

type TabId = typeof TABS[number]["id"];

export const CVPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("zoo");

  return (
    <div className="min-h-screen bg-[#050b14] p-4 md:p-8">
      <div className="max-w-[1440px] mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-pink-950/20 p-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-pink-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-3 font-medium">
                <Eye className="w-4 h-4 text-pink-400" />
                <span>Deep Learning</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-pink-400">Computer Vision</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Vision Engine Studio
              </h1>
              <p className="text-slate-400 text-sm mt-2 max-w-xl">
                Browse pre-trained models, run ensemble inference, fine-tune with your images, and deploy production-ready CV pipelines.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                PyTorch Backend Ready
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`cv-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-pink-500/20 to-violet-500/20 text-white border border-pink-500/30 shadow-lg shadow-pink-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-pink-400" : ""}`} />
                <span>{tab.label}</span>
                <span className={`hidden md:inline text-xs ${isActive ? "text-slate-400" : "text-slate-600"}`}>
                  — {tab.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div className="min-h-[600px]">
          {activeTab === "zoo" && <ModelZooTab />}
          {activeTab === "inference" && <InferenceViewer />}
          {activeTab === "ensemble" && <EnsembleSelector />}
          {activeTab === "finetune" && <FineTuneForm />}
        </div>
      </div>
    </div>
  );
};

/* ── Model Zoo Tab ── */
const ModelZooTab: React.FC = () => {
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("accuracy");
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const { getCVModels } = await import("../services/api");
      const taskType = taskFilter === "all" ? undefined : taskFilter;
      const maxSize = sizeFilter === "light" ? 50 : sizeFilter === "medium" ? 200 : undefined;
      const res = await getCVModels(taskType, maxSize, sortBy);
      setModels(res.models || []);
    } catch {
      // Fallback: show static catalog
      setModels(STATIC_MODELS);
    }
    setLoading(false);
  };

  React.useEffect(() => { fetchModels(); }, [taskFilter, sizeFilter, sortBy]);

  const TASK_OPTIONS = [
    { value: "all", label: "All Tasks" },
    { value: "classification", label: "Classification" },
    { value: "detection", label: "Detection" },
    { value: "segmentation", label: "Segmentation" },
  ];

  const SIZE_OPTIONS = [
    { value: "all", label: "Any Size" },
    { value: "light", label: "Lightweight (<50 MB)" },
    { value: "medium", label: "Medium (<200 MB)" },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Filters</span>
        <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
          {TASK_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTaskFilter(opt.value)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                taskFilter === opt.value
                  ? "bg-pink-500 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select
          value={sizeFilter}
          onChange={(e) => setSizeFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-pink-500"
        >
          {SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-pink-500"
        >
          <option value="accuracy">Sort: Accuracy ↓</option>
          <option value="speed">Sort: Speed ↓</option>
          <option value="size">Sort: Size ↑</option>
          <option value="name">Sort: Name A-Z</option>
        </select>
        <div className="ml-auto text-xs text-slate-500">
          {models.length} model{models.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Model Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {models.map((m) => (
            <ModelCard key={m.slug} model={m} />
          ))}
        </div>
      )}
    </div>
  );
};

/* Static fallback catalog when API is unreachable */
const STATIC_MODELS = [
  { slug: "resnet50", name: "ResNet-50", task_type: "classification", backbone: "resnet50", input_size: 224, accuracy: 76.1, speed_fps: 950, model_size_mb: 97.8, license: "BSD-3-Clause", source: "torchvision", description: "Deep residual network with 50 layers.", tags: ["balanced", "popular"] },
  { slug: "efficientnet_b0", name: "EfficientNet-B0", task_type: "classification", backbone: "efficientnet_b0", input_size: 224, accuracy: 77.1, speed_fps: 1200, model_size_mb: 20.5, license: "Apache-2.0", source: "timm", description: "Compact and efficient.", tags: ["lightweight", "fast"] },
  { slug: "vit_base", name: "ViT-B/16", task_type: "classification", backbone: "vit_base_patch16_224", input_size: 224, accuracy: 81.8, speed_fps: 310, model_size_mb: 330.0, license: "Apache-2.0", source: "timm", description: "Transformer-based architecture.", tags: ["transformer", "sota"] },
  { slug: "mobilenetv3_small", name: "MobileNetV3 Small", task_type: "classification", backbone: "mobilenetv3_small", input_size: 224, accuracy: 67.7, speed_fps: 2800, model_size_mb: 6.9, license: "BSD-3-Clause", source: "torchvision", description: "Ultra-lightweight for mobile/edge.", tags: ["lightweight", "mobile", "edge"] },
  { slug: "yolov8n", name: "YOLOv8 Nano", task_type: "detection", backbone: "yolov8n", input_size: 640, accuracy: 37.3, speed_fps: 3200, model_size_mb: 6.2, license: "AGPL-3.0", source: "ultralytics", description: "Ultra-fast nano detector.", tags: ["fast", "real-time"] },
  { slug: "yolov8s", name: "YOLOv8 Small", task_type: "detection", backbone: "yolov8s", input_size: 640, accuracy: 44.9, speed_fps: 1800, model_size_mb: 22.5, license: "AGPL-3.0", source: "ultralytics", description: "Good balance for detection.", tags: ["balanced"] },
  { slug: "yolov8m", name: "YOLOv8 Medium", task_type: "detection", backbone: "yolov8m", input_size: 640, accuracy: 50.2, speed_fps: 1000, model_size_mb: 52.0, license: "AGPL-3.0", source: "ultralytics", description: "Higher accuracy detection.", tags: ["accurate"] },
  { slug: "deeplabv3_resnet50", name: "DeepLabV3+ (ResNet-50)", task_type: "segmentation", backbone: "deeplabv3_resnet50", input_size: 520, accuracy: 66.4, speed_fps: 95, model_size_mb: 160.5, license: "BSD-3-Clause", source: "torchvision", description: "Strong general-purpose segmenter.", tags: ["accurate", "semantic"] },
  { slug: "unet_resnet34", name: "U-Net (ResNet-34)", task_type: "segmentation", backbone: "unet_resnet34", input_size: 256, accuracy: 62.0, speed_fps: 200, model_size_mb: 89.0, license: "MIT", source: "torchvision", description: "Popular in medical imaging.", tags: ["medical"] },
];

export default CVPage;
