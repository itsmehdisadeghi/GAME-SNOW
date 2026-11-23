import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SynthAudio } from './audio';
import {
  DEFAULT_UPGRADES,
  advanceCombo,
  calculateMeltPayout,
  checkCottageRescues,
  clearSnowInFootprint,
  computeClearStats,
  computeTruckStats,
  countAffordableUpgrades,
  createDistrictGrid,
  createInitialCombo,
  evaluateShiftOutcome,
  getDistrictDef,
  gridToWorld,
  purchaseUpgrade,
  tickCombo,
} from './logic';
import {
  type CottageMeshHandle,
  type PlowTruckRig,
  createClocktowerMesh,
  createCottageMesh,
  createPerimeterPineForest,
  createPickupMesh,
  createPlowTruck,
  createStreetLantern,
  createThermalGrate,
} from './models';
import { type ProceduralTextures, createProceduralTextures } from './textures';
import type {
  CalloutEvent,
  ComboState,
  CottageRuntime,
  DistrictDef,
  GameMode,
  GamePhase,
  HudSnapshot,
  PickupState,
  RunSummary,
  SnowCell,
  UpgradeId,
  UpgradeLevels,
} from './types';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
  r: number;
  g: number;
  b: number;
  rotY: number;
  rotSpeed: number;
}

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onRunEnd: (summary: RunSummary) => void;
}

// Pre-allocated scratch math helpers (zero GC inside render loop)
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();

// Isometric screen-aligned basis for camera at (+1, +y, +1) looking at origin
const ISO_UP_X = -Math.SQRT1_2;
const ISO_UP_Z = -Math.SQRT1_2;
const ISO_RIGHT_X = Math.SQRT1_2;
const ISO_RIGHT_Z = -Math.SQRT1_2;

const MAX_PARTICLES = 280;
const SNOWFLAKE_COUNT = 160;
const BEST_SCORE_STORAGE_KEY = 'hearthplow_best_score_v1';

