import { BitSetWriter, BitSetReader } from '../util/diff'
import { Creature } from './creature';

/*
 * I wanted to be able to rewind, to watch a replay of a level in reverse.
 * The game engine can only go forwards (logic's 'advancegame' function);
 * it doesn't have enough information to be able to go backwards.
 * 
 * This diff functionality exists to be able to recreate the state for 
 * the previous tick. Going backwards one tick involves applying a
 * diff to the current state, which mutates that state such that is 
 * becomes the way it was during the previous tick. Replaying backwards
 * then is a matter of applying successive diffs. A diff by itself is
 * pretty useless; it must be applied to the exact state that was used
 * to create it (ie. you can't just jump to a diff, much like you can't 
 * jump forward to a state, as playing forwards is a matter of applying
 * successive game logic steps).
 * 
 * TL;DR game state forward means mutating it with game logic, game state
 * backward means mutating it with a diff.
 * 
 * An aside: this code may appear much more complicated that it might seem to 
 * need to be. I first started with keeping a stack of complete state 
 * objects. It worked, but took lots of memory. I then moved to a diff
 * approach, keeping diffs as javascript objects. It also worked and took
 * less memory. Finally I arrived here, packing those diffs into a smaller
 * memory footprint.
 * 
 * Some numbers, seeking all the way from the beginning to the end of
 * CCLP3 level 144:
 * - stack of complete states: 5 lines of code, 5 seconds to seek, 1gb memory used
 * - stack of diff objects: 45 lines of code, 3 seconds, 13mb
 * - stack of diff bit arrays: 245 lines of code, 2 seconds, 3.7mb
 * 
 * Also, this code could be written more dynamically, with less lines of code
 * and less coupling to the state structure, bu tthe tradeoff for that is speed.
 * So, after all things considered, here we are.
 */

// DiffField (DF) - parts of the state that get packed into a diff bit array
// Note that since I'm using 5 bits to store the code, any more than 32 codes
// here won't work.
// Shady code alert: the lowercase fields need to exactly match the field
// names in the state object (still have some dynamic accesses).
const DF = Object.freeze({
  FLAGS:            {code: 1, numbits: 6},
  MAINPRNG:         {code: 2, numbits: 32},
  prng1:            {code: 3, numbits: 8},
  prng2:            {code: 4, numbits: 8},
  chipsNeeded:      {code: 5, numbits: 10},
  nextrndslidedir:  {code: 6, numbits: 4},
  endgametimer:     {code: 7, numbits: 4},
  gameOver:         {code: 8, numbits: 4},
  chiplastmovetime: {code: 9, numbits: 32},
  SOUNDEFFECT:      {code: 10, numbits: [5, 7]},

  MAPPOS:           {code: 11, numbits: 10},
  MAPtop:           {code: 12, numbits: 8},
  MAPbottom:        {code: 13, numbits: 8},
  MAPstate:         {code: 14, numbits: 4},

  CRINDEX:          {code: 15, numbits: 10},
  CRpos:            {code: 16, numbits: 10},
  CRid:             {code: 17, numbits: 8},
  CRdir:            {code: 18, numbits: 4},
  CRmoving:         {code: 19, numbits: 5, signed: true},
  CRframe:          {code: 20, numbits: 5, signed: true},
  CRhidden:         {code: 21, numbits: 1},
  CRstate:          {code: 22, numbits: 8},
  CRtdir:           {code: 23, numbits: 4},
  CRFOOTWEAR:       {code: 24, numbits: 4},
  CRnumBlueKeys:    {code: 25, numbits: 4},
  CRnumRedKeys:     {code: 26, numbits: 4},
  CRnumYellowKeys:  {code: 27, numbits: 4},
  CRnumGreenKeys:   {code: 28, numbits: 4},
  CRINDEXREMOVE:    {code: 29, numbits: 10},
  CRADD:            {code: 30, numbits: 0},

  END:              {code: 31, numbits: 0},
});

