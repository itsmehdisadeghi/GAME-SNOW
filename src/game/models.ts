import * as THREE from 'three';

export interface PlowTruckRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  bladePivot: THREE.Group;
  heaterCoilMesh: THREE.Mesh;
  snowMound: THREE.Mesh;
  beaconMesh: THREE.Mesh;
  wheels: THREE.Object3D[];
  frontWheelPivots: THREE.Group[];
  headlightGlow: THREE.MeshStandardMaterial;
  setUpgradeVisuals: (bladeLevel: number, heaterLevel: number) => void;
}

/**
 * Composite 11-part procedural Vintage Alpine Mini-Plow Truck.
 * Pivoted at bottom-center (y = 0) so wheels sit flush on the cobblestone ground.
 */
export function createPlowTruck(contactShadowTex: THREE.Texture): PlowTruckRig {
  const root = new THREE.Group();

  // Contact shadow disc directly beneath chassis (y = 0.025)
  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 3.6),
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    }),
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.025;
  root.add(shadowMesh);

  // Suspension body pivot (for squash-and-stretch & turning body roll)
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // Shared calibrated PBR materials (varying roughness >= 0.25 between parts)
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x262d36,
    roughness: 0.52,
    metalness: 0.72,
  });
  const redPaintMat = new THREE.MeshStandardMaterial({
    color: 0xc93b2b,
    roughness: 0.36,
    metalness: 0.18,
  });
  const creamTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf4ead8,
    roughness: 0.55,
    metalness: 0.05,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x875835,
    roughness: 0.84,
    metalness: 0.04,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x2c4b66,
    roughness: 0.12,
    metalness: 0.25,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd9a13b,
    roughness: 0.28,
    metalness: 0.85,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1d2024,
    roughness: 0.9,
    metalness: 0.05,
  });
  const headlightGlow = new THREE.MeshStandardMaterial({
    color: 0xfff5d4,
    emissive: 0xffc663,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });

  // 1. Forged iron chassis rail frame
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.24, 2.3), ironMat);
  chassis.position.set(0, 0.42, 0.05);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  bodyPivot.add(chassis);

  // 2. Sculpted beveled cherry-red cab (ExtrudeGeometry)
  const cabShape = new THREE.Shape();
  cabShape.moveTo(-0.56, 0);
  cabShape.lineTo(0.56, 0);
  cabShape.lineTo(0.56, 0.52);
  cabShape.lineTo(0.42, 0.98);
  cabShape.lineTo(-0.42, 0.98);
  cabShape.lineTo(-0.56, 0.52);
  cabShape.closePath();

  const cabGeo = new THREE.ExtrudeGeometry(cabShape, {
    depth: 1.05,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  cabGeo.center();
  const cab = new THREE.Mesh(cabGeo, redPaintMat);
  cab.position.set(0, 0.98, 0.15);
  cab.castShadow = true;
  cab.receiveShadow = true;
  bodyPivot.add(cab);

  // Cream roof cap
  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.1, 1.08), creamTrimMat);
  roofCap.position.set(0, 1.54, 0.15);
  roofCap.castShadow = true;
  bodyPivot.add(roofCap);

  // 3. Engine hood (forward -Z is forward)
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.44, 0.72), redPaintMat);
  hood.position.set(0, 0.74, -0.74);
  hood.castShadow = true;
  hood.receiveShadow = true;
  bodyPivot.add(hood);

  // Brass front grille
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.28, 0.06), brassMat);
  grille.position.set(0, 0.7, -1.11);
  bodyPivot.add(grille);

  // 4. Panoramic Windshield & Side Windows
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.38, 0.06), glassMat);
  windshield.position.set(0, 1.18, -0.4);
  windshield.rotation.x = -0.18;
  bodyPivot.add(windshield);

  const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.34, 0.76), glassMat);
  sideWindow.position.set(0, 1.18, 0.18);
  bodyPivot.add(sideWindow);

  // 5. Rear Timber Cargo Bed with Brass Salt Hopper
  const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.14, 0.88), woodMat);
  bedFloor.position.set(0, 0.62, 0.92);
  bedFloor.castShadow = true;
  bodyPivot.add(bedFloor);

  const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.86), woodMat);
  leftRail.position.set(-0.58, 0.82, 0.92);
  bodyPivot.add(leftRail);

  const rightRail = leftRail.clone();
  rightRail.position.x = 0.58;
  bodyPivot.add(rightRail);

  const rearRail = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.32, 0.08), woodMat);
  rearRail.position.set(0, 0.82, 1.32);
  bodyPivot.add(rearRail);

  // Cozy brass steam boiler tank nestled in the cargo bed
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.72, 14), brassMat);
  boiler.rotation.z = Math.PI / 2;
  boiler.position.set(0, 0.92, 0.92);
  boiler.castShadow = true;
  bodyPivot.add(boiler);

  // Exhaust chimney stack
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.95, 10), ironMat);
  exhaust.position.set(0.56, 1.24, 0.66);
  exhaust.castShadow = true;
  bodyPivot.add(exhaust);

  // 6. Twin Warm Headlights
  const lampGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12);
  lampGeo.rotateX(Math.PI / 2);
  const leftLamp = new THREE.Mesh(lampGeo, headlightGlow);
  leftLamp.position.set(-0.42, 0.72, -1.12);
  bodyPivot.add(leftLamp);

  const rightLamp = leftLamp.clone();
  rightLamp.position.x = 0.42;
  bodyPivot.add(rightLamp);

  // Soft warm headlight ground glow pools ahead of the plow blade
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffe4a8,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const beamGeo = new THREE.CircleGeometry(1.15, 16);
  const leftBeam = new THREE.Mesh(beamGeo, beamMat);
  leftBeam.rotation.x = -Math.PI / 2;
  leftBeam.scale.set(0.75, 1.45, 1);
  leftBeam.position.set(-0.48, 0.04, -2.55);
  const rightBeam = leftBeam.clone();
  rightBeam.position.x = 0.48;
  bodyPivot.add(leftBeam, rightBeam);

  // 7. Roof Rotating Amber Beacon
  const beaconBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.08, 12), ironMat);
  beaconBase.position.set(0, 1.62, 0.12);
  bodyPivot.add(beaconBase);

  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xffb733,
    emissive: 0xff8c1a,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });
  const beaconMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.18, 10), beaconMat);
  beaconMesh.position.set(0, 1.74, 0.12);
  bodyPivot.add(beaconMesh);

  // 8. Articulated 4 Chunky Snow Wheels + Brass Hubcaps
  const wheels: THREE.Object3D[] = [];
  const frontWheelPivots: THREE.Group[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.28, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.3, 10);
  hubGeo.rotateZ(Math.PI / 2);

  const wheelCoords: Array<{ x: number; z: number; front: boolean }> = [
    { x: -0.68, z: -0.72, front: true },
    { x: 0.68, z: -0.72, front: true },
    { x: -0.68, z: 0.78, front: false },
    { x: 0.68, z: 0.78, front: false },
  ];

  for (const wc of wheelCoords) {
    const pivot = new THREE.Group();
    pivot.position.set(wc.x, 0.35, wc.z);
    const wheelGroup = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.castShadow = true;
    const hub = new THREE.Mesh(hubGeo, brassMat);
    wheelGroup.add(tire, hub);
    pivot.add(wheelGroup);
    root.add(pivot);
    wheels.push(wheelGroup);
    if (wc.front) frontWheelPivots.push(pivot);
  }

  // 9. Curved Brass V-Plow Blade + Hydraulic Arms (Scales dynamically with upgrade level!)
  const bladePivot = new THREE.Group();
  bladePivot.position.set(0, 0.36, -1.26);
  bodyPivot.add(bladePivot);

  // Hydraulic push arms
  const armGeo = new THREE.BoxGeometry(0.1, 0.1, 0.42);
  const leftArm = new THREE.Mesh(armGeo, ironMat);
  leftArm.position.set(-0.34, 0.04, 0.18);
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.34;
  bladePivot.add(leftArm, rightArm);

  // Curved plow scoop blade
  const bladeCurveShape = new THREE.Shape();
  bladeCurveShape.moveTo(0, -0.32);
  bladeCurveShape.quadraticCurveTo(-0.24, 0, -0.04, 0.34);
  bladeCurveShape.lineTo(0.08, 0.34);
  bladeCurveShape.quadraticCurveTo(-0.1, 0, 0.12, -0.32);
  bladeCurveShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeCurveShape, {
    depth: 2.1,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  bladeGeo.center();
  bladeGeo.rotateY(Math.PI / 2);

  const bladeMesh = new THREE.Mesh(bladeGeo, brassMat);
  bladeMesh.position.set(0, 0.02, -0.1);
  bladeMesh.castShadow = true;
  bladeMesh.receiveShadow = true;
  bladePivot.add(bladeMesh);

  // Side snow-guide wings
  const wingGeo = new THREE.BoxGeometry(0.08, 0.58, 0.38);
  const leftWing = new THREE.Mesh(wingGeo, redPaintMat);
  leftWing.position.set(-1.08, 0.02, -0.2);
  leftWing.rotation.y = 0.25;
  const rightWing = leftWing.clone();
  rightWing.position.x = 1.08;
  rightWing.rotation.y = -0.25;
  bladePivot.add(leftWing, rightWing);

  // 10. Glowing Thermal Heater Coil bar along blade leading edge (visible when heater >= Lv 2)
  const heaterMat = new THREE.MeshStandardMaterial({
    color: 0xff6b1a,
    emissive: 0xff5200,
    emissiveIntensity: 2.2,
    roughness: 0.3,
  });
  const heaterCoilMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.02, 10), heaterMat);
  heaterCoilMesh.rotation.z = Math.PI / 2;
  heaterCoilMesh.position.set(0, -0.14, -0.22);
  heaterCoilMesh.visible = false;
  bladePivot.add(heaterCoilMesh);

  // 11. Dynamic Growing Snow Mound pushed in front of the blade
  const moundMat = new THREE.MeshStandardMaterial({
    color: 0xf4f9ff,
    roughness: 0.88,
    metalness: 0.02,
  });
  const snowMound = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), moundMat);
  snowMound.position.set(0, -0.05, -0.58);
  snowMound.scale.set(0.01, 0.01, 0.01);
  snowMound.visible = false;
  bladePivot.add(snowMound);

  const setUpgradeVisuals = (bladeLevel: number, heaterLevel: number) => {
    const widthScale = 1 + (bladeLevel - 1) * 0.2;
    bladePivot.scale.set(widthScale, 1 + (bladeLevel - 1) * 0.04, 1);
    heaterCoilMesh.visible = heaterLevel >= 2;
    heaterMat.emissiveIntensity = 1.4 + (heaterLevel - 1) * 0.55;
  };

  return {
    root,
    bodyPivot,
    bladePivot,
    heaterCoilMesh,
    snowMound,
    beaconMesh,
    wheels,
    frontWheelPivots,
    headlightGlow,
    setUpgradeVisuals,
  };
}

