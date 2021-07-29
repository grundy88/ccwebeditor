const TRANSPARENCY = [255, 0, 255];

const SPLASH_Y = 0;
const EXPLOSION_Y = 1;
const COLLISION_Y = 2;

const SOURCE_TILE_SIZE = 48;
const DEST_TILE_SIZE = 32;

const SSIZE = SOURCE_TILE_SIZE * 3;
const DSIZE = DEST_TILE_SIZE * 3;

// this is how many are in the file
const NUM_ANIMATION_FRAMES = 12;

// the y-value in the image at which animations are found
const IMAGE_ANIM_Y = 438;

// todo lots to do here, ultimately should support entire animated tileset
// currently only here to extract splash/explosion/collision animation frames

export class TWATileset {
  _crop(source, x, y, width, height, destWidth=width, destHeight=height) {
    const buffer = document.createElement('canvas');
    buffer.width = destWidth;
    buffer.height = destHeight;
    const ctx = buffer.getContext('2d');
    ctx.drawImage(source, x, y, width, height, 0, 0, destWidth, destHeight);
    return buffer;
  }

  // directly modify source image
  // find all pixels of color rgb and make them transparent
  _makeTransparent(source, rgb) {
    const ctx = source.getContext('2d');
    const data = ctx.getImageData(0, 0, source.width, source.height);
    var i = 0;
    while((i + 3) < data.data.length) {
      const r = data.data[i++];
      const g = data.data[i++];
      const b = data.data[i++];
      data.data[i++] = ((r === rgb[0]) && (g === rgb[1]) && (b === rgb[2])) ? 0 : 255;
    }
    ctx.putImageData(data, 0, 0);
    return source;
  }

  _scale(source, width, height) {
    return this._crop(source, 0, 0, source.width, source.height, width, height);
  }

  _getFrames(image, yoffset) {
    const frames = [];
    let x = 0;
    const y = IMAGE_ANIM_Y + yoffset * (SSIZE + 1);
    for (let i = 0; i < NUM_ANIMATION_FRAMES; i++, x += SSIZE) {
      frames.push(this._scale(this._makeTransparent(this._crop(image, x, y, SSIZE, SSIZE), TRANSPARENCY), DSIZE, DSIZE));
    }
    return frames;
  }

  constructor(image) {
    this.image = image;
    // hard coding T animation values to avoid circular dependency
    this.tiles = {
      0x7C: this._getFrames(image, SPLASH_Y),
      0x7D: this._getFrames(image, EXPLOSION_Y),
      0x7E: this._getFrames(image, COLLISION_Y),
    }
  }

  drawTile(ctx, code, x, y, frame=0) {
    // console.log(`DRAW ANIMATION code ${code} frame ${frame} at ${x},${y}`)
    const index = frame % this.tiles[code].length;
    ctx.drawImage(this.tiles[code][index], x-DEST_TILE_SIZE, y-DEST_TILE_SIZE);
  }
}
