/* eslint-disable no-unused-vars */
import { loadLevel, loadLevelset } from "../engine/levelset/CCLevelsetReader";
import { getTWReplayDirProvider } from "../engine/solution/replayDirProvider";
import { loadSolution } from "../engine/solution/twsReader";
import * as sound from '../engine/util/sound';
import { lynxlogicstartup } from "../engine/logic/lynx";
import { levelToGameState } from "../engine/model/gamestate";
import { restartprng } from "../engine/logic/random";
const fs = require('fs')

function _testPassingReplays(levelsetName, ignores=[]) {
  // 'SKIP_REPLAYS=1 npm test' to actually run all tws replays
  // (otherwise adds about 15 seconds to unit test suite run time)
  if (process.env['SKIP_REPLAYS']) return;

  sound.disable();

  const levelsetBytes = fs.readFileSync(`src/assets/${levelsetName}.dat`);
  const levelset = loadLevelset(levelsetBytes);
  
  const solutionBytes = fs.readFileSync(`src/assets/public_${levelsetName}-lynx.dac.tws`);

  for (let levelNum = 1; levelNum <= levelset.length; levelNum++) {
    if (ignores.includes(levelNum)) continue;
    const level = loadLevel(levelset[levelNum-1].sourceBytes);
    const solution = loadSolution(solutionBytes, levelNum-1);

    const gamelogic = lynxlogicstartup();
    gamelogic.state = levelToGameState(level);
    gamelogic.initgame(gamelogic);
    gamelogic.state.stepping = solution.stepParity;
    gamelogic.state.prng1 = 0;
    gamelogic.state.prng2 = 0;
    gamelogic.state.nextrndslidedir = solution.initialRandomForceDir;
    gamelogic.state.nextDirProvider = getTWReplayDirProvider(solution.actions);
    restartprng(gamelogic.state.mainprng, solution.prngSeed);
    gamelogic.state.chipsNeeded = level.numChipsRequired;

    for (let i = 0; i < solution.numFrames + 12; i++) {
      gamelogic.advancegame(gamelogic);
    }
    expect(gamelogic.state.completed).toBeTruthy();
  }
}

function _checkPassingReplays(levelsetName, ignores=[]) {
  sound.disable();

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
      for (let i = 0; i < solution.numFrames + 12; i++) {
        gamelogic.advancegame();
      }
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
}

test('cclp1 tws replays', () => {
  _testPassingReplays('CCLP1');
});

test('cclxp2 tws replays', () => {
  _testPassingReplays('CCLXP2');
});

test('cclp3 tws replays', () => {
  _testPassingReplays('CCLP3');
});

test('cclp4 tws replays', () => {
  _testPassingReplays('CCLP4');
});

test('chips tws replays', () => {
  _testPassingReplays('CHIPS', [88, 145, 146, 147, 148, 149]);
});

// test('replay check', () => {
//   _checkPassingReplays('CHIPS', [88, 145, 146, 147, 148, 149]);
// });
