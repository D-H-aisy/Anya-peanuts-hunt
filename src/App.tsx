import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type PointerEvent } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, KeyboardControls, OrbitControls, Text, useKeyboardControls } from '@react-three/drei';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Hand, RotateCcw, Trophy } from 'lucide-react';
import * as THREE from 'three';

type Vec2 = { x: number; z: number };
type Obstacle = { minX: number; maxX: number; minZ: number; maxZ: number };
type TouchInput = Vec2;
type AnyaMood = 'normal' | 'happy' | 'sad' | 'crying';

const FLOOR_LEVEL = 0;
const FLOOR_THICKNESS = .12;
const ANYA_SPRITE_FOOT_INSET = (240/ 240) ;

enum Controls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
  duck = 'duck',
}

const keyMap = [
  { name: Controls.forward, keys: ['ArrowUp', 'KeyW'] },
  { name: Controls.back, keys: ['ArrowDown', 'KeyS'] },
  { name: Controls.left, keys: ['ArrowLeft', 'KeyA'] },
  { name: Controls.right, keys: ['ArrowRight', 'KeyD'] },
  { name: Controls.duck, keys: ['ShiftLeft', 'ShiftRight', 'KeyC'] },
];

const peanutSpots: Vec2[] = [
  { x: -11.7, z: -6.7 }, { x: -8.6, z: -7.1 }, { x: -12.5, z: -3.9 },
  { x: -10.6, z: 4.7 }, { x: -7.8, z: 6.4 }, { x: -12.1, z: 7.5 },
  { x: -3.0, z: -7.3 }, { x: -1.2, z: -5.4 }, { x: 1.6, z: -7.7 },
  { x: -2.5, z: 0.2 }, { x: 1.6, z: 1.4 }, { x: 2.5, z: -2.0 },
  { x: 7.3, z: -7.2 }, { x: 10.8, z: -7.2 }, { x: 12.6, z: -4.4 },
  { x: 7.2, z: 1.8 }, { x: 10.8, z: 1.4 }, { x: 12.3, z: 4.3 },
  { x: 7.7, z: 7.0 }, { x: 11.6, z: 7.2 }, { x: 4.2, z: 7.6 },
  { x: -2.0, z: 7.7 }, { x: 3.0, z: 4.0 }, { x: 0.4, z: 9.0 },
];

const roomName = (x: number, z: number) => {
  if (x < -5 && z < 0) return 'Loid & Yor’s room';
  if (x < -5 && z >= 0) return 'Anya’s room';
  if (x > 5 && z < 0) return 'Kitchen';
  if (x > 5 && z >= 0) return 'Living room';
  return 'Hallway';
};

function Wall({ position, size, color = '#bd8f82', obstacleList }: { position: [number, number, number]; size: [number, number, number]; color?: string; obstacleList: Obstacle[] }) {
  useMemo(() => {
    const [x, , z] = position; const [w, , d] = size;
    obstacleList.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    return null;
  }, [position, size, obstacleList]);
  return <mesh position={position} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.85} /></mesh>;
}

function RoomFloor({ position, size, color, label, labelPosition }: { position: [number, number, number]; size: [number, number]; color: string; label: string; labelPosition: [number, number, number] }) {
  return <>
    <mesh position={[position[0], FLOOR_LEVEL - FLOOR_THICKNESS / 2, position[2]]} receiveShadow><boxGeometry args={[size[0], FLOOR_THICKNESS, size[1]]} /><meshStandardMaterial color={color} roughness={.92} /></mesh>
    <Text position={labelPosition} rotation={[-Math.PI / 2, 0, 0]} fontSize={.27} color="#987b78" anchorX="center" anchorY="middle" letterSpacing={.12}>{label.toUpperCase()}</Text>
  </>;
}

