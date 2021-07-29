/* eslint-disable no-loop-func */
import React from 'react';
import { makeAutoObservable, isObservable, makeObservable, observable, action } from 'mobx';
import { writeLevelset } from '../engine/levelset/CCLevelsetWriter';
import { CCTileSet } from '../engine/tiles/cctileset';
import { TWTileSet } from '../engine/tiles/twtileset';
import { pointForLayerIndex, layerIndexForPoint, placeTile, addLink, removeLink } from '../engine/util/utils';
import { lynxlogicstartup } from '../engine/logic/lynx';
import { CC, getTile, isMonster, isDirectionalForce, isIce, isBlock, isChip } from '../engine/tiles/tile'
import { TW, ismonster, TWtoCC, creaturedirid, creatureid } from '../engine/logic/twtile';
import { Creature, getCreatureLocation } from '../engine/model/creature';
import { levelToGameState } from "../engine/model/gamestate";
import { Dir, dirtoindex } from '../engine/logic/dir';
import logger from 'simple-console-logger';
import BitSet from 'bitset';
import { makeLevelDiff } from '../engine/model/level';
import * as sound from '../engine/util/sound';
import { TILE_SIZE } from '../engine/tiles/tileset';

export const LeftPaneState = Object.freeze({LevelsetManager: 1, LevelEditor: 2});
export const LayerEditState = Object.freeze({Top: 1, Both: 2})

export function updateLocalStorage(editorState, b, ts, markSaved=true) {
  if (!editorState.activated) {
    const bytes = b || writeLevelset(editorState.levelset);
    // ugly, but functional String.fromCharCode can exceed call stack
    // if bytes is long enough
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    localStorage.setItem('levelset', s);
    if (markSaved) {
      editorState.markSavedLocally(ts);
      localStorage.setItem('levelset.savedAt', editorState.locallyStoredAt);
    }
    // I can't get TextEncoder/TextDecoder to transform bytes->string->same bytes
    // localStorage.setItem('levelset', new TextDecoder('ascii').decode(bytes));
    // console.log(`${Date.now()} updated localStorage`);
  }
}

export function generatePassword(levelset) {
  function g() {
    const min = 'A'.charCodeAt(0);
    const max = 'Z'.charCodeAt(0);
    const a = Array(4).fill().map((_,i) => Math.floor(Math.random() * (max-min+1) + min));
    return String.fromCharCode.apply(String, a);
  }

  let password = g();
  while (levelset.findIndex(l => l.password === password) >= 0) {
    password = g();
  }
  return password;
}

export const builtinTilesets = new Map([
  ['cc', {id:'cc', file:'tiles-cc.gif', name:"CC Original", class:CCTileSet}],
  ['tw', {id:'tw', file:'tiles-tw.png', name:"Tile World", class:TWTileSet}],
  ['ww', {id:'ww', file:'tiles-ww.png', name:"Will's World", class:CCTileSet}],
]);

/**
 * Separate class so mobx can see it (mobx doesn't like class heirarchy).
 * Tracked here separately from (but in parallel to) the level's monsters, 
 * for display in the monster info pane.
 */
export class ObservableMonster {
  constructor(monster) {
    this.monster = monster;
    this.refresh(monster);
    makeAutoObservable(this);
  }

  refresh(monster) {
    this.pos = monster.pos;
    const dir = monster.dir ? monster.dir : creaturedirid(monster.id);
    this.code = TWtoCC[creatureid(monster.id)].code + dirtoindex(dir);
  }

  getLocation() { 
    const [x, y] = getCreatureLocation(this.monster);
    return {x, y};
  }
}

export class ObservableChip {
  constructor(cr) {
    this.hasFlippers = false;
    this.hasFireboots = false;
    this.hasSkates = false;
    this.hasForceboots = false;
    this.numBlueKeys = 0;
    this.numRedKeys = 0;
    this.numYellowKeys = 0;
    this.hasGreenKey = false;
    makeAutoObservable(this);
    if (cr) this.refresh(cr);
  }

