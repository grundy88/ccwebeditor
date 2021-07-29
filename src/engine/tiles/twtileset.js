import { TileSet, TILE_SIZE } from './tileset';

const TRANSPARENCY = [255, 0, 255];

class TWTileSet extends TileSet{
  extractTile(image, code) {
    const tileCol = Math.floor(code / 16);
    const tileRow = (code % 16);
    const tileX = tileCol * TILE_SIZE;
    const tileY = tileRow * TILE_SIZE;
    if (tileCol <= 3) {
      return this._crop(image, tileX, tileY, TILE_SIZE, TILE_SIZE);
    } else {
      return this._makeTransparent(this._crop(image, tileX, tileY, TILE_SIZE, TILE_SIZE), TRANSPARENCY);
    }
  }
}

export { TWTileSet }
