# Montagem e pinagem — Sumô Lab

Projeto didático de robô diferencial com dois motores, uma ponte H L298N, dois sensores digitais de borda e um HC-SR04. Escolha **Arduino Uno R3 ou ESP32 clássico**; não são necessários os dois. A pinagem ESP32 não se aplica automaticamente às versões C3, S2 ou S3.

## Ligações de sinal

| Componente / terminal | Arduino Uno R3 | ESP32 clássico |
|---|---|---|
| L298N ENA — velocidade esquerda | D5, via divisor 1 kΩ / 1,5 kΩ | GPIO25 |
| L298N IN1 — direção esquerda | D10, via divisor 1 kΩ / 1,5 kΩ | GPIO18 |
| L298N IN2 — direção esquerda | D11, via divisor 1 kΩ / 1,5 kΩ | GPIO19 |
| L298N IN3 — direção direita | D9, via divisor 1 kΩ / 1,5 kΩ | GPIO21 |
| L298N IN4 — direção direita | D8, via divisor 1 kΩ / 1,5 kΩ | GPIO22 |
| L298N ENB — velocidade direita | D6, via divisor 1 kΩ / 1,5 kΩ | GPIO26 |
| HC-SR04 TRIG | D2 | GPIO23 |
| HC-SR04 ECHO | D3 | GPIO34 **via divisor** |
| Sensor de borda esquerdo DO | D12 | GPIO32, máximo 3,3 V |
| Sensor de borda direito DO | D13 | GPIO33, máximo 3,3 V |
| Todos os GND | GND comum | GND comum |
| Motor esquerdo | L298N OUT1 / OUT2 | L298N OUT1 / OUT2 |
| Motor direito | L298N OUT3 / OUT4 | L298N OUT3 / OUT4 |

Remova os jumpers **ENA e ENB** antes de conectar o PWM. Eles são diferentes do jumper **5V-EN**, ligado ao regulador de alguns módulos. Não presuma que o terminal 5V é sempre uma saída: consulte o esquema do seu módulo.

## Seis divisores no Uno: controle da L298N com VS de 6 V

