/**
 * Smart Crowd Density Alert System - Case Study #2
 * Subject: 25EE256 - Sensor and Instrumentation
 * Wokwi Twin & IoT Hardware Dashboard Logic
 */

// ==========================================
// SYSTEM STATE VARIABLES (Firmware Emulation)
// ==========================================
const state = {
  // Sensor & Actuator variables (matching Arduino sketch)
  crowdCount: 0,
  personCrossing: false,
  distance: 120, // cm
  motionDetected: 0, // 0 = NO, 1 = YES
  
  // Actuator output states
  ledGreen: true,
  ledYellow: false,
  ledRed: false,
  buzzerActive: false,
  statusTier: 'NORMAL (Safe)',

  // Dashboard & Simulation variables
  mode: 'simulator', // 'simulator' or 'hardware'
  audioEnabled: false,
  autoTraffic: false,
  isPaused: false,
  autoScroll: true,
  
  // Analytics & Metrics
  totalEntriesSession: 0,
  peakDensity: 0,
  distanceHistory: [],
  historyLimit: 45,
  startTime: Date.now(),
  lastWalkingAnim: false
};

// ==========================================
// WEB AUDIO API SYNTHESIZER (1 kHz Piezo Buzzer)
// ==========================================
let audioCtx = null;
let buzzerOscillator = null;
let buzzerGain = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function startBuzzerTone() {
  if (!state.audioEnabled || !audioCtx) return;
  if (buzzerOscillator) return; // Already sounding

  try {
    buzzerOscillator = audioCtx.createOscillator();
    buzzerGain = audioCtx.createGain();

    // 1000 Hz square/sine tone matching tone(BUZZER_PIN, 1000)
    buzzerOscillator.type = 'square';
    buzzerOscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);

    // Smooth gain ramp to avoid harsh clicks
    buzzerGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    buzzerGain.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);

    buzzerOscillator.connect(buzzerGain);
    buzzerGain.connect(audioCtx.destination);
    buzzerOscillator.start();
  } catch (err) {
    console.warn("Audio synthesis error:", err);
  }
}

function stopBuzzerTone() {
  if (buzzerOscillator && audioCtx) {
    try {
      buzzerGain.gain.setValueAtTime(buzzerGain.gain.value, audioCtx.currentTime);
      buzzerGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.04);
      setTimeout(() => {
        if (buzzerOscillator) {
          buzzerOscillator.stop();
          buzzerOscillator.disconnect();
          buzzerOscillator = null;
          buzzerGain = null;
        }
      }, 50);
    } catch (e) {
      buzzerOscillator = null;
    }
  }
}

function playTestBeep(durationMs = 500) {
  initAudio();
  if (!audioCtx) {
    alert("Web Audio API is not supported in this browser.");
    return;
  }
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      osc.disconnect();
    }, durationMs);
  } catch (err) {
    console.error(err);
  }
}

// ==========================================
// DOM ELEMENT REFERENCES
// ==========================================
const dom = {
  // Alert Hero
  alertHeroCard: document.getElementById('alertHeroCard'),
  alertHeroIcon: document.getElementById('alertHeroIcon'),
  alertIconWrapper: document.getElementById('alertIconWrapper'),
  tierBadge: document.getElementById('tierBadge'),
  alertTitle: document.getElementById('alertTitle'),
  alertDesc: document.getElementById('alertDesc'),
  buzzerPill: document.getElementById('buzzerPill'),
  buzzerPillText: document.getElementById('buzzerPillText'),
  buzzerPulseDot: document.getElementById('buzzerPulseDot'),
  ledStateSummary: document.getElementById('ledStateSummary'),

  // Metrics
  crowdCountValue: document.getElementById('crowdCountValue'),
  crowdStatusTag: document.getElementById('crowdStatusTag'),
  crowdCapacityPct: document.getElementById('crowdCapacityPct'),
  capacityGaugeFill: document.getElementById('capacityGaugeFill'),
  distanceValue: document.getElementById('distanceValue'),
  sonarTriggerTag: document.getElementById('sonarTriggerTag'),
  distanceSlider: document.getElementById('distanceSlider'),
  distanceSliderDisplay: document.getElementById('distanceSliderDisplay'),
  radarTarget: document.getElementById('radarTarget'),
  pirPill: document.getElementById('pirPill'),
  pirStatusText: document.getElementById('pirStatusText'),
  pirToggle: document.getElementById('pirToggle'),
  crossingStatusText: document.getElementById('crossingStatusText'),

  // Hardware bench elements
  hwLedGreen: document.getElementById('hwLedGreen'),
  hwLedYellow: document.getElementById('hwLedYellow'),
  hwLedRed: document.getElementById('hwLedRed'),
  glowGreen: document.getElementById('glowGreen'),
  glowYellow: document.getElementById('glowYellow'),
  glowRed: document.getElementById('glowRed'),
  stateGreenText: document.getElementById('stateGreenText'),
  stateYellowText: document.getElementById('stateYellowText'),
  stateRedText: document.getElementById('stateRedText'),
  buzzerHousing: document.getElementById('buzzerHousing'),
  buzzerFreqText: document.getElementById('buzzerFreqText'),

  // Corridor elements
  avatarWalker: document.getElementById('avatarWalker'),
  sonarFieldBeam: document.getElementById('sonarFieldBeam'),
  pirCone: document.getElementById('pirCone'),

  // Terminal elements
  terminalBody: document.getElementById('terminalBody'),
  chkAutoScroll: document.getElementById('chkAutoScroll'),
  terminalLineCount: document.getElementById('terminalLineCount'),
  terminalStatusInfo: document.getElementById('terminalStatusInfo'),

  // Stats
  totalEntriesStat: document.getElementById('totalEntriesStat'),
  peakDensityStat: document.getElementById('peakDensityStat'),
  avgDistanceStat: document.getElementById('avgDistanceStat'),
  uptimeStat: document.getElementById('uptimeStat'),

  // Chart Canvas
  canvas: document.getElementById('telemetryChart'),

  // Modal
  docsModal: document.getElementById('docsModal'),
  btnOpenDocs: document.getElementById('btnOpenDocs'),
  btnCloseModal: document.getElementById('btnCloseModal'),
  btnModalCloseAction: document.getElementById('btnModalCloseAction'),

  // Controls & Buttons
  btnConnectSerial: document.getElementById('btnConnectSerial'),
  serialBtnText: document.getElementById('serialBtnText'),
  statusModeLabel: document.getElementById('statusModeLabel'),
  statusBeacon: document.getElementById('statusBeacon'),
  btnAudioToggle: document.getElementById('btnAudioToggle'),
  audioBtnText: document.getElementById('audioBtnText'),
  btnTestBuzzer: document.getElementById('btnTestBuzzer'),
  btnAddCount: document.getElementById('btnAddCount'),
  btnSubCount: document.getElementById('btnSubCount'),
  btnResetCount: document.getElementById('btnResetCount'),
  btnSimulatePerson: document.getElementById('btnSimulatePerson'),
  btnAutoTraffic: document.getElementById('btnAutoTraffic'),
  autoTrafficText: document.getElementById('autoTrafficText'),
  btnClearTerminal: document.getElementById('btnClearTerminal'),
  btnCopyTerminal: document.getElementById('btnCopyTerminal'),
  btnPauseTerminal: document.getElementById('btnPauseTerminal'),

  // ThingSpeak DOM elements
  btnOpenThingSpeak: document.getElementById('btnOpenThingSpeak'),
  tsStatusDot: document.getElementById('tsStatusDot'),
  tsSyncStatusBadge: document.getElementById('tsSyncStatusBadge'),
  tsModeTag: document.getElementById('tsModeTag'),
  tsChannelTag: document.getElementById('tsChannelTag'),
  tsF1: document.getElementById('tsF1'),
  tsF2: document.getElementById('tsF2'),
  tsF3: document.getElementById('tsF3'),
  tsF4: document.getElementById('tsF4'),
  tsF5: document.getElementById('tsF5'),
  tsTimerVal: document.getElementById('tsTimerVal'),
  btnTsManualSync: document.getElementById('btnTsManualSync'),
  btnTsConfigure: document.getElementById('btnTsConfigure'),
  btnTsViewChannel: document.getElementById('btnTsViewChannel'),

  // ThingSpeak Modal
  thingspeakModal: document.getElementById('thingspeakModal'),
  btnCloseTsModal: document.getElementById('btnCloseTsModal'),
  tsInputChannelId: document.getElementById('tsInputChannelId'),
  tsSelectMode: document.getElementById('tsSelectMode'),
  tsInputWriteKey: document.getElementById('tsInputWriteKey'),
  tsInputReadKey: document.getElementById('tsInputReadKey'),
  tsSelectInterval: document.getElementById('tsSelectInterval'),
  tsAutoSyncToggle: document.getElementById('tsAutoSyncToggle'),
  btnToggleWriteKey: document.getElementById('btnToggleWriteKey'),
  btnToggleReadKey: document.getElementById('btnToggleReadKey'),
  btnTestTsConnection: document.getElementById('btnTestTsConnection'),
  btnSaveTsConfig: document.getElementById('btnSaveTsConfig'),
  btnClearTsConfig: document.getElementById('btnClearTsConfig'),
  tsAlertBox: document.getElementById('tsAlertBox'),
  tsDiagContent: document.getElementById('tsDiagContent')
};

