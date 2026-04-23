import React, { useState, useRef } from "react";

export const ImageUploadPanel: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [images, setImages] = useState<string[]>([]);
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const urls: string[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        urls.push(URL.createObjectURL(file));
      }
    });
    setImages((prev) => [...prev, ...urls]);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-5xl mx-auto shadow-xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
            Computer Vision Workspace
        </h2>
        <p className="text-slate-400 text-sm mt-2">
            Upload images for classification, object detection tuning, or segmentation.
        </p>
      </div>

      <div 
        className={`relative border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center transition-all duration-300 ${isDragging ? 'border-pink-500 bg-pink-500/5' : 'border-slate-700 hover:border-slate-500 bg-slate-800/30'}`}
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
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        
        <div className="bg-slate-800 p-4 rounded-full mb-4 shadow-lg">
            <svg className="w-10 h-10 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        </div>
        
        <h3 className="text-lg font-medium text-slate-200 mb-1">Drag & Drop visual assets</h3>
        <p className="text-slate-500 text-sm mb-6">Support for JPG, PNG, and JPEG files (Max 50MB)</p>
        
        <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium text-sm"
        >
            Browse Files
        </button>
      </div>

      {images.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase">Gallery Base ({images.length})</h3>
                <button className="text-pink-400 text-sm font-medium hover:text-pink-300">Open Annotation Tool &rarr;</button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {images.map((url, i) => (
                    <div key={i} className="aspect-square relative rounded-xl overflow-hidden group border border-slate-700">
                        <img src={url} alt={`Upload ${i}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button className="bg-red-500/80 text-white p-1.5 rounded-md hover:bg-red-500 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};
