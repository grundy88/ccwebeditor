import { DEFAULT_LEVEL_SIZE, layerIndexForPoint, placeTile } from '../util/utils';
import { isChip, CC, flipTileHorizontally, flipTileVertically, rotateTileLeft, rotateTileRight } from '../tiles/tile'
import { copyCreature } from './creature';
import { applyDiff, makeDiff } from "../util/diff";
import { Link, Location } from '../util/link';

export class Level {
  // ------------------------------------------------------
  // straight from the levelset file

  levelNumber = null;
  title = '';
  password = '';
  timeLimit = '';
  numChipsRequired = '';
  hint = '';

  // Uint8Array of bytes, one byte per spot on the map
  topLayer = null;
  bottomLayer = null;

  // list of Creature objects (afaict monster order isn't used in lynx, so this is really editor only)
  creatures = [];

  // list of Location objects
  trapLinks = [];
  cloneLinks = [];

  origin = {x:0, y:0}
  size = {w:0, h:0}
  
  // ------------------------------------------------------
  // editor only
  sourceBytes = null; 
  editedAt = 0;

  setDirty = function() { this.editedAt = Date.now(); }
  setClean = function() { this.editedAt = 0; }
  
  setLevelNumber(n) {
    this.levelNumber = n;
    if (this.sourceBytes) {
      // this is the one thing we will patch directly in the bytes
      // I should find a better place for this, surely involving the writer
      // so as not to duplicate byte-manipulation code here
      this.sourceBytes[2] = n & 0xFF;
      this.sourceBytes[3] = (n >> 8) & 0xFF;
    }
  }

  topCode(index) {
    return this.topLayer[index];
  }

  setTopCode(index, code) {
    this.topLayer[index] = code;
  }

  bottomCode(index) {
    return this.bottomLayer[index];
  }

  setBottomCode(index, code) {
    this.bottomLayer[index] = code;
  }

  countChips() {
    let count = this.topLayer.reduce((count,tile) => tile === CC.COMPUTER_CHIP.code ? count+1 : count, 0);
    count += this.bottomLayer.reduce((count,tile) => tile === CC.COMPUTER_CHIP.code ? count+1 : count, 0);
    return count;
  }

  findChip() {
    const reversedChipIndex = this.topLayer.slice().reverse().findIndex(code => isChip(code));
    if (reversedChipIndex >= 0) return this.topLayer.length - reversedChipIndex - 1;
    return -1;
  }

  toggleWalls() {
    this.topLayer.forEach((code,i) => {
      if (code === CC.TOGGLE_WALL_CLOSED.code) this.topLayer[i] = CC.TOGGLE_WALL_OPEN.code;
      else if (code === CC.TOGGLE_WALL_OPEN.code) this.topLayer[i] = CC.TOGGLE_WALL_CLOSED.code;
    });
    this.bottomLayer.forEach((code,i) => {
      if (code === CC.TOGGLE_WALL_CLOSED.code) this.bottomLayer[i] = CC.TOGGLE_WALL_OPEN.code;
      else if (code === CC.TOGGLE_WALL_OPEN.code) this.bottomLayer[i] = CC.TOGGLE_WALL_CLOSED.code;
    });
  }

  setTimeLimit(s) {
    this.timeLimit = s;
  }

  location(x, y) {
    return new Location(x, y, this);
  }

  extractSection(selection) {
    const origin = {x:selection.from.x, y:selection.from.y}
    const size = {w:selection.to.x - selection.from.x + 1, h:selection.to.y - selection.from.y + 1}
    const target = new Level().initialize(origin, size);
  
    for (let tx = 0; tx < size.w; tx++) {
      for (let ty = 0; ty < size.h; ty++) {
        const ox = tx + origin.x;
        const oy = ty + origin.y;
        if (ox >= 0 && ox < this.size.w && oy >= 0 && oy < this.size.h) {
          const sourceIndex = layerIndexForPoint(ox, oy, this.size.w);
          placeTile(target, tx, ty, this.topLayer[sourceIndex], true);
          placeTile(target, tx, ty, this.bottomLayer[sourceIndex], false);
        }
      }
    }

    // add links to the extracted level only if both ends of the link
    // are in the extracted rectangle
    target.trapLinks = this.trapLinks.filter(link => link.isIn(selection)).map(link => link.copyToTargetLevel(target));
    target.cloneLinks = this.cloneLinks.filter(link => link.isIn(selection)).map(link => link.copyToTargetLevel(target));

    return target;
  }

