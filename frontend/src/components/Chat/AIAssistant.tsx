import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, Loader2 } from 'lucide-react';

import { chatWithAI } from '../../services/api';
import { useParams } from 'react-router-dom';

export const AIAssistant: React.FC = () => {
    const { datasetId } = useParams<{ datasetId?: string }>();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
        { role: 'ai', text: "Hello! I'm LUMEN AI. How can I help you with your data today?" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        
        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const response = await chatWithAI(userMsg, datasetId);
            setMessages(prev => [...prev, { role: 'ai', text: response.response }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an error connecting to the AI service." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="w-80 md:w-96 h-[500px] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden mb-4 animate-scale-in">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-600 rounded-lg">
                                <Bot size={20} className="text-white" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">LUMEN AI Assistant</h4>
                                <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-[10px] text-slate-400 font-medium">Gemini 2.0 Enabled</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                                    msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-tr-none' 
                                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin text-purple-400" />
                                    <span className="text-xs text-slate-400">Thinking...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Prompts */}
                    {!loading && messages.length < 3 && (
                        <div className="px-4 py-2 flex flex-wrap gap-2 overflow-x-auto no-scrollbar">
                            {["What cleaning should I do?", "Best model for this?", "Explain this dataset"].map(p => (
                                <button 
                                    key={p} 
                                    onClick={() => setInput(p)}
                                    className="text-[10px] px-2.5 py-1 bg-slate-800 border border-white/5 rounded-full text-slate-400 hover:text-white hover:border-purple-500/50 transition-all whitespace-nowrap"
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-4 border-t border-white/5 bg-slate-900/50">
                        <div className="relative">
                            <input 
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask about your data..."
                                className="w-full bg-slate-800 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                            />
                            <button 
                                onClick={handleSend}
                                className="absolute right-2 top-2 p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-2xl transition-all transform hover:scale-110 flex items-center justify-center relative ${
                    isOpen ? 'bg-slate-800 text-white' : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white ring-4 ring-purple-500/20'
                }`}
            >
                {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
                {!isOpen && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-slate-950 rounded-full animate-bounce"></div>
                )}
            </button>
        </div>
    );
};