// Functions to read a field from a diff bit array and apply the result to a state object
const DiffFieldRead = {
  [DF.FLAGS.code]:            (reader, state) => extractFlags(state, reader.readValue(DF.FLAGS.numbits), STATE_FLAGS_FIELDS),
  [DF.MAINPRNG.code]:         (reader, state) => state.mainprng.value = reader.readValue(DF.MAINPRNG.numbits),
  [DF.prng1.code]:            (reader, state) => state.prng1 = reader.readValue(DF.prng1.numbits),
  [DF.prng2.code]:            (reader, state) => state.prng2 = reader.readValue(DF.prng2.numbits),
  [DF.chipsNeeded.code]:      (reader, state) => state.setChipsNeeded(reader.readValue(DF.chipsNeeded.numbits)),
  [DF.nextrndslidedir.code]:  (reader, state) => state.nextrndslidedir = reader.readValue(DF.nextrndslidedir.numbits),
  [DF.endgametimer.code]:     (reader, state) => state.endgametimer = reader.readValue(DF.endgametimer.numbits),
  [DF.gameOver.code]:         (reader, state) => state.setGameOver(reader.readValue(DF.gameOver.numbits)),
  [DF.chiplastmovetime.code]: (reader, state) => state.chiplastmovetime = reader.readValue(DF.chiplastmovetime.numbits),
  [DF.SOUNDEFFECT.code]:      (reader, state) => {
    state.soundeffects.push({sfx: reader.readValue(DF.SOUNDEFFECT.numbits[0]), vol: reader.readValue(DF.SOUNDEFFECT.numbits[1]) / 100})
  },

  [DF.MAPPOS.code]: (reader, state) => {
    const pos = reader.readValue(DF.MAPPOS.numbits);
    let code = reader.readCode();
    while (code !== DF.END.code) {
      DiffFieldRead[code](reader, state.map[pos]);
      code = reader.readCode();
    }
  },
  [DF.MAPtop.code]:     (reader, mapcell) => mapcell.top = reader.readValue(DF.MAPtop.numbits),
  [DF.MAPbottom.code]:  (reader, mapcell) => mapcell.bottom = reader.readValue(DF.MAPbottom.numbits),
  [DF.MAPstate.code]:   (reader, mapcell) => mapcell.state = reader.readValue(DF.MAPstate.numbits),

  [DF.CRINDEX.code]: (reader, state) => {
    const index = reader.readValue(DF.CRINDEX.numbits);
    let code = reader.readCode();
    while (code !== DF.END.code) {
      DiffFieldRead[code](reader, state.creatures[index]);
      code = reader.readCode();
    }
  },
  [DF.CRpos.code]:    (reader, cr) => cr.pos = reader.readValue(DF.CRpos.numbits),
  [DF.CRid.code]:     (reader, cr) => cr.id = reader.readValue(DF.CRid.numbits),
  [DF.CRdir.code]:    (reader, cr) => cr.dir = reader.readValue(DF.CRdir.numbits),
  [DF.CRmoving.code]: (reader, cr) => cr.moving = reader.readValue(DF.CRmoving.numbits, true),
  [DF.CRframe.code]:  (reader, cr) => cr.frame = reader.readValue(DF.CRframe.numbits, true),
  [DF.CRhidden.code]: (reader, cr) => cr.hidden = reader.readValue(DF.CRhidden.numbits),
  [DF.CRstate.code]:  (reader, cr) => cr.state = reader.readValue(DF.CRstate.numbits),
  [DF.CRtdir.code]:   (reader, cr) => cr.tdir = reader.readValue(DF.CRtdir.numbits),

  [DF.CRFOOTWEAR.code]:       (reader, cr) => extractFlags(cr, reader.readValue(DF.CRFOOTWEAR.numbits), FOOTWEAR_FIELDS),
  [DF.CRnumBlueKeys.code]:    (reader, cr) => cr.numBlueKeys = reader.readValue(DF.CRnumBlueKeys.numbits),
  [DF.CRnumRedKeys.code]:     (reader, cr) => cr.numRedKeys = reader.readValue(DF.CRnumRedKeys.numbits),
  [DF.CRnumYellowKeys.code]:  (reader, cr) => cr.numYellowKeys = reader.readValue(DF.CRnumYellowKeys.numbits),
  [DF.CRnumGreenKeys.code]:   (reader, cr) => cr.numGreenKeys = reader.readValue(DF.CRnumGreenKeys.numbits),

  [DF.CRINDEXREMOVE.code]: (reader, state) => {
    const index = reader.readValue(DF.CRINDEXREMOVE.numbits);
    state.creatures.splice(index, 1);
  },
  [DF.CRADD.code]: (reader, state) => {
    let code = reader.readCode();
    const cr = new Creature();
    while (code !== DF.END.code) {
      DiffFieldRead[code](reader, cr);
      code = reader.readCode();
    }
    state.creatures.push(cr);
  },
}

