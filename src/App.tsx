import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useGame } from './app/useGame'
import { AchievementsPage } from './ui/pages/AchievementsPage'
import { CollectionPage } from './ui/pages/CollectionPage'
import { HomePage } from './ui/pages/HomePage'
import { MatchPage } from './ui/pages/MatchPage'
import { PacksPage } from './ui/pages/PacksPage'
import { ResultsPage } from './ui/pages/ResultsPage'
import { RulesPage } from './ui/pages/RulesPage'
import { ShopPage } from './ui/pages/ShopPage'
import { SetupPage } from './ui/pages/SetupPage'
import './index.css'

const BACKGROUNDS = ['bg1', 'bg2', 'bg3', 'bg4'] as const
type BackgroundMode = (typeof BACKGROUNDS)[number]

function getNextBackground(current: BackgroundMode): BackgroundMode {
  const currentIndex = BACKGROUNDS.indexOf(current)
  return BACKGROUNDS[(currentIndex + 1) % BACKGROUNDS.length]
}

function App() {
  const { profile } = useGame()
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('bg1')
  const nextBackground = getNextBackground(backgroundMode).toUpperCase()

  useEffect(() => {
    document.body.dataset.bg = backgroundMode

    return () => {
      delete document.body.dataset.bg
    }
  }, [backgroundMode])

  return (
    <div className="app-shell">
      <button
        type="button"
        className="bg-toggle"
        aria-label="Basculer le fond"
        onClick={() => setBackgroundMode((current) => getNextBackground(current))}
      >
        {nextBackground}
      </button>

      <header className="topbar">
        <div className="brand-block">
          <p className="brand">KH Triple Triad</p>
          <p className="brand-sub">Garden Console</p>
        </div>

        <p className="topbar-gold">Gold {profile.gold}</p>

        <nav className="main-nav">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/setup">Play</NavLink>
          <NavLink to="/shop">Shop</NavLink>
          <NavLink to="/packs">Packs</NavLink>
          <NavLink to="/rules">Rules</NavLink>
          <NavLink to="/collection">Collection</NavLink>
          <NavLink to="/achievements">Achievements</NavLink>
        </nav>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/packs" element={<PacksPage />} />
          <Route path="/match" element={<MatchPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
