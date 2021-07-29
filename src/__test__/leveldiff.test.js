import { Dir } from "../engine/logic/dir";
import { creaturedirid, creatureid, TW } from "../engine/logic/twtile";
import { Creature } from "../engine/model/creature";
import { Level, makeLevelDiff, applyLevelDiff } from "../engine/model/level";
import { CC } from "../engine/tiles/tile";
import { Link } from "../engine/util/link";

test('basic level diff', () => {
  const level1 = new Level(1).initialize();
  const level2 = new Level(1).initialize();

  level1.topLayer[0] = CC.FLOOR.code;
  level2.topLayer[0] = CC.WALL.code;

  level1.creatures.push(new Creature(0, 0, CC.GLIDER_W.code));
  level2.creatures.push(new Creature(0, 0, CC.GLIDER_E.code));
  level2.creatures.push(new Creature(1, 0, CC.TEETH_S.code));
  level2.creatures.push(new Creature(2, 0, CC.GLIDER_W.code));

  level1.trapLinks.push(new Link(level1.location(1, 2), level1.location(3, 4)));

  level1.cloneLinks.push(new Link(level1.location(5, 5), level1.location(6, 6)));
  level2.cloneLinks.push(new Link(level1.location(8, 8), level1.location(9, 9)));

  // take level2 back to level1
  const diff = makeLevelDiff(level2, level1);
  applyLevelDiff(diff, level2);

  expect(level2.topLayer[0]).toBe(CC.FLOOR.code);
  expect(level2.creatures.length).toBe(1);
  expect(creatureid(level2.creatures[0].id)).toBe(TW.Glider);
  expect(creaturedirid(level2.creatures[0].id)).toBe(Dir.W);
  expect(level2.trapLinks.length).toBe(1);
  expect(level2.trapLinks[0].from.x).toBe(1);
  expect(level2.cloneLinks.length).toBe(1);
  expect(level2.cloneLinks[0].from.x).toBe(5);
});
