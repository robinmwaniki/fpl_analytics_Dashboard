import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const FPL_ORIGIN = 'https://fantasy.premierleague.com'
const USER_AGENT = 'Mozilla/5.0 (compatible; fpl-analytics-dashboard)'

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
        headers: { 'User-Agent': USER_AGENT },
      },
      // Mirrors api/team-picks.ts:
      // /api/team-picks?id=1&gw=5 -> https://fantasy.premierleague.com/api/entry/1/event/5/picks/
      '/api/team-picks': {
        target: FPL_ORIGIN,
        changeOrigin: true,
        rewrite: (path) => {
          const params = new URL(path, 'http://localhost').searchParams
          return `/api/entry/${params.get('id')}/event/${params.get('gw')}/picks/`
        },
        headers: { 'User-Agent': USER_AGENT },
      },
    },
  },
})