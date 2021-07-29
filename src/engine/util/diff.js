import BitSet from 'bitset';
import { runInAction } from 'mobx';
import { Creature } from '../model/creature';
import { Link, Location } from './link';

// ============================================================================
// TODO
// - see if the functionality in statediff.js can use this more general diff
//   code instead (and still maintain acceptable speed and space targets)
// - in order to do that, this will need to support more than just arrays of
//   complete objects - at the least it'll need to support scalar fields
//   (and either partial objects, or else determine that full objects are 
//   workable for active gamestate diff)
// ============================================================================

const CODE_NUMBITS = 5;
const OP_NUMBITS = 2;

const OP = {add: 1, update: 2, remove: 3}

// Helper for writing sequentially into a bitset
export class BitSetWriter {
  constructor() {
    this.bitset = new BitSet();
    this.index = 0;
  }

  setBits(value, numbits) {
    let v = value;
    for (let i = 0; i < numbits; i++) {
      this.bitset.set(this.index++, v & 1);
      v = v >> 1;
    }
  }

  setCode(code) {
    this.setBits(code, CODE_NUMBITS);
  }

  setOp(op) {
    this.setBits(op, OP_NUMBITS);
  }

  setCodeAndValue(code, ...tuples) {
    this.setCode(code);
    for (let t = 0; t < tuples.length; t += 2) {
      this.setBits(tuples[t], tuples[t+1]);
    }
  }

  setField(field, ...values) {
    this.setCode(field.code);
    const arr = values.flat();
    if (arr.length === 1) {
      this.setBits(arr[0], field.numbits);
    } else {
      for (let t = 0; t < arr.length; t++) {
        this.setBits(arr[t], field.numbits[t]);
      }
    }
  }
}

// Helper for reading sequentially from a bitset
export class BitSetReader {
  constructor(bitset) {
    this.bitset = bitset;
    this.index = 0;
  }

  makemask(numbits) {
    let m = 0;
    for (let n = 0; n < numbits; n++) m |= 1 << n;
    return m;
  }
  
  readValue(numbits, signed=false) {
    let v = 0;
    for (let i = 0; i < numbits; i++) {
      v |= (this.bitset.get(this.index++) << i);
    }
    if (signed && this.bitset.get(this.index-1)) {
      const mask = this.makemask(numbits - 1);
      v = -((~(v & mask) & mask) + 1);
    }
    return v;
  }

  readCode() {
    return this.readValue(CODE_NUMBITS);
  }

  readOp() {
    return this.readValue(OP_NUMBITS);
  }
}

// ----------------------------------------------------------------------------
// serialize
// TODO only type supported is 'array'

const ModelWriters = {
  'number': (writer, object, _, numBits) => writer.setBits(object, numBits),
  'Object': (writer, object, fields, numBits) => writeObject(writer, object, fields, numBits),
  'Creature': (writer, object, fields, numBits) => writeObject(writer, object, fields, numBits),
  'Link': (writer, object) => {
    writer.setBits(object.from.index(), 10);
    writer.setBits(object.to.index(), 10);
  },
};

const ModelComparators = {
  'number': (o1, o2) => o1 === o2,
  'Object': (o1, o2) => o1 === o2,
  'Creature': (o1, o2) => o1.pos === o2.pos && o1.id === o2.id && o1.dir === o2.dir && o1.moving === o2.moving && o1.frame === o2.frame && o1.hidden === o2.hidden && o1.state === o2.state,
  'Link': (o1, o2) => o1.from.x === o2.from.x && o1.from.y === o2.from.y && o1.to.x === o2.to.x && o1.to.y === o2.to.y
};

function writeObject(writer, object, fields, numBits) {
  for (let f = 0; f < fields.length; f++) {
    writer.setBits(object[fields[f]], numBits[f]);
  }
}

