import UIfx from 'uifx'
import sClickDown from '../../assets/sounds/clickDown.wav'
import sClickUp from '../../assets/sounds/clickUp.wav'
import sLevelComplete from '../../assets/sounds/levelComplete.wav'
import sTimeOver from '../../assets/sounds/timeOver.wav'
import sTeleport from '../../assets/sounds/teleport.wav'
import sSplash from '../../assets/sounds/splash.wav'
import sOof from '../../assets/sounds/oof.wav'
// import sFire from '../../assets/sounds/fire.wav'
import sBomb from '../../assets/sounds/bomb.wav'
import sComputerChip from '../../assets/sounds/computerChip.wav'
import sKey from '../../assets/sounds/key.wav'
import sFootwear from '../../assets/sounds/footwear.wav'
import sThief from '../../assets/sounds/thief.wav'
import sDied from '../../assets/sounds/died.wav'
import sSocket from '../../assets/sounds/socket.wav'
import sDoor from '../../assets/sounds/door.wav'
import sPopup from '../../assets/sounds/popup.wav'
// import sPop from '../../assets/sounds/pop.wav'
import { STEPS_PER_SECOND, DEFAULT_LEVEL_SIZE, pointForLayerIndex, loadBinaryAsset } from './utils'

// --------------------------------------------------------
// UIfx for playing sounds forward

const throttle = 1000 / (STEPS_PER_SECOND * 1.2);

const aClickDown = new UIfx(sClickDown, { throttleMs: throttle});
const aClickUp = new UIfx(sClickUp, { throttleMs: throttle});
const aLevelComplete = new UIfx(sLevelComplete, { throttleMs: throttle});
const aTimeOver = new UIfx(sTimeOver, { throttleMs: throttle});
const aTeleport = new UIfx(sTeleport, { throttleMs: throttle});
const aSplash = new UIfx(sSplash, { throttleMs: throttle});
const aOof = new UIfx(sOof, { throttleMs: throttle});
// const aFire = new UIfx(sFire, { throttleMs: throttle});
const aBomb = new UIfx(sBomb, { throttleMs: throttle});
const aComputerChip = new UIfx(sComputerChip, { throttleMs: throttle});
const aKey = new UIfx(sKey, { throttleMs: throttle});
const aFootwear = new UIfx(sFootwear, { throttleMs: throttle});
const aThief = new UIfx(sThief, { throttleMs: throttle});
const aDied = new UIfx(sDied, { throttleMs: throttle});
const aSocket = new UIfx(sSocket, { throttleMs: throttle});
const aDoor = new UIfx(sDoor, { throttleMs: throttle});
const aPopup = new UIfx(sPopup, { throttleMs: throttle});
// const aPop = new UIfx(sPop, { throttleMs: throttle});

/* The list of available sound effects.
 */
export const SND_CHIP_LOSES = 0;
export const SND_CHIP_WINS = 1;
export const SND_TIME_OUT = 2;
export const SND_TIME_LOW = 3;
export const SND_CANT_MOVE = 4;
export const SND_IC_COLLECTED = 5;
export const SND_BOOTS_COLLECTED = 6;
export const SND_KEY_COLLECTED = 7;
export const SND_BOOTS_STOLEN = 8;
export const SND_TELEPORTING = 9;
export const SND_DOOR_OPENED = 10;
export const SND_SOCKET_OPENED = 11;
export const SND_BUTTON_PUSHED = 12;
// export const SND_TILE_EMPTIED = 13;
export const SND_WALL_CREATED = 14;
// export const SND_TRAP_ENTERED = 15;
export const SND_BOMB_EXPLODES = 16;
export const SND_WATER_SPLASH = 17;

let enabled = true;

export function enable() { enabled = true; }
export function disable() { enabled = false; }

const SFX = Object.freeze({
  [SND_CHIP_LOSES]: () => aDied.play(),
  [SND_CHIP_WINS]: () => aLevelComplete.play(),
  [SND_TIME_OUT]: () => aTimeOver.play(),
  [SND_TIME_LOW]: () => aClickUp.play(),
  [SND_CANT_MOVE]: () => aOof.play(),
  [SND_IC_COLLECTED]: () => aComputerChip.play(),
  [SND_BOOTS_COLLECTED]: () => aFootwear.play(),
  [SND_KEY_COLLECTED]: () => aKey.play(),
  [SND_BOOTS_STOLEN]: () => aThief.play(),
  [SND_TELEPORTING]: () => aTeleport.play(),
  [SND_DOOR_OPENED]: () => aDoor.play(),
  [SND_SOCKET_OPENED]: () => aSocket.play(),
  [SND_BUTTON_PUSHED]: (vol) => aClickDown.play(vol),
  [SND_WALL_CREATED]: () => aPopup.play(),
  [SND_BOMB_EXPLODES]: (vol) => aBomb.play(vol),
  [SND_WATER_SPLASH]: (vol) => aSplash.play(vol),
});

