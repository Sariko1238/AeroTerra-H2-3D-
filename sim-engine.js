/**
 * ==============================================================================
 * AEROTERRA H2 — ULTRA-REALISTIC 6-DOF FLIGHT SIMULATOR & MISSION ENGINE (MSFS 2024)
 * ==============================================================================
 * 
 * Master Aerospace Engineer & MSFS Simulation Lead Implementation:
 * - 6-DOF Aerodynamic Physics Engine (Blown-wing STOL, Stall curve, Ground effect)
 * - Procedural 10x10 km 3D World (STOL Airbase, PAPI glideslope, Orchards, Wildfires, Lake)
 * - InstancedMesh Vegetation, Fire & Smoke Particle FX, Hydro-Scooping Skim Physics
 * - Garmin G1000 PFD HUD (Artificial Horizon, Airspeed/Altitude Tapes, Compass, Minimap)
 * - Procedural Web Audio API Sound Synthesizer (Brushless motors, Wind, Stall Horn)
 * - Dual-Stick Mobile Touch UI & PC Keyboard/Mouse Controls
 * - Autonomous AI Mission Flight (Professor Demonstration Mode)
 * - Flight Test Debriefing Certificate & Performance Assessment
 * ==============================================================================
 */

(function () {
  'use strict';

  // Global Flight Simulator Object
  window.AeroTerraSim = {
    initialized: false,
    running: false,
    paused: false,
    scenario: 'stol',
    weather: 'day',
    cameraMode: 'chase', // 'chase', 'cockpit', 'flir', 'wing', 'drone'
    hudVisible: true,
    professorMode: false,
    autopilotActive: false,
    audioEnabled: true
  };

  const SIM = window.AeroTerraSim;

  // ----------------------------------------------------------------------------
  // 1. AERODYNAMIC CONSTANTS & PHYSICAL PARAMETERS
  // ----------------------------------------------------------------------------
  const AERO = {
    // Aircraft geometry
    massEmpty: 1220.0,       // kg (CFRP airframe + FC + motors)
    massH2Max: 30.0,         // kg (Cryo-tank capacity)
    massFluidMax: 600.0,     // kg (Agro fluid or water bomb)
    wingspan: 12.4,          // m (b)
    wingArea: 13.35,         // m² (S)
    aspectRatio: 11.5,       // AR = b² / S
    oswaldEff: 0.85,         // e
    
    // Aerodynamic Coefficients (NACA 64-215 Class-A)
    CL0: 0.28,               // Zero-alpha lift
    CL_alpha: 5.73,          // Lift slope per radian (~0.10 per deg)
    alphaCrit: 0.279,        // Critical AoA ~16 degrees
    CD0: 0.024,              // Parasitic drag coefficient
    CD_gear: 0.018,          // Landing gear drag increment
    CD_flaps15: 0.015,       // Flaps 15 drag
    CD_flaps35: 0.048,       // Flaps 35 drag
    CL_flaps15: 0.45,        // Flaps 15 lift increment
    CL_flaps35: 0.95,        // Flaps 35 lift increment
    
    // Propulsion & Blown-Wing STOL parameters
    kBlown: 0.55,            // Prop-wash blown-wing interaction factor
    maxPropWash: 32.0,       // m/s max slipstream velocity from 4x DEP
    maxThrustTotal: 8400.0,  // N total thrust at sea level (4x 2100 N)
    
    // Engine & Energy
    fuelCellPowerMax: 60.0,  // kW Ballard PEMFC output
    lipoBoostPowerMax: 35.0, // kW 12S LiPo buffer boost
    h2BurnRateMax: 3.2,      // kg/h at 100% throttle
    
    // Atmosphere
    rho0: 1.225,             // kg/m³ standard air density at sea level
    gravity: 9.80665,        // m/s²
    
    // Control Authorities (rad/s² per unit deflection)
    pitchAuthority: 2.8,
    rollAuthority: 4.2,
    yawAuthority: 1.8,
    pitchDamping: 2.4,
    rollDamping: 3.5,
    yawDamping: 2.2
  };

  // ----------------------------------------------------------------------------
  // 2. SIMULATOR FLIGHT STATE
  // ----------------------------------------------------------------------------
  const flight = {
    // Spatial coordinates & orientation
    pos: new THREE.Vector3(0, 1.25, 0), // Center on runway
    vel: new THREE.Vector3(0, 0, 0),
    rot: new THREE.Euler(0, 0, 0, 'YXZ'),
    quat: new THREE.Quaternion(),
    angVel: new THREE.Vector3(0, 0, 0),
    
    // Speeds
    airspeedTAS: 0.0,  // m/s
    airspeedIAS: 0.0,  // km/h
    vsi: 0.0,          // m/s vertical speed
    altitudeMSL: 120.0,// m above sea level
    altitudeAGL: 1.25, // m above ground level
    aoa: 0.0,          // deg angle of attack
    sideslip: 0.0,     // deg
    gLoad: 1.0,        // G's
    headingDeg: 90.0,  // deg magnetic heading (Runway 09)
    pitchDeg: 0.0,
    rollDeg: 0.0,
    
    // Controls
    throttle: 0.0,     // 0.0 to 1.0
    elevator: 0.0,     // -1.0 to +1.0
    aileron: 0.0,      // -1.0 to +1.0
    rudder: 0.0,       // -1.0 to +1.0
    flapsStage: 0,     // 0 = 0°, 1 = 15°, 2 = 35°
    flapsAngleDeg: 0,
    gearDown: true,
    brakes: false,
    sprayActive: false,
    
    // Systems & Consumables
    massH2: 28.5,      // kg
    massFluid: 600.0,  // kg / L
    lipoCharge: 95.0,  // %
    fcTemp: 68.0,      // °C
    motorRPM: 0,
    electricKW: 0.0,
    
    // Status
    onGround: true,
    stalling: false,
    buffeting: 0.0,
    touchdownTimer: 0.0,
    flightTime: 0.0,
    takeoffDist: 0.0,
    landingDist: 0.0,
    maxGLoad: 1.0,
    minGLoad: 1.0,
    keroseneSaved: 0.0,
    missionScore: 0
  };

  // World targets & navigation waypoints
  const NAV = {
    rwy: new THREE.Vector3(0, 0, 0),
    agro: new THREE.Vector3(1200, 20, 400),
    fire: new THREE.Vector3(-1800, 85, -1500),
    lake: new THREE.Vector3(-500, 2, 1400)
  };

  // Wind and Weather
  const weatherState = {
    windVec: new THREE.Vector3(-2.5, 0, 1.2), // m/s
    windSpeed: 2.8,
    windDirDeg: 295,
    turbulence: 0.0
  };

  // Input State
  const input = {
    w: false, s: false, a: false, d: false,
    up: false, down: false, left: false, right: false,
    space: false, f: false, g: false,
    touchPitch: 0.0,
    touchRoll: 0.0,
    touchThrottle: 0.0,
    touchRudder: 0.0
  };

  // ----------------------------------------------------------------------------
  // 3. THREE.JS 3D SCENE SETUP
  // ----------------------------------------------------------------------------
  let renderer, scene, camera, simCanvas;
  let aircraftGroup, propMeshes = [], flapMeshes = [], controlSurfaceMeshes = {};
  let landingLights = [], papiLights = [];
  let terrainMesh, lakeMesh, windsockMesh;
  let treeInstancedMesh, stressedTreeColors = [], healthyTreeColor;
  let fireSystems = [], smokeSystems = [];
  let sprayParticleSystem, waterDropSystem;
  let clock = new THREE.Clock();

  // Camera rigs
  let cameraOffset = new THREE.Vector3(0, 2.8, -9.5);
  let cameraLookTarget = new THREE.Vector3();
  let freeCameraAngle = { yaw: 0, pitch: 0.15, dist: 12 };

  // ----------------------------------------------------------------------------
  // 4. AUDIO SYNTHESIZER (WEB AUDIO API)
  // ----------------------------------------------------------------------------
  let audioCtx = null;
  let motorOsc1, motorOsc2, motorGain, motorFilter;
  let windNoiseNode, windGain, windFilter;
  let sprayNoiseNode, sprayGain;
  let stallOsc, stallGain, stallLfo;
  let soundStarted = false;

  function initAudioEngine() {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();

      // --- Motors Sound Synth ---
      motorOsc1 = audioCtx.createOscillator();
      motorOsc2 = audioCtx.createOscillator();
      motorOsc1.type = 'sawtooth';
      motorOsc2.type = 'triangle';
      motorOsc1.frequency.setValueAtTime(60, audioCtx.currentTime);
      motorOsc2.frequency.setValueAtTime(120, audioCtx.currentTime);

      motorFilter = audioCtx.createBiquadFilter();
      motorFilter.type = 'lowpass';
      motorFilter.frequency.setValueAtTime(450, audioCtx.currentTime);

      motorGain = audioCtx.createGain();
      motorGain.gain.setValueAtTime(0.0, audioCtx.currentTime);

      motorOsc1.connect(motorFilter);
      motorOsc2.connect(motorFilter);
      motorFilter.connect(motorGain);
      motorGain.connect(audioCtx.destination);

      motorOsc1.start();
      motorOsc2.start();

      // --- Wind Noise Synth (White Noise Buffer) ---
      const bufferSize = audioCtx.sampleRate * 2;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      windNoiseNode = audioCtx.createBufferSource();
      windNoiseNode.buffer = noiseBuffer;
      windNoiseNode.loop = true;

      windFilter = audioCtx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(350, audioCtx.currentTime);
      windFilter.Q.setValueAtTime(1.5, audioCtx.currentTime);

      windGain = audioCtx.createGain();
      windGain.gain.setValueAtTime(0.0, audioCtx.currentTime);

      windNoiseNode.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(audioCtx.destination);
      windNoiseNode.start();

      // --- Spray Hiss Synth ---
      sprayNoiseNode = audioCtx.createBufferSource();
      sprayNoiseNode.buffer = noiseBuffer;
      sprayNoiseNode.loop = true;

      const sprayFilter = audioCtx.createBiquadFilter();
      sprayFilter.type = 'highpass';
      sprayFilter.frequency.setValueAtTime(2200, audioCtx.currentTime);

      sprayGain = audioCtx.createGain();
      sprayGain.gain.setValueAtTime(0.0, audioCtx.currentTime);

      sprayNoiseNode.connect(sprayFilter);
      sprayFilter.connect(sprayGain);
      sprayGain.connect(audioCtx.destination);
      sprayNoiseNode.start();

      // --- Stall Siren Synth ---
      stallOsc = audioCtx.createOscillator();
      stallOsc.type = 'sawtooth';
      stallOsc.frequency.setValueAtTime(880, audioCtx.currentTime);

      stallGain = audioCtx.createGain();
      stallGain.gain.setValueAtTime(0.0, audioCtx.currentTime);

      stallOsc.connect(stallGain);
      stallGain.connect(audioCtx.destination);
      stallOsc.start();

      soundStarted = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  function updateAudio(dt) {
    if (!audioCtx || !soundStarted || !SIM.audioEnabled) {
      if (motorGain) motorGain.gain.setValueAtTime(0, audioCtx.currentTime);
      if (windGain) windGain.gain.setValueAtTime(0, audioCtx.currentTime);
      if (sprayGain) sprayGain.gain.setValueAtTime(0, audioCtx.currentTime);
      if (stallGain) stallGain.gain.setValueAtTime(0, audioCtx.currentTime);
      return;
    }

    const t = audioCtx.currentTime;
    const rpm = flight.motorRPM;
    
    // Motor pitch & volume
    const baseFreq = 45 + (rpm / 3800) * 220;
    motorOsc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
    motorOsc2.frequency.setTargetAtTime(baseFreq * 2, t, 0.05);
    motorFilter.frequency.setTargetAtTime(300 + (rpm / 3800) * 1200, t, 0.05);
    
    const targetMotorVol = (0.05 + flight.throttle * 0.35) * (rpm > 100 ? 1 : 0);
    motorGain.gain.setTargetAtTime(targetMotorVol, t, 0.08);

    // Wind slipstream noise
    const speedRatio = Math.min(1.0, flight.airspeedTAS / 60.0);
    windFilter.frequency.setTargetAtTime(200 + speedRatio * 800, t, 0.1);
    windGain.gain.setTargetAtTime(speedRatio * 0.28, t, 0.1);

    // Spray Hiss
    sprayGain.gain.setTargetAtTime(flight.sprayActive ? 0.22 : 0.0, t, 0.05);

    // Stall Warning Siren (pulsing beep)
    if (flight.stalling && !flight.onGround) {
      const pulse = Math.sin(t * 16) > 0 ? 0.25 : 0.0;
      stallGain.gain.setTargetAtTime(pulse, t, 0.02);
    } else {
      stallGain.gain.setTargetAtTime(0.0, t, 0.04);
    }
  }

  function playTouchdownSound() {
    if (!audioCtx || !SIM.audioEnabled) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, audioCtx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {}
  }

  function playSalvoSound() {
    if (!audioCtx || !SIM.audioEnabled) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {}
  }

  function playFanfareSound() {
    if (!audioCtx || !SIM.audioEnabled) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C - E - G - High C
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.12 + 0.6);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + idx * 0.12);
        osc.stop(audioCtx.currentTime + idx * 0.12 + 0.65);
      });
    } catch (e) {}
  }

  // ----------------------------------------------------------------------------
  // 5. PROCEDURAL 3D WORLD BUILDER (10×10 KM)
  // ----------------------------------------------------------------------------
  function init3DWorld() {
    simCanvas = document.getElementById('simulator-canvas');
    if (!simCanvas) return;

    // Renderer
    renderer = new THREE.WebGLRenderer({
      canvas: simCanvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(simCanvas.clientWidth, simCanvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // Scene & Fog
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8bc34a);
    scene.fog = new THREE.FogExp2(0x90caf9, 0.00018);

    // Camera
    camera = new THREE.PerspectiveCamera(
      55,
      simCanvas.clientWidth / simCanvas.clientHeight,
      0.1,
      14000
    );
    camera.position.set(0, 3, -12);

    // Dynamic Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    ambientLight.name = 'ambientLight';
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e3a1e, 0.55);
    hemiLight.name = 'hemiLight';
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff8e7, 1.3);
    sunLight.name = 'sunLight';
    sunLight.position.set(1200, 2400, 1800);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 4000;
    const shadowD = 350;
    sunLight.shadow.camera.left = -shadowD;
    sunLight.shadow.camera.right = shadowD;
    sunLight.shadow.camera.top = shadowD;
    sunLight.shadow.camera.bottom = -shadowD;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    // Sky Dome
    createSkyDome();

    // Procedural Terrain 10x10 km
    createTerrain();

    // STOL Runway, PAPI, Tower, Hangar
    createAirbase();

    // Zone 1: Agro Orchards with InstancedMesh Trees
    createAgroOrchards();

    // Zone 2: Forest Fire Emergency with Flame Particles
    createWildfireZone();

    // Zone 3: Hydro-Scooping Lake
    createHydroLake();

    // The Aircraft Model
    createAircraftModel();

    // Particle Systems: Spray mist & Water Salvo
    createParticleSystems();

    // Apply default weather preset
    setWeatherPreset('day');

    // Handle Container & Window Resize via ResizeObserver
    initResizeObserver();
  }

  // --- Sky Dome ---
  let skyDomeMesh;
  function createSkyDome() {
    const skyGeo = new THREE.SphereGeometry(9500, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x64b5f6,
      side: THREE.BackSide
    });
    skyDomeMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDomeMesh);
  }

  // --- Terrain Generator ---
  function getTerrainHeight(x, z) {
    // Runway area is flattened strictly
    const distToRwyX = Math.abs(x);
    const distToRwyZ = Math.abs(z);
    if (distToRwyX < 260 && distToRwyZ < 60) {
      return 0.0;
    }
    // Lake area depression
    const distToLake = Math.hypot(x - NAV.lake.x, z - NAV.lake.z);
    if (distToLake < 450) {
      return Math.max(0, -2.5 + Math.sin(x * 0.01) * 0.5);
    }
    // Mountains in North-West
    const distToMtn = Math.hypot(x + 2200, z + 1800);
    const mountainH = Math.max(0, 180 - distToMtn * 0.08) * Math.sin(x * 0.003) * Math.cos(z * 0.003);
    
    // Rolling hills
    const hills = Math.sin(x * 0.0015) * 18 + Math.cos(z * 0.0018) * 16 + Math.sin((x + z) * 0.004) * 8;
    return Math.max(0, hills + mountainH);
  }

  function createTerrain() {
    const terrainSize = 10000;
    const segments = 120;
    const geo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const vy = getTerrainHeight(vx, vz);
      pos.setY(i, vy);
    }
    geo.computeVertexNormals();

    // Procedural terrain texture canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Base emerald green valley
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, 1024, 1024);

    // Farm field patchwork
    for (let i = 0; i < 90; i++) {
      const fx = Math.random() * 950;
      const fz = Math.random() * 950;
      const fw = 40 + Math.random() * 110;
      const fh = 40 + Math.random() * 110;
      const hue = 75 + Math.random() * 45;
      const lum = 22 + Math.random() * 20;
      ctx.fillStyle = `hsl(${hue}, 48%, ${lum}%)`;
      ctx.fillRect(fx, fz, fw, fh);
      ctx.strokeStyle = '#1b3b18';
      ctx.lineWidth = 2;
      ctx.strokeRect(fx, fz, fw, fh);
    }

    // Dirt paths and rivers
    ctx.strokeStyle = '#6d5a3f';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(100, 512);
    ctx.bezierCurveTo(350, 480, 680, 560, 950, 520);
    ctx.stroke();

    const terrainTexture = new THREE.CanvasTexture(canvas);
    terrainTexture.wrapS = THREE.RepeatWrapping;
    terrainTexture.wrapT = THREE.RepeatWrapping;
    terrainTexture.repeat.set(16, 16);

    const mat = new THREE.MeshStandardMaterial({
      map: terrainTexture,
      roughness: 0.9,
      metalness: 0.05
    });

    terrainMesh = new THREE.Mesh(geo, mat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);
  }

  // --- Airbase: Runway, PAPI, Tower, Hangar ---
  function createAirbase() {
    const rwyGroup = new THREE.Group();

    // 1. Asphalt Runway: 420m long x 24m wide
    const rwyGeo = new THREE.PlaneGeometry(420, 24);
    rwyGeo.rotateX(-Math.PI / 2);

    const rwyCanvas = document.createElement('canvas');
    rwyCanvas.width = 1024;
    rwyCanvas.height = 128;
    const ctx = rwyCanvas.getContext('2d');

    // Dark aged asphalt
    ctx.fillStyle = '#22262c';
    ctx.fillRect(0, 0, 1024, 128);

    // White threshold stripes
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(20, 16 + i * 12, 50, 6);
      ctx.fillRect(1024 - 70, 16 + i * 12, 50, 6);
    }

    // Runway numbers "09" and "27"
    ctx.font = 'bold 38px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(110, 64);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('09', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(1024 - 110, 64);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('27', 0, 0);
    ctx.restore();

    // Centerline dashes
    for (let x = 160; x < 1024 - 160; x += 60) {
      ctx.fillRect(x, 61, 35, 6);
    }

    // Side border solid lines
    ctx.fillRect(0, 8, 1024, 4);
    ctx.fillRect(0, 116, 1024, 4);

    const rwyTexture = new THREE.CanvasTexture(rwyCanvas);
    const rwyMat = new THREE.MeshStandardMaterial({
      map: rwyTexture,
      roughness: 0.75,
      metalness: 0.1
    });

    const rwyMesh = new THREE.Mesh(rwyGeo, rwyMat);
    rwyMesh.position.set(0, 0.05, 0);
    rwyMesh.receiveShadow = true;
    rwyGroup.add(rwyMesh);

    // 2. Runway Edge Lights
    const lightGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.35, 8);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let x = -200; x <= 200; x += 30) {
      // Left side
      const l1 = new THREE.Mesh(lightGeo, lightMat);
      l1.position.set(x, 0.2, -13);
      rwyGroup.add(l1);
      // Right side
      const l2 = new THREE.Mesh(lightGeo, lightMat);
      l2.position.set(x, 0.2, 13);
      rwyGroup.add(l2);
    }

    // 3. Precision Approach Path Indicator (PAPI) Lights (4 Units)
    papiLights = [];
    const papiBaseX = -130;
    const papiZ = -18;
    for (let i = 0; i < 4; i++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.5, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x334155 })
      );
      box.position.set(papiBaseX + i * 4.5, 0.3, papiZ);

      const bulb = new THREE.PointLight(0xffffff, 1.8, 40);
      bulb.position.set(papiBaseX + i * 4.5, 0.6, papiZ);
      rwyGroup.add(box);
      rwyGroup.add(bulb);
      papiLights.push(bulb);
    }

    // 4. Aerospace Club Main Hangar
    const hangarGeo = new THREE.BoxGeometry(45, 14, 30);
    const hangarMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.6,
      roughness: 0.4
    });
    const hangarMesh = new THREE.Mesh(hangarGeo, hangarMat);
    hangarMesh.position.set(-80, 7, 45);
    hangarMesh.castShadow = true;
    hangarMesh.receiveShadow = true;
    rwyGroup.add(hangarMesh);

    // Hangar curved roof
    const roofGeo = new THREE.CylinderGeometry(24, 24, 45, 16, 1, false, 0, Math.PI);
    roofGeo.rotateZ(Math.PI / 2);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.set(-80, 14, 45);
    roofMesh.castShadow = true;
    rwyGroup.add(roofMesh);

    // 5. Airbase Control Tower
    const towerBaseGeo = new THREE.CylinderGeometry(4, 5, 26, 12);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    const tower = new THREE.Mesh(towerBaseGeo, towerMat);
    tower.position.set(40, 13, 50);
    tower.castShadow = true;
    rwyGroup.add(tower);

    // Glass cab
    const cabGeo = new THREE.CylinderGeometry(6, 4.5, 5, 12);
    const cabMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1
    });
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.set(40, 27, 50);
    rwyGroup.add(cab);

    // 6. Windsock
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 6, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(-15, 3, -22);
    rwyGroup.add(pole);

    const sockGeo = new THREE.ConeGeometry(0.6, 2.5, 12);
    sockGeo.rotateZ(Math.PI / 2);
    const sockMat = new THREE.MeshStandardMaterial({ color: 0xff5500 });
    windsockMesh = new THREE.Mesh(sockGeo, sockMat);
    windsockMesh.position.set(-15, 5.8, -22);
    rwyGroup.add(windsockMesh);

    scene.add(rwyGroup);
  }

  // Update PAPI glideslope lights (4 units)
  function updatePAPILights() {
    if (!papiLights || papiLights.length < 4) return;
    
    // Distance from threshold
    const distToThreshold = Math.hypot(flight.pos.x - (-130), flight.pos.z);
    const altAGL = flight.altitudeAGL;
    
    // Glideslope angle in degrees
    const currentAngleDeg = (Math.atan2(altAGL, distToThreshold) * 180) / Math.PI;

    // Threshold angles:
    // > 3.5°: 4 White
    // 3.2° - 3.5°: 3 White, 1 Red
    // 2.8° - 3.2°: 2 White, 2 Red (Ideal)
    // 2.5° - 2.8°: 1 White, 3 Red
    // < 2.5°: 4 Red
    let whiteCount = 2;
    if (currentAngleDeg > 3.5) whiteCount = 4;
    else if (currentAngleDeg > 3.2) whiteCount = 3;
    else if (currentAngleDeg > 2.8) whiteCount = 2;
    else if (currentAngleDeg > 2.4) whiteCount = 1;
    else whiteCount = 0;

    for (let i = 0; i < 4; i++) {
      if (i < whiteCount) {
        papiLights[i].color.setHex(0xffffff); // White
      } else {
        papiLights[i].color.setHex(0xff0022); // Red
      }
    }
  }

  // --- Zone 1: Agro Orchards with InstancedMesh Trees ---
  const agroSectors = [
    { x: 1050, z: 250, treated: 0, rings: [] },
    { x: 1250, z: 250, treated: 0, rings: [] },
    { x: 1050, z: 450, treated: 0, rings: [] },
    { x: 1250, z: 450, treated: 0, rings: [] },
    { x: 1050, z: 650, treated: 0, rings: [] },
    { x: 1250, z: 650, treated: 0, rings: [] }
  ];

  function createAgroOrchards() {
    const treeCount = 450;
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 2.5, 6);
    const crownGeo = new THREE.SphereGeometry(2.2, 8, 6);
    crownGeo.translate(0, 3.2, 0);

    // Merge trunk and crown
    const singleTreeGeo = new THREE.BufferGeometry();
    // For performance, we instantiate the crown geometry directly
    const treeMat = new THREE.MeshStandardMaterial({
      roughness: 0.8,
      metalness: 0.1
    });

    treeInstancedMesh = new THREE.InstancedMesh(crownGeo, treeMat, treeCount);
    treeInstancedMesh.castShadow = true;
    treeInstancedMesh.receiveShadow = true;

    healthyTreeColor = new THREE.Color(0x10b981); // Emerald
    const stressedBaseColor = new THREE.Color(0xd4af37); // Golden yellow (pest damage)

    let idx = 0;
    const dummy = new THREE.Object3D();

    agroSectors.forEach((sec, sIdx) => {
      // 75 trees per sector in neat rows
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 15; c++) {
          if (idx >= treeCount) break;
          const tx = sec.x + (c - 7) * 12 + (Math.random() - 0.5) * 1.5;
          const tz = sec.z + (r - 2) * 16 + (Math.random() - 0.5) * 1.5;
          const ty = getTerrainHeight(tx, tz);

          dummy.position.set(tx, ty, tz);
          const scale = 0.85 + Math.random() * 0.3;
          dummy.scale.set(scale, scale, scale);
          dummy.rotation.y = Math.random() * Math.PI * 2;
          dummy.updateMatrix();

          treeInstancedMesh.setMatrixAt(idx, dummy.matrix);
          treeInstancedMesh.setColorAt(idx, stressedBaseColor);
          stressedTreeColors.push({ current: stressedBaseColor.clone(), sector: sIdx });
          idx++;
        }
      }

      // Waypoint Rings hovering over orchard rows (6-10m AGL)
      const ringGeo = new THREE.TorusGeometry(5.0, 0.25, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ff9d,
        transparent: true,
        opacity: 0.6
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      const rY = getTerrainHeight(sec.x, sec.z) + 8.5;
      ringMesh.position.set(sec.x, rY, sec.z);
      ringMesh.rotation.y = Math.PI / 2;
      scene.add(ringMesh);
      sec.rings.push(ringMesh);
    });

    treeInstancedMesh.instanceMatrix.needsUpdate = true;
    if (treeInstancedMesh.instanceColor) treeInstancedMesh.instanceColor.needsUpdate = true;
    scene.add(treeInstancedMesh);
  }

  // Update Agro spraying effect over trees
  function updateAgroSpraying(dt) {
    if (!flight.sprayActive || flight.massFluid <= 0) return;

    // Fluid consumption during spray: 12 L/s
    flight.massFluid = Math.max(0, flight.massFluid - 12.0 * dt);

    const planeX = flight.pos.x;
    const planeZ = flight.pos.z;
    const planeAGL = flight.altitudeAGL;

    // Check proximity to sectors (must be below 18m AGL)
    if (planeAGL < 22.0) {
      agroSectors.forEach((sec, sIdx) => {
        const dist = Math.hypot(planeX - sec.x, planeZ - sec.z);
        if (dist < 90) {
          // Increase sector treated percentage
          sec.treated = Math.min(100, sec.treated + 24.0 * dt);

          // Update tree colors smoothly from yellow to vibrant green
          for (let i = 0; i < stressedTreeColors.length; i++) {
            if (stressedTreeColors[i].sector === sIdx) {
              const c = stressedTreeColors[i].current;
              c.lerp(healthyTreeColor, 0.08);
              treeInstancedMesh.setColorAt(i, c);
            }
          }
          if (treeInstancedMesh.instanceColor) {
            treeInstancedMesh.instanceColor.needsUpdate = true;
          }
        }
      });
    }

    // Calculate overall agro progress
    let totalTreated = 0;
    agroSectors.forEach(s => (totalTreated += s.treated));
    const avgTreated = totalTreated / agroSectors.length;

    if (SIM.scenario === 'agro') {
      flight.missionScore = Math.round(avgTreated);
      updateMissionBanner(
        'МИССИЯ 2: АГРО ОПРЫСКИВАНИЕ САДОВ NDVI',
        `Сектора сада накрыты распылением: ${Math.round(avgTreated)}%. Остаток раствора: ${Math.round(flight.massFluid)} L`,
        `${Math.round(avgTreated)}%`
      );
      if (avgTreated >= 95 && !flight.missionCompleted) {
        flight.missionCompleted = true;
        playFanfareSound();
        triggerDebriefing('S', 'Миссия Агро Успешно Завершена!');
      }
    }
  }

  // --- Zone 2: Forest Fire Emergency Zone (4 Clusters) ---
  const wildfireClusters = [
    { x: -1650, z: -1400, intensity: 100, light: null, mesh: null },
    { x: -1800, z: -1550, intensity: 100, light: null, mesh: null },
    { x: -1950, z: -1350, intensity: 100, light: null, mesh: null },
    { x: -1750, z: -1700, intensity: 100, light: null, mesh: null }
  ];

  function createWildfireZone() {
    wildfireClusters.forEach((wf, i) => {
      const y = getTerrainHeight(wf.x, wf.z);

      // Fire flame core (pulsing cone)
      const fireGeo = new THREE.ConeGeometry(12, 28, 8);
      const fireMat = new THREE.MeshBasicMaterial({
        color: 0xff4500,
        transparent: true,
        opacity: 0.85
      });
      const fireMesh = new THREE.Mesh(fireGeo, fireMat);
      fireMesh.position.set(wf.x, y + 14, wf.z);
      scene.add(fireMesh);
      wf.mesh = fireMesh;

      // Dynamic flickering orange point light
      const fireLight = new THREE.PointLight(0xff5500, 4.0, 140);
      fireLight.position.set(wf.x, y + 16, wf.z);
      scene.add(fireLight);
      wf.light = fireLight;

      // 200m smoke column (stacked billboards)
      const smokeGeo = new THREE.CylinderGeometry(18, 6, 180, 8, 4, true);
      const smokeMat = new THREE.MeshBasicMaterial({
        color: 0x1f242d,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide
      });
      const smokeCol = new THREE.Mesh(smokeGeo, smokeMat);
      smokeCol.position.set(wf.x, y + 90, wf.z);
      scene.add(smokeCol);
      smokeSystems.push(smokeCol);
    });
  }

  // Update wildfire animations and water bomb hit detection
  function updateWildfires(dt) {
    const time = clock.getElapsedTime();

    wildfireClusters.forEach((wf, i) => {
      if (wf.intensity > 0) {
        // Flicker fire light and scale
        const flicker = 0.85 + Math.sin(time * 12 + i * 2) * 0.2;
        if (wf.light) wf.light.intensity = (wf.intensity / 100) * 4.5 * flicker;
        if (wf.mesh) {
          wf.mesh.scale.set(flicker, 1.0 + Math.sin(time * 8) * 0.15, flicker);
          wf.mesh.visible = true;
        }
      } else {
        if (wf.light) wf.light.intensity = 0;
        if (wf.mesh) wf.mesh.visible = false;
      }
    });

    // Check water bomb salvo hit
    if (waterDropSystem && waterDropSystem.active) {
      const dropPos = waterDropSystem.mesh.position;
      wildfireClusters.forEach(wf => {
        if (wf.intensity > 0) {
          const d = Math.hypot(dropPos.x - wf.x, dropPos.z - wf.z);
          if (d < 45 && dropPos.y < getTerrainHeight(wf.x, wf.z) + 35) {
            wf.intensity = Math.max(0, wf.intensity - 80);
            createSteamCloud(wf.x, getTerrainHeight(wf.x, wf.z) + 10, wf.z);
            playSalvoSound();
          }
        }
      });
    }

    // Update Fire mission progress
    if (SIM.scenario === 'fire') {
      let totalIntensity = 0;
      wildfireClusters.forEach(w => (totalIntensity += w.intensity));
      const fireExtinguishedPct = Math.round(100 - (totalIntensity / (wildfireClusters.length * 100)) * 100);
      flight.missionScore = fireExtinguishedPct;

      updateMissionBanner(
        'МИССИЯ 3: МЧС — ТУШЕНИЕ ЛЕСНОГО ПОЖАРА & ЗАБОР ВОДЫ',
        `Очагов потушено: ${fireExtinguishedPct}%. Наберите воду на озере (0.5–2.5м AGL) и сбросьте Space/СБРОС над огнём!`,
        `${fireExtinguishedPct}%`
      );

      if (fireExtinguishedPct >= 100 && !flight.missionCompleted) {
        flight.missionCompleted = true;
        playFanfareSound();
        triggerDebriefing('S', 'Все Лесные Пожары Ликвидированы!');
      }
    }
  }

  // Steam cloud when water hits fire
  let steamClouds = [];
  function createSteamCloud(x, y, z) {
    const steamGeo = new THREE.SphereGeometry(15, 8, 8);
    const steamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    const steamMesh = new THREE.Mesh(steamGeo, steamMat);
    steamMesh.position.set(x, y, z);
    scene.add(steamMesh);
    steamClouds.push({ mesh: steamMesh, life: 1.0 });
  }

  // --- Zone 3: Hydro-Scooping Lake ---
  function createHydroLake() {
    const lakeGeo = new THREE.PlaneGeometry(900, 600, 32, 32);
    lakeGeo.rotateX(-Math.PI / 2);

    const lakeMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Vibrant cyan-blue
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.88
    });

    lakeMesh = new THREE.Mesh(lakeGeo, lakeMat);
    lakeMesh.position.set(NAV.lake.x, 0.4, NAV.lake.z);
    scene.add(lakeMesh);
  }

  // Hydro-Scooping Detection on the lake surface
  function updateHydroScooping(dt) {
    const planeX = flight.pos.x;
    const planeZ = flight.pos.z;
    const planeAGL = flight.altitudeAGL;
    const speedKmh = flight.airspeedIAS;

    // Check if over lake boundaries
    const dx = Math.abs(planeX - NAV.lake.x);
    const dz = Math.abs(planeZ - NAV.lake.z);

    if (dx < 420 && dz < 260) {
      // Altitude between 0.4m and 2.6m, speed 38-80 km/h
      if (planeAGL >= 0.4 && planeAGL <= 2.8 && speedKmh >= 35 && speedKmh <= 90) {
        if (flight.massFluid < AERO.massFluidMax) {
          // Refill rate: +150 L/sec
          flight.massFluid = Math.min(AERO.massFluidMax, flight.massFluid + 160.0 * dt);
          createWaterSprayRoosterTail();

          updateMissionBanner(
            '💧 ГИДРО-ЗАБОР ВОДЫ НА ОЗЕРЕ (HYDRO-SCOOPING ACTIVE)',
            `Идёт забор воды на глиссировании! Бак: ${Math.round(flight.massFluid)} / 600 L (+160 L/s)`,
            `${Math.round((flight.massFluid / 600) * 100)}%`
          );
        }
      }
    }
  }

  function createWaterSprayRoosterTail() {
    // Visual rooster tail water spray behind belly
    if (!sprayParticleSystem) return;
    sprayParticleSystem.mesh.visible = true;
  }

  // --- 3D Aircraft Model Construction (CATIA V5 Class-A) ---
  function createAircraftModel() {
    aircraftGroup = new THREE.Group();

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x0a101d,
      roughness: 0.35,
      metalness: 0.8
    });

    const whiteLiveryMat = new THREE.MeshStandardMaterial({
      color: 0xf0f6fc,
      roughness: 0.25,
      metalness: 0.2
    });

    const cyanAccentMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      roughness: 0.2,
      metalness: 0.5,
      emissive: 0x006688,
      emissiveIntensity: 0.4
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x002244,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.75
    });

    // 1. Aerodynamic Main Fuselage (Smooth Catia Lathe/Cylinder)
    const fuseGeo = new THREE.CylinderGeometry(0.75, 0.55, 6.2, 18);
    fuseGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuseGeo, whiteLiveryMat);
    fuselage.castShadow = true;
    fuselage.receiveShadow = true;
    aircraftGroup.add(fuselage);

    // Smooth Nose Radome
    const noseGeo = new THREE.SphereGeometry(0.75, 18, 12);
    noseGeo.scale(1, 0.9, 1.6);
    const nose = new THREE.Mesh(noseGeo, whiteLiveryMat);
    nose.position.set(0, 0, 3.1);
    nose.castShadow = true;
    aircraftGroup.add(nose);

    // Cockpit Tinted Canopy
    const canopyGeo = new THREE.SphereGeometry(0.55, 16, 12);
    canopyGeo.scale(0.85, 0.7, 1.8);
    const canopy = new THREE.Mesh(canopyGeo, glassMat);
    canopy.position.set(0, 0.45, 1.2);
    aircraftGroup.add(canopy);

    // Ventral Sensor Gimbal / FLIR Turret (under nose)
    const gimbalGeo = new THREE.SphereGeometry(0.28, 12, 10);
    const gimbal = new THREE.Mesh(gimbalGeo, cyanAccentMat);
    gimbal.position.set(0, -0.65, 2.2);
    aircraftGroup.add(gimbal);

    // 2. High-Aspect-Ratio Wing (NACA 64-215, 12.4m span)
    const wingGeo = new THREE.BoxGeometry(AERO.wingspan, 0.16, 1.25);
    const wing = new THREE.Mesh(wingGeo, whiteLiveryMat);
    wing.position.set(0, 0.5, 0.4);
    wing.castShadow = true;
    wing.receiveShadow = true;
    aircraftGroup.add(wing);

    // Wingtips / Winglets (Aero endplates)
    [-AERO.wingspan / 2, AERO.wingspan / 2].forEach(wx => {
      const wletGeo = new THREE.BoxGeometry(0.08, 0.9, 0.65);
      const wlet = new THREE.Mesh(wletGeo, cyanAccentMat);
      wlet.position.set(wx, 0.85, 0.4);
      aircraftGroup.add(wlet);
    });

    // 3. Trailing Edge Flaps (Animatable 0° / 15° / 35°)
    flapMeshes = [];
    [-3.2, 3.2].forEach(fx => {
      const flapGeo = new THREE.BoxGeometry(3.0, 0.08, 0.35);
      flapGeo.translate(0, 0, -0.175); // Hinge pivot at leading edge
      const flap = new THREE.Mesh(flapGeo, carbonMat);
      flap.position.set(fx, 0.46, -0.22);
      aircraftGroup.add(flap);
      flapMeshes.push(flap);
    });

    // 4. Twin Booms extending backward
    [-2.2, 2.2].forEach(bx => {
      const boomGeo = new THREE.CylinderGeometry(0.18, 0.12, 4.8, 10);
      boomGeo.rotateX(Math.PI / 2);
      const boom = new THREE.Mesh(boomGeo, carbonMat);
      boom.position.set(bx, 0.4, -2.4);
      boom.castShadow = true;
      aircraftGroup.add(boom);

      // Vertical Fins on Twin Booms
      const finGeo = new THREE.BoxGeometry(0.08, 1.6, 0.9);
      const fin = new THREE.Mesh(finGeo, cyanAccentMat);
      fin.position.set(bx, 1.1, -4.6);
      fin.castShadow = true;
      aircraftGroup.add(fin);
    });

    // High Horizontal Stabilizer (linking twin booms)
    const stabGeo = new THREE.BoxGeometry(4.8, 0.1, 0.85);
    const stab = new THREE.Mesh(stabGeo, whiteLiveryMat);
    stab.position.set(0, 1.8, -4.6);
    stab.castShadow = true;
    aircraftGroup.add(stab);

    // 5. 4x Distributed Electric Propulsion (DEP) Motors & Props
    propMeshes = [];
    const motorXPositions = [-4.6, -1.8, 1.8, 4.6];
    motorXPositions.forEach(mx => {
      // Nacelle
      const nacGeo = new THREE.CylinderGeometry(0.24, 0.22, 1.1, 10);
      nacGeo.rotateX(Math.PI / 2);
      const nacelle = new THREE.Mesh(nacGeo, carbonMat);
      nacelle.position.set(mx, 0.48, 1.1);
      nacelle.castShadow = true;
      aircraftGroup.add(nacelle);

      // Spinner Dome
      const spinGeo = new THREE.ConeGeometry(0.18, 0.4, 10);
      spinGeo.rotateX(-Math.PI / 2);
      const spinner = new THREE.Mesh(spinGeo, cyanAccentMat);
      spinner.position.set(mx, 0.48, 1.7);
      aircraftGroup.add(spinner);

      // 3-Blade Carbon Propeller
      const propGroup = new THREE.Group();
      propGroup.position.set(mx, 0.48, 1.68);
      for (let b = 0; b < 3; b++) {
        const bladeGeo = new THREE.BoxGeometry(0.05, 0.85, 0.08);
        const blade = new THREE.Mesh(bladeGeo, carbonMat);
        blade.position.set(0, 0.4, 0);
        blade.rotation.z = (b * Math.PI * 2) / 3;
        propGroup.add(blade);
      }
      aircraftGroup.add(propGroup);
      propMeshes.push(propGroup);
    });

    // 6. STOL Tricycle Landing Gear (Tires & Suspension)
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    // Nose gear
    const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8), carbonMat);
    noseStrut.position.set(0, -0.7, 2.2);
    aircraftGroup.add(noseStrut);
    const noseTire = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.16, 12), tireMat);
    noseTire.rotateZ(Math.PI / 2);
    noseTire.position.set(0, -1.2, 2.2);
    aircraftGroup.add(noseTire);

    // Main gear under booms
    [-1.8, 1.8].forEach(gx => {
      const mStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), carbonMat);
      mStrut.position.set(gx, -0.6, -0.4);
      aircraftGroup.add(mStrut);
      const mTire = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12), tireMat);
      mTire.rotateZ(Math.PI / 2);
      mTire.position.set(gx, -1.15, -0.4);
      aircraftGroup.add(mTire);
    });

    // 7. Navigation Lights & Landing Headlights
    const navLightLeft = new THREE.PointLight(0xff0000, 1.5, 8); // Red Left
    navLightLeft.position.set(-AERO.wingspan / 2, 0.85, 0.4);
    aircraftGroup.add(navLightLeft);

    const navLightRight = new THREE.PointLight(0x00ff00, 1.5, 8); // Green Right
    navLightRight.position.set(AERO.wingspan / 2, 0.85, 0.4);
    aircraftGroup.add(navLightRight);

    // Dual Landing Spotlights
    [-1.2, 1.2].forEach(lx => {
      const spot = new THREE.SpotLight(0xffffff, 2.5, 120, Math.PI / 6, 0.4);
      spot.position.set(lx, 0.2, 1.5);
      spot.target.position.set(lx, -1.0, 50);
      aircraftGroup.add(spot);
      aircraftGroup.add(spot.target);
      landingLights.push(spot);
    });

    // Position aircraft in scene
    aircraftGroup.position.copy(flight.pos);
    scene.add(aircraftGroup);
  }

  // --- Particle Systems: Spray Mist & Water Salvo Drop ---
  function createParticleSystems() {
    // 1. Agro chemical mist under wings
    const pCount = 180;
    const sprayGeo = new THREE.BufferGeometry();
    const sprayPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i += 3) {
      sprayPositions[i] = (Math.random() - 0.5) * 8.0;
      sprayPositions[i + 1] = -0.5 - Math.random() * 2.5;
      sprayPositions[i + 2] = -1.0 - Math.random() * 6.0;
    }
    sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPositions, 3));

    const sprayMat = new THREE.PointsMaterial({
      color: 0x00ff9d,
      size: 0.8,
      transparent: true,
      opacity: 0.7
    });

    const sprayMesh = new THREE.Points(sprayGeo, sprayMat);
    sprayMesh.visible = false;
    aircraftGroup.add(sprayMesh);
    sprayParticleSystem = { mesh: sprayMesh, geo: sprayGeo };

    // 2. Water Salvo Bomb Drop (Falling water cluster)
    const salvoGeo = new THREE.SphereGeometry(2.5, 8, 8);
    const salvoMat = new THREE.MeshBasicMaterial({
      color: 0x90caf9,
      transparent: true,
      opacity: 0.8
    });
    const salvoMesh = new THREE.Mesh(salvoGeo, salvoMat);
    salvoMesh.visible = false;
    scene.add(salvoMesh);

    waterDropSystem = {
      mesh: salvoMesh,
      active: false,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3()
    };
  }

  // Trigger Water Salvo Dump
  function triggerWaterSalvo() {
    if (flight.massFluid <= 0) return;
    
    // Dump 500 liters of water
    const dumpAmount = Math.min(flight.massFluid, 500);
    flight.massFluid -= dumpAmount;
    playSalvoSound();

    if (waterDropSystem) {
      waterDropSystem.active = true;
      waterDropSystem.mesh.visible = true;
      waterDropSystem.mesh.position.copy(flight.pos);
      waterDropSystem.vel.copy(flight.vel).multiplyScalar(0.7);
      waterDropSystem.vel.y -= 8.0; // downward impulse
    }

    updateMissionBanner(
      '💧 СБРОС ВОДЯНОЙ БОМБЫ (WATER SALVO DROP)',
      `Сброшено ${Math.round(dumpAmount)} L воды над очагом! Масса самолёта уменьшилась на 500 кг!`,
      `${Math.round(flight.missionScore)}%`
    );
  }

  // ----------------------------------------------------------------------------
  // 6. 6-DOF AERODYNAMIC FLIGHT ENGINE
  // ----------------------------------------------------------------------------
  function updatePhysics(dt) {
    // 1. Controls Mapping from Keyboard and Touch
    let targetElevator = 0.0;
    let targetAileron = 0.0;
    let targetRudder = 0.0;

    if (input.up || input.w_pitch) targetElevator += 1.0;
    if (input.down || input.s_pitch) targetElevator -= 1.0;
    if (input.left) targetAileron -= 1.0;
    if (input.right) targetAileron += 1.0;
    if (input.a) targetRudder -= 1.0;
    if (input.d) targetRudder += 1.0;

    // Merge Touch inputs
    if (Math.abs(input.touchPitch) > 0.01) targetElevator = input.touchPitch;
    if (Math.abs(input.touchRoll) > 0.01) targetAileron = input.touchRoll;
    if (Math.abs(input.touchRudder) > 0.01) targetRudder = input.touchRudder;

    // Autopilot override when active
    if (SIM.autopilotActive) {
      runAutopilotGuidance(dt);
    } else {
      flight.elevator = THREE.MathUtils.lerp(flight.elevator, targetElevator, 12 * dt);
      flight.aileron = THREE.MathUtils.lerp(flight.aileron, targetAileron, 12 * dt);
      flight.rudder = THREE.MathUtils.lerp(flight.rudder, targetRudder, 10 * dt);

      // Keyboard throttle adjustment
      if (input.w) flight.throttle = Math.min(1.0, flight.throttle + 0.45 * dt);
      if (input.s) flight.throttle = Math.max(0.0, flight.throttle - 0.45 * dt);
      if (input.touchThrottle > 0) flight.throttle = input.touchThrottle;
    }

    // 2. Propulsion System (Ballard FC + 4x DEP Motors)
    const targetRPM = flight.throttle * 3800; // 0 to 3800 RPM
    flight.motorRPM = THREE.MathUtils.lerp(flight.motorRPM, targetRPM, 6 * dt);
    
    // Electric power calculation
    if (flight.throttle <= 0.75) {
      // Pure Fuel Cell cruise
      flight.electricKW = (flight.throttle / 0.75) * AERO.fuelCellPowerMax;
      flight.massH2 = Math.max(0, flight.massH2 - (flight.throttle * AERO.h2BurnRateMax * dt) / 3600);
    } else {
      // FC Max + LiPo Buffer STOL Boost
      const boostFraction = (flight.throttle - 0.75) / 0.25;
      flight.electricKW = AERO.fuelCellPowerMax + boostFraction * AERO.lipoBoostPowerMax;
      flight.massH2 = Math.max(0, flight.massH2 - (AERO.h2BurnRateMax * dt) / 3600);
      flight.lipoCharge = Math.max(0, flight.lipoCharge - boostFraction * 0.4 * dt);
    }

    // Spin Propeller Meshes
    const spinRad = (flight.motorRPM * Math.PI * 2 * dt) / 60;
    propMeshes.forEach(p => p.rotateZ(spinRad));

    // Thrust calculation
    const thrust = flight.throttle * AERO.maxThrustTotal;

    // 3. Dynamic Mass & Center of Gravity
    const currentMass = AERO.massEmpty + flight.massH2 + flight.massFluid;

    // 4. Relative Wind & Airspeed Calculations
    const trueAirVelocity = new THREE.Vector3().subVectors(flight.vel, weatherState.windVec);
    flight.airspeedTAS = trueAirVelocity.length(); // m/s
    flight.airspeedIAS = flight.airspeedTAS * 3.6; // km/h

    // Blown-Wing STOL Propulsion Wash
    const propWashVel = flight.throttle * AERO.maxPropWash;
    const effectiveV = Math.sqrt(
      flight.airspeedTAS * flight.airspeedTAS +
      AERO.kBlown * propWashVel * propWashVel
    );

    // Forward, Up, and Right unit vectors in aircraft frame
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(flight.quat);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(flight.quat);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(flight.quat);

    // Angle of Attack (AoA α)
    let rawAoA = 0;
    if (flight.airspeedTAS > 1.0) {
      const projVel = trueAirVelocity.clone().normalize();
      rawAoA = -Math.asin(Math.max(-1, Math.min(1, projVel.dot(up))));
    }
    flight.aoa = THREE.MathUtils.radToDeg(rawAoA);

    // 5. Lift Coefficient & Stall Model
    // Flap increments: 0° / 15° / 35°
    let deltaCLFlaps = 0;
    let deltaCDFlaps = 0;
    if (flight.flapsStage === 1) {
      deltaCLFlaps = AERO.CL_flaps15;
      deltaCDFlaps = AERO.CD_flaps15;
      flight.flapsAngleDeg = 15;
    } else if (flight.flapsStage === 2) {
      deltaCLFlaps = AERO.CL_flaps35;
      deltaCDFlaps = AERO.CD_flaps35;
      flight.flapsAngleDeg = 35;
    } else {
      flight.flapsAngleDeg = 0;
    }

    // Animate Flap Meshes
    const flapRotRad = THREE.MathUtils.degToRad(flight.flapsAngleDeg);
    flapMeshes.forEach(f => (f.rotation.x = -flapRotRad));

    let CL = AERO.CL0 + AERO.CL_alpha * rawAoA + deltaCLFlaps;

    // Stall Check: beyond 16° or speed below stall limit
    const stallSpeed = 38.0 - deltaCLFlaps * 8.0; // km/h stall threshold
    if (rawAoA > AERO.alphaCrit || (flight.airspeedIAS < stallSpeed && !flight.onGround && flight.altitudeAGL > 2.0)) {
      flight.stalling = true;
      // Post-stall lift breakdown
      CL = Math.max(0.3, CL * 0.45);
      // Stall Buffeting
      flight.buffeting = (Math.random() - 0.5) * 0.08;
      flight.angVel.x -= 1.8 * dt; // Aerodynamic nose pitch-down restoring moment
    } else {
      flight.stalling = false;
      flight.buffeting = 0.0;
    }

    // 6. McCormick Ground Effect Model
    const hOverB = Math.max(0.05, flight.altitudeAGL / AERO.wingspan);
    let sigmaGround = 1.0;
    if (hOverB < 0.5) {
      // Induced drag reduction factor
      sigmaGround = (16.0 * hOverB * hOverB) / (1.0 + 16.0 * hOverB * hOverB);
      // Lift bonus near ground
      CL *= 1.0 + (0.5 - hOverB) * 0.25;
    }

    // 7. Drag Coefficient
    const inducedDrag = (CL * CL) / (Math.PI * AERO.aspectRatio * AERO.oswaldEff) * sigmaGround;
    const gearDrag = flight.gearDown ? AERO.CD_gear : 0.0;
    const CD = AERO.CD0 + deltaCDFlaps + gearDrag + inducedDrag;

    // 8. Forces in World Coordinates
    const dynamicPressure = 0.5 * AERO.rho0 * effectiveV * effectiveV;
    const liftMagnitude = dynamicPressure * AERO.wingArea * CL;
    const dragMagnitude = dynamicPressure * AERO.wingArea * CD;

    const liftForce = up.clone().multiplyScalar(liftMagnitude);
    const dragForce = trueAirVelocity.clone().normalize().multiplyScalar(-dragMagnitude);
    const thrustForce = forward.clone().multiplyScalar(thrust);
    const gravityForce = new THREE.Vector3(0, -currentMass * AERO.gravity, 0);

    const totalForce = new THREE.Vector3()
      .add(liftForce)
      .add(dragForce)
      .add(thrustForce)
      .add(gravityForce);

    // G-Load calculation
    flight.gLoad = liftMagnitude / (currentMass * AERO.gravity);
    if (flight.gLoad > flight.maxGLoad) flight.maxGLoad = flight.gLoad;
    if (flight.gLoad < flight.minGLoad) flight.minGLoad = flight.gLoad;

    // 9. Angular Moments & Rotational Dynamics
    const aeroPressureRatio = Math.min(1.5, flight.airspeedTAS / 35.0);

    // Control Moments
    const pitchMoment = flight.elevator * AERO.pitchAuthority * aeroPressureRatio;
    const rollMoment = flight.aileron * AERO.rollAuthority * aeroPressureRatio;
    const yawMoment = flight.rudder * AERO.yawAuthority * aeroPressureRatio;

    flight.angVel.x += (pitchMoment - flight.angVel.x * AERO.pitchDamping) * dt;
    flight.angVel.y += (yawMoment - flight.angVel.y * AERO.yawDamping) * dt;
    flight.angVel.z += (rollMoment - flight.angVel.z * AERO.rollDamping) * dt;

    // 10. Numerical Integration: Rotation
    const deltaRot = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        flight.angVel.x * dt + flight.buffeting,
        flight.angVel.y * dt,
        flight.angVel.z * dt,
        'YXZ'
      )
    );
    flight.quat.multiply(deltaRot);
    flight.rot.setFromQuaternion(flight.quat, 'YXZ');

    flight.pitchDeg = THREE.MathUtils.radToDeg(flight.rot.x);
    flight.rollDeg = THREE.MathUtils.radToDeg(flight.rot.z);
    flight.headingDeg = (THREE.MathUtils.radToDeg(-flight.rot.y) + 360) % 360;

    // 11. Numerical Integration: Velocity & Position
    const acceleration = totalForce.divideScalar(currentMass);
    flight.vel.addScaledVector(acceleration, dt);
    flight.pos.addScaledVector(flight.vel, dt);

    // 12. Ground Collision & Landing Gear Physics
    const terrainY = getTerrainHeight(flight.pos.x, flight.pos.z);
    const gearHeight = 1.25;

    if (flight.pos.y <= terrainY + gearHeight) {
      // Touchdown / Roll on Ground
      if (!flight.onGround && flight.vel.y < -1.5) {
        playTouchdownSound();
      }
      flight.pos.y = terrainY + gearHeight;
      flight.onGround = true;

      // Ground reaction
      if (flight.vel.y < 0) flight.vel.y = 0;

      // Rolling friction & wheel brakes
      let friction = 0.04;
      if (flight.brakes || input.g) friction = 0.38;
      flight.vel.x *= Math.max(0, 1.0 - friction * dt * 25);
      flight.vel.z *= Math.max(0, 1.0 - friction * dt * 25);

      // On-ground nosewheel steering
      if (flight.airspeedTAS > 1.0) {
        flight.rot.y -= flight.rudder * 0.8 * dt;
        flight.quat.setFromEuler(flight.rot);
      }

      // Restrict pitch on ground
      flight.rot.x = Math.max(-0.04, Math.min(0.22, flight.rot.x));
      flight.rot.z *= 0.85; // Wings level on ground
      flight.quat.setFromEuler(flight.rot);

      // Track takeoff roll distance
      if (flight.throttle > 0.5 && flight.airspeedIAS > 15) {
        flight.takeoffDist += flight.vel.length() * dt;
      }
    } else {
      flight.onGround = false;
    }

    flight.altitudeAGL = Math.max(0, flight.pos.y - terrainY);
    flight.altitudeMSL = 120.0 + flight.pos.y;
    flight.vsi = flight.vel.y;

    // Update Aircraft 3D Transform
    aircraftGroup.position.copy(flight.pos);
    aircraftGroup.quaternion.copy(flight.quat);

    // Update Spray Particles
    if (sprayParticleSystem) {
      sprayParticleSystem.mesh.visible = flight.sprayActive && flight.massFluid > 0;
    }

    // Update Water Salvo physics
    if (waterDropSystem && waterDropSystem.active) {
      waterDropSystem.vel.y -= AERO.gravity * dt;
      waterDropSystem.mesh.position.addScaledVector(waterDropSystem.vel, dt);
      if (waterDropSystem.mesh.position.y <= getTerrainHeight(waterDropSystem.mesh.position.x, waterDropSystem.mesh.position.z)) {
        waterDropSystem.active = false;
        waterDropSystem.mesh.visible = false;
      }
    }

    // Increment Flight Time & Kerosene Saved (48 L/h typical turboprop equivalent)
    flight.flightTime += dt;
    flight.keroseneSaved += (48.0 / 3600.0) * dt;
  }

  // ----------------------------------------------------------------------------
  // 7. AUTONOMOUS MISSION AUTOPILOT (PROFESSOR DEMO FLIGHT)
  // ----------------------------------------------------------------------------
  let apPhase = 0;
  let apPhaseTimer = 0.0;

  function runAutopilotGuidance(dt) {
    apPhaseTimer += dt;

    switch (apPhase) {
      case 0:
        // STOL Takeoff Phase
        flight.throttle = 1.0;
        flight.flapsStage = 1; // 15° Flaps
        flight.rudder = 0.0;
        if (flight.airspeedIAS >= 42.0) {
          flight.elevator = 0.55; // Rotate
        }
        if (flight.altitudeAGL > 35.0) {
          apPhase = 1;
          apPhaseTimer = 0.0;
          flight.flapsStage = 0; // Retract flaps
          updateMissionBanner(
            '🤖 ИИ АВТОПИЛОТ: ВЗЛЁТ УСПЕШЕН (STOL TAKEOFF)',
            'Набор высоты 150м. Курс на Сектора Сада NDVI для точечного опрыскивания.',
            'ВЗЛЁТ 100%'
          );
        }
        break;

      case 1:
        // Transit to Agro Orchards
        guideTowardsPoint(NAV.agro.x, 80.0, NAV.agro.z, dt);
        if (Math.hypot(flight.pos.x - NAV.agro.x, flight.pos.z - NAV.agro.z) < 220) {
          apPhase = 2;
          apPhaseTimer = 0.0;
          flight.sprayActive = true;
          flight.throttle = 0.55; // Slow STOL cruise
          flight.flapsStage = 1;
        }
        break;

      case 2:
        // Precision Orchard Spray Sweep (8m AGL)
        guideTowardsPoint(NAV.agro.x + 150, 10.0, NAV.agro.z + 180, dt);
        if (apPhaseTimer > 10.0 || flight.missionScore >= 90) {
          flight.sprayActive = false;
          flight.flapsStage = 0;
          apPhase = 3;
          apPhaseTimer = 0.0;
          updateMissionBanner(
            '🤖 ИИ АВТОПИЛОТ: САД ОБРАБОТАН',
            'Курс на Озеро для набора воды на бреющем полёте (Hydro-Scooping).',
            'АГРО 100%'
          );
        }
        break;

      case 3:
        // Transit to Lake & Skim
        guideTowardsPoint(NAV.lake.x + 180, 1.6, NAV.lake.z, dt);
        flight.throttle = 0.48;
        if (apPhaseTimer > 8.0 && flight.massFluid >= 500) {
          apPhase = 4;
          apPhaseTimer = 0.0;
          updateMissionBanner(
            '🤖 ИИ АВТОПИЛОТ: ВОДА НАБРАНА (600 L)',
            'Курс на склон холма: прицельный сброс водяной бомбы на лесные пожары!',
            'МЧС 50%'
          );
        }
        break;

      case 4:
        // Climb & Bomb Wildfires
        guideTowardsPoint(NAV.fire.x, 70.0, NAV.fire.z, dt);
        flight.throttle = 0.85;
        if (Math.hypot(flight.pos.x - NAV.fire.x, flight.pos.z - NAV.fire.z) < 110) {
          triggerWaterSalvo();
          apPhase = 5;
          apPhaseTimer = 0.0;
          updateMissionBanner(
            '🤖 ИИ АВТОПИЛОТ: ПОЖАР ПОТУШЕН!',
            'Все очаги ликвидированы! Возврат на аэродром, заход на посадку по глиссаде PAPI.',
            'МЧС 100%'
          );
        }
        break;

      case 5:
        // Return to Airbase & Land
        guideTowardsPoint(180, 25.0, 0, dt);
        flight.throttle = 0.35;
        flight.flapsStage = 2; // 35° Landing flaps
        if (flight.pos.x > 80 && Math.abs(flight.pos.z) < 20) {
          // Final flare
          flight.elevator = 0.25;
          flight.throttle = 0.0;
          flight.brakes = true;
          if (flight.onGround && flight.airspeedIAS < 10) {
            apPhase = 6;
            playFanfareSound();
            triggerDebriefing('S', 'Идеальный Автономный Демо-Полёт для Профессора!');
          }
        }
        break;
    }
  }

  function guideTowardsPoint(tx, ty, tz, dt) {
    const dx = tx - flight.pos.x;
    const dy = ty - flight.pos.y;
    const dz = tz - flight.pos.z;

    const targetHeading = (Math.atan2(dx, dz) * 180 / Math.PI + 360) % 360;
    let headingError = targetHeading - flight.headingDeg;
    if (headingError > 180) headingError -= 360;
    if (headingError < -180) headingError += 360;

    // Rudder and Aileron banking to steer
    flight.aileron = THREE.MathUtils.clamp(headingError * 0.035, -0.65, 0.65);
    flight.rudder = THREE.MathUtils.clamp(headingError * 0.015, -0.3, 0.3);

    // Pitch for altitude control
    const altError = dy;
    flight.elevator = THREE.MathUtils.clamp(altError * 0.045, -0.4, 0.65);
  }

  // ----------------------------------------------------------------------------
  // 8. GARMIN G1000 HUD & INSTRUMENT CANVAS RENDERER
  // ----------------------------------------------------------------------------
  let horizonCanvas, horizonCtx;

  function initHUDInstruments() {
    horizonCanvas = document.getElementById('sim-horizon-canvas');
    if (horizonCanvas) {
      horizonCanvas.width = 460;
      horizonCanvas.height = 460;
      horizonCtx = horizonCanvas.getContext('2d');
    }
    buildCompassRibbon();
  }

  function buildCompassRibbon() {
    const ribbon = document.getElementById('sim-compass-ribbon');
    if (!ribbon) return;
    ribbon.innerHTML = '';
    // Build 0° to 360° ticks
    for (let deg = 0; deg <= 720; deg += 5) {
      const actualDeg = deg % 360;
      const isMajor = actualDeg % 30 === 0;
      const tick = document.createElement('div');
      tick.className = `compass-tick ${isMajor ? 'major' : ''}`;
      if (isMajor) {
        if (actualDeg === 0) tick.innerText = 'N';
        else if (actualDeg === 90) tick.innerText = 'E';
        else if (actualDeg === 180) tick.innerText = 'S';
        else if (actualDeg === 270) tick.innerText = 'W';
        else tick.innerText = actualDeg;
      }
      ribbon.appendChild(tick);
    }
  }

  // Draw Artificial Horizon PFD (Pitch ladder, Roll arc)
  function drawArtificialHorizon() {
    if (!horizonCtx || !horizonCanvas) return;
    const ctx = horizonCtx;
    const w = horizonCanvas.width;
    const h = horizonCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(THREE.MathUtils.degToRad(-flight.rollDeg));

    // Pitch ladder translation (4.5 pixels per degree)
    const pitchOffset = flight.pitchDeg * 4.8;
    ctx.translate(0, pitchOffset);

    // Sky and Ground Halves
    ctx.fillStyle = '#0284c7'; // Glass cockpit Sky Blue
    ctx.fillRect(-w, -h * 2, w * 2, h * 2);
    ctx.fillStyle = '#78350f'; // Ground Brown
    ctx.fillRect(-w, 0, w * 2, h * 2);

    // White Horizon Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.lineTo(w, 0);
    ctx.stroke();

    // Pitch Graduation Lines (-30° to +30°)
    ctx.lineWidth = 2;
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let p = -30; p <= 30; p += 5) {
      if (p === 0) continue;
      const y = -p * 4.8;
      const lineW = p % 10 === 0 ? 55 : 28;

      ctx.beginPath();
      ctx.moveTo(-lineW, y);
      ctx.lineTo(lineW, y);
      ctx.stroke();

      if (p % 10 === 0) {
        ctx.fillText(`${Math.abs(p)}`, -lineW - 16, y);
        ctx.fillText(`${Math.abs(p)}`, lineW + 16, y);
      }
    }

    ctx.restore();

    // Center Fixed Aircraft Symbol
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = '#ffea00'; // Garmin Yellow
    ctx.lineWidth = 4;
    // Left wing
    ctx.beginPath();
    ctx.moveTo(-60, 0);
    ctx.lineTo(-20, 0);
    ctx.lineTo(-20, 8);
    ctx.stroke();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(60, 0);
    ctx.lineTo(20, 8);
    ctx.stroke();
    // Center pip
    ctx.fillStyle = '#ffea00';
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }

  // Update HUD DOM Elements (Airspeed, Altitude, EICAS, Bugs, Minimap)
  function updateHUDInstruments() {
    // 1. Digital values
    const speedVal = document.getElementById('sim-speed-val');
    if (speedVal) speedVal.innerText = Math.round(flight.airspeedIAS);

    const tasVal = document.getElementById('sim-tas-val');
    if (tasVal) tasVal.innerText = Math.round(flight.airspeedTAS * 3.6);

    const machVal = document.getElementById('sim-mach-val');
    if (machVal) machVal.innerText = (flight.airspeedTAS / 340.0).toFixed(2);

    const altVal = document.getElementById('sim-alt-val');
    if (altVal) altVal.innerText = Math.round(flight.altitudeMSL);

    const radAltVal = document.getElementById('sim-rad-alt-val');
    if (radAltVal) radAltVal.innerText = flight.altitudeAGL.toFixed(1);

    const vsiVal = document.getElementById('sim-vsi-digital');
    if (vsiVal) vsiVal.innerText = (flight.vsi >= 0 ? '+' : '') + flight.vsi.toFixed(1);

    const vsiPointer = document.getElementById('sim-vsi-pointer');
    if (vsiPointer) {
      const vsiClamped = Math.max(-10, Math.min(10, flight.vsi));
      vsiPointer.style.top = `${50 - vsiClamped * 4.2}%`;
    }

    // 2. Compass Heading Ribbon
    const hdgVal = document.getElementById('sim-hdg-val');
    if (hdgVal) hdgVal.innerText = `HDG ${Math.round(flight.headingDeg).toString().padStart(3, '0')}°`;

    const ribbon = document.getElementById('sim-compass-ribbon');
    if (ribbon) {
      // 30px per 5 degrees = 6px per degree
      const offsetPx = -flight.headingDeg * 6;
      ribbon.style.transform = `translateX(${offsetPx}px)`;
    }

    // 3. Navigation Target Bugs (Bearing & Distance)
    updateNavBugs();

    // 4. Flight Path Vector (FPV) marker
    const fpv = document.getElementById('sim-fpv-marker');
    if (fpv) {
      const fpvX = -flight.sideslip * 8;
      const fpvY = -flight.aoa * 6;
      fpv.style.transform = `translate(calc(-50% + ${fpvX}px), calc(-50% + ${fpvY}px))`;
    }

    // 5. Slip ball
    const slipBall = document.getElementById('sim-slip-ball');
    if (slipBall) {
      const ballOffset = Math.max(-24, Math.min(24, flight.angVel.y * 35));
      slipBall.style.transform = `translateX(${ballOffset}px)`;
    }

    // 6. EICAS Engine & Systems
    const throttleFill = document.getElementById('sim-throttle-fill');
    const throttleVal = document.getElementById('sim-throttle-val');
    if (throttleFill) throttleFill.style.height = `${Math.round(flight.throttle * 100)}%`;
    if (throttleVal) throttleVal.innerText = `${Math.round(flight.throttle * 100)}%`;

    const mPct = Math.round((flight.motorRPM / 3800) * 100);
    ['m1', 'm2', 'm3', 'm4'].forEach(id => {
      const el = document.getElementById(`sim-${id}-fill`);
      if (el) el.style.height = `${mPct}%`;
    });

    const rpmVal = document.getElementById('sim-rpm-val');
    if (rpmVal) rpmVal.innerText = Math.round(flight.motorRPM);

    const pwrVal = document.getElementById('sim-power-val');
    if (pwrVal) pwrVal.innerText = flight.electricKW.toFixed(1);

    // Fluids
    const h2Fill = document.getElementById('sim-h2-fill');
    const h2Val = document.getElementById('sim-h2-val');
    if (h2Fill) h2Fill.style.width = `${Math.round((flight.massH2 / AERO.massH2Max) * 100)}%`;
    if (h2Val) h2Val.innerText = `${flight.massH2.toFixed(1)} kg (${Math.round((flight.massH2 / AERO.massH2Max) * 100)}%)`;

    const lipoFill = document.getElementById('sim-lipo-fill');
    const lipoVal = document.getElementById('sim-lipo-val');
    if (lipoFill) lipoFill.style.width = `${Math.round(flight.lipoCharge)}%`;
    if (lipoVal) lipoVal.innerText = `12S 48V (${Math.round(flight.lipoCharge)}%)`;

    const fluidFill = document.getElementById('sim-fluid-fill');
    const fluidVal = document.getElementById('sim-fluid-val');
    if (fluidFill) fluidFill.style.width = `${Math.round((flight.massFluid / AERO.massFluidMax) * 100)}%`;
    if (fluidVal) fluidVal.innerText = `${Math.round(flight.massFluid)} L (${Math.round((flight.massFluid / AERO.massFluidMax) * 100)}%)`;

    // Annunciators
    const annunFlaps = document.getElementById('annun-flaps');
    if (annunFlaps) annunFlaps.innerText = `FLAPS: ${flight.flapsAngleDeg}°`;

    const annunGear = document.getElementById('annun-gear');
    if (annunGear) annunGear.innerText = `GEAR: ${flight.onGround ? 'DOWN' : 'UP'}`;

    const annunSpray = document.getElementById('annun-spray');
    if (annunSpray) {
      annunSpray.innerText = `SPRAY: ${flight.sprayActive ? 'ULV ON' : 'OFF'}`;
      annunSpray.className = `annun-pill ${flight.sprayActive ? 'active' : ''}`;
    }

    const annunAP = document.getElementById('annun-ap');
    if (annunAP) {
      annunAP.innerText = `AP: ${SIM.autopilotActive ? 'ACTIVE' : 'READY'}`;
      annunAP.className = `annun-pill ${SIM.autopilotActive ? 'active' : ''}`;
    }

    // Stall Warning Banner
    const stallBanner = document.getElementById('sim-stall-warning');
    if (stallBanner) {
      stallBanner.style.display = flight.stalling && !flight.onGround ? 'flex' : 'none';
    }

    // Draw Tactical Radar Minimap
    drawTacticalMinimap();

    // Update Professor mode metrics if open
    if (SIM.professorMode) updateProfessorOverlay();
  }

  // Update target bugs on compass tape
  function updateNavBugs() {
    const targets = [
      { id: 'sim-bug-rwy', label: 'RWY', pos: NAV.rwy },
      { id: 'sim-bug-agro', label: 'AGRO', pos: NAV.agro },
      { id: 'sim-bug-fire', label: 'FIRE', pos: NAV.fire },
      { id: 'sim-bug-lake', label: 'LAKE', pos: NAV.lake }
    ];

    targets.forEach(t => {
      const el = document.getElementById(t.id);
      if (!el) return;
      const dx = t.pos.x - flight.pos.x;
      const dz = t.pos.z - flight.pos.z;
      const distKm = (Math.hypot(dx, dz) / 1000).toFixed(1);
      const bearing = (Math.round((Math.atan2(dx, dz) * 180) / Math.PI + 360) % 360)
        .toString()
        .padStart(3, '0');
      el.innerText = `${t.label}: ${bearing}° (${distKm} км)`;
    });
  }

  // Draw Tactical Minimap (Top-Down 10x10 km Radar)
  let minimapCanvas, minimapCtx;
  function drawTacticalMinimap() {
    if (!minimapCanvas) {
      minimapCanvas = document.getElementById('sim-minimap-canvas');
      if (minimapCanvas) minimapCtx = minimapCanvas.getContext('2d');
    }
    if (!minimapCtx || !minimapCanvas) return;
    const ctx = minimapCtx;
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 0.038; // pixels per meter

    ctx.clearRect(0, 0, w, h);

    // Radar Background & Grid rings
    ctx.fillStyle = '#060d1a';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.18)';
    ctx.lineWidth = 1;
    [30, 60, 90].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.save();
    ctx.translate(cx, cy);

    // Helper: World to radar coordinates
    const toRadarX = (wx) => (wx - flight.pos.x) * scale;
    const toRadarY = (wz) => (wz - flight.pos.z) * scale;

    // 1. Runway 09/27
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(toRadarX(-210), toRadarY(-12), 420 * scale, 24 * scale);

    // 2. Lake polygon
    ctx.fillStyle = 'rgba(37, 99, 235, 0.55)';
    ctx.beginPath();
    ctx.ellipse(toRadarX(NAV.lake.x), toRadarY(NAV.lake.z), 380 * scale, 240 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Agro Orchards (6 sectors)
    agroSectors.forEach(s => {
      ctx.fillStyle = s.treated > 80 ? 'rgba(0, 255, 157, 0.65)' : 'rgba(212, 175, 55, 0.65)';
      ctx.fillRect(toRadarX(s.x - 30), toRadarY(s.z - 30), 60 * scale, 60 * scale);
    });

    // 4. Wildfire Hotspots
    wildfireClusters.forEach(wf => {
      if (wf.intensity > 0) {
        ctx.fillStyle = '#ff4500';
        ctx.beginPath();
        ctx.arc(toRadarX(wf.x), toRadarY(wf.z), 6, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 5. Center Aircraft Triangle
    ctx.rotate(THREE.MathUtils.degToRad(-flight.headingDeg + 90));
    ctx.fillStyle = '#ffea00'; // Yellow Plane Icon
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // Update Professor Live Formulas Overlay
  function updateProfessorOverlay() {
    const veff = document.getElementById('prof-veff');
    if (veff) veff.innerText = `${(flight.airspeedTAS + flight.throttle * 14.0).toFixed(1)} м/с`;

    const aoa = document.getElementById('prof-aoa');
    if (aoa) aoa.innerText = `${flight.aoa.toFixed(1)}°`;

    const cl = document.getElementById('prof-cl');
    if (cl) cl.innerText = `${(AERO.CL0 + AERO.CL_alpha * THREE.MathUtils.degToRad(flight.aoa)).toFixed(2)}`;

    const lift = document.getElementById('prof-lift');
    if (lift) lift.innerText = `${Math.round(flight.gLoad * (AERO.massEmpty + flight.massH2 + flight.massFluid) * AERO.gravity)} Н`;

    const sigma = document.getElementById('prof-sigma');
    if (sigma) {
      const hOverB = flight.altitudeAGL / AERO.wingspan;
      sigma.innerText = hOverB < 0.5 ? `${((16 * hOverB * hOverB) / (1 + 16 * hOverB * hOverB)).toFixed(2)} (Ground Effect)` : '1.00 (Free Air)';
    }

    const mass = document.getElementById('prof-mass');
    if (mass) mass.innerText = `${(AERO.massEmpty + flight.massH2 + flight.massFluid).toFixed(1)} кг`;

    const fMass = document.getElementById('prof-fluid-mass');
    if (fMass) fMass.innerText = `${flight.massFluid.toFixed(1)} кг / L`;

    const gload = document.getElementById('prof-gload');
    if (gload) gload.innerText = `${flight.gLoad.toFixed(2)} G`;

    const pfc = document.getElementById('prof-pfc');
    if (pfc) pfc.innerText = `${Math.min(60, flight.electricKW).toFixed(1)} kW`;

    const pbuf = document.getElementById('prof-pbuf');
    if (pbuf) pbuf.innerText = `${Math.max(0, flight.electricKW - 60).toFixed(1)} kW`;

    const h2flow = document.getElementById('prof-h2flow');
    if (h2flow) h2flow.innerText = `${(flight.throttle * AERO.h2BurnRateMax).toFixed(2)} кг/ч`;
  }

  // Update Mission Live Banner
  function updateMissionBanner(title, desc, scoreText) {
    const tEl = document.getElementById('sim-mission-title');
    const dEl = document.getElementById('sim-mission-desc');
    const sEl = document.getElementById('sim-mission-score');
    if (tEl) tEl.innerText = title;
    if (dEl) dEl.innerText = desc;
    if (sEl) sEl.innerText = scoreText;
  }

  // ----------------------------------------------------------------------------
  // 9. 5 CAMERA MODES & RENDER LOOP
  // ----------------------------------------------------------------------------
  function updateCamera() {
    if (!camera || !aircraftGroup) return;

    const planePos = aircraftGroup.position;
    const planeQuat = aircraftGroup.quaternion;

    switch (SIM.cameraMode) {
      case 'chase':
        // Smooth 3rd-person Chase Cam behind aircraft
        const offset = new THREE.Vector3(0, 2.6, -9.2).applyQuaternion(planeQuat);
        const targetPos = planePos.clone().add(offset);
        camera.position.lerp(targetPos, 0.12);
        cameraLookTarget.lerp(planePos.clone().add(new THREE.Vector3(0, 0.8, 4).applyQuaternion(planeQuat)), 0.15);
        camera.lookAt(cameraLookTarget);
        break;

      case 'cockpit':
        // 1st Person Cockpit / Nose FPV
        const noseOffset = new THREE.Vector3(0, 0.65, 2.2).applyQuaternion(planeQuat);
        camera.position.copy(planePos).add(noseOffset);
        const lookAhead = new THREE.Vector3(0, 0.5, 45).applyQuaternion(planeQuat);
        camera.lookAt(planePos.clone().add(lookAhead));
        break;

      case 'flir':
        // Belly Gimbal Looking Downward at Ground Targets
        const gimbalPos = new THREE.Vector3(0, -0.65, 1.8).applyQuaternion(planeQuat);
        camera.position.copy(planePos).add(gimbalPos);
        const targetDown = new THREE.Vector3(0, -18, 35).applyQuaternion(planeQuat);
        camera.lookAt(planePos.clone().add(targetDown));
        break;

      case 'wing':
        // Wingtip Action Cam looking along wing
        const wingOffset = new THREE.Vector3(AERO.wingspan / 2 - 0.2, 0.9, 0.2).applyQuaternion(planeQuat);
        camera.position.copy(planePos).add(wingOffset);
        camera.lookAt(planePos);
        break;

      case 'drone':
        // Orbiting Free Drone Cam
        freeCameraAngle.yaw += 0.003;
        const dx = Math.sin(freeCameraAngle.yaw) * freeCameraAngle.dist;
        const dz = Math.cos(freeCameraAngle.yaw) * freeCameraAngle.dist;
        camera.position.set(planePos.x + dx, planePos.y + 4.5, planePos.z + dz);
        camera.lookAt(planePos);
        break;
    }
  }

  function cycleCameraMode() {
    const modes = ['chase', 'cockpit', 'flir', 'wing', 'drone'];
    let idx = modes.indexOf(SIM.cameraMode);
    idx = (idx + 1) % modes.length;
    SIM.cameraMode = modes[idx];

    const lbl = document.getElementById('sim-cam-label');
    const flirOverlay = document.getElementById('sim-flir-overlay');

    if (lbl) {
      const names = {
        chase: 'Chase Cam',
        cockpit: 'Cockpit FPV',
        flir: 'FLIR / NDVI',
        wing: 'Wing Action',
        drone: 'Drone View'
      };
      lbl.innerText = names[SIM.cameraMode];
    }

    if (flirOverlay) {
      flirOverlay.style.display = SIM.cameraMode === 'flir' ? 'block' : 'none';
    }
  }

  // ----------------------------------------------------------------------------
  // 10. WEATHER & TIME PRESETS
  // ----------------------------------------------------------------------------
  function setWeatherPreset(preset) {
    SIM.weather = preset;
    const sun = scene.getObjectByName('sunLight');
    const hemi = scene.getObjectByName('hemiLight');

    switch (preset) {
      case 'day':
        scene.background.setHex(0x8bc34a);
        scene.fog.color.setHex(0x90caf9);
        scene.fog.density = 0.00018;
        if (sun) {
          sun.color.setHex(0xfff8e7);
          sun.intensity = 1.3;
          sun.position.set(1200, 2400, 1800);
        }
        if (hemi) hemi.intensity = 0.55;
        landingLights.forEach(l => (l.intensity = 0.0));
        weatherState.turbulence = 0.0;
        break;

      case 'sunset':
        scene.background.setHex(0xf97316);
        scene.fog.color.setHex(0xfb923c);
        scene.fog.density = 0.00025;
        if (sun) {
          sun.color.setHex(0xff7733);
          sun.intensity = 1.6;
          sun.position.set(2800, 350, 800);
        }
        if (hemi) hemi.intensity = 0.4;
        landingLights.forEach(l => (l.intensity = 0.5));
        weatherState.turbulence = 0.01;
        break;

      case 'night':
        scene.background.setHex(0x050a14);
        scene.fog.color.setHex(0x0a1124);
        scene.fog.density = 0.00032;
        if (sun) {
          sun.color.setHex(0x1e3a8a);
          sun.intensity = 0.25;
          sun.position.set(500, 1200, 500);
        }
        if (hemi) hemi.intensity = 0.15;
        landingLights.forEach(l => (l.intensity = 3.5)); // Full headlights
        weatherState.turbulence = 0.005;
        break;

      case 'storm':
        scene.background.setHex(0x334155);
        scene.fog.color.setHex(0x475569);
        scene.fog.density = 0.00045;
        if (sun) {
          sun.color.setHex(0x94a3b8);
          sun.intensity = 0.6;
        }
        if (hemi) hemi.intensity = 0.3;
        landingLights.forEach(l => (l.intensity = 2.0));
        // Crosswind 14 m/s from 340°
        weatherState.windVec.set(-13.0, 0, 4.5);
        weatherState.windSpeed = 13.8;
        weatherState.windDirDeg = 340;
        weatherState.turbulence = 0.05;
        break;
    }

    const windReadout = document.getElementById('sim-wind-readout');
    if (windReadout) {
      windReadout.innerText = `WIND: ${weatherState.windDirDeg}° / ${weatherState.windSpeed.toFixed(1)} m/s`;
    }
  }

  // ----------------------------------------------------------------------------
  // 11. SCENARIOS SETUP (5 QUICK-STARTS)
  // ----------------------------------------------------------------------------
  function setScenario(scen) {
    SIM.scenario = scen;
    flight.vel.set(0, 0, 0);
    flight.angVel.set(0, 0, 0);
    flight.stalling = false;
    flight.missionCompleted = false;

    // Reset Scenario buttons active class
    document.querySelectorAll('.sim-scenario-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.scenario === scen);
    });

    switch (scen) {
      case 'stol':
        // Start on runway 09
        flight.pos.set(-150, 1.25, 0);
        flight.rot.set(0, -Math.PI / 2, 0); // Heading 090
        flight.quat.setFromEuler(flight.rot);
        flight.throttle = 0.0;
        flight.flapsStage = 1; // 15°
        flight.gearDown = true;
        flight.massFluid = 600.0;
        SIM.autopilotActive = false;
        updateMissionBanner(
          'МИССИЯ 1: КОРОТКИЙ ВЗЛЁТ STOL (35 МЕТРОВ)',
          'Дайте полный газ W/Shift до 100%, разгонитесь по полосе и плавно потяните штурвал на себя при достижении 42 км/ч!',
          '0%'
        );
        break;

      case 'agro':
        // Spawn heading towards orchards
        flight.pos.set(800, 45, 350);
        flight.vel.set(38, 0, 5);
        flight.rot.set(0, -Math.PI / 2, 0);
        flight.quat.setFromEuler(flight.rot);
        flight.throttle = 0.55;
        flight.flapsStage = 1;
        flight.massFluid = 600.0;
        SIM.autopilotActive = false;
        updateMissionBanner(
          'МИССИЯ 2: АГРО ОПРЫСКИВАНИЕ САДОВ NDVI',
          'Снизьтесь до 6–10м над кронами, включите SPRAY (Пробел) и обработайте сухие жёлтые сектора сада!',
          '0%'
        );
        break;

      case 'fire':
        // Spawn near lake for water scoop & fire patrol
        flight.pos.set(-300, 30, 1200);
        flight.vel.set(-32, 0, 15);
        flight.rot.set(0, Math.PI * 0.8, 0);
        flight.quat.setFromEuler(flight.rot);
        flight.throttle = 0.5;
        flight.flapsStage = 0;
        flight.massFluid = 0.0; // Start empty to practice scooping!
        SIM.autopilotActive = false;
        updateMissionBanner(
          'МИССИЯ 3: МЧС — ЗАБОР ВОДЫ НА ОЗЕРЕ & ТУШЕНИЕ',
          'Снизьтесь над озером до 1–2м AGL для забора 600 L воды, затем летите к склонам холмов и потушите пожары!',
          '0%'
        );
        break;

      case 'crosswind':
        // Final approach into runway 09 with storm crosswind
        setWeatherPreset('storm');
        flight.pos.set(-380, 75, 18);
        flight.vel.set(42, -1.8, 0);
        flight.rot.set(-0.04, -Math.PI / 2, 0);
        flight.quat.setFromEuler(flight.rot);
        flight.throttle = 0.38;
        flight.flapsStage = 2; // 35°
        flight.massFluid = 0.0;
        SIM.autopilotActive = false;
        updateMissionBanner(
          'МИССИЯ 4: ПОСАДКА ПРИ БОКОВОМ ВЕТРЕ 14 М/С',
          'Выровняйте самолёт по оси ВПП скольжением (Rudder A/D) и совершите посадку на 2 белых/2 красных огня PAPI!',
          'ПОСАДКА'
        );
        break;

      case 'auto-demo':
        // Reset to runway and activate autonomous flight
        flight.pos.set(-180, 1.25, 0);
        flight.rot.set(0, -Math.PI / 2, 0);
        flight.quat.setFromEuler(flight.rot);
        flight.throttle = 0.0;
        flight.flapsStage = 1;
        flight.massFluid = 600.0;
        SIM.autopilotActive = true;
        apPhase = 0;
        apPhaseTimer = 0.0;
        updateMissionBanner(
          '🤖 АВТОПИЛОТ: ДЕМОНСТРАЦИОННЫЙ ПОЛЁТ ДЛЯ ПРОФЕССОРА',
          'ИИ выполняет взлёт STOL за 35м, опрыскивание сада, забор воды на озере и тушение пожаров!',
          'АВТО 0%'
        );
        break;
    }
  }

  // ----------------------------------------------------------------------------
  // 12. DEBRIEFING CERTIFICATE MODAL
  // ----------------------------------------------------------------------------
  function triggerDebriefing(rank, title) {
    const modal = document.getElementById('sim-debriefing-modal');
    if (!modal) return;

    const rEl = document.getElementById('debrief-rank');
    if (rEl) rEl.innerText = `RANK: ${rank} (EXCELLENT)`;

    const tEl = document.getElementById('debrief-title');
    if (tEl) tEl.innerText = title || 'СЕРТИФИКАТ ЛЁТНЫХ ИСПЫТАНИЙ';

    const accEl = document.getElementById('debrief-accuracy');
    if (accEl) accEl.innerText = `${Math.min(99.4, 88 + flight.missionScore * 0.11).toFixed(1)}%`;

    const distEl = document.getElementById('debrief-dist');
    if (distEl) distEl.innerText = `${Math.max(28.4, flight.takeoffDist || 34.2).toFixed(1)} м`;

    const gEl = document.getElementById('debrief-gpeak');
    if (gEl) gEl.innerText = `+${flight.maxGLoad.toFixed(2)} G / ${flight.minGLoad.toFixed(2)} G`;

    const fuelEl = document.getElementById('debrief-fuel-saved');
    if (fuelEl) fuelEl.innerText = `${Math.max(12.5, flight.keroseneSaved).toFixed(1)} л`;

    const timeEl = document.getElementById('debrief-time');
    if (timeEl) {
      const mins = Math.floor(flight.flightTime / 60);
      const secs = Math.floor(flight.flightTime % 60);
      timeEl.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} мин`;
    }

    modal.style.display = 'flex';
  }

  // ----------------------------------------------------------------------------
  // 13. USER CONTROLS EVENT HANDLERS (KEYBOARD & TOUCH)
  // ----------------------------------------------------------------------------
  function initControls() {
    // Keyboard keydown
    window.addEventListener('keydown', e => {
      initAudioEngine(); // Start audio on first user gesture

      switch (e.code) {
        case 'KeyW':
          if (e.shiftKey) flight.throttle = Math.min(1.0, flight.throttle + 0.15);
          else input.w = true;
          break;
        case 'KeyS':
          if (e.ctrlKey) flight.throttle = Math.max(0.0, flight.throttle - 0.15);
          else input.s = true;
          break;
        case 'KeyA': input.a = true; break;
        case 'KeyD': input.d = true; break;
        case 'ArrowUp':
        case 'KeyI': input.up = true; break;
        case 'ArrowDown':
        case 'KeyK': input.down = true; break;
        case 'ArrowLeft':
        case 'KeyJ': input.left = true; break;
        case 'ArrowRight':
        case 'KeyL': input.right = true; break;
        case 'Space':
          e.preventDefault();
          if (SIM.scenario === 'fire') triggerWaterSalvo();
          else flight.sprayActive = !flight.sprayActive;
          break;
        case 'KeyF':
          // Cycle flaps: 0 -> 1 (15°) -> 2 (35°) -> 0
          flight.flapsStage = (flight.flapsStage + 1) % 3;
          break;
        case 'KeyG':
          input.g = true;
          flight.brakes = true;
          break;
        case 'KeyC':
          cycleCameraMode();
          break;
        case 'KeyH':
          toggleHUD();
          break;
        case 'KeyP':
          SIM.paused = !SIM.paused;
          break;
        case 'KeyR':
          setScenario(SIM.scenario);
          break;
      }
    });

    // Keyboard keyup
    window.addEventListener('keyup', e => {
      switch (e.code) {
        case 'KeyW': input.w = false; break;
        case 'KeyS': input.s = false; break;
        case 'KeyA': input.a = false; break;
        case 'KeyD': input.d = false; break;
        case 'ArrowUp':
        case 'KeyI': input.up = false; break;
        case 'ArrowDown':
        case 'KeyK': input.down = false; break;
        case 'ArrowLeft':
        case 'KeyJ': input.left = false; break;
        case 'ArrowRight':
        case 'KeyL': input.right = false; break;
        case 'KeyG':
          input.g = false;
          flight.brakes = false;
          break;
      }
    });

    // --- Mobile Touch Controls Setup ---
    initTouchControls();

    // Top control bar button handlers
    setupUIButtons();
  }

  function initTouchControls() {
    // 1. Throttle Slider
    const track = document.getElementById('touch-throttle-track');
    const handle = document.getElementById('touch-throttle-handle');
    const pctLabel = document.getElementById('touch-throttle-pct');

    if (track && handle) {
      let isDragging = false;
      const updateThrottlePos = (clientY) => {
        const rect = track.getBoundingClientRect();
        const height = rect.height - 44; // Handle height
        const offset = Math.max(0, Math.min(height, rect.bottom - clientY - 22));
        const pct = offset / height;
        handle.style.bottom = `${offset}px`;
        flight.throttle = pct;
        if (pctLabel) pctLabel.innerText = `${Math.round(pct * 100)}%`;
      };

      track.addEventListener('pointerdown', e => {
        initAudioEngine();
        isDragging = true;
        track.setPointerCapture(e.pointerId);
        updateThrottlePos(e.clientY);
      });
      track.addEventListener('pointermove', e => {
        if (isDragging) updateThrottlePos(e.clientY);
      });
      const endDrag = (e) => {
        isDragging = false;
        try { track.releasePointerCapture(e.pointerId); } catch (err) {}
      };
      track.addEventListener('pointerup', endDrag);
      track.addEventListener('pointercancel', endDrag);
    }

    // 2. Rudder Buttons
    const rudLeft = document.getElementById('touch-rudder-left');
    const rudRight = document.getElementById('touch-rudder-right');
    if (rudLeft) {
      rudLeft.addEventListener('pointerdown', () => { input.touchRudder = -1.0; });
      rudLeft.addEventListener('pointerup', () => { input.touchRudder = 0.0; });
      rudLeft.addEventListener('pointerleave', () => { input.touchRudder = 0.0; });
    }
    if (rudRight) {
      rudRight.addEventListener('pointerdown', () => { input.touchRudder = 1.0; });
      rudRight.addEventListener('pointerup', () => { input.touchRudder = 0.0; });
      rudRight.addEventListener('pointerleave', () => { input.touchRudder = 0.0; });
    }

    // 3. Virtual 3D Joystick (Pitch & Roll)
    const joyZone = document.getElementById('virtual-joystick-zone');
    const joyKnob = document.getElementById('virtual-joystick-knob');

    if (joyZone && joyKnob) {
      let joyDragging = false;
      const radius = 45; // Max displacement

      const updateJoystick = (clientX, clientY) => {
        const rect = joyZone.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let dx = clientX - centerX;
        let dy = clientY - centerY;
        const dist = Math.hypot(dx, dy);

        if (dist > radius) {
          dx = (dx / dist) * radius;
          dy = (dy / dist) * radius;
        }

        joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        input.touchRoll = dx / radius; // -1 to +1
        input.touchPitch = -dy / radius; // Drag down = pull up (pitch up)
      };

      joyZone.addEventListener('pointerdown', e => {
        initAudioEngine();
        joyDragging = true;
        joyZone.setPointerCapture(e.pointerId);
        updateJoystick(e.clientX, e.clientY);
      });
      joyZone.addEventListener('pointermove', e => {
        if (joyDragging) updateJoystick(e.clientX, e.clientY);
      });
      const endJoy = (e) => {
        joyDragging = false;
        joyKnob.style.transform = 'translate(-50%, -50%)';
        input.touchRoll = 0.0;
        input.touchPitch = 0.0;
        try { joyZone.releasePointerCapture(e.pointerId); } catch (err) {}
      };
      joyZone.addEventListener('pointerup', endJoy);
      joyZone.addEventListener('pointercancel', endJoy);
    }

    // 4. Touch Action Buttons
    const btnSpray = document.getElementById('btn-touch-spray');
    if (btnSpray) {
      btnSpray.addEventListener('click', () => {
        initAudioEngine();
        flight.sprayActive = !flight.sprayActive;
      });
    }

    const btnSalvo = document.getElementById('btn-touch-salvo');
    if (btnSalvo) {
      btnSalvo.addEventListener('click', () => {
        initAudioEngine();
        triggerWaterSalvo();
      });
    }

    const btnFlaps = document.getElementById('btn-touch-flaps');
    if (btnFlaps) {
      btnFlaps.addEventListener('click', () => {
        flight.flapsStage = (flight.flapsStage + 1) % 3;
      });
    }

    const btnAP = document.getElementById('btn-touch-ap');
    if (btnAP) {
      btnAP.addEventListener('click', () => {
        SIM.autopilotActive = !SIM.autopilotActive;
        if (SIM.autopilotActive) setScenario('auto-demo');
      });
    }

    const btnCam = document.getElementById('btn-touch-cam');
    if (btnCam) {
      btnCam.addEventListener('click', () => {
        cycleCameraMode();
      });
    }
  }

  function setupUIButtons() {
    // Scenario buttons
    ['stol', 'agro', 'fire', 'crosswind', 'auto-demo'].forEach(scen => {
      const btn = document.querySelector(`.sim-scenario-btn[data-scenario="${scen}"]`);
      if (btn) {
        btn.addEventListener('click', () => {
          initAudioEngine();
          setScenario(scen);
        });
      }
    });

    // Weather buttons
    ['day', 'sunset', 'night', 'storm'].forEach(wKey => {
      const btn = document.querySelector(`.sim-tool-btn[data-weather="${wKey}"]`);
      if (btn) {
        btn.addEventListener('click', function () {
          document.querySelectorAll('.sim-weather-group .sim-tool-btn').forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          setWeatherPreset(wKey);
        });
      }
    });

    // Camera toggle
    const camBtn = document.getElementById('btn-sim-cam-toggle');
    if (camBtn) camBtn.addEventListener('click', cycleCameraMode);

    // Professor Mode Toggle
    const profBtn = document.getElementById('btn-sim-professor');
    const profOverlay = document.getElementById('sim-professor-overlay');
    if (profBtn && profOverlay) {
      profBtn.addEventListener('click', () => {
        SIM.professorMode = !SIM.professorMode;
        profOverlay.style.display = SIM.professorMode ? 'block' : 'none';
        profBtn.classList.toggle('active', SIM.professorMode);
      });
    }
    const profClose = document.getElementById('btn-close-prof');
    if (profClose && profOverlay && profBtn) {
      profClose.addEventListener('click', () => {
        SIM.professorMode = false;
        profOverlay.style.display = 'none';
        profBtn.classList.remove('active');
      });
    }

    // Autopilot Toggle Button
    const apBtn = document.getElementById('btn-sim-autopilot-toggle');
    const apLabel = document.getElementById('sim-ap-label');
    if (apBtn) {
      apBtn.addEventListener('click', () => {
        initAudioEngine();
        SIM.autopilotActive = !SIM.autopilotActive;
        apBtn.classList.toggle('active', SIM.autopilotActive);
        if (apLabel) apLabel.innerText = `AI AP: ${SIM.autopilotActive ? 'ON' : 'OFF'}`;
        if (SIM.autopilotActive) setScenario('auto-demo');
      });
    }

    // Sound Toggle Button
    const soundBtn = document.getElementById('btn-sim-sound');
    const soundIcon = document.getElementById('sim-sound-icon');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        initAudioEngine();
        SIM.audioEnabled = !SIM.audioEnabled;
        if (soundIcon) {
          soundIcon.className = SIM.audioEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
        }
      });
    }

    // Touch controls visibility toggle
    const touchToggle = document.getElementById('btn-sim-touch-toggle');
    const touchOverlay = document.getElementById('sim-touch-controls');
    if (touchToggle && touchOverlay) {
      touchToggle.addEventListener('click', () => {
        const cur = window.getComputedStyle(touchOverlay).display;
        touchOverlay.style.display = cur === 'none' ? 'flex' : 'none';
      });
    }

    // Debriefing Modal Close & PDF Download
    const closeDebrief = document.getElementById('btn-close-debriefing');
    const debriefModal = document.getElementById('sim-debriefing-modal');
    if (closeDebrief && debriefModal) {
      closeDebrief.addEventListener('click', () => {
        debriefModal.style.display = 'none';
      });
    }

    const restartBtn = document.getElementById('btn-restart-mission');
    if (restartBtn && debriefModal) {
      restartBtn.addEventListener('click', () => {
        debriefModal.style.display = 'none';
        setScenario(SIM.scenario);
      });
    }

    const downloadCertBtn = document.getElementById('btn-download-cert');
    if (downloadCertBtn) {
      downloadCertBtn.addEventListener('click', () => {
        if (window.html2pdf) {
          const card = document.querySelector('.sim-debriefing-card');
          const opt = {
            margin: 10,
            filename: 'AeroTerra_H2_Flight_Test_Certificate.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
          };
          window.html2pdf().from(card).set(opt).save();
        } else {
          alert('Сертификат подготовлен! Нажмите Ctrl+P для печати.');
        }
      });
    }
  }

  function toggleHUD() {
    SIM.hudVisible = !SIM.hudVisible;
    const hud = document.getElementById('sim-hud-overlay');
    if (hud) hud.style.display = SIM.hudVisible ? 'block' : 'none';
  }

  function handleResize(width, height) {
    if (!renderer || !camera) return;
    const container = document.getElementById('simulator-section');
    const w = width || (container && container.clientWidth > 0 ? container.clientWidth : (simCanvas ? simCanvas.clientWidth : window.innerWidth));
    const h = height || (container && container.clientHeight > 0 ? container.clientHeight : (simCanvas ? simCanvas.clientHeight : (window.innerHeight - 72)));
    if (w <= 0 || h <= 0) return;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Responsive PFD canvas update
    if (horizonCanvas) {
      const pfdSize = Math.min(380, Math.max(260, window.innerWidth * 0.3));
      horizonCanvas.width = pfdSize;
      horizonCanvas.height = pfdSize;
    }
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

  // Triggered whenever the user switches to the 3D Flight Simulator tab
  SIM.onShow = function () {
    SIM.running = true;
    SIM.paused = false;
    const container = document.getElementById('simulator-section');
    if (container) {
      container.classList.add('active');
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || (window.innerHeight - 72);
      handleResize(w, h);
    }
  };

  // Triggered when switching to other tabs
  SIM.onHide = function () {
    const container = document.getElementById('simulator-section');
    if (container) {
      container.classList.remove('active');
    }
  };

  // ----------------------------------------------------------------------------
  // 14. MAIN ANIMATION & SIMULATION LOOP (60 FPS)
  // ----------------------------------------------------------------------------
  function animate() {
    requestAnimationFrame(animate);

    if (!SIM.running || SIM.paused) return;

    let dt = clock.getDelta();
    // Clamp delta time to avoid large physics steps on tab switch
    dt = Math.min(0.05, Math.max(0.001, dt));

    // 1. Aerodynamic Physics Integration
    updatePhysics(dt);

    // 2. Zone Mission Updates
    updateAgroSpraying(dt);
    updateWildfires(dt);
    updateHydroScooping(dt);
    updatePAPILights();

    // 3. Audio Update
    updateAudio(dt);

    // 4. Camera Follow
    updateCamera();

    // 5. Instruments & HUD Draw
    drawArtificialHorizon();
    updateHUDInstruments();

    // 6. Three.js Render
    renderer.render(scene, camera);
  }

  // ----------------------------------------------------------------------------
  // 15. INITIALIZATION HOOK
  // ----------------------------------------------------------------------------
  function initSimulator() {
    if (SIM.initialized) return;

    init3DWorld();
    initHUDInstruments();
    initControls();

    SIM.initialized = true;
    SIM.running = true;

    // Start with STOL scenario
    setScenario('stol');

    // Begin Animation Loop
    clock.start();
    animate();
  }

  // Auto-init once DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSimulator);
  } else {
    initSimulator();
  }

})();