  refresh(cr) {
    this.hasFlippers = cr.hasFlippers;
    this.hasFireboots = cr.hasFireboots;
    this.hasSkates = cr.hasSkates;
    this.hasForceboots = cr.hasForceboots;
    this.numBlueKeys = cr.numBlueKeys;
    this.numRedKeys = cr.numRedKeys;
    this.numYellowKeys = cr.numYellowKeys;
    this.hasGreenKey = cr.numGreenKeys > 0;
  }
}

export const SELECTION_UPDATE_MODE = Object.freeze({
  none: 0,
  move: 1,
  topleft: 2,
  top: 3,
  topright: 4,
  right: 5,
  bottomright: 6,
  bottom: 7,
  bottomleft: 8,
  left: 9
});

export class Selection {
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }

  // return [x,y,w,h] in pixels
  dimensions() {
    const sx = Math.min(this.from.x, this.to.x) * TILE_SIZE;
    const sy = Math.min(this.from.y, this.to.y) * TILE_SIZE;
    const sw = (Math.abs(this.from.x - this.to.x) + 1) * TILE_SIZE;
    const sh = (Math.abs(this.from.y - this.to.y) + 1) * TILE_SIZE;
    return [sx, sy, sw, sh];
  }

  is1x1() {
    return this.from.x === this.to.x && this.from.y === this.to.y;
  }

  // set 'from' to be top left, 'to' to be bottom right
  normalize() {
    const fx = Math.min(this.from.x, this.to.x);
    const fy = Math.min(this.from.y, this.to.y);
    const tx = Math.max(this.from.x, this.to.x);
    const ty = Math.max(this.from.y, this.to.y);
    this.from = {x:fx, y:fy}
    this.to = {x:tx, y:ty}
    return this;
  }

  resize(origin, size) {
    this.from = {...origin};
    this.to = {x: origin.x + size.w - 1, y: origin.y + size.h - 1};
  }

  toRect() {
    const size = {w: this.to.x - this.from.x + 1, h: this.to.y - this.from.y + 1};
    return {origin: this.from, size: size};
  }

  contains(x, y, rx, ry, rw, rh) {
    return (x >= rx && x <= rx+rw && y >= ry && y <= ry+rh);
  }

  // figure out which selection handle is hit for given x,y
  updateMode(x, y) {
    const handleSize = 10;
    const [sx, sy, sw, sh] = this.dimensions();
    if (this.contains(x, y, sx, sy, handleSize, handleSize)) {
      return SELECTION_UPDATE_MODE.topleft;
    } else if (this.contains(x, y, sx+sw-handleSize, sy, handleSize, handleSize)) {
      return SELECTION_UPDATE_MODE.topright;
    } else if (this.contains(x, y, sx+sw-handleSize, sy+sh-handleSize, handleSize, handleSize)) {
      return SELECTION_UPDATE_MODE.bottomright;
    } else if (this.contains(x, y, sx, sy+sh-handleSize, handleSize, handleSize)) {
      return SELECTION_UPDATE_MODE.bottomleft;
    } else if (this.contains(x, y, sx+sw/2-handleSize/2, sy, handleSize, handleSize)) {
      return SELECTION_UPDATE_MODE.top;
    } else if (this.contains(x, y, sx+sw/2-handleSize/2, sy+sh-handleSize, handleSize, handleSize)) {
      return SELECTION_UPDATE_MODE.bottom;
    } else if (this.contains(x, y, sx, sy+sh/2-handleSize/2, handleSize, handleSize)) {
      return SELECTION_UPDATE_MODE.left;
    } else if (this.contains(x, y, sx+sw-handleSize, sy+sh/2-handleSize/2, handleSize, handleSize)) {
      return SELECTION_UPDATE_MODE.right;
    } else if (this.contains(x, y, sx, sy, sw, sh)) {
      return SELECTION_UPDATE_MODE.move;
    }
    return SELECTION_UPDATE_MODE.none;
  }
}

