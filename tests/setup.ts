import { afterEach } from 'vitest'

type Waiting = { callback: (lock: object) => Promise<unknown> | unknown }
const queues = new Map<string, Waiting[]>()
const held = new Set<string>()

const runNext = (name: string) => {
  if (held.has(name)) return
  const next = queues.get(name)?.shift()
  if (!next) return
  held.add(name)
  Promise.resolve(next.callback({ name, mode: 'exclusive' })).finally(() => {
    held.delete(name)
    runNext(name)
  })
}

Object.defineProperty(navigator, 'locks', {
  configurable: true,
  value: {
    request: (name: string, _options: object, callback: Waiting['callback']) => {
      let resolveRequest!: () => void
      const done = new Promise<void>(resolve => { resolveRequest = resolve })
      const wrapped = async (lock: object) => { try { await callback(lock) } finally { resolveRequest() } }
      const queue = queues.get(name) ?? []
      queue.push({ callback: wrapped })
      queues.set(name, queue)
      runNext(name)
      return done
    },
  },
})

afterEach(() => {
  queues.clear()
  held.clear()
})
