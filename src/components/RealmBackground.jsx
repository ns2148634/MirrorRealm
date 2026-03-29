// src/components/RealmBackground.jsx
import React, { useState } from 'react';

export default function RealmBackground() {
  // 生成背景的游離靈氣粒子 (只在初次渲染時生成一次)
  const [particles] = useState(() => 
    Array.from({ length: 30 }).map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 10 + 10, // 10s ~ 20s
      delay: Math.random() * -20,
    }))
  );

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#0A0C10]">
      {/* 核心星雲光暈 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.08)_0%,rgba(10,12,16,1)_70%)] pointer-events-none"></div>
      
      {/* 底部 3D 透視靈力網格 */}
      <div className="absolute inset-0 opacity-15" style={{
        backgroundImage: 'linear-gradient(#00E5FF 1px, transparent 1px), linear-gradient(90deg, #00E5FF 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        transform: 'perspective(600px) rotateX(70deg) translateY(-50px) translateZ(-200px)',
      }}></div>

      {/* 游離靈氣粒子 (星空效果) */}
      {particles.map((p, i) => (
        <div key={i} className="absolute rounded-full bg-[#00E5FF] animate-pulse pointer-events-none opacity-40"
          style={{
            top: p.top, left: p.left, width: p.size, height: p.size,
            boxShadow: '0 0 8px #00E5FF',
            animation: `float ${p.duration}s infinite linear`,
            animationDelay: `${p.delay}s`
          }}
        ></div>
      ))}

      {/* 最外圍的巨大淡影八卦法陣 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-[2px] border-dashed border-white/[0.03] rounded-full animate-[spin_120s_linear_infinite] flex items-center justify-center">
        <div className="w-[600px] h-[600px] border-[1px] border-white/[0.02] rounded-full"></div>
      </div>

      {/* CSS 動畫定義 (用於粒子漂浮) */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
        }
      `}} />
    </div>
  );
}