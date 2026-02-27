import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { RulesPage } from './RulesPage'

function renderRulesPage() {
  return render(
    <MemoryRouter>
      <RulesPage />
    </MemoryRouter>,
  )
}

describe('RulesPage', () => {
  test('shows core Open/Same/Plus rules and element effects via icon hover', async () => {
    renderRulesPage()
    const user = userEvent.setup()

    expect(screen.getByRole('heading', { name: 'Rules' })).toBeInTheDocument()
    expect(screen.getByText('Open:')).toBeInTheDocument()
    expect(screen.getByText('Same:')).toBeInTheDocument()
    expect(screen.getByText('Plus:')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Element effects' })).toBeInTheDocument()

    const feuIcon = screen.getByTestId('rules-element-icon-feu')
    const eauIcon = screen.getByTestId('rules-element-icon-eau')
    const dragonIcon = screen.getByTestId('rules-element-icon-dragon')
    expect(feuIcon).toBeInTheDocument()
    expect(eauIcon).toBeInTheDocument()
    expect(dragonIcon).toBeInTheDocument()

    const effectText = screen.getByTestId('rules-element-effect')
    expect(effectText).toHaveTextContent('Survole une icone pour voir l effet.')

    await user.hover(feuIcon)
    expect(effectText).toHaveTextContent('Feu:')
    expect(effectText).toHaveTextContent('Brulure 2 tours')

    await user.hover(eauIcon)
    expect(effectText).toHaveTextContent('Eau:')
    expect(effectText).toHaveTextContent('inonde une case vide')

    await user.unhover(eauIcon)
    expect(effectText).toHaveTextContent('Survole une icone pour voir l effet.')
  })

  test('starts strict tutorial and locks non-current icons', async () => {
    renderRulesPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Tutoriel' }))

    expect(screen.getByTestId('rules-tutorial-progress')).toHaveTextContent('Etape 1/15')
    expect(screen.getByTestId('rules-tutorial-step-label')).toHaveTextContent('Normal')

    const normalIcon = screen.getByTestId('rules-element-icon-normal')
    const feuIcon = screen.getByTestId('rules-element-icon-feu')
    expect(normalIcon).toBeEnabled()
    expect(feuIcon).toBeDisabled()

    const effectText = screen.getByTestId('rules-element-effect')
    expect(effectText).toHaveTextContent('Normal:')
    expect(effectText).toHaveTextContent('Mode normal')
  })

  test('advances only on current icon click and passer advances the tutorial', async () => {
    renderRulesPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Tutoriel' }))

    const progress = screen.getByTestId('rules-tutorial-progress')
    const normalIcon = screen.getByTestId('rules-element-icon-normal')
    const feuIcon = screen.getByTestId('rules-element-icon-feu')

    await user.click(feuIcon)
    expect(progress).toHaveTextContent('Etape 1/15')

    await user.click(normalIcon)
    expect(progress).toHaveTextContent('Etape 2/15')
    expect(screen.getByTestId('rules-tutorial-step-label')).toHaveTextContent('Feu')

    await user.click(screen.getByRole('button', { name: 'Passer' }))
    expect(progress).toHaveTextContent('Etape 3/15')
    expect(screen.getByTestId('rules-tutorial-step-label')).toHaveTextContent('Eau')
  })

  test('quitter exits tutorial and restores idle effect behavior', async () => {
    renderRulesPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Tutoriel' }))
    await user.click(screen.getByTestId('rules-element-icon-normal'))
    expect(screen.getByTestId('rules-tutorial-progress')).toHaveTextContent('Etape 2/15')

    await user.click(screen.getByRole('button', { name: 'Quitter' }))

    expect(screen.queryByTestId('rules-tutorial-progress')).not.toBeInTheDocument()
    expect(screen.getByTestId('rules-element-effect')).toHaveTextContent('Survole une icone pour voir l effet.')
    expect(screen.getByTestId('rules-element-icon-feu')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Tutoriel' })).toBeInTheDocument()
  })

  test('completes tutorial and allows restarting', async () => {
    renderRulesPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Tutoriel' }))

    for (let index = 0; index < 15; index += 1) {
      await user.click(screen.getByRole('button', { name: 'Passer' }))
    }

    expect(screen.getByTestId('rules-tutorial-status')).toHaveTextContent('Tutoriel termine')
    expect(screen.queryByTestId('rules-tutorial-progress')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Relancer' }))
    expect(screen.getByTestId('rules-tutorial-progress')).toHaveTextContent('Etape 1/15')
    expect(screen.getByTestId('rules-tutorial-step-label')).toHaveTextContent('Normal')
  })
})
