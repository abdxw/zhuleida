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

// 全局地图实例
let geocoderInstance: any = null;

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
  if (!import.meta.env.VITE_AMAP_KEY) {
    throw new Error('缺少高德地图 API Key，请检查 .env 配置');
  }

  // 加载高德地图 JS API
  const AMap = await AMapLoader.load({
    key: import.meta.env.VITE_AMAP_KEY,
    version: '2.0',
    plugins: ['AMap.Geocoder', 'AMap.Driving', 'AMap.Transit', 'AMap.Scale', 'AMap.ToolBar'],
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
  to: [number, number]
): Promise<{
  duration: number; // 分钟
  distance: number; // 公里
  routes: any[];
} | null> {
  return new Promise((resolve, reject) => {
    const transit = new (window as any).AMap.Transit({
      policy: (window as any).AMap.TransitPolicy.LEAST_TIME,
    });

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
  mode: 'driving' | 'transit' | 'walking' = 'transit'
): Promise<{
  duration: number;
  distance: number;
} | null> {
  try {
    if (mode === 'driving') {
      const result = await calculateDrivingTime(from, to);
      return result ? { duration: result.duration, distance: result.distance } : null;
    } else if (mode === 'transit') {
      const result = await calculateTransitTime(from, to);
      return result ? { duration: result.duration, distance: result.distance } : null;
    } else {
      // 步行：简单估算（5km/h）
      const dx = from[0] - to[0];
      const dy = from[1] - to[1];
      const distanceKm = Math.sqrt(dx * dx + dy * dy) * 111; // 约略转换
      const duration = Math.round((distanceKm / 5) * 60);
      return { duration, distance: Math.round(distanceKm * 10) / 10 };
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
  mode: 'driving' | 'transit' = 'transit'
): Promise<any> {
  // 简化版：以中心点为圆心，按平均速度估算半径
  // 公共交通：约 30km/h（含等车、换乘）
  // 驾车：约 40km/h（市区）
  const speed = mode === 'transit' ? 30 : 40;
  const radiusKm = (minutes / 60) * speed;
  
  // 创建圆形覆盖物
  const circle = new (window as any).AMap.Circle({
    center: new (window as any).AMap.LngLat(center[0], center[1]),
    radius: radiusKm * 1000,
    fillColor: '#4169E1',
    fillOpacity: 0.2,
    strokeColor: '#4169E1',
    strokeWeight: 2,
    strokeOpacity: 0.5,
  });

  return circle;
}

// 导出全局类型声明
declare global {
  interface Window {
    AMap: any;
  }
}
