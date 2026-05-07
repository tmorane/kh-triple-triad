import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'bun:test'
import { MemoryRouter } from 'react-router-dom'
import { PrivacyPage } from './PrivacyPage'

describe('PrivacyPage', () => {
  test('renders key policy sections', () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Politique de Confidentialite' })).toBeInTheDocument()
    expect(screen.getByTestId('privacy-local-data')).toHaveTextContent('Aucune adresse email')
    expect(screen.getByTestId('privacy-profile-data')).toBeInTheDocument()
    expect(screen.getByTestId('privacy-third-parties')).toBeInTheDocument()
    expect(screen.getByTestId('privacy-rights')).toBeInTheDocument()
  })
})
