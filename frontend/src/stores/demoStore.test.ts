import { beforeEach, describe, expect, it } from 'vitest'

import { useDemoStore } from './demoStore'

describe('useDemoStore', () => {
  beforeEach(() => {
    useDemoStore.setState({ count: 0 })
  })

  it('increments count', () => {
    useDemoStore.getState().increment()
    expect(useDemoStore.getState().count).toBe(1)
  })
})
