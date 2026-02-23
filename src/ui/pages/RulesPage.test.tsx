import { render, screen } from '@testing-library/react'
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
  test('shows synergy and missions effects in FAQ format', () => {
    renderRulesPage()

    expect(screen.getByRole('heading', { name: 'FAQ - Synergies & Missions' })).toBeInTheDocument()
    expect(screen.getByText('What does primary synergy do?')).toBeInTheDocument()
    expect(screen.getByText(/R1 Avant-garde/)).toBeInTheDocument()
    expect(screen.getByText(/R2 Coin Expert/)).toBeInTheDocument()
    expect(screen.getByText(/R7 Combo Bounty/)).toBeInTheDocument()
    expect(screen.getByText(/R8 Victoire Propre/)).toBeInTheDocument()
    expect(screen.getByText('What does secondary synergy do?')).toBeInTheDocument()
    expect(screen.getByText(/No gameplay impact/)).toBeInTheDocument()
    expect(screen.getByText(/R10 Mission Link/)).toBeInTheDocument()
  })
})
