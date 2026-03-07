import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { canAccessAdminImages } from './app/admin/adminClientAccess'
import { type BackgroundMode, persistBackgroundMode, resolveBackgroundMode, toggleBackgroundMode } from './app/backgroundMode'
import { getCloudSessionUser, onCloudAuthStateChange } from './app/cloud/cloudAuth'
import { CloudProfileAutoSync } from './app/cloud/CloudProfileAutoSync'
import { useGame } from './app/useGame'
import { AchievementsPage } from './ui/pages/AchievementsPage'
import { AccountPage } from './ui/pages/AccountPage'
import { AdminImagesPage } from './ui/pages/AdminImagesPage'
import { CollectionPage } from './ui/pages/CollectionPage'
import { ChangelogsPage } from './ui/pages/ChangelogsPage'
import { DecksPage } from './ui/pages/DecksPage'
import { HomePage } from './ui/pages/HomePage'
import { LegalIpPage } from './ui/pages/LegalIpPage'
import { MatchPage } from './ui/pages/MatchPage'
import { MissionsPage } from './ui/pages/MissionsPage'
import { PacksPage } from './ui/pages/PacksPage'
import { ResultsPage } from './ui/pages/ResultsPage'
import { RanksPage } from './ui/pages/RanksPage'
import { RulesPage } from './ui/pages/RulesPage'
import { ShopPage } from './ui/pages/ShopPage'
import { SetupPage } from './ui/pages/SetupPage'
import './index.css'

const THEME_STORAGE_KEY = 'kh-triple-triad-theme-mode-v1'
const LOCKED_THEME_MODE = 'pokemon' as const
const TOPBAR_ICON_PATHS = {
  play: '/ui/icons/header/play.png',
  decks: '/ui/icons/header/decks.png',
  pokedex: '/ui/icons/header/pokedex.png',
  shop: '/ui/icons/header/shop.png',
  packs: '/ui/icons/header/packs.png',
  account: '/ui/icons/header/account.png',
  more: '/ui/icons/header/more.png',
} as const

