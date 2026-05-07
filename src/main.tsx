import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { GameProvider } from './app/GameContext'
import { installRuntimeMonitoringHooks } from './app/runtime/runtimeMonitoring'
import { AppErrorBoundary } from './ui/components/AppErrorBoundary'

installRuntimeMonitoringHooks()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <GameProvider>
          <App />
        </GameProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
)
