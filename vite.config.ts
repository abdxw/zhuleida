import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function json(res: any, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function readBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = ''

    req.on('data', (chunk: any) => {
      raw += chunk.toString()
    })

    req.on('end', () => resolve(raw))
    req.on('error', reject)
  })
}

function qwenDevMiddleware(mode: string) {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    name: 'qwen-dev-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url?.split('?')[0] !== '/api/qwen') {
          next()
          return
        }

        if (req.method !== 'POST') {
          json(res, 405, { error: 'Method not allowed' })
          return
        }

        const apiKey = env.DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY
        if (!apiKey) {
          json(res, 500, { error: 'Missing DASHSCOPE_API_KEY' })
          return
        }

        try {
          const rawBody = await readBody(req)
          const body = rawBody ? JSON.parse(rawBody) : {}
          const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''

          if (!prompt) {
            json(res, 400, { error: 'Prompt is required' })
            return
          }

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
          )

          const data = await response.json()

          if (!response.ok) {
            const message =
              typeof data?.message === 'string'
                ? data.message
                : `DashScope request failed: ${response.status}`
            json(res, response.status, { error: message })
            return
          }

          json(res, 200, { text: data?.output?.text || '未获取到响应' })
        } catch (error) {
          console.error('DashScope dev proxy failed:', error)
          json(res, 502, { error: 'AI service unavailable' })
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), qwenDevMiddleware(mode)],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
}))
