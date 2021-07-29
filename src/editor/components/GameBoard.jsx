/* eslint-disable react-hooks/exhaustive-deps */
import React, { useRef, useEffect, useState } from 'react';
import { useEditorState, EditorMode } from '../EditorState';
import { observer } from 'mobx-react-lite';
import { layerIndexForPoint, pointForLayerIndex, STEPS_PER_SECOND, FRAMES_PER_STEP } from '../../engine/util/utils';
import { TILE_SIZE, drawArrow, drawNumber } from '../../engine/tiles/tileset';
import { CC, isTransparent, isIllegal, getTile, isMonster } from '../../engine/tiles/tile';
import * as sound from '../../engine/util/sound';
import { TW, isanimation, ismonster, TWtoCC, creatureid } from '../../engine/logic/twtile';
import { getCreatureLocation } from '../../engine/model/creature';
import { copyState } from '../../engine/model/gamestate';
import { applyDiff, diffState } from '../../engine/model/statediff';
import { dirtoindex } from '../../engine/logic/dir';

const GameBoard = observer(({level, canvasSize, gameloopStopper, ensureChipVisible}) => {
  const editorState = useEditorState();
  const [diffs, setDiffs] = useState([]);

  const canvas = useRef(null);

  useEffect(() => { 
    if (!editorState.running) {
      draw(canvas.current, editorState.scale); 
    }
  }, [
    editorState.level, 
    editorState.dragInfo.endPoint,
    editorState.highlightedX, editorState.highlightedY,
    editorState.mouseoverTeleportIndex,
    editorState.scale, canvasSize,
    editorState.overlayHighlight,
    editorState.showGameplayViewport,
    editorState.showMonsterNumbers,
    editorState.showTrapLinks,
    editorState.showCloneLinks,
    editorState.modifiedAt,
    editorState.temporarilyModifiedAt,
    editorState.tileset,
    editorState.activated,
    editorState.editorMode,
    editorState.selection, editorState.selecting,
  ]);

  const gameLoopTimer = useRef(null);

  useEffect(() => {
    if (editorState.running) {
      const f = editorState.playbackForward ? gameLoop : tenet;
      gameLoopTimer.current = setInterval(f, 1000 / (STEPS_PER_SECOND * FRAMES_PER_STEP * editorState.speed));

      return () => {
        clearInterval(gameLoopTimer.current);
      }
    }
  }, [editorState.running, editorState.speed, editorState.playbackForward, gameloopStopper]);

  useEffect(() => {
    setDiffs([]);
    editorState.setSeekPos(0);
  }, [editorState.activated]);

  useEffect(() => seek(), [editorState.seekPos]);
  useEffect(() => undoToLastMove(), [editorState.undoToLastMove]);

  // ------------------------------------------------------
  // these functions probably don't belong here buried in react-land

  // Main game loop for play and replay. During play, the gamelogic
  // input will have been set to read from the keyboard, during replay 
  // it will have been set to read from a solution file.
  function gameLoop() {
    if (!editorState.gamelogic) return;
    const start = performance.now();
    let lastSecond = editorState.gamelogic.state.getTimeLeft();

    try {
      const startFrame = editorState.gamelogic.state.creatures[0].frame;

      // game mechanics updates state
      const prevState = copyState(editorState.gamelogic.state);
      const done = editorState.gamelogic.advancegame();
      diffs.push(diffState(editorState.gamelogic.state, prevState));

      const secondsLeft = editorState.gamelogic.state.getTimeLeft();
      if (secondsLeft !== lastSecond && secondsLeft <= 15 && secondsLeft > 0) {
        editorState.gamelogic.state.soundeffects.push({sfx:sound.SND_TIME_LOW, vol:1});
      }

      // UX reflects the state
      draw(canvas.current, editorState.scale);
      sound.playSounds(editorState.gamelogic.state.soundeffects);

      // React/DOM specific UX
      editorState.refreshObservables();
      ensureChipVisible();

      if (done) {
        clearInterval(gameLoopTimer.current);
        editorState.setRunning(false);
      }

      if (gameloopStopper && gameloopStopper.stop(startFrame, editorState.gamelogic.state.creatures[0].frame)) {
        clearInterval(gameLoopTimer.current);
        editorState.setRunning(false);
      }
    } catch (err) {
      clearInterval(gameLoopTimer.current);
      editorState.setRunning(false);
      console.log(err);
    }

    editorState.totalGameLoopDuration += (performance.now() - start);
  }

  // Similar to gameloop, but instead of updating state based on an
  // input dir provider, this updates state by applying diffs in reverse.
  function tenet() {
    // console.log(`${diffs.length} diffs`)
    try {
      const startFrame = editorState.gamelogic.state.creatures[0].frame;
      if (diffs.length > 0) {
        let lastSecond = editorState.gamelogic.state.getTimeLeft();

        applyDiff(editorState.gamelogic.state, diffs.pop());
        if (editorState.gamelogic.state.currenttime > 0) editorState.gamelogic.state.currenttime--;

        const secondsLeft = editorState.gamelogic.state.getTimeLeft();
        if (secondsLeft !== lastSecond && secondsLeft <= 15 && secondsLeft > 0) {
          editorState.gamelogic.state.soundeffects.push({sfx:sound.SND_TIME_LOW, vol:1});
        }
  
        draw(canvas.current, editorState.scale);
        sound.playSoundsBackwards(editorState.gamelogic.state.soundeffects);

        editorState.refreshObservables();
        ensureChipVisible();
      } 
      
      if (diffs.length === 0 || editorState.gamelogic.state.currenttime === 0) {
        clearInterval(gameLoopTimer.current);
        editorState.setRunning(false);
      }

      if (gameloopStopper && gameloopStopper.stop(startFrame, editorState.gamelogic.state.creatures[0].frame)) {
        clearInterval(gameLoopTimer.current);
        editorState.setRunning(false);
      }
    } catch (err) {
      clearInterval(gameLoopTimer.current);
      editorState.setRunning(false);
      console.log(err);
    }
  }

  // Similar to gameloop, but instead of updating state based on an
  // input dir provider, this updates state by rapidly advancing the
  // game without UX updates, up to editorState.seekPos (gathering
  // diffs anew), then does one UX update for the last state.
  function seek() {
    if (editorState.activated) {
      const endTime = Math.round(editorState.replayEndTick * (editorState.seekPos / 100.0));

      sound.disable();
      const d = [];
      for (let i = 0; i < endTime; i++) {
        const prevState = copyState(editorState.gamelogic.state);

        editorState.gamelogic.advancegame();

        d.push(diffState(editorState.gamelogic.state, prevState));
        // clear off sounds
        sound.playSounds(editorState.gamelogic.state.soundeffects);
      }
      setDiffs(d);

      draw(canvas.current, editorState.scale);

      editorState.refreshObservables();
      ensureChipVisible();
      sound.enable();
      editorState.setSeeking(false);
    }
  }

  // Updates state by applying diffs in reverse, until the gamestate time 
  // matches the time of the last successful chip move, without UX updates, 
  // then does one UX update for the last state.
  function undoToLastMove() {
    if (editorState.activated && diffs.length > 0) {
      sound.disable();
      let lastmovetime = editorState.gamelogic.state.chiplastmovetime;
      // console.log(`undoing to ${lastmovetime}`)

      do {
        applyDiff(editorState.gamelogic.state, diffs.pop());
        if (editorState.gamelogic.state.currenttime > 0) editorState.gamelogic.state.currenttime--;
        // clear off sounds
        sound.playSounds(editorState.gamelogic.state.soundeffects);
      } while (editorState.gamelogic.state.currenttime > lastmovetime && diffs.length > 0);

      draw(canvas.current, editorState.scale);

      editorState.refreshObservables();
      ensureChipVisible();
      sound.enable();
    }
  }

  // ------------------------------------------------------

  function _tileCenter(pos) {
    return (pos * TILE_SIZE) + TILE_SIZE/2 + 0.5;
  }

  /**
   * Draw the gameboard, mostly according to level, but also 
   * this considers scaling, other editorState attributes, and other props passed in.
   * 
   * Could optimize and only draw part of canvas that has changed
   * (seems especially non-optimal for current row/col highlights),
   * but this is fast enough that I'm not going to worry about it yet.
   * @param {HTML canvas} canvas 
   */
  function draw(canvas, scale) {
    // const start = performance.now();
    // console.log(`drawing at scale ${scale} ${canvas.width},${canvas.height}`);
    const ctx = canvas.getContext('2d');
    // console.log(`[w] ${canvas.width} [h] ${canvas.height} [scale] ${scale}`)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(scale, scale);

    // gather them up here, draw them later
    const teleporters = [];

    for (let py = 0, ty = 0; ty < level.size.w; py += TILE_SIZE, ty++) {
      for (let px = 0, tx = 0; tx < level.size.h; px += TILE_SIZE, tx++) {
          const index = layerIndexForPoint(tx, ty);
          const top = level.topCode(index);
          const bottom = level.bottomCode(index);

          // if (tx === 0 && ty === 0) {
          //   console.log(`[top] ${top.toString(16)} ${isTransparent(top)} [bottom] ${bottom.toString(16)}`)
          // }
          if (isTransparent(bottom)) editorState.tileset.drawTile(ctx, CC.FLOOR.code, px, py);

          if (isTransparent(top) || bottom !== CC.FLOOR.code) {
            editorState.tileset.drawTile(ctx, bottom, px, py, level.currenttime);
            if (editorState.showMonsterNumbers) drawArrow(ctx, getTile(bottom), px, py);
          }

          if (!isTransparent(top) && bottom !== CC.FLOOR.code && !editorState.activated) {
            editorState.tileset.drawSeethroughTile(ctx, top, px, py);
          } else {
            editorState.tileset.drawTile(ctx, top, px, py, level.currenttime);
          }

          if (editorState.showMonsterNumbers) drawArrow(ctx, getTile(top), px, py);

          if (isIllegal(top, bottom)) ctx.drawImage(editorState.tileset.illegalOverlay, px, py);

          if (top === CC.TELEPORT.code) teleporters.push({index: index, x: tx, y: ty});
      }
    }

    // draw trap button linkages
    if (editorState.showTrapLinks) {
      level.trapLinks.forEach(button => {
        ctx.beginPath();
        ctx.strokeStyle = "#5e4931";
        ctx.lineWidth = 1;
        const [fx, fy] = button.from.gameboardCoords();
        const [tx, ty] = button.to.gameboardCoords();
        ctx.moveTo(_tileCenter(fx), _tileCenter(fy));
        ctx.lineTo(_tileCenter(tx), _tileCenter(ty));
        ctx.stroke();
      });
    }

    // draw clone machine linkages
    if (editorState.showCloneLinks) {
      level.cloneLinks.forEach(button => {
        ctx.beginPath();
        ctx.strokeStyle = "red";
        ctx.lineWidth = 1;
        const [fx, fy] = button.from.gameboardCoords();
        const [tx, ty] = button.to.gameboardCoords();
        ctx.moveTo(_tileCenter(fx), _tileCenter(fy));
        ctx.lineTo(_tileCenter(tx), _tileCenter(ty));
        ctx.stroke();
      });
    }

    // draw teleport destinations
    if (editorState.mouseoverTeleportIndex && teleporters.length > 1) {
      const srcIndex = teleporters.findIndex((t) => t.index === editorState.mouseoverTeleportIndex);
      if (srcIndex !== -1) {
        const dstIndex = srcIndex === 0 ? teleporters.length - 1 : srcIndex - 1;
        ctx.beginPath();
        ctx.strokeStyle = "teal";
        ctx.lineWidth = 1;
        const x1 = _tileCenter(teleporters[srcIndex].x);
        const y1 = _tileCenter(teleporters[srcIndex].y);
        const x2 = _tileCenter(teleporters[dstIndex].x);
        const y2 = _tileCenter(teleporters[dstIndex].y);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // draw entities
    if (!editorState.activated) {
      if (editorState.showMonsterNumbers) {
        level.creatures.forEach((monster, i) => {
          if (isMonster(TWtoCC[creatureid(monster.id)].code)) {
            const [x, y] = pointForLayerIndex(monster.pos);
            const px = x * TILE_SIZE;
            const py = y * TILE_SIZE;
            drawNumber(ctx, i+1, px, py);
          }
        });
      }
    } else {
      let monsterNum = 0;
      level.creatures.forEach((cr) => {
        if (!cr.hidden) {
          if (isanimation(cr.id)) {
            if (cr.frame > 0) {
              const [pixelx, pixely] = getCreatureLocation(cr);
              editorState.tileset.drawAnimation(ctx, cr.id, pixelx, pixely, 11 - cr.frame);
            }
          } else {
            let code = TWtoCC[creatureid(cr.id)].code;
            if (cr.id !== TW.Block) code += dirtoindex(cr.dir);
            const [pixelx, pixely] = getCreatureLocation(cr);
            editorState.tileset.drawTile(ctx, code, pixelx, pixely);

            if (editorState.showMonsterNumbers && ismonster(cr.id)) {
              drawArrow(ctx, getTile(code), pixelx, pixely);
              if (level.topCode(cr.pos) !== CC.CLONE_MACHINE.code) {
                monsterNum += 1;
                drawNumber(ctx, monsterNum, pixelx, pixely);
              }
            }
          }
        }
      });
    }

    if (editorState.showGameplayViewport && !editorState.overlayHighlight) {
      let vx = -1
      let vy = -1;
      if (editorState.activated && editorState.level.chip()) {
        [vx, vy] = getCreatureLocation(editorState.level.chip());
      } else if (editorState.highlightedX >= 0) {
        vx = editorState.highlightedX * TILE_SIZE;
        vy = editorState.highlightedY * TILE_SIZE;
      }

      const viewportSize = 4;
      if (vx >= 0 && vy >= 0) {
        vx = Math.min(Math.max(vx, viewportSize * TILE_SIZE), (level.size.w - viewportSize - 1) * TILE_SIZE);
        vy = Math.min(Math.max(vy, viewportSize * TILE_SIZE), (level.size.h - viewportSize - 1) * TILE_SIZE);

        // semi-transparent overlay plus square
        const overlay = document.createElement("canvas");
        overlay.width = TILE_SIZE * level.size.w;
        overlay.height = TILE_SIZE * level.size.h;
        const octx = overlay.getContext('2d');
        octx.fillStyle = "#00000033";
        octx.fillRect(0, 0, overlay.width, overlay.height);
        octx.globalCompositeOperation = 'destination-out';
        const sx = vx - (4 * TILE_SIZE);
        const sy = vy - (4 * TILE_SIZE);
        octx.fillStyle = "white";
        octx.fillRect(sx, sy, TILE_SIZE * 9 - 1, TILE_SIZE * 9 - 1);
        ctx.drawImage(overlay, 0, 0, overlay.width, overlay.height);
        
        ctx.strokeStyle = "#df00ff";
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, sy, TILE_SIZE * 9 - 1, TILE_SIZE * 9 - 1);
      }
    }

    // draw attention overlay
    if (editorState.overlayHighlight) {
      const overlay = document.createElement("canvas");
      overlay.width = TILE_SIZE * level.size.w;
      overlay.height = TILE_SIZE * level.size.h;
      const octx = overlay.getContext('2d');
      octx.fillStyle = "#00000055";
      octx.fillRect(0, 0, overlay.width, overlay.height);
      octx.globalCompositeOperation = 'destination-out';
      let sx, sy, ex, ey;
      if (editorState.overlayHighlight.locatable) {
        sx = ex = editorState.overlayHighlight.locatable.getLocation().x;
        sy = ey = editorState.overlayHighlight.locatable.getLocation().y;
      } else {
        sx = editorState.overlayHighlight.sx * TILE_SIZE;
        sy = editorState.overlayHighlight.sy * TILE_SIZE;
        ex = editorState.overlayHighlight.ex * TILE_SIZE;
        ey = editorState.overlayHighlight.ey * TILE_SIZE;
      }
      if (sx === ex && sy === ey) {
        octx.fillStyle = "white";
        octx.beginPath();
        octx.arc(sx + TILE_SIZE/2, sy + TILE_SIZE/2, TILE_SIZE * 1.3 / 2, 0, Math.PI*2);
        octx.fill();
      } else {
        octx.strokeStyle = "white"
        octx.lineWidth = TILE_SIZE * 1.3;
        octx.lineCap = "round";
        octx.moveTo(sx + TILE_SIZE/2, sy + TILE_SIZE/2);
        octx.lineTo(ex + TILE_SIZE/2, ey + TILE_SIZE/2);
        octx.stroke();
      }
      ctx.drawImage(overlay, 0, 0, overlay.width, overlay.height);
    }

    // draw selection overlay
    if (editorState.editorMode === EditorMode.SELECT) {
      // semi-transparent overlay plus square
      const overlay = document.createElement("canvas");
      overlay.width = TILE_SIZE * level.size.w;
      overlay.height = TILE_SIZE * level.size.h;
      const octx = overlay.getContext('2d');
      octx.fillStyle = "#00000033";
      octx.fillRect(0, 0, overlay.width, overlay.height);

      if (editorState.selection) {
        const [x, y, w, h] = editorState.selection.dimensions()
        const tw = w / TILE_SIZE;
        const th = h / TILE_SIZE;

        octx.globalCompositeOperation = 'destination-out';
        octx.fillStyle = "white";
        octx.fillRect(x, y, w, h);
        ctx.drawImage(overlay, 0, 0, overlay.width, overlay.height);
        
        ctx.strokeStyle = "#df00ff";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "white";
        ctx.font = "12px sans-serif";
        ctx.fillText(`${tw}x${th}`, x+w+(TILE_SIZE/4), y+h+(TILE_SIZE/4));

        if (!editorState.selecting) {
          // selection resize handles
          ctx.strokeStyle = "#9f00ff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, y+TILE_SIZE/4);
          ctx.lineTo(x, y);
          ctx.lineTo(x+TILE_SIZE/4, y);

          ctx.moveTo(x+w/2-TILE_SIZE/4, y);
          ctx.lineTo(x+w/2+TILE_SIZE/4, y);

          ctx.moveTo(x+w-TILE_SIZE/4, y);
          ctx.lineTo(x+w, y);
          ctx.lineTo(x+w, y+TILE_SIZE/4);

          ctx.moveTo(x+w, y+h/2-TILE_SIZE/4);
          ctx.lineTo(x+w, y+h/2+TILE_SIZE/4);

          ctx.moveTo(x+w, y+h-TILE_SIZE/4);
          ctx.lineTo(x+w, y+h);
          ctx.lineTo(x+w-TILE_SIZE/4, y+h);

          ctx.moveTo(x+w/2-TILE_SIZE/4, y+h);
          ctx.lineTo(x+w/2+TILE_SIZE/4, y+h);

          ctx.moveTo(x+TILE_SIZE/4, y+h);
          ctx.lineTo(x, y+h);
          ctx.lineTo(x, y+h-TILE_SIZE/4);

          ctx.moveTo(x, y+h/2-TILE_SIZE/4);
          ctx.lineTo(x, y+h/2+TILE_SIZE/4);
          ctx.stroke();
        }
      }
    }

    if (editorState.shape) {
      const [x, y, w, h] = editorState.shape.dimensions()
      const tw = w / TILE_SIZE;
      const th = h / TILE_SIZE;
      let nx = x+w+TILE_SIZE;
      let ny = y+h+TILE_SIZE;
      if (nx >= canvas.width / scale) nx = canvas.width / scale - TILE_SIZE/2;
      if (ny >= canvas.height / scale) ny = canvas.height / scale - TILE_SIZE/2;
      ctx.fillStyle = "pink";
      ctx.strokeStyle = "black";
      ctx.beginPath();
      ctx.arc(nx, ny, 17, 0, Math.PI*2);
      ctx.fill();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "grey";
      ctx.font = "12px sans-serif";
      ctx.fillText(`${tw}x${th}`, nx, ny);
    }

    // draw drag line
    if (editorState.dragInfo && editorState.dragInfo.lineColor && editorState.dragInfo.endPoint && editorState.dragInfo.sourcePoint) {
      ctx.beginPath();
      ctx.strokeStyle = editorState.dragInfo.lineColor;
      ctx.lineWidth = 1;
      ctx.moveTo(editorState.dragInfo.sourcePoint.x, editorState.dragInfo.sourcePoint.y);
      ctx.lineTo(editorState.dragInfo.endPoint.x, editorState.dragInfo.endPoint.y);
      ctx.stroke();
    }

    ctx.restore();
    // console.log(`draw took ${performance.now() - start}ms`);
  }

  return (
    <canvas ref={canvas} height={canvasSize} width={canvasSize}/>
  );
});

export default GameBoard;
