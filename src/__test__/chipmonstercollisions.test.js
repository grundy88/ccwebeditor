import { Dir } from "../engine/logic/dir";
import { CC } from "../engine/tiles/tile";
import { makeGame, makeGameGrid, alive, dead, expectChip, monster, pause, setDirProvider, keySequence, step, topLayer } from "./_testhelpers";

// ==================================================================
// Testing various scenarios of Chip and monsters colliding (or not)
// ==================================================================

/*
 M.
 ..
 .C
 */
test('chip should die walking into a tile that a monster is walking out of', () => {
  // setup level
  const game = makeGame((g) => {
    monster(g, 1, 1, CC.GLIDER_E);
    topLayer(g, 2, 3, CC.CHIP_S);
  });

  // setup keystrokes
  setDirProvider(game, { getNextDir: () => Dir.N });

  // execute gameloop
  step(game);
  expectChip(game, 2, 2, alive);
  step(game);
  expectChip(game, 2, 2, dead);
});

test('chip should die walking into a tile that a monster is walking into', () => {
  const game = makeGameGrid(`
    M.
    .C
  `, {M: CC.GLIDER_E});
  setDirProvider(game, { getNextDir: () => Dir.N });

  step(game); expectChip(game, 1, 1, dead);
});

/*
 M..
 ..C
 */
test('chip should die walking out of a tile that a monster is walking into', () => {
  const game = makeGame((g) => {
    monster(g, 1, 1, CC.GLIDER_E);
    topLayer(g, 3, 2, CC.CHIP_S);
  });
  setDirProvider(game, { getNextDir: () => Dir.N });

  step(game); expectChip(game, 3, 1, alive);
  step(game); expectChip(game, 3, 1, dead);
});

/*
 M...
 ...C
 */
test('chip should live walking out of a tile before a monster starts walking in', () => {
  const game = makeGame((g) => {
    monster(g, 1, 1, CC.GLIDER_E);
    topLayer(g, 4, 2, CC.CHIP_S);
  });
  setDirProvider(game, { getNextDir: () => Dir.N });

  step(game); expectChip(game, 4, 1, alive);
  step(game); expectChip(game, 4, 0, alive);
});

/*
 C...
 V...
 M...
 */
test('chip should live sliding into a tile that a monster already walked out of', () => {
  const game = makeGame((g) => {
    topLayer(g, 1, 1, CC.CHIP_S);
    topLayer(g, 1, 2, CC.FORCE_S);
    monster(g, 1, 3, CC.GLIDER_E);
  });
  setDirProvider(game, { getNextDir: () => Dir.S });

  step(game, 0.5); expectChip(game, 1, 2, alive);
  step(game, 0.5); expectChip(game, 1, 3, alive);
});

/*
 .C..
 .V..
 M...
 */
test('chip should die sliding into a tile that a monster is walking into', () => {
  const game = makeGame((g) => {
    topLayer(g, 2, 1, CC.CHIP_S);
    topLayer(g, 2, 2, CC.FORCE_S);
    monster(g, 1, 3, CC.GLIDER_E);
  });
  setDirProvider(game, { getNextDir: () => Dir.S });

  step(game, 0.5); expectChip(game, 2, 2, alive);
  step(game, 0.5); expectChip(game, 2, 2, dead);
});

/*
 ..C.
 ..V.
 M...
 */
test('chip should die sliding into a tile that a monster is about to walk into', () => {
  // same as 'chip should die walking out of a tile that a monster is walking into'
  const game = makeGame((g) => {
    topLayer(g, 3, 1, CC.CHIP_S);
    topLayer(g, 3, 2, CC.FORCE_S);
    monster(g, 1, 3, CC.GLIDER_E);
  });
  setDirProvider(game, { getNextDir: () => Dir.S });

  step(game, 0.5); expectChip(game, 3, 2, alive);
  step(game, 0.5); expectChip(game, 3, 3, alive);
  step(game);      expectChip(game, 3, 3, dead);
});

/*
 ...C
 ...V
 M...
 */
test('chip should live sliding into a tile before monster starts walking in', () => {
  // same as 'chip should live walking out of a tile before a monster starts walking in'
  const game = makeGame((g) => {
    topLayer(g, 4, 1, CC.CHIP_S);
    topLayer(g, 4, 2, CC.FORCE_S);
    monster(g, 1, 3, CC.GLIDER_E);
  });
  setDirProvider(game, { getNextDir: () => Dir.S });

  step(game, 0.5); expectChip(game, 4, 2, alive);
  step(game, 0.5); expectChip(game, 4, 3, alive);
  step(game);      expectChip(game, 4, 4, alive);
});

/*
 .C...
 .V...
 .V...
 M....
 */
test('chip should die sliding into a tile that a monster is walking out of', () => {
  const game = makeGame((g) => {
    topLayer(g, 2, 1, CC.CHIP_S);
    topLayer(g, 2, 2, CC.FORCE_S);
    topLayer(g, 2, 3, CC.FORCE_S);
    monster(g, 1, 4, CC.GLIDER_E);
  });
  setDirProvider(game, { getNextDir: () => Dir.S });

  step(game); expectChip(game, 2, 3, alive);
  step(game); expectChip(game, 2, 3, dead);
});

