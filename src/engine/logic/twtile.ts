/* 
 * Adapted for Typescript from Tile World source code.
 *
 * Copyright (C) 2001-2021 by Brian Raiter,
 * under the GNU General Public License. No warranty. See COPYING for details.
 */

import { CC } from "../tiles/tile";
import { Dir, dirtoindex, indextodir } from './dir'

/*
 * A Tile World tile, as used by the game logic.
 * The numbers here are what are stored in the GameState object.
 * Bummer: regarding monster/chip codes, sometimes the creature.id
 * is simply one of these values (and the dir must be looked up separately),
 * sometimes the creature.id actually has the dir encoded in it (like
 * the CC tiles) and must be decoded with creatureid/creaturedirid.
 */
export const TW = Object.freeze({
  Empty:                0x01,

  Slide_North:          0x02,
  Slide_West:           0x03,
  Slide_South:          0x04,
  Slide_East:           0x05,
  Slide_Random:         0x06,
  Ice:                  0x07,
  IceWall_Northwest:    0x08,
  IceWall_Northeast:    0x09,
  IceWall_Southwest:    0x0A,
  IceWall_Southeast:    0x0B,
  Gravel:               0x0C,
  Dirt:                 0x0D,
  Water:                0x0E,
  Fire:                 0x0F,
  Bomb:                 0x10,
  Beartrap:             0x11,
  Burglar:              0x12,
  HintButton:           0x13,

  Button_Blue:          0x14,
  Button_Green:         0x15,
  Button_Red:           0x16,
  Button_Brown:         0x17,
  Teleport:             0x18,

  Wall:                 0x19,
  Wall_North:           0x1A,
  Wall_West:            0x1B,
  Wall_South:           0x1C,
  Wall_East:            0x1D,
  Wall_Southeast:       0x1E,
  HiddenWall_Perm:      0x1F,
  HiddenWall_Temp:      0x20,
  BlueWall_Real:        0x21,
  BlueWall_Fake:        0x22,
  SwitchWall_Open:      0x23,
  SwitchWall_Closed:    0x24,
  PopupWall:            0x25,

  CloneMachine:         0x26,

  Door_Red:             0x27,
  Door_Blue:            0x28,
  Door_Yellow:          0x29,
  Door_Green:           0x2A,
  Socket:               0x2B,
  Exit:                 0x2C,

  ICChip:               0x2D,
  Key_Red:              0x2E,
  Key_Blue:             0x2F,
  Key_Yellow:           0x30,
  Key_Green:            0x31,
  Boots_Ice:            0x32,
  Boots_Slide:          0x33,
  Boots_Fire:           0x34,
  Boots_Water:          0x35,

  Block_Static:         0x36,

  Drowned_Chip:         0x37,
  Burned_Chip:          0x38,
  Bombed_Chip:          0x39,
  Exited_Chip:          0x3A,
  Exit_Extra_1:         0x3B,
  Exit_Extra_2:         0x3C,

  Overlay_Buffer:       0x3D,

  Floor_Reserved2:      0x3E,
  Floor_Reserved1:      0x3F,

  Chip:                 0x40,

  Block:                0x44,

  Tank:                 0x48,
  Ball:                 0x4C,
  Glider:               0x50,
  Fireball:             0x54,
  Walker:               0x58,
  Blob:                 0x5C,
  Teeth:                0x60,
  Bug:                  0x64,
  Paramecium:           0x68,

  Swimming_Chip:        0x6C,
  Pushing_Chip:         0x70,

  Entity_Reserved2:     0x74,
  Entity_Reserved1:     0x78,

  Water_Splash:         0x7C,
  Bomb_Explosion:       0x7D,
  Entity_Explosion:     0x7E,
  Animation_Reserved1:  0x7F
});

export function isslide(f: number) { return ((f) >= TW.Slide_North && (f) <= TW.Slide_Random); }
export function isice(f: number) { return ((f) >= TW.Ice && (f) <= TW.IceWall_Southeast); }
export function isdoor(f: number) { return ((f) >= TW.Door_Red && (f) <= TW.Door_Green); }
export function iskey(f: number) { return ((f) >= TW.Key_Red && (f) <= TW.Key_Green); }
export function isboots(f: number) { return ((f) >= TW.Boots_Ice && (f) <= TW.Boots_Water); }
export function ismsspecial(f: number) { return ((f) >= TW.Drowned_Chip && (f) <= TW.Overlay_Buffer); }
export function isfloor(f: number) { return ((f) <= TW.Floor_Reserved1); }
export function iscreature(f: number) { return ((f) >= TW.Chip && (f) < TW.Water_Splash); }
export function ismonster(f: number) { return ((f) >= TW.Tank && (f) <= TW.Paramecium); }
export function isanimation(f: number) { return ((f) >= TW.Water_Splash && (f) <= TW.Animation_Reserved1); }

