import { BigTwos, GameSnapshot, GameState } from "../lib/game/bigtwos";

interface Attach { pid: string; name: string; ready: boolean; }

export interface Env {
  GAME: DurableObjectNamespace;
}

// Worker entrypoint: route each connection to its room's Durable Object.
// Room comes from ?room= (defaults to "main"), so dev and prod never share a game.
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.headers.get("Upgrade") === "websocket") {
      const room = new URL(req.url).searchParams.get("room") || "main";
      const id = env.GAME.idFromName(room);
      return env.GAME.get(id).fetch(req);
    }
    return new Response("BigTwos realtime OK", { status: 200, headers: { "access-control-allow-origin": "*" } });
  }
};

export class GameRoom {
  game: BigTwos | null = null;
  endVotes = new Set<string>();

  constructor(private state: DurableObjectState) {
    this.state.blockConcurrencyWhile(async () => {
      const gs = await this.state.storage.get<GameState>("game");
      this.game = gs ? BigTwos.restore(gs) : null;
      const ev = await this.state.storage.get<string[]>("endVotes");
      this.endVotes = new Set(ev || []);
      // Keep hibernated sockets alive: auto-reply "pong" to "ping" without waking.
      this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
    });
  }

  async fetch(_req: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    this.state.acceptWebSocket(server); // hibernatable
    server.serializeAttachment({ pid: "", name: "", ready: false } as Attach);
    return new Response(null, { status: 101, webSocket: client });
  }

  members(): Map<WebSocket, Attach> {
    const m = new Map<WebSocket, Attach>();
    for (const ws of this.state.getWebSockets()) {
      const a = ws.deserializeAttachment() as Attach | null;
      if (a && a.pid) m.set(ws, a);
    }
    return m;
  }

  async webSocketMessage(ws: WebSocket, raw: string) {
    if (raw === "ping") return; // normally handled by auto-response
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === "join") {
      ws.serializeAttachment({ pid: msg.pid, name: msg.name, ready: false } as Attach);
      if (this.game) this.broadcastState(); // refresh everyone so observers list updates
      else this.broadcastLobby();
    } else if (msg.type === "ready") {
      const a = ws.deserializeAttachment() as Attach;
      ws.serializeAttachment({ ...a, ready: !a.ready });
      const all = [...this.members().values()];
      if (all.length >= 2 && all.every(x => x.ready)) await this.start();
      else this.broadcastLobby();
    } else if (msg.type === "move" && this.game) {
      const a = ws.deserializeAttachment() as Attach;
      if (a?.pid) this.game.makeMove(a.pid, msg.cards, false);
      await this.persist();
      this.broadcastState();
    } else if (msg.type === "pass" && this.game) {
      const a = ws.deserializeAttachment() as Attach;
      if (a?.pid) this.game.makeMove(a.pid, [], true);
      await this.persist();
      this.broadcastState();
    } else if (msg.type === "endVote" && this.game) {
      const a = ws.deserializeAttachment() as Attach;
      // Only count votes from actual players in the game, toggle so it can be undone.
      if (a?.pid && this.game.playerCards(a.pid) !== null) {
        if (this.endVotes.has(a.pid)) this.endVotes.delete(a.pid);
        else this.endVotes.add(a.pid);
      }
      await this.state.storage.put("endVotes", [...this.endVotes]);
      // Threshold is a majority of the GAME's players (fixed), not live connections,
      // so a disconnect can't lower the bar. 2 players => need both.
      const totalPlayers = this.game.snapshot().players.length;
      if (this.endVotes.size * 2 > totalPlayers) await this.reset();
      else this.broadcastState();
    } else if (msg.type === "restart") {
      await this.reset();
    }
  }

  async webSocketClose(ws: WebSocket) {
    try { ws.close(); } catch { /* already closing */ }
    if (this.game) this.broadcastState(); // refresh observer/connection list
    else this.broadcastLobby();
  }

  async start() {
    this.endVotes.clear();
    await this.state.storage.delete("endVotes");
    const seats = [...this.members().values()].map(m => ({ pid: m.pid, name: m.name }));
    this.game = new BigTwos(seats);
    await this.persist();
    this.broadcastState();
  }

  async reset() {
    this.game = null;
    this.endVotes.clear();
    await this.state.storage.delete("game");
    await this.state.storage.delete("endVotes");
    for (const ws of this.state.getWebSockets()) {
      const a = ws.deserializeAttachment() as Attach | null;
      if (a && a.pid) ws.serializeAttachment({ ...a, ready: false });
    }
    this.broadcastLobby();
  }

  async persist() {
    if (this.game) await this.state.storage.put("game", this.game.toState());
  }

  pushState(ws: WebSocket) {
    if (!this.game) { this.sendLobby(ws); return; }
    const a = ws.deserializeAttachment() as Attach | null;
    const snap: GameSnapshot = this.game.snapshot();
    // Observers = connected members who aren't seated players in this game.
    const playerPids = new Set(snap.players.map(p => p.pid));
    const seen = new Set<string>();
    const observers: { name: string }[] = [];
    for (const m of this.members().values()) {
      if (!playerPids.has(m.pid) && !seen.has(m.pid)) {
        seen.add(m.pid);
        observers.push({ name: m.name });
      }
    }
    ws.send(JSON.stringify({
      type: "state",
      snapshot: snap,
      hand: a?.pid ? (this.game.playerCards(a.pid) || []) : [],
      endVotes: this.endVotes.size,
      totalPlayers: snap.players.length,
      observers,
      youAreObserver: a?.pid ? !playerPids.has(a.pid) : true
    }));
  }
  broadcastState() { for (const ws of this.state.getWebSockets()) this.pushState(ws); }

  sendLobby(ws: WebSocket) {
    const me = ws.deserializeAttachment() as Attach | null;
    ws.send(JSON.stringify({
      type: "lobby",
      youReady: !!me?.ready,
      players: [...this.members().values()].map(m => ({ name: m.name, ready: m.ready }))
    }));
  }
  broadcastLobby() { for (const ws of this.state.getWebSockets()) this.sendLobby(ws); }
}
