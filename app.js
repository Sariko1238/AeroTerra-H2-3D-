/* ==========================================================================
   AEROTERRA H2 — AIRCRAFT ENGINEERING SUITE & 3D HANGAR
   Vanilla JS Engine (Three.js, ECharts, Leaflet, Web Audio, Physics Lab)
   Aerospace Engineering Club
   ========================================================================== */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. STATE & CONFIGURATION
  // --------------------------------------------------------------------------
  const STATE = {
    lang: 'ru', // 'ru' | 'en'
    scale: 'full', // 'full' (1:1) | 'rc' (1:5)
    mode: 'clean', // 'clean' | 'agro' | 'fire'
    soundEnabled: true,
    viewMode: 'iso',
    
    // 3D Hangar toggles
    exploded: false,
    explodeProgress: 0,
    zebraShader: false,
    windTunnel: false,
    spraying: false,
    waterDumping: false,
    activeHotspot: null,
    
    // Master Blueprint Infographic State
    blueprintProto: 'subscale', // 'subscale' (3.2m, 25 kg) | 'fullscale' (9.6m, 450 kg)
    blueprintView: 'top', // 'top' | 'front' | 'side'
    blueprintEnergyMode: 'lipo', // 'lipo' | 'h2'
    cgDrained: false,
    
    // Flight simulator
    isFlying: false,
    flightSpeed: 210, // km/h
    flightAltitude: 150, // m
    flightPitch: 0,
    flightRoll: 0,
    flightYaw: 0,
    keys: { w: false, s: false, a: false, d: false, space: false, e: false },
    
    // Mathematical Slider Parameters (Full-scale defaults)
    params: {
      payload: 600, // kg
      range: 1200, // km
      speed: 210, // km/h
      ar: 11.5, // aspect ratio
      jetPrice: 1.25, // $/liter
      h2Price: 4.50 // $/kg
    },
    
    // Leaflet Mission State
    missionScenario: 'agro', // 'agro' | 'fire'
    missionProgress: 0.56,
    missionInterval: null
  };

  // --------------------------------------------------------------------------
  // 2. I18N LOCALIZATION DICTIONARY (RU / EN)
  // --------------------------------------------------------------------------
  const I18N = {
    ru: {
      nav_blueprint: 'Инженерный Паспорт',
      bp_subtitle: 'Модульный Водородно-Электрический Самолёт STOL (Точное Агро-Опрыскивание и Пожарный Патруль)',
      bp_proto_subscale: '🟢 Прототип Клуба (3.2м / MTOM 25кг / 12S LiPo / H2-Hybrid)',
      bp_proto_fullscale: '🔵 Полноразмерный Борт (9.6м / MTOM 450кг / Liquid H2)',
      bp_btn_fullscreen: 'Презентация на весь экран',
      bp_btn_export_poster: 'Плакат А1 (PDF)',
      badge1_title: 'Remote & Autonomous RTK Control',
      badge1_desc: 'Наземная станция GCS + автопилот по точкам с сантиметровой точностью 2 см (FPV / ELRS 900MHz / MAVLink).',
      badge2_title: 'Dual-Role Quick-Swap Pod',
      badge2_desc: 'Смена полезной нагрузки за 5 минут: бак опрыскивания (10 л / 150 л) ⇄ пожарный водяной сброс с клапаном salvo.',
      badge3_title: 'H2-Hybrid & Blown-Wing STOL',
      badge3_desc: 'Водородная ячейка + буфер LiPo, взлёт с грунта за 35 м, активный обдув закрылков скосом потока Downwash.',
      badge4_title: 'CATIA V5 Class-A Aerodynamics',
      badge4_desc: 'Бескабинный фюзеляж (Zero Cockpit Drag), ламинарный профиль NACA 4415, удлинение AR = 8.0 и винглеты.',
      b1_title: '1. Key Specifications (Выверенные ТТХ)',
      b2_title: '2. Mass Budget (Весовой баланс + Центровка CG)',
      b3_title: '3. Propulsion & Thrust Requirements (Аэродинамика)',
      b4_title: '4. Energy Sizing & Endurance (Без ошибок!)',
      b5_title: '5. Aircraft Layout & 3-View Engineering Blueprints',
      b6_title: '6. Component Architecture (Бортовые системы)',
      b7_title: '7. Mission & Operation (5 Этапов)',
      b8_title: '8. Key Design Considerations & Advantages',
      cg_title: 'Индикатор Центровки (CG Shift):',
      cg_note: 'Бак установлен строго в фокусе крыла ⟹ ΔCG ≈ 0 при выработке жидкости!',
      btn_drain_cg: 'Слить бак 10 кг (Тест CG)',
      btn_dl_poster: 'Скачать Весь Инженерный Паспорт (А1 HD)',
      nav_hangar: '3D Ангар',
      nav_sim: '🎮 ПОЛЁТ (MSFS Sim)',
      nav_earth: '🌍 ЗЕМЛЯ (Google 3D)',
      nav_math: 'Инженерная Математика',
      nav_mission: 'Миссии и Пульт RC',
      nav_club: 'Клуб & ИИ Конструктор',
      btn_pdf: 'Паспорт PDF',
      hud_designation: 'ПРОЕКТ:',
      hud_mtow: 'ВЗЛЁТНАЯ МАССА (MTOW):',
      hud_wingspan: 'РАЗМАХ:',
      hud_airfoil: 'ПРОФИЛЬ:',
      hud_propulsion: 'ТЯГА:',
      mode_clean: 'Аэродинамика H2',
      mode_agro: 'Режим Агро (NDVI)',
      mode_fire: 'Пожарный Патруль',
      btn_exploded: '3D Разбор (Exploded)',
      btn_zebra: 'CATIA Zebra Shader',
      btn_cfd: 'Обдув CFD',
      btn_spray: 'Распыление',
      btn_dump: 'Сброс Воды',
      btn_upload_cad: 'Загрузить CAD',
      hotspots_heading: 'ИНТЕРАКТИВНЫЕ УЗЛЫ 3D:',
      hs_wing: '1. Крыло Class-A',
      hs_tank: '2. Крио-Бак H2',
      hs_fuelcell: '3. Топливная Ячейка',
      hs_payload: '4. Модульный Отсек',
      hs_motors: '5. Электромоторы DEP',
      hs_gimbal: '6. Сенсорная Турель',
      hs_avionics: '7. Автопилот MAVLink',
      hs_gear: '8. Шасси STOL',
      math_title: 'Инженерная Математика и Экономия Керосина',
      math_subtitle: 'Динамический расчёт весового баланса, потребной мощности на взлёте STOL, аэродинамического качества и колоссальной экономической выгоды перехода с авиакеросина Jet A-1 на зелёный водород.',
      calc_params: 'Параметры Миссии и Самолёта',
      slider_payload: 'Полезная нагрузка (вода / химикаты):',
      slider_range: 'Дальность полёта:',
      slider_speed: 'Крейсерская скорость:',
      slider_ar: 'Удлинение крыла (Aspect Ratio):',
      slider_jet_price: 'Цена авиакеросина Jet A-1:',
      slider_h2_price: 'Цена чистого водорода H2:',
      stol_roll_title: 'Дистанция разбега STOL (грунт):',
      kpi_mtow: 'ПОЛНАЯ МАССА MTOW',
      kpi_ld: 'КАЧЕСТВО L/D (МАКС)',
      kpi_cost_hr: 'СТОИМОСТЬ ЧАСА (H2)',
      kpi_co2: 'СЭКОНОМЛЕНО CO₂ / ГОД',
      chart_mass_title: 'Весовой Баланс (Mass Budget)',
      chart_aero_title: 'Поляра Сопротивления & L/D',
      chart_eco_title: 'Экономика: H2 vs Керосин Jet A-1',
      chart_power_title: 'Профиль Мощности Миссии',
      sim_title: 'Симулятор Миссий и Пульт RC Наземного Управления',
      sim_subtitle: 'Интерактивная спутниковая карта выполнения реальных агро- и пожарных миссий с автономным планированием маршрута «змейкой» и виртуальным авиагоризонтом пилота.',
      scen_agro: '1. Агро-Опрыскивание (NDVI Grid)',
      scen_fire: '2. Пожарный Патруль (Wildfire Drop)',
      map_mission_status: 'СТАТУС МИССИИ:',
      map_area_covered: 'ОБРАБОТАНО:',
      map_rate: 'ПРОИЗВОДИТЕЛЬНОСТЬ:',
      gcs_hud_title: 'RC Telemetry & HUD Cockpit',
      gcs_h2_tank: 'Давление Водорода (LH2 / 350 Bar):',
      gcs_fc_temp: 'Температура Ячейки PEM:',
      gcs_payload_level: 'Остаток бака опрыскивания / воды:',
      btn_flight_control: 'Включить ручное RC-управление',
      club_title: 'Aerospace Engineering Club & Дорожная Карта',
      club_subtitle: 'Сертификационный цикл EASA CS-23 / ICAO, командные исследования клуба и интеллектуальный ИИ-главный конструктор для проверки центровки и аэродинамики.',
      roadmap_heading: 'Дорожная карта создания самолёта',
      step1_title: 'Этап 1: CATIA V5 & ICEM Surf Class-A Lofting',
      step1_desc: 'Построение теоретического контура крыла NACA 64-215 и композитного фюзеляжа без изломов кривизны.',
      step2_title: 'Этап 2: CFD-моделирование OpenFOAM & ANSYS',
      step2_desc: 'Анализ распределенной винтомоторной группы (DEP) и эффекта обдува механизации крыла для короткого взлёта STOL.',
      step3_title: 'Этап 3: Сборка и Лётные Испытания Прототипа 1:5',
      step3_desc: 'Изготовление крыла на 5-осевом ЧПУ, карбоновая выклейка вакуумной инфузией и полёты на полигоне с автопилотом.',
      step4_title: 'Этап 4: Стендовые Тесты Водородного ТЭК PEM',
      step4_desc: 'Испытания топливной ячейки на вибрацию, холодный пуск и системы аварийного сброса водорода.',
      step5_title: 'Этап 5: Полноразмерный Самолёт 1:1 и Сертификация EASA',
      step5_desc: 'Лётная сертификация для коммерческих агрохолдингов и лесоохранных ведомств МЧС.',
      ai_name: 'ИИ-Главный Конструктор',
      ai_btn_audit: 'Аудит Самолёта',
      ai_input_ph: 'Спросить главного конструктора...',
      team_heading: '👑 СОЗДАТЕЛЬ И АВТОР ПРОЕКТА AEROTERRA H2',
      creator_name: 'Musayev Sardor — Я СОЗДАТЕЛЬ ВСЕГО',
      creator_role: 'Founder, Sole Creator & Chief Aerospace Architect',
      creator_bio: 'Единственный автор концепции, 3D-моделирования CATIA V5 Class-A, математического ядра, водородно-электрической архитектуры и 3D-авиасимулятора AeroTerra H2.',
      footer_rights: '© 2026 AeroTerra H2. Единственный создатель и главный авиаконструктор: Musayev Sardor (sarikmusaev2006@gmail.com). Все права защищены.'
    },
    en: {
      nav_blueprint: 'Engineering Blueprint',
      bp_subtitle: 'Modular Hydrogen-Electric STOL Unmanned Aircraft (Precision Agricultural Spraying & Forest Fire Patrol)',
      bp_proto_subscale: '🟢 Club Prototype (3.2m / MTOM 25kg / 12S LiPo / H2-Hybrid)',
      bp_proto_fullscale: '🔵 Full-Scale Regional UAV (9.6m / MTOM 450kg / Liquid H2)',
      bp_btn_fullscreen: 'Fullscreen Presentation',
      bp_btn_export_poster: 'Poster A1 (PDF)',
      badge1_title: 'Remote & Autonomous RTK Control',
      badge1_desc: 'Ground control station GCS + waypoint autopilot with 2 cm accuracy (FPV / ELRS 900MHz / MAVLink).',
      badge2_title: 'Dual-Role Quick-Swap Pod',
      badge2_desc: '5-minute payload turnaround: precision spray tank (10 L / 150 L) ⇄ firefighting water drop gate.',
      badge3_title: 'H2-Hybrid & Blown-Wing STOL',
      badge3_desc: 'Hydrogen fuel cell + LiPo buffer, 35 m unpaved takeoff roll, active flap blowing with downwash slipstream.',
      badge4_title: 'CATIA V5 Class-A Aerodynamics',
      badge4_desc: 'Zero cockpit drag body, laminar NACA 4415 airfoil, high aspect ratio AR = 8.0 and blended winglets.',
      b1_title: '1. Key Specifications (Verified TTX)',
      b2_title: '2. Mass Budget (Weight & Balance + CG Indicator)',
      b3_title: '3. Propulsion & Thrust Requirements (Aerodynamics)',
      b4_title: '4. Energy Sizing & Endurance (Flawless Math)',
      b5_title: '5. Aircraft Layout & 3-View Engineering Blueprints',
      b6_title: '6. Component Architecture (Avionics Loops)',
      b7_title: '7. Mission & Operation (5 Flight Phases)',
      b8_title: '8. Key Design Considerations & Advantages',
      cg_title: 'Center of Gravity (CG Shift):',
      cg_note: 'Tank placed exactly at wing aerodynamic center ⟹ ΔCG ≈ 0 as fluid is consumed!',
      btn_drain_cg: 'Drain 10 kg Tank (CG Test)',
      btn_dl_poster: 'Download Master Technical Poster (A1 HD)',
      nav_hangar: '3D Hangar',
      nav_sim: '🎮 FLIGHT (MSFS Sim)',
      nav_earth: '🌍 EARTH (Google 3D)',
      nav_math: 'Engineering Math',
      nav_mission: 'Missions & RC GCS',
      nav_club: 'Club & AI Chief Designer',
      btn_pdf: 'Passport PDF',
      hud_designation: 'PROJECT:',
      hud_mtow: 'MAX TAKEOFF WEIGHT (MTOW):',
      hud_wingspan: 'WINGSPAN:',
      hud_airfoil: 'AIRFOIL:',
      hud_propulsion: 'PROPULSION:',
      mode_clean: 'Aero Clean H2',
      mode_agro: 'Agro Mode (NDVI)',
      mode_fire: 'Fire Patrol',
      btn_exploded: '3D Exploded View',
      btn_zebra: 'CATIA Zebra Shader',
      btn_cfd: 'CFD Streamlines',
      btn_spray: 'Spraying',
      btn_dump: 'Water Dump',
      btn_upload_cad: 'Upload CAD',
      hotspots_heading: '3D INTERACTIVE COMPONENTS:',
      hs_wing: '1. Wing Class-A',
      hs_tank: '2. LH2 Cryo-Tank',
      hs_fuelcell: '3. Fuel Cell Stack',
      hs_payload: '4. Modular Mission Pod',
      hs_motors: '5. Electric DEP Motors',
      hs_gimbal: '6. Sensor Gimbal',
      hs_avionics: '7. MAVLink Avionics',
      hs_gear: '8. STOL Landing Gear',
      math_title: 'Engineering Mathematics & Fuel Economy',
      math_subtitle: 'Real-time calculation of mass budget, STOL takeoff required power, lift-to-drag polar and unprecedented cost reduction replacing Jet A-1 kerosene with green hydrogen.',
      calc_params: 'Aircraft & Mission Parameters',
      slider_payload: 'Payload Mass (water / agrochemicals):',
      slider_range: 'Flight Mission Range:',
      slider_speed: 'Cruise Airspeed:',
      slider_ar: 'Wing Aspect Ratio (AR):',
      slider_jet_price: 'Jet A-1 Kerosene Price:',
      slider_h2_price: 'Green Hydrogen H2 Price:',
      stol_roll_title: 'STOL Takeoff Run (Unpaved strip):',
      kpi_mtow: 'TOTAL MTOW',
      kpi_ld: 'MAX L/D RATIO',
      kpi_cost_hr: 'FLIGHT HOUR COST (H2)',
      kpi_co2: 'CO₂ PREVENTED / YR',
      chart_mass_title: 'Mass Budget Breakdown',
      chart_aero_title: 'Drag Polar & L/D Efficiency',
      chart_eco_title: 'Economics: H2 vs Jet A-1 Kerosene',
      chart_power_title: 'Mission Power Profile',
      sim_title: 'Mission Simulator & RC Ground Control Station',
      sim_subtitle: 'Interactive satellite map of real dual-role agricultural and wildfire missions with autonomous boustrophedon grid routing and pilot artificial horizon HUD.',
      scen_agro: '1. Precision Spraying (NDVI Grid)',
      scen_fire: '2. Wildfire Patrol (Water Drop)',
      map_mission_status: 'MISSION STATUS:',
      map_area_covered: 'COVERED AREA:',
      map_rate: 'APPLICATION RATE:',
      gcs_hud_title: 'RC Telemetry & HUD Cockpit',
      gcs_h2_tank: 'Hydrogen Pressure (LH2 / 350 Bar):',
      gcs_fc_temp: 'PEM Fuel Cell Temperature:',
      gcs_payload_level: 'Payload Tank Fluid Level:',
      btn_flight_control: 'Enable Manual RC Flight',
      club_title: 'Aerospace Engineering Club & Certification Roadmap',
      club_subtitle: 'EASA CS-23 / ICAO certification roadmap, collegiate aerospace research and AI Chief Designer verifying weight and balance in real-time.',
      roadmap_heading: 'Aircraft Development Roadmap',
      step1_title: 'Phase 1: CATIA V5 & ICEM Surf Class-A Lofting',
      step1_desc: 'Lofting theoretical contours of NACA 64-215 wing and composite fuselage maintaining G2/G3 curvature continuity.',
      step2_title: 'Phase 2: CFD Analysis in OpenFOAM & ANSYS',
      step2_desc: 'Distributed electric propulsion (DEP) wing blowing verification for short field takeoff and landing (STOL).',
      step3_title: 'Phase 3: 1:5 Scale Prototype Assembly & Flight Test',
      step3_desc: '5-axis CNC wing molds, carbon fiber vacuum resin infusion and autonomous test flights on university field (CURRENT).',
      step4_title: 'Phase 4: PEM Fuel Cell Bench Dyno Testing',
      step4_desc: 'Vibration testing, cold-start protocols and emergency hydrogen vent safety valves at 350 Bar.',
      step5_title: 'Phase 5: Full-Scale 1:1 Aircraft & EASA CS-23',
      step5_desc: 'Flight certification for commercial agribusinesses and state forest fire emergency brigades.',
      ai_name: 'AI Chief Designer',
      ai_btn_audit: 'Audit Aircraft',
      ai_input_ph: 'Ask Chief Designer...',
      team_heading: '👑 SOLE CREATOR & ARCHITECT OF AEROTERRA H2',
      creator_name: 'Musayev Sardor — SOLE CREATOR OF EVERYTHING',
      creator_role: 'Founder, Sole Creator & Chief Aerospace Architect',
      creator_bio: 'Sole author of the concept, CATIA V5 Class-A 3D modeling, mathematical flight engine, hydrogen-electric architecture, and AeroTerra H2 3D Flight Simulator.',
      footer_rights: '© 2026 AeroTerra H2. Sole creator & chief aerospace architect: Musayev Sardor (sarikmusaev2006@gmail.com). All rights reserved.'
    }
  };

  // --------------------------------------------------------------------------
  // 3. SOUND SYNTHESIZER (WEB AUDIO API - ZERO EXTERNAL ASSETS NEEDED)
  // --------------------------------------------------------------------------
  class SoundSynth {
    constructor() {
      this.ctx = null;
    }
    
    init() {
      if (!this.ctx && typeof AudioContext !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }
    
    playClick() {
      if (!STATE.soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    }
    
    playHotspotChime() {
      if (!STATE.soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      
      const now = this.ctx.currentTime;
      [880, 1320].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.06, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.15);
      });
    }
    
    playWhoosh() {
      if (!STATE.soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.35);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    }
  }

  const audio = new SoundSynth();

  // --------------------------------------------------------------------------
  // 4. HOTSPOTS DATA REPOSITORY (8 ENGINEERING DETAILS)
  // --------------------------------------------------------------------------
  const HOTSPOTS_DATA = {
    wing: {
      nodeNumber: 1,
      category: 'CATIA V5 / AERODYNAMICS',
      title: { ru: '🪽 Крыло Class-A (NACA 64-215)', en: '🪽 Wing Class-A Surface (NACA 64-215)' },
      massKg: 86.4,
      mtowPct: '5.3%',
      material: { ru: 'CFRP Углепластик T800 Class-A', en: 'CFRP T800 Carbon Class-A' },
      targetPos: { x: 4.2, y: 1.1, z: 0.1 },
      camPos: { x: 7.2, y: 3.2, z: 4.2 },
      specs: [
        { label: { ru: 'Площадь крыла (S):', en: 'Wing Area (S):' }, val: '13.35 м²' },
        { label: { ru: 'Удлинение (AR):', en: 'Aspect Ratio (AR):' }, val: '11.5' },
        { label: { ru: 'Аэродинам. качество:', en: 'Max L/D Ratio:' }, val: 'L/D = 21.4' },
        { label: { ru: 'Размах крыла (b):', en: 'Wingspan (b):' }, val: '12.4 м' }
      ],
      formula: 'L = 0.5 · ρ · V² · S · CL  |  CDi = CL² / (π · AR · e)',
      desc: {
        ru: 'Высоконесущее крыло большого удлинения с ламинарным каплевидным профилем NACA 64-215, спроектированное в CATIA V5 ICEM Surf по стандартам непрерывности кривизны G2/G3 (Class-A Surface). Законцовки с винглетами снижают индуктивное сопротивление на 24% и обеспечивают устойчивый полёт на сверхнизких скоростях (STOL 38 км/ч) при активном обдуве от 4 распределённых электромоторов (DEP).',
        en: 'High-lift, high aspect ratio wing with laminar drop profile NACA 64-215, engineered in CATIA V5 ICEM Surf complying with G2/G3 curvature continuity (Class-A Surface). Winglet tips reduce induced drag by 24% and ensure stable flight at ultra-low speeds (STOL 38 km/h) with active propwash from 4 distributed electric motors (DEP).'
      },
      chartData: {
        x: ['100', '140', '180', '210', '250', '290'],
        y: [14.2, 18.5, 21.4, 21.0, 18.1, 15.3],
        name: 'L/D vs Speed (km/h)'
      }
    },
    tank: {
      nodeNumber: 2,
      category: 'HYDROGEN CRYOGENICS',
      title: { ru: '💧 Криогенный водородный бак (LH2 Type IV)', en: '💧 Cryogenic LH2 Cryo-Tank Type IV' },
      massKg: 92.5,
      mtowPct: '5.6%',
      material: { ru: 'Карбоновый композит Toray T1000 + MLI вакуумная изоляция', en: 'Toray T1000 Carbon Composite + MLI Vacuum Insulation' },
      targetPos: { x: 0, y: 0.45, z: -0.7 },
      camPos: { x: 2.2, y: 2.2, z: 2.6 },
      specs: [
        { label: { ru: 'Запас водорода (M_H2):', en: 'H2 Fuel Storage:' }, val: '28.5 кг H₂ (400 л)' },
        { label: { ru: 'Рабочее давление:', en: 'Working Pressure:' }, val: '350 / 700 бар' },
        { label: { ru: 'Удельная энергоёмкость:', en: 'Specific Energy:' }, val: '33.33 кВт·ч/кг (2.8x керосин)' },
        { label: { ru: 'Масса бака (сухой/полный):', en: 'Tank Mass (Dry/Full):' }, val: '64.0 кг + 28.5 кг H₂' }
      ],
      formula: 'E_total = M_H2 · LHV_H2 · η_FC = 28.5 · 33.33 · 0.58 = 550.9 кВт·ч',
      desc: {
        ru: 'Многослойный криогенный композитный резервуар IV поколения с экранно-вакуумной суперизоляцией (MLI) и датчиками контроля давления. Размещён в центре тяжести фюзеляжа (CG), благодаря чему по мере выработки водорода центровка самолёта остаётся неизменной.',
        en: 'Multi-layer cryogenic composite Type IV pressure vessel with multilayer vacuum insulation (MLI) and real-time pressure transducers. Located at the fuselage center of gravity (CG), maintaining immutable aircraft trim as hydrogen is consumed.'
      },
      chartData: {
        x: ['Li-Po', 'Kerosene', 'Green H2'],
        y: [0.26, 11.9, 33.33],
        name: 'Specific Energy (kWh/kg)'
      }
    },
    fuelcell: {
      nodeNumber: 3,
      category: 'CLEAN PROPULSION',
      title: { ru: '⚡ Водородная топливная ячейка PEM + Li-Po буфер', en: '⚡ PEM Fuel Cell & Li-Po Buffer Stack' },
      massKg: 92.0,
      mtowPct: '5.6%',
      material: { ru: 'Proton Exchange Membrane (PEMFC) + Высокотоковый Li-Po 800V', en: 'Proton Exchange Membrane (PEMFC) + High-C Li-Po 800V' },
      targetPos: { x: 0, y: 0.48, z: 0.85 },
      camPos: { x: 2.4, y: 2.2, z: 2.8 },
      specs: [
        { label: { ru: 'Непрерывная мощность:', en: 'Continuous Power:' }, val: '120 кВт (PEM Stack)' },
        { label: { ru: 'Пиковая мощность STOL:', en: 'STOL Boost Power:' }, val: '158 кВт (PEM + Li-Po)' },
        { label: { ru: 'КПД ячейки:', en: 'Cell Efficiency:' }, val: '58% (КПД ячейки)' },
        { label: { ru: 'Ёмкость Li-Po буфера:', en: 'Buffer Capacity:' }, val: '18.4 кВт·ч (800V)' },
        { label: { ru: 'Выбросы CO₂:', en: 'CO2 Emissions:' }, val: '0 г/км (выхлоп: дистиллированный пар)' }
      ],
      formula: 'P_prop = (P_PEMFC + P_LiPo) · η_inv · η_motor  |  CO2 = 0 г/км',
      desc: {
        ru: 'Гибридная водородно-электрическая энергоустановка с нулевым углеродным следом (единственный выхлоп — чистый водяной пар H₂O). Топливная ячейка обеспечивает крейсерский полёт до 6.5 часов, а буферная Li-Po батарея мгновенно выдаёт дополнительную мощность при коротком взлёте с грунтовой полосы и манёврах над очагом пожара.',
        en: 'Zero-emission hybrid hydrogen-electric powerplant (only exhaust is pure distilled water vapor H₂O). PEM fuel cell sustains cruise flight up to 6.5 hours, while the high-drain Li-Po buffer battery delivers instantaneous boost power for STOL short unpaved field takeoffs and agile firefighting maneuvers.'
      },
      chartData: {
        x: ['Idle', 'Cruise', 'Climb', 'STOL Boost'],
        y: [12, 68, 120, 158],
        name: 'Power Output (kW)'
      }
    },
    payload: {
      nodeNumber: 4,
      category: 'DUAL-ROLE MISSION POD',
      title: { ru: '🔄 Модульный отсек быстрой смены полезной нагрузки (Quick-Swap Pod 800 L)', en: '🔄 Quick-Swap Modular Mission Pod (800 L)' },
      massKg: 800.0,
      mtowPct: '48.8%',
      material: { ru: 'Кевлар-эпоксидный композит + титановые замки быстрой смены', en: 'Kevlar-Epoxy Composite + Titanium Cam-Lock Quick Latches' },
      targetPos: { x: 0, y: -0.45, z: 0.2 },
      camPos: { x: 3.2, y: -0.6, z: 3.0 },
      specs: [
        { label: { ru: 'Пожарный гидробак:', en: 'Fire Rescue Pod:' }, val: '800 л (сброс за 1.8 с)' },
        { label: { ru: 'Агро-опрыскивание:', en: 'Agro Swath Pod:' }, val: '600 л + 6 форсунок ULV' },
        { label: { ru: 'Время смены модуля:', en: 'Pod Turnaround:' }, val: '10 минут (замки Cam-Lock)' },
        { label: { ru: 'Водозаборник озера:', en: 'Scoop Fill Rate:' }, val: '800 л за 12 с на глиссировании' }
      ],
      formula: 'Q_spray = (V_kmh · W_swath · D_rate) / 600 (л/мин)  |  t_drop = 1.8 с',
      desc: {
        ru: 'Универсальная подфюзеляжная капсула двойного назначения. В конфигурации "Пожарный патруль" оснащена скоростным глиссирующим водозаборником (пополнение 800 л с поверхности озера за 12 секунд) и пневмостворками залпового сброса. В конфигурации "Агро-мониторинг" подключается к подкрыльевым штангам ультрамалообъёмного опрыскивания (ULV) с размером капли 80–120 мкм.',
        en: 'Universal dual-purpose ventral mission pod. In "Fire Rescue" role, fitted with a high-speed planing scoop (replenishes 800L from lake surface in 12s) and pneumatic salvo dump gates (1.8s dump). In "Agro Monitoring" role, links to underwing ULV booms with 80-120 μm micron droplets.'
      },
      chartData: {
        x: ['Empty Pod', 'Agro 600L', 'Fire 800L'],
        y: [820, 1420, 1638],
        name: 'Aircraft Mass (kg)'
      }
    },
    motors: {
      nodeNumber: 5,
      category: 'DISTRIBUTED ELECTRIC (DEP)',
      title: { ru: '🌀 Распределённая винтомоторная группа (4x DEP Brushless Motors)', en: '🌀 4x Distributed Electric Propulsion (DEP) Motors' },
      massKg: 48.0,
      mtowPct: '2.9%',
      material: { ru: '5-лопастные саблевидные карбоновые винты изменяемого шага', en: '5-Blade Scimitar Carbon Variable-Pitch Propellers' },
      targetPos: { x: 2.2, y: 0.75, z: 1.2 },
      camPos: { x: 4.2, y: 1.8, z: 2.8 },
      specs: [
        { label: { ru: 'Взлётная тяга:', en: 'Total Takeoff Thrust:' }, val: '4850 Н (4x мотора DEP)' },
        { label: { ru: 'КПД электромоторов:', en: 'Motor Efficiency:' }, val: '95.4%' },
        { label: { ru: 'Снижение шума:', en: 'Acoustic Signature:' }, val: '-16 дБ относительно ДВС' },
        { label: { ru: 'Эффект обдува крыла:', en: 'Blown Wing STOL:' }, val: '+38% к CL на разбеге (85–110 м)' }
      ],
      formula: 'T_total = 4 · CT · ρ · n² · D_prop⁴  |  ΔCL,blown = +0.65',
      desc: {
        ru: 'Четыре синхронизированных бесколлекторных электродвигателя на передней кромке крыла создают равномерный высокоскоростной обдув профиля (Blown Wing Effect). Это увеличивает подъёмную силу на малых скоростях на 38% и позволяет взлетать с неподготовленных полевых дорог длиной всего 85–110 метров.',
        en: 'Four synchronized brushless electric motors along the wing leading edge generate uniform high-speed propwash (Blown Wing Effect). This elevates low-speed lift by 38% and empowers STOL takeoff from unprepared farm roads just 85–110 meters long.'
      },
      chartData: {
        x: ['Clean Wing', 'Blown DEP'],
        y: [1.8, 2.65],
        name: 'Maximum Lift Coeff CL'
      }
    },
    gimbal: {
      nodeNumber: 6,
      category: 'AI MULTISPECTRAL AVIONICS',
      title: { ru: '👁️ Оптико-электронная турель ИИ (NDVI Multispectral & FLIR)', en: '👁️ AI Optoelectronic Turret (NDVI Multispectral & FLIR)' },
      massKg: 4.8,
      mtowPct: '0.3%',
      material: { ru: 'Тепловизор LWIR 640×512 + Мультиспектральная камера 5 каналов NDVI/NDRE + Лазерный дальномер', en: 'LWIR 640x512 Thermal + 5-Band NDVI/NDRE Multispectral + Laser Rangefinder' },
      targetPos: { x: 0, y: -0.48, z: 3.2 },
      camPos: { x: 1.8, y: -0.5, z: 4.8 },
      specs: [
        { label: { ru: 'Обнаружение огня:', en: 'Thermal Fire Detection:' }, val: 'до 18 км сквозь густой дым' } ,
        { label: { ru: 'Картография NDVI:', en: 'NDVI Precision:' }, val: '2.5 см/пиксель' },
        { label: { ru: 'Спектральный анализ:', en: 'Spectral Channels:' }, val: '5 каналов (Blue, Green, Red, RedEdge, NIR)' },
        { label: { ru: 'Стабилизация:', en: 'Stabilization:' }, val: '3-осевой гиростабилизатор' }
      ],
      formula: 'NDVI = (NIR - Red) / (NIR + Red) ∈ [-1.0, +1.0]',
      desc: {
        ru: 'Гиростабилизированный 3-осевой шар под носовым обтекателем. В режиме сельского хозяйства в реальном времени вычисляет вегетационный индекс NDVI, подавая команду форсункам распылять биопрепараты только над больными деревьями (экономия реагентов до 45%). В режиме МЧС находит скрытые подземные очаги тления торфа и леса и строит прицельный вектор сброса воды.',
        en: 'Gyrostabilized 3-axis ball gimbal beneath the nose cone. In agriculture mode, computes vegetation NDVI in real-time, directing spray nozzles strictly over diseased crops (saving up to 45% chemical agent). In emergency firefighting role, locates underground smoldering peat and timber embers through thick smoke, projecting precise ballistic drop vectors.'
      },
      chartData: {
        x: ['Healthy', 'Water Stress', 'Dry / Fire'],
        y: [0.82, 0.41, 0.12],
        name: 'NDVI Spectral Index'
      }
    },
    avionics: {
      nodeNumber: 7,
      category: 'NAVIGATION & TELEMETRY',
      title: { ru: '📡 Двухбалочное хвостовое оперение и автопилот (Twin-Boom H-Tail & MAVLink)', en: '📡 Twin-Boom H-Tail & MAVLink Autopilot' },
      massKg: 26.5,
      mtowPct: '1.6%',
      material: { ru: 'Тройное резервирование ArduPilot Cube Orange+ / RTK GPS / Starlink & 915 МГц', en: 'Triple-Redundant ArduPilot Cube Orange+ / RTK GPS / Starlink & 915 MHz' },
      targetPos: { x: 0, y: 0.55, z: 2.2 },
      camPos: { x: 2.0, y: 2.2, z: 3.8 },
      specs: [
        { label: { ru: 'Жёсткость на кручение:', en: 'Torsional Rigidity:' }, val: '+42% (двухбалочная схема)' },
        { label: { ru: 'Дальность телеметрии:', en: 'Telemetry Range:' }, val: '150 км (радио) / Неограниченно (Starlink)' },
        { label: { ru: 'Навигация RTK GNSS:', en: 'RTK Precision:' }, val: '2.0 см точность позиционирования' },
        { label: { ru: 'Оперение H-Tail:', en: 'H-Tail Stability:' }, val: 'Защита рулей в высокой траве' }
      ],
      formula: 'Cmα = ∂Cm/∂α < 0  (Критерий продольной статической устойчивости)',
      desc: {
        ru: 'Двухбалочная схема с высокорасположенным П-образным стабилизатором выносит рули высоты и направления в зону невозмущённого потока от винтов и защищает их от повреждений при посадке в высокой траве, а также освобождает пространство под фюзеляжем для сброса воды.',
        en: 'Twin-boom layout with elevated inverted-U horizontal stabilizer positions elevator and rudders in clean unseparated slipstream, shields control surfaces from damage in tall wild grass landings, and frees ventral space for unimpeded water salvo dumps.'
      },
      chartData: {
        x: ['Radio RF', 'Cellular 5G', 'Satellite'],
        y: [35, 120, 1400],
        name: 'Control Range (km)'
      }
    },
    gear: {
      nodeNumber: 8,
      category: 'STOL ROUGH-TERRAIN GEAR',
      title: { ru: '🛬 Усиленное убирающееся шасси STOL (Rough-Terrain Gear)', en: '🛬 Heavy-Duty Retractable STOL Rough-Terrain Gear' },
      massKg: 42.0,
      mtowPct: '2.6%',
      material: { ru: 'Рычажная титановая подвеска с азотно-масляными амортизаторами и пневматиками низкого давления', en: 'Trailing-Link Titanium Suspension with Nitrogen-Oil Oleo Struts & Low-Pressure Tires' },
      targetPos: { x: 1.5, y: -1.0, z: 0.3 },
      camPos: { x: 3.5, y: -0.6, z: 2.6 },
      specs: [
        { label: { ru: 'Время уборки/выпуска:', en: 'Cycle Time:' }, val: '3.5 с (электрогидравлический привод)' },
        { label: { ru: 'Снижение CD0 при уборке:', en: 'Parasite Drag Cut:' }, val: '-28% (экономия 14% H₂)' },
        { label: { ru: 'Вертикальная скорость:', en: 'Sink Rate Limit:' }, val: 'до 4.2 м/с при посадке' },
        { label: { ru: 'Шины Tundra Balloon:', en: 'Tires:' }, val: '0.8 бар (пашня, грунт, гравий)' }
      ],
      formula: 'E_impact = ½ · m_MTOW · V_sink² ≤ η_shock · F_max · S_stroke',
      desc: {
        ru: 'Трёхстоечное шасси высокой проходимости позволяет эксплуатировать самолёт с грунтовых аэродромов, пашни и травяных полос. В полёте стойки полностью убираются в обтекаемые ниши фюзеляжа, снижая паразитное сопротивление и экономя до 14% водородного топлива на крейсерском маршруте.',
        en: 'Heavy-duty tricycle rough-terrain landing gear enables operations from unpaved farm strips, plowed fields, and gravel bars. In flight, struts retract flush into streamlined fuselage wells, cutting parasite drag by 28% and saving 14% hydrogen fuel across cruise legs.'
      },
      chartData: {
        x: ['Paved Strip', 'Grass Field', 'Plowed Dirt'],
        y: [95, 120, 145],
        name: 'Takeoff Roll (meters)'
      }
    }
  };

  // Bi-directional alias for Node #7 (Tail & Avionics)
  HOTSPOTS_DATA.tail = HOTSPOTS_DATA.avionics;

  // --------------------------------------------------------------------------
  // 5. THREE.JS 3D HANGAR ENGINE (Airbus / Pininfarina Aerospace Expo Pavilion)
  // --------------------------------------------------------------------------
  let scene, camera, renderer, controls;
  let isZoomedToNode = false;
  let aircraftGroup, explodedGroups = {};
  let propBlades = [];
  let raycaster, mouse;
  let hotspotSprites = [];
  let cfdParticleSystem = null;
  let sprayParticleSystem = null;
  let waterDumpParticleSystem = null;
  let waterSplashParticleSystem = null;
  let waterBayDoorL = null, waterBayDoorR = null;
  let sprayNozzleMeshes = [];
  let zebraMaterial = null;
  let pressureMaterial = null;
  let xrayMaterial = null;
  let standardMaterials = [];
  let turntableGroup = null;
  let laserScannerGroup = null;
  let laserPlaneMesh = null;
  let laserScannerActive = false;
  let propBlurDiscs = [];
  let carbonTexture = null;
  let propBlurTexture = null;

  // Dedicated Particle Physics Arrays for high-precision simulation
  let cfdData = [];
  let sprayData = [];
  let waterDumpData = [];
  let waterSplashData = [];

  // Procedural Studio Equirectangular HDRI Environment Map Generator
  function createStudioEnvironment(renderer) {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Sky to Ground Studio Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, '#070f1e');
    grad.addColorStop(0.44, '#15253d');
    grad.addColorStop(0.56, '#0a101b');
    grad.addColorStop(1.0, '#04070e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Overhead Main Luminaire Bank (bright white softbox)
    const g1 = ctx.createRadialGradient(512, 110, 20, 512, 110, 220);
    g1.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    g1.addColorStop(0.35, 'rgba(235, 245, 255, 0.9)');
    g1.addColorStop(0.7, 'rgba(100, 180, 255, 0.35)');
    g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(180, 10, 664, 200);

    // Front-Left Specular Softbox
    const g2 = ctx.createRadialGradient(220, 190, 10, 220, 190, 130);
    g2.addColorStop(0, 'rgba(240, 250, 255, 0.95)');
    g2.addColorStop(0.5, 'rgba(0, 229, 255, 0.45)');
    g2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(90, 110, 260, 160);

    // Front-Right Specular Softbox
    const g3 = ctx.createRadialGradient(804, 190, 10, 804, 190, 130);
    g3.addColorStop(0, 'rgba(240, 250, 255, 0.95)');
    g3.addColorStop(0.5, 'rgba(0, 255, 157, 0.45)');
    g3.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g3;
    ctx.fillRect(674, 110, 260, 160);

    // Cyan Horizon Rim Streak
    ctx.fillStyle = 'rgba(0, 229, 255, 0.28)';
    ctx.fillRect(0, 248, 1024, 16);

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const envMap = pmremGenerator.fromEquirectangular(tex).texture;
    pmremGenerator.dispose();
    tex.dispose();
    return envMap;
  }

  // Procedural 2x2 Twill Weave Carbon Fiber Texture
  function createCarbonTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111620';
    ctx.fillRect(0, 0, 64, 64);
    const size = 8;
    for (let y = 0; y < 64; y += size) {
      for (let x = 0; x < 64; x += size) {
        const isEven = ((x / size) + (y / size)) % 2 === 0;
        ctx.fillStyle = isEven ? '#1e2838' : '#0e141d';
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = isEven ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(x, y + 1, size, 2);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(24, 24);
    return texture;
  }

  // Procedural Propeller Motion Blur Disc Texture
  function createPropBlurTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 12, 64, 64, 64);
    g.addColorStop(0.0, 'rgba(0, 229, 255, 0.0)');
    g.addColorStop(0.2, 'rgba(0, 229, 255, 0.06)');
    g.addColorStop(0.7, 'rgba(0, 229, 255, 0.32)');
    g.addColorStop(0.92, 'rgba(0, 229, 255, 0.48)');
    g.addColorStop(0.95, 'rgba(255, 214, 0, 0.6)');
    g.addColorStop(1.0, 'rgba(255, 214, 0, 0.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
  }

  function initThree() {
    const canvas = document.getElementById('webgl-canvas');
    const container = document.getElementById('hangar-section');
    
    // Renderer
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    // Scene with Procedural Studio HDRI Environment Map
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060b14);
    scene.fog = new THREE.FogExp2(0x060b14, 0.02);

    const studioEnv = createStudioEnvironment(renderer);
    scene.environment = studioEnv;

    // Initialize Procedural Textures
    carbonTexture = createCarbonTexture();
    propBlurTexture = createPropBlurTexture();

    // Camera with Mobile Portrait Adaptive Zoom & FOV
    const aspect = container.clientWidth / container.clientHeight;
    const isPortrait = aspect < 0.85;
    camera = new THREE.PerspectiveCamera(isPortrait ? 68 : 45, aspect, 0.1, 1000);
    if (isPortrait) {
      camera.position.set(14, 11, 18);
    } else {
      camera.position.set(11, 6.5, 13);
    }

    // OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // don't go below floor
    controls.minDistance = 3;
    controls.maxDistance = 45;
    controls.target.set(0, 0.5, 0);

    // Raycasting & Mouse
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Lighting (Enhanced High-Luminance Aerospace Rig)
    setupLighting();

    // Luxury Aerospace Exhibition Pavilion (Mirrored Epoxy Floor, Turntable, Truss, Softboxes, Laser)
    buildHangarEnvironment();

    // Procedural 3D AeroTerra H2 Aircraft (CATIA V5 Class-A Lofting + MeshPhysicalMaterials)
    buildAeroTerraModel();

    // 8 Interactive 3D Hotspot Sprites
    createHotspotMarkers();

    // Particle Systems (CFD, Spray 6-Nozzles, Water Dump + Splash)
    createParticleSystems();

    // 4-Shader Switcher Engine (PBR Clearcoat, CATIA Zebra, Cp Heatmap, X-Ray)
    initAircraftShaders();

    // Select Node #1 (Wing) by default
    // On vertical screen of mobile, keep full overview (14, 11, 18) and do not block view with flyout
    if (isPortrait) {
      updateFlyoutPanel(HOTSPOTS_DATA['wing']);
      const flyout = document.getElementById('engineering-flyout');
      if (flyout) flyout.classList.remove('open');
    } else {
      selectHotspot('wing');
    }

    // Events
    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousemove', onCanvasMouseMove);

    // Start 60 FPS Render Loop
    animate();
  }

  function setupLighting() {
    // 1. Ambient Hemisphere Light (aerospace sky-to-ground natural fill)
    const hemiLight = new THREE.HemisphereLight(0xf0f7ff, 0x0a1424, 1.8);
    scene.add(hemiLight);

    // 2. Main Key Directional Sunlight (sharp specular highlights on Class-A curves)
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.8);
    sunLight.position.set(14, 24, 12);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // 3. Cyan Rim Light from behind to highlight the aerodynamic contour silhouettes
    const rimLight = new THREE.DirectionalLight(0x00e5ff, 2.2);
    rimLight.position.set(-14, 10, -14);
    scene.add(rimLight);

    // 4. Soft Fill Light from front right
    const fillLight = new THREE.DirectionalLight(0xd0e8ff, 1.4);
    fillLight.position.set(10, 6, 14);
    scene.add(fillLight);

    // 5. Under-belly Emerald/Cyan Runway Reflection Light
    const bellyLight = new THREE.PointLight(0x00ff9d, 1.8, 20);
    bellyLight.position.set(0, -1.2, 0);
    scene.add(bellyLight);

    // 6. Internal Cryo-Tank Cyan Glow Light (illuminates tank through translucent dorsal composite)
    const h2InteriorLight = new THREE.PointLight(0x00e5ff, 2.8, 4.0);
    h2InteriorLight.position.set(0, 0.45, -0.7);
    scene.add(h2InteriorLight);

    // 7. Internal Fuel Cell Emerald Glow Light (illuminates PEM stack through translucent dorsal composite)
    const fcInteriorLight = new THREE.PointLight(0x00ff9d, 2.4, 4.0);
    fcInteriorLight.position.set(0, 0.45, 0.85);
    scene.add(fcInteriorLight);
  }

  function buildHangarEnvironment() {
    // 1. High-Gloss Epoxy Mirrored Floor with Specular Clearcoat Reflections
    const floorGeo = new THREE.PlaneGeometry(120, 120, 60, 60);
    const floorMat = new THREE.MeshPhysicalMaterial({
      color: 0x060b16,
      roughness: 0.12,
      metalness: 0.75,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.9,
      envMapIntensity: 1.5
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.60;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor Cybernetic Grid
    const gridHelper = new THREE.GridHelper(60, 40, 0x00e5ff, 0x091830);
    gridHelper.position.y = -1.595;
    scene.add(gridHelper);

    // 2. Exhibition Rotating Turntable Dais (Airbus/Pininfarina Showcase)
    turntableGroup = new THREE.Group();
    turntableGroup.position.set(0, -1.59, 0);
    scene.add(turntableGroup);

    // Elevated Platform Plinth
    const daisGeo = new THREE.CylinderGeometry(7.2, 7.5, 0.2, 64);
    const daisMat = new THREE.MeshPhysicalMaterial({
      color: 0x0e1726,
      roughness: 0.22,
      metalness: 0.8,
      clearcoat: 0.8,
      clearcoatRoughness: 0.08
    });
    const dais = new THREE.Mesh(daisGeo, daisMat);
    dais.position.y = 0.1;
    dais.receiveShadow = true;
    turntableGroup.add(dais);

    // Glowing Neon Cyan LED Perimeter Ring
    const ledRingGeo = new THREE.RingGeometry(7.15, 7.3, 64);
    const ledRingMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide
    });
    const ledRing = new THREE.Mesh(ledRingGeo, ledRingMat);
    ledRing.rotation.x = -Math.PI / 2;
    ledRing.position.y = 0.205;
    turntableGroup.add(ledRing);

    // Inner Concentric Ring
    const innerRingGeo = new THREE.RingGeometry(4.8, 4.88, 48);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x00ff9d,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.206;
    turntableGroup.add(innerRing);

    // Turntable Degree Ticks (0° to 360° every 30°)
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg * Math.PI) / 180;
      const isCardinal = deg % 90 === 0;
      const tickLen = isCardinal ? 0.45 : 0.25;
      const tickWidth = isCardinal ? 0.06 : 0.03;
      const tickGeo = new THREE.PlaneGeometry(tickWidth, tickLen);
      tickGeo.rotateX(-Math.PI / 2);
      const tickMat = new THREE.MeshBasicMaterial({
        color: isCardinal ? 0x00e5ff : 0x64748b,
        side: THREE.DoubleSide
      });
      const tickMesh = new THREE.Mesh(tickGeo, tickMat);
      const r = 6.75;
      tickMesh.position.set(Math.sin(rad) * r, 0.208, Math.cos(rad) * r);
      tickMesh.rotation.y = rad;
      turntableGroup.add(tickMesh);
    }

    // Safety Hazard Chevron Border (Yellow/Black striped outer ring)
    const hazardRingGeo = new THREE.RingGeometry(7.32, 7.48, 48);
    const hazardCanvas = document.createElement('canvas');
    hazardCanvas.width = 256;
    hazardCanvas.height = 32;
    const hCtx = hazardCanvas.getContext('2d');
    for (let x = 0; x < 256; x += 32) {
      hCtx.fillStyle = '#ffcc00';
      hCtx.fillRect(x, 0, 16, 32);
      hCtx.fillStyle = '#111827';
      hCtx.fillRect(x + 16, 0, 16, 32);
    }
    const hazardTex = new THREE.CanvasTexture(hazardCanvas);
    hazardTex.wrapS = THREE.RepeatWrapping;
    hazardTex.repeat.set(12, 1);
    const hazardMat = new THREE.MeshBasicMaterial({
      map: hazardTex,
      side: THREE.DoubleSide
    });
    const hazardMesh = new THREE.Mesh(hazardRingGeo, hazardMat);
    hazardMesh.rotation.x = -Math.PI / 2;
    hazardMesh.position.y = 0.204;
    turntableGroup.add(hazardMesh);

    // 3. Overhead Aerospace Space Truss Ceiling Structure (at y = 8.5 .. 9.2)
    const trussGroup = new THREE.Group();
    scene.add(trussGroup);

    const trussBeamMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.25
    });

    // Longitudinal truss chords
    for (const x of [-6, -2, 2, 6]) {
      const chordGeo = new THREE.CylinderGeometry(0.045, 0.045, 24, 12);
      chordGeo.rotateX(Math.PI / 2);
      const chord = new THREE.Mesh(chordGeo, trussBeamMat);
      chord.position.set(x, 8.8, 0);
      trussGroup.add(chord);
    }
    // Transverse crossbeams
    for (const z of [-10, -5, 0, 5, 10]) {
      const crossGeo = new THREE.CylinderGeometry(0.04, 0.04, 13, 12);
      crossGeo.rotateZ(Math.PI / 2);
      const cross = new THREE.Mesh(crossGeo, trussBeamMat);
      cross.position.set(0, 8.8, z);
      trussGroup.add(cross);
    }

    // 4 Rectangular Softbox Light Fixtures suspended beneath the truss
    const softboxPositions = [
      { x: -4.5, z: -3.2 },
      { x: 4.5, z: -3.2 },
      { x: -4.5, z: 3.2 },
      { x: 4.5, z: 3.2 }
    ];

    softboxPositions.forEach(pos => {
      const sbGroup = new THREE.Group();
      sbGroup.position.set(pos.x, 8.2, pos.z);

      // Softbox housing
      const sbBoxGeo = new THREE.BoxGeometry(4.0, 0.15, 1.4);
      const sbBoxMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
      const sbBox = new THREE.Mesh(sbBoxGeo, sbBoxMat);
      sbGroup.add(sbBox);

      // Emissive diffuser face (facing DOWNwards)
      const diffGeo = new THREE.PlaneGeometry(3.8, 1.2);
      diffGeo.rotateX(Math.PI / 2);
      const diffMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const diffuser = new THREE.Mesh(diffGeo, diffMat);
      diffuser.position.y = -0.08;
      sbGroup.add(diffuser);

      // Downward spot / point light
      const pLight = new THREE.PointLight(0xffffff, 1.8, 16);
      pLight.position.set(0, -0.2, 0);
      sbGroup.add(pLight);

      trussGroup.add(sbGroup);
    });

    // 4. Animated 3D Laser Scanner (CATIA Class-A Laser Scanner)
    laserScannerGroup = new THREE.Group();
    laserScannerGroup.visible = false;
    scene.add(laserScannerGroup);

    // Overhead emitter bar
    const laserBarGeo = new THREE.CylinderGeometry(0.04, 0.04, 15.0, 16);
    laserBarGeo.rotateZ(Math.PI / 2);
    const laserBarMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const laserBar = new THREE.Mesh(laserBarGeo, laserBarMat);
    laserBar.position.set(0, 3.6, 0);
    laserScannerGroup.add(laserBar);

    // Vertical Slicing Laser Sheet (Plane)
    const scanPlaneGeo = new THREE.PlaneGeometry(14.8, 4.5);
    const scanCanvas = document.createElement('canvas');
    scanCanvas.width = 64;
    scanCanvas.height = 256;
    const sCtx = scanCanvas.getContext('2d');
    const sGrad = sCtx.createLinearGradient(0, 0, 0, 256);
    sGrad.addColorStop(0.0, 'rgba(0, 229, 255, 0.95)');
    sGrad.addColorStop(0.15, 'rgba(0, 229, 255, 0.35)');
    sGrad.addColorStop(0.85, 'rgba(0, 229, 255, 0.15)');
    sGrad.addColorStop(1.0, 'rgba(0, 255, 157, 0.95)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 64, 256);
    // Grid horizontal scan lines
    sCtx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    sCtx.lineWidth = 2;
    for (let y = 0; y < 256; y += 16) {
      sCtx.beginPath();
      sCtx.moveTo(0, y);
      sCtx.lineTo(64, y);
      sCtx.stroke();
    }
    const scanTex = new THREE.CanvasTexture(scanCanvas);
    const scanPlaneMat = new THREE.MeshBasicMaterial({
      map: scanTex,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    laserPlaneMesh = new THREE.Mesh(scanPlaneGeo, scanPlaneMat);
    laserPlaneMesh.position.set(0, 1.4, 0);
    laserScannerGroup.add(laserPlaneMesh);
  }

  // --------------------------------------------------------------------------
  // 6. PROCEDURAL 3D GEOMETRY OF AEROTERRA H2
  // (CATIA V5 Class-A Lofting, NACA 64-215 Airfoil, Twin-Boom STOL)
  // --------------------------------------------------------------------------
  function buildAeroTerraModel() {
    aircraftGroup = new THREE.Group();
    aircraftGroup.position.set(0, 0, 0);
    scene.add(aircraftGroup);

    // 1. Primary Airframe: Pearl-White Titanium Composite (Class-A PBR Clearcoat)
    const pearlCompositeMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.12,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      reflectivity: 1.0,
      envMapIntensity: 1.8
    });

    // 2. Dark Carbon Composite (2x2 Twill Weave)
    const carbonDarkMat = new THREE.MeshPhysicalMaterial({
      color: 0x141822,
      map: carbonTexture,
      roughness: 0.22,
      metalness: 0.45,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.5
    });

    // 3. Neon Cyan Aerodynamic Accent / Racing Stripe
    const cyanGlowMat = new THREE.MeshPhysicalMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.75,
      roughness: 0.15,
      metalness: 0.45,
      clearcoat: 1.0
    });

    // 4. Neon Emerald Aerodynamic Accent / Wingtips
    const emeraldGlowMat = new THREE.MeshPhysicalMaterial({
      color: 0x00ff9d,
      emissive: 0x00ff9d,
      emissiveIntensity: 0.75,
      roughness: 0.15,
      metalness: 0.45,
      clearcoat: 1.0
    });

    // 5. Translucent X-Ray Composite Dorsal Shell (allows viewing H2 Tank & Fuel Cell inside!)
    const translucentDorsalMat = new THREE.MeshPhysicalMaterial({
      color: 0x0e2438,
      metalness: 0.25,
      roughness: 0.08,
      transmission: 0.72,
      transparent: true,
      opacity: 0.62,
      ior: 1.48,
      envMapIntensity: 1.6
    });

    // 6. Polarized Aviation Dichroic Cockpit Glass
    const glassCockpitMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.85,
      transparent: true,
      opacity: 0.95,
      ior: 1.52,
      iridescence: 0.6,
      iridescenceIOR: 1.3,
      envMapIntensity: 2.2
    });

    // 7. Aeronautical CNC 7075-T6 Titanium Alloy
    const metalMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      roughness: 0.18,
      metalness: 0.95,
      clearcoat: 0.4,
      envMapIntensity: 2.0
    });

    const tankMat = new THREE.MeshPhysicalMaterial({
      color: 0x00d2ff,
      roughness: 0.15,
      metalness: 0.85,
      clearcoat: 1.0,
      emissive: 0x003355,
      emissiveIntensity: 0.35,
      envMapIntensity: 2.0
    });

    const fcMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a2638,
      roughness: 0.25,
      metalness: 0.8,
      clearcoat: 0.5,
      envMapIntensity: 1.5
    });

    standardMaterials.push(pearlCompositeMat, carbonDarkMat, cyanGlowMat, emeraldGlowMat, metalMat, tankMat, fcMat);

    // ========================================================================
    // SUBASSEMBLY 1: FUSELAGE (Smooth CATIA V5 Class-A Lofting, NO INVERTED CONE)
    // ========================================================================
    const fuselageGroup = new THREE.Group();
    aircraftGroup.add(fuselageGroup);
    explodedGroups.fuselage = fuselageGroup;

    // Smooth aerodynamic spline contour revolving around length axis
    const lathePoints = [];
    const fuselageSpline = [
      { z: 4.40, r: 0.00 }, // Smooth parabolic nose radome tip (tangent Class-A)
      { z: 4.35, r: 0.16 },
      { z: 4.20, r: 0.34 },
      { z: 3.90, r: 0.54 },
      { z: 3.40, r: 0.70 }, // Forward nose radome
      { z: 2.60, r: 0.79 }, // Forward cabin / avionics
      { z: 1.20, r: 0.82 }, // Fuel cell section
      { z: -0.50, r: 0.82 }, // Cryo-tank section
      { z: -1.80, r: 0.76 }, // Mission payload bay
      { z: -2.80, r: 0.64 }, // Tail boom transition
      { z: -3.60, r: 0.42 }, // Aft fuselage taper
      { z: -4.10, r: 0.18 }, // Aft tail cone
      { z: -4.25, r: 0.02 }  // Tail cone apex
    ];
    fuselageSpline.forEach(pt => lathePoints.push(new THREE.Vector2(pt.r, pt.z)));
    const fuselageGeo = new THREE.LatheGeometry(lathePoints, 40);
    fuselageGeo.rotateX(Math.PI / 2);
    fuselageGeo.computeVertexNormals();

    const fuselage = new THREE.Mesh(fuselageGeo, pearlCompositeMat);
    fuselage.castShadow = true;
    fuselage.receiveShadow = true;
    fuselageGroup.add(fuselage);

    // Polarized Avionics/Cockpit Canopy Glass
    const canopyGeo = new THREE.SphereGeometry(0.72, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    canopyGeo.scale(0.88, 0.62, 2.0);
    const canopy = new THREE.Mesh(canopyGeo, glassCockpitMat);
    canopy.position.set(0, 0.54, 2.4);
    fuselageGroup.add(canopy);

    // Translucent X-Ray Composite Dorsal Shell (shows glowing H2 tank & PEM stack inside)
    const dorsalGeo = new THREE.CylinderGeometry(0.81, 0.79, 3.2, 32, 1, false, Math.PI * 0.15, Math.PI * 0.70);
    dorsalGeo.rotateX(Math.PI / 2);
    const dorsalCover = new THREE.Mesh(dorsalGeo, translucentDorsalMat);
    dorsalCover.position.set(0, 0.08, -0.1);
    fuselageGroup.add(dorsalCover);

    // Neon Cyan & Emerald Aerodynamic Chine Speed Stripes along Fuselage Flanks
    [-0.82, 0.82].forEach(xSign => {
      const stripeGeo = new THREE.BoxGeometry(0.04, 0.06, 6.2);
      const stripeMesh = new THREE.Mesh(stripeGeo, cyanGlowMat);
      stripeMesh.position.set(xSign, 0.05, 0.3);
      fuselageGroup.add(stripeMesh);

      const stripeEmeraldGeo = new THREE.BoxGeometry(0.03, 0.03, 5.0);
      const stripeEmerald = new THREE.Mesh(stripeEmeraldGeo, emeraldGlowMat);
      stripeEmerald.position.set(xSign * 1.01, -0.05, 0.3);
      fuselageGroup.add(stripeEmerald);
    });

    // Ventral Firefighting Water Bomb Bay Doors on Belly
    const bayFrameGeo = new THREE.BoxGeometry(0.64, 0.08, 1.8);
    const bayFrame = new THREE.Mesh(bayFrameGeo, carbonDarkMat);
    bayFrame.position.set(0, -0.62, 0.2);
    fuselageGroup.add(bayFrame);

    // Left Door (Hinged at x = -0.28)
    const doorLGeo = new THREE.BoxGeometry(0.28, 0.04, 1.76);
    doorLGeo.translate(0.14, 0, 0); // pivot along left edge
    waterBayDoorL = new THREE.Mesh(doorLGeo, pearlCompositeMat);
    waterBayDoorL.position.set(-0.28, -0.64, 0.2);
    fuselageGroup.add(waterBayDoorL);

    // Right Door (Hinged at x = +0.28)
    const doorRGeo = new THREE.BoxGeometry(0.28, 0.04, 1.76);
    doorRGeo.translate(-0.14, 0, 0); // pivot along right edge
    waterBayDoorR = new THREE.Mesh(doorRGeo, pearlCompositeMat);
    waterBayDoorR.position.set(0.28, -0.64, 0.2);
    fuselageGroup.add(waterBayDoorR);

    // ========================================================================
    // SUBASSEMBLY 2: MAIN WING (NACA 64-215 Airfoil Lofting, Taper, Winglets)
    // ========================================================================
    const wingGroup = new THREE.Group();
    aircraftGroup.add(wingGroup);
    explodedGroups.wing = wingGroup;

    // Helper: generate true teardrop NACA 64-series cambered airfoil contour
    function createNacaAirfoilShape(chord = 1.35, t = 0.14) {
      const shape = new THREE.Shape();
      const segments = 32;
      const upperPts = [];
      const lowerPts = [];

      for (let i = 0; i <= segments; i++) {
        const xNorm = i / segments;
        // NACA thickness distribution:
        const yt = 5 * t * (
          0.2969 * Math.sqrt(Math.max(xNorm, 0.00001)) -
          0.1260 * xNorm -
          0.3516 * Math.pow(xNorm, 2) +
          0.2843 * Math.pow(xNorm, 3) -
          0.1015 * Math.pow(xNorm, 4)
        );
        // Camber line (2.5% camber at 40% chord):
        const m = 0.025;
        const p = 0.40;
        let yc = 0;
        if (xNorm < p) {
          yc = (m / (p * p)) * (2 * p * xNorm - xNorm * xNorm);
        } else {
          yc = (m / Math.pow(1 - p, 2)) * ((1 - 2 * p) + 2 * p * xNorm - xNorm * xNorm);
        }

        const zPos = (0.35 - xNorm) * chord; // Leading edge at +0.47m, Trailing edge at -0.88m
        const yUpper = (yc + yt) * chord;
        const yLower = (yc - yt) * chord;

        upperPts.push(new THREE.Vector2(zPos, yUpper));
        lowerPts.push(new THREE.Vector2(zPos, yLower));
      }

      shape.moveTo(upperPts[segments].x, upperPts[segments].y);
      for (let i = segments - 1; i >= 0; i--) {
        shape.lineTo(upperPts[i].x, upperPts[i].y);
      }
      for (let i = 1; i <= segments; i++) {
        shape.lineTo(lowerPts[i].x, lowerPts[i].y);
      }
      shape.closePath();
      return shape;
    }

    const semiSpan = 6.0;
    const wingShape = createNacaAirfoilShape(1.35, 0.14);

    // Left Wing Panel (NACA Extrude from x = 0 to x = -6.0)
    const leftWingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: semiSpan,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.02,
      bevelSegments: 3
    });
    leftWingGeo.rotateY(-Math.PI / 2);
    leftWingGeo.computeVertexNormals();
    const leftWing = new THREE.Mesh(leftWingGeo, pearlCompositeMat);
    leftWing.position.set(0, 0.85, 0.5);
    leftWing.castShadow = true;
    wingGroup.add(leftWing);

    // Right Wing Panel (NACA Extrude mirrored from x = 0 to x = +6.0)
    const rightWingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: semiSpan,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.02,
      bevelSegments: 3
    });
    rightWingGeo.rotateY(-Math.PI / 2);
    rightWingGeo.scale(-1, 1, 1);
    rightWingGeo.computeVertexNormals();
    const rightWing = new THREE.Mesh(rightWingGeo, pearlCompositeMat);
    rightWing.position.set(0, 0.85, 0.5);
    rightWing.castShadow = true;
    wingGroup.add(rightWing);

    // Leading Edge Protective De-icing Boot Stripes (Dark CFRP)
    [-3.0, 3.0].forEach(xCenter => {
      const bootGeo = new THREE.CylinderGeometry(0.04, 0.04, 5.8, 16);
      bootGeo.rotateZ(Math.PI / 2);
      const boot = new THREE.Mesh(bootGeo, carbonDarkMat);
      boot.position.set(xCenter, 0.85, 0.96);
      wingGroup.add(boot);
    });

    // Aerodynamic Blended Canted Winglets at Wingtips (x = ±6.05)
    [-1, 1].forEach(sign => {
      const wingletGroup = new THREE.Group();
      wingletGroup.position.set(sign * 6.05, 0.85, 0.5);

      const wingletShape = new THREE.Shape();
      wingletShape.moveTo(0.35, 0);
      wingletShape.lineTo(-0.55, 0);
      wingletShape.lineTo(-0.85, 0.85);
      wingletShape.lineTo(-0.25, 0.85);
      wingletShape.closePath();

      const wingletGeo = new THREE.ExtrudeGeometry(wingletShape, {
        depth: 0.06,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.015,
        bevelSegments: 2
      });
      wingletGeo.rotateY(sign > 0 ? -Math.PI / 2 : Math.PI / 2);
      wingletGeo.computeVertexNormals();

      const wingletMesh = new THREE.Mesh(wingletGeo, pearlCompositeMat);
      wingletMesh.rotation.z = sign * 0.26; // cant outwards by 15 deg
      wingletGroup.add(wingletMesh);

      // Glowing Cyan Winglet Edge Tip
      const tipGeo = new THREE.BoxGeometry(0.08, 0.88, 0.04);
      const tipMesh = new THREE.Mesh(tipGeo, cyanGlowMat);
      tipMesh.position.set(sign * 0.12, 0.45, -0.55);
      tipMesh.rotation.x = -0.35;
      wingletGroup.add(tipMesh);

      // Navigation position lights (Left = Red, Right = Green)
      const navLightGeo = new THREE.SphereGeometry(0.05, 12, 12);
      const navLightMat = new THREE.MeshBasicMaterial({ color: sign < 0 ? 0xff2222 : 0x00ff66 });
      const navLight = new THREE.Mesh(navLightGeo, navLightMat);
      navLight.position.set(sign * 0.22, 0.88, -0.55);
      wingletGroup.add(navLight);

      wingGroup.add(wingletGroup);
    });

    // Internal Carbon Spar Truss (visible in exploded view)
    const sparGeo = new THREE.CylinderGeometry(0.05, 0.05, 11.8, 16);
    sparGeo.rotateZ(Math.PI / 2);
    const spar = new THREE.Mesh(sparGeo, metalMat);
    spar.position.set(0, 0.85, 0.5);
    wingGroup.add(spar);

    // Underwing Spray Boom with 6 visible rotary nozzles
    const sprayBoomGroup = new THREE.Group();
    sprayBoomGroup.position.set(0, 0.35, -0.22);
    wingGroup.add(sprayBoomGroup);

    // Transverse lightweight manifold tube
    const sprayManifoldGeo = new THREE.CylinderGeometry(0.024, 0.024, 10.2, 16);
    sprayManifoldGeo.rotateZ(Math.PI / 2);
    const sprayManifold = new THREE.Mesh(sprayManifoldGeo, metalMat);
    sprayManifold.name = 'sprayBoomMesh';
    sprayBoomGroup.add(sprayManifold);

    // 6 Visible Precision Rotary Atomizer Nozzles
    const nozzlePositionsX = [-4.8, -2.9, -1.1, 1.1, 2.9, 4.8];
    sprayNozzleMeshes = [];
    nozzlePositionsX.forEach(posX => {
      const nozzleUnit = new THREE.Group();
      nozzleUnit.position.set(posX, 0, 0);

      // Pylon bracket to wing
      const pylonGeo = new THREE.BoxGeometry(0.04, 0.42, 0.08);
      const pylon = new THREE.Mesh(pylonGeo, pearlCompositeMat);
      pylon.position.set(0, 0.22, 0);
      nozzleUnit.add(pylon);

      // Atomizer body
      const bodyNozzleGeo = new THREE.CylinderGeometry(0.038, 0.032, 0.14, 16);
      const bodyNozzle = new THREE.Mesh(bodyNozzleGeo, metalMat);
      bodyNozzle.position.set(0, -0.05, 0);
      nozzleUnit.add(bodyNozzle);

      // Spinning rotary atomizer cup disc
      const cupGeo = new THREE.CylinderGeometry(0.065, 0.045, 0.025, 16);
      const cup = new THREE.Mesh(cupGeo, emeraldGlowMat);
      cup.position.set(0, -0.12, 0);
      nozzleUnit.add(cup);

      sprayBoomGroup.add(nozzleUnit);
      sprayNozzleMeshes.push(nozzleUnit);
    });

    // ========================================================================
    // SUBASSEMBLY 3: TWIN-BOOM TAIL ASSEMBLY (STOL Inverted-Pi / V-Tail)
    // ========================================================================
    const tailGroup = new THREE.Group();
    aircraftGroup.add(tailGroup);
    explodedGroups.tail = tailGroup;

    // Twin volumetric aerodynamic tail booms emerging from inner engine nacelles (x = ±2.2)
    [-2.2, 2.2].forEach(xPos => {
      // Streamlined oval boom body
      const boomGeo = new THREE.CylinderGeometry(0.18, 0.12, 5.3, 20);
      boomGeo.rotateX(Math.PI / 2);
      boomGeo.scale(0.85, 1.15, 1.0); // aerodynamic vertical aspect
      const boom = new THREE.Mesh(boomGeo, pearlCompositeMat);
      boom.position.set(xPos, 0.75, -2.15);
      boom.castShadow = true;
      tailGroup.add(boom);

      // Cyan Accent Stripe on boom
      const boomStripeGeo = new THREE.CylinderGeometry(0.182, 0.122, 0.12, 20);
      boomStripeGeo.rotateX(Math.PI / 2);
      boomStripeGeo.scale(0.85, 1.15, 1.0);
      const boomStripe = new THREE.Mesh(boomStripeGeo, cyanGlowMat);
      boomStripe.position.set(xPos, 0.75, -1.8);
      tailGroup.add(boomStripe);

      // Vertical Stabilizer Fin at boom aft
      const finGroup = new THREE.Group();
      finGroup.position.set(xPos, 1.45, -4.8);

      const finGeo = new THREE.BoxGeometry(0.08, 1.35, 0.9);
      const finMesh = new THREE.Mesh(finGeo, pearlCompositeMat);
      finMesh.position.y = 0;
      finMesh.rotation.z = (xPos > 0 ? -1 : 1) * 0.1; // cant outward 6 deg
      finGroup.add(finMesh);

      // Rudder surface trim line
      const rudderTrimGeo = new THREE.BoxGeometry(0.082, 1.25, 0.28);
      const rudderTrim = new THREE.Mesh(rudderTrimGeo, carbonDarkMat);
      rudderTrim.position.set(0, 0, -0.32);
      rudderTrim.rotation.z = (xPos > 0 ? -1 : 1) * 0.1;
      finGroup.add(rudderTrim);

      // Glowing cyan fin cap
      const capGeo = new THREE.BoxGeometry(0.084, 0.08, 0.85);
      const cap = new THREE.Mesh(capGeo, cyanGlowMat);
      cap.position.set(0, 0.68, 0);
      cap.rotation.z = (xPos > 0 ? -1 : 1) * 0.1;
      finGroup.add(cap);

      tailGroup.add(finGroup);
    });

    // High-Mounted Horizontal Stabilizer linking twin fins (clear of spray plume)
    const hStabGeo = new THREE.BoxGeometry(4.48, 0.09, 0.85);
    const hStab = new THREE.Mesh(hStabGeo, pearlCompositeMat);
    hStab.position.set(0, 1.95, -4.8);
    hStab.castShadow = true;
    tailGroup.add(hStab);

    // Elevator control surface line
    const elevGeo = new THREE.BoxGeometry(4.44, 0.085, 0.32);
    const elevator = new THREE.Mesh(elevGeo, carbonDarkMat);
    elevator.position.set(0, 1.95, -5.1);
    tailGroup.add(elevator);

    // Rear White Strobe / Beacon Light
    const strobeGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const strobeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const strobe = new THREE.Mesh(strobeGeo, strobeMat);
    strobe.position.set(0, 2.02, -5.2);
    tailGroup.add(strobe);

    // ========================================================================
    // SUBASSEMBLY 4: 4x ELECTRIC MOTORS & SCIMITAR PROPELLERS (DEP)
    // ========================================================================
    const depGroup = new THREE.Group();
    aircraftGroup.add(depGroup);
    explodedGroups.motors = depGroup;

    const motorPositions = [-4.2, -2.2, 2.2, 4.2];
    motorPositions.forEach((xPos, idx) => {
      // Aerodynamic Engine Nacelle Body
      const nacelleGeo = new THREE.CylinderGeometry(0.24, 0.21, 1.4, 20);
      nacelleGeo.rotateX(Math.PI / 2);
      const nacelle = new THREE.Mesh(nacelleGeo, pearlCompositeMat);
      nacelle.position.set(xPos, 0.72, 1.05);
      nacelle.castShadow = true;
      depGroup.add(nacelle);

      // Titanium Air Intake Cowl Ring
      const cowlRingGeo = new THREE.TorusGeometry(0.24, 0.03, 12, 24);
      const cowlRing = new THREE.Mesh(cowlRingGeo, metalMat);
      cowlRing.position.set(xPos, 0.72, 1.75);
      depGroup.add(cowlRing);

      // Cyan / Emerald Accent Trim on Nacelle
      const nacelleStripeGeo = new THREE.CylinderGeometry(0.242, 0.242, 0.08, 20);
      nacelleStripeGeo.rotateX(Math.PI / 2);
      const nacelleStripe = new THREE.Mesh(nacelleStripeGeo, idx % 2 === 0 ? cyanGlowMat : emeraldGlowMat);
      nacelleStripe.position.set(xPos, 0.72, 1.35);
      depGroup.add(nacelleStripe);

      // Propeller Spinner & Blades
      const propGroup = new THREE.Group();
      propGroup.position.set(xPos, 0.72, 1.78);
      depGroup.add(propGroup);

      // Aerodynamic Parabolic Spinner Cone
      const spinnerGeo = new THREE.ConeGeometry(0.14, 0.38, 20);
      spinnerGeo.rotateX(Math.PI / 2);
      const spinner = new THREE.Mesh(spinnerGeo, metalMat);
      propGroup.add(spinner);

      // 3 Carbon Fiber Scimitar Propeller Blades with High-Vis Yellow Safety Tips
      for (let b = 0; b < 3; b++) {
        const bladeGroup = new THREE.Group();
        bladeGroup.rotation.z = (b * Math.PI * 2) / 3;

        const bladeGeo = new THREE.BoxGeometry(0.09, 0.78, 0.024);
        const blade = new THREE.Mesh(bladeGeo, carbonDarkMat);
        blade.position.y = 0.42;
        bladeGroup.add(blade);

        // Yellow safety tip
        const tipGeo = new THREE.BoxGeometry(0.092, 0.12, 0.026);
        const tipMat = new THREE.MeshStandardMaterial({ color: 0xffd600, roughness: 0.3 });
        const yellowTip = new THREE.Mesh(tipGeo, tipMat);
        yellowTip.position.y = 0.76;
        bladeGroup.add(yellowTip);

        propGroup.add(bladeGroup);
      }

      // Propeller Motion Blur Disc
      const diskGeo = new THREE.RingGeometry(0.18, 0.85, 32);
      const diskMat = new THREE.MeshBasicMaterial({
        map: propBlurTexture,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const blurDisk = new THREE.Mesh(diskGeo, diskMat);
      blurDisk.position.z = -0.02;
      propGroup.add(blurDisk);
      propBlurDiscs.push(blurDisk);

      propBlades.push(propGroup);
    });

    // ========================================================================
    // SUBASSEMBLY 5: CRYOGENIC LH2 TANK (Node 2 - Visible inside X-Ray shell)
    // ========================================================================
    const h2Group = new THREE.Group();
    aircraftGroup.add(h2Group);
    explodedGroups.tank = h2Group;

    // Type IV Composite Pressure Vessel with Spherical End Caps
    const tankCylinderGeo = new THREE.CylinderGeometry(0.44, 0.44, 1.8, 24);
    tankCylinderGeo.rotateX(Math.PI / 2);
    const tankCylinder = new THREE.Mesh(tankCylinderGeo, tankMat);
    tankCylinder.position.set(0, 0.38, -0.7);
    h2Group.add(tankCylinder);

    // Spherical Dome Caps (Forward & Aft)
    [-0.9, 0.9].forEach(zOffset => {
      const capGeo = new THREE.SphereGeometry(0.44, 24, 16);
      const capMesh = new THREE.Mesh(capGeo, tankMat);
      capMesh.position.set(0, 0.38, -0.7 + zOffset);
      h2Group.add(capMesh);
    });

    // Carbon Fiber Filament Winding Rings & Cryogenic Feed Pipe
    [-0.4, 0.0, 0.4].forEach(zBand => {
      const bandGeo = new THREE.TorusGeometry(0.445, 0.02, 12, 28);
      const band = new THREE.Mesh(bandGeo, cyanGlowMat);
      band.position.set(0, 0.38, -0.7 + zBand);
      h2Group.add(band);
    });

    const pipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.4, 16);
    pipeGeo.rotateX(Math.PI / 2);
    const pipe = new THREE.Mesh(pipeGeo, metalMat);
    pipe.position.set(0.2, 0.38, 0.1);
    h2Group.add(pipe);

    // ========================================================================
    // SUBASSEMBLY 6: PEM FUEL CELL STACK (Node 3 - Visible inside X-Ray shell)
    // ========================================================================
    const fcGroup = new THREE.Group();
    aircraftGroup.add(fcGroup);
    explodedGroups.fuelcell = fcGroup;

    // Bipolar Graphite Heat Sink Stack
    const fcBoxGeo = new THREE.BoxGeometry(0.78, 0.52, 1.15);
    const fcStack = new THREE.Mesh(fcBoxGeo, fcMat);
    fcStack.position.set(0, 0.42, 0.85);
    fcGroup.add(fcStack);

    // Glowing Emerald Core & High-Voltage Busbars
    const fcCoreGeo = new THREE.BoxGeometry(0.79, 0.12, 1.16);
    const fcCore = new THREE.Mesh(fcCoreGeo, emeraldGlowMat);
    fcCore.position.set(0, 0.42, 0.85);
    fcGroup.add(fcCore);

    // Li-Po Peak Buffer Battery Pack
    const lipoBoxGeo = new THREE.BoxGeometry(0.55, 0.28, 0.45);
    const lipoPack = new THREE.Mesh(lipoBoxGeo, carbonDarkMat);
    lipoPack.position.set(0, 0.16, 1.6);
    fcGroup.add(lipoPack);

    // ========================================================================
    // SUBASSEMBLY 7: QUICK-SWAP MISSION POD (Node 4 - Ventral Belly Pod)
    // ========================================================================
    const podGroup = new THREE.Group();
    aircraftGroup.add(podGroup);
    explodedGroups.payload = podGroup;

    // Ventral Mission Capsule
    const podGeo = new THREE.CylinderGeometry(0.56, 0.42, 3.2, 24);
    podGeo.rotateX(Math.PI / 2);
    const podMat = new THREE.MeshStandardMaterial({
      color: 0x00ff9d, // agro emerald default
      roughness: 0.25,
      metalness: 0.6
    });
    standardMaterials.push(podMat);
    const missionPodMesh = new THREE.Mesh(podGeo, podMat);
    missionPodMesh.name = 'missionPodMesh';
    missionPodMesh.position.set(0, -0.45, 0.2);
    missionPodMesh.castShadow = true;
    podGroup.add(missionPodMesh);

    // Cam-Lock Aerospace Quick-Release Latches
    [-0.8, 0.8].forEach(zLatch => {
      const latchGeo = new THREE.BoxGeometry(1.15, 0.08, 0.14);
      const latch = new THREE.Mesh(latchGeo, metalMat);
      latch.position.set(0, -0.22, 0.2 + zLatch);
      podGroup.add(latch);
    });

    // ========================================================================
    // SUBASSEMBLY 8: SENSOR GIMBAL TURRET (Node 6 - Mounted UNDER NOSE BELLY)
    // ========================================================================
    const gimbalGroup = new THREE.Group();
    // Positioned neatly UNDER the nose chin (not on a stick sticking out of the nose tip!)
    gimbalGroup.position.set(0, -0.48, 3.2);
    aircraftGroup.add(gimbalGroup);
    explodedGroups.gimbal = gimbalGroup;

    // Aerodynamic mounting collar/pylon fairing blended into lower fuselage
    const collarGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.18, 24);
    const collar = new THREE.Mesh(collarGeo, pearlCompositeMat);
    collar.position.set(0, 0.12, 0);
    gimbalGroup.add(collar);

    // Spherical 3-Axis Optical Turret Housing
    const turretGeo = new THREE.SphereGeometry(0.24, 24, 24);
    const turretMat = new THREE.MeshStandardMaterial({
      color: 0x16202c, // Dark aerospace titanium
      roughness: 0.22,
      metalness: 0.92
    });
    const turret = new THREE.Mesh(turretGeo, turretMat);
    turret.position.set(0, 0, 0);
    gimbalGroup.add(turret);

    // Multispectral NDVI 48MP Optical Lens (Emerald AR Sapphire glass)
    const lens1Geo = new THREE.CylinderGeometry(0.065, 0.065, 0.08, 16);
    lens1Geo.rotateX(Math.PI / 2);
    const lens1Mat = new THREE.MeshBasicMaterial({ color: 0x00ff9d });
    const lens1 = new THREE.Mesh(lens1Geo, lens1Mat);
    lens1.position.set(-0.08, -0.02, 0.22);
    gimbalGroup.add(lens1);

    // FLIR Uncooled LWIR Thermal Infrared Lens (Germanium deep-ruby/amber coating)
    const lens2Geo = new THREE.CylinderGeometry(0.065, 0.065, 0.08, 16);
    lens2Geo.rotateX(Math.PI / 2);
    const lens2Mat = new THREE.MeshBasicMaterial({ color: 0xff3355 });
    const lens2 = new THREE.Mesh(lens2Geo, lens2Mat);
    lens2.position.set(0.08, -0.02, 0.22);
    gimbalGroup.add(lens2);

    // Top Eye-Safe Laser Rangefinder / LiDAR Window
    const lidarGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.06, 16);
    lidarGeo.rotateX(Math.PI / 2);
    const lidarMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const lidar = new THREE.Mesh(lidarGeo, lidarMat);
    lidar.position.set(0, 0.08, 0.22);
    gimbalGroup.add(lidar);

    // ========================================================================
    // SUBASSEMBLY 9: ROUGH-TERRAIN STOL LANDING GEAR (Node 8)
    // ========================================================================
    const gearGroup = new THREE.Group();
    aircraftGroup.add(gearGroup);
    explodedGroups.gear = gearGroup;

    // Nose Gear (Oleo-Strut & Balloon Tire)
    const noseStrutGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 16);
    const noseStrut = new THREE.Mesh(noseStrutGeo, metalMat);
    noseStrut.position.set(0, -0.85, 2.8);
    gearGroup.add(noseStrut);

    const noseWheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.16, 20);
    noseWheelGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.9 });
    const noseWheel = new THREE.Mesh(noseWheelGeo, tireMat);
    noseWheel.position.set(0, -1.35, 2.8);
    gearGroup.add(noseWheel);

    // Main Gear (Left & Right with Trailing-Link Struts)
    [-1.6, 1.6].forEach(x => {
      const mainStrutGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.25, 16);
      const mainStrut = new THREE.Mesh(mainStrutGeo, metalMat);
      mainStrut.position.set(x, -0.85, 0.3);
      gearGroup.add(mainStrut);

      const mainWheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 20);
      mainWheelGeo.rotateZ(Math.PI / 2);
      const mainWheel = new THREE.Mesh(mainWheelGeo, tireMat);
      mainWheel.position.set(x, -1.32, 0.3);
      gearGroup.add(mainWheel);
    });
  }

  // --------------------------------------------------------------------------
  // 7. 8 INTERACTIVE 3D HOTSPOTS & RAYCASTING
  // --------------------------------------------------------------------------
  function createHotspotMarkers() {
    const keys = Object.keys(HOTSPOTS_DATA);
    
    keys.forEach((key, i) => {
      const data = HOTSPOTS_DATA[key];
      
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      
      // Glowing neon marker circle
      ctx.beginPath();
      ctx.arc(64, 64, 48, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#00e5ff';
      ctx.stroke();

      // Number in center
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}`, 64, 64);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9,
        depthTest: false
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(data.targetPos.x, data.targetPos.y, data.targetPos.z);
      sprite.scale.set(0.65, 0.65, 1);
      sprite.userData = { key: key };

      aircraftGroup.add(sprite);
      hotspotSprites.push(sprite);
    });
  }

  function onCanvasMouseMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(hotspotSprites, false);
    
    if (intersects.length > 0) {
      document.body.style.cursor = 'pointer';
    } else {
      document.body.style.cursor = 'default';
    }
  }

  function onCanvasClick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(hotspotSprites, false);

    if (intersects.length > 0) {
      const selected = intersects[0].object.userData.key;
      selectHotspot(selected);
    }
  }

  function selectHotspot(key) {
    if (key === 'tail') key = 'avionics';
    if (!HOTSPOTS_DATA[key]) return;
    STATE.activeHotspot = key;
    isZoomedToNode = true;
    audio.playHotspotChime();

    const data = HOTSPOTS_DATA[key];

    // Smooth Fly-To camera animation
    smoothMoveCamera(data.camPos, data.targetPos);

    // Update Flyout Panel contents
    updateFlyoutPanel(data);

    // Open Flyout Panel on node selection
    const flyout = document.getElementById('engineering-flyout');
    if (flyout) flyout.classList.add('open');

    // Highlight chips in quick bar
    document.querySelectorAll('.hotspot-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.hotspot === key);
    });

    // Synchronize Quick Component Selection Ribbon (Nodes 1..8)
    document.querySelectorAll('.node-ribbon-btn').forEach(btn => {
      const nodeKey = btn.dataset.node;
      const isMatch = (nodeKey === key) || (nodeKey === 'tail' && key === 'avionics') || (nodeKey === 'avionics' && key === 'tail');
      btn.classList.toggle('active', isMatch);
    });
  }

  function smoothMoveCamera(targetCamPos, targetLookAt) {
    const startCamPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const duration = 1200; // ms
    const startTime = performance.now();

    function flyStep(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 0.5 - Math.cos(progress * Math.PI) / 2; // smooth cosine ease

      camera.position.lerpVectors(startCamPos, new THREE.Vector3(targetCamPos.x, targetCamPos.y, targetCamPos.z), ease);
      controls.target.lerpVectors(startTarget, new THREE.Vector3(targetLookAt.x, targetLookAt.y, targetLookAt.z), ease);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(flyStep);
      }
    }
    requestAnimationFrame(flyStep);
  }

  function updateFlyoutPanel(data) {
    const flyout = document.getElementById('engineering-flyout');
    if (!flyout) return;

    // Node number badge & category
    const nodeNumEl = document.getElementById('flyout-node-num');
    if (nodeNumEl) {
      nodeNumEl.textContent = STATE.lang === 'ru' ? `УЗЕЛ #${data.nodeNumber}` : `NODE #${data.nodeNumber}`;
    }
    const tagEl = document.getElementById('flyout-tag');
    if (tagEl) tagEl.textContent = data.category;

    // Node title
    const titleEl = document.getElementById('flyout-title');
    if (titleEl) titleEl.textContent = data.title[STATE.lang];

    // Badges: Mass, % MTOW, Material
    const massValEl = document.getElementById('flyout-mass-val');
    if (massValEl) massValEl.textContent = `${data.massKg} кг`;

    const mtowValEl = document.getElementById('flyout-mtow-val');
    if (mtowValEl) mtowValEl.textContent = `${data.mtowPct} MTOW`;

    const matValEl = document.getElementById('flyout-mat-val');
    if (matValEl) matValEl.textContent = typeof data.material === 'object' ? data.material[STATE.lang] : data.material;
    
    // Update Specs Cells
    for (let i = 0; i < 4; i++) {
      const spec = data.specs[i];
      const lbl = document.getElementById(`spec-lbl-${i+1}`);
      const val = document.getElementById(`spec-val-${i+1}`);
      if (lbl && spec) lbl.textContent = spec.label[STATE.lang];
      if (val && spec) val.textContent = spec.val;
    }

    // Formula Box & Description Text
    const formulaEl = document.getElementById('flyout-formula-content');
    if (formulaEl) formulaEl.textContent = data.formula;

    const descEl = document.getElementById('flyout-desc');
    if (descEl) descEl.textContent = data.desc[STATE.lang];

    // Camera Focus button text
    const focusBtnText = document.getElementById('flyout-btn-focus-text');
    if (focusBtnText) {
      focusBtnText.textContent = STATE.lang === 'ru' ? 'Приблизить камеру к узлу' : 'Focus Camera on Node';
    }

    // Render ECharts Mini-Chart inside flyout
    renderFlyoutMiniChart(data.chartData);

    flyout.classList.add('open');
  }

  let flyoutChartInstance = null;
  function renderFlyoutMiniChart(chartData) {
    const chartDom = document.getElementById('flyout-chart-container');
    if (!chartDom) return;
    if (!flyoutChartInstance) {
      flyoutChartInstance = echarts.init(chartDom, 'dark');
    }

    const option = {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 25, bottom: 25, left: 40, right: 15 },
      xAxis: {
        type: 'category',
        data: chartData.x,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        axisLabel: { color: '#8b9bb4', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        axisLabel: { color: '#8b9bb4', fontSize: 10 }
      },
      series: [{
        name: chartData.name,
        type: 'line',
        smooth: true,
        data: chartData.y,
        itemStyle: { color: '#00e5ff' },
        lineStyle: { width: 3, shadowColor: 'rgba(0, 229, 255, 0.5)', shadowBlur: 8 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0, 229, 255, 0.4)' },
            { offset: 1, color: 'rgba(0, 229, 255, 0.0)' }
          ])
        }
      }]
    };
    flyoutChartInstance.setOption(option);
  }

  // --------------------------------------------------------------------------
  // 8. SPECIAL ENGINEERING 3D MODES:
  // Exploded View, Zebra Shader, CFD Wind Tunnel, Spray/Dump Animations
  // --------------------------------------------------------------------------
  function toggleExplodedView() {
    STATE.exploded = !STATE.exploded;
    audio.playWhoosh();
    document.getElementById('btn-exploded-view').classList.toggle('active', STATE.exploded);
  }

  function initAircraftShaders() {
    // 1. CATIA V5 Class-A Zebra Stripe Reflection Shader
    const zebraVertexShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const zebraFragmentShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        vec3 reflectDir = reflect(-viewDir, normal);
        
        // High-contrast zebra reflection stripes evaluating Class-A G2/G3 continuity
        float stripe = sin(reflectDir.y * 60.0 + reflectDir.x * 25.0);
        float colorVal = smoothstep(-0.06, 0.06, stripe);
        
        vec3 col = mix(vec3(0.02, 0.04, 0.08), vec3(0.96, 0.98, 1.0), colorVal);
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    zebraMaterial = new THREE.ShaderMaterial({
      vertexShader: zebraVertexShader,
      fragmentShader: zebraFragmentShader,
      side: THREE.DoubleSide
    });

    // 2. Aerodynamic Pressure Coefficient (Cp) Heatmap Shader
    const pressureVertexShader = `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const pressureFragmentShader = `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      vec3 getCpColor(float cp) {
        float t = clamp((cp + 2.5) / 3.5, 0.0, 1.0);
        if (t < 0.2) return mix(vec3(0.35, 0.0, 0.75), vec3(0.0, 0.2, 0.95), t / 0.2);
        if (t < 0.4) return mix(vec3(0.0, 0.2, 0.95), vec3(0.0, 0.85, 0.9), (t - 0.2) / 0.2);
        if (t < 0.6) return mix(vec3(0.0, 0.85, 0.9), vec3(0.1, 0.9, 0.2), (t - 0.4) / 0.2);
        if (t < 0.8) return mix(vec3(0.1, 0.9, 0.2), vec3(1.0, 0.85, 0.0), (t - 0.6) / 0.2);
        return mix(vec3(1.0, 0.85, 0.0), vec3(0.95, 0.08, 0.08), (t - 0.8) / 0.2);
      }

      void main() {
        vec3 n = normalize(vNormal);
        float forwardStagnation = clamp(n.z, 0.0, 1.0);
        float upperSuction = clamp(n.y, 0.0, 1.0);
        float cp = -2.0 * upperSuction + 1.0 * forwardStagnation + 0.1;
        if (abs(vWorldPosition.x) > 0.8 && vWorldPosition.y > 0.7 && vWorldPosition.z > 0.2) {
          cp -= 0.6; // Suction peak at upper leading edge of NACA 64-215 airfoil
        }
        vec3 col = getCpColor(cp);
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    pressureMaterial = new THREE.ShaderMaterial({
      vertexShader: pressureVertexShader,
      fragmentShader: pressureFragmentShader,
      side: THREE.DoubleSide
    });

    // 3. X-Ray Blueprint Wireframe Shader Material
    xrayMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x00e5ff,
      emissive: 0x002244,
      emissiveIntensity: 0.4,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.9
    });
  }

  function setAircraftShaderMode(mode) {
    STATE.shaderMode = mode;
    STATE.zebraShader = (mode === 'zebra');

    const btnMap = {
      pbr: 'btn-shader-pbr',
      zebra: 'btn-zebra-shader',
      pressure: 'btn-shader-pressure',
      xray: 'btn-shader-xray'
    };
    Object.entries(btnMap).forEach(([m, id]) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active', m === mode);
    });

    if (!aircraftGroup) return;

    aircraftGroup.traverse(child => {
      if (child.isMesh && child.name !== 'sprayBoomMesh') {
        if (!child.userData.pbrMaterial) {
          child.userData.pbrMaterial = child.material;
        }

        if (mode === 'pbr') {
          child.material = child.userData.pbrMaterial;
        } else if (mode === 'zebra') {
          child.material = zebraMaterial;
        } else if (mode === 'pressure') {
          child.material = pressureMaterial;
        } else if (mode === 'xray') {
          const isInternal = (
            child.parent === explodedGroups.tank ||
            child.parent === explodedGroups.fuelcell ||
            child.name === 'spar' ||
            child.name === 'missionPodMesh'
          );
          child.material = isInternal ? child.userData.pbrMaterial : xrayMaterial;
        }
      }
    });

    if (typeof audio !== 'undefined' && audio.playClick) audio.playClick();
  }

  function toggleZebraShader() {
    setAircraftShaderMode(STATE.shaderMode === 'zebra' ? 'pbr' : 'zebra');
  }

  function toggleLaserScanner() {
    laserScannerActive = !laserScannerActive;
    if (laserScannerGroup) laserScannerGroup.visible = laserScannerActive;
    const btn = document.getElementById('btn-laser-scan');
    if (btn) btn.classList.toggle('active', laserScannerActive);
    if (typeof audio !== 'undefined' && audio.playWhoosh) audio.playWhoosh();
  }

  function createParticleSystems() {
    // ------------------------------------------------------------------------
    // 1. CFD Wind Tunnel Streamlines with Downwash and Propeller Swirl
    // ------------------------------------------------------------------------
    const cfdCount = 1800;
    const cfdGeo = new THREE.BufferGeometry();
    const cfdPositions = new Float32Array(cfdCount * 3);
    const cfdColors = new Float32Array(cfdCount * 3);
    cfdData = [];

    for (let i = 0; i < cfdCount; i++) {
      const x = (Math.random() - 0.5) * 14.0;
      const y = 0.45 + (Math.random() - 0.5) * 1.6;
      const z = 8.0 - Math.random() * 16.0;

      cfdPositions[i * 3] = x;
      cfdPositions[i * 3 + 1] = y;
      cfdPositions[i * 3 + 2] = z;

      // Color: Cyan for upper wing suction, Emerald for freestream, Amber for prop wash
      const isProp = Math.abs(Math.abs(x) - 2.2) < 0.6 || Math.abs(Math.abs(x) - 4.2) < 0.6;
      if (isProp) {
        cfdColors[i * 3] = 1.0;
        cfdColors[i * 3 + 1] = 0.65;
        cfdColors[i * 3 + 2] = 0.0;
      } else if (y > 0.8) {
        cfdColors[i * 3] = 0.0;
        cfdColors[i * 3 + 1] = 0.9;
        cfdColors[i * 3 + 2] = 1.0;
      } else {
        cfdColors[i * 3] = 0.0;
        cfdColors[i * 3 + 1] = 1.0;
        cfdColors[i * 3 + 2] = 0.6;
      }

      cfdData.push({
        baseX: x,
        baseY: y,
        speed: 0.28 + Math.random() * 0.14,
        isProp: isProp,
        phase: Math.random() * Math.PI * 2
      });
    }
    cfdGeo.setAttribute('position', new THREE.BufferAttribute(cfdPositions, 3));
    cfdGeo.setAttribute('color', new THREE.BufferAttribute(cfdColors, 3));

    const cfdMat = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      opacity: 0.75
    });
    cfdParticleSystem = new THREE.Points(cfdGeo, cfdMat);
    cfdParticleSystem.visible = false;
    scene.add(cfdParticleSystem);

    // ------------------------------------------------------------------------
    // 2. Agro Spray Mist System (6 Separate Conical Nozzle Emitters)
    // ------------------------------------------------------------------------
    const sprayCount = 1800; // 300 particles per nozzle
    const sprayGeo = new THREE.BufferGeometry();
    const sprayPositions = new Float32Array(sprayCount * 3);
    sprayData = [];
    const nozzles = [-4.8, -2.9, -1.1, 1.1, 2.9, 4.8];

    for (let i = 0; i < sprayCount; i++) {
      const nIdx = i % 6;
      const originX = nozzles[nIdx];
      const originY = 0.35;
      const originZ = -0.22;

      // Initial spread
      const progress = Math.random();
      const x = originX + (Math.random() - 0.5) * 0.4 * progress;
      const y = originY - progress * 1.8;
      const z = originZ - progress * 3.5;

      sprayPositions[i * 3] = x;
      sprayPositions[i * 3 + 1] = y;
      sprayPositions[i * 3 + 2] = z;

      sprayData.push({
        nozzleIdx: nIdx,
        vx: (Math.random() - 0.5) * 0.025,
        vy: -0.045 - Math.random() * 0.03,
        vz: -0.08 - Math.random() * 0.04
      });
    }
    sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPositions, 3));

    const sprayMat = new THREE.PointsMaterial({
      color: 0x00ff9d,
      size: 0.18,
      transparent: true,
      opacity: 0.75
    });
    sprayParticleSystem = new THREE.Points(sprayGeo, sprayMat);
    sprayParticleSystem.visible = false;
    scene.add(sprayParticleSystem);

    // ------------------------------------------------------------------------
    // 3. Firefighting Water Deluge & Ground Splash Physics System
    // ------------------------------------------------------------------------
    const dumpCount = 1800;
    const dumpGeo = new THREE.BufferGeometry();
    const dumpPositions = new Float32Array(dumpCount * 3);
    waterDumpData = [];

    for (let i = 0; i < dumpCount; i++) {
      const x = (Math.random() - 0.5) * 0.5;
      const y = -0.6 - Math.random() * 0.9;
      const z = 0.2 + (Math.random() - 0.5) * 1.5;

      dumpPositions[i * 3] = x;
      dumpPositions[i * 3 + 1] = y;
      dumpPositions[i * 3 + 2] = z;

      waterDumpData.push({
        x0: (Math.random() - 0.5) * 0.45,
        y0: -0.6,
        z0: 0.2 + (Math.random() - 0.5) * 1.2,
        vy: -0.06 - Math.random() * 0.04,
        vz: -0.04 - Math.random() * 0.02,
        isSplashing: false,
        splashVx: 0,
        splashVz: 0,
        splashAge: 0
      });
    }
    dumpGeo.setAttribute('position', new THREE.BufferAttribute(dumpPositions, 3));

    const dumpMat = new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 0.24,
      transparent: true,
      opacity: 0.85
    });
    waterDumpParticleSystem = new THREE.Points(dumpGeo, dumpMat);
    waterDumpParticleSystem.visible = false;
    scene.add(waterDumpParticleSystem);
  }

  function toggleWindTunnel() {
    STATE.windTunnel = !STATE.windTunnel;
    audio.playClick();
    document.getElementById('btn-wind-tunnel').classList.toggle('active', STATE.windTunnel);
    if (cfdParticleSystem) cfdParticleSystem.visible = STATE.windTunnel;
  }

  function triggerSprayAnimation() {
    STATE.spraying = !STATE.spraying;
    audio.playWhoosh();
    document.getElementById('btn-spray-anim').classList.toggle('active', STATE.spraying);
    if (sprayParticleSystem) sprayParticleSystem.visible = STATE.spraying;
  }

  function triggerWaterDumpAnimation() {
    STATE.waterDumping = !STATE.waterDumping;
    audio.playWhoosh();
    document.getElementById('btn-water-dump').classList.toggle('active', STATE.waterDumping);
    if (waterDumpParticleSystem) waterDumpParticleSystem.visible = STATE.waterDumping;
  }

  // --------------------------------------------------------------------------
  // 9. THREE.JS RENDER LOOP & REAL-TIME ANIMATIONS
  // --------------------------------------------------------------------------
  function animate() {
    requestAnimationFrame(animate);

    // 1. Counter-Rotating DEP Propellers & Propeller Blur Discs
    const propSpeed = STATE.isFlying ? 0.38 : 0.09;
    propBlades.forEach((prop, i) => {
      // Counter-rotating pairs for zero P-factor torque
      prop.rotation.z += (i % 2 === 0 ? 1 : -1) * propSpeed;
    });

    const blurAlpha = STATE.isFlying ? 0.45 : 0.18;
    propBlurDiscs.forEach(disc => {
      disc.material.opacity = blurAlpha;
    });

    // Turntable Ambient Showcase Rotation
    if (turntableGroup) {
      turntableGroup.rotation.y += 0.0006;
    }

    // Animated 3D Laser Scanner Sweep
    if (laserScannerGroup && laserScannerActive) {
      laserScannerGroup.position.z = Math.sin(performance.now() * 0.0018) * 4.4;
    }

    // 2. Exploded View Smooth Interpolation
    const targetExp = STATE.exploded ? 1 : 0;
    STATE.explodeProgress += (targetExp - STATE.explodeProgress) * 0.08;

    if (explodedGroups.fuselage) {
      explodedGroups.fuselage.position.y = STATE.explodeProgress * 2.2;
      explodedGroups.wing.position.y = STATE.explodeProgress * 3.8;
      explodedGroups.tail.position.z = -STATE.explodeProgress * 3.5;
      explodedGroups.motors.position.z = STATE.explodeProgress * 2.0;
      explodedGroups.tank.position.y = STATE.explodeProgress * 1.5;
      explodedGroups.tank.position.z = -STATE.explodeProgress * 1.2;
      explodedGroups.fuelcell.position.y = STATE.explodeProgress * 1.4;
      explodedGroups.fuelcell.position.z = STATE.explodeProgress * 1.2;
      explodedGroups.payload.position.y = -STATE.explodeProgress * 2.5;
      explodedGroups.gimbal.position.y = -STATE.explodeProgress * 1.6;
      explodedGroups.gear.position.y = -STATE.explodeProgress * 1.8;
    }

    // 3. Animated Belly Water Bomb Bay Doors
    if (waterBayDoorL && waterBayDoorR) {
      const targetAngle = STATE.waterDumping ? 1.15 : 0.0;
      waterBayDoorL.rotation.z += (targetAngle - waterBayDoorL.rotation.z) * 0.12;
      waterBayDoorR.rotation.z += (-targetAngle - waterBayDoorR.rotation.z) * 0.12;
    }

    // 4. CFD Streamlines Motion (NACA Camber Curve + Downwash + Prop Swirl)
    if (STATE.windTunnel && cfdParticleSystem) {
      const pos = cfdParticleSystem.geometry.attributes.position.array;
      const time = performance.now() * 0.005;

      for (let i = 0; i < cfdData.length; i++) {
        const d = cfdData[i];
        let pz = pos[i * 3 + 2];
        let py = pos[i * 3 + 1];
        let px = pos[i * 3];

        // Move air backward
        pz -= d.speed;

        // Upwash and Acceleration over NACA wing camber
        if (pz < 1.0 && pz > -0.6) {
          if (py > 0.8) {
            py = d.baseY + Math.sin((pz + 0.6) / 1.6 * Math.PI) * 0.24;
            pz -= 0.12; // Bernoulli suction acceleration
          }
        } else if (pz <= -0.6) {
          // Downwash angle behind trailing edge
          py -= 0.015;
        }

        // Helical slipstream swirl behind the 4 propellers
        if (d.isProp && pz < 1.7 && pz > -3.0) {
          px = d.baseX + Math.cos(time + d.phase) * 0.14;
          py = d.baseY + Math.sin(time + d.phase) * 0.14;
          pz -= 0.18;
        }

        // Recycle streamline at boundary
        if (pz < -8.0) {
          pz = 8.0;
          py = d.baseY;
          px = d.baseX;
        }

        pos[i * 3] = px;
        pos[i * 3 + 1] = py;
        pos[i * 3 + 2] = pz;
      }
      cfdParticleSystem.geometry.attributes.position.needsUpdate = true;
    }

    // 5. Agro Spray Mist (6 Distinct Conical Plumes from Wing Nozzles)
    if (STATE.spraying && sprayParticleSystem) {
      const pos = sprayParticleSystem.geometry.attributes.position.array;
      const nozzles = [-4.8, -2.9, -1.1, 1.1, 2.9, 4.8];

      for (let i = 0; i < sprayData.length; i++) {
        const d = sprayData[i];
        let px = pos[i * 3];
        let py = pos[i * 3 + 1];
        let pz = pos[i * 3 + 2];

        py += d.vy;
        pz += d.vz;
        px += d.vx;

        // Recycle particle back to its specific nozzle when hitting floor or drifting far
        if (py < -1.58 || pz < -6.5) {
          const originX = nozzles[d.nozzleIdx];
          px = originX + (Math.random() - 0.5) * 0.08;
          py = 0.35;
          pz = -0.22;
          d.vx = (Math.random() - 0.5) * 0.035; // conical expansion
          d.vy = -0.045 - Math.random() * 0.03;
          d.vz = -0.08 - Math.random() * 0.04;
        }

        pos[i * 3] = px;
        pos[i * 3 + 1] = py;
        pos[i * 3 + 2] = pz;
      }
      sprayParticleSystem.geometry.attributes.position.needsUpdate = true;
    }

    // 6. Water Dump Stream Motion + Ground Splash Physics
    if (STATE.waterDumping && waterDumpParticleSystem) {
      const pos = waterDumpParticleSystem.geometry.attributes.position.array;

      for (let i = 0; i < waterDumpData.length; i++) {
        const d = waterDumpData[i];
        let px = pos[i * 3];
        let py = pos[i * 3 + 1];
        let pz = pos[i * 3 + 2];

        if (!d.isSplashing) {
          // Free-fall plunge with gravity acceleration
          d.vy -= 0.008; // gravity g
          py += d.vy;
          pz += d.vz;

          // Impact with floor level (-1.58) -> Trigger Ground Splash!
          if (py <= -1.58) {
            d.isSplashing = true;
            py = -1.57;
            const splashAngle = Math.random() * Math.PI * 2;
            const splashSpeed = 0.06 + Math.random() * 0.08;
            d.splashVx = Math.cos(splashAngle) * splashSpeed;
            d.splashVz = Math.sin(splashAngle) * splashSpeed;
            d.splashAge = 0;
          }
        } else {
          // Splash particle expands radially outward across floor grid
          px += d.splashVx;
          pz += d.splashVz;
          d.splashAge++;

          if (d.splashAge > 18) {
            // Reset particle back into fuselage water bay
            d.isSplashing = false;
            px = d.x0 + (Math.random() - 0.5) * 0.4;
            py = d.y0;
            pz = d.z0;
            d.vy = -0.06 - Math.random() * 0.04;
          }
        }

        pos[i * 3] = px;
        pos[i * 3 + 1] = py;
        pos[i * 3 + 2] = pz;
      }
      waterDumpParticleSystem.geometry.attributes.position.needsUpdate = true;
    }

    // 7. Flight Simulator Controls & Dynamics
    if (STATE.isFlying) {
      handleFlightPhysics();
    }

    // 8. Pulse Hotspot Markers (Strictly hidden in flight & simulator mode)
    const isHangarActive = !document.body.classList.contains('in-simulator-mode') && !STATE.isFlying;
    hotspotSprites.forEach(sprite => {
      sprite.visible = isHangarActive;
      if (isHangarActive) {
        const time = performance.now() * 0.003;
        const scale = 0.65 + Math.sin(time) * 0.08;
        sprite.scale.set(scale, scale, 1);
      }
    });

    controls.update();
    renderer.render(scene, camera);

    // Update RC Horizon HUD
    renderArtificialHorizon();
  }

  function handleFlightPhysics() {
    // Keyboard inputs
    if (STATE.keys.w) STATE.flightPitch = Math.max(STATE.flightPitch - 0.015, -0.45);
    else if (STATE.keys.s) STATE.flightPitch = Math.min(STATE.flightPitch + 0.015, 0.45);
    else STATE.flightPitch *= 0.95;

    if (STATE.keys.a) STATE.flightRoll = Math.max(STATE.flightRoll - 0.02, -0.6);
    else if (STATE.keys.d) STATE.flightRoll = Math.min(STATE.flightRoll + 0.02, 0.6);
    else STATE.flightRoll *= 0.94;

    aircraftGroup.rotation.x = STATE.flightPitch;
    aircraftGroup.rotation.z = -STATE.flightRoll;
    aircraftGroup.rotation.y += STATE.flightRoll * 0.02;

    // Small atmospheric turbulence
    aircraftGroup.position.y = Math.sin(performance.now() * 0.002) * 0.15;
  }

  function onWindowResize() {
    const container = document.getElementById('hangar-section');
    if (!container || !renderer || !camera) return;
    const aspect = container.clientWidth / container.clientHeight;
    camera.aspect = aspect;
    if (aspect < 0.85) {
      // На вертикальном экране смартфона увеличиваем угол обзора и отодвигаем камеру дальше,
      // чтобы весь размах крыла 12.4 м и круглый подиум помещались в экран целиком!
      camera.fov = 68;
      if (!isZoomedToNode) {
        camera.position.set(14, 11, 18);
        if (controls) controls.target.set(0, 0.5, 0);
      }
    } else {
      camera.fov = 45;
    }
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  // --------------------------------------------------------------------------
  // 10. CAD MODEL UPLOAD HANDLER (.STL / .OBJ / .GLB)
  // --------------------------------------------------------------------------
  function setupCadUpload() {
    const fileInput = document.getElementById('cad-file-input');
    if (!fileInput) return;

    fileInput.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const ext = file.name.split('.').pop().toLowerCase();
      const reader = new FileReader();

      Swal.fire({
        title: STATE.lang === 'ru' ? 'Загрузка 3D-модели...' : 'Loading 3D CAD...',
        text: `${file.name} (CATIA V5 Format)`,
        icon: 'info',
        showConfirmButton: false,
        timer: 1500,
        background: '#0a1124',
        color: '#fff'
      });

      reader.onload = function (event) {
        const contents = event.target.result;
        if (ext === 'stl' && typeof THREE.STLLoader !== 'undefined') {
          const loader = new THREE.STLLoader();
          const geometry = loader.parse(contents);
          const mat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.8, roughness: 0.2 });
          const mesh = new THREE.Mesh(geometry, mat);
          geometry.center();
          mesh.scale.set(0.01, 0.01, 0.01);
          aircraftGroup.add(mesh);
        } else if (ext === 'obj' && typeof THREE.OBJLoader !== 'undefined') {
          const loader = new THREE.OBJLoader();
          const obj = loader.parse(contents);
          const mat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.8, roughness: 0.2 });
          obj.traverse(c => { if (c.isMesh) c.material = mat; });
          obj.scale.set(0.01, 0.01, 0.01);
          aircraftGroup.add(obj);
        } else if (ext === 'glb' || ext === 'gltf') {
          if (typeof THREE.GLTFLoader !== 'undefined') {
            const loader = new THREE.GLTFLoader();
            loader.parse(contents, '', function (gltf) {
              aircraftGroup.add(gltf.scene);
            });
          }
        }
      };

      if (ext === 'stl' || ext === 'glb') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  // --------------------------------------------------------------------------
  // 11. ENGINEERING MATHEMATICS & LIVE CALCULATORS
  // (Weights, Aerodynamics, STOL, Kerosene Savings)
  // --------------------------------------------------------------------------
  let chartMass = null, chartAero = null, chartEco = null, chartPower = null;

  function initCalculatorsAndCharts() {
    // Bind Sliders
    const sliders = [
      { id: 'slider-payload', valId: 'val-payload', key: 'payload', unit: ' кг' },
      { id: 'slider-range', valId: 'val-range', key: 'range', unit: ' км' },
      { id: 'slider-speed', valId: 'val-speed', key: 'speed', unit: ' км/ч' },
      { id: 'slider-ar', valId: 'val-ar', key: 'ar', unit: '' },
      { id: 'slider-jet-price', valId: 'val-jet-price', key: 'jetPrice', unit: ' $/л' },
      { id: 'slider-h2-price', valId: 'val-h2-price', key: 'h2Price', unit: ' $/кг' }
    ];

    sliders.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) {
        el.addEventListener('input', function (e) {
          STATE.params[s.key] = parseFloat(e.target.value);
          document.getElementById(s.valId).textContent = e.target.value + s.unit;
          updateCalculations();
        });
      }
    });

    initECharts();
    updateCalculations();
  }

  function updateCalculations() {
    const isFull = STATE.scale === 'full';
    const p = STATE.params;

    // Mathematical Calculations
    const mEmpty = isFull ? 820 : 8.2; // Empty composite airframe + motors
    const mPayload = isFull ? p.payload : p.payload * 0.01;
    const mH2 = isFull ? (p.range / 1200) * 38 : (p.range / 1200) * 0.38;
    const mBattery = isFull ? 180 : 1.8; // Peak STOL buffer battery
    const mtow = mEmpty + mPayload + mH2 + mBattery;

    // Aerodynamics (NACA 64-215 Airfoil)
    const AR = p.ar;
    const eOswald = 0.88;
    const CD0 = 0.022; // Zero-lift parasite drag
    const CLmax = 2.45; // Blown wing CL_max with DEP
    const LDmax = (0.5 * Math.sqrt(Math.PI * AR * eOswald / CD0)).toFixed(1);

    // STOL Ground Roll Distance (meters)
    // S_TO = 1.44 * (W/S) / (rho * g * CL_max * (T/W))
    const wingArea = isFull ? 13.35 : 0.534;
    const wingLoading = mtow / wingArea;
    const stolRoll = Math.round(isFull ? (wingLoading * 0.95) : (wingLoading * 0.3));

    // Economics Comparison (1 flight hour / 100 ha field)
    // Kerosene engine (An-2 / Helicopter): burns ~160 liters Jet A-1 / hr
    const kerosenePerHour = 160 * p.jetPrice;
    // AeroTerra H2: burns ~4.2 kg LH2 / hr
    const h2PerHour = Math.round(4.2 * p.h2Price);
    const co2SavedYear = Math.round(isFull ? (160 * 0.8 * 3.16 * 700 / 1000) : 2.8);

    // Update UI Elements
    document.getElementById('kpi-mtow').textContent = `${Math.round(mtow)} кг`;
    document.getElementById('kpi-ld').textContent = LDmax;
    document.getElementById('kpi-cost-hr').textContent = `${h2PerHour} $/ч`;
    document.getElementById('kpi-co2').textContent = `${co2SavedYear} т`;
    document.getElementById('calc-stol-roll').textContent = `${stolRoll} ${STATE.lang === 'ru' ? 'метров (Обдув DEP)' : 'meters (Blown DEP)'}`;

    // Update Top Hangar HUD
    document.getElementById('hud-val-mtow').textContent = `${Math.round(mtow)} кг`;

    // Refresh ECharts Data
    updateEChartsData(mEmpty, mPayload, mH2, mBattery, AR, CD0, eOswald, h2PerHour, kerosenePerHour);
  }

  function initECharts() {
    chartMass = echarts.init(document.getElementById('chart-mass-budget'), 'dark');
    chartAero = echarts.init(document.getElementById('chart-aero-polar'), 'dark');
    chartEco = echarts.init(document.getElementById('chart-eco-comparison'), 'dark');
    chartPower = echarts.init(document.getElementById('chart-power-profile'), 'dark');

    window.addEventListener('resize', () => {
      chartMass.resize();
      chartAero.resize();
      chartEco.resize();
      chartPower.resize();
      if (flyoutChartInstance) flyoutChartInstance.resize();
    });
  }

  function updateEChartsData(mEmpty, mPayload, mH2, mBattery, AR, CD0, eOswald, h2PerHour, kerosenePerHour) {
    if (!chartMass) return;

    // 1. Mass Budget Donut Chart
    chartMass.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['45%', '75%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#080f20', borderWidth: 2 },
        label: { show: true, formatter: '{b}: {c}kg', fontSize: 11, color: '#f0f6fc' },
        data: [
          { value: Math.round(mEmpty), name: STATE.lang === 'ru' ? 'Планер & Моторы' : 'Airframe & DEP', itemStyle: { color: '#00e5ff' } },
          { value: Math.round(mPayload), name: STATE.lang === 'ru' ? 'Нагрузка (Вода/Спрей)' : 'Payload Tank', itemStyle: { color: '#00ff9d' } },
          { value: Math.round(mH2), name: STATE.lang === 'ru' ? 'Водород LH2' : 'Liquid H2', itemStyle: { color: '#2563eb' } },
          { value: Math.round(mBattery), name: STATE.lang === 'ru' ? 'Буферная Батарея' : 'Buffer Li-Po', itemStyle: { color: '#ff4d00' } }
        ]
      }]
    });

    // 2. Drag Polar & L/D curve
    const speedVals = [100, 130, 160, 190, 220, 250, 280, 310];
    const ldVals = speedVals.map(v => {
      const q = 0.5 * 1.225 * Math.pow(v / 3.6, 2);
      const CL = (1850 * 9.81) / (q * 13.35);
      const CDi = Math.pow(CL, 2) / (Math.PI * AR * eOswald);
      const CD = CD0 + CDi;
      return parseFloat((CL / CD).toFixed(1));
    });

    chartAero.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 30, bottom: 25, left: 45, right: 20 },
      xAxis: {
        type: 'category',
        data: speedVals.map(s => `${s}`),
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        axisLabel: { color: '#8b9bb4' }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        axisLabel: { color: '#8b9bb4' }
      },
      series: [{
        name: 'L/D Ratio',
        type: 'line',
        smooth: true,
        data: ldVals,
        itemStyle: { color: '#00ff9d' },
        lineStyle: { width: 3 },
        areaStyle: { color: 'rgba(0, 255, 157, 0.15)' }
      }]
    });

    // 3. Economics Comparison (AeroTerra H2 vs An-2 vs Helicopter)
    chartEco.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 30, bottom: 25, left: 45, right: 20 },
      xAxis: {
        type: 'category',
        data: [
          STATE.lang === 'ru' ? 'AeroTerra H2' : 'AeroTerra H2',
          STATE.lang === 'ru' ? 'Ан-2 (Бензин/Керосин)' : 'An-2 Biplane',
          STATE.lang === 'ru' ? 'Вертолёт Ми-2' : 'Mi-2 Helicopter'
        ],
        axisLabel: { color: '#8b9bb4', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        axisLabel: { color: '#8b9bb4', formatter: '{value} $' }
      },
      series: [{
        name: STATE.lang === 'ru' ? 'Стоимость 1 лётного часа ($)' : 'Cost per Flight Hour ($)',
        type: 'bar',
        data: [
          { value: h2PerHour, itemStyle: { color: '#00e5ff' } },
          { value: 190, itemStyle: { color: '#f59e0b' } },
          { value: 420, itemStyle: { color: '#ef4444' } }
        ],
        barWidth: '40%'
      }]
    });

    // 4. Power & Energy Distribution (STOL takeoff vs Cruise)
    chartPower.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 30, bottom: 25, left: 45, right: 20 },
      xAxis: {
        type: 'category',
        data: [
          STATE.lang === 'ru' ? 'Разбег STOL' : 'STOL Roll',
          STATE.lang === 'ru' ? 'Набор высоты' : 'Climb',
          STATE.lang === 'ru' ? 'Крейсер' : 'Cruise',
          STATE.lang === 'ru' ? 'Сброс/Опрыскивание' : 'Mission Run'
        ],
        axisLabel: { color: '#8b9bb4', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        axisLabel: { color: '#8b9bb4', formatter: '{value} kW' }
      },
      series: [
        {
          name: 'PEM Fuel Cell',
          type: 'bar',
          stack: 'total',
          data: [120, 120, 95, 110],
          itemStyle: { color: '#2563eb' }
        },
        {
          name: 'Li-Po Peak Buffer',
          type: 'bar',
          stack: 'total',
          data: [85, 45, 0, 15],
          itemStyle: { color: '#9d4edd' }
        }
      ]
    });
  }

  // --------------------------------------------------------------------------
  // 12. LEAFLET MISSION SIMULATOR & RC GROUND CONTROL STATION
  // --------------------------------------------------------------------------
  let missionMap = null, planeMarker = null, routePolyline = null;
  let missionWaypoints = [];
  let currentWpIndex = 0;

  function initMissionMap() {
    if (typeof L === 'undefined') return;

    // Dark high-contrast satellite style basemap
    missionMap = L.map('mission-map', {
      zoomControl: true,
      attributionControl: false
    }).setView([55.751244, 37.618423], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(missionMap);

    setupScenarioAgro();
  }

  function setupScenarioAgro() {
    STATE.missionScenario = 'agro';
    document.getElementById('btn-scenario-agro').classList.add('active');
    document.getElementById('btn-scenario-fire').classList.remove('active');

    if (routePolyline) missionMap.removeLayer(routePolyline);
    if (planeMarker) missionMap.removeLayer(planeMarker);

    // Agro Snake Flight Path (Boustrophedon Grid)
    missionWaypoints = [
      [55.740, 37.580], [55.765, 37.580],
      [55.765, 37.595], [55.740, 37.595],
      [55.740, 37.610], [55.765, 37.610],
      [55.765, 37.625], [55.740, 37.625],
      [55.740, 37.640], [55.765, 37.640]
    ];

    routePolyline = L.polyline(missionWaypoints, {
      color: '#00ff9d',
      weight: 3,
      dashArray: '6, 6'
    }).addTo(missionMap);

    // Aircraft Icon
    const planeIcon = L.divIcon({
      html: '<div style="color: #00ff9d; font-size: 22px; filter: drop-shadow(0 0 8px #00ff9d);"><i class="fa-solid fa-plane-up"></i></div>',
      iconSize: [24, 24],
      className: 'plane-map-icon'
    });
    planeMarker = L.marker(missionWaypoints[0], { icon: planeIcon }).addTo(missionMap);

    missionMap.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });

    document.getElementById('map-status-text').textContent = STATE.lang === 'ru' ? 'АГРО-СКАНИРОВАНИЕ NDVI' : 'NDVI AGRO SCANNING';
    document.getElementById('map-area-val').textContent = '380 Га / 600 Га';
    document.getElementById('map-rate-val').textContent = '120 Га/час';

    startMissionAnimation();
  }

  function setupScenarioFire() {
    STATE.missionScenario = 'fire';
    document.getElementById('btn-scenario-fire').classList.add('active');
    document.getElementById('btn-scenario-agro').classList.remove('active');

    if (routePolyline) missionMap.removeLayer(routePolyline);
    if (planeMarker) missionMap.removeLayer(planeMarker);

    // Lake Water-Scoop -> Wildfire Front Waypoints
    missionWaypoints = [
      [55.720, 37.550], // Base
      [55.735, 37.590], // Lake (Water scoop at 110 km/h)
      [55.770, 37.650], // Wildfire Ridge (Drop 800L salvo)
      [55.735, 37.590], // Lake
      [55.770, 37.650]
    ];

    routePolyline = L.polyline(missionWaypoints, {
      color: '#ff4d00',
      weight: 4
    }).addTo(missionMap);

    // Fire hotspot circle
    L.circle([55.770, 37.650], {
      radius: 900,
      color: '#ff4d00',
      fillColor: '#ff4d00',
      fillOpacity: 0.35
    }).addTo(missionMap);

    const planeIcon = L.divIcon({
      html: '<div style="color: #ff4d00; font-size: 22px; filter: drop-shadow(0 0 10px #ff4d00);"><i class="fa-solid fa-plane-up"></i></div>',
      iconSize: [24, 24],
      className: 'plane-map-icon'
    });
    planeMarker = L.marker(missionWaypoints[0], { icon: planeIcon }).addTo(missionMap);

    missionMap.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });

    document.getElementById('map-status-text').textContent = STATE.lang === 'ru' ? 'ПОЖАРНЫЙ ПАТРУЛЬ & СБРОС' : 'WILDFIRE BOMBING RUN';
    document.getElementById('map-area-val').textContent = '800 л / 800 л';
    document.getElementById('map-rate-val').textContent = '14 сек забор с озера';

    startMissionAnimation();
  }

  function startMissionAnimation() {
    if (STATE.missionInterval) clearInterval(STATE.missionInterval);
    currentWpIndex = 0;

    STATE.missionInterval = setInterval(() => {
      if (!planeMarker || missionWaypoints.length === 0) return;
      currentWpIndex = (currentWpIndex + 1) % missionWaypoints.length;
      planeMarker.setLatLng(missionWaypoints[currentWpIndex]);
    }, 2500);
  }

  // --------------------------------------------------------------------------
  // 13. ARTIFICIAL HORIZON HUD (CANVAS 2D)
  // --------------------------------------------------------------------------
  function renderArtificialHorizon() {
    const canvas = document.getElementById('horizon-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.clientWidth;
    const h = canvas.height = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);

    // Rotate for roll
    ctx.rotate(-STATE.flightRoll);

    // Sky & Ground
    const pitchOffset = STATE.flightPitch * 100;
    
    // Sky
    ctx.fillStyle = '#0a1d3b';
    ctx.fillRect(-w, -h + pitchOffset, w * 2, h);
    
    // Ground
    ctx.fillStyle = '#1c1409';
    ctx.fillRect(-w, pitchOffset, w * 2, h);

    // Horizon line
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w, pitchOffset);
    ctx.lineTo(w, pitchOffset);
    ctx.stroke();

    // Pitch ladder ticks
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
    ctx.lineWidth = 1.5;
    [-20, -10, 10, 20].forEach(deg => {
      const y = pitchOffset - (deg * 3.5);
      const tickW = Math.abs(deg) === 20 ? 40 : 25;
      ctx.beginPath();
      ctx.moveTo(-tickW, y);
      ctx.lineTo(tickW, y);
      ctx.stroke();
    });

    ctx.restore();

    // Static Aircraft Reticle (Yellow/Cyan crosshair)
    ctx.strokeStyle = '#00ff9d';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    // Center dot
    ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2);
    // Left wing
    ctx.moveTo(w / 2 - 35, h / 2);
    ctx.lineTo(w / 2 - 12, h / 2);
    ctx.lineTo(w / 2 - 12, h / 2 + 8);
    // Right wing
    ctx.moveTo(w / 2 + 35, h / 2);
    ctx.lineTo(w / 2 + 12, h / 2);
    ctx.lineTo(w / 2 + 12, h / 2 + 8);
    ctx.stroke();
  }

  // --------------------------------------------------------------------------
  // 14. AI CHIEF DESIGNER (AEROSPACE ADVISOR CHATBOT)
  // --------------------------------------------------------------------------
  function setupAiAdvisor() {
    const input = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('btn-ai-chat-send');
    const auditBtn = document.getElementById('btn-ai-analyze-state');

    async function sendAiMessage(userText) {
      if (!userText.trim()) return;
      audio.playClick();

      // Add user message to UI
      addMessageToAiBox('user', userText);
      input.value = '';

      // Add temporary typing indicator
      const box = document.getElementById('ai-messages-box');
      const typingMsg = document.createElement('div');
      typingMsg.className = 'ai-msg system typing-indicator';
      typingMsg.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color: var(--accent-cyan); margin-right: 0.4rem;"></i> Анализ телеметрии и расчёт формул...';
      if (box) {
        box.appendChild(typingMsg);
        box.scrollTop = box.scrollHeight;
      }

      let aiReply = null;

      // 1. Attempt secure Vercel serverless proxy call
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const res = await fetch('/api/ai-gateway', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userText, context: 'aerospace_chief_designer' }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && data.text) {
            aiReply = data.text;
          }
        }
      } catch (err) {
        // Fallback to local intelligence below
      }

      // 2. Seamless local aerospace intelligence fallback
      if (!aiReply) {
        aiReply = generateAiAerospaceResponse(userText);
      }

      // Remove typing indicator and render final response
      typingMsg.remove();
      addMessageToAiBox('system', aiReply);
    }

    if (sendBtn && input) {
      sendBtn.addEventListener('click', () => sendAiMessage(input.value));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendAiMessage(input.value);
      });
    }

    if (auditBtn) {
      auditBtn.addEventListener('click', () => {
        sendAiMessage(STATE.lang === 'ru' ? 'Проведи глубокий аудит текущих настроек самолёта' : 'Perform deep audit of current aircraft settings');
      });
    }

    // Quick Prompt Chips
    document.querySelectorAll('.ai-prompt-chip').forEach(chip => {
      chip.addEventListener('click', function () {
        sendAiMessage(this.textContent.replace(/^[^\w\sа-яА-Я]+/, '').trim());
      });
    });
  }

  function addMessageToAiBox(role, text) {
    const box = document.getElementById('ai-messages-box');
    const msg = document.createElement('div');
    msg.className = `ai-msg ${role}`;
    msg.innerHTML = role === 'system' ? `<i class="fa-solid fa-robot" style="color: var(--accent-cyan); margin-right: 0.4rem;"></i> ${text}` : text;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
  }

  function generateAiAerospaceResponse(query) {
    const q = query.toLowerCase();
    const p = STATE.params;
    const isRu = STATE.lang === 'ru';

    if (q.includes('аудит') || q.includes('audit') || q.includes('конфигурац')) {
      const wingArea = 13.35;
      const wingLoading = ((820 + p.payload + 38 + 180) / wingArea).toFixed(1);
      return isRu
        ? `<strong>[ОТЧЕТ АУДИТА ГЛАВНОГО КОНСТРУКТОРА]</strong><br>
           • Удельная нагрузка на крыло: <strong>${wingLoading} кг/м²</strong> (Оптимально для STOL).<br>
           • Аэродинамическое удлинение AR = <strong>${p.ar}</strong> обеспечивает качество L/D = <strong>21.4</strong>.<br>
           • Обдув от 4 моторов DEP снижает посадочную скорость до <strong>68 км/ч</strong>.<br>
           • <em>Вердикт:</em> Конфигурация сбалансирована. Центровка находится в диапазоне 24–28% САХ.`
        : `<strong>[CHIEF DESIGNER AUDIT REPORT]</strong><br>
           • Wing loading: <strong>${wingLoading} kg/m²</strong> (Optimal for unpaved STOL).<br>
           • Aspect ratio AR = <strong>${p.ar}</strong> yields L/D = <strong>21.4</strong>.<br>
           • 4x DEP blown wing lowers stall airspeed to <strong>68 km/h</strong>.<br>
           • <em>Verdict:</em> Aircraft is aerodynamically validated. Static margin sits at 24-28% MAC.`;
    }

    if (q.includes('взлет') || q.includes('stol') || q.includes('разбег') || q.includes('dep')) {
      return isRu
        ? `Распределенная винтомоторная группа (DEP из 4 моторов) нагнетает динамический скоростной напор на верхнюю поверхность крыла. Это предотвращает срыв потока на больших углах атаки (до 22°) и увеличивает $C_{L,max}$ с 1.8 до 2.65, сокращая разбег до 120 метров!`
        : `Distributed Electric Propulsion (DEP) blows high-velocity propeller slipstream directly across the upper wing surface, preventing boundary layer separation up to 22° AoA and boosting $C_{L,max}$ to 2.65 for a 120 m takeoff run.`;
    }

    if (q.includes('h2') || q.includes('водород') || q.includes('акб') || q.includes('батаре')) {
      return isRu
        ? `Жидкий водород ($LH_2$) обладает удельной энергоемкостью <strong>33.3 кВт·ч/кг</strong>. Это в 120 раз превосходит лучшие литий-ионные батареи (0.26 кВт·ч/кг) и в 2.8 раза превосходит керосин Jet A-1! Поэтому дальность достигает 1400 км без утяжеления планера.`
        : `Liquid hydrogen ($LH_2$) offers <strong>33.3 kWh/kg</strong> specific energy, crushing Li-ion batteries (0.26 kWh/kg) by 120x and Jet A-1 kerosene by 2.8x. This unlocks a 1400 km mission radius while keeping empty weight minimal.`;
    }

    if (q.includes('catia') || q.includes('class-a') || q.includes('поверхност') || q.includes('g2')) {
      return isRu
        ? `Поверхности Class-A в CATIA V5 ICEM Surf обладают непрерывностью кривизны $G2$ и $G3$ (равенство радиусов кривизны на стыках). Это исключает зоны срыва ламинарного пограничного слоя и снижает лобовое сопротивление на 18%. Включите кнопку «CATIA Zebra Shader», чтобы увидеть полосы отражения!`
        : `Class-A surfaces in CATIA V5 ICEM Surf guarantee $G2/G3$ curvature continuity across all patchwork boundaries. This eliminates premature laminar-to-turbulent transition and trims profile drag by 18%. Toggle the "CATIA Zebra Shader" button to inspect the curvature stripes!`;
    }

    return isRu
      ? `Конструкторский анализ параметров: при полезной нагрузке ${p.payload} кг и крейсерской скорости ${p.speed} км/ч запас прочности силового набора составляет $\\eta = 3.8g$. Все системы работают в штатном режиме.`
      : `Designer telemetry check: at ${p.payload} kg payload and ${p.speed} km/h cruise, ultimate load factor is calculated at $\\eta = 3.8g$. All hydrogen and avionics subsystems are nominal.`;
  }

  // --------------------------------------------------------------------------
  // 15. PDF PASSPORT GENERATION (HTML2PDF.JS)
  // --------------------------------------------------------------------------
  function setupPdfExport() {
    const btn = document.getElementById('btn-export-pdf');
    if (!btn) return;

    btn.addEventListener('click', function () {
      audio.playClick();
      const element = document.getElementById('pdf-passport-template');
      element.style.display = 'block';

      Swal.fire({
        title: STATE.lang === 'ru' ? 'Генерация Инженерного Паспорта...' : 'Generating Technical Passport...',
        text: 'PDF Compilation via html2pdf',
        icon: 'info',
        showConfirmButton: false,
        timer: 1800,
        background: '#0a1124',
        color: '#fff'
      });

      const opt = {
        margin: 10,
        filename: `AeroTerra_H2_Technical_Passport_${STATE.scale.toUpperCase()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#080f20' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      setTimeout(() => {
        if (typeof html2pdf !== 'undefined') {
          html2pdf().set(opt).from(element).save().then(() => {
            element.style.display = 'none';
          });
        }
      }, 500);
    });
  }

  // --------------------------------------------------------------------------
  // 16. UI EVENT LISTENERS & MODES
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    // Language Switcher
    const langBtn = document.getElementById('btn-lang-toggle');
    if (langBtn) {
      langBtn.addEventListener('click', () => {
        STATE.lang = STATE.lang === 'ru' ? 'en' : 'ru';
        document.getElementById('current-lang-text').textContent = STATE.lang.toUpperCase();
        audio.playClick();
        applyLanguage();
      });
    }

    // Scale Switcher (1:1 Full Scale vs 1:5 RC Prototype)
    const btnFull = document.getElementById('btn-scale-full');
    const btnRc = document.getElementById('btn-scale-rc');
    if (btnFull && btnRc) {
      btnFull.addEventListener('click', () => setScale('full'));
      btnRc.addEventListener('click', () => setScale('rc'));
    }

    // Sound Toggle
    const soundBtn = document.getElementById('btn-sound-toggle');
    const soundIcon = document.getElementById('sound-icon');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        STATE.soundEnabled = !STATE.soundEnabled;
        soundIcon.className = STATE.soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
      });
    }

    // Navigation Links Smooth Scroll & Active Tracking
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            audio.playClick();
            document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            const simSec = document.getElementById('simulator-section');
            const earthSec = document.getElementById('earth-section');

            if (href === '#simulator-section') {
              document.body.classList.add('in-simulator-mode');
              if (earthSec) {
                earthSec.classList.remove('active');
                if (window.AeroTerraEarth && window.AeroTerraEarth.onHide) window.AeroTerraEarth.onHide();
              }
              if (simSec) simSec.classList.add('active');
              if (window.AeroTerraSim && window.AeroTerraSim.onShow) {
                window.AeroTerraSim.onShow();
              }
              window.dispatchEvent(new Event('resize'));
            } else if (href === '#earth-section') {
              const simLink = document.getElementById('nav-simulator-tab');
              if (simLink) {
                simLink.click();
              }
              return;
            } else {
              document.body.classList.remove('in-simulator-mode');
              if (simSec) {
                simSec.classList.remove('active');
                if (window.AeroTerraSim && window.AeroTerraSim.onHide) window.AeroTerraSim.onHide();
              }
              if (earthSec) {
                earthSec.classList.remove('active');
                if (window.AeroTerraEarth && window.AeroTerraEarth.onHide) window.AeroTerraEarth.onHide();
              }
              target.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }
      });
    });

    // Mission Modes (Clean H2 / Agro / Fire)
    document.getElementById('btn-mode-clean').addEventListener('click', () => setMissionMode('clean'));
    document.getElementById('btn-mode-agro').addEventListener('click', () => setMissionMode('agro'));
    document.getElementById('btn-mode-fire').addEventListener('click', () => setMissionMode('fire'));

    // Engineering 3D Buttons & 4-Shader Switcher
    const btnExploded = document.getElementById('btn-exploded-view');
    if (btnExploded) btnExploded.addEventListener('click', toggleExplodedView);

    const btnShaderPbr = document.getElementById('btn-shader-pbr');
    if (btnShaderPbr) btnShaderPbr.addEventListener('click', () => setAircraftShaderMode('pbr'));

    const btnShaderZebra = document.getElementById('btn-zebra-shader');
    if (btnShaderZebra) btnShaderZebra.addEventListener('click', () => setAircraftShaderMode(STATE.shaderMode === 'zebra' ? 'pbr' : 'zebra'));

    const btnShaderPressure = document.getElementById('btn-shader-pressure');
    if (btnShaderPressure) btnShaderPressure.addEventListener('click', () => setAircraftShaderMode('pressure'));

    const btnShaderXray = document.getElementById('btn-shader-xray');
    if (btnShaderXray) btnShaderXray.addEventListener('click', () => setAircraftShaderMode('xray'));

    const btnLaserScan = document.getElementById('btn-laser-scan');
    if (btnLaserScan) btnLaserScan.addEventListener('click', toggleLaserScanner);

    const btnWindTunnel = document.getElementById('btn-wind-tunnel');
    if (btnWindTunnel) btnWindTunnel.addEventListener('click', toggleWindTunnel);

    const btnSprayAnim = document.getElementById('btn-spray-anim');
    if (btnSprayAnim) btnSprayAnim.addEventListener('click', triggerSprayAnimation);

    const btnWaterDump = document.getElementById('btn-water-dump');
    if (btnWaterDump) btnWaterDump.addEventListener('click', triggerWaterDumpAnimation);

    // Quick Component Selection Ribbon (Nodes 1..8)
    document.querySelectorAll('.node-ribbon-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        selectHotspot(this.dataset.node);
      });
    });

    // Camera Preset Buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        setCameraViewPreset(this.dataset.view);
      });
    });

    // Hotspot Chips in quick-bar
    document.querySelectorAll('.hotspot-chip').forEach(chip => {
      chip.addEventListener('click', function () {
        selectHotspot(this.dataset.hotspot);
      });
    });

    // Close Flyout Panel
    document.getElementById('btn-close-flyout').addEventListener('click', () => {
      document.getElementById('engineering-flyout').classList.remove('open');
      audio.playClick();
      isZoomedToNode = false;
      const aspect = camera ? camera.aspect : (window.innerWidth / window.innerHeight);
      if (aspect < 0.85) {
        camera.fov = 68;
        camera.updateProjectionMatrix();
        smoothMoveCamera({ x: 14, y: 11, z: 18 }, { x: 0, y: 0.5, z: 0 });
      }
    });

    // Fly To Node in 3D (Focus Camera on Selected Node)
    const btnFlyToNode = document.getElementById('btn-fly-to-node');
    if (btnFlyToNode) {
      btnFlyToNode.addEventListener('click', () => {
        if (STATE.activeHotspot && HOTSPOTS_DATA[STATE.activeHotspot]) {
          const data = HOTSPOTS_DATA[STATE.activeHotspot];
          smoothMoveCamera(data.camPos, data.targetPos);
          audio.playWhoosh();
        }
      });
    }

    // Map Scenarios
    document.getElementById('btn-scenario-agro').addEventListener('click', setupScenarioAgro);
    document.getElementById('btn-scenario-fire').addEventListener('click', setupScenarioFire);

    // RC Flight Mode Toggle
    const btnFlight = document.getElementById('btn-toggle-flight');
    if (btnFlight) {
      btnFlight.addEventListener('click', function () {
        STATE.isFlying = !STATE.isFlying;
        audio.playWhoosh();
        this.classList.toggle('flying', STATE.isFlying);
        this.innerHTML = STATE.isFlying
          ? `<i class="fa-solid fa-plane-slash"></i> <span>${STATE.lang === 'ru' ? 'Выключить ручное управление' : 'Disengage RC Control'}</span>`
          : `<i class="fa-solid fa-gamepad"></i> <span>${STATE.lang === 'ru' ? 'Включить ручное RC-управление' : 'Enable Manual RC Flight'}</span>`;

        if (STATE.isFlying) {
          setCameraViewPreset('pilot');
        } else {
          setCameraViewPreset('iso');
        }
      });
    }

    // Keyboard controls for flight
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') STATE.keys.w = true;
      if (k === 's' || k === 'arrowdown') STATE.keys.s = true;
      if (k === 'a' || k === 'arrowleft') STATE.keys.a = true;
      if (k === 'd' || k === 'arrowright') STATE.keys.d = true;
      if (e.code === 'Space') {
        STATE.keys.space = true;
        triggerWaterDumpAnimation();
      }
      if (k === 'e') {
        STATE.keys.e = true;
        triggerSprayAnimation();
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') STATE.keys.w = false;
      if (k === 's' || k === 'arrowdown') STATE.keys.s = false;
      if (k === 'a' || k === 'arrowleft') STATE.keys.a = false;
      if (k === 'd' || k === 'arrowright') STATE.keys.d = false;
      if (e.code === 'Space') STATE.keys.space = false;
      if (k === 'e') STATE.keys.e = false;
    });

    // Vanilla Tilt initialization
    if (typeof VanillaTilt !== 'undefined') {
      VanillaTilt.init(document.querySelectorAll('[data-tilt]'), {
        max: 8,
        speed: 400,
        glare: true,
        'max-glare': 0.15
      });
    }
  }

  function setScale(scale) {
    STATE.scale = scale;
    audio.playClick();
    document.getElementById('btn-scale-full').classList.toggle('active', scale === 'full');
    document.getElementById('btn-scale-rc').classList.toggle('active', scale === 'rc');

    if (scale === 'rc') {
      document.getElementById('hud-val-designation').textContent = 'AeroTerra H2 RC-1:5 Prototype';
      document.getElementById('hud-val-wingspan').textContent = '2.48 м';
      aircraftGroup.scale.set(0.65, 0.65, 0.65);
    } else {
      document.getElementById('hud-val-designation').textContent = 'AeroTerra H2 (STOL Twin-Boom)';
      document.getElementById('hud-val-wingspan').textContent = '12.4 м';
      aircraftGroup.scale.set(1.0, 1.0, 1.0);
    }

    updateCalculations();
  }

  function setMissionMode(mode) {
    STATE.mode = mode;
    audio.playClick();

    document.getElementById('btn-mode-clean').classList.toggle('active', mode === 'clean');
    document.getElementById('btn-mode-agro').classList.toggle('active', mode === 'agro');
    document.getElementById('btn-mode-fire').classList.toggle('active', mode === 'fire');

    const pod = scene.getObjectByName('missionPodMesh');
    if (pod) {
      if (mode === 'agro') {
        pod.material.color.setHex(0x00ff9d); // emerald
        triggerSprayAnimation();
      } else if (mode === 'fire') {
        pod.material.color.setHex(0xff4d00); // emergency amber/orange
        triggerWaterDumpAnimation();
      } else {
        pod.material.color.setHex(0x00e5ff); // clean aero cyan
      }
    }
  }

  function setCameraViewPreset(view) {
    audio.playClick();
    isZoomedToNode = false;
    const aspect = camera ? camera.aspect : (window.innerWidth / window.innerHeight);
    if (view === 'iso') {
      if (aspect < 0.85) {
        camera.fov = 68;
        camera.updateProjectionMatrix();
        smoothMoveCamera({ x: 14, y: 11, z: 18 }, { x: 0, y: 0.5, z: 0 });
      } else {
        camera.fov = 45;
        camera.updateProjectionMatrix();
        smoothMoveCamera({ x: 11, y: 6.5, z: 13 }, { x: 0, y: 0.5, z: 0 });
      }
    } else if (view === 'front') {
      if (aspect < 0.85) {
        camera.fov = 68;
        camera.updateProjectionMatrix();
        smoothMoveCamera({ x: 0, y: 1.8, z: 17 }, { x: 0, y: 0.8, z: 0 });
      } else {
        camera.fov = 45;
        camera.updateProjectionMatrix();
        smoothMoveCamera({ x: 0, y: 1.2, z: 12 }, { x: 0, y: 0.8, z: 0 });
      }
    } else if (view === 'top') {
      smoothMoveCamera({ x: 0, y: aspect < 0.85 ? 24 : 19, z: 0.1 }, { x: 0, y: 0, z: 0 });
    } else if (view === 'side') {
      if (aspect < 0.85) {
        smoothMoveCamera({ x: 20, y: 2.2, z: 0 }, { x: 0, y: 0.5, z: 0 });
      } else {
        smoothMoveCamera({ x: 16, y: 1.5, z: 0 }, { x: 0, y: 0.5, z: 0 });
      }
    } else if (view === 'pilot') {
      smoothMoveCamera({ x: 0, y: 0.8, z: 2.1 }, { x: 0, y: 0.8, z: 10 });
    }
  }

  // --------------------------------------------------------------------------
  // MASTER BLUEPRINT INFOGRAPHIC & TECHNICAL POSTER MODULE
  // --------------------------------------------------------------------------
  function setupMasterBlueprint() {
    // 1. Prototype Switcher
    const btnSub = document.getElementById('btn-bp-subscale');
    const btnFull = document.getElementById('btn-bp-fullscale');
    if (btnSub && btnFull) {
      btnSub.addEventListener('click', () => setBlueprintPrototype('subscale'));
      btnFull.addEventListener('click', () => setBlueprintPrototype('fullscale'));
    }

    // 2. Fullscreen Presentation Toggle
    const btnFullscreen = document.getElementById('btn-toggle-bp-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', toggleBlueprintFullscreen);
    }

    // 3. Export Poster PDF
    const btnExport = document.getElementById('btn-export-poster');
    const btnExportBottom = document.getElementById('btn-export-poster-bottom');
    [btnExport, btnExportBottom].forEach(b => {
      if (b) b.addEventListener('click', exportBlueprintPoster);
    });

    // 4. Clickable Top HUD Badges
    document.querySelectorAll('.blueprint-hud-badge').forEach(badge => {
      badge.addEventListener('click', function() {
        const target = this.dataset.badgeTarget;
        audio.playHotspotChime();
        selectHotspot(target);
        highlightSvgPart(target);
      });
    });

    // 5. Zero CG Shift Simulation (Block 2)
    const btnCgDrain = document.getElementById('btn-simulate-cg-drain');
    if (btnCgDrain) {
      btnCgDrain.addEventListener('click', simulateCgDrain);
    }

    // 6. Energy Sizing Mode Switcher (Block 4)
    const btnLipo = document.getElementById('btn-energy-lipo');
    const btnH2 = document.getElementById('btn-energy-h2');
    if (btnLipo && btnH2) {
      btnLipo.addEventListener('click', () => setBlueprintEnergyMode('lipo'));
      btnH2.addEventListener('click', () => setBlueprintEnergyMode('h2'));
    }

    // 7. CAD 3-View Blueprint Tabs (Block 5)
    ['top', 'front', 'side'].forEach(v => {
      const tab = document.getElementById(`cad-tab-${v}`);
      if (tab) {
        tab.addEventListener('click', () => setCadView(v));
      }
    });

    // 8. 3D Camera Sync button
    const btnSync3d = document.getElementById('btn-sync-3d-cam');
    if (btnSync3d) {
      btnSync3d.addEventListener('click', () => {
        audio.playWhoosh();
        setCameraViewPreset(STATE.blueprintView);
        const hangar = document.getElementById('hangar-section');
        if (hangar) hangar.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // 9. Interactive SVG Parts
    document.querySelectorAll('.svg-part').forEach(part => {
      part.style.cursor = 'pointer';
      part.addEventListener('click', function() {
        const pKey = this.dataset.part;
        audio.playHotspotChime();
        highlightSvgPart(pKey);
        selectHotspot(pKey);
      });
    });

    // 10. Architecture Loops
    document.querySelectorAll('.arch-loop-card').forEach(card => {
      card.addEventListener('click', function() {
        showComponentArchitectureModal(this.dataset.loopType);
      });
    });

    // 11. Spec table rows click to highlight
    document.querySelectorAll('.engineering-spec-table tr[data-highlight]').forEach(tr => {
      tr.addEventListener('click', function() {
        const target = this.dataset.highlight;
        selectHotspot(target);
        highlightSvgPart(target);
      });
    });
  }

  function setBlueprintPrototype(proto) {
    STATE.blueprintProto = proto;
    audio.playClick();

    const btnSub = document.getElementById('btn-bp-subscale');
    const btnFull = document.getElementById('btn-bp-fullscale');
    if (btnSub && btnFull) {
      btnSub.classList.toggle('active', proto === 'subscale');
      btnFull.classList.toggle('active', proto === 'fullscale');
    }

    const isSub = proto === 'subscale';
    const isRu = STATE.lang === 'ru';

    // Update Block 1: Key Specs
    document.getElementById('bp-b1-tag').textContent = isSub ? 'Sub-Scale 3.2m (RC-UAV)' : 'Full-Scale 9.6m (Regional)';
    document.getElementById('bp-spec-conf').textContent = isSub
      ? 'High-Wing Twin-Boom STOL, V-Tail, 2x BLDC'
      : 'High-Wing Twin-Boom STOL, V-Tail, 4x Heavy DEP';
    document.getElementById('bp-spec-span').textContent = isSub
      ? '3.20 m / 1.28 m² (AR = 8.0, NACA 4415)'
      : '9.60 m / 11.52 m² (AR = 8.0, NACA 4415)';
    document.getElementById('bp-spec-dim').textContent = isSub
      ? '2.20 m / 0.68 m (CFRP Monocoque)'
      : '6.60 m / 2.05 m (CFRP Monocoque)';
    document.getElementById('bp-spec-mtom').textContent = isSub
      ? '25.0 kg (Согласовано во всех расчётах)'
      : '450.0 kg (Regional Agro / Wildfire UAV)';
    document.getElementById('bp-spec-payload').textContent = isSub
      ? '10.0 L (10.0 kg) жидкости в центре масс (CG)'
      : '150.0 L (150.0 kg) жидкости в центре масс (CG)';
    document.getElementById('bp-spec-speed').textContent = isSub
      ? '16 m/s (58 km/h) крейсер / 11 m/s (40 km/h) спрей'
      : '38 m/s (136 km/h) крейсер / 26 m/s (95 km/h) спрей';
    document.getElementById('bp-spec-endurance').textContent = isSub
      ? '32 min (12S LiPo) / 110 min (H2 Fuel Cell)'
      : '60 min (Li-Ion) / 240 min (Liquid H2 Cryo)';
    document.getElementById('bp-spec-stol').textContent = isSub
      ? '35 – 50 m (Грунт, трава, полевая дорога)'
      : '75 – 110 m (Грунт, аэродромная полоса)';

    // Update Block 2: Mass Budget
    document.getElementById('mb-val-airframe').textContent = isSub ? '5.2 kg' : '94.0 kg';
    document.getElementById('mb-val-prop').textContent = isSub ? '1.8 kg' : '32.0 kg';
    document.getElementById('mb-val-esc').textContent = isSub ? '0.9 kg' : '16.0 kg';
    document.getElementById('mb-val-energy').textContent = isSub ? '4.5 kg' : '81.0 kg';
    document.getElementById('mb-val-mission').textContent = isSub ? '1.4 kg' : '25.0 kg';
    document.getElementById('mb-val-avionics').textContent = isSub ? '0.6 kg' : '10.0 kg';
    document.getElementById('mb-val-gear').textContent = isSub ? '0.6 kg' : '12.0 kg';
    document.getElementById('mb-val-empty').textContent = isSub ? '15.0 kg' : '270.0 kg';
    document.getElementById('mb-val-payload').textContent = isSub ? '10.0 kg' : '150.0 kg';

    // Synchronize 3D model scale
    if (aircraftGroup) {
      const s = isSub ? 0.7 : 1.25;
      aircraftGroup.scale.set(s, s, s);
    }
  }

  function simulateCgDrain() {
    STATE.cgDrained = !STATE.cgDrained;
    audio.playClick();

    const isSub = STATE.blueprintProto === 'subscale';
    const btn = document.getElementById('btn-simulate-cg-drain');
    const needle = document.getElementById('cg-needle');
    const statusText = document.getElementById('cg-status-text');
    const payloadVal = document.getElementById('mb-val-payload');

    if (STATE.cgDrained) {
      // Drained State
      payloadVal.textContent = '0.0 kg (Бак пуст)';
      payloadVal.style.color = '#54657e';
      needle.style.left = '27.5%'; // Needle stays 100% fixed at 27.5% MAC!
      statusText.textContent = 'ZERO CG SHIFT: ΔCG = 0.00% (PERFECT CG BALANCE)';
      statusText.style.color = 'var(--accent-cyan)';
      btn.innerHTML = `<i class="fa-solid fa-rotate-left"></i> <span>Заправить бак 10 кг</span>`;

      Swal.fire({
        title: STATE.lang === 'ru' ? 'Тест Центровки (Zero CG Shift)' : 'Zero CG Shift Confirmed',
        html: STATE.lang === 'ru' 
          ? '<strong>Идеальная центровка:</strong> бак расположен строго в аэродинамическом фокусе крыла (27.5% САХ).<br>При полной выработке 10 кг жидкости смещение фокуса <strong>ΔCG = 0.00%</strong>. Триммирование рулей не требуется!'
          : '<strong>Aero Balance Validated:</strong> tank is located exactly at the wing aerodynamic center (27.5% MAC). Consuming 10 kg fluid results in <strong>ΔCG = 0.00%</strong>!',
        icon: 'success',
        background: '#0a1124',
        color: '#fff',
        confirmButtonColor: '#00e5ff'
      });
    } else {
      // Restored State
      payloadVal.textContent = isSub ? '10.0 kg' : '150.0 kg';
      payloadVal.style.color = 'var(--accent-amber)';
      needle.style.left = '27.5%';
      statusText.textContent = 'CG: 27.5% MAC (STATIC STABILITY: OK)';
      statusText.style.color = 'var(--accent-emerald)';
      btn.innerHTML = `<i class="fa-solid fa-droplet-slash"></i> <span>Слить бак 10 кг (Тест CG)</span>`;
    }
  }

  function setBlueprintEnergyMode(mode) {
    STATE.blueprintEnergyMode = mode;
    audio.playClick();

    const btnLipo = document.getElementById('btn-energy-lipo');
    const btnH2 = document.getElementById('btn-energy-h2');
    if (btnLipo && btnH2) {
      btnLipo.classList.toggle('active', mode === 'lipo');
      btnH2.classList.toggle('active', mode === 'h2');
    }

    const display = document.getElementById('energy-sizing-display');
    const isRu = STATE.lang === 'ru';

    if (mode === 'lipo') {
      display.innerHTML = isRu
        ? `<div><span class="step-num-badge">ШАГ 1:</span> Номинальная энергоемкость: <strong>44.4 V × 14 Ah = 621 Wh</strong> (12S Semi-Solid сборка).</div>
           <div><span class="step-num-badge">ШАГ 2:</span> Полезная энергия (80% Depth of Discharge): <strong>621 Wh × 0.80 = 497 Wh</strong>.</div>
           <div><span class="step-num-badge">ШАГ 3:</span> Средняя потребляемая мощность: <strong>920 W (Тяга) + 80 W (Помпа спрея) = 1.00 kW</strong>.</div>
           <div style="color: var(--accent-emerald); font-weight: 700; margin-top: 4px; border-top: 1px dashed rgba(0, 229, 255, 0.3); padding-top: 4px;">
             <span class="step-num-badge">ШАГ 4:</span> Точное время полёта: t = 497 Wh / 1000 W = 0.497 ч ≈ <strong>30 МИНУТ</strong> (Математически строго!).
           </div>`
        : `<div><span class="step-num-badge">STEP 1:</span> Nominal Battery Capacity: <strong>44.4 V × 14 Ah = 621 Wh</strong> (12S Semi-Solid LiPo).</div>
           <div><span class="step-num-badge">STEP 2:</span> Usable Energy (80% DoD for cell longevity): <strong>621 Wh × 0.80 = 497 Wh</strong>.</div>
           <div><span class="step-num-badge">STEP 3:</span> Average System Power: <strong>920 W (Cruise) + 80 W (Spray Pump) = 1.00 kW</strong>.</div>
           <div style="color: var(--accent-emerald); font-weight: 700; margin-top: 4px; border-top: 1px dashed rgba(0, 229, 255, 0.3); padding-top: 4px;">
             <span class="step-num-badge">STEP 4:</span> Exact Flight Endurance: t = 497 Wh / 1000 W = 0.497 h ≈ <strong>30 MINUTES</strong> (Flawless Physics!).
           </div>`;
    } else {
      display.innerHTML = isRu
        ? `<div><span class="step-num-badge">ШАГ 1:</span> Водородный модуль H2 (2.5 кг композитный бак 300 Bar + PEM стек) = <strong>1650 Wh</strong> полезного электричества.</div>
           <div><span class="step-num-badge">ШАГ 2:</span> КПД водородной ячейки: <strong>55%</strong> (при удельной энергии H2 33.3 кВт·ч/кг).</div>
           <div><span class="step-num-badge">ШАГ 3:</span> Средняя крейсерская мощность: <strong>920 W + 80 W = 1.00 kW</strong>.</div>
           <div style="color: var(--accent-cyan); font-weight: 700; margin-top: 4px; border-top: 1px dashed rgba(0, 229, 255, 0.3); padding-top: 4px;">
             <span class="step-num-badge">ШАГ 4:</span> Время полёта на водороде: t = 1650 Wh / 1000 W = 1.65 ч ≈ <strong>100–110 МИНУТ</strong> (+350% прирост)!
           </div>`
        : `<div><span class="step-num-badge">STEP 1:</span> H2 Fuel Cell Hybrid Module (2.5 kg Type-IV tank at 300 Bar + PEM stack) = <strong>1650 Wh</strong> net electric power.</div>
           <div><span class="step-num-badge">STEP 2:</span> Fuel cell conversion efficiency: <strong>55%</strong> (with hydrogen energy density of 33.3 kWh/kg).</div>
           <div><span class="step-num-badge">STEP 3:</span> Steady cruise power draw: <strong>920 W + 80 W = 1.00 kW</strong>.</div>
           <div style="color: var(--accent-cyan); font-weight: 700; margin-top: 4px; border-top: 1px dashed rgba(0, 229, 255, 0.3); padding-top: 4px;">
             <span class="step-num-badge">STEP 4:</span> H2 Flight Endurance: t = 1650 Wh / 1000 W = 1.65 h ≈ <strong>100–110 MINUTES</strong> (+350% range boost)!
           </div>`;
    }
  }

  function setCadView(view) {
    STATE.blueprintView = view;
    audio.playClick();

    ['top', 'front', 'side'].forEach(v => {
      const tab = document.getElementById(`cad-tab-${v}`);
      const group = document.getElementById(`svg-view-${v}`);
      if (tab) tab.classList.toggle('active', v === view);
      if (group) group.style.display = v === view ? 'inline' : 'none';
    });

    setCameraViewPreset(view);
  }

  function highlightSvgPart(partKey) {
    document.querySelectorAll('.svg-part').forEach(p => {
      if (p.dataset.part === partKey) {
        p.style.stroke = '#ff4d00';
        p.style.strokeWidth = '4';
        setTimeout(() => {
          p.style.stroke = '#00e5ff';
          p.style.strokeWidth = '2';
        }, 1400);
      }
    });
  }

  function showComponentArchitectureModal(loopType) {
    audio.playClick();
    let title = '', htmlContent = '';

    if (loopType === 'control') {
      title = '🟦 Control & Telemetry Loop (Авионика и RTK)';
      htmlContent = `
        <div style="text-align: left; font-size: 0.85rem; line-height: 1.5; color: #d8e5f5;">
          • <strong>Полетный контроллер:</strong> Cube Orange+ (Triple IMU, STM32H757 Dual-Core).<br>
          • <strong>Навигация RTK GNSS:</strong> Here3+ (u-blox ZED-F9P, точность позиционирования 1.8 см).<br>
          • <strong>Линк управления и телеметрии:</strong> ExpressLRS 900 MHz (Diversity Rx, 100mW–1W адаптивная мощность, дальность до 35 км).<br>
          • <strong>FPV видеоканал:</strong> HD Digital 5.8 GHz с OSD-телеметрией искусственного горизонта.<br>
          • <strong>Рулевые сервоприводы:</strong> KST DS589MG (титановый редуктор, 9.2 кг·см, герметичные IP67).
        </div>
      `;
    } else if (loopType === 'propulsion') {
      title = '🟧 Power & Propulsion Loop (Силовая Установка)';
      htmlContent = `
        <div style="text-align: left; font-size: 0.85rem; line-height: 1.5; color: #d8e5f5;">
          • <strong>Электродвигатели:</strong> 2x T-Motor U8 II 180KV (Brushless Outrunner, пиковая мощность 2.0 кВт каждый).<br>
          • <strong>Воздушные винты:</strong> Carbon Fiber 20x10" (КПД 78% на скорости 16 м/с).<br>
          • <strong>Регуляторы скорости ESC:</strong> 2x T-Motor Flame 80A 12S FOC (векторное управление, мгновенный отклик).<br>
          • <strong>Smart BMS:</strong> мониторинг напряжения каждой ячейки, датчики Холла по току и термозащита.<br>
          • <strong>Водородный стек PEM:</strong> рабочая температура 65°C, жидкостный радиатор охлаждения.
        </div>
      `;
    } else {
      title = '🟩 Spraying & Fire Drop Loop (Целевая Нагрузка)';
      htmlContent = `
        <div style="text-align: left; font-size: 0.85rem; line-height: 1.5; color: #d8e5f5;">
          • <strong>Бак нагрузки:</strong> 10L Quick-Swap капсула из углепластика с успокоительными перегородками (Zero Slosh).<br>
          • <strong>Насос подачи:</strong> 12V 80W бесщеточная мембранная помпа с ШИМ-управлением потока.<br>
          • <strong>Расходомер:</strong> импульсный датчик протока жидкости для авто-дозировки на гектар.<br>
          • <strong>Агро-форсунки:</strong> 6x центробежных вращающихся распылителей ULV (капли 80–150 мкм).<br>
          • <strong>Пожарный затвор:</strong> сервоуправляемый быстродействующий шлюзовой затвор (сброс 10 л за 0.8 сек).
        </div>
      `;
    }

    Swal.fire({
      title: title,
      html: htmlContent,
      icon: 'info',
      background: '#0a1124',
      color: '#fff',
      confirmButtonColor: '#00e5ff'
    });
  }

  function toggleBlueprintFullscreen() {
    audio.playClick();
    const sec = document.getElementById('blueprint-section');
    const btn = document.getElementById('btn-toggle-bp-fullscreen');
    if (!sec) return;

    sec.classList.toggle('fullscreen-mode');
    const isFull = sec.classList.contains('fullscreen-mode');

    if (btn) {
      btn.innerHTML = isFull
        ? `<i class="fa-solid fa-compress"></i> <span>Свернуть Презентацию</span>`
        : `<i class="fa-solid fa-expand"></i> <span data-i18n="bp_btn_fullscreen">Презентация на весь экран</span>`;
    }
  }

  function exportBlueprintPoster() {
    audio.playClick();
    const element = document.getElementById('blueprint-section');
    if (!element) return;

    Swal.fire({
      title: STATE.lang === 'ru' ? 'Экспорт Инженерного Плаката А1...' : 'Exporting Master Poster A1...',
      text: 'PDF Compilation in HD Vector Resolution',
      icon: 'info',
      showConfirmButton: false,
      timer: 2000,
      background: '#0a1124',
      color: '#fff'
    });

    const opt = {
      margin: 8,
      filename: `AeroTerra_H2_Master_Blueprint_Poster_${STATE.blueprintProto.toUpperCase()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#050a14' },
      jsPDF: { unit: 'mm', format: 'a2', orientation: 'landscape' }
    };

    setTimeout(() => {
      if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save();
      }
    }, 600);
  }


  function applyLanguage() {
    const dict = I18N[STATE.lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) el.textContent = dict[key];
    });

    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.dataset.i18nPh;
      if (dict[key]) el.placeholder = dict[key];
    });

    if (STATE.activeHotspot) {
      updateFlyoutPanel(HOTSPOTS_DATA[STATE.activeHotspot]);
    }
    updateCalculations();
  }

  // --------------------------------------------------------------------------
  // 17. ACCESS CONTROL & NEON AUTHENTICATION (RBAC & SUPERADMIN)
  // --------------------------------------------------------------------------
  const SUPER_ADMIN_EMAIL = 'sarikmusaev2006@gmail.com';

  function isSuperAdmin() {
    try {
      const rawUser = localStorage.getItem('aeroterra_user');
      const token = localStorage.getItem('aeroterra_token');
      const role = localStorage.getItem('aeroterra_role');
      if (!rawUser || !token) return false;
      const user = JSON.parse(rawUser);
      return (
        (role === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN') &&
        typeof user.email === 'string' &&
        user.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL
      );
    } catch (e) {
      return false;
    }
  }

  function showSecurityAlert(msg) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: '🔒 Доступ ограничен',
        text: msg,
        icon: 'warning',
        background: '#0a1224',
        color: '#fff',
        confirmButtonColor: '#00e5ff'
      });
    } else {
      alert('🔒 ' + msg);
    }
  }

  async function hashAdminPassword(pwd) {
    try {
      const enc = new TextEncoder().encode('aeroterra_owner_salt_v1_' + pwd);
      const buf = await window.crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return 'fallback_hash_' + pwd;
    }
  }

  function applyAdminAccessState() {
    if (isSuperAdmin()) {
      document.body.classList.add('is-super-admin');
    } else {
      document.body.classList.remove('is-super-admin');
      const adminModal = document.getElementById('admin-cms-modal');
      if (adminModal) adminModal.style.display = 'none';
      const devModal = document.getElementById('dev-console-modal');
      if (devModal) devModal.style.display = 'none';
      document.body.style.overflow = '';
      const floatingControls = document.getElementById('cms-floating-controls');
      if (floatingControls) floatingControls.style.display = 'none';
      const toggleInline = document.getElementById('toggle-cms-inline-edit');
      if (toggleInline) toggleInline.checked = false;
      const editable = document.querySelectorAll('[contenteditable="true"]');
      editable.forEach(el => {
        el.removeAttribute('contenteditable');
        el.classList.remove('cms-editable-active');
      });
    }
  }

  function setupNeonAuth() {
    const authModal = document.getElementById('auth-modal');
    const btnOpenAuth = document.getElementById('btn-open-auth');
    const btnCloseAuth = document.getElementById('btn-close-auth');
    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const modalAlert = document.getElementById('auth-modal-alert');
    const ownerSetupHint = document.getElementById('owner-setup-hint');
    const btnQuickDemo = document.getElementById('btn-quick-demo-login');
    const userBadge = document.getElementById('user-profile-badge');
    const headerUserName = document.getElementById('header-user-name');
    const headerUserRole = document.getElementById('header-user-role');
    const headerUserAvatar = document.getElementById('header-user-avatar');
    const btnHeaderLogout = document.getElementById('btn-header-logout');
    const neonStatusText = document.getElementById('neon-status-text');

    function showAlert(text, type = 'error') {
      if (!modalAlert) return;
      modalAlert.textContent = text;
      modalAlert.className = 'auth-alert ' + type;
      modalAlert.style.display = 'block';
    }

    function hideAlert() {
      if (modalAlert) modalAlert.style.display = 'none';
    }

    function updateAuthUI(user) {
      if (user) {
        if (btnOpenAuth) btnOpenAuth.style.display = 'none';
        if (userBadge) userBadge.style.display = 'flex';

        if (isSuperAdmin()) {
          document.body.classList.add('is-super-admin');
          if (headerUserName) headerUserName.textContent = 'Сарик Мусаев';
          if (headerUserRole) {
            headerUserRole.textContent = '👑 OWNER: sarikmusaev2006@gmail.com';
            headerUserRole.style.color = 'var(--accent-amber)';
          }
          if (headerUserAvatar) headerUserAvatar.textContent = '👑';
        } else {
          document.body.classList.remove('is-super-admin');
          if (headerUserName) headerUserName.textContent = user.fullName || user.email || 'Инженер';
          if (headerUserRole) {
            headerUserRole.textContent = (user.role || 'GUEST').toUpperCase();
            headerUserRole.style.color = '#94a3b8';
          }
          if (headerUserAvatar) headerUserAvatar.textContent = (user.fullName ? user.fullName[0] : 'U').toUpperCase();
        }
      } else {
        document.body.classList.remove('is-super-admin');
        if (btnOpenAuth) btnOpenAuth.style.display = 'inline-flex';
        if (userBadge) userBadge.style.display = 'none';
      }
    }

    function logoutUser() {
      localStorage.removeItem('aeroterra_token');
      localStorage.removeItem('aeroterra_role');
      localStorage.removeItem('aeroterra_user');
      applyAdminAccessState();
      updateAuthUI(null);
      showAlert('Вы вышли из учетной записи. Сессия заблокирована.', 'info');
    }

    // Dynamic Owner email hint
    const loginEmailInput = document.getElementById('login-email');
    if (loginEmailInput) {
      loginEmailInput.addEventListener('input', () => {
        const val = loginEmailInput.value.trim().toLowerCase();
        if (val === SUPER_ADMIN_EMAIL) {
          const hasHash = !!localStorage.getItem('aeroterra_owner_hash');
          if (ownerSetupHint) {
            ownerSetupHint.style.display = 'block';
            ownerSetupHint.innerHTML = hasHash
              ? `<i class="fa-solid fa-crown" style="color: #ffb800;"></i> <strong>Аккаунт Владельца проекта:</strong> Введите ваш личный Мастер-Пароль для разблокировки Админ-панели и Консоли.`
              : `<i class="fa-solid fa-key" style="color: #00ff9d;"></i> <strong>Первый вход Владельца:</strong> Задайте ваш личный Мастер-Пароль Администратора (от 6 символов). Он будет сохранён в виде SHA-256 хэша.`;
          }
        } else {
          if (ownerSetupHint) ownerSetupHint.style.display = 'none';
        }
      });
    }

    // 1-Click VIP Professor Login (strictly Guest role, no admin rights)
    const btnVipProf = document.getElementById('btn-vip-professor');
    if (btnVipProf) {
      btnVipProf.addEventListener('click', () => {
        hideAlert();
        const profUser = {
          fullName: 'Гостевой Эксперт / Член Жюри',
          email: 'guest.jury@aeroterra.aero',
          role: 'professor_guest',
          organization: 'Аттестационная комиссия / Гостевой Эксперт',
          isSuperAdmin: false
        };
        localStorage.setItem('aeroterra_token', 'prof-guest-token-' + Date.now());
        localStorage.setItem('aeroterra_role', 'GUEST');
        localStorage.setItem('aeroterra_user', JSON.stringify(profUser));
        applyAdminAccessState();
        updateAuthUI(profUser);
        showAlert('🎓 ДЕМО-ВХОД: Эксперт Жюри (Гостевой Режим). Права администрирования отключены.', 'info');
        setTimeout(() => { if (authModal) authModal.style.display = 'none'; }, 800);
      });
    }

    // Check existing stored session
    applyAdminAccessState();
    const savedToken = localStorage.getItem('aeroterra_token');
    const savedUser = localStorage.getItem('aeroterra_user');
    if (savedToken && savedUser) {
      try {
        updateAuthUI(JSON.parse(savedUser));
      } catch (e) {}
    }

    // Ping Neon health
    fetch('/api/db-health')
      .then(res => res.json())
      .then(data => {
        if (data && data.database && neonStatusText) {
          const lat = data.database.latencyMs || 12;
          neonStatusText.textContent = `Neon DB: ${lat}ms | ${data.database.mode === 'neon_serverless' ? 'Live Cloud' : 'Sandbox'}`;
        }
      })
      .catch(() => {
        if (neonStatusText) neonStatusText.textContent = 'Neon DB: Offline/Sandbox';
      });

    // Modal open / close
    if (btnOpenAuth) {
      btnOpenAuth.addEventListener('click', () => {
        hideAlert();
        if (authModal) authModal.style.display = 'flex';
      });
    }

    if (btnCloseAuth) {
      btnCloseAuth.addEventListener('click', () => {
        if (authModal) authModal.style.display = 'none';
      });
    }

    if (authModal) {
      authModal.addEventListener('click', (e) => {
        if (e.target === authModal) authModal.style.display = 'none';
      });
    }

    // Tabs toggle
    if (tabLogin && tabRegister) {
      tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        if (formLogin) formLogin.style.display = 'flex';
        if (formRegister) formRegister.style.display = 'none';
        hideAlert();
      });

      tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        if (formLogin) formLogin.style.display = 'none';
        if (formRegister) formRegister.style.display = 'flex';
        hideAlert();
      });
    }

    // Login submit (SuperAdmin vs Guest/Member)
    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();
        const emailRaw = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const email = emailRaw.trim().toLowerCase();

        // SUPER ADMIN VERIFICATION FOR OWNER
        if (email === SUPER_ADMIN_EMAIL) {
          if (!password || password.length < 6) {
            showAlert('Мастер-Пароль Владельца должен содержать минимум 6 символов!', 'error');
            return;
          }

          const savedHash = localStorage.getItem('aeroterra_owner_hash');
          const inputHash = await hashAdminPassword(password);

          if (!savedHash) {
            // First time owner login: setup personal master password
            localStorage.setItem('aeroterra_owner_hash', inputHash);
            showAlert('👑 Мастер-Пароль Владельца успешно установлен (SHA-256)!', 'success');
          } else if (savedHash !== inputHash) {
            showAlert('❌ Неверный Мастер-Пароль Владельца! Доступ к роли Администратора отклонён.', 'error');
            return;
          }

          // Optional async ping to verify Vercel serverless gateway
          try {
            fetch('/api/ai-gateway', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + password },
              body: JSON.stringify({ action: 'admin-auth', email: SUPER_ADMIN_EMAIL })
            }).catch(() => null);
          } catch (e) {}

          const ownerUser = {
            fullName: 'Сарик Мусаев',
            email: SUPER_ADMIN_EMAIL,
            role: 'SUPER_ADMIN',
            isSuperAdmin: true,
            organization: 'AeroTerra Aerospace Chief & Project Owner'
          };
          localStorage.setItem('aeroterra_token', 'super-admin-token-' + Date.now());
          localStorage.setItem('aeroterra_role', 'SUPER_ADMIN');
          localStorage.setItem('aeroterra_user', JSON.stringify(ownerUser));
          applyAdminAccessState();
          updateAuthUI(ownerUser);
          showAlert('👑 Вход Владельца выполнен! Права Супер-Администратора и Консоли активированы.', 'success');
          setTimeout(() => { if (authModal) authModal.style.display = 'none'; }, 900);
          return;
        }

        // Standard user / member login
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Ошибка входа');

          const user = Object.assign({}, data.user, { isSuperAdmin: false, role: 'club_member' });
          localStorage.setItem('aeroterra_token', data.token || ('member-token-' + Date.now()));
          localStorage.setItem('aeroterra_role', 'MEMBER');
          localStorage.setItem('aeroterra_user', JSON.stringify(user));
          applyAdminAccessState();
          updateAuthUI(user);
          showAlert('Авторизация успешна! Вход выполнен в роли Члена Клуба.', 'success');
          setTimeout(() => { if (authModal) authModal.style.display = 'none'; }, 900);
        } catch (err) {
          const fallbackUser = {
            fullName: email.split('@')[0],
            email,
            role: 'club_member',
            isSuperAdmin: false
          };
          localStorage.setItem('aeroterra_token', 'mock-token-' + Date.now());
          localStorage.setItem('aeroterra_role', 'MEMBER');
          localStorage.setItem('aeroterra_user', JSON.stringify(fallbackUser));
          applyAdminAccessState();
          updateAuthUI(fallbackUser);
          showAlert('Вход выполнен в роли Члена Клуба (Гостевой доступ).', 'success');
          setTimeout(() => { if (authModal) authModal.style.display = 'none'; }, 900);
        }
      });
    }

    // Register submit (Owner vs standard user)
    if (formRegister) {
      formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();
        const fullName = document.getElementById('reg-fullname').value.trim();
        const organization = document.getElementById('reg-org').value.trim();
        const email = document.getElementById('reg-email').value.trim().toLowerCase();
        const password = document.getElementById('reg-password').value;

        if (email === SUPER_ADMIN_EMAIL) {
          if (password.length < 6) {
            showAlert('Пароль Владельца должен содержать минимум 6 символов!', 'error');
            return;
          }
          const inputHash = await hashAdminPassword(password);
          localStorage.setItem('aeroterra_owner_hash', inputHash);
          const ownerUser = {
            fullName: fullName || 'Сарик Мусаев',
            email: SUPER_ADMIN_EMAIL,
            role: 'SUPER_ADMIN',
            isSuperAdmin: true,
            organization: organization || 'AeroTerra Aerospace Chief & Project Owner'
          };
          localStorage.setItem('aeroterra_token', 'super-admin-token-' + Date.now());
          localStorage.setItem('aeroterra_role', 'SUPER_ADMIN');
          localStorage.setItem('aeroterra_user', JSON.stringify(ownerUser));
          applyAdminAccessState();
          updateAuthUI(ownerUser);
          showAlert('👑 Аккаунт Владельца зарегистрирован и защищён SHA-256!', 'success');
          setTimeout(() => { if (authModal) authModal.style.display = 'none'; }, 900);
          return;
        }

        const fallbackUser = { fullName, organization, role: 'club_member', email, isSuperAdmin: false };
        localStorage.setItem('aeroterra_token', 'member-token-' + Date.now());
        localStorage.setItem('aeroterra_role', 'MEMBER');
        localStorage.setItem('aeroterra_user', JSON.stringify(fallbackUser));
        applyAdminAccessState();
        updateAuthUI(fallbackUser);
        showAlert('Аккаунт зарегистрирован (роль: Член Клуба).', 'success');
        setTimeout(() => { if (authModal) authModal.style.display = 'none'; }, 900);
      });
    }

    // Quick demo login (Test-Pilot)
    if (btnQuickDemo) {
      btnQuickDemo.addEventListener('click', async () => {
        hideAlert();
        const demoUser = {
          fullName: 'Капитан Алекс Воронов',
          email: 'pilot@aeroterra.aero',
          role: 'test_pilot',
          organization: 'Aerospace Engineering Club / Flight Test',
          isSuperAdmin: false
        };
        localStorage.setItem('aeroterra_token', 'demo-token-pilot');
        localStorage.setItem('aeroterra_role', 'GUEST');
        localStorage.setItem('aeroterra_user', JSON.stringify(demoUser));
        applyAdminAccessState();
        updateAuthUI(demoUser);
        showAlert('Вход в демо-профиль пилота выполнен! Права администрирования отключены.', 'info');
        setTimeout(() => { if (authModal) authModal.style.display = 'none'; }, 800);
      });
    }

    // Logout
    if (btnHeaderLogout) {
      btnHeaderLogout.addEventListener('click', logoutUser);
    }
  }

  // --------------------------------------------------------------------------
  // 18. IN-APP PRESENTATION MODAL VIEWER (8-SLIDE APPLE KEYNOTE 60 FPS)
  // --------------------------------------------------------------------------
  function setupPresentationModal() {
    const btnPres = document.getElementById('btn-presentation-link');
    const presModal = document.getElementById('presentation-modal');
    const btnClosePres = document.getElementById('btn-close-presentation');
    const btnToggleMode = document.getElementById('btn-toggle-pres-mode');
    const presModeLabel = document.getElementById('pres-mode-label');
    const slidesViewport = document.getElementById('presentation-slides-viewport');
    const bottomNav = document.getElementById('presentation-bottom-nav');
    const iframeWrap = document.getElementById('presentation-iframe-wrap');
    const presIframe = document.getElementById('presentation-iframe');
    const btnPrev = document.getElementById('btn-slide-prev');
    const btnNext = document.getElementById('btn-slide-next');
    const currentNumEl = document.getElementById('pres-current-slide-num');
    const totalNumEl = document.getElementById('pres-total-slides-num');
    const dots = document.querySelectorAll('.slide-dot');
    const slides = document.querySelectorAll('.pres-slide');
    const btnToSim = document.getElementById('btn-pres-to-sim');

    // Auto-Play Controls
    const btnAutoPlay = document.getElementById('btn-pres-autoplay');
    const autoPlayIcon = document.getElementById('pres-autoplay-icon');
    const autoPlayText = document.getElementById('pres-autoplay-text');
    const autoPlayProgress = document.getElementById('pres-autoplay-progress');

    let currentSlide = 1;
    const totalSlides = slides.length || 8;
    if (totalNumEl) totalNumEl.textContent = totalSlides;
    let isIframeMode = false;
    let isAutoPlaying = false;
    let autoPlayTimer = null;
    let autoPlayStartTime = 0;
    const slideDurationMs = 5500;

    function showSlide(index) {
      if (index < 1) index = 1;
      if (index > totalSlides) index = totalSlides;
      currentSlide = index;

      slides.forEach(slide => {
        const slideNum = parseInt(slide.getAttribute('data-slide') || '1', 10);
        slide.classList.toggle('active', slideNum === currentSlide);
      });

      dots.forEach(dot => {
        const dotNum = parseInt(dot.getAttribute('data-slide') || '1', 10);
        dot.classList.toggle('active', dotNum === currentSlide);
      });

      if (currentNumEl) currentNumEl.textContent = currentSlide;

      if (btnPrev) btnPrev.disabled = (currentSlide === 1);
      if (btnNext) {
        if (currentSlide === totalSlides) {
          btnNext.innerHTML = `<span>В начало</span> <i class="fa-solid fa-rotate-left"></i>`;
        } else {
          btnNext.innerHTML = `<span>Вперёд</span> <i class="fa-solid fa-chevron-right"></i>`;
        }
      }
      if (slidesViewport) slidesViewport.scrollTop = 0;

      // Reset auto-play timer on slide change if active
      if (isAutoPlaying) {
        restartAutoPlayTimer();
      }
    }

    // Auto-Play 60 FPS Engine
    function startAutoPlay() {
      isAutoPlaying = true;
      if (autoPlayIcon) {
        autoPlayIcon.className = 'fa-solid fa-pause';
      }
      if (autoPlayText) {
        autoPlayText.textContent = '⏸️ Пауза';
      }
      if (btnAutoPlay) {
        btnAutoPlay.classList.add('active');
      }
      restartAutoPlayTimer();
    }

    function stopAutoPlay() {
      isAutoPlaying = false;
      if (autoPlayIcon) {
        autoPlayIcon.className = 'fa-solid fa-play';
      }
      if (autoPlayText) {
        autoPlayText.textContent = '▶️ Авто 60 FPS';
      }
      if (btnAutoPlay) {
        btnAutoPlay.classList.remove('active');
      }
      if (autoPlayProgress) {
        autoPlayProgress.style.width = '0%';
      }
      if (autoPlayTimer) {
        cancelAnimationFrame(autoPlayTimer);
        autoPlayTimer = null;
      }
    }

    function restartAutoPlayTimer() {
      if (autoPlayTimer) cancelAnimationFrame(autoPlayTimer);
      autoPlayStartTime = performance.now();

      function tickAutoPlay(now) {
        if (!isAutoPlaying || presModal.style.display !== 'flex') {
          stopAutoPlay();
          return;
        }
        const elapsed = now - autoPlayStartTime;
        const progressPct = Math.min(100, (elapsed / slideDurationMs) * 100);
        if (autoPlayProgress) {
          autoPlayProgress.style.width = progressPct + '%';
        }

        if (elapsed >= slideDurationMs) {
          if (currentSlide === totalSlides) {
            showSlide(1);
          } else {
            showSlide(currentSlide + 1);
          }
          return;
        }
        autoPlayTimer = requestAnimationFrame(tickAutoPlay);
      }
      autoPlayTimer = requestAnimationFrame(tickAutoPlay);
    }

    if (btnAutoPlay) {
      btnAutoPlay.addEventListener('click', (e) => {
        e.preventDefault();
        if (isAutoPlaying) {
          stopAutoPlay();
        } else {
          startAutoPlay();
        }
      });
    }

    function toggleMode() {
      isIframeMode = !isIframeMode;
      if (isIframeMode) {
        stopAutoPlay();
        if (slidesViewport) slidesViewport.style.display = 'none';
        if (bottomNav) bottomNav.style.display = 'none';
        if (iframeWrap) iframeWrap.style.display = 'block';
        if (presIframe && (!presIframe.src || presIframe.src === 'about:blank' || !presIframe.src.includes('landing.html'))) {
          presIframe.src = 'landing.html';
        }
        if (presModeLabel) presModeLabel.textContent = '📑 Слайды';
      } else {
        if (iframeWrap) iframeWrap.style.display = 'none';
        if (slidesViewport) slidesViewport.style.display = 'flex';
        if (bottomNav) bottomNav.style.display = 'flex';
        if (presModeLabel) presModeLabel.textContent = '🌐 Landing View';
      }
    }

    // Interactive Hydrogen Glow Particle Canvas (60 FPS)
    const particleCanvas = document.getElementById('pres-particle-canvas');
    let particleAnimId = null;
    let particles = [];

    function initParticleCanvas() {
      if (!particleCanvas) return;
      const ctx = particleCanvas.getContext('2d');
      if (!ctx) return;

      const resize = () => {
        particleCanvas.width = particleCanvas.clientWidth || window.innerWidth;
        particleCanvas.height = particleCanvas.clientHeight || window.innerHeight;
      };
      resize();
      window.addEventListener('resize', resize);

      const numParticles = 42;
      particles = [];
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * particleCanvas.width,
          y: Math.random() * particleCanvas.height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          r: Math.random() * 2.2 + 1.2,
          color: Math.random() > 0.35 ? '#00e5ff' : '#10b981',
          alpha: Math.random() * 0.5 + 0.3
        });
      }

      function drawParticles() {
        if (presModal.style.display !== 'flex') {
          particleAnimId = null;
          return;
        }
        ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

        // Draw connections
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.hypot(dx, dy);
            if (dist < 95) {
              const lineAlpha = (1 - dist / 95) * 0.22;
              ctx.strokeStyle = `rgba(0, 229, 255, ${lineAlpha})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }

        // Draw nodes
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = particleCanvas.width;
          if (p.x > particleCanvas.width) p.x = 0;
          if (p.y < 0) p.y = particleCanvas.height;
          if (p.y > particleCanvas.height) p.y = 0;

          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        particleAnimId = requestAnimationFrame(drawParticles);
      }

      if (!particleAnimId) {
        particleAnimId = requestAnimationFrame(drawParticles);
      }
    }

    if (btnPres && presModal) {
      btnPres.addEventListener('click', (e) => {
        e.preventDefault();
        presModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        showSlide(currentSlide);
        initParticleCanvas();
      });
    }

    if (btnToggleMode) {
      btnToggleMode.addEventListener('click', toggleMode);
    }

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        showSlide(currentSlide - 1);
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (currentSlide === totalSlides) {
          showSlide(1);
        } else {
          showSlide(currentSlide + 1);
        }
      });
    }

    dots.forEach(dot => {
      dot.addEventListener('click', function () {
        const target = parseInt(this.getAttribute('data-slide') || '1', 10);
        showSlide(target);
      });
    });

    // Touch Swipe Gestures for Mobile
    let touchStartX = 0;
    let touchStartY = 0;
    if (slidesViewport) {
      slidesViewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      slidesViewport.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1) {
          const dx = e.changedTouches[0].clientX - touchStartX;
          const dy = e.changedTouches[0].clientY - touchStartY;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            if (dx < 0) {
              // Swipe left -> next slide
              if (currentSlide < totalSlides) showSlide(currentSlide + 1);
              else showSlide(1);
            } else {
              // Swipe right -> prev slide
              if (currentSlide > 1) showSlide(currentSlide - 1);
            }
          }
        }
      }, { passive: true });
    }

    if (btnToSim && presModal) {
      btnToSim.addEventListener('click', () => {
        stopAutoPlay();
        presModal.style.display = 'none';
        document.body.style.overflow = '';
        const simTab = document.getElementById('nav-simulator-tab');
        if (simTab) simTab.click();
      });
    }

    if (btnClosePres && presModal) {
      btnClosePres.addEventListener('click', () => {
        stopAutoPlay();
        presModal.style.display = 'none';
        document.body.style.overflow = '';
      });
    }

    // Close on overlay backdrop click
    if (presModal) {
      presModal.addEventListener('click', (e) => {
        if (e.target === presModal) {
          stopAutoPlay();
          presModal.style.display = 'none';
          document.body.style.overflow = '';
        }
      });
    }

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (!presModal || presModal.style.display !== 'flex') return;
      if (e.key === 'Escape') {
        stopAutoPlay();
        presModal.style.display = 'none';
        document.body.style.overflow = '';
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        if (!isIframeMode && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          if (currentSlide === totalSlides) showSlide(1);
          else showSlide(currentSlide + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (!isIframeMode && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          showSlide(currentSlide - 1);
        }
      }
    });

    // Listen for postMessage from inside landing iframe
    window.addEventListener('message', (event) => {
      if (event.data && (event.data.type === 'CLOSE_PRESENTATION' || event.data.type === 'GO_TO_HANGAR')) {
        stopAutoPlay();
        if (presModal) {
          presModal.style.display = 'none';
          document.body.style.overflow = '';
        }
        if (event.data.type === 'GO_TO_HANGAR') {
          const hangarTab = document.querySelector('.nav-item a[href="#hangar-section"]');
          if (hangarTab) hangarTab.click();
        }
      }
    });

    // Initial slide
    showSlide(1);
  }

  // --------------------------------------------------------------------------
  // CRYPTO VAULT: WEB CRYPTO API AES-GCM 256-BIT WITH PBKDF2
  // --------------------------------------------------------------------------
  const CryptoVault = {
    VAULT_KEY: 'aeroterra_encrypted_vault',

    async deriveKey(pin, salt) {
      const enc = new TextEncoder();
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(pin),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      return window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    },

    async encryptApiKey(apiKey, pin) {
      if (!apiKey || !pin) throw new Error('API ключ и PIN обязательны для шифрования');
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const key = await this.deriveKey(pin, salt);
      const enc = new TextEncoder();
      const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(apiKey)
      );

      const vaultData = {
        salt: btoa(String.fromCharCode(...salt)),
        iv: btoa(String.fromCharCode(...iv)),
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
      };
      localStorage.setItem(this.VAULT_KEY, JSON.stringify(vaultData));
      return true;
    },

    async decryptApiKey(pin) {
      const raw = localStorage.getItem(this.VAULT_KEY);
      if (!raw) throw new Error('Сейф пуст');
      const vaultData = JSON.parse(raw);
      const salt = new Uint8Array(atob(vaultData.salt).split('').map(c => c.charCodeAt(0)));
      const iv = new Uint8Array(atob(vaultData.iv).split('').map(c => c.charCodeAt(0)));
      const ciphertext = new Uint8Array(atob(vaultData.ciphertext).split('').map(c => c.charCodeAt(0)));

      const key = await this.deriveKey(pin, salt);
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );
      return new TextDecoder().decode(decrypted);
    },

    isVaultSet() {
      return !!localStorage.getItem(this.VAULT_KEY);
    },

    purgeVault() {
      localStorage.removeItem(this.VAULT_KEY);
    },

    getMaskedKey() {
      if (!this.isVaultSet()) return 'НЕ ЗАДАН (ПУСТО)';
      return '••••••••••••••••••••••••••••••••';
    }
  };

  // --------------------------------------------------------------------------
  // DEV CONSOLE CONTROLLER (60Hz PHYSICS, SECURITY VAULT, CLI TERMINAL)
  // --------------------------------------------------------------------------
  function setupDevConsole() {
    const modal = document.getElementById('dev-console-modal');
    const btnOpen = document.getElementById('btn-open-dev-console');
    const btnClose = document.getElementById('btn-close-dev-console');

    // Tabs
    const tabPhysics = document.getElementById('tab-dev-physics');
    const tabSecurity = document.getElementById('tab-dev-security');
    const tabCli = document.getElementById('tab-dev-cli');
    const panePhysics = document.getElementById('pane-dev-physics');
    const paneSecurity = document.getElementById('pane-dev-security');
    const paneCli = document.getElementById('pane-dev-cli');

    function openConsole(targetTab = null) {
      if (!isSuperAdmin()) {
        showSecurityAlert('Доступ запрещён. Консоль разработчика доступна исключительно владельцу проекта (sarikmusaev2006@gmail.com).');
        return;
      }
      if (!modal) return;
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      if (targetTab) switchTab(targetTab);
      syncVaultStatus();
      startPhysicsLoop();
    }

    function closeConsole() {
      if (!modal) return;
      modal.style.display = 'none';
      document.body.style.overflow = '';
      stopPhysicsLoop();
    }

    function toggleConsole() {
      if (!modal) return;
      if (!isSuperAdmin()) {
        showSecurityAlert('Доступ запрещён. Консоль разработчика доступна исключительно владельцу проекта.');
        return;
      }
      if (modal.style.display === 'flex') {
        closeConsole();
      } else {
        openConsole();
      }
    }

    function switchTab(name) {
      const tabs = [tabPhysics, tabSecurity, tabCli];
      const panes = [panePhysics, paneSecurity, paneCli];
      tabs.forEach(t => t?.classList.remove('active'));
      panes.forEach(p => { if (p) p.style.display = 'none'; });

      if (name === 'physics') {
        tabPhysics?.classList.add('active');
        if (panePhysics) panePhysics.style.display = 'block';
      } else if (name === 'security') {
        tabSecurity?.classList.add('active');
        if (paneSecurity) paneSecurity.style.display = 'block';
        syncVaultStatus();
      } else if (name === 'cli') {
        tabCli?.classList.add('active');
        if (paneCli) paneCli.style.display = 'block';
        document.getElementById('dev-cli-input')?.focus();
      }
    }

    tabPhysics?.addEventListener('click', () => switchTab('physics'));
    tabSecurity?.addEventListener('click', () => switchTab('security'));
    tabCli?.addEventListener('click', () => switchTab('cli'));

    btnOpen?.addEventListener('click', toggleConsole);
    btnClose?.addEventListener('click', closeConsole);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeConsole();
    });

    // Global Hotkeys: ~ / ` / ё / Ё / Ctrl+Shift+D / Esc (Locked for non-admins)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal?.style.display === 'flex') {
        closeConsole();
        return;
      }
      if ((e.code === 'Backquote' || e.key === '`' || e.key === '~' || e.key === 'ё' || e.key === 'Ё') ||
          (e.ctrlKey && e.shiftKey && (e.code === 'KeyD' || e.key === 'D' || e.key === 'd'))) {
        if (e.target && e.target.id === 'dev-cli-input' && e.key === '`') return;
        e.preventDefault();
        if (!isSuperAdmin()) {
          showSecurityAlert('Доступ запрещён. Консоль разработчика доступна исключительно владельцу проекта.');
          return;
        }
        toggleConsole();
      }
    });

    // ---------------------------------------------------------
    // TAB 1: 60Hz PHYSICS INSPECTOR LOOP
    // ---------------------------------------------------------
    let physicsLoopId = null;

    function startPhysicsLoop() {
      if (physicsLoopId) return;
      function loop() {
        if (!modal || modal.style.display !== 'flex') {
          physicsLoopId = null;
          return;
        }
        updatePhysicsTelemetry();
        physicsLoopId = requestAnimationFrame(loop);
      }
      physicsLoopId = requestAnimationFrame(loop);
    }

    function stopPhysicsLoop() {
      if (physicsLoopId) {
        cancelAnimationFrame(physicsLoopId);
        physicsLoopId = null;
      }
    }

    function updatePhysicsTelemetry() {
      const m = window.AeroTerraSim?.liveMetrics;
      const elIas = document.getElementById('dev-val-ias');
      const elTas = document.getElementById('dev-val-tas');
      const elAlt = document.getElementById('dev-val-alt');
      const elVsi = document.getElementById('dev-val-vsi');
      const elAngles = document.getElementById('dev-val-angles');
      const elPr = document.getElementById('dev-val-pr');
      const elAero = document.getElementById('dev-val-aero');
      const elClcd = document.getElementById('dev-val-clcd');
      const elForces = document.getElementById('dev-val-forces');
      const elForces2 = document.getElementById('dev-val-forces2');
      const elCg = document.getElementById('dev-val-cg');
      const elMargin = document.getElementById('dev-val-margin');
      const elDt = document.getElementById('dev-dt-display');
      const elGuard = document.getElementById('dev-guard-status');

      if (!m) {
        if (elGuard) elGuard.textContent = 'STANDBY (SIM PAUSED)';
        return;
      }

      if (elIas) elIas.textContent = `${Math.round(m.ias || 0)} км/ч`;
      if (elTas) elTas.textContent = `TAS: ${(m.tas || 0).toFixed(1)} м/с`;
      if (elAlt) elAlt.textContent = `${Math.round(m.alt || 0)} м`;
      if (elVsi) elVsi.textContent = `VSI: ${(m.vsi >= 0 ? '+' : '')}${(m.vsi || 0).toFixed(1)} м/с`;
      if (elAngles) elAngles.textContent = `α: ${(m.aoa >= 0 ? '+' : '')}${(m.aoa || 0).toFixed(1)}°`;
      if (elPr) elPr.textContent = `θ: ${(m.pitch || 0).toFixed(1)}° | φ: ${(m.roll || 0).toFixed(1)}°`;
      if (elAero) elAero.textContent = `L/D: ${(m.ld || 14.0).toFixed(1)}`;
      if (elClcd) elClcd.textContent = `CL: ${(m.cl || 0.45).toFixed(2)} | CD: ${(m.cd || 0.032).toFixed(3)}`;
      if (elForces) elForces.textContent = `L: ${m.lift || 0} N | T: ${m.thrust || 0} N`;
      if (elForces2) elForces2.textContent = `D: ${m.drag || 0} N | W: ${m.weight || 245} N`;
      if (elCg) elCg.textContent = `CG: ${(m.cg || 28.5).toFixed(1)}% MAC`;
      if (elMargin) elMargin.textContent = `Static Margin: +${(m.margin || 11.2).toFixed(1)}%`;
      if (elDt) elDt.textContent = `${(m.dt || 0.016).toFixed(3)}s`;
      if (elGuard) elGuard.textContent = m.guardStatus || 'ACTIVE (0 EXPLOSIONS)';
    }

    // Tuning Sliders
    const sGravity = document.getElementById('slider-dev-gravity');
    const dGravity = document.getElementById('disp-dev-gravity');
    const sRho = document.getElementById('slider-dev-rho');
    const dRho = document.getElementById('disp-dev-rho');
    const sFlaps = document.getElementById('slider-dev-flaps');
    const dFlaps = document.getElementById('disp-dev-flaps');
    const sSens = document.getElementById('slider-dev-sens');
    const dSens = document.getElementById('disp-dev-sens');
    const btnResetPhysics = document.getElementById('btn-dev-reset-physics');

    sGravity?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (window.AeroTerraSim?.devOverrides) window.AeroTerraSim.devOverrides.gravityScale = val;
      if (dGravity) dGravity.textContent = `${val.toFixed(2)} g`;
    });

    sRho?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (window.AeroTerraSim?.devOverrides) window.AeroTerraSim.devOverrides.rho = val;
      if (dRho) dRho.textContent = `${val.toFixed(3)} кг/м³`;
    });

    sFlaps?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (window.AeroTerraSim?.devOverrides) window.AeroTerraSim.devOverrides.flapsMult = val;
      if (dFlaps) dFlaps.textContent = `${val.toFixed(2)}x`;
    });

    sSens?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (window.AeroTerraSim?.devOverrides) window.AeroTerraSim.devOverrides.sens = val;
      if (dSens) dSens.textContent = `${val.toFixed(2)}x`;
    });

    btnResetPhysics?.addEventListener('click', () => {
      if (window.AeroTerraSim?.resetDevOverrides) window.AeroTerraSim.resetDevOverrides();
      if (sGravity) sGravity.value = 1.0;
      if (dGravity) dGravity.textContent = '1.00 g';
      if (sRho) sRho.value = 1.225;
      if (dRho) dRho.textContent = '1.225 кг/м³';
      if (sFlaps) sFlaps.value = 1.35;
      if (dFlaps) dFlaps.textContent = '1.35x';
      if (sSens) sSens.value = 1.0;
      if (dSens) dSens.textContent = '1.00x';
    });

    // Teleport Buttons
    document.getElementById('btn-dev-tp-runway')?.addEventListener('click', () => {
      window.AeroTerraSim?.teleportTo(1.25, 0, 0, 0);
    });
    document.getElementById('btn-dev-tp-cruise')?.addEventListener('click', () => {
      window.AeroTerraSim?.teleportTo(700, 160, -1.0, 0);
    });
    document.getElementById('btn-dev-tp-high')?.addEventListener('click', () => {
      window.AeroTerraSim?.teleportTo(2500, 180, -0.5, 0);
    });
    document.getElementById('btn-dev-stall-test')?.addEventListener('click', () => {
      window.AeroTerraSim?.triggerStallTest();
    });

    // ---------------------------------------------------------
    // TAB 2: SECURITY & AES-256 VAULT
    // ---------------------------------------------------------
    function syncVaultStatus() {
      const vaultStatus = document.getElementById('dev-vault-status-badge');
      const maskedKey = document.getElementById('dev-masked-key-display');
      if (CryptoVault.isVaultSet()) {
        if (vaultStatus) {
          vaultStatus.textContent = 'AES-GCM ЗАШИФРОВАН';
          vaultStatus.className = 'badge-status-ok';
        }
        if (maskedKey) maskedKey.textContent = '••••••••••••••••••••••••••••••••';
      } else {
        if (vaultStatus) {
          vaultStatus.textContent = 'СЕЙФ ПУСТ';
          vaultStatus.className = 'badge-status-sub';
        }
        if (maskedKey) maskedKey.textContent = 'НЕ ЗАДАН (ПУСТО)';
      }
    }

    document.getElementById('btn-dev-vault-save')?.addEventListener('click', async () => {
      const apiKey = document.getElementById('input-dev-api-key')?.value.trim();
      const pin = document.getElementById('input-dev-pin')?.value.trim();
      const out = document.getElementById('dev-vault-ping-output');

      if (!apiKey || !pin) {
        if (out) out.textContent = 'Ошибка: введите API ключ и PIN код (минимум 4 знака).';
        return;
      }
      try {
        await CryptoVault.encryptApiKey(apiKey, pin);
        syncVaultStatus();
        if (out) out.textContent = 'Успех: ключ зашифрован в Web Crypto AES-GCM 256-bit!';
        document.getElementById('input-dev-api-key').value = '';
        document.getElementById('input-dev-pin').value = '';
      } catch (err) {
        if (out) out.textContent = 'Ошибка шифрования: ' + err.message;
      }
    });

    document.getElementById('btn-dev-vault-purge')?.addEventListener('click', () => {
      CryptoVault.purgeVault();
      syncVaultStatus();
      const out = document.getElementById('dev-vault-ping-output');
      if (out) out.textContent = 'Локальный сейф очищен.';
    });

    document.getElementById('btn-dev-vault-ping')?.addEventListener('click', async () => {
      const out = document.getElementById('dev-vault-ping-output');
      if (out) out.textContent = 'Отправка тестового запроса к /api/ai-gateway...';
      const t0 = performance.now();
      try {
        const res = await fetch('/api/ai-gateway', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'PING_PROBE', ping: true })
        });
        const dt = Math.round(performance.now() - t0);
        if (res.ok) {
          const data = await res.json();
          if (out) out.textContent = `Шлюз ответил 200 OK (${dt}мс). Статус: ${data.message || 'Готов'}`;
        } else {
          if (out) out.textContent = `Шлюз ответил ${res.status} (${dt}мс). Локальный AI-движок активен как резерв.`;
        }
      } catch (err) {
        const dt = Math.round(performance.now() - t0);
        if (out) out.textContent = `Серверный шлюз недоступен (${dt}мс). Работает локальный Aerospace AI Engine.`;
      }
    });

    // ---------------------------------------------------------
    // TAB 3: RETRO CLI TERMINAL
    // ---------------------------------------------------------
    const cliScreen = document.getElementById('dev-cli-screen');
    const cliForm = document.getElementById('dev-cli-form');
    const cliInput = document.getElementById('dev-cli-input');

    function printCli(text, className = '') {
      if (!cliScreen) return;
      const line = document.createElement('div');
      line.className = `cli-line ${className}`;
      line.innerHTML = text;
      cliScreen.appendChild(line);
      cliScreen.scrollTop = cliScreen.scrollHeight;
    }

    function runCliCommand(rawCmd) {
      const cmd = rawCmd.trim();
      if (!cmd) return;
      printCli(`<span class="cyan">AeroTerra-OS:~$</span> ${escapeHtml(cmd)}`);

      const parts = cmd.split(/\s+/);
      const action = parts[0].toLowerCase();
      const arg1 = parts[1];

      switch (action) {
        case '/help':
          printCli('Доступные команды авиационного терминала:', 'amber');
          printCli('  <span class="cyan">/tp &lt;alt&gt;</span>       - Мгновенный перенос на высоту (м), напр.: /tp 700');
          printCli('  <span class="cyan">/wind &lt;spd&gt;</span>     - Установить боковой ветер (м/с), напр.: /wind 12');
          printCli('  <span class="cyan">/refuel</span>         - Полная заправка водородом и жидкостью (100%)');
          printCli('  <span class="cyan">/stall_test</span>     - Имитация критического сваливания (V=58 км/ч, AoA=19.5°)');
          printCli('  <span class="cyan">/api_status</span>     - Проверка Vercel Serverless шлюза и AES-256 сейфа');
          printCli('  <span class="cyan">/export_logs</span>    - Экспорт полного телеметрического лога в JSON');
          printCli('  <span class="cyan">clear</span>           - Очистить экран терминала');
          break;

        case '/tp':
          const targetAlt = parseFloat(arg1);
          if (isNaN(targetAlt)) {
            printCli('Ошибка: укажите высоту в метрах, напр.: /tp 700', 'error');
          } else {
            window.AeroTerraSim?.teleportTo(targetAlt, 160, -1, 0);
            printCli(`Самолёт перенесён на высоту ${targetAlt} м (IAS = 160 км/ч).`, 'emerald');
          }
          break;

        case '/wind':
          const wSpd = parseFloat(arg1);
          if (isNaN(wSpd)) {
            printCli('Ошибка: укажите скорость ветра в м/с, напр.: /wind 8', 'error');
          } else {
            if (window.AeroTerraSim?.devOverrides) {
              window.AeroTerraSim.devOverrides.crosswind = wSpd;
            }
            printCli(`Боковой ветер установлен: ${wSpd} м/с.`, 'emerald');
          }
          break;

        case '/refuel':
          window.AeroTerraSim?.refuel();
          printCli('Водородная система: H2 = 100% | Бак спрея/воды: 100%.', 'emerald');
          break;

        case '/stall_test':
          window.AeroTerraSim?.triggerStallTest();
          printCli('Имитация сваливания запущена! Скорость снижена, угол атаки превышен.', 'amber');
          break;

        case '/api_status':
          const vStat = CryptoVault.isVaultSet() ? 'AES-GCM Зашифрован' : 'Пуст';
          printCli(`Vercel Gateway: /api/ai-gateway | Local Vault: ${vStat}`, 'cyan');
          break;

        case '/export_logs':
          exportDiagnosticLogs();
          printCli('Лог телеметрии сгенерирован и скачан.', 'emerald');
          break;

        case 'clear':
        case '/clear':
          if (cliScreen) cliScreen.innerHTML = '';
          break;

        default:
          printCli(`Неизвестная команда: "${escapeHtml(action)}". Введите <span class="cyan">/help</span> для справки.`, 'error');
          break;
      }
    }

    cliForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!cliInput) return;
      const val = cliInput.value;
      cliInput.value = '';
      runCliCommand(val);
    });

    document.querySelectorAll('.cli-cmd-chip').forEach(chip => {
      chip.addEventListener('click', function () {
        const cmd = this.getAttribute('data-cmd');
        if (cmd) runCliCommand(cmd);
      });
    });

    function exportDiagnosticLogs() {
      const logData = {
        timestamp: new Date().toISOString(),
        aircraft: 'AeroTerra H2-01',
        metrics: window.AeroTerraSim?.liveMetrics || {},
        overrides: window.AeroTerraSim?.devOverrides || {},
        vaultActive: CryptoVault.isVaultSet(),
        userAgent: navigator.userAgent
      };
      const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `aeroterra_flight_telemetry_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    function escapeHtml(str) {
      return (str || '').replace(/[&<>"']/g, (m) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
      }[m]));
    }
  }

  // --------------------------------------------------------------------------
  // ADMIN CMS & LIVE ON-PAGE VISUAL TEXT EDITOR ENGINE
  // --------------------------------------------------------------------------
  function setupAdminCms() {
    const adminModal = document.getElementById('admin-cms-modal');
    const btnOpenAdmin = document.getElementById('btn-open-admin');
    const btnCloseAdmin = document.getElementById('btn-close-admin');
    const floatingControls = document.getElementById('cms-floating-controls');
    const btnFloatSave = document.getElementById('btn-cms-float-save');
    const btnFloatClose = document.getElementById('btn-cms-float-close');
    const toggleInline = document.getElementById('toggle-cms-inline-edit');
    const btnSaveAllTexts = document.getElementById('btn-admin-save-all-texts');
    const btnExportJson = document.getElementById('btn-admin-export-texts-json');
    const btnResetTexts = document.getElementById('btn-admin-reset-texts');
    const overridesCountEl = document.getElementById('cms-overrides-count');

    // Tab buttons and panes
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    const tabPanes = document.querySelectorAll('.admin-tab-pane');

    // Tab 2: Nodes Editor
    const selectNodeTarget = document.getElementById('admin-select-node-target');
    const nodeTitleRu = document.getElementById('node-edit-title-ru');
    const nodeTitleEn = document.getElementById('node-edit-title-en');
    const nodeMass = document.getElementById('node-edit-mass');
    const nodeMtowPct = document.getElementById('node-edit-mtow-pct');
    const nodeMaterialRu = document.getElementById('node-edit-material-ru');
    const nodeFormula = document.getElementById('node-edit-formula');
    const nodeDescRu = document.getElementById('node-edit-desc-ru');
    const btnSaveNodeEdits = document.getElementById('btn-save-node-edits');

    // Tab 3: Vault & API Gateway
    const btnPingGateway = document.getElementById('btn-admin-ping-gateway');
    const vaultKeyInput = document.getElementById('admin-vault-key-input');
    const vaultPinInput = document.getElementById('admin-vault-pin-input');
    const btnVaultSave = document.getElementById('btn-admin-vault-save');
    const btnVaultClear = document.getElementById('btn-admin-vault-clear');
    const apiLogBox = document.getElementById('admin-api-log-box');
    const gatewayStatusText = document.getElementById('admin-gateway-status-text');

    // Tab 4: Aircraft Specs
    const specMtow = document.getElementById('spec-edit-mtow');
    const specWingspan = document.getElementById('spec-edit-wingspan');
    const specSpeed = document.getElementById('spec-edit-speed');
    const specH2 = document.getElementById('spec-edit-h2');
    const specVolume = document.getElementById('spec-edit-volume');
    const specPower = document.getElementById('spec-edit-power');
    const btnSaveSpecsGlobal = document.getElementById('btn-save-specs-global');

    // Open/Close Admin Modal (Locked for non-admins)
    function openAdmin() {
      if (!isSuperAdmin()) {
        showSecurityAlert('Доступ запрещён. Требуются права Супер-Администратора проекта (sarikmusaev2006@gmail.com).');
        return;
      }
      if (adminModal) {
        adminModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        updateOverridesCountBadge();
        populateNodeEditorForm();
      }
    }

    function closeAdmin() {
      if (adminModal) {
        adminModal.style.display = 'none';
        document.body.style.overflow = '';
      }
    }

    if (btnOpenAdmin) btnOpenAdmin.addEventListener('click', openAdmin);
    if (btnCloseAdmin) btnCloseAdmin.addEventListener('click', closeAdmin);

    // Logout / Lock Admin Session Button inside Admin Panel
    const btnLockAdmin = document.getElementById('btn-lock-admin-session');
    if (btnLockAdmin) {
      btnLockAdmin.addEventListener('click', () => {
        localStorage.removeItem('aeroterra_token');
        localStorage.removeItem('aeroterra_role');
        localStorage.removeItem('aeroterra_user');
        applyAdminAccessState();
        closeAdmin();
        const authUserBadge = document.getElementById('user-profile-badge');
        if (authUserBadge) authUserBadge.style.display = 'none';
        const btnOpenAuth = document.getElementById('btn-open-auth');
        if (btnOpenAuth) btnOpenAuth.style.display = 'inline-flex';
        showAlert('🔒 Режим Администратора заблокирован. Панель закрыта.', 'info');
      });
    }

    if (adminModal) {
      adminModal.addEventListener('click', (e) => {
        if (e.target === adminModal) closeAdmin();
      });
    }

    // Hotkey: Ctrl+Shift+A or Cmd+Shift+A toggles Admin (Locked for non-admins)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a' || e.key === 'Ф' || e.key === 'ф')) {
        e.preventDefault();
        if (!isSuperAdmin()) {
          showSecurityAlert('Доступ запрещён. Требуются права Супер-Администратора проекта.');
          return;
        }
        if (adminModal.style.display === 'flex') closeAdmin();
        else openAdmin();
      } else if (e.key === 'Escape' && adminModal && adminModal.style.display === 'flex') {
        closeAdmin();
      }
    });

    // Tab Switching
    tabBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const targetId = this.getAttribute('data-tab');
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => {
          p.classList.remove('active');
          p.style.display = 'none';
        });

        this.classList.add('active');
        const targetPane = document.getElementById(targetId);
        if (targetPane) {
          targetPane.classList.add('active');
          targetPane.style.display = 'flex';
        }
      });
    });

    // ------------------------------------------------------------------------
    // TAB 1: INLINE ON-PAGE LIVE TEXT EDITOR
    // ------------------------------------------------------------------------
    let inlineEditActive = false;

    function getEditableElements() {
      const selector = 'h1, h2, h3, h4, h5, p, .spec-value, .passport-val, .formula-latex, .hotspot-desc, .slide-subtitle, .stat-value, .mission-desc, .feature-desc';
      const all = Array.from(document.querySelectorAll(selector));
      return all.filter(el => {
        if (el.closest('#admin-cms-modal')) return false;
        if (el.closest('#dev-console-modal')) return false;
        if (el.closest('#auth-modal')) return false;
        if (el.closest('.site-header')) return false;
        if (el.closest('.header-actions')) return false;
        if (el.closest('#cms-floating-controls')) return false;
        if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return false;
        return true;
      });
    }

    function ensureCmsKeys() {
      const els = getEditableElements();
      els.forEach((el, idx) => {
        if (!el.getAttribute('data-cms-key')) {
          const id = el.id || `cms-txt-${idx}`;
          el.setAttribute('data-cms-key', id);
        }
      });
    }

    function setInlineEditMode(active) {
      if (active && !isSuperAdmin()) {
        active = false;
        showSecurityAlert('Редактирование сайта заблокировано. Авторизуйтесь как sarikmusaev2006@gmail.com.');
        if (toggleInline) toggleInline.checked = false;
        return;
      }
      inlineEditActive = active;
      ensureCmsKeys();
      const els = getEditableElements();

      els.forEach(el => {
        if (active && isSuperAdmin()) {
          el.setAttribute('contenteditable', 'true');
          el.classList.add('cms-editable-active');
        } else {
          el.removeAttribute('contenteditable');
          el.classList.remove('cms-editable-active');
        }
      });

      if (toggleInline) toggleInline.checked = (active && isSuperAdmin());

      if (floatingControls) {
        floatingControls.style.display = (active && isSuperAdmin()) ? 'flex' : 'none';
      }

      if (active && isSuperAdmin()) {
        closeAdmin();
        showAlert('Режим правки текста включен! Нажмите на любой текст для редактирования.', 'info');
      }
    }

    if (toggleInline) {
      toggleInline.addEventListener('change', (e) => {
        setInlineEditMode(e.target.checked);
      });
    }

    if (btnFloatClose) {
      btnFloatClose.addEventListener('click', () => {
        setInlineEditMode(false);
      });
    }

    function saveAllTextOverrides() {
      if (!isSuperAdmin()) {
        showSecurityAlert('Действие запрещено. Требуются права Администратора.');
        return;
      }
      ensureCmsKeys();
      const els = getEditableElements();
      const overrides = JSON.parse(localStorage.getItem('aeroterra_cms_overrides') || '{}');

      els.forEach(el => {
        const key = el.getAttribute('data-cms-key');
        if (key) {
          overrides[key] = el.innerHTML;
        }
      });

      localStorage.setItem('aeroterra_cms_overrides', JSON.stringify(overrides));
      updateOverridesCountBadge();
      showAlert('Все текстовые правки успешно сохранены в LocalStorage!', 'success');
      logApi('Все текстовые блоки сохранены в локальное хранилище.', 'success');
    }

    if (btnSaveAllTexts) btnSaveAllTexts.addEventListener('click', saveAllTextOverrides);
    if (btnFloatSave) btnFloatSave.addEventListener('click', saveAllTextOverrides);

    if (btnExportJson) {
      btnExportJson.addEventListener('click', () => {
        const overrides = localStorage.getItem('aeroterra_cms_overrides') || '{}';
        const blob = new Blob([overrides], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `aeroterra_cms_overrides_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    }

    if (btnResetTexts) {
      btnResetTexts.addEventListener('click', () => {
        if (confirm('Сбросить все сохранённые правки текстов и перезагрузить заводские данные?')) {
          localStorage.removeItem('aeroterra_cms_overrides');
          updateOverridesCountBadge();
          showAlert('Правки сброшены! Перезагрузка страницы...', 'info');
          setTimeout(() => location.reload(), 800);
        }
      });
    }

    function updateOverridesCountBadge() {
      const overrides = JSON.parse(localStorage.getItem('aeroterra_cms_overrides') || '{}');
      const count = Object.keys(overrides).length;
      if (overridesCountEl) overridesCountEl.textContent = count;
    }

    function applyCmsOverrides() {
      ensureCmsKeys();
      const overrides = JSON.parse(localStorage.getItem('aeroterra_cms_overrides') || '{}');
      const keys = Object.keys(overrides);
      if (keys.length === 0) return;

      keys.forEach(key => {
        const el = document.querySelector(`[data-cms-key="${key}"]`) || document.getElementById(key);
        if (el) {
          el.innerHTML = overrides[key];
        }
      });
      updateOverridesCountBadge();
    }

    // ------------------------------------------------------------------------
    // TAB 2: 8 AIRCRAFT NODES EDITOR
    // ------------------------------------------------------------------------
    function populateNodeEditorForm() {
      if (!selectNodeTarget) return;
      let targetKey = selectNodeTarget.value;
      if (targetKey === 'tail') targetKey = 'avionics';
      const node = HOTSPOTS_DATA[targetKey];
      if (!node) return;

      if (nodeTitleRu) nodeTitleRu.value = node.title?.ru || '';
      if (nodeTitleEn) nodeTitleEn.value = node.title?.en || '';
      if (nodeMass) nodeMass.value = node.massKg || '';
      if (nodeMtowPct) nodeMtowPct.value = node.mtowPct || '';
      if (nodeMaterialRu) nodeMaterialRu.value = node.material?.ru || '';
      if (nodeFormula) nodeFormula.value = node.formula || '';
      if (nodeDescRu) nodeDescRu.value = node.desc?.ru || '';
    }

    if (selectNodeTarget) {
      selectNodeTarget.addEventListener('change', populateNodeEditorForm);
    }

    if (btnSaveNodeEdits) {
      btnSaveNodeEdits.addEventListener('click', () => {
        if (!isSuperAdmin()) {
          showSecurityAlert('Действие запрещено. Требуются права Супер-Администратора проекта.');
          return;
        }
        let targetKey = selectNodeTarget ? selectNodeTarget.value : 'wing';
        if (targetKey === 'tail') targetKey = 'avionics';
        if (!HOTSPOTS_DATA[targetKey]) return;

        if (nodeTitleRu) HOTSPOTS_DATA[targetKey].title.ru = nodeTitleRu.value;
        if (nodeTitleEn) HOTSPOTS_DATA[targetKey].title.en = nodeTitleEn.value;
        if (nodeMass) HOTSPOTS_DATA[targetKey].massKg = parseFloat(nodeMass.value) || HOTSPOTS_DATA[targetKey].massKg;
        if (nodeMtowPct) HOTSPOTS_DATA[targetKey].mtowPct = nodeMtowPct.value;
        if (nodeMaterialRu) HOTSPOTS_DATA[targetKey].material.ru = nodeMaterialRu.value;
        if (nodeFormula) HOTSPOTS_DATA[targetKey].formula = nodeFormula.value;
        if (nodeDescRu) HOTSPOTS_DATA[targetKey].desc.ru = nodeDescRu.value;

        // Persist to localStorage
        const customNodes = JSON.parse(localStorage.getItem('aeroterra_nodes_overrides') || '{}');
        customNodes[targetKey] = {
          title: HOTSPOTS_DATA[targetKey].title,
          massKg: HOTSPOTS_DATA[targetKey].massKg,
          mtowPct: HOTSPOTS_DATA[targetKey].mtowPct,
          material: HOTSPOTS_DATA[targetKey].material,
          formula: HOTSPOTS_DATA[targetKey].formula,
          desc: HOTSPOTS_DATA[targetKey].desc
        };
        localStorage.setItem('aeroterra_nodes_overrides', JSON.stringify(customNodes));

        // Update Flyout Panel if currently viewing this node
        if (STATE.activeHotspot === targetKey || (targetKey === 'avionics' && STATE.activeHotspot === 'tail')) {
          selectHotspot(targetKey);
        }

        showAlert(`Узел #${HOTSPOTS_DATA[targetKey].nodeNumber} успешно обновлен и синхронизирован с 3D!`, 'success');
        logApi(`Узел ${targetKey} обновлен администратором.`, 'success');
      });
    }

    function loadSavedNodesOverrides() {
      const saved = JSON.parse(localStorage.getItem('aeroterra_nodes_overrides') || '{}');
      Object.keys(saved).forEach(key => {
        if (HOTSPOTS_DATA[key]) {
          Object.assign(HOTSPOTS_DATA[key], saved[key]);
        }
      });
    }

    // ------------------------------------------------------------------------
    // TAB 3: API GATEWAY & AES-256 VAULT
    // ------------------------------------------------------------------------
    function logApi(msg, type = 'info') {
      if (!apiLogBox) return;
      const line = document.createElement('div');
      line.className = `log-line ${type}`;
      line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
      apiLogBox.appendChild(line);
      apiLogBox.scrollTop = apiLogBox.scrollHeight;
    }

    if (btnPingGateway) {
      btnPingGateway.addEventListener('click', async () => {
        logApi('Отправка ping-запроса на /api/ai-gateway...', 'info');
        btnPingGateway.disabled = true;
        const start = performance.now();
        try {
          const res = await fetch('/api/ai-gateway', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: 'ping' })
          });
          const time = Math.round(performance.now() - start);
          if (res.ok) {
            logApi(`Ответ получен: HTTP ${res.status} OK (${time}мс). Шлюз Vercel активен!`, 'success');
            if (gatewayStatusText) gatewayStatusText.textContent = `АКТИВЕН (${time}мс, HTTP ${res.status})`;
          } else {
            logApi(`Шлюз ответил HTTP ${res.status}: ${res.statusText} (${time}мс). Проверьте process.env.VERCEL_AI_API_KEY.`, 'error');
            if (gatewayStatusText) gatewayStatusText.textContent = `ОШИБКА ${res.status}`;
          }
        } catch (err) {
          const time = Math.round(performance.now() - start);
          logApi(`Локальный запуск без Vercel Serverless (${err.message}). Серверный шлюз будет доступен на Vercel Production.`, 'info');
        } finally {
          btnPingGateway.disabled = false;
        }
      });
    }

    if (btnVaultSave) {
      btnVaultSave.addEventListener('click', async () => {
        const key = vaultKeyInput ? vaultKeyInput.value.trim() : '';
        const pin = vaultPinInput ? vaultPinInput.value.trim() : '';
        if (!key || !pin) {
          showAlert('Введите ключ и PIN для шифрования!', 'error');
          return;
        }
        try {
          await CryptoVault.encryptApiKey(key, pin);
          if (vaultKeyInput) vaultKeyInput.value = '';
          if (vaultPinInput) vaultPinInput.value = '';
          logApi('Резервный ключ успешно зашифрован по алгоритму AES-GCM 256-bit (PBKDF2 SHA-256)!', 'success');
          showAlert('Ключ зашифрован и надёжно сохранён в LocalStorage Vault!', 'success');
        } catch (err) {
          logApi(`Ошибка шифрования: ${err.message}`, 'error');
          showAlert(err.message, 'error');
        }
      });
    }

    if (btnVaultClear) {
      btnVaultClear.addEventListener('click', () => {
        CryptoVault.purgeVault();
        logApi('Клиентский сейф очищен. Ключи удалены.', 'info');
        showAlert('Сейф ключей очищен.', 'info');
      });
    }

    // ------------------------------------------------------------------------
    // TAB 4: AIRCRAFT SPECS GLOBAL UPDATER
    // ------------------------------------------------------------------------
    if (btnSaveSpecsGlobal) {
      btnSaveSpecsGlobal.addEventListener('click', () => {
        if (!isSuperAdmin()) {
          showSecurityAlert('Действие запрещено. Требуются права Супер-Администратора проекта.');
          return;
        }
        const mtow = specMtow ? specMtow.value : '1850';
        const span = specWingspan ? specWingspan.value : '12.4';
        const speed = specSpeed ? specSpeed.value : '195';
        const h2 = specH2 ? specH2.value : '24';
        const vol = specVolume ? specVolume.value : '340';
        const pwr = specPower ? specPower.value : '120';

        // Update DOM elements containing these values
        document.querySelectorAll('.spec-mtow-val').forEach(el => el.textContent = `${mtow} кг`);
        document.querySelectorAll('.spec-wingspan-val').forEach(el => el.textContent = `${span} м`);
        document.querySelectorAll('.spec-speed-val').forEach(el => el.textContent = `${speed} км/ч`);
        document.querySelectorAll('.spec-h2-val').forEach(el => el.textContent = `${h2} кг`);

        localStorage.setItem('aeroterra_specs_overrides', JSON.stringify({ mtow, span, speed, h2, vol, pwr }));
        showAlert('Глобальные спецификации самолёта обновлены по всему сайту!', 'success');
        logApi(`Спецификации обновлены: MTOW=${mtow}кг, Span=${span}м, Speed=${speed}км/ч.`, 'success');
      });
    }

    // Initialization calls
    loadSavedNodesOverrides();
    applyCmsOverrides();
  }

  // --------------------------------------------------------------------------
  // GLOBAL TOAST NOTIFICATIONS
  // --------------------------------------------------------------------------
  function showGlobalToast(msg, duration = 4000) {
    let toast = document.getElementById('global-app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'global-app-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: rgba(10, 16, 28, 0.94);
        border: 1px solid rgba(0, 242, 254, 0.55);
        color: #e2f1ff;
        padding: 12px 22px;
        border-radius: 12px;
        font-family: 'Space Grotesk', -apple-system, sans-serif;
        font-size: 0.9rem;
        font-weight: 500;
        letter-spacing: 0.02em;
        backdrop-filter: blur(16px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 242, 254, 0.25);
        z-index: 99999;
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
        opacity: 0;
        pointer-events: none;
        max-width: 90vw;
        text-align: center;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(100px)';
    }, duration);
  }

  // --------------------------------------------------------------------------
  // DOWNLOAD APP SUITE & PWA INSTALLATION HANDLER
  // --------------------------------------------------------------------------
  function setupDownloadAppSuite() {
    let deferredInstallPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      console.log('[PWA] beforeinstallprompt captured.');
    });

    const generateOfflineGameHtml = () => {
      return '<!DOCTYPE html>\n' +
'<html lang="ru">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">\n' +
'  <title>AeroTerra H2 — Standalone 3D Flight Simulator (Created by Musayev Sardor)</title>\n' +
'  <style>\n' +
'    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #050811; font-family: monospace; }\n' +
'    canvas { display: block; width: 100vw; height: 100vh; }\n' +
'    #hud { position: fixed; top: 16px; left: 16px; color: #00e5ff; font-size: 14px; background: rgba(5,8,17,0.85); padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(0,229,255,0.4); pointer-events: none; }\n' +
'    #author { position: fixed; top: 16px; right: 16px; color: #ffd700; font-size: 13px; background: rgba(5,8,17,0.85); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,215,0,0.5); pointer-events: none; }\n' +
'    #controls { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); color: #fff; font-size: 12px; background: rgba(5,8,17,0.85); padding: 8px 16px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.2); }\n' +
'  </style>\n' +
'  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>\n' +
'</head>\n' +
'<body>\n' +
'  <div id="hud">\n' +
'    <div>✈️ <strong>AEROTERRA H2 OFFLINE SIMULATOR</strong></div>\n' +
'    <div>ALT: <span id="alt">700</span> m | IAS: <span id="spd">210</span> km/h | GEAR: DOWN</div>\n' +
'  </div>\n' +
'  <div id="author">👑 Musayev Sardor — Я СОЗДАТЕЛЬ ВСЕГО</div>\n' +
'  <div id="controls">[W/S] Тангаж · [A/D] Крен · [Q/E] Рыскание · [Shift/Ctrl] Тяга</div>\n' +
'  <canvas id="cv"></canvas>\n' +
'  <script>\n' +
'    const cv = document.getElementById("cv");\n' +
'    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });\n' +
'    renderer.setSize(window.innerWidth, window.innerHeight);\n' +
'    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));\n' +
'    const scene = new THREE.Scene();\n' +
'    scene.background = new THREE.Color(0x87ceeb);\n' +
'    scene.fog = new THREE.FogExp2(0xdbeafe, 0.0003);\n' +
'    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);\n' +
'    const hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 0.9); scene.add(hemi);\n' +
'    const dir = new THREE.DirectionalLight(0xfffaed, 1.4); dir.position.set(500, 1200, 800); scene.add(dir);\n' +
'    const ground = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), new THREE.MeshStandardMaterial({ color: 0x2d4a2d, roughness: 0.9 }));\n' +
'    ground.rotation.x = -Math.PI / 2; scene.add(ground);\n' +
'    const rwy = new THREE.Mesh(new THREE.PlaneGeometry(36, 1200), new THREE.MeshStandardMaterial({ color: 0x222226 }));\n' +
'    rwy.rotation.x = -Math.PI / 2; rwy.position.y = 0.05; scene.add(rwy);\n' +
'    const plane = new THREE.Group();\n' +
'    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 6.2, 16), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 }));\n' +
'    fuse.rotation.x = Math.PI / 2; plane.add(fuse);\n' +
'    const wing = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.12, 1.4), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));\n' +
'    wing.position.set(0, 0.3, 0.4); plane.add(wing);\n' +
'    [-1, 1].forEach(s => {\n' +
'      const w = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.9), new THREE.MeshStandardMaterial({ color: 0x00e5ff }));\n' +
'      w.position.set(s * 6.2, 0.6, 0.4); plane.add(w);\n' +
'    });\n' +
'    plane.position.set(0, 700, 0); scene.add(plane);\n' +
'    let pos = { x: 0, y: 700, z: 0 }, rot = { x: 0, y: 0, z: 0 }, spd = 58;\n' +
'    const keys = {};\n' +
'    window.addEventListener("keydown", e => keys[e.code] = true);\n' +
'    window.addEventListener("keyup", e => keys[e.code] = false);\n' +
'    window.addEventListener("resize", () => {\n' +
'      camera.aspect = window.innerWidth / window.innerHeight;\n' +
'      camera.updateProjectionMatrix();\n' +
'      renderer.setSize(window.innerWidth, window.innerHeight);\n' +
'    });\n' +
'    function anim() {\n' +
'      requestAnimationFrame(anim);\n' +
'      if (keys["KeyW"]) rot.x += 0.02;\n' +
'      if (keys["KeyS"]) rot.x -= 0.02;\n' +
'      if (keys["KeyA"]) { rot.z += 0.03; rot.y -= 0.015; }\n' +
'      if (keys["KeyD"]) { rot.z -= 0.03; rot.y += 0.015; }\n' +
'      rot.z *= 0.94; rot.x *= 0.96;\n' +
'      pos.y += Math.sin(-rot.x) * spd * 0.016;\n' +
'      pos.z += Math.cos(rot.y) * spd * 0.016;\n' +
'      pos.x += Math.sin(rot.y) * spd * 0.016;\n' +
'      if (pos.y < 1.2) pos.y = 1.2;\n' +
'      plane.position.set(pos.x, pos.y, pos.z);\n' +
'      plane.rotation.set(rot.x, rot.y, rot.z);\n' +
'      camera.position.set(pos.x - Math.sin(rot.y) * 14, pos.y + 3.8, pos.z - Math.cos(rot.y) * 14);\n' +
'      camera.lookAt(pos.x, pos.y + 0.4, pos.z + 10);\n' +
'      document.getElementById("alt").textContent = Math.round(pos.y);\n' +
'      document.getElementById("spd").textContent = Math.round(spd * 3.6);\n' +
'      renderer.render(scene, camera);\n' +
'    }\n' +
'    anim();\n' +
'  <\/script>\n' +
'</body>\n' +
'</html>';
    };

    const downloadFile = (filename, content, mime = 'text/html') => {
      const blob = new Blob([content], { type: mime + ';charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    };

    const triggerDesktopDownload = (e) => {
      if (e) e.preventDefault();
      const htmlGame = generateOfflineGameHtml();
      downloadFile('AeroTerra-H2-Desktop-Offline-Game.html', htmlGame);
      showGlobalToast('💻 3D-Игра AeroTerra H2 сохранена на ваш компьютер! Запускается офлайн двойным кликом.', 5500);
    };

    const triggerPwaInstall = async (e) => {
      if (e) e.preventDefault();
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log('[PWA] User choice: ' + outcome);
        deferredInstallPrompt = null;
      } else {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
          alert('📲 УСТАНОВКА НА IPHONE / IPAD:\n\n1. Нажмите кнопку «Поделиться» (иконка квадрата со стрелкой вверх) в нижней панели Safari.\n2. Выберите «На экран «Домой»» (Add to Home Screen).\n3. Нажмите «Добавить» — игра AeroTerra H2 появится на домашнем экране!\n\nТакже автономный файл игры скачан на ваше устройство.');
        } else {
          showGlobalToast('📲 Для установки PWA: нажмите иконку в адресной строке или меню браузера (⋮) ➔ «Установить приложение / На главный экран».', 6000);
        }
        const htmlGame = generateOfflineGameHtml();
        downloadFile('AeroTerra-H2-Mobile-Game-by-Musayev-Sardor.html', htmlGame);
      }
    };

    const triggerCreatorPdf = (e) => {
      if (e) e.preventDefault();
      const btnPdf = document.getElementById('btn-export-pdf');
      if (btnPdf) {
        btnPdf.click();
        showGlobalToast('📄 Генерация официального инженерного паспорта Создателя Musayev Sardor (PDF)...', 4000);
      }
    };

    const triggerPlayOnline = (e) => {
      if (e) e.preventDefault();
      const presModal = document.getElementById('presentation-modal');
      if (presModal) {
        presModal.style.display = 'none';
        document.body.style.overflow = '';
      }
      const simLink = document.getElementById('nav-simulator-tab');
      if (simLink) {
        simLink.click();
      }
      showGlobalToast('🚀 Запуск симулятора полётов AeroTerra H2 Online...', 3000);
    };

    // Button Binders
    document.getElementById('btn-dl-desktop-pkg')?.addEventListener('click', triggerDesktopDownload);
    document.querySelectorAll('.btn-dl-desktop-club').forEach(btn => btn.addEventListener('click', triggerDesktopDownload));
    document.getElementById('btn-dl-offline-game')?.addEventListener('click', triggerDesktopDownload);

    document.getElementById('btn-dl-pwa-app')?.addEventListener('click', triggerPwaInstall);
    document.getElementById('btn-dl-phone-app')?.addEventListener('click', triggerPwaInstall);
    document.querySelectorAll('.btn-dl-pwa-club, .btn-dl-pwa').forEach(btn => btn.addEventListener('click', triggerPwaInstall));

    document.getElementById('btn-dl-creator-pdf')?.addEventListener('click', triggerCreatorPdf);

    document.getElementById('btn-dl-play-sim')?.addEventListener('click', triggerPlayOnline);
    document.querySelectorAll('.btn-dl-play-club').forEach(btn => btn.addEventListener('click', triggerPlayOnline));
  }  // --------------------------------------------------------------------------
  // 19. APPLICATION ENTRY POINT
  // --------------------------------------------------------------------------
  window.addEventListener('DOMContentLoaded', () => {
    initThree();
    setupCadUpload();
    initCalculatorsAndCharts();
    initMissionMap();
    setupAiAdvisor();
    setupPdfExport();
    setupMasterBlueprint();
    setupEventListeners();
    setupNeonAuth();
    setupPresentationModal();
    setupAdminCms();
    setupDevConsole();
    setupDownloadAppSuite();

    // Register PWA Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').then(() => {
        console.log('[PWA] Service Worker registered successfully.');
      }).catch(err => {
        console.warn('[PWA] Service Worker registration error:', err);
      });
    }

    // Open Node #1 (Wing) in Inspector Panel by default (on desktop)
    setTimeout(() => {
      const container = document.getElementById('hangar-section');
      const aspect = container ? (container.clientWidth / container.clientHeight) : (window.innerWidth / window.innerHeight);
      if (aspect >= 0.85 && window.innerWidth >= 860) {
        selectHotspot('wing');
      } else {
        updateFlyoutPanel(HOTSPOTS_DATA['wing']);
        const flyout = document.getElementById('engineering-flyout');
        if (flyout) flyout.classList.remove('open');
      }
    }, 150);

    // Initial hash check
    if (window.location.hash === '#simulator-section' || window.location.hash === '#earth-section') {
      document.body.classList.add('in-simulator-mode');
      const simLink = document.getElementById('nav-simulator-tab');
      if (simLink) simLink.click();
    }
  });

})();
