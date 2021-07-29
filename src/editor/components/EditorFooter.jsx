/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import './EditorFooter.css'
import './StyledRange.css'
import { observer } from 'mobx-react-lite';
import { useEditorState, PlayMode } from '../EditorState';
import TileImage from './TileImage';
import { isIllegal, CC } from '../../engine/tiles/tile'
import HotkeyTooltip from './HotkeyTooltip';
import ReactTooltip from 'react-tooltip';
import spinner from '../../assets/spinner.gif'
import styled from 'styled-components';
import { FRAMES_PER_STEP, gameOverMessage, ctrlKey } from '../../engine/util/utils';
import actionIcon from '../../assets/action.png'

function timestring(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 5) return 'a few seconds';
  if (seconds < 60) return 'less than a minute';
  // if (seconds < 60) return `${seconds} second${seconds===1?'':'s'}`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes===1?'':'s'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours===1?'':'s'}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days===1?'':'s'}`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks===1?'':'s'}`;
  return 'more than a month ago';
}

const FooterButton = styled.button`
  position: relative;
  ${props => props.active && `
    box-shadow: 0 0px 5px 2px rgba(245, 173, 66, .6);
    background: #fcdeb1;
  `}
  border: 1px solid black;
  border-radius: 3px;
  width: 24px;
  height: 24px;
  padding: 3px;
  margin: 1px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Spacer = styled.div`
  width: 6px;
`;

const SpeedButton = styled.button`
  width: 11px;
  height: 11px;
  font-size: 7px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border: 1px solid black;
  border-radius: 3.5px;
`;

const SpeedSetting = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-content: top;
  height: 24px;
  width: 100px;
  padding-left: 5px;
  margin-left: 5px;
  margin-right: 5px;
`;

const SpeedButtons = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
`;

const SpeedValue = styled.div`
  width: 25px;
  text-align: center;
  font-size: 10px;
  margin: 0px 5px 2px 5px;
`;

const SeekSpinner = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  height: 24px;
  width: 100px;
  padding-left: 5px;
  margin-left: 5px;
  margin-right: 5px;
`;

