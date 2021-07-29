import React from 'react';
import './TrapInfoPane.css'
import { observer } from 'mobx-react-lite';
import { useEditorState } from '../EditorState';
import ReactTooltip from 'react-tooltip';

const TrapInfoPane = observer(() => {
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
      editorState.setSelectedTrap(index);
    }
  }

  function removeTrapLink() {
    editorState.undoable(() => editorState.removeTrapLink(editorState.selectedTrap));
    editorState.clearOverlayHighlight();
    editorState.clearSelections();
  }

  function closePane() {
    editorState.togglePane('showTrapsPane');
  }

  return (
    <div className="trap-info-pane pane-container noselect">
      <div className="pane-header">
        {editorState.level.trapLinks.length} trap link{editorState.level.trapLinks.length === 1?'':'s'}
        <div className="centered-row">
          <button className="pane-header-button" onClick={() => editorState.toggleTrapLinks()}>
            {editorState.showTrapLinks && 
              <div>
                <i className="fas fa-eye-slash" data-tip data-for="tooltipTrapLinks"></i>
                <ReactTooltip id="tooltipTrapLinks" place="left" effect="solid" delayShow={500}>
                  Hide trap links
                </ReactTooltip>
              </div>
            }
            {!editorState.showTrapLinks && 
              <div>
                <i className="fas fa-eye" data-tip data-for="tooltipTrapLinks"></i>
                <ReactTooltip id="tooltipTrapLinks" place="left" effect="solid" delayShow={500}>
                  Show trap links
                </ReactTooltip>
              </div>
            }
          </button>
          <button className="pane-header-button" onClick={closePane}>
            <i className="fas fa-times fa-xs"></i>
          </button>
        </div>
      </div>
      {editorState.level.trapLinks.length > 0 &&
        <div className="trap-info-pane-list-container">
          <ul className="trap-info-pane-list">
            {editorState.level.trapLinks.map((link, i) =>
              <li key={i} onClick={() => clicked(link, i)} className={editorState.selectedTrap === i ? 'selected' : ''}>
                [{link.from.toString()}] <i className="fas fa-arrow-right fa-xs"></i> [{link.to.toString()}]
              </li>
            )}
          </ul>
          <div className="trap-info-pane-list-footer">
            <button className="pane-header-button" onClick={removeTrapLink} disabled={editorState.selectedTrap === null}><i className="fas fa-minus"></i></button>
          </div>
        </div>
      }
    </div>
  );
});

export default TrapInfoPane;
