import React, { useState } from "react";
import { ImageUploadPanel } from "../components/CV/ImageUploadPanel";

export const CVPage: React.FC = () => {
    const [task, setTask] = useState("classification");

    return (
        <div className="min-h-screen bg-[#050b14] p-8">
            <div className="max-w-7xl mx-auto space-y-12">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                    <div>
                        <div className="flex items-center space-x-3 text-slate-500 text-sm mb-2 font-medium">
                            <span>Deep Learning</span>
                            <span>/</span>
                            <span className="text-pink-500">Computer Vision</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight">Vision Engine Studio</h1>
                    </div>
                    <button className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-pink-500/25">
                        Start GPU Cluster &rarr;
                    </button>
                </div>

                {/* Configuration Options */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl w-full flex flex-wrap gap-4 items-center">
                     <h3 className="text-slate-300 font-bold mr-4">Target Task </h3>
                     <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                         {["classification", "detection", "segmentation"].map(t => (
                             <button
                                key={t}
                                onClick={() => setTask(t)}
                                className={`px-5 py-2 text-sm font-medium rounded-md capitalize transition-colors ${task === t ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                             >
                                 {t.replace('_', ' ')}
                             </button>
                         ))}
                     </div>
                     <p className="text-slate-500 text-sm ml-auto mr-4 hidden md:block">Depending on task, different PyTorch nodes are invoked.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LHS: Upload Array */}
                    <div className="lg:col-span-8 flex flex-col">
                        <ImageUploadPanel />
                    </div>

                    {/* RHS: Backbone Tuning */}
                    <div className="lg:col-span-4 space-y-6">
                        
                         <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden h-full">
                            <h3 className="text-lg font-bold text-slate-300 mb-6 drop-shadow-md border-b border-slate-800 pb-4">Backend PyTorch Config</h3>
                            
                            <div className="space-y-5">
                                 <div>
                                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Backbone Architecture</label>
                                     <select className="w-full bg-slate-800 border border-slate-700 text-slate-300 rounded-lg p-2.5 text-sm focus:border-pink-500 outline-none">
                                        {task === "classification" && (
                                            <>
                                            <option>ResNet-50</option>
                                            <option>EfficientNet-B0</option>
                                            </>
                                        )}
                                        {task === "detection" && (
                                            <>
                                            <option>YOLOv8 Nano (Fast)</option>
                                            <option>YOLOv8 Large (Accurate)</option>
                                            </>
                                        )}
                                        {task === "segmentation" && (
                                            <>
                                            <option>DeepLabV3 ResNet50</option>
                                            <option>U-Net baseline</option>
                                            </>
                                        )}
                                     </select>
                                 </div>

                                 <div>
                                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2 flex justify-between">
                                         <span>Epochs</span>
                                         <span className="text-pink-400">50</span>
                                     </label>
                                     <input type="range" min="1" max="250" defaultValue="50" className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                                 </div>

                                 {task === "classification" && (
                                     <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl mt-6">
                                        <label className="flex items-center space-x-3 cursor-pointer">
                                            <input type="checkbox" defaultChecked className="form-checkbox h-5 w-5 text-pink-500 rounded border-slate-600 bg-slate-900 checked:bg-pink-500 focus:ring-0 focus:ring-offset-0" />
                                            <span className="text-slate-300 font-medium text-sm">Transfer Learning Pre-Trained Weights</span>
                                        </label>
                                        <p className="text-xs text-slate-500 mt-2 ml-8">Will extract features from ImageNet weights and only train the final FC head.</p>
                                     </div>
                                 )}

                                <button className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition-colors font-medium text-sm">
                                    Advanced Augmentation Log...
                                </button>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
