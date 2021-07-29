import { codesIn, TICKS_PER_STEP, layerIndexForPoint, pointForLayerIndex } from "../engine/util/utils";
import * as sound from '../engine/util/sound';
import { CC } from "../engine/tiles/tile";
import { TW, CCtoTW, TWtoCC } from "../engine/logic/twtile";
import { lynxlogicstartup } from "../engine/logic/lynx";
import { Link, Location } from "../engine/util/link";

// export function topLayer(level, tx, ty, tile) {
//   const layerIndex = layerIndexForPoint(tx, ty);
//   level.topLayer[layerIndex] = tile.code;
// }

// export function bottomLayer(level, tx, ty, tile) {
//   const layerIndex = layerIndexForPoint(tx, ty);
//   level.bottomLayer[layerIndex] = tile.code;
// }

// export function monster(level, tx, ty, tile) {
//   topLayer(level, tx, ty, tile);
//   const monster = createMonster(level, tx, ty, tile.code);
//   level.entities.push(monster);
//   return monster;
// }

// export function makeLevel(builder) {
//   sound.disable();
//   const l = new Level(1);
//   builder(l);
//   l.chipCount = l.topLayer.reduce((count,tile) => tile === Tile.COMPUTER_CHIP.code ? count+1 : count, 0);
//   return l.copyForGameplay();
// }

export function topLayer(logic, tx, ty, tile) {
  const layerIndex = layerIndexForPoint(tx, ty);
  logic.state.map[layerIndex].top = CCtoTW[tile.code];
}

export function bottomLayer(logic, tx, ty, tile) {
  const layerIndex = layerIndexForPoint(tx, ty);
  logic.state.map[layerIndex].bottom = CCtoTW[tile.code];
}

export function monster(logic, tx, ty, tile) {
  topLayer(logic, tx, ty, tile);
}

export function makeGame(builder) {
  sound.disable();
  const logic = lynxlogicstartup();
  builder(logic);
  logic.initgame(logic);
  logic.state.chipsNeeded = logic.state.map.reduce((count,cell) => cell.top === TW.ICChip ? count+1 : count, 0);
  return logic;
}


const DEFAULT_LEGEND = {
  '.': CC.FLOOR,
  'C': CC.CHIP_S,
  'W': CC.WALL,
};

// function makeLayer(level, grid, legend, layerFunc) {
//   const rows = grid.trim().split('\n');
//   for (let y = 0; y < rows.length; y++) {
//     const row = rows[y].trim();
//     for (let x = 0; x < row.length; x++) {
//       const ch = row[x];
//       const tile = legend[ch] || DEFAULT_LEGEND[ch];
//       layerFunc(level, x, y, tile);
//       if (isMonster(tile.code)) monster(level, x, y, tile);
//     }
//   }
// }

// export function makeLevelGrid(grid, legend={}) {
//   sound.disable();
//   const l = new Level(1);
//   makeLayer(l, grid, legend, topLayer);
//   l.chipCount = l.topLayer.reduce((count,tile) => tile === Tile.COMPUTER_CHIP.code ? count+1 : count, 0);
//   return l.copyForGameplay();
// }

// export function makeTwoLayerGrid(topGrid, bottomGrid, legend={}) {
//   sound.disable();
//   const l = new Level(1);
//   makeLayer(l, topGrid, legend, topLayer);
//   makeLayer(l, bottomGrid, legend, bottomLayer);
//   l.chipCount = l.topLayer.reduce((count,tile) => tile === Tile.COMPUTER_CHIP.code ? count+1 : count, 0);
//   return l.copyForGameplay();
// }

function makeLayer(logic, grid, legend, layerFunc) {
  const rows = grid.trim().split('\n');
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y].trim();
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const tile = legend[ch] || DEFAULT_LEGEND[ch];
      layerFunc(logic, x, y, tile);
    }
  }
}

export function makeGameGrid(grid, legend={}) {
  sound.disable();
  const logic = lynxlogicstartup();
  makeLayer(logic, grid, legend, topLayer);
  logic.initgame(logic);
  logic.state.chipsNeeded = logic.state.map.reduce((count,cell) => cell.top === TW.ICChip ? count+1 : count, 0);
  return logic;
}

export function makeTwoLayerGameGrid(topGrid, bottomGrid, legend={}) {
  sound.disable();
  const logic = lynxlogicstartup();
  makeLayer(logic, topGrid, legend, topLayer);
  makeLayer(logic, bottomGrid, legend, bottomLayer);
  logic.initgame(logic);
  logic.state.chipsNeeded = logic.state.map.reduce((count,cell) => cell.top === TW.ICChip ? count+1 : count, 0);
  return logic;
}

export function setDirProvider(logic, provider) {
  logic.state.nextDirProvider = provider;
}

