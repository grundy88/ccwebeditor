import React from 'react';
import ReactTooltip from 'react-tooltip';
import styled from 'styled-components'

const HotkeyHelper = styled.div`
  border: 1px solid darkgray;
  background-color: gray;
  color: cyan;
  height: 12px;
  min-width: 12px;
  margin-left: 3px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 1px 2px white;
`;

const HotkeyTooltip = (props) => {
  return(
    <ReactTooltip id={props.id} place={props.place} effect="solid" delayShow={500}>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {props.children} {props.hotkey && <HotkeyHelper>{props.hotkey}</HotkeyHelper>}
    </div>
  </ReactTooltip>
  );
}

export default HotkeyTooltip;