// ==========================================
// SERIAL MONITOR & LOGGING
// ==========================================
let terminalLineCount = 0;

function logSerial(lineText, type = 'normal') {
  if (state.isPaused) return;

  const lineElem = document.createElement('div');
  lineElem.className = 'terminal-line';

  if (type === 'header') {
    lineElem.classList.add('term-header');
  } else if (type === 'entry') {
    lineElem.classList.add('term-entry');
  } else if (type === 'normal') {
    lineElem.classList.add('term-safe');
  } else if (type === 'warn') {
    lineElem.classList.add('term-warn');
  } else if (type === 'danger') {
    lineElem.classList.add('term-danger');
  }

  // Format line text
  lineElem.textContent = lineText;
  dom.terminalBody.appendChild(lineElem);
  terminalLineCount++;
  dom.terminalLineCount.textContent = `${terminalLineCount} lines`;

  // Cap DOM history to 250 lines for high performance
  if (dom.terminalBody.children.length > 250) {
    dom.terminalBody.removeChild(dom.terminalBody.firstChild);
  }

  if (state.autoScroll) {
    dom.terminalBody.scrollTop = dom.terminalBody.scrollHeight;
  }
}

// Initial Boot Sequence Log
function printBootSequence() {
  logSerial("================================================", "header");
  logSerial("  Smart Crowd Density Alert System Initialized  ", "header");
  logSerial("================================================", "header");
}

// ==========================================
// ARDUINO FIRMWARE EMULATION CORE LOOP
// Runs at matching loop cadence (every 300 ms)
// ==========================================
function executeArduinoLoopCycle() {
  if (state.mode !== 'simulator') return;

  const distance = state.distance;
  const motionDetected = state.motionDetected;

  // Checkpoint counting logic from sketch.ino:
  // When a person passes within 50 cm of the sensor, increment count
  if (distance < 50 && !state.personCrossing) {
    state.personCrossing = true;
    state.crowdCount++;
    state.totalEntriesSession++;
    if (state.crowdCount > state.peakDensity) {
      state.peakDensity = state.crowdCount;
    }
    logSerial(`>>> Entry Detected! Current Count: ${state.crowdCount}`, 'entry');
  } else if (distance >= 50 && state.personCrossing) {
    state.personCrossing = false; // Reset crossing state once cleared
  }

  // Determine Tier and Outputs
  let statusText = "";
  let logTier = "normal";

  // Tier 1: Normal Density (Count < 5)
  if (state.crowdCount < 5) {
    state.ledGreen = true;
    state.ledYellow = false;
    state.ledRed = false;
    state.buzzerActive = false;
    statusText = "NORMAL (Safe)";
    logTier = "normal";
  }
  // Tier 2: Warning Density (Count 5 to 9)
  else if (state.crowdCount >= 5 && state.crowdCount < 10) {
    state.ledGreen = false;
    state.ledYellow = true;
    state.ledRed = false;
    state.buzzerActive = false;
    statusText = "WARNING (Approaching Capacity)";
    logTier = "warn";
  }
  // Tier 3: Critical Overcrowded (Count >= 10)
  else {
    state.ledGreen = false;
    state.ledYellow = false;
    state.ledRed = true;
    state.buzzerActive = true;
    statusText = "DANGER (OVERCROWDED! Evacuate / Divert)";
    logTier = "danger";
  }

  state.statusTier = statusText;

  // Print diagnostics to Serial Monitor (matching exact format)
  // Dist: 120 cm | Motion: NO  | Density Count: 0 -> Status: NORMAL (Safe)
  const motionStr = motionDetected ? "YES" : "NO ";
  const telemetryLine = `Dist: ${distance} cm | Motion: ${motionStr} | Density Count: ${state.crowdCount} -> Status: ${statusText}`;
  logSerial(telemetryLine, logTier);

  // Update UI and Hardware representation
  updateDashboardUI();

  // Handle buzzer audio
  if (state.buzzerActive) {
    startBuzzerTone();
  } else {
    stopBuzzerTone();
  }

  // Record telemetry point for trend chart
  recordTelemetryPoint(distance, state.crowdCount);
}