const directionalForce = {
  [Dir.N]: CC.FORCE_N,
  [Dir.E]: CC.FORCE_E,
  [Dir.S]: CC.FORCE_S,
  [Dir.W]: CC.FORCE_W,
};
// N/W/S/E
const directionalIce = [
  [CC.ICE, CC.ICE_SW, CC.ICE, CC.ICE_SE],
  [CC.ICE_NE, CC.ICE, CC.ICE_SE, CC.ICE],
  [CC.ICE, CC.ICE_NW, CC.ICE, CC.ICE_NE],
  [CC.ICE_NW, CC.ICE, CC.ICE_SW, CC.ICE],
];

export const EditorMode = Object.freeze({DRAW:1, SELECT:2, FILL:3, RECT:4, RECTFILL:5, ELLIPSE:6, ELLIPSEFILL:7});
export const PlayMode = Object.freeze({LIVE:1, TURN:2, TICK:3});

export default class EditorState {
  // array of Level
  levelset = [];

  levelsetFilename = '';
  levelsetFilehandle = null;

  // currently active Level
  level = null;

  // currently active level number
  levelNum = null;

  // list of ObservableMonster
  // populated from level.creatures
  observableMonsters = null;
  observableChip = null;

  shouldShowIntroScreen = true;
  shouldShowIntroLoading = false;
  leftPaneState = LeftPaneState.LevelsetManager;

  modifiedAt = 0;
  locallyStoredAt = 0;
  exportedAt = 0;

  topLayerTool = CC.WALL;
  bottomLayerTool = CC.FLOOR;

  highlightedX = -1;
  highlightedY = -1;
  highlightedTopLevelTile = null;
  highlightedBottomLevelTile = null;

  showGameplayViewport = false;

  editorMode = EditorMode.DRAW;
  selection = null;
  selecting = SELECTION_UPDATE_MODE.none;

  floatingSelection = null;
  baselineLevel = null;
  clipboard = null;
  
  shape = null;

  overlayHighlight = null;

  showMonsterNumbers = true;
  showTrapLinks = true;
  showCloneLinks = true;

  selectedMonster = null;
  selectedTrap = null;
  selectedClone = null;

  showLevelInfoPane = true;
  showMonstersPane = true;
  showTrapsPane = true;
  showCloneMachinesPane = true;

  chipsPresent = 0;

  layerEditState = LayerEditState.Top;

  tileset = null;
  tilesetCode = null;
  tilesetModal = false;

  soundEnabled = true;

  exportModal = false;

  directionalPainting = false;

  inputEditing = false;

  gamelogic = null;
  activated = false;
  running = false;    // if gameloop should be running in live mode
  speed = 1.0;
  playbackForward = true;
  playMode = PlayMode.LIVE;
  seekPos = 0;        // desired seek position - triggers actual seek [0-100]
  replaying = false;
  replayPos = 0;      // seek bar thumb position [0-100]
  replayEndTick = 0;  // last tick in the replay (for replayPos calculation)
  seeking = false;
  undoToLastMove = 0;       // signal to revert back to last successful move
  temporarilyModifiedAt = 0;
  totalGameLoopDuration = 0;
  // caching the original level during activation
  // any edits made during activation are lost upon deactivation
  currentLevel = null;
  scale = 1.0;
  dragInfo = {};
  mouseoverTeleportIndex = null;

  undoStack = [];
  redoStack = [];

  stepParity = 0;

  // --------------------------------------------------------------------------

  constructor() {
    makeAutoObservable(this);
  }

  setLevelset(s) { 
    this.levelset = s; 
    this.setDirty();
  }

  addLevel(level) {
    level.password = generatePassword(this.levelset);
    this.levelset.push(level);
    this.setLevel(level);
    this.setDirty();
  }

  removeLevel(levelNum) {
    const newList = Array.from(this.levelset);
    newList.splice(levelNum-1, 1);
    newList.slice(levelNum-1).forEach(l => l.setLevelNumber(l.levelNumber - 1));
    this.setLevelset(newList);
    this.setDirty();
  }

  setLevel(l, clearUndo = true) {
    if (l) {
      this.level = isObservable(l) ? l : makeAutoObservable(l);
      this.refreshObservables();
      this.refreshChipsPresent();
      // todo this will put full javascript object level
      // (not just byte array) in the levelset list
      // whenever someone just looks at a level
      if (this.levelset && this.levelset.length >= l.levelNumber) {
        this.levelset[l.levelNumber-1] = l;
      }
      if (clearUndo) {
        this.undoStack = [];
        this.redoStack = [];
      }
    } else {
      this.level = null;
    }
  }

