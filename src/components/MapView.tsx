import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  COMMUTE_MODE_META,
  COMMUTE_TIME_MODE_META,
  COMMUTE_WINDOW_META,
  communities,
  estimateCommuteMinutes,
  estimateRadiusKm,
  getCommunitiesInCircle,
  parseTimeToMinutes,
  type CommuteMode,
  type CommuteTimeMode,
  type CommuteWindow,
} from '@/data/communities';
import { useAmap } from '@/hooks/useAmap';
import { RentFilter } from '@/components/RentFilter';
import { SearchBox, type SearchSuggestion } from '@/components/SearchBox';

type CommuteMinutes = 30 | 45 | 60;

interface RoutePreview {
  title: string;
  steps: string[];
  note?: string;
}

interface CommunityCommuteSnapshot {
  duration: number;
  distance: number;
  source: 'live' | 'estimated';
  status: 'idle' | 'loading' | 'ready' | 'failed';
}

const defaultWorkLocation: [number, number] = [116.369329, 39.987312];
const defaultWorkLabel = '北京大学医学部';
const rentRangeBounds: [number, number] = [3000, 15000];
const commuteOptions: CommuteMinutes[] = [30, 45, 60];
const commuteModes: CommuteMode[] = ['transit', 'subway', 'driving', 'walking'];
const commuteWindows: CommuteWindow[] = ['morning', 'evening'];
const commuteTimeModes: CommuteTimeMode[] = ['depart', 'arrive'];
const searchPresets = [
  '北京大学医学部',
  '中关村软件园',
  '西二旗',
  '望京SOHO',
  '国贸CBD',
  '三里屯',
];

