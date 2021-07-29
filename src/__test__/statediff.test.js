/* eslint-disable no-unused-vars */
import { loadLevel, loadLevelset } from "../engine/levelset/CCLevelsetReader";
import { getTWReplayDirProvider } from "../engine/solution/replayDirProvider";
import { loadSolution } from "../engine/solution/twsReader";
import * as sound from '../engine/util/sound';
import { lynxlogicstartup } from "../engine/logic/lynx";
import { copyState, levelToGameState } from "../engine/model/gamestate";
import { applyDiff, diffState } from "../engine/model/statediff";
import { restartprng } from "../engine/logic/random";
import { ismonster } from "../engine/logic/twtile";
const fs = require('fs')

const typeSizes = {
  "undefined": () => 0,
  "boolean": () => 4,
  "number": () => 8,
  "string": item => 2 * item.length,
  "object": item => !item ? 0 : Object
    .keys(item)
    .reduce((total, key) => sizeOf(key) + sizeOf(item[key]) + total, 0)
};
const sizeOf = value => typeSizes[typeof value](value);

function _diffStatReport(levelsetName, ignores=[]) {
  sound.disable();

  let mostTicks = {levelNum:0, ticks:0};
  let largestDiff = {levelNum:0, size:0};
  let mostCreatures = {levelNum:0, count:0};
  let mostMonsters = {levelNum:0, count:0};

  const levelsetBytes = fs.readFileSync(`src/assets/${levelsetName}.dat`);
  const levelset = loadLevelset(levelsetBytes);
  
  const solutionBytes = fs.readFileSync(`src/assets/public_${levelsetName}-lynx.dac.tws`);

  let passingCount = 0;
  for (let levelNum = 1; levelNum <= levelset.length; levelNum++) {
    if (ignores.includes(levelNum)) continue;
    const level = loadLevel(levelset[levelNum-1].sourceBytes);
    const solution = loadSolution(solutionBytes, levelNum-1);

    const gamelogic = lynxlogicstartup();
    gamelogic.state = levelToGameState(level);
    gamelogic.initgame();
    gamelogic.state.stepping = solution.stepParity;
    gamelogic.state.prng1 = 0;
    gamelogic.state.prng2 = 0;
    gamelogic.state.nextrndslidedir = solution.initialRandomForceDir;
    gamelogic.state.nextDirProvider = getTWReplayDirProvider(solution.actions);
    restartprng(gamelogic.state.mainprng, solution.prngSeed);
    gamelogic.state.chipsNeeded = level.numChipsRequired;

    try {
      const diffs = [];
      for (let i = 0; i < solution.numFrames + 12; i++) {
        const prevState = copyState(gamelogic.state);
        gamelogic.advancegame();
        diffs.push(diffState(gamelogic.state, prevState));
        // clear off sounds
        sound.playSounds(gamelogic.state.soundeffects);

        if (gamelogic.state.creatures.length > mostCreatures.count) mostCreatures = {levelNum: levelNum, count: gamelogic.state.creatures.length, tick: i};
        const numMonsters = gamelogic.state.creatures.filter(cr => ismonster(cr.id)).length
        if (numMonsters > mostMonsters.count) mostMonsters = {levelNum: levelNum, count: numMonsters, tick: i};
      }

      const size = sizeOf(diffs);
      if (size > largestDiff.size) largestDiff = {levelNum: levelNum, size: size};
      if (diffs.length > mostTicks.ticks) mostTicks = {levelNum: levelNum, ticks: diffs.length};

      if (gamelogic.state.completed) {
        passingCount++;
      } else {
        console.log(`${levelNum} ${gamelogic.state.completed}`);
      }
    } catch (err) {
      console.log(`${levelNum} fail ${err}`);
    }
  }
  console.log(`passed ${passingCount} of ${levelset.length} (${passingCount * 100 / levelset.length}%)`);
  console.log(`  most ticks: level ${mostTicks.levelNum} with ${mostTicks.ticks}`);
  console.log(`  largest diffs: level ${largestDiff.levelNum} with ${largestDiff.size}`);
  console.log(`  most creatures: level ${mostCreatures.levelNum} with ${mostCreatures.count} at ${mostCreatures.tick}`);
  console.log(`  most monsters: level ${mostMonsters.levelNum} with ${mostMonsters.count} at ${mostMonsters.tick}`);
}

