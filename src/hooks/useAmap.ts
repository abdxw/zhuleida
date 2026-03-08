/**
 * 高德地图 React Hook
 * 
 * 用法：
 * const { map, loaded, error } = useAmap('container-id', { center, zoom });
 */

import { useState, useEffect, useRef } from 'react';
import { initAmap, geocode, reverseGeocode, calculateCommuteTime, drawCommuteZone } from '../lib/amap';
import type { CommuteContext, CommuteMode } from '@/data/communities';

interface UseAmapOptions {
  center?: [number, number];
  zoom?: number;
  mapStyle?: string;
  onMapLoaded?: (map: any) => void;
  onError?: (error: Error) => void;
}

interface UseAmapResult {
  map: any;
  loaded: boolean;
  error: Error | null;
  geocode: (address: string) => Promise<any>;
  reverseGeocode: (lng: number, lat: number) => Promise<any>;
  calculateCommuteTime: (
    from: [number, number],
    to: [number, number],
    mode?: CommuteMode,
    context?: CommuteContext
  ) => Promise<any>;
  drawCommuteZone: (
    center: [number, number],
    minutes: number,
    mode?: CommuteMode,
    context?: CommuteContext
  ) => Promise<any>;
}

/**
 * 高德地图 Hook
 * @param containerId 地图容器 ID
 * @param options 配置选项
 */
export function useAmap(
  containerId: string,
  options: UseAmapOptions = {}
): UseAmapResult {
  const [map, setMap] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    async function loadMap() {
      try {
        const mapInstance = await initAmap(containerId, {
          center: options.center,
          zoom: options.zoom,
          mapStyle: options.mapStyle,
        });

        if (mounted) {
          setMap(mapInstance);
          setLoaded(true);
          mapRef.current = mapInstance;
          options.onMapLoaded?.(mapInstance);
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error('地图加载失败');
          setError(error);
          options.onError?.(error);
        }
      }
    }

    loadMap();

    return () => {
      mounted = false;
    };
  }, [containerId]);

  return {
    map,
    loaded,
    error,
    geocode,
    reverseGeocode,
    calculateCommuteTime,
    drawCommuteZone,
  };
}

/**
 * 批量地理编码 Hook
 * 用于一次性转换多个地址为经纬度
 */
export function useBatchGeocode() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Map<string, { lng: number; lat: number }>>(new Map());
  const [error, setError] = useState<Error | null>(null);

  const geocodeBatch = async (addresses: string[]) => {
    setLoading(true);
    setError(null);
    const newResults = new Map(results);

    try {
      for (const address of addresses) {
        try {
          const result = await geocode(address);
          if (result) {
            newResults.set(address, { lng: result.lng, lat: result.lat });
          }
        } catch (err) {
          console.warn(`地址 "${address}" 解析失败:`, err);
        }
      }
      setResults(newResults);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('批量地理编码失败'));
    } finally {
      setLoading(false);
    }

    return newResults;
  };

  return { loading, results, error, geocodeBatch };
}
