/*

 */

import { Dir } from "../engine/logic/dir";
import { CC } from "../engine/tiles/tile";
import { makeGame, setDirProvider, topLayer, keySequence, getCreatures, step, expectChip, expectBlock, alive, pause, pauseTicks } from "./_testhelpers";


test('block should teleport', () => {
  const game = makeGame((g) => {
    topLayer(g, 2, 1, CC.TELEPORT);
    topLayer(g, 4, 1, CC.TELEPORT);
    topLayer(g, 5, 1, CC.BLOCK);
    topLayer(g, 6, 1, CC.CHIP_S);
  });
  const [block] = getCreatures(game);
  setDirProvider(game, keySequence([Dir.W]));

  step(game); expectChip(game, 5, 1, alive);
  step(game); expectBlock(block, 1, 1);
});

test('block should slide through if all other teleports blocked', () => {
  const game = makeGame((g) => {
    topLayer(g, 1, 1, CC.WALL);
    topLayer(g, 2, 1, CC.TELEPORT);
    topLayer(g, 4, 1, CC.TELEPORT);
    topLayer(g, 5, 1, CC.BLOCK);
    topLayer(g, 6, 1, CC.CHIP_S);
  });
  const [block] = getCreatures(game);
  setDirProvider(game, keySequence([Dir.W]));

  step(game); expectChip(game, 5, 1, alive);
  step(game); expectBlock(block, 3, 1);
});

test('block should stick if all teleports blocked', () => {
  const game = makeGame((g) => {
    topLayer(g, 1, 1, CC.WALL);
    topLayer(g, 2, 1, CC.TELEPORT);
    topLayer(g, 3, 1, CC.WALL);
    topLayer(g, 4, 1, CC.TELEPORT);
    topLayer(g, 5, 1, CC.BLOCK);
    topLayer(g, 6, 1, CC.CHIP_S);
  });
  const [block] = getCreatures(game);
  setDirProvider(game, keySequence([Dir.W]));

  step(game); 
  expectChip(game, 5, 1, alive);
  expectBlock(block, 4, 1);
});

test('block should teleport through if stuck and way becomes clear (even if slide became clear too)', () => {
  const game = makeGame((g) => {
    topLayer(g, 1, 1, CC.TOGGLE_WALL_CLOSED);
    topLayer(g, 2, 1, CC.TELEPORT);
    topLayer(g, 3, 1, CC.TOGGLE_WALL_CLOSED);
    topLayer(g, 4, 1, CC.TELEPORT);
    topLayer(g, 5, 1, CC.BLOCK);
    topLayer(g, 5, 2, CC.GREEN_BUTTON);
    topLayer(g, 6, 1, CC.CHIP_S);
  });
  const [block] = getCreatures(game);
  setDirProvider(game, keySequence([Dir.W, Dir.S]));

  step(game);
    expectChip(game, 5, 1, alive);
    expectBlock(block, 4, 1);
  step(game);  // chips hits green button
    expectChip(game, 5, 2, alive);
  step(game);
    expectBlock(block, 1, 1); // block should have teleported
});

test('block should slide through if stuck and way becomes clear', () => {
  const game = makeGame((g) => {
    topLayer(g, 1, 1, CC.WALL);
    topLayer(g, 2, 1, CC.TELEPORT);
    topLayer(g, 3, 1, CC.TOGGLE_WALL_CLOSED);
    topLayer(g, 4, 1, CC.TELEPORT);
    topLayer(g, 5, 1, CC.BLOCK);
    topLayer(g, 5, 2, CC.GREEN_BUTTON);
    topLayer(g, 6, 1, CC.CHIP_S);
  });
  const [block] = getCreatures(game);
  setDirProvider(game, keySequence([Dir.W, Dir.S]));

  step(game);
    expectChip(game, 5, 1, alive);
    expectBlock(block, 4, 1);
  step(game);  // chips hits green button
    expectChip(game, 5, 2, alive);
  step(game);
    expectBlock(block, 3, 1); // block should have slid
});

