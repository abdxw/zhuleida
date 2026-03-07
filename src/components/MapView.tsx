/**
 * 地图组件示例
 * 演示如何使用高德地图 API
 */

import React, { useEffect, useState } from 'react';
import { useAmap } from '@/hooks/useAmap';
import { communities } from '@/data/communities';

interface MapViewProps {
  workLocation?: [number, number]; // 工作地点（默认北大医学部）
  commuteMinutes?: number; // 通勤时长（分钟）
}

/**
 * 地图视图组件
 */
export const MapView: React.FC<MapViewProps> = ({
  workLocation = [116.369329, 39.987312], // 北大医学部
  commuteMinutes = 45,
}) => {
  const [commuteZone, setCommuteZone] = useState<any>(null);

  const { map, loaded, error, calculateCommuteTime, drawCommuteZone } = useAmap(
    'map-container',
    {
      center: workLocation,
      zoom: 12,
      onMapLoaded: (mapInstance) => {
        console.log('地图加载成功', mapInstance);
      },
      onError: (err) => {
        console.error('地图加载失败:', err);
      },
    }
  );

  // 绘制通勤圈
  useEffect(() => {
    if (!loaded || !map) return;

    async function drawZone() {
      try {
        const zone = await drawCommuteZone(workLocation, commuteMinutes, 'transit');
        zone.setMap(map);
        setCommuteZone(zone);

        // 添加工作地点标记
        new (window as any).AMap.Marker({
          position: new (window as any).AMap.LngLat(workLocation[0], workLocation[1]),
          title: '工作地点',
          map: map,
        });

        // 添加信息窗体
        const infoWindow = new (window as any).AMap.InfoWindow({
          content: `<div style="padding:8px;"><strong>工作地点</strong><br/>北大医学部</div>`,
          offset: new (window as any).AMap.Pixel(0, -30),
        });
        infoWindow.open(map, workLocation);
      } catch (err) {
        console.error('绘制通勤圈失败:', err);
      }
    }

    drawZone();

    return () => {
      if (commuteZone) {
        commuteZone.setMap(null);
      }
    };
  }, [loaded, map, workLocation, commuteMinutes]);

  // 测试：点击地图获取地址
  useEffect(() => {
    if (!loaded || !map) return;

    const handleClick = async (e: any) => {
      const lnglat = e.lnglat;
      const lng = lnglat.getLng();
      const lat = lnglat.getLat();

      try {
        // 这里可以调用 calculateCommuteTime 计算到工作地点的通勤时间
        const commute = await calculateCommuteTime([lng, lat], workLocation, 'transit');
        console.log('通勤时间:', commute);
      } catch (err) {
        console.error('计算通勤时间失败:', err);
      }
    };

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [loaded, map, workLocation]);

  if (error) {
    return (
      <div style={styles.error}>
        <h3>地图加载失败</h3>
        <p>{error.message}</p>
        <p style={styles.hint}>
          请检查：<br />
          1. .env 文件中是否配置了 VITE_AMAP_KEY<br />
          2. Key 是否在高德控制台申请成功<br />
          3. 安全码是否正确
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div id="map-container" style={styles.map} />
      {!loaded && <div style={styles.loading}>地图加载中...</div>}
      
      {/* 图例 */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <span style={styles.legendColor} />
          <span>{commuteMinutes}分钟通勤圈</span>
        </div>
        <div style={styles.legendItem}>
          <span style={styles.legendMarker}>📍</span>
          <span>工作地点</span>
        </div>
      </div>

      {/* 小区列表 */}
      <div style={styles.communityList}>
        <h4>附近小区示例</h4>
        <ul style={styles.list}>
          {communities.slice(0, 5).map((community, index) => (
            <li key={index} style={styles.listItem}>
              <strong>{community.name}</strong>
              <div style={styles.listMeta}>
                租金¥{community.rentAvg}/月 | 售价¥{community.saleAvg}/㎡
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'relative',
    width: '100%',
    height: '600px',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(255,255,255,0.9)',
    padding: '20px 40px',
    borderRadius: '8px',
    fontSize: '16px',
    zIndex: 1000,
  },
  error: {
    padding: '40px',
    background: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca',
  },
  hint: {
    fontSize: '14px',
    color: '#666',
    marginTop: '16px',
    lineHeight: 1.6,
  },
  legend: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    zIndex: 1000,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    fontSize: '14px',
  },
  legendColor: {
    width: '20px',
    height: '20px',
    background: 'rgba(65, 105, 225, 0.3)',
    border: '2px solid #4169E1',
    borderRadius: '4px',
  },
  legendMarker: {
    fontSize: '16px',
  },
  communityList: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    background: 'white',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    zIndex: 1000,
    maxWidth: '300px',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  listItem: {
    padding: '8px 0',
    borderBottom: '1px solid #eee',
  },
  listMeta: {
    fontSize: '13px',
    color: '#666',
    marginTop: '4px',
  },
};

export default MapView;
