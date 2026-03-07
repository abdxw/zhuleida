# 高德地图 API 接入指南

## 1. 申请 API Key

### 步骤：
1. 访问 [高德开放平台](https://console.amap.com/)
2. 注册/登录账号
3. 进入「应用管理」→「我的应用」
4. 点击「创建新应用」
   - 应用名称：通勤地图找房
   - 应用类型：Web 端 (JS API)
5. 创建后获得 **Key** 和 **安全码**

### 需要的服务：
- ✅ JavaScript API（前端地图展示）
- ✅ Web 服务 API（地理编码、搜索）
- ✅ 路径规划 API（通勤时间计算）

### 免费额度：
- 个人开发者：30 万次/天（足够 MVP 使用）
- 商业应用：需认证

---

## 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

填入你的 Key：

```env
AMAP_KEY=你的 Key
AMAP_SECURITY_CODE=你的安全码
```

---

## 3. 已创建的工具文件

### `src/lib/amap.ts`
- 地图初始化
- 地理编码（地址→经纬度）
- 小区搜索
- 路径规划（通勤时间计算）

### `src/hooks/useAmap.ts`
- React Hook 封装
- 地图加载状态管理
- 错误处理

---

## 4. 使用示例

### 初始化地图
```typescript
import { initAmap } from '@/lib/amap';

const map = await initAmap('container-id', {
  center: [116.397428, 39.90923],
  zoom: 12
});
```

### 地理编码
```typescript
import { geocode } from '@/lib/amap';

const result = await geocode('北京大学医学部');
// { lng: 116.36, lat: 39.98 }
```

### 路径规划
```typescript
import { calculateCommuteTime } from '@/lib/amap';

const time = await calculateCommuteTime({
  from: [116.36, 39.98],
  to: [116.40, 39.90],
  mode: 'transit' // driving, transit, walking
});
// { duration: 45, distance: 12.5 }
```

---

## 5. 下一步

1. **申请 Key**：5 分钟完成
2. **填入 `.env`**：1 分钟
3. **测试**：运行 `npm run dev` 查看地图是否正常加载

---

## 6. 常见问题

### Q: 提示"安全码校验失败"？
A: 检查 `.env` 中的 `AMAP_SECURITY_CODE` 是否正确，确保没有多余空格。

### Q: 地图不显示？
A: 打开浏览器控制台，查看是否有 API Key 相关的错误信息。

### Q: 超出免费额度？
A: MVP 阶段 50 个小区 + 低频访问不会超限。如真超限，考虑优化调用频率或升级账号。

---

**申请地址**：https://console.amap.com/dev/index
