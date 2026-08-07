/**
 * The arena grid — pure geometry, no renderer, no engine.
 *
 * The 2D build's ArenaMap does the same job but is welded to Phaser's static
 * bodies. The 3D build resolves its own collisions, so the rules live here as
 * plain maths and can be unit-tested headlessly.
 *
 * Coordinates are the same pixel-space the combat core already speaks
 * (1600 x 900 world, 80px tiles), so nothing has to be converted: combat X maps
 * to three.js X, combat Y maps to three.js Z, and the ground plane is Y = 0.
 */

/** How far away a bush stops hiding you (matches "two tiles" in the genre). */
const BUSH_REVEAL_RANGE = 2;

export class Grid {
  constructor(rows, tile = 80) {
    this.rows = rows;
    this.tile = tile;
    this.cols = rows[0].length;
    this.height = rows.length;
    this.width = this.cols * tile;
    this.depth = this.height * tile;

    this.spawns = { 0: [], 1: [] };
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.cols; c++) {
        const ch = rows[r][c];
        if (ch === 'A' || ch === 'B') {
          this.spawns[ch === 'A' ? 0 : 1].push(this.centreOf(c, r));
        }
      }
    }
  }

  centreOf(col, row) {
    return { x: col * this.tile + this.tile / 2, y: row * this.tile + this.tile / 2 };
  }

  charAt(col, row) {
    if (row < 0 || row >= this.height) return '#';   // outside is solid
    if (col < 0 || col >= this.cols) return '#';
    return this.rows[row][col];
  }

  tileOf(x, y) {
    return { col: Math.floor(x / this.tile), row: Math.floor(y / this.tile) };
  }

  isWall(col, row) { return this.charAt(col, row) === '#'; }

  isWallAt(x, y) {
    const t = this.tileOf(x, y);
    return this.isWall(t.col, t.row);
  }

  isOpenTile(col, row) {
    if (row < 0 || row >= this.height || col < 0 || col >= this.cols) return false;
    return this.rows[row][col] !== '#';
  }

  isBushAt(x, y) {
    const t = this.tileOf(x, y);
    return this.charAt(t.col, t.row) === '*';
  }

  /**
   * A fighter standing in a bush is hidden from anyone further than two tiles
   * away. Close enough and the bush rustles — that is the whole ambush loop.
   */
  isConcealed(x, y, fromX, fromY) {
    if (!this.isBushAt(x, y)) return false;
    const d = Math.hypot(x - fromX, y - fromY);
    return d > this.tile * BUSH_REVEAL_RANGE;
  }

  /**
   * Pushes a circle out of any wall tile it overlaps.
   *
   * Resolving per-tile on the shallower axis is what keeps a body sliding along
   * a wall instead of sticking to it: the deep axis is the one you are moving
   * into, the shallow one is the way out.
   */
  resolveCircle(x, y, radius) {
    const t = this.tile;
    const minCol = Math.floor((x - radius) / t);
    const maxCol = Math.floor((x + radius) / t);
    const minRow = Math.floor((y - radius) / t);
    const maxRow = Math.floor((y + radius) / t);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (!this.isWall(col, row)) continue;

        const left = col * t, right = left + t;
        const top = row * t, bottom = top + t;

        // nearest point on the tile to the circle centre
        const nx = Math.min(Math.max(x, left), right);
        const ny = Math.min(Math.max(y, top), bottom);
        const dx = x - nx;
        const dy = y - ny;
        const distSq = dx * dx + dy * dy;

        if (distSq > radius * radius) continue;

        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          x += (dx / dist) * push;
          y += (dy / dist) * push;
        } else {
          // centre is inside the tile: leave by the nearest face
          const outs = [x - left + radius, right - x + radius, y - top + radius, bottom - y + radius];
          const min = Math.min(...outs);
          if (min === outs[0]) x = left - radius;
          else if (min === outs[1]) x = right + radius;
          else if (min === outs[2]) y = top - radius;
          else y = bottom + radius;
        }
      }
    }

    // keep everyone inside the arena
    x = Math.min(Math.max(x, radius), this.width - radius);
    y = Math.min(Math.max(y, radius), this.depth - radius);
    return { x, y };
  }

  /** True when a wall sits between the two points — used for shots and for AI sight. */
  blocksLine(x1, y1, x2, y2) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(2, Math.ceil(dist / (this.tile / 3)));
    for (let i = 1; i < steps; i++) {
      const f = i / steps;
      if (this.isWallAt(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f)) return true;
    }
    return false;
  }

  /**
   * One step of a BFS path from `from` toward `to`, returned in world space.
   *
   * Local steering cannot solve a maze — a bot that just walks at you
   * oscillates forever in front of a corridor mouth. Flooding out from the goal
   * and reading back one tile costs nothing on a 20x11 grid and never gets
   * stuck.
   */
  nextWaypoint(from, to) {
    const start = this.tileOf(from.x, from.y);
    const goal = this.tileOf(to.x, to.y);
    if (!this.isOpenTile(goal.col, goal.row)) return null;
    if (start.col === goal.col && start.row === goal.row) return { x: to.x, y: to.y };

    const key = (c, r) => r * this.cols + c;
    const cameFrom = new Map();
    const queue = [goal];
    cameFrom.set(key(goal.col, goal.row), null);

    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let head = 0; head < queue.length; head++) {
      const cur = queue[head];
      if (cur.col === start.col && cur.row === start.row) break;
      for (const [dc, dr] of dirs) {
        const nc = cur.col + dc, nr = cur.row + dr;
        const k = key(nc, nr);
        if (cameFrom.has(k) || !this.isOpenTile(nc, nr)) continue;
        cameFrom.set(k, cur);
        queue.push({ col: nc, row: nr });
      }
    }

    const step = cameFrom.get(key(start.col, start.row));
    if (!step) return null;                       // unreachable, or already there
    return this.centreOf(step.col, step.row);
  }
}
