/*
 * Smart Crowd Density Alert System with ThingSpeak IoT
 * Microcontroller: ESP32 DevKit V4
 * Subject: 25EE256 - Sensor and Instrumentation
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ----------------- ESP32 PIN CONFIGURATION -----------------
const int TRIG_PIN     = 5;    // HC-SR04 Trigger
const int ECHO_PIN     = 18;   // HC-SR04 Echo
const int PIR_PIN      = 19;   // PIR Motion Sensor OUT
const int LED_GREEN    = 21;   // Safe Density Indicator
const int LED_YELLOW   = 22;   // Warning Density Indicator
const int LED_RED      = 23;   // Danger / Critical Indicator
const int BUZZER_PIN   = 25;   // Piezo Buzzer Alarm

// ----------------- WI-FI CREDENTIALS ------------------------
// In Wokwi simulator, always use "Wokwi-GUEST" with empty password
const char* WIFI_SSID     = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// ----------------- THINGSPEAK CONFIGURATION -----------------
const char* WRITE_API_KEY = "LQA9MOABWSQHZDNC"; // Your ThingSpeak Write API Key
const char* SERVER_URL    = "http://api.thingspeak.com/update";

int crowdCount = 0;
bool personCrossing = false;
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 15000; // 15 seconds rate limit

long readUltrasonicDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (duration == 0) return 400; // Out of range default
  return (duration * 0.0343) / 2;
}

void sendThingSpeak(int count, long dist, int motion, int tier, int buzzer) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ThingSpeak] Wi-Fi not connected!");
    return;
  }

  HTTPClient http;
  String url = String(SERVER_URL) + "?api_key=" + WRITE_API_KEY +
               "&field1=" + String(count) +
               "&field2=" + String(dist) +
               "&field3=" + String(motion) +
               "&field4=" + String(tier) +
               "&field5=" + String(buzzer);

  Serial.println("\n[ThingSpeak] Uploading telemetry to Channel #3531339...");
  http.begin(url);
  int httpCode = http.GET();

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[ThingSpeak Success] Entry ID: %s (HTTP %d)\n\n", response.c_str(), httpCode);
  } else {
    Serial.printf("[ThingSpeak Failed] Error: %s\n\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(PIR_PIN, INPUT);

  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  Serial.println("\n================================================");
  Serial.println("  Smart Crowd Density Alert System - ESP32 Init ");
  Serial.println("================================================");

  // Connect to Wokwi virtual Wi-Fi
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 20) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi Connected!]");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[Wi-Fi Offline - Running in Local Mode]");
  }
}

void loop() {
  long distance = readUltrasonicDistance();
  int motionDetected = digitalRead(PIR_PIN);

  // Checkpoint counting logic (< 50 cm entrance detection)
  if (distance < 50 && !personCrossing) {
    personCrossing = true;
    crowdCount++;
    Serial.print(">>> Entry Detected! Current Count: ");
    Serial.println(crowdCount);
    delay(200);
  } else if (distance >= 50 && personCrossing) {
    personCrossing = false;
  }

  int tierCode = 1;
  int buzzerState = 0;

  // Tier 1: Normal Density (Count < 5)
  if (crowdCount < 5) {
    tierCode = 1;
    buzzerState = 0;
    digitalWrite(LED_GREEN, HIGH);
    digitalWrite(LED_YELLOW, LOW);
    digitalWrite(LED_RED, LOW);
    noTone(BUZZER_PIN);
    Serial.printf("Dist: %ld cm | Motion: %s | Count: %d -> NORMAL (Safe)\n",
                  distance, motionDetected ? "YES" : "NO ", crowdCount);
  }
  // Tier 2: Warning Density (Count 5 to 9)
  else if (crowdCount >= 5 && crowdCount < 10) {
    tierCode = 2;
    buzzerState = 0;
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_YELLOW, HIGH);
    digitalWrite(LED_RED, LOW);
    noTone(BUZZER_PIN);
    Serial.printf("Dist: %ld cm | Motion: %s | Count: %d -> WARNING (Approaching Limit)\n",
                  distance, motionDetected ? "YES" : "NO ", crowdCount);
  }
  // Tier 3: Critical Overcrowded (Count >= 10)
  else {
    tierCode = 3;
    buzzerState = 1;
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_YELLOW, LOW);
    digitalWrite(LED_RED, HIGH);
    tone(BUZZER_PIN, 1000); // 1 kHz Alarm Tone
    Serial.printf("Dist: %ld cm | Motion: %s | Count: %d -> DANGER (OVERCROWDED!)\n",
                  distance, motionDetected ? "YES" : "NO ", crowdCount);
  }

  // Upload to ThingSpeak every 15 seconds
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = millis();
    sendThingSpeak(crowdCount, distance, motionDetected, tierCode, buzzerState);
  }

  delay(300);
}
