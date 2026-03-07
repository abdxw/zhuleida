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

export function getCommunitiesInCircle(
  centerLat: number,
  centerLng: number,
  radiusKm: number = 5
): Community[] {
  // 简化版：计算距离，返回圈内小区
  return communities.filter(c => {
    const distance = calculateDistance(
      centerLat, centerLng,
      c.lat, c.lng
    );
    return distance <= radiusKm;
  });
}

function calculateDistance(
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
