/*
...  .....  .CCC
B--  B----  .VVV
.CC  .....  B---
 ab  .CCCC  ....
      cdef   ghi

a: dies
b: lives - chip goes in front
c: lives - chip goes behind
d: lives - block push, bounce back
e: dies
f: lives - chip goes in front
g: lives - block push, bounce back
h: dies
i: lives - chip goes in front

if block is on or entering the tile, it gets pushed
if entering, graphically it can jump from halfway through its original slide
  to halfway through the push
*/

import { Dir } from "../engine/logic/dir";
import { CC } from "../engine/tiles/tile";
import { expectChip, expectBlock, step, topLayer, bottomLayer, makeGame, setDirProvider, alive, dead, getCreatures } from "./_testhelpers";

/*
...
B--
.C.
 */
test('chip should die sliding into a tile that a block is sliding into', () => {
  const game = makeGame((g) => {
    bottomLayer(g, 1, 2, CC.FORCE_E);
    topLayer(g, 1, 2, CC.BLOCK);
    topLayer(g, 2, 2, CC.ICE);
    topLayer(g, 3, 2, CC.ICE);
    topLayer(g, 2, 3, CC.CHIP_S);
  });
  setDirProvider(game, { getNextDir: () => Dir.N });

  step(game); expectChip(game, 2, 2, dead);
});

/*
...
B--
..C
 */
test('chip should live sliding in front of a sliding block', () => {
  const game = makeGame((g) => {
    bottomLayer(g, 1, 2, CC.FORCE_E);
    topLayer(g, 1, 2, CC.BLOCK);
    topLayer(g, 2, 2, CC.ICE);
    topLayer(g, 3, 2, CC.ICE);
    topLayer(g, 3, 3, CC.CHIP_S);
  });
  const [block] = getCreatures(game);
  setDirProvider(game, { getNextDir: () => Dir.N });

  step(game); expectChip(game, 3, 1, alive);
  step(game); expectBlock(block, 4, 2);
});
