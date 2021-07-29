import React, { PureComponent } from 'react';
import './TilePalette.css'
import { CC, isDirectionalForce, isChipSwimming, isIce } from '../../engine/tiles/tile';
import { observer } from 'mobx-react';
import { LayerEditState, withEditorState } from '../EditorState';
import HotkeyTooltip from './HotkeyTooltip';
import ReactTooltip from 'react-tooltip';
import TileImage from './TileImage';
import styled from 'styled-components'

const ActiveToolsButton = styled.button`
  width: 16px;
  height: 16px;
  font-size: 0.5em;
  padding: 0px;
  margin: 0px 0.5px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const DirectionalOption = ({tool, isDirectionalPainting, toggleDirectional}) => {
  const directionalClassName = isDirectionalPainting ? "on" : "";
  return (
    <div>
      {(isDirectionalForce(tool) || isIce(tool)) &&
        <div>
          <div data-tip data-for="tooltipDirectional" className={'directional-button ' + directionalClassName} onClick={toggleDirectional}>
            <i className="fas fa-arrows-alt"></i>
          </div>
          <ReactTooltip id="tooltipDirectional" effect="solid" delayShow={500}>
            Turn this on to draw floors<br/>
            in the direction that you drag.<br/>
            You can also hold down 'd'<br/>
            while you draw.
          </ReactTooltip>
        </div>
      }
    </div>
  )
}

class TilePalette extends PureComponent {
  // I tried doing this as a functional component, but calling the state
  // functions were noticeably slower than calling setState directly (?!)
  // constructor(props) {
  //   super(props);
  // }

  clicked = (tile) => {
    this.props.editorState.setTopLayerTool(tile);
  }

  rightClicked = (e, tile) => {
    this.props.editorState.setBottomLayerTool(tile);
    e.preventDefault();
  }

  toggleDirectional = () => {
    this.props.editorState.toggleDirectionalPainting();
  }

  toolBackground = (tile) => {
    return isChipSwimming(tile.code) ? CC.WATER : CC.FLOOR;
  }

  swapTools = () => {
    this.props.editorState.swapTools();
  }

  replace = () => {
    this.props.editorState.replaceTiles(this.props.editorState.topLayerTool, this.props.editorState.bottomLayerTool)
  }
  
  replaceOthers = () => {
    this.props.editorState.replaceOtherTiles(this.props.editorState.topLayerTool, this.props.editorState.bottomLayerTool)
  }
  
  render() {
    const topTool = this.props.editorState.topLayerTool;
    const bottomTool = this.props.editorState.bottomLayerTool;

    return (
      <div className="tile-palette-container">
        <div className="tile-palette">
          {Object.values(CC).map(t => {
            return <TileImage key={t.code} tile={t} onTile={this.toolBackground(t)} clicked={this.clicked} rightClicked={this.rightClicked}/>
          })}
        </div>

        {this.props.editorState.activated && 
        <div className="tile-palette-active-warning">
          <div className="tile-palette-active-warning-header">
            Currently in <span style={{color:'green'}}>{this.props.editorState.replaying ? 'replay' : 'level play'}</span> mode
            {!this.props.editorState.running && !this.props.editorState.gamelogic.state.gameOver && !this.props.editorState.gamelogic.state.currenttime &&
              <div>
              <span style={{fontSize:'0.7em'}}> (<span style={{color:'green'}}>space</span>, <span style={{color:'green'}}>arrow</span>
              , or <span style={{color:'green'}}>w/a/s/d</span> to start, <span style={{color:'green'}}>esc</span> to exit)</span>
              </div>
            }
          </div>
          <div>
            Any edits are now ephemeral: they will apply while in this session of play, 
            but will <span style={{color:'red'}}>not</span> be saved once you stop playing
          </div>
        </div>
        }

        <div className="tile-palette-current-tool-container">
          <div className="tile-palette-current-tool-container-header">
            <span>Active Tools</span>
            <ActiveToolsButton data-tip data-for="tooltipSwap" onClick={this.swapTools}><i className="fas fa-retweet"></i></ActiveToolsButton>
              <ReactTooltip id="tooltipSwap" place="top" effect="solid" delayShow={500}>swap active tools</ReactTooltip>
            <ActiveToolsButton data-tip data-for="tooltipReplace" onClick={this.replace}><i className="fas fa-random"></i></ActiveToolsButton>
              <ReactTooltip id="tooltipReplace" place="top" effect="solid" delayShow={500}>
                replace all {topTool.name} tiles<br/>
                in the level with {bottomTool.name}<br/>
                {this.props.editorState.layerEditState === LayerEditState.Top && <span>(top layer only)</span>}
                {this.props.editorState.layerEditState === LayerEditState.Both && <span>(on both layers)</span>}
              </ReactTooltip>
            <ActiveToolsButton data-tip data-for="tooltipReplaceOther" onClick={this.replaceOthers}><i className="fas fa-unlink"></i></ActiveToolsButton>
              <ReactTooltip id="tooltipReplaceOther" place="top" effect="solid" delayShow={500}>
                replace everything except {topTool.name} tiles<br/>
                in the level with {bottomTool.name}<br/>
                {this.props.editorState.layerEditState === LayerEditState.Top && <span>(top layer only)</span>}
                {this.props.editorState.layerEditState === LayerEditState.Both && <span>(on both layers)</span>}
              </ReactTooltip>

            <div className="tile-palette-layer-switch" data-tip data-for="tooltipLayerSwitch">
              <input type="checkbox" name="tile-palette-layer-switch" className="tile-palette-layer-switch-checkbox" id="tile-palette-layer-switch" tabIndex="0"
                    checked={this.props.editorState.layerEditState === LayerEditState.Top} 
                    onChange={() => this.props.editorState.toggleLayerEditState()}
              />
              <label className="tile-palette-layer-switch-label" htmlFor="tile-palette-layer-switch">
                  <span className="tile-palette-layer-switch-inner"></span>
                  <span className="tile-palette-layer-switch-switch"></span>
              </label>
            </div>
            <HotkeyTooltip id="tooltipLayerSwitch" place="top" hotkey="b">
              The only way to put something on the bottom layer<br/>
              (like a clone machine, or something under a block)<br/>
              is to be in 'both' mode, and use the right mouse button
            </HotkeyTooltip>

          </div>
          <div className="tile-palette-current-tool">
            <div className="text-right text-vcenter">
              {this.props.editorState.layerEditState === LayerEditState.Top &&
                <span>left button</span>
              }
              {this.props.editorState.layerEditState === LayerEditState.Both &&
                <span style={{color:'darkorchid'}}>TOP<br/><span style={{color:'darkgray'}}>left button</span></span>
              }
            </div>
            <TileImage tile={topTool} onTile={this.toolBackground(topTool)}/>
            <div className="text-vcenter">{topTool.name}</div>
            <DirectionalOption tool={topTool.code} isDirectionalPainting={this.props.editorState.directionalPainting}
              toggleDirectional={this.toggleDirectional}
            />

            <div className="text-right text-vcenter">
              {this.props.editorState.layerEditState === LayerEditState.Top &&
                <span>right button</span>
              }
              {this.props.editorState.layerEditState === LayerEditState.Both &&
                <span style={{color:'darkorchid'}}>BOTTOM<br/><span style={{color:'darkgray'}}>right button</span></span>
              }
            </div>
            <TileImage tile={bottomTool} onTile={this.toolBackground(bottomTool)}/>
            <div className="text-vcenter">{bottomTool.name}</div>
            <DirectionalOption tool={bottomTool.code} isDirectionalPainting={this.props.editorState.directionalPainting}
              toggleDirectional={this.toggleDirectional}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default withEditorState(observer(TilePalette))
