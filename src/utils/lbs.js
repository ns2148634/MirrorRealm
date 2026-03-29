// LBS (Location-Based Service) 工具模組
// 實作 GPS 定位與五行靈脈轉換系統

// 預設模擬座標（台北 101 座標系）
const DEFAULT_LOCATION = {
  lat: 25.0330,
  lng: 121.5654,
  name: '台北'
};

// 五行對應顏色
const ELEMENT_COLORS = {
  '金': '#FFD700', // 金色
  '木': '#228B22', // 綠色
  '水': '#1E90FF', // 藍色
  '火': '#FF4500', // 紅色
  '土': '#8B4513'  // 棕色
};

/**
 * 獲取當前 GPS 位置
 * @returns {Promise<{lat: number, lng: number, accuracy: number}>}
 */
export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    // 檢查是否支援 Geolocation
    if (!navigator.geolocation) {
      console.warn('瀏覽器不支援 GPS 定位，使用預設座標');
      resolve({
        ...DEFAULT_LOCATION,
        accuracy: 100,
        simulated: true
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      // 成功回調
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy || 0,
          simulated: false
        });
      },
      // 錯誤回調
      (error) => {
        console.warn('GPS 定位失敗，使用預設座標:', error);
        let errorMessage = '';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '用戶拒絕了 GPS 定位請求';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'GPS 定位服務不可用';
            break;
          case error.TIMEOUT:
            errorMessage = 'GPS 定位請求超時';
            break;
          default:
            errorMessage = '發生未知錯誤';
            break;
        }
        
        console.error('GPS 錯誤:', errorMessage);
        resolve({
          ...DEFAULT_LOCATION,
          accuracy: 100,
          simulated: true,
          error: errorMessage
        });
      },
      // 選項
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 秒超時
        maximumAge: 300000 // 5 分鐘內的快取
      }
    );
  });
};

/**
 * 根據經緯度計算五行屬性
 * 使用穩定的 Hash 演算法，確保相同位置永遠得到相同結果
 * @param {number} lat - 緯度
 * @param {number} lng - 經度
 * @returns {string} 五行屬性：'金', '木', '水', '火', '土'
 */
export const calculateElement = (lat, lng) => {
  // 將座標轉換為整數網格（約 100 公尺精度）
  const latGrid = Math.floor(lat * 1000);
  const lngGrid = Math.floor(lng * 1000);
  
  // 簡單但穩定的 Hash 演算法
  const hash = (latGrid * 31 + lngGrid) % 5;
  
  const elements = ['金', '木', '水', '火', '土'];
  const element = elements[Math.abs(hash)];
  
  console.log(`五行計算: lat=${lat}, lng=${lng}, grid=(${latGrid}, ${lngGrid}), hash=${hash}, element=${element}`);
  
  return element;
};

/**
 * 獲取五行對應的顏色
 * @param {string} element - 五行屬性
 * @returns {string} 顏色代碼
 */
export const getElementColor = (element) => {
  return ELEMENT_COLORS[element] || '#808080'; // 預設灰色
};

/**
 * 根據五行屬性獲取對應的怪物類型
 * @param {string} element - 五行屬性
 * @returns {Array} 怪物模板陣列
 */
export const getElementMonsters = (element) => {
  const monsterTemplates = {
    '火': [
      { name: '赤炎虎', defense: 50, hp: 200, drop: 50 },
      { name: '熔岩獸', defense: 60, hp: 250, drop: 60 },
      { name: '火靈鳥', defense: 40, hp: 180, drop: 45 }
    ],
    '水': [
      { name: '寒冰蟾蜍', defense: 45, hp: 190, drop: 48 },
      { name: '玄水蛇', defense: 40, hp: 180, drop: 40 },
      { name: '冰霜狼', defense: 55, hp: 220, drop: 55 }
    ],
    '木': [
      { name: '青木狼', defense: 30, hp: 150, drop: 30 },
      { name: '藤蔓妖', defense: 35, hp: 170, drop: 35 },
      { name: '古樹精', defense: 50, hp: 200, drop: 50 }
    ],
    '金': [
      { name: '金剛猿', defense: 60, hp: 250, drop: 60 },
      { name: '鐵甲蟲', defense: 55, hp: 230, drop: 55 },
      { name: '銅人偶', defense: 45, hp: 200, drop: 45 }
    ],
    '土': [
      { name: '岩石傀儡', defense: 70, hp: 280, drop: 65 },
      { name: '土靈龜', defense: 65, hp: 260, drop: 62 },
      { name: '沙石蠍', defense: 50, hp: 210, drop: 48 }
    ]
  };
  
  return monsterTemplates[element] || monsterTemplates['土']; // 預設土屬性
};

/**
 * 完整的 LBS 掃描流程
 * @returns {Promise<{lat: number, lng: number, element: string, monsters: Array}>}
 */
export const scanLeylines = async () => {
  try {
    // 獲取 GPS 位置
    const position = await getCurrentPosition();
    
    // 計算五行屬性
    const element = calculateElement(position.lat, position.lng);
    
    // 獲取對應怪物
    const monsters = getElementMonsters(element);
    
    return {
      ...position,
      element,
      monsters
    };
  } catch (error) {
    console.error('LBS 掃描失敗:', error);
    return {
      ...DEFAULT_LOCATION,
      element: '未知',
      monsters: getElementMonsters('土'),
      error: error.message
    };
  }
};
