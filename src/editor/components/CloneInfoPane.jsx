import React from 'react';
import './CloneInfoPane.css'
import { observer } from 'mobx-react-lite';
import { useEditorState } from '../EditorState';
import ReactTooltip from 'react-tooltip';

const CloneInfoPane = observer(() => {
  const editorState = useEditorState();

  function clicked(button, index) {
    const [fx, fy] = button.from.gameboardCoords();
    const [tx, ty] = button.to.gameboardCoords();
    if (editorState.overlayHighlight &&
      editorState.overlayHighlight.sx === fx && 
      editorState.overlayHighlight.sy === fy && 
      editorState.overlayHighlight.ex === tx && 
      editorState.overlayHighlight.ey === ty
  ) {
      editorState.clearOverlayHighlight();
      editorState.clearSelections();
    } else {
      editorState.setOverlayHighlight(fx, fy, tx, ty);
      editorState.setSelectedClone(index);
    }
  }

  function removeCloneLink() {
    editorState.undoable(() => editorState.removeCloneLink(editorState.selectedClone));
    editorState.clearOverlayHighlight();
    editorState.clearSelections();
  }

  function closePane() {
    editorState.togglePane('showCloneMachinesPane');
  }

  return (
    <div className="clone-info-pane pane-container noselect">
      <div className="pane-header">
        {editorState.level.cloneLinks.length} clone machine link{editorState.level.cloneLinks.length === 1?'':'s'}
        <div className="centered-row">
          <button className="pane-header-button" onClick={() => editorState.toggleCloneLinks()}>
            {editorState.showCloneLinks && 
              <div>
                <i className="fas fa-eye-slash" data-tip data-for="tooltipCloneLinks"></i>
                <ReactTooltip id="tooltipCloneLinks" place="left" effect="solid" delayShow={500}>
                  Hide clone machine links
                </ReactTooltip>
              </div>
            }
            {!editorState.showCloneLinks && 
              <div>
                <i className="fas fa-eye" data-tip data-for="tooltipCloneLinks"></i>
                <ReactTooltip id="tooltipCloneLinks" place="left" effect="solid" delayShow={500}>
                  Show clone machine links
                </ReactTooltip>
              </div>
            }
          </button>
          <button className="pane-header-button"  onClick={closePane}>
            <i className="fas fa-times fa-xs"></i>
          </button>
        </div>
      </div>
      {editorState.level.cloneLinks.length > 0 &&
        <div className="clone-info-pane-list-container">
          <ul className="clone-info-pane-list">
            {editorState.level.cloneLinks.map((link, i) =>
              <li key={i} onClick={() => clicked(link, i)} className={editorState.selectedClone === i ? 'selected' : ''}>
                [{link.from.toString()}] <i className="fas fa-arrow-right fa-xs"></i> [{link.to.toString()}]
              </li>
            )}
          </ul>
          <div className="clone-info-pane-list-footer">
            <button className="pane-header-button" onClick={removeCloneLink} disabled={editorState.selectedClone === null}><i className="fas fa-minus"></i></button>
          </div>
        </div>
      }
    </div>
  );
});

export default CloneInfoPane;
