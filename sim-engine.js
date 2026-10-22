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
    paused: true,            // Paused until user opens simulator tab!
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
    touchControlsActive: false,
    gyroActive: false,
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
  // ROBUST SANITIZATION & AERODYNAMIC SAFETY ENVELOPE
  // ----------------------------------------------------------------------------
  function sanitize(val, fallback, min, max) {
    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) return fallback;
    return Math.min(Math.max(val, min), max);
  }

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
      pitchAuth: 1.2,
      rollAuth: 1.6,
      yawAuth: 1.4
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
      pitchAuth: 2.2,
      rollAuth: 2.8,
      yawAuth: 2.0
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
      pitchAuth: 1.1,
      rollAuth: 1.5,
      yawAuth: 1.3
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
      pitchAuth: 1.0,
      rollAuth: 1.4,
      yawAuth: 1.2
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
    propAngle: 0,

    // Live Aerodynamic & Mission Metrics (for Professor Formulas & Debriefing)
    liveCL: 0.38,
    liveCD: 0.028,
    liveLiftN: 16050,
    liveDragN: 1120,
    liveLD: 14.3,
    liveVeff: 58.0,
    liveSigma: 1.0,
    liveMass: 1638.0
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

    // Deterministic pseudo-random seed based on tile coordinates
    const seed = Math.abs(Math.sin(tx * 12.9898 + ty * 78.233) * 43758.5453) % 1;
    const baseHue = 75 + Math.floor(seed * 35); // 75-110: natural olive green, pasture, valley
    const baseSat = 28 + Math.floor(seed * 18);  // 28-46%
    const baseLight = 24 + Math.floor(seed * 12); // 24-36%

    // 1. Natural gradient background
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, `hsl(${baseHue}, ${baseSat}%, ${baseLight}%)`);
    grad.addColorStop(0.5, `hsl(${baseHue + 6}, ${baseSat + 4}%, ${baseLight + 3}%)`);
    grad.addColorStop(1, `hsl(${baseHue - 5}, ${baseSat - 2}%, ${baseLight - 2}%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // 2. Soft organic agrarian fields (irregular patches with soft edges, NO rigid checkerboards!)
    const numFields = 6;
    for (let f = 0; f < numFields; f++) {
      const fSeed = Math.abs(Math.sin(seed * 100 + f * 31.7) * 1000) % 1;
      const fHue = baseHue + ((f * 17) % 25) - 10;
      const fLight = baseLight + ((f * 7) % 12) - 4;
      const fx = (f % 3) * 85 + 10;
      const fy = Math.floor(f / 3) * 120 + 10;
      const fw = 65 + (fSeed * 20);
      const fh = 95 + (fSeed * 25);

      ctx.fillStyle = `hsla(${fHue}, ${baseSat + 10}%, ${fLight}%, 0.45)`;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(fx, fy, fw, fh, 6);
      } else {
        ctx.rect(fx, fy, fw, fh);
      }
      ctx.fill();
    }

    // 3. Subtle river/road vein
    const roadSeed = Math.abs(Math.sin(tx * 45.1 + ty * 23.9) * 1000) % 1;
    if (roadSeed > 0.35) {
      ctx.strokeStyle = 'rgba(160, 150, 130, 0.28)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const startY = (tx * 73) % 256;
      const endY = (ty * 97) % 256;
      ctx.moveTo(0, startY);
      ctx.bezierCurveTo(90, startY + 40, 160, endY - 30, 256, endY);
      ctx.stroke();
    }

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

    // Aerodynamic Tail Boattail Cone (Tapered rear fairing seamlessly closing pod)
    const tailConeGeo = new THREE.ConeGeometry(0.55, 1.6, 24);
    tailConeGeo.rotateX(-Math.PI / 2);
    const tailConeMesh = new THREE.Mesh(tailConeGeo, carbonWhiteMat);
    tailConeMesh.position.set(0, 0, -4.0);
    tailConeMesh.scale.set(1.0, 1.1, 1.0);
    tailConeMesh.castShadow = true;
    tailConeMesh.receiveShadow = true;
    planeGroup.add(tailConeMesh);

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
    if (SIM.paused) return;
    const cfg = PLANE_CONFIGS[SIM.planeModel] || PLANE_CONFIGS.full;

    // 1. Throttle & Propeller dynamics
    let effectiveThrottle = flight.throttle;
    if (SIM.boostActive) {
      effectiveThrottle = Math.min(1.0, flight.throttle + 0.35);
      SIM.boostTimer -= dt;
      if (SIM.boostTimer <= 0) SIM.boostActive = false;
    }

    const targetRPM = 600 + effectiveThrottle * 2400;
    flight.propRpm += (targetRPM - flight.propRpm) * 4 * dt;
    flight.propAngle += (flight.propRpm * (Math.PI * 2) / 60) * dt;

    propMeshes.forEach((p) => {
      p.rotation.z = flight.propAngle;
    });

    // 2. Mechanization Animations
    const targetFlapRad = (flight.flapsStage * 17.5 * Math.PI) / 180;
    flight.flapsAngle += (targetFlapRad - flight.flapsAngle) * 6 * dt;
    flapMeshes.forEach((f) => {
      f.rotation.x = -flight.flapsAngle;
    });

    const targetSpoiler = flight.spoilersActive ? 0.78 : 0.0;
    flight.spoilersPos += (targetSpoiler - flight.spoilersPos) * 8 * dt;
    spoilerMeshes.forEach((s) => {
      s.rotation.x = flight.spoilersPos;
    });

    flight.gearPos += (flight.gearTarget - flight.gearPos) * 2 * dt;
    gearMeshes.forEach((g) => {
      g.pivot.rotation.x = g.retractRotX * (1.0 - flight.gearPos);
    });

    // 3. Autopilot logic (Stable PD control without unbounded integrator!)
    if (SIM.apMode.level) {
      const targetPitch = -0.012;
      flight.pitchInput = THREE.MathUtils.clamp((flight.rot.x - targetPitch) * 2.8, -1.0, 1.0);
      flight.rollInput = THREE.MathUtils.clamp(-flight.rot.z * 3.5, -1.0, 1.0);
    }
    if (SIM.apMode.alt) {
      const altErr = SIM.apMode.targetAlt - flight.pos.y;
      const targetPitch = THREE.MathUtils.clamp(altErr * 0.002 - flight.vsi * 0.025, -0.22, 0.22);
      flight.pitchInput = THREE.MathUtils.clamp((flight.rot.x - targetPitch) * 2.8, -1.0, 1.0);
    }
    if (SIM.apMode.hdg) {
      const curHdg = ((-flight.rot.y * 180 / Math.PI) % 360 + 360) % 360;
      let hdgDiff = SIM.apMode.targetHdg - curHdg;
      if (hdgDiff > 180) hdgDiff -= 360;
      if (hdgDiff < -180) hdgDiff += 360;
      const targetRoll = THREE.MathUtils.clamp(-hdgDiff * 0.015, -0.45, 0.45);
      flight.rollInput = THREE.MathUtils.clamp((flight.rot.z - targetRoll) * 2.5, -1.0, 1.0);
    }

    // 4. Pilot Angular Accelerations & Coordinated Controls
    const sens = SIM.sensitivity;

    // Pitch Control (Attitude & Rate command with realistic stick-holding capability):
    // flight.pitchInput: -1.0 (stick forward / dive) to +1.0 (stick back / climb)
    // Full stick back (+1.0) commands ~ +24° climb (-0.42 rad in Three.js rot.x)
    // Full stick forward (-1.0) commands ~ -28° dive (+0.49 rad in Three.js rot.x)
    // When holding stick forward or backward, pitch attitude is firmly held!
    let targetPitch = -0.015; // Natural 1° nose-up level flight cruise trim
    if (Math.abs(flight.pitchInput) > 0.05) {
      if (flight.pitchInput > 0) {
        targetPitch = -flight.pitchInput * (24 * Math.PI / 180);
      } else {
        targetPitch = -flight.pitchInput * (28 * Math.PI / 180);
      }
      const pitchResponse = 2.8 * cfg.pitchAuth * sens;
      flight.rot.x += (targetPitch - flight.rot.x) * pitchResponse * dt;
    } else {
      // Natural longitudinal stability (restores gently towards trimmed level flight)
      flight.rot.x += (targetPitch - flight.rot.x) * (1.2 * sens) * dt;
    }

    // Stall recovery physics: only force nose down if stalled at critically low airspeed (< 65 km/h)
    if (flight.aoa > 18.0 && flight.ias < 65.0) {
      flight.rot.x += 1.2 * dt; // pitch down
    }

    // Roll Control (Coordinated Bank & Rate command):
    // flight.rollInput: -1.0 (turn left) to +1.0 (turn right)
    // In Three.js rot.z:
    // Bank right is rot.z < 0 (-0.68 rad / -39°)
    // Bank left is rot.z > 0 (+0.68 rad / +39°)
    let targetRoll = 0.0;
    if (Math.abs(flight.rollInput) > 0.05) {
      targetRoll = -flight.rollInput * (39 * Math.PI / 180);
      const rollResponse = 3.6 * cfg.rollAuth * sens;
      flight.rot.z += (targetRoll - flight.rot.z) * rollResponse * dt;
    } else if (!SIM.apMode.level) {
      // Lateral stability / Roll damping (smooth gentle return to level wings when roll stick is centered)
      flight.rot.z *= Math.max(0, 1.0 - 2.5 * dt);
    }

    // Coordinated Turn (Aileron + Rudder Heading turn):
    // In Three.js 'YXZ', rot.z < 0 is bank right -> totalYawRate > 0 turns heading to the right (+X)
    // rot.z > 0 is bank left -> totalYawRate < 0 turns heading to the left (-X)
    const turnFromBank = -flight.rot.z * 1.6;
    const turnFromRudder = (flight.yawInput || flight.rollInput * 0.75) * cfg.yawAuth * sens;
    const totalYawRate = turnFromBank + turnFromRudder;
    flight.rot.y += totalYawRate * dt;

    // Coordinated aerodynamic velocity vector turn:
    // Rotates the flight velocity vector horizontally to follow the heading turn
    if (Math.abs(totalYawRate) > 0.0001) {
      flight.vel.applyAxisAngle(new THREE.Vector3(0, 1, 0), totalYawRate * dt);
    }

    // Sanitize and clamp attitudes to safe flight envelope: [-60°, +60°]
    flight.rot.x = sanitize(flight.rot.x, 0.0, -1.05, 1.05);
    flight.rot.y = sanitize(flight.rot.y, 0.0, -100000, 100000);
    flight.rot.z = sanitize(flight.rot.z, 0.0, -1.2, 1.2);

    flight.quat.setFromEuler(flight.rot);

    // 5. 6-DOF Aerodynamic Forces
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(flight.quat);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(flight.quat);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(flight.quat);

    const tas = Math.max(0.1, flight.vel.length());
    const uV = flight.vel.clone().normalize();

    // True 3D Angle of Attack (AoA) clamped to aerodynamic envelope [-15°, +22°]
    const V_fwd = flight.vel.dot(fwd);
    const V_down = -flight.vel.dot(up);
    const aoaRad = Math.atan2(V_down, Math.max(1.5, V_fwd));
    flight.aoa = sanitize(aoaRad * 180 / Math.PI, 0.0, -15.0, 22.0);

    // ISA Atmosphere: exponential air density decay with altitude
    const alt = Math.max(0, flight.pos.y);
    const rho = 1.225 * Math.max(0.1, Math.exp(-alt / 8500));

    // Blown-Wing STOL: DEP propwash adds airflow over upper wing surface
    const propWashVel = effectiveThrottle * 22.0;
    const effectiveAirspeed = tas + propWashVel * 0.45;
    const qEff = 0.5 * rho * Math.pow(effectiveAirspeed, 2);

    // Lift coefficient: Base camber + Flaps + Linear slope with stall curve
    const baseCL = 0.88 + flight.flapsStage * 0.45;
    const clSlope = 4.8;
    let cl = baseCL + clSlope * (flight.aoa * Math.PI / 180);
    // Stall drop-off beyond ±16°
    if (Math.abs(flight.aoa) > 16.0) {
      const stallExcess = (Math.abs(flight.aoa) - 16.0) * (Math.PI / 180);
      cl *= Math.max(0.2, Math.cos(stallExcess * 2.5));
    }
    cl = THREE.MathUtils.clamp(cl, -0.9, 2.5);

    // McCormick Ground Effect factor: reduces induced drag near runway
    const wingHeight = Math.max(0.5, flight.pos.y - 1.25);
    const b = 12.4; // wingspan
    const sigmaGround = Math.min(1.0, Math.pow(16 * wingHeight / b, 2) / (1 + Math.pow(16 * wingHeight / b, 2)));

    // Lift force magnitude
    const currentMass = cfg.mass + (flight.fluidRemaining * 1.0);
    const liftForceN = qEff * cfg.wingArea * cl * (1.0 + (1.0 - sigmaGround) * 0.12);

    // Lift direction is normal to velocity in aircraft symmetry plane
    let liftDir;
    if (tas > 2.0) {
      liftDir = uV.clone().cross(right).normalize();
    } else {
      liftDir = up.clone();
    }
    const liftAcc = liftDir.clone().multiplyScalar(liftForceN / currentMass);

    // Drag: Parasite + Gear + Flaps + Spoilers + Stall + Induced
    const cdGear = (1.0 - flight.gearPos) * 0.005 + flight.gearPos * 0.035;
    const cdFlaps = flight.flapsStage * 0.032;
    const cdSpoilers = flight.spoilersPos * 0.075;
    const cdStall = Math.abs(flight.aoa) > 16.0 ? Math.pow((Math.abs(flight.aoa) - 16.0) * 0.05, 2) : 0;
    const cdParasite = 0.025 + cdGear + cdFlaps + cdSpoilers + cdStall;
    const cdInduced = (Math.pow(cl, 2) / (Math.PI * 11.5 * 0.85)) * sigmaGround;
    const totalCD = cdParasite + cdInduced;
    const dragForceN = 0.5 * rho * Math.pow(tas, 2) * cfg.wingArea * totalCD;
    const dragAcc = uV.clone().multiplyScalar(-dragForceN / currentMass);

    // Thrust
    const thrustN = effectiveThrottle * cfg.thrustMax * Math.pow(rho / 1.225, 0.7);
    const thrustAcc = fwd.clone().multiplyScalar(thrustN / currentMass);

    // Gravity
    const gravAcc = new THREE.Vector3(0, -9.80665, 0);

    // Weathercock velocity alignment: aircraft velocity vector smoothly aligns with forward direction
    const currentSpeed = Math.max(0.1, flight.vel.length());
    flight.vel.lerp(fwd.clone().multiplyScalar(currentSpeed), Math.min(1.0, 5.0 * dt));

    // Total Acceleration
    const acc = new THREE.Vector3();
    acc.add(thrustAcc);
    acc.add(liftAcc);
    acc.add(dragAcc);
    acc.add(gravAcc);

    // Integrate velocity
    flight.vel.addScaledVector(acc, dt);

    // Aerodynamic Safety Clamps: Velocity components & VSI (-45 to +35 m/s)
    flight.vel.x = sanitize(flight.vel.x, 0, -110, 110);
    flight.vel.y = sanitize(flight.vel.y, 0, -45.0, 35.0);
    flight.vel.z = sanitize(flight.vel.z, 0, -110, 110);

    // Update speeds with strictly enforced safety bounds (IAS: 0 to 380 km/h)
    flight.tas = Math.max(0.1, flight.vel.length());
    const maxTas = 380 / 3.6; // ~105.56 m/s
    if (flight.tas > maxTas) {
      flight.vel.setLength(maxTas);
      flight.tas = maxTas;
    }
    flight.ias = sanitize(flight.tas * 3.6 * Math.sqrt(rho / 1.225), 140, 0, 380.0);
    flight.kts = flight.ias * 0.539957;
    flight.vsi = sanitize(flight.vel.y, 0, -45.0, 35.0);

    // Move aircraft in world space
    flight.pos.addScaledVector(flight.vel, dt);
    flight.pos.x = sanitize(flight.pos.x, 0, -200000, 200000);
    flight.pos.z = sanitize(flight.pos.z, 0, -200000, 200000);

    // Ground collision & Runway Roll physics
    const groundLevel = 1.25;
    if (flight.pos.y <= groundLevel) {
      flight.pos.y = groundLevel;
      flight.vel.y = Math.max(0, flight.vel.y);
      flight.rot.z *= 0.8;
      // Allow nose-up pitch rotation on runway up to -12° (-0.21 rad) for STOL takeoff!
      flight.rot.x = Math.max(-0.21, Math.min(0.02, flight.rot.x));
      flight.altAGL = 0;

      // Ground rolling resistance & brakes
      if (flight.gearPos > 0.5) {
        flight.vel.x *= Math.max(0, 1.0 - 1.5 * dt);
        if (flight.throttle < 0.1 || flight.spoilersActive) {
          flight.vel.z *= Math.max(0, 1.0 - 1.2 * dt);
        }
      }
    } else {
      flight.altAGL = flight.pos.y - 1.25;
    }

    // Altitude (ALT) safety envelope: 0 to 8500 m
    flight.pos.y = sanitize(flight.pos.y, 700, groundLevel, 8500.0);
    if (flight.pos.y >= 8500.0) {
      flight.pos.y = 8500.0;
      flight.vel.y = Math.min(0, flight.vel.y);
    }
    flight.altMSL = sanitize(flight.pos.y, 700, 0, 8500.0);
    flight.altAGL = Math.max(0, flight.altMSL - groundLevel);

    flight.gLoad = sanitize(1.0 + (acc.y / 9.80665), 1.0, -4.0, 9.0);

    // Stall Warning Banner (Active if AoA > 18° or near stall at low speed)
    const stallBanner = document.getElementById('sim-stall-warning');
    if (stallBanner) {
      const isStall = (flight.aoa > 18.0) || (Math.abs(flight.aoa) > 15.0 && flight.ias < 75);
      stallBanner.style.display = isStall ? 'flex' : 'none';
    }

    // Update 3D mesh transforms
    planeGroup.position.copy(flight.pos);
    planeGroup.quaternion.copy(flight.quat);

    // Consumables consumption
    flight.h2MassRemaining = Math.max(0, flight.h2MassRemaining - (effectiveThrottle * 0.0008 * dt));
    if (flight.waterDropping) {
      flight.fluidRemaining = Math.max(0, flight.fluidRemaining - 120 * dt);
      if (flight.fluidRemaining <= 0) flight.waterDropping = false;
    }
    if (flight.agroSpraying) {
      flight.fluidRemaining = Math.max(0, flight.fluidRemaining - 15 * dt);
      if (flight.fluidRemaining <= 0) flight.agroSpraying = false;
    }

    // Save live metrics for Professor formulas
    flight.liveCL = cl;
    flight.liveCD = totalCD;
    flight.liveLiftN = Math.round(liftForceN);
    flight.liveDragN = Math.round(dragForceN);
    flight.liveLD = dragForceN > 1 ? (liftForceN / dragForceN) : 0;
    flight.liveVeff = effectiveAirspeed;
    flight.liveSigma = sigmaGround;
    flight.liveMass = currentMass;

    // Update Aerodynamic Vector Helpers
    if (flight.showAeroVectors && aeroVectorGroup) {
      const lArrow = aeroVectorGroup.getObjectByName('liftArrow');
      const tArrow = aeroVectorGroup.getObjectByName('thrustArrow');
      const dArrow = aeroVectorGroup.getObjectByName('dragArrow');
      if (lArrow) lArrow.setLength(Math.min(7, Math.max(0.5, (liftForceN / currentMass) * 0.35)));
      if (tArrow) tArrow.setLength(Math.min(7, Math.max(0.5, (thrustN / currentMass) * 0.35)));
      if (dArrow) dArrow.setLength(Math.min(7, Math.max(0.5, (dragForceN / currentMass) * 0.35)));
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
    const altVal = sanitize(flight.altMSL, 700, 0, 8500);
    const vsiVal = sanitize(flight.vsi, 0, -45.0, 35.0);
    if (altEl) altEl.textContent = `${Math.round(altVal)} м`;
    if (altFtEl) altFtEl.textContent = `(${Math.round(altVal * 3.28084)} ft)`;
    if (vsiEl) {
      vsiEl.textContent = `VSI: ${vsiVal > 0 ? '+' : ''}${vsiVal.toFixed(1)} м/с`;
    }

    // 2. Speed
    const spdKmhEl = document.getElementById('sim-spd-kmh');
    const spdKtsEl = document.getElementById('sim-spd-kts');
    const modeBadge = document.getElementById('sim-mode-badge');
    const iasVal = sanitize(flight.ias, 140, 0, 380);
    if (spdKmhEl) spdKmhEl.textContent = `${Math.round(iasVal)} км/ч`;
    if (spdKtsEl) spdKtsEl.textContent = `(${Math.round(iasVal * 0.539957)} kts)`;
    if (modeBadge) {
      if (iasVal < 60) modeBadge.textContent = 'STOL APPROACH';
      else if (vsiVal > 3.0) modeBadge.textContent = 'STOL CLIMB';
      else modeBadge.textContent = 'STOL CRUISE';
    }

    // 3. AoA and Roll
    const aoaEl = document.getElementById('sim-aoa-deg');
    const rollEl = document.getElementById('sim-roll-deg');
    const gLoadEl = document.getElementById('sim-gload-val');
    const aoaVal = sanitize(flight.aoa, 0, -15.0, 22.0);
    if (aoaEl) {
      aoaEl.textContent = `AoA: ${aoaVal.toFixed(1)}°`;
    }
    if (rollEl) {
      const rollDeg = sanitize(flight.rot.z * 180 / Math.PI, 0, -90, 90);
      if (Math.abs(rollDeg) < 1.0) rollEl.textContent = '0.0° КУРС';
      else if (rollDeg > 0) rollEl.textContent = `${rollDeg.toFixed(1)}° ВЛЕВО`;
      else rollEl.textContent = `${Math.abs(rollDeg).toFixed(1)}° ВПРАВО`;
    }
    if (gLoadEl) gLoadEl.textContent = `G: ${sanitize(flight.gLoad, 1.0, -4, 9).toFixed(2)}`;

    // 4. Throttle
    const thrValEl = document.getElementById('sim-throttle-val');
    const thrSlider = document.getElementById('sim-slider-throttle');
    const thrPct = Math.round(sanitize(flight.throttle, 0.65, 0, 1.0) * 100);
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
    if (radarSpd) radarSpd.textContent = `${Math.round(iasVal)} км/ч`;
    if (radarAgl) radarAgl.textContent = `${Math.round(sanitize(flight.altAGL, 0, 0, 8500))} м`;

    if (radarCoords) {
      const deltaZ = sanitize(flight.pos.z, 0, -200000, 200000);
      const deltaX = sanitize(flight.pos.x, 0, -200000, 200000);
      let curLat = currentOriginLat - (deltaZ / 111132);
      curLat = sanitize(curLat, currentOriginLat, -85.0, 85.0);
      const cosLat = Math.max(0.1, Math.cos(curLat * Math.PI / 180));
      let curLon = currentOriginLon + (deltaX / (111132 * cosLat));
      curLon = sanitize(curLon, currentOriginLon, -180.0, 180.0);
      const latHem = curLat >= 0 ? 'N' : 'S';
      const lonHem = curLon >= 0 ? 'E' : 'W';
      radarCoords.textContent = `${Math.abs(curLat).toFixed(6)}° ${latHem}, ${Math.abs(curLon).toFixed(6)}° ${lonHem}`;
    }

    // 7. FPV Reticle & Pitch Ladder (moves UP when nose pitches up)
    const fpvWrap = document.getElementById('sim-fpv-marker');
    if (fpvWrap) {
      const pitchPx = THREE.MathUtils.clamp(flight.rot.x * 260, -120, 120);
      const rollDeg = -flight.rot.z * 180 / Math.PI;
      fpvWrap.style.transform = `translate(-50%, calc(-50% + ${pitchPx}px)) rotate(${rollDeg}deg)`;
    }

    // 8. Update Touch Throttle handle UI
    const touchThrHandle = document.getElementById('touch-throttle-handle');
    const touchThrPct = document.getElementById('touch-throttle-pct');
    if (touchThrHandle && touchThrPct) {
      touchThrHandle.style.bottom = `${thrPct * 0.72}%`;
      touchThrPct.textContent = `${thrPct}%`;
    }

    // 9. Throttle Presets active class sync
    document.querySelectorAll('.btn-thr-preset').forEach((btn) => {
      const bThr = parseInt(btn.getAttribute('data-thr'), 10);
      btn.classList.toggle('active', Math.abs(bThr - thrPct) <= 5);
    });
  }

  // Live Professor Aerodynamics Formulas & Telemetry Overlay
  function updateProfessorOverlay() {
    const overlay = document.getElementById('sim-professor-overlay');
    if (!overlay || overlay.style.display === 'none') return;

    const elVeff = document.getElementById('prof-veff');
    const elAoa = document.getElementById('prof-aoa');
    const elCl = document.getElementById('prof-cl');
    const elLift = document.getElementById('prof-lift');
    const elSigma = document.getElementById('prof-sigma');
    const elDrag = document.getElementById('prof-drag');
    const elLD = document.getElementById('prof-ld');
    const elMass = document.getElementById('prof-mass');
    const elFluid = document.getElementById('prof-fluid-mass');
    const elGload = document.getElementById('prof-gload');
    const elPfc = document.getElementById('prof-pfc');
    const elPbuf = document.getElementById('prof-pbuf');
    const elH2flow = document.getElementById('prof-h2flow');

    if (elVeff) elVeff.textContent = `${flight.liveVeff.toFixed(1)} м/с (${Math.round(flight.liveVeff * 3.6)} км/ч)`;
    if (elAoa) elAoa.textContent = `${flight.aoa.toFixed(1)}°`;
    if (elCl) elCl.textContent = flight.liveCL.toFixed(2);
    if (elLift) elLift.textContent = `${flight.liveLiftN.toLocaleString()} Н`;
    if (elSigma) {
      elSigma.textContent = flight.liveSigma < 0.98 ? `${flight.liveSigma.toFixed(2)} (Ground Effect)` : '1.00 (Out of Ground)';
    }
    if (elDrag) elDrag.textContent = `${flight.liveDragN.toLocaleString()} Н`;
    if (elLD) elLD.textContent = flight.liveLD.toFixed(1);
    if (elMass) elMass.textContent = `${flight.liveMass.toFixed(1)} кг`;
    if (elFluid) elFluid.textContent = `${flight.fluidRemaining.toFixed(1)} кг`;
    if (elGload) elGload.textContent = `${flight.gLoad.toFixed(2)} G`;
    if (elPfc) elPfc.textContent = `${(flight.throttle * 42.0).toFixed(1)} kW`;
    if (elPbuf) elPbuf.textContent = SIM.boostActive ? '35.0 kW (BOOST ON)' : '0.0 kW (STOL off)';
    if (elH2flow) elH2flow.textContent = `${(flight.throttle * 2.4).toFixed(1)} кг/ч`;
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
  function resetToAirFlight700() {
    flight.pos.set(0, 700, 0);
    const speedMs = 140 / 3.6; // 140 km/h = 38.89 m/s
    flight.vel.set(0, 0, speedMs);
    flight.rot.set(0, 0, 0);
    flight.vsi = 0;
    flight.throttle = 0.65; // 65%
    flight.propRpm = 600 + 0.65 * 2400;
    flight.aoa = 0;
    flight.ias = 140;
    flight.tas = speedMs;
    flight.kts = 140 * 0.539957;
    flight.pitchInput = 0;
    flight.rollInput = 0;
    flight.yawInput = 0;
    for (const k in keysPressed) delete keysPressed[k];
    SIM.isJoyDragging = false;
    SIM.isMouseFlightActive = false;
    flight.gearTarget = 0.0;
    flight.gearPos = 0.0;
    flight.flapsStage = 0;
    flight.spoilersActive = false;
    flight.waterDropping = false;
    flight.agroSpraying = false;
    SIM.boostActive = false;
    SIM.apMode.level = false;
    SIM.apMode.alt = false;
    SIM.apMode.hdg = false;

    if (planeGroup) {
      planeGroup.position.copy(flight.pos);
      planeGroup.quaternion.setFromEuler(flight.rot);
    }
    if (camera) {
      SIM.cameraMode = 'chase';
      const behindOffset = new THREE.Vector3(0, 2.5, -12.5);
      camera.position.copy(flight.pos).add(behindOffset);
      const lookTarget = flight.pos.clone().add(new THREE.Vector3(0, 0.8, 8.0));
      camera.lookAt(lookTarget);
    }

    const thrSlider = document.getElementById('sim-slider-throttle');
    const thrValEl = document.getElementById('sim-throttle-val');
    if (thrSlider) thrSlider.value = 65;
    if (thrValEl) thrValEl.textContent = '65%';
    document.querySelectorAll('.btn-thr-preset').forEach(b => b.classList.remove('active'));

    showToast('🔄 СБРОС В ПОЛЁТ: ВЫСОТА 700 М, СКОРОСТЬ 140 КМ/Ч, ТЯГА 65%');
  }

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
  // Touch Controls & Sensor Handlers
  function initTouchControls() {
    const joyZone = document.getElementById('virtual-joystick-zone');
    const joyKnob = document.getElementById('virtual-joystick-knob');
    const thrTrack = document.getElementById('touch-throttle-track');
    const thrHandle = document.getElementById('touch-throttle-handle');
    const thrPctLabel = document.getElementById('touch-throttle-pct');
    const rudLeft = document.getElementById('touch-rudder-left');
    const rudRight = document.getElementById('touch-rudder-right');
    const touchOverlay = document.getElementById('sim-touch-controls');
    const touchToggleBtn = document.getElementById('btn-sim-touch-toggle');
    const touchToggleLabel = document.getElementById('sim-touch-label');

    // Auto-detect touchscreen device
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 1024);
    if (isTouchDevice && touchOverlay) {
      touchOverlay.classList.add('active');
      SIM.touchControlsActive = true;
      if (touchToggleBtn) touchToggleBtn.classList.add('active');
      if (touchToggleLabel) touchToggleLabel.textContent = 'Джойстик ВКЛ';
    }

    if (touchToggleBtn && touchOverlay) {
      touchToggleBtn.addEventListener('click', () => {
        SIM.touchControlsActive = !SIM.touchControlsActive;
        touchOverlay.classList.toggle('active', SIM.touchControlsActive);
        touchToggleBtn.classList.toggle('active', SIM.touchControlsActive);
        if (touchToggleLabel) {
          touchToggleLabel.textContent = SIM.touchControlsActive ? 'Джойстик ВКЛ' : 'Джойстик ВЫКЛ';
        }
        showToast(SIM.touchControlsActive ? '🕹️ СЕНСОРНЫЙ ДЖОЙСТИК ВКЛЮЧЕН' : 'ДЖОЙСТИК СКРЫТ');
      });
    }

    // 1. Virtual 3D Flight Stick (Pitch & Roll) with Independent Pointer & Touch Identifier Tracking
    if (joyZone && joyKnob) {
      let joyActive = false;
      let joyPointerId = null;
      let joyTouchId = null;
      const maxR = 48;

      const resetJoy = () => {
        joyActive = false;
        joyPointerId = null;
        joyTouchId = null;
        SIM.isJoyDragging = false;
        joyKnob.style.transform = 'translate(-50%, -50%)';
        flight.pitchInput = 0;
        flight.rollInput = 0;
        flight.yawInput = 0;
      };

      const updateJoyCoords = (clientX, clientY) => {
        const rect = joyZone.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let dx = clientX - centerX;
        let dy = clientY - centerY;
        const dist = Math.hypot(dx, dy);
        if (dist > maxR) {
          dx = (dx / dist) * maxR;
          dy = (dy / dist) * maxR;
        }
        joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        // dx > 0 -> drag right -> turn right
        // dy > 0 -> drag down -> stick back -> pitch up
        flight.rollInput = THREE.MathUtils.clamp(dx / maxR, -1.0, 1.0);
        flight.yawInput = flight.rollInput;
        flight.pitchInput = THREE.MathUtils.clamp(dy / maxR, -1.0, 1.0);
      };

      // Pointer Events (supports stylus, mouse, and multi-touch)
      joyZone.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        joyActive = true;
        SIM.isJoyDragging = true;
        joyPointerId = e.pointerId;
        try { joyZone.setPointerCapture(e.pointerId); } catch (_) {}
        updateJoyCoords(e.clientX, e.clientY);
        initAudioEngine();
      });

      const onJoyPointerMove = (e) => {
        if (joyActive && e.pointerId === joyPointerId) {
          e.preventDefault();
          updateJoyCoords(e.clientX, e.clientY);
        }
      };

      const onJoyPointerEnd = (e) => {
        if (e.pointerId === joyPointerId) {
          e.preventDefault();
          try { joyZone.releasePointerCapture(e.pointerId); } catch (_) {}
          resetJoy();
        }
      };

      window.addEventListener('pointermove', onJoyPointerMove);
      window.addEventListener('pointerup', onJoyPointerEnd);
      window.addEventListener('pointercancel', onJoyPointerEnd);

      // Native Touch Events Fallback
      joyZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (joyTouchId === null && e.changedTouches.length > 0) {
          const t = e.changedTouches[0];
          joyTouchId = t.identifier;
          joyActive = true;
          SIM.isJoyDragging = true;
          updateJoyCoords(t.clientX, t.clientY);
          initAudioEngine();
        }
      }, { passive: false });

      window.addEventListener('touchmove', (e) => {
        if (joyTouchId !== null) {
          for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joyTouchId) {
              e.preventDefault();
              updateJoyCoords(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
              break;
            }
          }
        }
      }, { passive: false });

      const onJoyTouchEnd = (e) => {
        if (joyTouchId !== null) {
          for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joyTouchId) {
              e.preventDefault();
              resetJoy();
              break;
            }
          }
        }
      };

      window.addEventListener('touchend', onJoyTouchEnd, { passive: false });
      window.addEventListener('touchcancel', onJoyTouchEnd, { passive: false });
    }

    // 2. Touch Throttle Slider with Independent Multi-Hand Tracking
    if (thrTrack && thrHandle) {
      let thrActive = false;
      let thrPointerId = null;
      let thrTouchId = null;

      const updateThrCoords = (clientY) => {
        const rect = thrTrack.getBoundingClientRect();
        const trackH = rect.height;
        const relY = THREE.MathUtils.clamp((rect.bottom - clientY) / trackH, 0.0, 1.0);
        flight.throttle = relY;
        const pct = Math.round(relY * 100);
        thrHandle.style.bottom = `${pct * 0.72}%`;
        if (thrPctLabel) thrPctLabel.textContent = `${pct}%`;
        initAudioEngine();
      };

      thrTrack.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        thrActive = true;
        thrPointerId = e.pointerId;
        try { thrTrack.setPointerCapture(e.pointerId); } catch (_) {}
        updateThrCoords(e.clientY);
      });

      const onThrPointerMove = (e) => {
        if (thrActive && e.pointerId === thrPointerId) {
          e.preventDefault();
          updateThrCoords(e.clientY);
        }
      };

      const onThrPointerEnd = (e) => {
        if (e.pointerId === thrPointerId) {
          e.preventDefault();
          try { thrTrack.releasePointerCapture(e.pointerId); } catch (_) {}
          thrActive = false;
          thrPointerId = null;
        }
      };

      window.addEventListener('pointermove', onThrPointerMove);
      window.addEventListener('pointerup', onThrPointerEnd);
      window.addEventListener('pointercancel', onThrPointerEnd);

      // Touch fallback
      thrTrack.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (thrTouchId === null && e.changedTouches.length > 0) {
          const t = e.changedTouches[0];
          thrTouchId = t.identifier;
          thrActive = true;
          updateThrCoords(t.clientY);
          initAudioEngine();
        }
      }, { passive: false });

      window.addEventListener('touchmove', (e) => {
        if (thrTouchId !== null) {
          for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === thrTouchId) {
              e.preventDefault();
              updateThrCoords(e.changedTouches[i].clientY);
              break;
            }
          }
        }
      }, { passive: false });

      const onThrTouchEnd = (e) => {
        if (thrTouchId !== null) {
          for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === thrTouchId) {
              e.preventDefault();
              thrActive = false;
              thrTouchId = null;
              break;
            }
          }
        }
      };

      window.addEventListener('touchend', onThrTouchEnd, { passive: false });
      window.addEventListener('touchcancel', onThrTouchEnd, { passive: false });
    }

    // Touch Rudder Buttons
    if (rudLeft) {
      const startRudL = (e) => { e.preventDefault(); flight.yawInput = -1.0; };
      const stopRudL = () => { flight.yawInput = 0; };
      rudLeft.addEventListener('pointerdown', startRudL);
      rudLeft.addEventListener('pointerup', stopRudL);
      rudLeft.addEventListener('pointercancel', stopRudL);
    }
    if (rudRight) {
      const startRudR = (e) => { e.preventDefault(); flight.yawInput = 1.0; };
      const stopRudR = () => { flight.yawInput = 0; };
      rudRight.addEventListener('pointerdown', startRudR);
      rudRight.addEventListener('pointerup', stopRudR);
      rudRight.addEventListener('pointercancel', stopRudR);
    }

    // Action buttons
    const btnTouchSpray = document.getElementById('btn-touch-spray');
    if (btnTouchSpray) {
      btnTouchSpray.addEventListener('click', () => {
        const btn = document.getElementById('btn-act-spray');
        if (btn) btn.click();
      });
    }

    const btnTouchSalvo = document.getElementById('btn-touch-salvo');
    if (btnTouchSalvo) {
      btnTouchSalvo.addEventListener('click', () => {
        const btn = document.getElementById('btn-act-water');
        if (btn) btn.click();
      });
    }

    const btnTouchFlaps = document.getElementById('btn-touch-flaps');
    if (btnTouchFlaps) {
      btnTouchFlaps.addEventListener('click', () => {
        const btn = document.getElementById('btn-act-flaps');
        if (btn) btn.click();
      });
    }

    const btnTouchAp = document.getElementById('btn-touch-ap');
    if (btnTouchAp) {
      btnTouchAp.addEventListener('click', () => {
        const btn = document.getElementById('btn-ap-level');
        if (btn) btn.click();
      });
    }

    const btnTouchCam = document.getElementById('btn-touch-cam');
    if (btnTouchCam) {
      btnTouchCam.addEventListener('click', () => {
        const modes = ['chase', 'cockpit', 'satellite', 'orbit'];
        const curIdx = modes.indexOf(SIM.cameraMode);
        const nextMode = modes[(curIdx + 1) % modes.length];
        const btn = document.getElementById(`btn-cam-${nextMode === 'cockpit' ? 'fpv' : (nextMode === 'satellite' ? 'sat' : nextMode)}`);
        if (btn) btn.click();
      });
    }

    // Gyroscope / Tilt Sensor Mode
    const btnTouchGyro = document.getElementById('btn-touch-gyro');
    if (btnTouchGyro) {
      btnTouchGyro.addEventListener('click', () => {
        if (!SIM.gyroActive) {
          if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission().then((res) => {
              if (res === 'granted') {
                enableGyro();
              } else {
                showToast('❌ ДОСТУП К ДАТЧИКУ НАКЛОНА ОТКЛОНЁН');
              }
            }).catch(() => {
              enableGyro();
            });
          } else {
            enableGyro();
          }
        } else {
          disableGyro();
        }
      });
    }

    function enableGyro() {
      SIM.gyroActive = true;
      if (btnTouchGyro) btnTouchGyro.classList.add('active');
      window.addEventListener('deviceorientation', handleOrientation);
      showToast('📱 ДАТЧИК НАКЛОНА АКТИВЕН: НАКЛОНЯЙТЕ ТЕЛЕФОН!');
    }

    function disableGyro() {
      SIM.gyroActive = false;
      if (btnTouchGyro) btnTouchGyro.classList.remove('active');
      window.removeEventListener('deviceorientation', handleOrientation);
      flight.pitchInput = 0;
      flight.rollInput = 0;
      showToast('ДАТЧИК НАКЛОНА ВЫКЛЮЧЕН');
    }

    function handleOrientation(e) {
      if (!SIM.gyroActive) return;
      const beta = e.beta || 45;   // Front-back tilt
      const gamma = e.gamma || 0;  // Left-right tilt

      // Holding phone at ~45 deg pitch:
      // Tilt forward (beta < 45) -> stick fwd (pitch down, negative pitchInput)
      // Tilt back (beta > 45) -> stick back (pitch up, positive pitchInput)
      flight.pitchInput = THREE.MathUtils.clamp((beta - 45) / 25, -1.0, 1.0);
      // Tilt right (gamma > 0) -> roll right (+rollInput)
      flight.rollInput = THREE.MathUtils.clamp(gamma / 30, -1.0, 1.0);
    }
  }

  function initControls() {
    initTouchControls();

    // Throttle Quick Preset Buttons (100%, 75%, 25%, 0%)
    document.querySelectorAll('.btn-thr-preset').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        initAudioEngine();
        const thrVal = parseFloat(e.currentTarget.getAttribute('data-thr')) / 100;
        flight.throttle = thrVal;
        document.querySelectorAll('.btn-thr-preset').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const thrSlider = document.getElementById('sim-slider-throttle');
        if (thrSlider) thrSlider.value = Math.round(thrVal * 100);
        showToast(`ТЯГА УСТАНОВЛЕНА: ${Math.round(thrVal * 100)}%`);
      });
    });

    // Professor Telemetry Modal Toggle
    const btnProf = document.getElementById('btn-sim-professor');
    const modalProf = document.getElementById('sim-professor-overlay');
    const btnCloseProf = document.getElementById('btn-close-prof');
    if (btnProf && modalProf) {
      btnProf.addEventListener('click', () => {
        const isShown = modalProf.style.display !== 'none';
        modalProf.style.display = isShown ? 'none' : 'block';
        btnProf.classList.toggle('active', !isShown);
        showToast(!isShown ? '📐 ФОРМУЛЫ АЭРОДИНАМИКИ ВКЛЮЧЕНЫ' : 'ФОРМУЛЫ СКРЫТЫ');
      });
    }
    if (btnCloseProf && modalProf) {
      btnCloseProf.addEventListener('click', () => {
        modalProf.style.display = 'none';
        if (btnProf) btnProf.classList.remove('active');
      });
    }

    // Debriefing Modal Listeners
    const modalDebrief = document.getElementById('sim-debriefing-modal');
    const btnCloseDebrief = document.getElementById('btn-close-debriefing');
    const btnRestartMission = document.getElementById('btn-restart-mission');
    if (btnCloseDebrief && modalDebrief) {
      btnCloseDebrief.addEventListener('click', () => { modalDebrief.style.display = 'none'; });
    }
    if (btnRestartMission && modalDebrief) {
      btnRestartMission.addEventListener('click', () => {
        modalDebrief.style.display = 'none';
        startFromRunway();
      });
    }

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
    if (btnReset700) btnReset700.addEventListener('click', resetToAirFlight700);

    const btnResetTelem = document.getElementById('btn-sim-reset-telem');
    if (btnResetTelem) btnResetTelem.addEventListener('click', resetToAirFlight700);

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

    // 8. Mouse Flight (Virtual Yoke) & Orbit Dragging
    let isMouseDown = false;
    let mouseStartX = 0;
    let mouseStartY = 0;

    if (simCanvas) {
      simCanvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left click: Flight Yoke Control
          isMouseDown = true;
          SIM.isMouseFlightActive = true;
          mouseStartX = e.clientX;
          mouseStartY = e.clientY;
          initAudioEngine();
        } else if (e.button === 2) { // Right click: Camera Orbit
          isMouseDragging = true;
          mousePrevX = e.clientX;
          mousePrevY = e.clientY;
        }
      });

      window.addEventListener('mousemove', (e) => {
        if (isMouseDown && (SIM.cameraMode === 'chase' || SIM.cameraMode === 'cockpit')) {
          const maxDist = 120;
          let dx = e.clientX - mouseStartX;
          let dy = e.clientY - mouseStartY;
          flight.rollInput = THREE.MathUtils.clamp(dx / maxDist, -1.0, 1.0);
          flight.yawInput = flight.rollInput;
          flight.pitchInput = THREE.MathUtils.clamp(dy / maxDist, -1.0, 1.0);
        } else if (isMouseDragging && SIM.cameraMode === 'orbit') {
          const dx = e.clientX - mousePrevX;
          const dy = e.clientY - mousePrevY;
          orbitYaw -= dx * 0.008;
          orbitPitch = Math.max(-0.2, Math.min(1.4, orbitPitch + dy * 0.008));
          mousePrevX = e.clientX;
          mousePrevY = e.clientY;
        }
      });

      window.addEventListener('mouseup', () => {
        if (isMouseDown) {
          isMouseDown = false;
          SIM.isMouseFlightActive = false;
          flight.rollInput = 0;
          flight.yawInput = 0;
          flight.pitchInput = 0;
        }
        isMouseDragging = false;
      });

      simCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  // Active keyboard state table (supports Russian & English layouts and holding keys)
  const keysPressed = {};

  function updateFlightInputsFromKeys() {
    if (SIM.isJoyDragging || SIM.isMouseFlightActive) return;

    // Pitch: W / Up / Ц (forward -> pitch down), S / Down / Ы (backward -> pitch up)
    const isForward = keysPressed['KeyW'] || keysPressed['w'] || keysPressed['ц'] || keysPressed['ArrowUp'];
    const isBack = keysPressed['KeyS'] || keysPressed['s'] || keysPressed['ы'] || keysPressed['ArrowDown'];

    if (isForward && !isBack) {
      flight.pitchInput = -1.0;
    } else if (isBack && !isForward) {
      flight.pitchInput = 1.0;
    } else {
      flight.pitchInput = 0;
    }

    // Roll & Yaw: A / Left / Ф (turn left), D / Right / В (turn right)
    const isLeft = keysPressed['KeyA'] || keysPressed['a'] || keysPressed['ф'] || keysPressed['ArrowLeft'];
    const isRight = keysPressed['KeyD'] || keysPressed['d'] || keysPressed['в'] || keysPressed['ArrowRight'];

    if (isLeft && !isRight) {
      flight.rollInput = -1.0;
      flight.yawInput = -1.0;
    } else if (isRight && !isLeft) {
      flight.rollInput = 1.0;
      flight.yawInput = 1.0;
    } else {
      flight.rollInput = 0;
      flight.yawInput = 0;
    }
  }

  function handleKeyDown(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
      return;
    }
    const simSection = document.getElementById('simulator-section');
    if (simSection && !simSection.classList.contains('active') && SIM.paused) {
      return;
    }

    initAudioEngine();

    const code = e.code;
    const key = (e.key || '').toLowerCase();

    keysPressed[code] = true;
    keysPressed[key] = true;
    updateFlightInputsFromKeys();

    // Throttle & Special Operations
    if (code === 'KeyQ' || key === 'q' || key === 'й' || code === 'ShiftLeft' || code === 'ShiftRight' || key === 'shift') {
      flight.throttle = Math.min(1.0, flight.throttle + 0.05);
      const thrSlider = document.getElementById('sim-slider-throttle');
      if (thrSlider) thrSlider.value = Math.round(flight.throttle * 100);
    } else if (code === 'KeyE' || key === 'e' || key === 'у' || code === 'ControlLeft' || code === 'ControlRight' || key === 'control') {
      flight.throttle = Math.max(0.0, flight.throttle - 0.05);
      const thrSlider = document.getElementById('sim-slider-throttle');
      if (thrSlider) thrSlider.value = Math.round(flight.throttle * 100);
    } else if (code === 'KeyG' || key === 'g' || key === 'п') {
      document.getElementById('btn-act-gear')?.click();
    } else if (code === 'KeyF' || key === 'f' || key === 'а') {
      document.getElementById('btn-act-flaps')?.click();
    } else if (code === 'KeyB' || key === 'b' || key === 'и') {
      document.getElementById('btn-act-spoilers')?.click();
    } else if (code === 'Space' || key === ' ') {
      e.preventDefault();
      document.getElementById('btn-act-water')?.click();
    } else if (code === 'KeyX' || key === 'x' || key === 'ч') {
      document.getElementById('btn-act-spray')?.click();
    } else if (code === 'KeyV' || key === 'v' || key === 'м') {
      document.getElementById('btn-act-aero')?.click();
    } else if (code === 'KeyC' || key === 'c' || key === 'с') {
      const modes = ['chase', 'cockpit', 'satellite', 'orbit'];
      const curIdx = modes.indexOf(SIM.cameraMode);
      const nextMode = modes[(curIdx + 1) % modes.length];
      document.getElementById(`btn-cam-${nextMode === 'cockpit' ? 'fpv' : (nextMode === 'satellite' ? 'sat' : nextMode)}`)?.click();
    } else if (key === '1') {
      document.getElementById('btn-ap-level')?.click();
    } else if (key === '2') {
      document.getElementById('btn-ap-alt')?.click();
    } else if (key === '3') {
      document.getElementById('btn-ap-hdg')?.click();
    } else if (code === 'KeyR' || key === 'r' || key === 'к') {
      resetToAirFlight700();
    }
  }

  function handleKeyUp(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
      return;
    }
    const code = e.code;
    const key = (e.key || '').toLowerCase();
    delete keysPressed[code];
    delete keysPressed[key];
    updateFlightInputsFromKeys();
  }

  window.addEventListener('blur', () => {
    for (const k in keysPressed) delete keysPressed[k];
    if (!SIM.isJoyDragging && !SIM.isMouseFlightActive) {
      flight.pitchInput = 0;
      flight.rollInput = 0;
      flight.yawInput = 0;
    }
  });

  // ----------------------------------------------------------------------------
  // 16. GUARANTEED RESIZE LOGIC
  // ----------------------------------------------------------------------------
  function syncHeaderHeight() {
    const header = document.querySelector('.site-header');
    if (header && header.offsetHeight > 0) {
      document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
    }
  }

  function handleResize(forcedW, forcedH) {
    syncHeaderHeight();
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

  // Multi-stage onShow ensures WebGL is NEVER 0x0 and unpauses cleanly
  SIM.onShow = function () {
    if (!SIM.initialized) {
      initSimulator();
    }
    SIM.running = true;
    SIM.paused = false;

    if (SIM.audioEnabled && audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

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
    SIM.paused = true; // PAUSE physics loop completely when leaving simulator tab!
    if (audioCtx && audioCtx.state === 'running') {
      audioCtx.suspend();
    }
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

    // If paused (user is on another tab), drain delta clock and skip simulation!
    if (SIM.paused) {
      clock.getDelta();
      return;
    }

    const rawDelta = clock.getDelta();
    const dt = Math.min(Math.max(rawDelta, 0.001), 0.033); // Strict delta time clamping (<= 33ms) to prevent physics explosion

    // 0. Update Keyboard Continuous Input (holding keys & Russian layout)
    updateFlightInputsFromKeys();

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

    // 6. UI Instruments, Radar & Live Professor Formulas
    updateHUDInstruments();
    updateRadar();
    updateProfessorOverlay();

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