const EditorFooter = observer(({
  topTile, bottomTile, play, pause, stepTick, stepTurn, invert, backTick, backTurn, 
  seek, undoToLastMove, incSpeed, decSpeed, liveMode, turnMode, tickMode}
) => {
  const editorState = useEditorState();

  const [seeking, setSeeking] = useState(false);
  const [seekPos, setSeekPos] = useState(0);

  useEffect(() => {
    if (!seeking) setSeekPos(editorState.replayPos);
  }, [editorState.replayPos]);

  function onSeek(e) {
    // not seeking during drag (too expensive), only once thumb drag is complete (mouseup)
    setSeekPos(e.target.value);
  }

  function startSeek() {
    setSeeking(true);
  }

  function doSeek() {
    seek(seekPos);
    setSeeking(false);
  }

  return (
    <div className={"editor-footer" + (editorState.activated ? " activated" : "")}>
      <div className="editor-footer-tiles">
        {editorState.highlightedX >= 0 && editorState.highlightedY >= 0 && topTile && bottomTile &&
          <div className="editor-footer-gameboard-tiles">
            <div className="editor-footer-gameboard-tiles-text">
              [{editorState.highlightedX}, {editorState.highlightedY}]
            </div>
            
            {bottomTile.code !== CC.FLOOR.code &&
            <div className="editor-footer-gameboard-tiles-layer">top:</div>
            }
            <TileImage tile={topTile} size={20}/>
            <div className="editor-footer-gameboard-tiles-text">{topTile.name}</div>
            
            {bottomTile.code !== CC.FLOOR.code &&
            <div className="editor-footer-gameboard-bottom-tile">
            <div className="editor-footer-gameboard-tiles-layer">bottom:</div>
            <TileImage tile={bottomTile} size={20}/>
            <div className="editor-footer-gameboard-tiles-text">{bottomTile.name}</div>
            </div>
            }
            
            <div>
              {topTile && bottomTile && isIllegal(topTile.code, bottomTile.code) &&
                <div>
                  <span style={{color:'red', padding:'0px 5px 0px 5px'}}><i className="fas fa-exclamation-triangle"></i></span>
                  Illegal tile combination!
                </div>
              }
              </div>
          </div>
        }
      </div>

      {editorState.activated && 
        <div className="editor-footer-activated centered-row">
          <div className="editor-footer-controls">
            <FooterButton data-tip data-for="tooltipLiveMode" active={editorState.playMode === PlayMode.LIVE} onClick={liveMode}>
              <img style={{marginTop:'1px'}} src={actionIcon} height="14" alt="toggle"/>
            </FooterButton>
              <HotkeyTooltip id="tooltipLiveMode" place="top" hotkey="1">game progresses in real time</HotkeyTooltip>
            <FooterButton data-tip data-for="tooltipTurnMode" active={editorState.playMode === PlayMode.TURN} onClick={turnMode}>
              <i className="fas fa-walking"></i>
            </FooterButton>
              <HotkeyTooltip id="tooltipTurnMode" place="top" hotkey="2">game progresses one turn when Chip moves</HotkeyTooltip>
            <FooterButton data-tip data-for="tooltipTickMode" active={editorState.playMode === PlayMode.TICK} onClick={tickMode}>
              <i className="fas fa-shoe-prints"></i>
            </FooterButton>
              <HotkeyTooltip id="tooltipTickMode" place="top" hotkey="3">game progresses one tick at a time</HotkeyTooltip>
            <Spacer/>

            <FooterButton data-tip data-for="tooltipUndo" onClick={undoToLastMove} disabled={editorState.gamelogic.state.currenttime === 0}>
              <i className="fas fa-undo"></i>
            </FooterButton>
              <HotkeyTooltip id="tooltipUndo" place="bottom" hotkey={`${ctrlKey}Z`}>go back to Chip's last move</HotkeyTooltip>
            <FooterButton data-tip data-for="tooltipBackwardTurn" onClick={backTurn} disabled={editorState.gamelogic.state.currenttime === 0}><i className="fas fa-fast-backward"></i></FooterButton>
              <HotkeyTooltip id="tooltipBackwardTurn" place="top" hotkey="z">step back one turn ({FRAMES_PER_STEP} ticks)</HotkeyTooltip>
            <FooterButton data-tip data-for="tooltipBackwardTick" onClick={backTick} disabled={editorState.gamelogic.state.currenttime === 0}><i className="fas fa-step-backward"></i></FooterButton>
              <HotkeyTooltip id="tooltipBackwardTick" place="top" hotkey="x">step back one tick</HotkeyTooltip>
            {(!editorState.running || editorState.playbackForward) && 
              <div>
                <FooterButton data-tip data-for="tooltipBackward" onClick={invert} disabled={editorState.gamelogic.state.currenttime === 0}><i className="fas fa-backward"></i></FooterButton>
                  <HotkeyTooltip id="tooltipBackward" place="top" hotkey="c">replay backward</HotkeyTooltip>
              </div>
            }
            {editorState.running && !editorState.playbackForward &&
              <div>
              <FooterButton data-tip data-for="tooltipPause2" onClick={pause}><i className="fas fa-pause"></i></FooterButton>
                <HotkeyTooltip id="tooltipPause2" place="top" hotkey="space">pause</HotkeyTooltip>
              </div>
            }
            <Spacer/>
            {(!editorState.running || !editorState.playbackForward) && 
              <div>
              <FooterButton data-tip data-for="tooltipPlay" onClick={play} disabled={editorState.gamelogic.state.gameOver}><i className="fas fa-play"></i></FooterButton>
                {!editorState.running &&
                  <HotkeyTooltip id="tooltipPlay" place="top" hotkey="space or move">go!</HotkeyTooltip>
                }
              </div>
            }
            {editorState.running && editorState.playbackForward &&
              <div>
              <FooterButton data-tip data-for="tooltipPause" onClick={pause}><i className="fas fa-pause"></i></FooterButton>
                <HotkeyTooltip id="tooltipPause" place="top" hotkey="space">pause</HotkeyTooltip>
              </div>
            }
            <FooterButton data-tip data-for="tooltipTick" onClick={stepTick} disabled={editorState.gamelogic.state.gameOver}><i className="fas fa-step-forward"></i></FooterButton>
              <HotkeyTooltip id="tooltipTick" place="top" hotkey="v">step one tick</HotkeyTooltip>
            <FooterButton data-tip data-for="tooltipTurn" onClick={stepTurn} disabled={editorState.gamelogic.state.gameOver}><i className="fas fa-fast-forward"></i></FooterButton>
              <HotkeyTooltip id="tooltipTurn" place="top" hotkey="b">step one turn ({FRAMES_PER_STEP} ticks)</HotkeyTooltip>

            {!editorState.seeking &&
              <SpeedSetting>
                <SpeedButtons>
                  <SpeedButton data-tip data-for="decSpeed" onClick={decSpeed} disabled={editorState.speed <= 0.25}><i className="fas fa-minus"></i></SpeedButton>
                  <SpeedValue>{editorState.speed}x</SpeedValue>
                  <SpeedButton data-tip data-for="incSpeed" onClick={incSpeed} disabled={editorState.speed >= 5}><i className="fas fa-plus"></i></SpeedButton>
                  <HotkeyTooltip id="decSpeed" place="top" hotkey="[">slow down game speed</HotkeyTooltip>
                  <HotkeyTooltip id="incSpeed" place="top" hotkey="]">speed up game speed</HotkeyTooltip>
                </SpeedButtons>

                {editorState.replaying && 
                  <input className="editor-footer-seek" type="range" min="0" max="100" value={seekPos} onInput={onSeek} onMouseDown={startSeek} onMouseUp={doSeek}></input>
                }
                {editorState.replaying && editorState.seeking &&
                  <img className="editor-footer-seek" src={spinner} alt="..." height="14"/>
                }
              </SpeedSetting>
            }
            {editorState.seeking &&
              <SeekSpinner>
                <img src={spinner} alt="..." height="14"/>
              </SeekSpinner>
            }
          </div>

          {!editorState.gamelogic.state.gameOver &&
            <div className="editor-footer-gameinfo">
              <div className="editor-footer-keys">
                <TileImage tile={editorState.observableChip.numBlueKeys ? CC.BLUE_KEY : CC.FLOOR} size={20} onTile={CC.FLOOR} num={editorState.observableChip.numBlueKeys}/>
                <TileImage tile={editorState.observableChip.numRedKeys ? CC.RED_KEY : CC.FLOOR} size={20} onTile={CC.FLOOR} num={editorState.observableChip.numRedKeys}/>
                <TileImage tile={editorState.observableChip.numYellowKeys ? CC.YELLOW_KEY : CC.FLOOR} size={20} onTile={CC.FLOOR} num={editorState.observableChip.numYellowKeys}/>
                <TileImage tile={editorState.observableChip.hasGreenKey ? CC.GREEN_KEY : CC.FLOOR} size={20} onTile={CC.FLOOR}/>
              </div>
              <div className="editor-footer-footwear">
                <TileImage tile={editorState.observableChip.hasFlippers ? CC.FLIPPERS : CC.FLOOR} size={20} onTile={CC.FLOOR}/>
                <TileImage tile={editorState.observableChip.hasFireboots ? CC.FIRE_BOOTS : CC.FLOOR} size={20} onTile={CC.FLOOR}/>
                <TileImage tile={editorState.observableChip.hasSkates ? CC.ICE_SKATES : CC.FLOOR} size={20} onTile={CC.FLOOR}/>
                <TileImage tile={editorState.observableChip.hasForceboots ? CC.SUCTION_BOOTS : CC.FLOOR} size={20} onTile={CC.FLOOR}/>
              </div>

              <i style={{paddingLeft: '10px', paddingRight: '5px', color:'green'}} className="fas fa-microchip"></i>
              <div style={{border: 'inset 2px', background: 'lightgray', width: '30px'}}>
                {editorState.gamelogic.state.chipsNeeded}
              </div>
              <i style={{paddingLeft: '10px', paddingRight: '5px', color:'green'}} className="fas fa-stopwatch"></i>
              <div style={{border: 'inset 2px', background: 'lightgray', width: '30px'}}>
                {editorState.gamelogic.state.getTimeLeft() === -1 ? '-' : editorState.gamelogic.state.getTimeLeft()}
              </div>
            </div>
          }
          {(editorState.gamelogic.state.gameOver > 0) &&
            <div className="editor-footer-gameinfo">
              {gameOverMessage(editorState.gamelogic.state.gameOver)}
            </div>
          }
      </div>
      }


      <div className="editor-footer-status">
        {editorState.exportedAt > 0 &&
          <div style={{display:'inline'}}>
            <span className="editor-footer-save-type">last saved</span>
            {timestring(Date.now() - editorState.exportedAt)} ago
          </div>
        }
        {editorState.hasUnexportedChanges() && editorState.modifiedAt > 0 &&
          <div data-tip data-for="tooltipNeedsExport" style={{display:'inline', color:'red', paddingLeft:'5px'}}>
            <i className="fas fa-save"></i>
          </div>
        }
        {editorState.modifiedAt > editorState.locallyStoredAt &&
          <div style={{display:'inline'}}>
            <span className="editor-footer-save-type">last edited</span>
            <img src={spinner} alt="..." height="14"/>
          </div>
        }
        {editorState.locallyStoredAt > 0 && editorState.modifiedAt <= editorState.locallyStoredAt &&
          <div style={{display:'inline'}}>
            <span className="editor-footer-save-type">last edited</span>
            {timestring(Date.now() - editorState.locallyStoredAt)} ago
          </div>
        }
      </div>
      {editorState.hasUnexportedChanges() && editorState.modifiedAt > 0 &&
        <ReactTooltip id="tooltipNeedsExport" place="top" effect="solid" delayShow={500}>
          This levelset has changes that<br/>
          have not been saved to a file
        </ReactTooltip>
      }
    </div>
  );
});

export default EditorFooter;
