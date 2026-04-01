import { beforeEach, describe, expect, it } from 'vitest'

import App from '@/App'
import i18n from '@/i18n'
import { renderWithProviders } from '@/test/test-utils'
import { screen } from '@testing-library/react'

describe('App', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders translated seller workspace title', () => {
    renderWithProviders(<App />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Seller workspace' }),
    ).toBeInTheDocument()
  })

  it('shows translated welcome message', () => {
    renderWithProviders(<App />)
    expect(
      screen.getByText(
        'Optimize costs and sales across Wildberries and Ozon.',
      ),
    ).toBeInTheDocument()
  })
})
