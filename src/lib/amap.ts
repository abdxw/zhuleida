/**
 * 高德地图 API 工具库
 * 
 * 功能：
 * - 地图初始化
 * - 地理编码（地址→经纬度）
 * - 逆地理编码（经纬度→地址）
 * - 路径规划（通勤时间计算）
 * - 周边搜索
 */

import AMapLoader from '@amap/amap-jsapi-loader';
import {
  COMMUTE_MODE_META,
  COMMUTE_WINDOW_META,
  getCommuteMultiplier,
  type CommuteContext,
  type CommuteMode,
} from '@/data/communities';

// 全局地图实例
let geocoderInstance: any = null;

function hasConfiguredValue(value: string | undefined, placeholder: string) {
  return Boolean(value && value.trim() && value.trim() !== placeholder);
}

/**
 * 初始化高德地图
 * @param containerId 地图容器 ID
 * @param options 地图配置
 */
export async function initAmap(
  containerId: string,
  options: {
    center?: [number, number];
    zoom?: number;
    mapStyle?: string;
  } = {}
): Promise<any> {
  const amapKey = import.meta.env.VITE_AMAP_KEY;
  const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE;

  if (!hasConfiguredValue(amapKey, 'your_amap_key_here')) {
    throw new Error('缺少有效的高德地图 API Key，请在 .env 中填写 VITE_AMAP_KEY');
  }

  if (!hasConfiguredValue(securityCode, 'your_amap_security_code_here')) {
    throw new Error('缺少有效的高德安全码，请在 .env 中填写 VITE_AMAP_SECURITY_CODE');
  }

  if (securityCode) {
    window._AMapSecurityConfig = {
      ...(window._AMapSecurityConfig || {}),
      securityJsCode: securityCode,
    };
  }

  // 加载高德地图 JS API
  const AMap = await AMapLoader.load({
    key: amapKey,
    version: '2.0',
    plugins: [
      'AMap.Geocoder',
      'AMap.Driving',
      'AMap.Walking',
      'AMap.Transfer',
      'AMap.Scale',
      'AMap.ToolBar',
      'AMap.PlaceSearch',
    ],
  });

  // 创建地图实例
  const map = new AMap.Map(containerId, {
    zoom: options.zoom || 12,
    center: options.center || [116.397428, 39.90923], // 默认北京
    viewMode: '3D',
    mapStyle: options.mapStyle || 'amap://styles/normal',
  });

  // 添加比例尺和工具栏
  map.addControl(new AMap.Scale());
  map.addControl(new AMap.ToolBar());

  return map;
}

/**
 * 地理编码：地址→经纬度
 * @param address 地址字符串
 */
