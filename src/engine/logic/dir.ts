/* 
 * Adapted for Typescript from Tile World source code.
 *
 * Copyright (C) 2001-2021 by Brian Raiter,
 * under the GNU General Public License. No warranty. See COPYING for details.
 */

export const Dir = Object.freeze({
  NONE: 0,
  N:    1, 
  W:    2, 
  S:    4, 
  E:    8,
  NW:   3, 
  SW:   6, 
  NE:   9, 
  SE:  12
});

export function left(dir: number) { return ((((dir) << 1) | ((dir) >> 3)) & 15); }
export function back(dir: number) { return ((((dir) << 2) | ((dir) >> 2)) & 15); }
export function right(dir: number) { return ((((dir) << 3) | ((dir) >> 1)) & 15); }

// // from N,W,S,E to 0,1,2,3
// export function diridx(dir: number) { return ((0x30210 >> ((dir) * 2)) & 3); }

// // from 0,1,2,3 to N,W,S,E
// export function idxdir(idx: number) { return (1 << ((idx) & 3)); }

const diridx8 = [-1,  0,  1,  4,  2, -1,  5, -1,  3,  6, -1, -1,  7, -1, -1, -1];
const idxdir8 = [Dir.N, Dir.W, Dir.S, Dir.E, Dir.N | Dir.W, Dir.S | Dir.W, Dir.N | Dir.E, Dir.S | Dir.E];

// from Dir to [0-7]
export function dirtoindex(dir: number) { return diridx8[dir]; }

// from [0-7] to Dir
export function indextodir(dir: number) { return idxdir8[dir]; }

/* true if dir is a diagonal move.
 */
export function isdiagonal(dir: number) { return (((dir) & (Dir.N | Dir.S)) && ((dir) & (Dir.E | Dir.W))); }

// only for N,W,S,E
export function dirIsPerpendicular(dir1: number, dir2: number) {
    return dir1 && dir2 && (dir1 !== dir2) && ((dirtoindex(dir1) - dirtoindex(dir2)) % 2 !== 0);
}

export function dirIsOpposite(dir1: number, dir2: number) {
    return dir1 && dir2 && (dir1 !== dir2) && ((dirtoindex(dir1) - dirtoindex(dir2)) % 2 === 0);
}