function House({ obstacles }: { obstacles: Obstacle[] }) {
  const wall = (p: [number, number, number], s: [number, number, number], c?: string) => <Wall key={`${p.join('-')}${s.join('-')}`} position={p} size={s} color={c} obstacleList={obstacles} />;
  return <group>
    <mesh position={[0, -.16, 0]} receiveShadow><boxGeometry args={[31, .25, 22]} /><meshStandardMaterial color="#b9a2a0" roughness={1} /></mesh>
    <RoomFloor position={[-9.5, 0, -5.8]} size={[8.5, 7]} color="#d9a99b" label="Bedroom" labelPosition={[-9.5, .08, -8.6]} />
    <RoomFloor position={[-9.5, 0, 4.7]} size={[8.5, 9]} color="#d5b6bd" label="Bedroom" labelPosition={[-9.5, .08, 8.3]} />
    <RoomFloor position={[0, 0, -5.5]} size={[7, 9]} color="#c9b0a0" label="Hall" labelPosition={[0, .08, -8.7]} />
    <RoomFloor position={[8.8, 0, -5.2]} size={[10, 9.5]} color="#d4bd94" label="Kitchen" labelPosition={[8.8, .08, -8.8]} />
    <RoomFloor position={[8.6, 0, 5.3]} size={[10.5, 9.4]} color="#c3b29e" label="Living room" labelPosition={[8.6, .08, 8.5]} />
    <RoomFloor position={[0, 0, 5.6]} size={[7, 9.2]} color="#ceb8b1" label="Hall" labelPosition={[0, .08, 8.6]} />
    {wall([0, 1.45, -10.5], [29, 2.9, .35])}
    {wall([-14.3, 1.45, 0], [.35, 2.9, 20.8])}
    {wall([14.3, 1.45, 0], [.35, 2.9, 20.8])}
    {wall([-9.5, 1.45, -.9], [8.5, 2.9, .3])}
    {wall([-9.5, 1.45, -9.3], [8.5, 2.9, .3])}
    {wall([-5.2, 1.45, -8.8], [.3, 2.9, 1.0])}
    {wall([-5.2, 1.45, 5.8], [.3, 2.9, 8.8])}
    {wall([-9.5, 1.45, 9.9], [8.5, 2.9, .3])}
    {wall([4.1, 1.45, 5.9], [.3, 2.9, 8.8])}
    {wall([4.1, 1.45, -7.2], [.3, 2.9, 6.6])}
    {wall([9.4, 1.45, -.7], [9.8, 2.9, .3])}
    {wall([9.4, 1.45, 9.9], [9.8, 2.9, .3])}
    <Balcony position={[-10.2, 0, 11.15]} />
    <Balcony position={[9.4, 0, 11.15]} />
    <Balcony position={[.1, 0, 11.15]} />
  </group>;
}

function Balcony({ position }: { position: [number, number, number] }) {
  return <group position={position}>
    <mesh position={[0, .04, 0]} receiveShadow><boxGeometry args={[7.2, .1, 2.6]} /><meshStandardMaterial color="#caaea4" /></mesh>
    {[-3.3, -2.2, -1.1, 0, 1.1, 2.2, 3.3].map((x) => <mesh key={x} position={[x, .7, 1.05]} castShadow><boxGeometry args={[.08, 1.4, .08]} /><meshStandardMaterial color="#ead8ca" /></mesh>)}
    <mesh position={[0, 1.32, 1.05]} castShadow><boxGeometry args={[7.2, .12, .12]} /><meshStandardMaterial color="#ead8ca" /></mesh>
  </group>;
}

function Bed({ position, color, obstacles }: { position: [number, number, number]; color: string; obstacles: Obstacle[] }) {
  useMemo(() => { obstacles.push({ minX: position[0] - 1.65, maxX: position[0] + 1.65, minZ: position[2] - 1.35, maxZ: position[2] + 1.35 }); return null; }, [position, obstacles]);
  return <group position={position}>
    <mesh position={[0, .44, 0]} castShadow><boxGeometry args={[3.3, .7, 2.7]} /><meshStandardMaterial color="#76534d" /></mesh>
    <mesh position={[0, .83, .05]} castShadow><boxGeometry args={[3.05, .18, 2.48]} /><meshStandardMaterial color={color} /></mesh>
    <mesh position={[0, 1.02, -.72]} castShadow><boxGeometry args={[2.95, .28, .7]} /><meshStandardMaterial color="#f5e8db" /></mesh>
    <mesh position={[0, .99, .72]} castShadow><boxGeometry args={[2.95, .12, .24]} /><meshStandardMaterial color="#f2d48f" /></mesh>
  </group>;
}

function Sofa({ position, obstacles }: { position: [number, number, number]; obstacles: Obstacle[] }) {
  useMemo(() => { obstacles.push({ minX: position[0] - 2, maxX: position[0] + 2, minZ: position[2] - .7, maxZ: position[2] + .7 }); return null; }, [position, obstacles]);
  return <group position={position}>
    <mesh position={[0, .48, 0]} castShadow><boxGeometry args={[4, .8, 1.4]} /><meshStandardMaterial color="#765477" /></mesh>
    <mesh position={[0, 1.15, -.45]} castShadow><boxGeometry args={[4, 1.15, .35]} /><meshStandardMaterial color="#69486d" /></mesh>
    <mesh position={[-1.32, .88, .06]} castShadow><boxGeometry args={[.8, .55, 1.18]} /><meshStandardMaterial color="#896485" /></mesh>
    <mesh position={[1.32, .88, .06]} castShadow><boxGeometry args={[.8, .55, 1.18]} /><meshStandardMaterial color="#896485" /></mesh>
  </group>;
}

