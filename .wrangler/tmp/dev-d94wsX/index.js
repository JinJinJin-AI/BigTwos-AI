var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// lib/game/constants.ts
var handTypes = {
  1: ["singles", 1],
  2: ["doubles", 1],
  3: ["triples", 1],
  4: ["four of a kind", 2380],
  5: {
    0: ["invalid", 0],
    1: ["straight", 1],
    2: ["flush", 14],
    3: ["full house", 183],
    4: ["straight flush", 30941],
    5: ["royal flush", 402234]
  }
};
function fromId(id) {
  const suits = ["spades", "hearts", "clubs", "diamonds"];
  return { rank: id % 13 + 1, suit: suits[Math.floor(id / 13)] };
}
__name(fromId, "fromId");

// lib/game/engine.ts
function checkValidHand(hand) {
  let code;
  let name, multiplier, highCard, highSuit, highCardSuit;
  let has3D = false;
  let [S, F, R] = [true, true, true];
  let findFH = /* @__PURE__ */ new Set();
  let suits = /* @__PURE__ */ new Set(["diamonds", "clubs", "hearts", "spades"]);
  let royals = /* @__PURE__ */ new Set([1, 13, 12, 11]);
  let [flag1, flag2, flag3, flag4, flag10, flag11, flag12, flag13] = [
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false
  ];
  let max = 13;
  let min = 1;
  let isConsecutive = true;
  for (let item of hand) {
    let suit = item.suit;
    let rank = item.rank;
    if (rank == 3 && suit == "diamonds")
      has3D = true;
    if (highCard === void 0 || rank == 2 || highCard != 2 && rank == 1 || highCard < rank) {
      highCard = rank;
    }
    let suitValue = suit == "diamonds" ? 0 : suit == "clubs" ? 1 : suit == "hearts" ? 2 : 3;
    if (highSuit === void 0 || suitValue > highSuit) {
      highSuit = suitValue;
    }
    if (rank == highCard)
      highCardSuit = suitValue;
    if (rank < min || rank > max)
      isConsecutive = false;
    if (max - min > 4) {
      let lowerBound = rank - 4;
      let upperBound = rank + 4;
      if (lowerBound > min) {
        min = lowerBound;
      }
      if (upperBound < max) {
        max = upperBound;
      }
    }
    if (rank == 1)
      flag1 = true;
    if (rank == 2)
      flag2 = true;
    if (rank == 3)
      flag3 = true;
    if (rank == 4)
      flag4 = true;
    if (rank == 10)
      flag10 = true;
    if (rank == 11)
      flag11 = true;
    if (rank == 12)
      flag12 = true;
    if (rank == 13)
      flag13 = true;
    findFH.add(rank);
    royals.delete(rank);
    suits.delete(suit);
  }
  let isPoker = false;
  if (hand.length < 5) {
    if (findFH.size == 1) {
      [name, multiplier] = handTypes[hand.length];
      if (hand.length == 4)
        isPoker = true;
    }
  } else {
    isPoker = true;
    if (findFH.size == 2) {
      code = 3;
    } else {
      let casesWith13 = flag13 && !flag3 && !flag4 && flag1 && flag11 && flag12 && (flag10 || flag2);
      S = casesWith13 || isConsecutive;
      F = F && suits.size === 3;
      R = royals.size === 0;
      if (!F && !S) {
        code = 0;
      } else if (!F && S) {
        code = 1;
      } else if (F && !S) {
        code = 2;
      } else if (!R) {
        code = 4;
      } else {
        code = 5;
      }
    }
    [name, multiplier] = handTypes[5][code];
  }
  let score = highCard < 3 ? (highCard + 13) * multiplier : (highCard - 2) * multiplier;
  if (!score)
    score = 0;
  if (S)
    highSuit = highCardSuit;
  return [name, score, highSuit, isPoker, has3D];
}
__name(checkValidHand, "checkValidHand");
function evaluateHand(cards) {
  const res = checkValidHand(cards);
  const name = res[0];
  if (cards.length === 5 && name && name !== "invalid") {
    const counts = {};
    for (const c of cards)
      counts[c.rank] = (counts[c.rank] || 0) + 1;
    const dist = Object.values(counts).sort();
    const isFullHouse = dist.length === 2 && dist[0] === 2 && dist[1] === 3;
    const fiveDistinct = dist.length === 5;
    const valid = name === "full house" ? isFullHouse : fiveDistinct;
    if (!valid)
      return ["invalid", 0, res[2], res[3], res[4]];
  }
  if (cards.length < 5 && name && name !== "invalid") {
    const sv = /* @__PURE__ */ __name((s) => s === "diamonds" ? 0 : s === "clubs" ? 1 : s === "hearts" ? 2 : 3, "sv");
    const maxSuit = Math.max(...cards.map((c) => sv(c.suit)));
    return [res[0], res[1], maxSuit, res[3], res[4]];
  }
  return res;
}
__name(evaluateHand, "evaluateHand");

