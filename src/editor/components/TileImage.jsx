import React, { useCallback } from 'react';
import { TILE_SIZE, drawArrow } from '../../engine/tiles/tileset'
import { observer } from 'mobx-react-lite';
import { useEditorState } from '../EditorState';

const TileImage = observer(({tile, size=TILE_SIZE, onTile, num, clicked, rightClicked}) => {
  const editorState = useEditorState();

  const canvas = useCallback(c => {
    if (c !== null) {
      const ctx = c.getContext('2d');
      ctx.save();
      ctx.scale(size / TILE_SIZE, size / TILE_SIZE);
      ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
      if (onTile) editorState.tileset.drawTile(ctx, onTile.code, 0, 0);
      editorState.tileset.drawTile(ctx, tile.code, 0, 0);

      if (num > 1) {
        const radius = 7;
        const cx = TILE_SIZE - radius;
        const cy = radius;
        ctx.fillStyle = "pink";
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI*2);
        ctx.fill();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "12px sans-serif";
        ctx.strokeText(num, cx, cy);
      }

      drawArrow(ctx, tile, 0, 0);

      ctx.restore();
    }
  }, [tile, size, onTile, num, editorState.tileset]);

  function _clicked() {
    if (clicked) clicked(tile);
  }

  function _rightClicked(e) {
    if (rightClicked) rightClicked(e, tile);
  }

  return (
    <canvas ref={canvas} width={size} height={size} 
        onClick={_clicked} onContextMenu={_rightClicked}/>
  );
});

export default TileImage
