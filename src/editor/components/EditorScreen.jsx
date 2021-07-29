/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from 'react';
import './EditorScreen.css'
import Editor from './Editor';
import { loadLevelset, loadLevel } from '../../engine/levelset/CCLevelsetReader';
import EditorIntroScreen from './EditorIntroScreen'
import EditorState, { EditorStateProvider, LeftPaneState, updateLocalStorage } from '../EditorState'
import LeftPane from './LeftPane';
import { observer } from 'mobx-react-lite';
import ExportModal from './ExportModal';
import { fileSave } from 'browser-nativefs'
import { writeLevelset } from '../../engine/levelset/CCLevelsetWriter';
import RightBar from './RightBar';

const editorState = new EditorState();

const EditorScreen = observer(() => {
  useEffect(() => {
    const tilesetCode = localStorage.getItem('tileset') || 'ww';
    editorState.loadTileset(tilesetCode);
  }, []);

  useEffect(() => {
    const storedLevelsetString = localStorage.getItem('levelset');
    if (storedLevelsetString) {
      const bytes = new Uint8Array(storedLevelsetString.split('').map((c) => c.charCodeAt(0)));
      // I can't get TextEncoder/TextDecoder to transform bytes->string->same bytes
      // const storedLevelsetBytes = new TextEncoder().encode(storedLevelsetString);
      try {
        const levelset = loadLevelset(bytes);
        editorState.setLevelset(levelset);
        editorState.setLevelNum(Number(localStorage.getItem('levelset.levelNum')) || 1);
        editorState.setLevelsetFilename(localStorage.getItem('levelset.filename'));
        editorState.markExported(Number(localStorage.getItem('levelset.exportedAt')) || 0);
        editorState.markSavedLocally(Number(localStorage.getItem('levelset.savedAt')) || 0);
        editorState.setModifiedAt(editorState.locallyStoredAt);
        editorState.setLeftPaneState(LeftPaneState.LevelEditor);
        editorState.hideIntroScreen();
        return;
      } catch(err) {
        console.log(err);
      }
    }

    // fell through for any reason, show the intro
    editorState.showIntroScreen();
  }, []);

  useEffect(() => {
    if (editorState.levelset.length > 0 && editorState.levelset.length >= editorState.levelNum) { 
      // if it has its layers, use it as-is (layer object takes priority, as source bytes may be behind)
      if (editorState.levelset[editorState.levelNum-1].topLayer !== null) {
        editorState.setLevel(editorState.levelset[editorState.levelNum-1]);
      } else if (editorState.levelset[editorState.levelNum-1].sourceBytes !== null) {
        _loadLevelNum(editorState.levelNum);
      } else {
        console.log(`uh-oh level ${editorState.levelNum} has neither layer nor bytes`);
      }
    }
  }, [editorState.levelNum, editorState.levelset]);

  function _loadLevelNum(num) {
    const level = loadLevel(editorState.levelset[num-1].sourceBytes);
    // I'm managing level numbers now - this level's position in the
    // set may no longer match its levelNumber from its source bytes
    level.levelNumber = num;
    editorState.setLevel(level);
  }

  function nextLevel() {
    if (editorState.levelNum < editorState.levelset.length) {
      editorState.setLevelNum(editorState.levelNum+1);
      editorState.clearOverlayHighlight();
      localStorage.setItem('levelset.levelNum', editorState.levelNum);
    }
  }

  function prevLevel() {
    if (editorState.levelNum > 1) {
      editorState.setLevelNum(editorState.levelNum-1);
      editorState.clearOverlayHighlight();
      localStorage.setItem('levelset.levelNum', editorState.levelNum);
    }
  }

  function _actuallyClose() {
    editorState.setLevelNum(null);
    editorState.setLevel(null);
    editorState.setLevelset([]);
    editorState.setLevelsetFilename(null);
    editorState.clearDirtyFlags();
    editorState.showIntroScreen();
    localStorage.removeItem('levelset');
    localStorage.removeItem('levelset.savedAt');
    localStorage.removeItem('levelset.exportedAt');
    localStorage.removeItem('levelset.filename');
    localStorage.removeItem('levelset.levelNum');
  }

  function closeLevelset() {
    if (editorState.hasUnexportedChanges()) {
      if (window.confirm("Levelset has been modified since last file save. Close anyway? Changes will be lost!")) {
        _actuallyClose();
      }
    } else {
      _actuallyClose();
    }
  }

  async function exportLevelset(handle) {
    if ('showOpenFilePicker' in window) {
      const options = {
        fileName: editorState.levelsetFilename,
        extensions: ['.dat'],
      };
      
      const bytes = writeLevelset(editorState.levelset);
      const blob = new Blob([bytes], {type: 'application/octet-stream'});

      editorState.setLevelsetFilehandle(await fileSave(blob, options, handle));

      editorState.markExported();
      updateLocalStorage(editorState, bytes, editorState.exportedAt);
      localStorage.setItem('levelset.filename', editorState.filename);
      localStorage.setItem('levelset.exportedAt', editorState.exportedAt);
    } else {
      editorState.showExportModal();
    }
  }

  async function save() {
    exportLevelset(editorState.levelsetFilehandle);
  }

  async function saveAs() {
    exportLevelset(null);
  }

  let screen;
  if (editorState.shouldShowIntroScreen) {
    screen = <EditorIntroScreen/>
  } else if (editorState.tileset && editorState.levelset && editorState.level) {
    screen = <div className="editor-screen">
        <LeftPane/>
        <Editor nextLevel={nextLevel} prevLevel={prevLevel}
          close={closeLevelset} save={save} saveAs={saveAs}
        />
        <RightBar/>
      </div>
  }

  return (
    <EditorStateProvider store={editorState}>
      {screen}

      {editorState.exportModal && <ExportModal/>}
    </EditorStateProvider>
  );
});

export default EditorScreen;
