import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './app/App'
import './index.css'

// Produção usa BrowserRouter (URLs limpas + rewrite de SPA do Vercel). O build de
// artifact/single-file (VITE_ARTIFACT=1) usa HashRouter, que funciona dentro de
// um iframe sem depender de history.pushState no mesmo host.
const Router = import.meta.env.VITE_ARTIFACT ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
)
