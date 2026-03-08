// 北京海淀/朝阳部分小区数据（示例）
// 后续可以手动补充或爬取

export interface Community {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rentAvg: number;  // 平均租金（元/月）
  saleAvg: number;  // 平均售价（元/㎡）
  address: string;
}

export type CommuteMode = 'transit' | 'subway' | 'driving' | 'walking';
export type CommuteWindow = 'morning' | 'evening';
export type CommuteTimeMode = 'depart' | 'arrive';

export interface CommunityWithMetrics extends Community {
  distanceKm: number;
  commuteMinutes: number;
}

export interface CommuteContext {
  window?: CommuteWindow;
  time?: string;
}

export const COMMUTE_WINDOW_META: Record<
  CommuteWindow,
  { label: string; defaultTime: string; multiplier: Record<CommuteMode, number> }
> = {
  morning: {
    label: '上班',
    defaultTime: '08:30',
    multiplier: {
      transit: 1,
      subway: 0.95,
      driving: 1.2,
      walking: 1,
    },
  },
  evening: {
    label: '下班',
    defaultTime: '18:30',
    multiplier: {
      transit: 1.08,
      subway: 1.02,
      driving: 1.35,
      walking: 1,
    },
  },
};

export const COMMUTE_TIME_MODE_META: Record<CommuteTimeMode, string> = {
  depart: '出发时间',
  arrive: '到达时间',
};

export const COMMUTE_MODE_META: Record<
  CommuteMode,
  { label: string; speedKmh: number; accent: string; tint: string }
> = {
  transit: {
    label: '公共交通',
    speedKmh: 30,
    accent: '#4169E1',
    tint: 'rgba(65, 105, 225, 0.22)',
  },
  subway: {
    label: '地铁优先',
    speedKmh: 36,
    accent: '#7c3aed',
    tint: 'rgba(124, 58, 237, 0.18)',
  },
  driving: {
    label: '驾车',
    speedKmh: 40,
    accent: '#0f9d58',
    tint: 'rgba(15, 157, 88, 0.18)',
  },
  walking: {
    label: '步行',
    speedKmh: 5,
    accent: '#d97706',
    tint: 'rgba(217, 119, 6, 0.18)',
  },
};

export const communities: Community[] = [
  {
    id: '1',
    name: '牡丹园小区',
    lat: 39.977,
    lng: 116.367,
    rentAvg: 6500,
    saleAvg: 85000,
    address: '海淀区牡丹园'
  },
  {
    id: '2',
    name: '西土城花园',
    lat: 39.968,
    lng: 116.355,
    rentAvg: 5800,
    saleAvg: 78000,
    address: '海淀区西土城'
  },
  {
    id: '3',
    name: '北太平庄小区',
    lat: 39.965,
    lng: 116.365,
    rentAvg: 6200,
    saleAvg: 82000,
    address: '海淀区北太平庄'
  },
  {
    id: '4',
    name: '知春路小区',
    lat: 39.980,
    lng: 116.345,
    rentAvg: 7000,
    saleAvg: 90000,
    address: '海淀区知春路'
  },
  {
    id: '5',
    name: '清河小区',
    lat: 40.030,
    lng: 116.350,
    rentAvg: 4800,
    saleAvg: 65000,
    address: '海淀区清河'
  },
  {
    id: '6',
    name: '回龙观小区',
    lat: 40.070,
    lng: 116.320,
    rentAvg: 4200,
    saleAvg: 55000,
    address: '昌平区回龙观'
  },
  {
    id: '7',
    name: '安贞里小区',
    lat: 39.970,
    lng: 116.400,
    rentAvg: 6800,
    saleAvg: 88000,
    address: '朝阳区安贞'
  },
  {
    id: '8',
    name: '亚运村小区',
    lat: 39.990,
    lng: 116.410,
    rentAvg: 7500,
    saleAvg: 92000,
    address: '朝阳区亚运村'
  }
];

export function estimateRadiusKm(
  commuteMinutes: number,
  mode: CommuteMode = 'transit',
  context: CommuteContext = {}
): number {
  return (commuteMinutes / 60) * getEffectiveSpeed(mode, context);
}

export function estimateCommuteMinutes(
  distanceKm: number,
  mode: CommuteMode = 'transit',
  context: CommuteContext = {}
): number {
  return Math.max(1, Math.round((distanceKm / getEffectiveSpeed(mode, context)) * 60));
}

export function getCommunitiesInCircle(
  centerLat: number,
  centerLng: number,
  radiusKm: number = 5,
  mode: CommuteMode = 'transit',
  context: CommuteContext = {}
): CommunityWithMetrics[] {
  return communities
    .map((community) => {
      const distanceKm = calculateDistance(
        centerLat,
        centerLng,
        community.lat,
        community.lng
      );

      return {
        ...community,
        distanceKm,
        commuteMinutes: estimateCommuteMinutes(distanceKm, mode, context),
      };
    })
    .filter((community) => community.distanceKm <= radiusKm)
    .sort((left, right) => left.distanceKm - right.distanceKm);
}

export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  // Haversine 公式简化版
  const R = 6371; // 地球半径（km）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getEffectiveSpeed(mode: CommuteMode, context: CommuteContext) {
  const multiplier = getCommuteMultiplier(mode, context);
  return COMMUTE_MODE_META[mode].speedKmh / multiplier;
}

export function getCommuteMultiplier(mode: CommuteMode, context: CommuteContext = {}) {
  if (mode === 'walking') {
    return 1;
  }

  const window = context.window || 'morning';
  const windowMeta = COMMUTE_WINDOW_META[window];
  const targetMinutes = parseTimeToMinutes(context.time || windowMeta.defaultTime);
  const peakCenter = parseTimeToMinutes(windowMeta.defaultTime);
  const peakRadius = 90;
  const intensity = Math.max(0, 1 - Math.abs(targetMinutes - peakCenter) / peakRadius);
  const peakMultiplier = windowMeta.multiplier[mode];

  return 1 + (peakMultiplier - 1) * intensity;
}

export function parseTimeToMinutes(time: string) {
  const [hourString = '0', minuteString = '0'] = time.split(':');
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return 0;
  }

  return hour * 60 + minute;
}