export function playSounds(sounds) {
  while (sounds.length) {
    const {sfx, vol} = sounds.pop();
    if (enabled) SFX[sfx](vol);
  }
}

// --------------------------------------------------------
// AudioContext for playing sounds backward

const BSFX = {};

let context = null;
export async function initSound() {
  if (context !== null) return;
  context = new AudioContext();

  BSFX[SND_CHIP_LOSES] = await load('sounds/died.wav');
  BSFX[SND_CHIP_WINS] = await load('sounds/levelComplete.wav');
  BSFX[SND_TIME_OUT] = await load('sounds/timeOver.wav');
  BSFX[SND_TIME_LOW] = await load('sounds/clickUp.wav');
  BSFX[SND_CANT_MOVE] = await load('sounds/oof.wav');
  BSFX[SND_IC_COLLECTED] = await load('sounds/computerChip.wav');
  BSFX[SND_BOOTS_COLLECTED] = await load('sounds/footwear.wav');
  BSFX[SND_KEY_COLLECTED] = await load('sounds/key.wav');
  BSFX[SND_BOOTS_STOLEN] = await load('sounds/thief.wav');
  BSFX[SND_TELEPORTING] = await load('sounds/teleport.wav');
  BSFX[SND_DOOR_OPENED] = await load('sounds/door.wav');
  BSFX[SND_SOCKET_OPENED] = await load('sounds/socket.wav');
  BSFX[SND_BUTTON_PUSHED] = await load('sounds/clickDown.wav');
  BSFX[SND_WALL_CREATED] = await load('sounds/popup.wav');
  BSFX[SND_BOMB_EXPLODES] = await load('sounds/bomb.wav');
  BSFX[SND_WATER_SPLASH] = await load('sounds/splash.wav');
}

function playBuffer(audioBuffer, volume=1) {
  if (!context) return;
  let destination = context.destination;
  if (volume !== 1) {
    const gainNode = context.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(context.destination);
    destination = gainNode;
  }

  const source = context.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(destination);
  source.start(0);
}

// returns an AudioBuffer
async function load(f) {
  const source = await loadBinaryAsset(f);  
  const reversed = reverse(source);
  return new Promise((resolve) => {
    context.decodeAudioData(reversed, (buffer) => {
      resolve(buffer);
    });
  });
}

// returns an ArrayBuffer
function reverse(source) {
  // todo check:
  //  0-4: RIFF = little endian, RIFX = big endian
  //  34,35: sample size
  const sampleSize = 2;
  const arrayBuffer = new ArrayBuffer(source.length);
  const reversed = new Uint8Array(arrayBuffer);
  reversed.set(source.subarray(0, 44));
  for (let s = source.length - sampleSize, t = 44; t < reversed.length; s -= sampleSize, t += sampleSize) {
    reversed.set(source.subarray(s, s+sampleSize), t);
  }
  return arrayBuffer;
}

export async function playSoundsBackwards(sounds) {
  while (sounds.length) {
    const {sfx, vol} = sounds.pop();
    if (enabled) playBuffer(BSFX[sfx], vol);
  }
}

// --------------------------------------------------------

const MAX_VOLUME = 1.0
const MIN_VOLUME = 0.03
const MAX_VOLUME_DISTANCE = 8;

export function volume(entity1, entity2) {
  if (!entity1 || !entity2) return 1;
  const [x1,y1] = pointForLayerIndex(entity1.pos);
  const [x2,y2] = pointForLayerIndex(entity2.pos);
  const distance = Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
  const slope = (MIN_VOLUME - MAX_VOLUME) / ((DEFAULT_LEVEL_SIZE-1) - (MAX_VOLUME_DISTANCE + 1))
  return Math.min(Math.max(MAX_VOLUME + slope * (distance - MAX_VOLUME_DISTANCE), MIN_VOLUME), MAX_VOLUME);
}
