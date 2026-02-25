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
    BellRing,
    CloudSun,
    CloudRain,
    Wind,
    Thermometer,
    Cloud,
    Sun,
    CloudLightning,
    ShieldAlert,
    ShieldCheck,
    AlertOctagon,
    Timer
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
            case '1h': return diffMin <= 60;
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
    const height = 160;
    const width = 600;
    const leftPad = 40;

    const timeframeMs = {
        '1h': 1 * 60 * 60 * 1000,
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

    const formatTime = (ts, prevTs = null) => {
        const d = new Date(ts);
        const prevD = prevTs ? new Date(prevTs) : null;
        const showDate = !prevD || d.toDateString() !== prevD.toDateString();
        const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        return showDate ? `${d.getDate()}/${d.getMonth() + 1} ${timeStr}` : timeStr;
    };

    const xLabels = [];
    if (filteredData.length >= 2) {
        const windowStart = now.getTime() - timeframeMs;
        const windowEnd = now.getTime();
        const durationMin = timeframeMs / 1000 / 60;

        let intervalMin = 60;
        if (durationMin <= 60) intervalMin = 15;
        else if (durationMin <= 240) intervalMin = 60;
        else if (durationMin <= 480) intervalMin = 120;
        else intervalMin = 240;

        // Start Label
        xLabels.push({ x: leftPad, label: formatTime(windowStart), ts: windowStart });

        const startD = new Date(windowStart);
        const nextMark = new Date(startD);
        nextMark.setMinutes(Math.ceil((nextMark.getMinutes() + 1) / intervalMin) * intervalMin, 0, 0);

        let currentMark = nextMark.getTime();
        let safety = 0;
        let lastX = leftPad;

        while (currentMark < windowEnd - (intervalMin * 60 * 1000 * 0.5) && safety < 50) {
            const ratio = (currentMark - windowStart) / timeframeMs;
            const x = leftPad + ratio * width;

            // Only add if at least 60px from previous label to prevent overlap
            if (x - lastX > 60) {
                xLabels.push({
                    x,
                    label: formatTime(currentMark, xLabels[xLabels.length - 1]?.ts),
                    ts: currentMark
                });
                lastX = x;
            }
            currentMark += intervalMin * 60 * 1000;
            safety++;
        }

        // End Label (if not too close to the last one)
        const endX = leftPad + width;
        if (endX - lastX > 40) {
            xLabels.push({ x: endX, label: formatTime(windowEnd, xLabels[xLabels.length - 1]?.ts), ts: windowEnd });
        }
    }

    const yTicks = [];
    const tickStep = maxVal <= 100 ? 25 : 50;
    for (let i = 0; i <= maxVal; i += tickStep) {
        yTicks.push(i);
    }

    return (
        <svg viewBox={`0 0 ${leftPad + width + 20} ${height + 30}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
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
    const [isWeatherCompact, setIsWeatherCompact] = useState(false);
    const [isSimCompact, setIsSimCompact] = useState(true);
    const [simWeather, setSimWeather] = useState('sunny'); // 'sunny', 'moderate', 'stormy', 'waterbomb'
    const [cloudApiKey, setCloudApiKey] = useState(localStorage.getItem('flood_api_key') || '');


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

            // Sync simulator distance with current cloud value if it exists
            const currentStat = allStations[selectedStation];
            if (currentStat && currentStat.distance !== undefined && selectedStation !== "Antwerpen") {
                setSimDistance(currentStat.distance);
            }
        } else {
            setStationHistory([]);
        }
    }, [selectedStation, allStations]);

    const sendNotification = (title, body) => {
        if (!("Notification" in window) || Notification.permission !== "granted") return;
        new Notification(title, { body, icon: "/favicon.ico" });
    };

    const fetchStatus = async () => {
        try {
            const res = await fetch(`/.netlify/functions/get-status`);
            if (!res.ok) throw new Error('Cloud unreachable');
            const data = await res.json();

            // Remap cloud keys (now lowercase) back to display-name keys so all
            // existing allStations[selectedStation] lookups keep working.
            const STATION_DISPLAY = ["Doornik", "Oudenaarde", "Gent", "Dendermonde", "Antwerpen"];
            const normalized = { ...data }; // keep Belgium etc.
            for (const displayName of STATION_DISPLAY) {
                const lk = displayName.toLowerCase();
                if (data[lk] && !data[displayName]) {
                    normalized[displayName] = data[lk];
                    delete normalized[lk];
                }
            }

            setAllStations(normalized);
            const current = normalized[selectedStation];

            if (current && !isSettingsOpen) {
                setLocalWarning(current.warning);
                setLocalAlarm(current.alarm);
                if (current.intervals) {
                    setLocalIntervals(current.intervals);
                }
            }

            // Global offline check (based on Antwerpen - our real ESP)
            if (normalized["Antwerpen"]) {
                setIsOffline(checkIsOffline(normalized["Antwerpen"]));
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
        if (!cloudApiKey.trim()) {
            alert('Please enter your Cloud API Key in the settings first. You can find it in your Config.h (CLOUD_API_KEY).');
            return;
        }

        let cleanKey = cloudApiKey.trim();
        // If user accidentally pasted the whole #define line from Config.h
        if (cleanKey.includes('#define') || cleanKey.includes('"')) {
            const match = cleanKey.match(/"([^"]+)"/);
            if (match) cleanKey = match[1];
            else {
                // If no quotes, just split and take last part if it looks like #define
                const parts = cleanKey.split(/\s+/);
                if (parts.length > 2 && parts[0] === '#define') cleanKey = parts[2];
            }
        }

        try {
            const res = await fetch(`/.netlify/functions/push-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cleanKey}`,
                    'x-api-key': cleanKey
                },

                body: JSON.stringify({
                    station: selectedStation,
                    distance: status?.distance || 100,
                    warning: parseFloat(localWarning),
                    alarm: parseFloat(localAlarm),
                    status: (status?.distance || 100) <= parseFloat(localAlarm) ? 'ALARM' : ((status?.distance || 100) <= parseFloat(localWarning) ? 'WARNING' : 'NORMAL'),
                    forecast: status?.forecast || "Updated settings",
                    rainExpected: status?.rainExpected || false,
                    intervals: localIntervals,
                    isUiUpdate: true
                })
            });
            console.log(`[Cloud] Save Payload for station "${selectedStation}":`, {
                warning: parseFloat(localWarning),
                alarm: parseFloat(localAlarm),
                isUiUpdate: true
            });
            if (!res.ok) {
                const errorText = await res.text();
                console.error(`Save failed with status ${res.status}: ${errorText}`);
                alert(`Cloud Save Error (${res.status}): ${errorText}`);
                throw new Error('Save failed');
            }

            localStorage.setItem('flood_api_key', cleanKey);
            setCloudApiKey(cleanKey);
            setIsSettingsOpen(false);
            fetchStatus();

        } catch (e) {
            alert('Failed to save settings to cloud');
        }
    };

    useEffect(() => {
        if (selectedStation) {
            const current = allStations[selectedStation.toLowerCase().trim()] || allStations[selectedStation];
            if (current && !isSettingsOpen) {
                if (current.warning !== undefined) setLocalWarning(current.warning);
                if (current.alarm !== undefined) setLocalAlarm(current.alarm);
                if (current.intervals) setLocalIntervals(current.intervals);

                // Also sync simulator distance for virtual stations
                if (current.distance !== undefined && selectedStation !== "Antwerpen") {
                    setSimDistance(current.distance);
                }
            }
        }
    }, [selectedStation, allStations, isSettingsOpen]); // Added isSettingsOpen

    const handleSimPush = async (station, distance, forceWeather) => {
        if (!cloudApiKey.trim()) return;

        console.log(`[Sim] Pushing to ${station}: ${distance}cm (Force Weather: ${forceWeather || 'None'})`);

        const finalDistance = distance; // Always use the slider value
        const weatherToUse = forceWeather || simWeather;

        const weatherMap = {
            sunny: { forecast: "Simulation: Clear", rain: false },
            moderate: { forecast: "Simulation: Moderate Rain", rain: true },
            stormy: { forecast: "Simulation: Stormy / Heavy", rain: true },
            waterbomb: { forecast: "Simulation: Waterbomb", rain: true }
        };

        const w = weatherMap[weatherToUse] || weatherMap.sunny;

        try {
            const res = await fetch(`/.netlify/functions/push-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cloudApiKey.trim()}`,
                    'x-api-key': cloudApiKey.trim()
                },
                body: JSON.stringify({
                    station,
                    distance: finalDistance,
                    warning: parseFloat(localWarning),
                    alarm: parseFloat(localAlarm),
                    status: finalDistance <= parseFloat(localAlarm) ? 'ALARM' : (finalDistance <= parseFloat(localWarning) ? 'WARNING' : 'NORMAL'),
                    simWeatherTier: weatherToUse,  // cloud uses this to set weather+interval
                    intervals: localIntervals,
                    isUiUpdate: true
                })
            });
            if (!res.ok) {
                const errorText = await res.text();
                console.error(`Simulation push failed: ${errorText}`);
                throw new Error('Push failed');
            }
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
        <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto h-screen flex flex-col pt-5 relative overflow-hidden text-slate-100 font-sans">
            {/* Background Glow */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 blur-[120px] pointer-events-none transition-colors duration-1000 ${risk.label.includes('EXTREME') ? 'bg-red-500/20' :
                risk.label.includes('HIGH') ? 'bg-orange-500/20' :
                    risk.label.includes('ELEVATED') ? 'bg-amber-500/20' : 'bg-sky-500/10'
                }`} />

            {/* Header */}
            <header className="flex items-center justify-between z-10 px-5 mb-6">
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

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-24 scrollbar-hide">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 z-10">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Weather & Forecast */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`glass-card rounded-3xl z-10 transition-all duration-300 ${isWeatherCompact ? 'p-4' : 'p-6'}`}
                        >
                            <button
                                onClick={() => setIsWeatherCompact(!isWeatherCompact)}
                                className="flex items-center justify-between w-full group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors">
                                        <CloudSun className={`w-4 h-4 text-amber-400 ${isWeatherCompact ? '' : 'animate-pulse'}`} />
                                    </div>
                                    <span className="text-sm font-black uppercase tracking-[0.2em] text-amber-500">
                                        {selectedStation || t('belgium')}
                                    </span>

                                    {isWeatherCompact && (
                                        <div className="flex items-center gap-4 ml-2 animate-in fade-in slide-in-from-left-2 duration-500">
                                            <div className="flex items-center gap-1.5">
                                                <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                                                <span className="text-xs font-black text-slate-200">{status?.weather?.temp || '--'}°</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                                                <span className="text-xs font-black text-slate-200">{status?.weather?.rainProb || '--'}%</span>
                                            </div>
                                            {(() => {
                                                const iv = localIntervals || { sunny: 15, moderate: 10, stormy: 5, waterbomb: 2 };
                                                // When simulator is active, use simWeather directly — real ESP overwrites cloud forecast continuously
                                                let tier;
                                                if (isSimActive) {
                                                    tier = simWeather; // 'sunny' | 'moderate' | 'stormy' | 'waterbomb'
                                                } else {
                                                    const fc = (status?.forecast || '').toLowerCase();
                                                    if (status?.status === 'ALARM' || fc.includes('waterbomb')) {
                                                        tier = 'waterbomb';
                                                    } else if (status?.status === 'WARNING' || fc.includes('stormy') || fc.includes('heavy')) {
                                                        tier = 'stormy';
                                                    } else if (status?.rainExpected || fc.includes('rain')) {
                                                        tier = 'moderate';
                                                    } else {
                                                        tier = 'sunny';
                                                    }
                                                }
                                                const mins = iv[tier];
                                                const colors = {
                                                    sunny: 'text-emerald-400',
                                                    moderate: 'text-sky-400',
                                                    stormy: 'text-orange-400',
                                                    waterbomb: 'text-red-400'
                                                };
                                                return (
                                                    <div className="flex items-center gap-1.5">
                                                        <Timer className={`w-3.5 h-3.5 ${colors[tier]}`} />
                                                        <span className={`text-xs font-black ${colors[tier]}`}>{mins}m</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    {isWeatherCompact ? <ChevronRight className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                                </div>
                            </button>

                            <AnimatePresence>
                                {!isWeatherCompact && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                        animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
                                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                        className="overflow-hidden"
                                    >
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
                                )}
                            </AnimatePresence>
                        </motion.div>

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
                                                                    {/* Stats Header */}
                                                                    {(() => {
                                                                        const filtered = stationHistory.filter(d => {
                                                                            const diffMin = (new Date() - new Date(d.ts)) / 1000 / 60;
                                                                            if (timeframe === '1h') return diffMin <= 60;
                                                                            if (timeframe === '3h') return diffMin <= 180;
                                                                            if (timeframe === '8h') return diffMin <= 480;
                                                                            return true; // 24h
                                                                        });
                                                                        if (filtered.length === 0) return null;

                                                                        const minVal = Math.min(...filtered.map(d => d.val)).toFixed(1);
                                                                        const maxVal = Math.max(...filtered.map(d => d.val)).toFixed(1);

                                                                        return (
                                                                            <div className="flex justify-between items-center px-1">
                                                                                <div className="flex gap-4">
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('min')}</span>
                                                                                        <span className="text-sm font-black text-sky-400">
                                                                                            {minVal}
                                                                                            <span className="text-[10px] ml-0.5 opacity-50">cm</span>
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('max')}</span>
                                                                                        <span className="text-sm font-black text-slate-200">
                                                                                            {maxVal}
                                                                                            <span className="text-[10px] ml-0.5 opacity-50">cm</span>
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-slate-800/50 px-2 py-0.5 rounded-lg border border-slate-700/50">
                                                                                    {timeframe} {t('window')}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* Graph Area */}
                                                                    <div className="h-48 w-full bg-slate-950/30 rounded-xl border border-slate-800/50 p-2 relative overflow-hidden">
                                                                        <div className="absolute top-1 right-2 text-[8px] font-bold text-slate-600 z-10 pointer-events-none">
                                                                            {stationHistory.length} pts
                                                                        </div>
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

                                                                    {/* Timeframe Selector (Now below graph) */}
                                                                    <div className="flex items-center justify-end gap-1 overflow-x-auto pb-2 scrollbar-hide">
                                                                        {['1h', '3h', '8h', '24h'].map(tf => (
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
                    </div>

                    <div className="space-y-6">
                        {/* Simulator */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`glass-card rounded-3xl transition-all duration-300 ${isSimCompact ? 'p-4' : 'p-6'}`}
                        >
                            <button
                                onClick={() => setIsSimCompact(!isSimCompact)}
                                className="flex items-center justify-between w-full group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg transition-colors ${isSimActive ? 'bg-purple-500/20' : 'bg-slate-800'}`}>
                                        <Activity className={`w-4 h-4 ${isSimActive ? 'text-purple-400' : 'text-slate-500'}`} />
                                    </div>
                                    <span className="text-sm font-black uppercase tracking-[0.2em] text-purple-400">
                                        {selectedStation} SIMULATOR
                                    </span>

                                    {isSimCompact && isSimActive && (
                                        <div className="flex items-center gap-2 ml-2 animate-in fade-in slide-in-from-left-2 duration-500">
                                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                {simDistance}cm
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    {isSimCompact ? <ChevronRight className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                                </div>
                            </button>

                            <AnimatePresence>
                                {!isSimCompact && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                        animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
                                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className={`space-y-6 transition-opacity duration-300`}>
                                            <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-2xl border border-slate-800/50">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</span>
                                                    <span className={`text-xs font-black ${isSimActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                        {isSimActive ? 'SIMULATION ACTIVE' : 'INACTIVE'}
                                                    </span>
                                                </div>
                                                <div
                                                    onClick={() => handleSimChange(!isSimActive, simDistance)}
                                                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${isSimActive ? 'bg-purple-500' : 'bg-slate-700'}`}
                                                >
                                                    <div className={`bg-white w-4 h-4 rounded-full transition-transform ${isSimActive ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </div>
                                            </div>

                                            <div className={`space-y-4 transition-all duration-300 ${isSimActive ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>

                                                {/* Weather Selection */}
                                                <div className="space-y-3 pb-2">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('weather_condition')}</span>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {[
                                                            { id: 'sunny', label: t('sunny'), icon: Sun },
                                                            { id: 'moderate', label: t('moderate'), icon: CloudRain },
                                                            { id: 'stormy', label: t('stormy'), icon: CloudLightning },
                                                            { id: 'waterbomb', label: t('waterbomb'), icon: Waves }
                                                        ].map(w => (
                                                            <button
                                                                key={w.id}
                                                                onClick={() => {
                                                                    setSimWeather(w.id);
                                                                    handleSimPush(selectedStation, simDistance, w.id);
                                                                }}
                                                                className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${simWeather === w.id
                                                                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                                                                    : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
                                                                    }`}
                                                            >
                                                                <w.icon className={`w-3.5 h-3.5 ${simWeather === w.id ? 'text-purple-400' : 'text-slate-500'}`} />
                                                                <span className="text-[10px] font-black uppercase tracking-tight">{w.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className={`space-y-4 ${selectedStation === "Antwerpen" ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                        <span>{t('virtual_distance')}</span>
                                                        <span className="text-xl font-black text-purple-400 monospace">
                                                            {(selectedStation === "Antwerpen" ? (status?.distance || 100) : simDistance)}
                                                            <span className="text-[10px] ml-0.5">cm</span>
                                                        </span>
                                                    </div>
                                                    <div className="px-2">
                                                        <input
                                                            type="range"
                                                            min="2"
                                                            max="400"
                                                            disabled={selectedStation === "Antwerpen"}
                                                            value={selectedStation === "Antwerpen" ? (status?.distance || 100) : simDistance}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value);
                                                                console.log(`[Slider] New value for ${selectedStation}: ${val}`);
                                                                setSimDistance(val);
                                                            }}
                                                            onMouseUp={(e) => handleSimPush(selectedStation, parseInt(e.target.value))}
                                                            onTouchEnd={(e) => handleSimPush(selectedStation, parseInt(e.target.value))}
                                                            className="w-full accent-purple-500 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer"
                                                        />
                                                    </div>
                                                </div>

                                                {selectedStation === "Antwerpen" && (
                                                    <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 flex items-center gap-3">
                                                        <ShieldAlert className="w-3.5 h-3.5 text-amber-500/60" />
                                                        <p className="text-[9px] text-amber-500/70 font-black uppercase tracking-tight uppercase leading-none">
                                                            {t('real_station_safeguard')}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="p-4 bg-purple-500/5 rounded-2xl border border-purple-500/10">
                                                    <div className="flex items-start gap-3">
                                                        <AlertTriangle className="w-4 h-4 text-purple-500/60 mt-0.5" />
                                                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed uppercase tracking-tight">
                                                            {selectedStation === "Antwerpen" ? t('sim_warning') : t('sim_upstream')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                    </div>
                </div>
            </div>

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
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}

                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 border-t border-slate-800 w-full h-full overflow-hidden flex flex-col fixed inset-0 z-50 pt-safe"
                        >
                            <div className="flex-1 flex flex-col w-full max-w-xl mx-auto min-h-0">
                                <div className="flex items-center justify-between p-8 pb-4">
                                    <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                                        <Settings className="w-5 h-5 text-sky-400" />
                                        {t('settings')}
                                    </h2>
                                    <button
                                        onClick={() => setIsSettingsOpen(false)}
                                        className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
                                    >
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                </div>



                                <div className="flex-1 overflow-y-auto px-8 pb-12 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent touch-pan-y">
                                    <div className="space-y-8">
                                        {/* Thresholds Section */}
                                        <div className="space-y-6">
                                            <h3 className="text-sm font-black tracking-tight flex items-center gap-3 mb-6">
                                                <BellRing className="w-4 h-4 text-orange-400" />
                                                {t('thresholds')}
                                            </h3>
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
                                            <h3 className="text-sm font-black tracking-tight flex items-center gap-3 mb-1">
                                                <Droplets className="w-4 h-4 text-sky-400" />
                                                {t('intervals')}
                                            </h3>
                                            <p className="text-[10px] text-slate-500 font-medium mb-6">
                                                {t('battery_warning')}
                                            </p>

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
                                                <ShieldAlert className="w-4 h-4 text-sky-400" />
                                                Cloud Settings
                                            </h3>
                                            <div className="space-y-3">
                                                <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Netlify API Key</label>
                                                <input
                                                    type="password"
                                                    value={cloudApiKey}
                                                    onChange={(e) => setCloudApiKey(e.target.value)}
                                                    placeholder="Enter CLOUD_API_KEY"
                                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-sky-400 focus:border-sky-500 outline-none transition-all"
                                                />
                                                <p className="text-[9px] text-slate-600 font-medium">This key is required to save changes to the cloud. Find it in your Config.h (CLOUD_API_KEY).</p>
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-8 border-t border-slate-800 pb-2">

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
                                    </div>
                                </div>

                                {/* Fixed Bottom Save Button */}
                                <div className="p-8 pt-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-800">
                                    <button
                                        onClick={handleSaveSettings}
                                        className="w-full bg-sky-500 hover:bg-sky-400 text-[#0f172a] py-4 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-sky-500/10"
                                    >
                                        {t('save')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default App;
