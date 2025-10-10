import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import StartView from '@/views/StartView.vue'
import GameView from '@/views/GameView.vue'
import ResultView from '@/views/ResultView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'start',
    component: StartView,
  },
  {
    path: '/game',
    name: 'game',
    component: GameView,
  },
  {
    path: '/result',
    name: 'result',
    component: ResultView,
  },
]

// 開発環境でのみプレビュー画面を追加
if (import.meta.env.DEV) {
  routes.push({
    path: '/dev-preview',
    name: 'dev-preview',
    component: () => import('@/views/DevPreview.vue'),
  })
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
