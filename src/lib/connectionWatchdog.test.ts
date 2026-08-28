import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SILENCE_MS, createConnectionWatchdog } from './connectionWatchdog'

/** The watchdog holds no timers of its own; a microtask flush is enough. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function setup(options: { alive?: boolean | (() => Promise<boolean>) } = {}) {
  let clock = 1_000_000
  let visible = true
  const probe = vi.fn(() =>
    typeof options.alive === 'function'
      ? options.alive()
      : Promise.resolve(options.alive ?? true),
  )
  const cycle = vi.fn(() => Promise.resolve())
  const watchdog = createConnectionWatchdog({
    probe,
    cycle,
    now: () => clock,
    isVisible: () => visible,
  })
  return {
    probe,
    cycle,
    watchdog,
    advance: (ms: number) => {
      clock += ms
    },
    hide: () => {
      visible = false
    },
  }
}

describe('createConnectionWatchdog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('stays quiet while snapshots are still arriving', async () => {
    const { probe, watchdog, advance } = setup()

    advance(SILENCE_MS - 1)
    watchdog.check()
    await flush()

    expect(probe).not.toHaveBeenCalled()
  })

  it('probes once the transport has been silent for the whole window', async () => {
    const { probe, cycle, watchdog, advance } = setup({ alive: true })

    advance(SILENCE_MS)
    watchdog.check()
    await flush()

    expect(probe).toHaveBeenCalledTimes(1)
    expect(cycle).not.toHaveBeenCalled()
  })

  it('cycles the network when the probe never answers', async () => {
    const { cycle, watchdog, advance } = setup({ alive: false })

    advance(SILENCE_MS)
    watchdog.check()
    await flush()

    expect(cycle).toHaveBeenCalledTimes(1)
  })

  it('leaves a hidden tab alone', async () => {
    const { probe, watchdog, advance, hide } = setup()

    hide()
    advance(SILENCE_MS * 4)
    watchdog.check()
    await flush()

    expect(probe).not.toHaveBeenCalled()
  })

  it('probes straight away when told to ignore the silence window', async () => {
    const { probe, watchdog } = setup({ alive: true })

    watchdog.check({ ignoreSilence: true })
    await flush()

    expect(probe).toHaveBeenCalledTimes(1)
  })

  it('runs one probe at a time', async () => {
    let release: (alive: boolean) => void = () => {}
    const pending = new Promise<boolean>((resolve) => {
      release = resolve
    })
    const { probe, watchdog } = setup({ alive: () => pending })

    watchdog.check({ ignoreSilence: true })
    watchdog.check({ ignoreSilence: true })
    await flush()

    expect(probe).toHaveBeenCalledTimes(1)

    release(true)
    await flush()

    watchdog.check({ ignoreSilence: true })
    await flush()
    expect(probe).toHaveBeenCalledTimes(2)
  })

  it('waits a full window after a probe before spending another read', async () => {
    const { probe, watchdog, advance } = setup({ alive: false })

    advance(SILENCE_MS)
    watchdog.check()
    await flush()
    expect(probe).toHaveBeenCalledTimes(1)

    advance(SILENCE_MS - 1)
    watchdog.check()
    await flush()
    expect(probe).toHaveBeenCalledTimes(1)

    advance(1)
    watchdog.check()
    await flush()
    expect(probe).toHaveBeenCalledTimes(2)
  })

  it('takes a snapshot as proof of life', async () => {
    const { probe, watchdog, advance } = setup()

    advance(SILENCE_MS - 1)
    watchdog.noteActivity()
    advance(SILENCE_MS - 1)
    watchdog.check()
    await flush()

    expect(probe).not.toHaveBeenCalled()
  })
})
