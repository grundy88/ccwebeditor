/* 
 * Adapted for Typescript from Tile World source code.
 *
 * Copyright (C) 2001-2021 by Brian Raiter,
 * under the GNU General Public License. No warranty. See COPYING for details.
 */

import { Dir } from "../logic/dir";
import { TW, CCtoTW } from "../logic/twtile";
import { TILE_SIZE } from "../tiles/tileset";
import { layerIndexForPoint, pointForLayerIndex, TICKS_PER_STEP } from "../util/utils";

export class Creature {
  pos: number = 0;      /* creature's location */
  id: number = 0;       /* type of creature */
  dir: number = 0;      /* current direction of creature */
  moving: number = 0;   /* positional offset of creature */
  frame: number = 0;    /* explicit animation index */
  hidden: boolean = false;  /* TRUE if creature is invisible */
  state: number = 0;    /* internal state value */
  tdir: number = 0;     /* internal state value */

  hasFlippers = false;
  hasFireboots = false;
  hasSkates = false;
  hasForceboots = false;
  numBlueKeys = 0;
  numRedKeys = 0;
  numYellowKeys = 0;
  numGreenKeys = 0;

  constructor(x?: number, y?: number, code?: number) {
    if (x !== undefined && y !== undefined) this.pos = layerIndexForPoint(x, y);
    if (code) this.id = CCtoTW[code];
  }

  hasKeyFor(twtile: number): boolean {
    switch (twtile) {
      case TW.Door_Red:           return this.numRedKeys > 0;
      case TW.Door_Blue:          return this.numBlueKeys > 0;
      case TW.Door_Yellow:        return this.numYellowKeys > 0;
      case TW.Door_Green:         return this.numGreenKeys > 0;
      // case TW.Ice:                return this.hasSkates;
      // case TW.IceWall_Northwest:  return this.hasSkates;
      // case TW.IceWall_Northeast:  return this.hasSkates;
      // case TW.IceWall_Southwest:  return this.hasSkates;
      // case TW.IceWall_Southeast:  return this.hasSkates;
      // case TW.Slide_North:        return this.hasSkates;
      // case TW.Slide_West:         return this.hasSkates;
      // case TW.Slide_South:        return this.hasSkates;
      // case TW.Slide_East:         return this.hasSkates;
      // case TW.Slide_Random:       return this.hasSkates;
      // case TW.Fire:               return this.hasFireboots;
      // case TW.Water:              return this.hasFlippers;
      default: return false;
    }
  }

  decKeyFor(twtile: number) {
    switch (twtile) {
      case TW.Door_Red:           if (this.numRedKeys > 0) this.numRedKeys--; break;
      case TW.Door_Blue:          if (this.numBlueKeys > 0) this.numBlueKeys--; break;
      case TW.Door_Yellow:        if (this.numYellowKeys > 0) this.numYellowKeys--; break;
      case TW.Door_Green:         /* keep green keys forever */ break;
      default:
    }
  }

  incKeyFor(twtile: number) {
    // yup, original logic has num keys wrapping around to 0 if more than 255 collected (including green)
    switch (twtile) {
      case TW.Key_Red:           this.numRedKeys++; if (this.numRedKeys > 255) this.numRedKeys = 0; break;
      case TW.Key_Blue:          this.numBlueKeys++; if (this.numRedKeys > 255) this.numRedKeys = 0; break;
      case TW.Key_Yellow:        this.numYellowKeys++; if (this.numRedKeys > 255) this.numRedKeys = 0; break;
      case TW.Key_Green:         this.numGreenKeys++; if (this.numGreenKeys > 255) this.numGreenKeys = 0; break;
      default:
    }
  }

  setBootsFor(twtile: number) {
    switch (twtile) {
      case TW.Boots_Ice:    this.hasSkates = true; break;
      case TW.Boots_Fire:   this.hasFireboots = true; break;
      case TW.Boots_Slide:  this.hasForceboots = true; break;
      case TW.Boots_Water:  this.hasFlippers = true; break;
      default:
    }
  }
}

export function getCreatureLocation(cr: Creature) {
  if (!cr) return [-1, -1];
  const pos = cr.pos;
  const frame = cr.moving / 2;  // hard coded per lynx logic
  const dir = cr.dir;
  const [tx, ty] = pointForLayerIndex(pos);
  let pixelx = TILE_SIZE * tx;
  let pixely = TILE_SIZE * ty;
  if (frame) {
    switch (dir) {
      case Dir.N: pixely = pixely + (frame * (TILE_SIZE / TICKS_PER_STEP)); break;
      case Dir.S: pixely = pixely - (frame * (TILE_SIZE / TICKS_PER_STEP)); break;
      case Dir.W: pixelx = pixelx + (frame * (TILE_SIZE / TICKS_PER_STEP)); break;
      case Dir.E: pixelx = pixelx - (frame * (TILE_SIZE / TICKS_PER_STEP)); break;
      default:
    }
  }
  return [pixelx, pixely];
}

export function copyCreature(other: Creature) {
  const newcr = new Creature();
  newcr.pos = other.pos;
  newcr.id = other.id;
  newcr.dir = other.dir;
  newcr.moving = other.moving;
  newcr.frame = other.frame;
  newcr.hidden = other.hidden;
  newcr.state = other.state;
  newcr.tdir = other.tdir;
  newcr.hasFlippers = other.hasFlippers;
  newcr.hasFireboots = other.hasFireboots;
  newcr.hasSkates = other.hasSkates;
  newcr.hasForceboots = other.hasForceboots;
  newcr.numBlueKeys = other.numBlueKeys;
  newcr.numRedKeys = other.numRedKeys;
  newcr.numYellowKeys = other.numYellowKeys;
  newcr.numGreenKeys = other.numGreenKeys;
  return newcr;
}