export interface CottageMeshHandle {
  group: THREE.Group;
  windowMat: THREE.MeshStandardMaterial;
  beaconRing: THREE.Mesh;
  beaconRingMat: THREE.MeshBasicMaterial;
  chimneyTopWorld: THREE.Vector3;
  setRescuedVisual: (rescued: boolean, animT: number) => void;
}

/**
 * Composite 8-part Alpine Cottage with pitched snow-capped roof, stone chimney,
 * warm glowing windows, and a doorway welcome ring.
 */
export function createCottageMesh(
  colorHex: number,
  roofHex: number,
  x: number,
  z: number,
  rotY: number,
): CottageMeshHandle {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x626770, roughness: 0.9 });
  const plasterMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.82 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x4b3326, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: roofHex, roughness: 0.65 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xeef5fc, roughness: 0.85 });

  // Windows transition from chilly dim blue-slate to radiant golden hearth light!
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x99b8d4,
    emissive: 0x4b6e8c,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });

  // Stone base plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.5, 3.4), stoneMat);
  plinth.position.y = 0.25;
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  group.add(plinth);

  // Main cottage walls
  const walls = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.0, 3.1), plasterMat);
  walls.position.y = 1.5;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // Corner timber beams
  const beamGeo = new THREE.BoxGeometry(0.18, 2.06, 0.18);
  for (const bx of [-1.72, 1.72]) {
    for (const bz of [-1.52, 1.52]) {
      const beam = new THREE.Mesh(beamGeo, timberMat);
      beam.position.set(bx, 1.5, bz);
      group.add(beam);
    }
  }

  // Pitched A-frame roof (ExtrudeGeometry)
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-2.15, 0);
  roofShape.lineTo(0, 1.85);
  roofShape.lineTo(2.15, 0);
  roofShape.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: 3.6,
    bevelEnabled: false,
  });
  roofGeo.center();
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 3.35;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  // Thick sculpted snow blanket cap over roof slopes
  const snowCapGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: 3.7,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  snowCapGeo.center();
  const snowCap = new THREE.Mesh(snowCapGeo, snowMat);
  snowCap.scale.set(1.03, 0.96, 1.01);
  snowCap.position.y = 3.5;
  snowCap.receiveShadow = true;
  group.add(snowCap);

  // Stone chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.8, 0.62), stoneMat);
  chimney.position.set(0.95, 3.85, -0.55);
  chimney.castShadow = true;
  group.add(chimney);

  // Wooden front door + porch awning (facing +Z in local space)
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.35, 0.12), timberMat);
  door.position.set(0, 1.15, 1.56);
  group.add(door);

  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 0.72), timberMat);
  porchRoof.position.set(0, 1.98, 1.82);
  porchRoof.rotation.x = 0.22;
  group.add(porchRoof);

  // Glowing front & side windows
  const winGeo = new THREE.BoxGeometry(0.62, 0.62, 0.1);
  const wLeft = new THREE.Mesh(winGeo, windowMat);
  wLeft.position.set(-1.05, 1.55, 1.54);
  const wRight = wLeft.clone();
  wRight.position.x = 1.05;
  const wTop = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.1), windowMat);
  wTop.position.set(0, 2.95, 1.8);
  group.add(wLeft, wRight, wTop);

  // Diegetic snow-zone ring + floating golden chevron above the doorway snowbank
  const beaconRingMat = new THREE.MeshBasicMaterial({
    color: 0xffc65c,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  const beaconRing = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.44, 24), beaconRingMat);
  beaconRing.rotation.x = -Math.PI / 2;
  beaconRing.position.set(0, 0.64, 2.75);
  group.add(beaconRing);

  const markerDiamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.32, 0),
    new THREE.MeshStandardMaterial({
      color: 0xffe28a,
      emissive: 0xff9b26,
      emissiveIntensity: 1.4,
      roughness: 0.25,
    }),
  );
  markerDiamond.position.set(0, 1.85, 2.75);
  group.add(markerDiamond);

  const chimneyLocal = new THREE.Vector3(0.95, 4.85, -0.55);
  group.updateMatrixWorld(true);
  const chimneyTopWorld = chimneyLocal.clone().applyMatrix4(group.matrixWorld);

  const coldColor = new THREE.Color(0x6d93ba);
  const warmColor = new THREE.Color(0xffe694);
  const coldEmissive = new THREE.Color(0x2e4e6e);
  const warmEmissive = new THREE.Color(0xff9c29);

  const setRescuedVisual = (rescued: boolean, animT: number) => {
    const t = rescued ? Math.min(1, animT) : 0;
    windowMat.color.lerpColors(coldColor, warmColor, t);
    windowMat.emissive.lerpColors(coldEmissive, warmEmissive, t);
    windowMat.emissiveIntensity = 0.45 + t * 2.15;
    beaconRingMat.color.setHex(rescued ? 0x76e0a3 : 0xffc65c);
    beaconRingMat.opacity = rescued ? Math.max(0, 0.75 * (1 - t)) : 0.78;
    beaconRing.visible = !rescued || t < 0.98;
    markerDiamond.visible = !rescued;
    if (!rescued) {
      markerDiamond.rotation.y += 0.04;
    }
  };

  return { group, windowMat, beaconRing, beaconRingMat, chimneyTopWorld, setRescuedVisual };
}

