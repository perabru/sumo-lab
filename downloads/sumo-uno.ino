/*
 * SUMÔ LAB | Arduino UNO R3 + L298N
 * Modo: SUMÔ AUTÔNOMO
 * Serial: 115200 baud. X = parar; A = armar com contagem de partida.
 * Bancada: L/R = motor esquerdo/direito à frente; J/K = atrás.
 * Cada comando de bancada dura no máximo 350 ms e usa PWM 80.
 *
 * Remova jumpers ENA/ENB. Use GND comum e alimentação própria dos motores.
 * Nunca ligue motores no 5V/3V3 da placa. Ajuste a fonte à tensão do motor.
 * Arquitetura deste guia: VS da L298N regulado em 6V e lógica VSS em 5V.
 * UNO: cada um dos 6 sinais ENA/ENB/IN1..IN4 usa divisor: GPIO→1k→entrada; entrada→1,5k→GND.
 * Os divisores reduzem HIGH de 5V para cerca de 3V; não ligue esses sinais diretamente neste circuito de VS=6V.
 * L298: VS >= VIH + 2,5V. Fonte: st.com/resource/en/datasheet/l298.pdf, tabela 4.
 * ECHO do HC-SR04 pode ir ao D3 do UNO R3 (lógica 5V).
 * Sensores de borda: saídas digitais compatíveis com a tensão da placa.
 * Calibre o nível de borda antes de apoiar o robô no chão.
 * A partida padrão é 5 s; confirme o regulamento da competição.
 * Em autônomo, o robô parte após a contagem ao ligar/resetar.
 * O site gera este arquivo; grave pela Arduino IDE via USB.
 */

#include <Arduino.h>

const uint8_t ENA = 5, ENB = 6;
const uint8_t IN1 = 10, IN2 = 11, IN3 = 9, IN4 = 8;
const uint8_t TRIG = 2, ECHO = 3;
const uint8_t LINE_LEFT = 12, LINE_RIGHT = 13;
const uint8_t EDGE_LEVEL = LOW;
const bool INVERT_LEFT = false, INVERT_RIGHT = false;
const bool BENCH_MODE = false;
const int ATTACK_PWM = 255, SEARCH_PWM = 85, ESCAPE_PWM = 180;
const unsigned int DETECT_CM = 40;
const unsigned long START_MS = 5000UL;
const unsigned long REVERSE_MS = 300UL, TURN_MS = 250UL;
const unsigned long SONAR_TIMEOUT_US = 12000UL; // bloqueio máximo por leitura
const unsigned long SONAR_PERIOD_MS = 60UL;
const unsigned long BENCH_PULSE_MS = 350UL;
const int BENCH_PWM = 80;

enum RobotState { WAIT_START, SEARCHING, ATTACKING, REVERSING, TURNING, STOPPED };
RobotState state = STOPPED;
bool armed = false, benchActive = false, turnRight = true;
unsigned long armedAt = 0, stateAt = 0, lastSonar = 0, lastLog = 0, benchAt = 0;
unsigned int distanceCm = 0;

// EN=0 desativa o canal. O comando 0 deixa o motor em roda livre.
void motor(uint8_t enablePin, uint8_t a, uint8_t b, int power, bool invert) {
  power = constrain(power, -255, 255);
  if (invert) power = -power;
  analogWrite(enablePin, 0); // corta PWM antes de trocar a direção
  digitalWrite(a, power > 0 ? HIGH : LOW);
  digitalWrite(b, power < 0 ? HIGH : LOW);
  analogWrite(enablePin, abs(power));
}

void drive(int left, int right) {
  motor(ENA, IN1, IN2, left, INVERT_LEFT);
  motor(ENB, IN3, IN4, right, INVERT_RIGHT);
}

void stopRobot() {
  armed = false;
  benchActive = false;
  state = STOPPED;
  drive(0, 0);
}

void armRobot() {
  drive(0, 0);
  armedAt = millis();
  stateAt = armedAt;
  lastSonar = armedAt;
  distanceCm = 0;
  state = WAIT_START;
  armed = true;
  Serial.println(F("PARTIDA: mantenha distancia e aguarde a contagem."));
}

unsigned int readDistanceCm() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  const unsigned long pulse = pulseIn(ECHO, HIGH, SONAR_TIMEOUT_US);
  // Sem eco ou eco muito curto não é adversário detectado.
  if (pulse < 116UL) return 0;
  return (unsigned int)(pulse / 58UL);
}

void startEscape(bool leftEdge, bool rightEdge, unsigned long now) {
  // Borda esquerda: afastar-se girando à direita; duas bordas: alternar giro.
  if (leftEdge && rightEdge) turnRight = !turnRight;
  else turnRight = leftEdge;
  state = REVERSING;
  stateAt = now;
  distanceCm = 0;
  drive(-ESCAPE_PWM, -ESCAPE_PWM);
}

