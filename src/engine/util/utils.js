import logger from 'simple-console-logger';
import { Dir } from '../logic/dir';
import { CC, isMonster, isCloneMachine } from '../tiles/tile'
import { Creature } from '../model/creature';
import { Link } from './link';

logger.configure({
  level: 'info',
  levels: {
      move: 'info',
  },
  dateFormat: 'YYYY-MM-DD HH:mm:ssZ',
  watch: false
})

// number of game engine calculations per step
// never change this, it's lynx granularity
export const TICKS_PER_STEP = 4;

// game engine speed - entities at normal speed will move this many board tiles in 1 second
// never change this, it's fairly standard
export const STEPS_PER_SECOND = 5;

// number of animation frames per step
// higher number means smoother animation
// TODO completely broken - this just changes the speed as lynx logic is set to match frames and ticks (at 4/s)
export const FRAMES_PER_STEP = 4;

export const DEFAULT_LEVEL_SIZE = 32;

export function layerIndexForPoint(x, y, width = DEFAULT_LEVEL_SIZE) {
  return (y * width) + x;
}

export function pointForLayerIndex(index, width = DEFAULT_LEVEL_SIZE) {
  return [index % width, Math.floor(index / width)];
}

export function toCoords(index, width = DEFAULT_LEVEL_SIZE) {
  return `${index % width}, ${Math.floor(index / width)}`;
}

export function topLayerUnder(entity, x=entity.x, y=entity.y) {
  const index = layerIndexForPoint(x, y);
  return entity.level.topCode(index);
}

// true if source tile is in sources and target tile is in targets
export function codesIn(sourceTile, sources, targetTile, targets) {
  return (sources.includes(sourceTile.code) && targets.includes(targetTile.code))
};

export function translate(x, y, dir) {
    switch (dir) {
        case Dir.N: return [x, y-1];
        case Dir.S: return [x, y+1];
        case Dir.E: return [x+1, y];
        case Dir.W: return [x-1, y];
        default: return [x,y];
    }
}

// call the callback "repetitions" times, with "delay" millis between
// there is no way to cancel
export function callNTimes(callback, delay, repetitions) {
  for (let i = 0; i < repetitions; i++) setTimeout(callback, delay*i);
}

export const ctrlKey = navigator.appVersion.indexOf('Mac') >= 0 ? '⌘' : '⌃';

// ------------------------------------------------------------------
// These functions are here (instead of on the Level object) to avoid
// duplicating them on the GameState object (with which these also work
// if a GameState is passed as the level parameter).

function addMonster(level, monster) {
  setMonsters(level, [...level.creatures, monster]);
}

function removeMonster(level, pos) {
  const i = level.creatures.findIndex(m => m.pos === pos);
  if (i >= 0) {
    const newList = Array.from(level.creatures);
    newList.splice(i, 1);
    setMonsters(level, newList);
  }
}

function setMonsters(level, creatures) {
  level.creatures = creatures;
}

function replaceMonster(level, pos, monster) {
  const i = level.creatures.findIndex(m => m.pos === pos);
  if (i >= 0) level.creatures[i] = monster;
}

export function addLink(level, x, y, targetx, targety, links) {
  const newList = Array.from(links);
  const from = level.location(x, y);
  const to = level.location(targetx, targety);
  for (let i = 0; i < newList.length; i++) {
    const b = newList[i];
    if (b.from.matches(from) && b.to.matches(to)) {
      return links;
    } else if (b.from.matches(from) && !b.to.matches(to)) {
      // one button to two targets is not allowed - remove the previous link
      newList.splice(i, 1);
      i--;
    }
    // two buttons to one target is allowed - no need to check
  }
  newList.push(new Link(from, to))
  return newList;
}

function removeLinksToFrom(level, x, y, links) {
  const newList = Array.from(links);
  for (let i = 0; i < newList.length; i++) {
    const b = newList[i];
    if ((b.from.isAt(x, y) || b.to.isAt(x, y)) && b.from.level === level && b.to.level === level) {
      newList.splice(i, 1);
      i--;
    }
  }
  return newList;
}

export function removeLink(index, buttons) {
  const newList = Array.from(buttons);
  newList.splice(index, 1);
  return newList;
}

function removeTrapLinksToFrom(level, x, y) {
  level.trapLinks = removeLinksToFrom(level, x, y, level.trapLinks);
}

