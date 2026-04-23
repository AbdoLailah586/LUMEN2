import React, { useState } from "react";

export const FeatureEngineeringPanel: React.FC = () => {
  const [columns] = useState(["Age", "Fare", "Embarked", "Name", "Ticket"]);
  const [selectedColumn, setSelectedColumn] = useState<string>("Embarked");
  const [encodingType, setEncodingType] = useState("onehot");
  
  const [formula, setFormula] = useState("");
  const [newColName, setNewColName] = useState("");

  const handleCreateFeature = () => {
    alert(`Feature ${newColName} created with formula: ${formula}`);
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 text-slate-100 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-500">
            Feature Engineering
          </h2>
          <p className="text-slate-400 text-sm mt-1">Transform raw data into model-ready signals</p>
        </div>
        <div className="h-12 w-12 rounded-full bg-teal-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Encoding Section */}
        <div className="bg-slate-900/50 rounded-xl p-5 border border-white/5">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center">
             Categorical Encoding
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Select Categorical Column</label>
              <select 
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-teal-500 outline-none transition-all"
                value={selectedColumn}
                onChange={e => setSelectedColumn(e.target.value)}
              >
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Encoding Strategy</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                    {id: 'onehot', label: 'One-Hot'}, 
                    {id: 'label', label: 'Label'}, 
                    {id: 'frequency', label: 'Frequency'}, 
                    {id: 'target', label: 'Target'}
                ].map(enc => (
                  <button 
                    key={enc.id}
                    onClick={() => setEncodingType(enc.id)}
                    className={`py-2 px-3 rounded-lg text-sm transition-all text-center ${encodingType === enc.id ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-inner' : 'bg-slate-800/80 text-slate-400 border border-transparent hover:bg-slate-700'}`}
                  >
                    {enc.label}
                  </button>
                ))}
              </div>
            </div>
            
            <button className="w-full mt-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-200 transition-colors">
                Apply Encoding
            </button>
          </div>
        </div>

        {/* Math Formulation Section */}
        <div className="bg-slate-900/50 rounded-xl p-5 border border-white/5">
          <h3 className="text-lg font-medium text-white mb-4">Formula Synthesizer</h3>
          
          <div className="space-y-4">
             <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">New Column Name</label>
              <input 
                type="text" 
                placeholder="e.g. TotalFamilySize"
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Mathematical Formula</label>
              <div className="relative">
                <input 
                    type="text" 
                    placeholder="[SibSp] + [Parch] + 1"
                    value={formula}
                    onChange={e => setFormula(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-amber-200 font-mono focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">Wrap column names in brackets. Supported ops: +, -, *, /, log, sqrt</p>
            </div>

            <button 
                onClick={handleCreateFeature}
                className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-teal-500/20"
            >
                Synthesize Feature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
