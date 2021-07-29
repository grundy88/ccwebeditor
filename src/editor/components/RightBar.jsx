import React from 'react';
import './RightBar.css'
import { observer } from 'mobx-react-lite';
import { useEditorState } from '../EditorState';

const RightBar = observer(() => {
  const editorState = useEditorState();

  function toggle(e) {
    editorState.togglePane(e.target.id);
  }

  return (
    <div className="right-bar noselect">
      <div id='showLevelInfoPane' onClick={toggle} className={'right-bar-button ' + (!editorState.showLevelInfoPane ? 'unselected' : '')}>
        Level Info
      </div>
      <div id='showMonstersPane' onClick={toggle} className={'right-bar-button ' + (!editorState.showMonstersPane ? 'unselected' : '')}>
        Monsters
      </div>
      <div id='showTrapsPane' onClick={toggle} className={'right-bar-button ' + (!editorState.showTrapsPane ? 'unselected' : '')}>
        Traps
      </div>
      <div id='showCloneMachinesPane' onClick={toggle} className={'right-bar-button ' + (!editorState.showCloneMachinesPane ? 'unselected' : '')}>
        Clone Machines
      </div>
    </div>
  );
});

export default RightBar;
