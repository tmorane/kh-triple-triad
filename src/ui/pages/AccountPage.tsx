import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../../app/useGame'
import {
  getCloudSessionUser,
  isCloudAuthEnabled,
  onCloudAuthStateChange,
  signInCloud,
  signOutCloud,
  signUpCloud,
  type CloudSessionUser,
} from '../../app/cloud/cloudAuth'
import { fetchCloudProfile, saveCloudProfile } from '../../app/cloud/cloudProfileStore'
import { cardPool } from '../../domain/cards/cardPool'
import { getDeckForMode } from '../../domain/cards/decks'
import { getModeSpec } from '../../domain/match/modeSpec'
import { achievementCatalog } from '../../domain/progression/achievements'
import { resolveProfileForCloudSession } from '../../app/cloud/resolveCloudProfile'
import { saveProfile } from '../../domain/progression/profile'
import type { RankedTierId } from '../../domain/types'

const GOLD_MILESTONES = [150, 200, 300, 450, 600, 800, 1000]
const numberFormat = new Intl.NumberFormat('en-US')

const tierNames: Record<RankedTierId, string> = {
  iron: 'Iron',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  emerald: 'Emerald',
  diamond: 'Diamond',
  master: 'Master',
  grandmaster: 'Grandmaster',
  challenger: 'Challenger',
}

interface DetailedMetric {
  icon: string
  label: string
  value: string
  sub: string
  progress?: number
}

function isEmailValid(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email)
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function formatTierLabel(tier: RankedTierId, division: string | null): string {
  const tierLabel = tierNames[tier]
  if (division) {
    return `${tierLabel} ${division}`
  }
  return tierLabel
}