A arquitetura deste guia usa **VS de 6 V para a potência** e **VSS de 5 V para a lógica** da L298N. A tabela 4 do [datasheet da ST](https://www.st.com/resource/en/datasheet/l298.pdf) especifica **VS ≥ VIH + 2,5 V**. Por isso, neste circuito de 6 V, os sinais HIGH de aproximadamente 5 V do Uno são reduzidos para aproximadamente 3 V. O HIGH da L298N deve permanecer acima de 2,3 V.

Monte **um divisor separado para cada sinal ENA, ENB, IN1, IN2, IN3 e IN4**: pino do Uno → resistor de **1 kΩ** → entrada da L298N; dessa mesma entrada → resistor de **1,5 kΩ** → GND comum. São seis resistores de cada valor. Não compartilhe o ponto central entre sinais. Os divisores são de sinal, não alimentam motores nem a lógica VSS.

No ESP32, os seis sinais de controle são de 3,3 V e podem ser conectados às respectivas entradas da L298N com VS de 6 V. Essa instrução vale para esta combinação de tensões; o divisor de ECHO do HC-SR04 continua necessário no ESP32. Meça VS e os níveis de sinal antes do primeiro teste. Não reduza VS abaixo do requisito do datasheet para o HIGH aplicado.

## Alimentação

- Use um conjunto 2S protegido, montado pelo fornecedor, e carregador CC/CV próprio para a química e para duas células (8,4 V de fim de carga para Li-ion convencional). Um BMS não substitui o carregador. Não recarregue pela placa do robô.
- Use chave geral e fusível dimensionado à fiação, bateria e corrente prevista. Não faça os caminhos de corrente dos motores em protoboard.
- A bateria 2S chega a 8,4 V. Para esta montagem com motores de 6 V, ajuste a alimentação VS da ponte em **6 V**, com conversor dimensionado para a corrente de partida dos dois motores e sem ultrapassar a tensão do motor. O L298N ainda perde parte dessa tensão: o motor terá menos força; não compense aumentando a tensão acima do limite do motor sem projeto elétrico.
- Alimente a placa de controle e a lógica da ponte por um ramo separado. Use USB de 5 V regulados para a placa (por cabo/adaptador apropriado) ou entrada autorizada pelo fabricante. Nunca aplique bateria 2S diretamente ao pino 5V ou 3V3. Evite duas fontes simultâneas no mesmo barramento.
- No módulo L298N típico, usar lógica externa de 5 V exige retirar 5V-EN. Confirme no esquema do módulo antes de ligar. Motores, ponte, sensores e controle precisam compartilhar GND.
- Confira a corrente de bloqueio dos motores. A inscrição “2 A” do módulo não garante operação contínua: o L298N dissipa calor, sua capacidade depende do módulo e do dissipador. Pare o teste se houver aquecimento excessivo, odor, reinícios ou queda acentuada da alimentação.

## HC-SR04 no ESP32

Alimente o HC-SR04 em 5 V. O ECHO típico chega a 5 V, acima do permitido no ESP32. Conecte ECHO a um resistor de **1 kΩ**; a outra ponta é o nó do **GPIO34**. Do mesmo nó, conecte **2 kΩ ao GND**. Isso reduz 5 V a aproximadamente 3,33 V. Meça antes de ligar; para margem adicional, use 1,2 kΩ em cima e 2 kΩ embaixo (aproximadamente 3,13 V). O GPIO34 é somente entrada e serve para ECHO. O TRIG de 3,3 V costuma funcionar com HC-SR04, mas confirme a especificação do módulo; use conversão de nível se exigida.

Nos sensores de linha, 5 V de alimentação podem produzir 5 V no DO. Use módulos com saída compatível com 3,3 V ou conversão de nível. Não conecte DO de 5 V diretamente ao ESP32.

## Primeiro teste

1. Desconecte a bateria. Fixe os motores, as rodas e o chassi; mantenha a bateria presa e os fios afastados das rodas.
2. Confira polaridade, GND comum e tensão dos conversores com multímetro. Confira 5V-EN, ENA e ENB. No Uno, confira os seis divisores de controle; no ESP32, confira o divisor de ECHO e a tensão das saídas dos sensores.
3. Suspenda as rodas. Gere o código em **modo bancada**, escolha a placa na Arduino IDE e envie por USB.
4. Abra o Monitor Serial em **115200 baud**. Use L e R para pulsos à frente; J e K para trás. Cada comando move apenas um motor durante 350 ms, com PWM 80. X interrompe.
5. Se um motor rodar no sentido contrário, desligue e troque seus dois fios de saída **ou** marque a inversão no configurador. Não inverta a alimentação da ponte.
6. Passe os sensores sobre o piso preto e sobre a faixa branca. Leia L e R no monitor. Configure **nível de borda** com o nível realmente observado na faixa; não suponha LOW para todos os sensores.
7. Aproxime um alvo do HC-SR04 e confira `cm`. Zero significa leitura sem eco válido. Ajuste a posição e a fiação antes de continuar.
8. Gere e grave o modo autônomo. Ao ligar/resetar, haverá a espera configurada, padrão de 5 segundos. Mantenha acesso à chave geral e teste primeiro com velocidades reduzidas.
9. Teste a borda antes de testar o ataque. O robô recua, gira e procura. Se a borda persistir depois do recuo, ele para e exige A no monitor ou reinício.

## O que o programa faz

O programa lê a borda antes de qualquer ataque. Recuo, giro, espera de partida e pulsos de bancada usam `millis()`; não há `delay()` de movimento. O HC-SR04 usa `pulseIn()` com limite de 12 ms, portanto não é uma leitura totalmente assíncrona. A borda é conferida novamente após essa leitura. A reação física depende ainda de velocidade, inércia, aderência e posicionamento dos sensores.

`analogWrite()` usa valores de 0 a 255, inclusive no ESP32. Isso evita diferenças de escala da API LEDC entre versões recentes. Instale o pacote oficial “esp32 by Espressif Systems” e selecione ESP32 Dev Module para o ESP32 clássico. Uno usa o pacote Arduino AVR Boards. Os exemplos não precisam de bibliotecas adicionais.

Os ajustes do site viram constantes no arquivo `.ino`. Eles não atualizam o robô por Wi-Fi/Bluetooth. Grave novamente quando mudar os valores. O teste de bancada e o monitor serial são locais por USB.

## Fontes dos fabricantes

- Arduino: PWM e pinos suportados — https://support.arduino.cc/hc/en-us/articles/9350537961500-Use-PWM-output-with-Arduino
- Arduino Uno R3 — https://docs.arduino.cc/hardware/uno-rev3/
- Espressif: API LEDC / analogWrite — https://docs.espressif.com/projects/arduino-esp32/en/latest/api/ledc.html
- STMicroelectronics: datasheet L298 — https://www.st.com/resource/en/datasheet/l298.pdf
