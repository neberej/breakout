import React, { useMemo, useEffect } from 'react';
import { useBox } from '@react-three/cannon';
import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import HelvetikerRegular from 'three/examples/fonts/helvetiker_regular.typeface.json';
import { MeshStandardMaterial } from 'three';
import { BRICK_CONFIG } from './brickConfig';

const Brick = ({ position, id, type, storyType, brickType }) => {
  const isMobile = window.innerWidth <= 480;
  const brickSize = isMobile ? BRICK_CONFIG.brick.size.mobile : BRICK_CONFIG.brick.size.desktop;
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

  const font = useMemo(() => new FontLoader().parse(HelvetikerRegular), []);

  const textGeometry = useMemo(() => {
    const text = storyType.toUpperCase();
    const geometry = new TextGeometry(text, {
      font,
      size: isMobile ? 0.1 : 0.2,
      height: 0.05,
      curveSegments: 8,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 3,
    });

    geometry.computeBoundingBox();

    if (geometry.boundingBox) {
      const { min, max } = geometry.boundingBox;
      const xOffset = (max.x + min.x) / 2;
      const yOffset = (max.y + min.y) / 2;
      geometry.translate(-xOffset, -yOffset, 0);
    }

    const position = geometry.attributes.position;
    const noiseStrength = 0.01;

    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);

      position.setX(i, x + (Math.random() - 0.5) * noiseStrength);
      position.setY(i, y + (Math.random() - 0.5) * noiseStrength);
      position.setZ(i, z + (Math.random() - 0.5) * noiseStrength);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();

    return geometry;
  }, [font, storyType, isMobile]);

  const engravedMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: 'white',
        metalness: 0.7,
        roughness: 0.9,
        emissive: '#111111',
      }),
    []
  );

  const geometry = useMemo(() => {
    const baseGeometry = new THREE.BoxGeometry(brickSize[0], brickSize[1], brickSize[2]);
    const vertices = baseGeometry.attributes.position;
    
    for (let i = 0; i < vertices.count; i++) {
      const offset = (Math.random() - 0.5) * 0.05;
      vertices.setX(i, vertices.getX(i) + offset);
      vertices.setY(i, vertices.getY(i) + offset);
      vertices.setZ(i, vertices.getZ(i) + offset);
    }
    vertices.needsUpdate = true;
    return baseGeometry;
  }, [brickSize]);

  const material = useMemo(() => (
    new THREE.MeshStandardMaterial({
      color: brickType === 'hn' ? BRICK_CONFIG.brick.hnColors[type] : '#ffffff',
      metalness: 0.2,
      roughness: 0.6,
      flatShading: true
    })
  ), [type, BRICK_CONFIG]);

  const textMaterial = useMemo(() => (
    new THREE.MeshStandardMaterial({
      color: '#333333',
      metalness: 0.1,
      roughness: 0.8
    })
  ), []);

  return (
    <group ref={ref}>
      <mesh castShadow receiveShadow geometry={geometry} material={material} />
      <mesh
        geometry={textGeometry}
        material={engravedMaterial}
        position={[0, 0, brickSize[2] / 2 - 0.015]}
        castShadow={false}
        receiveShadow={true}
      />
      <lineSegments>
        <edgesGeometry attach="geometry" args={[geometry]} />
        <lineBasicMaterial attach="material" color="#2c2c2c" linewidth={1} />
      </lineSegments>
    </group>
  );
};

export default Brick;