  // merge other level on top of this one - return new level
  merge(otherLevel) {
    const target = this.copy();

    // clear off the merge destination
    target.replaceRect(otherLevel);
    
    // for all links with one location on this level and one on another,
    // copy link's locations from this to the target level
    this.copyMixedLinks(this.trapLinks, target, target.trapLinks);
    this.copyMixedLinks(this.cloneLinks, target, target.cloneLinks);

    // merge the tiles
    for (let ox = 0; ox < otherLevel.size.w; ox++) {
      for (let oy = 0; oy < otherLevel.size.h; oy++) {
        const sourceIndex = layerIndexForPoint(ox, oy, otherLevel.size.w);
        const tx = ox + otherLevel.origin.x;
        const ty = oy + otherLevel.origin.y;
        if (tx >= 0 && tx < target.size.w && ty >= 0 && ty < target.size.h) {
          if (otherLevel.topLayer[sourceIndex] !== CC.NONE.code) placeTile(target, tx, ty, otherLevel.topLayer[sourceIndex], true);
          if (otherLevel.bottomLayer[sourceIndex] !== CC.NONE.code) placeTile(target, tx, ty, otherLevel.bottomLayer[sourceIndex], false);
        }
      }
    }

    // copy all links completely contained in the merge source
    this.copyContainedLinks(otherLevel.trapLinks, otherLevel, target, target.trapLinks);
    this.copyContainedLinks(otherLevel.cloneLinks, otherLevel, target, target.cloneLinks);
    
    return target;
  }
  
  replaceRect(rect, tool = CC.FLOOR.code) {
    for (let ox = 0; ox < rect.size.w; ox++) {
      for (let oy = 0; oy < rect.size.h; oy++) {
        const sourceIndex = layerIndexForPoint(ox, oy, rect.size.w);
        const tx = ox + rect.origin.x;
        const ty = oy + rect.origin.y;
        if (tx >= 0 && tx < this.size.w && ty >= 0 && ty < this.size.h) {
          if (!rect.topLayer || rect.topLayer[sourceIndex] !== CC.NONE.code) placeTile(this, tx, ty, tool, true);
          if (!rect.bottomLayer || rect.bottomLayer[sourceIndex] !== CC.NONE.code) placeTile(this, tx, ty, tool, false);
          // placeTile(this, tx, ty, tool, true);
          // placeTile(this, tx, ty, tool, false);
        }
      }
    }
  }

  reset(rect) {
    if (rect) {
      this.origin = rect.origin;
      this.size = rect.size;
    }
    this.topLayer.fill(CC.NONE.code);
    this.bottomLayer.fill(CC.NONE.code);
    return this;
  }

  flipHorizontally(tilef = (t) => flipTileHorizontally(t)) {
    for (let ty = 0; ty < this.size.h; ty++) {
      for (let tx1 = 0, tx2 = this.size.w - 1; tx1 < this.size.w / 2; tx1++, tx2--) {
        const i1 = layerIndexForPoint(tx1, ty, this.size.w);
        const i2 = layerIndexForPoint(tx2, ty, this.size.w);
        const temp1 = this.topLayer[i1];
        this.topLayer[i1] = tilef(this.topLayer[i2]);
        this.topLayer[i2] = tilef(temp1);
        const temp2 = this.bottomLayer[i1];
        this.bottomLayer[i1] = tilef(this.bottomLayer[i2]);
        this.bottomLayer[i2] = tilef(temp2);
      }
    }
    this.trapLinks.forEach(link => link.flipHorizontally());
    this.cloneLinks.forEach(link => link.flipHorizontally());
  }

  flipVertically(tilef = (t) => flipTileVertically(t)) {
    for (let tx = 0; tx < this.size.w; tx++) {
      for (let ty1 = 0, ty2 = this.size.h - 1; ty1 < this.size.h / 2; ty1++, ty2--) {
        const i1 = layerIndexForPoint(tx, ty1, this.size.w);
        const i2 = layerIndexForPoint(tx, ty2, this.size.w);
        const temp1 = this.topLayer[i1];
        this.topLayer[i1] = tilef(this.topLayer[i2]);
        this.topLayer[i2] = tilef(temp1);
        const temp2 = this.bottomLayer[i1];
        this.bottomLayer[i1] = tilef(this.bottomLayer[i2]);
        this.bottomLayer[i2] = tilef(temp2);
      }
    }
    this.trapLinks.forEach(link => link.flipVertically());
    this.cloneLinks.forEach(link => link.flipVertically());
  }

