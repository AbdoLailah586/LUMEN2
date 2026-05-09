import React, { useState, useRef } from "react";
import { Upload, X, Camera, Image as ImageIcon } from "lucide-react";

interface Props {
  onFilesSelected?: (files: File[]) => void;
}

export const ImageUploadPanel: React.FC<Props> = ({ onFilesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<{ url: string; name: string }[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(f => f.type.startsWith("image/"));
    if (validFiles.length === 0) return;

    const newPreviews = validFiles.map(f => ({
      url: URL.createObjectURL(f),
      name: f.name
    }));

    const updatedFiles = [...files, ...validFiles];
    setFiles(updatedFiles);
    setPreviews(prev => [...prev, ...newPreviews]);
    
    if (onFilesSelected) {
      onFilesSelected(updatedFiles);
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    
    // Revoke URL to avoid leaks
    URL.revokeObjectURL(previews[index].url);
    
    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
    
    if (onFilesSelected) {
      onFilesSelected(updatedFiles);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
      
      <div className="mb-6 relative">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 flex items-center gap-3">
            <Camera className="w-6 h-6 text-pink-500" />
            Computer Vision Workspace
        </h2>
        <p className="text-slate-400 text-sm mt-2">
            Upload images for classification, object detection tuning, or segmentation.
        </p>
      </div>

      <div 
        className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all duration-300 ${
            isDragging ? 'border-pink-500 bg-pink-500/5' : 'border-slate-800 hover:border-slate-600 bg-slate-950/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            accept="image/*"
            onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
        />
        
        <div className="bg-slate-900 p-4 rounded-2xl mb-4 shadow-xl border border-slate-800 group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8 text-pink-500" />
        </div>
        
        <h3 className="text-lg font-bold text-slate-200 mb-1">Drag & Drop visual assets</h3>
        <p className="text-slate-500 text-xs mb-6">Support for JPG, PNG, and WEBP (Max 50MB per file)</p>
        
        <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-8 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all font-bold text-xs shadow-lg border border-slate-700"
        >
            Browse Local Files
        </button>
      </div>

      {previews.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-800 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">Gallery Base — {previews.length} Items</h3>
                <button className="text-pink-500 text-[10px] font-black uppercase tracking-widest hover:text-pink-400 flex items-center gap-1.5">
                    Clear All <X className="w-3 h-3" onClick={() => {setFiles([]); setPreviews([]); onFilesSelected?.([]);}} />
                </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {previews.map((preview, i) => (
                    <div key={i} className="aspect-square relative rounded-xl overflow-hidden group border border-slate-800 bg-slate-950">
                        <img src={preview.url} alt={preview.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                            <button 
                                onClick={() => removeFile(i)}
                                className="bg-red-500/80 text-white p-2 rounded-lg hover:bg-red-500 transition-all scale-75 group-hover:scale-100 duration-300"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border border-dashed border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-slate-400 hover:border-slate-600 transition-all"
                >
                    <ImageIcon className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Add More</span>
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
