import { TileSet, TILE_SIZE } from './tileset';

class CCTileSet extends TileSet {
  extractTile(image, code) {
    const tileCol = Math.floor(code / 16);
    const tileRow = (code % 16);
    const tileX = tileCol * TILE_SIZE;
    const tileY = tileRow * TILE_SIZE;
    if (tileCol <= 3) {
      return this._crop(image, tileX, tileY, TILE_SIZE, TILE_SIZE);
    } else {
      const maskCol = tileCol + 6;
      const maskX = maskCol * TILE_SIZE;
      const mask = this._createMask(this._crop(image, maskX, tileY, TILE_SIZE, TILE_SIZE));
      const content = this._crop(image, tileX, tileY, TILE_SIZE, TILE_SIZE);
      return this._mask(content, mask);
    }
  }
}

export { CCTileSet }