function Kitchen({ obstacles }: { obstacles: Obstacle[] }) {
  useMemo(() => { obstacles.push({ minX: 7, maxX: 10.7, minZ: -6.2, maxZ: -4.3 }); obstacles.push({ minX: 5.4, maxX: 8.4, minZ: -1.5, maxZ: -.4 }); return null; }, [obstacles]);
  return <group>
    <mesh position={[8.8, 1.25, -9]} castShadow><boxGeometry args={[9.5, 2.5, .55]} /><meshStandardMaterial color="#805a55" /></mesh>
    <mesh position={[8.8, 2.55, -9]}><boxGeometry args={[9.5, .08, .58]} /><meshStandardMaterial color="#d9c5a1" /></mesh>
    <mesh position={[8.9, .85, -5.3]} castShadow><boxGeometry args={[3.2, 1.05, 1.25]} /><meshStandardMaterial color="#8b6256" /></mesh>
    <mesh position={[8.9, 1.42, -5.3]}><boxGeometry args={[3.3, .1, 1.3]} /><meshStandardMaterial color="#ead8be" /></mesh>
    <mesh position={[7.1, 1.49, -5.3]}><cylinderGeometry args={[.25, .25, .06, 24]} /><meshStandardMaterial color="#423a3b" /></mesh>
    <mesh position={[10.8, 1.49, -5.3]}><cylinderGeometry args={[.25, .25, .06, 24]} /><meshStandardMaterial color="#423a3b" /></mesh>
    <mesh position={[13.1, 1.35, -8.55]} castShadow><boxGeometry args={[1.4, 2.7, 1.25]} /><meshStandardMaterial color="#aac0b9" /></mesh>
    <mesh position={[13.1, 2.02, -7.9]}><boxGeometry args={[.9, .08, .04]} /><meshStandardMaterial color="#f3ead8" /></mesh>
  </group>;
}

function LivingRoom({ obstacles }: { obstacles: Obstacle[] }) {
  useMemo(() => { obstacles.push({ minX: 6.7, maxX: 10.8, minZ: 4.3, maxZ: 5.7 }); obstacles.push({ minX: 7.3, maxX: 10.2, minZ: 6.2, maxZ: 7.5 }); return null; }, [obstacles]);
  return <group>
    <Sofa position={[8.8, 0, 5]} obstacles={obstacles} />
    <mesh position={[8.8, .35, 7]} castShadow><boxGeometry args={[3.5, .7, 1.1]} /><meshStandardMaterial color="#8c6c57" /></mesh>
    <mesh position={[8.8, .74, 7]}><boxGeometry args={[3.35, .08, 1.03]} /><meshStandardMaterial color="#ddc3a0" /></mesh>
    <mesh position={[12.55, 1.25, 7.85]} castShadow><boxGeometry args={[1.1, 2.2, .32]} /><meshStandardMaterial color="#614b57" /></mesh>
    <mesh position={[12.55, 1.55, 7.64]}><boxGeometry args={[.82, 1.12, .03]} /><meshStandardMaterial color="#b9d1c5" /></mesh>
    <mesh position={[5.6, .08, 5]}><cylinderGeometry args={[1.15, 1.15, .12, 32]} /><meshStandardMaterial color="#cba1a7" /></mesh>
  </group>;
}

function HouseFurniture({ obstacles }: { obstacles: Obstacle[] }) {
  return <><Bed position={[-10.1, 0, -5.8]} color="#d77f9c" obstacles={obstacles} /><Bed position={[-10, 0, 5.1]} color="#8299c9" obstacles={obstacles} />
    <Kitchen obstacles={obstacles} /><LivingRoom obstacles={obstacles} />
    <Sofa position={[-10.2, 0, -8]} obstacles={obstacles} />
    <mesh position={[-1.8, .65, 3.9]} castShadow><boxGeometry args={[2.2, 1.25, .55]} /><meshStandardMaterial color="#986b58" /></mesh>
    <mesh position={[-1.8, 1.3, 3.9]}><boxGeometry args={[2.3, .12, .6]} /><meshStandardMaterial color="#dfc6a5" /></mesh>
  </>;
}

function Peanut({ id, spot, collected }: { id: number; spot: Vec2; collected: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current || collected) return;
    ref.current.rotation.y += .025;
    ref.current.position.y = .42 + Math.sin(clock.elapsedTime * 2.2 + id) * .09;
  });
  return <group ref={ref} position={[spot.x, .42, spot.z]} rotation={[0, 0, .34]} visible={!collected}>
    <mesh position={[0, .19, 0]} scale={[.78, 1.08, .82]} castShadow>
      <sphereGeometry args={[.27, 20, 16]} />
      <meshStandardMaterial color="#c98936" roughness={.8} metalness={0} />
    </mesh>
    <mesh position={[0, -.19, 0]} scale={[.9, 1.18, .9]} castShadow>
      <sphereGeometry args={[.29, 20, 16]} />
      <meshStandardMaterial color="#b9772b" roughness={.82} metalness={0} />
    </mesh>
    <mesh position={[0, 0, 0]} scale={[.58, .55, .65]} castShadow>
      <sphereGeometry args={[.25, 16, 12]} />
      <meshStandardMaterial color="#a96727" roughness={.86} />
    </mesh>
  </group>;
}

