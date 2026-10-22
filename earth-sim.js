/**
 * ==============================================================================
 * AEROTERRA H2 — GLOBAL 3D EARTH FLIGHT SIMULATOR (CESIUMJS & GOOGLE 3D TILES)
 * ------------------------------------------------------------------------------
 * • CesiumJS (Pinned v1.119.0) + Google Photorealistic 3D Tiles (Asset 2275207)
 * • Cesium Ion Access Token via UI & LocalStorage fallback to World Terrain + OSM
 * • Airport Presets: Tashkent (UTTT), Samarkand (UTSS), Turin (LIMF) & Lat/Lon
 * • OSM Nominatim Geocoding place search & instant Teleport
 * • AeroTerra H2 high-fidelity model on Entity with spinning propellers
 * • 6-DOF Aerodynamic Physics Engine in Local ENU (Blown-wing STOL, H2+LiPo, Stall)
 * • Real-time Terrain AGL sampling (globe.getHeight / sampleTerrainMostDetailed)
 * • Crash detection & auto-restart on runway
 * • Multi-Cam: Chase, Cockpit, Free Camera
 * • Garmin G1000 PFD, Airspeed & Altitude Tapes, EICAS Engine Monitor
 * • Desktop Keyboard & Mobile Touch Controls
 * ==============================================================================
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. AIRPORT PRESETS & CONSTANTS
  // --------------------------------------------------------------------------
  const AIRPORTS = {
    charvak: {
      id: 'charvak',
      name: 'Чарвак & Ташкент (Агро)',
      country: '🇺🇿 Узбекистан',
      lat: 41.6350,
      lon: 70.0350,
      alt: 950,
      heading: 60,
      description: 'Чарвакское водохранилище и предгорные агро-кластеры Узбекистана'
    },
    california: {
      id: 'california',
      name: 'Пожарный полигон (Тахо)',
      country: '🌲 Калифорния / США',
      lat: 39.0968,
      lon: -120.0324,
      alt: 1900,
      heading: 320,
      description: 'Лесной массив и пожарный патрульный полигон вокруг озера Тахо'
    },
    alps: {
      id: 'alps',
      name: 'Сады и Долины (Альпы)',
      country: '🍏 Италия / Франция',
      lat: 45.3200,
      lon: 7.4800,
      alt: 650,
      heading: 340,
      description: 'Фруктовые сады и фермерские долины у подножия Альп'
    },
    orbital: {
      id: 'orbital',
      name: '3D-Планета (Орбита)',
      country: '🌐 Космос',
      lat: 41.0,
      lon: 69.0,
      alt: 12000000,
      heading: 0,
      description: 'Обзор всей 3D-Планеты Земля из космоса в реальном времени'
    },
    // Backwards compatibility alias
    uttt: {
      id: 'charvak',
      name: 'Чарвак & Ташкент',
      country: '🇺🇿',
      lat: 41.6350,
      lon: 70.0350,
      alt: 950,
      heading: 60
    }
  };

  // --------------------------------------------------------------------------
  // 2. AIRCRAFT PHYSICAL SPECS (AeroTerra H2 STOL Twin-Boom)
  // --------------------------------------------------------------------------
  const AERO_SPECS = {
    massEmpty: 1250,       // kg
    massH2: 28.5,          // kg
    massBuffer: 65,        // kg (LiPo 12S buffer)
    massFluid: 600,        // kg (water / spray)
    wingSpan: 9.6,         // m
    wingArea: 11.52,       // m²
    chordMean: 1.2,        // m
    aspectRatio: 8.0,
    oswaldE: 0.85,
    maxPowerKW: 128,       // 4x 32 kW DEP motors
    maxThrustN: 7200,      // Total peak static thrust
    maxRPM: 2600,
    cl0: 0.45,
    clAlpha: 5.2,          // per radian
    clFlapsMax: 0.95,      // Additional CL at 30° flaps
    cd0: 0.024,
    cdFlaps30: 0.038,
    cdGear: 0.012,
    alphaStallClean: 15.0, // degrees
    alphaStallFlaps: 18.5, // degrees
    wheelHeight: 1.25,     // m (ground reference offset)
  };

  // --------------------------------------------------------------------------
  // 3. SOUND SYNTHESIZER (Web Audio API)
  // --------------------------------------------------------------------------
  class SimAudio {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.oscMotors = [];
      this.motorGains = [];
      this.windGain = null;
      this.noiseNode = null;
      this.stallOsc = null;
      this.stallGain = null;
      this.initialized = false;
    }

    init() {
      if (this.initialized) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master Compressor
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.knee.value = 8;
      comp.ratio.value = 4;
      comp.attack.value = 0.005;
      comp.release.value = 0.1;
      comp.connect(this.ctx.destination);

      // 4 Motors Synthesizer (Electric turbine whine + prop beating)
      const freqs = [110, 114, 112, 116];
      for (let i = 0; i < 4; i++) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freqs[i];

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 450;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.0;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(comp);
        osc.start();

        this.oscMotors.push(osc);
        this.motorGains.push(gain);
      }

      // Aerodynamic Wind Noise (White Noise + Bandpass Filter)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 350;
      windFilter.Q.value = 1.2;

      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.0;

      whiteNoise.connect(windFilter);
      windFilter.connect(this.windGain);
      this.windGain.connect(comp);
      whiteNoise.start();

      // Stall Horn (Pulsed 800 Hz)
      this.stallOsc = this.ctx.createOscillator();
      this.stallOsc.type = 'square';
      this.stallOsc.frequency.value = 800;

      this.stallGain = this.ctx.createGain();
      this.stallGain.gain.value = 0.0;

      this.stallOsc.connect(this.stallGain);
      this.stallGain.connect(comp);
      this.stallOsc.start();

      this.initialized = true;
    }

    update(rpm, speedKmh, isStall) {
      if (!this.enabled || !this.initialized || !this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const normRpm = Math.min(1.0, Math.max(0.0, rpm / AERO_SPECS.maxRPM));
      const baseFreq = 80 + normRpm * 360;

      for (let i = 0; i < 4; i++) {
        const detune = (i - 1.5) * 3.5;
        this.oscMotors[i].frequency.setTargetAtTime(baseFreq + detune, this.ctx.currentTime, 0.05);
        this.motorGains[i].gain.setTargetAtTime(normRpm * 0.08, this.ctx.currentTime, 0.05);
      }

      const normSpeed = Math.min(1.0, speedKmh / 220);
      this.windGain.gain.setTargetAtTime(normSpeed * 0.12, this.ctx.currentTime, 0.08);

      if (isStall) {
        const pulse = Math.sin(Date.now() * 0.015) > 0 ? 0.25 : 0.0;
        this.stallGain.gain.setTargetAtTime(pulse, this.ctx.currentTime, 0.02);
      } else {
        this.stallGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.03);
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      if (!this.enabled && this.initialized) {
        this.motorGains.forEach(g => g.gain.setValueAtTime(0, this.ctx.currentTime));
        if (this.windGain) this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);
        if (this.stallGain) this.stallGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      return this.enabled;
    }
  }

  // --------------------------------------------------------------------------
  // 4. MAIN EARTH FLIGHT SIMULATOR CLASS
  // --------------------------------------------------------------------------
  class AeroTerraEarthSim {
    constructor() {
      this.viewer = null;
      this.tileset = null;
      this.aircraftEntity = null;
      this.audio = new SimAudio();

      this.currentAirport = AIRPORTS.charvak || AIRPORTS.uttt;
      this.refOrigin = {
        lat: this.currentAirport.lat,
        lon: this.currentAirport.lon,
        alt: this.currentAirport.alt,
      };

      // 6-DOF Physical State (Local ENU meters & Euler angles)
      this.state = {
        x: 0,              // East (m)
        y: 0,              // North (m)
        z: AERO_SPECS.wheelHeight, // Up (m above airport datum)
        vx: 0,             // East velocity (m/s)
        vy: 0,             // North velocity (m/s)
        vz: 0,             // Vertical speed (m/s)
        speedKmh: 0,       // IAS
        tasKmh: 0,
        pitch: 0,          // deg (-90 to +90)
        roll: 0,           // deg (-180 to +180)
        heading: this.currentAirport.heading, // deg (0 to 360)
        p: 0,              // roll rate (rad/s)
        q: 0,              // pitch rate (rad/s)
        r: 0,              // yaw rate (rad/s)
        throttle: 0.0,     // 0..1
        flaps: 0,          // 0, 15, 30
        gear: true,
        rpm: 0,
        powerKW: 0,
        h2Kg: AERO_SPECS.massH2,
        lipoPct: 95,
        fluidKg: AERO_SPECS.massFluid,
        terrainElev: this.currentAirport.alt,
        agl: 0,
        onGround: true,
        crashed: false,
        propAngle: 0,
        isStall: false,
      };

      // Controls Input State
      this.inputs = {
        pitchUp: false,
        pitchDown: false,
        rollLeft: false,
        rollRight: false,
        yawLeft: false,
        yawRight: false,
        throttleUp: false,
        throttleDown: false,
        brakes: false,
      };

      // Camera Modes: 'chase', 'cockpit', 'free'
      this.cameraMode = 'chase';
      this.lastTickTime = performance.now();
      this.isRunning = false;
      this.animationFrameId = null;

      // PFD Canvas
      this.horizonCanvas = null;
      this.horizonCtx = null;
      this.pfdWidth = 320;
      this.pfdHeight = 320;

      // DOM Elements Cache
      this.els = {};
    }

    // ------------------------------------------------------------------------
    // INITIALIZATION
    // ------------------------------------------------------------------------
    async init() {
      this.cacheDOMElements();
      this.initPFDCanvas();
      this.setupEventListeners();
      this.setupTouchControls();
      this.setupResizeObserver();

      // Check Cesium Ion Token
      const storedToken = localStorage.getItem('aeroterra_cesium_token');
      if (storedToken) {
        Cesium.Ion.defaultAccessToken = storedToken;
        if (this.els.tokenInput) this.els.tokenInput.value = storedToken;
      }

      // Initialize Cesium Viewer with ALL DEFAULT WIDGETS DISABLED
      try {
        this.viewer = new Cesium.Viewer('cesium-container', {
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          scene3DOnly: true,
          shouldAnimate: true,
        });

        // Atmospheric rendering & daylight (never pitch black!)
        this.viewer.scene.globe.enableLighting = false;
        this.viewer.scene.highDynamicRange = false;
        this.viewer.scene.globe.depthTestAgainstTerrain = false;
        this.viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#142a4a');

        // Load 3D Tileset or fallback to World Terrain + OSM
        await this.loadTilesetOrFallback();

        // Spawn 3D AeroTerra H2 Model Entity
        this.createAircraftEntity();

        // Teleport to initial airport
        this.teleportToAirport(this.currentAirport.id);

        console.log('✅ AeroTerraEarthSim: Cesium 3D Engine initialized successfully.');
      } catch (err) {
        console.error('❌ AeroTerraEarthSim init error:', err);
        if (this.els.noticeBanner) {
          this.els.noticeBanner.style.display = 'flex';
          this.els.noticeText.textContent = 'Ошибка загрузки 3D сцены: ' + (err.message || err);
        }
      }
    }

    cacheDOMElements() {
      this.els = {
        section: document.getElementById('earth-section'),
        container: document.getElementById('cesium-container'),
        statusChip: document.getElementById('earth-tileset-status'),
        noticeBanner: document.getElementById('earth-notice-banner'),
        noticeText: document.getElementById('earth-notice-text'),
        noticeBtn: document.getElementById('earth-notice-btn'),
        tokenModal: document.getElementById('earth-token-modal'),
        tokenInput: document.getElementById('earth-ion-token-input'),
        btnSaveToken: document.getElementById('btn-save-earth-token'),
        btnClearToken: document.getElementById('btn-clear-earth-token'),
        btnCloseToken: document.getElementById('btn-close-earth-token'),
        btnOpenToken: document.getElementById('btn-earth-token-open'),
        btnTeleport: document.getElementById('btn-earth-teleport'),
        searchInput: document.getElementById('earth-search-input'),
        btnSearch: document.getElementById('btn-earth-search'),
        latInput: document.getElementById('earth-custom-lat'),
        lonInput: document.getElementById('earth-custom-lon'),
        btnCamToggle: document.getElementById('btn-earth-cam-toggle'),
        camLabel: document.getElementById('earth-cam-label'),
        btnSound: document.getElementById('btn-earth-sound'),
        soundIcon: document.getElementById('earth-sound-icon'),
        btnTouchToggle: document.getElementById('btn-earth-touch-toggle'),
        touchControls: document.getElementById('earth-touch-controls'),
        // HUD / PFD
        hudOverlay: document.getElementById('earth-hud-overlay'),
        compassRibbon: document.getElementById('earth-compass-ribbon'),
        hdgVal: document.getElementById('earth-hdg-val'),
        speedLadder: document.getElementById('earth-speed-ladder'),
        speedVal: document.getElementById('earth-speed-val'),
        speedTrend: document.getElementById('earth-speed-trend'),
        tasVal: document.getElementById('earth-tas-val'),
        altLadder: document.getElementById('earth-alt-ladder'),
        altVal: document.getElementById('earth-alt-val'),
        vsiPointer: document.getElementById('earth-vsi-pointer'),
        vsiDigital: document.getElementById('earth-vsi-digital'),
        radAltVal: document.getElementById('earth-rad-alt-val'),
        throttleFill: document.getElementById('earth-throttle-fill'),
        throttleVal: document.getElementById('earth-throttle-val'),
        rpmVal: document.getElementById('earth-rpm-val'),
        powerVal: document.getElementById('earth-power-val'),
        m1Fill: document.getElementById('earth-m1-fill'),
        m2Fill: document.getElementById('earth-m2-fill'),
        m3Fill: document.getElementById('earth-m3-fill'),
        m4Fill: document.getElementById('earth-m4-fill'),
        h2Fill: document.getElementById('earth-h2-fill'),
        h2Val: document.getElementById('earth-h2-val'),
        lipoFill: document.getElementById('earth-lipo-fill'),
        lipoVal: document.getElementById('earth-lipo-val'),
        annunFlaps: document.getElementById('earth-annun-flaps'),
        annunGear: document.getElementById('earth-annun-gear'),
        annunLoc: document.getElementById('earth-annun-loc'),
        fpvMarker: document.getElementById('earth-fpv-marker'),
        slipBall: document.getElementById('earth-slip-ball'),
        stallWarning: document.getElementById('earth-stall-warning'),
        crashWarning: document.getElementById('earth-crash-warning'),
      };
    }

    // ------------------------------------------------------------------------
    // TILESET & TERRAIN LOADER (Esri World Imagery + Optional Google 3D Tiles)
    // ------------------------------------------------------------------------
    async loadTilesetOrFallback() {
      // 1. High-resolution Esri World Imagery (free, open, no API key required, global daylight coverage)
      try {
        this.viewer.imageryLayers.removeAll();
        const esriProvider = new Cesium.UrlTemplateImageryProvider({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          maximumLevel: 19,
          credit: 'Esri World Imagery'
        });
        this.viewer.imageryLayers.addImageryProvider(esriProvider);
        this.viewer.scene.terrainProvider = new Cesium.EllipsoidTerrainProvider();

        if (this.els.statusChip) {
          this.els.statusChip.textContent = 'ESRI WORLD IMAGERY · HIGH RES 3D SATELLITE';
        }
      } catch (imageryErr) {
        console.warn('Esri imagery setup note:', imageryErr);
      }

      // 2. Optional: If user specified Cesium Ion Token, attempt Google Photorealistic 3D Tiles overlay
      const hasToken = !!Cesium.Ion.defaultAccessToken && Cesium.Ion.defaultAccessToken.length > 20;
      if (hasToken) {
        try {
          let googleTileset;
          if (typeof Cesium.createGooglePhotorealistic3DTileset === 'function') {
            googleTileset = await Cesium.createGooglePhotorealistic3DTileset();
          } else {
            googleTileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207);
          }
          if (this.tileset) this.viewer.scene.primitives.remove(this.tileset);
          this.tileset = this.viewer.scene.primitives.add(googleTileset);
          if (this.els.statusChip) {
            this.els.statusChip.textContent = 'GOOGLE 3D TILES · ASSET 2275207';
          }
        } catch (err) {
          console.warn('Google 3D Tiles asset note, maintaining Esri World Imagery:', err);
        }
      }
    }

    // ------------------------------------------------------------------------
    // AIRCRAFT 3D MODEL (Cesium Entity Assembly)
    // ------------------------------------------------------------------------
    createAircraftEntity() {
      // Sleek composite representation of AeroTerra H2 STOL Twin-Boom
      // Fuselage length: 6.2m, Wingspan: 9.6m, High wing, twin tail booms
      const originCartesian = Cesium.Cartesian3.fromDegrees(
        this.refOrigin.lon,
        this.refOrigin.lat,
        this.refOrigin.alt + this.state.z
      );

      this.aircraftEntity = this.viewer.entities.add({
        name: 'AeroTerra H2 Eco-Aircraft',
        position: originCartesian,
        orientation: Cesium.Quaternion.IDENTITY,

        // Main Fuselage (Streamlined Carbon Oval)
        cylinder: {
          length: 6.2,
          topRadius: 0.15,
          bottomRadius: 0.52,
          material: new Cesium.Color(0.08, 0.15, 0.22, 0.95), // Deep navy carbon
        },
      });

      // Child visual components (Wings, Booms, Stabilizer, Props)
      this.wingEntity = this.viewer.entities.add({
        parent: this.aircraftEntity,
        position: new Cesium.Cartesian3(0, 0, 0.45),
        box: {
          dimensions: new Cesium.Cartesian3(AERO_SPECS.wingSpan, AERO_SPECS.chordMean, 0.14),
          material: new Cesium.Color(0.88, 0.94, 0.98, 0.98), // Aero white
        },
      });

      // Wingtips / Winglets (Cyan Aero accents)
      this.wingletLeft = this.viewer.entities.add({
        parent: this.wingEntity,
        position: new Cesium.Cartesian3(-AERO_SPECS.wingSpan / 2, 0, 0.35),
        box: {
          dimensions: new Cesium.Cartesian3(0.08, 0.8, 0.7),
          material: new Cesium.Color(0.0, 0.85, 0.95, 1.0), // Accent Cyan
        },
      });

      this.wingletRight = this.viewer.entities.add({
        parent: this.wingEntity,
        position: new Cesium.Cartesian3(AERO_SPECS.wingSpan / 2, 0, 0.35),
        box: {
          dimensions: new Cesium.Cartesian3(0.08, 0.8, 0.7),
          material: new Cesium.Color(0.0, 0.85, 0.95, 1.0),
        },
      });

      // Twin Tail Booms
      this.boomLeft = this.viewer.entities.add({
        parent: this.aircraftEntity,
        position: new Cesium.Cartesian3(-1.45, -2.2, 0.3),
        box: {
          dimensions: new Cesium.Cartesian3(0.16, 4.4, 0.16),
          material: new Cesium.Color(0.12, 0.14, 0.18, 1.0),
        },
      });

      this.boomRight = this.viewer.entities.add({
        parent: this.aircraftEntity,
        position: new Cesium.Cartesian3(1.45, -2.2, 0.3),
        box: {
          dimensions: new Cesium.Cartesian3(0.16, 4.4, 0.16),
          material: new Cesium.Color(0.12, 0.14, 0.18, 1.0),
        },
      });

      // Horizontal Stabilizer
      this.tailPlane = this.viewer.entities.add({
        parent: this.aircraftEntity,
        position: new Cesium.Cartesian3(0, -4.3, 0.75),
        box: {
          dimensions: new Cesium.Cartesian3(3.2, 0.8, 0.1),
          material: new Cesium.Color(0.85, 0.92, 0.98, 1.0),
        },
      });

      // 4 Rotating Propeller Discs (DEP)
      this.propEntities = [];
      const propOffsetsX = [-3.2, -1.1, 1.1, 3.2];
      for (let i = 0; i < 4; i++) {
        const prop = this.viewer.entities.add({
          parent: this.wingEntity,
          position: new Cesium.Cartesian3(propOffsetsX[i], 0.75, -0.05),
          cylinder: {
            length: 0.04,
            topRadius: 0.65,
            bottomRadius: 0.65,
            material: new Cesium.Color(0.0, 0.9, 1.0, 0.45), // Glowing blue rotor disc
          },
        });
        this.propEntities.push(prop);
      }
    }

    // ------------------------------------------------------------------------
    // TELEPORT SYSTEM (Airport presets, Custom Lat/Lon, Geocoding)
    // ------------------------------------------------------------------------
    async teleportToAirport(airportKey) {
      const ap = AIRPORTS[airportKey] || AIRPORTS.charvak || AIRPORTS.uttt;
      this.currentAirport = ap;
      this.refOrigin = { lat: ap.lat, lon: ap.lon, alt: ap.alt };

      // Update UI active button
      document.querySelectorAll('.earth-airport-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.airport === airportKey);
      });

      if (this.els.annunLoc) {
        this.els.annunLoc.textContent = 'LOC: ' + ap.id.toUpperCase();
      }
      if (this.els.latInput) this.els.latInput.value = ap.lat.toFixed(4);
      if (this.els.lonInput) this.els.lonInput.value = ap.lon.toFixed(4);

      if (ap.id === 'orbital') {
        if (this.viewer && this.viewer.camera) {
          this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(ap.lon, ap.lat, 16000000),
            duration: 1.5
          });
        }
        this.resetFlight(0, true);
        return;
      }

      // Query terrain height at coordinates
      await this.sampleTerrainAtOrigin();

      // Reset flight dynamics in air at 80m, 85 km/h, 75% throttle
      this.resetFlight(ap.heading, true);
    }

    async teleportToCoordinates(lat, lon, alt = null) {
      this.refOrigin.lat = parseFloat(lat);
      this.refOrigin.lon = parseFloat(lon);
      this.currentAirport = {
        id: 'custom',
        name: `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`,
        lat: this.refOrigin.lat,
        lon: this.refOrigin.lon,
        alt: alt || 300,
        heading: 90,
      };

      if (this.els.annunLoc) {
        this.els.annunLoc.textContent = 'LOC: CUSTOM';
      }
      document.querySelectorAll('.earth-airport-btn').forEach(btn => btn.classList.remove('active'));

      await this.sampleTerrainAtOrigin();
      this.resetFlight(90, true);
    }

    async sampleTerrainAtOrigin() {
      if (!this.viewer) return;
      try {
        const carto = Cesium.Cartographic.fromDegrees(this.refOrigin.lon, this.refOrigin.lat);
        let sampledElev = this.viewer.scene.globe.getHeight(carto);

        if (sampledElev === undefined || sampledElev === null || isNaN(sampledElev)) {
          // Asynchronously sample terrain
          if (this.viewer.terrainProvider && this.viewer.terrainProvider.availability) {
            const updated = await Cesium.sampleTerrainMostDetailed(this.viewer.terrainProvider, [carto]);
            if (updated && updated[0] && updated[0].height !== undefined) {
              sampledElev = updated[0].height;
            }
          }
        }

        if (sampledElev !== undefined && !isNaN(sampledElev)) {
          this.refOrigin.alt = sampledElev;
          this.state.terrainElev = sampledElev;
        }
      } catch (e) {
        console.warn('Sample terrain exception:', e);
      }
    }

    async geocodeAndTeleport(query) {
      if (!query || !query.trim()) return;
      if (this.els.btnSearch) {
        this.els.btnSearch.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      }

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        const data = await res.json();

        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          await this.teleportToCoordinates(lat, lon);
        } else {
          alert('Местоположение не найдено. Проверьте запрос.');
        }
      } catch (err) {
        console.error('Geocoding error:', err);
        alert('Ошибка геокодинга: ' + err.message);
      } finally {
        if (this.els.btnSearch) {
          this.els.btnSearch.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
        }
      }
    }

    resetFlight(heading = 90, inAir = true) {
      this.state.x = 0;
      this.state.y = 0;
      const initialAlt = inAir ? 80 : AERO_SPECS.wheelHeight;
      this.state.z = initialAlt;
      this.state.pitch = 0;
      this.state.roll = 0;
      this.state.heading = heading;
      this.state.p = 0;
      this.state.q = 0;
      this.state.r = 0;

      const spdMs = inAir ? (85 / 3.6) : 0;
      const headingRad = (heading * Math.PI) / 180;
      this.state.vx = Math.sin(headingRad) * spdMs;
      this.state.vy = Math.cos(headingRad) * spdMs;
      this.state.vz = 0;
      this.state.speedKmh = inAir ? 85 : 0;
      this.state.tasKmh = inAir ? 85 : 0;
      this.state.throttle = inAir ? 0.75 : 0.0;
      this.state.rpm = inAir ? 2850 : 0;
      this.state.powerKW = inAir ? 96 : 0;
      this.state.onGround = !inAir;
      this.state.crashed = false;
      this.state.isStall = false;
      this.state.agl = inAir ? 80 : 0;

      if (this.els.crashWarning) this.els.crashWarning.style.display = 'none';
      if (this.els.stallWarning) this.els.stallWarning.style.display = 'none';

      this.updateEntityTransform();
      this.updateCamera(true);
    }

    // ------------------------------------------------------------------------
    // 6-DOF AERODYNAMIC PHYSICS ENGINE (Blown-Wing STOL, ENU)
    // ------------------------------------------------------------------------
    updatePhysics(dt) {
      if (this.state.crashed) return;

      const s = this.state;
      const inp = this.inputs;

      // 1. Throttle & Powertrain Response
      if (inp.throttleUp) s.throttle = Math.min(1.0, s.throttle + 0.45 * dt);
      if (inp.throttleDown) s.throttle = Math.max(0.0, s.throttle - 0.55 * dt);

      const targetRPM = s.throttle * AERO_SPECS.maxRPM;
      s.rpm += (targetRPM - s.rpm) * Math.min(1.0, dt * 5.0);
      s.powerKW = (s.rpm / AERO_SPECS.maxRPM) * AERO_SPECS.maxPowerKW;

      // Fuel consumption (PEMFC + Buffer LiPo)
      const h2FlowRate = (s.powerKW / 128) * (2.8 / 3600); // kg/s
      s.h2Kg = Math.max(0.0, s.h2Kg - h2FlowRate * dt);
      if (s.throttle > 0.85) {
        s.lipoPct = Math.max(20, s.lipoPct - 0.15 * dt); // STOL Boost discharge
      } else if (s.throttle < 0.6) {
        s.lipoPct = Math.min(100, s.lipoPct + 0.08 * dt); // PEMFC recharge
      }

      // Propeller spin angle
      s.propAngle += s.rpm * dt * (Math.PI / 30);

      // 2. Thrust Calculation & Blown-Wing Slipstream
      const staticThrust = (s.rpm / AERO_SPECS.maxRPM) * AERO_SPECS.maxThrustN;
      const airDensity = 1.225; // ISA SL
      const currentSpeed = Math.hypot(s.vx, s.vy, s.vz);

      // Dynamic slipstream over wing (DEP effect)
      const vEff = Math.sqrt(currentSpeed * currentSpeed + (0.42 * staticThrust) / (airDensity * 4.8));

      // 3. Dynamic Mass
      const totalMass = AERO_SPECS.massEmpty + s.h2Kg + AERO_SPECS.massBuffer + s.fluidKg;
      const gravityForce = totalMass * 9.80665;

      // 4. Aerodynamic Angles (AoA & Sideslip)
      const hdgRad = Cesium.Math.toRadians(s.heading);
      const pitchRad = Cesium.Math.toRadians(s.pitch);
      const rollRad = Cesium.Math.toRadians(s.roll);

      // Body-frame forward velocity approximation
      const cosH = Math.cos(hdgRad);
      const sinH = Math.sin(hdgRad);
      const u = s.vx * sinH + s.vy * cosH; // Forward speed (m/s)
      const w = s.vz;                     // Vertical speed (m/s)

      const aoa = currentSpeed > 3.0 ? -Math.atan2(w, Math.max(1.0, u)) * (180 / Math.PI) : 0;

      // Flaps configuration
      const flapsRad = Cesium.Math.toRadians(s.flaps);
      const stallAngle = s.flaps > 0 ? AERO_SPECS.alphaStallFlaps : AERO_SPECS.alphaStallClean;

      // Lift Coefficient CL (Linear + Flaps + Stall Drop)
      let cl = AERO_SPECS.cl0 + Cesium.Math.toRadians(aoa) * AERO_SPECS.clAlpha + (s.flaps / 30) * AERO_SPECS.clFlapsMax;
      s.isStall = false;

      if (aoa > stallAngle) {
        // Deep aerodynamic stall
        s.isStall = true;
        const stallDrop = (aoa - stallAngle) * 0.08;
        cl = Math.max(0.35, cl - stallDrop);
      }

      // Drag Coefficient CD (Parasite + Flaps + Gear + Ground Effect Induced Drag)
      const hOverB = Math.max(0.08, s.agl / AERO_SPECS.wingSpan);
      const groundEffectSigma = (33 * Math.pow(hOverB, 1.5)) / (1 + 33 * Math.pow(hOverB, 1.5));
      const cdi = (cl * cl) / (Math.PI * AERO_SPECS.aspectRatio * AERO_SPECS.oswaldE) * groundEffectSigma;
      const cdFlaps = (s.flaps / 30) * AERO_SPECS.cdFlaps30;
      const cdGear = s.gear ? AERO_SPECS.cdGear : 0.0;
      const cd = AERO_SPECS.cd0 + cdFlaps + cdGear + cdi;

      // Dynamic Pressure & Aero Forces
      const qDyn = 0.5 * airDensity * (vEff * vEff);
      let lift = qDyn * AERO_SPECS.wingArea * cl;
      let drag = qDyn * AERO_SPECS.wingArea * cd;

      // Net body forces
      const thrustForward = staticThrust * (1.0 - 0.25 * (currentSpeed / 75)); // Prop speed decay
      const forceForward = thrustForward - drag;
      const forceVertical = lift * Math.cos(rollRad) - gravityForce;

      // 5. Flight Dynamics & Angular Rates
      const speedFactor = Math.min(1.0, currentSpeed / 30.0);

      // Pitch control
      let pitchCmd = 0;
      if (inp.pitchUp) pitchCmd += 1.0;
      if (inp.pitchDown) pitchCmd -= 1.0;
      s.q += (pitchCmd * 28.0 * speedFactor - s.q * 3.5) * dt;
      s.pitch += s.q * dt;
      s.pitch = Math.max(-85, Math.min(85, s.pitch));

      // Roll control
      let rollCmd = 0;
      if (inp.rollRight) rollCmd += 1.0;
      if (inp.rollLeft) rollCmd -= 1.0;
      s.p += (rollCmd * 45.0 * speedFactor - s.p * 4.0) * dt;
      s.roll += s.p * dt;
      if (s.roll > 180) s.roll -= 360;
      if (s.roll < -180) s.roll += 360;

      // Yaw control
      let yawCmd = 0;
      if (inp.yawRight) yawCmd += 1.0;
      if (inp.yawLeft) yawCmd -= 1.0;
      s.r += (yawCmd * 18.0 * speedFactor - s.r * 3.0) * dt;
      s.heading += (s.r + (s.roll * 0.35 * speedFactor)) * dt;
      if (s.heading >= 360) s.heading -= 360;
      if (s.heading < 0) s.heading += 360;

      // 6. Translational Accelerations
      const ax = (forceForward * sinH) / totalMass;
      const ay = (forceForward * cosH) / totalMass;
      const az = forceVertical / totalMass;

      s.vx += ax * dt;
      s.vy += ay * dt;
      s.vz += az * dt;

      // 7. Ground Interaction & AGL
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;

      // Query real terrain elevation under current position
      this.updateTerrainElevation();

      s.agl = s.z - AERO_SPECS.wheelHeight;

      if (s.agl <= 0.0) {
        // Ground Contact / Taxi / Takeoff / Landing
        s.agl = 0.0;
        s.z = AERO_SPECS.wheelHeight;

        // Check for hard crash
        const hardDescent = s.vz < -4.8;
        const excessiveBank = Math.abs(s.roll) > 22 || s.pitch < -14;
        if ((hardDescent || excessiveBank) && currentSpeed > 10.0) {
          this.triggerCrash();
          return;
        }

        // Soft ground contact / taxiing
        s.vz = 0;
        s.onGround = true;

        // Ground roll attitude leveling
        s.pitch += (0 - s.pitch) * dt * 4.0;
        s.roll += (0 - s.roll) * dt * 6.0;

        // Rolling friction & brakes
        const friction = inp.brakes ? 0.45 : 0.04;
        s.vx *= Math.max(0.0, 1.0 - friction * dt * 5.0);
        s.vy *= Math.max(0.0, 1.0 - friction * dt * 5.0);

        // Ground steering via rudder
        if (inp.yawLeft) s.heading -= 25 * dt;
        if (inp.yawRight) s.heading += 25 * dt;
      } else {
        s.onGround = false;
      }

      // 8. Speeds
      s.speedKmh = Math.hypot(s.vx, s.vy, s.vz) * 3.6;
      s.tasKmh = s.speedKmh * 1.04;

      // Sound update
      this.audio.update(s.rpm, s.speedKmh, s.isStall);
    }

    updateTerrainElevation() {
      if (!this.viewer) return;
      try {
        const enuTransform = Cesium.Transforms.eastNorthUpToFixedFrame(
          Cesium.Cartesian3.fromDegrees(this.refOrigin.lon, this.refOrigin.lat, this.refOrigin.alt)
        );
        const worldPos = Cesium.Matrix4.multiplyByPoint(
          enuTransform,
          new Cesium.Cartesian3(this.state.x, this.state.y, 0),
          new Cesium.Cartesian3()
        );
        const carto = Cesium.Cartographic.fromCartesian(worldPos);
        if (carto) {
          const elev = this.viewer.scene.globe.getHeight(carto);
          if (elev !== undefined && !isNaN(elev)) {
            this.state.terrainElev = elev;
          }
        }
      } catch (e) {
        // Globe height fallback
      }
    }

    triggerCrash() {
      this.state.crashed = true;
      if (this.els.crashWarning) this.els.crashWarning.style.display = 'flex';
      console.warn('💥 AeroTerra H2: Terrain Collision Crash!');

      setTimeout(() => {
        if (this.els.crashWarning) this.els.crashWarning.style.display = 'none';
        this.resetFlight(this.currentAirport.heading);
      }, 2200);
    }

    // ------------------------------------------------------------------------
    // CESIUM ENTITY TRANSFORM CONVERSION (Local ENU -> Cartesian3 World)
    // ------------------------------------------------------------------------
    updateEntityTransform() {
      if (!this.aircraftEntity || !this.viewer) return;

      const originCartesian = Cesium.Cartesian3.fromDegrees(
        this.refOrigin.lon,
        this.refOrigin.lat,
        this.refOrigin.alt
      );

      // East-North-Up to Fixed Frame Matrix
      const enuTransform = Cesium.Transforms.eastNorthUpToFixedFrame(originCartesian);

      // Aircraft World Position
      const localPos = new Cesium.Cartesian3(this.state.x, this.state.y, this.state.z);
      const worldPos = Cesium.Matrix4.multiplyByPoint(enuTransform, localPos, new Cesium.Cartesian3());

      this.aircraftEntity.position = worldPos;

      // Heading, Pitch, Roll in ENU converted to Quaternion
      const hpr = new Cesium.HeadingPitchRoll(
        Cesium.Math.toRadians(this.state.heading - 90), // Cesium 0° heading points East, compensate to North
        Cesium.Math.toRadians(this.state.pitch),
        Cesium.Math.toRadians(this.state.roll)
      );

      const orientation = Cesium.Transforms.headingPitchRollQuaternion(worldPos, hpr);
      this.aircraftEntity.orientation = orientation;

      // Rotate Propellers
      if (this.propEntities && this.propEntities.length > 0) {
        this.propEntities.forEach((p, idx) => {
          const sign = idx % 2 === 0 ? 1 : -1;
          const propHpr = new Cesium.HeadingPitchRoll(0, sign * this.state.propAngle, 0);
          p.orientation = Cesium.Quaternion.fromHeadingPitchRoll(propHpr);
        });
      }
    }

    // ------------------------------------------------------------------------
    // CAMERA CONTROLLER (Chase Cam, Cockpit Cam, Free Orbit)
    // ------------------------------------------------------------------------
    updateCamera(instant = false) {
      if (!this.viewer || !this.aircraftEntity) return;

      const pos = this.aircraftEntity.position.getValue(this.viewer.clock.currentTime);
      if (!pos) return;

      const hdgRad = Cesium.Math.toRadians(this.state.heading);
      const pitchRad = Cesium.Math.toRadians(this.state.pitch);

      if (this.cameraMode === 'chase') {
        // Chase Cam: 22m behind, 4.8m above aircraft
        const chaseDist = 22.0;
        const chaseHeight = 4.8;

        const offsetX = -chaseDist * Math.sin(hdgRad);
        const offsetY = -chaseDist * Math.cos(hdgRad);
        const offsetZ = chaseHeight;

        const enuTransform = Cesium.Transforms.eastNorthUpToFixedFrame(pos);
        const camWorldPos = Cesium.Matrix4.multiplyByPoint(
          enuTransform,
          new Cesium.Cartesian3(offsetX, offsetY, offsetZ),
          new Cesium.Cartesian3()
        );

        this.viewer.camera.lookAt(
          camWorldPos,
          new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(this.state.heading - 90),
            Cesium.Math.toRadians(-8 + this.state.pitch * 0.3),
            chaseDist
          )
        );
        this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      } else if (this.cameraMode === 'cockpit') {
        // Cockpit Cam: pilot nose position inside canopy
        const enuTransform = Cesium.Transforms.eastNorthUpToFixedFrame(pos);
        const cockpitPos = Cesium.Matrix4.multiplyByPoint(
          enuTransform,
          new Cesium.Cartesian3(0.0, 0.9, 0.45),
          new Cesium.Cartesian3()
        );

        this.viewer.camera.setView({
          destination: cockpitPos,
          orientation: {
            heading: Cesium.Math.toRadians(this.state.heading - 90),
            pitch: Cesium.Math.toRadians(this.state.pitch),
            roll: Cesium.Math.toRadians(this.state.roll),
          },
        });
      }
      // 'free' mode leaves standard Cesium mouse navigation active
    }

    toggleCamera() {
      const modes = ['chase', 'cockpit', 'free'];
      const nextIdx = (modes.indexOf(this.cameraMode) + 1) % modes.length;
      this.cameraMode = modes[nextIdx];

      const labels = {
        chase: 'Chase Cam',
        cockpit: 'Cockpit View',
        free: 'Free Orbit',
      };
      if (this.els.camLabel) {
        this.els.camLabel.textContent = labels[this.cameraMode];
      }
    }

    // ------------------------------------------------------------------------
    // PFD ARTIFICIAL HORIZON & HUD DRAWING (Garmin G1000 Glass Cockpit)
    // ------------------------------------------------------------------------
    initPFDCanvas() {
      this.horizonCanvas = document.getElementById('earth-horizon-canvas');
      if (!this.horizonCanvas) return;
      this.horizonCtx = this.horizonCanvas.getContext('2d');
      this.resizePFDCanvas();
    }

    resizePFDCanvas() {
      if (!this.horizonCanvas) return;
      const w = Math.min(380, Math.max(260, window.innerWidth * 0.3));
      this.horizonCanvas.width = w;
      this.horizonCanvas.height = w;
      this.pfdWidth = w;
      this.pfdHeight = w;
    }

    renderPFD() {
      if (!this.horizonCtx) return;
      const ctx = this.horizonCtx;
      const w = this.pfdWidth;
      const h = this.pfdHeight;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Save base transform
      ctx.save();

      // Artificial Horizon Pitch & Roll
      const pitchPixels = (this.state.pitch / 90) * (h * 0.85);
      const rollRad = Cesium.Math.toRadians(this.state.roll);

      ctx.translate(cx, cy);
      ctx.rotate(-rollRad);
      ctx.translate(0, pitchPixels);

      // Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, -h, 0, 0);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(-w * 1.5, -h * 2, w * 3, h * 2);

      // Ground Gradient
      const groundGrad = ctx.createLinearGradient(0, 0, 0, h);
      groundGrad.addColorStop(0, '#78350f');
      groundGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(-w * 1.5, 0, w * 3, h * 2);

      // Horizon Zero Line (White)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-w, 0);
      ctx.lineTo(w, 0);
      ctx.stroke();

      // Pitch Ladder Lines (±10°, ±20°, ±30°)
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Rajdhani, monospace';
      ctx.textAlign = 'center';

      for (let deg = -40; deg <= 40; deg += 10) {
        if (deg === 0) continue;
        const y = -(deg / 90) * (h * 0.85);
        const lineWidth = deg % 20 === 0 ? 44 : 26;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-lineWidth, y);
        ctx.lineTo(lineWidth, y);
        ctx.stroke();

        ctx.fillText(Math.abs(deg).toString(), lineWidth + 12, y + 4);
        ctx.fillText(Math.abs(deg).toString(), -lineWidth - 12, y + 4);
      }

      ctx.restore();

      // Aircraft Stationary Reference Symbol (Yellow Center Chevron)
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      // Center dot
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      // Left wing bar
      ctx.moveTo(cx - 36, cy);
      ctx.lineTo(cx - 10, cy);
      ctx.lineTo(cx - 10, cy + 6);
      // Right wing bar
      ctx.moveTo(cx + 36, cy);
      ctx.lineTo(cx + 10, cy);
      ctx.lineTo(cx + 10, cy + 6);
      ctx.stroke();

      // Roll Arc Index at top
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, cy * 0.82, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.stroke();
    }

    updateHUDDOMElements() {
      const s = this.state;
      const els = this.els;

      // Compass Heading Ribbon
      if (els.compassRibbon) {
        const offsetPx = (s.heading / 360) * 720;
        els.compassRibbon.style.transform = `translateX(-${offsetPx % 360}px)`;
      }
      if (els.hdgVal) {
        els.hdgVal.textContent = `HDG ${Math.round(s.heading).toString().padStart(3, '0')}°`;
      }

      // Airspeed Tape
      if (els.speedVal) els.speedVal.textContent = Math.round(s.speedKmh);
      if (els.tasVal) els.tasVal.textContent = Math.round(s.tasKmh);
      if (els.speedLadder) {
        const ladderOffset = (s.speedKmh / 200) * 120;
        els.speedLadder.style.transform = `translateY(${ladderOffset}px)`;
      }

      // Altitude Tape & Radar Altimeter
      const mslAlt = Math.round(this.refOrigin.alt + s.z);
      if (els.altVal) els.altVal.textContent = mslAlt;
      if (els.radAltVal) els.radAltVal.textContent = s.agl.toFixed(1);

      // VSI
      if (els.vsiDigital) {
        const sign = s.vz >= 0 ? '+' : '';
        els.vsiDigital.textContent = `${sign}${s.vz.toFixed(1)}`;
      }
      if (els.vsiPointer) {
        const vsiClamped = Math.max(-10, Math.min(10, s.vz));
        els.vsiPointer.style.transform = `translateY(${-vsiClamped * 4}px)`;
      }

      // EICAS Engine & Fuel Gauges
      const thrPct = Math.round(s.throttle * 100);
      if (els.throttleFill) els.throttleFill.style.height = `${thrPct}%`;
      if (els.throttleVal) els.throttleVal.textContent = `${thrPct}%`;
      if (els.rpmVal) els.rpmVal.textContent = Math.round(s.rpm);
      if (els.powerVal) els.powerVal.textContent = Math.round(s.powerKW);

      // 4 Motors Bars
      const mPct = (s.rpm / AERO_SPECS.maxRPM) * 100;
      if (els.m1Fill) els.m1Fill.style.height = `${mPct}%`;
      if (els.m2Fill) els.m2Fill.style.height = `${mPct}%`;
      if (els.m3Fill) els.m3Fill.style.height = `${mPct}%`;
      if (els.m4Fill) els.m4Fill.style.height = `${mPct}%`;

      // H2 Fuel & LiPo Buffer
      const h2Pct = Math.round((s.h2Kg / AERO_SPECS.massH2) * 100);
      if (els.h2Fill) els.h2Fill.style.width = `${h2Pct}%`;
      if (els.h2Val) els.h2Val.textContent = `${s.h2Kg.toFixed(1)} kg (${h2Pct}%)`;

      if (els.lipoFill) els.lipoFill.style.width = `${Math.round(s.lipoPct)}%`;
      if (els.lipoVal) els.lipoVal.textContent = `12S 48V (${Math.round(s.lipoPct)}%)`;

      // Annunciators
      if (els.annunFlaps) els.annunFlaps.textContent = `FLAPS: ${s.flaps}°`;
      if (els.annunGear) els.annunGear.textContent = `GEAR: ${s.gear ? 'DOWN' : 'UP'}`;

      // Stall Warning Banner
      if (els.stallWarning) {
        els.stallWarning.style.display = s.isStall ? 'flex' : 'none';
      }
    }

    // ------------------------------------------------------------------------
    // RENDER LOOP & LIFECYCLE
    // ------------------------------------------------------------------------
    startLoop() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.lastTickTime = performance.now();

      const loop = (now) => {
        if (!this.isRunning) return;
        const dt = Math.min(0.1, (now - this.lastTickTime) / 1000);
        this.lastTickTime = now;

        this.updatePhysics(dt);
        this.updateEntityTransform();
        this.updateCamera();
        this.renderPFD();
        this.updateHUDDOMElements();

        this.animationFrameId = requestAnimationFrame(loop);
      };

      this.animationFrameId = requestAnimationFrame(loop);
    }

    stopLoop() {
      this.isRunning = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }

    onShow() {
      this.startLoop();
      this.resizePFDCanvas();
      if (this.viewer) {
        this.viewer.resize();
      }
    }

    onHide() {
      this.stopLoop();
      if (this.audio) {
        this.audio.update(0, 0, false);
      }
    }

    // ------------------------------------------------------------------------
    // EVENT LISTENERS & CONTROLS
    // ------------------------------------------------------------------------
    setupEventListeners() {
      const earthControlKeys = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Space', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE',
        'KeyF', 'KeyG', 'KeyC', 'KeyR'
      ];

      // Keyboard Controls
      window.addEventListener('keydown', (e) => {
        if (!this.isRunning) return;
        const code = e.code;

        if (earthControlKeys.includes(code)) {
          e.preventDefault();
        }

        if (code === 'KeyW' || code === 'ShiftLeft' || code === 'ShiftRight') {
          this.inputs.throttleUp = true;
          this.audio.init();
        } else if (code === 'KeyS' || code === 'ControlLeft' || code === 'ControlRight') {
          this.inputs.throttleDown = true;
        } else if (code === 'ArrowDown' || code === 'KeyK') {
          this.inputs.pitchUp = true; // Pull back on stick -> nose up
        } else if (code === 'ArrowUp' || code === 'KeyI') {
          this.inputs.pitchDown = true; // Push forward -> nose down
        } else if (code === 'ArrowLeft' || code === 'KeyJ' || code === 'KeyA') {
          this.inputs.rollLeft = true;
          this.inputs.yawLeft = true;
        } else if (code === 'ArrowRight' || code === 'KeyL' || code === 'KeyD') {
          this.inputs.rollRight = true;
          this.inputs.yawRight = true;
        } else if (code === 'KeyB') {
          this.inputs.brakes = true;
        } else if (code === 'KeyF') {
          this.state.flaps = this.state.flaps === 0 ? 15 : this.state.flaps === 15 ? 30 : 0;
        } else if (code === 'KeyG') {
          this.state.gear = !this.state.gear;
        } else if (code === 'KeyC') {
          this.toggleCamera();
        } else if (code === 'KeyR') {
          this.resetFlight(this.currentAirport.heading, true);
        }
      });

      window.addEventListener('keyup', (e) => {
        const code = e.code;
        if (code === 'KeyW' || code === 'ShiftLeft' || code === 'ShiftRight') this.inputs.throttleUp = false;
        if (code === 'KeyS' || code === 'ControlLeft' || code === 'ControlRight') this.inputs.throttleDown = false;
        if (code === 'ArrowDown' || code === 'KeyK') this.inputs.pitchUp = false;
        if (code === 'ArrowUp' || code === 'KeyI') this.inputs.pitchDown = false;
        if (code === 'ArrowLeft' || code === 'KeyJ') this.inputs.rollLeft = false;
        if (code === 'ArrowRight' || code === 'KeyL') this.inputs.rollRight = false;
        if (code === 'KeyA' || code === 'KeyQ') this.inputs.yawLeft = false;
        if (code === 'KeyD' || code === 'KeyE') this.inputs.yawRight = false;
        if (code === 'KeyB') this.inputs.brakes = false;
      });

      // Airport Preset Buttons
      document.querySelectorAll('.earth-airport-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.teleportToAirport(btn.dataset.airport);
        });
      });

      // Search & Geocoding
      if (this.els.btnSearch && this.els.searchInput) {
        this.els.btnSearch.addEventListener('click', () => {
          this.geocodeAndTeleport(this.els.searchInput.value);
        });
        this.els.searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') this.geocodeAndTeleport(this.els.searchInput.value);
        });
      }

      // Teleport Button
      if (this.els.btnTeleport) {
        this.els.btnTeleport.addEventListener('click', () => {
          const lat = parseFloat(this.els.latInput ? this.els.latInput.value : '');
          const lon = parseFloat(this.els.lonInput ? this.els.lonInput.value : '');
          if (!isNaN(lat) && !isNaN(lon)) {
            this.teleportToCoordinates(lat, lon);
          } else {
            this.teleportToAirport(this.currentAirport.id);
          }
        });
      }

      // Camera Toggle Button
      if (this.els.btnCamToggle) {
        this.els.btnCamToggle.addEventListener('click', () => this.toggleCamera());
      }

      // Sound Toggle Button
      if (this.els.btnSound) {
        this.els.btnSound.addEventListener('click', () => {
          const isNowOn = this.audio.toggle();
          if (this.els.soundIcon) {
            this.els.soundIcon.className = isNowOn ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
          }
        });
      }

      // Touch Controls Toggle Button
      if (this.els.btnTouchToggle && this.els.touchControls) {
        this.els.btnTouchToggle.addEventListener('click', () => {
          const isHidden = this.els.touchControls.style.display === 'none' || !this.els.touchControls.style.display;
          this.els.touchControls.style.display = isHidden ? 'flex' : 'none';
        });
      }

      // Token Modal Controls
      if (this.els.btnOpenToken && this.els.tokenModal) {
        this.els.btnOpenToken.addEventListener('click', () => {
          this.els.tokenModal.style.display = 'flex';
        });
      }
      if (this.els.noticeBtn && this.els.tokenModal) {
        this.els.noticeBtn.addEventListener('click', () => {
          this.els.tokenModal.style.display = 'flex';
        });
      }
      if (this.els.btnCloseToken && this.els.tokenModal) {
        this.els.btnCloseToken.addEventListener('click', () => {
          this.els.tokenModal.style.display = 'none';
        });
      }

      if (this.els.btnSaveToken) {
        this.els.btnSaveToken.addEventListener('click', async () => {
          const token = this.els.tokenInput ? this.els.tokenInput.value.trim() : '';
          if (token) {
            localStorage.setItem('aeroterra_cesium_token', token);
            Cesium.Ion.defaultAccessToken = token;
            if (this.els.tokenModal) this.els.tokenModal.style.display = 'none';
            await this.loadTilesetOrFallback();
          }
        });
      }

      if (this.els.btnClearToken) {
        this.els.btnClearToken.addEventListener('click', async () => {
          localStorage.removeItem('aeroterra_cesium_token');
          Cesium.Ion.defaultAccessToken = '';
          if (this.els.tokenInput) this.els.tokenInput.value = '';
          if (this.els.tokenModal) this.els.tokenModal.style.display = 'none';
          await this.loadTilesetOrFallback();
        });
      }
    }

    // ------------------------------------------------------------------------
    // MOBILE TOUCH JOYSTICK & THROTTLE
    // ------------------------------------------------------------------------
    setupTouchControls() {
      // Touch Throttle Handle Drag
      const track = document.getElementById('earth-touch-throttle-track');
      const handle = document.getElementById('earth-touch-throttle-handle');
      const pctLabel = document.getElementById('earth-touch-throttle-pct');

      if (track && handle) {
        const updateThrottleTouch = (clientY) => {
          const rect = track.getBoundingClientRect();
          const offsetY = Math.max(0, Math.min(rect.height, clientY - rect.top));
          const pct = 1.0 - offsetY / rect.height;
          this.state.throttle = pct;
          handle.style.bottom = `${pct * 100}%`;
          if (pctLabel) pctLabel.textContent = `${Math.round(pct * 100)}%`;
          this.audio.init();
        };

        track.addEventListener('touchstart', (e) => updateThrottleTouch(e.touches[0].clientY), { passive: true });
        track.addEventListener('touchmove', (e) => updateThrottleTouch(e.touches[0].clientY), { passive: true });
      }

      // Touch Rudder Buttons
      const rudL = document.getElementById('earth-touch-rudder-left');
      const rudR = document.getElementById('earth-touch-rudder-right');
      if (rudL) {
        rudL.addEventListener('touchstart', () => { this.inputs.yawLeft = true; }, { passive: true });
        rudL.addEventListener('touchend', () => { this.inputs.yawLeft = false; }, { passive: true });
      }
      if (rudR) {
        rudR.addEventListener('touchstart', () => { this.inputs.yawRight = true; }, { passive: true });
        rudR.addEventListener('touchend', () => { this.inputs.yawRight = false; }, { passive: true });
      }

      // Touch Virtual Flight Stick (Pitch & Roll)
      const stickZone = document.getElementById('earth-virtual-joystick-zone');
      const stickKnob = document.getElementById('earth-virtual-joystick-knob');

      if (stickZone && stickKnob) {
        const resetStick = () => {
          stickKnob.style.transform = 'translate(-50%, -50%)';
          this.inputs.pitchUp = false;
          this.inputs.pitchDown = false;
          this.inputs.rollLeft = false;
          this.inputs.rollRight = false;
        };

        const updateStick = (touchX, touchY) => {
          const rect = stickZone.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const maxRadius = rect.width / 2;

          let dx = touchX - centerX;
          let dy = touchY - centerY;
          const dist = Math.hypot(dx, dy);

          if (dist > maxRadius) {
            dx = (dx / dist) * maxRadius;
            dy = (dy / dist) * maxRadius;
          }

          stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

          // Map to inputs
          this.inputs.rollRight = dx > 15;
          this.inputs.rollLeft = dx < -15;
          this.inputs.pitchUp = dy > 15; // Pull back
          this.inputs.pitchDown = dy < -15; // Push forward
        };

        stickZone.addEventListener('touchstart', (e) => updateStick(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
        stickZone.addEventListener('touchmove', (e) => updateStick(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
        stickZone.addEventListener('touchend', resetStick, { passive: true });
        stickZone.addEventListener('touchcancel', resetStick, { passive: true });
      }

      // Touch Flaps and Camera Buttons
      const btnTouchFlaps = document.getElementById('btn-earth-touch-flaps');
      const btnTouchCam = document.getElementById('btn-earth-touch-cam');
      if (btnTouchFlaps) {
        btnTouchFlaps.addEventListener('click', () => {
          this.state.flaps = this.state.flaps === 0 ? 15 : this.state.flaps === 15 ? 30 : 0;
        });
      }
      if (btnTouchCam) {
        btnTouchCam.addEventListener('click', () => this.toggleCamera());
      }
    }

    // ------------------------------------------------------------------------
    // RESIZE OBSERVER
    // ------------------------------------------------------------------------
    setupResizeObserver() {
      const container = document.getElementById('earth-section');
      if (!container || typeof ResizeObserver === 'undefined') return;

      const ro = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            if (this.viewer) this.viewer.resize();
            this.resizePFDCanvas();
          }
        }
      });
      ro.observe(container);
    }
  }

  // --------------------------------------------------------------------------
  // 5. GLOBAL EXPORT & AUTO-INITIALIZATION
  // --------------------------------------------------------------------------
  window.AeroTerraEarth = new AeroTerraEarthSim();

  window.addEventListener('DOMContentLoaded', () => {
    // Only init Cesium after DOM is ready
    window.AeroTerraEarth.init();
  });

})();
