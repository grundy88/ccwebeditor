/* 
 * Adapted for Typescript from Tile World source code.
 * 
 * random.c: The game's random-number generator.
 *
 * Copyright (C) 2001-2021 by Brian Raiter,
 * under the GNU General Public License. No warranty. See COPYING for details.
 */

 /*
  * [tb] The following comment is from the original C code. The same sentiment
  * applies for running this code in different javascript environments.
  */

/* 
 * This module is not here because I don't trust the C library's
 * random-number generator. (In fact, this module uses the linear
 * congruential generator, which is hardly impressive. But this isn't
 * strong cryptography; it's a game.) It is here simply because it is
 * necessary for the game to use the same generator FOREVER. In order
 * for playback of solutions to work correctly, the game must use the
 * same sequence of random numbers as when it was recorded. This would
 * fail if the playback occurred on a version compiled with a
 * different C library's generator. Thus, this module.
 */

export class Prng {
  initial = 0;	/* initial seed value */
  value = 0;		/* latest random value */
  shared = false;		/* false if independent sequence */
}

/* The most recently generated random number is stashed here, so that
 * it can provide the initial seed of the next PRNG.
 */
let	lastvalue = 0x80000000;

/* The standard linear congruential random-number generator needs no
 * introduction.
 */
function nextvalue(value: number) {
  // these days have to do extra work to keep it 32-bit
  let r = Math.imul(value, 1103515245) + 0xffffffff + 1
  r += 12345;
  if (r > 0xffffffff) r -= 0xffffffff + 1;
  return r & 0x7FFFFFFF;
}

/* Move to the next pseudorandom number in the generator's series.
 */
export function nextrandom(gen: Prng)
{
    if (gen.shared)
      gen.value = lastvalue = nextvalue(lastvalue);
    else
      gen.value = nextvalue(gen.value);
}

// /* Create a new PRNG, reset to the shared sequence.
//  */
// function createprng(): Prng {
//     const gen = new Prng();
//     resetprng(gen);
//     return gen;
// }

// /* We start off a fresh series by taking the current time. A few
//  * numbers are generated and discarded to work out any biases in the
//  * seed value.
//  */
// function resetprng(gen: Prng) {
//     if (lastvalue > 0x7FFFFFFF) lastvalue = nextvalue(nextvalue(nextvalue(nextvalue(Date.now()))));
//     gen.value = gen.initial = lastvalue;
//     gen.shared = true;
// }

/* Reset a PRNG to an independent sequence.
 */
export function restartprng(gen: Prng, seed: number) {
    gen.value = gen.initial = seed & 0x7FFFFFFF;
    gen.shared = false;
}

/* Use the top two bits to get a random number between 0 and 3.
 */
export function random4(gen: Prng): number {
    nextrandom(gen);
    return gen.value >> 29;
}

// /* Randomly select an element from a list of three values.
//  */
// function randomof3(gen: Prng, a: number, b: number, c: number): number {
//     nextrandom(gen);
//     const n = Math.floor((3.0 * (gen.value & 0x3FFFFFFF)) / 0x40000000);
//     return n < 2 ? n < 1 ? a : b : c;
// }

// /* Randomly permute a list of three values. Two random numbers are
//  * used, with the ranges [0,1] and [0,1,2].
//  */
// function randomp3(gen: Prng, array: Array<number>) {
//     nextrandom(gen);
//     let n = gen.value >> 30;
//     let t = array[n];  array[n] = array[1];  array[1] = t;
//     n = Math.floor((3.0 * (gen.value & 0x3FFFFFFF)) / 0x40000000);
//     t = array[n];  array[n] = array[2];  array[2] = t;
// }

// /* Randomly permute a list of four values. Three random numbers are
//  * used, with the ranges [0,1], [0,1,2], and [0,1,2,3].
//  */
// function randomp4(gen: Prng, array: Array<number>) {
//     nextrandom(gen);
//     let n = gen.value >> 30;
//     let t = array[n];  array[n] = array[1];  array[1] = t;
//     n = Math.floor((3.0 * (gen.value & 0x3FFFFFFF)) / 0x40000000);
//     t = array[n];  array[n] = array[2];  array[2] = t;
//     n = (gen.value >> 28) & 3;
//     t = array[n];  array[n] = array[3];  array[3] = t;
// }
