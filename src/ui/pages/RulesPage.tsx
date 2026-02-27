import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CardElementId } from '../../domain/types'
import { ELEMENT_EFFECT_ORDERED_IDS, getElementEffectText } from '../../domain/match/elementEffectsCatalog'
import { getElementLogoMeta } from '../components/elementLogos'

const elementRuleItems = ELEMENT_EFFECT_ORDERED_IDS.map((elementId) => ({
  id: elementId,
  effect: getElementEffectText(elementId),
})) satisfies ReadonlyArray<{ id: CardElementId; effect: string }>

type RulesTutorialMode = 'idle' | 'active' | 'completed'

export function RulesPage() {
  const [hoveredElementId, setHoveredElementId] = useState<CardElementId | null>(null)
  const [tutorialMode, setTutorialMode] = useState<RulesTutorialMode>('idle')
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0)

  const isTutorialActive = tutorialMode === 'active'
  const isTutorialCompleted = tutorialMode === 'completed'
  const tutorialRule = isTutorialActive ? elementRuleItems[tutorialStepIndex] ?? null : null
  const tutorialLogo = tutorialRule ? getElementLogoMeta(tutorialRule.id) : null

  const hoveredRule = hoveredElementId ? elementRuleItems.find((rule) => rule.id === hoveredElementId) ?? null : null
  const displayedRule = tutorialRule ?? hoveredRule
  const displayedLogo = displayedRule ? getElementLogoMeta(displayedRule.id) : null

  const totalTutorialSteps = elementRuleItems.length

  const resetTutorialToIdle = () => {
    setTutorialMode('idle')
    setTutorialStepIndex(0)
    setHoveredElementId(null)
  }

  const startTutorial = () => {
    setTutorialMode('active')
    setTutorialStepIndex(0)
    setHoveredElementId(null)
  }

  const advanceTutorial = () => {
    setTutorialStepIndex((currentIndex) => {
      const nextIndex = currentIndex + 1
      if (nextIndex >= totalTutorialSteps) {
        setTutorialMode('completed')
        return totalTutorialSteps - 1
      }
      return nextIndex
    })
  }

  return (
    <section className="panel">
      <h1>Rules</h1>
      <ul className="rule-copy">
        <li>
          <strong>Open:</strong> Both players can see each other's hands.
        </li>
        <li>
          <strong>Same:</strong> If your placed card matches two or more adjacent enemy sides exactly, those cards
          flip. Combo flips then continue with normal capture rules.
        </li>
        <li>
          <strong>Plus:</strong> If your placed card and adjacent enemy sides form equal sums on two or more sides,
          those cards flip. Combo flips then continue with normal capture rules.
        </li>
      </ul>

      <h2>Element effects</h2>
      <section className="rules-tutorial" aria-label="Tutoriel des effets de type">
        {isTutorialActive ? (
          <>
            <p className="rules-tutorial__title">Tutoriel en cours</p>
            <p className="rules-tutorial__meta" data-testid="rules-tutorial-progress">
              Etape {tutorialStepIndex + 1}/{totalTutorialSteps}
            </p>
            <p className="rules-tutorial__meta" data-testid="rules-tutorial-step-label">
              {tutorialLogo?.name ?? tutorialRule?.id ?? ''}
            </p>
            <p className="rules-tutorial__hint">Clique l icone surlignee pour continuer.</p>
            <div className="rules-tutorial__actions">
              <button type="button" className="button" onClick={advanceTutorial}>
                Passer
              </button>
              <button type="button" className="button" onClick={resetTutorialToIdle}>
                Quitter
              </button>
            </div>
          </>
        ) : isTutorialCompleted ? (
          <>
            <p className="rules-tutorial__title" data-testid="rules-tutorial-status">
              Tutoriel termine.
            </p>
            <div className="rules-tutorial__actions">
              <button type="button" className="button" onClick={startTutorial}>
                Relancer
              </button>
            </div>
          </>
        ) : (
          <div className="rules-tutorial__actions">
            <button type="button" className="button" onClick={startTutorial}>
              Tutoriel
            </button>
          </div>
        )}
      </section>

      <div className={`rules-element-icons ${isTutorialActive ? 'is-tutorial-active' : ''}`} role="list" aria-label="Element effects icons">
        {elementRuleItems.map((rule) => {
          const logo = getElementLogoMeta(rule.id)
          const isCurrentTutorialIcon = isTutorialActive && tutorialRule?.id === rule.id
          const isLockedTutorialIcon = isTutorialActive && !isCurrentTutorialIcon
          const iconClassName = [
            'rules-element-icon',
            hoveredElementId === rule.id || isCurrentTutorialIcon ? 'is-active' : '',
            isCurrentTutorialIcon ? 'is-tutorial-current' : '',
            isLockedTutorialIcon ? 'is-tutorial-locked' : '',
          ]
            .filter((entry) => entry.length > 0)
            .join(' ')

          return (
            <button
              key={rule.id}
              type="button"
              role="listitem"
              className={iconClassName}
              aria-label={logo?.name ?? rule.id}
              data-testid={`rules-element-icon-${rule.id}`}
              disabled={isLockedTutorialIcon}
              onMouseEnter={() => {
                if (!isTutorialActive) {
                  setHoveredElementId(rule.id)
                }
              }}
              onMouseLeave={() => {
                if (!isTutorialActive) {
                  setHoveredElementId((current) => (current === rule.id ? null : current))
                }
              }}
              onFocus={() => {
                if (!isTutorialActive) {
                  setHoveredElementId(rule.id)
                }
              }}
              onBlur={() => {
                if (!isTutorialActive) {
                  setHoveredElementId((current) => (current === rule.id ? null : current))
                }
              }}
              onClick={() => {
                if (isTutorialActive) {
                  if (!isCurrentTutorialIcon) {
                    return
                  }
                  advanceTutorial()
                  return
                }
                setHoveredElementId(rule.id)
              }}
            >
              {logo ? (
                <img src={logo.imageSrc} alt="" className="rules-element-icon__image" width={84} height={84} aria-hidden="true" />
              ) : null}
            </button>
          )
        })}
      </div>
      <p className={`rules-element-effect ${displayedRule ? 'is-visible' : ''}`} data-testid="rules-element-effect">
        {displayedRule && displayedLogo ? `${displayedLogo.name}: ${displayedRule.effect}` : 'Survole une icone pour voir l effet.'}
      </p>

      <div className="actions">
        <Link className="button button-primary" to="/setup">
          Go to Match Setup
        </Link>
        <Link className="button" to="/">
          Home
        </Link>
      </div>
    </section>
  )
}
