import { BigTwos, GameSnapshot, GameState } from "../lib/game/bigtwos";

type Election = "none" | "observer" | "player";
interface Attach { pid: string; name: string; }
interface Choice { election: Election; anyway: boolean; }

export interface Env {
  GAME: DurableObjectNamespace;
}

const IDLE_WARN = 8 * 60 * 1000;   // show "still here?" warning at 8 min idle
const IDLE_EXPIRE = 5 * 60 * 1000; // expire game at 5 min idle (120s after warning)
const AUTO_MS = 5000;   // all-elected start countdown
const ANYWAY_MS = 10000; // begin-anyway start countdown

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
  elections = new Map<string, Choice>(); // keyed by pid, shared across a user's tabs
  lastActivity = 0;
  startAt: number | null = null;
  startKind: "auto" | "anyway" | null = null;

  constructor(private state: DurableObjectState) {
    this.state.blockConcurrencyWhile(async () => {
      const gs = await this.state.storage.get<GameState>("game");
      this.game = gs ? BigTwos.restore(gs) : null;
      this.endVotes = new Set(await this.state.storage.get<string[]>("endVotes") || []);
      this.elections = new Map(await this.state.storage.get<[string, Choice][]>("elections") || []);
      this.lastActivity = await this.state.storage.get<number>("lastActivity") || 0;
      this.startAt = (await this.state.storage.get<number>("startAt")) ?? null;
      this.startKind = (await this.state.storage.get<"auto" | "anyway">("startKind")) ?? null;
      this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
    });
  }

  async fetch(_req: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ pid: "", name: "" } as Attach);
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

  // One logical member per distinct connected user (pid), with their shared
  // election (kept room-side keyed by pid, so all of a user's tabs agree).
  uniqueMembers(): { pid: string; name: string; election: Election; anyway: boolean }[] {
    const byPid = new Map<string, { pid: string; name: string }>();
    for (const a of this.members().values()) if (!byPid.has(a.pid)) byPid.set(a.pid, a);
    return [...byPid.values()].map(a => {
      const c = this.elections.get(a.pid) || { election: "none" as Election, anyway: false };
      return { pid: a.pid, name: a.name, election: c.election, anyway: c.anyway };
    });
  }

  connectedPids(): Set<string> {
    const s = new Set<string>();
    for (const a of this.members().values()) s.add(a.pid);
    return s;
  }

  async webSocketMessage(ws: WebSocket, raw: string) {
    if (raw === "ping") return;
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === "join") {
      ws.serializeAttachment({ pid: msg.pid, name: msg.name } as Attach);
      if (this.game) this.broadcastState();
      else await this.recomputeWaiting();
    } else if (msg.type === "chat") {
      const a = ws.deserializeAttachment() as Attach;
      const text = String(msg.text ?? "").slice(0, 200).trim();
      if (a?.name && text) {
        const payload = JSON.stringify({ type: "chat", name: a.name, text });
        for (const c of this.state.getWebSockets()) { try { c.send(payload); } catch { /* noop */ } }
      }
    } else if (msg.type === "elect" && !this.game) {
      const a = ws.deserializeAttachment() as Attach;
      const choice: Election = msg.choice;
      if (a?.pid && (choice === "none" || choice === "observer" || choice === "player")) {
        const prev = this.elections.get(a.pid);
        this.elections.set(a.pid, { election: choice, anyway: choice === "player" ? !!prev?.anyway : false });
        await this.saveElections();
        await this.recomputeWaiting();
      }
    } else if (msg.type === "beginAnyway" && !this.game) {
      const a = ws.deserializeAttachment() as Attach;
      const cur = a?.pid ? this.elections.get(a.pid) : undefined;
      if (cur && cur.election === "player") {
        this.elections.set(a.pid, { ...cur, anyway: !cur.anyway });
        await this.saveElections();
        await this.recomputeWaiting();
      }
    } else if (msg.type === "stillHere" && this.game) {
      await this.bumpActivity();
    } else if (msg.type === "move" && this.game) {
      const a = ws.deserializeAttachment() as Attach;
      if (a?.pid) this.game.makeMove(a.pid, msg.cards, false);
      await this.persist();
      await this.bumpActivity();
      this.broadcastState();
    } else if (msg.type === "pass" && this.game) {
      const a = ws.deserializeAttachment() as Attach;
      if (a?.pid) this.game.makeMove(a.pid, [], true);
      await this.persist();
      await this.bumpActivity();
      this.broadcastState();
    } else if (msg.type === "endVote" && this.game) {
      const a = ws.deserializeAttachment() as Attach;
      // Only players in the game can vote to end; toggle so it can be undone.
      if (a?.pid && this.game.playerCards(a.pid) !== null) {
        if (this.endVotes.has(a.pid)) this.endVotes.delete(a.pid);
        else this.endVotes.add(a.pid);
      }
      await this.state.storage.put("endVotes", [...this.endVotes]);
      const totalPlayers = this.game.snapshot().players.length;
      if (this.endVotes.size * 2 > totalPlayers) await this.reset();
      else this.broadcastState();
    } else if (msg.type === "restart") {
      await this.reset();
    }
  }

  async webSocketClose(ws: WebSocket) {
    const a = ws.deserializeAttachment() as Attach | null;
    try { ws.close(); } catch { /* already closing */ }
    // Drop a user's election only once all their tabs are gone.
    if (a?.pid && !this.game) {
      const stillHere = [...this.members().keys()].some(c => {
        if (c === ws) return false;
        const ca = c.deserializeAttachment() as Attach | null;
        return ca?.pid === a.pid;
      });
      if (!stillHere && this.elections.has(a.pid)) {
        this.elections.delete(a.pid);
        await this.saveElections();
      }
    }
    if (this.game) this.broadcastState();
    else await this.recomputeWaiting();
  }

  async saveElections() {
    await this.state.storage.put("elections", [...this.elections.entries()]);
  }

  // ---- Alarm: multiplexes waiting-room start countdown and in-game idle expiry ----
  async alarm() {
    const now = Date.now();
    if (this.game) {
      const idle = now - this.lastActivity;
      if (idle >= IDLE_EXPIRE) { await this.reset(); return; }
      const warnAt = this.lastActivity + IDLE_WARN;
      if (now >= warnAt) {
        const secondsLeft = Math.max(0, Math.ceil((this.lastActivity + IDLE_EXPIRE - now) / 1000));
        this.broadcast({ type: "idle", secondsLeft });
        await this.state.storage.setAlarm(this.lastActivity + IDLE_EXPIRE);
      } else {
        await this.state.storage.setAlarm(warnAt);
      }
    } else if (this.startAt && now >= this.startAt - 50) {
      await this.tryStart();
    } else if (this.startAt) {
      await this.state.storage.setAlarm(this.startAt);
    }
  }

  // ---- Waiting-room election state machine ----
  async recomputeWaiting() {
    if (this.game) return;
    const mem = this.uniqueMembers();
    const M = mem.length;
    const players = mem.filter(m => m.election === "player");
    const P = players.length;
    const E = mem.filter(m => m.election !== "none").length;
    const allAnyway = P > 0 && players.every(m => m.anyway);

    let kind: "auto" | "anyway" | null = null;
    if (P >= 2 && E === M && M >= 2) kind = "auto";            // everyone elected
    else if (P >= 2 && M > 2 && E * 2 > M && allAnyway) kind = "anyway"; // majority + forced

    if (!kind) {
      if (this.startAt !== null) {
        this.startAt = null; this.startKind = null;
        await this.state.storage.delete("startAt");
        await this.state.storage.delete("startKind");
        await this.state.storage.deleteAlarm();
      }
    } else if (this.startKind !== kind) {
      this.startKind = kind;
      this.startAt = Date.now() + (kind === "auto" ? AUTO_MS : ANYWAY_MS);
      await this.state.storage.put("startKind", kind);
      await this.state.storage.put("startAt", this.startAt);
      await this.state.storage.setAlarm(this.startAt);
    }
    this.broadcastLobby();
  }

  async tryStart() {
    const players = this.uniqueMembers().filter(m => m.election === "player");
    this.startAt = null; this.startKind = null;
    await this.state.storage.delete("startAt");
    await this.state.storage.delete("startKind");
    if (players.length < 2) { this.broadcastLobby(); return; }
    this.endVotes.clear();
    await this.state.storage.delete("endVotes");
    this.game = new BigTwos(players.map(p => ({ pid: p.pid, name: p.name })));
    await this.persist();
    this.lastActivity = Date.now();
    await this.state.storage.put("lastActivity", this.lastActivity);
    await this.state.storage.setAlarm(this.lastActivity + IDLE_WARN);
    this.broadcastState();
  }

  async bumpActivity() {
    this.lastActivity = Date.now();
    await this.state.storage.put("lastActivity", this.lastActivity);
    await this.state.storage.setAlarm(this.lastActivity + IDLE_WARN);
    this.broadcast({ type: "idleCleared" });
  }

  async start() { await this.tryStart(); }

  async reset() {
    this.game = null;
    this.endVotes.clear();
    this.elections.clear();
    this.startAt = null; this.startKind = null;
    await this.state.storage.delete("game");
    await this.state.storage.delete("endVotes");
    await this.state.storage.delete("elections");
    await this.state.storage.delete("startAt");
    await this.state.storage.delete("startKind");
    await this.state.storage.deleteAlarm();
    this.broadcastLobby();
  }

  async persist() {
    if (this.game) await this.state.storage.put("game", this.game.toState());
  }

  broadcast(obj: any) {
    const payload = JSON.stringify(obj);
    for (const ws of this.state.getWebSockets()) { try { ws.send(payload); } catch { /* noop */ } }
  }

  pushState(ws: WebSocket) {
    if (!this.game) { this.sendLobby(ws); return; }
    const a = ws.deserializeAttachment() as Attach | null;
    const snap: GameSnapshot = this.game.snapshot();
    const playerPids = new Set(snap.players.map(p => p.pid));
    const seen = new Set<string>();
    const observers: { name: string }[] = [];
    for (const m of this.members().values()) {
      if (!playerPids.has(m.pid) && !seen.has(m.pid)) { seen.add(m.pid); observers.push({ name: m.name }); }
    }
    const now = Date.now();
    const idleSecondsLeft = now >= this.lastActivity + IDLE_WARN
      ? Math.max(0, Math.ceil((this.lastActivity + IDLE_EXPIRE - now) / 1000))
      : null;
    ws.send(JSON.stringify({
      type: "state",
      snapshot: snap,
      hand: a?.pid ? (this.game.playerCards(a.pid) || []) : [],
      endVotes: this.endVotes.size,
      totalPlayers: snap.players.length,
      observers,
      youAreObserver: a?.pid ? !playerPids.has(a.pid) : true,
      idleSecondsLeft
    }));
  }
  broadcastState() { for (const ws of this.state.getWebSockets()) this.pushState(ws); }

  sendLobby(ws: WebSocket) {
    const meRaw = ws.deserializeAttachment() as Attach | null;
    const mem = this.uniqueMembers();
    // Merge this user's election across their own tabs for a consistent view.
    const me = meRaw?.pid ? mem.find(m => m.pid === meRaw.pid) : undefined;
    const M = mem.length;
    const players = mem.filter(m => m.election === "player");
    const E = mem.filter(m => m.election !== "none").length;
    const beginAnywayEligible = players.length >= 2 && M > 2 && E * 2 > M;
    ws.send(JSON.stringify({
      type: "lobby",
      you: { election: me?.election ?? "none", anyway: !!me?.anyway },
      players: mem.map(m => ({ name: m.name, election: m.election, anyway: m.anyway })),
      countdown: this.startAt
        ? { kind: this.startKind, secondsLeft: Math.max(0, Math.ceil((this.startAt - Date.now()) / 1000)) }
        : null,
      beginAnyway: { eligible: beginAnywayEligible, votes: players.filter(p => p.anyway).length, need: players.length }
    }));
  }
  broadcastLobby() { for (const ws of this.state.getWebSockets()) this.sendLobby(ws); }
}