  // actual transposition
  _transpose(tilef = (t) => t) {
    const w = this.size.w;
    const h = this.size.h;
    const topLayer = new Uint8Array(w * h);
    const bottomLayer = new Uint8Array(h * w);

    for (let tx = 0; tx < this.size.w; tx++) {
      for (let ty = 0; ty < this.size.h; ty++) {
        const i1 = layerIndexForPoint(tx, ty, w);
        const i2 = layerIndexForPoint(ty, tx, h);
        topLayer[i2] = tilef(this.topLayer[i1]);
        bottomLayer[i2] = tilef(this.bottomLayer[i1]);
      }
    }
    this.topLayer = topLayer;
    this.bottomLayer = bottomLayer;
    this.size = {w: h, h: w};

    this.trapLinks.forEach(link => link.transpose());
    this.cloneLinks.forEach(link => link.transpose());
  }

  rotateLeft() {
    this.flipHorizontally((t) => t);
    this._transpose((t) => rotateTileLeft(t));
  }

  rotateRight() {
    this.flipVertically((t) => t);
    this._transpose((t) => rotateTileRight(t));
  }

  // doing transpose this way to avoid messy code
  // within the the actual transposition function
  // for determining per-tile rotation on the diagonal
  transpose() {
    this.rotateRight();
    this.flipHorizontally();
  }

  drawRect(tool, onTopLayer) {
    const layer = onTopLayer ? this.topLayer : this.bottomLayer;
    for (let tx = 0; tx < this.size.w; tx++) {
      layer[layerIndexForPoint(tx, 0, this.size.w)] = tool;
      layer[layerIndexForPoint(tx, this.size.h - 1, this.size.w)] = tool;
    }
    for (let ty = 1; ty < this.size.h - 1; ty++) {
      layer[layerIndexForPoint(0, ty, this.size.w)] = tool;
      layer[layerIndexForPoint(this.size.w - 1, ty, this.size.w)] = tool;
    }
  }

  fillRect(tool, onTopLayer, x=0, y=0, w=this.size.w, h=this.size.h) {
    const layer = onTopLayer ? this.topLayer : this.bottomLayer;
    for (let tx = x; tx < x+w; tx++) {
      for (let ty = y; ty < y+h; ty++) {
        layer[layerIndexForPoint(tx, ty, this.size.w)] = tool;
      }
    }
  }

  // horizontal line from start_index to end_index
  line(tool, layer, start_index, end_index) {
    for (let i = start_index; i <= end_index; i++) layer[i] = tool;
  }

  // plot line endpoints at start_index and end_index only
  endpoints(tool, layer, start_index, end_index) {
    layer[start_index] = tool;
    layer[end_index] = tool;
  }

  // with x,y known for quadrant 1, plot it and the other 3 quadrants
  _ellipsesymmetrydraw(tool, layer, plotf, x, y, xc, yc) {
    const q1 = layerIndexForPoint(Math.ceil(x + xc), Math.ceil(y + yc), this.size.w);
    const q2 = layerIndexForPoint(Math.floor(-x + xc), Math.ceil(y + yc), this.size.w);
    const q3 = layerIndexForPoint(Math.floor(-x + xc), Math.floor(-y + yc), this.size.w);
    const q4 = layerIndexForPoint(Math.ceil(x + xc), Math.floor(-y + yc), this.size.w);
    plotf(tool, layer, q2, q1);
    plotf(tool, layer, q3, q4);
  }

  // adapted from https://www.geeksforgeeks.org/midpoint-ellipse-drawing-algorithm/
  _ellipse(tool, onTopLayer, plotf) {
    const layer = onTopLayer ? this.topLayer : this.bottomLayer;
  
    // horizontal radius
    const a = Math.floor((this.size.w - 1) / 2);
    // vertical radius
    const b = Math.floor((this.size.h - 1) / 2);
    // center point
    const xc = (this.size.w - 1) / 2;
    const yc = (this.size.h - 1) / 2;

    if (a === 0 || b === 0) {
      this.drawRect(tool, onTopLayer);
      return;
    }

    let x = 0;
    let y = b;
  
    // region 1
    let d1 = (b * b) - (a * a * b) + (0.25 * a * a);
    let dx = 2 * b * b * x;
    let dy = 2 * a * a * y;
  
    while (dx < dy) {
      this._ellipsesymmetrydraw(tool, layer, plotf, x, y, xc, yc);

      x++;
      if (d1 < 0) {
        dx += 2 * b * b;
        d1 += dx + (b * b);
      } else {
        y--;
        dx += 2 * b * b;
        dy -= 2 * a * a;
        d1 += dx - dy + (b * b);
      }
    }
     
    // region 2
    let d2 = ((b * b) * ((x + 0.5) * (x + 0.5))) +
          ((a * a) * ((y - 1) * (y - 1))) -
          (a * a * b * b);

    while (y >= 0) {
      this._ellipsesymmetrydraw(tool, layer, plotf, x, y, xc, yc);

      y--;
      if (d2 >= 0) {
        dy -= 2 * a * a;
        d2 += (a * a) - dy;
      } else {
        x++;
        dx += 2 * b * b;
        dy -= 2 * a * a;
        d2 += dx - dy + (a * a);
      }
    }
  }