  setLevelNum(n) { 
    this.setActivated(false);
    this.levelNum = n; 
  }

  refreshObservables() {
    if (this.activated) {
      this.observableMonsters = this.gamelogic.state.creatures
          .filter(cr => ismonster(cr.id))
          .filter(m => !m.hidden)
          .filter(m => this.level.topCode(m.pos) !== CC.CLONE_MACHINE.code)
          .map(m => new ObservableMonster(m));
      this.observableChip = new ObservableChip(this.gamelogic.state.chip());
      if (this.replaying && this.replayEndTick) this.replayPos = Math.round(this.gamelogic.state.currenttime * 100 / this.replayEndTick);
    } else {
      this.observableMonsters = this.level.creatures.map(m => new ObservableMonster(m));
    }
    // this.observableChip = new ObservableChip(this.level.chip);
  }

  setLevelsetFilename(n) { this.levelsetFilename = n; }
  setLevelsetFilehandle(h) { this.levelsetFilehandle = h; }

  showIntroScreen() { this.shouldShowIntroScreen = true; }
  hideIntroScreen() { 
    this.shouldShowIntroScreen = false;
    this.shouldShowIntroLoading = false;
  }
  setIntroLoading(s) {
    this.shouldShowIntroLoading = s;
  }
  setLeftPaneState(val) { this.leftPaneState = val; }

  hasUnstoredChanges() {
    return this.modifiedAt > this.locallyStoredAt;
  }

  hasUnexportedChanges() {
    return this.modifiedAt > this.exportedAt;
  }

  setModifiedAt(d) {
    this.modifiedAt = d;
  }

  setDirty() {
    if (this.activated) {
      if (!this.running) {
        this.temporarilyModifiedAt = Date.now();
      }
      // edits during activation simply don't count
      return;
    }

    this.modifiedAt = Date.now();
    if (this.level) this.level.setDirty();
  }

  markSavedLocally(d = Date.now()) { 
    this.locallyStoredAt = d;
  }

  clearDirtyFlags() {
    this.modifiedAt = 0;
    this.locallyStoredAt = 0;
    this.exportedAt = 0;
  }

  markExported(d = Date.now()) { 
    this.exportedAt = d; 
  }

  setTopLayerTool(t) { this.topLayerTool = t; }
  setBottomLayerTool(t) { this.bottomLayerTool = t; }
  swapTools() { 
    let t = this.topLayerTool;
    this.topLayerTool = this.bottomLayerTool;
    this.bottomLayerTool = t;
  }

  replaceTiles(existingTool, desiredTool) {
    this.undoable(() => {
      for (let tx = 0; tx < this.level.size.w; tx++) {
        for (let ty = 0; ty < this.level.size.h; ty++) {
          const index = layerIndexForPoint(tx, ty);
          if (this.level.topCode(index) === existingTool.code) {
            this.placeTile(tx, ty, desiredTool.code, true, 0);
          }

          if (this.layerEditState === LayerEditState.Both && this.level.bottomCode(index) === existingTool.code) {
            this.placeTile(tx, ty, desiredTool.code, false, 0);
          }
        }
      }
    });
  }

  replaceOtherTiles(keepTool, desiredTool) {
    this.undoable(() => {
      for (let tx = 0; tx < this.level.size.w; tx++) {
        for (let ty = 0; ty < this.level.size.h; ty++) {
          const index = layerIndexForPoint(tx, ty);
          if (this.level.topCode(index) !== keepTool.code) {
            this.placeTile(tx, ty, desiredTool.code, true, 0);
          }

          if (this.layerEditState === LayerEditState.Both && this.level.bottomCode(index) !== keepTool.code) {
            this.placeTile(tx, ty, desiredTool.code, false, 0);
          }
        }
      }
    });
  }

  setHighlighted(x, y) {
    const index = layerIndexForPoint(x, y);
    const topCode = this.level.topCode(index);
    const bottomCode = this.level.bottomCode(index);
    this.highlightedX = x;
    this.highlightedY = y;
    this.highlightedTopLevelTile = getTile(topCode);
    this.highlightedBottomLevelTile = getTile(bottomCode);
  }

