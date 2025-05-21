
import React, { useState, useEffect } from 'react';
import { GAME_CONFIG } from './../../hn/config-hn';
import "./fallingText.scss";

const FallingText = ({ id, title, desc, vote, url, position, startTime }) => {
  const isMobile = window.innerWidth <= 480;
  const canvasWidth = isMobile ? window.innerWidth : 800;
  const canvasHeight = isMobile ? 600 : 800;
  const bounds = GAME_CONFIG.gameBounds[isMobile ? 'mobile' : 'desktop'];
  const x = ((position[0] + bounds.xMax) / (bounds.xMax * 2)) * canvasWidth;
  const initialY = ((bounds.yMax - position[1]) / (bounds.yMax * 2)) * canvasHeight;
  const clampedX = isMobile ? 100 : Math.max(10, Math.min(canvasWidth - 10, x));
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const newProgress = Math.min(elapsed / GAME_CONFIG.fallingText.duration, 1);
      const newCountdown = Math.max(0, Math.ceil((GAME_CONFIG.fallingText.duration - elapsed) / 1000));
      setProgress(newProgress);
      setCountdown(newCountdown);
      if (elapsed >= GAME_CONFIG.fallingText.duration) {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [startTime, GAME_CONFIG.fallingText.duration]);

  const clampedY = isMobile ? 100 : initialY + (canvasHeight - initialY - 100) * progress;

  return (
    <div
      className="falling-text"
      style={{
        left: `${clampedX}px`,
        top: `${clampedY}px`,
        transition: 'top 8s linear',
        opacity: 0.7
      }}
    >
      <div className="hn-meta-row">
        <span className="hn-arrow"></span>
        <span className="hn-data">{vote}</span>
        <span className="hn-comment-icon"></span>
        <span className="hn-data">{desc}</span>
      </div>
      <div className="hn-title">{title}</div>
      <div className="hn-meta">Press 'd' to discard, 'c' to open link</div>
      <div className="hn-meta">Disappears in: {countdown}s</div>
    </div>
  );
};

export default FallingText;