// ==========================================
// UI UPDATE DISPATCHER
// ==========================================
function updateDashboardUI() {
  // 1. Alert Hero Card Styling
  dom.alertHeroCard.classList.remove('tier-normal', 'tier-warning', 'tier-danger');
  
  if (state.crowdCount < 5) {
    dom.alertHeroCard.classList.add('tier-normal');
    dom.tierBadge.textContent = "TIER 1 \u2022 COUNT < 5";
    dom.alertTitle.textContent = "NORMAL (Safe)";
    dom.alertDesc.textContent = "Density within safe limits. Green indicator active. Flow is optimal.";
    dom.alertHeroIcon.innerHTML = `
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <path d="m9 12 2 2 4-4"></path>
    `;
    dom.crowdStatusTag.className = "metric-status-tag";
    dom.crowdStatusTag.textContent = "Safe (< 5)";
  } else if (state.crowdCount < 10) {
    dom.alertHeroCard.classList.add('tier-warning');
    dom.tierBadge.textContent = "TIER 2 \u2022 COUNT 5 \u2013 9";
    dom.alertTitle.textContent = "WARNING (Approaching Capacity)";
    dom.alertDesc.textContent = "Venue approaching maximum threshold. Yellow advisory indicator active.";
    dom.alertHeroIcon.innerHTML = `
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    `;
    dom.crowdStatusTag.className = "metric-status-tag warn";
    dom.crowdStatusTag.textContent = "Warning (5-9)";
  } else {
    dom.alertHeroCard.classList.add('tier-danger');
    dom.tierBadge.textContent = "TIER 3 \u2022 COUNT \u2265 10";
    dom.alertTitle.textContent = "DANGER (OVERCROWDED!)";
    dom.alertDesc.textContent = "CRITICAL LIMIT REACHED! Evacuate / divert crowd flow. 1 kHz alarm sounding.";
    dom.alertHeroIcon.innerHTML = `
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    `;
    dom.crowdStatusTag.className = "metric-status-tag danger";
    dom.crowdStatusTag.textContent = "OVERCROWDED (\u2265 10)";
  }

  // 2. Buzzer Pill Status
  if (state.buzzerActive) {
    dom.buzzerPill.classList.add('alarm-active');
    dom.buzzerPillText.textContent = "BUZZER: 1000 Hz ALARM ACTIVE";
    dom.buzzerHousing.classList.add('active-buzzer');
    dom.buzzerFreqText.textContent = "tone(11, 1000) \u2022 ACTIVE";
    dom.buzzerFreqText.style.color = "var(--color-red)";
  } else {
    dom.buzzerPill.classList.remove('alarm-active');
    dom.buzzerPillText.textContent = "BUZZER: SILENT";
    dom.buzzerHousing.classList.remove('active-buzzer');
    dom.buzzerFreqText.textContent = "noTone() \u2022 Silent";
    dom.buzzerFreqText.style.color = "var(--text-main)";
  }

  // 3. LED Indicators State Pill & Twin Bulbs
  dom.ledStateSummary.innerHTML = `
    <span class="led-pill led-pill-green ${state.ledGreen ? 'active' : ''}">GREEN ${state.ledGreen ? 'HIGH' : 'LOW'}</span>
    <span class="led-pill led-pill-yellow ${state.ledYellow ? 'active' : ''}">YELLOW ${state.ledYellow ? 'HIGH' : 'LOW'}</span>
    <span class="led-pill led-pill-red ${state.ledRed ? 'active' : ''}">RED ${state.ledRed ? 'HIGH' : 'LOW'}</span>
  `;

  // Hardware bench bulbs
  dom.hwLedGreen.classList.toggle('active', state.ledGreen);
  dom.hwLedYellow.classList.toggle('active', state.ledYellow);
  dom.hwLedRed.classList.toggle('active', state.ledRed);
  dom.stateGreenText.textContent = state.ledGreen ? 'HIGH (ON)' : 'LOW (OFF)';
  dom.stateYellowText.textContent = state.ledYellow ? 'HIGH (ON)' : 'LOW (OFF)';
  dom.stateRedText.textContent = state.ledRed ? 'HIGH (ON)' : 'LOW (OFF)';

  // 4. Metric Numbers & Gauge
  dom.crowdCountValue.textContent = state.crowdCount;
  const pct = Math.min(100, Math.round((state.crowdCount / 10) * 100));
  dom.crowdCapacityPct.textContent = `${pct}% Safe Capacity`;
  dom.capacityGaugeFill.style.width = `${Math.min(100, (state.crowdCount / 12) * 100)}%`;

  // Distance Metric & Sonar UI
  dom.distanceValue.textContent = state.distance;
  const isTriggered = state.distance < 50;
  dom.sonarTriggerTag.classList.toggle('triggered', isTriggered);
  dom.sonarTriggerTag.textContent = isTriggered ? "ENTRY TRIGGER (< 50 cm)" : "CLEAR (\u2265 50 cm)";

  // Distance Radar Map & Slider
  const radarPct = Math.max(5, Math.min(95, (state.distance / 300) * 100));
  dom.radarTarget.style.left = `${radarPct}%`;
  dom.radarTarget.classList.toggle('in-trigger', isTriggered);

  // PIR Motion UI
  const isMotion = !!state.motionDetected;
  dom.pirPill.classList.toggle('motion-active', isMotion);
  dom.pirPill.textContent = isMotion ? "MOTION DETECTED (YES)" : "NO MOTION (NO)";
  dom.pirStatusText.textContent = isMotion ? "HIGH (1) \u2022 ACTIVE DETECT" : "LOW (0) \u2022 Standby";
  dom.pirCone.classList.toggle('active', isMotion);

  // Crossing State UI
  dom.crossingStatusText.textContent = state.personCrossing ? "LATCHED \u2022 true (Crossing)" : "ARMED \u2022 false (Ready)";
  dom.crossingStatusText.style.color = state.personCrossing ? "#38bdf8" : "var(--text-main)";

  // Stats in chart section
  dom.totalEntriesStat.textContent = state.totalEntriesSession;
  dom.peakDensityStat.textContent = state.peakDensity;
  const elapsedSec = Math.floor((Date.now() - state.startTime) / 1000);
  const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const secs = String(elapsedSec % 60).padStart(2, '0');
  dom.uptimeStat.textContent = `${mins}:${secs}`;

  // ThingSpeak Live Payload Preview
  if (dom.tsF1) dom.tsF1.textContent = state.crowdCount;
  if (dom.tsF2) dom.tsF2.textContent = state.distance;
  if (dom.tsF3) dom.tsF3.textContent = state.motionDetected;
  const tierNum = state.crowdCount < 5 ? 1 : (state.crowdCount < 10 ? 2 : 3);
  if (dom.tsF4) dom.tsF4.textContent = tierNum;
  if (dom.tsF5) dom.tsF5.textContent = state.buzzerActive ? 1 : 0;
}