export class HearthplowEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private textures: ProceduralTextures;
  private audio: SynthAudio;
  private isSoftwareGl: boolean;
  private envRenderTarget: THREE.WebGLRenderTarget;

  private worldGroup = new THREE.Group();
  private truckRig: PlowTruckRig;
  private snowInstancedMesh: THREE.InstancedMesh | null = null;
  private snowGeo: THREE.BoxGeometry;
  private snowMat: THREE.MeshStandardMaterial;

  private cottageHandles: CottageMeshHandle[] = [];
  private grateHandles: Array<{
    x: number;
    z: number;
    ring: THREE.Mesh;
    ringMat: THREE.MeshBasicMaterial;
  }> = [];
  private pickupMeshes = new Map<number, THREE.Group>();

  // Pooled particles
  private particles: Particle[] = [];
  private particleMesh: THREE.InstancedMesh;
  private particleCursor = 0;

  // Ambient falling snow
  private snowfallPoints: THREE.Points;
  private snowfallPositions: Float32Array;

  // Game state
  private phase: GamePhase = 'title';
  private mode: GameMode = 'arcade';
  private garageOpen = false;
  private districtIndex = 0;
  private district: DistrictDef;
  private cells: SnowCell[] = [];
  private cottages: CottageRuntime[] = [];
  private pickups: PickupState[] = [];
  private nextPickupId = 1;

  private upgrades: UpgradeLevels = { ...DEFAULT_UPGRADES };
  private coins = 0;
  private coinsEarnedThisShift = 0;
  private score = 0;
  private bestScore = 0;
  private timeRemaining = 95;
  private timeElapsed = 0;
  private combo: ComboState = createInitialCombo(3.6);
  private clearPct = 0;

  // Truck kinematics
  private truckX = 0;
  private truckZ = 4.5;
  private truckVx = 0;
  private truckVz = 0;
  private truckYaw = Math.PI;
  private wheelSpin = 0;
  private snowLoad = 0;
  private steamCooldownTimer = 0;
  private steamActiveTimer = 0;
  private steamBufferTimer = 0;
  private speedBoostTimer = 0;
  private iceBumpCooldown = 0;
  private nearGrate = false;

  // Juice, hitstop & camera damping
  private hitstopTimer = 0;
  private shakeTrauma = 0;
  private bodySquash = 0;
  private camFocusX = 0;
  private camFocusZ = 0;
  private camZoom = 1;
  private titleOrbitAngle = 0;
  private chimneySmokeAccum = 0;
  private pickupSpawnAccum = 0;
  private exhaustAccum = 0;

  // Callout toast
  private callout: CalloutEvent | null = null;
  private calloutTimer = 0;
  private nextCalloutId = 1;

  // Input state
  private keysHeld = new Set<string>();
  private virtualMoveX = 0;
  private virtualMoveY = 0;

  // Loop & lifecycle
  private frameId = 0;
  private lastTickTime = 0;
  private lastHudEmit = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.audio = new SynthAudio();

    try {
      const saved = window.localStorage.getItem(BEST_SCORE_STORAGE_KEY);
      if (saved) this.bestScore = Math.max(0, parseInt(saved, 10) || 0);
    } catch {
      // Ignore storage errors in private iframes
    }

    // Detect software WebGL (SwiftShader / llvmpipe / WARP) cleanly
    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    // Scene & Studio Environment Map (RoomEnvironment on all devices)
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRenderTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    pmrem.dispose();

    // Orthographic Isometric Camera
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;
    const frustum = 18.5;
    this.camera = new THREE.OrthographicCamera(
      (-frustum * aspect) / 2,
      (frustum * aspect) / 2,
      frustum / 2,
      -frustum / 2,
      0.5,
      160,
    );

    // Warm Golden-Hour Key Light + Cool Alpine Hemisphere Fill + Soft Rim
    const hemiLight = new THREE.HemisphereLight(0x8bbef0, 0x324056, 0.88);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffe0ad, 2.15);
    keyLight.position.set(22, 34, 16);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    const d = 22;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 4;
    keyLight.shadow.camera.far = 80;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6e9ee0, 0.62);
    rimLight.position.set(-20, 16, -22);
    this.scene.add(rimLight);

    // Procedural Textures
    const maxAniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.textures = createProceduralTextures(maxAniso);

    // Reusable Snow Geometry & Material
    this.snowGeo = new THREE.BoxGeometry(1.06, 0.58, 1.06);
    this.snowGeo.translate(0, 0.29, 0);
    this.snowMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      bumpMap: this.textures.snowBump,
      bumpScale: 0.035,
      roughness: 0.82,
      metalness: 0.04,
    });

    // Truck Rig
    this.truckRig = createPlowTruck(this.textures.contactShadow);
    this.scene.add(this.truckRig.root);
    this.scene.add(this.worldGroup);

    // Pooled Zero-GC Particle InstancedMesh
    const pGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.08,
    });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, MAX_PARTICLES);
    this.particleMesh.frustumCulled = false;
    this.particleMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(MAX_PARTICLES * 3),
      3,
    );
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 1,
        gravity: 14,
        r: 1,
        g: 1,
        b: 1,
        rotY: 0,
        rotSpeed: 0,
      });
      _dummy.position.set(0, -50, 0);
      _dummy.scale.setScalar(0);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.particleMesh);

    // Ambient Falling Snow Points
    const flakeGeo = new THREE.BufferGeometry();
    this.snowfallPositions = new Float32Array(SNOWFLAKE_COUNT * 3);
    for (let i = 0; i < SNOWFLAKE_COUNT; i++) {
      this.snowfallPositions[i * 3] = (Math.random() - 0.5) * 44;
      this.snowfallPositions[i * 3 + 1] = Math.random() * 18;
      this.snowfallPositions[i * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    flakeGeo.setAttribute('position', new THREE.BufferAttribute(this.snowfallPositions, 3));
    const flakeMat = new THREE.PointsMaterial({
      color: 0xf4f9ff,
      size: 0.22,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
    this.snowfallPoints = new THREE.Points(flakeGeo, flakeMat);
    this.snowfallPoints.frustumCulled = false;
    this.scene.add(this.snowfallPoints);

    // Load District 0 initially for Title Screen live vista
    this.district = getDistrictDef(0);
    this.loadDistrict(0, true);

    this.handleResize();
    this.updateTitleCamera(0);
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
    this.renderer.render(this.scene, this.camera);

    // Listeners
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    // Sync body state attribute & emit initial HUD
    document.body.dataset.state = this.phase;
    this.emitHud(true);

    // Start frame loop
    this.lastTickTime = performance.now();
    this.scheduleNextTick();
  }

  private scheduleNextTick(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void): void {
    if (this.disposed) return;
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    if (!sync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        gl.deleteSync(sync);
        return;
      }
      const status = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (status === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private handleResize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;
    const frustum = width < 640 ? 22.5 : 18.2;
    this.camera.left = (-frustum * aspect) / 2;
    this.camera.right = (frustum * aspect) / 2;
    this.camera.top = frustum / 2;
    this.camera.bottom = -frustum / 2;
    this.camera.zoom = this.camZoom;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private clearWorldMeshes(): void {
    this.cottageHandles = [];
    this.grateHandles = [];
    this.pickupMeshes.clear();
    this.snowInstancedMesh = null;

    while (this.worldGroup.children.length > 0) {
      const child = this.worldGroup.children[0];
      this.worldGroup.remove(child);
    }
  }

  private loadDistrict(index: number, resetTruckProgress: boolean): void {
    this.clearWorldMeshes();
    this.districtIndex = index;
    this.district = getDistrictDef(index);
    this.cells = createDistrictGrid(this.district);
    this.cottages = this.district.cottages.map((c) => ({
      ...c,
      rescued: false,
      rescueAnim: 0,
    }));

    const stats = computeTruckStats(this.upgrades);
    this.combo = createInitialCombo(stats.comboGraceSeconds);
    this.timeRemaining = this.district.timeLimitSeconds;
    this.timeElapsed = 0;
    this.coinsEarnedThisShift = 0;
    this.snowLoad = 0;
    this.steamCooldownTimer = 0;
    this.steamActiveTimer = 0;
    this.speedBoostTimer = 0;
    this.pickupSpawnAccum = 0;

    if (resetTruckProgress) {
      this.truckX = this.district.spawnX;
      this.truckZ = this.district.spawnZ;
      this.truckVx = 0;
      this.truckVz = 0;
      this.truckYaw = this.district.spawnYaw;
    }

    this.camFocusX = this.truckX;
    this.camFocusZ = this.truckZ - 2.2;

    // Sky & calibrated linear horizon fog (keeps active courtyard crisp at cam distance ~34, softens distant valley)
    this.scene.background = new THREE.Color(this.district.skyColor);
    this.scene.fog = new THREE.Fog(this.district.fogColor, 44, 88);

    const spanX = this.district.gridCols * this.district.cellSize;
    const spanZ = this.district.gridRows * this.district.cellSize;
    const halfX = spanX / 2;
    const halfZ = spanZ / 2;

    // 1. Expansive Snowy Valley Floor extending beyond playable plaza into fog
    const valleyFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({
        color: 0xdbe8f5,
        roughness: 0.92,
        metalness: 0.02,
      }),
    );
    valleyFloor.rotation.x = -Math.PI / 2;
    valleyFloor.position.y = -0.06;
    valleyFloor.receiveShadow = true;
    this.worldGroup.add(valleyFloor);

    // 2. Warm Cobblestone Village Plaza Surface (offset +0.06 above valley floor to prevent Z-fighting)
    const plazaMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(spanX + 1.4, spanZ + 1.4),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: this.textures.cobbleMap,
        bumpMap: this.textures.cobbleBump,
        bumpScale: 0.06,
        roughness: 0.85,
        metalness: 0.05,
      }),
    );
    plazaMesh.rotation.x = -Math.PI / 2;
    plazaMesh.position.y = 0;
    plazaMesh.receiveShadow = true;
    this.worldGroup.add(plazaMesh);

    // Low stone border curbs around plaza edges
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x5c636e, roughness: 0.86 });
    const curbH = 0.24;
    const northCurb = new THREE.Mesh(new THREE.BoxGeometry(spanX + 2.2, curbH, 0.55), curbMat);
    northCurb.position.set(0, curbH / 2, -halfZ - 0.65);
    const southCurb = northCurb.clone();
    southCurb.position.z = halfZ + 0.65;
    const westCurb = new THREE.Mesh(new THREE.BoxGeometry(0.55, curbH, spanZ + 1.8), curbMat);
    westCurb.position.set(-halfX - 0.65, curbH / 2, 0);
    const eastCurb = westCurb.clone();
    eastCurb.position.x = halfX + 0.65;
    this.worldGroup.add(northCurb, southCurb, westCurb, eastCurb);

    // 3. Tall Village Clocktower Landmark on North edge (framed in opening vista!)
    const tower = createClocktowerMesh(this.district.clocktowerPos.x, this.district.clocktowerPos.z);
    this.worldGroup.add(tower);

    // 4. Alpine Cottages
    for (const c of this.cottages) {
      const handle = createCottageMesh(c.colorHex, c.roofHex, c.x, c.z, c.rotY);
      handle.setRescuedVisual(false, 0);
      this.worldGroup.add(handle.group);
      this.cottageHandles.push(handle);
    }

    // 5. Thermal Hearth Grates (with 1 warm focal ember light at the primary central grate)
    for (let i = 0; i < this.district.grates.length; i++) {
      const g = this.district.grates[i];
      const pos = gridToWorld(g.col, g.row, this.district);
      const grate = createThermalGrate(pos.x, pos.z, this.textures.emberGrate);
      this.worldGroup.add(grate.group);
      this.grateHandles.push({ x: pos.x, z: pos.z, ring: grate.ring, ringMat: grate.ringMat });
      if (i === 0) {
        const emberLight = new THREE.PointLight(0xff9233, 2.8, 14, 1.6);
        emberLight.position.set(pos.x, 1.4, pos.z);
        this.worldGroup.add(emberLight);
      }
    }

    // 6. Warm Cast-Iron Street Lanterns (plus 1 warm lantern pool near the clocktower square)
    for (let i = 0; i < this.district.lanterns.length; i++) {
      const lp = this.district.lanterns[i];
      this.worldGroup.add(createStreetLantern(lp.x, lp.z));
    }
    const plazaLanternLight = new THREE.PointLight(0xffb85c, 2.4, 22, 1.5);
    plazaLanternLight.position.set(0, 4.5, -9.5);
    this.worldGroup.add(plazaLanternLight);

    // 7. Natural Encircled Snow-Laden Pine Forest Perimeter
    const forest = createPerimeterPineForest(halfX, halfZ, index + 1);
    this.worldGroup.add(forest);

    // 8. Instanced 3D Snow Field
    const count = this.cells.length;
    const snowInst = new THREE.InstancedMesh(this.snowGeo, this.snowMat, count);
    snowInst.receiveShadow = true;
    snowInst.castShadow = false;
    snowInst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    this.snowInstancedMesh = snowInst;
    this.rebuildAllSnowInstances();
    this.worldGroup.add(snowInst);

    // 9. Spawn initial Pickups (Cocoa Thermos + Golden Star)
    this.pickups = [];
    this.spawnPickup('cocoa', -halfX * 0.45, -halfZ * 0.25);
    this.spawnPickup('star', halfX * 0.5, halfZ * 0.2);

    // Sync truck visuals
    this.truckRig.setUpgradeVisuals(this.upgrades.blade, this.upgrades.heater);
    this.syncTruckTransform();
    this.clearPct = computeClearStats(this.cells).clearPct;
  }

  private spawnPickup(kind: 'cocoa' | 'star', x: number, z: number): void {
    const id = this.nextPickupId++;
    const p: PickupState = {
      id,
      kind,
      x,
      z,
      collected: false,
      bobOffset: Math.random() * Math.PI * 2,
    };
    this.pickups.push(p);
    const mesh = createPickupMesh(kind);
    mesh.position.set(x, 0.25, z);
    this.worldGroup.add(mesh);
    this.pickupMeshes.set(id, mesh);
  }

  private setSnowCellVisual(index: number): void {
    if (!this.snowInstancedMesh) return;
    const cell = this.cells[index];
    if (!cell || cell.kind !== 'road' || cell.depth <= 0.05) {
      _dummy.position.set(0, -10, 0);
      _dummy.scale.set(0, 0, 0);
      _dummy.rotation.set(0, 0, 0);
      _dummy.updateMatrix();
      this.snowInstancedMesh.setMatrixAt(index, _dummy.matrix);
      return;
    }

    const pos = gridToWorld(cell.col, cell.row, this.district);
    const scaleY = cell.variant === 'deep' ? 1.15 * cell.depth : cell.variant === 'ice' ? 0.92 * cell.depth : 0.85 * cell.depth;
    const scaleXZ = cell.variant === 'ice' ? 1.02 : 1.08;
    _dummy.position.set(pos.x, 0.015, pos.z);
    _dummy.rotation.set(0, ((cell.col * 7 + cell.row * 13) % 4) * (Math.PI / 2), 0);
    _dummy.scale.set(scaleXZ, scaleY, scaleXZ);
    _dummy.updateMatrix();
    this.snowInstancedMesh.setMatrixAt(index, _dummy.matrix);

    if (cell.variant === 'ice') {
      _color.setHex(0x7fd6f5);
    } else if (cell.variant === 'golden') {
      _color.setHex(0xffdf7a);
    } else if (cell.variant === 'deep') {
      _color.setHex(0xdcebfa);
    } else {
      _color.setHex(0xf1f7ff);
    }
    this.snowInstancedMesh.setColorAt(index, _color);
  }

  private rebuildAllSnowInstances(): void {
    if (!this.snowInstancedMesh) return;
    for (let i = 0; i < this.cells.length; i++) {
      this.setSnowCellVisual(i);
    }
    this.snowInstancedMesh.instanceMatrix.needsUpdate = true;
    if (this.snowInstancedMesh.instanceColor) {
      this.snowInstancedMesh.instanceColor.needsUpdate = true;
    }
    this.snowInstancedMesh.computeBoundingSphere();
  }

  private spawnParticle(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    size: number,
    life: number,
    gravity: number,
    hexColor: number,
  ): void {
    const p = this.particles[this.particleCursor];
    this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;
    p.active = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.gravity = gravity;
    _color.setHex(hexColor);
    p.r = _color.r;
    p.g = _color.g;
    p.b = _color.b;
    p.rotY = Math.random() * Math.PI * 2;
    p.rotSpeed = (Math.random() - 0.5) * 9;
  }

  private emitSnowSpray(x: number, z: number, count: number, colorHex: number): void {
    const fwdX = -Math.sin(this.truckYaw);
    const fwdZ = -Math.cos(this.truckYaw);
    const rightX = Math.cos(this.truckYaw);
    const rightZ = -Math.sin(this.truckYaw);

    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const spread = 2.6 + Math.random() * 2.4;
      const vx = rightX * side * spread + fwdX * (1.2 + Math.random() * 1.6);
      const vz = rightZ * side * spread + fwdZ * (1.2 + Math.random() * 1.6);
      const vy = 2.4 + Math.random() * 2.8;
      this.spawnParticle(
        x + (Math.random() - 0.5) * 0.6,
        0.35 + Math.random() * 0.25,
        z + (Math.random() - 0.5) * 0.6,
        vx,
        vy,
        vz,
        0.75 + Math.random() * 0.65,
        0.42 + Math.random() * 0.26,
        13.5,
        colorHex,
      );
    }
  }

  private emitRadialBurst(x: number, y: number, z: number, count: number, colorHex: number, speed = 5.5, rise = 4.2): void {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.35;
      const spd = speed * (0.55 + Math.random() * 0.75);
      this.spawnParticle(
        x,
        y,
        z,
        Math.cos(ang) * spd,
        rise * (0.6 + Math.random() * 0.7),
        Math.sin(ang) * spd,
        0.95 + Math.random() * 0.7,
        0.52 + Math.random() * 0.35,
        9.5,
        colorHex,
      );
    }
  }

  private showCallout(title: string, detail: string, tone: 'gold' | 'warm' | 'ice'): void {
    this.callout = {
      id: this.nextCalloutId++,
      title,
      detail,
      tone,
    };
    this.calloutTimer = 2.4;
    this.emitHud(true);
  }

  // --- Public Control API for React UI ---

  public setMode(mode: GameMode): void {
    this.mode = mode;
    this.emitHud(true);
  }

  public startNewGame(mode?: GameMode): void {
    if (mode) this.mode = mode;
    this.audio.unlock();
    this.keysHeld.clear();
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
    this.garageOpen = false;
    this.upgrades = { ...DEFAULT_UPGRADES };
    this.coins = 0;
    this.score = 0;
    this.districtIndex = 0;
    this.loadDistrict(0, true);
    this.setPhase('playing');
    this.showCallout('Pinebrook Square', 'Clear 82% & unbury all 3 cottages', 'warm');
  }

  public startNextDistrict(): void {
    this.audio.unlock();
    this.keysHeld.clear();
    this.garageOpen = false;
    this.loadDistrict(this.districtIndex + 1, true);
    this.setPhase('playing');
    this.showCallout(this.district.name, this.district.subtitle, 'warm');
  }

  public retryDistrict(): void {
    this.audio.unlock();
    this.keysHeld.clear();
    this.garageOpen = false;
    this.loadDistrict(this.districtIndex, true);
    this.setPhase('playing');
    this.showCallout(this.district.name, 'Fresh plow shift started', 'warm');
  }

  public returnToTitle(): void {
    this.keysHeld.clear();
    this.garageOpen = false;
    this.audio.silenceLoops();
    this.loadDistrict(0, true);
    this.setPhase('title');
  }

  public togglePause(): void {
    if (this.phase === 'playing') {
      this.garageOpen = false;
      this.keysHeld.clear();
      this.audio.silenceLoops();
      this.setPhase('paused');
    } else if (this.phase === 'paused') {
      this.keysHeld.clear();
      this.setPhase('playing');
    }
  }

  public setGarageOpen(open: boolean): void {
    if (this.phase !== 'playing' && this.phase !== 'gameover') return;
    this.garageOpen = open;
    if (open) {
      this.keysHeld.clear();
      this.audio.silenceLoops();
    }
    this.emitHud(true);
  }

  public buyUpgrade(id: UpgradeId): boolean {
    this.audio.unlock();
    const res = purchaseUpgrade(id, this.upgrades, this.coins);
    if (!res.purchased) return false;
    this.upgrades = res.nextLevels;
    this.coins = res.nextCoins;
    this.truckRig.setUpgradeVisuals(this.upgrades.blade, this.upgrades.heater);
    this.audio.playUpgradeChime();
    this.bodySquash = 0.22;
    this.emitRadialBurst(this.truckX, 1.0, this.truckZ, 16, 0xffd25a, 4.2, 3.8);
    this.emitHud(true);
    return true;
  }

  public toggleMute(): void {
    this.audio.unlock();
    this.audio.toggleMute();
    this.emitHud(true);
  }

  public triggerSteamBoost(): void {
    if (this.phase !== 'playing' || this.garageOpen) return;
    this.audio.unlock();
    this.steamBufferTimer = 0.14;
  }

  public setVirtualMove(x: number, y: number): void {
    this.virtualMoveX = THREE.MathUtils.clamp(x, -1, 1);
    this.virtualMoveY = THREE.MathUtils.clamp(y, -1, 1);
  }

  private setPhase(next: GamePhase): void {
    this.phase = next;
    document.body.dataset.state = next;
    this.emitHud(true);
  }

  // --- Input Event Handlers ---

  private onKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;

    // Prevent page scroll on gameplay keys
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      e.preventDefault();
    }

    if (this.phase === 'title') {
      if (code === 'Enter' || code === 'Space') {
        this.startNewGame();
      }
      return;
    }

    if (code === 'KeyM') {
      this.toggleMute();
      return;
    }

    if (this.phase === 'playing') {
      if (code === 'KeyU' || code === 'Tab') {
        e.preventDefault();
        this.setGarageOpen(!this.garageOpen);
        return;
      }
      if (this.garageOpen) {
        if (code === 'Escape') {
          this.setGarageOpen(false);
          return;
        }
        const upgradeKeyMap: Record<string, UpgradeId> = {
          Digit1: 'blade',
          Digit2: 'engine',
          Digit3: 'heater',
          Digit4: 'steam',
          Digit5: 'magnet',
        };
        if (upgradeKeyMap[code]) {
          this.buyUpgrade(upgradeKeyMap[code]);
        }
        return;
      }
      if (code === 'Escape' || code === 'KeyP') {
        this.togglePause();
        return;
      }
      if (code === 'KeyR') {
        this.retryDistrict();
        return;
      }
      if (code === 'Space' && !e.repeat) {
        this.audio.unlock();
        this.steamBufferTimer = 0.14;
        return;
      }
      this.audio.unlock();
      this.keysHeld.add(code);
    } else if (this.phase === 'paused') {
      if (code === 'Escape' || code === 'KeyP') {
        this.togglePause();
      } else if (code === 'KeyR') {
        this.retryDistrict();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysHeld.delete(e.code);
  };

  private onWindowBlur = (): void => {
    this.keysHeld.clear();
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.keysHeld.clear();
      this.virtualMoveX = 0;
      this.virtualMoveY = 0;
      this.audio.silenceLoops();
    }
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
  };

  // --- Main Simulation & Render Tick ---

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTickTime) / 1000;
    this.lastTickTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.updateAmbientWorld(dt, now * 0.001);

    if (this.phase === 'title') {
      this.updateTitleCamera(dt);
    } else if (this.phase === 'playing') {
      if (!this.garageOpen) {
        if (this.hitstopTimer > 0) {
          this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
        } else {
          this.updateGameplay(dt);
        }
      }
      this.updateGameplayCamera(dt);
    } else {
      // Paused or GameOver: gentle camera settle
      this.updateGameplayCamera(dt);
    }

    // Visual-only juice timers continue ticking during hitstop
    this.updateParticles(dt);
    this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.4);
    this.bodySquash = THREE.MathUtils.damp(this.bodySquash, 0, 12, dt);

    if (this.calloutTimer > 0) {
      this.calloutTimer -= dt;
      if (this.calloutTimer <= 0) {
        this.callout = null;
        this.emitHud(true);
      }
    }

    this.renderer.render(this.scene, this.camera);

    // Throttled HUD updates (~10Hz)
    if (now - this.lastHudEmit >= 95) {
      this.emitHud(false);
    }

    this.scheduleNextTick();
  };

  private updateAmbientWorld(dt: number, elapsedSec: number): void {
    // Rotate truck amber beacon
    this.truckRig.beaconMesh.rotation.y += dt * 4.5;

    // Gentle snowfall drift
    const pos = this.snowfallPositions;
    for (let i = 0; i < SNOWFLAKE_COUNT; i++) {
      const ix = i * 3;
      pos[ix] += Math.sin(elapsedSec * 0.8 + i) * 0.55 * dt;
      pos[ix + 1] -= (1.5 + (i % 5) * 0.25) * dt;
      pos[ix + 2] += 0.35 * dt;
      if (pos[ix + 1] < 0) {
        pos[ix] = this.camFocusX + (Math.random() - 0.5) * 40;
        pos[ix + 1] = 15 + Math.random() * 5;
        pos[ix + 2] = this.camFocusZ + (Math.random() - 0.5) * 40;
      }
    }
    this.snowfallPoints.geometry.attributes.position.needsUpdate = true;

    // Cottage chimney smoke puffs & rescue lighting transitions
    this.chimneySmokeAccum += dt;
    const emitSmoke = this.chimneySmokeAccum >= 0.42;
    if (emitSmoke) this.chimneySmokeAccum = 0;

    for (let i = 0; i < this.cottages.length; i++) {
      const c = this.cottages[i];
      const handle = this.cottageHandles[i];
      if (!handle) continue;

      if (c.rescued && c.rescueAnim < 1) {
        c.rescueAnim = Math.min(1, c.rescueAnim + dt * 1.8);
      }
      handle.setRescuedVisual(c.rescued, c.rescueAnim);

      // Gentle scale breathe on unrescued doorway ring
      if (!c.rescued) {
        const s = 1 + Math.sin(elapsedSec * 3.2 + i) * 0.08;
        handle.beaconRing.scale.set(s, s, 1);
      }

      if (emitSmoke && (c.rescued || i === 0)) {
        const top = handle.chimneyTopWorld;
        this.spawnParticle(
          top.x + (Math.random() - 0.5) * 0.15,
          top.y,
          top.z + (Math.random() - 0.5) * 0.15,
          0.35 + Math.random() * 0.25,
          1.25 + Math.random() * 0.4,
          0.2,
          c.rescued ? 1.0 : 0.65,
          1.6,
          -0.25,
          c.rescued ? 0xf6efe6 : 0xcbd8e6,
        );
      }
    }

    // Thermal grate ember ring pulse (brighter when carrying snow load)
    const carryingSnow = this.snowLoad >= 2.5;
    for (let i = 0; i < this.grateHandles.length; i++) {
      const g = this.grateHandles[i];
      const pulse = carryingSnow ? 1.06 + Math.sin(elapsedSec * 6.5 + i) * 0.12 : 1.0;
      g.ring.scale.set(pulse, pulse, 1);
      g.ringMat.opacity = carryingSnow ? 0.85 : 0.36;
    }

    // Pickup bob & spin
    for (const p of this.pickups) {
      if (p.collected) continue;
      const mesh = this.pickupMeshes.get(p.id);
      if (mesh) {
        mesh.position.set(p.x, 0.2 + Math.sin(elapsedSec * 3.0 + p.bobOffset) * 0.14, p.z);
        mesh.rotation.y += dt * 1.8;
      }
    }
  }

  private updateTitleCamera(dt: number): void {
    this.titleOrbitAngle += dt * 0.16;
    const radius = 25;
    const cx = Math.cos(this.titleOrbitAngle + Math.PI * 0.25) * radius;
    const cz = Math.sin(this.titleOrbitAngle + Math.PI * 0.25) * radius;
    this.camera.position.set(cx, 20.5, cz);
    this.camera.lookAt(-1.5, 0.8, -1.5);
    this.camZoom = THREE.MathUtils.damp(this.camZoom, 0.94, 4, dt);
    this.camera.zoom = this.camZoom;
    this.camera.updateProjectionMatrix();
  }

  private updateGameplayCamera(dt: number): void {
    const fwdX = -Math.sin(this.truckYaw);
    const fwdZ = -Math.cos(this.truckYaw);
    const lead = 1.65;
    const targetX = this.truckX + fwdX * lead;
    const targetZ = this.truckZ + fwdZ * lead;

    const k = 1 - Math.exp(-6.2 * dt);
    this.camFocusX += (targetX - this.camFocusX) * k;
    this.camFocusZ += (targetZ - this.camFocusZ) * k;

    // Decaying trauma^2 camera shake
    const shakeMag = this.shakeTrauma * this.shakeTrauma * 0.65;
    const sx = (Math.random() - 0.5) * 2 * shakeMag;
    const sy = (Math.random() - 0.5) * 2 * shakeMag;

    this.camera.position.set(this.camFocusX + 19 + sx, 22.5 + sy, this.camFocusZ + 19);
    this.camera.lookAt(this.camFocusX, 0.4, this.camFocusZ);

    const targetZoom = this.steamActiveTimer > 0 ? 0.96 : 1.02;
    this.camZoom = THREE.MathUtils.damp(this.camZoom, targetZoom, 6, dt);
    this.camera.zoom = this.camZoom;
    this.camera.updateProjectionMatrix();
  }

  private updateGameplay(dt: number): void {
    const stats = computeTruckStats(this.upgrades);

    // Timers
    this.timeElapsed += dt;
    if (this.mode === 'arcade') {
      this.timeRemaining = Math.max(0, this.timeRemaining - dt);
    }
    if (this.steamCooldownTimer > 0) this.steamCooldownTimer = Math.max(0, this.steamCooldownTimer - dt);
    if (this.steamActiveTimer > 0) this.steamActiveTimer = Math.max(0, this.steamActiveTimer - dt);
    if (this.steamBufferTimer > 0) this.steamBufferTimer = Math.max(0, this.steamBufferTimer - dt);
    if (this.speedBoostTimer > 0) this.speedBoostTimer = Math.max(0, this.speedBoostTimer - dt);
    if (this.iceBumpCooldown > 0) this.iceBumpCooldown = Math.max(0, this.iceBumpCooldown - dt);

    // Buffered Spacebar Steam Boost activation
    if (this.steamBufferTimer > 0 && this.steamCooldownTimer <= 0) {
      this.executeSteamBoost(stats);
    }

    // Gather screen-relative directional input (WASD + Arrows + Touch Virtual Stick)
    let inX = this.virtualMoveX;
    let inY = this.virtualMoveY;
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) inY += 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) inY -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) inX += 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) inX -= 1;

    const inputLen = Math.hypot(inX, inY);
    let desiredWorldX = 0;
    let desiredWorldZ = 0;
    if (inputLen > 0.05) {
      const nx = inX / Math.max(1, inputLen);
      const ny = inY / Math.max(1, inputLen);
      desiredWorldX = nx * ISO_RIGHT_X + ny * ISO_UP_X;
      desiredWorldZ = nx * ISO_RIGHT_Z + ny * ISO_UP_Z;
    }

    // Calculate speed (slightly heavier when snowLoad is packed, boosted during Steam/Cocoa surge)
    const loadDrag = 1 - Math.min(0.18, (this.snowLoad / stats.loadCapacity) * 0.16);
    const boostFactor = this.steamActiveTimer > 0 ? 1.55 : this.speedBoostTimer > 0 ? 1.28 : 1.0;
    const topSpeed = stats.maxSpeed * loadDrag * boostFactor;

    const targetVx = desiredWorldX * topSpeed;
    const targetVz = desiredWorldZ * topSpeed;

    const accelFactor = 1 - Math.exp(-(inputLen > 0.05 ? stats.accel * 0.35 : 9.0) * dt);
    this.truckVx += (targetVx - this.truckVx) * accelFactor;
    this.truckVz += (targetVz - this.truckVz) * accelFactor;

    const speed = Math.hypot(this.truckVx, this.truckVz);

    // Smooth steering rotation toward movement direction
    let steerDelta = 0;
    if (speed > 0.35) {
      const targetYaw = Math.atan2(-this.truckVx, -this.truckVz);
      let diff = targetYaw - this.truckYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      steerDelta = diff;
      const turnStep = 1 - Math.exp(-stats.turnRate * dt);
      this.truckYaw += diff * turnStep;
    }

    // Advance truck position & clamp inside courtyard curbs
    this.truckX += this.truckVx * dt;
    this.truckZ += this.truckVz * dt;

    const halfW = (this.district.gridCols * this.district.cellSize) / 2 - 0.85;
    const halfH = (this.district.gridRows * this.district.cellSize) / 2 - 0.85;
    if (this.truckX < -halfW) {
      this.truckX = -halfW;
      this.truckVx *= -0.2;
    } else if (this.truckX > halfW) {
      this.truckX = halfW;
      this.truckVx *= -0.2;
    }
    if (this.truckZ < -halfH) {
      this.truckZ = -halfH;
      this.truckVz *= -0.2;
    } else if (this.truckZ > halfH) {
      this.truckZ = halfH;
      this.truckVz *= -0.2;
    }

    // Distance-synced wheel rotation & steering visual
    this.wheelSpin += speed * dt * 2.85;
    for (const w of this.truckRig.wheels) {
      w.rotation.x = -this.wheelSpin;
    }
    const visualSteer = THREE.MathUtils.clamp(steerDelta * 0.7, -0.45, 0.45);
    for (const fp of this.truckRig.frontWheelPivots) {
      fp.rotation.y = visualSteer;
    }

    // Subtle suspension roll & squash-and-stretch
    this.truckRig.bodyPivot.rotation.z = THREE.MathUtils.damp(
      this.truckRig.bodyPivot.rotation.z,
      -visualSteer * (speed / Math.max(1, topSpeed)) * 0.16,
      10,
      dt,
    );
    const sx = 1 + this.bodySquash * 0.35;
    const sy = 1 - this.bodySquash * 0.3;
    const sz = 1 + this.bodySquash * 0.25;
    this.truckRig.bodyPivot.scale.set(sx, sy, sz);

    // Engine exhaust puffs while driving
    this.exhaustAccum += dt * (0.6 + speed * 0.3);
    if (this.exhaustAccum >= 0.25) {
      this.exhaustAccum = 0;
      const fwdX = -Math.sin(this.truckYaw);
      const fwdZ = -Math.cos(this.truckYaw);
      const rightX = Math.cos(this.truckYaw);
      const rightZ = -Math.sin(this.truckYaw);
      this.spawnParticle(
        this.truckX + rightX * 0.56 - fwdX * 0.66,
        1.78,
        this.truckZ + rightZ * 0.56 - fwdZ * 0.66,
        -fwdX * 0.5 + (Math.random() - 0.5) * 0.3,
        1.4 + Math.random() * 0.4,
        -fwdZ * 0.5 + (Math.random() - 0.5) * 0.3,
        0.48,
        0.55,
        -0.4,
        this.steamActiveTimer > 0 ? 0xffb86c : 0xdce6f2,
      );
    }

    // Plow blade world center
    const fwdX = -Math.sin(this.truckYaw);
    const fwdZ = -Math.cos(this.truckYaw);
    const bladeX = this.truckX + fwdX * stats.bladeReach;
    const bladeZ = this.truckZ + fwdZ * stats.bladeReach;

    // Clear snow under plow footprint (wider during active steam surge)
    const activeRadius = this.steamActiveTimer > 0 ? stats.bladeHalfWidth * 1.45 : stats.bladeHalfWidth;
    const clearRes = clearSnowInFootprint(this.cells, this.district, bladeX, bladeZ, activeRadius, {
      heatLevel: stats.heatLevel,
      steamActive: this.steamActiveTimer > 0,
      comboMultiplier: this.combo.multiplier,
      coinBonusMult: stats.coinBonusMult,
    });

    const plowingActive = clearRes.clearedCount > 0;

    if (clearRes.iceBlockedCount > 0 && this.iceBumpCooldown <= 0) {
      this.iceBumpCooldown = 0.45;
      this.truckVx *= -0.35;
      this.truckVz *= -0.35;
      this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.35);
      this.audio.playIceBump();
      this.showCallout('Glacier Ice!', 'Press Space (Steam) or upgrade Hearth Coils', 'ice');
    }

    if (plowingActive) {
      // Update modified snow instances
      for (const idx of clearRes.clearedIndices) {
        this.setSnowCellVisual(idx);
      }
      if (this.snowInstancedMesh) {
        this.snowInstancedMesh.instanceMatrix.needsUpdate = true;
      }

      this.combo = advanceCombo(this.combo, clearRes.clearedCount, stats.comboGraceSeconds);
      this.coins += clearRes.coinsAwarded;
      this.coinsEarnedThisShift += clearRes.coinsAwarded;
      this.addScore(clearRes.scoreAwarded);
      this.snowLoad = Math.min(stats.loadCapacity, this.snowLoad + clearRes.snowVolumeGained);

      // Audio + particles scaled by snow variant
      if (clearRes.iceShatteredCount > 0) {
        this.audio.playIceShatter();
        this.emitSnowSpray(bladeX, bladeZ, 12, 0x8de2ff);
        this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.32);
      } else if (clearRes.goldenCount > 0) {
        this.audio.playSnowPluck(this.combo.multiplier, true);
        this.emitSnowSpray(bladeX, bladeZ, 10, 0xffe066);
      } else {
        this.audio.playSnowPluck(this.combo.multiplier, false);
        this.emitSnowSpray(bladeX, bladeZ, Math.min(8, 3 + clearRes.clearedCount), 0xf4f9ff);
      }

      // Recompute clear percentage & check cottage rescues
      this.clearPct = computeClearStats(this.cells).clearPct;
      const newlyRescued = checkCottageRescues(this.cells, this.district, this.cottages);
      for (const cottage of newlyRescued) {
        this.handleCottageRescue(cottage, stats);
      }
    } else {
      this.combo = tickCombo(this.combo, dt);
    }

    // Update snow-scrape audio loop
    this.audio.setScrapeIntensity(Math.min(1, speed / Math.max(1, stats.maxSpeed)), plowingActive || this.steamActiveTimer > 0);

    // Check proximity to Thermal Hearth Grates for Steam Melt Burst banking
    this.nearGrate = false;
    for (const g of this.grateHandles) {
      const dist = Math.hypot(bladeX - g.x, bladeZ - g.z);
      if (dist < 2.2) {
        this.nearGrate = true;
        if (this.snowLoad >= 2.5) {
          this.triggerThermalMelt(g.x, g.z, stats);
          break;
        }
      }
    }

    // Check Cocoa Thermos & Golden Star Pickups (with magnet pull)
    this.updatePickups(dt, stats);

    // Periodic bonus pickup drop to keep the plaza lively
    this.pickupSpawnAccum += dt;
    if (this.pickupSpawnAccum >= 20) {
      this.pickupSpawnAccum = 0;
      const activeCount = this.pickups.filter((p) => !p.collected).length;
      if (activeCount < 3) {
        const px = (Math.random() - 0.5) * halfW * 1.4;
        const pz = (Math.random() - 0.5) * halfH * 1.4;
        this.spawnPickup(Math.random() < 0.55 ? 'cocoa' : 'star', px, pz);
      }
    }

    // Update visible growing 3D snow mound in front of the blade
    const loadRatio = this.snowLoad / Math.max(1, stats.loadCapacity);
    if (loadRatio > 0.04) {
      this.truckRig.snowMound.visible = true;
      const wScale = 0.65 + loadRatio * 1.25;
      const hScale = 0.45 + loadRatio * 0.95;
      const jiggle = Math.sin(this.timeElapsed * 14) * 0.03 * loadRatio;
      this.truckRig.snowMound.scale.set(wScale, hScale + jiggle, 0.55 + loadRatio * 0.7);
    } else {
      this.truckRig.snowMound.visible = false;
    }

    this.syncTruckTransform();

    // Check Victory / Dusk outcome
    const rescuedCount = this.cottages.filter((c) => c.rescued).length;
    const outcome = evaluateShiftOutcome({
      clearPct: this.clearPct,
      targetClearPct: this.district.targetClearPct,
      rescuedCottages: rescuedCount,
      totalCottages: this.cottages.length,
      timeRemaining: this.timeRemaining,
      mode: this.mode,
    });

    if (outcome !== 'ongoing') {
      this.finishShift(outcome);
    }
  }

  private executeSteamBoost(stats: ReturnType<typeof computeTruckStats>): void {
    this.steamBufferTimer = 0;
    this.steamCooldownTimer = stats.steamCooldown;
    this.steamActiveTimer = stats.steamDuration;

    // Directional surge impulse
    const fwdX = -Math.sin(this.truckYaw);
    const fwdZ = -Math.cos(this.truckYaw);
    this.truckVx += fwdX * 8.5;
    this.truckVz += fwdZ * 8.5;

    // Radial snow + ice blast around the plow!
    const blastX = this.truckX + fwdX * 1.2;
    const blastZ = this.truckZ + fwdZ * 1.2;
    const res = clearSnowInFootprint(this.cells, this.district, blastX, blastZ, stats.steamRadius, {
      heatLevel: Math.max(2, stats.heatLevel),
      steamActive: true,
      comboMultiplier: this.combo.multiplier,
      coinBonusMult: stats.coinBonusMult,
    });

    if (res.clearedCount > 0) {
      for (const idx of res.clearedIndices) {
        this.setSnowCellVisual(idx);
      }
      if (this.snowInstancedMesh) this.snowInstancedMesh.instanceMatrix.needsUpdate = true;
      this.combo = advanceCombo(this.combo, res.clearedCount, stats.comboGraceSeconds);
      this.coins += res.coinsAwarded;
      this.coinsEarnedThisShift += res.coinsAwarded;
      this.addScore(res.scoreAwarded);
      this.snowLoad = Math.min(stats.loadCapacity, this.snowLoad + res.snowVolumeGained);
      this.clearPct = computeClearStats(this.cells).clearPct;

      const rescued = checkCottageRescues(this.cells, this.district, this.cottages);
      for (const c of rescued) this.handleCottageRescue(c, stats);
    } else if (this.combo.count > 0) {
      // Steam boost bridges combo timer even across cleared roads!
      this.combo.timer = Math.max(this.combo.timer, stats.comboGraceSeconds * 0.75);
    }

    this.bodySquash = -0.35;
    this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.55);
    this.hitstopTimer = 0.038;
    this.audio.playSteamBoost();
    this.emitRadialBurst(blastX, 0.55, blastZ, 24, 0xffc078, 6.4, 3.6);
    this.emitRadialBurst(blastX, 0.4, blastZ, 16, 0xf2f8ff, 5.2, 4.4);
    this.emitHud(true);
  }

  private triggerThermalMelt(gx: number, gz: number, stats: ReturnType<typeof computeTruckStats>): void {
    const payout = calculateMeltPayout(
      this.snowLoad,
      this.combo.multiplier,
      stats.heatLevel,
      stats.coinBonusMult,
    );
    const bankedLoad = Math.round(this.snowLoad);
    this.snowLoad = 0;

    if (payout.coins > 0) {
      this.coins += payout.coins;
      this.coinsEarnedThisShift += payout.coins;
      this.addScore(payout.score);
      this.combo = advanceCombo(this.combo, Math.max(3, Math.floor(bankedLoad * 0.6)), stats.comboGraceSeconds);
      this.hitstopTimer = 0.048;
      this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.6);
      this.bodySquash = 0.3;
      this.audio.playWarmChord('melt');
      this.emitRadialBurst(gx, 0.45, gz, 26, 0xff9d3b, 5.2, 5.8);
      this.emitRadialBurst(gx, 0.6, gz, 14, 0xfff0b3, 4.0, 6.8);
      this.showCallout(
        'Thermal Melt Burst!',
        `+${payout.coins} coins · ×${this.combo.multiplier} combo`,
        'gold',
      );
    }
  }

  private handleCottageRescue(cottage: CottageRuntime, stats: ReturnType<typeof computeTruckStats>): void {
    const bonusCoins = Math.round(75 * (1 + (this.combo.multiplier - 1) * 0.25) * stats.coinBonusMult);
    const bonusScore = 650 * this.combo.multiplier;
    this.coins += bonusCoins;
    this.coinsEarnedThisShift += bonusCoins;
    this.addScore(bonusScore);
    this.combo = advanceCombo(this.combo, 8, stats.comboGraceSeconds);
    if (this.mode === 'arcade') {
      this.timeRemaining += 12;
    }

    this.hitstopTimer = 0.055;
    this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.52);
    this.audio.playWarmChord('cottage');
    this.emitRadialBurst(cottage.x, 1.8, cottage.z, 26, 0xffd35c, 5.6, 5.5);

    const timeNote = this.mode === 'arcade' ? ' · +12s' : '';
    this.showCallout(`${cottage.name} Warmed!`, `+${bonusCoins} coins${timeNote}`, 'warm');
  }

  private updatePickups(dt: number, stats: ReturnType<typeof computeTruckStats>): void {
    for (const p of this.pickups) {
      if (p.collected) continue;
      const dx = this.truckX - p.x;
      const dz = this.truckZ - p.z;
      const dist = Math.hypot(dx, dz);

      if (dist < stats.magnetRadius && dist > 0.1) {
        const pull = (1 - dist / stats.magnetRadius) * 10.5 * dt;
        p.x += (dx / dist) * pull;
        p.z += (dz / dist) * pull;
      }

      if (dist < 1.55) {
        p.collected = true;
        const mesh = this.pickupMeshes.get(p.id);
        if (mesh) {
          this.worldGroup.remove(mesh);
          this.pickupMeshes.delete(p.id);
        }

        if (p.kind === 'cocoa') {
          this.steamCooldownTimer = 0;
          this.speedBoostTimer = 4.5;
          this.combo = advanceCombo(this.combo, 4, stats.comboGraceSeconds);
          this.audio.playUpgradeChime();
          this.emitRadialBurst(p.x, 0.7, p.z, 18, 0xff9340, 4.8, 4.5);
          this.showCallout('Hot Cocoa Boost!', 'Steam Refilled + Speed Surge', 'warm');
        } else {
          const starCoins = Math.round(40 * (1 + (this.combo.multiplier - 1) * 0.25) * stats.coinBonusMult);
          this.coins += starCoins;
          this.coinsEarnedThisShift += starCoins;
          this.addScore(400 * this.combo.multiplier);
          this.combo = advanceCombo(this.combo, 6, stats.comboGraceSeconds);
          this.audio.playSnowPluck(this.combo.multiplier + 3, true);
          this.emitRadialBurst(p.x, 0.7, p.z, 18, 0xffe46b, 4.8, 4.8);
          this.showCallout('Alpine Star!', `+${starCoins} coins · Combo Up`, 'gold');
        }
      }
    }
  }

  private addScore(points: number): void {
    this.score += Math.round(points);
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        window.localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(this.bestScore));
      } catch {
        // Ignore storage restrictions
      }
    }
  }

  private finishShift(outcome: 'victory' | 'dusk'): void {
    this.keysHeld.clear();
    this.garageOpen = false;
    this.audio.silenceLoops();

    if (outcome === 'victory') {
      const clearBonus = Math.round(90 + this.districtIndex * 35);
      this.coins += clearBonus;
      this.coinsEarnedThisShift += clearBonus;
      this.addScore(1500 + Math.round(this.timeRemaining) * 25);
      this.audio.playWarmChord('victory');
      this.emitRadialBurst(this.truckX, 1.4, this.truckZ, 36, 0xffd75e, 6.5, 6.5);
    } else {
      this.audio.playDuskChime();
    }

    const rescuedCottages = this.cottages.filter((c) => c.rescued).length;
    const summary: RunSummary = {
      outcome,
      districtIndex: this.districtIndex,
      districtName: this.district.name,
      clearPct: Math.round(this.clearPct),
      targetClearPct: this.district.targetClearPct,
      rescuedCottages,
      totalCottages: this.cottages.length,
      peakCombo: this.combo.peakMultiplier,
      coinsEarnedThisShift: this.coinsEarnedThisShift,
      totalCoins: this.coins,
      score: this.score,
      bestScore: this.bestScore,
      timeElapsed: Math.round(this.timeElapsed),
    };

    this.setPhase('gameover');
    this.callbacks.onRunEnd(summary);
  }

  private syncTruckTransform(): void {
    this.truckRig.root.position.set(this.truckX, 0, this.truckZ);
    this.truckRig.root.rotation.y = this.truckYaw;
  }

  private updateParticles(dt: number): void {
    let anyDirty = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyDirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _dummy.position.set(0, -50, 0);
        _dummy.scale.setScalar(0);
        _dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.08 && p.gravity > 0) {
        p.y = 0.08;
        p.vy *= -0.25;
        p.vx *= 0.65;
        p.vz *= 0.65;
      }
      p.rotY += p.rotSpeed * dt;

      const t = p.life / p.maxLife;
      const scale = p.size * Math.min(1, t * 2.2);
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.rotation.set(p.rotY * 0.5, p.rotY, 0);
      _dummy.scale.setScalar(scale);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);

      _color.setRGB(p.r, p.g, p.b);
      this.particleMesh.setColorAt(i, _color);
    }

    if (anyDirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) {
        this.particleMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  private emitHud(force: boolean): void {
    const now = performance.now();
    if (!force && now - this.lastHudEmit < 90) return;
    this.lastHudEmit = now;

    const stats = computeTruckStats(this.upgrades);
    const rescuedCottages = this.cottages.filter((c) => c.rescued).length;
    const steamChargeRatio =
      stats.steamCooldown > 0
        ? THREE.MathUtils.clamp(1 - this.steamCooldownTimer / stats.steamCooldown, 0, 1)
        : 1;

    const snapshot: HudSnapshot = {
      phase: this.phase,
      mode: this.mode,
      districtIndex: this.districtIndex,
      districtName: this.district.name,
      clearPct: Math.round(this.clearPct),
      targetClearPct: this.district.targetClearPct,
      rescuedCottages,
      totalCottages: this.cottages.length,
      coins: this.coins,
      score: this.score,
      bestScore: this.bestScore,
      timeRemaining: Math.ceil(this.timeRemaining),
      comboMultiplier: this.combo.multiplier,
      comboCount: this.combo.count,
      comboTimerRatio: this.combo.maxTimer > 0 ? THREE.MathUtils.clamp(this.combo.timer / this.combo.maxTimer, 0, 1) : 0,
      snowLoadRatio: THREE.MathUtils.clamp(this.snowLoad / Math.max(1, stats.loadCapacity), 0, 1),
      snowLoadAmount: Math.round(this.snowLoad),
      steamChargeRatio,
      steamReady: this.steamCooldownTimer <= 0,
      nearGrate: this.nearGrate,
      upgrades: { ...this.upgrades },
      affordableUpgradeCount: countAffordableUpgrades(this.upgrades, this.coins),
      garageOpen: this.garageOpen,
      muted: this.audio.isMuted(),
      callout: this.callout,
    };

    // Keep unused scratch vectors referenced cleanly
    void _vec3A;
    void _vec3B;

    this.callbacks.onHudUpdate(snapshot);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.resizeObserver?.disconnect();

    this.audio.dispose();
    this.textures.dispose();
    this.envRenderTarget.dispose();
    this.snowGeo.dispose();
    this.snowMat.dispose();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.snowfallPoints.geometry.dispose();
    (this.snowfallPoints.material as THREE.Material).dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
