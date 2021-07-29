import { CC } from "../engine/tiles/tile";
import { makeGameGrid, getCreatures, connect, step, expectMonster } from "./_testhelpers";

/*

A: button hold after, F above T (going S)         +0.5: kicked out, takes own turn
B: button hold after, F below T (going N)         +0.25: kicked out (own turn already taken)
C: button hold at same time, F above T (going S)  +0.25: weird slide out on next turn
D: button hold at same time, F below T (going N)  +0.25: took turn, instantly kicked out
E: button already held down, F above T (going S)  +0.5: weird slide in, weird slide out on next turn
F: button already held down, F below T (going N)  +0.5: slides in, normal out
   ^^^ I didn't do this one, my F case is just like E
G: button press 1 after, F above T (going S)      +0.5: kicked out, takes own turn
H: button press 1 after, F below T (going N)      +0.25: kicked out (own turn already taken)
I: button press at same time, F above T (going S) stuck in trap, nothing skipped
J: button press at same time, F below T (going N) +0.25: took turn, instantly kicked out
K: button press 1 before, F above T (going S)     stuck in trap, nothing skipped
L: button press 1 before, F below T (going N)     stuck in trap, nothing skipped

fireball starts one tile away from trap

            s  n  s  n  s  n  s  n  s  n  s  n
      time  A  B  C  D  E  F  G  H  I  J  K  L
        1   1  1  1  1  1     1  1  1  1  1  1
        2   2  2  2  2     1  2  2  2  2  2  2
        3   3  3  3  3  2     3  3  3  3  3  3
trap -> 4   4  4  4     3  2  4  4  4     4  4
        5            4     3           4  
        6      5  5  5  4  4     5     5  
        7   5  6  6  6  5  5  5  6     6  
        8   6  7  7  7  6  6  6  7     7  
*/

test('ball hits button after later RRO monster enters trap', () => {
  // fireball later in reverse reading order gains 1/2 turn leaving a trap
  const game = makeGameGrid(`
      C.....
      .....F
      ......
      A..bWt
  `, {
        F: CC.FIREBALL_S,
        A: CC.BALL_E,
        b: CC.BROWN_BUTTON,
        t: CC.TRAP,
      });
  connect(game, 3, 3, 5, 3);
  const [fireball, ball] = getCreatures(game);
  
  step(game); 
    expectMonster(ball, 1, 3);
    expectMonster(fireball, 5, 2);
  step(game); 
    expectMonster(ball, 2, 3);
    expectMonster(fireball, 5, 3);
  step(game); 
    expectMonster(ball, 3, 3);
    expectMonster(fireball, 5, 4, CC.FIREBALL_S, 2);
  step(game); 
    expectMonster(ball, 2, 3);
    expectMonster(fireball, 5, 5, CC.FIREBALL_S, 2);
});

test('ball hits button after earlier RRO monster enters trap', () => {
  // fireball earlier in reverse reading order gains 1/4 turn leaving a trap
  const game = makeGameGrid(`
      C.....
      ......
      ......
      A..bWt
      ......
      .....F
  `, {
        F: CC.FIREBALL_N,
        A: CC.BALL_E,
        b: CC.BROWN_BUTTON,
        t: CC.TRAP,
      });
  connect(game, 3, 3, 5, 3);
  const [ball, fireball] = getCreatures(game);
  
  step(game); 
    expectMonster(ball, 1, 3);
    expectMonster(fireball, 5, 4);
  step(game); 
    expectMonster(ball, 2, 3);
    expectMonster(fireball, 5, 3);
  step(game); 
    expectMonster(ball, 3, 3);
    expectMonster(fireball, 5, 2, CC.FIREBALL_N, 1);
  step(game); 
    expectMonster(ball, 2, 3);
    expectMonster(fireball, 5, 1, CC.FIREBALL_N, 1);
});

test('ball hits button at the same time as later RRO monster enters trap', () => {
  // fireball later in reverse reading order gets stuck in trap
  // this is different than if a tank hit the button (or anything that holds the button)
  const game = makeGameGrid(`
      C.....
      .....F
      ......
      .A.bWt
  `, {
        F: CC.FIREBALL_S,
        A: CC.BALL_E,
        b: CC.BROWN_BUTTON,
        t: CC.TRAP,
      });
  connect(game, 3, 3, 5, 3);
  const [fireball, ball] = getCreatures(game);
  
  step(game); 
    expectMonster(ball, 2, 3);
    expectMonster(fireball, 5, 2);
  step(game); 
    expectMonster(ball, 3, 3);
    expectMonster(fireball, 5, 3);
  step(game); 
    expectMonster(ball, 2, 3);
    expectMonster(fireball, 5, 3);
  step(game); 
    expectMonster(ball, 1, 3);
    expectMonster(fireball, 5, 3);
});

