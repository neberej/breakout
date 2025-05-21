
import * as React from "react";

const Infobar = () => {
  return (
    <div className="info">
      <div className="controls">
        <span><b>About:</b></span>
        <span>Each brick is mapped to a post on HackerNews <br/> (news.ycombinator.com). Break them to read it.</span>
      </div>
      <div className="controls">
        <span><b>Controls:</b></span>
        <span>'space' to start game, 'r' to restart.</span>
        <span>'left' and 'right' to move paddle.</span>
        <span>'p' to pause, 'x' to resume.</span>
        <span>'d' to discard, 'c' to open link</span>
      </div>
      <div className="classic-link-btn">Prefer the classic instead? <a href='/demo/breakout/classic/'>Click here!</a></div>
      <div className="github-link-btn"><a href='https://github.com/neberej/breakout' target="_blank">View on Github</a></div>
    </div>
  )
}

export default Infobar
