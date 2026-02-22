// Polyfill crypto.randomUUID for jsdom environment (used by session-store)
if (typeof globalThis.crypto === 'undefined') {
  // @ts-expect-error minimal polyfill
  globalThis.crypto = {}
}
if (typeof globalThis.crypto.randomUUID !== 'function') {
  let counter = 0
  globalThis.crypto.randomUUID = () => {
    counter++
    return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}` as `${string}-${string}-${string}-${string}-${string}`
  }
}