/*
 ..C..
 ..V..
 ..V..
 M....
 */
test('chip should die sliding farther into a tile that a monster is walking into', () => {
  const game = makeGame((g) => {
    topLayer(g, 3, 1, CC.CHIP_S);
    topLayer(g, 3, 2, CC.FORCE_S);
    topLayer(g, 3, 3, CC.FORCE_S);
    monster(g, 1, 4, CC.GLIDER_E);
  });
  setDirProvider(game, { getNextDir: () => Dir.S });

  step(game); expectChip(game, 3, 3, alive);
  step(game); expectChip(game, 3, 3, dead);
});

/*
 ...C.
 ...V.
 ...V.
 M....
 */
test('chip should die having slid into a tile that a monster is about to walk into', () => {
  // same as 'chip should die walking out of a tile that a monster is walking into'
  const game = makeGame((g) => {
    topLayer(g, 4, 1, CC.CHIP_S);
    topLayer(g, 4, 2, CC.FORCE_S);
    topLayer(g, 4, 3, CC.FORCE_S);
    monster(g, 1, 4, CC.GLIDER_E);
  });
  setDirProvider(game, { getNextDir: () => Dir.S });

  step(game); expectChip(game, 4, 3, alive);
  step(game); expectChip(game, 4, 4, alive);
  step(game); expectChip(game, 4, 4, dead);
});

/*
 .xxx
 .DTx
 .xxx
 C...
 */
test('chip should live freeing a teeth by taking an odd number of steps', () => {
  const game = makeGame((g) => {
    topLayer(g, 2, 1, CC.WALL);
    topLayer(g, 3, 1, CC.WALL);
    topLayer(g, 4, 1, CC.WALL);
    topLayer(g, 4, 2, CC.WALL);
    topLayer(g, 4, 3, CC.WALL);
    topLayer(g, 3, 3, CC.WALL);
    topLayer(g, 2, 3, CC.WALL);
    topLayer(g, 2, 2, CC.DIRT);
    monster(g, 3, 2, CC.TEETH_E);
    topLayer(g, 1, 4, CC.CHIP_S);
  });
  setDirProvider(game, keySequence([Dir.N, Dir.N, Dir.E, Dir.W]));

  step(game, 4); expectChip(game, 1, 2, alive);
});

/*
 .xxx
 .DTx
 Cxxx
 */
test('chip should die freeing a teeth by taking an even number of steps', () => {
  const game = makeGame((g) => {
    topLayer(g, 2, 1, CC.WALL);
    topLayer(g, 3, 1, CC.WALL);
    topLayer(g, 4, 1, CC.WALL);
    topLayer(g, 4, 2, CC.WALL);
    topLayer(g, 4, 3, CC.WALL);
    topLayer(g, 3, 3, CC.WALL);
    topLayer(g, 2, 3, CC.WALL);
    topLayer(g, 2, 2, CC.DIRT);
    monster(g, 3, 2, CC.TEETH_E);
    topLayer(g, 1, 3, CC.CHIP_S);
  });
  setDirProvider(game, keySequence([Dir.N, Dir.E, Dir.W]));

  step(game, 3); expectChip(game, 2, 2, dead);
});

// same board as above
test('chip should die freeing a teeth by taking an even number of steps after a half pause', () => {
  const game = makeGame((g) => {
    topLayer(g, 2, 1, CC.WALL);
    topLayer(g, 3, 1, CC.WALL);
    topLayer(g, 4, 1, CC.WALL);
    topLayer(g, 4, 2, CC.WALL);
    topLayer(g, 4, 3, CC.WALL);
    topLayer(g, 3, 3, CC.WALL);
    topLayer(g, 2, 3, CC.WALL);
    topLayer(g, 2, 2, CC.DIRT);
    monster(g, 3, 2, CC.TEETH_E);
    topLayer(g, 1, 3, CC.CHIP_S);
  });
  setDirProvider(game, keySequence([pause(0.5), Dir.N, Dir.E, Dir.W]));

  step(game, 0.5); expectChip(game, 1, 3, alive);
  step(game); expectChip(game, 1, 2, alive);
  step(game, 2); expectChip(game, 2, 2, dead);
});

// same board as above
test('chip should live freeing a teeth by taking an even number of steps after a full pause', () => {
  const game = makeGame((g) => {
    topLayer(g, 2, 1, CC.WALL);
    topLayer(g, 3, 1, CC.WALL);
    topLayer(g, 4, 1, CC.WALL);
    topLayer(g, 4, 2, CC.WALL);
    topLayer(g, 4, 3, CC.WALL);
    topLayer(g, 3, 3, CC.WALL);
    topLayer(g, 2, 3, CC.WALL);
    topLayer(g, 2, 2, CC.DIRT);
    monster(g, 3, 2, CC.TEETH_E);
    topLayer(g, 1, 3, CC.CHIP_S);
  });
  setDirProvider(game, keySequence([pause(), Dir.N, Dir.E, Dir.W]));

  step(game); expectChip(game, 1, 3, alive);
  step(game); expectChip(game, 1, 2, alive);
  step(game, 2); expectChip(game, 1, 2, alive);
});
