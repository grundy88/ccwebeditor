/* 
 * Adapted for Typescript from Tile World source code.
 *
 * Mostly lxlogic.c: The game logic for the Lynx ruleset.
 *
 * Copyright (C) 2001-2021 by Brian Raiter, Eric Schmidt,
 * under the GNU General Public License. No warranty. See COPYING for details.
 */

import { TW, iscreature, ismsspecial, isanimation, isice, isslide, isdoor, crtile, creatureid, creaturedirid, ismonster } from './twtile';
import { GameState } from '../model/gamestate';
import { Creature } from '../model/creature';
import { Dir, left, back, right, isdiagonal } from './dir';
import { random4 } from './random';
import { DEFAULT_LEVEL_SIZE, EndReasons } from '../util/utils';
import * as sound from '../../engine/util/sound';

// perhaps this could be made to work with a non-square variably sized level, but really no foreseeable need
const LEVEL_SIZE = DEFAULT_LEVEL_SIZE;

/* Temporary "holding" values used in place of a direction.
 */
const WALKER_TURN = (Dir.N | Dir.S | Dir.E);
const BLOB_TURN = (Dir.N | Dir.S | Dir.W)

/* Used to calculate movement offsets.
 */
const delta = [0, -LEVEL_SIZE, -1, 0, +LEVEL_SIZE, 0, 0, 0, +1];

/* Floor state flags.
 */
export const FS_CLAIMED = 0x01; /* spot is claimed by a creature */
const FS_ANIMATED = 0x02; /* spot is playing an animation */
const FS_BEARTRAP = 0x04; /* there is or was a beartrap here */
const FS_TELEPORT = 0x08; /* there is or was a teleport here */

/* Creature state flags.
 */
const CS_FDIRMASK = 0x0F; /* temp storage for forced moves */
const CS_SLIDETOKEN = 0x10; /* can move off of a slide floor */
const CS_REVERSE = 0x20; /* needs to turn around */
const CS_PUSHED = 0x40; /* block was pushed by Chip */
const CS_TELEPORTED = 0x80; /* creature was just teleported */

/* General status flags.
 */
// const	SF_NOSAVING    = 0x0001;  /* solution won't be saved */
const	SF_INVALID     = 0x0002;  /* level is not playable */
// const	SF_BADTILES    = 0x0004;  /* map has undefined tiles */
const	SF_SHOWHINT    = 0x0008;  /* display the hint text */
// const	SF_NOANIMATION = 0x0010;  /* suppress tile animation */
// const	SF_SHUTTERED   = 0x0020;  /* hide map view */

/*
* Functions that manage the list of entities.
*/
function getfdir(cr: Creature) { return (cr.state & CS_FDIRMASK); }
function setfdir(cr: Creature, d: number) { cr.state = (cr.state & ~CS_FDIRMASK) | ((d) & CS_FDIRMASK); }


/*
 * The laws of movement across the various floors.
 *
 * Chip, blocks, and other creatures all have slightly different rules
 * about what sort of tiles they are permitted to move into and out
 * of. The following lookup table encapsulates these rules. Note that
 * these rules are only the first check; a creature may be generally
 * permitted a particular type of move but still prevented in a
 * specific situation.
 */

function DIR_IN(dir: number) { return dir; }
function DIR_OUT(dir: number) { return dir << 4; }

const NORTH_IN = DIR_IN(Dir.N);
const WEST_IN = DIR_IN(Dir.W);
const SOUTH_IN = DIR_IN(Dir.S);
const EAST_IN = DIR_IN(Dir.E);
const NORTH_OUT = DIR_OUT(Dir.N);
const WEST_OUT = DIR_OUT(Dir.W);
const SOUTH_OUT = DIR_OUT(Dir.S);
const EAST_OUT = DIR_OUT(Dir.E);
const ALL_IN = (NORTH_IN | WEST_IN | SOUTH_IN | EAST_IN);
const ALL_OUT = (NORTH_OUT | WEST_OUT | SOUTH_OUT | EAST_OUT);
const ALL_IN_OUT = (ALL_IN | ALL_OUT);

// static struct { unsigned char chip, block, creature; } const movelaws[] = {
const movelaws = [
    /* Nothing */
    [ 0, 0, 0 ],
    /* Empty */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* Slide_North */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* Slide_West */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* Slide_South */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* Slide_East */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* Slide_Random */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* Ice */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* IceWall_Northwest */
    [ NORTH_OUT | WEST_OUT | SOUTH_IN | EAST_IN,
      NORTH_OUT | WEST_OUT | SOUTH_IN | EAST_IN,
      NORTH_OUT | WEST_OUT | SOUTH_IN | EAST_IN ],
    /* IceWall_Northeast */
    [ NORTH_OUT | EAST_OUT | SOUTH_IN | WEST_IN,
      NORTH_OUT | EAST_OUT | SOUTH_IN | WEST_IN,
      NORTH_OUT | EAST_OUT | SOUTH_IN | WEST_IN ],
    /* IceWall_Southwest */
    [ SOUTH_OUT | WEST_OUT | NORTH_IN | EAST_IN,
      SOUTH_OUT | WEST_OUT | NORTH_IN | EAST_IN,
      SOUTH_OUT | WEST_OUT | NORTH_IN | EAST_IN ],
    /* IceWall_Southeast */
    [ SOUTH_OUT | EAST_OUT | NORTH_IN | WEST_IN,
      SOUTH_OUT | EAST_OUT | NORTH_IN | WEST_IN,
      SOUTH_OUT | EAST_OUT | NORTH_IN | WEST_IN ],
    /* Gravel */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_OUT ],
    /* Dirt */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* Water */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* Fire */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* Bomb */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* Beartrap */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* Burglar */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* HintButton */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* Button_Blue */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* Button_Green */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* Button_Red */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* Button_Brown */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* Teleport */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* Wall */
    [ ALL_OUT, ALL_OUT, ALL_OUT ],
    /* Wall_North */
    [ NORTH_IN | WEST_IN | EAST_IN | WEST_OUT | SOUTH_OUT | EAST_OUT,
      NORTH_IN | WEST_IN | EAST_IN | WEST_OUT | SOUTH_OUT | EAST_OUT,
      NORTH_IN | WEST_IN | EAST_IN | WEST_OUT | SOUTH_OUT | EAST_OUT ],
    /* Wall_West */
    [ NORTH_IN | WEST_IN | SOUTH_IN | NORTH_OUT | SOUTH_OUT | EAST_OUT,
      NORTH_IN | WEST_IN | SOUTH_IN | NORTH_OUT | SOUTH_OUT | EAST_OUT,
      NORTH_IN | WEST_IN | SOUTH_IN | NORTH_OUT | SOUTH_OUT | EAST_OUT ],
    /* Wall_South */
    [ WEST_IN | SOUTH_IN | EAST_IN | NORTH_OUT | WEST_OUT | EAST_OUT,
      WEST_IN | SOUTH_IN | EAST_IN | NORTH_OUT | WEST_OUT | EAST_OUT,
      WEST_IN | SOUTH_IN | EAST_IN | NORTH_OUT | WEST_OUT | EAST_OUT ],
    /* Wall_East */
    [ NORTH_IN | SOUTH_IN | EAST_IN | NORTH_OUT | WEST_OUT | SOUTH_OUT,
      NORTH_IN | SOUTH_IN | EAST_IN | NORTH_OUT | WEST_OUT | SOUTH_OUT,
      NORTH_IN | SOUTH_IN | EAST_IN | NORTH_OUT | WEST_OUT | SOUTH_OUT ],
    /* Wall_Southeast */
    [ SOUTH_IN | EAST_IN | NORTH_OUT | WEST_OUT,
      SOUTH_IN | EAST_IN | NORTH_OUT | WEST_OUT,
      SOUTH_IN | EAST_IN | NORTH_OUT | WEST_OUT ],
    /* HiddenWall_Perm */
    [ ALL_OUT, ALL_OUT, ALL_OUT ],
    /* HiddenWall_Temp */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* BlueWall_Real */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* BlueWall_Fake */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* SwitchWall_Open */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* SwitchWall_Closed */
    [ ALL_OUT, ALL_OUT, ALL_OUT ],
    /* PopupWall */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* CloneMachine */
    [ ALL_OUT, ALL_OUT, ALL_OUT ],
    /* Door_Red */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* Door_Blue */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* Door_Yellow */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* Door_Green */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* Socket */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* Exit */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* ICChip */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* Key_Red */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* Key_Blue */
    [ ALL_IN_OUT, ALL_IN_OUT, ALL_IN_OUT ],
    /* Key_Yellow */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* Key_Green */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* Boots_Slide */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* Boots_Ice */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* Boots_Water */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* Boots_Fire */
    [ ALL_IN_OUT, ALL_OUT, ALL_OUT ],
    /* Block_Static */
    [ 0, 0, 0 ],
    /* Drowned_Chip */
    [ 0, 0, 0 ],
    /* Burned_Chip */
    [ 0, 0, 0 ],
    /* Bombed_Chip */
    [ 0, 0, 0 ],
    /* Exited_Chip */
    [ 0, 0, 0 ],
    /* Exit_Extra_1 */
    [ 0, 0, 0 ],
    /* Exit_Extra_2 */
    [ 0, 0, 0 ],
    /* Overlay_Buffer */
    [ 0, 0, 0 ],
    /* Floor_Reserved2 */
    [ 0, 0, 0 ],
    /* Floor_Reserved1 */
    [ 0, 0, 0 ]
];

