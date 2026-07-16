/*
  ESP32 LoRaWAN v3 - Contenedor 12
  Envía lecturas de tres sensores de nivel (sec1/sec2/sec3) al backend de Soterrados
  Usando POST JSON a /api/readings y la cabecera X-IoT-Secret.

  Requisitos:
  - Placa: ESP32
  - Librerías: WiFi.h, HTTPClient.h, ArduinoJson.h
  - Ajusta SSID, PASSWORD y BASE_URL a tu red/local
  - Si usas TTN/ChirpStack o LoRaWAN real, aplica el uplink desde el gateway
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "TU_SSID";
const char* password = "TU_PASSWORD";
const char* baseUrl = "https://soterradosundac.com/"; // Cambia a la IP/host donde corre tu backend
const char* apiEndpoint = "/api/readings";
const char* iotSecret = "Soterrados_IoT_Secret_Key_2026";

// Identificador del dispositivo físico. El backend mapea deviceId=12 a Contenedor 12.
const int deviceId = 12;

// Simulación de tres sensores de nivel de basura (0-100%)
float sec1 = 20.0;
float sec2 = 25.0;
float sec3 = 15.0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado");
  Serial.print("Dirección IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    // Simula un aumento de basura en cada sección.
    sec1 += random(0, 6);
    sec2 += random(0, 6);
    sec3 += random(0, 6);
    if (sec1 > 100) sec1 = 100;
    if (sec2 > 100) sec2 = 100;
    if (sec3 > 100) sec3 = 100;

    // Construye el JSON de telemetría. El backend permitirá containerId o deviceId.
    StaticJsonDocument<256> doc;
    doc["deviceId"] = deviceId;
    doc["sec1"] = sec1;
    doc["sec2"] = sec2;
    doc["sec3"] = sec3;

    String payload;
    serializeJson(doc, payload);

    if (sendTelemetry(payload)) {
      Serial.print("Enviado: ");
      Serial.println(payload);
    }
  } else {
    Serial.println("WiFi desconectado, reintentando...");
  }

  delay(30000); // Envía cada 30 segundos
}

bool sendTelemetry(const String& payload) {
  HTTPClient http;
  String url = String(baseUrl) + String(apiEndpoint);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-IoT-Secret", iotSecret);

  int httpResponseCode = http.POST(payload);
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("HTTP ");
    Serial.print(httpResponseCode);
    Serial.print(" - ");
    Serial.println(response);
  } else {
    Serial.print("Error en POST: ");
    Serial.println(httpResponseCode);
  }

  http.end();
  return httpResponseCode == 200;
}