test('stuck block should slide off if pushed and slide is clear but chip should teleport', () => {
  const game = makeGame((g) => {
    topLayer(g, 1, 1, CC.WALL);
    topLayer(g, 2, 1, CC.TELEPORT);
    topLayer(g, 3, 1, CC.WALL);
    topLayer(g, 4, 1, CC.TELEPORT);
    topLayer(g, 5, 1, CC.BLOCK);
    topLayer(g, 6, 1, CC.CHIP_S);
  });
  const [block] = getCreatures(game);
  setDirProvider(game, keySequence([Dir.W, Dir.N, Dir.W, Dir.S]));

  step(game);
    expectChip(game, 5, 1, alive);
    expectBlock(block, 4, 1);
  step(game, 4);
    expectChip(game, 2, 2, alive); // chip teleported to the other one
    expectBlock(block, 4, 2); // block should have slid
});

test('stuck block should slide off if pushed and slide is clear and chip should teleport too', () => {
  const game = makeGame((g) => {
    topLayer(g, 1, 1, CC.WALL);
    topLayer(g, 2, 1, CC.TELEPORT);
    topLayer(g, 2, 2, CC.WALL);     // wall under first teleport
    topLayer(g, 3, 1, CC.WALL);
    topLayer(g, 4, 1, CC.TELEPORT);
    topLayer(g, 5, 1, CC.BLOCK);
    topLayer(g, 6, 1, CC.CHIP_S);
  });
  const [block] = getCreatures(game);
  setDirProvider(game, keySequence([Dir.W, Dir.N, Dir.W, Dir.S]));

  step(game);
    expectChip(game, 5, 1, alive);
    expectBlock(block, 4, 1);
  step(game, 4);
    expectChip(game, 4, 2, alive); // chip should slide through too (other one is blocked)
    expectBlock(block, 4, 3); // block should have slid, then been pushed by sliding chip
});

test('stuck block should teleport off if pushed and slide is blocked and chip should not move', () => {
  const game = makeGame((g) => {
    topLayer(g, 1, 1, CC.WALL);
    topLayer(g, 2, 1, CC.TELEPORT);
    topLayer(g, 3, 1, CC.WALL);
    topLayer(g, 4, 1, CC.TELEPORT);
    topLayer(g, 4, 2, CC.WALL);     // wall under second teleport
    topLayer(g, 5, 1, CC.BLOCK);
    topLayer(g, 6, 1, CC.CHIP_S);
  });
  const [block] = getCreatures(game);
  setDirProvider(game, keySequence([Dir.W, Dir.N, Dir.W, Dir.S]));

  step(game);
    expectChip(game, 5, 1, alive);
    expectBlock(block, 4, 1);
  step(game, 4);
    expectChip(game, 4, 0, alive);
    expectBlock(block, 2, 2);
});

test('stuck block should slide off if pushed and slide becomes clear', () => {
  const game = makeGame((g) => {
    topLayer(g, 1, 1, CC.WALL);
    topLayer(g, 2, 1, CC.TELEPORT);
    topLayer(g, 2, 2, CC.WALL);     // wall under first teleport
    topLayer(g, 3, 1, CC.WALL);
    topLayer(g, 4, 1, CC.TELEPORT);
    topLayer(g, 4, 2, CC.TOGGLE_WALL_CLOSED);     // under second teleport
    topLayer(g, 5, 1, CC.BLOCK);
    topLayer(g, 6, 1, CC.CHIP_S);
    topLayer(g, 3, 0, CC.GREEN_BUTTON);
  });
  const [block] = getCreatures(game);
  setDirProvider(game, keySequence([Dir.W, Dir.N, Dir.W, Dir.S, pauseTicks(-1), Dir.W]));

  step(game);
    expectChip(game, 5, 1, alive);
    expectBlock(block, 4, 1);
  step(game, 3);
    expectChip(game, 4, 0, alive);
    expectBlock(block, 4, 1); // block can't move, but it's been untelestuckified
  step(game, 2);
    expectChip(game, 3, 0, alive);
    expectBlock(block, 4, 2); // block should have slid
});

