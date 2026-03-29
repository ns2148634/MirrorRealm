import React, { useState } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../store/gameStore';

const NamingStage = () => {
  const [inputName, setInputName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const createCharacter = useGameStore((state) => state.createCharacter);

  const handleConfirmName = async () => {
    if (inputName.trim() === '') return;
    
    setIsLoading(true);
    const result = await createCharacter(inputName);
    setIsLoading(false);
    
    if (!result.success) {
      alert(result.error);
    }
  };

  return (
    <motion.div 
      key="naming"
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center p-[8cqw] backdrop-blur-md bg-stone-900/80"
    >
      <div className="w-full max-w-[85%] p-[8cqw] rounded-xl border border-stone-500/40 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col items-center bg-stone-950/60">
        <h2 className="text-stone-200 font-calligraphy text-[8cqw] tracking-widest mb-[6cqw]">凝聚真名</h2>
        
        <input 
          type="text" 
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
          placeholder="請輸入道友名諱..."
          className="w-full bg-stone-800/50 border border-stone-600/50 rounded-lg py-[3cqw] px-[4cqw] text-white font-kaiti text-[5cqw] text-center focus:outline-none focus:border-cyan-500/80 transition-colors mb-[6cqw]"
          maxLength={6}
        />

        <button 
          onClick={handleConfirmName}
          disabled={inputName.trim() === '' || isLoading}
          className={`py-[3cqw] w-full rounded-lg font-kaiti text-[5cqw] transition-colors tracking-widest ${
            inputName.trim() === '' || isLoading
              ? 'bg-stone-800 text-stone-500 border border-stone-700' 
              : 'bg-cyan-800/80 text-cyan-100 border border-cyan-500/50 hover:bg-cyan-700 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
          }`}
        >
          {isLoading ? '凝聚中...' : '踏入仙途'}
        </button>
      </div>
    </motion.div>
  );
};

export default NamingStage;