// ==========================================
// REAL-TIME CANVAS TELEMETRY CHART
// ==========================================
const chartData = {
  crowdHistory: [],
  distHistory: [],
  timestamps: []
};

function recordTelemetryPoint(dist, crowd) {
  chartData.distHistory.push(dist);
  chartData.crowdHistory.push(crowd);
  chartData.timestamps.push(Date.now());

  if (chartData.distHistory.length > 50) {
    chartData.distHistory.shift();
    chartData.crowdHistory.shift();
    chartData.timestamps.shift();
  }

  // Calculate average distance
  const sum = chartData.distHistory.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / chartData.distHistory.length);
  dom.avgDistanceStat.textContent = `${avg} cm`;

  drawChart();
}

function drawChart() {
  const canvas = dom.canvas;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Clear background
  ctx.clearRect(0, 0, width, height);

  // Grid lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let y = 30; y < height; y += 45) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(width - 15, y);
    ctx.stroke();
  }

  const count = chartData.crowdHistory.length;
  if (count < 2) return;

  const startX = 50;
  const plotWidth = width - startX - 20;
  const stepX = plotWidth / (50 - 1);

  // Draw 10 Critical Limit Threshold (Red line)
  // Max scale Y = 20 persons
  const maxCapacityScale = 16;
  const thresholdY = height - 30 - ((10 / maxCapacityScale) * (height - 60));
  
  ctx.save();
  ctx.strokeStyle = "rgba(239, 68, 68, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(startX, thresholdY);
  ctx.lineTo(width - 15, thresholdY);
  ctx.stroke();
  ctx.fillStyle = "rgba(239, 68, 68, 0.8)";
  ctx.font = "10px JetBrains Mono";
  ctx.fillText("CRITICAL (10)", width - 85, thresholdY - 6);
  ctx.restore();

  // Draw Distance Curve (Scaled down to 0-300cm => height)
  ctx.beginPath();
  ctx.strokeStyle = "rgba(16, 185, 129, 0.8)";
  ctx.lineWidth = 2;
  for (let i = 0; i < count; i++) {
    const d = chartData.distHistory[i];
    const x = startX + i * stepX;
    // Map 0 - 300 cm to plot area
    const y = height - 30 - (Math.min(300, d) / 300) * (height - 60);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Draw Crowd Count Area & Curve
  ctx.beginPath();
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 3;
  for (let i = 0; i < count; i++) {
    const c = chartData.crowdHistory[i];
    const x = startX + i * stepX;
    const y = height - 30 - (Math.min(maxCapacityScale, c) / maxCapacityScale) * (height - 60);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Draw glowing head dot for latest value
  const latestX = startX + (count - 1) * stepX;
  const latestCrowdY = height - 30 - (Math.min(maxCapacityScale, chartData.crowdHistory[count - 1]) / maxCapacityScale) * (height - 60);
  ctx.beginPath();
  ctx.arc(latestX, latestCrowdY, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;
}

// Handle high-res canvas scaling
function setupCanvasResolution() {
  const rect = dom.canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  dom.canvas.width = rect.width * dpr;
  dom.canvas.height = rect.height * dpr;
  const ctx = dom.canvas.getContext('2d');
  ctx.scale(dpr, dpr);
}

// ==========================================
// INTERACTIVE CHECKPOINT CORRIDOR ANIMATION
// ==========================================
function simulatePersonPassage() {
  if (state.lastWalkingAnim) return;
  state.lastWalkingAnim = true;

  const walker = dom.avatarWalker;
  const totalDuration = 2200; // 2.2s total pass
  const startTime = performance.now();

  // Set PIR active during walk
  state.motionDetected = 1;
  dom.pirToggle.checked = true;

  function stepAnimation(now) {
    const progress = (now - startTime) / totalDuration;
    if (progress < 1) {
      // Move from left (60px) to right (480px)
      const leftPos = 60 + progress * 460;
      walker.style.left = `${leftPos}px`;

      // Checkpoint zone is roughly between 38% and 52% across
      if (progress >= 0.35 && progress <= 0.60) {
        // Distance drops to 28-36 cm (inside the < 50 cm trigger zone!)
        state.distance = 32;
        dom.distanceSlider.value = 32;
        dom.distanceSliderDisplay.textContent = "32 cm";
      } else {
        // Distance clears to 120 cm
        state.distance = 120;
        dom.distanceSlider.value = 120;
        dom.distanceSliderDisplay.textContent = "120 cm";
      }

      requestAnimationFrame(stepAnimation);
    } else {
      // Completed passage
      walker.style.left = '60px'; // Return to entrance
      state.distance = 120;
      dom.distanceSlider.value = 120;
      dom.distanceSliderDisplay.textContent = "120 cm";
      state.motionDetected = 0;
      dom.pirToggle.checked = false;
      state.lastWalkingAnim = false;
    }
  }

  requestAnimationFrame(stepAnimation);
}

// ==========================================
// AUTO TRAFFIC GENERATOR
// ==========================================
let autoTrafficInterval = null;

function toggleAutoTraffic() {
  state.autoTraffic = !state.autoTraffic;
  if (state.autoTraffic) {
    dom.btnAutoTraffic.classList.add('active');
    dom.autoTrafficText.textContent = "Auto Crowd Sim: ON";
    autoTrafficInterval = setInterval(() => {
      // Randomly decide between person entry or clearing
      if (state.crowdCount >= 12) {
        // Randomly drain some crowd
        state.crowdCount = Math.max(0, state.crowdCount - 3);
        logSerial(`[Evacuation/Exit] Crowd reduced to ${state.crowdCount}`, 'normal');
      } else {
        simulatePersonPassage();
      }
    }, 3200);
    simulatePersonPassage();
  } else {
    dom.btnAutoTraffic.classList.remove('active');
    dom.autoTrafficText.textContent = "Auto Crowd Sim: OFF";
    if (autoTrafficInterval) {
      clearInterval(autoTrafficInterval);
      autoTrafficInterval = null;
    }
  }
}

// ==========================================
// WEB SERIAL API HARDWARE BRIDGE (Physical Arduino)
// ==========================================
let serialPort = null;
let serialReader = null;

async function toggleWebSerial() {
  if (!navigator.serial) {
    alert("Web Serial API is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Chromium.");
    return;
  }

  if (state.mode === 'hardware' && serialPort) {
    // Disconnect
    try {
      if (serialReader) {
        await serialReader.cancel();
        serialReader = null;
      }
      await serialPort.close();
      serialPort = null;
    } catch (e) {
      console.warn("Serial close error", e);
    }
    state.mode = 'simulator';
    dom.serialBtnText.textContent = "Connect USB Serial";
    dom.statusModeLabel.textContent = "VIRTUAL SIMULATOR RUNNING (300ms Loop)";
    dom.statusBeacon.style.background = "var(--color-green)";
    logSerial("[Web Serial] Disconnected. Reverted to virtual simulation engine.", "warn");
    return;
  }

  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 9600 });
    state.mode = 'hardware';
    dom.serialBtnText.textContent = "Disconnect USB";
    dom.statusModeLabel.textContent = "HARDWARE CONNECTED: Arduino Uno (9600 Baud)";
    dom.statusBeacon.style.background = "#38bdf8";
    logSerial("[Web Serial] Connected to physical Arduino Uno @ 9600 baud!", "header");

    readSerialStream();
  } catch (err) {
    console.error("Serial connection error:", err);
    logSerial(`[Web Serial Error] ${err.message}`, "danger");
  }
}