/* Macro for getting the tile ID of a creature with a specific direction.
 */
export function crtile(id: number, dir: number) { return ((id) | dirtoindex(dir)); }

/* Macros for decomposing a creature tile into ID and direction.
 */
export function creatureid(id: number) { return ((id) & ~3); }
export function creaturedirid(id: number) { return (indextodir((id) & 3)); }

// From Tile World logical tile to CC persisted tile
export const TWtoCC = Object.freeze({
  [TW.Empty]:                CC.FLOOR,

  [TW.Slide_North]:          CC.FORCE_N,
  [TW.Slide_West]:           CC.FORCE_W,
  [TW.Slide_South]:          CC.FORCE_S,
  [TW.Slide_East]:           CC.FORCE_E,
  [TW.Slide_Random]:         CC.FORCE_RANDOM,
  [TW.Ice]:                  CC.ICE,
  [TW.IceWall_Northwest]:    CC.ICE_NW,
  [TW.IceWall_Northeast]:    CC.ICE_NE,
  [TW.IceWall_Southwest]:    CC.ICE_SW,
  [TW.IceWall_Southeast]:    CC.ICE_SE,
  [TW.Gravel]:               CC.GRAVEL,
  [TW.Dirt]:                 CC.DIRT,
  [TW.Water]:                CC.WATER,
  [TW.Fire]:                 CC.FIRE,
  [TW.Bomb]:                 CC.BOMB,
  [TW.Beartrap]:             CC.TRAP,
  [TW.Burglar]:              CC.THIEF,
  [TW.HintButton]:           CC.HINT,

  [TW.Button_Blue]:          CC.BLUE_BUTTON,
  [TW.Button_Green]:         CC.GREEN_BUTTON,
  [TW.Button_Red]:           CC.RED_BUTTON,
  [TW.Button_Brown]:         CC.BROWN_BUTTON,
  [TW.Teleport]:             CC.TELEPORT,

  [TW.Wall]:                 CC.WALL,
  [TW.Wall_North]:           CC.THIN_WALL_N,
  [TW.Wall_West]:            CC.THIN_WALL_W,
  [TW.Wall_South]:           CC.THIN_WALL_S,
  [TW.Wall_East]:            CC.THIN_WALL_E,
  [TW.Wall_Southeast]:       CC.THIN_WALL_SE,
  [TW.HiddenWall_Perm]:      CC.INVISIBLE_WALL,
  [TW.HiddenWall_Temp]:      CC.APPEARING_WALL,
  [TW.BlueWall_Real]:        CC.BLUE_BLOCK_WALL,
  [TW.BlueWall_Fake]:        CC.BLUE_BLOCK_FLOOR,
  [TW.SwitchWall_Open]:      CC.TOGGLE_WALL_OPEN,
  [TW.SwitchWall_Closed]:    CC.TOGGLE_WALL_CLOSED,
  [TW.PopupWall]:            CC.POPUP_WALL,

  [TW.CloneMachine]:         CC.CLONE_MACHINE,

  [TW.Door_Red]:             CC.RED_DOOR,
  [TW.Door_Blue]:            CC.BLUE_DOOR,
  [TW.Door_Yellow]:          CC.YELLOW_DOOR,
  [TW.Door_Green]:           CC.GREEN_DOOR,
  [TW.Socket]:               CC.SOCKET,
  [TW.Exit]:                 CC.EXIT,

  [TW.ICChip]:               CC.COMPUTER_CHIP,
  [TW.Key_Red]:              CC.RED_KEY,
  [TW.Key_Blue]:             CC.BLUE_KEY,
  [TW.Key_Yellow]:           CC.YELLOW_KEY,
  [TW.Key_Green]:            CC.GREEN_KEY,
  [TW.Boots_Ice]:            CC.ICE_SKATES,
  [TW.Boots_Slide]:          CC.SUCTION_BOOTS,
  [TW.Boots_Fire]:           CC.FIRE_BOOTS,
  [TW.Boots_Water]:          CC.FLIPPERS,

  [TW.Block_Static]:         CC.BLOCK,

  [TW.Drowned_Chip]:         CC.DROWNING_CHIP,
  [TW.Burned_Chip]:          CC.BURNED_CHIP,
  [TW.Bombed_Chip]:          CC.BURNED_CHIP2,
  [TW.Exited_Chip]:          CC.CHIP_IN_EXIT,
  [TW.Exit_Extra_1]:         CC.EXIT_END_GAME,
  [TW.Exit_Extra_2]:         CC.EXIT_END_GAME2,

  [TW.Overlay_Buffer]:       -1,

  [TW.Floor_Reserved2]:      CC.UNUSED2,
  [TW.Floor_Reserved1]:      CC.UNUSED1,

  [TW.Chip]:                 CC.CHIP_N,

  [TW.Block]:                CC.BLOCK,

  [TW.Tank]:                 CC.TANK_N,
  [TW.Ball]:                 CC.BALL_N,
  [TW.Glider]:               CC.GLIDER_N,
  [TW.Fireball]:             CC.FIREBALL_N,
  [TW.Walker]:               CC.WALKER_N,
  [TW.Blob]:                 CC.BLOB_N,
  [TW.Teeth]:                CC.TEETH_N,
  [TW.Bug]:                  CC.BUG_N,
  [TW.Paramecium]:           CC.PARAMECIUM_N,

  [TW.Swimming_Chip]:        CC.CHIP_SWIMMING_N,
  [TW.Pushing_Chip]:         CC.CHIP_N, // TODO

  [TW.Entity_Reserved2]:     0x74,
  [TW.Entity_Reserved1]:     0x78,

  [TW.Water_Splash]:         0x7C,
  [TW.Bomb_Explosion]:       0x7D,
  [TW.Entity_Explosion]:     0x7E,
  [TW.Animation_Reserved1]:  0x7F
});

