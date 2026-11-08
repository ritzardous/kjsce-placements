import * as THREE from "three";
export type ArchiveController = {
  setYear: (year: number) => void;
  setCompany: (index: number) => void;
  setMotion: (playing: boolean) => void;
  setPointer: (x: number, y: number) => void;
  setTheme: (dark: boolean) => void;
  dispose: () => void;
};
type ProjectedPoint = { x: number; y: number };
/** The pathway loom: three woven ribbons carry packets between batches and company nodes.
 * Geometry expresses relationships only; none of its particles represent placement counts. */
export function mountArchiveScene(
  host: HTMLElement,
  onReady: () => void,
  onFailure: () => void,
  onProject?: (points: ProjectedPoint[]) => void,
): ArchiveController {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(
    Math.min(devicePixelRatio, innerWidth < 700 ? 1.25 : 1.5),
  );
  renderer.setClearColor(0, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.append(renderer.domElement);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
  camera.position.set(0, 0, 12.4);
  const loom = new THREE.Group();
  scene.add(loom);
  const materials: THREE.Material[] = [],
    textures: THREE.Texture[] = [],
    geometries: THREE.BufferGeometry[] = [];
  let year = 2026,
    company = 0,
    motion = true,
    dark = document.documentElement.dataset.theme === "dark",
    disposed = false,
    lost = false,
    frame = 0,
    last = 0,
    time = 0,
    inView = true,
    visible = !document.hidden,
    width = 1,
    height = 1,
    impulse = 0;
  const pointer = new THREE.Vector2(),
    currentPointer = new THREE.Vector2(),
    dummy = new THREE.Object3D(),
    projected = new THREE.Vector3();
  const uniforms = {
    uTime: { value: 0 },
    uBlue: { value: new THREE.Color(dark ? "#8da3ff" : "#2445eb") },
  };
  const keep = <T extends THREE.BufferGeometry>(g: T) => {
    geometries.push(g);
    return g;
  };
  function orbit(t: number, lane: number, radius = 1) {
    const a = t * Math.PI * 2;
    const v = new THREE.Vector3(
      Math.cos(a) * 2.9 * radius,
      Math.sin(a) * 2.9 * radius,
      0.45 * Math.sin(a * 2 + lane),
    );
    v.applyAxisAngle(new THREE.Vector3(1, 0, 0), [0.62, -0.65, 1.35][lane]);
    v.applyAxisAngle(new THREE.Vector3(0, 0, 1), [0.2, -0.8, 0.6][lane]);
    return v;
  }
  const ribbonMaterial = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: `varying vec2 vUv;varying float vDepth;varying vec3 vNormal;void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uTime;uniform vec3 uBlue;varying vec2 vUv;varying float vDepth;varying vec3 vNormal;void main(){float edge=step(.93,abs(vUv.y-.5)*2.);float ribs=1.-smoothstep(.035,.075,abs(fract(vUv.x*92.)-.5));float line=max(edge,ribs*.58);float signal=pow(max(0.,sin(vUv.x*25.-uTime*1.3)),18.);float front=clamp(1.6-vDepth*.055,.5,1.);float panel=step(.54,fract(vUv.x*12.));float light=.65+.35*abs(dot(vNormal,normalize(vec3(.3,.7,1.))));vec3 color=uBlue*light;float alpha=(.09+panel*.2+line*.65+signal*.25)*front;gl_FragColor=linearToOutputTexel(vec4(color,alpha));}`,
  });
  materials.push(ribbonMaterial);
  for (let lane = 0; lane < 3; lane++) {
    const positions: number[] = [],
      uvs: number[] = [],
      indices: number[] = [];
    for (let i = 0; i <= 240; i++) {
      const t = i / 240;
      for (let side = 0; side < 2; side++) {
        const v = orbit(t, lane, side === 0 ? 0.89 : 1.11);
        positions.push(v.x, v.y, v.z);
        uvs.push(t, side);
      }
      if (i < 240) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = keep(new THREE.BufferGeometry());
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    loom.add(new THREE.Mesh(geometry, ribbonMaterial));
  }
  const packetMaterial = new THREE.MeshBasicMaterial({
    color: uniforms.uBlue.value,
  });
  materials.push(packetMaterial);
  const packets = new THREE.InstancedMesh(
    keep(new THREE.OctahedronGeometry(0.045)),
    packetMaterial,
    48,
  );
  packets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  loom.add(packets);
  const anchors = [
    new THREE.Vector3(-2.45, 1.65, 0.35),
    new THREE.Vector3(2.2, 1.85, -0.15),
    new THREE.Vector3(-2.5, -1.4, 0.6),
    new THREE.Vector3(2.4, -1.7, 0.7),
    new THREE.Vector3(3, 0.05, -0.1),
  ];
  const anchorMaterial = new THREE.MeshBasicMaterial({
    color: uniforms.uBlue.value,
    wireframe: true,
  });
  materials.push(anchorMaterial);
  anchors.forEach((position) => {
    const node = new THREE.Mesh(
      keep(new THREE.OctahedronGeometry(0.12)),
      anchorMaterial,
    );
    node.position.copy(position);
    loom.add(node);
  });
  const linkMaterial = new THREE.LineBasicMaterial({
    color: uniforms.uBlue.value,
    transparent: true,
    opacity: 0.24,
  });
  materials.push(linkMaterial);
  const linkGeometry = keep(
      new THREE.BufferGeometry().setFromPoints(
        anchors.flatMap((v) => [new THREE.Vector3(0, 0, 0), v]),
      ),
    ),
    links = new THREE.LineSegments(linkGeometry, linkMaterial);
  loom.add(links);
  const selectionMaterial = new THREE.LineBasicMaterial({
    color: uniforms.uBlue.value,
    transparent: true,
    opacity: 0.8,
  });
  materials.push(selectionMaterial);
  const selectionGeometry = keep(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        anchors[0],
      ]),
    ),
    selectionLink = new THREE.Line(selectionGeometry, selectionMaterial);
  loom.add(selectionLink);
  const dots: number[] = [],
    seeds: number[] = [];
  for (let i = 0; i < 180; i++) {
    const t = i * 2.399963,
      r = 1.6 + (((i * 17) % 71) / 71) * 2;
    dots.push(Math.cos(t) * r, Math.sin(t) * r * 0.8, Math.sin(i * 1.73) * 1.3);
    seeds.push(i * 0.73);
  }
  const starGeometry = keep(new THREE.BufferGeometry());
  starGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(dots, 3),
  );
  starGeometry.setAttribute("seed", new THREE.Float32BufferAttribute(seeds, 1));
  const pointMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `uniform float uTime;attribute float seed;varying float vAlpha;void main(){vec3 p=position;p.z+=sin(uTime*.3+seed)*.13;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(28./-mv.z,1.,4.);vAlpha=.2+.4*pow(sin(seed+uTime*.55)*.5+.5,3.);}`,
    fragmentShader: `uniform vec3 uBlue;varying float vAlpha;void main(){gl_FragColor=linearToOutputTexel(vec4(uBlue,vAlpha));}`,
  });
  materials.push(pointMaterial);
  loom.add(new THREE.Points(starGeometry, pointMaterial));
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: uniforms.uBlue.value,
    transparent: true,
    opacity: 0.6,
  });
  materials.push(haloMaterial);
  const halo = new THREE.Mesh(
    keep(new THREE.TorusGeometry(0.77, 0.008, 4, 96)),
    haloMaterial,
  );
  scene.add(halo);
  const focusMaterial = new THREE.MeshBasicMaterial({
    color: uniforms.uBlue.value,
    transparent: true,
    opacity: 0.8,
  });
  materials.push(focusMaterial);
  const focusRing = new THREE.Mesh(
    keep(new THREE.TorusGeometry(0.22, 0.012, 4, 48)),
    focusMaterial,
  );
  loom.add(focusRing);
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    throw Error("Canvas texture unavailable");
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textures.push(texture);
  const typeMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    color: uniforms.uBlue.value,
  });
  materials.push(typeMaterial);
  const typography = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(3.6, 1.8)),
    typeMaterial,
  );
  typography.position.z = 1.8;
  scene.add(typography);
  function drawYear() {
    context!.clearRect(0, 0, 1024, 512);
    context!.fillStyle = "white";
    context!.textAlign = "center";
    context!.font = "400 240px monospace";
    context!.fillText(String(year), 512, 302);
    texture.needsUpdate = true;
  }
  drawYear();
  function render(delta = 1 / 30) {
    if (disposed || lost) return;
    const blend = motion ? 1 - Math.exp(-delta * 4) : 1;
    currentPointer.lerp(pointer, blend);
    const box = host.getBoundingClientRect(),
      scroll = motion
        ? THREE.MathUtils.clamp(-box.top / Math.max(innerHeight, 1), 0, 1)
        : 0;
    loom.rotation.x +=
      (currentPointer.y * 0.18 +
        (year === 2026 ? 0.14 : -0.24) +
        scroll * 0.7 -
        loom.rotation.x) *
      blend;
    loom.rotation.y +=
      (currentPointer.x * 0.28 +
        Math.sin(time * 0.22) * 0.14 +
        scroll * 0.9 -
        loom.rotation.y) *
      blend;
    loom.rotation.z +=
      (Math.sin(time * 0.15) * 0.08 - 0.12 - loom.rotation.z) * blend;
    uniforms.uTime.value = time;
    impulse = Math.max(0, impulse - delta * 0.7);
    focusRing.position.copy(anchors[company]);
    focusRing.scale.setScalar(1 + impulse * 2);
    focusMaterial.opacity = 0.35 + impulse * 0.6;
    selectionMaterial.opacity = 0.5 + Math.sin(time * 2) * 0.18;
    const targetScale = year === 2026 ? 1 : 1.06;
    loom.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      blend,
    );
    for (let i = 0; i < 48; i++) {
      const v = orbit((i / 16 + time * (0.018 + (i % 3) * 0.006)) % 1, i % 3);
      dummy.position.copy(v);
      dummy.rotation.set(time + i, time * 0.7, 0);
      const scale = i % 4 === 0 ? 1.45 : 0.8;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      packets.setMatrixAt(i, dummy.matrix);
    }
    packets.instanceMatrix.needsUpdate = true;
    const positions = selectionGeometry.getAttribute("position");
    positions.setXYZ(
      1,
      anchors[company].x,
      anchors[company].y,
      anchors[company].z,
    );
    positions.needsUpdate = true;
    halo.rotation.z = time * 0.1;
    halo.scale.setScalar(1 + Math.sin(time * 0.8) * 0.035);
    typography.position.x = currentPointer.x * 0.06;
    typography.position.y = -currentPointer.y * 0.04;
    renderer.render(scene, camera);
    loom.updateMatrixWorld();
    onProject?.(
      anchors.map((anchor) => {
        projected.copy(anchor).applyMatrix4(loom.matrixWorld).project(camera);
        return {
          x: (projected.x * 0.5 + 0.5) * 100,
          y: (-0.5 * projected.y + 0.5) * 100,
        };
      }),
    );
  }
  function tick(now: number) {
    frame = 0;
    if (disposed || lost || !motion || !visible || !inView) return;
    const delta = (now - last) / 1000;
    if (delta >= 1 / 30) {
      last = now;
      time += Math.min(delta, 0.07);
      render(Math.min(delta, 0.07));
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!disposed && !lost && motion && visible && inView) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }
  function resize() {
    if (disposed || lost) return;
    const box = host.getBoundingClientRect();
    width = Math.max(box.width, 1);
    height = Math.max(box.height, 1);
    camera.aspect = width / height;
    camera.position.z = camera.aspect < 1 ? 12.4 / camera.aspect : 12.4;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    render(1);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const intersection = new IntersectionObserver(
    (entries) => {
      inView = entries[0].isIntersecting;
      sync();
    },
    { rootMargin: "60px" },
  );
  intersection.observe(host);
  const visibility = () => {
    visible = !document.hidden;
    sync();
  };
  document.addEventListener("visibilitychange", visibility);
  const contextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    sync();
    onFailure();
  };
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  resize();
  sync();
  onReady();
  return {
    setYear(value) {
      if (year !== value) {
        year = value;
        drawYear();
      }
      if (!motion) render(1);
    },
    setCompany(value) {
      if (company !== value) impulse = 1;
      company = value;
      if (!motion) render(1);
    },
    setMotion(value) {
      motion = value;
      sync();
      if (!value) render(1);
    },
    setPointer(x, y) {
      if (motion) pointer.set(x, y);
    },
    setTheme(value) {
      dark = value;
      uniforms.uBlue.value.set(dark ? "#8da3ff" : "#2445eb");
      [
        packetMaterial,
        anchorMaterial,
        linkMaterial,
        selectionMaterial,
        haloMaterial,
        typeMaterial,
        focusMaterial,
      ].forEach((material) => material.color.copy(uniforms.uBlue.value));
      render(1);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      packets.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      if (!lost) renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
