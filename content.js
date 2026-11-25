// Roteiro de montagem: Uno R3 ou ESP32 clássico. Fontes técnicas ao final.
export const lessons = [
  {
    id:'projeto', title:'Conheça o seu robô', tag:'Comece aqui', duration:'15 min',
    summary:'O robô procura o adversário, empurra e evita sair da arena.',
    sections:[
      {title:'O que cada parte faz', bullets:['A placa lê os sensores e decide o movimento.','A ponte H liga os motores no sentido e na velocidade escolhidos.','O ultrassom procura o adversário. Os dois sensores de baixo detectam a faixa da arena.']},
      {title:'Escolha uma placa', bullets:['Uno R3: boa opção para começar. Seus sinais usam 5 V.','ESP32 clássico: tem mais recursos e usa sinais de 3,3 V.','Compre apenas uma das duas. Siga o código e o desenho da placa escolhida.']},
      {title:'Confira antes de comprar', bullets:['Veja as regras da competição: tamanho, peso e tempo de espera para começar.','Meça as peças. O chassi precisa acomodar placa, motores, bateria e fios.','Confirme se as rodas encaixam nos eixos dos motores.']},
      {title:'Separe as ferramentas', body:'Use multímetro, chave pequena, alicate, abraçadeiras e fita isolante. Monte com a bateria desligada. Nos primeiros testes, deixe as rodas suspensas e a chave geral ao alcance.'}
    ],
    checklist:['Escolhi Uno R3 ou ESP32 clássico.','Conferi as regras e o tamanho das peças.','Separei as ferramentas.']
  },
  {
    id:'mecanica', title:'Monte o chassi', tag:'Mecânica', duration:'35 min',
    summary:'Prenda as peças sem atrapalhar as rodas nem os sensores.',
    sections:[
      {title:'Confira o modelo 3D', bullets:['STL é o arquivo da peça 3D. Abra no fatiador, o programa que prepara a impressão.','Confira o tamanho em milímetros, os furos e o encaixe dos motores.','O Uno R3 original mede 68,6 × 53,4 mm. Reserve espaço também para cabos e conectores.','Antes de imprimir tudo, faça um teste do encaixe. Confira as instruções e a licença do autor.']},
      {title:'Prenda motores e rodas', bullets:['Fixe os dois motores em suportes que combinem com eles.','Deixe os eixos alinhados. Encaixe as rodas sem forçar.','Gire as rodas com a mão. Elas não podem raspar no chassi.']},
      {title:'Prenda placa e bateria', bullets:['Use espaçadores isolantes para afastar a placa do chassi.','Evite parafusos ou metal tocando nos contatos da placa.','Prenda a bateria com uma cinta. Ela não pode deslizar.','Deixe os fios longe das rodas e a chave geral acessível.']},
      {title:'Coloque os sensores', bullets:['Ultrassom: na frente, apontado para o adversário.','Sensores de borda: nos cantos da frente, apontados para o chão.','Ajuste a altura conforme o módulo comprado. Eles precisam ver a faixa antes de a roda chegar nela.']},
      {title:'Faça um teste sem energia', body:'Empurre o robô desligado numa mesa plana. Corrija folgas e peças raspando. Ajuste o apoio traseiro para manter boa parte do peso sobre as rodas que puxam o robô.'}
    ],
    checklist:['As rodas giram sem raspar.','Placa e bateria estão bem presas.','Os sensores ficam à frente das rodas.']
  },
  {
    id:'energia', title:'Ligue a energia', tag:'Elétrica', duration:'30 min',
    summary:'Use 6 V para a ponte dos motores e 5 V para a eletrônica.',
    sections:[
      {title:'Entenda a bateria', body:'Use uma bateria Li-ion 2S pronta, com proteção. “2S” significa duas células em série. Ela tem 7,4 V nominais e chega a 8,4 V carregada. Por isso, não deve alimentar diretamente os motores de 6 V.'},
      {title:'Separe a alimentação', bullets:['Ligue a bateria ao fusível e à chave geral. Escolha os dois para a corrente do conjunto.','Depois da chave, use dois reguladores buck. Eles reduzem a tensão da bateria.','Ajuste um para 6,0 V e ligue ao Vs do L298N. Em muitos módulos, esse borne está escrito “12V”.','Ajuste o outro para 5,0 V: ele alimenta a lógica do L298N, o ultrassom e a placa por USB adequado.','Ligue todos os GND entre si. GND é a referência de 0 V do circuito.']},
      {title:'Meça antes de conectar', bullets:['Ligue somente a bateria e os reguladores.','Meça e ajuste as saídas para 6,0 V e 5,0 V.','Desligue a bateria. Confira positivo e negativo antes de conectar as peças.','Os reguladores precisam suportar a corrente real, inclusive a partida dos motores.']},
      {title:'Prepare o L298N', bullets:['No módulo comum com regulador 78M05, retire o jumper 5V_EN para fornecer os 5 V por fora. Confira o esquema do seu módulo.','Jumper é a pequena peça que une dois pinos. Retire também ENA e ENB para controlar a velocidade pelo código.','No Uno, os seis comandos precisam dos divisores de resistores mostrados na aula de ligações. No ESP32, os comandos da ponte usam 3,3 V direto.','Não una duas saídas de 5 V. Os motores recebem energia pela ponte H, nunca pelo pino 5 V da placa.']},
      {title:'Carregue e programe', bullets:['Use carregador Li-ion 2S de 8,4 V compatível com sua bateria. Uma fonte comum não substitui o carregador.','Carregue com o robô desligado. Pare se a bateria estiver danificada, inchada ou muito quente.','Antes de conectar a placa ao computador, desligue a alimentação externa dela. Use uma fonte por vez.','O L298N perde parte da tensão em calor. Com entrada de 6 V, o motor recebe menos de 6 V e perde força.']}
    ],
    checklist:['Medi as saídas de 6,0 V e 5,0 V.','Conferi GND, positivo, negativo e jumpers.','O carregador é compatível com a bateria.']
  },
  {
    id:'ponte-h', title:'Entenda a ponte H', tag:'Controle de motores', duration:'25 min',
    summary:'IN1 e IN2 escolhem o sentido. ENA controla o motor.',
    sections:[
      {title:'Por que usar uma ponte H?', body:'O pino da placa manda um sinal, mas não fornece a corrente necessária ao motor. A ponte H recebe esse sinal e liga a energia do motor. Suas chaves eletrônicas também invertem o sentido de giro.'},
      {title:'Encontre os pinos', bullets:['OUT1 e OUT2: motor esquerdo. OUT3 e OUT4: motor direito.','IN1 e IN2: sentido do motor esquerdo. IN3 e IN4: sentido do direito.','ENA: ativa o motor esquerdo. ENB: ativa o direito.','Vs: energia dos motores. Vss: energia da lógica. GND: referência de 0 V.']},
      {title:'Como mudar o sentido', bullets:['EN em 0: desliga o acionamento. A roda para aos poucos.','EN em 1, IN1 em 1 e IN2 em 0: gira num sentido.','EN em 1, IN1 em 0 e IN2 em 1: gira no outro sentido.','EN em 1 e entradas iguais: freia o motor. A frenagem pode aumentar a corrente.','Se a roda girar ao contrário, inverta seus dois fios ou a configuração do motor.']},
      {title:'O que é PWM?', body:'PWM liga e desliga a saída muito rápido para controlar a velocidade. Nos exemplos, 0 desliga e 255 é o máximo. O valor 128 deixa ligado por cerca de metade do tempo. A velocidade real também depende do peso, do atrito e da bateria.'},
      {title:'Por que ele esquenta?', body:'Parte da energia vira calor no L298N. Use um módulo com dissipador, a peça de metal que ajuda a resfriar. Confira a corrente dos motores: o anúncio “2 A por canal” não garante esse valor continuamente em qualquer módulo.'},
      {title:'Guia Eletrogate', body:'O guia explica os bornes e jumpers. Nele, Atv_A e Atv_B correspondem a ENA e ENB. Aqui, o PWM vai nesses dois pinos. Mantenha a pinagem deste projeto ao usar nossos códigos.'},
      {title:'Outra opção de ponte', body:'O TB6612FNG desperdiça menos energia, mas tem outras ligações e um pino STBY. Para trocar o driver, confira o datasheet e adapte a montagem e o código.'}
    ],
    checklist:['Sei onde ligar os dois motores.','Entendi a diferença entre desligar e frear.','Entendi como o PWM controla a velocidade.']
  },
  {
    id:'ligacoes', title:'Ligue os fios', tag:'Pinagem', duration:'35 min',
    summary:'Siga os nomes escritos nos pinos da sua placa.',
    sections:[
      {title:'Se você usa Uno R3', bullets:['Ponte H: ENA→D5; ENB→D6; IN1→D10; IN2→D11; IN3→D9; IN4→D8. Passe cada comando pelo divisor abaixo.','Ultrassom: VCC→5 V; GND→GND; TRIG→D2; ECHO→D3.','Borda: saída do sensor esquerdo→D12; saída do direito→D13.','Alimente os sensores na tensão indicada pelo fabricante. Una os GND.']},
      {title:'Uno: monte os seis divisores', body:'Um divisor usa dois resistores para baixar o sinal. Em cada comando da ponte, ligue: pino do Uno → resistor de 1 kΩ → pino do L298N. Desse pino do L298N, ligue um resistor de 1,5 kΩ ao GND. Repita nos seis comandos. Use resistores de 1%. O sinal cai de 5 V para perto de 3 V, adequado ao L298N alimentado em 6 V neste projeto.'},
      {title:'Se você usa ESP32 clássico', bullets:['Ponte H: ENA→GPIO25; ENB→GPIO26; IN1→GPIO18; IN2→GPIO19; IN3→GPIO21; IN4→GPIO22.','Ultrassom: VCC→5 V; GND→GND; TRIG→GPIO23; ECHO→divisor→GPIO34.','Borda: saída esquerda→GPIO32; saída direita→GPIO33. Esses sinais precisam ser de até 3,3 V.','GPIO é o nome dos pinos digitais. GPIO34 só recebe sinais.','Este mapa é para ESP32 clássico. C3, S2 e S3 têm outros pinos.']},
      {title:'ESP32: proteja o Echo', body:'Ligue ECHO → resistor de 1 kΩ → GPIO34. Do GPIO34, ligue um resistor de 2 kΩ ao GND. Use resistores de 1%. Isso reduz o sinal de 5 V para cerca de 3,33 V. Não ligue o Echo de 5 V direto ao ESP32. Confira também se o TRIG do seu sensor aceita 3,3 V; alguns módulos precisam de adaptação.'},
      {title:'Confira antes de ligar os motores', bullets:['Com a bateria desligada, procure curto entre positivo e GND.','Ligue só a eletrônica e meça as tensões.','Teste um sensor por vez no monitor serial. Só depois permita movimento.']}
    ],
    checklist:['Usei o desenho da minha placa.','Montei os divisores necessários.','Testei os sensores com as rodas paradas.']
  },
  {
    id:'programacao', title:'Grave o código', tag:'Programação', duration:'35 min',
    summary:'Comece pelo teste de bancada. Depois grave o programa de sumô.',
    sections:[
      {title:'Prepare o computador', bullets:['Instale a Arduino IDE. Ela é o programa usado para gravar o código na placa.','Use um cabo USB de dados. Cabos que só carregam não servem.','Uno R3: escolha a placa Arduino Uno e a porta correta.','ESP32: instale “esp32 by Espressif Systems” no Gerenciador de Placas. Escolha seu modelo, normalmente ESP32 Dev Module.','Use a versão do pacote indicada no exemplo. As funções de PWM mudaram entre versões do ESP32.']},
      {title:'Teste os motores', bullets:['Suspenda as rodas e deixe a chave geral ao alcance.','Grave o código de bancada e comece com velocidade baixa.','Teste cada roda para a frente e para trás. Corrija o sentido se necessário.','Se não girar, confira ENA, ENB, GND, alimentação e fios dos motores.']},
      {title:'Teste os sensores', bullets:['Abra o monitor serial na velocidade indicada no código. Ele mostra as leituras da placa.','Passe os sensores de borda sobre preto e branco. Anote o resultado: HIGH significa 1; LOW significa 0.','Compare a distância do ultrassom com uma régua.','Sem eco, a distância é desconhecida. Não trate como zero.']},
      {title:'Use sua configuração', body:'Em “Meu robô”, escolha placa, velocidades, distância de ataque e leitura da faixa. Gere o código, abra na IDE e grave por USB. Salvar no site guarda os ajustes; ainda é preciso gravar o arquivo na placa.'}
    ],
    checklist:['Gravei o teste de bancada.','Conferi o sentido das rodas.','Anotei as leituras dos sensores.']
  },
  {
    id:'estrategia', title:'Ajuste os movimentos', tag:'Autonomia', duration:'25 min',
    summary:'Primeiro evite a borda. Depois ajuste a busca e o ataque.',
    sections:[
      {title:'Como o robô decide', bullets:['Ao ligar: espera parado pelo tempo definido nas regras.','Viu a faixa: recua um pouco e gira para dentro da arena.','Viu um adversário perto: avança. A distância precisa ser válida.','Não viu alvo: gira devagar para procurar.']},
      {title:'Mude um ajuste por vez', body:'Comece devagar. Acerte a fuga da borda, depois a busca e por último o ataque. Anote cada mudança. Compare os testes com a bateria em condição parecida.'},
      {title:'Evite pausas longas', body:'Durante uma pausa longa, o programa pode deixar de ler sensores. millis() ajuda a contar o tempo sem parar tudo. O timeout limita quanto tempo o programa espera pelo eco do ultrassom.'},
      {title:'Conheça os limites', bullets:['O ultrassom só procura na frente. Objetos estreitos ou inclinados podem escapar da leitura.','Os dois sensores dianteiros não veem a faixa atrás. Faça recuos curtos e teste a distância percorrida.','Se quiser recuar por mais tempo, considere sensores traseiros.']}
    ],
    checklist:['A borda interrompe o ataque.','Sem eco, o robô não avança por engano.','O recuo é curto e seguro dentro da arena.']
  },
  {
    id:'testes', title:'Teste e corrija', tag:'Bancada e arena', duration:'30 min',
    summary:'Observe o problema e confira uma parte por vez.',
    sections:[
      {title:'Faça estes testes', bullets:['Com rodas suspensas, confira a espera inicial.','Teste frente, ré, giro para cada lado e parada.','Passe um sensor de borda pela faixa, depois o outro e depois os dois.','Teste o alvo perto, longe e fora da frente do robô.','Na arena, faça rodadas curtas e confira fios, temperatura e bateria.']},
      {title:'Reinicia quando começa a andar', body:'A tensão pode estar caindo na partida. Meça a alimentação enquanto os motores arrancam. Confira bateria, reguladores e fios. No ESP32, “brownout” indica queda de tensão; corrija a alimentação.'},
      {title:'Gira no lugar quando deveria avançar', body:'Teste cada roda sozinha. Uma pode estar girando ao contrário ou parada. Confira fios, configuração de inversão e velocidade mínima para o motor começar a girar.'},
      {title:'Não reconhece a faixa', body:'Limpe o sensor. Confira altura, luz e ajuste do pequeno parafuso do módulo. Veja se a leitura muda entre preto e branco. Ajuste HIGH/LOW no site e teste na arena real.'},
      {title:'Motor ou ponte muito quente', body:'Desligue. Procure roda presa, carga excessiva, curto ou tensão errada. Confira a corrente de stall: é a corrente com o eixo travado. Use o valor do fabricante; não trave a roda para fazer esse teste.'}
    ],
    checklist:['Testei todos os movimentos.','Testei borda e adversário na arena.','O robô passou pelos testes curtos sem reiniciar nem aquecer demais.']
  },
  {
    id:'conclusao', title:'Conclua a montagem', tag:'Certificado', duration:'15 min',
    summary:'Revise o robô, salve os ajustes e faça a avaliação.',
    sections:[
      {title:'Revisão final', bullets:['Rodas livres, peças firmes e bateria presa.','Fios isolados, tensões medidas e chave acessível.','Código salvo com os ajustes usados no robô.','Teste de espera, busca, ataque, fuga da borda e parada concluído.']},
      {title:'Registre seu projeto', body:'Anote quais peças usou e quais testes fez. Salve a configuração. Se for uma atividade da escola, mostre o robô funcionando ao professor.'},
      {title:'Faça a avaliação', body:'Conclua as aulas e responda às questões. O certificado registra esta trilha livre e as atividades que você declarou concluir. A conferência física do robô é feita à parte.'}
    ],
    checklist:['Revisei a montagem.','Salvei a configuração e fiz os testes.','Estou pronto para a avaliação.']
  }
];