test('stuck block should teleport off if pushed and slide is blocked and teleport becomes clear', () => {
  const game = makeGame((g) => {
    topLayer(g, 1, 1, CC.WALL);
    topLayer(g, 2, 1, CC.TELEPORT);
    topLayer(g, 2, 2, CC.TOGGLE_WALL_CLOSED);     // under first teleport
    topLayer(g, 3, 1, CC.WALL);
    topLayer(g, 4, 1, CC.TELEPORT);
    topLayer(g, 4, 2, CC.WALL);     // under second teleport
    topLayer(g, 5, 1, CC.BLOCK);
    topLayer(g, 6, 1, CC.CHIP_S);
    topLayer(g, 3, 0, CC.GREEN_BUTTON);
  });
  const [block] = getCreatures(game);
  setDirProvider(game, keySequence([Dir.W, Dir.N, Dir.W, Dir.S, pauseTicks(-1), Dir.W]));

  step(game);
    expectChip(game, 5, 1, alive);
    expectBlock(block, 4, 1);
  step(game, 3);
    expectChip(game, 4, 0, alive);
    expectBlock(block, 4, 1); // block can't move, but it's been untelestuckified
  step(game, 2);
    expectChip(game, 3, 0, alive);
    expectBlock(block, 2, 2); // block should have teleported
});

/*
..........
...ooooBC.  [o = teleport]
........B.
.........B
*/
test('block teleport loops', () => {
  const game = makeGame((g) => {
    topLayer(g, 3, 1, CC.TELEPORT);
    topLayer(g, 4, 1, CC.TELEPORT);
    topLayer(g, 5, 1, CC.TELEPORT);
    topLayer(g, 6, 1, CC.TELEPORT);
    topLayer(g, 7, 1, CC.BLOCK);
    topLayer(g, 8, 1, CC.CHIP_S);
    topLayer(g, 8, 2, CC.BLOCK);
    topLayer(g, 9, 3, CC.BLOCK);
  });
  const [block1, block2, block3] = getCreatures(game);
  const seq1 = [Dir.W, pause(6)].flat(); // push block1 in
  const seq2 = [Dir.S, Dir.S, Dir.E, Dir.N, Dir.E, Dir.N, Dir.W, Dir.W]; // push block2 in
  const seq3 = [Dir.N, Dir.W, Dir.W, Dir.W, Dir.W, Dir.W, Dir.S, Dir.S, Dir.S, Dir.S]; // move block1 away
  const seq4 = [Dir.E, Dir.E, Dir.E, Dir.E, Dir.E, Dir.E, Dir.E, Dir.N, Dir.N, Dir.E, Dir.N, Dir.W, Dir.W]; // prepare block3
  const seq5 = [Dir.W].flat(); // push block3 in
  setDirProvider(game, keySequence([seq1, seq2, seq3, seq4, seq5]));

  step(game, 7);
    expectChip(game, 7, 1, alive);
    expectBlock(block1, 2, 1);
  step(game, seq2.length);
    expectChip(game, 7, 1, alive);  // push block2 in
  step(game, seq3.length);
    expectChip(game, 2, 4, alive);
    expectBlock(block1, 2, 5);
    expect([35, 36, 37, 38]).toContain(block2.pos);   // block 2 should be in teleloop
  step(game, seq4.length);
    expectChip(game, 8, 1, alive);
    expectBlock(block3, 7, 1);
  step(game, 8);
    expectChip(game, 7, 1, alive);
    expectBlock(block2, 2, 1);  // block2 should have gone through
    expect([35, 36, 37, 38]).toContain(block3.pos);   // block 3 remains in teleloop
});