  toggleGameplayViewport() {
    this.showGameplayViewport = !this.showGameplayViewport;
    if (this.showGameplayViewport) {
      const chipIndex = this.level.findChip();
      if (chipIndex >= 0) {
        const [x, y] = pointForLayerIndex(chipIndex);
        this.setHighlighted(x, y);
      }
    }
  }

  setOverlayHighlight(sx, sy, ex, ey) {
    this.overlayHighlight = {sx: sx, sy: sy, ex: ex, ey: ey};
  }

  // anything that has a getLocation function (eg. an ObservableMonster!)
  setOverlayHighlightLocatable(locatable) {
    this.overlayHighlight = {locatable: locatable};
  }

  clearOverlayHighlight() {
    this.overlayHighlight = null;
  }

  setEditorMode(m) {
    if (this.editorMode === EditorMode.SELECT) {
      this.setSelection(null);
      this.anchorSelection();
    }
    this.editorMode = m;
  }

  isEditorModeShape() {
    return [EditorMode.RECT, EditorMode.RECTFILL, EditorMode.ELLIPSE, EditorMode.ELLIPSEFILL].includes(this.editorMode);
  }

  setSelection(s) {
    this.selection = s;
  }

  setSelecting(b) {
    this.selecting = b;
  }

  setFloatingSelection(s) {
    this.floatingSelection = s;
  }

  setBaselineLevel(l) {
    this.baselineLevel = l;
  }

  anchorSelection() {
    this.setCurrentLevel(null);
    this.setFloatingSelection(null);
    this.setBaselineLevel(null);
  }

  setClipboard(l) {
    this.clipboard = l;
  }

  setShape(s) { 
    this.shape = s;
  }

  toggleMonsterNumbers() {
    this.showMonsterNumbers = !this.showMonsterNumbers;
  }

  toggleTrapLinks() {
    this.showTrapLinks = !this.showTrapLinks;
  }

  toggleCloneLinks() {
    this.showCloneLinks = !this.showCloneLinks;
  }

  clearSelections() {
    this.selectedMonster = null;
    this.selectedTrap = null;
    this.selectedClone = null;
  }

  setSelectedMonster(index) {
    this.clearSelections();
    this.selectedMonster = index;
  }

  setSelectedTrap(index) {
    this.clearSelections();
    this.selectedTrap = index;
  }

  setSelectedClone(index) {
    this.clearSelections();
    this.selectedClone = index;
  }

  // ------------------------------------------------------
  // editing only

  /**
   * Place tool on layer at [tx,ty]
   */
  placeTile(tx, ty, tool, onTopLayer, dirs=0) {
    if (onTopLayer && this.activated && (isBlock(tool) || isMonster(tool) || isChip(tool))) {
      // special case while activated - don't modify the layers, just the entities
      if (isBlock(tool)) {
        const block = new Creature(tx, ty);
        block.id = TW.Block;
        block.dir = Dir.N;
        this.level.addCreature(block);
        this.setDirty();
      } else if (isMonster(tool)) {
        const monster = new Creature(tx, ty, creatureid(tool));
        monster.dir = creaturedirid(tool);
        this.level.addCreature(monster);
        this.setDirty();
      }
      return;
    }

    // tool modification if directionally painting
    if (isDirectionalForce(tool) && dirs.length > 0 && this.directionalPainting) {
      tool = directionalForce[dirs[0]].code;
    } else if (isIce(tool) && dirs.length > 1 && this.directionalPainting) {
      tool = directionalIce[dirtoindex(dirs[1])][dirtoindex(dirs[0])].code;
    }

    if (placeTile(this.level, tx, ty, tool, onTopLayer)) {
      if (CC.TELEPORT.code === tool) {
        const index = layerIndexForPoint(tx, ty);
        this.setMouseoverTeleportIndex(index);
      }

      this.refreshObservables();
      this.refreshChipsPresent();
      this.setDirty();
      this.setHighlighted(tx, ty);
    }
  }

