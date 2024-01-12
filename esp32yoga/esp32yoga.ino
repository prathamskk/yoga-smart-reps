#include <Arduino.h>
#include <WiFi.h>
#include <FirebaseESP32.h>
#include <OneWire.h>
#include <DallasTemperature.h>
// Provide the RTDB payload printing info and other helper functions.
#include <addons/RTDBHelper.h>
#include "I2Cdev.h"
#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
/* 1. Define the WiFi credentials */
#define WIFI_SSID "realme"
#define WIFI_PASSWORD "prathamskk"

/* 2. If work with RTDB, define the RTDB URL and database secret */
#define DATABASE_URL "https://smart-reps-default-rtdb.firebaseio.com/"  //<databaseName>.firebaseio.com or <databaseName>.<region>.firebasedatabase.app
#define DATABASE_SECRET "3PVBGhnmYocT1tThMKwU9Q7BuMoCMEKGT0jcEqdQ"

#define BUZZER_PIN 23 // ESP32 GPIO21 pin connected to Buzzer's pin
/* 3. Define the Firebase Data object */
FirebaseData fbdo;

/* 4, Define the FirebaseAuth data for authentication data */
FirebaseAuth auth;

/* Define the FirebaseConfig data for config data */
FirebaseConfig config;

unsigned long dataMillis = 0;
int count = 0;



const int motorPin = 12;  // Pin for the vibration motor


void setup()
{
  Serial.begin(9600);
      // set ESP32 pin to input pull-up mode
  pinMode(BUZZER_PIN, OUTPUT); 
  pinMode(motorPin, OUTPUT);
  sensors.begin();
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED)
  {
    Serial.print(".");
    delay(300);
  }
  Serial.println();
  Serial.print("Connected with IP: ");
  Serial.println(WiFi.localIP());
  Serial.println();

  Serial.printf("Firebase Client v%s\n\n", FIREBASE_CLIENT_VERSION);
  /* Assign the database URL and database secret(required) */
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = DATABASE_SECRET;
  Firebase.reconnectWiFi(true);
  /* Initialize the library with the Firebase authen and config */
  Firebase.begin(&config, &auth);
}

void loop()
{
  if (millis() - dataMillis > 500)
  {
    sensors.requestTemperatures();
    float temperature = sensors.getTempCByIndex(0);

   if (Firebase.getInt(fbdo, "/test/int")) {
      Serial.println(fbdo.to<int>());
       if (fbdo.to<int>() == 1) {
      digitalWrite(motorPin, HIGH);
      digitalWrite(BUZZER_PIN, HIGH); // turn on
      delay(1000);
      digitalWrite(BUZZER_PIN, LOW);  // turn off
      Serial.println("Motor Turned On");
    } else if (fbdo.to<int>() == 0) {
      
      digitalWrite(BUZZER_PIN, LOW);
       // turn off
      Serial.println("Motor Turned Off");
    }
    

  } else {
    Serial.println(fbdo.errorReason());
  }
  

// To set and push data with timestamp, requires the JSON data with .sv placeholder
    FirebaseJson json;

    json.set("value",temperature);
    // now we will set the timestamp value at Ts
    json.set("Ts/.sv", "timestamp"); // .sv is the required place holder for sever value which currently supports only string "timestamp" as a value



    
    // Send temperature data over Bluetooth
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" °C");
  
    dataMillis = millis();
    
    Serial.printf("Set ax... %s\n",  Firebase.pushFloat(fbdo, "/temp", temperature) ? "ok" : fbdo.errorReason().c_str());
    Firebase.pushJSON(fbdo, "/test/append", json);
  }
}
