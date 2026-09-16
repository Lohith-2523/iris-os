'use client';

import * as React from 'react';
import * as THREE from 'three';
import styles from './procedural-auth-background.module.css';

export type ProceduralGeometryQuality = 'auto' | 'low' | 'medium' | 'high';

type Props = {
  quality?: ProceduralGeometryQuality;
  density?: number;
  speed?: number;
  fragmentation?: number;
  interaction?: boolean;
  inverted?: boolean;
};

type System = {
  group: THREE.Group;
  points: Float32Array;
  lines: Float32Array;
  triangles: Float32Array;
  alpha: Float32Array;
  uv: Float32Array;
  seeds: Float32Array;
  edges: Uint16Array;
  faces: Uint16Array;
  pointGeometry: THREE.BufferGeometry;
  lineGeometry: THREE.BufferGeometry;
  triangleGeometry: THREE.BufferGeometry;
  materials: THREE.Material[];
};

const GRIDS = { low: [12, 9], medium: [20, 14], high: [28, 20] } as const;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const smoothstep = (n: number) => n * n * (3 - 2 * n);
const hash = (n: number) => {
  const value = Math.sin(n * 91.173 + 17.31) * 43758.5453;
  return value - Math.floor(value);
};

function automaticQuality() {
  const mobile = window.matchMedia('(max-width: 47.99rem), (pointer: coarse)').matches;
  if (mobile || (navigator.hardwareConcurrency || 4) <= 4) return 'low' as const;
  if ((navigator.hardwareConcurrency || 4) >= 10 && window.devicePixelRatio <= 2) return 'high' as const;
  return 'medium' as const;
}

function usePreferences(requested: ProceduralGeometryQuality) {
  const [value, setValue] = React.useState({
    quality: requested === 'auto' ? 'medium' as const : requested,
    reducedMotion: false,
  });
  React.useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setValue({
      quality: requested === 'auto' ? automaticQuality() : requested,
      reducedMotion: query.matches,
    });
    update();
    query.addEventListener('change', update);
    window.addEventListener('resize', update, { passive: true });
    return () => {
      query.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, [requested]);
  return value;
}

function createSystem(rows: number, columns: number, density: number, inverted: boolean): System {
  const count = rows * columns;
  const uv = new Float32Array(count * 2);
  const seeds = new Float32Array(count);
  const edgeList: number[] = [];
  const faceList: number[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const i = row * columns + column;
      uv[i * 2] = column / (columns - 1);
      uv[i * 2 + 1] = row / (rows - 1);
      seeds[i] = hash(i + rows * 3.7);
      if (column < columns - 1 && hash(i * 2.1) < density) edgeList.push(i, i + 1);
      if (row < rows - 1 && hash(i * 3.7) < density * 0.92) edgeList.push(i, i + columns);
      if (row < rows - 1 && column < columns - 1) {
        const nextRow = i + columns;
        if (hash(i * 5.3) < density * 0.94) faceList.push(i, nextRow, i + 1);
        if (hash(i * 7.9) < density * 0.88) faceList.push(i + 1, nextRow, nextRow + 1);
        if (hash(i * 11.1) < density * 0.62) edgeList.push(i + 1, nextRow);
      }
    }
  }

  const points = new Float32Array(count * 3);
  const lines = new Float32Array(edgeList.length * 3);
  const triangles = new Float32Array(faceList.length * 3);
  const alpha = new Float32Array(faceList.length);
  const pointGeometry = new THREE.BufferGeometry();
  const lineGeometry = new THREE.BufferGeometry();
  const triangleGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(lines, 3));
  triangleGeometry.setAttribute('position', new THREE.BufferAttribute(triangles, 3));
  triangleGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));

  const ink = new THREE.Color(inverted ? 0xffffff : 0x000000);
  const pointMaterial = new THREE.PointsMaterial({ color: ink, size: 0.035, sizeAttenuation: true, depthWrite: false });
  const lineMaterial = new THREE.LineBasicMaterial({ color: ink, depthWrite: false });
  const triangleMaterial = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    vertexShader: 'attribute float aAlpha; varying float vAlpha; varying vec3 vSurface; void main(){vAlpha=aAlpha;vSurface=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying float vAlpha; varying vec3 vSurface; void main(){float contour=pow(abs(sin(vSurface.z*18.0+vSurface.x*1.4)),18.0);float weave=pow(abs(sin(vSurface.x*8.0-vSurface.y*5.0)),28.0);float textureMix=0.48+contour*0.34+weave*0.18;gl_FragColor=vec4(${inverted ? '0.975,0.975,0.98' : '0.025,0.027,0.03'},vAlpha*0.32*textureMix);}`,
  });
  const group = new THREE.Group();
  // Keep the geometry monochrome and open: translucent filled faces read as grey.
  group.add(new THREE.LineSegments(lineGeometry, lineMaterial), new THREE.Points(pointGeometry, pointMaterial));
  return {
    group, points, lines, triangles, alpha, uv, seeds,
    edges: Uint16Array.from(edgeList), faces: Uint16Array.from(faceList),
    pointGeometry, lineGeometry, triangleGeometry,
    materials: [pointMaterial, lineMaterial, triangleMaterial],
  };
}

