let counter = 0

// Ids only need to be unique within one FilterState; the reducer guards against
// collisions with ids that came from elsewhere (persisted or hand-built state).
export function createId(): string {
  return `r${(counter++).toString(36)}`
}
