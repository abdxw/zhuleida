# 🏠 通勤地图找房

> 输入工作地点，画出通勤圈，一眼看清圈内房价

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置 API Key
cp .env.example .env
# 编辑 .env，填入高德地图 Key（申请见下方）

# 3. 本地开发
npm run dev

# 4. 部署到 Vercel（可选）
vercel
```

## 📋 功能

### 已完成 ✅
- ✅ 高德地图 API 接入
- ✅ 地图初始化与展示
- ✅ 地理编码（地址→经纬度）
- ✅ 通勤圈绘制（简化版）
- ✅ 路径规划（通勤时间计算）
- ✅ 小区数据示例

### 进行中 🚧
- [ ] 手动录入 50 个小区
- [ ] 搜索框组件
- [ ] 小区筛选功能
- [ ] Vercel 部署

## 🔑 API 配置

### 高德地图 API（必需）

1. **申请 Key**：
   - 访问 [高德开放平台](https://console.amap.com/dev/index)
   - 创建应用 → 选择「Web 端 (JS API)」
   - 获得 Key 和安全码

2. **填入 `.env`**：
   ```env
   VITE_AMAP_KEY=你的 Key
   AMAP_SECURITY_CODE=你的安全码
   ```

3. **免费额度**：30 万次/天（MVP 足够用）

详细指南：[AMAP_SETUP.md](./AMAP_SETUP.md)

### 阿里百炼 API（可选，用于 AI 功能）

已在 `.env` 中配置好，无需修改。

## 📁 项目结构

```
commute-map/
├── src/
│   ├── components/
│   │   └── MapView.tsx      # 地图组件（示例）
│   ├── hooks/
│   │   └── useAmap.ts       # 高德地图 Hook
│   ├── lib/
│   │   └── amap.ts          # 高德 API 工具库
│   └── data/
│       └── communities.ts   # 小区数据
├── .env.example             # 环境变量模板
├── AMAP_SETUP.md           # 高德 API 配置指南
└── README.md
```

## 🛠️ 技术栈

- **前端**：React 18 + TypeScript + Vite
- **地图**：高德地图 JS API 2.0
- **部署**：Vercel
- **AI**：阿里百炼（通义千问）

## 📝 下一步

1. **申请高德 Key**（5 分钟）
2. **录入 50 个小区**（2-3 小时，边用边补）
3. **测试核心功能**（通勤圈 + 搜索）
4. **部署上线**（Vercel 一键部署）

## 🎯 心态

做着玩玩，没人用自己用！😄

---

**详细文档**：
- [高德 API 配置指南](./AMAP_SETUP.md)
- [PRD 文档](./PRD.md)