async function readSerialStream() {
  const textDecoder = new TextDecoderStream();
  const readableStreamClosed = serialPort.readable.pipeTo(textDecoder.writable);
  const reader = textDecoder.readable.getReader();
  serialReader = reader;

  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;

          // Parse Arduino Serial format:
          // Dist: 120 cm | Motion: NO  | Density Count: 0 -> Status: NORMAL (Safe)
          parseHardwareSerialLine(cleanLine);
        }
      }
    }
  } catch (error) {
    console.warn("Serial read loop terminated", error);
  } finally {
    reader.releaseLock();
  }
}

function parseHardwareSerialLine(line) {
  // Check for Entry notification
  if (line.includes(">>> Entry Detected!")) {
    const match = line.match(/Current Count:\s*(\d+)/);
    if (match) {
      state.crowdCount = parseInt(match[1], 10);
      state.totalEntriesSession++;
    }
    logSerial(line, 'entry');
    return;
  }

  // Check for telemetry line:
  // Dist: 120 cm | Motion: NO  | Density Count: 0 -> Status: NORMAL (Safe)
  const regex = /Dist:\s*(\d+)\s*cm\s*\|\s*Motion:\s*(YES|NO\s*)\s*\|\s*Density Count:\s*(\d+)\s*->\s*Status:\s*(.+)/;
  const match = line.match(regex);

  if (match) {
    state.distance = parseInt(match[1], 10);
    state.motionDetected = match[2].trim() === "YES" ? 1 : 0;
    state.crowdCount = parseInt(match[3], 10);
    const statusStr = match[4].trim();

    if (state.crowdCount < 5) {
      state.ledGreen = true;
      state.ledYellow = false;
      state.ledRed = false;
      state.buzzerActive = false;
      logSerial(line, 'normal');
    } else if (state.crowdCount < 10) {
      state.ledGreen = false;
      state.ledYellow = true;
      state.ledRed = false;
      state.buzzerActive = false;
      logSerial(line, 'warn');
    } else {
      state.ledGreen = false;
      state.ledYellow = false;
      state.ledRed = true;
      state.buzzerActive = true;
      logSerial(line, 'danger');
    }

    updateDashboardUI();
    recordTelemetryPoint(state.distance, state.crowdCount);
  } else {
    // Normal print output
    logSerial(line, 'normal');
  }
}