export const parts = [
  {id:'uno', name:'Arduino Uno R3', category:'Controle', qty:'1, se escolher Uno', summary:'É o cérebro do robô: lê sensores e comanda a ponte H.', specs:['Sinais de 5 V; processador ATmega328P.','14 pinos digitais; 6 com PWM para controlar saídas.','Placa original: 68,6 × 53,4 mm; USB tipo B.'], tips:['Use o modelo R3 neste roteiro.','Não ligue motores direto nos pinos.','Algumas placas compatíveis exigem um driver USB no computador.'], url:'https://store.arduino.cc/products/arduino-uno-rev3', datasheet:'https://docs.arduino.cc/hardware/uno-rev3/'},
  {id:'esp32', name:'ESP32 clássico DevKit', category:'Controle', qty:'1, como alternativa ao Uno', summary:'Outra opção de cérebro, com Wi-Fi e Bluetooth.', specs:['Sinais de 3,3 V. Seus pinos não aceitam sinal de 5 V.','Precisa ter os GPIO usados no desenho deste projeto.','Confira o modelo e o conector USB antes de comprar.'], tips:['Escolha Uno ou ESP32; não precisa dos dois.','C3, S2 e S3 não usam diretamente esta pinagem.','Use uma fonte de alimentação por vez.'], url:'https://www.espressif.com/en/products/devkits', datasheet:'https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html'},
  {id:'l298', name:'Ponte H L298N', category:'Potência', qty:'1', summary:'Liga os dois motores e muda o sentido de giro.', specs:['Compre o módulo com dissipador e diodos de proteção.','Neste projeto: 6 V para os motores e 5 V para a lógica.','Escolha motores cuja corrente o módulo consiga suportar.'], tips:['PWM controla a velocidade ligando e desligando a saída rapidamente.','O L298N perde tensão em calor; isso diminui a força do motor.','Confira os jumpers. “2 A por canal” não garante esse valor o tempo todo.'], url:'https://www.st.com/en/motor-drivers/l298.html', datasheet:'https://www.st.com/resource/en/datasheet/l298.pdf'},
  {id:'motors', name:'Motores com redução', category:'Movimento', qty:'2 iguais', summary:'As engrenagens reduzem a velocidade e aumentam o torque, a força de giro.', specs:['Referência inicial: motor de 6 V com redução de 50:1 a 100:1.','Exemplo: Pololu MP 6 V, corrente de stall de 0,67 A.','Stall é a condição de eixo travado; use o valor informado pelo fabricante.'], tips:['Confira força, velocidade e corrente antes de comprar.','Roda e suporte devem encaixar no motor escolhido.','TT e N20 de fabricantes diferentes podem ter dados diferentes.'], url:'https://www.pololu.com/category/172/6v-medium-power-mp-micro-metal-gearmotors', datasheet:'https://www.pololu.com/file/0J1487/pololu-micro-metal-gearmotors_rev-5-1.pdf'},
  {id:'wheels', name:'Rodas e apoio traseiro', category:'Movimento', qty:'2 rodas + 1 apoio', summary:'As rodas puxam o robô. O apoio traseiro mantém o equilíbrio.', specs:['Duas rodas do mesmo tamanho, com boa aderência.','Encaixe compatível com o eixo dos motores.','Apoio que deixe peso suficiente nas rodas de tração.'], tips:['Rodas maiores andam mais rápido, mas exigem mais força.','Confira as regras antes de usar produtos para aumentar a aderência.'], url:'https://www.pololu.com/category/234/wheels'},
  {id:'battery', name:'Bateria Li-ion 2S protegida', category:'Energia', qty:'1 conjunto pronto', summary:'Fornece energia para os motores e a eletrônica.', specs:['2S: duas células em série.','7,4 V nominais; até 8,4 V carregada.','Com BMS, a placa de proteção da bateria.','Corrente de saída suficiente para os dois motores e a eletrônica.'], tips:['mAh indica capacidade; confira também a corrente permitida.','Não ligue a bateria direto aos motores de 6 V.','Escolha bateria e carregador compatíveis.'], url:'https://wiki.dfrobot.com/dfr0564/docs/19979'},
  {id:'charger', name:'Carregador Li-ion 2S 8,4 V', category:'Energia', qty:'1', summary:'Recarrega a bateria controlando tensão e corrente.', specs:['Próprio para bateria Li-ion 2S.','Saída final de 8,4 V.','Corrente, conector e polaridade aprovados para sua bateria.'], tips:['Siga a indicação do fabricante da bateria.','Carregue com o robô desligado e acompanhe.','TP4056 carrega uma célula; não serve para o conjunto 2S.'], url:'https://www.dfrobot.com/product-1713.html', datasheet:'https://wiki.dfrobot.com/dfr0564/'},
  {id:'buck', name:'Reguladores de tensão (buck)', category:'Energia', qty:'2', summary:'Baixam a tensão da bateria: um para 6 V e outro para 5 V.', specs:['Entrada compatível com a bateria 2S.','Corrente suficiente para a partida e o funcionamento.','Saída ajustada e conferida com multímetro.'], tips:['Meça a saída antes de conectar as peças.','Com bateria fraca, o regulador pode deixar de manter 6 V.','Confira a corrente real suportada e o aquecimento.'], url:'https://www.pololu.com/category/131/step-down-buck-voltage-regulators'},
  {id:'chassis', name:'Chassi e parafusos', category:'Estrutura', qty:'1 conjunto', summary:'É a base que segura motores, placa, sensores e bateria.', specs:['Espaço para todas as peças e seus cabos.','Encaixes compatíveis com os motores.','Parafusos, porcas, espaçadores isolantes e cinta para bateria.'], tips:['Compare os modelos 3D antes de imprimir.','Confira tamanho e peso permitidos na competição.','Siga a licença e as instruções de cada modelo.'], url:'https://www.thingiverse.com/'},
  {id:'ultrasonic', name:'Ultrassom HC-SR04', category:'Sensores', qty:'1', summary:'Envia um som e mede o tempo do eco para calcular a distância.', specs:['Versão comum alimentada em 5 V.','Pinos: VCC, TRIG, ECHO e GND.','No ESP32, use o divisor de resistores no ECHO.'], tips:['Sem eco, não há uma distância válida.','Alvos pequenos ou inclinados podem não ser detectados.'], url:'https://www.sparkfun.com/ultrasonic-distance-sensor-hc-sr04.html', datasheet:'https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf'},
  {id:'line', name:'Sensores de borda', category:'Sensores', qty:'2', summary:'Usam luz infravermelha para diferenciar o chão escuro da faixa clara.', specs:['Módulo com saída digital, como TCRT5000 com comparador.','Confira a tensão de alimentação e o sinal de saída.','Precisa permitir ajuste de altura.'], tips:['No ESP32, a saída deve ser de até 3,3 V.','Teste se branco gera HIGH (1) ou LOW (0).','O datasheet do sensor não descreve todas as placas vendidas com ele.'], url:'https://www.vishay.com/en/product/83760/', datasheet:'https://www.vishay.com/docs/83760/tcrt5000.pdf'},
  {id:'accessories', name:'Fios, resistores e chave', category:'Montagem', qty:'1 kit', summary:'Complete a montagem com conexões firmes e isoladas.', specs:['Chave, fusível e fios adequados à corrente do robô.','Uno: 6 resistores de 1 kΩ e 6 de 1,5 kΩ, todos de 1%.','ESP32: 1 resistor de 1 kΩ e 1 de 2 kΩ, de 1%, para o Echo.','Cabo USB de dados, conexão USB de alimentação e material isolante.'], tips:['Não passe a corrente dos motores por uma protoboard.','Use multímetro para medir tensão e conferir ligações.'], url:'https://www.arduino.cc/en/Guide'}
];

