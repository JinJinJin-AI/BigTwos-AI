import { checkValidHand } from "./engine";
import { CardData, fromId, toId } from "./constants";

export interface PublicPlayerState {
  pid: string;
  name: string;
  cardsLeft: number;
}

export interface GameSnapshot {
  started: boolean;
  currentPlayer: string | null;
  board: number[];
  players: PublicPlayerState[];
  firstMoveMade: boolean;
  gameOver: boolean;
  winner: string | null;
}

class Seat {
  pid: string;
  name: string;
  cards: Set<number> = new Set();
  next: Seat | null = null;
  constructor(pid: string, name: string) {
    this.pid = pid;
    this.name = name;
  }
}

/**
 * Authoritative game logic. Re-implements legacy BigTwos.js with the deployment
 * branch fixes (3 of diamonds = 41, firstMoveMade, gameOver, restart) and adds
 * SERVER-SIDE move validation using the preserved checkValidHand engine.
 */
export class BigTwos {
  private players: Seat;
  private size: number;
  private boardHand: Set<number> = new Set();
  private numPasses = 0;
  firstMoveMade = false;
  private boardScore = 0;
  private boardHigh = -1;
  private boardName: string | undefined;

  constructor(seats: { pid: string; name: string }[]) {
    this.size = seats.length;
    this.firstMoveMade = false;
    let head = new Seat(seats[seats.length - 1].pid, seats[seats.length - 1].name);
    const back = head;
    for (let i = seats.length - 2; i >= 0; i--) {
      const s = new Seat(seats[i].pid, seats[i].name);
      s.next = head;
      head = s;
    }
    back.next = head;
    this.players = head;

    const deck = this.shuffle(Array.from(Array(52).keys()));
    let cardsLeft = this.size == 2 ? 42 : deck.length;
    let p = this.players;
    let first = this.players;
    while (cardsLeft >= this.size) {
      for (let i = 0; i < this.size; i++) {
        if (deck[cardsLeft - 1] == 41) first = p; // 3 of diamonds goes first
        p.cards.add(deck[cardsLeft - 1]);
        p = p.next!;
        cardsLeft--;
      }
    }
    this.players = first;
  }

  get currentPlayer() {
    return this.players.pid;
  }

  board() {
    return [...this.boardHand];
  }

  playerCards(pid: string): number[] | null {
    let p = this.players;
    for (let i = 0; i < this.size; i++) {
      if (p.pid === pid) return [...p.cards];
      p = p.next!;
    }
    return null;
  }

  gameOver() {
    return this.players.cards.size === 0;
  }

  private cards(ids: number[]): CardData[] {
    return ids.map(fromId);
  }

  /** Server-side validity: must be valid type, beat board, and clear first-move. */
  validate(ids: number[]): boolean {
    const hand = this.cards(ids);
    const [name, score, suit, isPoker, has3D] = checkValidHand(hand);
    if (!name || name === "invalid") return false;
    if (!this.firstMoveMade && !has3D) return false; // first move must contain 3 of diamonds
    const empty = this.boardHand.size === 0;
    const higher =
      empty ||
      isPoker ||
      ((this.boardName === undefined || name == this.boardName) &&
        (score > this.boardScore ||
          (score == this.boardScore && (suit as number) > this.boardHigh)));
    return !!higher;
  }

  makeMove(pid: string, ids: number[], pass: boolean): boolean {
    if (pid != this.players.pid || this.gameOver()) return false;
    if (!pass) {
      const owns = ids.every(c => this.players.cards.has(c));
      if (!owns || !this.validate(ids)) return false;
      this.numPasses = 0;
      ids.forEach(c => this.players.cards.delete(c));
      this.boardHand = new Set(ids);
      const [name, score, suit] = checkValidHand(this.cards(ids));
      this.boardName = name;
      this.boardScore = score;
      this.boardHigh = (suit as number) ?? -1;
      this.firstMoveMade = true;
    } else {
      if (!this.firstMoveMade) return false; // cannot pass before first move
      this.numPasses++;
      this.players = this.players.next!;
      if (this.numPasses == this.size - 1) {
        this.boardHand.clear();
        this.boardName = undefined;
        this.boardScore = 0;
        this.boardHigh = -1;
        this.numPasses = 0;
      }
    }
    if (!this.gameOver() && !pass) this.players = this.players.next!;
    return true;
  }

  snapshot(): GameSnapshot {
    const players: PublicPlayerState[] = [];
    let p = this.players;
    for (let i = 0; i < this.size; i++) {
      players.push({ pid: p.pid, name: p.name, cardsLeft: p.cards.size });
      p = p.next!;
    }
    return {
      started: true,
      currentPlayer: this.players.pid,
      board: this.board(),
      players,
      firstMoveMade: this.firstMoveMade,
      gameOver: this.gameOver(),
      winner: this.gameOver() ? this.players.pid : null
    };
  }

  private shuffle(array: number[]) {
    let cur = array.length,
      r;
    while (cur != 0) {
      r = Math.floor(Math.random() * cur);
      cur--;
      [array[cur], array[r]] = [array[r], array[cur]];
    }
    const i = array.indexOf(41); // 3 of diamonds
    if (i < array.length - 42) {
      const j = array.length - Math.floor(Math.random() * 42) - 1;
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

export { toId, fromId };
