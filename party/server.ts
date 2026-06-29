import type * as Party from "partykit/server";
import { BigTwos, GameSnapshot } from "../lib/game/bigtwos";

interface Member {
  pid: string;
  name: string;
  ready: boolean;
}

type ClientMsg =
  | { type: "join"; pid: string; name: string }
  | { type: "ready" }
  | { type: "move"; cards: number[] }
  | { type: "pass" }
  | { type: "endVote" }
  | { type: "restart" };

export default class BigTwosRoom implements Party.Server {
  game: BigTwos | null = null;
  members = new Map<string, Member>(); // connId -> member
  endVotes = new Set<string>(); // pids who voted to end

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    this.sendLobby(conn);
  }

  onClose(conn: Party.Connection) {
    const m = this.members.get(conn.id);
    if (m) this.endVotes.delete(m.pid);
    this.members.delete(conn.id);
    if (!this.game) this.broadcastLobby();
  }

  onMessage(raw: string, sender: Party.Connection) {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.type === "join") {
      this.members.set(sender.id, { pid: msg.pid, name: msg.name, ready: false });
      if (this.game) this.pushState(sender);
      else this.broadcastLobby();
    } else if (msg.type === "ready") {
      const m = this.members.get(sender.id);
      if (m) m.ready = !m.ready;
      const all = [...this.members.values()];
      if (all.length >= 2 && all.every(x => x.ready)) this.start();
      else this.broadcastLobby();
    } else if (msg.type === "move" && this.game) {
      const m = this.members.get(sender.id);
      if (m) this.game.makeMove(m.pid, msg.cards, false);
      this.broadcastState();
    } else if (msg.type === "pass" && this.game) {
      const m = this.members.get(sender.id);
      if (m) this.game.makeMove(m.pid, [], true);
      this.broadcastState();
    } else if (msg.type === "endVote" && this.game) {
      const m = this.members.get(sender.id);
      if (m) this.endVotes.add(m.pid);
      // majority: need more than half (2 players => both required)
      if (this.endVotes.size * 2 > this.members.size) this.reset();
      else this.broadcastState();
    } else if (msg.type === "restart") {
      this.reset();
    }
  }

  reset() {
    this.game = null;
    this.endVotes.clear();
    for (const m of this.members.values()) m.ready = false;
    this.broadcastLobby();
  }

  start() {
    const seats = [...this.members.values()].map(m => ({ pid: m.pid, name: m.name }));
    this.endVotes.clear();
    this.game = new BigTwos(seats);
    this.broadcastState();
  }

  sendLobby(conn: Party.Connection) {
    const me = this.members.get(conn.id);
    conn.send(
      JSON.stringify({
        type: "lobby",
        youReady: !!me?.ready,
        players: [...this.members.values()].map(m => ({ name: m.name, ready: m.ready }))
      })
    );
  }
  broadcastLobby() {
    for (const c of this.room.getConnections()) this.sendLobby(c);
  }

  pushState(conn: Party.Connection) {
    if (!this.game) return;
    const m = this.members.get(conn.id);
    const snap: GameSnapshot = this.game.snapshot();
    conn.send(JSON.stringify({
      type: "state",
      snapshot: snap,
      hand: m ? this.game.playerCards(m.pid) : [],
      endVotes: this.endVotes.size,
      totalPlayers: this.members.size
    }));
  }
  broadcastState() {
    for (const c of this.room.getConnections()) this.pushState(c);
  }
}
