
import React, { useRef, useState, useEffect, useMemo } from 'react';
import Seo from "@section/Seo"
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useBox, useSphere } from '@react-three/cannon';
import * as THREE from 'three';
import "./../shared/breakout.scss"
import { Brick, ParticleEffect, Ball, GameControls, Wall, Paddle } from './components';
import { GAME_CONFIG } from './config-classic';

const App = () => {
  const [paddlePosition, setPaddlePosition] = useState([0, -5.5, 0.4]);
  const [ballPosition, setBallPosition] = useState([0, -5.0, 0]);
  const isMobile = window.innerWidth <= 480;
  const brickSpacingX = isMobile ? GAME_CONFIG.brick.spacingX.mobile : GAME_CONFIG.brick.spacingX.desktop;
  const [bricks, setBricks] = useState(
    Array.from({ length: GAME_CONFIG.brick.rows }, (_, i) =>
      Array.from({ length: GAME_CONFIG.brick.columns }, (_, j) => ({
        id: `${i}-${j}`,
        position: [(j - GAME_CONFIG.brick.xCenterOffset) * brickSpacingX, GAME_CONFIG.brick.yStart - i * GAME_CONFIG.brick.yStep, 0],
      }))
    ).flat()
  );
  const [score, setScore] = useState(0);
  const [ballLaunched, setBallLaunched] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [ballApi, setBallApi] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [keys, setKeys] = useState({ left: false, right: false, up: false, down: false });
  const [paddleHit, setPaddleHit] = useState(0);
  const [brickHit, setBrickHit] = useState(0);
  const [brickHitPosition, setBrickHitPosition] = useState([0, 0, 0]);

  const startGame = () => {
    if (!ballLaunched && countdown === null) {
      setCountdown(GAME_CONFIG.countdownDuration);
      setGameOver(false);
      setGameComplete(false);
      if (ballApi) {
        ballApi.position.set(0, -5.0, 0);
        ballApi.velocity.set(0, 0, 0);
        ballApi.mass.set(0);
      }
    }
  };

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      if (ballApi) {
        setBallLaunched(true);
        setCountdown(null);
        ballApi.mass.set(1);
        const angle = Math.PI / 6;
        ballApi.velocity.set(
          Math.sin(angle) * GAME_CONFIG.ball.speed,
          Math.cos(angle) * GAME_CONFIG.ball.speed,
          0
        );
      } else {
        const retryTimer = setTimeout(() => setCountdown(0), 100); 
        return () => clearTimeout(retryTimer);
      }
    }
  }, [countdown, ballApi]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !ballLaunched && !gameOver && !gameComplete) {
        startGame();
      } else if (e.key.toLowerCase() === 'r') {
        window.location.reload();
      }

      setKeys((prev) => ({
        ...prev,
        left: e.key === 'ArrowLeft' ? true : prev.left,
        right: e.key === 'ArrowRight' ? true : prev.right,
        up: e.key === 'ArrowUp' ? true : prev.up,
        down: e.key === 'ArrowDown' ? true : prev.down,
      }));
    };

    const handleKeyUp = (e) => {
      setKeys((prev) => ({
        ...prev,
        left: e.key === 'ArrowLeft' ? false : prev.left,
        right: e.key === 'ArrowRight' ? false : prev.right,
        up: e.key === 'ArrowUp' ? false : prev.up,
        down: e.key === 'ArrowDown' ? false : prev.down,
      }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [ballLaunched, gameOver, gameComplete]);

  return (
    <div className="game-container">
      <Seo page="demo-breakout"/>
      <div className="score">Score: {score}</div>
      <div className="info">
        <div className="controls">
          <span><b>Controls:</b></span>
          <span>'space' to start game, 'r' to restart.</span>
          <span>'left' and 'right' to move paddle.</span>
        </div>
        <div className="github-link-btn"><a href='https://github.com/neberej/breakout' target="_blank">View on Github</a></div>
      </div>
      {!ballLaunched && countdown === null && (
        <div className="button-container">
          <button className="menu-button" onClick={startGame}>
            Start Game
          </button>
        </div>
      )}
      {countdown !== null && (
        <div className="countdown">Starting in {countdown}...</div>
      )}
      {gameOver && (
        <div className="game-over">
          <div className="game-over-message">Game Over!</div>
          <button className="menu-button reset-button" onClick={() => window.location.reload()}>Play Again</button>
        </div>
      )}
      {gameComplete && (
        <div className="game-over">
          <div className="game-over-message">Game Complete! Well done!!</div>
          <button className="menu-button reset-button" onClick={() => window.location.reload()}>Play Again</button>
        </div>
      )}
      <Canvas shadows="basic" gl={{ alpha: true }} camera={{ position: GAME_CONFIG.camera.position, fov: GAME_CONFIG.camera.fov }}>
        <ambientLight intensity={GAME_CONFIG.lighting.ambientIntensity} />
        <pointLight position={GAME_CONFIG.lighting.pointLight.position} intensity={GAME_CONFIG.lighting.pointLight.intensity} castShadow shadow-mapSize={GAME_CONFIG.lighting.pointLight.shadowMapSize} />
        <directionalLight position={GAME_CONFIG.lighting.directionalLight.position} intensity={GAME_CONFIG.lighting.directionalLight.intensity} castShadow shadow-mapSize={GAME_CONFIG.lighting.directionalLight.shadowMapSize} />
        <Physics gravity={[0, 0, 0]} allowSleep={false}>
          <GameControls keys={keys} ballLaunched={ballLaunched} gameOver={gameOver || gameComplete} setPaddlePosition={setPaddlePosition} setBallPosition={setBallPosition} paddlePosition={paddlePosition} />
          <Paddle position={paddlePosition} />
          <Ball
            paddlePosition={paddlePosition}
            ballPosition={ballPosition}
            bricks={bricks}
            setBricks={setBricks}
            setScore={setScore}
            setBallApi={setBallApi}
            setGameOver={setGameOver}
            setGameComplete={setGameComplete}
            ballLaunched={ballLaunched}
            gameOver={gameOver}
            gameComplete={gameComplete}
            onPaddleHit={() => setPaddleHit(prev => prev + 1)}
            onBrickHit={(brickPos) => {
              setBrickHit(prev => prev + 1);
              setBrickHitPosition(brickPos);
            }}
          />
          <ParticleEffect trigger={paddleHit} position={paddlePosition} />
          <ParticleEffect trigger={brickHit} position={brickHitPosition} />
          {bricks.map((brick) => (
            <Brick key={brick.id} id={brick.id} position={brick.position} />
          ))}
          <Wall name="bottom-wall" position={GAME_CONFIG.walls.bottom.position} args={isMobile ? GAME_CONFIG.walls.bottom.args.mobile : GAME_CONFIG.walls.bottom.args.desktop} />
          <Wall name="left-wall" position={GAME_CONFIG.walls.left.position} args={GAME_CONFIG.walls.left.args} />
          <Wall name="right-wall" position={GAME_CONFIG.walls.right.position} args={GAME_CONFIG.walls.right.args} />
          <Wall name="top-wall" position={GAME_CONFIG.walls.top.position} args={isMobile ? GAME_CONFIG.walls.top.args.mobile : GAME_CONFIG.walls.top.args.desktop} />
        </Physics>
      </Canvas>
    </div>
  );
};

export default App;