  removeMonster(pos) {
    const i = this.level.creatures.findIndex(m => m.pos === pos);
    if (i >= 0) {
      const newList = Array.from(this.level.creatures);
      newList.splice(i, 1);
      this.setMonsters(newList);
    }
  }

  setMonsters(creatures) {
    this.level.creatures = creatures;
    this.refreshObservables();
    this.setDirty();
  }

  addTrapLink(x, y, trapx, trapy) {
    this.level.trapLinks = addLink(this.level, x, y, trapx, trapy, this.level.trapLinks);
    this.setDirty();
  }

  removeTrapLink(index) {
    this.level.trapLinks = removeLink(index, this.level.trapLinks);
    this.setDirty();
  }

  addCloneLink(x, y, machinex, machiney) {
    this.level.cloneLinks = addLink(this.level, x, y, machinex, machiney, this.level.cloneLinks);
    this.setDirty();
  }

  removeCloneLink(index) {
    this.level.cloneLinks = removeLink(index, this.level.cloneLinks);
    this.setDirty();
  }

  togglePane(f) {
    this[f] = !this[f];
  }

  setLayerEditState(val) { this.layerEditState = val; }
  toggleLayerEditState() { 
    this.layerEditState = this.layerEditState === LayerEditState.Top ? LayerEditState.Both : LayerEditState.Top;
  }

  setTitle(title) {
    this.level.title = title;
    this.setDirty();
  }

  setPassword(password) {
    this.level.password = password;
    this.setDirty();
  }

  getNumChipsRequired() {
    return isNaN(parseInt(this.level.numChipsRequired)) ? 0 : parseInt(this.level.numChipsRequired)
  }

  setNumChipsRequired(numChipsRequired) {
    this.level.numChipsRequired = numChipsRequired;
    this.setDirty();
  }

  refreshChipsPresent() {
    this.chipsPresent = this.level.countChips();
  }

  setTimeLimit(timeLimit) {
    this.level.timeLimit = timeLimit;
    this.setDirty();
  }

  setHint(hint) {
    this.level.hint = hint;
    this.setDirty();
  }

  toggleWalls() {
    this.level.toggleWalls();
    this.setDirty();
  }

  showExportModal() {
    this.exportModal = true;
  }

  hideExportModal() {
    this.exportModal = false;
  }

  loadTileset(ts) {
    const code = ts.startsWith('[i]') ? ts.substr(3) : ts;
    import(`../assets/${builtinTilesets.get(code).file}`).then(tileImage => {
      const i = new Image();
      i.src = tileImage.default;
      i.onload = () => {
        // w/h=0.4375 would be Tile World image (with 7x16 tiles - no masks)
        // w/h=0.8125 would be CC image (with 13x16 tiles - including masks)
        const clazz = builtinTilesets.get(code).class;
        this.setTileset(new clazz(i));
        this.tilesetCode = `[i]${code}`;
        localStorage.setItem('tileset', this.tilesetCode);
      };
    });
  }

  setTileset(ts) {
    this.tileset = ts;
  }

  showTilesetModal() {
    this.tilesetModal = true;
  }

  hideTilesetModal() {
    this.tilesetModal = false;
  }

  toggleSound() {
    if (this.soundEnabled) {
      sound.disable();
    } else {
      sound.enable();
    }
    this.soundEnabled = !this.soundEnabled;
  }

  toggleDirectionalPainting() {
    this.directionalPainting = !this.directionalPainting;
  }

  setDirectionalPainting(b) {
    this.directionalPainting = b;
  }

  setInputEditing(b) {
    this.inputEditing = b;
  }

  createGame() {
    try {
      this.gamelogic = lynxlogicstartup();
      this.gamelogic.state = makeObservable(levelToGameState(this.currentLevel), {
        chipsNeeded: observable,
        decChipsNeeded: action,
        setChipsNeeded: action,
        gameOver: observable,
        setGameOver: action,
      });
      this.gamelogic.state.stepping = this.stepParity;
      this.gamelogic.initgame();

      // this works because LynxState (active state) and Level (inactive state) share an unspoken interface
      this.setLevel(this.gamelogic.state, false);
    } catch (err) {
      logger.error(err);
    }
  }