test('ball hits button at the same time as earlier RRO monster enters trap', () => {
  // fireball earlier in reverse reading order gains 1/4 turn
  const game = makeGameGrid(`
      C.....
      ......
      ......
      .A.bWt
      ......
      .....F
  `, {
        F: CC.FIREBALL_N,
        A: CC.BALL_E,
        b: CC.BROWN_BUTTON,
        t: CC.TRAP,
      });
  connect(game, 3, 3, 5, 3);
  const [ball, fireball] = getCreatures(game);
  
  step(game); 
    expectMonster(ball, 2, 3);
    expectMonster(fireball, 5, 4);
  step(game); 
    expectMonster(ball, 3, 3);
    expectMonster(fireball, 5, 2, CC.FIREBALL_N, 1);
  step(game); 
    expectMonster(ball, 2, 3);
    expectMonster(fireball, 5, 1, CC.FIREBALL_N, 1);
});

test('ball hits button before later RRO monster enters trap', () => {
  // fireball later in reverse reading order gets stuck in trap
  // and does not slide in to the trap
  const game = makeGameGrid(`
      C.....
      .....F
      ......
      ..AbWt
  `, {
        F: CC.FIREBALL_S,
        A: CC.BALL_E,
        b: CC.BROWN_BUTTON,
        t: CC.TRAP,
      });
  connect(game, 3, 3, 5, 3);
  const [fireball, ball] = getCreatures(game);
  
  step(game); 
    expectMonster(ball, 3, 3);
    expectMonster(fireball, 5, 2);
  step(game, 0.5); 
    expectMonster(ball, 2, 3, CC.BALL_W, 2);
    expectMonster(fireball, 5, 3, CC.FIREBALL_S, 2); // no sliding
  step(game, 0.5); 
    expectMonster(ball, 2, 3);
    expectMonster(fireball, 5, 3);
  step(game); 
    expectMonster(ball, 1, 3);
    expectMonster(fireball, 5, 3);  // stuck in trap
});

test('ball hits button before earlier RRO monster enters trap', () => {
  // fireball earlier in reverse reading order gets stuck in trap
  // and does not slide in to the trap
  const game = makeGameGrid(`
      C.....
      ......
      ......
      ..AbWt
      ......
      .....F
  `, {
        F: CC.FIREBALL_N,
        A: CC.BALL_E,
        b: CC.BROWN_BUTTON,
        t: CC.TRAP,
      });
  connect(game, 3, 3, 5, 3);
  const [ball, fireball] = getCreatures(game);
  
  step(game); 
    expectMonster(ball, 3, 3);
    expectMonster(fireball, 5, 4);
  step(game, 0.5); 
    expectMonster(ball, 2, 3, CC.BALL_W, 2);
    expectMonster(fireball, 5, 3, CC.FIREBALL_N, 2);  // no sliding
  step(game, 0.5); 
    expectMonster(ball, 2, 3);
    expectMonster(fireball, 5, 3);
  step(game); 
    expectMonster(ball, 1, 3);
    expectMonster(fireball, 5, 3);  // stuck in trap
});

test('tank holds button after later RRO monster enters trap', () => {
  // fireball later in reverse reading order gains 1/2 turn leaving a trap
  const game = makeGameGrid(`
      C.....
      .....F
      ......
      T..bWt
  `, {
        F: CC.FIREBALL_S,
        T: CC.TANK_E,
        b: CC.BROWN_BUTTON,
        t: CC.TRAP,
      });
  connect(game, 3, 3, 5, 3);
  const [fireball, tank] = getCreatures(game);
  
  step(game); 
    expectMonster(tank, 1, 3);
    expectMonster(fireball, 5, 2);
  step(game); 
    expectMonster(tank, 2, 3);
    expectMonster(fireball, 5, 3);
  step(game); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 4, CC.FIREBALL_S, 2);
  step(game); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 5, CC.FIREBALL_S, 2);
});

test('tank holds button after earlier RRO monster enters trap', () => {
  // fireball earlier in reverse reading order gains 1/4 turn leaving a trap
  const game = makeGameGrid(`
      C.....
      ......
      ......
      T..bWt
      ......
      .....F
  `, {
        F: CC.FIREBALL_N,
        T: CC.TANK_E,
        b: CC.BROWN_BUTTON,
        t: CC.TRAP,
      });
  connect(game, 3, 3, 5, 3);
  const [tank, fireball] = getCreatures(game);
  
  step(game); 
    expectMonster(tank, 1, 3);
    expectMonster(fireball, 5, 4);
  step(game); 
    expectMonster(tank, 2, 3);
    expectMonster(fireball, 5, 3);
  step(game); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 2, CC.FIREBALL_N, 1);
  step(game); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 1, CC.FIREBALL_N, 1);
});