export const quiz = [
  {question:'Qual é a função principal da ponte H?', options:['Aumentar a memória da placa.','Ligar o motor e controlar seu sentido de giro.','Medir a distância do adversário.','Carregar a bateria.'], answer:1, explanation:'A placa manda o comando. A ponte H entrega a energia ao motor.'},
  {question:'Como controlar a velocidade pelo ENA de um módulo L298N comum?', options:['Deixar o jumper ENA instalado e ligar outro 5 V.','Conectar o motor ao Arduino.','Remover o jumper ENA e aplicar PWM no pino.','Ligar ENA ao Echo.'], answer:2, explanation:'O jumper mantém o canal habilitado. Retire-o para que a placa controle ENA por PWM.'},
  {question:'O Echo de um HC-SR04 tradicional pode ir direto ao ESP32?', options:['Não; o sinal de 5 V precisa de adaptação para 3,3 V.','Sim, qualquer GPIO aceita 5 V.','Sim, se usar um cabo curto.','Somente se o motor estiver ligado.'], answer:0, explanation:'O ESP32 usa GPIO de 3,3 V. O roteiro inclui um divisor no Echo.'},
  {question:'Qual decisão tem prioridade quando a faixa é detectada?', options:['Aumentar a velocidade de ataque.','Esperar uma nova leitura do adversário.','Continuar procurando.','Executar a fuga da borda.'], answer:3, explanation:'Evitar a saída da arena tem prioridade sobre busca e ataque.'},
  {question:'Por que conferir a corrente de stall, com o eixo travado?' , options:['Ela indica a cor dos fios.','Ajuda a escolher ponte H, alimentação e proteção que suportem o motor.','Ela é sempre igual à corrente sem carga.','Ela define o endereço do Firebase.'], answer:1, explanation:'Na partida ou com eixo travado, a corrente é muito maior que a corrente sem carga.'},
  {question:'Uma bateria Li-ion 2S totalmente carregada tem aproximadamente:', options:['3,3 V.','5,0 V.','8,4 V.','12,0 V.'], answer:2, explanation:'Duas células de 4,2 V em série somam 8,4 V. O valor nominal do pack é 7,4 V.'},
  {question:'Qual carregador é adequado ao pack deste projeto?', options:['Um carregador Li-ion 2S 8,4 V compatível com o pack.','Qualquer fonte de 12 V.','Um TP4056 para célula única ligado ao pack completo.','A saída de um GPIO.'], answer:0, explanation:'O carregador precisa combinar com o tipo de bateria, suas duas células, corrente e conector.'},
  {question:'O robô reinicia quando os motores arrancam. Qual verificação vem primeiro?', options:['Desativar o brownout.','Trocar a cor da interface.','Remover todos os GND.','Medir a alimentação durante a partida e conferir conexões.'], answer:3, explanation:'Picos de corrente podem causar queda de tensão. Corrija a alimentação em vez de esconder a falha.'},
  {question:'O sensor não recebeu eco. Como interpretar essa leitura?', options:['Adversário a zero centímetro.','Leitura inválida; não deve disparar ataque por si só.','Faixa branca detectada.','Bateria carregada.'], answer:1, explanation:'Timeout significa que a distância não foi medida, não que o alvo está encostado.'},
  {question:'Salvar parâmetros na área “Meu robô” faz o quê?', options:['Reprograma qualquer placa próxima automaticamente.','Troca fisicamente os fios.','Registra a configuração; o código gerado ainda precisa ser gravado na placa.','Carrega a bateria.'], answer:2, explanation:'O site guarda parâmetros e gera arquivos. A gravação do firmware é uma etapa separada.'}
];