/**
 * Tall Village Clocktower Landmark visible in the opening spawn camera vista.
 */
export function createClocktowerMesh(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6b707a, roughness: 0.88 });
  const plasterMat = new THREE.MeshStandardMaterial({ color: 0xebe0cd, roughness: 0.78 });
  const slateMat = new THREE.MeshStandardMaterial({ color: 0x2f435a, roughness: 0.6 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xe0aa46, roughness: 0.28, metalness: 0.82 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf1f7fe, roughness: 0.85 });
  const clockFaceMat = new THREE.MeshStandardMaterial({
    color: 0xfff6dd,
    emissive: 0xffc668,
    emissiveIntensity: 1.25,
    roughness: 0.25,
  });

  // Stone base
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 3.4), stoneMat);
  base.position.y = 1.1;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Tall shaft
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.6, 5.2, 2.6), plasterMat);
  shaft.position.y = 4.8;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  group.add(shaft);

  // Glowing clock dial on south (+Z) face
  const dialFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.14, 20), brassMat);
  dialFrame.rotation.x = Math.PI / 2;
  dialFrame.position.set(0, 6.0, 1.32);
  group.add(dialFrame);

  const dialFace = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.16, 20), clockFaceMat);
  dialFace.rotation.x = Math.PI / 2;
  dialFace.position.set(0, 6.0, 1.34);
  group.add(dialFace);

  // Clock hands
  const handMat = new THREE.MeshBasicMaterial({ color: 0x1d2530 });
  const hHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.04), handMat);
  hHand.position.set(0.08, 6.14, 1.44);
  hHand.rotation.z = -0.5;
  const mHand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.56, 0.04), handMat);
  mHand.position.set(-0.14, 6.05, 1.44);
  mHand.rotation.z = 1.1;
  group.add(hHand, mHand);

  // Belfry eaves & steep spire
  const eaves = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 3.2), slateMat);
  eaves.position.y = 7.45;
  eaves.castShadow = true;
  group.add(eaves);

  const spire = new THREE.Mesh(new THREE.ConeGeometry(2.15, 3.4, 4), slateMat);
  spire.rotation.y = Math.PI / 4;
  spire.position.y = 9.3;
  spire.castShadow = true;
  group.add(spire);

  const snowCap = new THREE.Mesh(new THREE.ConeGeometry(1.45, 2.1, 4), snowMat);
  snowCap.rotation.y = Math.PI / 4;
  snowCap.position.y = 10.0;
  group.add(snowCap);

  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), brassMat);
  finial.position.y = 11.2;
  group.add(finial);

  return group;
}