// ==========================================
// EVENT LISTENERS & USER CONTROLS
// ==========================================
function bindEvents() {
  // Distance Slider Control
  dom.distanceSlider.addEventListener('input', (e) => {
    state.distance = parseInt(e.target.value, 10);
    dom.distanceSliderDisplay.textContent = `${state.distance} cm`;
    updateDashboardUI();
  });

  // PIR Motion Toggle
  dom.pirToggle.addEventListener('change', (e) => {
    state.motionDetected = e.target.checked ? 1 : 0;
    updateDashboardUI();
  });

  // Crowd Count Manual Buttons
  dom.btnAddCount.addEventListener('click', () => {
    state.crowdCount++;
    state.totalEntriesSession++;
    if (state.crowdCount > state.peakDensity) state.peakDensity = state.crowdCount;
    logSerial(`[Manual Override] Count increased to ${state.crowdCount}`, 'entry');
    updateDashboardUI();
  });

  dom.btnSubCount.addEventListener('click', () => {
    if (state.crowdCount > 0) {
      state.crowdCount--;
      logSerial(`[Manual Override] Count decreased to ${state.crowdCount}`, 'normal');
      updateDashboardUI();
    }
  });

  dom.btnResetCount.addEventListener('click', () => {
    state.crowdCount = 0;
    logSerial(`[System Reset] Crowd count reset to 0`, 'header');
    updateDashboardUI();
  });

  // Walk Simulation Buttons
  dom.btnSimulatePerson.addEventListener('click', () => {
    simulatePersonPassage();
  });

  dom.btnAutoTraffic.addEventListener('click', () => {
    toggleAutoTraffic();
  });

  // Audio Toggle Button
  dom.btnAudioToggle.addEventListener('click', () => {
    initAudio();
    state.audioEnabled = !state.audioEnabled;
    dom.btnAudioToggle.classList.toggle('active', state.audioEnabled);
    dom.audioBtnText.textContent = state.audioEnabled ? "Sound: ON" : "Sound: OFF";
    if (!state.audioEnabled) {
      stopBuzzerTone();
    } else if (state.buzzerActive) {
      startBuzzerTone();
    }
  });

  // Test Beep Button
  dom.btnTestBuzzer.addEventListener('click', () => {
    playTestBeep(400);
  });

  // Web Serial Connect
  dom.btnConnectSerial.addEventListener('click', () => {
    toggleWebSerial();
  });

  // Terminal Actions
  dom.chkAutoScroll.addEventListener('change', (e) => {
    state.autoScroll = e.target.checked;
  });

  dom.btnClearTerminal.addEventListener('click', () => {
    dom.terminalBody.innerHTML = '';
    terminalLineCount = 0;
    dom.terminalLineCount.textContent = '0 lines';
  });

  dom.btnCopyTerminal.addEventListener('click', () => {
    const text = dom.terminalBody.innerText;
    navigator.clipboard.writeText(text).then(() => {
      dom.btnCopyTerminal.textContent = "Copied!";
      setTimeout(() => { dom.btnCopyTerminal.textContent = "Copy"; }, 1500);
    });
  });

  dom.btnPauseTerminal.addEventListener('click', () => {
    state.isPaused = !state.isPaused;
    dom.btnPauseTerminal.textContent = state.isPaused ? "Resume" : "Pause";
  });

  // Documentation Modal
  dom.btnOpenDocs.addEventListener('click', () => {
    dom.docsModal.classList.add('open');
    dom.docsModal.setAttribute('aria-hidden', 'false');
  });

  const closeModal = () => {
    dom.docsModal.classList.remove('open');
    dom.docsModal.setAttribute('aria-hidden', 'true');
  };

  dom.btnCloseModal.addEventListener('click', closeModal);
  dom.btnModalCloseAction.addEventListener('click', closeModal);
  dom.docsModal.addEventListener('click', (e) => {
    if (e.target === dom.docsModal) closeModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (dom.docsModal.classList.contains('open')) closeModal();
      if (dom.thingspeakModal.classList.contains('open')) closeTsModal();
    }
  });

  // ThingSpeak Event Bindings
  dom.btnOpenThingSpeak.addEventListener('click', openTsModal);
  dom.btnTsConfigure.addEventListener('click', openTsModal);
  dom.btnCloseTsModal.addEventListener('click', closeTsModal);
  dom.thingspeakModal.addEventListener('click', (e) => {
    if (e.target === dom.thingspeakModal) closeTsModal();
  });

  dom.btnSaveTsConfig.addEventListener('click', saveThingSpeakConfig);
  dom.btnClearTsConfig.addEventListener('click', clearThingSpeakConfig);
  dom.btnTestTsConnection.addEventListener('click', testThingSpeakConnection);
  dom.btnTsManualSync.addEventListener('click', () => {
    if (!thingSpeak.isConfigured) {
      openTsModal();
    } else {
      performThingSpeakSync();
    }
  });

  // Password visibility toggles
  dom.btnToggleWriteKey.addEventListener('click', () => {
    const isPass = dom.tsInputWriteKey.type === 'password';
    dom.tsInputWriteKey.type = isPass ? 'text' : 'password';
    dom.btnToggleWriteKey.textContent = isPass ? '🔒' : '👁';
  });

  dom.btnToggleReadKey.addEventListener('click', () => {
    const isPass = dom.tsInputReadKey.type === 'password';
    dom.tsInputReadKey.type = isPass ? 'text' : 'password';
    dom.btnToggleReadKey.textContent = isPass ? '🔒' : '👁';
  });

  // Window Resize for Canvas
  window.addEventListener('resize', () => {
    setupCanvasResolution();
    drawChart();
  });
}

// ==========================================
// THINGSPEAK IOT CLOUD INTEGRATION MODULE
// ==========================================
const thingSpeak = {
  channelId: '',
  writeApiKey: '',
  readApiKey: '',
  mode: 'push', // 'push' or 'pull'
  intervalMs: 15000,
  autoSync: true,
  isConfigured: false,
  lastSyncTime: 0,
  countdownSec: 15,
  countdownInterval: null,
  isSyncing: false
};

function loadThingSpeakConfig() {
  try {
    thingSpeak.channelId = localStorage.getItem('ts_channelId') || '';
    thingSpeak.writeApiKey = localStorage.getItem('ts_writeApiKey') || '';
    thingSpeak.readApiKey = localStorage.getItem('ts_readApiKey') || '';
    thingSpeak.mode = localStorage.getItem('ts_mode') || 'push';
    thingSpeak.intervalMs = parseInt(localStorage.getItem('ts_intervalMs') || '15000', 10);
    thingSpeak.autoSync = localStorage.getItem('ts_autoSync') !== 'false';

    if (dom.tsInputChannelId) dom.tsInputChannelId.value = thingSpeak.channelId;
    if (dom.tsInputWriteKey) dom.tsInputWriteKey.value = thingSpeak.writeApiKey;
    if (dom.tsInputReadKey) dom.tsInputReadKey.value = thingSpeak.readApiKey;
    if (dom.tsSelectMode) dom.tsSelectMode.value = thingSpeak.mode;
    if (dom.tsSelectInterval) dom.tsSelectInterval.value = String(thingSpeak.intervalMs);
    if (dom.tsAutoSyncToggle) dom.tsAutoSyncToggle.checked = thingSpeak.autoSync;

    updateThingSpeakUI();

    if (thingSpeak.channelId && (thingSpeak.writeApiKey || thingSpeak.mode === 'pull')) {
      thingSpeak.isConfigured = true;
      if (thingSpeak.autoSync) {
        startThingSpeakScheduler();
      }
    }
  } catch (err) {
    console.warn("Could not load ThingSpeak config from localStorage", err);
  }
}

