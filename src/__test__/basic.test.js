import { Dir } from "../engine/logic/dir";
import { CC } from "../engine/tiles/tile";
import { alive, dead, expectBlock, expectChip, expectTile, keySequence, makeGameGrid, makeTwoLayerGameGrid, setDirProvider, getCreatures, step, tickToPhase } from "./_testhelpers";

test("don't walk through a wall", () => {
  const game = makeGameGrid(`CW`);
  setDirProvider(game, { getNextDir: () => Dir.E });
  step(game); expectChip(game, 0, 0, alive);
});

test('pickup computer chip', () => {
  const game = makeGameGrid(`Cc.`, {c: CC.COMPUTER_CHIP});
  setDirProvider(game, { getNextDir: () => Dir.E });

  expect(game.state.chipsNeeded).toBe(1);
  step(game); 
    expectChip(game, 1, 0);
    expect(game.state.chipsNeeded).toBe(0);
  step(game); 
    expectChip(game, 2, 0);
    expectTile(game, 1, 0, CC.FLOOR);
});

test('die in water', () => {
  const game = makeGameGrid(`Cw`, {w: CC.WATER});
  setDirProvider(game, { getNextDir: () => Dir.E });
  step(game); expectChip(game, 1, 0, dead);
});

test('die in fire', () => {
  const game = makeGameGrid(`Cf`, {f: CC.FIRE});
  setDirProvider(game, { getNextDir: () => Dir.E });
  step(game); expectChip(game, 1, 0, dead);
});

test('invisible walls', () => {
  const game = makeGameGrid(`Cia`, {i: CC.INVISIBLE_WALL, a: CC.APPEARING_WALL});
  setDirProvider(game, keySequence([Dir.E, Dir.S, Dir.E, Dir.E, Dir.N]));
  step(game, 0.25); expectChip(game, 0, 0);
  step(game, 4); 
    expectChip(game, 2, 1);
    expectTile(game, 2, 0, CC.WALL);
});

test('thin walls', () => {
  const game = makeGameGrid(`
    C[_
    .].-/
  `, {
    '[': CC.THIN_WALL_W, ']': CC.THIN_WALL_E,
    '_': CC.THIN_WALL_S, '-': CC.THIN_WALL_N,
    '/': CC.THIN_WALL_SE,
  });
  setDirProvider(game, keySequence([
    Dir.E,  // blocked entering W
    Dir.S, Dir.E, Dir.E,  // blocked exiting E
    Dir.N, Dir.W,  // blocked exiting W
    Dir.E, Dir.S,  // blocked exiting S
    Dir.E, Dir.S,  // blocked entering N
    Dir.E, Dir.S, Dir.E, // blocked exiting SE
    Dir.S, // blocked exiting SE
    Dir.W, Dir.N, // blocked exiting N
    Dir.W, Dir.N, // blocked entering S
    Dir.W, // blocked entering E
    Dir.S, Dir.E, Dir.E, Dir.N, // blocked entering SE
    Dir.E, Dir.N, Dir.W // blocked entering SE
  ]));
  step(game, 0.25); expectChip(game, 0, 0);
  step(game, 2.25); expectChip(game, 1, 1);
  step(game, 1.25); expectChip(game, 1, 0);
  step(game, 1.25); expectChip(game, 2, 0);
  step(game, 1.25); expectChip(game, 3, 0);
  step(game, 2.25); expectChip(game, 4, 1);
  step(game, 0.25); expectChip(game, 4, 1);
  step(game, 1.25); expectChip(game, 3, 1);
  step(game, 1.25); expectChip(game, 2, 1);
  step(game, 0.25); expectChip(game, 2, 1);
  step(game, 3.25); expectChip(game, 4, 2);
  step(game, 2.25); expectChip(game, 5, 1);
});

test('push block', () => {
  const game = makeGameGrid(`CB`, {B: CC.BLOCK});
  const [block] = getCreatures(game);
  setDirProvider(game, keySequence([Dir.E]));
  step(game); 
    expectChip(game, 1, 0, alive);
    expectBlock(block, 2, 0, 0);
  step(game); 
    expectChip(game, 1, 0, alive);
    expectBlock(block, 2, 0, 0);
});

test('slide on ice', () => {
  const game = makeGameGrid(`C--`, {'-': CC.ICE});
  setDirProvider(game, keySequence([Dir.E]));
  step(game, 0.25); expectChip(game, 1, 0, alive, tickToPhase(2));
  step(game, 0.25); expectChip(game, 1, 0, alive, tickToPhase(0));
  step(game, 0.25); expectChip(game, 2, 0, alive, tickToPhase(2));
  step(game, 0.25); expectChip(game, 2, 0, alive, tickToPhase(0));
  // slow down coming off the ice
  step(game, 0.25); expectChip(game, 3, 0, alive, tickToPhase(1));
  step(game, 0.25); expectChip(game, 3, 0, alive, tickToPhase(2));
  step(game, 0.25); expectChip(game, 3, 0, alive, tickToPhase(3));
  step(game, 0.25); expectChip(game, 3, 0, alive, tickToPhase(0));
});

