import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
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
  const { profile, currentMatch } = useGame()
  const location = useLocation()
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('bg1')
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const nextBackground = getNextBackground(backgroundMode).toUpperCase()
  const ctaLabel = currentMatch ? 'Continue' : 'Play'
  const ctaTarget = currentMatch ? '/match' : '/setup'

  useEffect(() => {
    setIsMoreOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.dataset.bg = backgroundMode

    return () => {
      delete document.body.dataset.bg
    }
  }, [backgroundMode])

  useEffect(() => {
    if (!isMoreOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMoreOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMoreOpen])

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

        <nav className="main-nav" aria-label="Primary navigation">
          <NavLink to={ctaTarget} className="topbar-cta" data-testid="topbar-cta-link">
            {ctaLabel}
          </NavLink>
          <NavLink to="/collection" data-testid="topbar-link-collection">
            Collection
          </NavLink>
          <NavLink to="/shop" data-testid="topbar-link-shop">
            Shop
          </NavLink>
          <button
            type="button"
            className="main-nav__more-toggle"
            data-testid="topbar-more-toggle"
            aria-haspopup="dialog"
            aria-expanded={isMoreOpen}
            aria-controls="topbar-more-menu"
            onClick={() => setIsMoreOpen(true)}
          >
            More
          </button>
        </nav>

        <p className="topbar-gold">Gold {profile.gold}</p>
      </header>

      {isMoreOpen ? (
        <div
          className="topbar-more-backdrop"
          role="presentation"
          data-testid="topbar-more-backdrop"
          onClick={() => setIsMoreOpen(false)}
        >
          <section
            className="topbar-more-menu"
            id="topbar-more-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="topbar-more-title"
            data-testid="topbar-more-menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="topbar-more-head">
              <h2 id="topbar-more-title">More</h2>
              <button type="button" className="button" onClick={() => setIsMoreOpen(false)}>
                Close
              </button>
            </div>
            <nav className="topbar-more-links" aria-label="More navigation">
              <NavLink to="/packs" data-testid="topbar-more-link-packs" onClick={() => setIsMoreOpen(false)}>
                Packs
              </NavLink>
              <NavLink to="/achievements" data-testid="topbar-more-link-achievements" onClick={() => setIsMoreOpen(false)}>
                Achievements
              </NavLink>
              <NavLink to="/rules" data-testid="topbar-more-link-rules" onClick={() => setIsMoreOpen(false)}>
                Rules
              </NavLink>
              <NavLink to="/" data-testid="topbar-more-link-home" onClick={() => setIsMoreOpen(false)}>
                Home
              </NavLink>
            </nav>
          </section>
        </div>
      ) : null}

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

      <nav className="mobile-main-nav" data-testid="mobile-main-nav" aria-label="Primary mobile navigation">
        <NavLink to={ctaTarget} className="mobile-main-nav__item">
          {ctaLabel}
        </NavLink>
        <NavLink to="/collection" className="mobile-main-nav__item">
          Collection
        </NavLink>
        <NavLink to="/shop" className="mobile-main-nav__item">
          Shop
        </NavLink>
        <button
          type="button"
          className="mobile-main-nav__item mobile-main-nav__item--more"
          data-testid="mobile-main-nav-more-toggle"
          onClick={() => setIsMoreOpen(true)}
        >
          More
        </button>
      </nav>
    </div>
  )
}

export default App