/**
 * Cast-iron village street lantern with warm glowing amber glass.
 */
export function createStreetLantern(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const ironMat = new THREE.MeshStandardMaterial({ color: 0x252c35, roughness: 0.5, metalness: 0.72 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xffebc2,
    emissive: 0xffa73b,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.45, 8), ironMat);
  base.position.y = 0.225;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.55, 8), ironMat);
  pole.position.y = 1.65;
  pole.castShadow = true;

  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.44, 6), glowMat);
  lamp.position.y = 3.05;

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.28, 6), ironMat);
  cap.position.y = 3.4;

  group.add(base, pole, lamp, cap);
  return group;
}

/**
 * Recessed Thermal Hearth Grate for banking snow loads into steam melt bursts!
 */
export function createThermalGrate(
  x: number,
  z: number,
  emberTex: THREE.Texture,
): { group: THREE.Group; ringMat: THREE.MeshBasicMaterial; ring: THREE.Mesh } {
  const group = new THREE.Group();
  group.position.set(x, 0.03, z);

  const curbMat = new THREE.MeshStandardMaterial({ color: 0x454b54, roughness: 0.78, metalness: 0.35 });
  const curb = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.12, 1.75), curbMat);
  curb.receiveShadow = true;
  group.add(curb);

  const grateMat = new THREE.MeshStandardMaterial({
    map: emberTex,
    emissive: 0xff7020,
    emissiveMap: emberTex,
    emissiveIntensity: 1.35,
    roughness: 0.5,
  });
  const gratePlate = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 1.42), grateMat);
  gratePlate.rotation.x = -Math.PI / 2;
  gratePlate.position.y = 0.075;
  group.add(gratePlate);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffa63d,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.28, 24), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);

  return { group, ringMat, ring };
}