test('live in water with flippers', () => {
  const game = makeGameGrid(`Cfw`, {f: CC.FLIPPERS, w: CC.WATER});
  setDirProvider(game, { getNextDir: () => Dir.E });
  step(game); expectChip(game, 1, 0, alive);
  step(game); expectChip(game, 2, 0, alive);
  step(game); expectChip(game, 3, 0, alive);
});

test('live in fire with fire boots', () => {
  const game = makeGameGrid(`Cfw`, {f: CC.FIRE_BOOTS, w: CC.FIRE});
  setDirProvider(game, { getNextDir: () => Dir.E });
  step(game); expectChip(game, 1, 0, alive);
  step(game); expectChip(game, 2, 0, alive);
  step(game); expectChip(game, 3, 0, alive);
});

test('keys', () => {
  const game = makeGameGrid(`
      CbbBBB
      .bryg.
      .BRYG.
      .GYRB.
  `, {
    b: CC.RED_KEY, r: CC.RED_KEY, y: CC.YELLOW_KEY, g: CC.GREEN_KEY,
    B: CC.RED_DOOR, R: CC.RED_DOOR, Y: CC.YELLOW_DOOR, G: CC.GREEN_DOOR,
  });
  setDirProvider(game, keySequence([
    Dir.E, Dir.E, Dir.E, Dir.E, Dir.E,
    Dir.S, Dir.W, Dir.W, Dir.W, 
    Dir.S, Dir.E, Dir.E, Dir.E,
    Dir.S, Dir.W, Dir.S, Dir.W, Dir.S, Dir.W, Dir.S,
  ]));
  step(game, 4); expectChip(game, 4, 0);
  step(game, 0.25); expectChip(game, 4, 0); // last blue door remains locked
  step(game, 4); expectChip(game, 1, 1); // gather all keys
  step(game, 4); expectChip(game, 4, 2); // all doors should open
  step(game, 7); expectChip(game, 1, 3); // only green door should open
});

test('push stuck block off force', () => {
  const game = makeGameGrid(`
      CBv
      ..W
  `, {B: CC.BLOCK, v: CC.FORCE_S});
  const [block] = getCreatures(game);
  setDirProvider(game, { getNextDir: () => Dir.E });
  step(game); 
    expectChip(game, 1, 0, alive);
    expectBlock(block, 2, 0);
  step(game, 0.5); 
    expectChip(game, 2, 0, alive);
    expectBlock(block, 3, 0);
  step(game, 0.5); 
    expectChip(game, 3, 0, alive);
    expectBlock(block, 4, 0);
});


test('push block over ice', () => {
  const game = makeGameGrid(`CB-`, {B: CC.BLOCK, '-': CC.ICE});
  const [block] = getCreatures(game);
  setDirProvider(game, { getNextDir: () => Dir.E });
  step(game, 0.5); 
    expectChip(game, 1, 0, alive, tickToPhase(2));  // chip halfway through step
    expectBlock(block, 2, 0, 0);  // block slid through full tile
  step(game, 0.5); 
    expectChip(game, 1, 0, alive, 0);
    expectBlock(block, 3, 0, tickToPhase(2));  // block slowing down off the ice
  step(game, 0.5); 
    expectChip(game, 2, 0, alive, 0);  // chip slid through full tile
    expectBlock(block, 3, 0, 0);  // block completely off the ice
  step(game, 0.5); 
    expectChip(game, 3, 0, alive, 2);  // chip slowing down off the ice
    expectBlock(block, 4, 0, tickToPhase(2));
  step(game, 0.5); 
    expectChip(game, 3, 0, alive, 0);  // chip completely off the ice
    expectBlock(block, 4, 0, 0);
  step(game); 
    expectChip(game, 4, 0, alive, 0);  // chip completely off the ice
    expectBlock(block, 5, 0, 0);
});

test('blocks on walls', () => {
  const game = makeTwoLayerGameGrid(`
      C....
      BBBBB
  `, `
      .....
      Wabcd
  `, {
    B: CC.BLOCK, 
    a: CC.INVISIBLE_WALL, 
    b: CC.APPEARING_WALL, 
    c: CC.BLUE_BLOCK_WALL, 
    d: CC.BLUE_BLOCK_FLOOR
  });
  const blocks = getCreatures(game);
  setDirProvider(game, keySequence([Dir.S, Dir.E, Dir.S, Dir.E, Dir.S, Dir.E, Dir.S, Dir.E, Dir.S]));
  step(game, 0.25); expectChip(game, 0, 0); expectBlock(blocks[0], 0, 1); // block pushed
  step(game, 1.25); expectChip(game, 1, 0); expectBlock(blocks[1], 1, 1); // block pushed
  step(game, 1.25); expectChip(game, 2, 0); expectBlock(blocks[2], 2, 2); // block pushed
  step(game, 1.25); expectChip(game, 3, 0); expectBlock(blocks[3], 3, 2); // block stays
  step(game, 1.25); expectChip(game, 4, 1); expectBlock(blocks[4], 4, 2); // block stays
});