export function connect(logic, x1, y1, x2, y2) {
  const index1 = layerIndexForPoint(x1, y1);
  const index2 = layerIndexForPoint(x2, y2);
  const topCode1 = TWtoCC[logic.state.map[index1].top].code;
  const topCode2 = TWtoCC[logic.state.map[index2].top].code;
  const bottomCode1 = TWtoCC[logic.state.map[index1].bottom].code;
  const bottomCode2 = TWtoCC[logic.state.map[index2].bottom].code;
  if (codesIn(CC.BROWN_BUTTON, [topCode1, bottomCode1], CC.TRAP, [topCode2, bottomCode2])) {
    logic.state.trapLinks.push(new Link(new Location(x1, y1, logic.state), new Location(x2, y2, logic.state)));
  } else if (codesIn(CC.TRAP, [topCode1, bottomCode1], CC.BROWN_BUTTON, [topCode2, bottomCode2])) {
    logic.state.trapLinks.push(new Link(new Location(x2, y2, logic.state), new Location(x1, y1, logic.state)));
  } else if (codesIn(CC.RED_BUTTON, [topCode1, bottomCode1], CC.CLONE_MACHINE, [bottomCode2])) {
    logic.state.cloneLinks.push(new Link(new Location(x1, y1, logic.state), new Location(x2, y2, logic.state)));
  } else if (codesIn(CC.CLONE_MACHINE, [bottomCode1], CC.RED_BUTTON, [topCode2, bottomCode2])) {
    logic.state.cloneLinks.push(new Link(new Location(x2, y2, logic.state), new Location(x1, y1, logic.state)));
  }
}

// export function LevelBuilder() {
//   const level = new Level(1);
//   return ({
//     monster: (tx, ty, tile) => monster(level, tx, ty, tile),
//     build: () => level.copyForGameplay(),
//   });
// }

// numeric arg is the number of steps (defaults to 1)
// function arg gets called after stepping is done
//  (it's only a syntax thing, to be able to obviously group
//   expectations in a block following a step)
// export function step(level, ...args) {
//   let steps = 1;
//   let callback = null;
//   args.forEach(arg => {
//     if (!isNaN(arg)) steps = arg;
//     if (typeof arg === 'function') callback = arg;
//   });
//   const frames = Math.floor(FRAMES_PER_STEP * steps);
//   for (let i = 0; i < frames; i++) {
//     gameStep(level);
//   }
//   if (callback) callback();
// }

export function step(logic, steps=1) {
  const frames = Math.floor(TICKS_PER_STEP * steps);
  for (let i = 0; i < frames; i++) {
    logic.advancegame();
  }
}

// tick is 1-4, phase is 0-TICKS_PER_STEP
export function tickToPhase(tick) {
  return 1 + (TICKS_PER_STEP/4) * (tick-1);
}

export const keySequence = (steps) => { 
  const s = steps.flat(); 
  return { 
    getNextDir: () => {
      const key = s.shift() || 0;
      // console.log(`key check: ${key}`);
      return key;
    },
  };
}

export function getCreatures(logic) {
  if (logic.state.creatures.length > 0 && logic.state.creatures[0].id === TW.Chip) {
    return logic.state.creatures.slice(1);
  }
  return logic.state.creatures;
}

export const pause = (steps = 1) => new Array(Math.floor(TICKS_PER_STEP * steps)).fill(0);

export const pauseTicks = (ticks) => {
  const frames = ticks < 0 ? TICKS_PER_STEP + ticks : ticks
  return new Array(Math.floor(frames)).fill(0);
}

// export function keyPlay(times, dirs) {
//   let currentTimeIndex = 0;
//   let lastFrame = 0;
//   return { 
//     getNextDir: (level) => {
//       let dir = 0;
//       if (level.frameCount - (times[currentTimeIndex] * 4) === lastFrame) {
//         dir = dirs[currentTimeIndex];
//         lastFrame = level.frameCount;
//         currentTimeIndex++;
//       }
//       return dir;
//     },
//     peekForHold: () => 0,
//   }
// }

// --------------------------------------------------------
// expectations

export const alive = true;
export const dead = false;
// export function expectChip(chip, tx, ty, status=alive, phase=null) {
//   if (status === alive) expect(chip.level.isGameOver()).toBeFalsy();
//   if (status !== alive) expect(chip.level.isGameOver()).toBeTruthy();
//   expect(chip.x).toBe(tx);
//   expect(chip.y).toBe(ty);
//   if (phase !== null) expect(chip.phase).toBe(phase);
// }

function isChipAlive(logic) {
  return !logic.state.endgametimer || (logic.state.endgametimer && logic.state.completed);
}

export function expectChip(logic, tx, ty, status=alive) {
  if (status === alive) expect(isChipAlive(logic)).toBe(status === alive);
  const chip = logic.state.creatures[0];
  const [x, y] = pointForLayerIndex(chip.pos);
  expect(x).toBe(tx);
  expect(y).toBe(ty);
}

export function expectMonster(monster, tx, ty, tile=null, tick=null) {
  const [x, y] = pointForLayerIndex(monster.pos);
  expect(x).toBe(tx);
  expect(y).toBe(ty);
  // TODO
  // if (tile) expect(monster.id).toBe(TiletoT[tile.code]);
  if (tick !== null) expect(monster.frame).toBe((TICKS_PER_STEP - tick) % 4);
}

export function expectBlock(block, tx, ty) {
  const [x, y] = pointForLayerIndex(block.pos);
  expect(x).toBe(tx);
  expect(y).toBe(ty);
}

export function expectTile(logic, tx, ty, tile) {
  const layerIndex = layerIndexForPoint(tx, ty);
  expect(logic.state.map[layerIndex].top).toBe(CCtoTW[tile.code]);
}
