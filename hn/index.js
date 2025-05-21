
import React, { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useBox, useSphere } from '@react-three/cannon';
import { MeshStandardMaterial } from 'three';

import Brick from './../shared/brick/brick';
import FallingText from './../shared/fallingText/fallingText';
import "./../shared/breakout.scss";
import "./hnBreakout.scss";
import { GAME_CONFIG } from './config-hn';
import { getData } from './api';
import { ParticleEffect, Ball, GameControls, Wall, Paddle } from './components';
import Infobar from './infobar';

const App = () => {
  const bounds = GAME_CONFIG.gameBounds[isMobile ? 'mobile' : 'desktop'];
  const [paddlePosition, setPaddlePosition] = useState([0, bounds.yMin + 0.5, GAME_CONFIG.paddle.zPosition]);
  const [ballPosition, setBallPosition] = useState([0, bounds.yMin + 1.2, 0]);
  const isMobile = window.innerWidth <= 480;
  const brickSpacingX = isMobile ? GAME_CONFIG.brick.spacingX.mobile : GAME_CONFIG.brick.spacingX.desktop;
  const [bricks, setBricks] = useState([]);
  const [score, setScore] = useState(0);
  const [brickHitCount, setBrickHitCount] = useState(0);
  const [ballLaunched, setBallLaunched] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [gameComplete, setGameComplete] = useState(false);
  const [ballApi, setBallApi] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [keys, setKeys] = useState({ left: false, right: false, up: false, down: false });
  const [paddleHit, setPaddleHit] = useState(0);
  const [brickHit, setBrickHit] = useState(0);
  const [brickHitPosition, setBrickHitPosition] = useState([0, 0, 0]);
  const [fallingTexts, setFallingTexts] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [ballState, setBallState] = useState(null);

  useEffect(() => {
    getData().then(data => {
      const columns = Math.min(6, data.length);
      const rows = Math.ceil(data.length / 6);
      const xCenterOffset = columns / 2 - 0.5;
      
      GAME_CONFIG.brick.rows = rows;
      GAME_CONFIG.brick.columns = columns;
      GAME_CONFIG.brick.xCenterOffset = xCenterOffset;

      setBricks(data.map((brick, index) => ({
        id: `brick-${index}`,
        position: [
          (index % columns - xCenterOffset) * brickSpacingX,
          GAME_CONFIG.brick.yStart - Math.floor(index / columns) * GAME_CONFIG.brick.yStep,
          0
        ],
        title: brick.title,
        type: brick.type,
        desc: brick.desc,
        vote: brick.vote,
        storyType: brick.storyType,
        url: brick.url
      })));
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setFallingTexts((prev) => {
        return prev.filter((text) => {
          const elapsed = now - text.startTime;
          return elapsed < GAME_CONFIG.fallingText.duration;
        });
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const startGame = () => {
    if (!ballLaunched && countdown === null && !isPaused) {
      setCountdown(GAME_CONFIG.countdownDuration);
      setGameOver(false);
      setGameComplete(false);
      if (ballApi) {
        ballApi.position.set(0, -5.0, 0);
        ballApi.velocity.set(0, 0, 0);
        ballApi.mass.set(0);
        setShowInfo(false);
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
      if (e.key.toLowerCase() === 'c' && fallingTexts.length > 0) {
        const latestText = fallingTexts[fallingTexts.length - 1];
        if (latestText.url) {
          window.open(latestText.url, '_blank');
        }
        if (ballApi && !isPaused) {
          setIsPaused(true);
          setFallingTexts([]);
          ballApi.position.subscribe(([x, y, z]) => {
            ballApi.velocity.subscribe(([vx, vy, vz]) => {
              setBallState({ position: [x, y, z], velocity: [vx, vy, vz] });
            });
          });
        }
      } else if (e.key.toLowerCase() === 'd' && fallingTexts.length > 0 && !isPaused) {
        setFallingTexts([]);
      }
      if (isPaused) {
        if (e.key.toLowerCase() === 'x') {
          setIsPaused(false);
          if (ballApi && ballState) {
            ballApi.position.set(ballState.position[0], ballState.position[1], ballState.position[2]);
            ballApi.velocity.set(ballState.velocity[0], ballState.velocity[1], ballState.velocity[2]);
            ballApi.wakeUp();
          }
          setBallState(null);
        }
        return;
      }
      if (e.key === ' ') {
        if (!ballLaunched && !gameOver && !gameComplete) {
          startGame();
        }
        if (gameOver || gameComplete) {
          window.location.reload();
        }
      } else if (e.key.toLowerCase() === 'p') {
        if (ballApi) {
          setIsPaused(true);
          ballApi.position.subscribe(([x, y, z]) => {
            ballApi.velocity.subscribe(([vx, vy, vz]) => {
              setBallState({ position: [x, y, z], velocity: [vx, vy, vz] });
            });
          });
        }
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
  }, [ballLaunched, gameOver, gameComplete, fallingTexts, isPaused, ballApi, ballState]);
  console.log(isMobile, showInfo, gameOver, gameComplete)
  return (
    <div className="game-container">
      <div className="score">Score: {score} | Bricks Hit: {brickHitCount}</div>
      {!isMobile && <Infobar />}
      {((isMobile && showInfo) || (gameOver || gameComplete)) && <Infobar />}
      {!ballLaunched && countdown === null && !isPaused && (
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
          <div className="game-over-message">{GAME_CONFIG.messages.over}</div>
          <button className="menu-button reset-button" onClick={() => window.location.reload()}>Play Again</button>
        </div>
      )}
      {gameComplete && (
        <div className="game-over">
          <div className="game-over-message">{GAME_CONFIG.messages.complete}</div>
          <button className="menu-button reset-button" onClick={() => window.location.reload()}>Play Again</button>
        </div>
      )}
      {isPaused && (
        <div className="game-paused">
          <div className="game-paused-message">{GAME_CONFIG.messages.paused}</div>
          <div className="game-paused-instruction">{GAME_CONFIG.messages.resume}</div>
        </div>
      )}
      {fallingTexts.map((text) => (
        <FallingText key={text.id} id={text.id} title={text.title} desc={text.desc} vote={text.vote} url={text.url} position={text.position} startTime={text.startTime} />
      ))}
      <Canvas shadows="basic" gl={{ alpha: true }} camera={{ position: GAME_CONFIG.camera.position, fov: GAME_CONFIG.camera.fov }}>
        <ambientLight intensity={GAME_CONFIG.lighting.ambientIntensity} />
        <pointLight position={GAME_CONFIG.lighting.pointLight.position} intensity={GAME_CONFIG.lighting.pointLight.intensity} castShadow shadow-mapSize={GAME_CONFIG.lighting.pointLight.shadowMapSize} />
        <directionalLight position={GAME_CONFIG.lighting.directionalLight.position} intensity={GAME_CONFIG.lighting.directionalLight.intensity} castShadow shadow-mapSize={GAME_CONFIG.lighting.directionalLight.shadowMapSize} />
        <Physics gravity={[0, 0, 0]} allowSleep={false} isPaused={isPaused}>
          <GameControls
            keys={keys}
            ballLaunched={ballLaunched}
            gameOver={gameOver || gameComplete}
            setPaddlePosition={setPaddlePosition}
            setBallPosition={setBallPosition}
            paddlePosition={paddlePosition}
            isPaused={isPaused}
          />
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
            setFallingTexts={setFallingTexts}
            fallingTexts={fallingTexts}
            setBrickHitCount={setBrickHitCount}
            isPaused={isPaused}
          />
          <ParticleEffect trigger={paddleHit} position={paddlePosition} />
          <ParticleEffect trigger={brickHit} position={brickHitPosition} />
          {bricks.map((brick) => (
            <Brick key={brick.id} id={brick.id} position={brick.position} type={brick.type} storyType={brick.storyType} brickType={'hn'} />
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
