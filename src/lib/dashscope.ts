/**
 * 阿里百炼 API 调用工具
 * 文档：https://help.aliyun.com/zh/dashscope/
 */

/**
 * 调用通义千问模型
 * @param prompt - 用户输入
 * @returns AI 响应
 */
export async function callQwen(prompt: string): Promise<string> {
  try {
    const response = await fetch('/api/qwen', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || `API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data.text || '未获取到响应';
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
