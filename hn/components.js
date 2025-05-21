
import React, { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useBox, useSphere } from '@react-three/cannon';
import { MeshStandardMaterial } from 'three';

import Seo from "@section/Seo"
import Brick from './../shared/brick/brick';
import FallingText from './../shared/fallingText/fallingText';
import "./../shared/breakout.scss";
import "./hnBreakout.scss";
import { GAME_CONFIG } from './config-hn';
import { getData } from './api';

const ParticleEffect = ({ trigger, position }) => {
  const particlesRef = useRef();
  const [particles, setParticles] = useState([]);
  const lastTrigger = useRef(0);

  useEffect(() => {
    if (trigger > lastTrigger.current) {
      const newParticles = Array.from({ length: GAME_CONFIG.breakEffect.particleCount }, () => ({
        position: [
          position[0] + (Math.random() - 0.5) * GAME_CONFIG.breakEffect.particleSpread,
          position[1] + (Math.random() - 0.5) * 0.8,
          position[2] + (Math.random() - 0.5) * 0.6,
        ],
        velocity: [
          (Math.random() - 0.5) * 0.5,
          Math.random() * 0.5 + 0.2,
          (Math.random() - 0.5) * 0.5,
        ],
        opacity: 1,
        life: GAME_CONFIG.breakEffect.particleLife,
      }));
      setParticles(newParticles);
      lastTrigger.current = trigger;
    }
  }, [trigger, position]);

  useFrame((_, delta) => {
    setParticles((prev) =>
      prev
        .map((p) => ({
          ...p,
          position: [
            p.position[0] + p.velocity[0] * delta,
            p.position[1] + p.velocity[1] * delta,
            p.position[2] + p.velocity[2] * delta,
          ],
          opacity: p.opacity - delta / p.life,
          life: p.life - delta,
        }))
        .filter((p) => p.opacity > 0)
    );
  });

  if (particles.length === 0) return null;

  return (
    <group ref={particlesRef}>
      {particles.map((p, i) => (
        <mesh key={i} position={p.position}>
          <sphereGeometry args={[GAME_CONFIG.breakEffect.particleSize, GAME_CONFIG.breakEffect.particleSegments, GAME_CONFIG.breakEffect.particleSegments]} />
          <meshBasicMaterial color={GAME_CONFIG.breakEffect.particleColor} transparent opacity={p.opacity} />
        </mesh>
      ))}
    </group>
  );
};

const Paddle = ({ position }) => {
  const [ref, api] = useBox(() => ({
    mass: 0,
    position: [position[0], position[1] - 0.1, GAME_CONFIG.paddle.zPosition], // Offset physics box downward by 0.1
    args: [GAME_CONFIG.paddle.width, GAME_CONFIG.paddle.height, GAME_CONFIG.paddle.depth],
    type: "Static",
    name: "paddle",
    userData: { name: "paddle" },
    restitution: GAME_CONFIG.paddle.restitution,
    friction: GAME_CONFIG.paddle.friction,
  }));

  useEffect(() => {
    api.position.set(position[0], position[1] - 0.1, GAME_CONFIG.paddle.zPosition);
  }, [position, api]);

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const w = GAME_CONFIG.paddle.width;
    const h = GAME_CONFIG.paddle.height;
    const radius = GAME_CONFIG.paddle.radius;

    shape.moveTo(-w / 2 + radius, -h / 2);
    shape.lineTo(w / 2 - radius, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + radius);
    shape.lineTo(w / 2, h / 2 - radius);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - radius, h / 2);
    shape.lineTo(-w / 2 + radius, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - radius);
    shape.lineTo(-w / 2, -h / 2 + radius);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + radius, -h / 2);

    const extrudeSettings = {
      depth: GAME_CONFIG.paddle.depth,
      bevelEnabled: false,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  return (
    <group ref={ref} scale={[GAME_CONFIG.paddle.scale, GAME_CONFIG.paddle.scale, GAME_CONFIG.paddle.scale]}>
      <mesh castShadow receiveShadow geometry={geometry} position={[0, 0.1, 0]}> {/* Offset visual mesh upward by 0.1 */}
        <meshPhysicalMaterial color="#b3dbf2" roughness={0.3} metalness={0.1} clearcoat={0.2} clearcoatRoughness={0.15} envMapIntensity={0.8} thickness={0.5} />
      </mesh>
      <lineSegments renderOrder={1} position={[0, 0.1, 0]}> {/* Offset edges upward by 0.1 */}
        <edgesGeometry attach="group" args={[geometry]} />
        <lineBasicMaterial attach="material" color="#d0e7ff" transparent opacity={0.8} depthTest={false} />
      </lineSegments>
    </group>
  );
};

