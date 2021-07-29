/* eslint-disable react-hooks/exhaustive-deps */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { layerIndexForPoint, codesIn, loadBinaryAsset, pointForLayerIndex } from '../../engine/util/utils'
import { CC } from '../../engine/tiles/tile'
import { TILE_SIZE } from '../../engine/tiles/tileset'
import './Editor.css'
import { observer } from 'mobx-react-lite';
import { LeftPaneState, useEditorState, updateLocalStorage, LayerEditState, Selection, SELECTION_UPDATE_MODE, PlayMode, EditorMode } from '../EditorState';
import styled, { css } from 'styled-components'
import EditorHeader from './EditorHeader';
import EditorFooter from './EditorFooter';
import TilesetModal from './TilesetModal';
import GameBoard from './GameBoard';
import { FRAMES_PER_STEP } from '../../engine/util/utils';
import { flipLocationHorizontally, flipLocationVertically, transposeLocation, rotateLocationRight, rotateLocationLeft } from '../../engine/util/link';
import { Dir, dirtoindex } from '../../engine/logic/dir'
import { loadSolution } from '../../engine/solution/twsReader';
import { getTWReplayDirProvider } from '../../engine/solution/replayDirProvider';
import { restartprng } from '../../engine/logic/random';
import { getCreatureLocation } from '../../engine/model/creature';
import RightPane from './RightPane';
import { initSound } from '../../engine/util/sound';
import { makeLevelDiff, applyLevelDiff, Level } from '../../engine/model/level';
import fillicon from '../../assets/fill-icon.png'
import rectcursor from '../../assets/rect-outline-cursor.png'
import rectfillcursor from '../../assets/rect-fill-cursor.png'
import ellipsecursor from '../../assets/ellipse-outline-cursor.png'
import ellipsefillcursor from '../../assets/ellipse-fill-cursor.png'

const SelectionButton = styled.button`
  position: absolute;
  cursor: pointer;
  width: 16px;
  height: 16px;
  padding: 0px;
  margin: 0px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

// to put the gameboard on top of the number/border canvas
const GameBoardContainer = styled.div`
  position: absolute;
  margin: 0px;
  padding: 0px;
  ${props => css`
    top: ${props.offset}px;
    left: ${props.offset}px;
  `};
