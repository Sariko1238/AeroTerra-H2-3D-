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
      team_heading: 'Инженерная Команда Проекта (Aerospace Engineering Club)',
      member1_name: 'Александр Смирнов',
      member1_role: 'CHIEF DESIGNER & AERO LEAD',
      member1_bio: 'Общая компоновка Box-Wing STOL, аэродинамика профилей NACA и интеграция водородных систем.',
      member2_name: 'Елена Воронова',
      member2_role: 'CATIA V5 CLASS-A SPECIALIST',
      member2_bio: 'Параметрическое проектирование поверхностей в ICEM Surf, непрерывность кривизны G2/G3 и композитный силовой набор.',
      member3_name: 'Даниил Ким',
      member3_role: 'H2 PROPULSION & THERMAL LEAD',
      member3_bio: 'Криогенный водородный бак, балансировка PEM топливной ячейки и тепловой менеджмент силовой установки.',
      member4_name: 'Марк Романов',
      member4_role: 'AVIONICS & RC TEST PILOT',
      member4_bio: 'Бортовой компьютер на ArduPilot, каналы телеметрии Starlink/5G и пилотирование лётного прототипа 1:5.',
      footer_rights: 'Проект разработан в рамках Студенческого Аэрокосмического Клуба. Подготовлено к презентации жюри и венчурным инвесторам.'
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
      team_heading: 'Aerospace Engineering Club Leadership',
      member1_name: 'Alexander Smirnov',
      member1_role: 'CHIEF DESIGNER & AERO LEAD',
      member1_bio: 'Overall Box-Wing STOL layout, NACA transonic airfoil optimization and hydrogen system architecture.',
      member2_name: 'Elena Voronova',
      member2_role: 'CATIA V5 CLASS-A SPECIALIST',
      member2_bio: 'Parametric surface modeling in ICEM Surf, G2/G3 curvature continuity and carbon fiber structural ribs.',
      member3_name: 'Daniil Kim',
      member3_role: 'H2 PROPULSION & THERMAL LEAD',
      member3_bio: 'Cryogenic liquid hydrogen containment, PEM fuel cell balancing and high-efficiency thermal radiator loop.',
      member4_name: 'Mark Romanov',
      member4_role: 'AVIONICS & RC TEST PILOT',
      member4_bio: 'Flight controller based on ArduPilot/MAVLink, satellite telemetry links and 1:5 prototype flight testing.',
      footer_rights: 'Designed and developed within the Collegiate Aerospace Engineering Club. Prepared for investor and jury presentation.'
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
      category: 'CATIA V5 / AERODYNAMICS',
      title: { ru: '🪽 Крыло Class-A (NACA 64-215)', en: '🪽 Wing Class-A (NACA 64-215)' },
      targetPos: { x: 4.2, y: 1.2, z: 0.2 },
      camPos: { x: 7.5, y: 3.5, z: 4.5 },
      specs: [
        { label: { ru: 'Площадь крыла (S):', en: 'Wing Area (S):' }, val: '13.35 м²' },
        { label: { ru: 'Удлинение (AR):', en: 'Aspect Ratio (AR):' }, val: '11.5' },
        { label: { ru: 'Аэродинам. качество:', en: 'Max L/D Ratio:' }, val: 'L/D = 21.4' },
        { label: { ru: 'Материал кессона:', en: 'Spar Material:' }, val: 'CFRP T800 Carbon' }
      ],
      formula: 'L = 0.5 · ρ · V² · S · CL  |  CDi = CL² / (π · AR · e)',
      desc: {
        ru: 'Высоконесущее крыло большого удлинения, спроектированное в CATIA V5 ICEM Surf по стандартам непрерывности кривизны G2/G3. Снижает индуктивное сопротивление на 24% и обеспечивает устойчивый полет на сверхнизких скоростях при обдуве от распределенных моторов.',
        en: 'High aspect ratio laminar wing lofted in CATIA V5 ICEM Surf complying with G2/G3 curvature continuity. Reduces induced drag by 24% and delivers steady flight at ultralow speeds through blown-wing distributed propulsion.'
      },
      chartData: {
        x: ['100', '140', '180', '210', '250', '290'],
        y: [14.2, 18.5, 21.4, 21.0, 18.1, 15.3],
        name: 'L/D vs Speed (km/h)'
      }
    },
    tank: {
      category: 'HYDROGEN CRYOGENICS',
      title: { ru: '💧 Криогенный Водородный Бак (LH2)', en: '💧 LH2 Cryogenic Fuel Tank' },
      targetPos: { x: 0, y: 0.6, z: -0.6 },
      camPos: { x: 2.5, y: 2.8, z: 3.2 },
      specs: [
        { label: { ru: 'Емкость водорода:', en: 'LH2 Capacity:' }, val: '38 кг (1265 кВт·ч)' },
        { label: { ru: 'Давление хранения:', en: 'Nominal Pressure:' }, val: '350 / 700 Bar' },
        { label: { ru: 'Удельная энергия:', en: 'Specific Energy:' }, val: '33.3 кВт·ч/кг (2.8x керосин)' },
        { label: { ru: 'Изоляция:', en: 'Insulation Layer:' }, val: 'MLI Vacuum Barrier' }
      ],
      formula: 'E_total = m_H2 · 120 MJ/kg  |  q_boiloff < 0.8% / 24h',
      desc: {
        ru: 'Многослойный композитный баллон типа IV (алюминиевый лейнер + намотка углеволокном Toray T1000) с вакуумной экранно-изоляционной защитой (MLI). Обеспечивает безопасное хранение жидкого водорода и питание ТЭК без паразитного испарения.',
        en: 'Type IV composite pressure vessel with Toray T1000 carbon fiber overwrap and multi-layer vacuum insulation (MLI). Enables cryogenic hydrogen storage and feed with boil-off under 0.8% per day.'
      },
      chartData: {
        x: ['Li-Po', 'Kerosene', 'Green H2'],
        y: [0.26, 11.9, 33.3],
        name: 'Specific Energy (kWh/kg)'
      }
    },
    fuelcell: {
      category: 'CLEAN PROPULSION',
      title: { ru: '⚡ ТЭК PEM Fuel Cell + Li-Po буфер', en: '⚡ PEM Fuel Cell + Li-Po Buffer' },
      targetPos: { x: 0, y: 0.7, z: 0.8 },
      camPos: { x: 2.8, y: 2.5, z: 3.0 },
      specs: [
        { label: { ru: 'Мощность стека:', en: 'Continuous Power:' }, val: '120 кВт (Электро)' },
        { label: { ru: 'КПД преобразования:', en: 'System Efficiency:' }, val: '58.5% (ТЭК)' },
        { label: { ru: 'Пиковый буфер:', en: 'Li-Po Peak Buffer:' }, val: '35 кВт·ч (150 кВт STOL)' },
        { label: { ru: 'Выхлоп:', en: 'Emissions:' }, val: 'Чистый пар H2O (0% CO2)' }
      ],
      formula: '2 H2 + O2 -> 2 H2O + Electricity + Heat (ΔH = -286 kJ/mol)',
      desc: {
        ru: 'Протонообменная мембрана (PEM) последнего поколения с платиновым катализатором. Вырабатывает непрерывную крейсерскую мощность 120 кВт. При взлёте STOL буферная батарея добавляет 80 кВт мощности на 90 секунд.',
        en: 'High-density Proton Exchange Membrane (PEM) fuel cell stack providing continuous 120 kW cruise power. Buffer Li-Po battery provides instant 80 kW burst for STOL takeoff operations.'
      },
      chartData: {
        x: ['Idle', 'Cruise', 'Climb', 'STOL Max'],
        y: [12, 68, 120, 200],
        name: 'Power Output (kW)'
      }
    },
    payload: {
      category: 'DUAL-ROLE MISSION POD',
      title: { ru: '🔄 Быстросъемный Отсек Нагрузки', en: '🔄 Quick-Swap Modular Mission Pod' },
      targetPos: { x: 0, y: -0.4, z: 0.2 },
      camPos: { x: 3.5, y: -0.8, z: 3.2 },
      specs: [
        { label: { ru: 'Время замены отсека:', en: 'Swap Turnaround:' }, val: '< 10 минут' },
        { label: { ru: 'Агро-конфигурация:', en: 'Agro Payload:' }, val: '600 л бак + 18м форсунки' },
        { label: { ru: 'Пожарный сброс:', en: 'Firefighting Pod:' }, val: '800 л воды/ретарданта' },
        { label: { ru: 'Забор воды на глиссе:', en: 'Water Scooper:' }, val: '800 л за 14 сек с озера' }
      ],
      formula: 'Flow_rate = A_valve · √(2 · g · h) = 180 L/s (Dump salvo)',
      desc: {
        ru: 'Инженерная модульная капсула на быстросъемных замках Cam-Lock. Позволяет одному и тому же планеру утром производить высокоточное опрыскивание посевов, а в полдень тушить лесные пожары водяным залпом.',
        en: 'Modular ventral pod with aerospace Cam-Lock latches. Enables 10-minute ground conversion between precision agricultural spraying and emergency wildfire suppression water bombing.'
      },
      chartData: {
        x: ['Tank Empty', 'Agro 600L', 'Fire 800L'],
        y: [820, 1420, 1620],
        name: 'Aircraft Mass (kg)'
      }
    },
    motors: {
      category: 'DISTRIBUTED ELECTRIC (DEP)',
      title: { ru: '🌀 4x Распределенных Мотора DEP', en: '🌀 4x Distributed Electric Propellers' },
      targetPos: { x: 2.8, y: 1.0, z: 1.1 },
      camPos: { x: 4.8, y: 2.2, z: 3.0 },
      specs: [
        { label: { ru: 'Конфигурация:', en: 'Configuration:' }, val: '4x Brushless Outrunner' },
        { label: { ru: 'Тяга суммарная:', en: 'Total Static Thrust:' }, val: '5800 Н (590 кгс)' },
        { label: { ru: 'Уровень шума:', en: 'Acoustic Signature:' }, val: '-15 дБ от поршневого ДВС' },
        { label: { ru: 'Обдув крыла:', en: 'Blown Wing STOL:' }, val: '+38% к CL_max при разбеге' }
      ],
      formula: 'T = 4 · [ 0.5 · ρ · A · (V_exit² - V_inf²) ]  |  CL_blown = CL0 + ΔCL_DEP',
      desc: {
        ru: 'Четыре бесщеточных электродвигателя с трехлопастными углепластиковыми винтами изменяемого шага. Скоростной поток от винтов обдувает верхнюю поверхность крыла, обеспечивая взлет с грунтовой полосы всего за 120 метров.',
        en: 'Four brushless electric motors spinning carbon variable-pitch propellers. Slipstream washes over the wing suction surface, boosting CL_max by 38% for unmatched short field takeoff (STOL 120 m).'
      },
      chartData: {
        x: ['Clean Wing', 'Blown DEP'],
        y: [1.8, 2.65],
        name: 'Maximum Lift Coeff CL'
      }
    },
    gimbal: {
      category: 'AI MULTISPECTRAL AVIONICS',
      title: { ru: '👁️ Носовой Сенсорный Модуль', en: '👁️ Nose Sensor Turret & Gimbal' },
      targetPos: { x: 0, y: 0.1, z: 3.4 },
      camPos: { x: 1.8, y: 0.8, z: 5.2 },
      specs: [
        { label: { ru: 'Агро-канал:', en: 'Agro Sensor:' }, val: 'NDVI / RedEdge 5-band 48MP' },
        { label: { ru: 'Пожарный ИК-канал:', en: 'Thermal IR:' }, val: '640x512 Uncooled FLIR 15km' },
        { label: { ru: 'Дальномер / LiDAR:', en: 'Laser Rangefinder:' }, val: 'Class 1 Eye-Safe 4000m' },
        { label: { ru: 'Стабилизация:', en: 'Gimbal Axis:' }, val: '3-осевая гиростабилизация' }
      ],
      formula: 'NDVI = (NIR - RED) / (NIR + RED)  |  Thermal Fire Detection: 3-5 μm',
      desc: {
        ru: 'Носовая гиростабилизированная турель с искусственным интеллектом для детекции очагов возгорания сквозь дым и построения карт вегетационного индекса NDVI для дифференцированного внесения удобрений.',
        en: 'Nose-mounted 3-axis gyro-stabilized sensor payload combining 5-band NDVI multispectral imaging for crop health with long-wave infrared thermal vision penetrating dense smoke up to 15 km.'
      },
      chartData: {
        x: ['Healthy', 'Water Stress', 'Dry / Fire'],
        y: [0.82, 0.41, 0.12],
        name: 'NDVI Spectral Index'
      }
    },
    avionics: {
      category: 'NAVIGATION & TELEMETRY',
      title: { ru: '📡 Автопилот MAVLink / Starlink', en: '📡 Autonomous Avionics & Starlink' },
      targetPos: { x: 0, y: 0.7, z: 2.1 },
      camPos: { x: 2.2, y: 2.5, z: 4.0 },
      specs: [
        { label: { ru: 'Процессор полета:', en: 'Flight Controller:' }, val: 'Triple Redundant STM32H7' },
        { label: { ru: 'Канал связи:', en: 'Datalink:' }, val: '868 MHz + 5G + Starlink Mini' },
        { label: { ru: 'Навигация:', en: 'RTK GNSS:' }, val: 'Сантиметровая точность (2 см)' },
        { label: { ru: 'Безопасность:', en: 'Safety Standard:' }, val: 'DO-178C / EASA Level C' }
      ],
      formula: 'Navigation: EKF3 24-State Fusion (IMU + GPS + Baro + LiDAR)',
      desc: {
        ru: 'Вычислительный блок на базе ArduPilot с тройным резервированием датчиков IMU. Обеспечивает полностью автономное выполнение миссий: автоматический взлет, обработка полей по координатной сетке и автоматический возврат.',
        en: 'Triple-redundant avionics running real-time EKF3 sensor fusion over ArduPilot. Guarantees centimeter RTK precision for automatic crop swath spray tracks and emergency parachute deployment.'
      },
      chartData: {
        x: ['Radio RF', 'Cellular 5G', 'Satellite'],
        y: [35, 120, 1400],
        name: 'Control Range (km)'
      }
    },
    gear: {
      category: 'STOL ROUGH-TERRAIN GEAR',
      title: { ru: '🛬 Шасси STOL & Амфибийные Поплавки', en: '🛬 Rough-Terrain STOL Landing Gear' },
      targetPos: { x: 1.4, y: -1.2, z: 0.2 },
      camPos: { x: 3.5, y: -0.5, z: 2.8 },
      specs: [
        { label: { ru: 'Тип амортизаторов:', en: 'Shock Absorbers:' }, val: 'Азотно-масляные Oleo-Strut' },
        { label: { ru: 'Шины:', en: 'Tundra Balloon Tires:' }, val: 'Низкого давления (0.8 Bar)' },
        { label: { ru: 'Поверхности посадки:', en: 'Supported Runways:' }, val: 'Пашня, грунт, гравий, вода' },
        { label: { ru: 'Скорость отрыва:', en: 'Takeoff Lift-Off Speed:' }, val: '68 км/ч (при обдуве крыла)' }
      ],
      formula: 'Shock_absorption: E_kinetic = 0.5 · m · V_sink² -> Efficiency 82%',
      desc: {
        ru: 'Усиленное шасси с длинноходной амортизацией и шинами большого диаметра, разработанное для эксплуатации с неподготовленных полевых дорог и распаханной земли. Опционально комплектуется амфибийными поплавками.',
        en: 'Heavy-duty trailing-link landing gear with nitrogen oleo struts and ultra-low pressure tundra tires capable of operating directly from plowed farm soils and unpaved grass strips.'
      },
      chartData: {
        x: ['Paved Strip', 'Grass Field', 'Plowed Dirt'],
        y: [95, 120, 145],
        name: 'Takeoff Roll (meters)'
      }
    }
  };

  // --------------------------------------------------------------------------
  // 5. THREE.JS 3D HANGAR ENGINE
  // --------------------------------------------------------------------------
  let scene, camera, renderer, controls;
  let aircraftGroup, explodedGroups = {};
  let propBlades = [];
  let raycaster, mouse;
  let hotspotSprites = [];
  let cfdParticleSystem = null;
  let sprayParticleSystem = null;
  let waterDumpParticleSystem = null;
  let zebraMaterial = null;
  let standardMaterials = [];

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
    renderer.toneMappingExposure = 1.1;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060b16);
    scene.fog = new THREE.FogExp2(0x060b16, 0.022);

    // Camera
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(11, 6.5, 13);

    // OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // don't go below floor
    controls.minDistance = 3;
    controls.maxDistance = 35;
    controls.target.set(0, 0.5, 0);

    // Raycasting & Mouse
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Lighting
    setupLighting();

    // Hangar Floor & Holographic Runway Grid
    buildHangarEnvironment();

    // Procedural 3D AeroTerra H2 Aircraft
    buildAeroTerraModel();

    // 8 Interactive 3D Hotspot Sprites
    createHotspotMarkers();

    // Particle Systems (CFD, Spray, Water Dump)
    createParticleSystems();

    // Custom Zebra Shader for Class-A Surface Continuity
    initZebraShader();

    // Events
    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousemove', onCanvasMouseMove);

    // Start 60 FPS Render Loop
    animate();
  }

  function setupLighting() {
    // Ambient Light
    const ambient = new THREE.AmbientLight(0x0e2246, 1.4);
    scene.add(ambient);

    // Main Rim Sunlight
    const sunLight = new THREE.DirectionalLight(0xe6f7ff, 2.2);
    sunLight.position.set(12, 22, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Under-wing Cyan Hangar Uplight
    const cyanLight = new THREE.PointLight(0x00e5ff, 2.5, 18);
    cyanLight.position.set(0, 0.2, 0);
    scene.add(cyanLight);

    // Rear Emerald Accent Light
    const emeraldLight = new THREE.PointLight(0x00ff9d, 1.8, 14);
    emeraldLight.position.set(0, 2.5, -6);
    scene.add(emeraldLight);
  }

  function buildHangarEnvironment() {
    // Floor Geometry with holographic grid
    const floorGeo = new THREE.PlaneGeometry(120, 120, 60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x070e1c,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.6;
    floor.receiveShadow = true;
    scene.add(floor);

    // Neon Runway Grid Rings
    const gridHelper = new THREE.GridHelper(60, 40, 0x00e5ff, 0x0d2346);
    gridHelper.position.y = -1.59;
    scene.add(gridHelper);

    // Holographic Circular Landing Reticle on floor
    const ringGeo = new THREE.RingGeometry(5.8, 6.0, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -1.58;
    scene.add(ring);
  }

  // --------------------------------------------------------------------------
  // 6. PROCEDURAL 3D GEOMETRY OF AEROTERRA H2
  // (Box-Wing, Twin-Boom STOL with CFRP Class-A Surfaces)
  // --------------------------------------------------------------------------
  function buildAeroTerraModel() {
    aircraftGroup = new THREE.Group();
    aircraftGroup.position.set(0, 0, 0);
    scene.add(aircraftGroup);

    // Common PBR Materials
    const carbonFuselageMat = new THREE.MeshStandardMaterial({
      color: 0x0c1527,
      roughness: 0.25,
      metalness: 0.85
    });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x162540,
      roughness: 0.2,
      metalness: 0.7
    });
    const cyanGlowMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.6
    });
    const glassCockpitMat = new THREE.MeshPhysicalMaterial({
      color: 0x002b4d,
      metalness: 0.1,
      roughness: 0.1,
      transmission: 0.7,
      transparent: true,
      opacity: 0.75
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xd0dbe5,
      roughness: 0.3,
      metalness: 0.95
    });

    standardMaterials.push(carbonFuselageMat, wingMat, cyanGlowMat, metalMat);

    // --- Subassembly 1: FUSELAGE ---
    const fuselageGroup = new THREE.Group();
    aircraftGroup.add(fuselageGroup);
    explodedGroups.fuselage = fuselageGroup;

    // Streamlined aerodynamic body
    const bodyGeo = new THREE.CylinderGeometry(0.72, 0.48, 7.8, 32);
    bodyGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(bodyGeo, carbonFuselageMat);
    fuselage.castShadow = true;
    fuselage.receiveShadow = true;
    fuselageGroup.add(fuselage);

    // Aerodynamic Nose Cone
    const noseGeo = new THREE.ConeGeometry(0.72, 1.8, 32);
    noseGeo.rotateX(-Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, carbonFuselageMat);
    nose.position.z = 4.8;
    nose.castShadow = true;
    fuselageGroup.add(nose);

    // Glass Canopy / Cockpit
    const canopyGeo = new THREE.SphereGeometry(0.68, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    canopyGeo.scale(1, 0.7, 2.2);
    const canopy = new THREE.Mesh(canopyGeo, glassCockpitMat);
    canopy.position.set(0, 0.52, 2.2);
    fuselageGroup.add(canopy);

    // Cyan Racing/Energy Stripe on Fuselage
    const stripeGeo = new THREE.CylinderGeometry(0.73, 0.49, 0.15, 32);
    stripeGeo.rotateX(Math.PI / 2);
    const stripe = new THREE.Mesh(stripeGeo, cyanGlowMat);
    stripe.position.z = 1.0;
    fuselageGroup.add(stripe);

    // --- Subassembly 2: MAIN WING (NACA 64-215 Class-A) ---
    const wingGroup = new THREE.Group();
    aircraftGroup.add(wingGroup);
    explodedGroups.wing = wingGroup;

    // High aspect ratio main wing
    const wingCenterGeo = new THREE.BoxGeometry(12.4, 0.18, 1.25);
    const mainWing = new THREE.Mesh(wingCenterGeo, wingMat);
    mainWing.position.set(0, 0.85, 0.5);
    mainWing.castShadow = true;
    wingGroup.add(mainWing);

    // Left Winglet
    const wingletLGeo = new THREE.BoxGeometry(0.12, 0.85, 0.7);
    const wingletL = new THREE.Mesh(wingletLGeo, cyanGlowMat);
    wingletL.position.set(-6.2, 1.25, 0.5);
    wingGroup.add(wingletL);

    // Right Winglet
    const wingletRGeo = new THREE.BoxGeometry(0.12, 0.85, 0.7);
    const wingletR = new THREE.Mesh(wingletRGeo, cyanGlowMat);
    wingletR.position.set(6.2, 1.25, 0.5);
    wingGroup.add(wingletR);

    // Internal Spar Truss (Visible in exploded view)
    const sparGeo = new THREE.CylinderGeometry(0.04, 0.04, 11.8, 16);
    sparGeo.rotateZ(Math.PI / 2);
    const spar = new THREE.Mesh(sparGeo, metalMat);
    spar.position.set(0, 0.85, 0.5);
    wingGroup.add(spar);

    // --- Subassembly 3: TWIN-BOOM TAIL ASSEMBLY ---
    const tailGroup = new THREE.Group();
    aircraftGroup.add(tailGroup);
    explodedGroups.tail = tailGroup;

    // Left Boom
    const boomLGeo = new THREE.CylinderGeometry(0.12, 0.08, 5.2, 16);
    boomLGeo.rotateX(Math.PI / 2);
    const boomL = new THREE.Mesh(boomLGeo, carbonFuselageMat);
    boomL.position.set(-2.4, 0.75, -2.5);
    boomL.castShadow = true;
    tailGroup.add(boomL);

    // Right Boom
    const boomRGeo = new THREE.CylinderGeometry(0.12, 0.08, 5.2, 16);
    boomRGeo.rotateX(Math.PI / 2);
    const boomR = new THREE.Mesh(boomRGeo, carbonFuselageMat);
    boomR.position.set(2.4, 0.75, -2.5);
    boomR.castShadow = true;
    tailGroup.add(boomR);

    // Horizontal Stabilizer linking twin booms
    const hStabGeo = new THREE.BoxGeometry(5.2, 0.09, 0.75);
    const hStab = new THREE.Mesh(hStabGeo, wingMat);
    hStab.position.set(0, 1.45, -5.0);
    hStab.castShadow = true;
    tailGroup.add(hStab);

    // Twin Vertical Fins
    const vFinGeo = new THREE.BoxGeometry(0.08, 1.2, 0.7);
    const finL = new THREE.Mesh(vFinGeo, cyanGlowMat);
    finL.position.set(-2.4, 1.4, -5.0);
    tailGroup.add(finL);

    const finR = new THREE.Mesh(vFinGeo, cyanGlowMat);
    finR.position.set(2.4, 1.4, -5.0);
    tailGroup.add(finR);

    // --- Subassembly 4: 4x ELECTRIC MOTORS & PROPELLERS (DEP) ---
    const depGroup = new THREE.Group();
    aircraftGroup.add(depGroup);
    explodedGroups.motors = depGroup;

    const motorPositions = [-4.0, -1.8, 1.8, 4.0];
    motorPositions.forEach((xPos, idx) => {
      // Nacelle
      const nacelleGeo = new THREE.CylinderGeometry(0.22, 0.2, 1.1, 16);
      nacelleGeo.rotateX(Math.PI / 2);
      const nacelle = new THREE.Mesh(nacelleGeo, metalMat);
      nacelle.position.set(xPos, 0.75, 1.05);
      nacelle.castShadow = true;
      depGroup.add(nacelle);

      // Propeller Spinner
      const propGroup = new THREE.Group();
      propGroup.position.set(xPos, 0.75, 1.65);
      depGroup.add(propGroup);

      const spinnerGeo = new THREE.ConeGeometry(0.14, 0.35, 16);
      spinnerGeo.rotateX(Math.PI / 2);
      const spinner = new THREE.Mesh(spinnerGeo, cyanGlowMat);
      propGroup.add(spinner);

      // 3 Propeller Blades
      for (let b = 0; b < 3; b++) {
        const bladeGeo = new THREE.BoxGeometry(0.1, 0.8, 0.03);
        const blade = new THREE.Mesh(bladeGeo, carbonFuselageMat);
        blade.position.y = 0.38;
        blade.rotation.z = (b * Math.PI * 2) / 3;
        propGroup.add(blade);
      }

      // Propeller blur disk (semi-transparent)
      const diskGeo = new THREE.CircleGeometry(0.85, 24);
      const diskMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide
      });
      const blurDisk = new THREE.Mesh(diskGeo, diskMat);
      blurDisk.position.z = -0.05;
      propGroup.add(blurDisk);

      propBlades.push(propGroup);
    });

    // --- Subassembly 5: CRYOGENIC LH2 TANK ---
    const h2Group = new THREE.Group();
    aircraftGroup.add(h2Group);
    explodedGroups.tank = h2Group;

    const tankMat = new THREE.MeshStandardMaterial({
      color: 0x00a8cc,
      roughness: 0.15,
      metalness: 0.9,
      emissive: 0x003344
    });
    standardMaterials.push(tankMat);

    const tankGeo = new THREE.CylinderGeometry(0.48, 0.48, 2.8, 24);
    tankGeo.rotateX(Math.PI / 2);
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(0, 0.58, -0.6);
    h2Group.add(tank);

    // --- Subassembly 6: PEM FUEL CELL STACK ---
    const fcGroup = new THREE.Group();
    aircraftGroup.add(fcGroup);
    explodedGroups.fuelcell = fcGroup;

    const fcBoxGeo = new THREE.BoxGeometry(0.8, 0.55, 1.2);
    const fcMat = new THREE.MeshStandardMaterial({
      color: 0x223555,
      roughness: 0.3,
      metalness: 0.8
    });
    const fcStack = new THREE.Mesh(fcBoxGeo, fcMat);
    fcStack.position.set(0, 0.65, 0.8);
    fcGroup.add(fcStack);

    // --- Subassembly 7: QUICK-SWAP MISSION POD (Agro / Fire) ---
    const podGroup = new THREE.Group();
    aircraftGroup.add(podGroup);
    explodedGroups.payload = podGroup;

    // Belly Tank Pod
    const podGeo = new THREE.CylinderGeometry(0.58, 0.45, 3.2, 24);
    podGeo.rotateX(Math.PI / 2);
    const podMat = new THREE.MeshStandardMaterial({
      color: 0x00ff9d, // agro emerald default
      roughness: 0.25,
      metalness: 0.6
    });
    standardMaterials.push(podMat);
    const missionPodMesh = new THREE.Mesh(podGeo, podMat);
    missionPodMesh.name = 'missionPodMesh';
    missionPodMesh.position.set(0, -0.42, 0.2);
    missionPodMesh.castShadow = true;
    podGroup.add(missionPodMesh);

    // Dual Spray Boom Bars under wings
    const boomSprayGeo = new THREE.CylinderGeometry(0.03, 0.03, 8.5, 16);
    boomSprayGeo.rotateZ(Math.PI / 2);
    const boomSpray = new THREE.Mesh(boomSprayGeo, metalMat);
    boomSpray.name = 'sprayBoomMesh';
    boomSpray.position.set(0, 0.15, -0.2);
    podGroup.add(boomSpray);

    // --- Subassembly 8: SENSOR GIMBAL (NOSE) ---
    const gimbalGroup = new THREE.Group();
    aircraftGroup.add(gimbalGroup);
    explodedGroups.gimbal = gimbalGroup;

    const turretGeo = new THREE.SphereGeometry(0.28, 20, 20);
    const turretMat = new THREE.MeshStandardMaterial({
      color: 0x0a1122,
      roughness: 0.2,
      metalness: 0.95
    });
    const turret = new THREE.Mesh(turretGeo, turretMat);
    turret.position.set(0, 0.12, 3.8);
    gimbalGroup.add(turret);

    // Multispectral / Thermal Lenses
    const lensGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 16);
    lensGeo.rotateX(Math.PI / 2);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x00ff9d });
    const lens1 = new THREE.Mesh(lensGeo, lensMat);
    lens1.position.set(-0.09, 0.12, 4.05);
    gimbalGroup.add(lens1);

    const lens2Mat = new THREE.MeshBasicMaterial({ color: 0xff4d00 });
    const lens2 = new THREE.Mesh(lensGeo, lens2Mat);
    lens2.position.set(0.09, 0.12, 4.05);
    gimbalGroup.add(lens2);

    // --- Subassembly 9: ROUGH-TERRAIN STOL LANDING GEAR ---
    const gearGroup = new THREE.Group();
    aircraftGroup.add(gearGroup);
    explodedGroups.gear = gearGroup;

    // Nose Gear
    const noseStrutGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 16);
    const noseStrut = new THREE.Mesh(noseStrutGeo, metalMat);
    noseStrut.position.set(0, -0.85, 3.0);
    gearGroup.add(noseStrut);

    const noseWheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.14, 20);
    noseWheelGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.9 });
    const noseWheel = new THREE.Mesh(noseWheelGeo, tireMat);
    noseWheel.position.set(0, -1.35, 3.0);
    gearGroup.add(noseWheel);

    // Main Gear (Left & Right)
    [-1.5, 1.5].forEach(x => {
      const mainStrutGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.3, 16);
      const mainStrut = new THREE.Mesh(mainStrutGeo, metalMat);
      mainStrut.position.set(x, -0.85, 0.3);
      gearGroup.add(mainStrut);

      const mainWheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 20);
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
      
      // Canvas text icon texture for billboard sprite
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
    if (!HOTSPOTS_DATA[key]) return;
    STATE.activeHotspot = key;
    audio.playHotspotChime();

    const data = HOTSPOTS_DATA[key];

    // Smooth Fly-To camera animation
    smoothMoveCamera(data.camPos, data.targetPos);

    // Update Flyout Panel contents
    updateFlyoutPanel(data);

    // Highlight chips in quick bar
    document.querySelectorAll('.hotspot-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.hotspot === key);
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
    document.getElementById('flyout-tag').textContent = data.category;
    document.getElementById('flyout-title').textContent = data.title[STATE.lang];
    
    // Update Specs
    for (let i = 0; i < 4; i++) {
      const spec = data.specs[i];
      document.getElementById(`spec-lbl-${i+1}`).textContent = spec.label[STATE.lang];
      document.getElementById(`spec-val-${i+1}`).textContent = spec.val;
    }

    document.getElementById('flyout-formula-content').textContent = data.formula;
    document.getElementById('flyout-desc').textContent = data.desc[STATE.lang];

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

  function initZebraShader() {
    // Zebra Stripe Reflection Shader evaluating Class-A Surface Continuity
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
        
        // Striped zebra pattern along reflection angle
        float stripe = sin(reflectDir.y * 55.0 + reflectDir.x * 20.0);
        float colorVal = smoothstep(-0.05, 0.05, stripe);
        
        vec3 col = mix(vec3(0.04, 0.06, 0.1), vec3(0.9, 0.95, 1.0), colorVal);
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    zebraMaterial = new THREE.ShaderMaterial({
      vertexShader: zebraVertexShader,
      fragmentShader: zebraFragmentShader,
      side: THREE.DoubleSide
    });
  }

  function toggleZebraShader() {
    STATE.zebraShader = !STATE.zebraShader;
    audio.playClick();
    document.getElementById('btn-zebra-shader').classList.toggle('active', STATE.zebraShader);

    aircraftGroup.traverse(child => {
      if (child.isMesh && child.name !== 'sprayBoomMesh') {
        if (STATE.zebraShader) {
          if (!child.userData.origMaterial) child.userData.origMaterial = child.material;
          child.material = zebraMaterial;
        } else {
          if (child.userData.origMaterial) child.material = child.userData.origMaterial;
        }
      }
    });
  }

  function createParticleSystems() {
    // 1. CFD Wind Tunnel Streamlines
    const cfdCount = 1200;
    const cfdGeo = new THREE.BufferGeometry();
    const cfdPositions = new Float32Array(cfdCount * 3);
    const cfdColors = new Float32Array(cfdCount * 3);

    for (let i = 0; i < cfdCount; i++) {
      cfdPositions[i * 3] = (Math.random() - 0.5) * 14; // X span
      cfdPositions[i * 3 + 1] = 0.5 + (Math.random() - 0.5) * 1.5; // Y height
      cfdPositions[i * 3 + 2] = 8 - Math.random() * 16; // Z streamline

      // Speed & Pressure color gradient (Cyan to Green to Red)
      cfdColors[i * 3] = 0.0;
      cfdColors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
      cfdColors[i * 3 + 2] = 0.9;
    }
    cfdGeo.setAttribute('position', new THREE.BufferAttribute(cfdPositions, 3));
    cfdGeo.setAttribute('color', new THREE.BufferAttribute(cfdColors, 3));

    const cfdMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.65
    });
    cfdParticleSystem = new THREE.Points(cfdGeo, cfdMat);
    cfdParticleSystem.visible = false;
    scene.add(cfdParticleSystem);

    // 2. Agro Spray Mist System
    const sprayCount = 800;
    const sprayGeo = new THREE.BufferGeometry();
    const sprayPos = new Float32Array(sprayCount * 3);
    for (let i = 0; i < sprayCount; i++) {
      sprayPos[i * 3] = (Math.random() - 0.5) * 8.5;
      sprayPos[i * 3 + 1] = 0.15;
      sprayPos[i * 3 + 2] = -0.2 - Math.random() * 2;
    }
    sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
    const sprayMat = new THREE.PointsMaterial({
      color: 0x00ff9d,
      size: 0.16,
      transparent: true,
      opacity: 0.7
    });
    sprayParticleSystem = new THREE.Points(sprayGeo, sprayMat);
    sprayParticleSystem.visible = false;
    scene.add(sprayParticleSystem);

    // 3. Firefighting Water Deluge Dump
    const dumpCount = 1200;
    const dumpGeo = new THREE.BufferGeometry();
    const dumpPos = new Float32Array(dumpCount * 3);
    for (let i = 0; i < dumpCount; i++) {
      dumpPos[i * 3] = (Math.random() - 0.5) * 1.2;
      dumpPos[i * 3 + 1] = -0.5;
      dumpPos[i * 3 + 2] = 0.2 - Math.random() * 2;
    }
    dumpGeo.setAttribute('position', new THREE.BufferAttribute(dumpPos, 3));
    const dumpMat = new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 0.26,
      transparent: true,
      opacity: 0.8
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
  // 9. THREE.JS RENDER LOOP & ANIMATIONS
  // --------------------------------------------------------------------------
  function animate() {
    requestAnimationFrame(animate);

    // 1. Spin DEP Propellers
    const propSpeed = STATE.isFlying ? 0.35 : 0.08;
    propBlades.forEach((prop, i) => {
      prop.rotation.z += (i % 2 === 0 ? 1 : -1) * propSpeed;
    });

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
      explodedGroups.gear.position.y = -STATE.explodeProgress * 1.8;
    }

    // 3. CFD Streamlines Motion
    if (STATE.windTunnel && cfdParticleSystem) {
      const positions = cfdParticleSystem.geometry.attributes.position.array;
      for (let i = 2; i < positions.length; i += 3) {
        positions[i] -= 0.35; // move air backward
        if (positions[i] < -8) {
          positions[i] = 8;
        }
      }
      cfdParticleSystem.geometry.attributes.position.needsUpdate = true;
    }

    // 4. Spray Mist Particles Motion
    if (STATE.spraying && sprayParticleSystem) {
      const pos = sprayParticleSystem.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] -= 0.06; // fall down
        pos[i + 2] -= 0.09; // drift backward
        if (pos[i + 1] < -1.5) {
          pos[i + 1] = 0.15;
          pos[i + 2] = -0.2;
        }
      }
      sprayParticleSystem.geometry.attributes.position.needsUpdate = true;
    }

    // 5. Water Dump Stream Motion
    if (STATE.waterDumping && waterDumpParticleSystem) {
      const pos = waterDumpParticleSystem.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] -= 0.12; // plunge down
        pos[i + 2] -= 0.07;
        if (pos[i + 1] < -1.5) {
          pos[i + 1] = -0.5;
          pos[i + 2] = 0.2;
        }
      }
      waterDumpParticleSystem.geometry.attributes.position.needsUpdate = true;
    }

    // 6. Flight Simulator Controls & Dynamics
    if (STATE.isFlying) {
      handleFlightPhysics();
    }

    // 7. Pulse Hotspot Markers
    const time = performance.now() * 0.003;
    hotspotSprites.forEach(sprite => {
      const scale = 0.65 + Math.sin(time) * 0.08;
      sprite.scale.set(scale, scale, 1);
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
    camera.aspect = container.clientWidth / container.clientHeight;
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

    function sendAiMessage(userText) {
      if (!userText.trim()) return;
      audio.playClick();

      // Add user message to UI
      addMessageToAiBox('user', userText);
      input.value = '';

      // AI Response processing
      setTimeout(() => {
        const response = generateAiAerospaceResponse(userText);
        addMessageToAiBox('system', response);
      }, 500);
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

    // Mission Modes (Clean H2 / Agro / Fire)
    document.getElementById('btn-mode-clean').addEventListener('click', () => setMissionMode('clean'));
    document.getElementById('btn-mode-agro').addEventListener('click', () => setMissionMode('agro'));
    document.getElementById('btn-mode-fire').addEventListener('click', () => setMissionMode('fire'));

    // Engineering 3D Buttons
    document.getElementById('btn-exploded-view').addEventListener('click', toggleExplodedView);
    document.getElementById('btn-zebra-shader').addEventListener('click', toggleZebraShader);
    document.getElementById('btn-wind-tunnel').addEventListener('click', toggleWindTunnel);
    document.getElementById('btn-spray-anim').addEventListener('click', triggerSprayAnimation);
    document.getElementById('btn-water-dump').addEventListener('click', triggerWaterDumpAnimation);

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
    });

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
    if (view === 'iso') {
      smoothMoveCamera({ x: 11, y: 6.5, z: 13 }, { x: 0, y: 0.5, z: 0 });
    } else if (view === 'front') {
      smoothMoveCamera({ x: 0, y: 1.2, z: 12 }, { x: 0, y: 0.8, z: 0 });
    } else if (view === 'top') {
      smoothMoveCamera({ x: 0, y: 19, z: 0.1 }, { x: 0, y: 0, z: 0 });
    } else if (view === 'side') {
      smoothMoveCamera({ x: 16, y: 1.5, z: 0 }, { x: 0, y: 0.5, z: 0 });
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
  // 17. APPLICATION ENTRY POINT
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
  });

})();