function removeCloneLinksToFrom(level, x, y) {
  level.cloneLinks = removeLinksToFrom(level, x, y, level.cloneLinks);
}

/**
 * Place tool on layer at [tx,ty]
 */
export function placeTile(level, tx, ty, tool, onTopLayer) {
  const index = layerIndexForPoint(tx, ty, level.size.w);
  const levelTop = level.topCode(index);
  const levelBottom = level.bottomCode(index);
  let modified = false

  if (onTopLayer) {
    if (level.topCode(index) !== tool) {
      level.setTopCode(index, tool);
      modified = true;

      // see if we're removing a monster
      if (isMonster(levelTop) && !isMonster(tool)) {
        removeMonster(level, index);
      }

      // see if we're replacing a monster
      if (isMonster(levelTop) && isMonster(tool) && (levelTop !== tool)) {
        const monster = new Creature(tx, ty, tool);
        replaceMonster(level, index, monster);
      }

      // see if we're adding a monster not on a clone machine
      if (isMonster(tool) && !isMonster(levelTop) && !isCloneMachine(levelBottom)) {
        // todo consolidate with levelset monster add
        const monster = new Creature(tx, ty, tool);
        addMonster(level, monster);
      }

      // see if we're removing a trap link
      if ((tool !== CC.BROWN_BUTTON.code && levelTop === CC.BROWN_BUTTON.code)
          || (tool !== CC.TRAP.code && levelTop === CC.TRAP.code)) {
            removeTrapLinksToFrom(level, tx, ty);
      }

      // see if we're removing a clone link
      if (tool !== CC.RED_BUTTON.code && levelTop === CC.RED_BUTTON.code) {
        removeCloneLinksToFrom(level, tx, ty);
      }

    }
  } else {
    // modifying bottom layer
    if (level.bottomCode(index) !== tool) {
      level.setBottomCode(index, tool);
      modified = true;

      // see if we're removing a trap link
      if (tool !== CC.TRAP.code && levelBottom === CC.TRAP.code) {
        removeTrapLinksToFrom(level, tx, ty);
      }
      if (tool !== CC.BROWN_BUTTON.code && levelBottom === CC.BROWN_BUTTON.code) {
        removeTrapLinksToFrom(level, tx, ty);
      }

      // see if we're removing a clone link
      if (tool !== CC.CLONE_MACHINE.code && levelBottom === CC.CLONE_MACHINE.code) {
        removeCloneLinksToFrom(level, tx, ty);
      }
      if (tool !== CC.RED_BUTTON.code && levelBottom === CC.RED_BUTTON.code) {
        removeTrapLinksToFrom(level, tx, ty);
      }

      // see if we're removing a clone machine under a monster
      if (isCloneMachine(levelBottom) && !isCloneMachine(tool) && isMonster(levelTop)) {
        const monster = new Creature(tx, ty, levelTop);
        addMonster(level, monster);
      }

      // see if we added a clone machine under a monster
      if (isCloneMachine(tool) && isMonster(levelTop)) {
        removeMonster(level, index);
      }        
    }
  }
  return modified;
}

// ------------------------------------------------------------------

/* A list of ways for Chip to lose.
 */
export const EndReasons = Object.freeze({
  Exit: 1,
  Time: 2,
  Monster: 3,
  Block: 4,
  Fire: 5,
  Water: 6,
  Bomb: 7,
});

export function gameOverMessage(reason) {
  switch (reason) {
    case EndReasons.Exit: return "Go bit buster!";
    case EndReasons.Time: return "Ooops! Out of time...";
    case EndReasons.Monster: return "Ooops! Look out for creatures!";
    case EndReasons.Block: return "Ooops! Watch out for moving blocks!";
    case EndReasons.Fire: return "Ooops! Don't step in the fire without fire boots!";
    case EndReasons.Water: return "Ooops! You can't swim without flippers!";
    case EndReasons.Bomb: return "Ooops! Don't touch the bombs!";
    default: return 'Game Over!';
  }
}

export function loadBinaryAsset(file) {
  return new Promise((resolve) => {
    import(`../../assets/${file}`).then(path => {
      // todo there has got to be a better way
      const request = new XMLHttpRequest();
      request.open('GET', path.default, true);
      request.responseType = 'blob';
      request.onload = () => {
          const reader = new FileReader();
          reader.readAsArrayBuffer(request.response);
          reader.onload = () => {
            resolve(new Uint8Array(reader.result));
          };
      };
      request.send();
    });
  })
}
