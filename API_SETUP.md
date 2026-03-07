# 🔐 阿里百炼 API 配置指南

## ✅ 已完成配置

| 项目 | 状态 | 说明 |
|------|------|------|
| **环境变量** | ✅ 已创建 | `.env` 文件已生成 |
| **API Key** | ✅ 已配置 | 你的 Key 已存入 `.env` |
| **SDK 依赖** | ✅ 已添加 | `dashscope` 已加入 package.json |
| **调用工具** | ✅ 已创建 | `src/lib/dashscope.ts` |

---

## 📋 下一步操作

### 1. 安装依赖

```bash
cd /app/working/commute-map
npm install
```

### 2. ⚠️ 重要：重置你的 API Key

**你的 API Key 已暴露在对话中，建议立即重置！**

操作步骤：
1. 访问：https://dashscope.console.aliyun.com/apiKey
2. 登录阿里云账号
3. 找到当前 Key，点击"禁用"或删除
4. 创建新的 API Key
5. 更新 `.env` 文件：

```bash
# 编辑 .env 文件
DASHSCOPE_API_KEY=你的新 Key
```

---

## 🚀 使用示例

### 在组件中调用 AI

```typescript
import { callQwen } from '@/lib/dashscope';

// 在组件中使用
const handleAskAI = async () => {
  const response = await callQwen('北京海淀区租房一般多少钱？');
  console.log(response);
};
```

### 生成小区描述

```typescript
import { generateCommunityDescription } from '@/lib/dashscope';

const description = await generateCommunityDescription(
  '牡丹园小区',
  6500,
  85000
);
// 输出："牡丹园小区，海淀核心地段，月租 6500 元起，性价比之王！"
```

---

## 📊 阿里百炼模型选择

| 模型 | 速度 | 质量 | 价格 | 适用场景 |
|------|------|------|------|---------|
| **qwen-turbo** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 最便宜 | 简单问答、快速响应 |
| **qwen-plus** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 中等 | 复杂任务、推荐 |
| **qwen-max** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 最贵 | 专业分析、长文本 |

**推荐：** MVP 阶段用 `qwen-turbo` 就够了

---

## 🔒 安全最佳实践

### ✅ 正确做法

```bash
# 1. 使用环境变量
DASHSCOPE_API_KEY=xxx

# 2. .gitignore 忽略 .env 文件
echo ".env" >> .gitignore

# 3. 本地测试
npm run dev

# 4. 部署时配置环境变量
vercel env add DASHSCOPE_API_KEY
```

### ❌ 错误做法

```typescript
// 不要硬编码在代码里！
const apiKey = "sk-sp-xxx"; // ❌

// 不要提交到 Git！
git add .env // ❌

// 不要发到公开平台！
console.log(process.env.DASHSCOPE_API_KEY); // ❌
```

---

## 💰 费用说明

| 模型 | 价格（元/千 tokens） | 免费额度 |
|------|---------------------|---------|
| qwen-turbo | 0.002 | 100 万 tokens/月 |
| qwen-plus | 0.004 | 无 |
| qwen-max | 0.02 | 无 |

**估算：** 
- 每次问答约 100-500 tokens
- 100 万 tokens ≈ 2000-10000 次问答
- **免费额度够 MVP 阶段使用！**

---

## 🔗 相关文档

| 文档 | 链接 |
|------|------|
| 阿里百炼控制台 | https://dashscope.console.aliyun.com/ |
| API 文档 | https://help.aliyun.com/zh/dashscope/ |
| SDK 文档 | https://github.com/aliyun/alibabacloud-dashscope-ts-sdk |
| 定价详情 | https://help.aliyun.com/zh/dashscope/pricing |

---

## ❓ 常见问题

### Q: 调用失败怎么办？
A: 检查：
1. API Key 是否正确
2. 网络是否通畅
3. 余额是否充足

### Q: 免费额度用完怎么办？
A: 
1. 升级到付费套餐
2. 优化 Prompt，减少 tokens 消耗
3. 缓存常用结果

### Q: 可以在前端直接调用吗？
A: ❌ 不建议！应该通过 Serverless API 调用，避免 Key 泄露

---

## 🎯 下一步

1. **安装依赖**：`npm install`
2. **重置 API Key**（重要！）
3. **测试调用**：写一个简单的测试组件
4. **集成到项目**：在通勤地图中使用 AI 功能

需要我帮你创建测试组件吗？😊
