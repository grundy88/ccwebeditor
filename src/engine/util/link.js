import { isLinkable } from '../tiles/tile';
import { pointForLayerIndex, layerIndexForPoint } from './utils';

export class Link {
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }

  isOn(level) {
    return this.from.level === level && this.to.level === level;
  }

  isIn(selection) {
    return this.from.isIn(selection) && this.to.isIn(selection);
  }

  isHalfwayOn(level) {
    return (this.from.level === level && this.to.level !== level)
        || (this.from.level !== level && this.to.level === level);
  }

  // for locations still on the source, check that the target tile is still a linkable tile
  isValid(sourceLevel, targetLevel) {
    if (this.from.level === sourceLevel) {
      if (!isLinkable(targetLevel.topLayer[this.from.index()]) && !isLinkable(targetLevel.bottomLayer[this.from.index()])) return false;
    }
    if (this.to.level === sourceLevel) {
      if (!isLinkable(targetLevel.topLayer[this.to.index()]) && !isLinkable(targetLevel.bottomLayer[this.to.index()])) return false;
    }
    return true;
  }

  copyToTargetLevel(targetLevel) {
    const from = new Location(this.from.x - targetLevel.origin.x, this.from.y - targetLevel.origin.y, targetLevel);
    const to = new Location(this.to.x - targetLevel.origin.x, this.to.y - targetLevel.origin.y, targetLevel);
    return new Link(from, to);
  }

  flipHorizontally() {
    this.from.flipHorizontally();
    this.to.flipHorizontally();
  }

  flipVertically() {
    this.from.flipVertically();
    this.to.flipVertically();
  }

  transpose() {
    this.from.transpose();
    this.to.transpose();
  }

  toString() {
    return `(${this.from.toString()}) on [${this.from.level.origin.x},${this.from.level.origin.y}] to (${this.to.toString()}) on [${this.to.level.origin.x},${this.to.level.origin.y}]`;
  }
}

export class Location {
  constructor() {
    if (arguments.length === 3) {
      // x, y, level
      this.x = arguments[0];
      this.y = arguments[1];
      this.level = arguments[2];
    } else if (arguments.length === 2) {
      // index, level
      this.level = arguments[1];
      [this.x, this.y] = pointForLayerIndex(arguments[0], this.level.size.w);
    }
  }

  update(x, y, level) {
    this.x = x;
    this.y = y;
    this.level = level;
  }

  index() {
    return layerIndexForPoint(this.x, this.y, this.level.size.w);
  }

  matches(other) {
    return this.isAt(other.x, other.y)
  }

  isAt(x, y) {
    return this.x === x && this.y === y;
  }

  isIn(selection) {
    return this.x >= selection.from.x && this.x <= selection.to.x &&
        this.y >= selection.from.y && this.y <= selection.to.y;
  }

  gameboardCoords() {
    return [this.x + this.level.origin.x, this.y + this.level.origin.y]
  }

  flipHorizontally() {
    this.x = this.level.size.w - this.x - 1;
  }

  flipVertically() {
    this.y = this.level.size.h - this.y - 1;
  }

  transpose() {
    const temp = this.x;
    this.x = this.y;
    this.y = temp;
  }

  rotateLeft() {
    this.flipHorizontally();
    this.transpose();
  }

  rotateRight() {
    this.flipVertically();
    this.transpose();
  }

  toString() {
    return `${this.x}, ${this.y}`;
  }
}

// ------------------------------------------------------------------

export function flipLocationHorizontally(location) {
  location.x = location.level.size.w - location.x - 1;
}

export function flipLocationVertically(location) {
  location.y = location.level.size.h - location.y - 1;
}

export function transposeLocation(location) {
  const temp = location.x;
  location.x = location.y;
  location.y = temp;
}

export function rotateLocationLeft(location) {
  flipLocationHorizontally(location);
  transposeLocation(location);
}

export function rotateLocationRight(location) {
  flipLocationVertically(location);
  transposeLocation(location);
}
