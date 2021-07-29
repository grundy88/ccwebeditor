/* 
 * Adapted for Typescript from Tile World source code.
 *
 * Copyright (C) 2001-2021 by Brian Raiter,
 * under the GNU General Public License. No warranty. See COPYING for details.
 */

import { Dir } from '../logic/dir'
import { Prng } from '../logic/random'
import { TW, CCtoTW, TWtoCC } from '../logic/twtile';
import { DEFAULT_LEVEL_SIZE, FRAMES_PER_STEP, STEPS_PER_SECOND, TICKS_PER_STEP } from '../util/utils';
import { Location } from '../util/link';
import { isChip } from '../tiles/tile';
import { FS_CLAIMED } from '../logic/lynx';
import { copyCreature } from './creature';

/* A tile on the map.
*/
export class Mapcell {
  top = TW.Empty;   /* the upper tile */
  bottom = TW.Empty;   /* the lower tile */
  state = 0;  /* internal state flags */

  constructor(other) {
    if (other) {
      this.top = other.top;
      this.bottom = other.bottom;
      this.state = other.state;
    }
  }
}

export class GameState {
  timelimitticks = 0;		/* maximum time permitted */
  currenttime = 0;		/* the current tick count */
  nextDirProvider;    /* must provide a function 'getNextDir' (which will be passed this state) */
  chipsNeeded = 0;		/* no. of chips still needed */
  statusflags = 0;		/* flags (see below) */
  nextrndslidedir = Dir.N;	/* initial random-slide dir */
  stepping = 0;		/* initial timer offset 0-7 */
  soundeffects = [];		/* the latest sound effects */
  mainprng = new Prng();		/* the main PRNG */
  creatures = [];		/* the creature list */
  trapLinks = [];		/* list of trap wirings (Location objects) */
  cloneLinks = [];		/* list of cloner wirings (Location objects) */
  hinttext = '';		/* text of the hint */
  map = [];          /* the game's map */

  // lynx-only
  chiptocr = null;	/* is Chip colliding with a creature */
  chiptopos = -1;	/*   just starting to move itself? */
  chiplastmovetime = 0; /* the last time at which chip initiated a successful move */
  prng1 = 0;		/* the values used to make the */
  prng2 = 0;		/*   pseudorandom number sequence */
  endgametimer = 0;	/* end-game countdown timer */
  togglestate = false;	/* extra state of the toggle walls */
  completed = false;	/* level completed successfully */
  stuck = false;		/* Chip is stuck */
  pushing = false;	/* Chip is pushing against something */
  couldntmove = false;	/* can't-move sound has been played */

  constructor() {
    this.size = {w:DEFAULT_LEVEL_SIZE, h:DEFAULT_LEVEL_SIZE}
    this.map = new Array(this.size.w * this.size.h);
    for (let i = 0; i < this.size.w * this.size.h; i++) this.map[i] = new Mapcell();
  }

  /* 
   * The pseudorandom number generator, used by walkers and blobs. This
   * exactly matches the PRNG used in the original Lynx game.
   * [tb] afaict it's used for walkers only, and it's here (instead of random.ts)
   * because it's mutating this state, and it's quite different than 
   * the random functions in random.js
   */
  lynx_prng() {
    let n = (this.prng1 >> 2) - this.prng1;
    if (!(this.prng1 & 0x02)) --n;
    if (n < 0) n = 0x100 + n;                     // added this line to clamp n to 0-255
    this.prng1 = (this.prng1 >> 1) | (this.prng2 & 0x80);
    this.prng2 = ((this.prng2 << 1) & 0xFF) | (n & 0x01);   // added the & 0xFF to similarly clamp prng2
    return (this.prng1 ^ this.prng2) & 0xFF;
  }


  // ------------------------------
  // stuff I added to be able to use same GameBoard.jsx

  levelNumber = 0;
  title = '';
  timeLimit = '';
  numChipsRequired = '';
  password = '';
  hint = '';
  gameOver = 0;
  origin = {}
  size = {}

