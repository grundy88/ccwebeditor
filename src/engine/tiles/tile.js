import { Dir, left, right, back } from "../logic/dir";

function makeTile(code, name, arrow=0) {
  return {code: code, name: name, arrow: arrow};
}

/*
 * A Chip's Challenge tile, as read from/written to a .DAT file.
 * The codes here are what are stored in the Level object.
 * Bummer: These are not simple numbers, there are objects containing
 * a code plus additional metadata related to editing. So you'll find
 * code sometimes referencing the object, sometimes referencing .code,
 * and it can be confusing as to when to use which. Perhaps I should
 * have a separate enum just for the numbers (codes), and another
 * for the metadata.
 */
export const CC = Object.freeze({
  FLOOR                   : makeTile(0x00, 'Floor'),
  WALL                    : makeTile(0x01, 'Wall'),
  COMPUTER_CHIP           : makeTile(0x02, 'Computer Chip'),
  WATER                   : makeTile(0x03, 'Water'),
  FIRE                    : makeTile(0x04, 'Fire'),
  INVISIBLE_WALL          : makeTile(0x05, 'Invisible Wall'),
  THIN_WALL_N             : makeTile(0x06, 'Thin Wall North'),
  THIN_WALL_W             : makeTile(0x07, 'Thin Wall West'),
  THIN_WALL_S             : makeTile(0x08, 'Thin Wall South'),
  THIN_WALL_E             : makeTile(0x09, 'Thin Wall East'),
  BLOCK                   : makeTile(0x0A, 'Block'),
  DIRT                    : makeTile(0x0B, 'Dirt'),
  ICE                     : makeTile(0x0C, 'Ice'),
  FORCE_S                 : makeTile(0x0D, 'Force Floor South'),
  CLONE_BLOCK_N           : makeTile(0x0E, 'Clone Block North', Dir.N),
  CLONE_BLOCK_W           : makeTile(0x0F, 'Clone Block West', Dir.W),
  CLONE_BLOCK_S           : makeTile(0x10, 'Clone Block South', Dir.S),
  CLONE_BLOCK_E           : makeTile(0x11, 'Clone Block East', Dir.E),
  FORCE_N                 : makeTile(0x12, 'Force Floor North'),
  FORCE_E                 : makeTile(0x13, 'Force Floor East'),
  FORCE_W                 : makeTile(0x14, 'Force Floor West'),
  EXIT                    : makeTile(0x15, 'Exit'),
  BLUE_DOOR               : makeTile(0x16, 'Blue Door'),
  RED_DOOR                : makeTile(0x17, 'Red Door'),
  GREEN_DOOR              : makeTile(0x18, 'Green Door'),
  YELLOW_DOOR             : makeTile(0x19, 'Yellow Door'),
  ICE_SE                  : makeTile(0x1A, 'Ice Corner South/East'),
  ICE_SW                  : makeTile(0x1B, 'Ice Corner South/West'),
  ICE_NW                  : makeTile(0x1C, 'Ice Corner North/West'),
  ICE_NE                  : makeTile(0x1D, 'Ice Corner North/East'),
  BLUE_BLOCK_FLOOR        : makeTile(0x1E, 'Fake Blue Wall'),
  BLUE_BLOCK_WALL         : makeTile(0x1F, 'Real Blue Wall'),
  UNUSED1                 : makeTile(0x20, 'unused'),
  THIEF                   : makeTile(0x21, 'Thief'),
  SOCKET                  : makeTile(0x22, 'Socket'),
  GREEN_BUTTON            : makeTile(0x23, 'Green Button'),
  RED_BUTTON              : makeTile(0x24, 'Red Button'),
  TOGGLE_WALL_CLOSED      : makeTile(0x25, 'Closed Toggle Wall'),
  TOGGLE_WALL_OPEN        : makeTile(0x26, 'Open Toggle Wall'),
  BROWN_BUTTON            : makeTile(0x27, 'Brown Button'),
  BLUE_BUTTON             : makeTile(0x28, 'Blue Button'),
  TELEPORT                : makeTile(0x29, 'Teleport'),
  BOMB                    : makeTile(0x2A, 'Bomb'),
  TRAP                    : makeTile(0x2B, 'Trap'),
  APPEARING_WALL          : makeTile(0x2C, 'Appearing Wall'),
  GRAVEL                  : makeTile(0x2D, 'Gravel'),
  POPUP_WALL              : makeTile(0x2E, 'Popup'),
  HINT                    : makeTile(0x2F, 'Hint'),
  THIN_WALL_SE            : makeTile(0x30, 'Thin Wall South/East'),
  CLONE_MACHINE           : makeTile(0x31, 'Clone Machine'),
  FORCE_RANDOM            : makeTile(0x32, 'Force Floor Random'),
  DROWNING_CHIP           : makeTile(0x33, 'Drowning Chip'),
  BURNED_CHIP             : makeTile(0x34, 'Burned Chip in Fire'),
  BURNED_CHIP2            : makeTile(0x35, 'Burned Chip'),
  UNUSED2                 : makeTile(0x36, 'unused'),
  UNUSED3                 : makeTile(0x37, 'unused'),
  UNUSED4                 : makeTile(0x38, 'unused'),
  CHIP_IN_EXIT            : makeTile(0x39, 'Chip in Exit'),
  EXIT_END_GAME           : makeTile(0x3A, 'Exit (end game 1)'),
  EXIT_END_GAME2          : makeTile(0x3B, 'Exit (end game 2)'),
  CHIP_SWIMMING_N         : makeTile(0x3C, 'Chip Swimming (north)'),
  CHIP_SWIMMING_W         : makeTile(0x3D, 'Chip Swimming (west)'),
  CHIP_SWIMMING_S         : makeTile(0x3E, 'Chip Swimming (south)'),
  CHIP_SWIMMING_E         : makeTile(0x3F, 'Chip Swimming (east)'),
  BUG_N                   : makeTile(0x40, 'Bug (north)'),
  BUG_W                   : makeTile(0x41, 'Bug (west)'),
  BUG_S                   : makeTile(0x42, 'Bug (south)'),
  BUG_E                   : makeTile(0x43, 'Bug (east)'),
  FIREBALL_N              : makeTile(0x44, 'Fireball (north)', Dir.N),
  FIREBALL_W              : makeTile(0x45, 'Fireball (west)', Dir.W),
  FIREBALL_S              : makeTile(0x46, 'Fireball (south)', Dir.S),
  FIREBALL_E              : makeTile(0x47, 'Fireball (east)', Dir.E),
  BALL_N                  : makeTile(0x48, 'Ball (north)', Dir.N),
  BALL_W                  : makeTile(0x49, 'Ball (west)', Dir.W),
  BALL_S                  : makeTile(0x4A, 'Ball (south)', Dir.S),
  BALL_E                  : makeTile(0x4B, 'Ball (east)', Dir.E),
  TANK_N                  : makeTile(0x4C, 'Tank (north)'),
  TANK_W                  : makeTile(0x4D, 'Tank (west)'),
  TANK_S                  : makeTile(0x4E, 'Tank (south)'),
  TANK_E                  : makeTile(0x4F, 'Tank (east)'),
  GLIDER_N                : makeTile(0x50, 'Glider (north)'),
  GLIDER_W                : makeTile(0x51, 'Glider (west)'),
  GLIDER_S                : makeTile(0x52, 'Glider (south)'),
  GLIDER_E                : makeTile(0x53, 'Glider (east)'),
  TEETH_N                 : makeTile(0x54, 'Teeth (north)'),
  TEETH_W                 : makeTile(0x55, 'Teeth (west)'),
  TEETH_S                 : makeTile(0x56, 'Teeth (south)'),
  TEETH_E                 : makeTile(0x57, 'Teeth (east)'),
  WALKER_N                : makeTile(0x58, 'Walker (north)', Dir.N),
  WALKER_W                : makeTile(0x59, 'Walker (west)', Dir.W),
  WALKER_S                : makeTile(0x5A, 'Walker (south)', Dir.S),
  WALKER_E                : makeTile(0x5B, 'Walker (east)', Dir.E),
  BLOB_N                  : makeTile(0x5C, 'Blob (north)', Dir.N),
  BLOB_W                  : makeTile(0x5D, 'Blob (west)', Dir.W),
  BLOB_S                  : makeTile(0x5E, 'Blob (south)', Dir.S),
  BLOB_E                  : makeTile(0x5F, 'Blob (east)', Dir.E),
  PARAMECIUM_N            : makeTile(0x60, 'Paramecium (north)', Dir.N),
  PARAMECIUM_W            : makeTile(0x61, 'Paramecium (west)', Dir.W),
  PARAMECIUM_S            : makeTile(0x62, 'Paramecium (south)', Dir.S),
  PARAMECIUM_E            : makeTile(0x63, 'Paramecium (east)', Dir.E),
  BLUE_KEY                : makeTile(0x64, 'Blue Key'),
  RED_KEY                 : makeTile(0x65, 'Red Key'),
  GREEN_KEY               : makeTile(0x66, 'Green Key'),
  YELLOW_KEY              : makeTile(0x67, 'Yellow Key'),
  FLIPPERS                : makeTile(0x68, 'Flippers'),
  FIRE_BOOTS              : makeTile(0x69, 'Fire Boots'),
  ICE_SKATES              : makeTile(0x6A, 'Ice Skates'),
  SUCTION_BOOTS           : makeTile(0x6B, 'Suction Boots'),
  CHIP_N                  : makeTile(0x6C, 'Chip (north)'),
  CHIP_W                  : makeTile(0x6D, 'Chip (west)'),
  CHIP_S                  : makeTile(0x6E, 'Chip (south)'),
  CHIP_E                  : makeTile(0x6F, 'Chip (east)'),
  NONE                    : makeTile(0x99),
});