const Ball = ({ paddlePosition, ballPosition, bricks, setBricks, setScore, setBallApi, setGameOver, setGameComplete, ballLaunched, gameOver, gameComplete, onPaddleHit, onBrickHit, setFallingTexts, fallingTexts, setBrickHitCount, isPaused }) => {
  const ballLaunchedRef = useRef(ballLaunched);
  const lastPaddleCollision = useRef(0);
  const lastBrickCollision = useRef(0);
  const justUnpaused = useRef(false);

  useEffect(() => {
    ballLaunchedRef.current = ballLaunched;
  }, [ballLaunched]);

  useEffect(() => {
    ballLaunchedRef.current = ballLaunched && !gameOver && !gameComplete;
  }, [ballLaunched, gameOver, gameComplete]);

  const [ref, api] = useSphere(() => ({
    mass: 1,
    position: [ballPosition[0], ballPosition[1], 0],
    args: [GAME_CONFIG.ball.radius],
    velocity: [0, 0, 0],
    restitution: GAME_CONFIG.ball.restitution,
    friction: GAME_CONFIG.ball.friction,
    sleepSpeedLimit: GAME_CONFIG.ball.sleepSpeedLimit,
    onCollide: (e) => {
      const bodyName = e.body?.userData?.name || e.body?.name || '<undefined>';
      if (!ballLaunchedRef.current || gameOver || gameComplete || isPaused) {
        return;
      }
      const now = Date.now();
      if (bodyName.includes('brick-')) {
        if (now - lastBrickCollision.current > GAME_CONFIG.collision.brickCooldown) {
          lastBrickCollision.current = now;
          const brickId = bodyName.replace('brick-', '');
          setBricks((prev) => {
            const brick = prev.find((b) => b.id === brickId);
            if (brick) {
              setScore((prevScore) => prevScore + GAME_CONFIG.collision.scorePerBrick);
              setBrickHitCount((prev) => prev + 1);
              onBrickHit(brick.position);
              setFallingTexts((prev) => {
                const newText = {id: `${brickId}-${now}`, title: brick.title, desc: brick.desc, vote: brick.vote, url: brick.url, position: brick.position, startTime: now, gameY: brick.position[1] };
                return prev.length > 0 ? [newText] : [...prev, newText];
              });
              const newBricks = prev.filter((b) => b.id !== brickId);
              if (newBricks.length === 0) {
                api.position.set(0, -5.0, 0);
                api.velocity.set(0, 0, 0);
                api.mass.set(0);
                setBallApi(null);
                setGameComplete(true);
              }
              return newBricks;
            }
            return prev;
          });
          api.velocity.subscribe(([vx, vy, vz]) => {
            const speed = GAME_CONFIG.ball.slowSpeed;
            const randomAngle = (Math.random() * (Math.PI / 3) - Math.PI / 6);
            const newVx = Math.cos(randomAngle) * speed;
            const newVy = -Math.abs(Math.sin(randomAngle) * speed) - 0.2;
            api.velocity.set(newVx, newVy, 0);
          });
        }
      } else if (bodyName === 'bottom-wall') {
        api.position.set(0, -5.0, 0);
        api.velocity.set(0, 0, 0);
        api.mass.set(0);
        setBallApi(null);
        setGameOver(true);
      } else if (bodyName === 'paddle' && now - lastPaddleCollision.current > GAME_CONFIG.collision.paddleCooldown) {
        lastPaddleCollision.current = now;
        onPaddleHit();
        const paddleX = paddlePosition[0];
        const ballX = ref.current?.position.x || 0;
        const impactPosition = (ballX - paddleX) / (GAME_CONFIG.paddle.width / 2);
        const maxBounceAngle = GAME_CONFIG.collision.maxBounceAngle;
        const minBounceAngle = GAME_CONFIG.collision.minBounceAngle;
        let bounceAngle = impactPosition * maxBounceAngle;
        bounceAngle = Math.sign(bounceAngle) * Math.max(minBounceAngle, Math.abs(bounceAngle));
        const randomVariation = (Math.random() * (2 - 1) + 1) * (Math.PI / 180) * (Math.random() < 0.5 ? 1 : -1);
        bounceAngle += randomVariation;
        const isTextNearPaddle = fallingTexts.length > 0 && fallingTexts.some(text => {
          const textY = text.gameY - (Date.now() - text.startTime) / GAME_CONFIG.fallingText.duration * (GAME_CONFIG.gameBounds.desktop.yMax - GAME_CONFIG.gameBounds.desktop.yMin + 2);
          return textY <= GAME_CONFIG.paddle.yPosition + GAME_CONFIG.fallingText.paddleProximityThreshold;
        });
        const targetSpeed = fallingTexts.length > 0 && !isTextNearPaddle ? GAME_CONFIG.ball.slowSpeed : GAME_CONFIG.ball.speed;

        api.velocity.set(Math.sin(bounceAngle) * targetSpeed, Math.cos(bounceAngle) * targetSpeed, 0);
      } else if (['left-wall', 'right-wall', 'top-wall'].includes(bodyName)) {
        api.velocity.subscribe(([vx, vy, vz]) => {
          const newVx = bodyName === 'top-wall' ? vx : -vx;
          const newVy = bodyName === 'top-wall' ? -vy : vy;
          const nudge = bodyName === 'left-wall' ? 0.1 : bodyName === 'right-wall' ? -0.1 : 0;
          api.velocity.set(newVx + nudge, newVy, 0);
        });
      }
    },
  }));

  useEffect(() => {
    if (!ballLaunched || gameOver || gameComplete) {
      api.position.set(ballPosition[0], ballPosition[1], 0);
      api.velocity.set(0, 0, 0);
      api.mass.set(0);
      if (gameOver || gameComplete) {
        api.sleep();
      }
    }
  }, [ballPosition, api, ballLaunched, gameOver, gameComplete]);

  useEffect(() => {
    setBallApi(api);
    return () => setBallApi(null);
  }, [api, setBallApi]);

  useFrame(() => {
    if (ballLaunched && !gameOver && !gameComplete && !isPaused) {
      api.velocity.subscribe(([vx, vy]) => {
        const speed = Math.sqrt(vx * vx + vy * vy);
        const isTextNearPaddle = fallingTexts.length > 0 && fallingTexts.some(text => {
          const textY = text.gameY - (Date.now() - text.startTime) / GAME_CONFIG.fallingText.duration * (GAME_CONFIG.gameBounds.desktop.yMax - GAME_CONFIG.gameBounds.desktop.yMin + 2);
          return textY <= GAME_CONFIG.paddle.yPosition + GAME_CONFIG.fallingText.paddleProximityThreshold;
        });
        const targetSpeed = fallingTexts.length > 0 && !isTextNearPaddle ? GAME_CONFIG.ball.slowSpeed : GAME_CONFIG.ball.speed;
        if (speed > 0) {
          const nx = vx / speed;
          const ny = vy / speed;
          const correctedVx = nx * targetSpeed;
          const correctedVy = ny * targetSpeed;
          const TOLERANCE = 0.01;
          const finalVx = Math.abs(correctedVx) < TOLERANCE ? 0 : correctedVx;
          api.velocity.set(finalVx, correctedVy, 0);
        }
      });
    }
    if (justUnpaused.current) {
      api.wakeUp();
      justUnpaused.current = false;
    }
  });

  if (gameOver || gameComplete) return null;

  return (
    <group ref={ref} castShadow receiveShadow>
      <mesh>
        <sphereGeometry args={[GAME_CONFIG.ball.radius, GAME_CONFIG.ball.segments, GAME_CONFIG.ball.segments]} />
        <meshStandardMaterial color="red" metalness={0.7} roughness={0.05} />
      </mesh>
      <mesh position={[0, 0, GAME_CONFIG.ball.whiteCircle.zOffset]} scale={GAME_CONFIG.ball.whiteCircle.scale}>
        <circleGeometry args={[GAME_CONFIG.ball.whiteCircle.radius, GAME_CONFIG.ball.whiteCircle.segments]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </group>
  );
};

const Wall = ({ position, args, name }) => {
  const isMobile = window.innerWidth <= 480;
  const bounds = GAME_CONFIG.wallBounds[isMobile ? 'mobile' : 'desktop'];
  const adjustedPosition = name === 'left-wall' ? [bounds.xMin, position[1], position[2]] :
                         name === 'right-wall' ? [bounds.xMax, position[1], position[2]] :
                         position;
  const adjustedArgs = name === 'bottom-wall' || name === 'top-wall' ? [isMobile ? 6 : 16, args[1], args[2]] : args;

  const [ref] = useBox(() => ({
    mass: 0,
    position: adjustedPosition,
    args: adjustedArgs,
    type: 'Static',
    name,
    userData: { name },
    restitution: 1,
    friction: 0,
  }));

  return (
    <mesh ref={ref}>
      <boxGeometry args={args} />
      <meshStandardMaterial color="transparent" />
    </mesh>
  );
};

const GameControls = ({ keys, ballLaunched, gameOver, setPaddlePosition, setBallPosition, paddlePosition, isPaused }) => {
  const isMobile = window.innerWidth <= 480;
  const bounds = GAME_CONFIG.gameBounds[isMobile ? 'mobile' : 'desktop'];
  const paddleXMin = bounds.xMin + GAME_CONFIG.paddle.width / 2;
  const paddleXMax = bounds.xMax - GAME_CONFIG.paddle.width / 2;

  useFrame(() => {
    if (isPaused) return;
    if (!ballLaunched && !gameOver) {
      setPaddlePosition(([x, y, z]) => {
        let newX = x;
        if (keys.left && x > paddleXMin) newX -= GAME_CONFIG.paddle.speed / 60;
        if (keys.right && x < paddleXMax) newX += GAME_CONFIG.paddle.speed / 60;
        return [Math.max(paddleXMin, Math.min(paddleXMax, newX)), y, z];
      });
      setBallPosition(([x, y, z]) => {
        let newY = y;
        return [paddlePosition[0], newY, z];
      });
    } else if (!gameOver) {
      setPaddlePosition(([x, y, z]) => {
        let newX = x;
        if (keys.left && x > paddleXMin) newX -= GAME_CONFIG.paddle.speed / 60;
        if (keys.right && x < paddleXMax) newX += GAME_CONFIG.paddle.speed / 60;
        return [Math.max(paddleXMin, Math.min(paddleXMax, newX)), y, z];
      });
    }
  });
  return null;
};

export {
	ParticleEffect,
	Ball,
	GameControls,
	Wall,
	Paddle
}