function updateThingSpeakUI() {
  if (thingSpeak.channelId && (thingSpeak.writeApiKey || thingSpeak.mode === 'pull')) {
    thingSpeak.isConfigured = true;
    dom.tsStatusDot.className = 'thingspeak-status-dot active';
    dom.tsSyncStatusBadge.className = 'ts-status-badge connected';
    dom.tsSyncStatusBadge.textContent = `Channel #${thingSpeak.channelId} (${thingSpeak.mode.toUpperCase()})`;
    dom.tsModeTag.className = `ts-mode-tag ${thingSpeak.mode}`;
    dom.tsModeTag.textContent = thingSpeak.mode === 'push' ? 'CLOUD PUSH' : 'CLOUD PULL';
    dom.tsChannelTag.textContent = `Channel #${thingSpeak.channelId}`;
    
    dom.btnTsViewChannel.style.display = 'inline-flex';
    dom.btnTsViewChannel.href = `https://thingspeak.com/channels/${encodeURIComponent(thingSpeak.channelId)}`;
  } else {
    thingSpeak.isConfigured = false;
    dom.tsStatusDot.className = 'thingspeak-status-dot';
    dom.tsSyncStatusBadge.className = 'ts-status-badge';
    dom.tsSyncStatusBadge.textContent = 'Disabled (Click to Config)';
    dom.tsModeTag.className = 'ts-mode-tag';
    dom.tsModeTag.textContent = 'SYNC OFF';
    dom.tsChannelTag.textContent = 'Channel: Not Configured';
    dom.btnTsViewChannel.style.display = 'none';
    dom.tsTimerVal.textContent = 'Ready';
  }
}

function saveThingSpeakConfig() {
  const channelId = dom.tsInputChannelId.value.trim();
  const mode = dom.tsSelectMode.value;
  const writeKey = dom.tsInputWriteKey.value.trim();
  const readKey = dom.tsInputReadKey.value.trim();
  const intervalMs = parseInt(dom.tsSelectInterval.value, 10);
  const autoSync = dom.tsAutoSyncToggle.checked;

  if (!channelId) {
    showTsAlert("Please provide a valid ThingSpeak Channel ID.", "error");
    return;
  }
  if (mode === 'push' && !writeKey) {
    showTsAlert("A 16-character Write API Key is required to push telemetry to ThingSpeak.", "error");
    return;
  }

  thingSpeak.channelId = channelId;
  thingSpeak.mode = mode;
  thingSpeak.writeApiKey = writeKey;
  thingSpeak.readApiKey = readKey;
  thingSpeak.intervalMs = intervalMs;
  thingSpeak.autoSync = autoSync;
  thingSpeak.isConfigured = true;

  try {
    localStorage.setItem('ts_channelId', channelId);
    localStorage.setItem('ts_mode', mode);
    localStorage.setItem('ts_writeApiKey', writeKey);
    localStorage.setItem('ts_readApiKey', readKey);
    localStorage.setItem('ts_intervalMs', String(intervalMs));
    localStorage.setItem('ts_autoSync', String(autoSync));
  } catch (e) {
    console.warn("Storage error", e);
  }

  showTsAlert(`Configuration saved! ThingSpeak Cloud ${mode.toUpperCase()} active.`, "success");
  updateThingSpeakUI();
  logSerial(`[ThingSpeak] Configured Channel #${channelId} in ${mode.toUpperCase()} mode (Interval: ${intervalMs/1000}s)`, "header");

  setTimeout(closeTsModal, 600);

  if (autoSync) {
    startThingSpeakScheduler();
    performThingSpeakSync(); // Immediate initial sync
  } else {
    stopThingSpeakScheduler();
  }
}

function clearThingSpeakConfig() {
  stopThingSpeakScheduler();
  thingSpeak.channelId = '';
  thingSpeak.writeApiKey = '';
  thingSpeak.readApiKey = '';
  thingSpeak.isConfigured = false;
  thingSpeak.autoSync = false;

  try {
    localStorage.removeItem('ts_channelId');
    localStorage.removeItem('ts_writeApiKey');
    localStorage.removeItem('ts_readApiKey');
    localStorage.removeItem('ts_mode');
    localStorage.removeItem('ts_intervalMs');
    localStorage.removeItem('ts_autoSync');
  } catch (e) {}

  if (dom.tsInputChannelId) dom.tsInputChannelId.value = '';
  if (dom.tsInputWriteKey) dom.tsInputWriteKey.value = '';
  if (dom.tsInputReadKey) dom.tsInputReadKey.value = '';

  updateThingSpeakUI();
  showTsAlert("ThingSpeak API configuration cleared.", "success");
  logSerial("[ThingSpeak] Disconnected and credentials cleared.", "warn");
}

function startThingSpeakScheduler() {
  stopThingSpeakScheduler();
  thingSpeak.countdownSec = Math.floor(thingSpeak.intervalMs / 1000);
  dom.tsTimerVal.textContent = `${thingSpeak.countdownSec}s`;

  thingSpeak.countdownInterval = setInterval(() => {
    thingSpeak.countdownSec--;
    if (thingSpeak.countdownSec <= 0) {
      thingSpeak.countdownSec = Math.floor(thingSpeak.intervalMs / 1000);
      performThingSpeakSync();
    }
    dom.tsTimerVal.textContent = `${thingSpeak.countdownSec}s`;
  }, 1000);
}

function stopThingSpeakScheduler() {
  if (thingSpeak.countdownInterval) {
    clearInterval(thingSpeak.countdownInterval);
    thingSpeak.countdownInterval = null;
  }
  dom.tsTimerVal.textContent = 'Idle';
}

async function performThingSpeakSync() {
  if (!thingSpeak.isConfigured || thingSpeak.isSyncing) return;
  thingSpeak.isSyncing = true;
  dom.tsStatusDot.className = 'thingspeak-status-dot syncing';
  dom.tsSyncStatusBadge.className = 'ts-status-badge syncing';

  if (thingSpeak.mode === 'push') {
    await pushToThingSpeak();
  } else {
    await pullFromThingSpeak();
  }

  thingSpeak.isSyncing = false;
  dom.tsStatusDot.className = 'thingspeak-status-dot active';
  dom.tsSyncStatusBadge.className = 'ts-status-badge connected';
}

