/**
 * 阿里百炼 API 调用工具
 * 文档：https://help.aliyun.com/zh/dashscope/
 */

// @ts-ignore - dashscope 没有类型定义
declare module 'dashscope';

// 使用 Vite 的环境变量
const DASHSCOPE_API_KEY = import.meta.env.VITE_DASHSCOPE_API_KEY || '';

/**
 * 调用通义千问模型
 * @param prompt - 用户输入
 * @returns AI 响应
 */
export async function callQwen(prompt: string): Promise<string> {
  try {
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: {
          messages: [
            { role: 'system', content: '你是一个有用的助手。' },
            { role: 'user', content: prompt },
          ],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data.output?.text || '未获取到响应';
  } catch (error) {
    console.error('阿里百炼 API 调用失败:', error);
    return 'AI 服务暂时不可用';
  }
}

/**
 * 生成小区描述
 * @param communityName - 小区名称
 * @param rentAvg - 平均租金
 * @param saleAvg - 平均售价
 * @returns 描述文本
 */
export async function generateCommunityDescription(
  communityName: string,
  rentAvg: number,
  saleAvg: number
): Promise<string> {
  const prompt = `请用一句话描述这个小区，突出性价比和居住体验：
小区名称：${communityName}
平均租金：${rentAvg}元/月
平均售价：${saleAvg}元/㎡

要求：简洁、有吸引力，不超过 50 字。`;

  return await callQwen(prompt);
}

/**
 * 智能推荐小区
 * @param workLocation - 工作地点
 * @param budget - 预算
 * @param commuteTime - 通勤时间要求
 * @returns 推荐列表
 */
export async function recommendCommunities(
  workLocation: string,
  budget: number,
  commuteTime: number
): Promise<string> {
  const prompt = `请根据以下条件推荐北京租房区域：
工作地点：${workLocation}
月租金预算：${budget}元
最大通勤时间：${commuteTime}分钟

请推荐 3-5 个适合的居住区域，并说明理由。`;

  return await callQwen(prompt);
}
