/// <reference types="node" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

/** Dev-only endpoint: POST /api/save-flow saves JSON to src/data/flows/ */
function saveFlowPlugin(): Plugin {
  const flowsDir = () => path.join(process.cwd(), 'src/data/flows')

  return {
    name: 'save-flow',
    configureServer(server) {
      server.middlewares.use('/api/save-flow', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let body = ''
        req.on('data', (chunk: string) => { body += chunk })
        req.on('end', () => {
          try {
            const flow = JSON.parse(body)
            const dir = flowsDir()
            fs.mkdirSync(dir, { recursive: true })
            const filePath = path.join(dir, `${flow.id}.json`)
            fs.writeFileSync(filePath, JSON.stringify(flow, null, 2) + '\n')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ saved: filePath }))
          } catch (e) {
            res.statusCode = 400
            res.end(String(e))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), saveFlowPlugin()],
})
