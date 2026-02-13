import { useState, useEffect, useMemo, useRef } from 'react'
import { User, Zap, Coins, Clock, Sparkles, ScrollText, Compass, Briefcase, Package, Check } from 'lucide-react'

// --- 導入天條與邏輯 ---
import { MORTAL_LAWS, TIME_CONFIG, AWAKENING_CONFIG } from './constants'
import { calculateAge, getStaminaRecoveryRate } from './logic/timeAndStamina'
import { calculateInheritance } from './logic/inheritance'
import { calculateSpiritRoot } from './logic/spiritRoot'

function App() {
  const [view, setView] = useState('room') 
  const [scale, setScale] = useState(1)
  
  // --- 佈局狀態 (從 localStorage 讀取，若無則使用預設) ---
  const [isEditing, setIsEditing] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const longPressTimer = useRef(null)

  const initialLayout = [
    { id: 'log', w: 2, h: 2, asset: 'grid_log.png', title: '修煉日誌' },
    { id: 'compass', w: 1, h: 1, asset: 'grid_compass.png', title: '推門而出' },
    { id: 'jade', w: 1, h: 1, asset: 'grid_jade.png', title: '靈根感應' },
    { id: 'money', w: 1, h: 1, asset: 'grid_money.png', title: '財貨洗髓' },
    { id: 'incense', w: 1, h: 1, asset: 'grid_incense.png', title: '壽元餘煙' },
  ]

  const [deskLayout, setDeskLayout] = useState(() => {
    const saved = localStorage.getItem('mirror_world_layout')
    return saved ? JSON.parse(saved) : initialLayout
  })

  // 儲存佈局
  useEffect(() => {
    localStorage.setItem('mirror_world_layout', JSON.stringify(deskLayout))
  }, [deskLayout])

  // --- 狀態數據 ---
  const [stats, setStats] = useState({
    name: '虛雲子', age: 16, daysPassed: 0, physique: 15, qi: 0, 
    stamina: 80, money: 1000, inventory: { rice: 5 }, heirlooms: [],
    affinities: { GOLD: 20, WOOD: 10, WATER: 10, FIRE: 10, EARTH: 10 }
  })

  const spiritRoot = useMemo(() => calculateSpiritRoot(stats.affinities), [stats.affinities])
  const recoveryRate = useMemo(() => getStaminaRecoveryRate(stats.age), [stats.age])
  const canAwake = stats.physique >= AWAKENING_CONFIG.STAT_THRESHOLD && stats.qi >= AWAKENING_CONFIG.STAT_THRESHOLD

  // 9:16 縮放
  useEffect(() => {
    const handleResize = () => setScale(Math.min(window.innerWidth / 480, window.innerHeight / 854) * 0.95)
    handleResize(); window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 時間計時器
  useEffect(() => {
    const timer = setInterval(() => {
      setStats(prev => {
        const nextDays = prev.daysPassed + (1 / 86400)
        const nextAge = calculateAge(nextDays)
        if (nextAge >= TIME_CONFIG.MAX_AGE) { setView('rebirth'); return { ...prev, age: TIME_CONFIG.MAX_AGE } }
        const actualGain = 0.05 * getStaminaRecoveryRate(nextAge)
        return { ...prev, daysPassed: nextDays, age: nextAge, stamina: Math.min(100, prev.stamina + actualGain) }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // --- 🔥 關鍵修正：相容桌機與手機的長按邏輯 ---
  const startPress = () => {
    if (isEditing) return
    longPressTimer.current = setTimeout(() => {
      setIsEditing(true)
      if (window.navigator.vibrate) window.navigator.vibrate(50) 
    }, 800)
  }

  const endPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // --- 拖拽邏輯 ---
  const onDragStart = (index) => isEditing && setDraggedIndex(index)
  const onDragOver = (e, index) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    const newLayout = [...deskLayout]
    const draggedItem = newLayout[draggedIndex]
    newLayout.splice(draggedIndex, 1)
    newLayout.splice(index, 0, draggedItem)
    setDraggedIndex(index)
    setDeskLayout(newLayout)
  }

  const assetPath = '/assets/mortal'

  const renderTile = (item, index) => {
    const isLog = item.id === 'log'
    return (
      <div 
        key={item.id}
        draggable={isEditing}
        onDragStart={() => onDragStart(index)}
        onDragOver={(e) => onDragOver(e, index)}
        onDragEnd={() => setDraggedIndex(null)}
        // 手機端
        onTouchStart={startPress}
        onTouchEnd={endPress}
        // 桌機端
        onMouseDown={startPress}
        onMouseUp={endPress}
        onMouseLeave={endPress}
        className={`relative transition-all duration-300 ${isLog ? 'col-span-2 row-span-2 min-h-[160px]' : 'aspect-square'} 
          ${isEditing ? 'animate-wiggle cursor-move ring-2 ring-amber-500/50 ring-dashed' : 'border border-stone-700'} 
          ${draggedIndex === index ? 'opacity-20 scale-95' : 'opacity-100'}
          rounded-3xl bg-stone-800/40 p-4 shadow-lg flex flex-col items-center justify-center overflow-hidden`}
      >
        <img src={`${assetPath}/${item.asset}`} className={`${isLog ? 'absolute right-2 bottom-2 w-20 opacity-20' : 'w-16 h-16'} pointer-events-none`} />
        
        {isLog ? (
          <div className="w-full h-full flex flex-col pointer-events-none">
            <h3 className="text-xs text-amber-200/60 mb-2 border-b border-stone-700 pb-1">{item.title}</h3>
            <p className="text-sm text-stone-400 italic">「體魄 {stats.physique}%，真氣 {Math.floor(stats.qi)}%...」</p>
            {!isEditing && (
              <button onClick={(e) => { e.stopPropagation(); setStats(p => ({...p, physique: p.physique + 1, stamina: p.stamina - 10})); }} 
                className="mt-auto pointer-events-auto w-full py-2 rounded-lg bg-amber-900/20 border border-amber-600/30 text-amber-500 text-xs active:scale-95 transition">習武</button>
            )}
          </div>
        ) : (
          <span className="mt-1 text-[10px] text-stone-500 pointer-events-none">{item.title}</span>
        )}

        {isEditing && (
          <div className="absolute top-2 right-2 bg-amber-500 rounded-full p-1 shadow-lg pointer-events-none animate-pulse">
            <Briefcase size={10} className="text-black" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-stone-950 flex justify-center items-center overflow-hidden font-serif">
      <div style={{ width: '480px', height: '854px', transform: `scale(${scale})` }}
           className="relative bg-stone-900 overflow-hidden border-4 border-stone-800 flex flex-col shadow-2xl">
        
        {/* HUD */}
        <header className="z-10 border-b border-stone-700 bg-stone-900/80 p-5 backdrop-blur-md">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-amber-100 tracking-tighter">{stats.name}</h1>
            <div className="text-right">
              {isEditing ? (
                <button onClick={() => setIsEditing(false)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs flex items-center gap-2 shadow-lg active:scale-95 transition">
                  <Check size={14}/> 儲存格局
                </button>
              ) : (
                <div className="flex flex-col items-end">
                  <p className="font-mono text-amber-500 text-xl">{stats.age.toFixed(2)} 歲</p>
                  <p className="text-[9px] text-stone-600">長按案几可重排格局</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full bg-stone-800 rounded-full overflow-hidden border border-stone-700">
            <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000" style={{ width: `${stats.stamina}%` }} />
          </div>
        </header>

        {/* --- 案几物件網格 --- */}
        <main className="z-10 flex-1 grid grid-cols-2 gap-4 p-6 auto-rows-min overflow-y-auto scrollbar-hide">
          {deskLayout.map((item, index) => renderTile(item, index))}
        </main>

        <footer className="z-10 h-20 border-t border-stone-800 bg-stone-950 flex p-4 gap-3">
          <button className="flex-1 text-stone-600 text-[10px] flex flex-col items-center justify-center gap-1"><Package size={18}/>行囊</button>
          <button onClick={() => setView('map')} className="flex-[2] rounded-2xl bg-amber-900/20 border border-amber-600/30 text-amber-500 font-bold text-sm hover:bg-amber-900/40 active:scale-95 transition">推門出戶</button>
          <button className="flex-1 text-stone-600 text-[10px] flex flex-col items-center justify-center gap-1"><ScrollText size={18}/>天條</button>
        </footer>

        {/* CSS 動畫 */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes wiggle {
            0% { transform: rotate(0.8deg); }
            50% { transform: rotate(-0.8deg); }
            100% { transform: rotate(0.8deg); }
          }
          .animate-wiggle { animation: wiggle 0.25s infinite ease-in-out; }
        `}} />
      </div>
    </div>
  )
}

export default App