import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'bun:test'
import { ChangelogsPage } from './ChangelogsPage'
import { changelogEntries } from './changelogEntries'

function renderChangelogsPage() {
  return render(
    <MemoryRouter>
      <ChangelogsPage />
    </MemoryRouter>,
  )
}

describe('ChangelogsPage', () => {
  test('renders changelog heading and release count', () => {
    renderChangelogsPage()

    expect(screen.getByRole('heading', { name: 'Changelogs' })).toBeInTheDocument()
    expect(screen.getByTestId('changelogs-release-count')).toHaveTextContent(`${changelogEntries.length} versions publiees`)
  })

  test('renders infos, nouveautes and changements for latest release', () => {
    renderChangelogsPage()
    const latest = changelogEntries[0]
    const latestRelease = screen.getByTestId(`changelog-release-${latest.version}`)

    expect(screen.getByRole('heading', { name: latest.version })).toBeInTheDocument()
    expect(within(latestRelease).getByRole('heading', { name: 'Infos' })).toBeInTheDocument()
    expect(within(latestRelease).getByRole('heading', { name: 'Nouveautes' })).toBeInTheDocument()
    expect(within(latestRelease).getByRole('heading', { name: 'Changements' })).toBeInTheDocument()
    expect(within(latestRelease).getByText(latest.infos[0])).toBeInTheDocument()
    expect(within(latestRelease).getByText(latest.nouveautes[0])).toBeInTheDocument()
    expect(within(latestRelease).getByText(latest.changements[0])).toBeInTheDocument()
  })
})
