import React from 'react';
import './LeftPane.css'
import { observer } from 'mobx-react-lite';
import LeftBar from './LeftBar';
import TilePalette from './TilePalette';
import LevelsetManager from './LevelsetManager';
import { useEditorState, LeftPaneState } from '../EditorState';

const LeftPane = observer(() => {
  const editorState = useEditorState();

  return (
    <div className="left-pane">
      <div className="left-pane-bar">
        <LeftBar/>
      </div>
      <div className="left-panes">
        {editorState.leftPaneState === LeftPaneState.LevelsetManager &&
          <LevelsetManager/>
        }
        {editorState.leftPaneState === LeftPaneState.LevelEditor &&
          <TilePalette/>
        }
      </div>
    </div>
  );
});

export default LeftPane;