const tileByCode = new Map(Object.values(CC).map(t => [t.code, t]));
export function getTile(code) {
  return tileByCode.get(code);
}

export function isTransparent(code) {
  return code >= CC.BUG_N.code && code <= CC.CHIP_E.code;
}

export function isChip(code) {
  return code >= CC.CHIP_N.code && code <= CC.CHIP_E.code;
}

export function isChipSwimming(code) {
  return code >= CC.CHIP_SWIMMING_N.code && code <= CC.CHIP_SWIMMING_E.code;
}

export function isBlock(code) {
  return code === CC.BLOCK.code;
}

export function isMonster(code) {
  return code >= CC.BUG_N.code && code <= CC.PARAMECIUM_E.code;
}

export function isKey(code) {
  return code >= CC.BLUE_KEY.code && code <= CC.YELLOW_KEY.code;
}

export function isFootwear(code) {
  return code >= CC.FLIPPERS.code && code <= CC.SUCTION_BOOTS.code;
}

export function isCloneBlock(code) {
  return code >= CC.CLONE_BLOCK_N.code && code <= CC.CLONE_BLOCK_E.code;
}

export function isCloneMachine(code) {
  return code === CC.CLONE_MACHINE.code;
}

export function isLinkable(code) {
  return code === CC.BROWN_BUTTON.code
      || code === CC.RED_BUTTON.code
      || code === CC.TRAP.code
      || code === CC.CLONE_MACHINE.code;
}