test('tank holds button at the same time as later RRO monster enters trap', () => {
  // fireball later in reverse reading order gains 1/4 turn leaving a trap
  const game = makeGameGrid(`
      C.....
      .....F
      ......
      .T.bWt
  `, {
        F: CC.FIREBALL_S,
        T: CC.TANK_E,
        b: CC.BROWN_BUTTON,
        t: CC.TRAP,
      });
  connect(game, 3, 3, 5, 3);
  const [fireball, tank] = getCreatures(game);
  
  step(game); 
    expectMonster(tank, 2, 3);
    expectMonster(fireball, 5, 2);
  step(game); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 3, CC.FIREBALL_S, 0);
  step(game, 0.25); 
    expectMonster(tank, 3, 3, CC.TANK_E, 0);
    expectMonster(fireball, 5, 4, CC.FIREBALL_S, 2);  // skips a tick coming off the trap
  step(game); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 5, CC.FIREBALL_S, 2);
});

test('tank holds button at the same time as earlier RRO monster enters trap', () => {
  // fireball earlier in reverse reading order gains 1/4 turn, skips trap entirely
  const game = makeGameGrid(`
      C.....
      ......
      ......
      .A.bWt
      ......
      .....F
  `, {
        F: CC.FIREBALL_N,
        A: CC.TANK_E,
        b: CC.BROWN_BUTTON,
        t: CC.TRAP,
      });
  connect(game, 3, 3, 5, 3);
  const [tank, fireball] = getCreatures(game);
  
  step(game); 
    expectMonster(tank, 2, 3);
    expectMonster(fireball, 5, 4);
  step(game); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 2, CC.FIREBALL_N, 1);  // skips a tick over the trap
  step(game); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 1, CC.FIREBALL_N, 1);
});

test('tank holds button before later RRO monster enters trap', () => {
  // fireball later in reverse reading order does a weird partial slide
  // skips the middle tick of the turn on the way in to the trap
  // then gains another 1/4 turn leaving the trap
  const game = makeGameGrid(`
      C.....
      .....F
      ......
      ..AbWt
  `, {
        F: CC.FIREBALL_S,
        A: CC.TANK_E,
        b: CC.BROWN_BUTTON,
        t: CC.TRAP,
      });
  connect(game, 3, 3, 5, 3);
  const [fireball, tank] = getCreatures(game);
  
  step(game); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 2);
  step(game, 0.25); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 3, CC.FIREBALL_S, 1);
  step(game, 0.25); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 3, CC.FIREBALL_S, 3); // skipped a tick
  step(game, 0.25); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 3, CC.FIREBALL_S, 0);
  step(game, 0.25); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 4, CC.FIREBALL_S, 2); // skips first tick on the way out
  step(game); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 5, CC.FIREBALL_S, 2);
 });

test('tank holds button before earlier RRO monster enters trap', () => {
  // Fireball earlier in reverse reading order double speed slides into trap, gaining 1/2 turn.
  const game = makeGameGrid(`
      C.....
      ......
      ......
      ..AbWt
      ......
      .....F
  `, {
        F: CC.FIREBALL_N,
        A: CC.TANK_E,
        b: CC.BROWN_BUTTON,
        t: CC.TRAP,
      });
  connect(game, 3, 3, 5, 3);
  const [tank, fireball] = getCreatures(game);
  
  step(game); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 4);
  step(game, 0.25); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 3, CC.FIREBALL_N, 2); // skipped a tick
  step(game, 0.25); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 3, CC.FIREBALL_N, 0); // skipped a tick
  step(game, 0.25); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 2, CC.FIREBALL_N, 1); // normal speed on the way out
  step(game); 
    expectMonster(tank, 3, 3);
    expectMonster(fireball, 5, 1, CC.FIREBALL_N, 1);
});

test('monster released from trap onto force', () => {
  const game = makeGameGrid(`
      C...F
      A.bWt
      ....<
  `, {
        F: CC.FIREBALL_S,
        A: CC.TANK_E,
        b: CC.BROWN_BUTTON,
        t: CC.TRAP,
        '<': CC.FORCE_W
      });
  connect(game, 2, 1, 4, 1);
  const [fireball, tank] = getCreatures(game);
  
  step(game); 
    expectMonster(tank, 1, 1);
    expectMonster(fireball, 4, 1);
  step(game); 
    expectMonster(tank, 2, 1);
    expectMonster(fireball, 4, 2, CC.FIREBALL_S, 0);  // instantly jumps all the way onto force
  step(game); 
    expectMonster(tank, 2, 1);
    expectMonster(fireball, 3, 2, CC.FIREBALL_W, 0);
});
