import React from 'react';
import './LevelInfoPane.css'
import { observer } from 'mobx-react-lite';
import { useEditorState, generatePassword } from '../EditorState';
import ReactTooltip from 'react-tooltip';

const LevelInfoPane = observer(() => {
  const editorState = useEditorState();

  function onFocus() {
    editorState.inputEditing = true;
  }

  function onBlur() {
    editorState.inputEditing = false;
  }

  function changeTitle(e) {
    editorState.setTitle(e.target.value);
  }

  function changePassword(e) {
    editorState.setPassword(e.target.value);
  }

  function changeChipCount(e) {
    editorState.setNumChipsRequired(e.target.value);
  }

  function changeTimeLimit(e) {
    editorState.setTimeLimit(e.target.value);
  }

  function changeHint(e) {
    editorState.setHint(e.target.value);
  }

  function closePane() {
    editorState.togglePane('showLevelInfoPane');
  }

  function newPassword() {
    editorState.setPassword(generatePassword(editorState.levelset));
  }

  function countChips() {
    editorState.setNumChipsRequired(editorState.level.countChips());
  }

  // function incParity() {
  //   editorState.setStepParity(editorState.stepParity + 1);
  // }
  
  // function decParity() {
  //   editorState.setStepParity(editorState.stepParity - 1);
  // }

  // const parities = ['even', 'even+1', 'even+2', 'even+3', 'odd', 'odd+1', 'odd+2', 'odd+3'];

  return (
    <div className="level-info-pane pane-container">
      <div className="pane-header level-info-pane-header">
        <span></span>
        <button className="pane-header-button"  onClick={closePane}>
          <i className="fas fa-times fa-xs"></i>
        </button>
      </div>
      <div className="level-info-grid">
        <label className="level-info-label" htmlFor="level-title">Level Title:</label>
        <input type="text" id="level-title" className="level-info-grid-entry level-info-grid-text-input" onFocus={onFocus} onBlur={onBlur}
            value={editorState.level.title} onChange={changeTitle}/>

        <label className="level-info-label" htmlFor="level-password">Password:</label>
        <div className="level-info-grid-entry">
          <input type="text" id="level-password" size="5" onFocus={onFocus} onBlur={onBlur}
              value={editorState.level.password} onChange={changePassword}/>
          <button onClick={newPassword} style={{marginLeft:'5px', color:'#478EBA'}} data-tip data-for="tooltipPassword">
            <i className="fas fa-key"></i>
          </button>
          <ReactTooltip id="tooltipPassword" place="bottom" effect="solid" delayShow={500}>
            Generate new password
          </ReactTooltip>
        </div>

        <label className="level-info-label" htmlFor="level-timelimit">Time Limit:</label>
        <input type="text" id="level-timelimit" className="level-info-grid-entry" size="5" onFocus={onFocus} onBlur={onBlur}
            value={editorState.level.timeLimit} onChange={changeTimeLimit}/>

        <label className="level-info-label" htmlFor="level-numchips"># of Chips:</label>
        <div className="level-info-grid-entry">
          <input type="text" id="level-numchips" size="5" onFocus={onFocus} onBlur={onBlur}
              className={editorState.getNumChipsRequired() !== editorState.chipsPresent ? 'level-chipcount-nonmatching' : ''} 
              value={editorState.level.numChipsRequired} onChange={changeChipCount}/>
          <button onClick={countChips} style={{margin:'0px 5px', color:'#478EBA'}} data-tip data-for="tooltipCountChips">
            <i className="fas fa-microchip"></i>
          </button>
          <ReactTooltip id="tooltipCountChips" place="bottom" effect="solid" delayShow={500}>
            Count chips in level
          </ReactTooltip>
          <span className="level-info-label">({editorState.chipsPresent} exist{editorState.chipsPresent === 1 ? 's' : ''})</span>
        </div>

        <label className="level-info-label" htmlFor="level-hint">Hint:</label>
        <textarea id="level-hint" rows="5" className="level-info-grid-entry level-info-grid-text-input" onFocus={onFocus} onBlur={onBlur}
            value={editorState.level.hint} onChange={changeHint}/>

        {/* {editorState.activated &&
          <label htmlFor="level-parity">Parity:</label>
        }
        {editorState.activated &&
          <div className="level-info-grid-entry">
            <button onClick={decParity} disabled={editorState.stepParity === 0}>
              <i className="fas fa-minus"></i>
            </button>
            <button onClick={incParity} style={{marginLeft:'5px'}} disabled={editorState.stepParity === 7}>
              <i className="fas fa-plus"></i>
            </button>
            <span style={{marginLeft:'5px'}}>{parities[editorState.stepParity]}</span>
          </div>
        } */}
      </div>
    </div>
  );
});

export default LevelInfoPane;
