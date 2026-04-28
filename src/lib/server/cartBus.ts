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