// lib/game/bigtwos.ts
var Seat = class {
  pid;
  name;
  cards = /* @__PURE__ */ new Set();
  next = null;
  constructor(pid, name) {
    this.pid = pid;
    this.name = name;
  }
};
__name(Seat, "Seat");
var BigTwos = class {
  players;
  size;
  boardHand = /* @__PURE__ */ new Set();
  numPasses = 0;
  firstMoveMade = false;
  boardScore = 0;
  boardHigh = -1;
  boardName;
  constructor(seats) {
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
        if (deck[cardsLeft - 1] == 41)
          first = p;
        p.cards.add(deck[cardsLeft - 1]);
        p = p.next;
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
  playerCards(pid) {
    let p = this.players;
    for (let i = 0; i < this.size; i++) {
      if (p.pid === pid)
        return [...p.cards];
      p = p.next;
    }
    return null;
  }
  gameOver() {
    return this.players.cards.size === 0;
  }
  cards(ids) {
    return ids.map(fromId);
  }
  /** Server-side validity: must be valid type, beat board, and clear first-move. */
  validate(ids) {
    const hand = this.cards(ids);
    const [name, score, suit, isPoker, has3D] = evaluateHand(hand);
    if (!name || name === "invalid")
      return false;
    if (!this.firstMoveMade && !has3D)
      return false;
    const empty = this.boardHand.size === 0;
    const boardPoker = this.boardHand.size >= 4;
    const higher = empty || (isPoker && boardPoker ? score > this.boardScore : ids.length === this.boardHand.size && (this.boardName === void 0 || name == this.boardName) && (score > this.boardScore || score == this.boardScore && suit > this.boardHigh));
    return !!higher;
  }
  makeMove(pid, ids, pass) {
    if (pid != this.players.pid || this.gameOver())
      return false;
    if (!pass) {
      const owns = ids.every((c) => this.players.cards.has(c));
      if (!owns || !this.validate(ids))
        return false;
      this.numPasses = 0;
      ids.forEach((c) => this.players.cards.delete(c));
      this.boardHand = new Set(ids);
      const [name, score, suit] = evaluateHand(this.cards(ids));
      this.boardName = name;
      this.boardScore = score;
      this.boardHigh = suit ?? -1;
      this.firstMoveMade = true;
    } else {
      if (!this.firstMoveMade)
        return false;
      this.numPasses++;
      this.players = this.players.next;
      if (this.numPasses == this.size - 1) {
        this.boardHand.clear();
        this.boardName = void 0;
        this.boardScore = 0;
        this.boardHigh = -1;
        this.numPasses = 0;
      }
    }
    if (!this.gameOver() && !pass)
      this.players = this.players.next;
    return true;
  }
  snapshot() {
    const players = [];
    let p = this.players;
    for (let i = 0; i < this.size; i++) {
      players.push({ pid: p.pid, name: p.name, cardsLeft: p.cards.size });
      p = p.next;
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
  shuffle(array) {
    let cur = array.length, r;
    while (cur != 0) {
      r = Math.floor(Math.random() * cur);
      cur--;
      [array[cur], array[r]] = [array[r], array[cur]];
    }
    const i = array.indexOf(41);
    if (i >= 42) {
      const j = Math.floor(Math.random() * 42);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
};
__name(BigTwos, "BigTwos");

// worker/index.ts
var worker_default = {
  async fetch(req, env) {
    if (req.headers.get("Upgrade") === "websocket") {
      const room = new URL(req.url).searchParams.get("room") || "main";
      const id = env.GAME.idFromName(room);
      return env.GAME.get(id).fetch(req);
    }
    return new Response("BigTwos realtime OK", { status: 200, headers: { "access-control-allow-origin": "*" } });
  }
};
var GameRoom = class {
  constructor(state) {
    this.state = state;
  }
  game = null;
  members = /* @__PURE__ */ new Map();
  endVotes = /* @__PURE__ */ new Set();
  async fetch(_req) {
    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    server.accept();
    server.addEventListener("message", (e) => this.onMessage(server, String(e.data)));
    server.addEventListener("close", () => this.onClose(server));
    this.sendLobby(server);
    return new Response(null, { status: 101, webSocket: client });
  }
  onClose(ws) {
    const m = this.members.get(ws);
    if (m)
      this.endVotes.delete(m.pid);
    this.members.delete(ws);
    if (!this.game)
      this.broadcastLobby();
  }
  onMessage(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.type === "join") {
      this.members.set(ws, { pid: msg.pid, name: msg.name, ready: false });
      if (this.game)
        this.pushState(ws);
      else
        this.broadcastLobby();
    } else if (msg.type === "ready") {
      const m = this.members.get(ws);
      if (m)
        m.ready = !m.ready;
      const all = [...this.members.values()];
      if (all.length >= 2 && all.every((x) => x.ready))
        this.start();
      else
        this.broadcastLobby();
    } else if (msg.type === "move" && this.game) {
      const m = this.members.get(ws);
      if (m)
        this.game.makeMove(m.pid, msg.cards, false);
      this.broadcastState();
    } else if (msg.type === "pass" && this.game) {
      const m = this.members.get(ws);
      if (m)
        this.game.makeMove(m.pid, [], true);
      this.broadcastState();
    } else if (msg.type === "endVote" && this.game) {
      const m = this.members.get(ws);
      if (m)
        this.endVotes.add(m.pid);
      if (this.endVotes.size * 2 > this.members.size)
        this.reset();
      else
        this.broadcastState();
    } else if (msg.type === "restart") {
      this.reset();
    }
  }
  reset() {
    this.game = null;
    this.endVotes.clear();
    for (const m of this.members.values())
      m.ready = false;
    this.broadcastLobby();
  }
  start() {
    this.endVotes.clear();
    this.game = new BigTwos([...this.members.values()].map((m) => ({ pid: m.pid, name: m.name })));
    this.broadcastState();
  }
  conns() {
    return [...this.members.keys()];
  }
  sendLobby(ws) {
    const me = this.members.get(ws);
    ws.send(JSON.stringify({ type: "lobby", youReady: !!me?.ready, players: [...this.members.values()].map((m) => ({ name: m.name, ready: m.ready })) }));
  }
  broadcastLobby() {
    for (const c of this.conns())
      this.sendLobby(c);
  }
  pushState(ws) {
    if (!this.game)
      return;
    const m = this.members.get(ws);
    const snap = this.game.snapshot();
    ws.send(JSON.stringify({ type: "state", snapshot: snap, hand: m ? this.game.playerCards(m.pid) : [], endVotes: this.endVotes.size, totalPlayers: this.members.size }));
  }
  broadcastState() {
    for (const c of this.conns())
      this.pushState(c);
  }
};
__name(GameRoom, "GameRoom");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-IYmrn9/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-IYmrn9/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  GameRoom,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