  drawEllipse(tool, onTopLayer) {
    this._ellipse(tool, onTopLayer, this.endpoints);
  }

  fillEllipse(tool, onTopLayer) {
    this._ellipse(tool, onTopLayer, this.line);
  }

  // ------------------------------------------------------

  copyContainedLinks(links, otherLevel, targetLevel, targetLinks) {
    for (const link of links) {
      const fx = link.from.x + otherLevel.origin.x;
      const fy = link.from.y + otherLevel.origin.y;
      const tx = link.to.x + otherLevel.origin.x;
      const ty = link.to.y + otherLevel.origin.y;
      if (tx >= 0 && tx < targetLevel.size.w && ty >= 0 && ty < targetLevel.size.h &&
        fx >= 0 && fx < targetLevel.size.w && fy >= 0 && fy < targetLevel.size.h)
      {
        const from = new Location(fx, fy, targetLevel);
        const to = new Location(tx, ty, targetLevel);
        targetLinks.push(new Link(from, to));
      }
    }
  }

  copyMixedLinks(links, target, targetLinks) {
    links
        .filter(link => link.isHalfwayOn(this) && link.isValid(this, target))
        .forEach(link => {
          const l = this.copyMixedLink(link, target);
          if (l) targetLinks.push(l)
        });
  }

  copyMixedLink(link, targetLevel) {
    const fx = link.from.x + link.from.level.origin.x - this.origin.x;
    const fy = link.from.y + link.from.level.origin.y - this.origin.y;
    const tx = link.to.x + link.to.level.origin.x - this.origin.x;
    const ty = link.to.y + link.to.level.origin.y - this.origin.y;
    if (tx >= 0 && tx < targetLevel.size.w && ty >= 0 && ty < targetLevel.size.h &&
        fx >= 0 && fx < targetLevel.size.w && fy >= 0 && fy < targetLevel.size.h)
    {
      const from = new Location(fx, fy, targetLevel);
      const to = new Location(tx, ty, targetLevel);
      return new Link(from, to);
    }
  }

  copyLink(link, targetLevel) {
    const from = new Location(link.from.x, link.from.y, targetLevel);
    const to = new Location(link.to.x, link.to.y, targetLevel);
    return new Link(from, to);
  }
  
  copy() {
    const copy = new Level();
    copy.origin = {...this.origin};
    copy.size = {...this.size};
    copy.levelNumber = this.levelNumber;
    copy.title = this.title;
    copy.password = this.password;
    copy.timeLimit = this.timeLimit;
    copy.numChipsRequired = this.numChipsRequired;
    copy.hint = this.hint;
    
    copy.topLayer = Uint8Array.from(this.topLayer);
    copy.bottomLayer = Uint8Array.from(this.bottomLayer);
  
    copy.creatures = this.creatures.map(cr => copyCreature(cr));

    // only copy links with both locations on this level (and put the copies on the new level)
    copy.trapLinks = this.trapLinks.filter(link => link.isOn(this)).map(link => this.copyLink(link, copy));
    copy.cloneLinks = this.cloneLinks.filter(link => link.isOn(this)).map(link => this.copyLink(link, copy));
    
    return copy;
  }
  
  // ------------------------------------------------------

  constructor(levelNum = null) {
    this.levelNumber = levelNum;
  }

  initialize(origin = {x:0, y:0}, size = {w:DEFAULT_LEVEL_SIZE, h:DEFAULT_LEVEL_SIZE}, tile = CC.FLOOR.code) {
    this.origin = origin;
    this.size = size;
    this.topLayer = new Uint8Array(size.w * size.h).fill(tile);
    this.bottomLayer = new Uint8Array(size.w * size.h).fill(tile);
    return this;
  }
}

// ============================================================================

const diffschema = {
  1: {type: 'array', numBits: 10, field: 'topLayer', objects: {type: 'number', numBits: 8}},
  2: {type: 'array', numBits: 10, field: 'bottomLayer', objects: {type: 'number', numBits: 8}},
  10: {type: 'array', numBits: 10, field: 'trapLinks', objects: {type: 'Link'}},
  11: {type: 'array', numBits: 10, field: 'cloneLinks', objects: {type: 'Link'}},
  20: {type: 'array', numBits: 10, field: 'creatures', objects: {type: 'Creature', fields: ['pos', 'id'], numBits: [10, 10]}},
};

export function makeLevelDiff(level1, level2) {
  return makeDiff(diffschema, level1, level2);
}

export function applyLevelDiff(diff, level) {
  applyDiff(diffschema, diff, level);
}
