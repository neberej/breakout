
export const GAME_CONFIG = {
  ball: {
    speed: 9,
    slowSpeed: 0.3,
    radius: 0.3,
    restitution: 0.9,
    friction: 0.1,
    sleepSpeedLimit: 0.1,
    segments: 64,
    whiteCircle: { radius: 0.5, segments: 32, scale: 0.2, zOffset: 0.2 }
  },
  paddle: {
    speed: 8,
    width: 3,
    height: 0.4,
    depth: 0.8,
    restitution: 0.9,
    friction: 0.1,
    radius: 0.1,
    scale: 1.05,
    zPosition: -0.4 ,
    yPosition: -5.5
  },
  countdownDuration: 2,
  breakEffect: {
    duration: 1000,
    particleCount: 4,
    particleSize: 0.08,
    particleSegments: 16,
    particleSpread: 2,
    particleLife: 0.1,
    particleColor: '#e6f0ff'
  },
  gameBounds: {
    desktop: { xMin: -6.2, xMax: 6.2, yMin: -6, yMax: 6 },
    mobile: { xMin: -3.2, xMax: 3.2, yMin: -3.7, yMax: 3.7 }
  },
  wallBounds: {
    desktop: { xMin: -6.5, xMax: 6.5, yMin: -6, yMax: 6 },
    mobile: { xMin: -3.7, xMax: 3.7, yMin: -3.7, yMax: 3.7, cornerBuffer: 0.3 }
  },
  brick: {
    colors: {
      'show hn': '#ff3333',
      'ask hn': '#3333ff',
      'launch hn': '#262626',
      'story': '#008000'
    },
    size: {
      desktop: [2, 0.8, 0.6],
      mobile: [1.2, 0.8, 0.4]
    },
    spacingX: { desktop: 2.2, mobile: 1.2 },
    rows: 0,
    columns: 0,
    yStart: 5,
    yStep: 1,
    xCenterOffset: 0
  },
  walls: {
    bottom: { position: [0, -7, 0], args: { desktop: [16, 0.1, 1], mobile: [7, 0.1, 1] }, restitution: 1, friction: 0 },
    left: { position: [-7, 0, 0], args: [0.5, 20, 1], restitution: 1, friction: 0, nudge: 0 },
    right: { position: [7, 0, 0], args: [0.5, 20, 1], restitution: 1, friction: 0, nudge: -0.05 },
    top: { position: [0, 7, 0], args: { desktop: [16, 0.3, 1], mobile: [7, 0.3, 1] }, restitution: 1, friction: 0 }
  },
  collision: {
    brickCooldown: 1000,
    paddleCooldown: 300,
    maxBounceAngle: Math.PI / 3,
    minBounceAngle: Math.PI / 18,
    scorePerBrick: 5
  },
  lighting: {
    ambientIntensity: 1,
    pointLight: { position: [10, 10, 10], intensity: 2.0, shadowMapSize: [1024, 1024] },
    directionalLight: { position: [0, 10, 5], intensity: 1.0, shadowMapSize: [1024, 1024] }
  },
  camera: { position: [0, 0, 15], fov: 50 },
  fallingText: {
    duration: 8000,
    paddleProximityThreshold: 1
  },
  messages: {
    over: 'Oops, try again?',
    complete: 'Wohoo, you have seen the top 12 stories of today!',
    paused: 'Game Paused',
    resume: "Press 'x' to resume"
  }
};