  topCode(index) {
    return TWtoCC[this.map[index].top].code;
  }

  setTopCode(index, code) {
    return this.map[index].top = CCtoTW[code];
  }

  bottomCode(index) {
    return TWtoCC[this.map[index].bottom].code;
  }

  setBottomCode(index, code) {
    return this.map[index].bottom = CCtoTW[code];
  }

  setDirty() {
    // not saving edits during play
  }

  countChips() {
    return this.map.reduce((count,cell) => cell.top === TW.ICChip || cell.bottom === TW.ICChip ? count+1 : count, 0);
  }

  decChipsNeeded() {
    this.chipsNeeded -= 1;
  }

  setChipsNeeded(n) {
    this.chipsNeeded = n;
  }

  setGameOver(b) {
    this.gameOver = b;
  }
  
  // only looks at static map
  findChip() {
    const reversedChipIndex = this.map.slice().reverse().findIndex(cell => isChip(TWtoCC[cell.id]));
    if (reversedChipIndex >= 0) return this.map.length - reversedChipIndex - 1;
    return -1;
  }

  // only looks at live creatures list
  chip() {
    return this.creatures[0];
  }

  // logic duplicated from lynx.ts
  toggleWalls() {
    const t = this.togglestate ^ TW.SwitchWall_Open ^ TW.SwitchWall_Closed;
    for (let pos = 0 ; pos < this.map.length; ++pos) {
      if (this.map[pos].top === TW.SwitchWall_Open || this.map[pos].top === TW.SwitchWall_Closed) {
        this.map[pos].top ^= t;
      }
    }
  }

  location(x, y) {
    return new Location(x, y, this);
  }

  addCreature(cr) {
    this.map[cr.pos].state |= FS_CLAIMED;
    this.creatures.push(cr);
  }

  removeCreature(cr) {
    // cr.hidden = true;
    this.map[cr.pos].state &= ~FS_CLAIMED;
    this.creatures = this.creatures.filter(e => e !== cr);
  }

  getTimeLeft() {
    if (!isNaN(this.timelimitticks) && this.timelimitticks > 0) {
      return Math.ceil((this.timelimitticks - this.currenttime) / (STEPS_PER_SECOND * FRAMES_PER_STEP));
    }
    return -1;
  }
} 

export function levelToGameState(level) {
  const state = new GameState();

  state.title = level.title;
  state.levelNumber = level.levelNumber;
  state.password = level.password;
  state.hint = level.hint;
  state.numChipsRequired = level.numChipsRequired
  state.chipsNeeded = isNaN(parseInt(level.numChipsRequired)) ? 0 : parseInt(level.numChipsRequired);
  state.timeLimit = isNaN(parseInt(level.timeLimit)) ? 0 : parseInt(level.timeLimit);
  state.timelimitticks = state.timeLimit * STEPS_PER_SECOND * TICKS_PER_STEP;
  state.origin = {...level.origin}
  state.size = {...level.size}

  for (let i = 0; i < level.size.w * level.size.h; i++) {
    state.map[i].top = CCtoTW[level.topLayer[i]];
    state.map[i].bottom = CCtoTW[level.bottomLayer[i]];
  }

  for (const c of level.trapLinks) {
    state.trapLinks.push(c);
  }

  for (const c of level.cloneLinks) {
    state.cloneLinks.push(c);
  }

  return state;
}

export function copyState(other) {
  const state = new GameState();

  state.mainprng.value = other.mainprng.value;
  ['nextrndslidedir', 'prng1', 'prng2', 'chipsNeeded', 'endgametimer', 'currenttime', 'chiplastmovetime', 'togglestate', 'completed', 'gameOver', 'stuck', 'pushing', 'couldntmove', 'soundeffects']
      .forEach(f => state[f] = other[f]);

  state.map = other.map.map(cell => new Mapcell(cell));
  state.creatures = other.creatures.map(cr => copyCreature(cr));

  return state;
}
