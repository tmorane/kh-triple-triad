import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CloudProfileAutoSync } from './app/cloud/CloudProfileAutoSync'
import { useGame } from './app/useGame'
import { AchievementsPage } from './ui/pages/AchievementsPage'
import { AccountPage } from './ui/pages/AccountPage'
import { CollectionPage } from './ui/pages/CollectionPage'
import { DecksPage } from './ui/pages/DecksPage'
import { HomePage } from './ui/pages/HomePage'
import { MatchPage } from './ui/pages/MatchPage'
import { MissionsPage } from './ui/pages/MissionsPage'
import { PacksPage } from './ui/pages/PacksPage'
import { ResultsPage } from './ui/pages/ResultsPage'
import { RanksPage } from './ui/pages/RanksPage'
import { RulesPage } from './ui/pages/RulesPage'
import { ShopPage } from './ui/pages/ShopPage'
import { SetupPage } from './ui/pages/SetupPage'
import './index.css'

const BACKGROUNDS = ['bg1', 'bg2', 'bg3', 'bg4'] as const
type BackgroundMode = (typeof BACKGROUNDS)[number]
const THEME_STORAGE_KEY = 'kh-triple-triad-theme-mode-v1'
const LOCKED_THEME_MODE = 'pokemon' as const

function App() {
  const { profile, currentMatch } = useGame()
  const location = useLocation()
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('bg1')
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const ctaLabel = currentMatch ? 'Continue' : 'Play'
  const ctaTarget = currentMatch ? '/match' : '/setup'

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMoreOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.dataset.bg = backgroundMode

    return () => {
      delete document.body.dataset.bg
    }
  }, [backgroundMode])

  useEffect(() => {
    document.body.dataset.theme = LOCKED_THEME_MODE
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, LOCKED_THEME_MODE)
    } catch {
      // Ignore storage write errors (private mode, disabled storage, etc.).
    }

    return () => {
      delete document.body.dataset.theme
    }
  }, [])

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
      <CloudProfileAutoSync />

      <div className="visual-controls" data-testid="visual-controls" aria-label="Visual controls">
        <div className="bg-options" role="group" aria-label="Background selection">
          {BACKGROUNDS.map((background) => {
            const isActive = backgroundMode === background
            return (
              <button
                key={background}
                type="button"
                className={`bg-option ${isActive ? 'is-active' : ''}`}
                data-testid={`bg-option-${background}`}
                aria-pressed={isActive}
                onClick={() => setBackgroundMode(background)}
              >
                {background.toUpperCase()}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          className="theme-toggle"
          data-testid="theme-toggle"
          aria-label="Theme locked to Pokemon"
          disabled
        >
          Theme: Pokemon only
        </button>
      </div>

      <header className="topbar">
        <div className="brand-block">
          <NavLink to="/" className="brand brand-link">
            {profile.playerName}
          </NavLink>
          <NavLink to="/" className="brand-sub brand-sub-link">
            Garden Console
          </NavLink>
        </div>

        <nav className="main-nav" aria-label="Primary navigation">
          <NavLink to={ctaTarget} className="topbar-cta" data-testid="topbar-cta-link">
            {ctaLabel}
          </NavLink>
          <NavLink to="/decks" data-testid="topbar-link-decks">
            Decks
          </NavLink>
          <NavLink to="/collection" data-testid="topbar-link-collection">
            Collection
          </NavLink>
          <NavLink to="/shop" data-testid="topbar-link-shop">
            Shop
          </NavLink>
          <NavLink to="/packs" data-testid="topbar-link-packs">
            Packs
          </NavLink>
          <NavLink to="/account" data-testid="topbar-link-account">
            Account
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
              <NavLink to="/achievements" data-testid="topbar-more-link-achievements" onClick={() => setIsMoreOpen(false)}>
                Achievements
              </NavLink>
              <NavLink to="/missions" data-testid="topbar-more-link-missions" onClick={() => setIsMoreOpen(false)}>
                Missions
              </NavLink>
              <NavLink to="/ranks" data-testid="topbar-more-link-ranks" onClick={() => setIsMoreOpen(false)}>
                Ranks
              </NavLink>
              <NavLink to="/rules" data-testid="topbar-more-link-rules" onClick={() => setIsMoreOpen(false)}>
                Rules
              </NavLink>
              <NavLink to="/account" data-testid="topbar-more-link-account" onClick={() => setIsMoreOpen(false)}>
                Account
              </NavLink>
            </nav>
          </section>
        </div>
      ) : null}

      <main className="content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/decks" element={<DecksPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/packs" element={<PacksPage />} />
          <Route path="/match" element={<MatchPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/missions" element={<MissionsPage />} />
          <Route path="/ranks" element={<RanksPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <nav className="mobile-main-nav" data-testid="mobile-main-nav" aria-label="Primary mobile navigation">
        <NavLink to={ctaTarget} className="mobile-main-nav__item">
          {ctaLabel}
        </NavLink>
        <NavLink to="/decks" className="mobile-main-nav__item">
          Decks
        </NavLink>
        <NavLink to="/collection" className="mobile-main-nav__item">
          Collection
        </NavLink>
        <NavLink to="/shop" className="mobile-main-nav__item">
          Shop
        </NavLink>
        <NavLink to="/packs" className="mobile-main-nav__item">
          Packs
        </NavLink>
        <NavLink to="/account" className="mobile-main-nav__item">
          Account
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
