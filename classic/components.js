
import React, { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useBox, useSphere } from '@react-three/cannon';
import { MeshStandardMaterial } from 'three';

import Seo from "@section/Seo"
import FallingText from './../shared/fallingText/fallingText';
import "./../shared/breakout.scss";
import { GAME_CONFIG } from './config-classic';

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

const Ball = ({ paddlePosition, ballPosition, bricks, setBricks, setScore, setBallApi, setGameOver, setGameComplete, ballLaunched, gameOver, gameComplete, onPaddleHit, onBrickHit }) => {
  const ballLaunchedRef = useRef(ballLaunched);
  const lastPaddleCollision = useRef(0);
  const lastBrickCollision = useRef(0);

  useEffect(() => {
    ballLaunchedRef.current = ballLaunched;
    console.log('ballLaunched updated:', ballLaunched);
  }, [ballLaunched]);

  useEffect(() => {
    ballLaunchedRef.current = ballLaunched && !gameOver && !gameComplete;
  }, [ballLaunched, gameOver, gameComplete]);

  const [ref, api] = useSphere(() => ({
    mass: gameOver || gameComplete ? 0 : 1,
    position: [ballPosition[0], ballPosition[1], 0],
    args: [GAME_CONFIG.ball.radius],
    velocity: [0, 0, 0],
    restitution: GAME_CONFIG.ball.restitution,
    friction: GAME_CONFIG.ball.friction,
    sleepSpeedLimit: GAME_CONFIG.ball.sleepSpeedLimit,
    onCollide: (e) => {
      const bodyName = e.body?.userData?.name || e.body?.name || '<undefined>';
      console.log('Collision detected with:', bodyName); // Debug log
      if (!ballLaunchedRef.current || gameOver || gameComplete) {
        console.log('Collision ignored due to:', { ballLaunched: ballLaunchedRef.current, gameOver, gameComplete }); // Debug log
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
              onBrickHit(brick.position); // Trigger brick particle effect
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
            api.velocity.set(vx, -Math.abs(vy), 0);
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
        console.log('Paddle hit, triggering particle effect'); // Debug log
        onPaddleHit();
        const paddleX = paddlePosition[0];
        const ballX = ref.current?.position.x || 0;
        const impactPosition = (ballX - paddleX) / (GAME_CONFIG.paddle.width / 2);
        const maxBounceAngle = GAME_CONFIG.collision.maxBounceAngle;
        const bounceAngle = Math.max(-maxBounceAngle, Math.min(maxBounceAngle, impactPosition * maxBounceAngle));
        api.velocity.set(
          Math.sin(bounceAngle) * GAME_CONFIG.ball.speed,
          Math.max(0.5 * GAME_CONFIG.ball.speed, Math.cos(bounceAngle) * GAME_CONFIG.ball.speed),
          0
        );
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
    console.log('Setting ballApi:', api); // Debug log
    setBallApi(api);
    return () => setBallApi(null);
  }, [api, setBallApi]);

  useFrame(() => {
    if (ballLaunched && !gameOver && !gameComplete) {
      api.velocity.subscribe(([vx, vy]) => {
        const speed = Math.sqrt(vx * vx + vy * vy);
        const targetSpeed = GAME_CONFIG.ball.speed;
        const nx = speed > 0 ? vx / speed : 0;
        const ny = speed > 0 ? vy / speed : 1;
        const correctedVx = nx * targetSpeed;
        const correctedVy = ny * targetSpeed;
        const TOLERANCE = 0.01;
        const finalVx = Math.abs(correctedVx) < TOLERANCE ? 0 : correctedVx;
        api.velocity.set(finalVx, correctedVy, 0);
      });
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

const Brick = ({ position, id }) => {
  const isMobile = window.innerWidth <= 480;
  const brickSize = isMobile ? GAME_CONFIG.brick.size.mobile : GAME_CONFIG.brick.size.desktop;
  const [ref] = useBox(() => ({
    mass: 0,
    position,
    args: brickSize,
    type: "Static",
    name: `brick-${id}`,
    userData: { name: `brick-${id}` },
    restitution: 1,
    friction: 0,
  }));

  // Create rugged brick geometry
  const geometry = useMemo(() => {
    const baseGeometry = new THREE.BoxGeometry(brickSize[0], brickSize[1], brickSize[2]);
    const vertices = baseGeometry.attributes.position;
    
    for (let i = 0; i < vertices.count; i++) {
      const offset = (Math.random() - 0.5) * 0.05; // Random ruggedness
      vertices.setX(i, vertices.getX(i) + offset);
      vertices.setY(i, vertices.getY(i) + offset);
      vertices.setZ(i, vertices.getZ(i) + offset);
    }
    vertices.needsUpdate = true;
    return baseGeometry;
  }, []);

  const material = useMemo(() => (
    new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.brick.colors[Math.floor(Math.random() * GAME_CONFIG.brick.colors.length)],
      metalness: 0.2,
      roughness: 0.6,
      flatShading: true // Flat shading for rugged edges
    })
  ), []);

  return (
    <group ref={ref}>
      <mesh castShadow receiveShadow geometry={geometry} material={material} />
      <lineSegments>
        <edgesGeometry attach="geometry" args={[geometry]} />
        <lineBasicMaterial attach="material" color="#2c2c2c" linewidth={1} />
      </lineSegments>
    </group>
  );
};

export {
	ParticleEffect,
	Ball,
	GameControls,
	Wall,
	Paddle,
  Brick
}
