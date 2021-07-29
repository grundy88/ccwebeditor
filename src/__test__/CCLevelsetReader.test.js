import fs from 'fs';
import { loadLevelset } from '../engine/levelset/CCLevelsetReader';

test('should load levelset file', () => {
  const data = fs.readFileSync(__dirname + '/../assets/CHIPS.dat');
  const levels = loadLevelset(data);
  expect(levels.length).toBe(149);
});
