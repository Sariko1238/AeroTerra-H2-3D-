/**
 * ==============================================================================
 * AEROTERRA H2 — SATELLITE 3D FLIGHT SIMULATOR & 6-DOF AERODYNAMIC ENGINE
 * ==============================================================================
 * • Real Google Satellite / Google Hybrid / Esri slippy map tile streaming
 * • Detailed 3D Model: AeroTerra H2 (Twin-Boom STOL with 4 DEP propellers)
 * • Working Mechanization: Retractable Gear (G), STOL Flaps (F), Spoilers (B)
 * • Special Operations: Water Drop salvo (Space), Agro ULV Spray (X), Aero Vectors (V)
 * • Glass Cockpit Avionics: 3 Dedicated HUD panels, Circular GPS Radar, Live Coordinates
 * • Guaranteed WebGL Canvas Startup with Daytime Sky Blue — Zero Black Screen!
 * ==============================================================================
 */

(function () {
  'use strict';

  // Global Flight Simulator Object
  window.AeroTerraSim = {
    initialized: false,
    running: false,
    paused: false,
    planeModel: 'full',      // 'full', 'rc', 'agro', 'fire'
    locationId: 'charvak',   // 'charvak', 'dubai', 'california', 'fergana', 'innsbruck'
    mapProvider: 'google-sat',// 'google-sat', 'google-hybrid', 'esri-terrain'
    timeOfDay: 'day',        // 'day', 'sunset', 'night'
    cameraMode: 'chase',     // 'chase', 'cockpit', 'satellite', 'orbit'
    audioEnabled: false,
    soundStarted: false,
    boostActive: false,
    boostTimer: 0,
    sensitivity: 1.0,
    apMode: {
      level: false,
      alt: false,
      hdg: false,
      targetAlt: 700,
      targetHdg: 90
    }
  };

  const SIM = window.AeroTerraSim;

  // ----------------------------------------------------------------------------
  // 1. LOCATIONS & SATELLITE COORDINATES TABLE
  // ----------------------------------------------------------------------------
  const LOCATIONS = {
    charvak: {
      id: 'charvak',
      name: '🇺🇿 Ташкент и Чарвак',
      lat: 41.6350,
      lon: 70.0350,
      alt: 700,
      heading: 90,
      desc: 'Чарвакское водохранилище и предгорные агро-кластеры Узбекистана'
    },
    dubai: {
      id: 'dubai',
      name: '🇦🇪 Дубай (DXB)',
      lat: 25.1972,
      lon: 55.2744,
      alt: 700,
      heading: 120,
      desc: 'Пальма Джумейра, Бурдж-Халифа и побережье Персидского залива'
    },
    california: {
      id: 'california',
      name: '🌲 Калифорния (Тахо)',
      lat: 39.0968,
      lon: -120.0324,
      alt: 700,
      heading: 320,
      desc: 'Лесной массив Сьерра-Невада и пожарный патрульный полигон'
    },
    fergana: {
      id: 'fergana',
      name: '🍏 Ферганская долина',
      lat: 40.3842,
      lon: 71.7843,
      alt: 700,
      heading: 80,
      desc: 'Фруктовые сады, хлопковые поля и каналы Ферганской долины'
    },
    innsbruck: {
      id: 'innsbruck',
      name: '🏔️ Альпы (Инсбрук)',
      lat: 47.2602,
      lon: 11.3440,
      alt: 700,
      heading: 260,
      desc: 'Горный STOL аэродром среди альпийских хребтов'
    }
  };

  // ----------------------------------------------------------------------------
  // 2. AIRCRAFT MODIFICATIONS SPECS
  // ----------------------------------------------------------------------------
  const PLANE_CONFIGS = {
    full: {
      name: 'AeroTerra H2 — Full-Scale',
      scale: 1.0,
      mass: 1638.0,
      wingspan: 12.4,
      wingArea: 13.35,
      thrustMax: 8400.0,
      fluidCapacity: 800,
      h2Capacity: 28.5,
      pitchAuth: 2.8,
      rollAuth: 3.5,
      yawAuth: 1.8
    },
    rc: {
      name: 'AeroTerra H2 — RC Prototype 1:5',
      scale: 0.35,
      mass: 25.0,
      wingspan: 3.2,
      wingArea: 1.1,
      thrustMax: 240.0,
      fluidCapacity: 10,
      h2Capacity: 1.5,
      pitchAuth: 5.2,
      rollAuth: 6.8,
      yawAuth: 3.5
    },
    agro: {
      name: 'AeroTerra Agro-Sprayer',
      scale: 1.0,
      mass: 1720.0,
      wingspan: 12.4,
      wingArea: 13.35,
      thrustMax: 8400.0,
      fluidCapacity: 800,
      h2Capacity: 28.5,
      pitchAuth: 2.6,
      rollAuth: 3.2,
      yawAuth: 1.7
    },
    fire: {
      name: 'AeroTerra Fire-Bomber',
      scale: 1.0,
      mass: 1850.0,
      wingspan: 12.4,
      wingArea: 13.35,
      thrustMax: 9200.0,
      fluidCapacity: 800,
      h2Capacity: 28.5,
      pitchAuth: 2.5,
      rollAuth: 3.0,
      yawAuth: 1.6
    }
  };

  // ----------------------------------------------------------------------------
  // 3. FLIGHT STATE & 6-DOF AERODYNAMICS
  // ----------------------------------------------------------------------------
  const flight = {
    // World coordinates in local meters (XZ flat ground, Y up)
    pos: new THREE.Vector3(0, 700, 0),
    vel: new THREE.Vector3(0, 0, 50),
    rot: new THREE.Euler(0, 0, 0, 'YXZ'),
    quat: new THREE.Quaternion(),

    // Pilot controls (-1 to +1, throttle 0 to 1)
    pitchInput: 0,
    rollInput: 0,
    yawInput: 0,
    throttle: 0.75,

    // Airspeeds & Altitude
    tas: 50.0,        // m/s
    ias: 180.0,       // km/h
    kts: 97.2,        // knots
    vsi: 0.0,         // m/s
    altMSL: 700.0,    // m
    altAGL: 700.0,    // m
    aoa: -1.5,        // degrees
    gLoad: 1.0,

    // Mechanization States
    gearPos: 0.0,     // 0 = retracted (UP), 1 = extended (DOWN)
    gearTarget: 0.0,
    flapsStage: 0,    // 0 = 0°, 1 = 15°, 2 = 35°
    flapsAngle: 0.0,  // radians
    spoilersActive: false,
    spoilersPos: 0.0, // 0 to 1

    // Missions & Consumables
    waterDropping: false,
    agroSpraying: false,
    showAeroVectors: false,
    h2MassRemaining: 28.5,
    fluidRemaining: 800,

    // Propellers RPM
    propRpm: 2400,
    propAngle: 0
  };

  // Three.js Core Globals
  let simCanvas, renderer, scene, camera;
  let ambientLight, sunLight, hemiLight;
  let planeGroup, fuselageMesh, wingMesh, leftBoom, rightBoom, tailGroup;
  let propMeshes = [];
  let gearMeshes = [];
  let flapMeshes = [];
  let spoilerMeshes = [];
  let aeroVectorGroup;
  let waterParticleSystem, sprayParticleSystem;
  let runwayGroup;

  // Slippy Map Tile System
  const mapTiles = new Map();
  const TILE_ZOOM = 15;
  let currentTileCenter = { tx: -1, ty: -1 };
  let currentOriginLat = LOCATIONS.charvak.lat;
  let currentOriginLon = LOCATIONS.charvak.lon;
  let textureLoader;

  // Radar
  let radarCanvas, radarCtx;

  // Audio Context & Oscillators
  let audioCtx, motorGain, motorOsc1, motorOsc2, windGain, windNoise;

  // Mouse orbit
  let isMouseDragging = false;
  let mousePrevX = 0, mousePrevY = 0;
  let orbitYaw = 0, orbitPitch = 0.2;

  // Clock
  const clock = new THREE.Clock();

  // ----------------------------------------------------------------------------
  // 4. MERCATOR SLIPPY MAP MATH
  // ----------------------------------------------------------------------------
  function lonToTileX(lon, zoom) {
    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  }

  function latToTileY(lat, zoom) {
    const latRad = lat * Math.PI / 180;
    return Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));
  }

  function tileXToLon(x, zoom) {
    return x / Math.pow(2, zoom) * 360 - 180;
  }

  function tileYToLat(y, zoom) {
    const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);
    return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  }

  function getTileMeters(lat, zoom) {
    return 40075016.68 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);
  }

  function getTileUrl(tx, ty, zoom, provider) {
    if (provider === 'google-hybrid') {
      return `https://mt1.google.com/vt/lyrs=y&x=${tx}&y=${ty}&z=${zoom}`;
    } else if (provider === 'esri-terrain') {
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`;
    }
    // Default Google Satellite
    return `https://mt1.google.com/vt/lyrs=s&x=${tx}&y=${ty}&z=${zoom}`;
  }

  // Procedural canvas fallback in case network tiles fail or are loading
  function createProceduralTileTexture(tx, ty) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Procedural terrain pattern
    const hue = ((tx * 13 + ty * 37) % 60) + 70; // Natural green-earth tones
    ctx.fillStyle = `hsl(${hue}, 42%, 28%)`;
    ctx.fillRect(0, 0, 256, 256);

    // Patchy field / orchard grid
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const patchHue = hue + ((i * 7 + j * 11) % 25) - 12;
        ctx.fillStyle = `hsla(${patchHue}, 48%, ${24 + (i + j) % 10}%, 0.7)`;
        ctx.fillRect(i * 32 + 2, j * 32 + 2, 28, 28);
      }
    }

    // Road / river streak
    ctx.strokeStyle = 'rgba(70, 60, 50, 0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, (tx * 31) % 256);
    ctx.bezierCurveTo(90, 80, 160, 180, 256, (ty * 43) % 256);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  // ----------------------------------------------------------------------------
  // 5. GUARANTEED 3D WORLD INITIALIZATION (NO BLACK SCREEN!)
  // ----------------------------------------------------------------------------
  function init3DWorld() {
    simCanvas = document.getElementById('simulator-canvas');
    if (!simCanvas) return;

    const container = document.getElementById('simulator-section') || document.body;
    const w = container.clientWidth > 0 ? container.clientWidth : window.innerWidth;
    const h = container.clientHeight > 0 ? container.clientHeight : Math.max(300, window.innerHeight - 70);

    // Renderer
    renderer = new THREE.WebGLRenderer({
      canvas: simCanvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Scene with GUARANTEED DAYLIGHT SKY BLUE & HORIZON FOG
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9ec5fe); // Sky blue
    scene.fog = new THREE.FogExp2(0xcbd5e1, 0.00018); // Horizon haze

    // Camera
    camera = new THREE.PerspectiveCamera(54, w / h, 0.5, 20000);
    camera.position.set(0, 704, -14);

    // Dynamic Lighting
    ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.55);
    scene.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xfff8e7, 1.35);
    sunLight.position.set(800, 1500, 1000);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 4000;
    const d = 300;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // Texture Loader
    textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';

    // Build Subsystems
    buildAircraftModel();
    buildSTOLRunway();
    buildParticleSystems();
    initRadar();

    // Initial position & tiles
    teleportToLocation(SIM.locationId, 700);

    // Weather preset
    setTimeOfDay(SIM.timeOfDay);

    // Resize listeners
    initResizeObserver();
  }

  // ----------------------------------------------------------------------------
  // 6. DETAILED 3D AIRCRAFT: AEROTERRA H2 TWIN-BOOM STOL
  // ----------------------------------------------------------------------------
  function buildAircraftModel() {
    planeGroup = new THREE.Group();
    planeGroup.name = 'AeroTerraH2';

    // Materials
    const carbonWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.28,
      metalness: 0.12
    });

    const cyanAccentMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      roughness: 0.2,
      metalness: 0.4,
      emissive: 0x003344
    });

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.5
    });

    const canopyGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.72,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.75,
      ior: 1.5
    });

    const h2TankMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      metalness: 0.6,
      roughness: 0.2,
      emissive: 0x083344
    });

    // 1. Aerodynamic Fuselage Pod (Length: 7.2m, Width: 1.2m, Height: 1.1m)
    const fuseGeo = new THREE.CylinderGeometry(0.55, 0.42, 6.4, 24);
    fuseGeo.rotateX(Math.PI / 2);
    fuseGeo.scale(1.0, 1.1, 1.0);
    fuselageMesh = new THREE.Mesh(fuseGeo, carbonWhiteMat);
    fuselageMesh.castShadow = true;
    fuselageMesh.receiveShadow = true;
    planeGroup.add(fuselageMesh);

    // Nose Cone
    const noseGeo = new THREE.ConeGeometry(0.42, 1.2, 24);
    noseGeo.rotateX(Math.PI / 2);
    const noseMesh = new THREE.Mesh(noseGeo, carbonWhiteMat);
    noseMesh.position.set(0, -0.05, 3.8);
    noseMesh.castShadow = true;
    planeGroup.add(noseMesh);

    // Cockpit Canopy
    const canopyGeo = new THREE.SphereGeometry(0.5, 20, 16);
    canopyGeo.scale(0.85, 0.7, 1.8);
    const canopyMesh = new THREE.Mesh(canopyGeo, canopyGlassMat);
    canopyMesh.position.set(0, 0.4, 1.4);
    planeGroup.add(canopyMesh);

    // Transparent Bay with Cyan Hydrogen Cryo-Tanks
    const bayGeo = new THREE.BoxGeometry(0.8, 0.6, 1.8);
    const bayMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      transmission: 0.8
    });
    const bayMesh = new THREE.Mesh(bayGeo, bayMat);
    bayMesh.position.set(0, -0.05, -0.6);
    planeGroup.add(bayMesh);

    // Twin H2 Cylinders inside bay
    for (const side of [-0.22, 0.22]) {
      const tankGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.4, 16);
      tankGeo.rotateX(Math.PI / 2);
      const tankMesh = new THREE.Mesh(tankGeo, h2TankMat);
      tankMesh.position.set(side, -0.05, -0.6);
      planeGroup.add(tankMesh);
    }

    // 2. High-Wing (Span: 12.4m, Chord: 1.2m, with dihedral & winglets)
    const wingGeo = new THREE.BoxGeometry(12.4, 0.14, 1.25);
    wingMesh = new THREE.Mesh(wingGeo, carbonWhiteMat);
    wingMesh.position.set(0, 0.55, 0.3);
    wingMesh.castShadow = true;
    wingMesh.receiveShadow = true;
    planeGroup.add(wingMesh);

    // Upturned Winglets (Cyan)
    for (const side of [-6.2, 6.2]) {
      const wingletGeo = new THREE.BoxGeometry(0.08, 0.75, 0.45);
      const wingletMesh = new THREE.Mesh(wingletGeo, cyanAccentMat);
      wingletMesh.position.set(side, 0.85, 0.3);
      wingletMesh.rotation.z = side > 0 ? -0.25 : 0.25;
      planeGroup.add(wingletMesh);
    }

    // STOL Flaps (Animated on trailing edge of the wing)
    flapMeshes = [];
    for (const side of [-2.4, 2.4]) {
      const flapPivot = new THREE.Group();
      flapPivot.position.set(side, 0.52, -0.32);

      const flapGeo = new THREE.BoxGeometry(3.6, 0.06, 0.35);
      const flapMesh = new THREE.Mesh(flapGeo, cyanAccentMat);
      flapMesh.position.set(0, 0, -0.175);
      flapPivot.add(flapMesh);

      planeGroup.add(flapPivot);
      flapMeshes.push(flapPivot);
    }

    // Spoilers / Airbrakes (Animated on top of wing)
    spoilerMeshes = [];
    for (const side of [-1.8, 1.8]) {
      const spPivot = new THREE.Group();
      spPivot.position.set(side, 0.62, 0.0);

      const spGeo = new THREE.BoxGeometry(1.6, 0.04, 0.25);
      const spMesh = new THREE.Mesh(spGeo, darkTrimMat);
      spMesh.position.set(0, 0, -0.125);
      spPivot.add(spMesh);

      planeGroup.add(spPivot);
      spoilerMeshes.push(spPivot);
    }

    // 3. 4 Distributed Electric Propulsion (DEP) Motors & Spinning Propellers
    propMeshes = [];
    const motorPositions = [-4.2, -1.8, 1.8, 4.2];
    motorPositions.forEach((posX) => {
      // Nacelle
      const nacGeo = new THREE.CylinderGeometry(0.2, 0.18, 0.9, 16);
      nacGeo.rotateX(Math.PI / 2);
      const nacMesh = new THREE.Mesh(nacGeo, carbonWhiteMat);
      nacMesh.position.set(posX, 0.52, 0.6);
      planeGroup.add(nacMesh);

      // Spinner nose
      const spinGeo = new THREE.ConeGeometry(0.12, 0.25, 16);
      spinGeo.rotateX(Math.PI / 2);
      const spinMesh = new THREE.Mesh(spinGeo, cyanAccentMat);
      spinMesh.position.set(posX, 0.52, 1.15);
      planeGroup.add(spinMesh);

      // 3-Bladed Propeller Group
      const propGroup = new THREE.Group();
      propGroup.position.set(posX, 0.52, 1.12);

      for (let b = 0; b < 3; b++) {
        const bladeGeo = new THREE.BoxGeometry(0.06, 0.72, 0.02);
        const bladeMesh = new THREE.Mesh(bladeGeo, darkTrimMat);
        bladeMesh.position.y = 0.36;
        bladeMesh.rotation.z = (b * Math.PI * 2) / 3;
        propGroup.add(bladeMesh);
      }

      planeGroup.add(propGroup);
      propMeshes.push(propGroup);
    });

    // 4. Twin-Boom Empennage & Inverted-U Tail
    const boomGeo = new THREE.CylinderGeometry(0.14, 0.1, 4.8, 16);
    boomGeo.rotateX(Math.PI / 2);

    for (const boomX of [-2.2, 2.2]) {
      const boom = new THREE.Mesh(boomGeo, carbonWhiteMat);
      boom.position.set(boomX, 0.45, -2.1);
      boom.castShadow = true;
      planeGroup.add(boom);

      // Vertical Stabilizers (Fins)
      const finGeo = new THREE.BoxGeometry(0.08, 1.4, 0.85);
      const finMesh = new THREE.Mesh(finGeo, carbonWhiteMat);
      finMesh.position.set(boomX, 1.1, -4.2);
      finMesh.castShadow = true;
      planeGroup.add(finMesh);

      // Rudder trim
      const rudGeo = new THREE.BoxGeometry(0.06, 1.2, 0.25);
      const rudMesh = new THREE.Mesh(rudGeo, cyanAccentMat);
      rudMesh.position.set(boomX, 1.1, -4.7);
      planeGroup.add(rudMesh);
    }

    // High Horizontal Stabilizer connecting the twin booms
    const hStabGeo = new THREE.BoxGeometry(4.6, 0.08, 0.75);
    const hStabMesh = new THREE.Mesh(hStabGeo, carbonWhiteMat);
    hStabMesh.position.set(0, 1.75, -4.2);
    hStabMesh.castShadow = true;
    planeGroup.add(hStabMesh);

    // Elevator trim
    const elevGeo = new THREE.BoxGeometry(4.4, 0.06, 0.22);
    const elevMesh = new THREE.Mesh(elevGeo, cyanAccentMat);
    elevMesh.position.set(0, 1.75, -4.68);
    planeGroup.add(elevMesh);

    // 5. Retractable Landing Gear (Animated Nose + Main Booms)
    gearMeshes = [];

    // Nose Gear (Pivot at x:0, y:-0.3, z:2.8)
    const noseGearPivot = new THREE.Group();
    noseGearPivot.position.set(0, -0.3, 2.8);
    const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75), darkTrimMat);
    noseStrut.position.set(0, -0.375, 0);
    noseGearPivot.add(noseStrut);
    const noseWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16), darkTrimMat);
    noseWheel.rotateZ(Math.PI / 2);
    noseWheel.position.set(0, -0.75, 0);
    noseGearPivot.add(noseWheel);
    planeGroup.add(noseGearPivot);
    gearMeshes.push({ pivot: noseGearPivot, restY: 0, retractRotX: -Math.PI / 2 });

    // Main Gears on Left and Right Booms
    for (const bX of [-2.2, 2.2]) {
      const mainPivot = new THREE.Group();
      mainPivot.position.set(bX, 0.1, -0.4);
      const mainStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.15), darkTrimMat);
      mainStrut.position.set(0, -0.575, 0);
      mainPivot.add(mainStrut);

      // Dual wheels
      for (const wSide of [-0.08, 0.08]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.09, 16), darkTrimMat);
        wheel.rotateZ(Math.PI / 2);
        wheel.position.set(wSide, -1.15, 0);
        mainPivot.add(wheel);
      }

      planeGroup.add(mainPivot);
      gearMeshes.push({ pivot: mainPivot, restY: 0, retractRotX: Math.PI / 2 });
    }

    // 6. 3D Aerodynamic Vector Helpers (L/T/D Arrows)
    aeroVectorGroup = new THREE.Group();
    aeroVectorGroup.name = 'AeroVectors';

    // Lift Vector (Green arrow pointing UP)
    const liftArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0.8, 0.3),
      3.2,
      0x00ff9d,
      0.6,
      0.3
    );
    liftArrow.name = 'liftArrow';
    aeroVectorGroup.add(liftArrow);

    // Thrust Vector (Cyan arrow pointing FORWARD)
    const thrustArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0.4, 4.0),
      2.8,
      0x00e5ff,
      0.5,
      0.25
    );
    thrustArrow.name = 'thrustArrow';
    aeroVectorGroup.add(thrustArrow);

    // Drag Vector (Red arrow pointing BACK)
    const dragArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0.4, -4.5),
      1.8,
      0xef4444,
      0.4,
      0.2
    );
    dragArrow.name = 'dragArrow';
    aeroVectorGroup.add(dragArrow);

    aeroVectorGroup.visible = false;
    planeGroup.add(aeroVectorGroup);

    scene.add(planeGroup);
  }

  // ----------------------------------------------------------------------------
  // 7. STOL RUNWAY & AIRFIELD (Detailed 3D Pavement with PAPI Lights)
  // ----------------------------------------------------------------------------
  function buildSTOLRunway() {
    runwayGroup = new THREE.Group();
    runwayGroup.name = 'STOLRunway';

    // Pavement: 800m length x 36m width
    const rwyGeo = new THREE.PlaneGeometry(36, 800);
    rwyGeo.rotateX(-Math.PI / 2);
    const rwyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.88,
      metalness: 0.05
    });
    const rwyMesh = new THREE.Mesh(rwyGeo, rwyMat);
    rwyMesh.position.set(0, 0.1, 0);
    rwyMesh.receiveShadow = true;
    runwayGroup.add(rwyMesh);

    // Centerline Dashed Stripes
    for (let z = -360; z <= 360; z += 40) {
      const stripeGeo = new THREE.PlaneGeometry(1.2, 22);
      stripeGeo.rotateX(-Math.PI / 2);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
      stripeMesh.position.set(0, 0.15, z);
      runwayGroup.add(stripeMesh);
    }

    // Threshold Piano Keys (8 bars at each threshold)
    for (const endZ of [-370, 370]) {
      for (let i = -7; i <= 7; i += 2) {
        const keyGeo = new THREE.PlaneGeometry(1.4, 28);
        keyGeo.rotateX(-Math.PI / 2);
        const keyMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const keyMesh = new THREE.Mesh(keyGeo, keyMat);
        keyMesh.position.set(i * 1.8, 0.15, endZ);
        runwayGroup.add(keyMesh);
      }
    }

    // PAPI 4-Light Glideslope Cluster on left of threshold (3.0° slope)
    for (let p = 0; p < 4; p++) {
      const papiBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.5, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x0f172a })
      );
      papiBox.position.set(-24, 0.4, -300 + p * 8);

      const papiLight = new THREE.PointLight(0xffffff, 2.0, 45);
      papiLight.position.set(0, 0.3, 0);
      papiBox.add(papiLight);

      runwayGroup.add(papiBox);
    }

    scene.add(runwayGroup);
  }

  // ----------------------------------------------------------------------------
  // 8. 3D PARTICLE SYSTEMS: WATER SALVO & AGRO SPRAY MIST
  // ----------------------------------------------------------------------------
  function buildParticleSystems() {
    // 1. Water Cascade Drop (Space / Fire Bombing)
    const waterCount = 350;
    const waterGeo = new THREE.BufferGeometry();
    const waterPos = new Float32Array(waterCount * 3);
    const waterVels = new Float32Array(waterCount * 3);

    for (let i = 0; i < waterCount; i++) {
      waterPos[i * 3 + 0] = 0;
      waterPos[i * 3 + 1] = -9999;
      waterPos[i * 3 + 2] = 0;
      waterVels[i * 3 + 0] = (Math.random() - 0.5) * 4;
      waterVels[i * 3 + 1] = -15 - Math.random() * 25;
      waterVels[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }

    waterGeo.setAttribute('position', new THREE.BufferAttribute(waterPos, 3));
    const waterMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 4.5,
      transparent: true,
      opacity: 0.85,
      blending: THREE.NormalBlending
    });
    waterParticleSystem = new THREE.Points(waterGeo, waterMat);
    waterParticleSystem.userData = { vels: waterVels, count: waterCount };
    scene.add(waterParticleSystem);

    // 2. Agro Spray Mist (X / ULV Crop Protection)
    const sprayCount = 400;
    const sprayGeo = new THREE.BufferGeometry();
    const sprayPos = new Float32Array(sprayCount * 3);
    const sprayVels = new Float32Array(sprayCount * 3);

    for (let i = 0; i < sprayCount; i++) {
      sprayPos[i * 3 + 0] = 0;
      sprayPos[i * 3 + 1] = -9999;
      sprayPos[i * 3 + 2] = 0;
      sprayVels[i * 3 + 0] = (Math.random() - 0.5) * 3;
      sprayVels[i * 3 + 1] = -4 - Math.random() * 6;
      sprayVels[i * 3 + 2] = -25 - Math.random() * 15;
    }

    sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
    const sprayMat = new THREE.PointsMaterial({
      color: 0x4ade80,
      size: 3.5,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    sprayParticleSystem = new THREE.Points(sprayGeo, sprayMat);
    sprayParticleSystem.userData = { vels: sprayVels, count: sprayCount };
    scene.add(sprayParticleSystem);
  }

  function updateParticles(dt) {
    // 1. Water Salvo Update
    if (waterParticleSystem) {
      const posAttr = waterParticleSystem.geometry.attributes.position;
      const vels = waterParticleSystem.userData.vels;
      const count = waterParticleSystem.userData.count;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        if (flight.waterDropping && Math.random() < 0.25) {
          // Spawn new drops under belly
          posAttr.array[idx + 0] = flight.pos.x + (Math.random() - 0.5) * 1.2;
          posAttr.array[idx + 1] = flight.pos.y - 0.6;
          posAttr.array[idx + 2] = flight.pos.z + (Math.random() - 0.5) * 2.0;
        } else if (posAttr.array[idx + 1] > 0) {
          posAttr.array[idx + 0] += vels[idx + 0] * dt;
          posAttr.array[idx + 1] += vels[idx + 1] * dt;
          posAttr.array[idx + 2] += vels[idx + 2] * dt;
        } else {
          posAttr.array[idx + 1] = -9999;
        }
      }
      posAttr.needsUpdate = true;

      if (flight.waterDropping) {
        flight.fluidRemaining = Math.max(0, flight.fluidRemaining - 140 * dt);
        if (flight.fluidRemaining <= 0) flight.waterDropping = false;
      }
    }

    // 2. Agro Spray Mist Update
    if (sprayParticleSystem) {
      const posAttr = sprayParticleSystem.geometry.attributes.position;
      const vels = sprayParticleSystem.userData.vels;
      const count = sprayParticleSystem.userData.count;
      const nozzleOffsets = [-4.5, -2.8, -1.2, 1.2, 2.8, 4.5];

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        if (flight.agroSpraying && Math.random() < 0.3) {
          const nX = nozzleOffsets[Math.floor(Math.random() * nozzleOffsets.length)];
          const spawnPos = new THREE.Vector3(nX, 0.4, -0.6).applyQuaternion(flight.quat).add(flight.pos);
          posAttr.array[idx + 0] = spawnPos.x;
          posAttr.array[idx + 1] = spawnPos.y;
          posAttr.array[idx + 2] = spawnPos.z;
        } else if (posAttr.array[idx + 1] > 0) {
          posAttr.array[idx + 0] += vels[idx + 0] * dt;
          posAttr.array[idx + 1] += vels[idx + 1] * dt;
          posAttr.array[idx + 2] += vels[idx + 2] * dt;
        } else {
          posAttr.array[idx + 1] = -9999;
        }
      }
      posAttr.needsUpdate = true;

      if (flight.agroSpraying) {
        flight.fluidRemaining = Math.max(0, flight.fluidRemaining - 25 * dt);
        if (flight.fluidRemaining <= 0) flight.agroSpraying = false;
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 9. DYNAMIC SLIPPY MAP TILE STREAMING (GOOGLE SATELLITE TILES)
  // ----------------------------------------------------------------------------
  function updateSatelliteTiles() {
    // Current plane lat/lon
    const deltaZ = flight.pos.z;
    const deltaX = flight.pos.x;
    const currentLat = currentOriginLat - (deltaZ / 111132);
    const currentLon = currentOriginLon + (deltaX / (111132 * Math.cos(currentOriginLat * Math.PI / 180)));

    const txCenter = lonToTileX(currentLon, TILE_ZOOM);
    const tyCenter = latToTileY(currentLat, TILE_ZOOM);

    if (txCenter === currentTileCenter.tx && tyCenter === currentTileCenter.ty) {
      return; // Already up to date
    }

    currentTileCenter.tx = txCenter;
    currentTileCenter.ty = tyCenter;

    const tileMeters = getTileMeters(currentLat, TILE_ZOOM);
    const gridRadius = 3; // 7x7 grid = 49 tiles surrounding aircraft
    const activeKeys = new Set();

    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
      for (let dy = -gridRadius; dy <= gridRadius; dy++) {
        const tx = txCenter + dx;
        const ty = tyCenter + dy;
        const tileKey = `${SIM.mapProvider}_${TILE_ZOOM}_${tx}_${ty}`;
        activeKeys.add(tileKey);

        if (!mapTiles.has(tileKey)) {
          // Calculate tile world position in local meters
          const tileLon = tileXToLon(tx, TILE_ZOOM);
          const tileLat = tileYToLat(ty, TILE_ZOOM);

          const worldX = (tileLon - currentOriginLon) * (111132 * Math.cos(currentOriginLat * Math.PI / 180));
          const worldZ = (currentOriginLat - tileLat) * 111132;

          const tileGeo = new THREE.PlaneGeometry(tileMeters, tileMeters);
          tileGeo.rotateX(-Math.PI / 2);

          // Procedural fallback texture initially so no black screen
          const fallbackTex = createProceduralTileTexture(tx, ty);
          const tileMat = new THREE.MeshStandardMaterial({
            map: fallbackTex,
            roughness: 0.9,
            metalness: 0.05
          });

          const tileMesh = new THREE.Mesh(tileGeo, tileMat);
          tileMesh.position.set(worldX + tileMeters / 2, 0, worldZ + tileMeters / 2);
          tileMesh.receiveShadow = true;
          scene.add(tileMesh);

          // Load Real Satellite Tile
          const tileUrl = getTileUrl(tx, ty, TILE_ZOOM, SIM.mapProvider);
          textureLoader.load(
            tileUrl,
            (loadedTex) => {
              loadedTex.wrapS = THREE.ClampToEdgeWrapping;
              loadedTex.wrapT = THREE.ClampToEdgeWrapping;
              tileMesh.material.map = loadedTex;
              tileMesh.material.needsUpdate = true;
            },
            undefined,
            () => {
              // On error: load Esri backup
              const backupUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${TILE_ZOOM}/${ty}/${tx}`;
              textureLoader.load(backupUrl, (esriTex) => {
                tileMesh.material.map = esriTex;
                tileMesh.material.needsUpdate = true;
              });
            }
          );

          mapTiles.set(tileKey, tileMesh);
        }
      }
    }

    // Dispose tiles that have drifted out of range
    for (const [key, mesh] of mapTiles.entries()) {
      if (!activeKeys.has(key)) {
        scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (mesh.material.map) mesh.material.map.dispose();
          mesh.material.dispose();
        }
        mapTiles.delete(key);
      }
    }
  }

  function clearAllTiles() {
    for (const [, mesh] of mapTiles.entries()) {
      scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (mesh.material.map) mesh.material.map.dispose();
        mesh.material.dispose();
      }
    }
    mapTiles.clear();
    currentTileCenter.tx = -1;
    currentTileCenter.ty = -1;
  }

  // ----------------------------------------------------------------------------
  // 10. 6-DOF AERODYNAMIC FLIGHT PHYSICS ENGINE
  // ----------------------------------------------------------------------------
  function updatePhysics(dt) {
    const cfg = PLANE_CONFIGS[SIM.planeModel] || PLANE_CONFIGS.full;

    // 1. Throttle & Propeller dynamics
    let effectiveThrottle = flight.throttle;
    if (SIM.boostActive) {
      effectiveThrottle = Math.min(1.0, flight.throttle + 0.35);
      SIM.boostTimer -= dt;
      if (SIM.boostTimer <= 0) SIM.boostActive = false;
    }

    // Prop RPM tracks throttle
    const targetRPM = 600 + effectiveThrottle * 2400;
    flight.propRpm += (targetRPM - flight.propRpm) * 4 * dt;
    flight.propAngle += (flight.propRpm * (Math.PI * 2) / 60) * dt;

    // Spin 4 propellers
    propMeshes.forEach((p) => {
      p.rotation.z = flight.propAngle;
    });

    // 2. Mechanization Animations
    // Flaps rotation
    const targetFlapRad = (flight.flapsStage * 17.5 * Math.PI) / 180;
    flight.flapsAngle += (targetFlapRad - flight.flapsAngle) * 6 * dt;
    flapMeshes.forEach((f) => {
      f.rotation.x = -flight.flapsAngle;
    });

    // Spoilers deployment
    const targetSpoiler = flight.spoilersActive ? 0.78 : 0.0;
    flight.spoilersPos += (targetSpoiler - flight.spoilersPos) * 8 * dt;
    spoilerMeshes.forEach((s) => {
      s.rotation.x = flight.spoilersPos;
    });

    // Landing Gear extend/retract
    flight.gearPos += (flight.gearTarget - flight.gearPos) * 2 * dt;
    gearMeshes.forEach((g) => {
      g.pivot.rotation.x = g.retractRotX * (1.0 - flight.gearPos);
    });

    // 3. Autopilot logic
    if (SIM.apMode.level) {
      // Auto-level pitch and roll
      flight.pitchInput += (0.02 - flight.rot.x) * 2.5 * dt;
      flight.rollInput += (0.0 - flight.rot.z) * 3.5 * dt;
    }
    if (SIM.apMode.alt) {
      // Pitch towards target altitude
      const altErr = SIM.apMode.targetAlt - flight.pos.y;
      const desiredPitch = Math.max(-0.25, Math.min(0.25, altErr * 0.005));
      flight.pitchInput += (desiredPitch - flight.rot.x) * 2.5 * dt;
    }
    if (SIM.apMode.hdg) {
      // Steer heading
      const curHdg = ((-flight.rot.y * 180 / Math.PI) % 360 + 360) % 360;
      let hdgDiff = SIM.apMode.targetHdg - curHdg;
      if (hdgDiff > 180) hdgDiff -= 360;
      if (hdgDiff < -180) hdgDiff += 360;
      flight.rollInput += Math.max(-0.6, Math.min(0.6, hdgDiff * 0.02)) * dt;
    }

    // 4. Pilot Angular Accelerations
    const sens = SIM.sensitivity;
    const pitchRate = flight.pitchInput * cfg.pitchAuth * sens;
    const rollRate = -flight.rollInput * cfg.rollAuth * sens;
    const yawRate = -flight.yawInput * cfg.yawAuth * sens;

    // Apply Euler rotations
    flight.rot.x += pitchRate * dt;
    flight.rot.y += yawRate * dt;
    flight.rot.z += rollRate * dt;

    // Natural stability & damping
    flight.rot.x *= (1.0 - 0.4 * dt);
    if (!SIM.apMode.level && Math.abs(flight.rollInput) < 0.05) {
      flight.rot.z *= (1.0 - 0.6 * dt); // Soft wing-leveling
    }

    flight.quat.setFromEuler(flight.rot);

    // 5. Speed & Aerodynamic Forces
    // Forward direction vector
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(flight.quat);

    // Thrust
    const thrustN = effectiveThrottle * cfg.thrustMax;
    const thrustAcc = thrustN / cfg.mass;

    // Blown-Wing STOL Lift: DEP propwash keeps lift high even at low forward speeds!
    const propWashVel = effectiveThrottle * 28.0;
    const effectiveAirspeed = flight.tas + propWashVel * 0.55;

    // Lift coefficient: Base + Flap increments
    const baseCL = 0.55 + flight.flapsStage * 0.45;
    const liftForceN = 0.5 * 1.225 * Math.pow(effectiveAirspeed, 2) * cfg.wingArea * baseCL;
    const liftAcc = liftForceN / cfg.mass;

    // Drag: Parasite + Gear + Flaps + Spoilers
    const cdGear = (1.0 - flight.gearPos) * 0.01 + flight.gearPos * 0.035;
    const cdFlaps = flight.flapsStage * 0.025;
    const cdSpoilers = flight.spoilersPos * 0.06;
    const totalCD = 0.026 + cdGear + cdFlaps + cdSpoilers;
    const dragForceN = 0.5 * 1.225 * Math.pow(flight.tas, 2) * cfg.wingArea * totalCD;
    const dragAcc = dragForceN / cfg.mass;

    // Acceleration vector
    const acc = new THREE.Vector3();
    acc.addScaledVector(fwd, thrustAcc - dragAcc);
    acc.y += liftAcc - 9.80665; // Lift vs Gravity

    // Integrate velocity
    flight.vel.addScaledVector(acc, dt);

    // Speed limits & ground interaction
    flight.tas = flight.vel.length();
    flight.ias = flight.tas * 3.6; // km/h
    flight.kts = flight.tas * 1.94384;
    flight.vsi = flight.vel.y;

    // Move aircraft in world space
    flight.pos.addScaledVector(flight.vel, dt);

    // Ground collision / Roll physics on runway
    const groundLevel = 1.25;
    if (flight.pos.y <= groundLevel) {
      flight.pos.y = groundLevel;
      flight.vel.y = Math.max(0, flight.vel.y);
      flight.rot.x = Math.max(-0.02, flight.rot.x);
      flight.rot.z = 0; // Level on wheels
      flight.altAGL = 0;
    } else {
      flight.altAGL = flight.pos.y;
    }
    flight.altMSL = flight.pos.y;

    // Angle of Attack (AoA)
    flight.aoa = (flight.rot.x * 180 / Math.PI) - (Math.atan2(flight.vel.y, Math.max(1, flight.tas)) * 180 / Math.PI);
    flight.gLoad = 1.0 + (acc.y / 9.80665);

    // Stall Warning (AoA > 15° with low speed)
    const stallBanner = document.getElementById('sim-stall-warning');
    if (stallBanner) {
      stallBanner.style.display = (flight.aoa > 15.0 && flight.ias < 70) ? 'flex' : 'none';
    }

    // Update 3D plane mesh transform
    planeGroup.position.copy(flight.pos);
    planeGroup.quaternion.copy(flight.quat);

    // Hydrogen consumption
    flight.h2MassRemaining = Math.max(0, flight.h2MassRemaining - (effectiveThrottle * 0.0008 * dt));

    // Update Aerodynamic Vector Helpers
    if (flight.showAeroVectors && aeroVectorGroup) {
      const lArrow = aeroVectorGroup.getObjectByName('liftArrow');
      const tArrow = aeroVectorGroup.getObjectByName('thrustArrow');
      const dArrow = aeroVectorGroup.getObjectByName('dragArrow');
      if (lArrow) lArrow.setLength(Math.min(6, Math.max(0.5, liftAcc * 0.4)));
      if (tArrow) tArrow.setLength(Math.min(6, Math.max(0.5, thrustAcc * 0.4)));
      if (dArrow) dArrow.setLength(Math.min(6, Math.max(0.5, dragAcc * 0.4)));
    }
  }

  // ----------------------------------------------------------------------------
  // 11. CAMERA FOLLOW & MULTI-VIEW MODES
  // ----------------------------------------------------------------------------
  function updateCamera() {
    if (!camera || !planeGroup) return;

    if (SIM.cameraMode === 'chase') {
      // Smooth third-person chase camera behind the aircraft
      const offset = new THREE.Vector3(0, 3.2, -12.5).applyQuaternion(flight.quat);
      const targetCamPos = flight.pos.clone().add(offset);
      camera.position.lerp(targetCamPos, 0.12);

      const lookTarget = flight.pos.clone().add(new THREE.Vector3(0, 0.8, 8.0).applyQuaternion(flight.quat));
      camera.lookAt(lookTarget);

    } else if (SIM.cameraMode === 'cockpit') {
      // Inside pilot seat looking forward
      const cockpitOffset = new THREE.Vector3(0, 0.45, 1.2).applyQuaternion(flight.quat);
      camera.position.copy(flight.pos).add(cockpitOffset);

      const forwardTarget = flight.pos.clone().add(new THREE.Vector3(0, 0.45, 50.0).applyQuaternion(flight.quat));
      camera.lookAt(forwardTarget);

    } else if (SIM.cameraMode === 'satellite') {
      // Top-down satellite view looking directly at the terrain & plane
      camera.position.set(flight.pos.x, flight.pos.y + 1200, flight.pos.z - 200);
      camera.lookAt(flight.pos.x, flight.pos.y, flight.pos.z);

    } else if (SIM.cameraMode === 'orbit') {
      // Mouse draggable orbit camera around aircraft
      const dist = 14.0;
      const ox = dist * Math.sin(orbitYaw) * Math.cos(orbitPitch);
      const oy = dist * Math.sin(orbitPitch);
      const oz = dist * Math.cos(orbitYaw) * Math.cos(orbitPitch);
      camera.position.set(flight.pos.x + ox, flight.pos.y + oy, flight.pos.z + oz);
      camera.lookAt(flight.pos);
    }
  }

  // ----------------------------------------------------------------------------
  // 12. CIRCULAR GPS RADAR & INSTRUMENTS UPDATE
  // ----------------------------------------------------------------------------
  function initRadar() {
    radarCanvas = document.getElementById('sim-gps-radar');
    if (!radarCanvas) return;
    radarCtx = radarCanvas.getContext('2d');
  }

  function updateRadar() {
    if (!radarCtx || !radarCanvas) return;
    const ctx = radarCtx;
    const w = radarCanvas.width;
    const h = radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = w / 2 - 4;

    ctx.clearRect(0, 0, w, h);

    // Circular background
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#060d1f';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
    ctx.stroke();

    // Range rings (2 km, 5 km, 10 km)
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
    ctx.lineWidth = 1;
    [r * 0.33, r * 0.66, r * 0.95].forEach((ringR) => {
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.stroke();

    // Compass Heading
    const hdgDeg = ((-flight.rot.y * 180 / Math.PI) % 360 + 360) % 360;

    // Draw rotating compass rose markings
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(flight.rot.y); // Rotate opposite to heading

    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#00ff9d';
    ctx.fillText('N', 0, -r + 12);
    ctx.fillStyle = '#8b9bb4';
    ctx.fillText('E', r - 12, 0);
    ctx.fillText('S', 0, r - 12);
    ctx.fillText('W', -r + 12, 0);

    // Target waypoint (Runway at 0, 0)
    const relX = -flight.pos.x * (r / 5000);
    const relZ = flight.pos.z * (r / 5000);
    if (Math.hypot(relX, relZ) < r - 8) {
      ctx.fillStyle = '#ffea00';
      ctx.beginPath();
      ctx.arc(relX, relZ, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Center Airplane Icon (always points UP)
    ctx.fillStyle = '#00ff9d';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx - 6, cy + 6);
    ctx.lineTo(cx, cy + 3);
    ctx.lineTo(cx + 6, cy + 6);
    ctx.closePath();
    ctx.fill();
  }

  function updateHUDInstruments() {
    // 1. Altitude
    const altEl = document.getElementById('sim-alt-m');
    const altFtEl = document.getElementById('sim-alt-ft');
    const vsiEl = document.getElementById('sim-vsi-val');
    if (altEl) altEl.textContent = `${Math.round(flight.altMSL)} м`;
    if (altFtEl) altFtEl.textContent = `${Math.round(flight.altMSL * 3.28084)} ft`;
    if (vsiEl) {
      const vsiSign = flight.vsi >= 0 ? '+' : '';
      vsiEl.textContent = `VSI: ${vsiSign}${flight.vsi.toFixed(1)} м/с`;
    }

    // 2. Speed
    const spdKmhEl = document.getElementById('sim-spd-kmh');
    const spdKtsEl = document.getElementById('sim-spd-kts');
    const modeBadge = document.getElementById('sim-mode-badge');
    if (spdKmhEl) spdKmhEl.textContent = `${Math.round(flight.ias)} км/ч`;
    if (spdKtsEl) spdKtsEl.textContent = `${Math.round(flight.kts)} kts`;
    if (modeBadge) {
      if (flight.ias < 60) modeBadge.textContent = 'STOL APPROACH';
      else if (flight.vsi > 4) modeBadge.textContent = 'STOL CLIMB';
      else modeBadge.textContent = 'STOL CRUISE';
    }

    // 3. AoA and Roll
    const aoaEl = document.getElementById('sim-aoa-deg');
    const rollEl = document.getElementById('sim-roll-deg');
    const gLoadEl = document.getElementById('sim-gload-val');
    if (aoaEl) {
      const aoaSign = flight.aoa >= 0 ? '+' : '';
      aoaEl.textContent = `${aoaSign}${flight.aoa.toFixed(1)}°`;
    }
    if (rollEl) {
      const rollDeg = (flight.rot.z * 180 / Math.PI);
      if (Math.abs(rollDeg) < 1.0) rollEl.textContent = '0.0° КУРС';
      else if (rollDeg > 0) rollEl.textContent = `${rollDeg.toFixed(1)}° ВЛЕВО`;
      else rollEl.textContent = `${Math.abs(rollDeg).toFixed(1)}° ВПРАВО`;
    }
    if (gLoadEl) gLoadEl.textContent = `G: ${flight.gLoad.toFixed(2)}`;

    // 4. Throttle
    const thrValEl = document.getElementById('sim-throttle-val');
    const thrSlider = document.getElementById('sim-slider-throttle');
    const thrPct = Math.round(flight.throttle * 100);
    if (thrValEl) thrValEl.textContent = `${thrPct}%`;
    if (thrSlider && document.activeElement !== thrSlider) thrSlider.value = thrPct;

    // 5. Tanks
    const h2Fill = document.getElementById('sim-h2-fill');
    const h2Val = document.getElementById('sim-h2-val');
    const fluidFill = document.getElementById('sim-fluid-fill');
    const fluidVal = document.getElementById('sim-fluid-val');

    const cfg = PLANE_CONFIGS[SIM.planeModel] || PLANE_CONFIGS.full;
    const h2Pct = Math.max(0, Math.min(100, (flight.h2MassRemaining / cfg.h2Capacity) * 100));
    const fluidPct = Math.max(0, Math.min(100, (flight.fluidRemaining / cfg.fluidCapacity) * 100));

    if (h2Fill) h2Fill.style.width = `${h2Pct}%`;
    if (h2Val) h2Val.textContent = `${flight.h2MassRemaining.toFixed(1)} кг (${Math.round(h2Pct)}%)`;
    if (fluidFill) fluidFill.style.width = `${fluidPct}%`;
    if (fluidVal) fluidVal.textContent = `${Math.round(flight.fluidRemaining)} л (${Math.round(fluidPct)}%)`;

    // 6. Right Radar Metrics
    const radarHdg = document.getElementById('sim-radar-hdg');
    const radarSpd = document.getElementById('sim-radar-spd');
    const radarCoords = document.getElementById('sim-radar-coords');
    const radarAgl = document.getElementById('sim-radar-agl');

    const hdgDeg = Math.round(((-flight.rot.y * 180 / Math.PI) % 360 + 360) % 360);
    if (radarHdg) radarHdg.textContent = `${String(hdgDeg).padStart(3, '0')}°`;
    if (radarSpd) radarSpd.textContent = `${Math.round(flight.ias)} км/ч`;
    if (radarAgl) radarAgl.textContent = `${Math.round(flight.altAGL)} м`;

    if (radarCoords) {
      const deltaZ = flight.pos.z;
      const deltaX = flight.pos.x;
      const curLat = currentOriginLat - (deltaZ / 111132);
      const curLon = currentOriginLon + (deltaX / (111132 * Math.cos(currentOriginLat * Math.PI / 180)));
      const latHem = curLat >= 0 ? 'N' : 'S';
      const lonHem = curLon >= 0 ? 'E' : 'W';
      radarCoords.textContent = `${Math.abs(curLat).toFixed(4)}°${latHem} ${Math.abs(curLon).toFixed(4)}°${lonHem}`;
    }

    // 7. FPV Reticle & Pitch Ladder
    const fpvWrap = document.getElementById('sim-fpv-marker');
    if (fpvWrap) {
      const pitchPx = THREE.MathUtils.clamp(-flight.rot.x * 250, -120, 120);
      const rollDeg = -flight.rot.z * 180 / Math.PI;
      fpvWrap.style.transform = `translate(-50%, calc(-50% + ${pitchPx}px)) rotate(${rollDeg}deg)`;
    }
  }

  // ----------------------------------------------------------------------------
  // 13. PROCEDURAL WEB AUDIO API FLIGHT SOUND
  // ----------------------------------------------------------------------------
  function initAudioEngine() {
    if (SIM.soundStarted) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();

      // Master Motor Gain
      motorGain = audioCtx.createGain();
      motorGain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      motorGain.connect(audioCtx.destination);

      // 4x DEP Brushless Harmonic Drone
      motorOsc1 = audioCtx.createOscillator();
      motorOsc1.type = 'sawtooth';
      motorOsc1.frequency.setValueAtTime(110, audioCtx.currentTime);
      motorOsc1.connect(motorGain);
      motorOsc1.start();

      motorOsc2 = audioCtx.createOscillator();
      motorOsc2.type = 'triangle';
      motorOsc2.frequency.setValueAtTime(220, audioCtx.currentTime);
      motorOsc2.connect(motorGain);
      motorOsc2.start();

      // Wind Rush Noise
      const bufferSize = audioCtx.sampleRate * 2;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const bandpass = audioCtx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 450;

      windGain = audioCtx.createGain();
      windGain.gain.setValueAtTime(0.04, audioCtx.currentTime);

      whiteNoise.connect(bandpass);
      bandpass.connect(windGain);
      windGain.connect(audioCtx.destination);
      whiteNoise.start();

      SIM.soundStarted = true;
      SIM.audioEnabled = true;
      updateSoundButtonUI();
    } catch (e) {
      console.warn('AudioContext failed:', e);
    }
  }

  function updateAudio() {
    if (!SIM.soundStarted || !audioCtx) return;
    if (audioCtx.state === 'suspended' && SIM.audioEnabled) {
      audioCtx.resume();
    }

    if (!SIM.audioEnabled) {
      if (motorGain) motorGain.gain.setValueAtTime(0, audioCtx.currentTime);
      if (windGain) windGain.gain.setValueAtTime(0, audioCtx.currentTime);
      return;
    }

    // Motor sound frequency tracks RPM
    const freq1 = 70 + (flight.propRpm / 3000) * 160;
    const freq2 = freq1 * 2;
    if (motorOsc1) motorOsc1.frequency.setTargetAtTime(freq1, audioCtx.currentTime, 0.05);
    if (motorOsc2) motorOsc2.frequency.setTargetAtTime(freq2, audioCtx.currentTime, 0.05);
    if (motorGain) {
      const vol = 0.05 + flight.throttle * 0.18 + (SIM.boostActive ? 0.1 : 0);
      motorGain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.05);
    }

    // Wind volume tracks airspeed
    if (windGain) {
      const windVol = Math.min(0.2, (flight.tas / 80) * 0.15);
      windGain.gain.setTargetAtTime(windVol, audioCtx.currentTime, 0.1);
    }
  }

  function toggleSound() {
    if (!SIM.soundStarted) {
      initAudioEngine();
    } else {
      SIM.audioEnabled = !SIM.audioEnabled;
      updateSoundButtonUI();
    }
  }

  function updateSoundButtonUI() {
    const icon = document.getElementById('sim-sound-icon');
    const txt = document.getElementById('sim-sound-txt');
    const btn = document.getElementById('btn-sim-sound');
    if (icon && txt) {
      if (SIM.audioEnabled) {
        icon.className = 'fa-solid fa-volume-high';
        txt.textContent = 'Звук ВКЛ';
        if (btn) btn.classList.add('active');
      } else {
        icon.className = 'fa-solid fa-volume-xmark';
        txt.textContent = 'Звук ВЫКЛ';
        if (btn) btn.classList.remove('active');
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 14. TELEPORT & SCENARIO RESET
  // ----------------------------------------------------------------------------
  function teleportToLocation(locKey, targetAlt = 700) {
    const loc = LOCATIONS[locKey] || LOCATIONS.charvak;
    SIM.locationId = loc.id;
    currentOriginLat = loc.lat;
    currentOriginLon = loc.lon;

    // Reset local coordinates
    flight.pos.set(0, targetAlt, 0);
    flight.vel.set(0, 0, 50); // 180 km/h forward
    flight.rot.set(0, 0, 0);
    flight.throttle = 0.75;
    flight.gearTarget = 0.0;
    flight.flapsStage = 0;
    flight.spoilersActive = false;
    flight.waterDropping = false;
    flight.agroSpraying = false;

    // Clear and reload satellite tiles
    clearAllTiles();
    updateSatelliteTiles();

    showToast(`ЛОКАЦИЯ: ${loc.name.toUpperCase()} (ВЫСОТА ${targetAlt} М)`);
  }

  function startFromRunway() {
    flight.pos.set(0, 1.25, -340); // Beginning of runway threshold
    flight.vel.set(0, 0, 0);
    flight.rot.set(0, 0, 0);
    flight.throttle = 0.0;
    flight.gearTarget = 1.0; // Gear down
    flight.gearPos = 1.0;
    flight.flapsStage = 1;  // Flaps 15° for STOL takeoff
    flight.spoilersActive = false;

    showToast('СТАРТ С ВПП: ДАЙТЕ ГАЗ SHIFT / Q ДО 100%!');
  }

  function setTimeOfDay(timeKey) {
    SIM.timeOfDay = timeKey;
    if (!scene || !ambientLight || !sunLight) return;

    if (timeKey === 'sunset') {
      scene.background = new THREE.Color(0xf97316); // Golden orange
      scene.fog.color = new THREE.Color(0xfb923c);
      ambientLight.color = new THREE.Color(0xffedd5);
      ambientLight.intensity = 0.55;
      sunLight.color = new THREE.Color(0xfdba74);
      sunLight.intensity = 1.1;
      sunLight.position.set(1200, 250, -800);
    } else if (timeKey === 'night') {
      scene.background = new THREE.Color(0x030712); // Night darkness
      scene.fog.color = new THREE.Color(0x0f172a);
      ambientLight.color = new THREE.Color(0x38bdf8);
      ambientLight.intensity = 0.35;
      sunLight.color = new THREE.Color(0x1e3a5f);
      sunLight.intensity = 0.4;
    } else {
      // Day default
      scene.background = new THREE.Color(0x9ec5fe); // Sky blue
      scene.fog.color = new THREE.Color(0xcbd5e1);
      ambientLight.color = new THREE.Color(0xffffff);
      ambientLight.intensity = 0.65;
      sunLight.color = new THREE.Color(0xfff8e7);
      sunLight.intensity = 1.35;
      sunLight.position.set(800, 1500, 1000);
    }
  }

  function showToast(msg) {
    const toast = document.getElementById('sim-toast-banner');
    const toastTxt = document.getElementById('sim-toast-text');
    if (toast && toastTxt) {
      toastTxt.textContent = msg;
      toast.style.display = 'flex';
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => {
        toast.style.display = 'none';
      }, 3500);
    }
  }

  // ----------------------------------------------------------------------------
  // 15. UI BINDINGS & KEYBOARD INPUT
  // ----------------------------------------------------------------------------
  function initControls() {
    // 1. Top Select Dropdowns
    const selPlane = document.getElementById('sim-select-plane');
    if (selPlane) {
      selPlane.addEventListener('change', (e) => {
        SIM.planeModel = e.target.value;
        const cfg = PLANE_CONFIGS[SIM.planeModel];
        if (planeGroup) planeGroup.scale.setScalar(cfg.scale);
        showToast(`САМОЛЁТ: ${cfg.name}`);
      });
    }

    const selLoc = document.getElementById('sim-select-location');
    if (selLoc) {
      selLoc.addEventListener('change', (e) => {
        teleportToLocation(e.target.value, 700);
      });
    }

    const selMap = document.getElementById('sim-select-map');
    if (selMap) {
      selMap.addEventListener('change', (e) => {
        SIM.mapProvider = e.target.value;
        clearAllTiles();
        updateSatelliteTiles();
        showToast(`КАРТА: ${e.target.options[e.target.selectedIndex].text}`);
      });
    }

    const selTime = document.getElementById('sim-select-time');
    if (selTime) {
      selTime.addEventListener('change', (e) => {
        setTimeOfDay(e.target.value);
      });
    }

    // 2. Top Action Buttons
    const btnSound = document.getElementById('btn-sim-sound');
    if (btnSound) btnSound.addEventListener('click', toggleSound);

    const btnReset700 = document.getElementById('btn-sim-reset-700');
    if (btnReset700) btnReset700.addEventListener('click', () => teleportToLocation(SIM.locationId, 700));

    const btnStartRwy = document.getElementById('btn-sim-start-rwy');
    if (btnStartRwy) btnStartRwy.addEventListener('click', startFromRunway);

    const btnHelp = document.getElementById('btn-sim-help');
    const modalHelp = document.getElementById('sim-help-modal');
    const btnCloseHelp = document.getElementById('btn-close-help');
    if (btnHelp && modalHelp) {
      btnHelp.addEventListener('click', () => { modalHelp.style.display = 'flex'; });
    }
    if (btnCloseHelp && modalHelp) {
      btnCloseHelp.addEventListener('click', () => { modalHelp.style.display = 'none'; });
    }

    // 3. Telemetry Panel Controls
    const btnBoost = document.getElementById('btn-h2-boost');
    if (btnBoost) {
      btnBoost.addEventListener('click', () => {
        initAudioEngine();
        SIM.boostActive = true;
        SIM.boostTimer = 10.0;
        showToast('⚡ БУСТ H2-LI-PO АКТИВИРОВАН (+40% ТЯГА НА 10 СЕК)!');
      });
    }

    const thrSlider = document.getElementById('sim-slider-throttle');
    if (thrSlider) {
      thrSlider.addEventListener('input', (e) => {
        initAudioEngine();
        flight.throttle = parseFloat(e.target.value) / 100;
      });
    }

    const btnThrInc = document.getElementById('btn-thr-inc');
    if (btnThrInc) {
      btnThrInc.addEventListener('click', () => {
        initAudioEngine();
        flight.throttle = Math.min(1.0, flight.throttle + 0.05);
      });
    }

    const btnThrDec = document.getElementById('btn-thr-dec');
    if (btnThrDec) {
      btnThrDec.addEventListener('click', () => {
        initAudioEngine();
        flight.throttle = Math.max(0.0, flight.throttle - 0.05);
      });
    }

    const sensSlider = document.getElementById('sim-slider-sens');
    const sensVal = document.getElementById('sim-sens-val');
    if (sensSlider) {
      sensSlider.addEventListener('input', (e) => {
        SIM.sensitivity = parseFloat(e.target.value);
        if (sensVal) sensVal.textContent = `${SIM.sensitivity.toFixed(1)}x`;
      });
    }

    // 4. Center Controls: Cameras
    ['chase', 'cockpit', 'satellite', 'orbit'].forEach((mode) => {
      const btn = document.getElementById(`btn-cam-${mode === 'cockpit' ? 'fpv' : (mode === 'satellite' ? 'sat' : mode)}`);
      if (btn) {
        btn.addEventListener('click', () => {
          SIM.cameraMode = mode;
          document.querySelectorAll('[data-cam]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          showToast(`РЕЖИМ КАМЕРЫ: ${mode.toUpperCase()}`);
        });
      }
    });

    // 5. Center Controls: Mechanization & Specials
    const btnGear = document.getElementById('btn-act-gear');
    const lblGear = document.getElementById('lbl-gear');
    if (btnGear) {
      btnGear.addEventListener('click', () => {
        flight.gearTarget = flight.gearTarget > 0.5 ? 0.0 : 1.0;
        const isDown = flight.gearTarget > 0.5;
        if (lblGear) lblGear.textContent = isDown ? '🟢 Шасси (G)' : '⚪ Шасси УБРАНО (G)';
        btnGear.classList.toggle('active', isDown);
        showToast(isDown ? 'ШАССИ ВЫПУЩЕНО' : 'ШАССИ УБРАНО');
      });
    }

    const btnFlaps = document.getElementById('btn-act-flaps');
    const lblFlaps = document.getElementById('lbl-flaps');
    if (btnFlaps) {
      btnFlaps.addEventListener('click', () => {
        flight.flapsStage = (flight.flapsStage + 1) % 3;
        const deg = [0, 15, 35][flight.flapsStage];
        if (lblFlaps) lblFlaps.textContent = `📐 Закрылки ${deg}° (F)`;
        btnFlaps.classList.toggle('active', flight.flapsStage > 0);
        showToast(`ЗАКРЫЛКИ: ${deg}°`);
      });
    }

    const btnSpoilers = document.getElementById('btn-act-spoilers');
    const lblSpoilers = document.getElementById('lbl-spoilers');
    if (btnSpoilers) {
      btnSpoilers.addEventListener('click', () => {
        flight.spoilersActive = !flight.spoilersActive;
        if (lblSpoilers) lblSpoilers.textContent = flight.spoilersActive ? '🛑 Спойлеры ВКЛ (B)' : '🛑 Спойлеры (B)';
        btnSpoilers.classList.toggle('active', flight.spoilersActive);
        showToast(flight.spoilersActive ? 'СПОЙЛЕРЫ (ВОЗДУШНЫЙ ТОРМОЗ) ВЫПУЩЕНЫ' : 'СПОЙЛЕРЫ УБРАНЫ');
      });
    }

    const btnWater = document.getElementById('btn-act-water');
    if (btnWater) {
      btnWater.addEventListener('click', () => {
        flight.waterDropping = !flight.waterDropping;
        btnWater.classList.toggle('active', flight.waterDropping);
        showToast(flight.waterDropping ? '💧 СБРОС ВОДЫ АКТИВИРОВАН!' : 'СБРОС ВОДЫ ОСТАНОВЛЕН');
      });
    }

    const btnSpray = document.getElementById('btn-act-spray');
    const lblSpray = document.getElementById('lbl-spray');
    if (btnSpray) {
      btnSpray.addEventListener('click', () => {
        flight.agroSpraying = !flight.agroSpraying;
        if (lblSpray) lblSpray.textContent = flight.agroSpraying ? '🌿 Спрей ВКЛ (X)' : '🌿 Спрей (X)';
        btnSpray.classList.toggle('active', flight.agroSpraying);
        showToast(flight.agroSpraying ? '🌿 УЛЬТРАДИСПЕРСНОЕ ОПРЫСКИВАНИЕ САДОВ ВКЛЮЧЕНО' : 'ОПРЫСКИВАНИЕ ВЫКЛЮЧЕНО');
      });
    }

    const btnAero = document.getElementById('btn-act-aero');
    if (btnAero) {
      btnAero.addEventListener('click', () => {
        flight.showAeroVectors = !flight.showAeroVectors;
        if (aeroVectorGroup) aeroVectorGroup.visible = flight.showAeroVectors;
        btnAero.classList.toggle('active', flight.showAeroVectors);
        showToast(flight.showAeroVectors ? '🌬️ 3D ВЕКТОРЫ АЭРОДИНАМИКИ ВКЛЮЧЕНЫ' : 'ВЕКТОРЫ ВЫКЛЮЧЕНЫ');
      });
    }

    // 6. Autopilot Buttons
    const btnApLevel = document.getElementById('btn-ap-level');
    if (btnApLevel) {
      btnApLevel.addEventListener('click', () => {
        SIM.apMode.level = !SIM.apMode.level;
        btnApLevel.classList.toggle('active', SIM.apMode.level);
        showToast(SIM.apMode.level ? '⚖️ АВТОПИЛОТ: УДЕРЖАНИЕ ГОРИЗОНТА ВКЛ' : 'УДЕРЖАНИЕ ГОРИЗОНТА ВЫКЛ');
      });
    }

    const btnApAlt = document.getElementById('btn-ap-alt');
    if (btnApAlt) {
      btnApAlt.addEventListener('click', () => {
        SIM.apMode.alt = !SIM.apMode.alt;
        SIM.apMode.targetAlt = Math.round(flight.pos.y);
        btnApAlt.classList.toggle('active', SIM.apMode.alt);
        showToast(SIM.apMode.alt ? `🔒 АВТОПИЛОТ: УДЕРЖАНИЕ ВЫСОТЫ ${SIM.apMode.targetAlt} М` : 'УДЕРЖАНИЕ ВЫСОТЫ ВЫКЛ');
      });
    }

    const btnApHdg = document.getElementById('btn-ap-hdg');
    if (btnApHdg) {
      btnApHdg.addEventListener('click', () => {
        SIM.apMode.hdg = !SIM.apMode.hdg;
        SIM.apMode.targetHdg = Math.round(((-flight.rot.y * 180 / Math.PI) % 360 + 360) % 360);
        btnApHdg.classList.toggle('active', SIM.apMode.hdg);
        showToast(SIM.apMode.hdg ? `🧭 АВТОПИЛОТ: КУРС ${SIM.apMode.targetHdg}°` : 'АВТО-КУРС ВЫКЛ');
      });
    }

    // 7. Keyboard Listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 8. Mouse Orbit Dragging
    if (simCanvas) {
      simCanvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          isMouseDragging = true;
          mousePrevX = e.clientX;
          mousePrevY = e.clientY;
        }
      });
      window.addEventListener('mousemove', (e) => {
        if (isMouseDragging && SIM.cameraMode === 'orbit') {
          const dx = e.clientX - mousePrevX;
          const dy = e.clientY - mousePrevY;
          orbitYaw -= dx * 0.008;
          orbitPitch = Math.max(-0.2, Math.min(1.4, orbitPitch + dy * 0.008));
          mousePrevX = e.clientX;
          mousePrevY = e.clientY;
        }
      });
      window.addEventListener('mouseup', () => {
        isMouseDragging = false;
      });
    }
  }

  function handleKeyDown(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
      return;
    }
    const simSection = document.getElementById('simulator-section');
    if (simSection && !simSection.classList.contains('active')) {
      return;
    }

    initAudioEngine();

    switch (e.key.toLowerCase()) {
      // Pitch (Elevator)
      case 'w':
      case 'arrowup':
        flight.pitchInput = -1.0;
        break;
      case 's':
      case 'arrowdown':
        flight.pitchInput = 1.0;
        break;

      // Roll (Ailerons)
      case 'a':
      case 'arrowleft':
        flight.rollInput = -1.0;
        break;
      case 'd':
      case 'arrowright':
        flight.rollInput = 1.0;
        break;

      // Throttle & Rudder
      case 'shift':
      case 'q':
        flight.throttle = Math.min(1.0, flight.throttle + 0.05);
        break;
      case 'control':
      case 'e':
        flight.throttle = Math.max(0.0, flight.throttle - 0.05);
        break;

      // Gear (G)
      case 'g':
        const btnGear = document.getElementById('btn-act-gear');
        if (btnGear) btnGear.click();
        break;

      // Flaps (F)
      case 'f':
        const btnFlaps = document.getElementById('btn-act-flaps');
        if (btnFlaps) btnFlaps.click();
        break;

      // Spoilers (B)
      case 'b':
        const btnSpoilers = document.getElementById('btn-act-spoilers');
        if (btnSpoilers) btnSpoilers.click();
        break;

      // Water Drop (Space)
      case ' ':
        e.preventDefault();
        const btnWater = document.getElementById('btn-act-water');
        if (btnWater) btnWater.click();
        break;

      // Agro Spray (X)
      case 'x':
        const btnSpray = document.getElementById('btn-act-spray');
        if (btnSpray) btnSpray.click();
        break;

      // Aero Vectors (V)
      case 'v':
        const btnAero = document.getElementById('btn-act-aero');
        if (btnAero) btnAero.click();
        break;

      // Camera Mode (C)
      case 'c':
        const modes = ['chase', 'cockpit', 'satellite', 'orbit'];
        const curIdx = modes.indexOf(SIM.cameraMode);
        const nextMode = modes[(curIdx + 1) % modes.length];
        const btnCam = document.getElementById(`btn-cam-${nextMode === 'cockpit' ? 'fpv' : (nextMode === 'satellite' ? 'sat' : nextMode)}`);
        if (btnCam) btnCam.click();
        break;

      // Autopilot Keys 1, 2, 3
      case '1':
        const b1 = document.getElementById('btn-ap-level');
        if (b1) b1.click();
        break;
      case '2':
        const b2 = document.getElementById('btn-ap-alt');
        if (b2) b2.click();
        break;
      case '3':
        const b3 = document.getElementById('btn-ap-hdg');
        if (b3) b3.click();
        break;

      // Reset (R)
      case 'r':
        teleportToLocation(SIM.locationId, 700);
        break;
    }
  }

  function handleKeyUp(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
      return;
    }
    const simSection = document.getElementById('simulator-section');
    if (simSection && !simSection.classList.contains('active')) {
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'w':
      case 's':
      case 'arrowup':
      case 'arrowdown':
        flight.pitchInput = 0;
        break;
      case 'a':
      case 'd':
      case 'arrowleft':
      case 'arrowright':
        flight.rollInput = 0;
        break;
    }
  }

  // ----------------------------------------------------------------------------
  // 16. GUARANTEED RESIZE LOGIC
  // ----------------------------------------------------------------------------
  function handleResize(forcedW, forcedH) {
    if (!renderer || !camera) return;
    const container = document.getElementById('simulator-section') || document.body;
    const w = forcedW || (container.clientWidth > 0 ? container.clientWidth : window.innerWidth);
    const h = forcedH || (container.clientHeight > 0 ? container.clientHeight : Math.max(300, window.innerHeight - 70));

    if (w <= 0 || h <= 0) return;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

  function initResizeObserver() {
    const container = document.getElementById('simulator-section');
    if (container && window.ResizeObserver) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          if (cr.width > 0 && cr.height > 0) {
            handleResize(cr.width, cr.height);
          }
        }
      });
      ro.observe(container);
    }
    window.addEventListener('resize', () => handleResize());
  }

  // Multi-stage onShow ensures WebGL is NEVER 0x0
  SIM.onShow = function () {
    SIM.running = true;
    SIM.paused = false;

    const container = document.getElementById('simulator-section');
    if (container) {
      container.classList.add('active');
    }

    // Stage 1: Immediate
    handleResize();

    // Stage 2: Next Animation Frame
    requestAnimationFrame(() => {
      handleResize();
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    });

    // Stage 3: After DOM reflow (50ms)
    setTimeout(() => {
      handleResize();
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    }, 50);

    // Stage 4: Safety Check (200ms)
    setTimeout(() => {
      handleResize();
    }, 200);
  };

  SIM.onHide = function () {
    const container = document.getElementById('simulator-section');
    if (container) {
      container.classList.remove('active');
    }
  };

  // ----------------------------------------------------------------------------
  // 17. MAIN 60 FPS ANIMATION LOOP
  // ----------------------------------------------------------------------------
  function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(0.05, Math.max(0.001, clock.getDelta()));

    // 1. Aerodynamic Physics
    updatePhysics(dt);

    // 2. Particle FX
    updateParticles(dt);

    // 3. Dynamic Slippy Map Tile Streaming
    updateSatelliteTiles();

    // 4. Audio
    updateAudio();

    // 5. Camera
    updateCamera();

    // 6. UI Instruments & Radar
    updateHUDInstruments();
    updateRadar();

    // 7. Render 3D Scene
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  // ----------------------------------------------------------------------------
  // 18. INITIAL ENTRYPOINT
  // ----------------------------------------------------------------------------
  function initSimulator() {
    if (SIM.initialized) return;

    init3DWorld();
    initControls();

    SIM.initialized = true;
    SIM.running = true;

    // Start 60fps loop immediately
    animate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSimulator);
  } else {
    initSimulator();
  }

})();