`;

const Editor = observer((props) => {
  const editorState = useEditorState();

  const scaleFactor = 0.1;
  const INITIAL_CANVAS_SIZE = TILE_SIZE * TILE_SIZE;
  // top/left and bottom/right padding include border line
  const tlPadding = 12;
  const brPadding = 6;
  const borderLineWidth = 2;
  
  const [gameboardCanvasSize, setGameboardCanvasSize] = useState(0);
  const [canvasSize, setCanvasSize] = useState(0);

  const [mouseDownEvent, setMouseDownEvent] = useState(null);
  const [dragging, setDragging] = useState(false)
  const [dragPainting, setDragPainting] = useState(false)
  const [dragLinking, setDragLinking] = useState(false)
  const [dragSourceTiles, setDragSourceTiles] = useState(null);
  const [prevDragTile, setPrevDragTile] = useState(null);
  const [dragDirs, setDragDirs] = useState([]);
  const [lastMouseUp, setLastMouseUp] = useState(0);

  const [localStorageTimer, setLocalStorageTimer] = useState();

  const [keysDown] = useState(new Map());
  const [keypressStack] = useState([]);
  const [keyholdList] = useState([]);

  const [prevLevelState, setPrevLevelState] = useState();

  // stop after a complete move, or FRAMES_PER_STEP ticks if no move was made
  class TurnGameloopStopper {
    constructor() {
      this.count = 0;
    }

    stop(startFrame, endFrame) {
      keypressStack.length = 0;
      return (endFrame === 0 && startFrame > 0) || (++this.count === FRAMES_PER_STEP);
    }
  }

  // stop after the desired number of ticks
  class TickGameloopStopper {
    constructor(frames) {
      this.frames = frames;
      this.count = 0;
    }

    stop() {
      keypressStack.length = 0;
      return (++this.count >= this.frames);
    }
  }

  const [gameloopStopper, setGameloopStopper] = useState();
  const gameloopStopperFactory = useRef(() => null);

  const canvas = useRef(null);
  const container = useRef(null);

  const editorStateCursors = Object.freeze({
    [EditorMode.DRAW]: "default",
    [EditorMode.SELECT]: "crosshair",
    [EditorMode.FILL]: `url(${fillicon}) 5 0, auto`,
    [EditorMode.RECT]: `url(${rectcursor}) 2 2, auto`,
    [EditorMode.RECTFILL]: `url(${rectfillcursor}) 2 2, auto`,
    [EditorMode.ELLIPSE]: `url(${ellipsecursor}) 2 2, auto`,
    [EditorMode.ELLIPSEFILL]: `url(${ellipsefillcursor}) 2 2, auto`,
  });

  useEffect(() => draw(canvas.current), 
    [editorState.highlightedX, editorState.highlightedY, gameboardCanvasSize, editorState.activated]
  );

  useEffect(() => {
    setGameboardCanvasSize(Math.floor(INITIAL_CANVAS_SIZE * editorState.scale));
    setCanvasSize(Math.floor((INITIAL_CANVAS_SIZE + tlPadding + brPadding) * editorState.scale));
  }, [editorState.scale]);

  useEffect(() => container.current.style.cursor = editorStateCursors[editorState.editorMode],
    [editorState.editorMode, editorState.selection]
  );

  useEffect(() => {
    if (editorState.hasUnstoredChanges()) {
      clearTimeout(localStorageTimer);
      setLocalStorageTimer(setTimeout(() => updateLocalStorage(editorState), 1000));
    }
  }, [editorState.modifiedAt]);

  useEffect(() => {
    document.addEventListener("keydown", keyDown);
    document.addEventListener("keyup", keyUp);

    return () => {
      document.removeEventListener("keydown", keyDown);
      document.removeEventListener("keyup", keyUp);
    };
  }, []);

  useEffect(() => {
    if (editorState.overlayHighlight && editorState.overlayHighlight.locatable ) {
      const pos = layerIndexForPoint(editorState.overlayHighlight.locatable);
      if (!editorState.level.creatures.find(m => m.pos === pos)) {
        editorState.clearOverlayHighlight();
        editorState.clearSelections();
      }
    }
    if (editorState.activated) editorState.refreshObservables();
  }, [editorState.level.creatures]);

  const MyKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape', 'Delete', 'Backspace',
                          ' ', 'w', 'a', 's', 'd', 't', 'x', 'z', 'v', 'b', 'f', '-', '+', 'r', 'y', 'e']);

  const keyDown = useCallback((e) => {
    if (editorState.inputEditing) return;
    if (editorState.activated) {
      if (!editorState.gamelogic.state.gameOver) {
        if (!keysDown.has(e.key) && DirForKey[e.key] && !e.ctrlKey && !e.metaKey) {
          // always record a press
          keypressStack.push(e.key);

          // put (or move) a hold to the front of the list
          const found = keyholdList.indexOf(e.key);
          if (found >= 0) keyholdList.splice(found, 1);
          keyholdList.unshift(e.key);

          if (!editorState.running) startPlay();
        } else if (e.key === ' ') {
          if (!editorState.running) {
            startPlay();
          } else {
            pausePlay();
          }
        } else if (e.key === 'v' && !e.ctrlKey && !e.metaKey) {
          stepTick();
        } else if (e.key === 'b' && !e.ctrlKey && !e.metaKey) {
          stepTurn();
        }
      }
      if (e.key === 'Escape') {
        deactivate();
      } else if (e.key === 'Enter') {
        restart();
      } else if (e.key === 'c' && !e.ctrlKey && !e.metaKey) {
        invert();
      } else if (e.key === 'x' && !e.ctrlKey && !e.metaKey) {
        backTick();
      } else if (e.key === 'z' && !e.ctrlKey && !e.metaKey) {
        backTurn();
      } else if (e.key === '[' && !e.ctrlKey && !e.metaKey) {
        decSpeed();
      } else if (e.key === ']' && !e.ctrlKey && !e.metaKey) {
        incSpeed();
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        undoToLastMove();
      } else if (e.key === '1' && !e.ctrlKey && !e.metaKey) {
        liveMode();
      } else if (e.key === '2' && !e.ctrlKey && !e.metaKey) {
        turnMode();
      } else if (e.key === '3' && !e.ctrlKey && !e.metaKey) {
        tickMode();
      }
    } else {
      // editing
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey) {
        activate();
      } else if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        replay();
      } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        props.save();
      } else if (e.key === 'd' && !e.ctrlKey && !e.metaKey) {
        editorState.setDirectionalPainting(true);
      } else if (e.key === 'Escape' && editorState.editorMode === EditorMode.SELECT) {
        editorState.setEditorMode(EditorMode.DRAW);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        deleteSelection();
      } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        copySelection();
      } else if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        pasteSelection();
      } else if (e.key === 'x' && (e.ctrlKey || e.metaKey)) {
        cutSelection();
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        undo();
      } else if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
        redo();
      } else if (e.key === 'w' && !e.ctrlKey && !e.metaKey) {
        editorState.setTopLayerTool(CC.WALL);
      } else if (e.key === 'W' && !e.ctrlKey && !e.metaKey) {
        editorState.setBottomLayerTool(CC.WALL);
      } else if (e.key === 'l' && !e.ctrlKey && !e.metaKey) {
        editorState.setTopLayerTool(CC.FLOOR);
      } else if (e.key === 'L' && !e.ctrlKey && !e.metaKey) {
        editorState.setBottomLayerTool(CC.FLOOR);
      } else if (e.key === 'c' && !e.ctrlKey && !e.metaKey) {
        editorState.setTopLayerTool(CC.CHIP_S);
      } else if (e.key === 'C' && !e.ctrlKey && !e.metaKey) {
        editorState.setBottomLayerTool(CC.CHIP_S);
      } else if (e.key === 'b' && !e.ctrlKey && !e.metaKey) {
        editorState.toggleLayerEditState();
      } else if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
        props.prevLevel();
      } else if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
        props.nextLevel();
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        editorState.setEditorMode(EditorMode.DRAW);
      } else if (e.key === 'e' && (e.ctrlKey || e.metaKey)) {
        editorState.setEditorMode(EditorMode.SELECT);
      }
    }

    // editing and activated
    if (e.key === 'g' && !e.ctrlKey && !e.metaKey) toggleGameplayViewport();
    if (e.key === 'f' && !e.ctrlKey && !e.metaKey) zoomToFit();
    if (e.key === '-' && !e.ctrlKey && !e.metaKey) zoomOut();
    if (e.key === '+' && !e.ctrlKey && !e.metaKey) zoomIn();

    if (MyKeys.has(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) e.preventDefault();
    if (e.key === 'x' && (e.ctrlKey || e.metaKey)) e.preventDefault();
    if (e.key === 'c' && (e.ctrlKey || e.metaKey)) e.preventDefault();
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) e.preventDefault();
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) e.preventDefault();
    if (e.key === 'y' && (e.ctrlKey || e.metaKey)) e.preventDefault();
    if (e.key === 'e' && (e.ctrlKey || e.metaKey)) e.preventDefault();
    if (e.key === 'd' && (e.ctrlKey || e.metaKey)) e.preventDefault();
    if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) e.preventDefault();
    if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) e.preventDefault();

    keysDown.set(e.key, true);

    // if ((editorState.activated) && (DirForKey[e.key] || e.key === ' ')) e.preventDefault();
  }, []);

  const keyUp = useCallback((e) => {
    // remove the hold from the list
    const found = keyholdList.indexOf(e.key);
    if (found >= 0) keyholdList.splice(found, 1);

    if (e.key === 'd' && !e.ctrlKey && !e.metaKey) {
      editorState.setDirectionalPainting(false);
    }

    keysDown.delete(e.key);
    e.preventDefault();
}, []);

  function storeLocally() {
    if (editorState.hasUnstoredChanges()) {
      clearTimeout(localStorageTimer);
      updateLocalStorage(editorState);
    }
  }

  function _tileCenter(pos) {
    return (pos * TILE_SIZE) + TILE_SIZE/2 + 0.5;
  }

  // --------------------------------------------------------------------------

  /**
   * Draw editor "container" - border, background color, row/col numbers
   * @param {HTML canvas} canvas 
   */
  function draw(canvas) {
    // const start = performance.now();
    const ctx = canvas.getContext('2d');
    // console.log(`[w] ${canvas.width} [h] ${canvas.height} [scale] ${scale}`)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = editorState.activated ? "lightgreen" : "orange";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(editorState.scale, editorState.scale);

    ctx.lineWidth = 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "8px sans-serif";
    for (let c = 0; c < editorState.level.size.w; c++) {
      ctx.fillStyle = (c === editorState.highlightedX ? "yellow" : "#FFFFFF00");
      ctx.fillRect(tlPadding + (c * TILE_SIZE), 0, TILE_SIZE, tlPadding);
      ctx.strokeText(c, tlPadding + (c * TILE_SIZE) + TILE_SIZE/2, (tlPadding + borderLineWidth)/2);
    }
    for (let c = 0; c < editorState.level.size.h; c++) {
      ctx.fillStyle = (c === editorState.highlightedY ? "yellow" : "#FFFFFF00");
      ctx.fillRect(0, tlPadding + (c * TILE_SIZE), tlPadding, TILE_SIZE);
      ctx.strokeText(c, (tlPadding + borderLineWidth)/2, tlPadding + (c * TILE_SIZE) + TILE_SIZE/2);
    }

    ctx.restore();

    // I'm drawing my own border because I couldn't get CSS to size the canvas parent exactly right
    ctx.strokeStyle = "black";
    ctx.lineWidth = borderLineWidth;
    ctx.strokeRect(borderLineWidth/2, borderLineWidth/2, canvas.width-borderLineWidth/2-1, canvas.height-borderLineWidth/2-1);
  }

  // --------------------------------------------------------------------------

  function zoomOut() {
    const s = Math.round((editorState.scale - scaleFactor) * 10) / 10;
    if (s > 0) {
      editorState.setScale(s);
    }
  }

  function zoomIn() {
    const s = Math.round((editorState.scale + scaleFactor) * 10) / 10;
    editorState.setScale(s);
  }

  function zoomToFit() {
    const containerRect = container.current.getBoundingClientRect();

    // fudging for border, padding
    const smallest = Math.min(containerRect.width - 16, containerRect.height - 16);
    const s = Math.floor(smallest / INITIAL_CANVAS_SIZE * 1000) / 1000;
    if (s !== editorState.scale) {
      editorState.setScale(s);
    }
  }

  // --------------------------------------------------------------------------

  function undoredo(popper, pusher) {
    const preUndoState = editorState.level.copy();

    const diff = popper.bind(editorState)();
    if (diff) {
      applyLevelDiff(diff, editorState.level);
      editorState.refreshObservables();
      editorState.refreshChipsPresent();
      editorState.setDirty();

      const redoDiff = makeLevelDiff(editorState.level, preUndoState);
      if (!redoDiff.isEmpty()) pusher.bind(editorState)(redoDiff);

      editorState.setSelection(null);
      editorState.anchorSelection();
    }
    container.current.style.cursor = editorStateCursors[editorState.editorMode]
  }
  
  function undo() {
    undoredo(editorState.undoStackPop, editorState.redoStackPush);
  }

  function redo() {
    undoredo(editorState.redoStackPop, editorState.undoStackPush);
  }

  // --------------------------------------------------------------------------
  // Mouse code

  function ignore(e) {
    e.preventDefault();
  }

  /**
   * @returns array of
   *  x coord of event on the game (unscaled and without border)
   *  y coord of event on the game (unscaled and without border)
   *  column number of tile under (x,y)
   *  row number of tile under (x,y)
   */
  function getEventCoords(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    // take away border and padding, clamp to game board
    const x = Math.min(Math.max(Math.floor((e.clientX - rect.left) / editorState.scale), 0), TILE_SIZE * editorState.level.size.w - 1);
    const y = Math.min(Math.max(Math.floor((e.clientY - rect.top) / editorState.scale), 0), TILE_SIZE * editorState.level.size.h - 1);
    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    return [x, y, tx, ty];
  }

  function getEventTileCoords(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    // take away border and padding, clamp to game board
    const x = Math.min(Math.max(Math.floor((e.clientX - rect.left) / editorState.scale), 0), TILE_SIZE * editorState.level.size.w - 1);
    const y = Math.min(Math.max(Math.floor((e.clientY - rect.top) / editorState.scale), 0), TILE_SIZE * editorState.level.size.h - 1);
    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    return [tx, ty];
  }

  function getDragDir(tx, ty) {
    if (prevDragTile && (prevDragTile.tx !== tx || prevDragTile.ty !== ty)) {
      if (prevDragTile.tx < tx) return Dir.E;
      if (prevDragTile.tx > tx) return Dir.W;
      if (prevDragTile.ty > ty) return Dir.N;
      if (prevDragTile.ty < ty) return Dir.S;
    }
    return 0;
  }

  function getPlaceTool(mouseButton) {
    const onBottomLayer = (mouseButton === 2) && (editorState.layerEditState === LayerEditState.Both);
    const tool = (mouseButton !== 2) ? editorState.topLayerTool.code : editorState.bottomLayerTool.code;
    return [tool, !onBottomLayer];
  }

  // cursor for selection handles
  const selectionCursors = Object.freeze({
    [SELECTION_UPDATE_MODE.topleft]: 'nwse-resize',
    [SELECTION_UPDATE_MODE.topright]: 'nesw-resize',
    [SELECTION_UPDATE_MODE.bottomright]: 'nwse-resize',
    [SELECTION_UPDATE_MODE.bottomleft]: 'nesw-resize',
    [SELECTION_UPDATE_MODE.top]: 'ns-resize',
    [SELECTION_UPDATE_MODE.bottom]: 'ns-resize',
    [SELECTION_UPDATE_MODE.left]: 'ew-resize',
    [SELECTION_UPDATE_MODE.right]: 'ew-resize',
    [SELECTION_UPDATE_MODE.move]: 'move',
    [SELECTION_UPDATE_MODE.none]: 'crosshair',
  });

  // how to begin dragging a selection handle
  const selectionUpdates = Object.freeze({
    [SELECTION_UPDATE_MODE.topleft]: (tx, ty) => {
      editorState.selection.from = editorState.selection.to;
      editorState.selection.to = {x: tx, y: ty};
    },
    [SELECTION_UPDATE_MODE.topright]: (tx, ty) => {
      editorState.selection.from = {x:editorState.selection.from.x, y:editorState.selection.to.y};
      editorState.selection.to = {x: tx, y: ty};
    },
    [SELECTION_UPDATE_MODE.bottomright]: (tx, ty) => {
      editorState.selection.to = {x: tx, y: ty};
    },
    [SELECTION_UPDATE_MODE.bottomleft]: (tx, ty) => {
      editorState.selection.from = {x:editorState.selection.to.x, y:editorState.selection.from.y};
      editorState.selection.to = {x: tx, y: ty};
    },
    [SELECTION_UPDATE_MODE.top]: (_, ty) => {
      editorState.setSelecting(SELECTION_UPDATE_MODE.top);
      editorState.selection.from = {x:editorState.selection.from.x, y:editorState.selection.to.y};
      editorState.selection.to = {x: editorState.selection.to.x, y: ty};
    },
    [SELECTION_UPDATE_MODE.bottom]: (_, ty) => {
      editorState.setSelecting(SELECTION_UPDATE_MODE.bottom);
      editorState.selection.to = {x: editorState.selection.to.x, y: ty};
    },
    [SELECTION_UPDATE_MODE.left]: (tx, _) => {
      editorState.setSelecting(SELECTION_UPDATE_MODE.left);
      editorState.selection.from = {x:editorState.selection.to.x, y:editorState.selection.from.y};
      editorState.selection.to = {x: tx, y: editorState.selection.to.y};
    },
    [SELECTION_UPDATE_MODE.right]: (tx, _) => {
      editorState.setSelecting(SELECTION_UPDATE_MODE.right);
      editorState.selection.to = {x: tx, y: editorState.selection.to.y};
    },
    [SELECTION_UPDATE_MODE.move]: (tx, ty) => {
      setPrevDragTile({tx, ty});
      editorState.setSelecting(SELECTION_UPDATE_MODE.move);
      if (!editorState.floatingSelection) {
        // initiate move of a non-floating selection
        detachSelection();
        editorState.setLevel(editorState.baselineLevel.merge(editorState.floatingSelection), false);
      }
    },
    [SELECTION_UPDATE_MODE.none]: () => {},
  });

  const editorToolShape = Object.freeze({
    [EditorMode.RECT]: (level, tool, onTopLayer) => level.drawRect(tool, onTopLayer),
    [EditorMode.RECTFILL]: (level, tool, onTopLayer) => level.fillRect(tool, onTopLayer),
    [EditorMode.ELLIPSE]: (level, tool, onTopLayer) => level.drawEllipse(tool, onTopLayer),
    [EditorMode.ELLIPSEFILL]: (level, tool, onTopLayer) => level.fillEllipse(tool, onTopLayer),
  });

  function mouseDown(e) {
    // yeah no double clicks, but avoids extra mouse events that I don't know why occasionally come in
    if (Date.now() - lastMouseUp < 200) return;
    if (editorState.overlayHighlight) return;
    if (editorState.tilesetModal) return;
    if (editorState.leftPaneState !== LeftPaneState.LevelEditor) return;

    const [x, y] = getEventCoords(e);
    setMouseDownEvent({x:x, y:y, button:e.button});
    setPrevLevelState(!editorState.activated ? editorState.level.copy() : null);

    if (editorState.editorMode === EditorMode.SELECT) {
      if (!editorState.selection || editorState.selection.updateMode(x, y) === SELECTION_UPDATE_MODE.none) {
        editorState.setSelection(null);
        editorState.anchorSelection();
      }
    }
  }

  function mouseMoved(e) {
    if (editorState.tilesetModal) return;

    const [x, y, tx, ty] = getEventCoords(e);
    const index = layerIndexForPoint(tx, ty);
    const topCode = editorState.level.topCode(index);
    const bottomCode = editorState.level.bottomCode(index);
    // console.log(`[x] ${x} [y] ${y} [tx] ${tx} [ty] ${ty} [highlightedX] ${editorState.highlightedX}`)
    editorState.setHighlighted(tx, ty);
    editorState.setMouseoverTeleportIndex(CC.TELEPORT.code === topCode ? index : null);

    if (editorState.overlayHighlight) return;
    if (editorState.leftPaneState !== LeftPaneState.LevelEditor) return;
    if (editorState.editorMode === EditorMode.FILL) return;

    if (!dragging) {
      const dx = mouseDownEvent ? x - mouseDownEvent.x : 0;
      const dy = mouseDownEvent ? y - mouseDownEvent.y : 0;
      const shouldStartDragging = (mouseDownEvent !== null) && (Math.abs(dx) > 5 || Math.abs(dy) > 5);
      container.current.style.cursor = editorStateCursors[editorState.selectionMode];
      if (shouldStartDragging) {
        setDragging(true);
        const sx = Math.floor(mouseDownEvent.x / TILE_SIZE);
        const sy = Math.floor(mouseDownEvent.y / TILE_SIZE);

        if (editorState.editorMode === EditorMode.SELECT) {
          // starting a selection
          editorState.setSelecting(SELECTION_UPDATE_MODE.bottomright);
          if (editorState.selection) {
            selectionUpdates[editorState.selection.updateMode(mouseDownEvent.x, mouseDownEvent.y)](tx, ty)
          } else {
            editorState.setSelection(new Selection({x: sx, y: sy}, {x: tx, y: ty}));
          }
        } else if (editorState.isEditorModeShape()) {
          // starting a shape
          editorState.setBaselineLevel(editorState.level.copy());
          editorState.setShape(new Selection({x: sx, y: sy}, {x: tx, y: ty}));
          const rect = new Selection(editorState.shape.from, editorState.shape.to).normalize().toRect()
          editorState.setFloatingSelection(new Level().initialize().reset(rect));
          const [tool, onTopLayer] = getPlaceTool(mouseDownEvent.button)
          editorToolShape[editorState.editorMode](editorState.floatingSelection, tool, onTopLayer);
          editorState.setLevel(editorState.baselineLevel.merge(editorState.floatingSelection), false);
        } else {
          // drawing or linking
          const sindex = layerIndexForPoint(sx, sy);
          const stopCode = editorState.level.topCode(sindex);
          const sbottomCode = editorState.level.bottomCode(sindex);
          if (mouseDownEvent.button === 0 && (
                  stopCode === CC.BROWN_BUTTON.code 
              || stopCode === CC.TRAP.code
              || stopCode === CC.RED_BUTTON.code 
              || sbottomCode === CC.CLONE_MACHINE.code
              || sbottomCode === CC.TRAP.code
              || sbottomCode === CC.BROWN_BUTTON.code
              || sbottomCode === CC.RED_BUTTON.code
          )) {
            // This means you cannot start left-button painting from these tiles,
            // as starting a drag from them goes into link mode.
            // You'd need to click first to replace the tile, then paint.
            setDragLinking(true);
            editorState.setDragInfo({
              sourcePoint:{x:_tileCenter(sx), y:_tileCenter(sy)},
              lineColor: "orange",
            });
            setDragSourceTiles({topCode: stopCode, bottomCode: sbottomCode});
          } else {
            setDragPainting(true);
            const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? Dir.E : Dir.W) : (dy > 0 ? Dir.S : Dir.N);
            const [tool, onTopLayer] = getPlaceTool(mouseDownEvent.button)
            editorState.placeTile(sx, sy, tool, onTopLayer, [dir]);
            setPrevDragTile({tx: sx, ty: sy});
          }
        }
      } else {
        if (editorState.editorMode === EditorMode.SELECT && editorState.selection) {
          container.current.style.cursor = selectionCursors[editorState.selection.updateMode(x, y)];
        }
      }

    } else {
      // Dragging
      
      editorState.setMouseoverTeleportIndex(null);
      if (dragPainting) {
        // console.log(`${tx},${ty}`)
        if (!prevDragTile || prevDragTile.tx !== tx || prevDragTile.ty !== ty) {
          const dragDir = getDragDir(tx, ty);
          dragDirs.unshift(dragDir);
          while (dragDirs.length > 2) dragDirs.pop();
          const [tool, onTopLayer] = getPlaceTool(mouseDownEvent.button)
          editorState.placeTile(tx, ty, tool, onTopLayer, [dragDir]);
          editorState.placeTile(prevDragTile.tx, prevDragTile.ty, tool, onTopLayer, dragDirs);
          setPrevDragTile({tx, ty});
        }

      } else if (dragLinking) {
        if (codesIn(CC.BROWN_BUTTON, [dragSourceTiles.topCode, dragSourceTiles.bottomCode], CC.TRAP, [topCode, bottomCode])
          || codesIn(CC.BROWN_BUTTON, [topCode, bottomCode], CC.TRAP, [dragSourceTiles.topCode, dragSourceTiles.bottomCode]))
        {
          // snap to tile and change line color
          editorState.setDragInfo({...editorState.dragInfo,
            lineColor: "#5e4931",
            endPoint: {x:_tileCenter(tx), y:_tileCenter(ty)},
          });
        } else if (codesIn(CC.RED_BUTTON, [dragSourceTiles.topCode, dragSourceTiles.bottomCode], CC.CLONE_MACHINE, [bottomCode])
          || codesIn(CC.RED_BUTTON, [topCode, bottomCode], CC.CLONE_MACHINE, [dragSourceTiles.bottomCode]))
        {
          // snap to tile and change line color
          editorState.setDragInfo({...editorState.dragInfo,
            lineColor: "red",
            endPoint: {x:_tileCenter(tx), y:_tileCenter(ty)},
          });
        } else {
          editorState.setDragInfo({...editorState.dragInfo,
            lineColor: "orange",
            endPoint: {x:x, y:y},
          });
        }
      } else if (editorState.selecting && editorState.selection) {
        if (editorState.selecting !== SELECTION_UPDATE_MODE.move) editorState.anchorSelection();
        switch(editorState.selecting) {
          case SELECTION_UPDATE_MODE.top:
            editorState.selection.to = {x: editorState.selection.to.x, y: ty};
            break;
          case SELECTION_UPDATE_MODE.bottom:
            editorState.selection.to = {x: editorState.selection.to.x, y: ty};
            break;
          case SELECTION_UPDATE_MODE.left:
            editorState.selection.to = {x: tx, y: editorState.selection.to.y};
            break;
          case SELECTION_UPDATE_MODE.right:
            editorState.selection.to = {x: tx, y: editorState.selection.to.y};
            break;
          case SELECTION_UPDATE_MODE.move:
            if (prevDragTile.tx !== tx || prevDragTile.ty !== ty) {
              if (editorState.floatingSelection && editorState.selection) {
                const dx = prevDragTile.tx - tx;
                const dy = prevDragTile.ty - ty;
                editorState.floatingSelection.origin.x -= dx;
                editorState.floatingSelection.origin.y -= dy;
                editorState.setLevel(editorState.baselineLevel.merge(editorState.floatingSelection), false);
                editorState.selection.from = {x: editorState.floatingSelection.origin.x, y: editorState.floatingSelection.origin.y};
                editorState.selection.to = {
                  x: editorState.floatingSelection.origin.x + editorState.floatingSelection.size.w - 1, 
                  y: editorState.floatingSelection.origin.y + editorState.floatingSelection.size.h - 1, 
                };
              }
              setPrevDragTile({tx, ty});
            }
            break;
          default:
            editorState.selection.to = {x: tx, y: ty};
        }
      } else if (editorState.isEditorModeShape() && editorState.shape && editorState.floatingSelection) {
        editorState.shape.to = {x: tx, y: ty};
        const rect = new Selection(editorState.shape.from, editorState.shape.to).normalize().toRect()
        editorState.floatingSelection.reset(rect);
        const [tool, onTopLayer] = getPlaceTool(mouseDownEvent.button)
        editorToolShape[editorState.editorMode](editorState.floatingSelection, tool, onTopLayer);
        editorState.setLevel(editorState.baselineLevel.merge(editorState.floatingSelection), false);
      }
    }
  }

  function mouseUp(e) {
    // click to remove the overlay
    if (editorState.overlayHighlight) {
      editorState.clearOverlayHighlight();
      editorState.clearSelections();
      return;
    }
    if (editorState.tilesetModal) {
      editorState.hideTilesetModal();
      return;
    }

    if (editorState.leftPaneState !== LeftPaneState.LevelEditor) return;

    if (Date.now() - lastMouseUp < 200) return;

    if (editorState.editorMode === EditorMode.SELECT) {
      if (editorState.selecting === SELECTION_UPDATE_MODE.move) {
        if (makeUndoCheckpoint()) editorState.setDirty();
      } else if (editorState.selecting !== SELECTION_UPDATE_MODE.none) {
        editorState.selection.normalize();
      }

    } else {
      if (editorState.editorMode === EditorMode.FILL) {
        const [tx, ty] = getEventTileCoords(e);
        const [fillTool, onTopLayer] = getPlaceTool(e.button)
        const index = layerIndexForPoint(tx, ty);
        const targetTool = onTopLayer ? editorState.level.topCode(index) : editorState.level.bottomCode(index);
        fill(tx, ty, fillTool, targetTool, onTopLayer);
      } else if (!dragging) {
        // regular click
        const [tx, ty] = getEventTileCoords(e);
        const [tool, onTopLayer] = getPlaceTool(e.button)
        editorState.placeTile(tx, ty, tool, onTopLayer, 0);
      } else if (dragLinking) {
        const stx = Math.floor(editorState.dragInfo.sourcePoint.x / TILE_SIZE);
        const sty = Math.floor(editorState.dragInfo.sourcePoint.y / TILE_SIZE);
        const etx = Math.floor(editorState.dragInfo.endPoint.x / TILE_SIZE);
        const ety = Math.floor(editorState.dragInfo.endPoint.y / TILE_SIZE);
        const eindex = layerIndexForPoint(etx, ety);
        const etopCode = editorState.level.topCode(eindex);
        const ebottomCode = editorState.level.bottomCode(eindex);

        if (codesIn(CC.BROWN_BUTTON, [dragSourceTiles.topCode, dragSourceTiles.bottomCode], CC.TRAP, [etopCode, ebottomCode])) {
          editorState.addTrapLink(stx, sty, etx, ety);
        } else if (codesIn(CC.BROWN_BUTTON, [etopCode, ebottomCode], CC.TRAP, [dragSourceTiles.topCode, dragSourceTiles.bottomCode])) {
          editorState.addTrapLink(etx, ety, stx, sty);
        } else if (codesIn(CC.RED_BUTTON, [dragSourceTiles.topCode, dragSourceTiles.bottomCode], CC.CLONE_MACHINE, [ebottomCode])) {
          editorState.addCloneLink(stx, sty, etx, ety);
        } else if (codesIn(CC.RED_BUTTON, [etopCode, ebottomCode], CC.CLONE_MACHINE, [dragSourceTiles.bottomCode])) {
          editorState.addCloneLink(etx, ety, stx, sty);
        }
      }

      if (!editorState.activated && prevLevelState) {
        const diff = makeLevelDiff(editorState.level, prevLevelState);
        if (!diff.isEmpty()) {
          editorState.undoStackPush(diff);
          editorState.redoStackClear();
          editorState.setDirty();
        }
      }
    }

    setMouseDownEvent(null);
    setDragging(false);
    setDragPainting(false);
    setDragLinking(false);
    setPrevDragTile(null);
    editorState.setSelecting(SELECTION_UPDATE_MODE.none);
    setDragSourceTiles(null);
    setDragDirs([]);
    editorState.setDragInfo({});
    editorState.setShape(null);
    setLastMouseUp(Date.now());
  }

  // --------------------------------------------------------------------------

  function hoistLocations(linkList, selection, targetLevel) {
    for (const link of linkList) {
      if (link.from.isIn(selection)) link.from.update(link.from.x - targetLevel.origin.x, link.from.y - targetLevel.origin.y, targetLevel);
      if (link.to.isIn(selection)) link.to.update(link.to.x - targetLevel.origin.x, link.to.y - targetLevel.origin.y, targetLevel);
    }
  }

  function detachSelection() {
    // the undo rollback state
    editorState.setCurrentLevel(editorState.level.copy());
    // the level from which the floating selection is removed and will be merged
    editorState.setBaselineLevel(editorState.level.copy());
    // the selected subset of the level
    editorState.setFloatingSelection(editorState.baselineLevel.extractSection(editorState.selection));

    // Special case: to allow for a detached selection's links to follow it around,
    // hoist any link locations in the selection to the target level.
    // This will result in "mixed" links, where one end reamins on the baseline and the 
    // other end is on the floating (but the link itself remains in the baseline's list).
    hoistLocations(editorState.baselineLevel.trapLinks, editorState.selection, editorState.floatingSelection);
    hoistLocations(editorState.baselineLevel.cloneLinks, editorState.selection, editorState.floatingSelection);

    editorState.baselineLevel.replaceRect(editorState.selection.toRect());
  }

  function deleteSelection() {
    if (editorState.editorMode === EditorMode.SELECT && editorState.selection) {
      editorState.undoable(() => editorState.level.replaceRect(editorState.selection.toRect()));
      editorState.setSelection(null);
      editorState.setDirty();
    }
  }

  function cutSelection() {
    if (editorState.editorMode === EditorMode.SELECT && editorState.selection) {
      copySelection();
      editorState.undoable(() => editorState.level.replaceRect(editorState.selection.toRect()));
      editorState.setSelection(null);
      editorState.setDirty();
    }
  }

  function copySelection() {
    if (editorState.editorMode === EditorMode.SELECT && editorState.selection) {
      editorState.setClipboard(editorState.level.extractSection(editorState.selection));
      editorState.clipboard.origin.x = 0;
      editorState.clipboard.origin.y = 0;
    }
  }

  function pasteSelection() {
    if (editorState.clipboard) {
      editorState.setEditorMode(EditorMode.SELECT);
      editorState.setCurrentLevel(editorState.level.copy());
      editorState.setBaselineLevel(editorState.level.copy());
      editorState.setFloatingSelection(editorState.clipboard.copy());

      if (editorState.highlightedX && editorState.highlightedY) {
        editorState.floatingSelection.origin.x = editorState.highlightedX;
        editorState.floatingSelection.origin.y = editorState.highlightedY;
      }

      editorState.setLevel(editorState.baselineLevel.merge(editorState.floatingSelection), false);
      const selectionTo = {x: editorState.floatingSelection.origin.x + editorState.floatingSelection.size.w - 1,
          y: editorState.floatingSelection.origin.y + editorState.floatingSelection.size.h - 1};
      editorState.setSelection(new Selection(editorState.floatingSelection.origin, selectionTo));
      if (makeUndoCheckpoint()) editorState.setDirty();
    }
  }

  function makeUndoCheckpoint() {
    if (editorState.currentLevel) {
      const diff = makeLevelDiff(editorState.level, editorState.currentLevel);
      if (!diff.isEmpty()) {
        editorState.undoStackPush(diff);
        editorState.redoStackClear();
        editorState.setCurrentLevel(editorState.level.copy());
        return true;
      }
    }
    return false;
  }

  // --------------------------------------------------------------------------

  function fill(tx, ty, fillTool, targetTool, onTopLayer) {
    console.log(`filling ${targetTool} with ${fillTool} from ${tx},${ty} topLayer? ${onTopLayer}`)
    if (fillTool === targetTool) return;
    _fill(tx, ty, fillTool, targetTool, onTopLayer)
    editorState.setDirty();
  }

  // naive and inefficient, but max is 32x32 so come at me
  function _fill(tx, ty, fillTool, targetTool, onTopLayer) {
    if (tx < 0 | ty < 0 || tx >= editorState.level.size.w || ty >= editorState.level.size.h) return;
    const index = layerIndexForPoint(tx, ty);
    const currentTool = onTopLayer ? editorState.level.topCode(index) : editorState.level.bottomCode(index)
    if (currentTool === targetTool) {
      editorState.placeTile(tx, ty, fillTool, onTopLayer);
      // onTopLayer ? editorState.level.setTopCode(index, fillTool) : editorState.level.setBottomCode(index, fillTool);
      _fill(tx, ty-1, fillTool, targetTool, onTopLayer);
      _fill(tx+1, ty, fillTool, targetTool, onTopLayer);
      _fill(tx, ty+1, fillTool, targetTool, onTopLayer);
      _fill(tx-1, ty, fillTool, targetTool, onTopLayer);
    }
  }

  // --------------------------------------------------------------------------

  function toggleGameplayViewport() {
    editorState.toggleGameplayViewport();
    editorState.clearOverlayHighlight();
    editorState.clearSelections();

    if (editorState.showGameplayViewport) {
      ensureChipVisible(true);
    }
  }

  function ensureChipVisible(smooth = false) {
    let vx = -1
    let vy = -1;
    if (editorState.activated && editorState.level.chip()) {
      [vx, vy] = getCreatureLocation(editorState.level.chip());
    } else if (editorState.highlightedX >= 0) {
      [vx, vy] = pointForLayerIndex(editorState.level.findChip());
      vx *= TILE_SIZE;
      vy *= TILE_SIZE;
    }
    if (vx >= 0 && vy >= 0) {
      const scroller = container.current;

      // 12 for number border + padding
      const topY = vy - (4 * TILE_SIZE) + 12;
      const bottomY = vy + (5 * TILE_SIZE) - scroller.clientHeight + 12;
      const leftX = vx - (4 * TILE_SIZE) + 12;
      const rightX = vx + (5 * TILE_SIZE) - scroller.clientWidth + 12;
      
      const scrollX = (leftX < scroller.scrollLeft) ? leftX
          : (rightX > scroller.scrollLeft) ? rightX
          : scroller.scrollLeft;
      const scrollY = (topY < scroller.scrollTop) ? topY
          : (bottomY > scroller.scrollTop) ? bottomY
          : scroller.scrollTop;

      scroller.scroll({top: scrollY, left:scrollX, behavior: smooth ? 'smooth' : 'auto'});
    }
  }

  // --------------------------------------------------------------------------

  const DirForKey = {
    ArrowUp: Dir.N,
    ArrowDown: Dir.S,
    ArrowLeft: Dir.W,
    ArrowRight: Dir.E,
    'w': Dir.N,
    's': Dir.S,
    'a': Dir.W,
    'd': Dir.E,
  }

  const keyboardDirProvider = {
    getNextDir: () => {
      const press = DirForKey[keypressStack.shift()];
      const hold = DirForKey[keyholdList[0]];
      const d = press | hold;
      // if a valid diagonal, use that
      if (dirtoindex(d) !== -1) return d;
      // if not diagonal, keypress gets priority, otherwise it's the latest key still held down
      return press || hold || 0;
    }
  }

  // regular play mode - input is from keyboard
  function activate() {
    editorState.setEditorMode(EditorMode.DRAW);
    initSound();
    storeLocally();
    keypressStack.length = 0;
    keyholdList.length = 0;

    editorState.setReplaying(false);
    editorState.setReplayEndTick(0);
    editorState.setActivated(true);
    editorState.gamelogic.state.nextDirProvider = keyboardDirProvider;
  }

  // replay mode - input is from tws solution
  async function replay() {
    if (!editorState.replayAvailable()) return;
    
    editorState.setEditorMode(EditorMode.DRAW);
    initSound();
    storeLocally();

    editorState.setReplaying(true);
    editorState.setActivated(true);

    const levelsetName = editorState.levelsetFilename.slice(0, -4);
    const solutionBytes = await loadBinaryAsset(`public_${levelsetName}-lynx.dac.tws`);
    const solution = loadSolution(solutionBytes, editorState.levelNum-1);
    editorState.gamelogic.state.stepping = solution.stepParity;
    restartprng(editorState.gamelogic.state.mainprng, solution.prngSeed);
    editorState.gamelogic.state.nextrndslidedir = solution.initialRandomForceDir;
    editorState.gamelogic.state.nextDirProvider = getTWReplayDirProvider(solution.actions);
    editorState.setReplayEndTick(solution.numFrames);
  }

  // seek currently means reload the solution and play through up to the desired tick
  async function seek(pos) {
    editorState.setSeeking(true);
    const levelsetName = editorState.levelsetFilename.slice(0, -4);
    const solutionBytes = await loadBinaryAsset(`public_${levelsetName}-lynx.dac.tws`);
    const solution = loadSolution(solutionBytes, editorState.levelNum-1);

    editorState.createGame();

    editorState.gamelogic.state.stepping = solution.stepParity;
    restartprng(editorState.gamelogic.state.mainprng, solution.prngSeed);
    editorState.gamelogic.state.nextrndslidedir = solution.initialRandomForceDir;
    editorState.gamelogic.state.nextDirProvider = getTWReplayDirProvider(solution.actions);

    editorState.setRunning(false);
    editorState.setSeekPos(pos);
  }

  function restart() {
    editorState.restart();
    editorState.gamelogic.state.nextDirProvider = keyboardDirProvider;
  }

  function deactivate() {
    editorState.setActivated(false);
  }

  function liveMode() {
    gameloopStopperFactory.current = () => null;
    editorState.setPlayMode(PlayMode.LIVE);
  }

  function turnMode() {
    pausePlay();
    gameloopStopperFactory.current = () => new TurnGameloopStopper();
    editorState.setPlayMode(PlayMode.TURN);
  }

  function tickMode() {
    pausePlay();
    gameloopStopperFactory.current = () => new TickGameloopStopper(1);
    editorState.setPlayMode(PlayMode.TICK);
  }

  function startPlay() {
    if (editorState.gamelogic.state.nextDirProvider.reset) {
      editorState.gamelogic.state.nextDirProvider.reset(editorState.gamelogic.state.currenttime);
    }
    editorState.setForward(true);
    editorState.setRunning(true);
    setGameloopStopper(editorState.replaying ? null : gameloopStopperFactory.current());
  }

  function pausePlay() {
    editorState.setRunning(false);
  }

  function stepTick() {
    if (editorState.gamelogic.state.nextDirProvider.reset) {
      editorState.gamelogic.state.nextDirProvider.reset(editorState.gamelogic.state.currenttime);
    }
    editorState.setForward(true);
    editorState.setRunning(true);
    setGameloopStopper(new TickGameloopStopper(1));
  }

  function backTick() {
    editorState.setForward(false);
    editorState.setRunning(true);
    setGameloopStopper(new TickGameloopStopper(1));
  }

  function stepTurn() {
    if (editorState.gamelogic.state.nextDirProvider.reset) {
      editorState.gamelogic.state.nextDirProvider.reset(editorState.gamelogic.state.currenttime);
    }
    editorState.setForward(true);
    editorState.setRunning(true);
    setGameloopStopper(new TickGameloopStopper(FRAMES_PER_STEP));
  }

  function backTurn() {
    editorState.setForward(false);
    editorState.setRunning(true);
    setGameloopStopper(new TickGameloopStopper(FRAMES_PER_STEP));
  }

  function invert() {
    editorState.setForward(false);
    editorState.setRunning(true);
    setGameloopStopper(editorState.replaying ? null : gameloopStopperFactory.current());
  }

  function undoToLastMove() {
    editorState.setUndoToLastMove();
  }

  function incSpeed() {
    if (editorState.speed < 5) {
      if (editorState.speed >= 1) {
        editorState.setSpeed(editorState.speed + 1);
      } else {
        editorState.setSpeed(Math.round((editorState.speed * 2) * 100) / 100);
      }
    }
  }
  
  function decSpeed() {
    if (editorState.speed > 0.25) {
      if (editorState.speed <= 1) {
        editorState.setSpeed(Math.round((editorState.speed / 2) * 100) / 100);
      } else {
        editorState.setSpeed(editorState.speed - 1);
      }
    }
  }

  const flipHorizontally = () => {
    _selectionAction(
      () => editorState.floatingSelection.flipHorizontally(), 
      location => flipLocationHorizontally(location)
    );
  }

  const flipVertically = () => {
    _selectionAction(
      () => editorState.floatingSelection.flipVertically(),
      location => flipLocationVertically(location)
    );
  }

  const rotateLeft = () => {
    _selectionAction(
      () => editorState.floatingSelection.rotateLeft(),
      location => rotateLocationLeft(location)
    );
  }

  const rotateRight = () => {
    _selectionAction(
      () => editorState.floatingSelection.rotateRight(),
      location => rotateLocationRight(location)
    );
  }

  const transpose = () => {
    _selectionAction(
      () => editorState.floatingSelection.transpose(),
      location => transposeLocation(location)
    )
  }

  function _selectionAction(levelTransform, locationTransform) {
    if (editorState.selection) {
      if (!editorState.floatingSelection) detachSelection();

      // special case: the baseline level can have links with a location on the
      // floating selection that need to be transformed
      for (const link of editorState.baselineLevel.trapLinks) {
        if (link.from.level === editorState.floatingSelection) locationTransform(link.from);
        if (link.to.level === editorState.floatingSelection) locationTransform(link.to);
      }
      for (const link of editorState.baselineLevel.cloneLinks) {
        if (link.from.level === editorState.floatingSelection) locationTransform(link.from);
        if (link.to.level === editorState.floatingSelection) locationTransform(link.to);
      }

      levelTransform();

      editorState.selection.resize(editorState.floatingSelection.origin, editorState.floatingSelection.size);
      editorState.setLevel(editorState.baselineLevel.merge(editorState.floatingSelection), false);
      if (makeUndoCheckpoint()) editorState.setDirty();
    }
  }

  function selectionButtonStyle(fx, fy) {
    const [sx, sy, sw, sh] = editorState.selection.dimensions();
    let x = fx(sx, sw) * editorState.scale;
    let y = fy(sy, sh) * editorState.scale;
    let s = TILE_SIZE/2 * editorState.scale
    return {width:s + 'px',
            height:s + 'px',
            fontSize: 0.75 * editorState.scale + 'rem',
            left:x + 'px',
            top:y + 'px'}
  }

  const rotateLeftStyle = () => {
    return selectionButtonStyle(
      (sx, _) => sx + 23,
      (sy, _) => sy + 5
    )
  }

  const rotateRightStyle = () => {
    return selectionButtonStyle(
      (sx, _) => sx + 41,
      (sy, _) => sy + 5
    )
  }

  const horizFlipStyle = () => {
    return selectionButtonStyle(
      (sx, _) => sx + 5,
      (sy, _) => sy + 23
    )
  }

  const vertFlipStyle = () => {
    return selectionButtonStyle(
      (sx, _) => sx + 5,
      (sy, _) => sy + 41
    )
  }

  const transposeStyle = () => {
    return selectionButtonStyle(
      (sx, _) => sx + 5,
      (sy, _) => sy + 5
    )
  }

  // --------------------------------------------------------------------------

  const topTile = editorState.highlightedTopLevelTile;
  const bottomTile = editorState.highlightedBottomLevelTile;

  return (
    <div className="middle-pane">
      <EditorHeader
          save={props.save} saveAs={props.saveAs} close={props.close} undo={undo} redo={redo}
          cut={cutSelection} copy={copySelection} paste={pasteSelection}
          prevLevel={props.prevLevel} nextLevel={props.nextLevel}
          zoomOut={zoomOut} zoomIn={zoomIn} zoomToFit={zoomToFit} toggleGameplayViewport={toggleGameplayViewport}
          activate={activate} replay={replay} deactivate={deactivate}
      />

      <div className="editor-contents">
        <div className="editor-container" ref={container}>
          <canvas ref={canvas} height={canvasSize} width={canvasSize}/>
          <GameBoardContainer offset={canvasSize - gameboardCanvasSize - Math.floor((brPadding * editorState.scale))}
              onContextMenu={ignore} onMouseMove={mouseMoved} 
              onMouseDown={mouseDown} onMouseUp={mouseUp}>
            <GameBoard level={editorState.level} canvasSize={gameboardCanvasSize} 
                  gameloopStopper={gameloopStopper} ensureChipVisible={ensureChipVisible}/>
            {editorState.editorMode === EditorMode.SELECT && editorState.selection && !editorState.selecting && !editorState.selection.is1x1() &&
              <div>
                <SelectionButton style={rotateLeftStyle()} onClick={rotateLeft}><i className="fas fa-undo"></i></SelectionButton>
                <SelectionButton style={rotateRightStyle()} onClick={rotateRight}><i className="fas fa-redo"></i></SelectionButton>
                <SelectionButton style={horizFlipStyle()} onClick={flipHorizontally}><i className="fas fa-exchange-alt"></i></SelectionButton>
                <SelectionButton style={vertFlipStyle()} onClick={flipVertically}><i className="fas fa-exchange-alt fa-rotate-90"></i></SelectionButton>
                <SelectionButton style={transposeStyle()} onClick={transpose}><i className="fas fa-exchange-alt fa-rotate-225"></i></SelectionButton>
              </div>
            }
          </GameBoardContainer>
        </div>

        <RightPane/>
      </div>

      <EditorFooter topTile={topTile} bottomTile={bottomTile} 
          play={startPlay} pause={pausePlay} stepTick={stepTick} stepTurn={stepTurn} 
          invert={invert} backTick={backTick} backTurn={backTurn} seek={seek}
          undoToLastMove={undoToLastMove} incSpeed={incSpeed} decSpeed={decSpeed}
          liveMode={liveMode} turnMode={turnMode} tickMode={tickMode}/>

      {editorState.tilesetModal &&
        <TilesetModal/>
      }
    </div>
  );
});

export default Editor;
