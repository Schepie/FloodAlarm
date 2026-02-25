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
import { translations } from './translations.js';

const HistoricalGraph = ({ data, timeframe, warning, alarm }) => {
    // Filter data based on timeframe
    const now = new Date();
    const filteredData = Array.isArray(data) ? data.filter(entry => {
        const entryDate = new Date(entry.ts);
        const diffMin = (now - entryDate) / 1000 / 60;
        switch (timeframe) {
            case '5m': return diffMin <= 5;
            case '30m': return diffMin <= 30;
            case '3h': return diffMin <= 180;
            case '8h': return diffMin <= 480;
            default: return true; // 24h
        }
    }) : [];

    if (filteredData.length < 2) {
        return (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                <span className="animate-pulse">WAITING...</span>
            </div>
        );
    }

    const dataMax = Math.max(...filteredData.map(d => d.val), warning || 0, alarm || 0);
    const maxVal = Math.max(100, Math.ceil((dataMax + 10) / 50) * 50);
    const height = 100;
    const width = 270;
    const leftPad = 30;

    const timeframeMs = {
        '5m': 5 * 60 * 1000,
        '30m': 30 * 60 * 1000,
        '3h': 3 * 60 * 60 * 1000,
        '8h': 8 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000
    }[timeframe] || (24 * 60 * 60 * 1000);

    const points = filteredData.map((d) => {
        const timeOffset = now.getTime() - new Date(d.ts).getTime();
        const x = leftPad + width - (Math.min(timeOffset, timeframeMs) / timeframeMs) * width;
        const y = (Math.min(d.val, maxVal) / maxVal) * height;
        return { x, y };
    })
        .sort((a, b) => a.x - b.x)
        .map(p => `${p.x},${p.y}`)
        .join(' ');

    const areaPath = filteredData.length >= 2
        ? `M ${leftPad + width},${height} L ${points.split(' ')[0].split(',')[0]},${height} L ${points} L ${leftPad + width},${height} Z`
        : '';

    const warningY = (warning / maxVal) * height;
    const alarmY = (alarm / maxVal) * height;

    const formatTime = (ts) => {
        const d = new Date(ts);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    const xLabels = [];
    if (filteredData.length >= 2) {
        const windowStart = now.getTime() - timeframeMs;
        const windowEnd = now.getTime();
        const durationMin = timeframeMs / 1000 / 60;

        // Determine label frequency based on the timeframe window
        let intervalMin = 60;
        if (durationMin <= 10) intervalMin = 1;
        else if (durationMin <= 60) intervalMin = 10;
        else if (durationMin <= 240) intervalMin = 60;
        else if (durationMin <= 600) intervalMin = 120; // 2h
        else intervalMin = 240; // 4h

        // Add start label (left edge of window)
        xLabels.push({ x: leftPad, label: formatTime(windowStart) });

        // Add intermediate marks
        const startD = new Date(windowStart);
        const nextMark = new Date(startD);
        if (intervalMin >= 60) {
            nextMark.setHours(nextMark.getHours() + 1, 0, 0, 0);
        } else {
            nextMark.setMinutes(Math.ceil((nextMark.getMinutes() + 1) / intervalMin) * intervalMin, 0, 0);
        }

        let currentMark = nextMark.getTime();
        let safety = 0;
        while (currentMark < windowEnd - (intervalMin * 60 * 1000 * 0.7) && safety < 50) {
            const ratio = (currentMark - windowStart) / timeframeMs;
            xLabels.push({
                x: leftPad + ratio * width,
                label: formatTime(currentMark)
            });
            currentMark += intervalMin * 60 * 1000;
            safety++;
        }

        // Add end label (now)
        xLabels.push({ x: leftPad + width, label: formatTime(windowEnd) });
    }

    // Generate dynamic Y-axis ticks
    const yTicks = [];
    const tickStep = maxVal <= 100 ? 25 : 50;
    for (let i = 0; i <= maxVal; i += tickStep) {
        yTicks.push(i);
    }

    return (
        <svg viewBox={`0 0 ${leftPad + width} ${height + 25}`} className="w-full h-full" preserveAspectRatio="none">
            <defs>
                <linearGradient id="graphGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Y-Axis Labels & Grid */}
            {yTicks.map(val => {
                const y = (val / maxVal) * height;
                return (
                    <g key={val}>
                        <text
                            x={leftPad - 8}
                            y={y < 10 ? y + 5 : (y > 90 ? y - 5 : y)}
                            textAnchor="end"
                            dominantBaseline="middle"
                            className="fill-slate-500 text-[10px] font-bold monospace"
                        >
                            {val}
                        </text>
                        <line
                            x1={leftPad}
                            y1={y}
                            x2={leftPad + width}
                            y2={y}
                            stroke="white"
                            strokeOpacity="0.05"
                            strokeWidth="1"
                        />
                    </g>
                );
            })}

            {/* X-Axis Time Labels */}
            {xLabels.map((xl, i) => (
                <text
                    key={i}
                    x={xl.x}
                    y={height + 18}
                    textAnchor={xl.x < leftPad + 20 ? "start" : xl.x > leftPad + width - 20 ? "end" : "middle"}
                    className="fill-slate-600 text-[9px] font-bold monospace"
                >
                    {xl.label}
                </text>
            ))}

            {/* Limit Lines */}
            <line x1={leftPad} y1={warningY} x2={leftPad + width} y2={warningY} stroke="#f97316" strokeDasharray="4 2" strokeOpacity="0.5" strokeWidth="1" />
            <line x1={leftPad} y1={alarmY} x2={leftPad + width} y2={alarmY} stroke="#ef4444" strokeDasharray="4 2" strokeOpacity="0.5" strokeWidth="1" />

            {/* Area */}
            <motion.path
                d={areaPath}
                fill="url(#graphGradient)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
            />

            {/* Main Path */}
            <motion.polyline
                points={points}
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
            />

            {/* Current Point */}
            <motion.circle
                cx={leftPad + width}
                cy={(Math.min(filteredData[filteredData.length - 1].val, maxVal) / maxVal) * height}
                r="3"
                fill="#0ea5e9"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.5 }}
            />
        </svg>
    );
};

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
    const [language, setLanguage] = useState(localStorage.getItem('flood_lang') || 'en');
    const [stationHistory, setStationHistory] = useState([]);
    const [timeframe, setTimeframe] = useState('24h');
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const t = (key) => translations[language][key] || key;

    const STATIONS = ["Doornik", "Oudenaarde", "Gent", "Dendermonde", "Antwerpen"];

    const fetchHistory = async (station) => {
        if (!station) return;
        setIsHistoryLoading(true);
        try {
            const res = await fetch(`/.netlify/functions/get-history?station=${station}`);
            if (res.ok) {
                const data = await res.json();
                setStationHistory(data);
            }
        } catch (e) {
            console.error("History fetch failed", e);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (selectedStation) {
            fetchHistory(selectedStation);
        } else {
            setStationHistory([]);
        }
    }, [selectedStation]);

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

            // Global offline check (based on Antwerpen - our real ESP)
            if (data["Antwerpen"]) {
                setIsOffline(checkIsOffline(data["Antwerpen"]));
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
    }, []); // Only on mount

    // Dedicated effect for global station notifications
    useEffect(() => {
        const stations = Object.keys(allStations);
        if (stations.length === 0) return;

        setLastNotifiedState(prev => {
            const newState = { ...prev };
            let hasChanges = false;

            stations.forEach(name => {
                const station = allStations[name];
                const lastStatus = prev[name] || 'NORMAL';

                // Only notify if status changed AND it's not NORMAL
                if (station.status !== 'NORMAL' && station.status !== lastStatus) {
                    sendNotification(
                        `Flood Alert: ${name} is ${station.status}`,
                        `Current distance: ${station.distance.toFixed(1)}cm`
                    );
                    newState[name] = station.status;
                    hasChanges = true;
                }
                // Reset tracker if it went back to NORMAL
                else if (station.status === 'NORMAL' && lastStatus !== 'NORMAL') {
                    newState[name] = 'NORMAL';
                    hasChanges = true;
                }
            });

            return hasChanges ? newState : prev;
        });
    }, [allStations]);

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

    const getStationInterval = (s) => {
        if (!s || !s.intervals) return 15; // default 15 min
        if (s.status === 'ALARM') return s.intervals.stormy;
        if (s.status === 'WARNING') return s.intervals.moderate;
        return s.intervals.sunny;
    };

    const checkIsOffline = (s) => {
        if (!s || !s.lastSeen) return true;
        const lastSeen = new Date(s.lastSeen);
        const windowMin = getStationInterval(s);
        const bufferWindow = windowMin * 1.25; // +25%
        const diffMin = (new Date() - lastSeen) / 1000 / 60;
        return diffMin > bufferWindow;
    };

    const status = allStations[selectedStation] || allStations["Belgium"];

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
        if (isOffline) return <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold border border-red-500/30">{t('disconnected')}</span>;
        if (!status) return <span className="px-3 py-1 bg-sky-500/20 text-sky-400 rounded-full text-xs font-bold border border-sky-500/30">{t('waiting')}</span>;

        const colors = {
            NORMAL: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            WARNING: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            ALARM: 'bg-red-500/20 text-red-400 border-red-500/30'
        };

        const colorClass = colors[status.status] || colors.NORMAL;
        return <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colorClass}`}>{status.status}</span>;
    };

    const formatLastSeen = () => {
        if (!status?.lastSeen) return t('never');
        const date = new Date(status.lastSeen);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const getGlobalRisk = () => {
        const stations = Object.values(allStations);
        if (stations.length === 0) return { label: t('loading'), color: 'text-slate-500', bg: 'bg-slate-500/10', icon: ShieldAlert };

        const hasAlarm = stations.some(s => s.status === 'ALARM');
        const hasWarning = stations.some(s => s.status === 'WARNING');
        const maxRainProb = Math.max(...stations.map(s => s.weather?.rainProb || 0));

        if (hasAlarm && maxRainProb > 80) return { label: t('extreme_risk'), color: 'text-red-500', bg: 'bg-red-500/20', icon: AlertOctagon, pulse: true };
        if (hasAlarm || (hasWarning && maxRainProb > 70)) return { label: t('high_risk'), color: 'text-orange-500', bg: 'bg-orange-500/20', icon: AlertTriangle, pulse: true };
        if (hasWarning || maxRainProb > 40) return { label: t('elevated_risk'), color: 'text-amber-500', bg: 'bg-amber-500/20', icon: ShieldAlert, pulse: false };
        return { label: t('low_risk'), color: 'text-emerald-500', bg: 'bg-emerald-500/20', icon: ShieldCheck, pulse: false };
    };

    const risk = getGlobalRisk();

    const getRiskExplanation = () => {
        const stations = Object.values(allStations);
        const hasAlarm = stations.some(s => s.status === 'ALARM');
        const hasWarning = stations.some(s => s.status === 'WARNING');
        const maxRainProb = Math.max(...stations.map(s => s.weather?.rainProb || 0));

        if (risk.label === t('extreme_risk')) {
            return t('extreme_risk_desc');
        }
        if (risk.label === t('high_risk')) {
            return `${t('high_risk_desc')} (${maxRainProb}% ${t('rain_prob')})`;
        }
        if (risk.label === t('elevated_risk')) {
            return `${t('elevated_risk_desc')} (${maxRainProb}% ${t('rain_prob')})`;
        }
        return t('stable_conditions');
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
                        <h1 className="text-xl font-bold tracking-tight">{t('title')}</h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-1">
                            <Activity className="w-2.5 h-2.5" /> {t('live_sync')}
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
                    onClick={() => setExpandedRivers(prev => {
                        const nextState = !prev.SCHELDE;
                        if (!nextState) setSelectedStation(null);
                        return { ...prev, SCHELDE: nextState };
                    })}
                    className="flex items-center justify-between w-full mb-0 group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-sky-500/10 rounded-lg group-hover:bg-sky-500/20 transition-colors">
                            <Droplets className="w-4 h-4 text-sky-400" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-[0.2em] text-sky-500">{t('schelde')}</span>
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
                                            onClick={() => setSelectedStation(prev => prev === name ? null : name)}
                                            className={`flex flex-col p-3 rounded-2xl transition-all border gap-2 text-left w-full ${isSelected
                                                ? 'bg-sky-500/10 border-sky-500/50 shadow-[0_0_20px_rgba(14,165,233,0.1)]'
                                                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between w-full">
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
                                            </div>

                                            {/* Last Updated Info */}
                                            <div className="flex items-center justify-between w-full pl-5">
                                                <div className="flex items-center gap-1.5">
                                                    <History className={`w-3 h-3 ${checkIsOffline(s) ? 'text-red-500' : 'text-slate-600'}`} />
                                                    <span className={`text-[10px] font-bold tracking-tight ${checkIsOffline(s)
                                                        ? 'text-red-500 animate-glow-red'
                                                        : 'text-slate-500'
                                                        }`}>
                                                        {s?.lastSeen ? new Date(s.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : t('never')}
                                                    </span>
                                                </div>
                                                {s?.isSimulated && (
                                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-slate-600 border border-slate-700 uppercase">{t('sim_control')}</span>
                                                )}
                                            </div>

                                            {/* Historical Graph & Info */}
                                            <AnimatePresence>
                                                {isSelected && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="mt-4 pt-4 border-t border-slate-800/50 flex flex-col gap-4 w-full"
                                                    >
                                                        {/* Timeframe Selector */}
                                                        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2 scrollbar-hide">
                                                            {['5m', '30m', '3h', '8h', '24h'].map(tf => (
                                                                <button
                                                                    key={tf}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setTimeframe(tf);
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${timeframe === tf
                                                                        ? 'bg-sky-500 text-[#0f172a] shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                                                                        : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                                                                        }`}
                                                                >
                                                                    {tf}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {/* Graph Area */}
                                                        <div className="h-32 w-full bg-slate-950/30 rounded-xl border border-slate-800/50 p-2 relative overflow-hidden">
                                                            {isHistoryLoading ? (
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                                                                </div>
                                                            ) : (
                                                                <HistoricalGraph
                                                                    data={stationHistory}
                                                                    timeframe={timeframe}
                                                                    warning={s?.warning || 30}
                                                                    alarm={s?.alarm || 15}
                                                                />
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
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
                            <p className="text-sm font-semibold">{t('rain_expected')}</p>
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
                            {selectedStation === "Antwerpen" ? t('real_esp_control') : `${selectedStation} ${t('sim_control')}`}
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
                        <span>{t('virtual_distance')}</span>
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
                            ? t('sim_warning')
                            : t('sim_upstream')}
                    </p>
                </div>
            </div>

            {/* Weather & Forecast */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-3xl p-6 z-10"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                            <CloudSun className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-wider text-slate-300">{t('weather_forecast')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/40 rounded-full border border-slate-700/50">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {selectedStation || t('belgium')}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-900/40 rounded-2xl border border-slate-800">
                            <Thermometer className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">{t('temp')}</p>
                            <p className="text-xl font-black">{status?.weather?.temp || '--'}°<span className="text-xs text-slate-500 ml-1">C</span></p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-900/40 rounded-2xl border border-slate-800">
                            <CloudRain className="w-5 h-5 text-sky-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">{t('rain')}</p>
                            <p className="text-xl font-black">{status?.weather?.rainProb || '--'}%</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">{t('three_day_outlook')}</p>
                    <div className="grid grid-cols-3 gap-3">
                        {status?.weather?.daily.map((day, i) => (
                            <div key={i} className="bg-slate-900/30 p-3 rounded-2xl border border-slate-800/50 flex flex-col items-center gap-2">
                                <span className="text-[10px] font-black text-slate-500">{day.day}</span>
                                {day.icon === 'cloud-rain' ? <CloudRain className="w-5 h-5 text-sky-400" /> :
                                    day.icon === 'cloud-sun' ? <CloudSun className="w-5 h-5 text-amber-400" /> :
                                        <Cloud className="w-5 h-5 text-slate-400" />}
                                <span className="text-xs font-bold">{day.temp}°</span>
                                {day.rain > 50 && (
                                    <span className="text-[8px] font-black text-sky-500 uppercase px-1.5 py-0.5 bg-sky-500/10 rounded-full border border-sky-500/20">{t('heavy_rain')}</span>
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
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('monitored_stations')}</span>
                                        <span className="text-sm font-black text-slate-100">{t('stations_monitored')}</span>
                                    </div>
                                    <div className="flex justify-between items-center px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aggregated Rain</span>
                                        <span className="text-sm font-black text-slate-100">{Math.max(...Object.values(allStations).map(s => s.weather?.rainProb || 0))}% {t('max_rain')}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setIsRiskModalOpen(false)}
                                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10`}
                                >
                                    {t('dismiss')}
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
                                    {t('thresholds')}
                                </h2>
                                <button
                                    onClick={() => setIsSettingsOpen(false)}
                                    className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            <p className="text-xs text-slate-500 mb-6 font-bold uppercase tracking-widest leading-relaxed">
                                {t('settings_for')} <span className="text-sky-400">{selectedStation || t('belgium')}</span>.
                                {t('lower_distance')}
                            </p>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-black uppercase text-orange-400 tracking-wider">{t('warning_level')}</label>
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
                                        <label className="text-xs font-black uppercase text-red-500 tracking-wider">{t('alarm_level')}</label>
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
                                    {t('intervals')}
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
                                                <label className={`text-xs font-black uppercase ${item.color} tracking-wider`}>{t(item.key)}</label>
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

                            <div className="mt-8 pt-8 border-t border-slate-800">
                                <h3 className="text-sm font-black tracking-tight flex items-center gap-3 mb-6">
                                    <Waves className="w-4 h-4 text-sky-400" />
                                    {t('language')}
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { code: 'en', label: 'English' },
                                        { code: 'nl', label: 'Nederlands' },
                                        { code: 'fr', label: 'Français' },
                                        { code: 'de', label: 'Deutsch' }
                                    ].map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => {
                                                setLanguage(lang.code);
                                                localStorage.setItem('flood_lang', lang.code);
                                            }}
                                            className={`px-3 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${language === lang.code
                                                ? 'bg-sky-500/10 border-sky-500 text-sky-400'
                                                : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-500'
                                                }`}
                                        >
                                            {lang.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSaveSettings}
                                className="w-full mt-10 bg-sky-500 hover:bg-sky-400 text-[#0f172a] py-4 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-sky-500/10"
                            >
                                {t('save')}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default App;