export const sources = [
  {title:'Eletrogate — Guia definitivo de uso da ponte H L298N (Gustavo Nery)', url:'https://blog.eletrogate.com/guia-definitivo-de-uso-da-ponte-h-l298n/'},
  {title:'Arduino — medidas e especificações do Uno R3', url:'https://store.arduino.cc/products/arduino-uno-rev3'},
  {title:'Arduino — UNO R3, documentação e pinout', url:'https://docs.arduino.cc/hardware/uno-rev3/'},
  {title:'Espressif — ESP32-DevKitC V4: alimentação e pinos', url:'https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html'},
  {title:'Espressif — datasheet ESP32-WROOM-32', url:'https://documentation.espressif.com/esp32-wroom-32_datasheet_en.html'},
  {title:'STMicroelectronics — datasheet L298', url:'https://www.st.com/resource/en/datasheet/l298.pdf'},
  {title:'Toshiba — datasheet TB6612FNG', url:'https://toshiba.semicon-storage.com/info/TB6612FNG_datasheet_en_20141001.pdf?did=10660&prodName=TB6612FNG'},
  {title:'Pololu — motores MP de 6 V', url:'https://www.pololu.com/category/172/6v-medium-power-mp-micro-metal-gearmotors'},
  {title:'Pololu — datasheet de micromotores com redução', url:'https://www.pololu.com/file/0J1487/pololu-micro-metal-gearmotors_rev-5-1.pdf'},
  {title:'HC-SR04 — ficha técnica distribuída pela SparkFun', url:'https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf'},
  {title:'Vishay — datasheet TCRT5000', url:'https://www.vishay.com/docs/83760/tcrt5000.pdf'},
  {title:'DFRobot — carga e requisitos de bateria 2S protegida', url:'https://wiki.dfrobot.com/dfr0564/docs/19979'},
  {title:'Arduino — download da IDE', url:'https://www.arduino.cc/en/software'},
  {title:'Espressif — instalação do suporte Arduino-ESP32', url:'https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html'}
];
