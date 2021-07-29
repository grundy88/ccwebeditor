import React from 'react';
import './LeftBar.css'
import { observer } from 'mobx-react-lite';
import { useEditorState, LeftPaneState, EditorMode } from '../EditorState';

const LeftBar = observer(() => {
  const editorState = useEditorState();

  function showLevelEditor() {
    editorState.setLeftPaneState(LeftPaneState.LevelEditor);
  }

  function showLevelsetManager() {
    editorState.setLeftPaneState(LeftPaneState.LevelsetManager);
    editorState.setEditorMode(EditorMode.DRAW);
  }

  return (
    <div className="left-bar">
      <span className={'left-bar-button ' + (editorState.leftPaneState !== LeftPaneState.LevelEditor ? 'unselected' : '')} onClick={showLevelEditor}>
        Level Editor
      </span>
      <span className={'left-bar-button ' + (editorState.leftPaneState !== LeftPaneState.LevelsetManager ? 'unselected' : '')} onClick={showLevelsetManager}>
        Levelset Manager
        </span>
    </div>
  );
});

export default LeftBar;
