import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { applyTheme, readTheme } from './core/theme'
import { applySize, readSize } from './core/display'
import { applyAccent, readAccent } from './core/accent'
import { applyFrame, readFrame } from './core/present'
import App from './App'
import ErrorBoundary from './app/ErrorBoundary'
import { StoreProvider } from './core/store'
import { ToastProvider } from './app/components/Toast'
import './index.css'

applyTheme(readTheme())
applySize(readSize())
applyAccent(readAccent())
applyFrame(readFrame())

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <StoreProvider>
        <ToastProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </ToastProvider>
      </StoreProvider>
    </HashRouter>
  </React.StrictMode>,
)