function svgToDataUri(svg: string) {
  return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svg)))}`;
}

function anyaExpression(mood: AnyaMood) {
  const eyes = mood === 'happy' ? `
    <path d="M 66 108 Q 78 98 90 108" stroke="#e0829d" stroke-width="3" fill="none" stroke-linecap="round" />
    <path d="M 110 108 Q 122 98 134 108" stroke="#e0829d" stroke-width="3" fill="none" stroke-linecap="round" />
    <ellipse cx="78" cy="128" rx="14" ry="19" fill="#32936f" /><ellipse cx="78" cy="130" rx="9.5" ry="13" fill="#1f5a44" />
    <circle cx="73" cy="118" r="5" fill="#fff" /><circle cx="83" cy="138" r="2.5" fill="#fff" />
    <path d="M 60 120 Q 78 104 96 120" stroke="#2a2a2a" stroke-width="3.5" fill="none" stroke-linecap="round" />
    <ellipse cx="122" cy="128" rx="14" ry="19" fill="#32936f" /><ellipse cx="122" cy="130" rx="9.5" ry="13" fill="#1f5a44" />
    <circle cx="117" cy="118" r="5" fill="#fff" /><circle cx="127" cy="138" r="2.5" fill="#fff" />
    <path d="M 104 120 Q 122 104 140 120" stroke="#2a2a2a" stroke-width="3.5" fill="none" stroke-linecap="round" />`
    : mood === 'crying' ? `
    <path d="M 64 112 Q 78 124 92 112" stroke="#e0829d" stroke-width="3" fill="none" stroke-linecap="round" />
    <path d="M 108 112 Q 122 124 136 112" stroke="#e0829d" stroke-width="3" fill="none" stroke-linecap="round" />
    <path d="M 62 118 C 38 135 45 180 72 190 C 82 175 78 135 62 118 Z" fill="#fff" opacity=".95" />
    <path d="M 65 125 C 50 140 55 172 70 182 C 76 170 72 140 65 125 Z" fill="#70a1ff" opacity=".85" />
    <path d="M 138 118 C 162 135 155 180 128 190 C 118 175 122 135 138 118 Z" fill="#fff" opacity=".95" />
    <path d="M 135 125 C 150 140 145 172 130 182 C 124 170 128 140 135 125 Z" fill="#70a1ff" opacity=".85" />
    <ellipse cx="70" cy="138" rx="8" ry="11" fill="#32936f" /><circle cx="68" cy="134" r="3" fill="#fff" />
    <ellipse cx="130" cy="138" rx="8" ry="11" fill="#32936f" /><circle cx="128" cy="134" r="3" fill="#fff" />`
    : `
    <path d="M 68 112 Q 78 106 88 112" stroke="#e0829d" stroke-width="3" fill="none" stroke-linecap="round" />
    <path d="M 112 112 Q 122 106 132 112" stroke="#e0829d" stroke-width="3" fill="none" stroke-linecap="round" />
    <ellipse cx="78" cy="130" rx="12" ry="16" fill="#32936f" /><ellipse cx="78" cy="132" rx="8" ry="11" fill="#1f5a44" />
    <circle cx="74" cy="122" r="4" fill="#fff" /><circle cx="82" cy="138" r="2" fill="#fff" />
    <path d="M 62 124 Q 78 112 92 124" stroke="#2a2a2a" stroke-width="3.5" fill="none" stroke-linecap="round" />
    <ellipse cx="122" cy="130" rx="12" ry="16" fill="#32936f" /><ellipse cx="122" cy="132" rx="8" ry="11" fill="#1f5a44" />
    <circle cx="118" cy="122" r="4" fill="#fff" /><circle cx="126" cy="138" r="2" fill="#fff" />
    <path d="M 108 124 Q 122 112 138 124" stroke="#2a2a2a" stroke-width="3.5" fill="none" stroke-linecap="round" />`;
  const mouth = mood === 'happy'
    ? `<path d="M 84 152 Q 100 176 116 152 Q 100 164 84 152 Z" fill="#e65c7b" stroke="#c44360" stroke-width="1" />`
    : mood === 'sad'
      ? `<path d="M 88 160 Q 100 150 112 160" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round" />`
      : mood === 'crying'
        ? `<path d="M 80 152 C 78 185 122 185 120 152 Z" fill="#3d2215" stroke="#e65c7b" stroke-width="3" />`
        : `<path d="M 94 154 Q 100 162 106 154 Z" fill="#e65c7b" stroke="#c44360" stroke-width="1" />`;
  return { eyes, mouth };
}