function surface(pattern: number, u: number, v: number, seed: number, output: Float32Array) {
  const x = (u - 0.5) * 8.4;
  const y = (v - 0.5) * 5.8;
  const radius = Math.hypot(x * 0.72, y);
  output[0] = x + (seed - 0.5) * 0.09;
  output[1] = y + (hash(seed * 37.1) - 0.5) * 0.07;
  if (pattern === 0) {
    output[2] = Math.sin(x * 0.82 + y * 0.34) * 0.48 + Math.cos(y * 1.15) * 0.22;
  } else if (pattern === 1) {
    output[2] = Math.sin(radius * 1.72 - seed * 0.35) * 0.58 / (1 + radius * 0.08) + x * y * 0.018;
  } else {
    output[2] = Math.sin(x * 0.42) * Math.cos(y * 1.08) * 0.72 + Math.sin((x - y) * 1.45) * 0.14;
  }
}

const a = new Float32Array(3);
const b = new Float32Array(3);

function update(system: System, elapsed: number, speed: number, fragmentation: number, reduced: boolean) {
  const time = reduced ? 2.8 : elapsed * speed;
  const cycle = time / 11;
  const cycleIndex = Math.floor(cycle);
  const morph = smoothstep(cycle - cycleIndex);
  for (let i = 0; i < system.seeds.length; i += 1) {
    const uvOffset = i * 2;
    const offset = i * 3;
    const u = system.uv[uvOffset];
    const v = system.uv[uvOffset + 1];
    const seed = system.seeds[i];
    surface(cycleIndex % 3, u, v, seed, a);
    surface((cycleIndex + 1) % 3, u, v, seed, b);
    const drift = reduced ? 0 : (
      Math.sin(a[0] * 0.9 + time * 0.52 + seed * 0.4) * 0.07
      + Math.cos(a[1] * 1.08 - time * 0.39) * 0.05
      + Math.sin((a[0] + a[1]) * 0.58 + time * 0.24) * 0.04
    );
    system.points[offset] = THREE.MathUtils.lerp(a[0], b[0], morph);
    system.points[offset + 1] = THREE.MathUtils.lerp(a[1], b[1], morph);
    system.points[offset + 2] = THREE.MathUtils.lerp(a[2], b[2], morph) + drift;
  }
  for (let i = 0; i < system.edges.length; i += 1) {
    const source = system.edges[i] * 3;
    const target = i * 3;
    system.lines[target] = system.points[source];
    system.lines[target + 1] = system.points[source + 1];
    system.lines[target + 2] = system.points[source + 2];
  }
  for (let i = 0; i < system.faces.length; i += 3) {
    const phase = hash(i * 0.73);
    const pulseWave = Math.max(0, Math.sin(time * (0.72 + phase * 0.54) + phase * 47));
    const rise = reduced ? phase * 0.35 : Math.pow(pulseWave, 4);
    const lift = rise * fragmentation * (0.2 + phase * 0.38);
    const apex = Math.floor(hash(i * 1.91) * 3);
    const lean = hash(i * 2.43) - 0.5;
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const source = system.faces[i + vertex] * 3;
      const target = (i + vertex) * 3;
      const x = system.points[source];
      const y = system.points[source + 1];
      const z = system.points[source + 2];
      const cornerLift = vertex === apex ? rise * fragmentation * (0.16 + phase * 0.2) : -rise * fragmentation * 0.025;
      system.triangles[target] = x + rise * lean * 0.035;
      system.triangles[target + 1] = y + rise * (hash(i + vertex) - 0.5) * 0.025;
      system.triangles[target + 2] = z + lift + cornerLift;
      system.alpha[i + vertex] = clamp(0.7 + phase * 0.18 + rise * 0.2, 0.62, 1);
    }
  }
  system.pointGeometry.attributes.position.needsUpdate = true;
  system.lineGeometry.attributes.position.needsUpdate = true;
  system.triangleGeometry.attributes.position.needsUpdate = true;
  system.triangleGeometry.attributes.aAlpha.needsUpdate = true;
}

