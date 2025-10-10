import { createRouter, createWebHistory } from 'vue-router'
import StartView from '@/views/StartView.vue'
import GameView from '@/views/GameView.vue'
import ResultView from '@/views/ResultView.vue'
import DevPreview from '@/views/DevPreview.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
    {
      path: '/dev-preview',
      name: 'dev-preview',
      component: DevPreview,
    },
  ],
})

export default router
