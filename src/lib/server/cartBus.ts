type Sender = (event: string, data: string) => void;

interface Subscriber {
  id: string;
  clientId: string;
  send: Sender;
}

const subscribers = new Map<number, Set<Subscriber>>();

export function subscribe(tableNumber: number, clientId: string, send: Sender): () => void {
  const sub: Subscriber = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    clientId,
    send,
  };
  let set = subscribers.get(tableNumber);
  if (!set) {
    set = new Set();
    subscribers.set(tableNumber, set);
  }
  set.add(sub);

  return () => {
    const current = subscribers.get(tableNumber);
    if (!current) return;
    current.delete(sub);
    if (current.size === 0) subscribers.delete(tableNumber);
  };
}

export function isClientConnected(tableNumber: number, clientId: string): boolean {
  const set = subscribers.get(tableNumber);
  if (!set) return false;
  for (const s of set) {
    if (s.clientId === clientId) return true;
  }
  return false;
}

/**
 * Returns the clientId of the longest-present still-connected subscriber for
 * the table (a Set preserves insertion order, so the first entry is the oldest),
 * or null if no one is connected. Used to promote a successor host when the
 * current host disconnects. Pass `exclude` to skip a clientId (e.g. the one that
 * is mid-cleanup but not yet unsubscribed).
 */
export function getOldestClientId(tableNumber: number, exclude?: string): string | null {
  const set = subscribers.get(tableNumber);
  if (!set) return null;
  for (const s of set) {
    if (s.clientId !== exclude) return s.clientId;
  }
  return null;
}

export function broadcast(tableNumber: number, event: string, data: string): void {
  const set = subscribers.get(tableNumber);
  if (!set) return;
  for (const s of set) {
    try {
      s.send(event, data);
    } catch {
      // controller closed; cleanup happens when stream cancels
    }
  }
}