const STATE_FLAGS_FIELDS = ['togglestate', 'completed', 'stuck', 'pushing', 'couldntmove'];
// fields here should very likely also be in gamestate.copyState()
const STATE_FIELDS = ['prng1', 'prng2', 'chipsNeeded', 'nextrndslidedir', 'endgametimer', 'gameOver', 'chiplastmovetime'];
const FOOTWEAR_FIELDS = ['hasFlippers', 'hasFireboots', 'hasSkates', 'hasForceboots'];
const CREATURE_FIELDS = ['pos', 'id', 'dir', 'moving', 'frame', 'hidden', 'state', 'tdir'];
const CHIP_FIELDS = [...CREATURE_FIELDS, 'numBlueKeys', 'numRedKeys', 'numYellowKeys', 'numGreenKeys'];

// ------------------------------------------------------------------
// internal/util functions

// pack an array of true/false field values into bits
function makeFlags(state, fields) {
  let flags = 0;
  for (let i = 0; i < fields.length; i++) {
    if (state[fields[i]]) flags |= 1 << i;
  }
  return flags;
}

// unpack bits into an array of true/false fields
function extractFlags(state, flags, fields) {
  for (let i = 0; i < fields.length; i++) {
    state[fields[i]] = (flags & (1 << i));
  }
}

// ------------------------------------------------------------------
// These are the two public functions
// diffState: used during forwards play to gather diffs
// applyDiff: used during backwards play to move to the previous state (it's the reverse of logic.advancegame)

/* 
 * This function packs the differences to go from state1 to state2 into a bitset.
 * Layout is:
 * - 5 bits for the field code (from the DF object)
 * - n bits for the field value (depends in numbits in the DF object)
 * DiffFieldRead supplies functions for extracting each code's value.
 */