export function ProceduralAuthBackground({ quality = 'auto', density = 0.96, speed = 0.34, fragmentation = 0.72, interaction = true, inverted = false }: Props) {
  const preferences = usePreferences(quality);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const pointerRef = React.useRef({ x: 0, y: 0 });
  React.useEffect(() => {
    if (!interaction || preferences.reducedMotion) return;
    const updatePointer = (event: PointerEvent) => {
      pointerRef.current.x = clamp(event.clientX / window.innerWidth * 2 - 1, -1, 1);
      pointerRef.current.y = clamp(-(event.clientY / window.innerHeight * 2 - 1), -1, 1);
    };
    window.addEventListener('pointermove', updatePointer, { passive: true });
    return () => window.removeEventListener('pointermove', updatePointer);
  }, [interaction, preferences.reducedMotion]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    const [columns, rows] = GRIDS[preferences.quality];
    const system = createSystem(rows, columns, clamp(density, 0.35, 1), inverted);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: preferences.quality !== 'low', powerPreference: 'high-performance' });
    const timer = new THREE.Timer();
    let animationFrame = 0;
    camera.position.set(0, 0, 8.4);
    renderer.setClearColor(0xffffff, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene.add(system.group);
    timer.connect(document);

    const renderScene = (elapsed: number) => {
      update(system, elapsed, clamp(speed, 0.08, 1.25), clamp(fragmentation, 0, 1), preferences.reducedMotion);
      const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z;
      const visibleWidth = visibleHeight * camera.aspect;
      const coverScale = Math.max(visibleWidth / 8.4, visibleHeight / 5.8) * 1.32;
      system.group.position.x = 0;
      system.group.rotation.x = -0.08 + pointerRef.current.y * 0.015;
      system.group.rotation.y = pointerRef.current.x * 0.02;
      system.group.scale.setScalar(coverScale);
      camera.position.x = pointerRef.current.x * 0.14;
      camera.position.y = pointerRef.current.y * 0.08;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, preferences.quality === 'high' ? 1.75 : 1.35));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (preferences.reducedMotion) renderScene(0);
    };
    const animate = (timestamp: number) => {
      timer.update(timestamp);
      renderScene(timer.getElapsed());
      animationFrame = window.requestAnimationFrame(animate);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    if (preferences.reducedMotion) renderScene(0);
    else animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      timer.dispose();
      system.pointGeometry.dispose();
      system.lineGeometry.dispose();
      system.triangleGeometry.dispose();
      system.materials.forEach((material) => material.dispose());
      renderer.dispose();
    };
  }, [density, fragmentation, inverted, preferences.quality, preferences.reducedMotion, speed]);

  return (
    <div className={styles.root} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
