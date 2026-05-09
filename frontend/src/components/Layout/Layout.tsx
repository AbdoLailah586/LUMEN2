import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, Eraser, Activity, FileBarChart, LogOut, Home, Eye, Sparkles } from 'lucide-react';

const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const navItems = [
        { path: '/', name: 'Home', icon: Home },
        { path: '/upload', name: 'Upload', icon: UploadCloud },
        { path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard },
        { path: '/cleaning', name: 'Cleaning', icon: Eraser },
        { path: '/features', name: 'Features', icon: Sparkles },
        { path: '/training', name: 'Training', icon: Activity },
        { path: '/vision', name: 'Vision Engine', icon: Eye },
        { path: '/results', name: 'Results', icon: FileBarChart },
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login', { replace: true });
    };

    // Check if a path is active (exact match or starts-with for sub-routes)
    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    return (
        <div className="flex h-screen overflow-hidden bg-dark-900 text-gray-100 font-sans">
            <div className="ambient-bg"></div>

            {/* Left Glassmorphic Sidebar */}
            <aside className="w-64 h-full flex flex-col bg-dark-800/40 backdrop-blur-2xl border-r border-white/5 shrink-0 z-20">
                {/* Logo */}
                <div className="p-6 flex items-center gap-3 border-b border-white/5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.6)] animate-pulse-slow">
                        <span className="font-heading font-bold text-white text-lg">L</span>
                    </div>
                    <span className="text-xl font-heading font-bold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                        LUMEN
                    </span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto">
                    <p className="text-[10px] uppercase font-bold text-gray-600 tracking-widest px-4 mb-3">Navigation</p>
                    {navItems.map((item) => {
                        const active = isActive(item.path);
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

                {/* Bottom: Logout */}
                <div className="px-4 py-4 border-t border-white/5">
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 font-medium"
                    >
                        <LogOut size={20} />
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
