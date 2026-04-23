import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, Eraser, Activity, FileBarChart, Monitor } from 'lucide-react';

const Layout = () => {
    const location = useLocation();

    const navItems = [
        { path: '/', name: 'Home', icon: Monitor },
        { path: '/upload', name: 'Upload', icon: UploadCloud },
        { path: '/cleaning', name: 'Cleaning', icon: Eraser },
        { path: '/training', name: 'Training', icon: Activity },
        { path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard },
        { path: '/results', name: 'Results', icon: FileBarChart },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-dark-900 text-gray-100 font-sans">
            <div className="ambient-bg"></div>

            {/* Left Glassmorphic Sidebar */}
            <aside className="w-64 h-full flex flex-col bg-dark-800/40 backdrop-blur-2xl border-r border-white/5 shrink-0 z-20">
                <div className="p-6 flex items-center gap-3 border-b border-white/5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.6)] animate-pulse-slow">
                        <span className="font-heading font-bold text-white text-lg">L</span>
                    </div>
                    <span className="text-xl font-heading font-bold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                        LUMEN
                    </span>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const active = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                                    active 
                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                                    : 'text-gray-400 hover:text-gray-100 hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                <Icon size={20} className={active ? "text-blue-400" : "text-gray-500"} />
                                <span className={active ? "font-semibold block" : "font-medium block"}>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="px-4 py-4 border-t border-white/5">
                    <button 
                        onClick={() => {
                            localStorage.removeItem('token');
                            window.location.href = '/login';
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 font-medium"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Sign Out
                    </button>
                    <p className="text-xs text-center text-gray-600 font-medium mt-4">
                        &copy; {new Date().getFullYear()} LUMEN AutoML
                    </p>
                </div>
            </aside>

            {/* Right Main Content Area */}
            <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative z-10 scroll-smooth">
                <div className="max-w-7xl mx-auto p-8 lg:p-12 animate-fade-in">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
