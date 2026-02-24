import React, { useState, useEffect } from 'react';
import {
    Waves,
    Settings,
    Bell,
    Activity,
    History,
    AlertTriangle,
    ArrowRight,
    TrendingUp,
    ChevronDown,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Droplets,
    CloudSun,
    CloudRain,
    Wind,
    Thermometer,
    Cloud,
    ShieldAlert,
    ShieldCheck,
    AlertOctagon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
    const [allStations, setAllStations] = useState({});
    const [selectedStation, setSelectedStation] = useState("Antwerpen");
    const [isOffline, setIsOffline] = useState(false);
    const [isSimActive, setIsSimActive] = useState(false);
    const [simDistance, setSimDistance] = useState(100);
    const [notifyMsg, setNotifyMsg] = useState('');
    const [lastNotifiedState, setLastNotifiedState] = useState({});
    const [expandedRivers, setExpandedRivers] = useState({ SCHELDE: true });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
    const [localWarning, setLocalWarning] = useState(30);
    const [localAlarm, setLocalAlarm] = useState(15);
    const [localIntervals, setLocalIntervals] = useState({
        sunny: 15,
        moderate: 10,
        stormy: 5,
        waterbomb: 2
    });

    const STATIONS = ["Doornik", "Oudenaarde", "Gent", "Dendermonde", "Antwerpen"];

    const sendNotification = (title, body) => {
        if (!("Notification" in window) || Notification.permission !== "granted") return;
        new Notification(title, { body, icon: "/favicon.ico" });
    };

    const fetchStatus = async () => {
        try {
            const res = await fetch(`/.netlify/functions/get-status`);
            if (!res.ok) throw new Error('Cloud unreachable');
            const data = await res.json();

            setAllStations(data);
            const current = data[selectedStation];

            if (current && !isSettingsOpen) {
                setLocalWarning(current.warning);
                setLocalAlarm(current.alarm);
                if (current.intervals) {
                    setLocalIntervals(current.intervals);
                }
            }

            // Check for status changes to trigger notifications
            if (current && current.status !== 'NORMAL' && current.status !== lastNotifiedState[selectedStation]) {
                sendNotification(`Flood Alert: ${selectedStation} is ${current.status}`, `Current distance: ${current.distance.toFixed(1)}cm`);
                setLastNotifiedState(prev => ({ ...prev, [selectedStation]: current.status }));
            } else if (current && current.status === 'NORMAL') {
                setLastNotifiedState(prev => ({ ...prev, [selectedStation]: 'NORMAL' }));
            }

            // Global offline check (based on Antwerpen - our real ESP)
            if (data["Antwerpen"]?.lastSeen) {
                const lastSeen = new Date(data["Antwerpen"].lastSeen);
                const diff = (new Date() - lastSeen) / 1000 / 60;
                setIsOffline(diff > 5);
            }

        } catch (e) {
            console.error("Fetch failed", e);
        }
    };

    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
        fetchStatus();
        const interval = setInterval(fetchStatus, 10000);
        return () => clearInterval(interval);
    }, [selectedStation]);

    const handleSaveSettings = async () => {
        try {
            const res = await fetch(`/.netlify/functions/push-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'change_me_later'
                },
                body: JSON.stringify({
                    station: selectedStation,
                    distance: status?.distance || 100,
                    warning: parseFloat(localWarning),
                    alarm: parseFloat(localAlarm),
                    status: (status?.distance || 100) <= parseFloat(localAlarm) ? 'ALARM' : ((status?.distance || 100) <= parseFloat(localWarning) ? 'WARNING' : 'NORMAL'),
                    forecast: status?.forecast || "Updated settings",
                    rainExpected: status?.rainExpected || false,
                    intervals: localIntervals
                })
            });
            if (!res.ok) throw new Error('Save failed');
            setIsSettingsOpen(false);
            fetchStatus();
        } catch (e) {
            alert('Failed to save settings to cloud');
        }
    };

    const handleSimPush = async (station, distance) => {
        try {
            const res = await fetch(`/.netlify/functions/push-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'change_me_later'
                },
                body: JSON.stringify({
                    station,
                    distance: distance,
                    warning: 30.0,
                    alarm: 15.0,
                    status: distance <= 15.0 ? 'ALARM' : (distance <= 30.0 ? 'WARNING' : 'NORMAL'),
                    forecast: "Simulation Mode",
                    rainExpected: false
                })
            });
            if (!res.ok) throw new Error('Push failed');
            fetchStatus();
        } catch (e) {
            console.error("Simulation push failed", e);
        }
    };

    const handleSimChange = async (active, distance) => {
        setIsSimActive(active);
        setSimDistance(distance);

        if (active) {
            handleSimPush(selectedStation, distance);
        }
    };

    const sendNotify = async () => {
        if (!notifyMsg.trim()) return;
        try {
            const res = await fetch(`/.netlify/functions/notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: notifyMsg,
                    station: selectedStation
                })
            });

            if (res.ok) {
                alert(`Message sent to ${selectedStation}! It will appear on the device shortly.`);
                setNotifyMsg('');
            } else {
                throw new Error('Failed to queue message');
            }
        } catch (e) {
            alert('Failed to connect to cloud notification service');
        }
    };

    const status = allStations[selectedStation];

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

    const getGlobalRisk = () => {
        const stations = Object.values(allStations);
        if (stations.length === 0) return { label: 'LOADING...', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: ShieldAlert };

        const hasAlarm = stations.some(s => s.status === 'ALARM');
        const hasWarning = stations.some(s => s.status === 'WARNING');
        const maxRainProb = Math.max(...stations.map(s => s.weather?.rainProb || 0));

        if (hasAlarm && maxRainProb > 80) return { label: 'EXTREME RISK', color: 'text-red-500', bg: 'bg-red-500/20', icon: AlertOctagon, pulse: true };
        if (hasAlarm || (hasWarning && maxRainProb > 70)) return { label: 'HIGH RISK', color: 'text-orange-500', bg: 'bg-orange-500/20', icon: AlertTriangle, pulse: true };
        if (hasWarning || maxRainProb > 40) return { label: 'ELEVATED RISK', color: 'text-amber-500', bg: 'bg-amber-500/20', icon: ShieldAlert, pulse: false };
        return { label: 'LOW RISK', color: 'text-emerald-500', bg: 'bg-emerald-500/20', icon: ShieldCheck, pulse: false };
    };

    const risk = getGlobalRisk();

    const getRiskExplanation = () => {
        const stations = Object.values(allStations);
        const hasAlarm = stations.some(s => s.status === 'ALARM');
        const hasWarning = stations.some(s => s.status === 'WARNING');
        const maxRainProb = Math.max(...stations.map(s => s.weather?.rainProb || 0));

        if (risk.label.includes('EXTREME')) {
            return "ALARM level reached at one or more stations combined with extreme rain forecast (>80%). Immediate action required.";
        }
        if (risk.label.includes('HIGH')) {
            return `Severe situation: ${hasAlarm ? 'ALARM level' : 'WARNING level'} active with ${maxRainProb}% rain probability. Waters are rising significantly.`;
        }
        if (risk.label.includes('ELEVATED')) {
            return `Precautionary state: ${hasWarning ? 'WARNING level' : 'NORMAL level'} with ${maxRainProb}% rain probability. Monitoring required for potential changes.`;
        }
        return "Stable conditions: All stations are reporting safe water levels and no significant rain is expected.";
    };

    return (
        <div className="max-w-md mx-auto p-5 min-h-screen flex flex-col gap-6 pb-24 relative overflow-hidden text-slate-100 font-sans">
            {/* Background Glow */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 blur-[120px] pointer-events-none transition-colors duration-1000 ${risk.label.includes('EXTREME') ? 'bg-red-500/20' :
                risk.label.includes('HIGH') ? 'bg-orange-500/20' :
                    risk.label.includes('ELEVATED') ? 'bg-amber-500/20' : 'bg-sky-500/10'
                }`} />

            {/* Header */}
            <header className="flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-sky-500/10 rounded-xl border border-sky-500/20">
                        <Waves className="w-6 h-6 text-sky-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Flood Monitor</h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-1">
                            <Activity className="w-2.5 h-2.5" /> LIVE SYNC ACTIVE
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsRiskModalOpen(true)}
                        className={`p-2.5 rounded-xl border transition-all active:scale-95 ${risk.bg} ${risk.color.replace('text', 'border')}/50 ${risk.pulse ? 'animate-pulse' : ''}`}
                    >
                        <risk.icon className={`w-5 h-5 ${risk.color}`} />
                    </button>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2.5 bg-slate-900/40 rounded-xl border border-slate-700/50 hover:border-slate-500 transition-all active:scale-95"
                    >
                        <Settings className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
            </header>


            {/* Station List */}
            <div className="glass-card rounded-3xl p-6 z-10 transition-all">
                <button
                    onClick={() => setExpandedRivers(prev => ({ ...prev, SCHELDE: !prev.SCHELDE }))}
                    className="flex items-center justify-between w-full mb-0 group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-sky-500/10 rounded-lg group-hover:bg-sky-500/20 transition-colors">
                            <Droplets className="w-4 h-4 text-sky-400" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-[0.2em] text-sky-500">SCHELDE</span>
                    </div>
                    {expandedRivers.SCHELDE ? <ChevronDown className="w-5 h-5 text-slate-500" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                </button>

                <AnimatePresence>
                    {expandedRivers.SCHELDE && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="flex flex-col gap-2">
                                {STATIONS.map(name => {
                                    const s = allStations[name];
                                    const isSelected = selectedStation === name;

                                    const getStatColor = (stat) => {
                                        if (!stat) return 'bg-slate-800';
                                        if (name === "Antwerpen" && isOffline) return 'bg-red-500/50';
                                        switch (stat.status) {
                                            case 'ALARM': return 'bg-red-500';
                                            case 'WARNING': return 'bg-orange-500';
                                            default: return 'bg-emerald-500';
                                        }
                                    };

                                    return (
                                        <button
                                            key={name}
                                            onClick={() => setSelectedStation(name)}
                                            className={`flex items-center justify-between p-3 rounded-2xl transition-all border ${isSelected
                                                ? 'bg-sky-500/10 border-sky-500/50 shadow-[0_0_20px_rgba(14,165,233,0.1)]'
                                                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full shadow-lg ${getStatColor(s)} ${s?.status !== 'NORMAL' ? 'animate-pulse' : ''}`} />
                                                <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>{name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-black monospace ${isSelected ? 'text-sky-400' : 'text-slate-500'}`}>
                                                    {s ? s.distance.toFixed(1) : '--'}
                                                    <span className="text-[10px] ml-0.5 opacity-50">cm</span>
                                                </span>
                                                <ArrowRight className={`w-4 h-4 transition-transform ${isSelected ? 'translate-x-0 opacity-100 text-sky-400' : '-translate-x-2 opacity-0'}`} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Water Level & Forecast Card replaced by Settings & Compact Items */}

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
                        <span className="text-sm font-bold uppercase tracking-wider text-slate-300">
                            {selectedStation === "Antwerpen" ? "Real ESP Control" : `${selectedStation} Sim`}
                        </span>
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
                        onMouseUp={() => handleSimPush(selectedStation, simDistance)}
                        onTouchEnd={() => handleSimPush(selectedStation, simDistance)}
                        className="w-full accent-purple-500 h-2 bg-slate-900/50 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-500 leading-tight">
                        {selectedStation === "Antwerpen"
                            ? "Warning: Moving this slider will override real ESP data in the cloud."
                            : "Simulating water level for this upstream station."}
                    </p>
                </div>
            </div>

            {/* Weather & Forecast */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-3xl p-6 z-10"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                        <CloudSun className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-wider text-slate-300">Weather & Forecast</span>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-900/40 rounded-2xl border border-slate-800">
                            <Thermometer className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Temp</p>
                            <p className="text-xl font-black">{status?.weather?.temp || '--'}°<span className="text-xs text-slate-500 ml-1">C</span></p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-900/40 rounded-2xl border border-slate-800">
                            <CloudRain className="w-5 h-5 text-sky-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Rain</p>
                            <p className="text-xl font-black">{status?.weather?.rainProb || '--'}%</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">3-Day Outlook</p>
                    <div className="grid grid-cols-3 gap-3">
                        {status?.weather?.daily.map((day, i) => (
                            <div key={i} className="bg-slate-900/30 p-3 rounded-2xl border border-slate-800/50 flex flex-col items-center gap-2">
                                <span className="text-[10px] font-black text-slate-500">{day.day}</span>
                                {day.icon === 'cloud-rain' ? <CloudRain className="w-5 h-5 text-sky-400" /> :
                                    day.icon === 'cloud-sun' ? <CloudSun className="w-5 h-5 text-amber-400" /> :
                                        <Cloud className="w-5 h-5 text-slate-400" />}
                                <span className="text-xs font-bold">{day.temp}°</span>
                                {day.rain > 50 && (
                                    <span className="text-[8px] font-black text-sky-500 uppercase px-1.5 py-0.5 bg-sky-500/10 rounded-full border border-sky-500/20">Heavy Rain</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Telegram Control hidden as requested */}

            {/* Risk Explanation Modal */}
            <AnimatePresence>
                {isRiskModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsRiskModalOpen(false)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            className={`relative w-full max-w-sm rounded-[2.5rem] p-8 border ${risk.bg} ${risk.color.replace('text', 'border')}/30 bg-slate-900 shadow-2xl overflow-hidden`}
                        >
                            {/* Decorative Glow */}
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 blur-3xl opacity-20 ${risk.color.replace('text', 'bg')}`} />

                            <div className="flex flex-col items-center text-center gap-6 relative z-10">
                                <div className={`p-5 rounded-3xl ${risk.bg} border-2 ${risk.color.replace('text', 'border')}/20 shadow-xl`}>
                                    <risk.icon className={`w-10 h-10 ${risk.color}`} />
                                </div>

                                <div>
                                    <h2 className={`text-2xl font-black tracking-tight mb-2 ${risk.color}`}>
                                        {risk.label}
                                    </h2>
                                    <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                        {getRiskExplanation()}
                                    </p>
                                </div>

                                <div className="w-full space-y-3">
                                    <div className="flex justify-between items-center px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stations</span>
                                        <span className="text-sm font-black text-slate-100">5 Monitored</span>
                                    </div>
                                    <div className="flex justify-between items-center px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aggregated Rain</span>
                                        <span className="text-sm font-black text-slate-100">{Math.max(...Object.values(allStations).map(s => s.weather?.rainProb || 0))}% Max</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setIsRiskModalOpen(false)}
                                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10`}
                                >
                                    Dismiss
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Settings Modal */}
            <AnimatePresence>
                {isSettingsOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-slate-950/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 w-full max-w-sm overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                                    <Settings className="w-5 h-5 text-sky-400" />
                                    Thresholds
                                </h2>
                                <button
                                    onClick={() => setIsSettingsOpen(false)}
                                    className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            <p className="text-xs text-slate-500 mb-6 font-bold uppercase tracking-widest leading-relaxed">
                                Settings for <span className="text-sky-400">{selectedStation}</span>.
                                Lower distance means higher water level.
                            </p>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-black uppercase text-orange-400 tracking-wider">Warning Level</label>
                                        <span className="text-sm font-black monospace text-orange-400/70">{localWarning}cm</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="200"
                                        value={localWarning}
                                        onChange={(e) => setLocalWarning(e.target.value)}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-black uppercase text-red-500 tracking-wider">Alarm Level</label>
                                        <span className="text-sm font-black monospace text-red-500/70">{localAlarm}cm</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="100"
                                        value={localAlarm}
                                        onChange={(e) => setLocalAlarm(e.target.value)}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                                    />
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-slate-800">
                                <h3 className="text-sm font-black tracking-tight flex items-center gap-3 mb-6">
                                    <Droplets className="w-4 h-4 text-sky-400" />
                                    Measuring Intervals (min)
                                </h3>

                                <div className="space-y-6">
                                    {[
                                        { key: 'sunny', label: 'Sunny Day', color: 'text-amber-400', accent: 'accent-amber-500' },
                                        { key: 'moderate', label: 'Moderate Rain', color: 'text-sky-400', accent: 'accent-sky-500' },
                                        { key: 'stormy', label: 'Stormy / Heavy', color: 'text-indigo-400', accent: 'accent-indigo-500' },
                                        { key: 'waterbomb', label: 'Waterbomb', color: 'text-purple-500', accent: 'accent-purple-500' }
                                    ].map(item => (
                                        <div key={item.key} className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className={`text-xs font-black uppercase ${item.color} tracking-wider`}>{item.label}</label>
                                                <span className={`text-sm font-black monospace ${item.color}/70`}>{localIntervals[item.key]}m</span>
                                            </div>
                                            <input
                                                type="range" min="1" max="60"
                                                value={localIntervals[item.key]}
                                                onChange={(e) => setLocalIntervals(prev => ({ ...prev, [item.key]: parseInt(e.target.value) }))}
                                                className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer ${item.accent}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSaveSettings}
                                className="w-full mt-10 bg-sky-500 hover:bg-sky-400 text-[#0f172a] py-4 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-sky-500/10"
                            >
                                SAVE CONFIGURATION
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default App;
