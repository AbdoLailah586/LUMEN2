import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../services/api';
import { Loader2 } from 'lucide-react';

const LoginPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegistering) {
                await register({ email, password, full_name: fullName });
            }
            
            const params = new URLSearchParams();
            params.append('username', email);
            params.append('password', password);
            
            const data = await login(params);
            if (data.access_token) {
                localStorage.setItem('token', data.access_token);
                navigate('/dashboard', { replace: true });
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Authentication failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center relative">
            {/* Background glowing effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -z-10 animate-blob"></div>
            
            <div className="w-full max-w-md bg-dark-800/60 backdrop-blur-2xl p-10 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 relative z-10 animate-slide-up">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 mb-4 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                        <span className="font-heading font-bold text-white text-2xl">L</span>
                    </div>
                    <h2 className="text-3xl font-heading font-bold text-gray-100 mb-2 tracking-tight">
                        {isRegistering ? 'Create Account' : 'Welcome Back'}
                    </h2>
                    <p className="text-gray-400 text-sm">
                        {isRegistering ? 'Join LUMEN to start modeling data' : 'Sign in to your LUMEN account'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center font-medium shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {isRegistering && (
                        <div className="space-y-1.5 animate-fade-in">
                            <label className="block text-sm font-medium text-gray-300">Full Name</label>
                            <input
                                type="text"
                                required
                                className="w-full p-3.5 border border-white/10 bg-dark-900/80 text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-inner placeholder-gray-600"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-300">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full p-3.5 border border-white/10 bg-dark-900/80 text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-inner placeholder-gray-600"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-300">Password</label>
                            {!isRegistering && <a href="#" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Forgot password?</a>}
                        </div>
                        <input
                            type="password"
                            required
                            className="w-full p-3.5 border border-white/10 bg-dark-900/80 text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-inner placeholder-gray-600"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-500 transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] mt-2 flex items-center justify-center disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (isRegistering ? 'Create Account' : 'Sign In')}
                    </button>
                </form>
                <div className="mt-8 text-center text-sm text-gray-400 border-t border-white/5 pt-6">
                    {isRegistering ? "Already have an account?" : "Don't have an account?"} 
                    <button 
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError('');
                        }}
                        className="font-semibold text-blue-400 hover:text-blue-300 hover:underline transition-colors ml-1"
                    >
                        {isRegistering ? 'Sign in' : 'Sign up'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
