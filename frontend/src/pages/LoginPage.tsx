import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register, googleLogin } from '../services/api';
import { Loader2, Eye, EyeOff, Shield, Zap, BarChart3 } from 'lucide-react';

// Google Identity Services type declarations
declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: any) => void;
                    renderButton: (element: HTMLElement, config: any) => void;
                    prompt: () => void;
                };
            };
        };
    }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const getErrorMessage = (err: any, fallback: string) => {
    const detail = err.response?.data?.detail;
    if (!detail) return fallback;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        return detail.map((item) => item.msg || item.message || String(item)).join('. ');
    }
    return fallback;
};

const LoginPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const googleButtonRef = useRef<HTMLDivElement>(null);

    // Handle Google Sign-In callback
    const handleGoogleResponse = useCallback(async (response: any) => {
        if (!response.credential) return;
        
        setGoogleLoading(true);
        setError('');

        try {
            const data = await googleLogin(response.credential);
            if (data.access_token) {
                localStorage.setItem('token', data.access_token);
                navigate('/dashboard', { replace: true });
            }
        } catch (err: any) {
            setError(getErrorMessage(err, 'Google authentication failed. Please try again.'));
        } finally {
            setGoogleLoading(false);
        }
    }, [navigate]);

    // Initialize Google Identity Services
    useEffect(() => {
        const initializeGoogleSignIn = () => {
            if (window.google && googleButtonRef.current) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true,
                });

                window.google.accounts.id.renderButton(googleButtonRef.current, {
                    type: 'standard',
                    theme: 'filled_black',
                    size: 'large',
                    width: 400,
                    text: isRegistering ? 'signup_with' : 'signin_with',
                    shape: 'pill',
                    logo_alignment: 'left',
                });
            }
        };

        // Wait for Google script to load
        if (window.google) {
            initializeGoogleSignIn();
        } else {
            const interval = setInterval(() => {
                if (window.google) {
                    clearInterval(interval);
                    initializeGoogleSignIn();
                }
            }, 100);
            return () => clearInterval(interval);
        }
    }, [isRegistering, handleGoogleResponse]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const trimmedEmail = email.trim();
        const trimmedPassword = password;

        try {
            if (isRegistering) {
                await register({
                    email: trimmedEmail,
                    password: trimmedPassword,
                    full_name: fullName.trim(),
                });
            }
            
            const params = new URLSearchParams();
            params.append('username', trimmedEmail);
            params.append('password', trimmedPassword);
            
            const data = await login(params);
            if (data.access_token) {
                localStorage.setItem('token', data.access_token);
                navigate('/dashboard', { replace: true });
            }
        } catch (err: any) {
            setError(getErrorMessage(err, 'Authentication failed. Please check your credentials.'));
        } finally {
            setLoading(false);
        }
    };

    const features = [
        { icon: <Zap className="w-5 h-5" />, text: 'Automated ML Pipeline' },
        { icon: <BarChart3 className="w-5 h-5" />, text: 'Advanced Analytics' },
        { icon: <Shield className="w-5 h-5" />, text: 'Enterprise Security' },
    ];

    return (
        <div className="min-h-screen flex relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1526 30%, #0f1b33 60%, #0a0e1a 100%)' }}>
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)', animation: 'pulse 8s ease-in-out infinite' }} />
                <div className="absolute bottom-[-15%] left-[-5%] w-[500px] h-[500px] rounded-full opacity-15"
                    style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)', animation: 'pulse 10s ease-in-out infinite 2s' }} />
                <div className="absolute top-[30%] left-[40%] w-[300px] h-[300px] rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)', animation: 'pulse 6s ease-in-out infinite 4s' }} />
                
                {/* Grid pattern overlay */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            </div>

            {/* Left side - Branding panel (hidden on mobile) */}
            <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] flex-col justify-center px-16 xl:px-24 relative z-10">
                <div className="animate-slide-up">
                    {/* Logo */}
                    <div className="flex items-center gap-4 mb-12">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)]"
                            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}>
                            <span className="font-heading font-bold text-white text-3xl">L</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-heading font-bold text-white tracking-tight">LUMEN</h1>
                            <p className="text-sm text-blue-400/80 font-medium">AutoML Platform</p>
                        </div>
                    </div>

                    {/* Tagline */}
                    <h2 className="text-4xl xl:text-5xl font-heading font-bold text-white leading-tight mb-6">
                        Illuminate Your
                        <span className="block mt-1" style={{ background: 'linear-gradient(135deg, #60a5fa, #a78bfa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Data Journey
                        </span>
                    </h2>
                    <p className="text-gray-400 text-lg leading-relaxed mb-12 max-w-md">
                        Build, train, and deploy machine learning models with our intelligent no-code platform.
                    </p>

                    {/* Feature highlights */}
                    <div className="space-y-5">
                        {features.map((feature, i) => (
                            <div key={i} className="flex items-center gap-4 group" style={{ animationDelay: `${i * 150}ms` }}>
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 text-blue-400 group-hover:bg-blue-500/20 group-hover:border-blue-500/30 transition-all duration-300">
                                    {feature.icon}
                                </div>
                                <span className="text-gray-300 font-medium">{feature.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right side - Login form */}
            <div className="w-full lg:w-[55%] xl:w-[50%] flex items-center justify-center px-6 sm:px-10 relative z-10">
                <div className="w-full max-w-[440px] animate-slide-up" style={{ animationDelay: '100ms' }}>
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-[0_0_30px_rgba(59,130,246,0.5)]"
                            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}>
                            <span className="font-heading font-bold text-white text-3xl">L</span>
                        </div>
                        <h1 className="text-2xl font-heading font-bold text-white">LUMEN</h1>
                    </div>

                    {/* Card */}
                    <div className="backdrop-blur-2xl rounded-3xl p-8 sm:p-10 border border-white/[0.08] shadow-[0_0_60px_rgba(0,0,0,0.4)]"
                        style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(15,23,42,0.6) 100%)' }}>
                        
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-gray-100 mb-2 tracking-tight">
                                {isRegistering ? 'Create Account' : 'Welcome Back'}
                            </h2>
                            <p className="text-gray-500 text-sm">
                                {isRegistering ? 'Join LUMEN to start modeling data' : 'Sign in to your LUMEN account'}
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl mb-6 text-sm text-center font-medium backdrop-blur-sm flex items-center justify-center gap-2">
                                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                {error}
                            </div>
                        )}

                        {/* Google Sign-In Button */}
                        <div className="mb-6">
                            {googleLoading ? (
                                <div className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-white/10 bg-white/5">
                                    <Loader2 className="animate-spin w-5 h-5 text-blue-400" />
                                    <span className="text-gray-300 text-sm font-medium">Signing in with Google...</span>
                                </div>
                            ) : GOOGLE_CLIENT_ID ? (
                                <div className="flex justify-center">
                                    <div ref={googleButtonRef} id="google-signin-button" />
                                </div>
                            ) : (
                                /* Fallback styled Google button when no client ID is configured */
                                <button
                                    type="button"
                                    onClick={() => setError('Google Sign-In is not configured. Please set VITE_GOOGLE_CLIENT_ID.')}
                                    className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition-all duration-300 group"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    <span className="text-gray-300 font-medium text-sm group-hover:text-white transition-colors">
                                        {isRegistering ? 'Sign up with Google' : 'Sign in with Google'}
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            <span className="text-xs text-gray-600 font-medium uppercase tracking-wider">or continue with email</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        </div>

                        {/* Email/Password Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {isRegistering && (
                                <div className="space-y-1.5 animate-fade-in">
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-3.5 border border-white/[0.08] bg-white/[0.03] text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder-gray-600 hover:border-white/15"
                                        placeholder="John Doe"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full p-3.5 border border-white/[0.08] bg-white/[0.03] text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder-gray-600 hover:border-white/15"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                                    {!isRegistering && <a href="#" className="text-xs text-blue-400/80 hover:text-blue-300 transition-colors">Forgot password?</a>}
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        className="w-full p-3.5 pr-12 border border-white/[0.08] bg-white/[0.03] text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder-gray-600 hover:border-white/15"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full text-white font-bold py-4 rounded-xl transition-all duration-300 mt-2 flex items-center justify-center disabled:opacity-70 relative overflow-hidden group"
                                style={{
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                                    boxShadow: '0 0 20px rgba(59,130,246,0.3), 0 4px 15px rgba(0,0,0,0.2)'
                                }}
                            >
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <span className="relative z-10 flex items-center gap-2">
                                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (isRegistering ? 'Create Account' : 'Sign In')}
                                </span>
                            </button>
                        </form>

                        {/* Toggle sign in / sign up */}
                        <div className="mt-8 text-center text-sm text-gray-500 border-t border-white/[0.05] pt-6">
                            {isRegistering ? "Already have an account?" : "Don't have an account?"} 
                            <button 
                                onClick={() => {
                                    setIsRegistering(!isRegistering);
                                    setError('');
                                    setFullName('');
                                }}
                                className="font-semibold text-blue-400 hover:text-blue-300 transition-colors ml-1.5 hover:underline underline-offset-2"
                            >
                                {isRegistering ? 'Sign in' : 'Sign up'}
                            </button>
                        </div>
                    </div>

                    {/* Footer text */}
                    <p className="text-center text-xs text-gray-600 mt-6">
                        By continuing, you agree to LUMEN's Terms of Service and Privacy Policy
                    </p>
                </div>
            </div>

            {/* Inline CSS for pulse animation */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 0.15; }
                    50% { transform: scale(1.1); opacity: 0.25; }
                }
            `}</style>
        </div>
    );
};

export default LoginPage;
