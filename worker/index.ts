import { BigTwos, GameSnapshot } from "../lib/game/bigtwos";

interface Member { pid: string; name: string; ready: boolean; }

export interface Env {
  GAME: DurableObjectNamespace;
}

// Worker entrypoint: route every connection to a single shared room DO.
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.headers.get("Upgrade") === "websocket") {
      const id = env.GAME.idFromName("main");
      return env.GAME.get(id).fetch(req);
    }
    return new Response("BigTwos realtime OK", { status: 200, headers: { "access-control-allow-origin": "*" } });
  }
};

export class GameRoom {
  game: BigTwos | null = null;
  members = new Map<WebSocket, Member>();
  endVotes = new Set<string>();
  constructor(private state: DurableObjectState) {}

  async fetch(_req: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    server.accept();
    server.addEventListener("message", e => this.onMessage(server, String(e.data)));
    server.addEventListener("close", () => this.onClose(server));
    this.sendLobby(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  onClose(ws: WebSocket) {
    const m = this.members.get(ws);
    if (m) this.endVotes.delete(m.pid);
    this.members.delete(ws);
    if (!this.game) this.broadcastLobby();
  }

  onMessage(ws: WebSocket, raw: string) {
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === "join") {
      this.members.set(ws, { pid: msg.pid, name: msg.name, ready: false });
      if (this.game) this.pushState(ws); else this.broadcastLobby();
    } else if (msg.type === "ready") {
      const m = this.members.get(ws); if (m) m.ready = !m.ready;
      const all = [...this.members.values()];
      if (all.length >= 2 && all.every(x => x.ready)) this.start(); else this.broadcastLobby();
    } else if (msg.type === "move" && this.game) {
      const m = this.members.get(ws); if (m) this.game.makeMove(m.pid, msg.cards, false); this.broadcastState();
    } else if (msg.type === "pass" && this.game) {
      const m = this.members.get(ws); if (m) this.game.makeMove(m.pid, [], true); this.broadcastState();
    } else if (msg.type === "endVote" && this.game) {
      const m = this.members.get(ws); if (m) this.endVotes.add(m.pid);
      if (this.endVotes.size * 2 > this.members.size) this.reset(); else this.broadcastState();
    } else if (msg.type === "restart") {
      this.reset();
    }
  }

  reset() {
    this.game = null; this.endVotes.clear();
    for (const m of this.members.values()) m.ready = false;
    this.broadcastLobby();
  }
  start() {
    this.endVotes.clear();
    this.game = new BigTwos([...this.members.values()].map(m => ({ pid: m.pid, name: m.name })));
    this.broadcastState();
  }
  conns() { return [...this.members.keys()]; }
  sendLobby(ws: WebSocket) {
    const me = this.members.get(ws);
    ws.send(JSON.stringify({ type: "lobby", youReady: !!me?.ready, players: [...this.members.values()].map(m => ({ name: m.name, ready: m.ready })) }));
  }
  broadcastLobby() { for (const c of this.conns()) this.sendLobby(c); }
  pushState(ws: WebSocket) {
    if (!this.game) return;
    const m = this.members.get(ws);
    const snap: GameSnapshot = this.game.snapshot();
    ws.send(JSON.stringify({ type: "state", snapshot: snap, hand: m ? this.game.playerCards(m.pid) : [], endVotes: this.endVotes.size, totalPlayers: this.members.size }));
  }
  broadcastState() { for (const c of this.conns()) this.pushState(c); }
}