function buildAnyaSvg(mood: AnyaMood) {
  const { eyes, mouth } = anyaExpression(mood);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="400" height="480">
    <defs>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.18" />
      </filter>
    </defs>
    <path d="M 25 110 C 20 170, 50 185, 75 180 C 100 175, 125 175, 125 180 C 150 185, 180 170, 175 110 C 175 60, 100 50, 25 110 Z" fill="#ffb3c6" />
    <path d="M 55 178 Q 100 196 145 178 L 155 210 L 45 210 Z" fill="#1b1f33" />
    <path d="M 78 182 L 100 202 L 122 182" fill="none" stroke="#f2ca4c" stroke-width="3" />
    <path d="M 62 178 Q 100 192 138 178" fill="none" stroke="#ffffff" stroke-width="3" />
    <path d="M 52 92 Q 50 135 74 158 Q 100 180 126 158 Q 150 135 148 92 Q 100 78 52 92 Z" fill="#fff0e1" />
    <g id="horns" filter="url(#shadow)">
      <polygon points="34,80 50,38 68,76" fill="#22252a" />
      <path d="M 36 76 L 66 74" stroke="#f2ca4c" stroke-width="4" stroke-linecap="round" />
      <polygon points="166,80 150,38 132,76" fill="#22252a" />
      <path d="M 164 76 L 134 74" stroke="#f2ca4c" stroke-width="4" stroke-linecap="round" />
    </g>
    <g filter="url(#shadow)">
      <path d="M 44 85 C 30 115, 34 148, 52 165 C 60 142, 54 110, 56 86 Z" fill="#ffb3c6" />
      <path d="M 156 85 C 170 115, 166 148, 148 165 C 140 142, 146 110, 144 86 Z" fill="#ffb3c6" />
    </g>
    <g filter="url(#shadow)">
      <path d="M 56 82 C 68 108, 85 118, 92 110 C 82 92, 75 80, 70 78 Z" fill="#ffb3c6" />
      <path d="M 144 82 C 132 108, 115 118, 108 110 C 118 92, 125 80, 130 78 Z" fill="#ffb3c6" />
      <path d="M 82 78 C 92 108, 108 108, 118 78 Z" fill="#ffc2d1" />
    </g>
    <g id="small-dress-details">
      <path d="M 57 179 Q 46 181 47 193 Q 51 199 59 193 L 63 181 Z" fill="#ffb3c6" />
      <path d="M 143 179 Q 154 181 153 193 Q 149 199 141 193 L 137 181 Z" fill="#ffb3c6" />
      <circle cx="91" cy="190" r="2.5" fill="#f2ca4c" />
      <circle cx="109" cy="190" r="2.5" fill="#f2ca4c" />
    </g>
    <g id="tiny-legs">
      <rect x="74" y="210" width="10" height="20" rx="4" fill="#fff0e1" />
      <ellipse cx="79" cy="232" rx="7" ry="5" fill="#1b1f33" />
      <rect x="116" y="210" width="10" height="20" rx="4" fill="#fff0e1" />
      <ellipse cx="121" cy="232" rx="7" ry="5" fill="#1b1f33" />
    </g>
    <g>${eyes}</g>
    <ellipse cx="66" cy="148" rx="7" ry="4" fill="#ff85a1" opacity="0.45" />
    <ellipse cx="134" cy="148" rx="7" ry="4" fill="#ff85a1" opacity="0.45" />
    <circle cx="100" cy="144" r="1.5" fill="#dca388" />
    <g>${mouth}</g>
    <g id="cap" filter="url(#shadow)">
      <path d="M 45 42 Q 100 22 155 42 Q 165 58 100 55 Q 35 58 45 42 Z" fill="#1b1f33" />
      <path d="M 52 42 Q 100 18 148 42 Q 135 30 100 28 Q 65 30 52 42 Z" fill="#282e4a" />
      <path d="M 48 50 Q 100 58 152 50" fill="none" stroke="#f2ca4c" stroke-width="2.5" />
      <circle cx="100" cy="42" r="5" fill="#f2ca4c" />
      <polygon points="100,34 102,40 108,42 102,44 100,50 98,44 92,42 98,40" fill="#ffffff" />
    </g>
  </svg>`;
}

function AnyaCharacter({ positionRef, crawling, mood }: { positionRef: MutableRefObject<THREE.Vector3>; crawling: boolean; mood: AnyaMood }) {
  const group = useRef<THREE.Group>(null);
  const fallbackBody = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return (['normal', 'happy', 'sad', 'crying'] as AnyaMood[]).reduce<Record<AnyaMood, THREE.Texture>>((all, expression) => {
      const texture = loader.load(svgToDataUri(buildAnyaSvg(expression)));
      texture.colorSpace = THREE.SRGBColorSpace;
      all[expression] = texture;
      return all;
    }, {} as Record<AnyaMood, THREE.Texture>);
  }, []);
  const texture = textures[mood];
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.position.set(positionRef.current.x, FLOOR_LEVEL, positionRef.current.z);
    group.current.rotation.y = Math.atan2(camera.position.x - group.current.position.x, camera.position.z - group.current.position.z);
    group.current.scale.set(1, crawling ? .62 : 1, 1);
    if (fallbackBody.current) fallbackBody.current.visible = !texture.image;
  });
  return <group ref={group}>
    <mesh position={[0, FLOOR_LEVEL + .008, 0]} scale={[1.55, .78, 1]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <circleGeometry args={[.48, 24]} />
      <meshBasicMaterial color="#2a1a22" transparent opacity={.42} depthWrite={false} depthTest={false} />
    </mesh>
    <group ref={fallbackBody} position={[0, 1.05, -.08]}>
      <mesh position={[0, -.08, 0]} castShadow><cylinderGeometry args={[.48, .62, .76, 10]} /><meshStandardMaterial color="#24222c" roughness={.75} /></mesh>
      <mesh position={[0, -.47, 0]}><torusGeometry args={[.55, .045, 7, 18]} /><meshStandardMaterial color="#e8c36d" /></mesh>
      <mesh position={[-.22, -.74, 0]} castShadow><capsuleGeometry args={[.12, .62, 6, 10]} /><meshStandardMaterial color="#fff0e1" /></mesh>
      <mesh position={[.22, -.74, 0]} castShadow><capsuleGeometry args={[.12, .62, 6, 10]} /><meshStandardMaterial color="#fff0e1" /></mesh>
      <mesh position={[-.22, -1.13, .1]} scale={[1.05, .5, 1.55]} castShadow><sphereGeometry args={[.2, 14, 10]} /><meshStandardMaterial color="#28252e" /></mesh>
      <mesh position={[.22, -1.13, .1]} scale={[1.05, .5, 1.55]} castShadow><sphereGeometry args={[.2, 14, 10]} /><meshStandardMaterial color="#28252e" /></mesh>
      <mesh position={[0, .76, .04]} castShadow><sphereGeometry args={[.62, 20, 14]} /><meshStandardMaterial color="#ffe9da" roughness={.8} /></mesh>
      <mesh position={[0, 1.02, .08]} castShadow><sphereGeometry args={[.68, 20, 13]} /><meshStandardMaterial color="#ee9daf" roughness={.72} /></mesh>
      <mesh position={[-.44, 1.02, .1]} rotation={[0, 0, -.18]} castShadow><coneGeometry args={[.2, .55, 3]} /><meshStandardMaterial color="#29232c" /></mesh>
      <mesh position={[.44, 1.02, .1]} rotation={[0, 0, .18]} castShadow><coneGeometry args={[.2, .55, 3]} /><meshStandardMaterial color="#29232c" /></mesh>
    </group>
    <sprite position={[0, FLOOR_LEVEL - ANYA_SPRITE_FOOT_INSET, .16]} scale={[1.55, 1.86, 1]} center={[.5, 0]} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthWrite={false} depthTest={false} />
    </sprite>
  </group>;
}

function Player({ obstacles, crawling, touch, collected, positionRef, onPosition, onCollect }: { obstacles: Obstacle[]; crawling: boolean; touch: TouchInput; collected: number[]; positionRef: MutableRefObject<THREE.Vector3>; onPosition: (v: THREE.Vector3) => void; onCollect: (id: number) => void }) {
  const [, getState] = useKeyboardControls<Controls>();
  const { camera } = useThree();
  const last = useRef(new THREE.Vector3(0, 0, 0));
  const face = useRef(new THREE.Vector3(0, 0, 1));
  const lastPickup = useRef<number | null>(null);
  useFrame((_, delta) => {
    const keys = getState();
    const horizontal = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + touch.x;
    const forwardAmount = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0) + touch.z;
    const forward = new THREE.Vector3(-camera.position.x, 0, -camera.position.z).normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const dir = new THREE.Vector3()
      .addScaledVector(forward, forwardAmount)
      .addScaledVector(right, horizontal);
    if (dir.lengthSq() > 0) {
      dir.normalize();
      const speed = crawling ? 1.55 : 2.85;
      const next = last.current.clone().addScaledVector(dir, speed * Math.min(delta, .04));
      next.x = THREE.MathUtils.clamp(next.x, -13.2, 13.2); next.z = THREE.MathUtils.clamp(next.z, -9.45, 9.45);
      const r = .42;
      const blocked = obstacles.some((o) => next.x + r > o.minX && next.x - r < o.maxX && next.z + r > o.minZ && next.z - r < o.maxZ);
      if (!blocked) { last.current.copy(next); face.current.lerp(dir, .35); }
    }
    const pickupId = peanutSpots.findIndex((spot, id) =>
      !collected.includes(id) && Math.hypot(last.current.x - spot.x, last.current.z - spot.z) < .9
    );
    if (pickupId >= 0 && pickupId !== lastPickup.current) {
      lastPickup.current = pickupId;
      onCollect(pickupId);
    } else if (pickupId < 0) {
      lastPickup.current = null;
    }
    positionRef.current.copy(last.current);
    onPosition(last.current);
  });
  return null;
}

function GameWorld({ collected, onCollect, touch, touchDuck, mood, onPosition }: { collected: number[]; onCollect: (id: number) => void; touch: TouchInput; touchDuck: boolean; mood: AnyaMood; onPosition: (v: THREE.Vector3) => void }) {
  const obstacles = useMemo<Obstacle[]>(() => [], []);
  const positionRef = useRef(new THREE.Vector3(0, 0, 0));
  const keysDuck = useKeyboardControls<Controls>(state => state.duck);
  const crawling = touchDuck || keysDuck;
  return <>
    <ambientLight intensity={1.9} color="#fff1df" />
    <directionalLight position={[-8, 15, 10]} intensity={2.7} color="#fff2d5" castShadow shadow-mapSize={[1024, 1024]} />
    <directionalLight position={[12, 7, -8]} intensity={1.1} color="#efb1b9" />
    <House obstacles={obstacles} /><HouseFurniture obstacles={obstacles} />
    {peanutSpots.map((spot, i) => <Peanut key={i} id={i} spot={spot} collected={collected.includes(i)} />)}
    <Player obstacles={obstacles} crawling={crawling} touch={touch} collected={collected} positionRef={positionRef} onPosition={onPosition} onCollect={onCollect} />
    <AnyaCharacter positionRef={positionRef} crawling={crawling} mood={mood} />
    <OrbitControls makeDefault enablePan={false} minDistance={11} maxDistance={24} minPolarAngle={.6} maxPolarAngle={1.35} target={[0, 0, 0]} />
    <ContactShadows position={[0, 0, 0]} opacity={.26} scale={35} blur={2.4} far={18} />
  </>;
}

function DPad({ onMove }: { onMove: (input: TouchInput) => void }) {
  const bind = (input: TouchInput) => ({
    onPointerDown: (event: PointerEvent) => { event.preventDefault(); event.stopPropagation(); onMove(input); },
    onPointerUp: (event: PointerEvent) => { event.preventDefault(); event.stopPropagation(); onMove({ x: 0, z: 0 }); },
    onPointerCancel: () => onMove({ x: 0, z: 0 }),
    onPointerLeave: () => onMove({ x: 0, z: 0 }),
  });
  return <div className="touch-controls" aria-label="Touch movement controls">
    <button className="dpad-button dpad-up" aria-label="Move forward" {...bind({ x: 0, z: 1 })}><ChevronUp size={21} /></button>
    <button className="dpad-button dpad-left" aria-label="Move left" {...bind({ x: -1, z: 0 })}><ChevronLeft size={21} /></button>
    <button className="dpad-button dpad-down" aria-label="Move backward" {...bind({ x: 0, z: -1 })}><ChevronDown size={21} /></button>
    <button className="dpad-button dpad-right" aria-label="Move right" {...bind({ x: 1, z: 0 })}><ChevronRight size={21} /></button>
  </div>;
}

function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function WebGLFallback({ collected, total, mood }: { collected: number; total: number; mood: AnyaMood }) {
  return <div className="scene-fallback" aria-label="Illustrated home preview">
    <div className="fallback-sky" />
    <div className="fallback-note">
      <span className="fallback-note-dot" />
      <div><strong>3D scene ready</strong><span>Turn on hardware acceleration to play in 3D</span></div>
    </div>
    <div className="floor-plan">
      <div className="fallback-room room-loid"><span>LOID &amp; YOR</span><small>bedroom</small></div>
      <div className="fallback-room room-anya"><span>ANYA</span><small>bedroom</small></div>
      <div className="fallback-room room-kitchen"><span>KITCHEN</span><small>peanuts nearby</small></div>
      <div className="fallback-room room-living"><span>LIVING ROOM</span><small>family time</small></div>
      <div className="fallback-hall"><span>HALLWAY</span></div>
      <div className="fallback-balcony balcony-left" />
      <div className="fallback-balcony balcony-right" />
      <span className="fallback-anya-ground" aria-hidden="true" />
      <img className="fallback-anya-image" src={svgToDataUri(buildAnyaSvg(mood))} alt="Anya in the Forger home" />
      {[0, 1, 2, 3, 4, 5].map((peanut) => <span className={`fallback-peanut peanut-${peanut}`} key={peanut} aria-hidden="true" />)}
    </div>
    <div className="fallback-progress"><strong>{collected} / {total}</strong><span>peanuts found</span></div>
  </div>;
}

function App() {
  const [collected, setCollected] = useState<number[]>([]);
  const [touch, setTouch] = useState<TouchInput>({ x: 0, z: 0 });
  const [touchDuck, setTouchDuck] = useState(false);
  const [finished, setFinished] = useState(false);
  const [toast, setToast] = useState('Find every peanut in the Forger home');
  const [playerPosition, setPlayerPosition] = useState(new THREE.Vector3());
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [lastPickupAt, setLastPickupAt] = useState(() => Date.now());
  const [happyUntil, setHappyUntil] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const lastUiPosition = useRef(new THREE.Vector3());
  const supportsWebGL = useMemo(() => detectWebGL(), []);
  const total = peanutSpots.length;
  const wakuAudio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}anya-waku-waku.mp3`);
    audio.preload = 'auto';
    wakuAudio.current = audio;
    const unlockAudio = () => {
      if (audio.readyState === 0) return;
      audio.muted = true;
      void audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      }).catch(() => {
        audio.muted = false;
      });
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      audio.pause();
      audio.currentTime = 0;
      wakuAudio.current = null;
    };
  }, []);
  const speakPeanutReaction = useCallback(() => {
    const audio = wakuAudio.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }, []);
  const onCollect = useCallback((id: number) => {
    const now = Date.now();
    setCollected((prev) => prev.includes(id) ? prev : [...prev, id]);
    setLastPickupAt(now);
    setHappyUntil(now + 1600);
    speakPeanutReaction();
    setToast(collected.length + 1 === total ? 'All peanuts found. Time to score.' : 'Peanut secured');
    window.setTimeout(() => setToast(''), 1300);
  }, [collected.length, speakPeanutReaction, total]);
  const onPosition = useCallback((v: THREE.Vector3) => {
    if (v.distanceTo(lastUiPosition.current) > .08) {
      lastUiPosition.current.copy(v);
      setPlayerPosition(v.clone());
    }
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  const restart = () => {
    const now = Date.now();
    setCollected([]); setFinished(false); setTouch({ x: 0, z: 0 }); setTouchDuck(false); setStartedAt(now); setLastPickupAt(now); setHappyUntil(0); setElapsed(0); setGameKey((key) => key + 1); setToast('New run started');
  };
  const score = collected.length * 100 + Math.max(0, 500 - elapsed * 3);
  const currentRoom = roomName(playerPosition.x, playerPosition.z);
  const now = Date.now();
  const pickupAge = now - lastPickupAt;
  const mood: AnyaMood = now < happyUntil ? 'happy' : pickupAge >= 30000 ? 'crying' : pickupAge >= 10000 ? 'sad' : 'normal';
  return <KeyboardControls map={keyMap}>
    <main className="game-shell">
      {supportsWebGL ? <Canvas className="scene-canvas" shadows camera={{ position: [16, 13, 17], fov: 43 }} gl={{ antialias: true }} dpr={[1, 1.6]}>
          <color attach="background" args={['#d8c4c0']} />
          <fog attach="fog" args={['#d8c4c0', 20, 46]} />
          <GameWorld key={gameKey} collected={collected} onCollect={onCollect} touch={touch} touchDuck={touchDuck} mood={mood} onPosition={onPosition} />
        </Canvas> : <WebGLFallback collected={collected.length} total={total} mood={mood} />}
      <div className="noise" />
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">A</div>
          <div><p className="brand-name">Peanut Hunt</p><p className="brand-sub">A very secret family mission</p></div>
        </div>
        <div className="top-actions">
          <div className="hud-pill" aria-label={`${collected.length} of ${total} peanuts found`}><Trophy size={15} /><strong>{String(collected.length).padStart(2, '0')} / {total}</strong><span>found</span></div>
          <button className="finish-button" disabled={collected.length !== total} onClick={() => setFinished(true)}>{collected.length === total ? 'Score run' : 'Find them all'}</button>
        </div>
      </header>
      {toast && <div className="toast" role="status">{toast}</div>}
      <div className="room-tag">{currentRoom}</div>
      <div className="control-hint">
        <span className="hint-item"><span className="keycap">W</span><span className="keycap">A</span><span className="keycap">S</span><span className="keycap">D</span> move</span>
        <span className="hint-divider" />
        <span className="hint-item"><span className="keycap">C</span> crawl</span>
        <span className="hint-divider" />
        <span className="hint-item"><Hand size={14} /> drag to orbit</span>
      </div>
      <DPad onMove={setTouch} />
      <button className={`duck-button ${touchDuck ? 'active' : ''}`} onClick={() => setTouchDuck((value) => !value)} aria-pressed={touchDuck}>{touchDuck ? 'CRAWL' : 'DUCK'}</button>
      {finished && <div className="score-backdrop" role="dialog" aria-modal="true">
        <section className="score-card">
          <p className="score-kicker">Mission complete</p>
          <h1>Waku waku,<br />that was a feast.</h1>
          <p>Every peanut is safely accounted for in the family home.</p>
          <div className="score-number">{score}<small>points</small></div>
          <div className="score-detail"><strong>{elapsed}s</strong><span>run time</span><span>·</span><strong>{total} / {total}</strong><span>peanuts</span></div>
          <button className="restart-button" onClick={restart}><RotateCcw size={15} style={{ verticalAlign: 'middle', marginRight: 7 }} />Hunt again</button>
        </section>
      </div>}
    </main>
  </KeyboardControls>;
}

export default App;