export function isDirectionalForce(code) {
  return code === CC.FORCE_N.code
      || code === CC.FORCE_E.code
      || code === CC.FORCE_S.code
      || code === CC.FORCE_W.code;
}

export function isForce(code) {
  return code === CC.FORCE_RANDOM.code || isDirectionalForce(code);
}

export function isIce(code) {
  return code === CC.ICE.code || isIceCorner(code);
}

function isIceCorner(code) {
  return code === CC.ICE_SE.code
      || code === CC.ICE_SW.code
      || code === CC.ICE_NE.code
      || code === CC.ICE_NW.code;
}

function isSingleThinWall(code) {
  return code >= CC.THIN_WALL_N.code && code <= CC.THIN_WALL_E.code;
}

export function isUnused(code) {
  return code === CC.UNUSED1.code || code === CC.UNUSED2.code
      || code === CC.UNUSED3.code || code === CC.UNUSED4.code;
}

/**
 * chip can go over everything except chip or monster
 * monster can go over everything except chip or monster
 * block can go over everything except chip, monster, block, or cloneblock
 * cloneblock can only go over clone machine (not even floor)
 * everything else (including keys and footwear) can only go over floor
 */
export function isIllegal(topCode, bottomCode) {
  if (isChip(topCode) || isMonster(topCode)) {
    return isChip(bottomCode) || isMonster(bottomCode);
  } else if (topCode === CC.BLOCK.code) {
    return isChip(bottomCode) || isMonster(bottomCode)
        || (bottomCode === CC.BLOCK.code)
        || isCloneBlock(bottomCode)
  } else if (isCloneBlock(topCode)) {
    return (!isCloneMachine(bottomCode));
  } else {
    return (bottomCode !== CC.FLOOR.code);
  }
}

function isDirectional(code) {
  return isSingleThinWall(code)
      || isDirectionalForce(code)
      || isCloneBlock(code)
      || isChipSwimming(code)
      || isMonster(code)
      || isChip(code);
}

function dirFromCode(code) {
  if (isSingleThinWall(code)) return _dirFromCode(code, CC.THIN_WALL_N.code);
  if (isDirectionalForce(code)) return _dirFromForce(code);
  if (isCloneBlock(code)) return _dirFromCode(code, CC.CLONE_BLOCK_N.code);
  if (isChipSwimming(code) || isMonster(code) || isChip(code)) return _dirFromCode(code);
  return Dir.NONE;
}

