export function getTWReplayDirProvider(actions) {
  let actionIndex = 0;
  return { 
    getNextDir: (state) => {
      let dir = 0;
      if (actionIndex < actions.length) {
        while (state.currenttime > actions[actionIndex].t) {
          console.log(`WARN: current time ${state.currenttime} got ahead of action time ${actions[actionIndex].t}`)
          actionIndex++;
        }

        if (state.currenttime === actions[actionIndex].t) {
          // console.log(`curr ${state.currenttime} index ${actionIndex} action time ${actions[actionIndex].t} dir ${actions[actionIndex].dir}`);
          dir = actions[actionIndex].dir;
          actionIndex++;
        }
      }
      return dir;
    },

    reset: (tick) => {
      actionIndex = 0;
      while (actionIndex < actions.length && actions[actionIndex].t < tick) actionIndex++;
    }
  }
}
