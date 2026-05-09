import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Layers, Cpu, Zap, Shield, BarChart3, Upload, LogIn } from 'lucide-react';

const HomePage = () => {
    const isLoggedIn = !!localStorage.getItem('token');

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #05050A 0%, #0a0e1a 30%, #0d1526 60%, #05050A 100%)' }}>
            {/* Ambient background */}
            <div className="ambient-bg"></div>

            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)', animation: 'pulse 8s ease-in-out infinite' }} />
                <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-15"
                    style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)', animation: 'pulse 10s ease-in-out infinite 2s' }} />
                <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)', animation: 'pulse 6s ease-in-out infinite 4s' }} />
                
                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            </div>

            {/* Top Nav Bar */}
            <header className="relative z-20 flex items-center justify-between px-8 lg:px-16 py-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}>
                        <span className="font-heading font-bold text-white text-xl">L</span>
                    </div>
                    <span className="text-xl font-heading font-bold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                        LUMEN
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {isLoggedIn ? (
                        <Link
                            to="/dashboard"
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all duration-300"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 0 15px rgba(59,130,246,0.3)' }}
                        >
                            Go to Dashboard
                            <ArrowRight size={16} />
                        </Link>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-gray-300 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-300 text-sm font-medium"
                            >
                                <LogIn size={16} />
                                Sign In
                            </Link>
                            <Link
                                to="/login"
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all duration-300"
                                style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 0 15px rgba(59,130,246,0.3)' }}
                            >
                                Get Started
                                <ArrowRight size={16} />
                            </Link>
                        </>
                    )}
                </div>
            </header>

            {/* Hero Section */}
            <div className="relative z-10 max-w-7xl mx-auto px-8 lg:px-16 pt-16 lg:pt-28 pb-20">
                <div className="text-center max-w-4xl mx-auto space-y-8 animate-fade-in">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 text-sm font-semibold tracking-wide">
                        <Sparkles size={16} className="text-blue-400" />
                        LUMEN v3.0 — AI-Powered AutoML
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight">
                        Automate the{' '}
                        <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #60a5fa, #a78bfa, #34d399)' }}>
                            ML Lifecycle
                        </span>
                    </h1>

                    <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
                        The ultimate AI-augmented AutoML platform. Upload data, clean it with Gemini AI suggestions, train models with automated hyperparameter tuning, and deploy — all in one place.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Link
                            to="/login"
                            className="flex justify-center items-center gap-2 text-white font-bold py-4 px-10 rounded-xl transition-all transform hover:-translate-y-1"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 0 25px rgba(59,130,246,0.4)' }}
                        >
                            <Upload size={20} />
                            Start Now — It's Free
                        </Link>
                        <a
                            href="#features"
                            className="bg-white/5 backdrop-blur-md text-gray-200 border border-white/10 font-bold py-4 px-10 rounded-xl hover:bg-white/10 transition-all flex justify-center items-center gap-2"
                        >
                            Explore Features
                            <ArrowRight size={18} />
                        </a>
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <div id="features" className="relative z-10 max-w-7xl mx-auto px-8 lg:px-16 pb-32">
                <div className="text-center mb-16">
                    <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Everything You Need</h2>
                    <p className="text-gray-500 text-lg max-w-xl mx-auto">From raw data to deployed models — a complete ML workflow powered by AI.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        { icon: <Upload size={28} />, title: 'Smart Upload', desc: 'Drag & drop CSV, Excel, JSON, Parquet, XML, or SQLite files with automatic format detection.', color: 'blue', link: '/login' },
                        { icon: <Layers size={28} />, title: 'AI Data Cleaning', desc: 'Gemini AI detects outliers, suggests cleaning strategies, and purifies your signal from noise.', color: 'cyan', link: '/login' },
                        { icon: <Cpu size={28} />, title: 'AutoML Training', desc: 'Automated hyperparameter tuning for XGBoost, Random Forests, LightGBM, and Deep Learning.', color: 'amber', link: '/login' },
                        { icon: <BarChart3 size={28} />, title: 'Advanced EDA', desc: 'Interactive visualizations, correlation matrices, and statistical profiling of your datasets.', color: 'purple', link: '/login' },
                        { icon: <Zap size={28} />, title: 'SHAP Explainability', desc: 'Understand model decisions with feature importance and local SHAP explanations.', color: 'indigo', link: '/login' },
                        { icon: <Shield size={28} />, title: 'Enterprise Security', desc: 'User-scoped data isolation, rate limiting, and secure file validation out of the box.', color: 'emerald', link: '/login' },
                    ].map((feature, i) => {
                        const colorMap: Record<string, string> = {
                            blue: 'rgba(59,130,246,', cyan: 'rgba(6,182,212,', amber: 'rgba(245,158,11,',
                            purple: 'rgba(168,85,247,', indigo: 'rgba(99,102,241,', emerald: 'rgba(16,185,129,',
                        };
                        const c = colorMap[feature.color] || 'rgba(59,130,246,';
                        return (
                            <Link
                                key={i}
                                to={feature.link}
                                className="group p-8 rounded-3xl border border-white/5 backdrop-blur-lg transition-all duration-300 hover:-translate-y-1"
                                style={{ background: 'rgba(15,23,42,0.4)' }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = `${c}0.3)`}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                            >
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border transition-transform group-hover:scale-110"
                                    style={{ background: `${c}0.1)`, borderColor: `${c}0.2)`, color: `${c}1)` }}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                <p className="text-gray-400 leading-relaxed font-medium text-sm">{feature.desc}</p>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* CTA Section */}
            <div className="relative z-10 max-w-7xl mx-auto px-8 lg:px-16 pb-20">
                <div className="text-center p-12 rounded-3xl border border-white/5 backdrop-blur-xl"
                    style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))' }}>
                    <h2 className="text-3xl font-bold text-white mb-4">Ready to Illuminate Your Data?</h2>
                    <p className="text-gray-400 mb-8 max-w-lg mx-auto">Create a free account and start building ML models in minutes.</p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-white font-bold py-4 px-10 rounded-xl transition-all transform hover:-translate-y-1"
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 0 25px rgba(59,130,246,0.4)' }}
                    >
                        Get Started Free
                        <ArrowRight size={20} />
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/5 px-8 lg:px-16 py-8">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} LUMEN AutoML Platform. All rights reserved.</p>
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                            <span className="font-heading font-bold text-white text-xs">L</span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Inline animation */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 0.15; }
                    50% { transform: scale(1.1); opacity: 0.25; }
                }
            `}</style>
        </div>
    );
};

export default HomePage;
