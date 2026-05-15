import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

function flowSavePlugin(): Plugin {
  const flowsDir = path.resolve(__dirname, 'src/data/flows')

  return {
    name: 'flow-save',
    configureServer(server) {
      server.middlewares.use('/api/save-flow', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          try {
            const flow = JSON.parse(body)
            if (!flow.id) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Missing flow id' }))
              return
            }

            const filePath = path.join(flowsDir, `${flow.id}.json`)
            const json = JSON.stringify(flow, null, 2) + '\n'
            fs.writeFileSync(filePath, json, 'utf-8')

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, path: filePath }))
          } catch {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Invalid JSON' }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), flowSavePlugin()],
})
