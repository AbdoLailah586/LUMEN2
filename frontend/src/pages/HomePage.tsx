import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Layers, Cpu, Zap } from 'lucide-react';

const HomePage = () => {
    return (
        <div className="min-h-full py-10 xl:py-20 relative">
            {/* Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
                <div className="space-y-8 animate-fade-in relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 text-sm font-semibold tracking-wide">
                        <Sparkles size={16} className="text-blue-400" />
                        LUMEN v2.0 is Live
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight text-balance">
                        Automate the <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600 animate-pulse-slow">Machine Learning</span> Lifecycle
                    </h1>
                    <p className="text-xl text-gray-400 max-w-lg leading-relaxed text-balance">
                        The ultimate progressive AutoML platform. Upload messy datasets and deploy production-ready XGBoost models in minutes.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <Link
                            to="/upload"
                            className="bg-blue-600 flex justify-center items-center gap-2 text-white font-bold py-4 px-8 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:shadow-[0_0_35px_rgba(37,99,235,0.7)] hover:bg-blue-500 transition-all duration-300 transform hover:-translate-y-1"
                        >
                            Start Free Trial
                            <ArrowRight size={20} />
                        </Link>
                        <Link
                            to="/dashboard"
                            className="bg-dark-800/80 backdrop-blur-md text-gray-200 border border-gray-700 font-bold py-4 px-8 rounded-xl shadow-lg hover:border-gray-500 hover:text-white hover:bg-dark-700 transition-all duration-300 flex justify-center items-center"
                        >
                            View Dashboard
                        </Link>
                    </div>
                </div>

                {/* Right Side Abstract Graphic */}
                <div className="relative animate-slide-up w-full max-w-lg mx-auto lg:mr-0">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-3xl blur-[80px] opacity-20 animate-pulse-slow"></div>
                    <div className="relative bg-dark-800/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden">
                        <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                            </div>
                            <span className="text-xs font-mono text-gray-500 ml-4">model_training.py</span>
                        </div>
                        <pre className="text-sm font-mono text-gray-300 leading-relaxed overflow-hidden">
                            <span className="text-pink-500">import</span> lumen <span className="text-pink-500">from</span> 'automl'<br/><br/>
                            <span className="text-blue-400">const</span> pipeline = lumen.<span className="text-yellow-200">init</span>({'{'}<br/>
                            &nbsp;&nbsp;dataset: <span className="text-green-400">'sales_data_q4.csv'</span>,<br/>
                            &nbsp;&nbsp;target: <span className="text-green-400">'revenue'</span>,<br/>
                            &nbsp;&nbsp;preset: <span className="text-green-400">'expert'</span><br/>
                            {'}'});<br/><br/>
                            <span className="text-gray-500">// Initiating Hyperparameter search</span><br/>
                            <span className="text-blue-400">await</span> pipeline.<span className="text-yellow-200">optimize</span>();<br/>
                            <span className="text-blue-400">const</span> model = pipeline.<span className="text-yellow-200">deploy</span>();
                        </pre>
                        <div className="absolute -bottom-4 -right-4 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1">
                            <Zap size={12} /> Optimization Complete
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Grid ("Bento Box") */}
            <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6 animate-slide-up" style={{animationDelay: '0.2s'}}>
                <Link 
                    to="/cleaning"
                    className="md:col-span-6 lg:col-span-4 p-8 bg-dark-800/50 backdrop-blur-lg rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] group cursor-pointer block"
                >
                    <div className="w-14 h-14 rounded-2xl bg-blue-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-blue-500/20">
                        <Layers className="text-blue-400" size={28} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-100 mb-3">1. Upload & Clean</h3>
                    <p className="text-gray-400 leading-relaxed font-medium">Drag and drop your data, handle missing values, outliers, and scaling automatically with our intelligent preprocessing pipeline.</p>
                </Link>

                <Link 
                    to="/training"
                    className="md:col-span-6 lg:col-span-4 p-8 bg-dark-800/50 backdrop-blur-lg rounded-3xl border border-white/5 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] group cursor-pointer block"
                >
                    <div className="w-14 h-14 rounded-2xl bg-cyan-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-cyan-500/20">
                        <Cpu className="text-cyan-400" size={28} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-100 mb-3">2. Train Models</h3>
                    <p className="text-gray-400 leading-relaxed font-medium">Choose logic from beginner heuristics to expert XGBoost & Optuna hyperparameter tuning without writing any boilerplate code.</p>
                </Link>

                <Link 
                    to="/results"
                    className="md:col-span-6 md:col-start-4 lg:col-span-4 p-8 bg-dark-800/50 backdrop-blur-lg rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)] group cursor-pointer block"
                >
                    <div className="w-14 h-14 rounded-2xl bg-indigo-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-indigo-500/20">
                        <Zap className="text-indigo-400" size={28} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-100 mb-3">3. Export & Deploy</h3>
                    <p className="text-gray-400 leading-relaxed font-medium">Evaluate with SHAP visual insights and download pure Python inference code instantly for your production servers.</p>
                </Link>
            </div>
        </div>
    );
};

export default HomePage;