function _dirFromCode(code, base=null) {
  const baseCode = base || Math.floor(code / 4) * 4;
  switch (code - baseCode) {
    case 0: return Dir.N;
    case 1: return Dir.W;
    case 2: return Dir.S;
    default: return Dir.E;
  }
}

function _dirFromForce(code) {
  switch (code) {
    case CC.FORCE_N.code: return Dir.N;
    case CC.FORCE_W.code: return Dir.W;
    case CC.FORCE_S.code: return Dir.S;
    case CC.FORCE_E.code: return Dir.E;
    default: return Dir.NONE;
  }
}

 function codeForDir(code, dir) {
  if (isSingleThinWall(code)) return _codeForDir(code, dir, CC.THIN_WALL_N.code);
  if (isDirectionalForce(code)) return _forceForDir(dir);
  if (isCloneBlock(code)) return _codeForDir(code, dir, CC.CLONE_BLOCK_N.code);
  if (isChipSwimming(code) || isMonster(code) || isChip(code)) return _codeForDir(code, dir);
  return code;
 }

 function _codeForDir(code, dir, base=null) {
  // baseCode is for heading N
  const baseCode = base || Math.floor(code / 4) * 4;
  switch (dir) {
    case Dir.N: return baseCode;
    case Dir.W: return baseCode + 1;
    case Dir.S: return baseCode + 2;
    case Dir.E: return baseCode + 3;
    default: return code;
  }
}

function _forceForDir(dir) {
  switch (dir) {
    case Dir.N: return CC.FORCE_N.code;
    case Dir.W: return CC.FORCE_W.code;
    case Dir.S: return CC.FORCE_S.code;
    case Dir.E: return CC.FORCE_E.code;
    default: return CC.FORCE_N.code;
  }
}

export function monsterTypeFromCode(code) {
  switch (Math.floor((code - 0x40) / 4)) {
    case 0: return "bug";
    case 1: return "fireball";
    case 2: return "ball";
    case 3: return "tank";
    case 4: return "glider";
    case 5: return "teeth";
    case 6: return "walker";
    case 7: return "blob";
    case 8: return "paramecium";
    default: return null;
  }
}

export function flipTileHorizontally(code) {
  if (isDirectional(code)) {
    const dir = dirFromCode(code);
    if (dir === Dir.W || dir === Dir.E) {
      return codeForDir(code, back(dir));
    }
  } else if (isIceCorner(code)) {
    switch (code) {
      case CC.ICE_SW.code: return CC.ICE_SE.code;
      case CC.ICE_SE.code: return CC.ICE_SW.code;
      case CC.ICE_NW.code: return CC.ICE_NE.code;
      case CC.ICE_NE.code: return CC.ICE_NW.code;
      default:
    }
  }
  return code;
}

export function flipTileVertically(code) {
  if (isDirectional(code)) {
    const dir = dirFromCode(code);
    if (dir === Dir.N || dir === Dir.S) {
      return codeForDir(code, back(dir));
    }
  } else if (isIceCorner(code)) {
    switch (code) {
      case CC.ICE_SW.code: return CC.ICE_NW.code;
      case CC.ICE_NW.code: return CC.ICE_SW.code;
      case CC.ICE_SE.code: return CC.ICE_NE.code;
      case CC.ICE_NE.code: return CC.ICE_SE.code;
      default:
    }
  }
  return code;
}

export function rotateTileLeft(code) {
  if (isDirectional(code)) {
    const dir = dirFromCode(code);
    return codeForDir(code, left(dir));
  } else if (isIceCorner(code)) {
    switch (code) {
      case CC.ICE_SW.code: return CC.ICE_SE.code;
      case CC.ICE_SE.code: return CC.ICE_NE.code;
      case CC.ICE_NE.code: return CC.ICE_NW.code;
      case CC.ICE_NW.code: return CC.ICE_SW.code;
      default:
    }
  }
  return code;
}

export function rotateTileRight(code) {
  if (isDirectional(code)) {
    const dir = dirFromCode(code);
    return codeForDir(code, right(dir));
  } else if (isIceCorner(code)) {
    switch (code) {
      case CC.ICE_SW.code: return CC.ICE_NW.code;
      case CC.ICE_NW.code: return CC.ICE_NE.code;
      case CC.ICE_NE.code: return CC.ICE_SE.code;
      case CC.ICE_SE.code: return CC.ICE_SW.code;
      default:
    }
  }
  return code;
}

export function setOfCodes(tiles) {
  return new Set(tiles.map(t => t.code));
}
