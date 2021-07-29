import { Dir } from "../engine/logic/dir";
import { CC } from "../engine/tiles/tile";
import { alive, expectChip, expectMonster, expectTile, keySequence, makeGame, setDirProvider, getCreatures, monster, step, tickToPhase, topLayer } from "./_testhelpers";

// ==================================================================
// Testing various scenarios of Chip stepping off force floors
// ==================================================================

test('blocked perpendicular force overrides', () => {
  const game = makeGame((g) => {
    topLayer(g, 1, 1, CC.CHIP_S);
    topLayer(g, 2, 1, CC.FORCE_E);
    topLayer(g, 3, 1, CC.FORCE_E);
    topLayer(g, 4, 1, CC.FORCE_E);
    topLayer(g, 5, 1, CC.FORCE_E);
    topLayer(g, 6, 1, CC.FORCE_E);
    topLayer(g, 2, 2, CC.BLUE_BLOCK_WALL);
    topLayer(g, 3, 2, CC.BLUE_BLOCK_WALL);
    topLayer(g, 4, 2, CC.BLUE_BLOCK_WALL);
    topLayer(g, 5, 2, CC.BLUE_BLOCK_WALL);
    topLayer(g, 6, 2, CC.BLUE_BLOCK_WALL);
    monster(g, 1, 3, CC.GLIDER_E);
    topLayer(g, 2, 3, CC.FORCE_E);
    topLayer(g, 3, 3, CC.FORCE_E);
    topLayer(g, 4, 3, CC.FORCE_E);
    topLayer(g, 5, 3, CC.FORCE_E);
    topLayer(g, 6, 3, CC.FORCE_E);
  });
  const [glider] = getCreatures(game);
  setDirProvider(game, keySequence([Dir.E, Dir.S, Dir.S, Dir.S, Dir.S, Dir.S, Dir.S, Dir.S, Dir.S, Dir.S, Dir.E]));

  // 1234567
  // C>>>>>.
  // .WWWWW.
  // G>>>>>.

  // slide starts
  step(game, 0.25);  expectChip(game, 2, 1, alive, tickToPhase(2));
  step(game, 0.25);  expectChip(game, 2, 1, alive, tickToPhase(0));
  // no attempting to step off sideways on first tile
  step(game, 0.25);  expectChip(game, 3, 1, alive, tickToPhase(2));
  step(game, 0.25);  expectChip(game, 3, 1, alive, tickToPhase(0));
  // now can try to step off sideways on each tile (so next tick stays on same tile)
  step(game, 0.25);  expectChip(game, 3, 1, alive, tickToPhase(0));
  step(game, 0.25);  expectChip(game, 4, 1, alive, tickToPhase(2));
  step(game, 0.25);  expectChip(game, 4, 1, alive, tickToPhase(0));
  // now can try to step off sideways on each tile (so next tick stays on same tile)
  step(game, 0.25);  expectChip(game, 4, 1, alive, tickToPhase(0));
  step(game, 0.25);  expectChip(game, 5, 1, alive, tickToPhase(2));
  step(game, 0.25);  expectChip(game, 5, 1, alive, tickToPhase(0));
  // now can try to step off sideways on each tile (so next tick stays on same tile)
  step(game, 0.25);  expectChip(game, 5, 1, alive, tickToPhase(0));
  step(game, 0.25);  expectChip(game, 6, 1, alive, tickToPhase(2));
  step(game, 0.25);  expectChip(game, 6, 1, alive, tickToPhase(0));
  // now can try to step off sideways on each tile (so next tick stays on same tile)
  step(game, 0.25);  expectChip(game, 6, 1, alive, tickToPhase(0));
  // now slowing down as he steps off the force
  step(game, 0.25);  expectChip(game, 7, 1, alive, tickToPhase(1));
  step(game, 0.25);  expectChip(game, 7, 1, alive, tickToPhase(2));
  step(game, 0.25);  expectChip(game, 7, 1, alive, tickToPhase(3));
  step(game, 0.25);  expectChip(game, 7, 1, alive, tickToPhase(0));

  // one more step east after the force floor
  step(game, 0.25);  expectChip(game, 8, 1, alive, tickToPhase(1));
  step(game, 0.25);  expectChip(game, 8, 1, alive, tickToPhase(2));
  step(game, 0.25);  expectChip(game, 8, 1, alive, tickToPhase(3));
  step(game, 0.25);  expectChip(game, 8, 1, alive, tickToPhase(0));
  // glider should now be one full column ahead
  expectMonster(glider, 9, 3, CC.GLIDER_E, tickToPhase(0));

  // all blue walls (except the first one) should now be regular walls
  expectTile(game, 2, 2, CC.BLUE_BLOCK_WALL);
  expectTile(game, 3, 2, CC.WALL);
  expectTile(game, 4, 2, CC.WALL);
  expectTile(game, 5, 2, CC.WALL);
  expectTile(game, 6, 2, CC.WALL);
});
