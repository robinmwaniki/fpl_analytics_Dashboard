import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const FPL_ORIGIN = 'https://fantasy.premierleague.com'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Mirrors the Vercel function in api/fpl/[endpoint].ts for local development:
      // /api/fpl/bootstrap-static -> https://fantasy.premierleague.com/api/bootstrap-static/
      '/api/fpl': {
        target: FPL_ORIGIN,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fpl\/([^/?]+)\/?.*$/, '/api/$1/'),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; fpl-analytics-dashboard)' },
      },
    },
  },
})