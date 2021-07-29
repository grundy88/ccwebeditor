import { TWtoCC, creatureid } from "../logic/twtile";
import { isMonster } from "../tiles/tile";
import { pointForLayerIndex } from "../util/utils";

function LevelsetWriter(buffer) {
  let offset = 0;

  this.getOffset = function() { return offset; }

  this.incOffset = function(n) { offset += n; }

  function internalWriteNumber(num, numBytes, buf, pos) {
    for (let i = 0; i < numBytes; i++) {
      if (buf) buf[pos+i] = (num >> (8*i)) & 0xFF;
    }
  }

  this.writeNumber = function(num, numBytes) {
    internalWriteNumber(num, numBytes, buffer, offset);
    offset += numBytes;
  }

  this.writeByte = function(num) {
    this.writeNumber(num, 1);
  }

  this.writeWord = function(num) {
    this.writeNumber(num, 2);
  }

  // set 'buf' at position 'pos' to be the word 'num'
  this.setWord = function(num, pos, buf=buffer) {
    internalWriteNumber(num, 2, buf, pos);
  }

  this.addBytes = function(bytes) {
    if (buffer) buffer.set(bytes, offset);
    offset += bytes.length;
  }

  this.writeString = function(s) {
    this.writeByte(s.length + 1);
    for (var i = 0; i < s.length; i++) {
      this.writeByte(s.charCodeAt(i));
    }    
    // add trailing \0
    this.writeByte(0);
  }

  this.writePassword = function(s) {
    this.writeByte(s.length + 1);
    for (var i = 0; i < s.length; i++) {
      this.writeByte(s.charCodeAt(i) ^ 0x99);
    }
    // add trailing \0
    this.writeByte(0);
  }
}

function writeLayer(writer, layer) {
  // max possible size is one byte for every layer element
  const layerBuf = new Uint8Array(layer.length);
  // skipping first word, will store num bytes in there once we know it
  let layerBufIndex = 2;
  for (let i = 0; i < layer.length; i++) {
    const code = layer[i];
    let j = 1;
    while (i+j < layer.length && j < 255 && layer[i+j] === code) j++;
    if (j >= 4) {
      // RLE
      layerBuf[layerBufIndex++] = 0xFF;
      layerBuf[layerBufIndex++] = j;
      layerBuf[layerBufIndex++] = code;
      i += j - 1;
    } else {
      layerBuf[layerBufIndex++] = code;
    }
  }
  // now we know the byte size, write it (not including its own bytes)
  // at the beginning of the layer buffer
  writer.setWord(layerBufIndex - 2, 0, layerBuf);

  // copy layer buffer into main levelset buffer
  writer.addBytes(layerBuf.subarray(0, layerBufIndex));
}

function writeTrapControls(writer, trapLinks) {
  if (!trapLinks || trapLinks.length === 0) return;
  writer.writeByte(4);
  writer.writeByte(trapLinks.length * 10);
  trapLinks.forEach(link => {
    writer.writeWord(link.from.x);
    writer.writeWord(link.from.y);
    writer.writeWord(link.to.x);
    writer.writeWord(link.to.y);
    writer.writeWord(0);
  });
}

function writeCloneControls(writer, cloneLinks) {
  if (!cloneLinks || cloneLinks.length === 0) return;
  writer.writeByte(5);
  writer.writeByte(cloneLinks.length * 8);
  cloneLinks.forEach(link => {
    writer.writeWord(link.from.x);
    writer.writeWord(link.from.y);
    writer.writeWord(link.to.x);
    writer.writeWord(link.to.y);
  });
}

function writeMonsters(writer, monsters) {
  if (!monsters || monsters.length === 0) return;
  writer.writeByte(10);
  writer.writeByte(monsters.length * 2);
  monsters.forEach(monster => {
    const [x, y] = pointForLayerIndex(monster.pos);
    // yep these coords are single bytes
    writer.writeByte(x);
    writer.writeByte(y);
  });
}

function _writeLevel(writer, level, numBytes) {
  writer.writeWord(numBytes);
  writer.writeWord(level.levelNumber);
  writer.writeWord(level.timeLimit);
  writer.writeWord(level.numChipsRequired);

  writer.writeWord(1);
  writeLayer(writer, level.topLayer);
  writeLayer(writer, level.bottomLayer);

  // need to come back and write number of optional field bytes
  const optionalFieldsOffset = writer.getOffset();
  writer.incOffset(2);

  // optional field in order by CHIPS.DAT convention: 3, 7, 6, 4, 5, 10

  writer.writeByte(3);
  writer.writeString(level.title);

  if (level.hint.trim().length > 0) {
    writer.writeByte(7);
    writer.writeString(level.hint);
  }

  writer.writeByte(6);
  writer.writePassword(level.password);

  writeTrapControls(writer, level.trapLinks);
  writeCloneControls(writer, level.cloneLinks);
  writeMonsters(writer, level.creatures.filter(cr => isMonster(TWtoCC[creatureid(cr.id)].code)));

  // optionalFieldsNumBytes does not include its own word
  const optionalFieldsNumBytes = writer.getOffset() - optionalFieldsOffset - 2;
  writer.setWord(optionalFieldsNumBytes, optionalFieldsOffset);
}

// level -> bytes (includes numBytes initial word)
function writeLevel(level) {
  // Phase I: determine total number of bytes
  const writer1 = new LevelsetWriter(null);
  _writeLevel(writer1, level, 0);
  const numBytes = writer1.getOffset() - 2;  // don't count the first word (for the number of bytes)
  // console.log(`level ${level.levelNumber} takes ${numBytes+2} bytes`);

  // Phase II: write to buffer
  const buffer = new Uint8Array(numBytes + 2);
  const writer2 = new LevelsetWriter(buffer);
  _writeLevel(writer2, level, numBytes);
  // console.log(buffer);

  return buffer;
}

function writeLevelset(levelset) {
  // Phase I: determine total number of bytes
  let levelsetNumBytes = 0;
  for (let l = 0; l < levelset.length; l++) {
    if (levelset[l].editedAt || !levelset[l].sourceBytes) {
      levelset[l].sourceBytes = writeLevel(levelset[l]);
      levelset[l].setClean();
    }
    levelsetNumBytes += levelset[l].sourceBytes.length;
  }
  // console.log(`new level set num bytes: ${levelsetNumBytes}`)

  // Phase II: write to buffer
  const buffer = new Uint8Array(levelsetNumBytes + 6);
  const writer = new LevelsetWriter(buffer);
  writer.writeNumber(174764, 4);
  writer.writeWord(levelset.length);
  for (let l = 0; l < levelset.length; l++) {
    writer.addBytes(levelset[l].sourceBytes);
  }
  // console.log(buffer);
  return buffer;
}

export { writeLevelset, writeLevel };
