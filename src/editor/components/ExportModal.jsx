/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components'
import { observer } from 'mobx-react-lite';
import { updateLocalStorage, useEditorState } from '../EditorState';
import { writeLevelset } from '../../engine/levelset/CCLevelsetWriter';
import FileSaver from 'file-saver';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  background-color: rgba(0,0,0,0.5);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Modal = styled.div`
  min-height: 40vh;
  width: 40vw;
  padding: 20px;
  border: 10px solid lightgray;
  border-radius: 5px;
  background-color: white;
  display: flex;
  flex-direction: column;
  /* justify-content: space-around; */
`;

const GetFilename = styled.div`
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Buttons = styled.div`
  flex: 0;
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  padding: 10px;
`;

const Message = styled.div`
  flex-grow: 2;
  /* text-align: center; */
  padding: 10px;
`;

const MessageHeader = styled.div`
  text-align: center;
  font-weight: bold;
  padding: 10px;
`;

const Error = styled.div`
  color: red;
  text-align: center;
  font-size: 0.8em;
  padding: 10px;
`;

const ExportModal = observer(() => {
  const editorState = useEditorState();

  const [filename, setFilename] = useState(editorState.levelsetFilename || '.dat');
  const [error, setError] = useState();
  const filenameRef = useRef();

  useEffect(() => {
    if (filename.toLowerCase().endsWith('.dat')) {
      filenameRef.current.setSelectionRange(0, filename.length - 4);
    } else {
      filenameRef.current.setSelectionRange(0, filename.length);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keyup", keyUp);

    return () => {
      document.removeEventListener("keyup", keyUp);
    };
  }, []);

  const keyUp = useCallback((e) => {
    if (e.key === 'Enter') {
      save();
    } else if (e.key === 'Escape') {
      close();
    }
  });

  function onFocus() {
    editorState.inputEditing = true;
  }

  function onBlur() {
    editorState.inputEditing = false;
  }

  function close() {
    editorState.hideExportModal();
  }

  function ignore(e) {
    e.stopPropagation();
  }

  function changeFilename(e) {
    setFilename(e.target.value);
    setError(null);
  }

  function save() {
    if (filename.length > 4 && filename.toLowerCase().endsWith('.dat')) {
      const bytes = writeLevelset(editorState.levelset);
      FileSaver.saveAs(new Blob([bytes]), filename);
      editorState.setLevelsetFilename(filename);
      editorState.markExported();
      updateLocalStorage(editorState, bytes, editorState.exportedAt);
      localStorage.setItem('levelset.filename', filename);
      localStorage.setItem('levelset.exportedAt', editorState.exportedAt);
      close();
    } else {
      setError("please use a valid filename (ending with '.dat'")
    }
  }

  return (
    <Overlay onClick={close}>
      <Modal onClick={ignore}>
        <MessageHeader>
          Instructions for saving a file
        </MessageHeader>
        <Message>
          Saving from the browser is a bit clunky. You have a few options (from worst to best):
          <ol>
            <li>If your browser preferences are set to automatically download files to a folder,
            then you will find this saved file in that folder. If there is already a file with this
            same name in your downloads, you will end up with a new file called '&lt;filename&gt;-1.dat'
            or '&lt;filename&gt;(1).dat' or something like that.</li>
            <li>If your browser preferences are set to always ask where to save files, then you're
            about to get another window that will let you set the destination and confirm the filename.
            If there is already a file with this same name there, it will ask if you want to
            overwrite it (but at least you won't get multiple '&lt;filename&gt;-&lt;number&gt;.dat' files).</li>
            <li>Use the latest version of a Chrome or an Edge browser, which has better support for 'save'
            and 'save as' functions.</li>
          </ol>
        </Message>
        <GetFilename>
          <label style={{paddingBottom:'5px'}} htmlFor="filename">Save to file named:</label>
          <input type="text" id="filename" ref={filenameRef} autoFocus onFocus={onFocus} onBlur={onBlur}
              value={filename} onChange={changeFilename}/>
        </GetFilename>
        {error && <Error>{error}</Error>}
        <Buttons>
          <button onClick={save} type="submit">Save</button>
          <button onClick={close}>Cancel</button>
        </Buttons>
      </Modal>
    </Overlay>
  );
});

export default ExportModal;
