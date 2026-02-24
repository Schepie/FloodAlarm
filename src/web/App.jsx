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
    const [status, setStatus] = useState(null);
    const [isOffline, setIsOffline] = useState(false);
    const [isSimActive, setIsSimActive] = useState(false);
    const [simDistance, setSimDistance] = useState(100);
    const [notifyMsg, setNotifyMsg] = useState('');

    const fetchStatus = async () => {
        try {
            // Now fetching from our global Cloud Store!
            const res = await fetch(`/.netlify/functions/get-status`);
            if (!res.ok) throw new Error('Cloud unreachable');
            const data = await res.json();
            setStatus(data);
            setIsOffline(false);

            // If data is older than 5 minutes, consider it offline
            if (data.lastSeen) {
                const lastSeen = new Date(data.lastSeen);
                const diff = (new Date() - lastSeen) / 1000 / 60;
                if (diff > 5) setIsOffline(true);
            } else {
                setIsOffline(true);
            }

        } catch (e) {
            console.error("Fetch failed", e);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 10000); // Poll cloud every 10s
        return () => clearInterval(interval);
    }, []);

    const handleSimPush = async (distance) => {
        try {
            const res = await fetch(`/.netlify/functions/push-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'change_me_later' // Default key
                },
                body: JSON.stringify({
                    distance: distance,
                    warning: 30.0,
                    alarm: 15.0,
                    status: distance <= 15.0 ? 'ALARM' : (distance <= 30.0 ? 'WARNING' : 'NORMAL'),
                    forecast: "Simulation Mode",
                    rainExpected: false
                })
            });
            if (!res.ok) throw new Error('Push failed');
            console.log("Simulated push success:", distance);
            // Immediately fetch to show update
            fetchStatus();
        } catch (e) {
            console.error("Simulation push failed", e);
        }
    };

    const handleSimChange = async (active, distance) => {
        setIsSimActive(active);
        setSimDistance(distance);

        if (active) {
            handleSimPush(distance);
        }
    };

    const sendNotify = async () => {
        if (!notifyMsg.trim()) return;
        try {
            // In the Push model, messages go to the Cloud, which then flags the ESP8266 
            // or sends a direct notification. For now, we'll just log it.
            console.log("Notification queued:", notifyMsg);
            alert('Note: Remote configuration push will be implemented in the next firmware update.');
            setNotifyMsg('');
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
        if (isOffline) return <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold border border-red-500/30">DISCONNECTED</span>;
        if (!status) return <span className="px-3 py-1 bg-sky-500/20 text-sky-400 rounded-full text-xs font-bold border border-sky-500/30">WAITING...</span>;

        const colors = {
            NORMAL: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            WARNING: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            ALARM: 'bg-red-500/20 text-red-400 border-red-500/30'
        };

        const colorClass = colors[status.status] || colors.NORMAL;
        return <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colorClass}`}>{status.status}</span>;
    };

    const formatLastSeen = () => {
        if (!status?.lastSeen) return "Never";
        const date = new Date(status.lastSeen);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="max-w-md mx-auto p-5 min-h-screen flex flex-col gap-6 pb-24 relative overflow-hidden text-slate-100 font-sans">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-sky-500/10 blur-[120px] pointer-events-none" />

            {/* Header */}
            <header className="flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-sky-500/10 rounded-xl border border-sky-500/20">
                        <Waves className="w-6 h-6 text-sky-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Flood Monitor <span className="text-sky-500 font-black">Cloud</span></h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-1">
                            <Activity className="w-2.5 h-2.5" /> Live Sync Active
                        </p>
                    </div>
                </div>
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
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                            <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
                            Last Update: {formatLastSeen()}
                        </div>
                    </div>
                    {getStatusBadge()}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700/30">
                        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Warning</span>
                        <p className="text-xl font-bold mt-1">{status ? status.warning.toFixed(1) : '--'}<span className="text-xs text-slate-600 ml-1">cm</span></p>
                    </div>
                    <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700/30">
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Alarm</span>
                        <p className="text-xl font-bold mt-1">{status ? status.alarm.toFixed(1) : '--'}<span className="text-xs text-slate-600 ml-1">cm</span></p>
                    </div>
                </div>
            </motion.div>

            {/* Weather Info */}
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
                        className="w-full accent-purple-500 h-2 bg-slate-900/50 rounded-lg appearance-none cursor-pointer"
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
                        className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-500/50 transition-colors text-white"
                    />
                    <button
                        onClick={sendNotify}
                        className="bg-sky-500 hover:bg-sky-400 text-[#0f172a] p-3 rounded-xl font-bold transition-all active:scale-95"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default App;
