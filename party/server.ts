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
  | { type: "restart" };

export default class BigTwosRoom implements Party.Server {
  game: BigTwos | null = null;
  members = new Map<string, Member>(); // connId -> member

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    this.sendLobby(conn);
  }

  onClose(conn: Party.Connection) {
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
      if (m) m.ready = true;
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
    } else if (msg.type === "restart") {
      this.game = null;
      for (const m of this.members.values()) m.ready = false;
      this.broadcastLobby();
    }
  }

  start() {
    const seats = [...this.members.values()].map(m => ({ pid: m.pid, name: m.name }));
    this.game = new BigTwos(seats);
    this.broadcastState();
  }

  sendLobby(conn: Party.Connection) {
    conn.send(
      JSON.stringify({
        type: "lobby",
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
    conn.send(JSON.stringify({ type: "state", snapshot: snap, hand: m ? this.game.playerCards(m.pid) : [] }));
  }
  broadcastState() {
    for (const c of this.room.getConnections()) this.pushState(c);
  }
}