export async function geocode(address: string): Promise<{
  lng: number;
  lat: number;
  formattedAddress?: string;
} | null> {
  return new Promise((resolve) => {
    if (!geocoderInstance) {
      geocoderInstance = new (window as any).AMap.Geocoder();
    }

    geocoderInstance.getLocation(address, (status: string, result: any) => {
      if (status === 'complete' && result.geocodes.length) {
        const geocode = result.geocodes[0];
        resolve({
          lng: geocode.location.lng,
          lat: geocode.location.lat,
          formattedAddress: geocode.formattedAddress,
        });
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * 逆地理编码：经纬度→地址
 * @param lng 经度
 * @param lat 纬度
 */
export async function reverseGeocode(
  lng: number,
  lat: number
): Promise<{
  address: string;
  province: string;
  city: string;
  district: string;
} | null> {
  return new Promise((resolve, reject) => {
    if (!geocoderInstance) {
      geocoderInstance = new (window as any).AMap.Geocoder();
    }

    geocoderInstance.getAddress([lng, lat], (status: string, result: any) => {
      if (status === 'complete' && result.regeocode) {
        const regeocode = result.regeocode;
        resolve({
          address: regeocode.formattedAddress,
          province: regeocode.addressComponent.province,
          city: regeocode.addressComponent.city,
          district: regeocode.addressComponent.district,
        });
      } else {
        reject(new Error('未找到该位置'));
      }
    });
  });
}

/**
 * 计算通勤时间（驾车）
 * @param from 起点 [lng, lat]
 * @param to 终点 [lng, lat]
 */
export async function calculateDrivingTime(
  from: [number, number],
  to: [number, number]
): Promise<{
  duration: number; // 分钟
  distance: number; // 公里
  routes: any[];
} | null> {
  return new Promise((resolve, reject) => {
    const driving = new (window as any).AMap.Driving({
      policy: (window as any).AMap.DrivingPolicy.LEAST_TIME,
    });

    driving.search(from, to, (status: string, result: any) => {
      if (status === 'complete' && result.routes && result.routes.length) {
        const route = result.routes[0];
        resolve({
          duration: Math.round(route.time / 60), // 转换为分钟
          distance: Math.round(route.distance / 1000 * 10) / 10, // 转换为公里，保留 1 位小数
          routes: result.routes,
        });
      } else {
        reject(new Error('未找到驾车路线'));
      }
    });
  });
}

/**
 * 计算通勤时间（公共交通）
 * @param from 起点 [lng, lat]
 * @param to 终点 [lng, lat]
 */
export async function calculateTransitTime(
  from: [number, number],
  to: [number, number],
  mode: 'transit' | 'subway' = 'transit',
  context: CommuteContext = {}
): Promise<{
  duration: number; // 分钟
  distance: number; // 公里
  routes: any[];
} | null> {
  return new Promise((resolve, reject) => {
    const transit = new (window as any).AMap.Transfer({
      city: '北京市',
      policy:
        mode === 'subway'
          ? (window as any).AMap.TransferPolicy.LEAST_TRANSFER
          : (window as any).AMap.TransferPolicy.LEAST_TIME,
    });
    const currentWindow = context.window || 'morning';
    transit.leaveAt(context.time || COMMUTE_WINDOW_META[currentWindow].defaultTime, getTodayDateString());

    transit.search(from, to, (status: string, result: any) => {
      if (status === 'complete' && result.routes && result.routes.length) {
        const route = result.routes[0];
        resolve({
          duration: Math.round(route.time / 60), // 转换为分钟
          distance: Math.round(route.distance / 1000 * 10) / 10, // 转换为公里
          routes: result.routes,
        });
      } else {
        reject(new Error('未找到公交路线'));
      }
    });
  });
}

/**
 * 计算通勤时间（默认公共交通）
 * @param from 起点 [lng, lat]
 * @param to 终点 [lng, lat]
 * @param mode 交通方式：'driving' | 'transit' | 'walking'
 */
export async function calculateCommuteTime(
  from: [number, number],
  to: [number, number],
  mode: CommuteMode = 'transit',
  context: CommuteContext = {}
): Promise<{
  duration: number;
  distance: number;
} | null> {
  try {
    if (mode === 'driving') {
      const result = await calculateDrivingTime(from, to);
      return result
        ? {
            duration: applyWindowMultiplier(result.duration, mode, context),
            distance: result.distance,
          }
        : null;
    } else if (mode === 'transit' || mode === 'subway') {
      const result = await calculateTransitTime(from, to, mode, context);
      return result ? { duration: result.duration, distance: result.distance } : null;
    } else {
      // 步行：简单估算（5km/h）
      const dx = from[0] - to[0];
      const dy = from[1] - to[1];
      const distanceKm = Math.sqrt(dx * dx + dy * dy) * 111; // 约略转换
      const duration = Math.round((distanceKm / 5) * 60);
      return {
        duration: applyWindowMultiplier(duration, mode, context),
        distance: Math.round(distanceKm * 10) / 10,
      };
    }
  } catch (error) {
    console.error('通勤时间计算失败:', error);
    return null;
  }
}

/**
 * 搜索周边小区
 * @param location 中心点 [lng, lat]
 * @param radius 半径（米），默认 3000
 * @param keywords 关键词，默认'小区'
 */
export async function searchAround(
  location: [number, number],
  radius: number = 3000,
  keywords: string = '小区'
): Promise<Array<{
  name: string;
  address: string;
  location: [number, number];
  type: string;
}>> {
  return new Promise((resolve) => {
    const placeSearch = new (window as any).AMap.PlaceSearch({
      pageSize: 20,
      pageIndex: 1,
      extensions: 'all',
    });

    placeSearch.searchNearBy(keywords, location, radius, (status: string, result: any) => {
      if (status === 'complete' && result.poiList && result.poiList.pois) {
        resolve(
          result.poiList.pois.map((poi: any) => ({
            name: poi.name,
            address: poi.address,
            location: [poi.location.lng, poi.location.lat],
            type: poi.type,
          }))
        );
      } else {
        resolve([]);
      }
    });
  });
}

/**
 * 绘制通勤圈（等时线）
 * @param center 中心点 [lng, lat]
 * @param minutes 通勤时长（分钟）
 * @param mode 交通方式
 */
export async function drawCommuteZone(
  center: [number, number],
  minutes: number,
  mode: CommuteMode = 'transit',
  context: CommuteContext = {}
): Promise<any> {
  const config = COMMUTE_MODE_META[mode];
  const adjustedMinutes = minutes / getCommuteMultiplier(mode, context);
  const radiusKm = (adjustedMinutes / 60) * config.speedKmh;
  
  // 创建圆形覆盖物
  const circle = new (window as any).AMap.Circle({
    center: new (window as any).AMap.LngLat(center[0], center[1]),
    radius: radiusKm * 1000,
    fillColor: config.accent,
    fillOpacity: 0.2,
    strokeColor: config.accent,
    strokeWeight: 2,
    strokeOpacity: 0.5,
  });

  return circle;
}

function applyWindowMultiplier(duration: number, mode: CommuteMode, context: CommuteContext) {
  return Math.max(1, Math.round(duration * getCommuteMultiplier(mode, context)));
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

// 导出全局类型声明
declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig?: {
      securityJsCode?: string;
      [key: string]: unknown;
    };
  }
}
