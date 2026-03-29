// src/views/ExploreView.jsx
import React, { useState } from 'react';

export default function ExploreView() {
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    if (navigator.vibrate) navigator.vibrate(15); 
    
    // 模擬神識掃描
    setTimeout(() => {
      setIsScanning(false);
    }, 2000);
  };

  return (
    <div className="h-full w-full flex items-center justify-center overflow-hidden">
      <div 
        className="relative flex items-center justify-center cursor-pointer active:scale-95 transition-transform duration-500"
        onClick={handleScan}
      >
        {/* 掃描擴散波紋 */}
        {isScanning && (
          <div className="absolute w-[300px] h-[300px] border border-[#00E5FF] rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_1] opacity-20"></div>
        )}
        
        {/* 陣盤外圈 */}
        <div className="absolute w-[240px] h-[240px] border-[1px] border-dashed border-[#1C1F2A] rounded-full animate-[spin_30s_linear_infinite_reverse]"></div>
        
        {/* 陣盤中圈 */}
        <div className="absolute w-[180px] h-[180px] border-[0.5px] border-[#00E5FF] rounded-full opacity-30 animate-[spin_40s_linear_infinite] drop-shadow-[0_0_8px_rgba(0,229,255,0.3)]">
          <div className="absolute top-[-2px] left-1/2 w-1 h-2 bg-[#00E5FF] -translate-x-1/2 drop-shadow-[0_0_5px_rgba(0,229,255,1)]"></div>
          <div className="absolute bottom-[-2px] left-1/2 w-1 h-2 bg-[#00E5FF] -translate-x-1/2 opacity-50"></div>
          <div className="absolute left-[-2px] top-1/2 w-2 h-1 bg-[#00E5FF] -translate-y-1/2 opacity-50"></div>
          <div className="absolute right-[-2px] top-1/2 w-2 h-1 bg-[#00E5FF] -translate-y-1/2 opacity-50"></div>
        </div>

        {/* 陣盤核心 */}
        <div className={`w-[80px] h-[80px] rounded-full flex items-center justify-center transition-all duration-1000 ${isScanning ? 'shadow-[0_0_30px_rgba(0,229,255,0.6)]' : 'shadow-[0_0_15px_rgba(0,229,255,0.15)] bg-[#151821]'}`}>
          <div className="w-[40px] h-[40px] border-[2px] border-[#00E5FF] rounded-sm rotate-45 opacity-80 animate-[pulse_3s_ease-in-out_infinite]"></div>
        </div>
        
        <div className="absolute -bottom-16 text-[#00E5FF] text-[10px] tracking-[8px] opacity-30 font-light">
          {isScanning ? '神識外放中...' : '凝神聚氣'}
        </div>
      </div>
    </div>
  );
}