export function diffState(state1, state2) {
  // This code could be written more dynamically with less hard coding and less LoC,
  // but then it's significantly slower, so I've gone the ugly route, which does mean
  // changing what/how makes up a diff is sort of a pain (need to update the DF object,
  // the DiffFieldRead functions, and the guts of this function).

  const writer = new BitSetWriter();
  if (state1.mainprng.value !== state2.mainprng.value) writer.setField(DF.MAINPRNG, state2.mainprng.value);

  const flags1 = makeFlags(state1, STATE_FLAGS_FIELDS);
  const flags2 = makeFlags(state2, STATE_FLAGS_FIELDS);
  if (flags1 !== flags2) writer.setField(DF.FLAGS, flags2);

  for (let tuple of state1.soundeffects) {
    writer.setField(DF.SOUNDEFFECT, tuple.sfx, Math.floor(tuple.vol * 100));
  }

  STATE_FIELDS.forEach(f => {
    if (state1[f] !== state2[f]) writer.setField(DF[f], state2[f]);
  });

  // the map
  for (let pos = 0; pos < state1.map.length; pos++) {
    const different = state1.map[pos].top !== state2.map[pos].top
      || state1.map[pos].bottom !== state2.map[pos].bottom
      || state1.map[pos].state !== state2.map[pos].state
    ;
    if (different) {
      writer.setField(DF.MAPPOS, pos);
      if (state1.map[pos].top !== state2.map[pos].top) writer.setField(DF.MAPtop, state2.map[pos].top)
      if (state1.map[pos].bottom !== state2.map[pos].bottom) writer.setField(DF.MAPbottom, state2.map[pos].bottom)
      if (state1.map[pos].state !== state2.map[pos].state) writer.setField(DF.MAPstate, state2.map[pos].state)
      writer.setField(DF.END);
    }
  }

  const cr1 = state1.creatures;
  const cr2 = state2.creatures;
  {
    // chip himself
    // this code is the more dynamic approach, less code but slower (but only 1 Chip per diff so I'm leaving this)

    // first see if anything changed
    const tempdiffs = [];
    CHIP_FIELDS.forEach(f => { if (cr1[0][f] !== cr2[0][f]) tempdiffs.push([0, f, cr2[0][f]]); });
    const flags1 = makeFlags(cr1[0], FOOTWEAR_FIELDS);
    const flags2 = makeFlags(cr2[0], FOOTWEAR_FIELDS);
  
    // then write the changes only
    if (tempdiffs.length || (flags1 !== flags2)) {
      writer.setField(DF.CRINDEX, 0);
      for (let d of tempdiffs) writer.setField(DF['CR'+d[1]], d[2]);
      if (flags1 !== flags2) writer.setField(DF.CRFOOTWEAR, flags2);
      writer.setField(DF.END);
    }
  }

  // the rest of the creatures
  // this code is the more inflexible approach, more code (hard coded fields) but faster
  for (let i = 1; i < cr1.length; i++) {
    if (i >= cr2.length) {
      writer.setField(DF.CRINDEXREMOVE, i);
    } else {
      // first see if anything changed
      const different = cr1[i].pos !== cr2[i].pos
          || cr1[i].id !== cr2[i].id
          || cr1[i].dir !== cr2[i].dir
          || cr1[i].moving !== cr2[i].moving
          || cr1[i].frame !== cr2[i].frame
          || cr1[i].hidden !== cr2[i].hidden
          || cr1[i].state !== cr2[i].state
          || cr1[i].tdir !== cr2[i].tdir
      ;
      // then write the changes only
      if (different) {
        writer.setField(DF.CRINDEX, i);
        if (cr1[i].pos !== cr2[i].pos) writer.setField(DF.CRpos, cr2[i].pos);
        if (cr1[i].id !== cr2[i].id) writer.setField(DF.CRid, cr2[i].id);
        if (cr1[i].dir !== cr2[i].dir) writer.setField(DF.CRdir, cr2[i].dir);
        if (cr1[i].moving !== cr2[i].moving) writer.setField(DF.CRmoving, cr2[i].moving);
        if (cr1[i].frame !== cr2[i].frame) writer.setField(DF.CRframe, cr2[i].frame);
        if (cr1[i].hidden !== cr2[i].hidden) writer.setField(DF.CRhidden, cr2[i].hidden);
        if (cr1[i].state !== cr2[i].state) writer.setField(DF.CRstate, cr2[i].state);
        if (cr1[i].tdir !== cr2[i].tdir) writer.setField(DF.CRtdir, cr2[i].tdir);
        writer.setField(DF.END);
      }
    }
  }
  for (let i = cr1.length; i < cr2.length; i++) {
    writer.setField(DF.CRADD);
    for (let f of CREATURE_FIELDS) writer.setField(DF['CR'+f], cr2[i][f]);
    writer.setField(DF.END);
  }

  return writer.bitset;
}

/*
 * Mutate the passed state with the passed diff.
 */
export function applyDiff(state, bitset) {
  const reader = new BitSetReader(bitset);
  let code = reader.readCode();
  while (code) {
    DiffFieldRead[code](reader, state);
    code = reader.readCode();
  }
}
