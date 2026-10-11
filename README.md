# Smart Crowd Density Alert System — Frontend Dashboard
**Subject:** 25EE256 - Sensor and Instrumentation | **Case Study #2**  
**Original Wokwi Project:** [Wokwi Simulation](https://wokwi.com/projects/476163947415643137)

---

## 🌟 Overview

This web frontend acts as a **Digital Twin & Live IoT Telemetry Dashboard** for the **Smart Crowd Density Alert System** designed on Arduino Uno.

It operates in **two synchronized modes**:
1. **Virtual Simulation Mode**: Runs an exact, cycle-accurate replica of the Arduino Uno firmware logic (every 300ms) with interactive controls for the HC-SR04 ultrasonic distance sensor, PIR motion sensor, LED indicators, piezo buzzer sound, and an animated checkpoint corridor.
2. **Physical Hardware Bridge (Web Serial API)**: Plug an actual Arduino Uno running `sketch.ino` into your computer's USB port, click **"Connect USB Serial"**, and watch real-time physical sensor data stream directly into the dashboard at 9600 baud!

---

## 📁 Repository Structure

```text
├── README.md                      # Project documentation
└── SI Sashmitha/
    ├── index.html                 # IoT Telemetry Dashboard & Digital Twin UI
    ├── style.css                  # Custom cyber-themed dashboard styling
    ├── app.js                     # Digital twin simulation, Web Serial & ThingSpeak IoT bridge
    ├── sketch.ino                 # Arduino Uno C++ firmware
    ├── diagram.json               # Wokwi simulation diagram wiring
    └── README.md                  # Component documentation
```

---

## 📊 State Machine & Sensing Logic

| Tier | Crowd Count Range | Green LED (Pin 8) | Yellow LED (Pin 9) | Red LED (Pin 10) | Piezo Buzzer (Pin 11) | Status & Description |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Tier 1: Normal** | `< 5` | **HIGH (ON)** | LOW (OFF) | LOW (OFF) | Silent (`noTone`) | Safe occupancy; normal flow. |
| **Tier 2: Warning** | `5` to `9` | LOW (OFF) | **HIGH (ON)** | LOW (OFF) | Silent (`noTone`) | Approaching capacity; warning indicator. |
| **Tier 3: Critical** | `≥ 10` | LOW (OFF) | LOW (OFF) | **HIGH (ON)** | **1000 Hz Tone** | Overcrowded! Evacuate or divert foot traffic. |

### Sensing Mechanics
- **HC-SR04 Ultrasonic Distance Sensor**:
  $$\text{distance (cm)} = \frac{\text{duration} \times 0.0343}{2}$$
  - Trigger distance threshold: `< 50 cm`.
  - Debounce reset threshold: `≥ 50 cm`.
- **PIR Motion Sensor**:
  - Digital pin 2 (`HIGH` when human movement detected, `LOW` on standby).
- **Loop Cadence**:
  - Sample cycle delay of `300 ms`.

---

## 🚀 Key Features

- **Master Dynamic Alert Banner**: Updates with rich visual styling, icons, and status badges depending on the active tier.
- **Hardware Digital Twin (Wokwi Twin)**:
  - Realistic glowing 3D LED bulbs with halo dispersion and state annotations.
  - Interactive Piezo Buzzer with soundwaves and Web Audio API 1000 Hz square wave tone synthesizer.
- **2D Checkpoint Corridor Simulation**:
  - Top-down visual entrance gateway with sonar wave cone and PIR overhead detection field.
  - Click **"Walk Person Through Gate"** or toggle **"Auto Crowd Sim"** to animate an attendee passing the sensor boundary.
- **Real-Time Telemetry Trend Chart**:
  - High-performance HTML5 Canvas chart tracking distance and crowd density counts over time with a critical threshold line.
- **Arduino Serial Monitor (9600 Baud)**:
  - Exact recreation of the Arduino IDE / Wokwi Serial Monitor output with color-coded alerts and auto-scroll.
- **Web Serial API Connection**:
  - Native browser-to-microcontroller communication over USB.

---

## 🔌 Hardware Pinout Configuration

| Arduino Uno Pin | Component | Description / Function |
| :--- | :--- | :--- |
| `D2` | PIR Motion Sensor (OUT) | Passive Infrared motion detection |
| `D3` | HC-SR04 (TRIG) | Ultrasonic pulse trigger output |
| `D4` | HC-SR04 (ECHO) | Ultrasonic pulse echo input |
| `D8` | Green LED (+ 220Ω) | Normal Safe Indicator |
| `D9` | Yellow LED (+ 220Ω) | Capacity Warning Indicator |
| `D10` | Red LED (+ 220Ω) | Critical Overcrowding Indicator |
| `D11` | Piezo Buzzer (+) | 1000 Hz Alarm tone output |
| `5V` | VCC Rail | Powers HC-SR04 and PIR sensor |
| `GND` | Ground Rail | Common circuit ground |

---

## ☁️ ThingSpeak IoT Cloud Integration

The dashboard includes full **MathWorks ThingSpeak IoT Cloud** connectivity. You can configure your Channel ID and API keys directly via the **"ThingSpeak IoT"** or **"Configure API"** button.

### Field Assignment Mapping
* **Field 1 (`field1`)**: Current Crowd Density Count
* **Field 2 (`field2`)**: Ultrasonic Distance (`cm` from HC-SR04)
* **Field 3 (`field3`)**: PIR Motion Detected (`0` = Standby, `1` = Active Movement)
* **Field 4 (`field4`)**: Alert Tier Code (`1` = Normal, `2` = Warning, `3` = Danger)
* **Field 5 (`field5`)**: Piezo Buzzer State (`0` = Silent, `1` = 1000 Hz Tone Sounding)

### Sync Modes
1. **Cloud Push (Publish)**: Automatically uploads telemetry from the simulation or physical Arduino Uno to ThingSpeak every 15 seconds (respecting ThingSpeak free tier rate limits).
2. **Cloud Pull (Subscribe / Remote Monitor)**: Polls your ThingSpeak channel to display remote field feeds on the dashboard gauges in real time.

---

## 💻 How to Run Locally

1. You can simply double click `SI Sashmitha/index.html` to open it in Google Chrome, Microsoft Edge, or any modern web browser.
2. Alternatively, start a lightweight local web server:
   ```bash
   npx serve .
   ```
   or with Python:
   ```bash
   python -m http.server 3000
   ```
   Then navigate to `http://localhost:3000/SI%20Sashmitha/index.html`.