function App() {
  const { profile, currentMatch, abandonCurrentMatch, abandonTowerRun } = useGame()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [isAdminImagesLinkVisible, setIsAdminImagesLinkVisible] = useState(false)
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>(() => resolveBackgroundMode())
  const ctaLabel = currentMatch ? 'Continue' : 'Play'
  const ctaTarget = currentMatch ? '/match' : '/setup'

  const handleTopbarAbandon = () => {
    if (!currentMatch) {
      return
    }

    if (currentMatch.queue === 'tower') {
      if (abandonTowerRun) {
        abandonTowerRun()
      } else {
        abandonCurrentMatch?.()
      }
    } else {
      abandonCurrentMatch?.()
    }

    navigate('/setup')
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMoreOpen(false)
  }, [location.pathname])

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
    document.body.dataset.backgroundMode = backgroundMode
    persistBackgroundMode(backgroundMode)

    return () => {
      delete document.body.dataset.backgroundMode
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

  useEffect(() => {
    let mounted = true

    const applyUser = (email: string | null | undefined) => {
      if (!mounted) {
        return
      }

      setIsAdminImagesLinkVisible(canAccessAdminImages(email))
    }

    void getCloudSessionUser()
      .then((user) => {
        applyUser(user?.email ?? null)
      })
      .catch(() => {
        applyUser(null)
      })

    const unsubscribe = onCloudAuthStateChange((user) => {
      applyUser(user?.email ?? null)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return (
    <div className="app-shell">
      <CloudProfileAutoSync />

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
          <NavLink to={ctaTarget} className="topbar-cta topbar-nav-item" data-testid="topbar-cta-link">
            <img className="topbar-nav-item__icon" src={TOPBAR_ICON_PATHS.play} alt="" aria-hidden="true" />
            <span className="topbar-nav-item__label">{ctaLabel}</span>
          </NavLink>
          {currentMatch ? (
            <button type="button" className="topbar-abandon" data-testid="topbar-abandon-button" onClick={handleTopbarAbandon}>
              Abandonner
            </button>
          ) : null}
          <NavLink to="/decks" className="topbar-nav-item" data-testid="topbar-link-decks">
            <img className="topbar-nav-item__icon" src={TOPBAR_ICON_PATHS.decks} alt="" aria-hidden="true" />
            <span className="topbar-nav-item__label">Decks</span>
          </NavLink>
          <NavLink to="/pokedex" className="topbar-nav-item" data-testid="topbar-link-collection">
            <img className="topbar-nav-item__icon" src={TOPBAR_ICON_PATHS.pokedex} alt="" aria-hidden="true" />
            <span className="topbar-nav-item__label">Pokédex</span>
          </NavLink>
          <NavLink to="/shop" className="topbar-nav-item" data-testid="topbar-link-shop">
            <img className="topbar-nav-item__icon" src={TOPBAR_ICON_PATHS.shop} alt="" aria-hidden="true" />
            <span className="topbar-nav-item__label">Shop</span>
          </NavLink>
          <NavLink to="/packs" className="topbar-nav-item" data-testid="topbar-link-packs">
            <img className="topbar-nav-item__icon" src={TOPBAR_ICON_PATHS.packs} alt="" aria-hidden="true" />
            <span className="topbar-nav-item__label">Packs</span>
          </NavLink>
          <NavLink to="/account" className="topbar-nav-item" data-testid="topbar-link-account">
            <img className="topbar-nav-item__icon" src={TOPBAR_ICON_PATHS.account} alt="" aria-hidden="true" />
            <span className="topbar-nav-item__label">Account</span>
          </NavLink>
          <button
            type="button"
            className="main-nav__more-toggle topbar-nav-item"
            data-testid="topbar-more-toggle"
            aria-haspopup="dialog"
            aria-expanded={isMoreOpen}
            aria-controls="topbar-more-menu"
            onClick={() => setIsMoreOpen(true)}
          >
            <img className="topbar-nav-item__icon" src={TOPBAR_ICON_PATHS.more} alt="" aria-hidden="true" />
            <span className="topbar-nav-item__label">More</span>
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
              <NavLink to="/changelogs" data-testid="topbar-more-link-changelogs" onClick={() => setIsMoreOpen(false)}>
                Changelogs
              </NavLink>
              <NavLink to="/legal" data-testid="topbar-more-link-legal" onClick={() => setIsMoreOpen(false)}>
                Mentions IP
              </NavLink>
              {isAdminImagesLinkVisible ? (
                <NavLink to="/admin/images" data-testid="topbar-more-link-admin-images" onClick={() => setIsMoreOpen(false)}>
                  Admin Images
                </NavLink>
              ) : null}
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
          <Route path="/pokedex" element={<CollectionPage />} />
          <Route path="/collection" element={<Navigate to="/pokedex" replace />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/missions" element={<MissionsPage />} />
          <Route path="/ranks" element={<RanksPage />} />
          <Route path="/changelogs" element={<ChangelogsPage />} />
          <Route path="/legal" element={<LegalIpPage />} />
          <Route path="/admin/images" element={<AdminImagesPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <nav className="mobile-main-nav" data-testid="mobile-main-nav" aria-label="Primary mobile navigation">
        <NavLink to={ctaTarget} className="mobile-main-nav__item">
          <img className="mobile-main-nav__icon" src={TOPBAR_ICON_PATHS.play} alt="" aria-hidden="true" />
          {ctaLabel}
        </NavLink>
        <NavLink to="/decks" className="mobile-main-nav__item">
          <img className="mobile-main-nav__icon" src={TOPBAR_ICON_PATHS.decks} alt="" aria-hidden="true" />
          Decks
        </NavLink>
        <NavLink to="/pokedex" className="mobile-main-nav__item">
          <img className="mobile-main-nav__icon" src={TOPBAR_ICON_PATHS.pokedex} alt="" aria-hidden="true" />
          Pokédex
        </NavLink>
        <NavLink to="/shop" className="mobile-main-nav__item">
          <img className="mobile-main-nav__icon" src={TOPBAR_ICON_PATHS.shop} alt="" aria-hidden="true" />
          Shop
        </NavLink>
        <NavLink to="/packs" className="mobile-main-nav__item">
          <img className="mobile-main-nav__icon" src={TOPBAR_ICON_PATHS.packs} alt="" aria-hidden="true" />
          Packs
        </NavLink>
        <NavLink to="/account" className="mobile-main-nav__item">
          <img className="mobile-main-nav__icon" src={TOPBAR_ICON_PATHS.account} alt="" aria-hidden="true" />
          Account
        </NavLink>
        <button
          type="button"
          className="mobile-main-nav__item mobile-main-nav__item--more"
          data-testid="mobile-main-nav-more-toggle"
          onClick={() => setIsMoreOpen(true)}
        >
          <img className="mobile-main-nav__icon" src={TOPBAR_ICON_PATHS.more} alt="" aria-hidden="true" />
          More
        </button>
      </nav>

      <button
        type="button"
        className="background-mode-toggle"
        data-testid="background-mode-toggle"
        aria-label="Toggle background mode"
        onClick={() => setBackgroundMode((mode) => toggleBackgroundMode(mode))}
      >
        <span className="background-mode-toggle__icon" aria-hidden="true">
          {backgroundMode === 'dark' ? '☀' : '☾'}
        </span>
        <span className="background-mode-toggle__label">{backgroundMode === 'dark' ? 'Light' : 'Dark'}</span>
      </button>
    </div>
  )
}

export default App