/* Including the flag CMM_RELEASING in a call to canmakemove()
 * indicates that the creature in question is being moved out of a
 * beartrap or clone machine, moves that would normally be forbidden.
 * CMM_CLEARANIMATIONS causes animations in the destination square to
 * be immediately quelled. CMM_STARTMOVEMENT indicates that this is
 * the final check before movement begins, thus triggering side
 * effects such as exposing hidden walls. CMM_PUSHBLOCKS causes blocks
 * to be pushed when in the way of Chip. CMM_PUSHBLOCKSNOW causes
 * blocks to be pushed immediately, instead of waiting for the block's
 * turn to move.
 */
const CMM_RELEASING = 0x0001;
const CMM_CLEARANIMATIONS = 0x0002;
const CMM_STARTMOVEMENT = 0x0004;
const CMM_PUSHBLOCKS = 0x0008;
const CMM_PUSHBLOCKSNOW = 0x0010;


/* The exported function: Initialize and return the module's gamelogic
* structure.
*/
export function lynxlogicstartup(): LynxLogic {
  const state = new GameState();
  return new LynxLogic(state);
}

export class LynxLogic {
  /* The most recently used stepping phase value (aka step parity).
  */
  laststepping = 0;

  state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }


  getchip() { return this.state.creatures[0]; }
  chippos() { return this.getchip().pos; }
  chipisalive() { return (this.getchip().id === TW.Chip); }

  showhint() { this.state.statusflags |= SF_SHOWHINT; }
  hidehint()  { this.state.statusflags &= ~SF_SHOWHINT; }
  markinvalid() { this.state.statusflags |= SF_INVALID; }
  ismarkedinvalid() { return this.state.statusflags & SF_INVALID; }

  inendgame() { return this.state.endgametimer; }
  startendgametimer() { this.state.endgametimer = 12 + 1; }
  // function decrendgametimer() { this.state.endgametimer -= 1; }
  resetendgametimer() { this.state.endgametimer = 0; }

  addsoundeffect(sfx: number, vol: number=1) { return (this.state.soundeffects.push({sfx, vol})); }
  // stopsoundeffect(sfx: number) { return (this.state.soundeffects &= ~(1 << (sfx))); }

  floorat(pos: number) { return this.state.map[pos].top; }
  setfloorat(pos: number, id: number) { this.state.map[pos].top = id; }

  /* Accessor macros for the floor states.
  */
  claimlocation(pos: number) { return (this.state.map[pos].state |= FS_CLAIMED); }
  removeclaim(pos: number) { return (this.state.map[pos].state &= ~FS_CLAIMED); }
  islocationclaimed(pos: number) { return (this.state.map[pos].state & FS_CLAIMED); }
  markanimated(pos: number) { return (this.state.map[pos].state |= FS_ANIMATED); }
  clearanimated(pos: number) { return (this.state.map[pos].state &= ~FS_ANIMATED); }
  ismarkedanimated(pos: number) { return (this.state.map[pos].state & FS_ANIMATED); }
  markbeartrap(pos: number) { return (this.state.map[pos].state |= FS_BEARTRAP); }
  ismarkedbeartrap(pos: number) { return (this.state.map[pos].state & FS_BEARTRAP); }
  markteleport(pos: number) { return (this.state.map[pos].state |= FS_TELEPORT); }
  ismarkedteleport(pos: number) { return (this.state.map[pos].state & FS_TELEPORT); }

  /* Translate a slide floor into the direction it points in. In the
  * case of a random slide floor, if advance is true a new direction
  * shall be selected; otherwise the current direction is used.
  */
  getslidedir(floor: number, advance: boolean)
  {
      switch (floor) {
        case TW.Slide_North: return Dir.N;
        case TW.Slide_West: return Dir.W;
        case TW.Slide_South: return Dir.S;
        case TW.Slide_East: return Dir.E;
        case TW.Slide_Random:
          if (advance) this.state.nextrndslidedir = right(this.state.nextrndslidedir);
          return this.state.nextrndslidedir;
      }
      console.log(`WARN: Invalid floor ${floor}  handed to getslidedir()`);
      // _assert(!"getslidedir() called with an invalid object");
      return Dir.NONE;
  }

  /* Alter a creature's direction if they are at an ice wall.
  */
  applyicewallturn(cr: Creature) {
      let floor = this.floorat(cr.pos);
      let dir = cr.dir;
      switch (floor) {
        case TW.IceWall_Northeast:
          dir = dir === Dir.S ? Dir.E : dir === Dir.W ? Dir.N : dir;
          break;
        case TW.IceWall_Southwest:
          dir = dir === Dir.N ? Dir.W : dir === Dir.E ? Dir.S : dir;
          break;
        case TW.IceWall_Northwest:
          dir = dir === Dir.S ? Dir.W : dir === Dir.E ? Dir.N : dir;
          break;
        case TW.IceWall_Southeast:
          dir = dir === Dir.N ? Dir.E : dir === Dir.W ? Dir.S : dir;
          break;
      }
      cr.dir = dir;
  }

  /* Find the location of a beartrap from one of its buttons.
  */
  trapfrombutton(pos: number): number {
      for (const link of this.state.trapLinks) {
        if (!link.from.disabled && link.from.index() === pos) return link.to.index();
      }
      return -1;
  }

  /* Find the location of a clone machine from one of its buttons.
  */
  clonerfrombutton(pos: number): number {
      for (const link of this.state.cloneLinks) {
        if (!link.from.disabled && link.from.index() === pos) return link.to.index();
      }
      return -1;
  }

  /* Quell any continuous sound effects coming from what Chip is
  * standing on. If includepushing is true, also quell the sound of any
  * blocks being pushed.
  */
  resetfloorsounds(includepushing: boolean) {
      // stopsoundeffect(SND_SKATING_FORWARD);
      // stopsoundeffect(SND_SKATING_TURN);
      // stopsoundeffect(SND_FIREWALKING);
      // stopsoundeffect(SND_WATERWALKING);
      // stopsoundeffect(SND_ICEWALKING);
      // stopsoundeffect(SND_SLIDEWALKING);
      // stopsoundeffect(SND_SLIDING);
      // if (includepushing) stopsoundeffect(SND_BLOCK_MOVING);
  }

  /* Return the creature located at pos. Ignores Chip unless includechip
  * is true. (This is important in the case when Chip and a second
  * creature are currently occupying a single location.)
  */
  lookupcreature(pos: number, includechip: boolean): Creature | null {
    let i = includechip ? 0 : 1;
    while (i < this.state.creatures.length) {
      const cr = this.state.creatures[i++];
      if (cr.pos === pos && !cr.hidden && !isanimation(cr.id)) return cr;
    }
    return null;
  }

  /* Return a fresh creature.
  */
  newcreature(): Creature {
    // reuse a previously removed creature - perhaps originally for memory
    // management, kept here to ensure the creature list order remains
    // as expected
    for (let i = 1; i < this.state.creatures.length; i++) {
      if (this.state.creatures[i].hidden) return this.state.creatures[i];
    }

    const cr = new Creature();
    cr.hidden = true;
    this.state.creatures.push(cr);
    return cr;
  }

  /* Flag all tanks to turn around.
  */
  turntanks() {
    for (const cr of this.state.creatures) {
      if (cr.hidden) continue;
      if (cr.id !== TW.Tank) continue;
      if (this.floorat(cr.pos) === TW.CloneMachine || isice(this.floorat(cr.pos))) continue;
      cr.state ^= CS_REVERSE;
    }
  }

  /* Start an animation sequence at the spot (formerly) occupied by the
  * given creature. The creature's slot in the creature list is reused
  * by the animation sequence.
  */
  removecreature(cr: Creature, animationid: number) {
      if (cr.id !== TW.Chip) this.removeclaim(cr.pos);
      // if (cr.state & CS_PUSHED) stopsoundeffect(SND_BLOCK_MOVING);
      cr.id = animationid;
      cr.frame = ((this.state.currenttime + this.state.stepping) & 1) ? 12 : 11;
      --cr.frame;
      cr.hidden = false;
      cr.state = 0;
      cr.tdir = Dir.NONE;
      if (cr.moving === 8) {
        cr.pos -= delta[cr.dir];
        cr.moving = 0;
      }
      this.markanimated(cr.pos);
  }

  /* End the given animation sequence (thus removing the final vestige
  * of an ex-creature).
  */
  removeanimation(cr: Creature)
  {
      cr.hidden = true;
      this.clearanimated(cr.pos);
      if ((this.state.creatures.length > 1) && (cr === this.state.creatures[this.state.creatures.length-1])) {
        this.state.creatures.pop();
      }
  }

  /* Abort the animation sequence occuring at the given location.
  */
  stopanimationat(pos: number) {
    for (const cr of this.state.creatures) {
      if (!cr.hidden && cr.pos === pos && isanimation(cr.id)) {
        this.removeanimation(cr);
        return true;
      }
    }
    return false;
  }

  /* What happens when Chip dies. reason indicates the cause of death.
  * also is either null or points to a creature that dies with Chip.
  */
  removechip(reason: number, also: Creature | null)
  {
      const chip = this.getchip();

      switch (reason) {
        case EndReasons.Water:
          this.addsoundeffect(sound.SND_WATER_SPLASH);
          this.removecreature(chip, TW.Water_Splash);
          break;
        case EndReasons.Bomb:
          this.addsoundeffect(sound.SND_BOMB_EXPLODES);
          this.removecreature(chip, TW.Bomb_Explosion);
          break;
        case EndReasons.Time:
          this.addsoundeffect(sound.SND_TIME_OUT);
          this.removecreature(chip, TW.Entity_Explosion);
          break;
        case EndReasons.Fire:
          this.addsoundeffect(sound.SND_CHIP_LOSES);
          this.removecreature(chip, TW.Entity_Explosion);
          break;
        case EndReasons.Monster:
        case EndReasons.Block:
          this.addsoundeffect(sound.SND_CHIP_LOSES);
          this.removecreature(chip, TW.Entity_Explosion);
          if (also && also !== chip) this.removecreature(also, TW.Entity_Explosion);
          break;
      }

      this.state.setGameOver(reason);
      this.resetfloorsounds(false);
      this.startendgametimer();
  }

  /* Return true if the given block is allowed to be moved in the given
  * direction. If flags includes CMM_PUSHBLOCKSNOW, then the indicated
  * movement of the block will be initiated.
  */
  canpushblock(block: Creature, dir: number, flags: number) {
      // _assert(block && block.id === Block);
      // _assert(floorat(block.pos) !== CloneMachine);
      // _assert(dir !== Dir.NONE);

      if (!this.canmakemove(block, dir, flags)) {
        if (!block.moving && (flags & (CMM_PUSHBLOCKS | CMM_PUSHBLOCKSNOW)))
            block.dir = dir;
        return false;
      }
      if (flags & (CMM_PUSHBLOCKS | CMM_PUSHBLOCKSNOW)) {
        block.dir = dir;
        block.tdir = dir;
        block.state |= CS_PUSHED;
        if (flags & CMM_PUSHBLOCKSNOW)
        this.advancecreature(block, false);
      }

      return true;
  }

  /* Return true if the given creature is allowed to attempt to move in
  * the given direction. Side effects can and will occur from calling
  * this function, as indicated by flags.
  */
  canmakemove(cr: Creature, dir: number, flags: number) {
      // _assert(cr);
      // _assert(dir !== Dir.NONE);

      let floor = this.floorat(cr.pos);
      switch (floor) {
        case TW.Wall_North:         if (dir & Dir.N) return false;           break;
        case TW.Wall_West:          if (dir & Dir.W) return false;            break;
        case TW.Wall_South:         if (dir & Dir.S) return false;           break;
        case TW.Wall_East:          if (dir & Dir.E) return false;            break;
        case TW.Wall_Southeast:     if (dir & (Dir.S | Dir.E)) return false;  break;
        case TW.IceWall_Northwest:  if (dir & (Dir.S | Dir.E)) return false;  break;
        case TW.IceWall_Northeast:  if (dir & (Dir.S | Dir.W)) return false;  break;
        case TW.IceWall_Southwest:  if (dir & (Dir.N | Dir.E)) return false;  break;
        case TW.IceWall_Southeast:  if (dir & (Dir.N | Dir.W)) return false;  break;
        case TW.Beartrap:
        case TW.CloneMachine:
          if (!(flags & CMM_RELEASING))
            return false;
        break;
      }
      if (isslide(floor) && (cr.id !== TW.Chip || !cr.hasForceboots) && this.getslidedir(floor, false) === back(dir)) {
        return false;
      }

      let y = Math.floor(cr.pos / LEVEL_SIZE);
      let x = cr.pos % LEVEL_SIZE;
      y += dir === Dir.N ? -1 : dir === Dir.S ? +1 : 0;
      x += dir === Dir.W ? -1 : dir === Dir.E ? +1 : 0;
      const to = y * LEVEL_SIZE + x;

      if (x < 0 || x >= LEVEL_SIZE)
        return false;
      if (y < 0 || y >= LEVEL_SIZE) {
        return false;
      }

      floor = this.floorat(to);
      if (this.state.togglestate) {
        if (floor === TW.SwitchWall_Open) floor = TW.SwitchWall_Closed
        else if (floor === TW.SwitchWall_Closed) floor = TW.SwitchWall_Open
      }

      if (cr.id === TW.Chip) {
        if (!(movelaws[floor][0] & dir)) return false;
        if (floor === TW.Socket && this.state.chipsNeeded > 0) return false;
        if (isdoor(floor) && !cr.hasKeyFor(floor)) return false;
        if (this.ismarkedanimated(to)) return false;
        const other = this.lookupcreature(to, false);
        if (other && other.id === TW.Block) {
          if (!this.canpushblock(other, dir, flags & ~CMM_RELEASING)) return false;
        }
        if (floor === TW.HiddenWall_Temp || floor === TW.BlueWall_Real) {
          if (flags & CMM_STARTMOVEMENT)
          this.setfloorat(to, TW.Wall);
          return false;
        }
      } else if (cr.id === TW.Block) {
        if (cr.moving > 0) return false;
        if (!(movelaws[floor][1] & dir)) return false;
        if (this.islocationclaimed(to)) return false;
        if (flags & CMM_CLEARANIMATIONS) {
          if (this.ismarkedanimated(to)) this.stopanimationat(to);
        }
      } else {
        if (!(movelaws[floor][2] & dir)) return false;
        if (this.islocationclaimed(to)) return false;
        if (floor === TW.Fire && cr.id !== TW.Fireball) return false;
        if (flags & CMM_CLEARANIMATIONS) {
          if (this.ismarkedanimated(to)) this.stopanimationat(to);
        }
      }

      return true;
  }

  /*
  * How everyone selects their move.
  */

  /* This function embodies the movement behavior of all the creatures.
  * Given a creature, this function enumerates its desired direction
  * of movement and selects the first one that is permitted.
  */
  choosecreaturemove(cr: Creature) {
    if (isanimation(cr.id)) return;

    cr.tdir = Dir.NONE;
    if (cr.id === TW.Block) return;
    if (getfdir(cr) !== Dir.NONE) return;
    const floor = this.floorat(cr.pos);
    if (floor === TW.CloneMachine || floor === TW.Beartrap) {
      cr.tdir = cr.dir;
      return;
    }

    const dir = cr.dir;
    let pdir = Dir.NONE;

    // _assert(dir !== Dir.NONE);

    const choices = [Dir.NONE, Dir.NONE, Dir.NONE, Dir.NONE];
    switch (cr.id) {
      case TW.Tank:
        choices[0] = dir;
        break;
      case TW.Ball:
        choices[0] = dir;
        choices[1] = back(dir);
        break;
      case TW.Glider:
        choices[0] = dir;
        choices[1] = left(dir);
        choices[2] = right(dir);
        choices[3] = back(dir);
        break;
      case TW.Fireball:
        choices[0] = dir;
        choices[1] = right(dir);
        choices[2] = left(dir);
        choices[3] = back(dir);
        break;
      case TW.Bug:
        choices[0] = left(dir);
        choices[1] = dir;
        choices[2] = right(dir);
        choices[3] = back(dir);
        break;
      case TW.Paramecium:
        choices[0] = right(dir);
        choices[1] = dir;
        choices[2] = left(dir);
        choices[3] = back(dir);
        break;
      case TW.Walker:
        choices[0] = dir;
        choices[1] = WALKER_TURN;
        break;
      case TW.Blob:
        choices[0] = BLOB_TURN;
        break;
      case TW.Teeth:
        if ((this.state.currenttime + this.state.stepping) & 4) return;
        let y = Math.floor(this.chippos() / LEVEL_SIZE) - Math.floor(cr.pos / LEVEL_SIZE);
        let x = this.chippos() % LEVEL_SIZE - cr.pos % LEVEL_SIZE;
        const n = y < 0 ? Dir.N : y > 0 ? Dir.S : Dir.NONE;
        if (y < 0) y = -y;
        const m = x < 0 ? Dir.W : x > 0 ? Dir.E : Dir.NONE;
        if (x < 0) x = -x;
        if (x > y) {
          choices[0] = m;
          choices[1] = n;
        } else {
          choices[0] = n;
          choices[1] = m;
        }
        pdir = choices[0];
        break;
    }

    for (let n = 0 ; n < 4 && choices[n] !== Dir.NONE ; ++n) {
      if (choices[n] === WALKER_TURN) {
        let m = this.state.lynx_prng() & 3;
        choices[n] = cr.dir;
        while (m--) {
          choices[n] = right(choices[n]);
        }
      } else if (choices[n] === BLOB_TURN) {
        const cw = [Dir.N, Dir.E, Dir.S, Dir.W];
        choices[n] = cw[random4(this.state.mainprng)];
      }
      cr.tdir = choices[n];
      if (this.canmakemove(cr, choices[n], CMM_CLEARANIMATIONS)) return;
    }

    if (pdir !== Dir.NONE) cr.tdir = pdir;
  }

  /* Determine the direction of Chip's next move. If discard is true,
  * then Chip is not currently permitted to select a direction of
  * movement, and the player's input should not be retained.
  */
  choosechipmove(cr: Creature, discard: boolean)
  {
      this.state.pushing = false;

      let dir = this.state.nextDirProvider ? this.state.nextDirProvider.getNextDir(this.state) : Dir.NONE;
      // console.log(`asking for chip dir at time ${this.state.currenttime}, got ${dir} discard ${discard}`)

      if (dir === Dir.NONE || discard || this.state.stuck) {
        cr.tdir = Dir.NONE;
        return;
      }

      cr.tdir = dir;

      if (cr.tdir !== Dir.NONE)
        dir = cr.tdir;
      else if (getfdir(cr) !== Dir.NONE)
        dir = getfdir(cr);
      else
        return;

      if (isdiagonal(dir)) {
        if (cr.dir & dir) {
            const f1 = this.canmakemove(cr, cr.dir, CMM_PUSHBLOCKS);
            const f2 = this.canmakemove(cr, cr.dir ^ dir, CMM_PUSHBLOCKS);
            dir = !f1 && f2 ? dir ^ cr.dir : cr.dir;
        } else {
            if (this.canmakemove(cr, dir & (Dir.E | Dir.W), CMM_PUSHBLOCKS))
              dir &= Dir.E | Dir.W;
            else
              dir &= Dir.N | Dir.S;
        }
        cr.tdir = dir;
      } else {
        this.canmakemove(cr, dir, CMM_PUSHBLOCKS);
      }
  }

  /* This function determines if the given creature is currently being
  * forced to move. (Ice, slide floors, and teleports are the three
  * possible causes of this. Bear traps and clone machines also cause
  * forced movement, but these are handled outside of the normal
  * movement sequence.) If so, the direction is stored in the
  * creature's fdir field, and true is returned unless the creature can
  * override the forced move.
  */
  getforcedmove(cr: Creature) {
      setfdir(cr, Dir.NONE);

      const floor = this.floorat(cr.pos);

      if (this.state.currenttime === 0)
        return false;

      if (isice(floor)) {
        if (cr.id === TW.Chip && cr.hasSkates) return false;
        if (cr.id === TW.Chip && this.state.stuck) return false;
        if (cr.dir === Dir.NONE) return false;
        setfdir(cr, cr.dir);
        return true;
      } else if (isslide(floor)) {
        if (cr.id === TW.Chip && cr.hasForceboots) return false;
        setfdir(cr, this.getslidedir(floor, true));
        return !(cr.state & CS_SLIDETOKEN);
      } else if (cr.state & CS_TELEPORTED) {
        cr.state &= ~CS_TELEPORTED;
        setfdir(cr, cr.dir);
        return true;
      }

      return false;
  }

  /* Return the move a creature will make on the current tick.
  */
  choosemove(cr: Creature) {
      if (cr.id === TW.Chip) {
        this.choosechipmove(cr, this.getforcedmove(cr));
        if (cr.tdir === Dir.NONE && getfdir(cr) === Dir.NONE)
        this.resetfloorsounds(false);
      } else {
        if (this.getforcedmove(cr))
          cr.tdir = Dir.NONE;
        else
          this.choosecreaturemove(cr);
      }

      return cr.tdir !== Dir.NONE || getfdir(cr) !== Dir.NONE;
  }

  /* Update the location that Chip is currently moving into (and reset
  * the pointer to the creature that Chip is colliding with).
  */
  checkmovingto() {
      const cr = this.getchip();
      const dir = cr.tdir;
      if (dir === Dir.NONE || isdiagonal(dir)) {
        this.state.chiptopos = -1;
        this.state.chiptocr = null;
        return;
      }

      this.state.chiptopos = cr.pos + delta[dir];
      this.state.chiptocr = null;
  }

  /*
  * Special movements.
  */

  /* Teleport the given creature instantaneously from one teleport tile
  * to another.
  */
  teleportcreature(cr: Creature) {
      // _assert(floorat(cr.pos) === Teleport);

      const origpos = cr.pos;
      let pos = cr.pos;

      for (;;) {
        --pos;
        if (pos < 0)
            pos += LEVEL_SIZE * LEVEL_SIZE;
        if (this.floorat(pos) === TW.Teleport) {
            if (cr.id !== TW.Chip)
            this.removeclaim(cr.pos);
            cr.pos = pos;
            if (!this.islocationclaimed(pos) && this.canmakemove(cr, cr.dir, 0))
              break;
            if (pos === origpos) {
              if (cr.id === TW.Chip)
                this.state.stuck = true;
              else
                this.claimlocation(cr.pos);
              return false;
            }
        }
        else if (this.ismarkedteleport(pos)) {
          this.setfloorat(pos, TW.Teleport);
            if (pos === this.chippos())
              this.getchip().hidden = true;
        }
      }

      if (cr.id === TW.Chip) {
        this.addsoundeffect(sound.SND_TELEPORTING);
      } else {
        this.claimlocation(cr.pos);
      }
      cr.state |= CS_TELEPORTED;
      return true;
  }

  /* Release a creature currently inside a clone machine. If the
  * creature successfully exits, a new clone is created to replace it.
  */
  activatecloner(pos: number) {
      if (pos < 0)
        return false;
      if (pos >= LEVEL_SIZE * LEVEL_SIZE) {
        console.log(`WARN: Off-map cloning attempted: (${pos % LEVEL_SIZE}, ${Math.floor(pos / LEVEL_SIZE)})`);
        return false;
      }
      if (this.floorat(pos) !== TW.CloneMachine) {
        console.log(`WARN: Red button not connected to a clone machine at (${pos % LEVEL_SIZE}, ${Math.floor(pos / LEVEL_SIZE)})`);
        return false;
      }
      const cr = this.lookupcreature(pos, true);
      if (!cr) return false;

      let clone = this.newcreature();
      clone.pos = cr.pos;
      clone.id = cr.id;
      clone.dir = cr.dir;
      clone.moving = cr.moving;
      clone.frame = cr.frame;
      clone.hidden = cr.hidden;
      clone.state = cr.state;
      clone.tdir = cr.tdir;

      if (this.advancecreature(cr, true) <= 0) {
        clone.hidden = true;
        return false;
      }
      return true;
  }

  /* Release any creature on a beartrap at the given location.
  */
  springtrap(pos: number) {
      if (pos < 0)
        return;
      if (pos >= LEVEL_SIZE * LEVEL_SIZE) {
        console.log(`WARN: Off-map trap opening attempted: (${pos % LEVEL_SIZE}, ${Math.floor(pos / LEVEL_SIZE)})`);
        return;
      }
      if (!this.ismarkedbeartrap(pos)) {
        console.log(`WARN: Brown button not connected to a beartrap at (${pos % LEVEL_SIZE}, ${Math.floor(pos / LEVEL_SIZE)})`);
        return;
      }
      const cr = this.lookupcreature(pos, true);
      if (cr && cr.dir !== Dir.NONE)
        this.advancecreature(cr, true);
  }

  /*
  * When something actually moves.
  */

  /* Initiate a move by the given creature. The direction of movement is
  * given by the tdir field, or the fdir field if tdir is Dir.NONE.
  * releasing must be true if the creature is moving out of a bear trap
  * or clone machine. +1 is returned if the creature succeeded in
  * moving, 0 is returned if the move could not be initiated, and -1 is
  * returned if the creature was killed in the attempt.
  */
  startmovement(cr: Creature, releasing: boolean) {
      // _assert(cr.moving <= 0);

      let dir;
      if (cr.tdir !== Dir.NONE)
        dir = cr.tdir;
      else if (getfdir(cr) !== Dir.NONE)
        dir = getfdir(cr);
      else
        return 0;
      // _assert(!isdiagonal(dir));

      cr.dir = dir;
      const floorfrom = this.floorat(cr.pos);

      if (cr.id === TW.Chip) {
        if (!cr.hasForceboots) {
            if (isslide(floorfrom) && cr.tdir === Dir.NONE)
              cr.state |= CS_SLIDETOKEN;
            else if (!isice(floorfrom) || cr.hasSkates)
              cr.state &= ~CS_SLIDETOKEN;
        }
      }

      if (!this.canmakemove(cr, dir, CMM_PUSHBLOCKSNOW
                                | CMM_CLEARANIMATIONS
                                | CMM_STARTMOVEMENT
                                | (releasing ? CMM_RELEASING : 0))) {
        if (cr.id === TW.Chip) {
            if (!this.state.couldntmove) {
              this.state.couldntmove = true;
              this.addsoundeffect(sound.SND_CANT_MOVE);
            }
            this.state.pushing = true;
        }
        if (isice(floorfrom) && (cr.id !== TW.Chip || !cr.hasSkates)) {
            cr.dir = back(dir);
            this.applyicewallturn(cr);
        }
        return 0;
      } else {
        if (cr.id === TW.Chip && this.state.chiptopos >= 0) {
          // chip initiated a successful move
          this.state.chiplastmovetime = this.state.currenttime;
        }
      }


      // if (floorfrom === T.CloneMachine || floorfrom === T.Beartrap)
        // _assert(releasing);

      if (cr.id !== TW.Chip) {
        this.removeclaim(cr.pos);
        if (cr.id !== TW.Block && cr.pos === this.state.chiptopos)
          this.state.chiptocr = cr;
      } else if (this.state.chiptocr && !this.state.chiptocr?.hidden) {
        if (this.state.chiptocr) this.state.chiptocr.moving = 8;
        this.removechip(ismonster(this.state.chiptocr.id) ? EndReasons.Monster : EndReasons.Block, this.state.chiptocr);
        return -1;
      }

      cr.pos += delta[dir];
      if (cr.id !== TW.Chip)
      this.claimlocation(cr.pos);

      cr.moving += 8;

      if (cr.id !== TW.Chip && cr.pos === this.chippos() && !this.getchip().hidden) {
        this.removechip(ismonster(cr.id) ? EndReasons.Monster : EndReasons.Block, cr);
        return -1;
      }
      if (cr.id === TW.Chip) {
        this.state.couldntmove = false;
        const other = this.lookupcreature(cr.pos, false);
        if (other) {
          this.removechip(ismonster(other.id) ? EndReasons.Monster : EndReasons.Block, other);
          return -1;
        }
      }

      if (cr.state & CS_PUSHED) {
        this.state.pushing = true;
        // addsoundeffect(SND_BLOCK_MOVING);
      }

      return +1;
  }

  /* Continue the given creature's move.
  */
  continuemovement(cr: Creature): boolean {
      if (isanimation(cr.id)) return true;

      // _assert(cr.moving > 0);

      if (cr.id === TW.Chip && this.state.stuck) return true;

      let speed = cr.id === TW.Blob ? 1 : 2;
      const floor = this.floorat(cr.pos);
      if (isslide(floor) && (cr.id !== TW.Chip || !cr.hasForceboots))
        speed *= 2;
      else if (isice(floor) && (cr.id !== TW.Chip || !cr.hasSkates))
        speed *= 2;
      cr.moving -= speed;
      cr.frame = Math.floor(cr.moving / 2);
      return (cr.moving > 0);
  }

  /* Complete the movement of the given creature. Most side effects
  * produced by moving onto a tile occur at this point. false is
  * returned if the creature is removed by the time the function
  * returns. If stationary is true, we are in pedantic mode and
  * handling creatures starting on top of something.
  */
  endmovement(cr: Creature, stationary: boolean) {
      let survived = true;

      // _assert(!stationary || pedanticmode);

      if (isanimation(cr.id)) return true;

      // _assert(cr.moving <= 0);

      const floor = this.floorat(cr.pos);

      // if (cr.id === T.Chip && putwall() !== -1) return true;

      if (cr.id === TW.Chip && !cr.hasSkates) this.applyicewallturn(cr);
      if (cr.id !== TW.Chip && !stationary) this.applyicewallturn(cr);

      if (cr.id === TW.Chip) {
        switch (floor) {
          case TW.Water:
            if (!cr.hasFlippers) {
              this.removechip(EndReasons.Water, null);
              survived = false;
            }
            break;
          case TW.Fire:
            if (stationary) break;
            if (!cr.hasFireboots) {
              this.removechip(EndReasons.Fire, null);
              survived = false;
            }
            break;
          case TW.Dirt:
          case TW.BlueWall_Fake:
            this.setfloorat(cr.pos, TW.Empty);
            // addsoundeffect(SND_TILE_EMPTIED);
            break;
          case TW.PopupWall:
            this.setfloorat(cr.pos, TW.Wall);
            this.addsoundeffect(sound.SND_WALL_CREATED);
            break;
          case TW.Door_Red:
          case TW.Door_Blue:
          case TW.Door_Yellow:
          case TW.Door_Green:
            if (!cr.hasKeyFor(floor)) console.log(`WARN: should not have been able to open door. This is a bug.`);
            cr.decKeyFor(floor);
            this.setfloorat(cr.pos, TW.Empty);
            this.addsoundeffect(sound.SND_DOOR_OPENED);
            break;
          case TW.Key_Red:
          case TW.Key_Blue:
          case TW.Key_Yellow:
          case TW.Key_Green:
            cr.incKeyFor(floor);
            this.setfloorat(cr.pos, TW.Empty);
            this.addsoundeffect(sound.SND_KEY_COLLECTED);
            break;
          case TW.Boots_Ice:
          case TW.Boots_Slide:
          case TW.Boots_Fire:
          case TW.Boots_Water:
            cr.setBootsFor(floor);
            this.setfloorat(cr.pos, TW.Empty);
            this.addsoundeffect(sound.SND_BOOTS_COLLECTED);
            break;
          case TW.Burglar:
            cr.hasSkates = false;
            cr.hasForceboots = false;
            cr.hasFireboots = false;
            cr.hasFlippers = false;
            this.addsoundeffect(sound.SND_BOOTS_STOLEN);
            break;
          case TW.ICChip:
            if (stationary) break;
            if (this.state.chipsNeeded) this.state.decChipsNeeded();
            this.setfloorat(cr.pos, TW.Empty);
            this.addsoundeffect(sound.SND_IC_COLLECTED);
            break;
          case TW.Socket:
            // _assert(stationary || this.state.chipsNeeded === 0);
            this.setfloorat(cr.pos, TW.Empty);
            this.addsoundeffect(sound.SND_SOCKET_OPENED);
            break;
          case TW.Exit:
            cr.hidden = true;
            this.state.completed = true;
            this.state.setGameOver(EndReasons.Exit);
            this.addsoundeffect(sound.SND_CHIP_WINS);
            break;
        }
      } else if (cr.id === TW.Block) {
        switch (floor) {
          case TW.Water:
            this.setfloorat(cr.pos, TW.Dirt);
            this.addsoundeffect(sound.SND_WATER_SPLASH);
            this.removecreature(cr, TW.Water_Splash);
            survived = false;
            break;
          case TW.Key_Blue:
            this.setfloorat(cr.pos, TW.Empty);
            break;
        }
      } else {
        switch (floor) {
          case TW.Water:
            if (cr.id !== TW.Glider) {
              this.addsoundeffect(sound.SND_WATER_SPLASH, sound.volume(cr, this.getchip()));
              this.removecreature(cr, TW.Water_Splash);
              survived = false;
            }
            break;
          case TW.Key_Blue:
            this.setfloorat(cr.pos, TW.Empty);
            break;
        }
      }

      if (!survived)
        return false;

      switch (floor) {
        case TW.Bomb:
          if (stationary) break;
          this.setfloorat(cr.pos, TW.Empty);
          if (cr.id === TW.Chip) {
            this.addsoundeffect(sound.SND_BOMB_EXPLODES);
            this.removechip(EndReasons.Bomb, null);
          } else {
            this.addsoundeffect(sound.SND_BOMB_EXPLODES, sound.volume(cr, this.getchip()));
            this.removecreature(cr, TW.Bomb_Explosion);
          }
          survived = false;
          break;
        case TW.Beartrap:
          if (stationary) break;
          // addsoundeffect(SND_TRAP_ENTERED);
          break;
        case TW.Button_Blue:
          if (stationary) break;
          this.turntanks();
          this.addsoundeffect(sound.SND_BUTTON_PUSHED, sound.volume(cr, this.getchip()));
          break;
        case TW.Button_Green:
          if (stationary) break;
          this.state.togglestate = !this.state.togglestate;
          this.addsoundeffect(sound.SND_BUTTON_PUSHED, sound.volume(cr, this.getchip()));
          break;
        case TW.Button_Red:
          if (stationary) break;
          if (this.activatecloner(this.clonerfrombutton(cr.pos)))
            this.addsoundeffect(sound.SND_BUTTON_PUSHED, sound.volume(cr, this.getchip()));
          break;
        case TW.Button_Brown:
          if (stationary) break;
          this.addsoundeffect(sound.SND_BUTTON_PUSHED, sound.volume(cr, this.getchip()));
          break;
        case TW.Dirt:
        case TW.BlueWall_Fake:
        case TW.Socket:
          // _assert(stationary);
          this.setfloorat(cr.pos, TW.Empty); /* No sound effect */
          break;
      }

      return survived;
  }

  /* Advance the movement of the given creature. If the creature is not
  * currently moving but should be, movement is initiated. If the
  * creature completes their movement, any and all appropriate side
  * effects are applied. If releasing is true, the movement is occuring
  * out-of-turn, as with movement across an open beatrap or an
  * activated clone machine. The return value is +1 if the creature
  * successfully moved (or successfully remained stationary), 0 if the
  * creature tried to move and failed, or -1 if the creature was killed
  * and exists no longer.
  */
  advancecreature(cr: Creature, releasing: boolean) {
      let tdir = Dir.NONE;

      if (cr.moving <= 0 && !isanimation(cr.id)) {
        if (releasing) {
            // _assert(cr.dir !== Dir.NONE);
            tdir = cr.tdir;
            cr.tdir = cr.dir;
        } else if (cr.tdir === Dir.NONE && getfdir(cr) === Dir.NONE) {
            return +1;
        }
        const f = this.startmovement(cr, releasing);
        if (f > 0) cr.hidden = false;
        if (f < 0) return f;
        if (f === 0) {
            if (releasing)
              cr.tdir = tdir;
            return 0;
        }
        cr.tdir = Dir.NONE;
      }

      if (!this.continuemovement(cr)) {
        if (!this.endmovement(cr, false))
            return -1;
      }

      return +1;
  }

  /*
  * Per-tick maintenance functions.
  */

  /* Actions and checks that occur at the start of every tick.
  */
  initialhousekeeping() {
      if (this.state.currenttime === 0) {
        this.laststepping = this.state.stepping;
      }

      const chip = this.getchip();
      if (chip && chip.id === TW.Pushing_Chip)
        chip.id = TW.Chip;

      if (!this.inendgame()) {
        if (this.state.completed) {
          this.startendgametimer();
        } else if (this.state.timelimitticks && this.state.currenttime >= this.state.timelimitticks) {
          this.removechip(EndReasons.Time, null);
        }
      }

      for (const cr of this.state.creatures) {
        if (cr !== this.getchip() && cr.hidden) continue;
        if (cr.state & CS_REVERSE) {
            cr.state &= ~CS_REVERSE;
            if (cr.moving <= 0)
              cr.dir = back(cr.dir);
        }
      }
      for (const cr of this.state.creatures) {
        if (cr.state & CS_PUSHED) {
            if (cr.hidden || cr.moving <= 0) {
              // stopsoundeffect(SND_BLOCK_MOVING);
              cr.state &= ~CS_PUSHED;
            }
        }
      }

      if (this.state.togglestate) {
        for (let pos = 0 ; pos < LEVEL_SIZE * LEVEL_SIZE ; ++pos) {
            if (this.floorat(pos) === TW.SwitchWall_Open) this.state.map[pos].top = TW.SwitchWall_Closed
            else if (this.floorat(pos) === TW.SwitchWall_Closed) this.state.map[pos].top = TW.SwitchWall_Open
        }
        this.state.togglestate = false;
      }

      this.state.chiptopos = -1;
      this.state.chiptocr = null;
  }

  /* Set the state fields specifically used to produce the output.
  */
  preparedisplay() {
      const chip = this.getchip();
      if (!chip) return;
      const floor = this.floorat(chip.pos);

      // this.state.xviewpos = (chip.pos % LEVEL_SIZE) * 8 + xviewoffset() * 8;
      // this.state.yviewpos = Math.floor(chip.pos / LEVEL_SIZE) * 8 + yviewoffset() * 8;
      // if (chip.moving) {
      //   switch (chip.dir) {
      //     case Dir.N: this.state.yviewpos += chip.moving; break;
      //     case Dir.W: this.state.xviewpos += chip.moving; break;
      //     case Dir.S: this.state.yviewpos -= chip.moving; break;
      //     case Dir.E: this.state.xviewpos -= chip.moving; break;
      //   }
      // }

      if (!chip.hidden) {
        if (floor === TW.HintButton && chip.moving <= 0)
          this.showhint();
        else
          this.hidehint();
        if (chip.id === TW.Chip && this.state.pushing)
            chip.id = TW.Pushing_Chip;
        if (chip.moving) {
          this.resetfloorsounds(false);
            // if (floor === T.Fire && chip.hasFireBoots)
            //   addsoundeffect(SND_FIREWALKING);
            // else if (floor === T.Water && chip.hasFlippers)
            //   addsoundeffect(SND_WATERWALKING);
            // else if (isice(floor)) {
            //   if (chip.hasSkates)
            //       addsoundeffect(SND_ICEWALKING);
            //   else if (floor === T.Ice)
            //       addsoundeffect(SND_SKATING_FORWARD);
            //   else
            //       addsoundeffect(SND_SKATING_TURN);
            // } else if (isslide(floor)) {
            //   if (chip.hasForceBoots)
            //       addsoundeffect(SND_SLIDEWALKING);
            //   else
            //       addsoundeffect(SND_SLIDING);
            // }
        }
        // if (this.state.stuck && isice(floor)) addsoundeffect(SND_SKATING_FORWARD);
      }
  }

  /* Initialize the gamestate structure to the state at the beginning of
  * the level, using the data in the associated gamesetup structure.
  * The level map is decoded and assembled, the list of creatures is
  * drawn up, and other miscellaneous initializations are performed.
  */
  initgame(): boolean {
      // num = this.state.game.number;

      let chipIdx = -1;
      for (let pos = 0; pos < LEVEL_SIZE * LEVEL_SIZE; ++pos) {
        const cell = this.state.map[pos];
        if (cell.top === TW.Block_Static) cell.top = crtile(TW.Block, Dir.N);
        if (cell.bottom === TW.Block_Static) cell.bottom = crtile(TW.Block, Dir.N);
        if (ismsspecial(cell.top) && cell.top !== TW.Exited_Chip) cell.top = TW.Wall;
        if (ismsspecial(cell.bottom) && cell.bottom !== TW.Exited_Chip) cell.bottom = TW.Wall;
        // if (cell.bottom !== T.Empty) {
        //   if (!isfloor(cell.bottom) || isfloor(cell.top)) {
        //           console.log(`WARN: level ${num}: invalid "buried" tile at (${pos % LEVEL_SIZE}, ${pos / LEVEL_SIZE})`);
        //         markinvalid();
        //   }
        // }

        if (iscreature(cell.top)) {
          const cr = new Creature();
          cr.pos = pos;
          cr.id = creatureid(cell.top);
          cr.dir = creaturedirid(cell.top);
          cr.moving = 0;
          cr.hidden = false;
          if (cr.id === TW.Chip) {
            if (chipIdx >= 0) {
              console.log('WARN: multiple Chips on the map');
            //   markinvalid();
            }
            chipIdx = this.state.creatures.length;
            cr.dir = Dir.S;
            cr.state = 0;
          } else {
            cr.state = 0;
            this.claimlocation(pos);
          }
          setfdir(cr, Dir.NONE);
          cr.tdir = Dir.NONE;
          cr.frame = 0;
          cell.top = cell.bottom;
          cell.bottom = TW.Empty;
          this.state.creatures.push(cr);
        }
        // if (pedanticmode)
        //   if (cell.top === Wall_North || cell.top === Wall_West)
        //     markinvalid();
        if (cell.top === TW.Beartrap) this.markbeartrap(pos);
        if (cell.top === TW.Teleport) this.markteleport(pos);
      }

      if (chipIdx < 0) {
        console.log("WARN: Chip isn't on the map");
        this.markinvalid();
        chipIdx = this.state.creatures.length - 1;
      }
      if (chipIdx > 0) {
        const crtemp = this.state.creatures[0];
        this.state.creatures[0] = this.state.creatures[chipIdx];
        this.state.creatures[chipIdx] = crtemp;
      }

      for (const link of this.state.trapLinks) {
        if (link.from.index() >= LEVEL_SIZE * LEVEL_SIZE || link.to.index() >= LEVEL_SIZE * LEVEL_SIZE) {
          console.log(`WARN: ignoring off-map beartrap wiring`);
          link.from = null;
        } else if (this.floorat(link.from.index()) !== TW.Button_Brown) {
          console.log(`WARN: invalid beartrap wiring: no button at (${link.from.x}, ${link.from.y})`);
        } else if (this.floorat(link.to.index()) !== TW.Beartrap) {
          console.log(`WARN: disabling miswired beartrap button at (${link.to.x}, ${link.to.y})`);
          link.from.disabled = true;
        }
      }
      for (const link of this.state.cloneLinks) {
        if (link.from.index() >= LEVEL_SIZE * LEVEL_SIZE || link.to.index() >= LEVEL_SIZE * LEVEL_SIZE) {
          console.log(`WARN: ignoring off-map cloner wiring`);
          link.from.disabled = true;
        } else if (this.floorat(link.from.index()) !== TW.Button_Red) {
          console.log(`WARN: invalid cloner wiring: no button at (${link.from.x}, ${link.from.y})`);
        } else if (this.floorat(link.to.index()) !== TW.CloneMachine) {
          console.log(`WARN: disabling miswired cloner button at (${link.to.x}, ${link.to.y})`);
          link.from.disabled = true;
        }
      }

      this.resetendgametimer();
      this.state.togglestate = false;
      this.state.couldntmove = false;
      this.state.pushing = false;
      this.state.stuck = false;
      this.state.completed = false;
      this.state.chiptopos = -1;
      this.state.chiptocr = null;
      this.state.prng1 = 0;
      this.state.prng2 = 0;
      this.state.stepping = this.laststepping;

      this.preparedisplay();
      this.state.soundeffects = [];
      return !this.ismarkedinvalid();
  }

  /* Advance the game state by one tick.
  */
  advancegame(): number {
    this.initialhousekeeping();

    for (let i = this.state.creatures.length - 1; i >= 0; i--) {
      const cr = this.state.creatures[i];
      setfdir(cr, Dir.NONE);
      cr.tdir = Dir.NONE;
      if (cr !== this.getchip() && cr.hidden) continue;
      if (isanimation(cr.id)) {
          --cr.frame;
          if (cr.frame < 0) this.removeanimation(cr);
          continue;
      }
      if (cr === this.getchip() && this.inendgame()) continue;
      if (cr.moving <= 0) this.choosemove(cr);
    }

    const cr = this.getchip();
    if (cr) {
      if (getfdir(cr) === Dir.NONE && cr.tdir === Dir.NONE)
        this.state.couldntmove = false;
      else
        this.checkmovingto();
    }

    for (let i = this.state.creatures.length - 1; i >= 0; i--) {
      const cr = this.state.creatures[i];
      if (cr === this.getchip() && this.state.completed) continue;
      if (cr !== this.getchip() && cr.hidden) continue;
      if (this.advancecreature(cr, false) < 0) continue;
      cr.tdir = Dir.NONE;
      setfdir(cr, Dir.NONE);
      // if (pedanticmode && floorat(cr.pos) === T.PopupWall) {
      //     if (cr !== getchip()) this.state.putwall = chippos();
      // }
      if (this.floorat(cr.pos) === TW.Button_Brown && cr.moving <= 0)
        this.springtrap(this.trapfrombutton(cr.pos));
    }

    for (let i = this.state.creatures.length - 1; i >= 0; i--) {
      const cr = this.state.creatures[i];
      if (cr.hidden) continue;
      if (cr.moving) continue;
      if (this.floorat(cr.pos) === TW.Teleport) this.teleportcreature(cr);
    }

    // if (putwall() !== -1) {
    //   if (!getchip().hidden) {
    //       if (floorat(chippos()) === T.Beartrap) springtrap(chippos());
    //       setfloorat(putwall(), T.Wall);
    //   }
    //   this.state.putwall = -1;
    // }

    this.preparedisplay();
    this.state.currenttime++;

    if (this.inendgame()) {
      --this.state.endgametimer
      if (!this.state.endgametimer) {
        this.resetfloorsounds(true);
        return this.state.completed ? +1 : -1;
      }
    }

    return 0;
  }
}