function playForward(gamelogic, solution) {
  try {
    const diffs = [];
    for (let i = 0; i < solution.numFrames + 12; i++) {
      const prevState = copyState(gamelogic.state);
      gamelogic.advancegame();
      diffs.push(diffState(gamelogic.state, prevState));
      // clear off sounds
      sound.playSounds(gamelogic.state.soundeffects);
    }

    if (!gamelogic.state.completed) {
      throw new Error(`FAIL: ${gamelogic.state.levelNumber} not completed`);
    }

    return diffs;
  } catch (err) {
    console.log(`FAIL: forward ${gamelogic.state.levelNumber} ${err}`);
    throw err;
  }
}

function playBackward(gamelogic, diffs) {
  try {
    while (diffs.length > 0) {
      applyDiff(gamelogic.state, diffs.pop());
      gamelogic.state.currenttime--;
    }

    if (gamelogic.state.currenttime !== 0) {
      throw new Error(`FAIL: backward ${gamelogic.state.levelNumber} replay done but time is ${gamelogic.state.currenttime}`);
    }
  } catch (err) {
    console.log(`FAIL: backward ${gamelogic.state.levelNumber} ${err}`);
    throw err;
  }
}

function testLevel(levelsetName, levelNum, replayCount) {
  sound.disable();
  const levelsetBytes = fs.readFileSync(`src/assets/${levelsetName}.dat`);
  const levelset = loadLevelset(levelsetBytes);
  
  const solutionBytes = fs.readFileSync(`src/assets/public_${levelsetName}-lynx.dac.tws`);

  const level = loadLevel(levelset[levelNum-1].sourceBytes);
  const solution = loadSolution(solutionBytes, levelNum-1);

  const gamelogic = lynxlogicstartup();
  gamelogic.state = levelToGameState(level);
  gamelogic.initgame();
  gamelogic.state.stepping = solution.stepParity;
  gamelogic.state.prng1 = 0;
  gamelogic.state.prng2 = 0;
  gamelogic.state.nextrndslidedir = solution.initialRandomForceDir;
  gamelogic.state.nextDirProvider = getTWReplayDirProvider(solution.actions);
  restartprng(gamelogic.state.mainprng, solution.prngSeed);
  gamelogic.state.chipsNeeded = level.numChipsRequired;

  for (let i = 0; i < replayCount; i++) {
    gamelogic.state.nextDirProvider.reset(gamelogic.state.currenttime);
    const chipStartPos = gamelogic.state.creatures[0].pos;
    const diffs = playForward(gamelogic, solution);
    playBackward(gamelogic, diffs);
    if (gamelogic.state.creatures[0].pos !== chipStartPos) throw new Error(`FAIL: Chip didn't finish (${gamelogic.state.creatures[0].pos}) where he started ${chipStartPos}`);
  }
}

test('play level forwards and backwards a few times', () => {
  if (process.env['SKIP_REPLAYS']) return;

  testLevel('CHIPS', 134, 3);   // most ticks (longest replay)
  testLevel('CCLP1', 118, 3);   // largest diffs
  testLevel('CCLP1', 54, 3);    // most creatures (mostly blocks)
  testLevel('CCLP4', 42, 3);    // most monsters (mostly stuck)
  testLevel('CCLP3', 146, 3);   // most active monsters maybe
});

// test('diff check', () => {
  // _diffStatReport('CHIPS', [88, 145, 146, 147, 148, 149]);
  // _diffStatReport('CCLXP2');
// });

/*
CHIPS
      most ticks: level 134 with 17965
      largest diffs: level 100 with 2652384
      most creatures: level 117 with 128 at 0
      most monsters: level 107 with 99 at 0
CCLP1
      most ticks: level 124 with 5094
      largest diffs: level 118 with 8165628
      most creatures: level 54 with 914 at 0
      most monsters: level 94 with 303 at 0
CCLXP2
      most ticks: level 122 with 13325
      largest diffs: level 146 with 4830874
      most creatures: level 57 with 289 at 1185
      most monsters: level 57 with 286 at 1185
CCLP3
      most ticks: level 140 with 14826
      largest diffs: level 64 with 4990388
      most creatures: level 19 with 230 at 0
      most monsters: level 146 with 97 at 4801
CCLP4
      most ticks: level 114 with 5347
      largest diffs: level 31 with 6085304
      most creatures: level 3 with 725 at 0
      most monsters: level 42 with 451 at 0
*/
