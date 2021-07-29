import React from 'react';
import styled from 'styled-components'
import { observer } from 'mobx-react-lite';
import { useEditorState, builtinTilesets } from '../EditorState';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  background-color: rgba(0,0,0,0.3);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Modal = styled.div`
  min-height: 20vh;
  width: 20vw;
  padding: 20px;
  border: 10px solid lightgray;
  border-radius: 5px;
  background-color: white;
  display: flex;
  flex-direction: column;
  /* justify-content: space-around; */
`;

const TilesetList = styled.ul`
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

const TilesetListItem = styled.li`
  padding: 1px;
  display: flex;
  flex-direction: row;

  &:nth-child(even) {
    background: rgb(219, 219, 185);
  }
  &:hover {
    background-color: yellow;
    border: solid 1px black;
    padding: 0px;
  }
`
const TilesetModal = observer(() => {
  const editorState = useEditorState();

  function close() {
    editorState.hideTilesetModal();
  }

  function ignore(e) {
    e.stopPropagation();
  }

  function loadTileset(e) {
    editorState.loadTileset(e.target.id);
    close();
  }

  const items = Array.from(builtinTilesets.values()).map(v => {
    let pre;
    if (editorState.tilesetCode === `[i]${v.id}`) {
      pre = <i style={{width:'20px'}} className="fas fa-check"></i>
    } else {
      pre = <div style={{width:'20px'}}></div>
    }
    return (
      <TilesetListItem key={v.id} id={v.id} onClick={loadTileset}>
        {pre} {v.name}
      </TilesetListItem>
    );
  });

  return(
    <Overlay onClick={close}>
      <Modal onClick={ignore}>
        Select a tileset:
        <TilesetList>
          {items}
        </TilesetList>
      </Modal>
    </Overlay>
  );
});

export default TilesetModal;