/**
 * Composite Cocoa Thermos / Golden Star pickup floating over the snow.
 */
export function createPickupMesh(kind: 'cocoa' | 'star'): THREE.Group {
  const group = new THREE.Group();

  if (kind === 'cocoa') {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd44032, roughness: 0.35, metalness: 0.25 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf0be59, roughness: 0.25, metalness: 0.8 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.62, 12), bodyMat);
    body.position.y = 0.45;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.2, 12), brassMat);
    cap.position.y = 0.84;
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.14, 12), brassMat);
    stripe.position.y = 0.42;
    group.add(body, cap, stripe);
  } else {
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd75e,
      emissive: 0xff9f1c,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.85,
    });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), goldMat);
    gem.position.y = 0.55;
    group.add(gem);
  }

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.62, 20),
    new THREE.MeshBasicMaterial({
      color: kind === 'cocoa' ? 0xff9e44 : 0xffe270,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.06;
  group.add(halo);

  return group;
}

/**
 * Builds instanced Snow-Laden Pine Forest encircling the alpine village perimeter
 * so the world feels nestled in a cozy mountain valley with zero boxed-void edges.
 */
export function createPerimeterPineForest(
  halfSpanX: number,
  halfSpanZ: number,
  seedOffset: number,
): THREE.Group {
  const forestGroup = new THREE.Group();

  const positions: Array<{ x: number; z: number; scale: number; rot: number; tint: number }> = [];
  const count = 88;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.sin(i * 3.7 + seedOffset) * 0.08;
    const ringLayer = i % 3;
    const dist = Math.max(halfSpanX, halfSpanZ) + 4.8 + ringLayer * 3.8 + ((i * 19) % 7) * 0.45;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    // Leave open sightline around the clocktower north plaza and cottage backs
    if (Math.abs(x) < halfSpanX + 2.6 && Math.abs(z) < halfSpanZ + 2.6) continue;
    if (Math.abs(x) < 3.4 && z < -halfSpanZ + 1.0 && z > -halfSpanZ - 6.0) continue;

    positions.push({
      x,
      z,
      scale: 0.82 + ((i * 31 + seedOffset * 17) % 100) / 220,
      rot: ((i * 73) % 360) * (Math.PI / 180),
      tint: ((i * 53) % 100) / 100,
    });
  }

  const n = positions.length;
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1.35, 7);
  trunkGeo.translate(0, 0.675, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4d3426, roughness: 0.9 });

  const tier1Geo = new THREE.ConeGeometry(1.55, 2.3, 7);
  tier1Geo.translate(0, 2.0, 0);
  const tier2Geo = new THREE.ConeGeometry(1.22, 2.0, 7);
  tier2Geo.translate(0, 3.2, 0);
  const snowTierGeo = new THREE.ConeGeometry(0.88, 1.45, 7);
  snowTierGeo.translate(0, 4.35, 0);

  const foliageMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xeef6ff, roughness: 0.88 });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, n);
  const tiers1 = new THREE.InstancedMesh(tier1Geo, foliageMat, n);
  const tiers2 = new THREE.InstancedMesh(tier2Geo, foliageMat, n);
  const snowCaps = new THREE.InstancedMesh(snowTierGeo, snowMat, n);

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < n; i++) {
    const p = positions[i];
    dummy.position.set(p.x, 0, p.z);
    dummy.rotation.set(0, p.rot, 0);
    dummy.scale.setScalar(p.scale);
    dummy.updateMatrix();

    trunks.setMatrixAt(i, dummy.matrix);
    tiers1.setMatrixAt(i, dummy.matrix);
    tiers2.setMatrixAt(i, dummy.matrix);
    snowCaps.setMatrixAt(i, dummy.matrix);

    // Subtle alpine pine tint variation
    color.setHSL(0.41 + (p.tint - 0.5) * 0.04, 0.36, 0.21 + p.tint * 0.07);
    tiers1.setColorAt(i, color);
    color.offsetHSL(0, 0.02, 0.04);
    tiers2.setColorAt(i, color);
  }

  trunks.instanceMatrix.needsUpdate = true;
  tiers1.instanceMatrix.needsUpdate = true;
  tiers2.instanceMatrix.needsUpdate = true;
  snowCaps.instanceMatrix.needsUpdate = true;
  if (tiers1.instanceColor) tiers1.instanceColor.needsUpdate = true;
  if (tiers2.instanceColor) tiers2.instanceColor.needsUpdate = true;

  trunks.computeBoundingSphere();
  tiers1.computeBoundingSphere();
  tiers2.computeBoundingSphere();
  snowCaps.computeBoundingSphere();

  tiers1.castShadow = true;
  tiers2.castShadow = true;
  snowCaps.receiveShadow = true;

  forestGroup.add(trunks, tiers1, tiers2, snowCaps);
  return forestGroup;
}
