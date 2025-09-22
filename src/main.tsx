import React from 'react'
import ReactDOM from 'react-dom/client'
import * as AppMod from './App'             // <-- импортируем модуль целиком
import './index.css'

const App = (AppMod as any).default || (AppMod as any).App
if (!App || typeof App !== 'function') {
  // Подробный лог, чтобы сразу видно было, что импортится
  console.error('App import is not a component. Module exports:', AppMod)
  const el = document.getElementById('root')
  if (el) el.innerText = 'Помилка: компонент App не знайдено. Перевір імпорт/експорт.'
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
}
