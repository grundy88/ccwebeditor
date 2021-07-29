import { FRAMES_PER_STEP } from "../engine/util/utils";
import { CC } from "../engine/tiles/tile";
import { expectMonster, makeGame, getCreatures, monster, topLayer, step, tickToPhase } from "./_testhelpers";

// ==================================================================
// Testing various scenarios of monsters colliding into each other
// ==================================================================

/*
 ....
 M..M
 ....
 */
test('two monsters head on should both turn', () => {
  const game = makeGame((g) => {
    monster(g, 1, 2, CC.GLIDER_E);
    monster(g, 4, 2, CC.GLIDER_W);
    topLayer(g, 0, 0, CC.CHIP_S);
  });
  const [m1, m2] = getCreatures(game);

  step(game);
  expectMonster(m1, 2, 2, CC.GLIDER_E);
  expectMonster(m2, 3, 2, CC.GLIDER_W);
  step(game);
  expectMonster(m1, 2, 1, CC.GLIDER_N);
  expectMonster(m2, 3, 3, CC.GLIDER_S);
});

/*
 .....
 M...M
 .....
 */
test('two monsters both entering a space, only first in reverse reading order should turn', () => {
  // this is lynx style only, ms style is simpler
  // (there's no premove, monsters each complete their move in order)
  // Also this is super weird, because lynx *move* order in per reverse reading order,
  // so in this case the second glider gets to go straight  and the first one turns,
  // even though the first one is ahead in the monster list!
  const game = makeGame((g) => {
    monster(g, 1, 2, CC.GLIDER_E);
    monster(g, 5, 2, CC.GLIDER_W);
    topLayer(g, 0, 0, CC.CHIP_S);
  });
  const [m1, m2] = getCreatures(game);

  step(game);
  expectMonster(m1, 2, 2, CC.GLIDER_E);
  expectMonster(m2, 4, 2, CC.GLIDER_W);
  step(game, 1 / FRAMES_PER_STEP);
  expectMonster(m1, 2, 2, CC.GLIDER_E, 0); // aborts turn, stays put for a tick
  expectMonster(m2, 3, 2, CC.GLIDER_W, tickToPhase(1)); // carries on straight
  step(game, 1 - (1 / FRAMES_PER_STEP));
  expectMonster(m1, 2, 1, CC.GLIDER_N, FRAMES_PER_STEP-1); // turned but now 1 tick behind
  expectMonster(m2, 3, 2, CC.GLIDER_W, 0); // completes a move
});
