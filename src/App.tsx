import { lazy, Suspense, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { canAccessAdminImages } from './app/admin/adminClientAccess'
import { type BackgroundMode, persistBackgroundMode, resolveBackgroundMode, toggleBackgroundMode } from './app/backgroundMode'
import { useGame } from './app/useGame'
import { listStoryMaps } from './domain/story/story'
import { HomePage } from './ui/pages/HomePage'
import { LandingPage } from './ui/pages/LandingPage'
import { SetupPage } from './ui/pages/SetupPage'
import { TrackedPokemonWidget } from './ui/components/TrackedPokemonWidget'
import { stopStoryMusic } from './ui/audio/storyMusic'
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
const STORY_MAP_ROUTE_IDS = new Set(listStoryMaps().map((map) => map.id))

const RulesPage = lazy(() => import('./ui/pages/RulesPage').then((module) => ({ default: module.RulesPage })))
const StoryMapSelectPage = lazy(() => import('./ui/pages/StoryPage').then((module) => ({ default: module.StoryMapSelectPage })))
const StoryPage = lazy(() => import('./ui/pages/StoryPage').then((module) => ({ default: module.StoryPage })))
const DecksPage = lazy(() => import('./ui/pages/DecksPage').then((module) => ({ default: module.DecksPage })))
const ShopPage = lazy(() => import('./ui/pages/ShopPage').then((module) => ({ default: module.ShopPage })))
const PacksPage = lazy(() => import('./ui/pages/PacksPage').then((module) => ({ default: module.PacksPage })))
const MatchPage = lazy(() => import('./ui/pages/MatchPage').then((module) => ({ default: module.MatchPage })))
const ResultsPage = lazy(() => import('./ui/pages/ResultsPage').then((module) => ({ default: module.ResultsPage })))
const CollectionPage = lazy(() => import('./ui/pages/CollectionPage').then((module) => ({ default: module.CollectionPage })))
const AchievementsPage = lazy(() =>
  import('./ui/pages/AchievementsPage').then((module) => ({ default: module.AchievementsPage })),
)
const MissionsPage = lazy(() => import('./ui/pages/MissionsPage').then((module) => ({ default: module.MissionsPage })))
const RanksPage = lazy(() => import('./ui/pages/RanksPage').then((module) => ({ default: module.RanksPage })))
const ChangelogsPage = lazy(() =>
  import('./ui/pages/ChangelogsPage').then((module) => ({ default: module.ChangelogsPage })),
)
const LegalIpPage = lazy(() => import('./ui/pages/LegalIpPage').then((module) => ({ default: module.LegalIpPage })))
const PrivacyPage = lazy(() => import('./ui/pages/PrivacyPage').then((module) => ({ default: module.PrivacyPage })))
const AdminImagesPage = lazy(() =>
  import('./ui/pages/AdminImagesPage').then((module) => ({ default: module.AdminImagesPage })),
)
const AccountPage = lazy(() => import('./ui/pages/AccountPage').then((module) => ({ default: module.AccountPage })))

function App() {
  const { profile, currentMatch, abandonCurrentMatch, abandonTowerRun } = useGame()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const isAdminImagesLinkVisible = canAccessAdminImages(null)
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>(() => resolveBackgroundMode())
  const isLandingPage = location.pathname === '/'
  const ctaLabel = currentMatch ? 'Continuer' : 'Jouer'
  const ctaTarget = currentMatch ? '/match' : '/setup'
  const routeFallback = <p className="small">Chargement...</p>

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
    if (!isStoryMapPathname(location.pathname)) {
      stopStoryMusic()
    }
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

  return (
    <div className={`app-shell${isLandingPage ? ' app-shell--landing' : ''}`}>
      {!isLandingPage ? (
      <header className="topbar">
        <div className="brand-block">
          <NavLink to="/home" className="brand brand-link">
            {profile.playerName}
          </NavLink>
          <NavLink to="/home" className="brand-sub brand-sub-link">
            Garden Console
          </NavLink>
        </div>

        <div className="topbar-match-actions" data-testid="topbar-match-actions">
          <NavLink to={ctaTarget} className="topbar-cta topbar-nav-item" data-testid="topbar-cta-link">
            <img className="topbar-nav-item__icon" src={TOPBAR_ICON_PATHS.play} alt="" aria-hidden="true" />
            <span className="topbar-nav-item__label">{ctaLabel}</span>
          </NavLink>
        </div>

        <nav className="main-nav" aria-label="Navigation principale">
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
            <span className="topbar-nav-item__label">Boutique</span>
          </NavLink>
          <NavLink to="/packs" className="topbar-nav-item" data-testid="topbar-link-packs">
            <img className="topbar-nav-item__icon" src={TOPBAR_ICON_PATHS.packs} alt="" aria-hidden="true" />
            <span className="topbar-nav-item__label">Packs</span>
          </NavLink>
          <NavLink to="/account" className="topbar-nav-item" data-testid="topbar-link-account">
            <img className="topbar-nav-item__icon" src={TOPBAR_ICON_PATHS.account} alt="" aria-hidden="true" />
            <span className="topbar-nav-item__label">Compte</span>
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
            <span className="topbar-nav-item__label">Plus</span>
          </button>
        </nav>

        <div className="topbar-status-area" data-testid="topbar-status-area">
          <div className="topbar-status">
            <TrackedPokemonWidget testIdPrefix="topbar-tracked" variant="topbar" />
            <p className="topbar-gold">Or {profile.gold}</p>
          </div>
          {currentMatch ? (
            <button type="button" className="topbar-abandon" data-testid="topbar-abandon-button" onClick={handleTopbarAbandon}>
              Abandonner
            </button>
          ) : null}
        </div>
      </header>
      ) : null}

      {!isLandingPage && isMoreOpen ? (
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
              <h2 id="topbar-more-title">Plus</h2>
              <button type="button" className="button" onClick={() => setIsMoreOpen(false)}>
                Fermer
              </button>
            </div>
            <nav className="topbar-more-links" aria-label="Navigation secondaire">
              <NavLink to="/achievements" data-testid="topbar-more-link-achievements" onClick={() => setIsMoreOpen(false)}>
                Succès
              </NavLink>
              <NavLink to="/missions" data-testid="topbar-more-link-missions" onClick={() => setIsMoreOpen(false)}>
                Missions
              </NavLink>
              <NavLink to="/story" data-testid="topbar-more-link-story" onClick={() => setIsMoreOpen(false)}>
                Histoire
              </NavLink>
              <NavLink to="/ranks" data-testid="topbar-more-link-ranks" onClick={() => setIsMoreOpen(false)}>
                Rangs
              </NavLink>
              <NavLink to="/rules" data-testid="topbar-more-link-rules" onClick={() => setIsMoreOpen(false)}>
                Règles
              </NavLink>
              <NavLink to="/changelogs" data-testid="topbar-more-link-changelogs" onClick={() => setIsMoreOpen(false)}>
                Notes de version
              </NavLink>
              <NavLink to="/legal" data-testid="topbar-more-link-legal" onClick={() => setIsMoreOpen(false)}>
                Mentions IP
              </NavLink>
              <NavLink to="/privacy" data-testid="topbar-more-link-privacy" onClick={() => setIsMoreOpen(false)}>
                Confidentialité
              </NavLink>
              {isAdminImagesLinkVisible ? (
                <NavLink to="/admin/images" data-testid="topbar-more-link-admin-images" onClick={() => setIsMoreOpen(false)}>
                  Images admin
                </NavLink>
              ) : null}
              <NavLink to="/account" data-testid="topbar-more-link-account" onClick={() => setIsMoreOpen(false)}>
                Compte
              </NavLink>
            </nav>
          </section>
        </div>
      ) : null}

      <main className={`content${isLandingPage ? ' content--landing' : ''}`}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route
            path="/rules"
            element={
              <Suspense fallback={routeFallback}>
                <RulesPage />
              </Suspense>
            }
          />
          <Route
            path="/story"
            element={
              <Suspense fallback={routeFallback}>
                <StoryMapSelectPage />
              </Suspense>
            }
          />
          <Route
            path="/story/:chapterId/:mapId"
            element={
              <Suspense fallback={routeFallback}>
                <StoryPage />
              </Suspense>
            }
          />
          <Route
            path="/story/:storyId"
            element={
              <Suspense fallback={routeFallback}>
                <StoryPage />
              </Suspense>
            }
          />
          <Route
            path="/decks"
            element={
              <Suspense fallback={routeFallback}>
                <DecksPage />
              </Suspense>
            }
          />
          <Route path="/setup" element={<SetupPage />} />
          <Route
            path="/shop"
            element={
              <Suspense fallback={routeFallback}>
                <ShopPage />
              </Suspense>
            }
          />
          <Route
            path="/packs"
            element={
              <Suspense fallback={routeFallback}>
                <PacksPage />
              </Suspense>
            }
          />
          <Route
            path="/match"
            element={
              <Suspense fallback={routeFallback}>
                <MatchPage />
              </Suspense>
            }
          />
          <Route
            path="/results"
            element={
              <Suspense fallback={routeFallback}>
                <ResultsPage />
              </Suspense>
            }
          />
          <Route
            path="/pokedex"
            element={
              <Suspense fallback={routeFallback}>
                <CollectionPage />
              </Suspense>
            }
          />
          <Route path="/collection" element={<Navigate to="/pokedex" replace />} />
          <Route
            path="/achievements"
            element={
              <Suspense fallback={routeFallback}>
                <AchievementsPage />
              </Suspense>
            }
          />
          <Route
            path="/missions"
            element={
              <Suspense fallback={routeFallback}>
                <MissionsPage />
              </Suspense>
            }
          />
          <Route
            path="/ranks"
            element={
              <Suspense fallback={routeFallback}>
                <RanksPage />
              </Suspense>
            }
          />
          <Route
            path="/changelogs"
            element={
              <Suspense fallback={routeFallback}>
                <ChangelogsPage />
              </Suspense>
            }
          />
          <Route
            path="/legal"
            element={
              <Suspense fallback={routeFallback}>
                <LegalIpPage />
              </Suspense>
            }
          />
          <Route
            path="/privacy"
            element={
              <Suspense fallback={routeFallback}>
                <PrivacyPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/images"
            element={
              isAdminImagesLinkVisible ? (
                <Suspense fallback={routeFallback}>
                  <AdminImagesPage />
                </Suspense>
              ) : (
                <Navigate to="/home" replace />
              )
            }
          />
          <Route
            path="/account"
            element={
              <Suspense fallback={routeFallback}>
                <AccountPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isLandingPage ? (
      <nav className="mobile-main-nav" data-testid="mobile-main-nav" aria-label="Navigation mobile principale">
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
          Boutique
        </NavLink>
        <NavLink to="/packs" className="mobile-main-nav__item">
          <img className="mobile-main-nav__icon" src={TOPBAR_ICON_PATHS.packs} alt="" aria-hidden="true" />
          Packs
        </NavLink>
        <NavLink to="/account" className="mobile-main-nav__item">
          <img className="mobile-main-nav__icon" src={TOPBAR_ICON_PATHS.account} alt="" aria-hidden="true" />
          Compte
        </NavLink>
        <button
          type="button"
          className="mobile-main-nav__item mobile-main-nav__item--more"
          data-testid="mobile-main-nav-more-toggle"
          onClick={() => setIsMoreOpen(true)}
        >
          <img className="mobile-main-nav__icon" src={TOPBAR_ICON_PATHS.more} alt="" aria-hidden="true" />
          Plus
        </button>
      </nav>
      ) : null}

      {!isLandingPage ? (
      <button
        type="button"
        className="background-mode-toggle"
        data-testid="background-mode-toggle"
        aria-label="Changer le mode de fond"
        onClick={() => setBackgroundMode((mode) => toggleBackgroundMode(mode))}
      >
        <span className="background-mode-toggle__icon" aria-hidden="true">
          {backgroundMode === 'dark' ? '☀' : '☾'}
        </span>
        <span className="background-mode-toggle__label">{backgroundMode === 'dark' ? 'Clair' : 'Sombre'}</span>
      </button>
      ) : null}
    </div>
  )
}

export default App

function isStoryMapPathname(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)
  if (segments[0] !== 'story') {
    return false
  }

  const mapId = segments.length === 2 ? segments[1] : segments.length === 3 ? segments[2] : null
  return mapId ? STORY_MAP_ROUTE_IDS.has(mapId as ReturnType<typeof listStoryMaps>[number]['id']) : false
}
