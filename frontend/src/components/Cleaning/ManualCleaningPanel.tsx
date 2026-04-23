import React, { useState } from "react";

interface CleaningConfig {
  imputation: string;
  outlierMethod: string;
  outlierAction: string;
}

export const ManualCleaningPanel: React.FC = () => {
  const [selectedColumn, setSelectedColumn] = useState<string>("Age");
  const [config, setConfig] = useState<CleaningConfig>({
    imputation: "mean",
    outlierMethod: "zscore",
    outlierAction: "cap",
  });

  const handleApply = async () => {
    // API call mock
    console.log("Applying to backend: ", config);
    alert("Cleaning configuration applied!");
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)] max-w-3xl mx-auto text-slate-100">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
            Intelligent Data Cleaning
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Manually override automated cleaning inferences
          </p>
        </div>
        <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Column Selection */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">Select Target Column</label>
          <select 
            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            value={selectedColumn} 
            onChange={(e) => setSelectedColumn(e.target.value)}
          >
            <option value="Age">Age (Numerical)</option>
            <option value="Fare">Fare (Numerical)</option>
            <option value="Embarked">Embarked (Categorical)</option>
          </select>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mt-6">
            <h4 className="text-blue-400 font-semibold text-sm mb-2">Column Statistics</h4>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Missing Values:</span>
              <span className="text-slate-200 font-mono">17%</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-400">Detected Outliers:</span>
              <span className="text-red-400 font-mono">4.2%</span>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">Missing Imputation Strategy</label>
            <div className="grid grid-cols-3 gap-2">
              {['mean', 'median', 'mode'].map((strat) => (
                <button 
                  key={strat}
                  onClick={() => setConfig({...config, imputation: strat})}
                  className={`py-2 px-3 rounded-lg text-sm transition-all ${config.imputation === strat ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  {strat.charAt(0).toUpperCase() + strat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">Outlier Detection</label>
            <select 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              value={config.outlierMethod}
              onChange={(e) => setConfig({...config, outlierMethod: e.target.value})}
            >
              <option value="zscore">Z-Score (Standard Deviation)</option>
              <option value="iqr">Interquartile Range (IQR)</option>
              <option value="isolation_forest">Isolation Forest (ML Based)</option>
            </select>
          </div>
          
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">Outlier Action</label>
            <div className="flex rounded-xl overflow-hidden border border-white/10">
              <button 
                onClick={() => setConfig({...config, outlierAction: 'cap'})}
                className={`flex-1 py-2 text-sm transition-colors ${config.outlierAction === 'cap' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                Cap Values
              </button>
              <div className="w-px bg-white/10"></div>
              <button 
                onClick={() => setConfig({...config, outlierAction: 'drop'})}
                className={`flex-1 py-2 text-sm transition-colors ${config.outlierAction === 'drop' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                Drop Rows
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/10 flex justify-end space-x-4">
        <button className="px-6 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white transition-all text-sm font-medium">
          Preview Changes
        </button>
        <button 
          onClick={handleApply}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/25 transition-all text-sm font-medium"
        >
          Apply Cleaning Settings
        </button>
      </div>
    </div>
  );
};
