import { useState, useEffect } from 'react';

function elapsed(startTime) {
  const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  if (diff < 60)   return { text: `${diff}s`,                          mins: 0 };
  if (diff < 3600) return { text: `${Math.floor(diff/60)}p ${diff%60}s`, mins: Math.floor(diff/60) };
  const h = Math.floor(diff/3600), m = Math.floor((diff%3600)/60);
  return { text: `${h}h ${m}p`,  mins: h*60+m };
}

export default function LiveTimer({ startTime, warnAfterMinutes = 30, className = '' }) {
  const [state, setState] = useState(() => elapsed(startTime));

  useEffect(() => {
    const id = setInterval(() => setState(elapsed(startTime)), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const isWarning = state.mins >= warnAfterMinutes;
  return (
    <span className={`font-mono text-sm font-semibold tabular-nums ${isWarning ? 'text-red-400 eoc-pulse' : 'text-emerald-400'} ${className}`}>
      {state.text}
    </span>
  );
}
