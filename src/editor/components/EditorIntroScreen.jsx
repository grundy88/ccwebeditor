import React from 'react';
import styled from 'styled-components'
import { observer } from 'mobx-react-lite';
import { LeftPaneState, useEditorState, updateLocalStorage } from '../EditorState';
import { loadLevelset } from '../../engine/levelset/CCLevelsetReader';
import { Level } from '../../engine/model/level';
import wall from '../../assets/wall.png'
import floor from '../../assets/floor.png'
import { fileOpen } from 'browser-nativefs'
import { loadBinaryAsset } from '../../engine/util/utils';

const IntroScreen = styled.div`
  background-color: lightyellow;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`

const IntroPane = styled.div`
  position: relative;
  height: 640px;
  width: 640px;
  background-color: yellow;
  border: solid 32px white;
  border-image: url(${wall}) 32 repeat;
  /* border-image: linear-gradient(red, blue) 27; */
  background-image: url(${floor});
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
`

const IntroOptions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 1.2em;
  font-weight: bold;
`

const Banner = styled.div`
  font-size: 3em;
  color: teal;
`

const IntroButton = styled.button`
  font-size: 1.2em;
  border: solid 1px black;
  border-radius: 3px;
  padding: 2px 5px;
  cursor: default;
  background-color: #dddddd;
  &:hover {
    background-color: #bbbbbb;
  }
`

const IntroOption = styled.div`
  margin: 20px;
`

const IntroBreak = styled.div`
  font-size: 0.7em;
  font-variant: small-caps;
`

const CommunityList = styled.ul`
  background-color: beige;
  border: inset 3px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  padding: 0px;
  list-style: none inside;
  overflow: auto;
  cursor: default;
`

const CommunityListItem = styled.li`
  padding: 1px;

  &:nth-child(even) {
    background: rgb(219, 219, 185);
  }
  &:hover {
    background-color: yellow;
    border: solid 1px black;
    padding: 0px;
  }
`

const Loading = styled.div`
  position: absolute;
  bottom: 30px;
  font-size: 1.5em;
  background-color: lightyellow;
  border: 2px solid black;
  border-radius: 5px;
  padding: 5px 20px;
`;

const Secret = styled.div`
  position: absolute;
  top: 149px;
  right: 10px;
  color: lightyellow;
  cursor: pointer;
`

const EditorIntroScreen = observer(() => {
  const editorState = useEditorState();

  function loadCommunityLevelset(e) {
    editorState.setIntroLoading(true);
    _readLevelsetAssetFile(e.target.id);
  }
  
  async function _readLevelsetAssetFile(f, levelNum=1) {
    const bytes = await loadBinaryAsset(f);
    const levelset = loadLevelset(bytes);
    editorState.setLevelset(levelset);
    editorState.setLevelNum(levelNum);
    editorState.setLevelsetFilename(f);
    editorState.setModifiedAt(0);
    updateLocalStorage(editorState, null, null, false);
    localStorage.setItem('levelset.filename', f);
    editorState.hideIntroScreen();
    editorState.setLeftPaneState(LeftPaneState.LevelEditor);
  }

  function createNewLevelset() {
    editorState.setIntroLoading(true);
    const level = new Level(1).initialize();
    editorState.addLevel(level);
    editorState.setLevelNum(1);
    editorState.setModifiedAt(0);
    updateLocalStorage(editorState, null, null, false);
    editorState.hideIntroScreen();
    editorState.setLeftPaneState(LeftPaneState.LevelEditor);
  }

  async function loadLevelsetFile() {
    const fileHandle = await fileOpen({extensions: ['.dat']});
    editorState.setIntroLoading(true);

    const filename = fileHandle.name;
    const levelsetBytes = new Uint8Array(await fileHandle.arrayBuffer());

    const levelset = loadLevelset(levelsetBytes);
    editorState.setLevelset(levelset);
    editorState.setLevelNum(1);
    editorState.setLevelsetFilename(filename);
    editorState.setLevelsetFilehandle(fileHandle.handle);
    editorState.setModifiedAt(0);
    updateLocalStorage(editorState, null, null, false);
    localStorage.setItem('levelset.filename', filename);
    editorState.hideIntroScreen();
    editorState.setLeftPaneState(LeftPaneState.LevelEditor);
}

  return (
    <IntroScreen>
    <IntroPane>
      <Banner>CCWebEditor</Banner>

      <IntroOptions>
        <IntroOption>
          <IntroButton onClick={createNewLevelset}>Create a new levelset</IntroButton>
        </IntroOption>

        <IntroBreak>- or -</IntroBreak>

        <IntroOption>
          <IntroButton onClick={loadLevelsetFile}>Load a levelset from a file</IntroButton>
        </IntroOption>

        <IntroBreak>- or -</IntroBreak>

        <IntroOption>
          Choose a community levelset:
          <CommunityList>
            <CommunityListItem id='CCLP1.dat' onClick={loadCommunityLevelset}>CCLP1</CommunityListItem>
            <CommunityListItem id='CCLP2.dat' onClick={loadCommunityLevelset}>CCLP2</CommunityListItem>
            <CommunityListItem id='CCLXP2.dat' onClick={loadCommunityLevelset}>CCLXP2</CommunityListItem>
            <CommunityListItem id='CCLP3.dat' onClick={loadCommunityLevelset}>CCLP3</CommunityListItem>
            <CommunityListItem id='CCLP4.dat' onClick={loadCommunityLevelset}>CCLP4</CommunityListItem>
          </CommunityList>
        </IntroOption>
      </IntroOptions>

      {editorState.shouldShowIntroLoading &&
        <Loading>
          Loading...
        </Loading>
      }
    </IntroPane>
    <Secret id="CHIPS.dat" onClick={loadCommunityLevelset}>go bit buster!</Secret>
    </IntroScreen>
  )
});

export default EditorIntroScreen;
