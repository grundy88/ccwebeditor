import React from 'react';
import './MonsterInfoPane.css'
import { observer } from 'mobx-react-lite';
import { useEditorState } from '../EditorState';
import TileImage from './TileImage'
import {SortableContainer, SortableElement} from 'react-sortable-hoc';
import ReactTooltip from 'react-tooltip';
import { getTile } from '../../engine/tiles/tile';
import { toCoords } from '../../engine/util/utils';

const MonsterListItem = observer(({monster, index}) => {
  const editorState = useEditorState();

  function clicked(monster, index) {
    if (editorState.overlayHighlight && editorState.overlayHighlight.locatable === monster) {
      editorState.clearOverlayHighlight();
      editorState.clearSelections();
    } else {
      editorState.setOverlayHighlightLocatable(monster);
      editorState.setSelectedMonster(index);
    }
  }

  return (
    <div className={'monster-list-item ' + (editorState.selectedMonster === index ? 'selected' : '')} onClick={() => clicked(monster, index)}>
      {index+1}) <TileImage tile={getTile(monster.code)} size={20}/> at [{toCoords(monster.pos)}]
    </div>
  );
})

// todo any way to make this an observer
const SortableItem = SortableElement(({monster, i}) => {
  return (
    <MonsterListItem monster={monster} index={i}/>
  );
});

const SortableList = SortableContainer(({monsters}) => {
  return (
    <div>
      {monsters.map((monster, index) => (
        <SortableItem key={index} index={index} monster={monster} i={index}/>
      ))}
    </div>
  );
});

const MonsterInfoPane = observer(() => {
  const editorState = useEditorState();
  
  function onSortStart() {
    editorState.clearOverlayHighlight();
    editorState.clearSelections();
  };

  function onSortEnd({oldIndex, newIndex}) {
    const newList = Array.from(editorState.level.creatures);
    const [removed] = newList.splice(oldIndex, 1);
    newList.splice(newIndex, 0, removed);
    editorState.setMonsters(newList);
  };

  function removeMonster() {
    if (!editorState.activated) {
      const monster = editorState.level.creatures[editorState.selectedMonster];
      if (monster) editorState.undoable(() => editorState.removeMonster(monster.pos));
    } else {
      const observableMonster = editorState.observableMonsters[editorState.selectedMonster];
      if (observableMonster) editorState.level.removeCreature(observableMonster.monster);
    }
    editorState.clearOverlayHighlight();
    editorState.clearSelections();
  }

  function closePane() {
    editorState.togglePane('showMonstersPane');
  }

  return (
    <div className="monster-info-pane pane-container noselect">
      <div className="pane-header">
        {editorState.observableMonsters.length} monster{editorState.observableMonsters.length === 1?'':'s'}
        <div className="centered-row">
          <button className="pane-header-button" onClick={() => editorState.toggleMonsterNumbers()}>
            {editorState.showMonsterNumbers && 
              <div>
                <i className="fas fa-eye-slash" data-tip data-for="tooltipMonsterNumbers"></i>
                <ReactTooltip id="tooltipMonsterNumbers" place="left" effect="solid" delayShow={500}>
                  Hide monster numbers/arrows
                </ReactTooltip>
              </div>
            }
            {!editorState.showMonsterNumbers && 
              <div>
                <i className="fas fa-eye" data-tip data-for="tooltipMonsterNumbers"></i>
                <ReactTooltip id="tooltipMonsterNumbers" place="left" effect="solid" delayShow={500}>
                  Show monster numbers/arrows
                </ReactTooltip>
              </div>
            }
          </button>
          <button className="pane-header-button" onClick={closePane}>
            <i className="fas fa-times fa-xs"></i>
          </button>
        </div>
      </div>
      {editorState.observableMonsters.length > 0 &&
        <div className="monster-info-pane-list-container">
          <div className="monster-info-pane-list">
            <SortableList monsters={editorState.observableMonsters} 
                          onSortEnd={onSortEnd} onSortStart={onSortStart} 
                          distance={5}/>
          </div>
          <div className="monster-info-pane-list-footer">
            <button className="pane-header-button" onClick={removeMonster} disabled={editorState.selectedMonster === null}><i className="fas fa-minus"></i></button>
            {editorState.activated &&
              <div>
                {editorState.observableMonsters.length > 0 &&
                  <div className="monster-info-pane-header-why" data-tip data-for="tooltipMonsterOrder">
                    why did the list change?
                  </div>
                }
                <ReactTooltip id="tooltipMonsterOrder" place="bottom" effect="solid" event="click" multiline={true}>
                  This simulator is modeled after Lynx, which maintains <br/>
                  a creature order specific to the internal game logic.<br/>
                  In edit mode, this list can be ordered as you please.<br/>
                  In play mode, it reflects the order that the game engine uses.
                </ReactTooltip>
              </div>
            }
          </div>
        </div>
      }
    </div>
  );
});

export default MonsterInfoPane;
