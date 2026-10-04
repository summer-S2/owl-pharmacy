import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { applyTheme, savedThemeId } from './themes'

// 화면을 그리기 전에 저장된 테마를 먼저 적용 (기본 테마가 잠깐 보였다 바뀌지 않게)
applyTheme(savedThemeId())

const app = createApp(App)

app.use(router)

app.mount('#app')
