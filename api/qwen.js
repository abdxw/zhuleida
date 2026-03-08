export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing DASHSCOPE_API_KEY' });
  }

  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const response = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
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
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const message =
        typeof data?.message === 'string' ? data.message : `DashScope request failed: ${response.status}`;
      return res.status(response.status).json({ error: message });
    }

    return res.status(200).json({
      text: data?.output?.text || '未获取到响应',
    });
  } catch (error) {
    console.error('DashScope proxy failed:', error);
    return res.status(502).json({ error: 'AI service unavailable' });
  }
}