export function AccountPage() {
  const { profile, storedProfiles, renamePlayer, setAudioEnabled, createStoredProfile, switchStoredProfile, deleteStoredProfile, resetProfile } = useGame()
  const cloudEnabled = isCloudAuthEnabled()

  const [sessionUser, setSessionUser] = useState<CloudSessionUser | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoadingSession, setIsLoadingSession] = useState(cloudEnabled)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [playerNameDraft, setPlayerNameDraft] = useState(profile.playerName)
  const [playerNameError, setPlayerNameError] = useState<string | null>(null)
  const [newProfileName, setNewProfileName] = useState('')
  const [profilesError, setProfilesError] = useState<string | null>(null)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)

  const selectedDeck = profile.deckSlots.find((slot) => slot.id === profile.selectedDeckSlotId) ?? profile.deckSlots[0]
  const activeDeckMode = selectedDeck.mode
  const activeDeckMaxSize = getModeSpec(activeDeckMode).deckSize
  const activeDeckCount = getDeckForMode(selectedDeck, activeDeckMode).length
  const ownedCards = profile.ownedCardIds.length
  const totalCards = cardPool.length
  const unlockedAchievements = profile.achievements.length
  const totalAchievements = achievementCatalog.length
  const played = profile.stats.played
  const wins = profile.stats.won
  const losses = Math.max(played - wins, 0)
  const ranked3x3 = profile.rankedByMode['3x3']
  const ranked4x4 = profile.rankedByMode['4x4']
  const rankedTierLabel3x3 = formatTierLabel(ranked3x3.tier, ranked3x3.division)
  const rankedTierLabel4x4 = formatTierLabel(ranked4x4.tier, ranked4x4.division)
  const rankedRecordLabel3x3 = `${ranked3x3.wins}W ${ranked3x3.losses}L ${ranked3x3.draws}D`
  const rankedRecordLabel4x4 = `${ranked4x4.wins}W ${ranked4x4.losses}L ${ranked4x4.draws}D`
  const nextGoldTarget = GOLD_MILESTONES.find((milestone) => profile.gold < milestone) ?? null

  useEffect(() => {
    setPlayerNameDraft(profile.playerName)
    setPlayerNameError(null)
  }, [profile.playerName])

  const detailedMetrics = useMemo<DetailedMetric[]>(
    () => [
      {
        icon: '3',
        label: '3X3 Ranked Tier',
        value: rankedTierLabel3x3,
        sub: `${ranked3x3.lp} LP`,
        progress: ranked3x3.lp,
      },
      {
        icon: '4',
        label: '4X4 Ranked Tier',
        value: rankedTierLabel4x4,
        sub: `${ranked4x4.lp} LP`,
        progress: ranked4x4.lp,
      },
      {
        icon: 'G',
        label: 'Gold Reserve',
        value: numberFormat.format(profile.gold),
        sub: nextGoldTarget ? `${numberFormat.format(nextGoldTarget - profile.gold)} to next tier` : 'Top treasury tier reached',
        progress: nextGoldTarget ? clampPercent(Math.round((profile.gold / nextGoldTarget) * 100)) : 100,
      },
      {
        icon: 'C',
        label: 'Pokédex',
        value: `${ownedCards}/${totalCards}`,
        sub: `${clampPercent(Math.round((ownedCards / totalCards) * 100))}% complete`,
        progress: clampPercent(Math.round((ownedCards / totalCards) * 100)),
      },
      {
        icon: 'A',
        label: 'Achievements',
        value: `${unlockedAchievements}/${totalAchievements}`,
        sub: `${clampPercent(Math.round((unlockedAchievements / totalAchievements) * 100))}% unlocked`,
        progress: clampPercent(Math.round((unlockedAchievements / totalAchievements) * 100)),
      },
      {
        icon: 'D',
        label: selectedDeck.name,
        value: `${activeDeckCount}/${activeDeckMaxSize}`,
        sub: 'Active deck slots filled',
        progress: clampPercent(Math.round((activeDeckCount / activeDeckMaxSize) * 100)),
      },
      {
        icon: 'S',
        label: 'Current Streak',
        value: `${profile.stats.streak}`,
        sub: `Best streak: ${profile.stats.bestStreak}`,
      },
      {
        icon: 'B',
        label: '3X3 Ranked Record',
        value: rankedRecordLabel3x3,
        sub: `${ranked3x3.matchesPlayed} ranked matches`,
      },
      {
        icon: 'R',
        label: '4X4 Ranked Record',
        value: rankedRecordLabel4x4,
        sub: `${ranked4x4.matchesPlayed} ranked matches`,
      },
      {
        icon: 'M',
        label: 'Battle Record',
        value: `${wins}W / ${losses}L`,
        sub: `${played} matches played`,
      },
    ],
    [
      rankedTierLabel3x3,
      rankedTierLabel4x4,
      ranked3x3.lp,
      ranked4x4.lp,
      profile.gold,
      nextGoldTarget,
      ownedCards,
      totalCards,
      unlockedAchievements,
      totalAchievements,
      selectedDeck.name,
      activeDeckCount,
      activeDeckMaxSize,
      profile.stats.streak,
      profile.stats.bestStreak,
      rankedRecordLabel3x3,
      rankedRecordLabel4x4,
      ranked3x3.matchesPlayed,
      ranked4x4.matchesPlayed,
      wins,
      losses,
      played,
    ],
  )

  useEffect(() => {
    if (!cloudEnabled) {
      setIsLoadingSession(false)
      return
    }

    let mounted = true

    const loadSession = async () => {
      try {
        const user = await getCloudSessionUser()
        if (!mounted) {
          return
        }
        setSessionUser(user)
      } catch (loadError) {
        if (!mounted) {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to load cloud session.')
      } finally {
        if (mounted) {
          setIsLoadingSession(false)
        }
      }
    }

    void loadSession()

    const unsubscribe = onCloudAuthStateChange((nextUser) => {
      setSessionUser(nextUser)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [cloudEnabled])

  const submitPlayerName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = renamePlayer(playerNameDraft)
    if (!result.valid) {
      setPlayerNameError(result.reason ?? 'Invalid player name.')
      return
    }

    setPlayerNameError(null)
  }

  const submitNewProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = createStoredProfile(newProfileName)
    if (!result.valid) {
      setProfilesError(result.reason ?? 'Invalid profile name.')
      return
    }

    setProfilesError(null)
    setNewProfileName('')
  }

  const resolveCloudProfileAfterAuth = async (user: CloudSessionUser) => {
    const cloudProfile = await fetchCloudProfile(user.id)
    const resolved = resolveProfileForCloudSession(profile, cloudProfile)

    if (resolved.shouldUploadLocal) {
      await saveCloudProfile(user.id, resolved.profile)
      setInfo('No cloud profile was found. Local profile uploaded.')
      return
    }

    saveProfile(resolved.profile)
    setInfo('Cloud profile downloaded. Click "Reload App" to apply it now.')
  }

  const submitSignIn = async () => {
    if (!isEmailValid(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.')
      return
    }

    setError(null)
    setInfo(null)
    setIsBusy(true)

    try {
      const user = await signInCloud(email.trim(), password)
      setSessionUser(user)
      await resolveCloudProfileAfterAuth(user)
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Sign-in failed.')
    } finally {
      setIsBusy(false)
    }
  }

  const submitSignUp = async () => {
    if (!isEmailValid(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.')
      return
    }

    setError(null)
    setInfo(null)
    setIsBusy(true)

    try {
      await signUpCloud(email.trim(), password)
      const currentUser = await getCloudSessionUser()
      if (!currentUser) {
        setSessionUser(null)
        setInfo('Account created. Confirm your email, then sign in.')
        return
      }

      setSessionUser(currentUser)
      await resolveCloudProfileAfterAuth(currentUser)
      setInfo('Account created and signed in.')
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Sign-up failed.')
    } finally {
      setIsBusy(false)
    }
  }

  const uploadLocalProfile = async () => {
    if (!sessionUser) {
      return
    }

    setError(null)
    setInfo(null)
    setIsBusy(true)
    try {
      await saveCloudProfile(sessionUser.id, profile)
      setInfo('Local profile uploaded.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Upload failed.')
    } finally {
      setIsBusy(false)
    }
  }

  const downloadCloudProfile = async () => {
    if (!sessionUser) {
      return
    }

    setError(null)
    setInfo(null)
    setIsBusy(true)
    try {
      const cloudProfile = await fetchCloudProfile(sessionUser.id)
      if (!cloudProfile) {
        setInfo('No cloud profile found for this account.')
        return
      }
      saveProfile(cloudProfile)
      setInfo('Cloud profile downloaded. Click "Reload App" to apply it now.')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Download failed.')
    } finally {
      setIsBusy(false)
    }
  }

  const disconnectCloudAccount = async () => {
    setError(null)
    setInfo(null)
    setIsBusy(true)
    try {
      await signOutCloud()
      setSessionUser(null)
      setInfo('Signed out.')
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Sign-out failed.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className="panel account-panel">
      <h1>Account</h1>
      <section className="account-section" data-testid="account-local-profile-section">
        <h2>Local Profile</h2>
        <form className="account-local-form" onSubmit={submitPlayerName}>
          <label className="account-label" htmlFor="account-player-name-input">
            Player Name
            <input
              id="account-player-name-input"
              data-testid="account-player-name-input"
              type="text"
              value={playerNameDraft}
              onChange={(event) => setPlayerNameDraft(event.target.value)}
            />
          </label>
          <button type="submit" className="button" data-testid="account-player-name-submit">
            Save Name
          </button>
        </form>
        {playerNameError ? (
          <p className="error" role="alert">
            {playerNameError}
          </p>
        ) : null}
        <div className="account-local-form">
          <p className="small" data-testid="account-audio-state">
            Sound effects are currently {profile.settings.audioEnabled ? 'ON.' : 'OFF.'}
          </p>
          <button
            type="button"
            className="button"
            onClick={() => setAudioEnabled(!profile.settings.audioEnabled)}
            data-testid="account-audio-toggle"
          >
            {profile.settings.audioEnabled ? 'Turn sound OFF' : 'Turn sound ON'}
          </button>
        </div>
      </section>

      <section className="account-section">
        <h2>Detailed Stats</h2>
        <div className="account-metrics-grid">
          {detailedMetrics.map((metric) => (
            <article key={metric.label} className="home-metric-card">
              <p className="home-metric-label">
                <span className="home-metric-icon" aria-hidden="true">
                  {metric.icon}
                </span>
                {metric.label}
              </p>
              <p className="home-metric-value">{metric.value}</p>
              <p className="home-metric-sub">{metric.sub}</p>
              {metric.progress !== undefined ? (
                <div className="home-meter" aria-hidden="true">
                  <span style={{ width: `${metric.progress}%` }} />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="account-section account-profiles-block" data-testid="account-profiles-block">
        <div className="account-section-head">
          <h2>Tester Profiles</h2>
          <p className="small">{storedProfiles.profiles.length} total</p>
        </div>

        <div className="account-profiles-list">
          {storedProfiles.profiles.map((storedProfile) => {
            const profileLosses = Math.max(storedProfile.played - storedProfile.wins, 0)
            return (
              <article
                key={storedProfile.id}
                className={`home-profile-card${storedProfile.isActive ? ' home-profile-card--active' : ''}`}
              >
                <div className="home-profile-card__copy">
                  <p className="home-profile-card__name">{storedProfile.playerName}</p>
                  <p className="small">
                    {storedProfile.wins}W / {profileLosses}L · {numberFormat.format(storedProfile.gold)} gold
                  </p>
                </div>

                <div className="home-profile-card__actions">
                  {storedProfile.isActive ? (
                    <span className="home-profile-card__active">Active</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="button"
                        onClick={() => {
                          switchStoredProfile(storedProfile.id)
                          setProfilesError(null)
                        }}
                      >
                        Switch
                      </button>
                      <button
                        type="button"
                        className="button button-danger"
                        onClick={() => {
                          const result = deleteStoredProfile(storedProfile.id)
                          if (!result.valid) {
                            setProfilesError(result.reason ?? 'Unable to delete profile.')
                            return
                          }
                          setProfilesError(null)
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <form className="account-profile-create" onSubmit={submitNewProfile}>
          <input
            type="text"
            value={newProfileName}
            onChange={(event) => setNewProfileName(event.target.value)}
            placeholder="New tester name"
            aria-label="New Tester Name"
            data-testid="account-profile-create-input"
          />
          <button type="submit" className="button" data-testid="account-profile-create-submit">
            Add profile
          </button>
        </form>

        {profilesError ? (
          <p className="error" role="alert">
            {profilesError}
          </p>
        ) : null}
      </section>

      <section className="account-section" data-testid="account-cloud-section">
        <h2>Cloud Account</h2>
        <p className="small">Connect with email/password to sync a real cross-device profile.</p>

        {cloudEnabled ? (
          <>
            {isLoadingSession ? <p className="small">Loading cloud session...</p> : null}

            {!isLoadingSession && !sessionUser ? (
              <div className="account-auth-grid">
                <label className="account-label">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    disabled={isBusy}
                  />
                </label>

                <label className="account-label">
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    disabled={isBusy}
                  />
                </label>

                <div className="account-actions">
                  <button type="button" className="button button-primary" onClick={submitSignIn} disabled={isBusy}>
                    Sign In
                  </button>
                  <button type="button" className="button" onClick={submitSignUp} disabled={isBusy}>
                    Sign Up
                  </button>
                </div>
              </div>
            ) : null}

            {!isLoadingSession && sessionUser ? (
              <div className="account-connected">
                <p data-testid="account-connected-email">
                  Connected as {sessionUser.email ?? 'unknown'}
                </p>
                <div className="account-actions">
                  <button type="button" className="button button-primary" onClick={uploadLocalProfile} disabled={isBusy}>
                    Upload Local Profile
                  </button>
                  <button type="button" className="button" onClick={downloadCloudProfile} disabled={isBusy}>
                    Download Cloud Profile
                  </button>
                  <button type="button" className="button" onClick={disconnectCloudAccount} disabled={isBusy}>
                    Sign Out
                  </button>
                  <button
                    type="button"
                    className="button"
                    onClick={() => window.location.reload()}
                    disabled={isBusy}
                  >
                    Reload App
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="small" data-testid="account-cloud-disabled-note">Cloud auth is disabled for this app build.</p>
        )}
      </section>

      <section className="account-section account-danger-zone" data-testid="account-danger-zone">
        <h2>Danger Zone</h2>
        <p className="small">This resets your game profile data. This action cannot be undone.</p>
        <button
          type="button"
          className="button button-danger"
          data-testid="account-reset-trigger"
          onClick={() => setIsResetConfirmOpen(true)}
        >
          Reset Profile Data
        </button>
        {isResetConfirmOpen ? (
          <div className="account-danger-confirm">
            <button
              type="button"
              className="button button-danger"
              data-testid="account-reset-confirm"
              onClick={() => {
                resetProfile()
                setIsResetConfirmOpen(false)
              }}
            >
              Confirm Reset
            </button>
            <button
              type="button"
              className="button"
              data-testid="account-reset-cancel"
              onClick={() => setIsResetConfirmOpen(false)}
            >
              Cancel
            </button>
          </div>
        ) : null}
      </section>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {info ? <p className="small">{info}</p> : null}
    </section>
  )
}
