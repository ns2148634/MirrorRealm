// src/logic/timeAndStamina.js
import { TIME_CONFIG, STAMINA_CONFIG } from '../constants';

/**
 * 計算當前年齡
 * @param {number} daysPassed - 從角色創建至今經過的天數 (可含小數，代表當天進度)
 * @returns {number} 
 */
export const calculateAge = (daysPassed) => {
  const age = TIME_CONFIG.START_AGE + (daysPassed * TIME_CONFIG.YEARS_PER_DAY);
  return Math.min(age, TIME_CONFIG.FINAL_AGE);
};

/**
 * 根據年齡計算當前的體力恢復倍率
 * @param {number} currentAge 
 * @returns {number} recoveryRate
 */
export const getStaminaRecoveryRate = (currentAge) => {
  const config = STAMINA_CONFIG.RECOVERY_BASES.find(tier => currentAge <= tier.maxAge);
  return config ? config.rate : 0.5; // 超過 76 歲預設為 0.5 (雖然壽元已盡)
};

/**
 * 計算本次時間切片應恢復的體力值
 * @param {number} currentAge 
 * @param {number} baseRecoveryPerSec - 基礎恢復速度 (例如每秒 1 點)
 * @param {number} secondsPassed - 經過的時間 (秒)
 */
export const calculateStaminaGain = (currentAge, baseRecoveryPerSec, secondsPassed) => {
  const rate = getStaminaRecoveryRate(currentAge);
  return baseRecoveryPerSec * rate * secondsPassed;
};