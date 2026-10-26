import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  GATE_STORAGE_KEY,
  acceptGate,
  getGateStatus,
  getServerGateStatus,
  resetGateMemory,
  subscribeGate,
} from '@/lib/store/gate-store'

// ─── gate store ──────────────────────────────────────────────────────────────
//
// Node 24 has no `localStorage` global, so a test that stubs nothing is the "storage unavailable"
// case: referencing `localStorage` throws a ReferenceError the store must swallow. Other cases stub
// a small Map-backed fake via `vi.stubGlobal`. `resetGateMemory()` clears the module-level memory
// flag between tests so acceptance from one case never leaks into the next.

type FakeStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

function makeFakeStorage(initial: Record<string, string> = {}): FakeStorage & { data: Map<string, string> } {
  const data = new Map<string, string>(Object.entries(initial))
  return {
    data,
    getItem: (key) => (data.has(key) ? (data.get(key) as string) : null),
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
}

function makeThrowingStorage(): FakeStorage {
  return {
    getItem: () => {
      throw new Error('storage blocked')
    },
    setItem: () => {
      throw new Error('storage blocked')
    },
    removeItem: () => {
      throw new Error('storage blocked')
    },
  }
}

beforeEach(() => {
  vi.unstubAllGlobals()
  resetGateMemory()
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetGateMemory()
})

describe('gate store', () => {
  it('works with no storage at all: unaccepted, then accepted from memory, never throws', () => {
    expect(() => getGateStatus()).not.toThrow()
    expect(getGateStatus()).toBe('unaccepted')
    expect(() => acceptGate()).not.toThrow()
    expect(getGateStatus()).toBe('accepted')
  })

  it('writes "1" to storage and storage alone keeps it accepted after the memory flag is cleared', () => {
    const fake = makeFakeStorage()
    vi.stubGlobal('localStorage', fake)
    expect(getGateStatus()).toBe('unaccepted')
    acceptGate()
    expect(fake.data.get(GATE_STORAGE_KEY)).toBe('1')
    resetGateMemory()
    expect(getGateStatus()).toBe('accepted')
  })

  it('falls back to memory when getItem and setItem both throw', () => {
    vi.stubGlobal('localStorage', makeThrowingStorage())
    expect(getGateStatus()).toBe('unaccepted')
    expect(() => acceptGate()).not.toThrow()
    expect(getGateStatus()).toBe('accepted')
  })

  it.each(['0', '', 'true'])('stored value %j reads as unaccepted', (value) => {
    vi.stubGlobal('localStorage', makeFakeStorage({ [GATE_STORAGE_KEY]: value }))
    expect(getGateStatus()).toBe('unaccepted')
  })

  it('notifies a subscriber once per acceptGate and not after unsubscribing', () => {
    vi.stubGlobal('localStorage', makeFakeStorage())
    const listener = vi.fn()
    const unsubscribe = subscribeGate(listener)
    acceptGate()
    expect(listener).toHaveBeenCalledTimes(1)
    acceptGate()
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    acceptGate()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('server snapshot is "unknown" and the storage key is "unpause.gate.v1"', () => {
    expect(getServerGateStatus()).toBe('unknown')
    expect(GATE_STORAGE_KEY).toBe('unpause.gate.v1')
  })
})