void handleSerial() {
  while (Serial.available()) {
    const char command = (char)Serial.read();
    if (command == 'X' || command == 'x') {
      stopRobot();
      Serial.println(F("PARADO. Autonomo: A reinicia a contagem."));
    } else if (!BENCH_MODE && (command == 'A' || command == 'a')) {
      armRobot();
    } else if (BENCH_MODE && !benchActive) {
      int left = 0, right = 0;
      if (command == 'L' || command == 'l') left = BENCH_PWM;
      else if (command == 'R' || command == 'r') right = BENCH_PWM;
      else if (command == 'J' || command == 'j') left = -BENCH_PWM;
      else if (command == 'K' || command == 'k') right = -BENCH_PWM;
      else continue;
      drive(left, right);
      benchActive = true;
      benchAt = millis();
    }
  }
}

void logSensors(unsigned long now) {
  if (now - lastLog < 500UL) return;
  lastLog = now;
  Serial.print(F("L=")); Serial.print(digitalRead(LINE_LEFT));
  Serial.print(F(" R=")); Serial.print(digitalRead(LINE_RIGHT));
  Serial.print(F(" cm=")); Serial.print(distanceCm);
  Serial.print(F(" estado=")); Serial.println((int)state);
  // estados: 0 espera; 1 busca; 2 ataque; 3 recuo; 4 giro; 5 parado.
}

void setup() {
  Serial.begin(115200);
  pinMode(ENA, OUTPUT); pinMode(ENB, OUTPUT);
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  pinMode(TRIG, OUTPUT); digitalWrite(TRIG, LOW);
  pinMode(ECHO, INPUT);
  // Saídas digitais dos módulos devem ter nível definido; não deixe entradas soltas.
  pinMode(LINE_LEFT, INPUT); pinMode(LINE_RIGHT, INPUT);
  // analogWrite usa resolução padrão de 8 bits (0 a 255) nas duas plataformas.
  stopRobot();
  if (BENCH_MODE) Serial.println(F("BANCADA: rodas suspensas. L/R frente, J/K tras; X para."));
  else armRobot();
}

void loop() {
  handleSerial();
  unsigned long now = millis();
  logSensors(now);

  if (BENCH_MODE) {
    if (benchActive && now - benchAt >= BENCH_PULSE_MS) stopRobot();
    // Leitura dos sensores sem movimento automático.
    if (!benchActive && now - lastSonar >= SONAR_PERIOD_MS) {
      lastSonar = now;
      distanceCm = readDistanceCm();
    }
    return;
  }
  if (!armed) { drive(0, 0); return; }
  if (state == WAIT_START) {
    drive(0, 0);
    if (now - armedAt < START_MS) return;
    state = SEARCHING;
  }

  bool leftEdge = digitalRead(LINE_LEFT) == EDGE_LEVEL;
  bool rightEdge = digitalRead(LINE_RIGHT) == EDGE_LEVEL;

  // Recuo com tempo delimitado: a leitura contínua da mesma borda não zera o timer.
  if (state == REVERSING) {
    if (now - stateAt < REVERSE_MS) { drive(-ESCAPE_PWM, -ESCAPE_PWM); return; }
    if (leftEdge || rightEdge) {
      // Se o recuo não limpou a borda, interrompe para evitar fugir sem limite.
      stopRobot();
      Serial.println(F("BORDA PERSISTENTE: confira sensor/sentido. A para rearmar."));
      return;
    }
    state = TURNING;
    stateAt = now;
  }
  // Borda tem prioridade também durante o giro e antes da leitura do ultrassom.
  if (leftEdge || rightEdge) { startEscape(leftEdge, rightEdge, now); return; }
  if (state == TURNING) {
    if (now - stateAt < TURN_MS) {
      drive(turnRight ? ESCAPE_PWM : -ESCAPE_PWM, turnRight ? -ESCAPE_PWM : ESCAPE_PWM);
      return;
    }
    state = SEARCHING;
    distanceCm = 0;
  }

  if (now - lastSonar >= SONAR_PERIOD_MS) {
    lastSonar = now;
    distanceCm = readDistanceCm();
    // pulseIn bloqueia até 12 ms; confira a borda novamente antes de atacar.
    now = millis();
    leftEdge = digitalRead(LINE_LEFT) == EDGE_LEVEL;
    rightEdge = digitalRead(LINE_RIGHT) == EDGE_LEVEL;
    if (leftEdge || rightEdge) { startEscape(leftEdge, rightEdge, now); return; }
  }
  if (distanceCm > 0 && distanceCm <= DETECT_CM) {
    state = ATTACKING;
    drive(ATTACK_PWM, ATTACK_PWM);
  } else {
    state = SEARCHING;
    drive(SEARCH_PWM, -SEARCH_PWM);
  }
}
