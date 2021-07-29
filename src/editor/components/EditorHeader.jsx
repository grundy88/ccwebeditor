import React from 'react';
import './EditorHeader.css'
import { observer } from 'mobx-react-lite';
import HotkeyTooltip from './HotkeyTooltip';
import ReactTooltip from 'react-tooltip';
import { Menu, SubMenu, MenuItem, MenuDivider } from '@szhsin/react-menu';
import '@szhsin/react-menu/dist/index.css';
import styled from 'styled-components';
import { useEditorState, EditorMode } from '../EditorState';
import { ctrlKey } from '../../engine/util/utils';
import zoomfit from '../../assets/zoom-fit.png'
import editicon from '../../assets/edit-icon.png'
import fillicon from '../../assets/fill-icon.png'
import recticon from '../../assets/rect-outline-icon.png'
import rectfillicon from '../../assets/rect-fill-icon.png'
import ellipseicon from '../../assets/ellipse-outline-icon.png'
import ellipsefillicon from '../../assets/ellipse-fill-icon.png'
import greenbutton from '../../assets/green-button.png'
import replayicon from '../../assets/replay-icon.png'
import viewporticon from '../../assets/viewport-icon.png'

const Spacer = styled.div`
  width: 10px;
`;

const HeaderButton = styled.button`
  width: 24px;
  height: 24px;
  padding: 0px;
  margin: 0px 0.5px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const EditorHeader = observer(({
    save, saveAs, close, undo, redo, prevLevel, nextLevel,
    cut, copy, paste,
    zoomOut, zoomIn, zoomToFit, toggleGameplayViewport,
    activate, replay, deactivate
}) => {
  const editorState = useEditorState();

  function toggleWalls() {
    editorState.toggleWalls();
  }
  
  function showTilesetModal() {
    editorState.showTilesetModal();
  }

  function hideAllInfo() {
    editorState.showMonsterNumbers = false;
    editorState.showTrapLinks = false;
    editorState.showCloneLinks = false;
  }

  function showAllInfo() {
    editorState.showMonsterNumbers = true;
    editorState.showTrapLinks = true;
    editorState.showCloneLinks = true;
  }

  function toggleSound() {
    editorState.toggleSound()
  }

  const editorStateIcons = Object.freeze({
    [EditorMode.DRAW]: <i className="fas fa-edit"></i>,
    [EditorMode.SELECT]: <img src={editicon} height="16" alt="select"/>,
    [EditorMode.FILL]: <img src={fillicon} height="16" alt="fill"/>,
    [EditorMode.RECT]: <img src={recticon} height="16" alt="rect"/>,
    [EditorMode.RECTFILL]: <img src={rectfillicon} height="16" alt="fillrect"/>,
    [EditorMode.ELLIPSE]: <img src={ellipseicon} height="16" alt="ellipse"/>,
    [EditorMode.ELLIPSEFILL]: <img src={ellipsefillicon} height="16" alt="fillellipse"/>,
  });

  return(
    <div className="editor-header">
      <div className="editor-header-buttons">
        <Menu menuButton={<HeaderButton><i className="fas fa-bars"></i></HeaderButton>}>
          <SubMenu label="File">
            {('showOpenFilePicker' in window) &&
              <MenuItem onClick={save} className="menu-item"><span>Save</span><span>{ctrlKey}S</span></MenuItem>
            }
            <MenuItem onClick={saveAs}><span>Save As...</span></MenuItem>
            <MenuItem onClick={close}>Close</MenuItem>
          </SubMenu>
          <SubMenu label="Edit">
            <MenuItem onClick={undo} disabled={editorState.undoStack.length === 0 || editorState.activated} className="menu-item"><span>Undo</span><span>{ctrlKey}Z</span></MenuItem>
            <MenuItem onClick={redo} disabled={editorState.redoStack.length === 0 || editorState.activated} className="menu-item"><span>Redo</span><span>{ctrlKey}Y</span></MenuItem>
            <MenuDivider/>
            <MenuItem onClick={cut} disabled={!editorState.selection} className="menu-item"><span>Cut</span><span>{ctrlKey}X</span></MenuItem>
            <MenuItem onClick={copy} disabled={!editorState.selection} className="menu-item"><span>Copy</span><span>{ctrlKey}C</span></MenuItem>
            <MenuItem onClick={paste} disabled={!editorState.clipboard} className="menu-item"><span>Paste</span><span>{ctrlKey}V</span></MenuItem>
            <MenuDivider/>
            <MenuItem onClick={toggleWalls}><img style={{marginTop:'1px'}} src={greenbutton} height="14" alt="toggle" className="editor-header-menu-icon"/>Switch toggle walls</MenuItem>
          </SubMenu>
          <SubMenu label="View">
            <MenuItem onClick={zoomOut} disabled={editorState.scale <= 0.1} className="menu-item">
              <span><i className="fas fa-search-minus editor-header-menu-icon"></i> Zoom Out</span>
              <span>-</span>
            </MenuItem>
            <MenuItem onClick={zoomIn} className="menu-item">
              <span><i className="fas fa-search-plus editor-header-menu-icon"></i> Zoom In</span>
              <span>+</span>
            </MenuItem>
            <MenuItem onClick={zoomToFit} className="menu-item">
              <span><img src={zoomfit} height="19" alt="fit" className="editor-header-menu-icon"/>Zoom To Fit</span>
              <span>F</span>
            </MenuItem>
            <MenuDivider/>
              <MenuItem onClick={prevLevel} disabled={editorState.levelNum === 1} className="menu-item"><span>Previous Level</span><span>{ctrlKey}←</span></MenuItem>
              <MenuItem onClick={nextLevel} disabled={editorState.levelNum === editorState.levelset.length} className="menu-item"><span>Next Level</span><span>{ctrlKey}→</span></MenuItem>
            <MenuDivider/>
            <MenuItem onClick={showTilesetModal}><i className="far fa-file-image editor-header-menu-icon"></i> Choose Tileset...</MenuItem>
            {(editorState.showMonsterNumbers || editorState.showTrapLinks || editorState.showCloneLinks) && 
              <MenuItem onClick={hideAllInfo}>
                <i className="fas fa-info-circle editor-header-menu-icon"></i> Hide monster numbers and trap/clone links
              </MenuItem>
            }
            {!editorState.showMonsterNumbers && !editorState.showTrapLinks && !editorState.showCloneLinks && 
              <MenuItem onClick={showAllInfo}>Show monster numbers and trap/clone links</MenuItem>
            }
            <MenuItem onClick={toggleGameplayViewport} className="menu-item">
              <span><img src={viewporticon} height="14" alt="viewport"/> Toggle gameplay view indicator</span><span>G</span>
            </MenuItem>
          </SubMenu>
        </Menu>
        <Spacer/>

        <HeaderButton data-tip data-for="tooltipClose" onClick={close}><i className="fas fa-times"></i></HeaderButton>
          <ReactTooltip id="tooltipClose" place="bottom" effect="solid" delayShow={500}>close this levelset</ReactTooltip>
        <Spacer/>

        <HeaderButton data-tip data-for="tooltipUndo" onClick={undo} disabled={editorState.undoStack.length === 0 || editorState.activated}>
          <i className="fas fa-undo"></i>
        </HeaderButton>
        {editorState.undoStack.length > 0 && !editorState.activated &&
          <HotkeyTooltip id="tooltipUndo" place="bottom" hotkey={`${ctrlKey}Z`}>undo</HotkeyTooltip>
        }
        <HeaderButton data-tip data-for="tooltipRedo" onClick={redo} disabled={editorState.redoStack.length === 0 || editorState.activated}>
          <i className="fas fa-redo"></i>
        </HeaderButton>
        {editorState.redoStack.length > 0 && !editorState.activated &&
          <HotkeyTooltip id="tooltipRedo" place="bottom" hotkey={`${ctrlKey}Y`}>redo</HotkeyTooltip>
        }
        <Spacer/>

        <HeaderButton data-tip data-for="tooltipPrev" onClick={prevLevel} disabled={editorState.levelNum === 1}><i className="fas fa-angle-double-left"></i></HeaderButton>
        {editorState.levelNum > 1 &&
          <HotkeyTooltip id="tooltipPrev" place="bottom" hotkey={`${ctrlKey}←`}>previous level</HotkeyTooltip>
        }
        <HeaderButton data-tip data-for="tooltipNext" onClick={nextLevel} disabled={editorState.levelNum === editorState.levelset.length}><i className="fas fa-angle-double-right"></i></HeaderButton>
        {editorState.levelNum < editorState.levelset.length &&
          <HotkeyTooltip id="tooltipNext" place="bottom" hotkey={`${ctrlKey}→`}>next level</HotkeyTooltip>
        }
        <Spacer/>

        <HeaderButton data-tip data-for="tooltipZoomOut" onClick={zoomOut} disabled={editorState.scale <= 0.1}><i className="fas fa-search-minus"></i></HeaderButton>
        {editorState.scale > 0.1 &&
          <HotkeyTooltip id="tooltipZoomOut" place="bottom" hotkey="-">zoom out</HotkeyTooltip>
        }
        <HeaderButton data-tip data-for="tooltipZoomIn" onClick={zoomIn}><i className="fas fa-search-plus"></i></HeaderButton>
          <HotkeyTooltip id="tooltipZoomIn" place="bottom" hotkey="+">zoom in</HotkeyTooltip>
        <HeaderButton data-tip data-for="tooltipZoomToFit" onClick={zoomToFit}><img src={zoomfit} height="16" alt="fit"/></HeaderButton>
          <HotkeyTooltip id="tooltipZoomToFit" place="bottom" hotkey="f">zoom to fit</HotkeyTooltip>
        <Spacer/>

        <HeaderButton data-tip data-for="tooltipToggleWalls" onClick={toggleWalls}>
          <img style={{marginTop:'1px'}} src={greenbutton} height="14" alt="toggle"/>
        </HeaderButton>
          <ReactTooltip id="tooltipToggleWalls" place="bottom" effect="solid" delayShow={500}>switch all toggle walls</ReactTooltip>
        <Spacer/>

        <HeaderButton data-tip data-for="tooltipViewport" onClick={toggleGameplayViewport}>
          <img style={{background:editorState.showGameplayViewport?"#df88ff":"white"}} src={viewporticon} height="14" alt="viewport"/>
        </HeaderButton>
          <HotkeyTooltip id="tooltipViewport" place="bottom" hotkey="g">toggle gameplay viewport indicator</HotkeyTooltip>
        <Spacer/>

        <Menu menuButton={<HeaderButton data-tip data-for="tooltipTools" disabled={editorState.activated}>{editorStateIcons[editorState.editorMode]}</HeaderButton>}>
          <MenuItem disabled={true}>Editor Tools</MenuItem>
          <MenuDivider/>
          <MenuItem onClick={() => editorState.setEditorMode(EditorMode.DRAW)} className="menu-item">
            <span><i className="fas fa-edit"></i> Draw</span><span>{ctrlKey}D</span>
          </MenuItem>
          <MenuItem onClick={() => editorState.setEditorMode(EditorMode.SELECT)} className="menu-item">
            <span><img src={editicon} height="16" alt="select"/> Select</span><span>{ctrlKey}E</span>
          </MenuItem>
          <MenuItem onClick={() => editorState.setEditorMode(EditorMode.FILL)} className="menu-item">
            <span><i className="fas fa-fill"></i> Fill</span>
          </MenuItem>
          <MenuItem onClick={() => editorState.setEditorMode(EditorMode.RECT)} className="menu-item">
            <span><img src={recticon} height="16" alt="rect"/> Rectangle (outline)</span>
          </MenuItem>
          <MenuItem onClick={() => editorState.setEditorMode(EditorMode.RECTFILL)} className="menu-item">
            <span><img src={rectfillicon} height="16" alt="rectfill"/> Rectangle (filled)</span>
          </MenuItem>
          <MenuItem onClick={() => editorState.setEditorMode(EditorMode.ELLIPSE)} className="menu-item">
            <span><img src={ellipseicon} height="16" alt="ellipse"/> Ellipse (outline)</span>
          </MenuItem>
          <MenuItem onClick={() => editorState.setEditorMode(EditorMode.ELLIPSEFILL)} className="menu-item">
            <span><img src={ellipsefillicon} height="16" alt="ellipsefill"/> Ellipse (filled)</span>
          </MenuItem>
        </Menu>
          <ReactTooltip id="tooltipTools" place="bottom" effect="solid" delayShow={500}>editor tools</ReactTooltip>
        <Spacer/>
        
        <HeaderButton data-tip data-for="tooltipSound" onClick={toggleSound}>
          <i className={"fas " + (editorState.soundEnabled ? "fa-volume-up" : "fa-volume-mute")}></i>
        </HeaderButton>
          <ReactTooltip id="tooltipSound" place="bottom" effect="solid" delayShow={500}>turn sound {editorState.soundEnabled ? 'off' : 'on'}</ReactTooltip>
        {!editorState.activated && 
          <div>
          <HeaderButton data-tip data-for="tooltipActivate" onClick={activate}><i className="fas fa-play"></i></HeaderButton>
            <HotkeyTooltip id="tooltipActivate" place="bottom" hotkey="a">play this level</HotkeyTooltip>
          </div>
        }
        {!editorState.activated && editorState.replayAvailable() && 
          <div style={{marginLeft:'10px'}}>
            <HeaderButton data-tip data-for="tooltipReplay" onClick={replay}><img src={replayicon} height="18" alt="fit"/></HeaderButton>
              <HotkeyTooltip id="tooltipReplay" place="bottom" hotkey="r">watch a solution for this level</HotkeyTooltip>
          </div>
        }
        {editorState.activated && 
          <div>
          <HeaderButton data-tip data-for="tooltipDeactivate" onClick={deactivate}><i className="far fa-stop-circle"></i></HeaderButton>
            <HotkeyTooltip id="tooltipDeactivate" place="bottom" hotkey="escape">stop playing this level</HotkeyTooltip>
          </div>
        }
      </div>
      <div className="editor-header-text">
        {editorState.level.title}
      </div>
      <div className="editor-header-text editor-header-levelnum">
        {editorState.levelsetFilename && 
          <span>[{editorState.levelsetFilename}]&nbsp;&nbsp;</span>
        }
        level #{editorState.level.levelNumber} of {editorState.levelset.length}
      </div>
    </div>
  );
});

export default EditorHeader;