// From CC persisted tile to Tile World logical tile
export const CCtoTW = Object.freeze({
  [CC.FLOOR.code]:              TW.Empty,

  [CC.FORCE_N.code]:            TW.Slide_North,
  [CC.FORCE_W.code]:            TW.Slide_West,
  [CC.FORCE_S.code]:            TW.Slide_South,
  [CC.FORCE_E.code]:            TW.Slide_East,
  [CC.FORCE_RANDOM.code]:       TW.Slide_Random,
  [CC.ICE.code]:                TW.Ice,
  [CC.ICE_NW.code]:             TW.IceWall_Northwest,
  [CC.ICE_NE.code]:             TW.IceWall_Northeast,
  [CC.ICE_SW.code]:             TW.IceWall_Southwest,
  [CC.ICE_SE.code]:             TW.IceWall_Southeast,
  [CC.GRAVEL.code]:             TW.Gravel,
  [CC.DIRT.code]:               TW.Dirt,
  [CC.WATER.code]:              TW.Water,
  [CC.FIRE.code]:               TW.Fire,
  [CC.BOMB.code]:               TW.Bomb,
  [CC.TRAP.code]:               TW.Beartrap,
  [CC.THIEF.code]:              TW.Burglar,
  [CC.HINT.code]:               TW.HintButton,

  [CC.BLUE_BUTTON.code]:        TW.Button_Blue,
  [CC.GREEN_BUTTON.code]:       TW.Button_Green,
  [CC.RED_BUTTON.code]:         TW.Button_Red,
  [CC.BROWN_BUTTON.code]:       TW.Button_Brown,
  [CC.TELEPORT.code]:           TW.Teleport,

  [CC.WALL.code]:               TW.Wall,
  [CC.THIN_WALL_N.code]:        TW.Wall_North,
  [CC.THIN_WALL_W.code]:        TW.Wall_West,
  [CC.THIN_WALL_S.code]:        TW.Wall_South,
  [CC.THIN_WALL_E.code]:        TW.Wall_East,
  [CC.THIN_WALL_SE.code]:       TW.Wall_Southeast,
  [CC.INVISIBLE_WALL.code]:     TW.HiddenWall_Perm,
  [CC.APPEARING_WALL.code]:     TW.HiddenWall_Temp,
  [CC.BLUE_BLOCK_WALL.code]:    TW.BlueWall_Real,
  [CC.BLUE_BLOCK_FLOOR.code]:   TW.BlueWall_Fake,
  [CC.TOGGLE_WALL_OPEN.code]:   TW.SwitchWall_Open,
  [CC.TOGGLE_WALL_CLOSED.code]: TW.SwitchWall_Closed,
  [CC.POPUP_WALL.code]:         TW.PopupWall,

  [CC.CLONE_MACHINE.code]:      TW.CloneMachine,
  [CC.CLONE_BLOCK_N.code]:      crtile(TW.Block, Dir.N),
  [CC.CLONE_BLOCK_E.code]:      crtile(TW.Block, Dir.E),
  [CC.CLONE_BLOCK_S.code]:      crtile(TW.Block, Dir.S),
  [CC.CLONE_BLOCK_W.code]:      crtile(TW.Block, Dir.W),

  [CC.RED_DOOR.code]:           TW.Door_Red,
  [CC.BLUE_DOOR.code]:          TW.Door_Blue,
  [CC.YELLOW_DOOR.code]:        TW.Door_Yellow,
  [CC.GREEN_DOOR.code]:         TW.Door_Green,
  [CC.SOCKET.code]:             TW.Socket,
  [CC.EXIT.code]:               TW.Exit,

  [CC.COMPUTER_CHIP.code]:      TW.ICChip,
  [CC.RED_KEY.code]:            TW.Key_Red,
  [CC.BLUE_KEY.code]:           TW.Key_Blue,
  [CC.YELLOW_KEY.code]:         TW.Key_Yellow,
  [CC.GREEN_KEY.code]:          TW.Key_Green,
  [CC.ICE_SKATES.code]:         TW.Boots_Ice,
  [CC.SUCTION_BOOTS.code]:      TW.Boots_Slide,
  [CC.FIRE_BOOTS.code]:         TW.Boots_Fire,
  [CC.FLIPPERS.code]:           TW.Boots_Water,

  [CC.DROWNING_CHIP.code]:      TW.Drowned_Chip,
  [CC.BURNED_CHIP.code]:        TW.Burned_Chip,
  [CC.BURNED_CHIP2.code]:       TW.Bombed_Chip,
  [CC.CHIP_IN_EXIT.code]:       TW.Exited_Chip,
  [CC.EXIT_END_GAME.code]:      TW.Exit_Extra_1,
  [CC.EXIT_END_GAME2.code]:     TW.Exit_Extra_2,

  [CC.UNUSED1.code]:            TW.Empty,
  [CC.UNUSED2.code]:            TW.Empty,
  [CC.UNUSED3.code]:            TW.Empty,
  [CC.UNUSED4.code]:            TW.Empty,

  [CC.CHIP_N.code]:             crtile(TW.Chip, Dir.N),
  [CC.CHIP_E.code]:             crtile(TW.Chip, Dir.E),
  [CC.CHIP_S.code]:             crtile(TW.Chip, Dir.S),
  [CC.CHIP_W.code]:             crtile(TW.Chip, Dir.W),

  [CC.BLOCK.code]:              TW.Block,

  [CC.TANK_N.code]:             crtile(TW.Tank, Dir.N),
  [CC.TANK_E.code]:             crtile(TW.Tank, Dir.E),
  [CC.TANK_S.code]:             crtile(TW.Tank, Dir.S),
  [CC.TANK_W.code]:             crtile(TW.Tank, Dir.W),
  [CC.BALL_N.code]:             crtile(TW.Ball, Dir.N),
  [CC.BALL_E.code]:             crtile(TW.Ball, Dir.E),
  [CC.BALL_S.code]:             crtile(TW.Ball, Dir.S),
  [CC.BALL_W.code]:             crtile(TW.Ball, Dir.W),
  [CC.GLIDER_N.code]:           crtile(TW.Glider, Dir.N),
  [CC.GLIDER_E.code]:           crtile(TW.Glider, Dir.E),
  [CC.GLIDER_S.code]:           crtile(TW.Glider, Dir.S),
  [CC.GLIDER_W.code]:           crtile(TW.Glider, Dir.W),
  [CC.FIREBALL_N.code]:         crtile(TW.Fireball, Dir.N),
  [CC.FIREBALL_E.code]:         crtile(TW.Fireball, Dir.E),
  [CC.FIREBALL_S.code]:         crtile(TW.Fireball, Dir.S),
  [CC.FIREBALL_W.code]:         crtile(TW.Fireball, Dir.W),
  [CC.WALKER_N.code]:           crtile(TW.Walker, Dir.N),
  [CC.WALKER_E.code]:           crtile(TW.Walker, Dir.E),
  [CC.WALKER_S.code]:           crtile(TW.Walker, Dir.S),
  [CC.WALKER_W.code]:           crtile(TW.Walker, Dir.W),
  [CC.BLOB_N.code]:             crtile(TW.Blob, Dir.N),
  [CC.BLOB_E.code]:             crtile(TW.Blob, Dir.E),
  [CC.BLOB_S.code]:             crtile(TW.Blob, Dir.S),
  [CC.BLOB_W.code]:             crtile(TW.Blob, Dir.W),
  [CC.TEETH_N.code]:            crtile(TW.Teeth, Dir.N),
  [CC.TEETH_E.code]:            crtile(TW.Teeth, Dir.E),
  [CC.TEETH_S.code]:            crtile(TW.Teeth, Dir.S),
  [CC.TEETH_W.code]:            crtile(TW.Teeth, Dir.W),
  [CC.BUG_N.code]:              crtile(TW.Bug, Dir.N),
  [CC.BUG_E.code]:              crtile(TW.Bug, Dir.E),
  [CC.BUG_S.code]:              crtile(TW.Bug, Dir.S),
  [CC.BUG_W.code]:              crtile(TW.Bug, Dir.W),
  [CC.PARAMECIUM_N.code]:       crtile(TW.Paramecium, Dir.N),
  [CC.PARAMECIUM_E.code]:       crtile(TW.Paramecium, Dir.E),
  [CC.PARAMECIUM_S.code]:       crtile(TW.Paramecium, Dir.S),
  [CC.PARAMECIUM_W.code]:       crtile(TW.Paramecium, Dir.W),
});