const WRITEOPS = {
  [OP.update]: (writer, code, list1, list2, v) => {
    for (let i = 0; i < list1.length && i < list2.length; i++) {
      if (!ModelComparators[v.objects.type](list1[i], list2[i])) {
        writer.setCode(code);
        writer.setOp(OP.update);
        writer.setBits(i, v.numBits);
        ModelWriters[v.objects.type](writer, list2[i], v.objects.fields, v.objects.numBits);
      }
    }
  },

  [OP.add]: (writer, code, list1, list2, v) => {
    for (let i = list1.length; i < list2.length; i++) {
      writer.setCode(code);
      writer.setOp(OP.add);
      ModelWriters[v.objects.type](writer, list2[i], v.objects.fields, v.objects.numBits);
    }
  },

  [OP.remove]: (writer, code, list1, list2, v) => {
    for (let i = list1.length - 1; i >= list2.length; i--) {
      writer.setCode(code);
      writer.setOp(OP.remove);
      writer.setBits(i, v.numBits);
    }
  },
}

export function makeDiff(schema, o1, o2) {
  const writer = new BitSetWriter();

  for (const [k,v] of Object.entries(schema)) {
    // todo switch v.type
    const fieldName = v.field;
    const list1 = o1[fieldName];
    const list2 = o2[fieldName];

    WRITEOPS[OP.update](writer, k, list1, list2, v);
    WRITEOPS[OP.add](writer, k, list1, list2, v);
    WRITEOPS[OP.remove](writer, k, list1, list2, v);
  }

  return writer.bitset;
}

// ----------------------------------------------------------------------------
// deserialize
// TODO only type supported is 'array'

const ModelUpdateReaders = {
  'number': (reader, target, field, index, _, numBits) => target[field][index] = reader.readValue(numBits),
  'Object': (reader, target, field, index, objectFields, numBits) => readObject(reader, target[field][index], objectFields, numBits),
  'Creature': (reader, target, field, index, objectFields, numBits) => readObject(reader, target[field][index], objectFields, numBits),
  'Link': (reader, target, field, index) => {
    const fromIndex = reader.readValue(10);
    const toIndex = reader.readValue(10);
    runInAction(() => {
      target[field][index].from = new Location(fromIndex, target);
      target[field][index].to = new Location(toIndex, target);
    })
  },
};

const ModelAddReaders = {
  'number': (reader, target, field, _, numBits) => target[field].push(reader.readValue(numBits)),
  'Object': (reader, target, field, objectFields, numBits) => {
    const o = {};
    readObject(reader, o, objectFields, numBits);
    target[field].push(o);
  },
  'Creature': (reader, target, field, objectFields, numBits) => {
    const o = new Creature();
    readObject(reader, o, objectFields, numBits);
    target[field].push(o);
  },
  'Link': (reader, target, field) => {
    const fromIndex = reader.readValue(10);
    const toIndex = reader.readValue(10);
    const from = new Location(fromIndex, target);
    const to = new Location(toIndex, target);
    runInAction(() => target[field].push(new Link(from, to)));
  },
};

function readObject(reader, object, fields, numBits) {
  for (let f = 0; f < fields.length; f++) {
    object[fields[f]] = reader.readValue(numBits[f]);
  }
}

const READOPS = {
  [OP.update]: (reader, target, v) => {
    const index = reader.readValue(v.numBits);
    ModelUpdateReaders[v.objects.type](reader, target, v.field, index, v.objects.fields, v.objects.numBits);
  },

  [OP.add]: (reader, target, v) => {
    ModelAddReaders[v.objects.type](reader, target, v.field, v.objects.fields, v.objects.numBits);
  },

  [OP.remove]: (reader, target, v) => {
    const index = reader.readValue(v.numBits);
    runInAction(() => target[v.field].splice(index, 1));
  },
}

export function applyDiff(schema, diff, target) {
  const reader = new BitSetReader(diff);
  let code = reader.readCode();
  while (code) {
    const op = reader.readOp();
    const v = schema[code];
    // todo switch v.type
    if (v.type === 'array') {
      READOPS[op](reader, target, v);
    }
    code = reader.readCode();
  }
}
