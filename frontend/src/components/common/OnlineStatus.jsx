import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 3000);
    };
    const handleOffline = () => {
      setOnline(false);
      setShowRestored(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online && !showRestored) return null;

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium transition-all ${
      online
        ? 'bg-green-600 text-white'
        : 'bg-gray-900 text-white'
    }`}>
      {online
        ? <><Wifi size={16} /> Đã kết nối lại mạng</>
        : <><WifiOff size={16} /> Bạn đang offline. Dữ liệu có thể chưa được cập nhật.</>
      }
    </div>
  );
}
