import React from 'react';
import './RightPane.css'
import { observer } from 'mobx-react-lite';
import LevelInfoPane from './LevelInfoPane';
import MonsterInfoPane from './MonsterInfoPane';
import TrapInfoPane from './TrapInfoPane';
import CloneInfoPane from './CloneInfoPane';
import { useEditorState } from '../EditorState';

const RightPane = observer(() => {
  const editorState = useEditorState();

  return (
    <div className="right-pane">
      {(editorState.showLevelInfoPane ||
        editorState.showMonstersPane ||
        editorState.showTrapsPane ||
        editorState.showCloneMachinesPane) &&

        <div className="right-panes">
          {editorState.showLevelInfoPane && <LevelInfoPane/>}
          {editorState.showMonstersPane && <MonsterInfoPane/>}
          {editorState.showTrapsPane && <TrapInfoPane/>}
          {editorState.showCloneMachinesPane && <CloneInfoPane/>}
        </div>
      }
    </div>
  );
});

export default RightPane;
