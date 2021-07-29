/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from 'react';
import './LevelsetManager.css'
import { observer } from 'mobx-react-lite';
import { useEditorState } from '../EditorState';
import { Level } from '../../engine/model/level';
import {SortableContainer, SortableElement} from 'react-sortable-hoc';

const LevelsetListItem = observer(({level, index, r}) => {
  const editorState = useEditorState();

  function selectLevel(levelNum) {
    editorState.setLevelNum(levelNum);
    localStorage.setItem('levelset.levelNum', editorState.levelNum);
  }

  return (
    <div ref={r} className={'levelset-list-item ' + (editorState.levelNum === index+1 ? 'selected' : '')} onClick={() => selectLevel(index+1)}>
      <div style={{marginRight:'5px', display:'inline'}}>{level.levelNumber}.</div>
      <div style={{display:'inline'}}>{level.title}</div>
    </div>
  );
})

const SortableItem = SortableElement(({level, i, r}) => {
  return (
    <LevelsetListItem level={level} index={i} r={r}/>
  );
});

const SortableList = SortableContainer(({levelset, refs}) => {
  return (
    <div>
      {levelset.map((level, i) =>
        <SortableItem key={i} index={i} i={i} r={refs[i]} level={level}/>
      )}
    </div>
  );
});

const LevelsetManager = observer(() => {
  const editorState = useEditorState();

  const refs = editorState.levelset.reduce((acc) => {
    acc.push(React.createRef());
    return acc;
  }, []);

  const scrollTo = (index) =>
    refs[index].current.scrollIntoView({
      // behavior: 'smooth',
      block: 'nearest',
    });

  useEffect(() => {
    scrollTo(editorState.levelNum-1);
  }, [editorState.levelNum]);
  
  function onSortEnd({oldIndex, newIndex}) {
    const newList = Array.from(editorState.levelset);
    const [removed] = newList.splice(oldIndex, 1);
    newList.splice(newIndex, 0, removed);
    if (oldIndex < newIndex) {
      newList.slice(oldIndex, newIndex).forEach(l => l.setLevelNumber(l.levelNumber - 1));
    } else {
      newList.slice(newIndex+1, oldIndex+1).forEach(l => l.setLevelNumber(l.levelNumber + 1));
    }
    removed.setLevelNumber(newIndex + 1);
    editorState.setLevelset(newList);
    if (editorState.levelNum === oldIndex+1) editorState.setLevelNum(newIndex+1);
  };

  function addLevel() {
    const levelNum = editorState.levelset.length + 1;
    const level = new Level(levelNum).initialize();
    editorState.addLevel(level);
    editorState.setLevelNum(levelNum);
  }

  function removeLevel() {
    if (window.confirm("Are you sure you want to remove this level?")) {
      if (editorState.levelset.length > 0) {
        editorState.removeLevel(editorState.levelNum);
        if (editorState.levelNum > editorState.levelset.length) {
          editorState.setLevelNum(editorState.levelset.length);
        }
      }
    }
  }

  return (
    <div className='levelset-manager noselect'>
      {editorState.levelsetFilename &&
        <div>
          File: {editorState.levelsetFilename}
        </div>
      }

      <div className="levelset-list-container">
        <div className="levelset-list">
            <SortableList levelset={editorState.levelset} refs={refs}
                          onSortEnd={onSortEnd} distance={5}/>
          </div>
        <div className="levelset-list-footer">
          <button onClick={addLevel}><i className="fas fa-plus"></i></button>
          <button onClick={removeLevel} disabled={editorState.levelset.length === 1}><i className="fas fa-minus"></i></button>
        </div>
      </div>
    </div>
  )
});

export default LevelsetManager;