  setActivated(b) {
    if (this.activated !== b) {
      this.activated = b;
      this.playbackForward = true;
      this.clearOverlayHighlight();
      this.clearSelections();
      if (b) {
        this.setCurrentLevel(this.level);
        this.createGame();

        this.totalGameLoopDuration = 0;
      } else {
        this.gamelogic = null;
        this.setLevel(this.currentLevel, false);
        this.setCurrentLevel(null);
      }
    }
    this.setSpeed(1);
    this.setRunning(false);
  }

  restart() {
    this.createGame();
    this.totalGameLoopDuration = 0;
}

  setRunning(b) {
    this.running = b;
  }

  setReplaying(b) {
    this.replaying = b;
  }

  setReplayEndTick(t) {
    this.replayEndTick = t;
  }

  setSeeking(b) {
    this.seeking = b;
  }

  setUndoToLastMove() {
    this.setRunning(false);
    this.undoToLastMove = Date.now();
  }

  setForward(f) {
    this.playbackForward = f;
  }

  setPlayMode(m) {
    this.playMode = m;
  }

  setSpeed(s) {
    this.speed = s;
  }

  setSeekPos(s) {
    this.seekPos = s;
    this.setReplayPos(s);
  }

  setReplayPos(s) {
    this.replayPos = s;
  }

  setCurrentLevel(l) {
    this.currentLevel = l;
  }

  setScale(s) {
    this.scale = s;
  }

  setDragInfo(i) {
    this.dragInfo = i;
  }

  setMouseoverTeleportIndex(i) {
    this.mouseoverTeleportIndex = i;
  }

  undoStackPush(u) {
    // mobx screws up the contents so I can't push the bitset directly
    this.undoStack.push(u.toString());
    logger.info(`undo pushed: stack is now ${this.undoStack.length} long`);
  }

  undoStackPop() {
    if (this.undoStack.length > 0) {
      logger.info(`undo popped: stack is now ${this.undoStack.length - 1} long`);
      return new BitSet(this.undoStack.pop());
    } else {
      logger.warn('attempted to pop beyond end of undo stack')
    }
  }

  redoStackPush(u) {
    this.redoStack.push(u.toString());
    logger.info(`redo pushed: stack is now ${this.redoStack.length} long`);
  }

  redoStackPop() {
    if (this.redoStack.length > 0) {
      logger.info(`redo popped: stack is now ${this.redoStack.length - 1} long`);
      return new BitSet(this.redoStack.pop());
    } else {
      logger.warn('attempted to pop beyond end of redo stack')
    }
  }

  redoStackClear() {
    this.redoStack = [];
  }

  undoable(f) {
    const prevLevelState = !this.activated ? this.level.copy() : null;
    f();
    if (prevLevelState) {
      const diff = makeLevelDiff(this.level, prevLevelState);
      if (!diff.isEmpty()) {
        this.undoStackPush(diff);
        this.redoStackClear();
      }
    }
  }

  // setStepParity(p) {
  //   this.stepParity = p;
  //   if (this.activated) this.level.setStepParity(p);
  // }

  replayAvailable() {
    // maybe someday make this more robust, with a map checksum or something
    if (['CCLP1.dat', 'CCLXP2.dat', 'CCLP3.dat', 'CCLP4.dat'].includes(this.levelsetFilename)) return true;
    if (this.levelsetFilename === 'CHIPS.dat' && ![88, 145, 146, 147, 148, 149].includes(this.levelNum)) return true;
    return false;
  }
}

// todo this is some clunky stuff to avoid even clunkier 
// passing editorState all over the place as props

export const EditorStateContext = React.createContext();
 
export const EditorStateProvider = ({ children, store }) => {
  return (
    <EditorStateContext.Provider value={store}>{children}</EditorStateContext.Provider>
  );
};
 
export const useEditorState = () => React.useContext(EditorStateContext);

// I guess kind of like Redux connect() but with this object only?
// And puts this object straight into props vs mapStateToProps?
export const withEditorState = (Component) => (props) => {
  return <Component {...props} editorState={useEditorState()}/>;
};
