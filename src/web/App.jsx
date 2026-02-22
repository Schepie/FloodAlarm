import React, { useState, useEffect } from 'react';
import {
    Waves,
    Settings,
    Bell,
    Activity,
    History,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    ArrowRight,
    TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
    const [baseUrl, setBaseUrl] = useState(localStorage.getItem('flood_ip') || '');
    const [showConfig, setShowConfig] = useState(!baseUrl);
    const [ipInput, setIpInput] = useState(baseUrl);
    const [status, setStatus] = useState(null);
    const [isOffline, setIsOffline] = useState(false);
    const [isSimActive, setIsSimActive] = useState(false);
    const [simDistance, setSimDistance] = useState(100);
    const [notifyMsg, setNotifyMsg] = useState('');

    const saveConfig = () => {
        let ip = ipInput.trim();
        if (!ip) return;
        if (!ip.startsWith('http')) ip = 'http://' + ip;
        localStorage.setItem('flood_ip', ip);
        setBaseUrl(ip);
        setShowConfig(false);
    };

    const fetchStatus = async () => {
        if (!baseUrl) return;
        try {
            // Use Netlify Function proxy to avoid CORS and Mixed Content issues
            const res = await fetch(`/.netlify/functions/status?url=${encodeURIComponent(baseUrl)}`);
            if (!res.ok) throw new Error('Proxy failed');
            const data = await res.json();
            setStatus(data);
            setIsOffline(false);
            setIsSimActive(data.status === 'SIMULATING' || data.status === 'ALARM' || isSimActive);
        } catch (e) {
            console.error(e);
            setIsOffline(true);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000); // Increased interval to be kind to functions
        return () => clearInterval(interval);
    }, [baseUrl]);

    const handleSimChange = async (active, distance) => {
        setIsSimActive(active);
        setSimDistance(distance);

        try {
            await fetch(`/.netlify/functions/notify?url=${encodeURIComponent(baseUrl)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // Re-using notify endpoint for simulation for simplicity if needed, 
                    // or creating a specific simulate.js function. 
                    // For now, let's stick to the ones we have or update notify to handle it.
                    // Correct approach: let's update App.jsx to only use what we implemented.
                    message: `SIM:${active}:${distance}`
                })
            });
        } catch (e) {
            console.error("Simulation failed", e);
        }
    };

    const sendNotify = async () => {
        if (!notifyMsg.trim()) return;
        try {
            const res = await fetch(`/.netlify/functions/notify?url=${encodeURIComponent(baseUrl)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: notifyMsg })
            });
            if (res.ok) {
                alert('Message sent!');
                setNotifyMsg('');
            } else {
                alert('Send failed via proxy');
            }
        } catch (e) {
            alert('Failed to connect to proxy');
        }
    };

    const getStatusColor = () => {
        if (isOffline) return 'text-red-500';
        if (!status) return 'text-sky-500';
        switch (status.status) {
            case 'ALARM': return 'text-red-500';
            case 'WARNING': return 'text-orange-500';
            default: return 'text-emerald-500';
        }
    };

    const getStatusBadge = () => {
        if (isOffline) return <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold border border-red-500/30">OFFLINE</span>;
        if (!status) return <span className="px-3 py-1 bg-sky-500/20 text-sky-400 rounded-full text-xs font-bold border border-sky-500/30">CONNECTING...</span>;

        const colors = {
            NORMAL: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            WARNING: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            ALARM: 'bg-red-500/20 text-red-400 border-red-500/30'
        };

        return <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors[status.status]}`}>{status.status}</span>;
    };

    return (
        <div className="max-w-md mx-auto p-5 min-h-screen flex flex-col gap-6 pb-24 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-sky-500/10 blur-[120px] pointer-events-none" />

            {/* Header */}
            <header className="flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-sky-500/10 rounded-xl border border-sky-500/20">
                        <Waves className="w-6 h-6 text-sky-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Flood Monitor</h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-1">
                            <Activity className="w-2.5 h-2.5" /> Real-time System
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowConfig(true)}
                    className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white transition-colors"
                >
                    <Settings className="w-5 h-5" />
                </button>
            </header>

            {/* Main Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-3xl p-6 relative overflow-hidden"
            >
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Water Level</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className={`text-5xl font-black ${getStatusColor()}`}>
                                {status ? status.distance.toFixed(1) : '--'}
                            </span>
                            <span className="text-lg font-bold text-slate-500">cm</span>
                        </div>
                    </div>
                    {getStatusBadge()}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700/30">
                        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Warning</span>
                        <p className="text-xl font-bold mt-1">{status ? status.warning : '--'}<span className="text-xs text-slate-600 ml-1">cm</span></p>
                    </div>
                    <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700/30">
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Alarm</span>
                        <p className="text-xl font-bold mt-1">{status ? status.alarm : '--'}<span className="text-xs text-slate-600 ml-1">cm</span></p>
                    </div>
                </div>
            </motion.div>

            {/* Weather Info (Placeholder for data if available) */}
            <AnimatePresence>
                {status?.rainExpected && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-4 flex items-center gap-4"
                    >
                        <div className="bg-sky-500 p-2 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-[#0f172a]" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Rain Expected</p>
                            <p className="text-xs text-sky-400/80">{status.forecast}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Simulation */}
            <div className="glass-card rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Activity className="w-4 h-4 text-purple-400" />
                        </div>
                        <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Simulation</span>
                    </div>
                    <div
                        onClick={() => handleSimChange(!isSimActive, simDistance)}
                        className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${isSimActive ? 'bg-purple-500' : 'bg-slate-700'}`}
                    >
                        <div className={`bg-white w-4 h-4 rounded-full transition-transform ${isSimActive ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                </div>

                <div className={`space-y-4 transition-opacity duration-300 ${isSimActive ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                        <span>Virtual Distance</span>
                        <span className="text-purple-400">{simDistance}cm</span>
                    </div>
                    <input
                        type="range"
                        min="2"
                        max="400"
                        value={simDistance}
                        onChange={(e) => {
                            setSimDistance(parseInt(e.target.value));
                        }}
                        onMouseUp={() => handleSimChange(true, simDistance)}
                        onTouchEnd={() => handleSimChange(true, simDistance)}
                        className="w-100 accent-purple-500 h-2 bg-slate-900/50 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>

            {/* Telegram Control */}
            <div className="glass-card rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-sky-500/10 rounded-lg">
                        <Bell className="w-4 h-4 text-sky-400" />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Remote Notify</span>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Type message..."
                        value={notifyMsg}
                        onChange={(e) => setNotifyMsg(e.target.value)}
                        className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-500/50 transition-colors"
                    />
                    <button
                        onClick={sendNotify}
                        className="bg-sky-500 hover:bg-sky-400 text-[#0f172a] p-3 rounded-xl font-bold transition-all active:scale-95"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Config Overlay */}
            <AnimatePresence>
                {showConfig && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-[#0f172a]/95 backdrop-blur-xl flex items-center justify-center p-8"
                    >
                        <div className="w-full max-w-sm flex flex-col gap-8">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-sky-500/10 rounded-3xl border border-sky-500/20 flex items-center justify-center mx-auto mb-6">
                                    <Waves className="w-10 h-10 text-sky-400" />
                                </div>
                                <h2 className="text-3xl font-black mb-2 tracking-tight">Welcome</h2>
                                <p className="text-slate-400 text-sm">Enter your ESP8266 local IP or public tunnel URL to get started.</p>
                            </div>

                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="e.g. 192.168.1.50"
                                    value={ipInput}
                                    onChange={(e) => setIpInput(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-sky-500 transition-colors"
                                />
                                <button
                                    onClick={saveConfig}
                                    className="w-full bg-sky-500 hover:bg-sky-400 text-[#0f172a] py-4 rounded-2xl font-black text-lg transition-all active:scale-95 shadow-lg shadow-sky-500/20"
                                >
                                    Connect Systems
                                </button>
                                {baseUrl && (
                                    <button
                                        onClick={() => setShowConfig(false)}
                                        className="w-full py-4 text-slate-500 font-bold"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default App;
