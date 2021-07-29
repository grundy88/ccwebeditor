/* eslint-disable no-unused-vars */
import { indextodir } from '../logic/dir'

// For reading TWS solution files.
// https://www.muppetlabs.com/~breadbox/software/tworld/tworldff.html#3

// Kind of an iterator over tws data, passed as a byte array
function TWSReader(data, startOffset=0) {
  var offset = startOffset;

  function getNumber(bytes, offset, len) {
    var ret = 0;
    for (var i = 0; i < len; i++) {
      ret += bytes[i + offset] << (8*i);
    }
    return ret;
  }

  this.getOffset = function() { return offset; }

  this.incOffset = function(n) { offset += n; }

  // reads the next number and then reads that many bytes
  // result includes the initial numBytes word
  // *does not* advance the reader
  this.peekNextNumberOfBytes = function(numBytes) {
      const n = getNumber(data, offset, numBytes);
      return data.subarray(offset, offset+numBytes+n);
  }

  // reads the next number and then skips that many bytes
  this.skipNextNumberOfBytes = function(numBytes) {
      const n = getNumber(data, offset, numBytes);
      offset += numBytes + n;
  }

  this.nextNumber = function(numBytes=2) {
      const n = getNumber(data, offset, numBytes);
      offset += numBytes;
      return n;
  }

  this.nextString = function(strlen) {
    const s = String.fromCharCode.apply(String, data.subarray(offset, offset+strlen));
    offset += strlen;
    return s;
  }

  this.nextZeroTerminatedString = function() {
    let strend = offset;
    while (data[strend] !== 0) strend++;
    const s = String.fromCharCode.apply(String, data.subarray(offset, strend));
    offset = strend + 1;
    return s;
  }

  this.nextPassword = function() {
      const strlen = this.nextNumber(1);
      // ignore trailing \0
      const a = data.subarray(offset, offset+strlen-1);
      offset += strlen;
      var password = "";
      for (var i = 0; i < a.length; i++) {
          password += String.fromCharCode(a[i] ^ 0x99);
      }
      return password;
  }
}

// const TWSDir = Object.freeze({N:1, W:2, S:4, E:8, NW:3, SW: 6, NE:9, SE:12});
// const dirs = [TWSDir.N, TWSDir.W, TWSDir.S, TWSDir.E, TWSDir.NW, TWSDir.SW, TWSDir.NE, TWSDir.SE];

function loadSolution(bytes, levelNum) {
  const reader = new TWSReader(bytes);
  const magic = reader.nextNumber(4);
  if (magic !== -1717882059) {
    throw new Error(`error: not a valid Chip's Challenge solution file: 0x${magic.toString(16)}`);
  }
  const ruleset = reader.nextNumber(1);  // I need 1 for lynx
  if (ruleset !== 1) {
    throw new Error(`only Lynx ruleset supported (not ${ruleset})`);
  }
  reader.nextNumber(); // the number of the most recently visited level.
  reader.nextNumber(1); // count of bytes in remainder of header (currently always zero).

  let recordSize = reader.nextNumber(4);

  const check = reader.peekNextNumberOfBytes(6); // todo check for all zeroes
  reader.nextNumber(16);
  const solutionsName = reader.nextZeroTerminatedString();
  // console.log(solutionsName);

  for (let i = 0; i < levelNum; i++) {
    reader.skipNextNumberOfBytes(4);
  }

  recordSize = reader.nextNumber(4);
  const recordEnd = reader.getOffset() + recordSize;
  const levelNumber = reader.nextNumber(2);
  const password = reader.nextString(4);
  // console.log(`record size: ${recordSize}`);
  // console.log(`level num: ${levelNumber}`);
  // console.log(`password: ${password}`);
  reader.nextNumber(1);
  const info = reader.nextNumber(1);
  const initialRandomForceDir = indextodir(info & 7);
  const stepParity = (info >> 3) & 7;
  const prngSeed = reader.nextNumber(4);
  const time = reader.nextNumber(4);
  // console.log(`initialRandomForceDir: ${initialRandomForceDir}`);
  // console.log(`stepParity: ${stepParity}`);
  // console.log(`time: ${time/20}`);

  const solution = {
    numFrames: time,
    initialRandomForceDir: initialRandomForceDir,
    stepParity: stepParity,
    prngSeed: prngSeed,
    actions: []
  }

  let when = -1;
  while (reader.getOffset() < recordEnd) {
  // for (let i = 0; i < 20; i++) {
    const b = reader.nextNumber(1);
    const format = b & 0x03;
    // console.log(`move ${i++}: ${b} (0x${b.toString(16)}) - format ${format}`);
    switch (format) {
      case 0:
        // CCBBAA00
        when += 4;
        solution.actions.push({t:when, dir:indextodir((b >> 2) & 0x03)});
        when += 4;
        solution.actions.push({t:when, dir:indextodir((b >> 4) & 0x03)});
        when += 4;
        solution.actions.push({t:when, dir:indextodir((b >> 6) & 0x03)});
        break;
      case 1:
        // TTTDDD01
        when += ((b >> 5) & 0x07) + 1;
        solution.actions.push({t:when, dir:indextodir((b >> 2) & 0x07)});
        break;
      case 2:
        // TTTTTTTT TTTDDD10
        const b2 = reader.nextNumber(1);
        when += ((b >> 5) & 0x07) + (b2 << 3) + 1;
        solution.actions.push({t:when, dir:indextodir((b >> 2) & 0x07)});
        break;
      default:
        // TTTTTTTT TTTTTTTT TTTTTTTT TTT0DD11
        // TTTTTTTT TTTTTTTT TTTTTTTT TTDDDDDD DDD1NN11
        // console.log(`  I can't do format ${format} yet`);
        solution.unsupported = true;
    }
    // console.log(actions); 
  }
  return solution;
}

// -----------------------------------------------------

// const fs = require('fs')

// const data = fs.readFileSync('../../assets/public_CCLP3-lynx.dac.tws');
// const levelNum = 12;
// const actions = loadSolution(data, levelNum);
// console.log(`level ${levelNum} has ${actions.length} actions`);

export { loadSolution }