async function pushToThingSpeak() {
  if (!thingSpeak.writeApiKey) return;

  const tierCode = state.crowdCount < 5 ? 1 : (state.crowdCount < 10 ? 2 : 3);
  const buzzerCode = state.buzzerActive ? 1 : 0;
  const url = `https://api.thingspeak.com/update?api_key=${encodeURIComponent(thingSpeak.writeApiKey)}&field1=${encodeURIComponent(state.crowdCount)}&field2=${encodeURIComponent(state.distance)}&field3=${encodeURIComponent(state.motionDetected)}&field4=${encodeURIComponent(tierCode)}&field5=${encodeURIComponent(buzzerCode)}`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    const entryId = parseInt(text.trim(), 10);

    if (isNaN(entryId) || entryId <= 0) {
      logSerial(`[ThingSpeak Push Warning] Response '${text}'. Rate limit requires 15s between updates.`, "warn");
    } else {
      thingSpeak.lastSyncTime = Date.now();
      logSerial(`[ThingSpeak Push] Channel #${thingSpeak.channelId} updated! Entry ID: ${entryId} [F1:${state.crowdCount}, F2:${state.distance}cm, F3:${state.motionDetected}, F4:${tierCode}, F5:${buzzerCode}]`, "header");
    }
  } catch (err) {
    logSerial(`[ThingSpeak Push Error] ${err.message}`, "danger");
  }
}

async function pullFromThingSpeak() {
  if (!thingSpeak.channelId) return;

  let url = `https://api.thingspeak.com/channels/${encodeURIComponent(thingSpeak.channelId)}/feeds.json?results=1`;
  if (thingSpeak.readApiKey) {
    url += `&api_key=${encodeURIComponent(thingSpeak.readApiKey)}`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data && data.feeds && data.feeds.length > 0) {
      const feed = data.feeds[0];
      if (feed.field1 !== null && feed.field1 !== undefined) {
        state.crowdCount = parseInt(feed.field1, 10) || 0;
      }
      if (feed.field2 !== null && feed.field2 !== undefined) {
        state.distance = parseInt(feed.field2, 10) || 120;
      }
      if (feed.field3 !== null && feed.field3 !== undefined) {
        state.motionDetected = parseInt(feed.field3, 10) || 0;
      }

      updateDashboardUI();
      recordTelemetryPoint(state.distance, state.crowdCount);
      logSerial(`[ThingSpeak Pull] Received Feed #${feed.entry_id}: Count=${state.crowdCount}, Dist=${state.distance}cm, Motion=${state.motionDetected}`, "normal");
    }
  } catch (err) {
    logSerial(`[ThingSpeak Pull Error] ${err.message}`, "danger");
  }
}

async function testThingSpeakConnection() {
  const channelId = dom.tsInputChannelId.value.trim();
  const writeKey = dom.tsInputWriteKey.value.trim();
  const readKey = dom.tsInputReadKey.value.trim();
  const mode = dom.tsSelectMode.value;

  dom.tsDiagContent.className = 'ts-diag-content';
  dom.tsDiagContent.textContent = "Connecting to ThingSpeak servers at api.thingspeak.com...\n";

  if (!channelId) {
    dom.tsDiagContent.className = 'ts-diag-content error';
    dom.tsDiagContent.textContent += "Error: Please specify a Channel ID first.";
    return;
  }

  try {
    let url = `https://api.thingspeak.com/channels/${encodeURIComponent(channelId)}/feeds.json?results=1`;
    if (readKey) url += `&api_key=${encodeURIComponent(readKey)}`;

    const startTime = performance.now();
    const res = await fetch(url);
    const latency = Math.round(performance.now() - startTime);

    if (res.ok) {
      const data = await res.json();
      const channelName = data.channel ? data.channel.name : "Unnamed Channel";
      const totalEntries = data.channel ? data.channel.last_entry_id : "0";
      
      let msg = `SUCCESS: Connected to Channel #${channelId} in ${latency}ms!\n`;
      msg += `Channel Name: "${channelName}"\n`;
      msg += `Total Recorded Entries: ${totalEntries}\n`;
      msg += `Configured Fields: ${Object.keys(data.channel || {}).filter(k => k.startsWith('field')).join(', ') || 'field1-field5'}\n`;

      if (mode === 'push') {
        if (!writeKey) {
          msg += `\nWarning: Write API Key is missing. You need a Write Key to push telemetry!`;
        } else {
          msg += `\nWrite API Key provided: ${writeKey.slice(0, 4)}•••••••••••• (Ready to push).`;
        }
      }

      dom.tsDiagContent.className = 'ts-diag-content success';
      dom.tsDiagContent.textContent = msg;
      showTsAlert(`Test Connection Succeeded (${latency}ms latency)!`, "success");
    } else {
      dom.tsDiagContent.className = 'ts-diag-content error';
      dom.tsDiagContent.textContent = `FAILED: HTTP ${res.status} ${res.statusText}\nCheck if the Channel ID is correct or if Read API Key is required for private channels.`;
      showTsAlert(`Connection Failed: HTTP ${res.status}`, "error");
    }
  } catch (err) {
    dom.tsDiagContent.className = 'ts-diag-content error';
    dom.tsDiagContent.textContent = `Network / CORS Error: ${err.message}\nMake sure you have an active internet connection.`;
    showTsAlert(`Connection Error: ${err.message}`, "error");
  }
}

function showTsAlert(msg, type = 'success') {
  dom.tsAlertBox.className = `ts-alert-box ${type}`;
  dom.tsAlertBox.textContent = msg;
  dom.tsAlertBox.style.display = 'block';
  setTimeout(() => {
    dom.tsAlertBox.style.display = 'none';
  }, 4000);
}

function openTsModal() {
  dom.thingspeakModal.classList.add('open');
  dom.thingspeakModal.setAttribute('aria-hidden', 'false');
}

function closeTsModal() {
  dom.thingspeakModal.classList.remove('open');
  dom.thingspeakModal.setAttribute('aria-hidden', 'true');
}

// ==========================================
// INITIALIZATION
// ==========================================
function init() {
  setupCanvasResolution();
  bindEvents();
  loadThingSpeakConfig();
  printBootSequence();
  updateDashboardUI();

  // Pre-seed chart with initial steady points
  for (let i = 0; i < 20; i++) {
    recordTelemetryPoint(120, 0);
  }

  // Start 300ms Arduino loop cycle timer
  setInterval(executeArduinoLoopCycle, 300);
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', init);