export function MapView() {
  const [workLocation, setWorkLocation] = useState<[number, number]>(defaultWorkLocation);
  const [workLocationLabel, setWorkLocationLabel] = useState(defaultWorkLabel);
  const [commuteMinutes, setCommuteMinutes] = useState<CommuteMinutes>(45);
  const [commuteMode, setCommuteMode] = useState<CommuteMode>('transit');
  const [commuteWindow, setCommuteWindow] = useState<CommuteWindow>('morning');
  const [commuteTimeMode, setCommuteTimeMode] = useState<CommuteTimeMode>('depart');
  const [commuteTimes, setCommuteTimes] = useState<Record<CommuteWindow, string>>({
    morning: COMMUTE_WINDOW_META.morning.defaultTime,
    evening: COMMUTE_WINDOW_META.evening.defaultTime,
  });
  const [rentRange, setRentRange] = useState<[number, number]>(rentRangeBounds);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(defaultWorkLabel);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<{
    duration: number;
    distance: number;
    source: 'live' | 'estimated';
  } | null>(null);
  const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [communityCommutes, setCommunityCommutes] = useState<Record<string, CommunityCommuteSnapshot>>({});

  const commuteZoneRef = useRef<any>(null);
  const workMarkerRef = useRef<any>(null);
  const workInfoWindowRef = useRef<any>(null);
  const communityMarkersRef = useRef<any[]>([]);
  const communityInfoWindowRef = useRef<any>(null);
  const routeServiceRef = useRef<any>(null);
  const routeOverlaysRef = useRef<any[]>([]);
  const liveCommuteCacheRef = useRef<Map<string, CommunityCommuteSnapshot>>(new Map());

  const {
    map,
    loaded,
    error,
    geocode,
    reverseGeocode,
    calculateCommuteTime,
    drawCommuteZone,
  } = useAmap('map-container', {
    center: workLocation,
    zoom: 11,
    onError: (nextError) => {
      console.error('地图加载失败:', nextError);
    },
  });

  const activeCommuteTime = commuteTimes[commuteWindow];
  const effectiveTimeForEstimate =
    commuteTimeMode === 'arrive'
      ? shiftTime(activeCommuteTime, -commuteMinutes)
      : activeCommuteTime;
  const radiusKm = estimateRadiusKm(commuteMinutes, commuteMode, {
    window: commuteWindow,
    time: effectiveTimeForEstimate,
  });

  const visibleCommunities = getCommunitiesInCircle(
    workLocation[1],
    workLocation[0],
    radiusKm,
    commuteMode,
    { window: commuteWindow, time: effectiveTimeForEstimate }
  ).filter(
    (community) =>
      community.rentAvg >= rentRange[0] &&
      community.rentAvg <= rentRange[1]
  );
  const visibleCommunitySignature = visibleCommunities
    .map((community) => `${community.id}:${community.distanceKm.toFixed(2)}:${community.commuteMinutes}`)
    .join('|');

  const selectedCommunity =
    visibleCommunities.find((community) => community.id === selectedCommunityId) ?? null;

  const getEstimatedSnapshot = (community: (typeof visibleCommunities)[number]): CommunityCommuteSnapshot => ({
    duration: estimateCommuteMinutes(community.distanceKm, commuteMode, {
      window: commuteWindow,
      time: effectiveTimeForEstimate,
    }),
    distance: Number(community.distanceKm.toFixed(1)),
    source: 'estimated',
    status: 'idle',
  });

  const getRouteQueryTime = (community: (typeof visibleCommunities)[number]) => {
    if (commuteTimeMode === 'depart') {
      return activeCommuteTime;
    }

    return shiftTime(activeCommuteTime, -getEstimatedSnapshot(community).duration);
  };

  const getDisplayCommute = (community: (typeof visibleCommunities)[number]) =>
    communityCommutes[community.id] || getEstimatedSnapshot(community);
  const selectedCommunityListCommute = selectedCommunity ? getDisplayCommute(selectedCommunity) : null;

  const listHydrationEnabled = commuteMode !== 'walking';
  const hydratedCommunityIds = visibleCommunities.slice(0, 5).map((community) => community.id);

  const averageRent =
    visibleCommunities.length > 0
      ? Math.round(
          visibleCommunities.reduce((total, community) => total + community.rentAvg, 0) /
            visibleCommunities.length
        )
      : 0;

  const averageSale =
    visibleCommunities.length > 0
      ? Math.round(
          visibleCommunities.reduce((total, community) => total + community.saleAvg, 0) /
            visibleCommunities.length
        )
      : 0;

  const suggestionPool = [
    ...searchPresets.map((label) => ({ label, description: '常用工作区域' })),
    ...communities.map((community) => ({
      label: community.name,
      description: community.address,
    })),
  ];

  const suggestions: SearchSuggestion[] = (() => {
    const keyword = searchInput.trim().toLowerCase();
    const matched = suggestionPool
      .filter((item) => {
        if (!keyword) {
          return true;
        }

        return item.label.toLowerCase().includes(keyword) || item.description.toLowerCase().includes(keyword);
      })
      .filter((item, index, array) => array.findIndex((candidate) => candidate.label === item.label) === index)
      .slice(0, 6)
      .map((item) => ({
        id: item.label,
        label: item.label,
        query: item.label,
        description: item.description,
      }));

    if (keyword && !matched.some((item) => item.query === searchInput.trim())) {
      matched.unshift({
        id: `query:${searchInput.trim()}`,
        label: `搜索 "${searchInput.trim()}"`,
        query: searchInput.trim(),
        description: '用高德地图解析地点',
      });
    }

    return matched;
  })();

  const clearWorkOverlays = () => {
    commuteZoneRef.current?.setMap?.(null);
    commuteZoneRef.current = null;

    workMarkerRef.current?.setMap?.(null);
    workMarkerRef.current = null;

    workInfoWindowRef.current?.close?.();
    workInfoWindowRef.current = null;
  };

  const clearCommunityOverlays = () => {
    communityMarkersRef.current.forEach((marker) => marker.setMap?.(null));
    communityMarkersRef.current = [];

    communityInfoWindowRef.current?.close?.();
    communityInfoWindowRef.current = null;
  };

  const clearRouteOverlay = () => {
    routeServiceRef.current?.clear?.();
    routeServiceRef.current = null;
    routeOverlaysRef.current.forEach((overlay) => overlay.setMap?.(null));
    routeOverlaysRef.current = [];
    setRoutePreview(null);
  };

  useEffect(() => {
    if (!loaded || !map) {
      return;
    }

    let active = true;

    async function drawWorkLocation() {
      try {
        clearWorkOverlays();
        map.setZoomAndCenter?.(11, workLocation);

        const zone = await drawCommuteZone(workLocation, commuteMinutes, commuteMode, {
          window: commuteWindow,
          time: effectiveTimeForEstimate,
        });
        if (!active) {
          zone?.setMap?.(null);
          return;
        }

        zone.setMap(map);
        commuteZoneRef.current = zone;

        const marker = new window.AMap.Marker({
          position: new window.AMap.LngLat(workLocation[0], workLocation[1]),
          title: workLocationLabel,
          map,
        });
        workMarkerRef.current = marker;

        const infoWindow = new window.AMap.InfoWindow({
          content: `<div style="padding:8px 10px;"><strong>工作地点</strong><br/>${workLocationLabel}</div>`,
          offset: new window.AMap.Pixel(0, -28),
        });
        infoWindow.open(map, workLocation);
        workInfoWindowRef.current = infoWindow;
      } catch (nextError) {
        console.error('绘制工作地点失败:', nextError);
      }
    }

    void drawWorkLocation();

    return () => {
      active = false;
      clearWorkOverlays();
    };
  }, [
    loaded,
    map,
    workLocation,
    workLocationLabel,
    commuteMinutes,
    commuteMode,
    commuteWindow,
    effectiveTimeForEstimate,
    drawCommuteZone,
  ]);

  useEffect(() => {
    if (!loaded || !map) {
      return;
    }

    clearCommunityOverlays();

    const markers = visibleCommunities.map((community) => {
      const marker = new window.AMap.Marker({
        position: new window.AMap.LngLat(community.lng, community.lat),
        map,
        title: community.name,
        offset: new window.AMap.Pixel(-10, -10),
        content: createCommunityMarker(community.id === selectedCommunityId),
      });

      marker.on('click', () => {
        setSelectedCommunityId(community.id);
      });

      return marker;
    });

    communityMarkersRef.current = markers;

    return () => {
      clearCommunityOverlays();
    };
  }, [loaded, map, visibleCommunitySignature, selectedCommunityId]);

  useEffect(() => {
    if (!loaded || !map) {
      return;
    }

    const handleMapClick = async (event: any) => {
      const lng = event.lnglat.getLng();
      const lat = event.lnglat.getLat();

      setSelectedCommunityId(null);
      setSearchError(null);

      try {
        const address = await reverseGeocode(lng, lat);
        const label = address?.address || `地图选点 (${lng.toFixed(4)}, ${lat.toFixed(4)})`;
        setWorkLocation([lng, lat]);
        setWorkLocationLabel(label);
        setSearchInput(label);
      } catch (nextError) {
        console.error('地图点选逆地理编码失败:', nextError);
        const fallbackLabel = `地图选点 (${lng.toFixed(4)}, ${lat.toFixed(4)})`;
        setWorkLocation([lng, lat]);
        setWorkLocationLabel(fallbackLabel);
        setSearchInput(fallbackLabel);
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [loaded, map, reverseGeocode]);

  useEffect(() => {
    if (!loaded || !map || !selectedCommunity) {
      communityInfoWindowRef.current?.close?.();
      return;
    }

    const infoWindow = new window.AMap.InfoWindow({
      content: `
        <div style="padding:10px 12px;min-width:200px;">
          <strong>${selectedCommunity.name}</strong><br/>
          <span style="color:#596780;">${selectedCommunity.address}</span><br/>
          <span>租金 ¥${selectedCommunity.rentAvg}/月</span><br/>
          <span>售价 ¥${selectedCommunity.saleAvg}/㎡</span><br/>
          <span>${COMMUTE_WINDOW_META[commuteWindow].label}${COMMUTE_MODE_META[commuteMode].label}${selectedCommunityListCommute?.source === 'live' ? '规划' : '估算'} ${selectedCommunityListCommute?.duration || selectedCommunity.commuteMinutes} 分钟</span>
        </div>
      `,
      offset: new window.AMap.Pixel(0, -22),
    });

    infoWindow.open(map, [selectedCommunity.lng, selectedCommunity.lat]);
    communityInfoWindowRef.current?.close?.();
    communityInfoWindowRef.current = infoWindow;
    map.panTo?.([selectedCommunity.lng, selectedCommunity.lat]);

    return () => {
      infoWindow.close();
    };
  }, [loaded, map, selectedCommunity, selectedCommunityListCommute, commuteMode, commuteWindow]);

  useEffect(() => {
    if (!selectedCommunity || !map) {
      setSelectedRoute(null);
      setRouteLoading(false);
      clearRouteOverlay();
      return;
    }

    const currentCommunity = selectedCommunity;
    let active = true;
    setRouteLoading(true);
    setRoutePreview(null);

    const estimated = getEstimatedSnapshot(currentCommunity);
    const routeQueryTime = getRouteQueryTime(currentCommunity);

    async function renderRoute() {
      try {
        clearRouteOverlay();
        const service = createRouteService(commuteMode);
        routeServiceRef.current = service;

        const [routeResult, routeSearchResult] = await Promise.all([
          calculateCommuteTime(
            [currentCommunity.lng, currentCommunity.lat],
            workLocation,
            commuteMode,
            { window: commuteWindow, time: routeQueryTime }
          ),
          searchRoute(
            service,
            [currentCommunity.lng, currentCommunity.lat],
            workLocation,
            commuteMode,
            routeQueryTime
          ),
        ]);

        if (!active) {
          return;
        }

        routeOverlaysRef.current = drawRouteOnMap(
          map,
          routeSearchResult,
          commuteMode,
          [currentCommunity.lng, currentCommunity.lat],
          workLocation
        );
        setRoutePreview(buildRoutePreview(routeSearchResult, commuteMode));

        if (routeResult) {
          setSelectedRoute({
            duration: routeResult.duration,
            distance: routeResult.distance,
            source: commuteMode === 'walking' ? 'estimated' : 'live',
          });
        } else {
          setSelectedRoute(estimated);
        }
      } catch (nextError) {
        console.error('计算选中小区通勤时间失败:', nextError);
        if (active) {
          routeOverlaysRef.current = drawFallbackRoute(map, [currentCommunity.lng, currentCommunity.lat], workLocation, commuteMode);
          setSelectedRoute(estimated);
          setRoutePreview({
            title: '路线获取失败',
            steps: ['当前路线没有成功返回，地图先展示起终点直连线供参考。'],
          });
        }
      } finally {
        if (active) {
          setRouteLoading(false);
        }
      }
    }

    void renderRoute();

    return () => {
      active = false;
      clearRouteOverlay();
    };
  }, [
    selectedCommunity,
    map,
    workLocation,
    commuteMode,
    commuteWindow,
    commuteTimeMode,
    activeCommuteTime,
    effectiveTimeForEstimate,
  ]);

  useEffect(() => {
    if (
      selectedCommunityId &&
      !visibleCommunities.some((community) => community.id === selectedCommunityId)
    ) {
      setSelectedCommunityId(null);
    }
  }, [selectedCommunityId, visibleCommunitySignature]);

  useEffect(() => {
    let active = true;

    if (!listHydrationEnabled || visibleCommunities.length === 0) {
      setCommunityCommutes({});
      return;
    }

    const candidates = visibleCommunities.slice(0, 5);
    const nextState: Record<string, CommunityCommuteSnapshot> = {};

    candidates.forEach((community) => {
      const cacheKey = buildCommuteCacheKey(
        community.id,
        workLocation,
        commuteMode,
        commuteWindow,
        commuteTimeMode,
        activeCommuteTime
      );
      const cached = liveCommuteCacheRef.current.get(cacheKey);
      nextState[community.id] = cached || {
        ...getEstimatedSnapshot(community),
        status: 'loading',
      };
    });

    setCommunityCommutes(nextState);

    async function hydrateCommutes() {
      for (const community of candidates) {
        const cacheKey = buildCommuteCacheKey(
          community.id,
          workLocation,
          commuteMode,
          commuteWindow,
          commuteTimeMode,
          activeCommuteTime
        );

        if (liveCommuteCacheRef.current.has(cacheKey)) {
          continue;
        }

        try {
          const result = await calculateCommuteTime(
            [community.lng, community.lat],
            workLocation,
            commuteMode,
            {
              window: commuteWindow,
              time: getRouteQueryTime(community),
            }
          );

          if (!active) {
            return;
          }

          if (result) {
            const snapshot: CommunityCommuteSnapshot = {
              duration: result.duration,
              distance: result.distance,
              source: 'live',
              status: 'ready',
            };
            liveCommuteCacheRef.current.set(cacheKey, snapshot);
            setCommunityCommutes((current) => ({
              ...current,
              [community.id]: snapshot,
            }));
          } else {
            setCommunityCommutes((current) => ({
              ...current,
              [community.id]: {
                ...getEstimatedSnapshot(community),
                status: 'failed',
              },
            }));
          }
        } catch (nextError) {
          console.error('批量补充真实通勤时间失败:', nextError);
          if (!active) {
            return;
          }

          setCommunityCommutes((current) => ({
            ...current,
            [community.id]: {
              ...getEstimatedSnapshot(community),
              status: 'failed',
            },
          }));
        }
      }
    }

    void hydrateCommutes();

    return () => {
      active = false;
    };
  }, [
    visibleCommunitySignature,
    workLocation,
    commuteMode,
    commuteWindow,
    commuteTimeMode,
    activeCommuteTime,
    calculateCommuteTime,
    listHydrationEnabled,
  ]);

  const handleSearch = async (query: string) => {
    if (!query) {
      setSearchError('请输入工作地点');
      return;
    }

    if (!loaded) {
      setSearchError('地图还在加载中，请稍后再试');
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const result = await geocode(query);
      if (!result) {
        setSearchError('没有找到这个地点，换个关键词试试');
        return;
      }

      const nextLocation: [number, number] = [result.lng, result.lat];
      const nextLabel = result.formattedAddress || query;

      setWorkLocation(nextLocation);
      setWorkLocationLabel(nextLabel);
      setSearchInput(nextLabel);
      setSelectedCommunityId(null);
      map?.setZoomAndCenter?.(11, nextLocation);
    } catch (nextError) {
      console.error('地点搜索失败:', nextError);
      setSearchError('搜索失败，请稍后重试');
    } finally {
      setSearching(false);
    }
  };

  if (error) {
    return (
      <div style={styles.error}>
        <h3>地图加载失败</h3>
        <p>{error.message}</p>
        <p style={styles.hint}>
          请检查：<br />
          1. `.env` 中是否配置了 `VITE_AMAP_KEY`<br />
          2. `VITE_AMAP_SECURITY_CODE` 是否正确<br />
          3. 高德控制台的域名白名单是否包含当前访问地址
        </p>
      </div>
    );
  }

  return (
    <section style={styles.page}>
      <div style={styles.controlPanel}>
        <div style={styles.controlCard}>
          <p style={styles.eyebrow}>工作地点</p>
          <SearchBox
            value={searchInput}
            suggestions={suggestions}
            loading={searching}
            error={searchError}
            onChange={setSearchInput}
            onSubmit={handleSearch}
            onSuggestionSelect={(suggestion) => {
              setSearchInput(suggestion.query);
              void handleSearch(suggestion.query);
            }}
          />
          <p style={styles.tip}>也可以直接点击地图选点，适合定位写字楼或园区。</p>
        </div>

        <div style={styles.controlCard}>
          <p style={styles.eyebrow}>通勤时段</p>
          <div style={styles.chipRow}>
            {commuteWindows.map((windowKey) => (
              <button
                key={windowKey}
                type="button"
                style={{
                  ...styles.chip,
                  ...(commuteWindow === windowKey ? styles.chipActive : {}),
                }}
                onClick={() => setCommuteWindow(windowKey)}
              >
                {COMMUTE_WINDOW_META[windowKey].label}
              </button>
            ))}
          </div>
          <div style={styles.chipRow}>
            {commuteTimeModes.map((mode) => (
              <button
                key={mode}
                type="button"
                style={{
                  ...styles.chip,
                  ...(commuteTimeMode === mode ? styles.chipActive : {}),
                }}
                onClick={() => setCommuteTimeMode(mode)}
              >
                {COMMUTE_TIME_MODE_META[mode]}
              </button>
            ))}
          </div>
          <label style={styles.timeField}>
            自定义{COMMUTE_TIME_MODE_META[commuteTimeMode]}
            <input
              style={styles.timeInput}
              type="time"
              step={300}
              value={activeCommuteTime}
              onChange={(event) => {
                const nextTime = event.target.value || COMMUTE_WINDOW_META[commuteWindow].defaultTime;
                setCommuteTimes((current) => ({
                  ...current,
                  [commuteWindow]: nextTime,
                }));
              }}
            />
          </label>
          <p style={styles.tip}>
            选“到达时间”时，会按当前预估通勤时长倒推出发时间；列表和通勤圈按该推导时间段近似估算。
          </p>
        </div>

        <div style={styles.controlCard}>
          <p style={styles.eyebrow}>通勤方式</p>
          <div style={styles.chipRow}>
            {commuteModes.map((mode) => (
              <button
                key={mode}
                type="button"
                style={{
                  ...styles.chip,
                  ...(commuteMode === mode ? styles.chipActive : {}),
                }}
                onClick={() => setCommuteMode(mode)}
              >
                {COMMUTE_MODE_META[mode].label}
              </button>
            ))}
          </div>
          <p style={styles.tip}>
            列表先按直线距离 + 平均速度估算；
            {listHydrationEnabled
              ? ` 前 5 个候选会自动替换成${COMMUTE_MODE_META[commuteMode].label}真实通勤时间。`
              : ` ${COMMUTE_MODE_META[commuteMode].label}当前仍使用估算。`}
          </p>
          {commuteMode === 'subway' && (
            <p style={styles.tip}>地铁优先会用更少换乘策略来逼近“地铁优先”路线。</p>
          )}
        </div>

        <div style={styles.controlCard}>
          <p style={styles.eyebrow}>通勤时间</p>
          <div style={styles.chipRow}>
            {commuteOptions.map((option) => (
              <button
                key={option}
                type="button"
                style={{
                  ...styles.chip,
                  ...(commuteMinutes === option ? styles.chipActive : {}),
                }}
                onClick={() => setCommuteMinutes(option)}
              >
                {option} 分钟
              </button>
            ))}
          </div>
        </div>

        <div style={styles.controlCard}>
          <RentFilter
            min={rentRangeBounds[0]}
            max={rentRangeBounds[1]}
            value={rentRange}
            onChange={setRentRange}
          />
        </div>
      </div>

      <div style={styles.mapShell}>
        <div id="map-container" style={styles.map} />
        {!loaded && <div style={styles.loading}>地图加载中...</div>}

        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <span
              style={{
                ...styles.legendColor,
                background: COMMUTE_MODE_META[commuteMode].tint,
                borderColor: COMMUTE_MODE_META[commuteMode].accent,
              }}
            />
            <span>
              {COMMUTE_WINDOW_META[commuteWindow].label}
              {COMMUTE_TIME_MODE_META[commuteTimeMode]}
              {` ${activeCommuteTime} `}
              {COMMUTE_MODE_META[commuteMode].label}
              {` ${commuteMinutes} 分钟通勤圈`}
            </span>
          </div>
          <div style={styles.legendItem}>
            <span style={styles.legendMarker}>📍</span>
            <span>工作地点</span>
          </div>
          <div style={styles.legendItem}>
            <span style={styles.legendDot} />
            <span>圈内小区</span>
          </div>
        </div>

        {selectedCommunity && (
          <div style={styles.detailCard}>
            <p style={styles.detailTitle}>{selectedCommunity.name}</p>
            <p style={styles.detailAddress}>{selectedCommunity.address}</p>
            <p style={styles.detailMetric}>租金 ¥{selectedCommunity.rentAvg}/月</p>
            <p style={styles.detailMetric}>售价 ¥{selectedCommunity.saleAvg}/㎡</p>
            <p style={styles.detailMetric}>
              {routeLoading
                ? `${COMMUTE_WINDOW_META[commuteWindow].label}${COMMUTE_TIME_MODE_META[commuteTimeMode]} ${activeCommuteTime} ${COMMUTE_MODE_META[commuteMode].label}路线计算中...`
                : selectedRoute
                  ? `${COMMUTE_WINDOW_META[commuteWindow].label}${COMMUTE_TIME_MODE_META[commuteTimeMode]} ${activeCommuteTime} ${COMMUTE_MODE_META[commuteMode].label}${
                      selectedRoute.source === 'live' ? '规划' : '估算'
                    } ${selectedRoute.duration} 分钟 · ${selectedRoute.distance} km`
                  : `${COMMUTE_WINDOW_META[commuteWindow].label}${COMMUTE_TIME_MODE_META[commuteTimeMode]} ${activeCommuteTime} ${COMMUTE_MODE_META[commuteMode].label}估算 ${selectedCommunity.commuteMinutes} 分钟`}
            </p>
            <p style={styles.detailHint}>
              圈和列表为估算值；选中小区后会在地图上绘制路线，并展示当前模式下的路线摘要。
            </p>
          </div>
        )}
      </div>

      <div style={styles.summaryBar}>
        <div>
          <strong>{visibleCommunities.length}</strong> 个圈内小区
        </div>
        <div>平均租金 ¥{averageRent.toLocaleString()}/月</div>
        <div>平均售价 ¥{averageSale.toLocaleString()}/㎡</div>
        <div>
          时段：{COMMUTE_WINDOW_META[commuteWindow].label}
          {COMMUTE_TIME_MODE_META[commuteTimeMode]} {activeCommuteTime}
        </div>
        <div>方式：{COMMUTE_MODE_META[commuteMode].label}</div>
        <div>列表策略：{listHydrationEnabled ? '前 5 自动补真实通勤' : '当前方式仅显示估算'}</div>
        <div>工作地点：{workLocationLabel}</div>
      </div>

      {selectedCommunity && routePreview && (
        <div style={styles.routePanel}>
          <div style={styles.routePanelHeader}>
            <strong>{routePreview.title}</strong>
            <span style={styles.routePanelMeta}>
              {commuteTimeMode === 'arrive'
                ? `建议约 ${shiftTime(activeCommuteTime, -(selectedRoute?.duration || commuteMinutes))} 出发`
                : `${activeCommuteTime} 出发`}
            </span>
          </div>
          <div style={styles.routeSteps}>
            {routePreview.steps.map((step, index) => (
              <div key={`${index}-${step}`} style={styles.routeStep}>
                {index + 1}. {step}
              </div>
            ))}
          </div>
          {routePreview.note && <p style={styles.routeNote}>{routePreview.note}</p>}
        </div>
      )}

      <div style={styles.grid}>
        {visibleCommunities.map((community) => {
          const displayCommute = getDisplayCommute(community);
          const isHydratedCandidate = hydratedCommunityIds.includes(community.id) && listHydrationEnabled;

          return (
            <button
              key={community.id}
              type="button"
              style={{
                ...styles.communityCard,
                ...(selectedCommunityId === community.id ? styles.communityCardActive : {}),
              }}
              onClick={() => setSelectedCommunityId(community.id)}
            >
              <div style={styles.cardHeader}>
                <strong>{community.name}</strong>
                <span style={styles.badge}>
                  {displayCommute.status === 'loading'
                    ? '同步中'
                    : `${displayCommute.duration} min ${displayCommute.source === 'live' ? '规划' : '估'}`}
                </span>
              </div>
              <p style={styles.cardAddress}>{community.address}</p>
              <p style={styles.cardValue}>租金 ¥{community.rentAvg}/月</p>
              <p style={styles.cardValue}>售价 ¥{community.saleAvg}/㎡</p>
              <p style={styles.cardMeta}>
                {displayCommute.source === 'live'
                  ? `${COMMUTE_MODE_META[commuteMode].label}规划 ${displayCommute.duration} 分钟 · ${displayCommute.distance} km`
                  : `直线距离约 ${community.distanceKm.toFixed(1)} km · ${COMMUTE_MODE_META[commuteMode].label}估算`}
              </p>
              {isHydratedCandidate && (
                <p style={styles.cardHint}>
                  {displayCommute.status === 'loading'
                    ? '正在补充真实路线时间'
                    : displayCommute.source === 'live'
                      ? '已替换为高德路线规划时间'
                      : '当前仍显示估算结果'}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {visibleCommunities.length === 0 && (
        <div style={styles.emptyState}>
          当前通勤圈和租金范围内没有匹配小区，试试放宽预算或选择更长通勤时间。
        </div>
      )}
    </section>
  );
}

function createCommunityMarker(active: boolean) {
  const background = active ? '#16213e' : '#ff6b35';
  const shadow = active ? '0 0 0 6px rgba(22, 33, 62, 0.18)' : '0 0 0 6px rgba(255, 107, 53, 0.18)';

  return `
    <div style="
      width:18px;
      height:18px;
      border-radius:999px;
      background:${background};
      border:2px solid white;
      box-shadow:${shadow};
    "></div>
  `;
}

function shiftTime(time: string, offsetMinutes: number) {
  const totalMinutes = (parseTimeToMinutes(time) + offsetMinutes + 24 * 60) % (24 * 60);
  const hour = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minute = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hour}:${minute}`;
}

function createRouteService(mode: CommuteMode) {
  if (mode === 'driving') {
    return new window.AMap.Driving({
      extensions: 'all',
      policy: window.AMap.DrivingPolicy.LEAST_TIME,
    });
  }

  if (mode === 'walking') {
    return new window.AMap.Walking({
      extensions: 'all',
    });
  }

  return new window.AMap.Transfer({
    city: '北京市',
    extensions: 'all',
    policy:
      mode === 'subway'
        ? window.AMap.TransferPolicy.LEAST_TRANSFER
        : window.AMap.TransferPolicy.LEAST_TIME,
  });
}

async function searchRoute(
  service: any,
  from: [number, number],
  to: [number, number],
  mode: CommuteMode,
  departureTime: string
) {
  if (mode === 'transit' || mode === 'subway') {
    service.leaveAt?.(departureTime, getLocalDateString());
  }

  return new Promise<any>((resolve, reject) => {
    service.search(toLngLat(from), toLngLat(to), (status: string, result: any) => {
      if (status !== 'complete') {
        reject(result);
        return;
      }

      resolve(result);
    });
  });
}

function drawRouteOnMap(
  map: any,
  result: any,
  mode: CommuteMode,
  from: [number, number],
  to: [number, number]
) {
  const overlays: any[] = [];
  const accent = COMMUTE_MODE_META[mode].accent;
  const route = result?.routes?.[0];

  overlays.push(
    new window.AMap.Marker({
      map,
      position: toLngLat(from),
      offset: new window.AMap.Pixel(-14, -14),
      content: createEndpointMarker('住', '#ff6b35'),
      zIndex: 230,
    })
  );
  overlays.push(
    new window.AMap.Marker({
      map,
      position: toLngLat(to),
      offset: new window.AMap.Pixel(-14, -14),
      content: createEndpointMarker('工', '#16213e'),
      zIndex: 230,
    })
  );

  if (mode === 'driving' || mode === 'walking') {
    const path = (route?.steps || []).flatMap((step: any) => step.path || []);
    if (path.length > 1) {
      overlays.push(
        new window.AMap.Polyline({
          map,
          path,
          strokeColor: accent,
          strokeWeight: 6,
          strokeOpacity: 0.9,
          showDir: true,
          outlineColor: '#ffffff',
          borderWeight: 2,
          zIndex: 220,
        })
      );
    }
  } else {
    const segments = Array.isArray(route?.segments) ? route.segments : [];

    segments.forEach((segment: any) => {
      const walkingSteps = segment?.walking?.steps || [];
      const walkingPath = walkingSteps.flatMap((step: any) => step.path || []);
      if (walkingPath.length > 1) {
        overlays.push(
          new window.AMap.Polyline({
            map,
            path: walkingPath,
            strokeColor: '#f59e0b',
            strokeWeight: 4,
              strokeOpacity: 0.85,
              strokeStyle: 'dashed',
              outlineColor: '#ffffff',
              borderWeight: 2,
              zIndex: 220,
            })
          );
        }

      const buslines = segment?.bus?.buslines || [];
      buslines.forEach((busline: any) => {
        if (Array.isArray(busline?.path) && busline.path.length > 1) {
          overlays.push(
            new window.AMap.Polyline({
              map,
              path: busline.path,
              strokeColor: accent,
              strokeWeight: 6,
              strokeOpacity: 0.9,
              showDir: true,
              outlineColor: '#ffffff',
              borderWeight: 2,
              zIndex: 220,
            })
          );
        }
      });
    });
  }

  if (overlays.length <= 2) {
    overlays.push(
      new window.AMap.Polyline({
        map,
        path: [toLngLat(from), toLngLat(to)],
        strokeColor: accent,
        strokeWeight: 4,
        strokeOpacity: 0.9,
        strokeStyle: 'dashed',
        zIndex: 220,
      })
    );
  }

  map.setFitView?.(overlays, false, [80, 80, 80, 80]);
  return overlays;
}

function drawFallbackRoute(
  map: any,
  from: [number, number],
  to: [number, number],
  mode: CommuteMode
) {
  const accent = COMMUTE_MODE_META[mode].accent;
  const overlays = [
    new window.AMap.Marker({
      map,
      position: toLngLat(from),
      offset: new window.AMap.Pixel(-14, -14),
      content: createEndpointMarker('住', '#ff6b35'),
      zIndex: 230,
    }),
    new window.AMap.Marker({
      map,
      position: toLngLat(to),
      offset: new window.AMap.Pixel(-14, -14),
      content: createEndpointMarker('工', '#16213e'),
      zIndex: 230,
    }),
    new window.AMap.Polyline({
      map,
      path: [toLngLat(from), toLngLat(to)],
      strokeColor: accent,
      strokeWeight: 5,
      strokeOpacity: 0.95,
      strokeStyle: 'dashed',
      zIndex: 220,
    }),
  ];

  map.setFitView?.(overlays, false, [80, 80, 80, 80]);
  return overlays;
}

function buildRoutePreview(result: any, mode: CommuteMode): RoutePreview {
  if (mode === 'driving') {
    const route = result?.routes?.[0];
    const steps = (route?.steps || [])
      .slice(0, 6)
      .map((step: any) => step.instruction || step.action || step.road)
      .filter(Boolean);

    return {
      title: '驾车路线',
      steps: steps.length > 0 ? steps : ['已在地图上展示驾车路线。'],
    };
  }

  if (mode === 'walking') {
    const route = result?.routes?.[0];
    const steps = (route?.steps || [])
      .slice(0, 6)
      .map((step: any) => step.instruction || `${step.action || '步行'} ${Math.round((step.distance || 0) / 100) / 10} km`)
      .filter(Boolean);

    return {
      title: '步行路线',
      steps: steps.length > 0 ? steps : ['已在地图上展示步行路线。'],
    };
  }

  const route = result?.routes?.[0];
  const segments = Array.isArray(route?.segments) ? route.segments : [];
  const steps = segments
    .map((segment: any) => {
      const busline = segment?.bus?.buslines?.[0];
      if (busline?.name) {
        return busline.name;
      }

      if (segment?.walking?.distance) {
        return `步行 ${Math.round(segment.walking.distance)} 米`;
      }

      return null;
    })
    .filter(Boolean)
    .slice(0, 6);

  return {
    title: mode === 'subway' ? '地铁优先路线' : '公共交通路线',
    steps: steps.length > 0 ? steps : ['已在地图上展示公共交通路线。'],
    note: mode === 'subway' ? '当前路线使用更少换乘策略来逼近“地铁优先”。' : undefined,
  };
}

function createEndpointMarker(label: string, color: string) {
  return `
    <div style="
      width:28px;
      height:28px;
      border-radius:999px;
      background:${color};
      color:#fff;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:12px;
      font-weight:700;
      border:2px solid rgba(255,255,255,0.95);
      box-shadow:0 8px 16px rgba(15, 23, 42, 0.18);
    ">${label}</div>
  `;
}

function toLngLat([lng, lat]: [number, number]) {
  return new window.AMap.LngLat(lng, lat);
}

function getLocalDateString() {
  const current = new Date();
  const year = current.getFullYear();
  const month = `${current.getMonth() + 1}`.padStart(2, '0');
  const day = `${current.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildCommuteCacheKey(
  communityId: string,
  workLocation: [number, number],
  commuteMode: CommuteMode,
  commuteWindow: CommuteWindow,
  commuteTimeMode: CommuteTimeMode,
  activeCommuteTime: string
) {
  return [
    communityId,
    workLocation[0].toFixed(5),
    workLocation[1].toFixed(5),
    commuteMode,
    commuteWindow,
    commuteTimeMode,
    activeCommuteTime,
  ].join(':');
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: 'grid',
    gap: '18px',
  },
  controlPanel: {
    display: 'grid',
    gridTemplateColumns:
      'minmax(280px, 1.6fr) minmax(180px, 1fr) minmax(180px, 1fr) minmax(180px, 1fr) minmax(240px, 1.2fr)',
    gap: '14px',
  },
  controlCard: {
    background: '#fff',
    borderRadius: '20px',
    padding: '18px',
    boxShadow: '0 12px 30px rgba(25, 37, 62, 0.08)',
    border: '1px solid rgba(17, 24, 39, 0.06)',
  },
  eyebrow: {
    margin: '0 0 12px',
    fontSize: '12px',
    color: '#65748b',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  tip: {
    margin: '10px 0 0',
    fontSize: '13px',
    color: '#7a889f',
  },
  timeField: {
    marginTop: '12px',
    display: 'grid',
    gap: '6px',
    fontSize: '12px',
    color: '#66758e',
  },
  timeInput: {
    height: '42px',
    borderRadius: '12px',
    border: '1px solid #d7ddea',
    padding: '0 12px',
    background: '#fff',
    color: '#1d2a44',
    fontSize: '14px',
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '10px',
  },
  chip: {
    border: '1px solid #d7ddea',
    borderRadius: '999px',
    padding: '10px 16px',
    background: '#fff',
    color: '#1d2a44',
    fontSize: '14px',
    cursor: 'pointer',
  },
  chipActive: {
    background: '#16213e',
    borderColor: '#16213e',
    color: '#fff',
    boxShadow: '0 12px 24px rgba(22, 33, 62, 0.22)',
  },
  mapShell: {
    position: 'relative',
    width: '100%',
    height: '560px',
    borderRadius: '28px',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(18, 32, 56, 0.16)',
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
    background: 'rgba(255, 255, 255, 0.92)',
    padding: '18px 28px',
    borderRadius: '16px',
    fontSize: '16px',
    zIndex: 1000,
  },
  legend: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    display: 'grid',
    gap: '10px',
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '14px 16px',
    borderRadius: '18px',
    boxShadow: '0 14px 30px rgba(18, 32, 56, 0.14)',
    zIndex: 1000,
    maxWidth: '320px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#22314d',
  },
  legendColor: {
    width: '18px',
    height: '18px',
    background: 'rgba(65, 105, 225, 0.28)',
    border: '2px solid #4169E1',
    borderRadius: '4px',
    flexShrink: 0,
  },
  legendMarker: {
    fontSize: '16px',
  },
  legendDot: {
    width: '12px',
    height: '12px',
    background: '#ff6b35',
    borderRadius: '999px',
    boxShadow: '0 0 0 4px rgba(255, 107, 53, 0.18)',
  },
  detailCard: {
    position: 'absolute',
    left: '20px',
    bottom: '20px',
    maxWidth: '360px',
    background: 'rgba(255, 255, 255, 0.96)',
    padding: '16px 18px',
    borderRadius: '20px',
    boxShadow: '0 14px 30px rgba(18, 32, 56, 0.14)',
    zIndex: 1000,
  },
  detailTitle: {
    margin: 0,
    fontSize: '18px',
    color: '#16213e',
  },
  detailAddress: {
    margin: '6px 0 12px',
    fontSize: '13px',
    color: '#69778f',
  },
  detailMetric: {
    margin: '4px 0',
    fontSize: '14px',
    color: '#22314d',
  },
  detailHint: {
    margin: '10px 0 0',
    fontSize: '12px',
    lineHeight: 1.5,
    color: '#718097',
  },
  summaryBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    background: '#16213e',
    color: '#fff',
    padding: '16px 20px',
    borderRadius: '18px',
    boxShadow: '0 16px 40px rgba(22, 33, 62, 0.18)',
  },
  routePanel: {
    background: '#fff',
    borderRadius: '20px',
    padding: '18px',
    boxShadow: '0 12px 26px rgba(18, 32, 56, 0.08)',
    border: '1px solid rgba(17, 24, 39, 0.08)',
  },
  routePanelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  routePanelMeta: {
    fontSize: '13px',
    color: '#66758e',
  },
  routeSteps: {
    display: 'grid',
    gap: '8px',
    marginTop: '14px',
  },
  routeStep: {
    fontSize: '14px',
    color: '#1d2a44',
    lineHeight: 1.5,
  },
  routeNote: {
    margin: '12px 0 0',
    fontSize: '12px',
    color: '#718097',
    lineHeight: 1.5,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
  },
  communityCard: {
    border: '1px solid rgba(17, 24, 39, 0.08)',
    background: '#fff',
    borderRadius: '20px',
    padding: '16px',
    textAlign: 'left',
    boxShadow: '0 12px 26px rgba(18, 32, 56, 0.08)',
    cursor: 'pointer',
  },
  communityCardActive: {
    borderColor: '#16213e',
    boxShadow: '0 16px 36px rgba(22, 33, 62, 0.18)',
    transform: 'translateY(-2px)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'center',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '60px',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#fff2e8',
    color: '#c85d28',
    fontSize: '12px',
    fontWeight: 700,
  },
  cardAddress: {
    margin: '10px 0',
    color: '#6d7c94',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  cardValue: {
    margin: '5px 0',
    fontSize: '14px',
    color: '#1d2a44',
  },
  cardMeta: {
    margin: '10px 0 0',
    fontSize: '12px',
    color: '#7f8da3',
  },
  cardHint: {
    margin: '8px 0 0',
    fontSize: '12px',
    color: '#5f6f8a',
  },
  emptyState: {
    padding: '28px',
    borderRadius: '20px',
    background: '#fff',
    textAlign: 'center',
    color: '#6c7890',
    border: '1px dashed #ccd3df',
  },
  error: {
    padding: '40px',
    background: '#fef2f2',
    borderRadius: '20px',
    border: '1px solid #fecaca',
  },
  hint: {
    fontSize: '14px',
    color: '#666',
    marginTop: '16px',
    lineHeight: 1.8,
  },
};
