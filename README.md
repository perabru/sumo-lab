# Sumo Lab

Site educacional em português para montar e programar um carrinho robô sumô com Arduino Uno R3 ou ESP32 clássico.

## Conteúdo

- Nove aulas com listas de verificação e avaliação de dez questões.
- Lista de peças e documentação de fabricantes.
- Simulador lógico da ponte H L298N e diagramas SVG autorais.
- Guia complementar Eletrogate, indicado pelo responsável pelo projeto.
- Códigos autônomo e bancada para Uno e ESP32, com gerador de parâmetros.
- Sete referências Thingiverse, visualizador local de STL e chassi didático próprio.
- Google e e-mail/senha pelo Firebase; rascunhos individuais no navegador.
- Certificado de curso livre em impressão/PDF após conclusão das aulas, avaliação≥70% e declaração de montagem.

## Executar

É um site estático sem etapa de build. Sirva a pasta por um servidor HTTP para carregar os módulos ES. No GitHub Pages use `main` e `/ (root)`. Caminhos relativos suportam `/sumo-lab/`.

Para as verificações locais: `npm test` (Node22+).

## Firebase

Leia [firebase-setup.md](firebase-setup.md). A configuração web fornecida não é uma credencial administrativa. Os provedores Google e e-mail/senha e o domínio `perabru.github.io` foram conferidos no console.

As regras individuais foram publicadas com autorização do responsável em25/11/2026, e a sincronização está habilitada. `firebase.rules.proposed.json` registra as regras aplicadas: `sumoLab/users/$uid` exige a identidade do próprio aluno; outros caminhos mantêm o acesso anterior. A leitura e escrita diretas na raiz agora são negadas. `firebase.rules.fragment.json` é apenas um fragmento de referência. O acesso anônimo ao namespace dos alunos foi verificado e negado.

As regras são controle de acesso, não atestado independente de conclusão. O certificado é gerado no navegador, baseado em atividades autodeclaradas; não há assinatura digital ou validação externa.

## Hardware

Leia [docs/montagem-pinagem.md](docs/montagem-pinagem.md). O projeto usa Vs6V regulados para o L298N e lógica5V separada. No Uno, os seis comandos do driver usam os divisores indicados. No ESP32, o Echo do HC-SR04 precisa de adaptação de nível. Não confunda GPIO com posição física de pino.

As verificações C++ realizadas usam uma API Arduino simulada. Não substituem compilação nas toolchains reais, ensaio elétrico, térmico ou testes do robô físico.

## Créditos

Conteúdo e diagramas didáticos próprios; fontes técnicas na seção do site. Referências Uiverse citadas em [CREDITS.md](CREDITS.md). Modelos Thingiverse não foram copiados nem redistribuídos. Há cinco chassis didáticos próprios para download: compacto, clássico, com rampa, perfil baixo e ampliado. Todos exigem conferência das peças reais, fixações e regulamento antes da impressão. A versão antiga da bandeja é mantida apenas para compatibilidade.

## Chassis e verificação de espaço

A seção `#chassis` usa Three.js local para exibir os cinco modelos, componentes, vistas e camadas separadas. Cada STL próprio é gerado pela mesma geometria mostrada no visualizador. Os furos e rasgos são genéricos, sem promessa de compatibilidade com placas ou motores específicos.

O verificador usa as medidas editáveis das peças, rotação, folga, altura disponível e uma área útil conservadora. Peças acima e abaixo da base são verificadas em planos separados. O resultado é uma análise de espaço: não simula resistência, cabos, conectores, suportes, acesso a parafusos, rodas ou coincidência de furos. Inclua esses volumes nas medidas e confira a montagem física. Os valores iniciais são referências; fornecedores podem usar dimensões diferentes.

STLs externos são abertos localmente e exigem que o aluno informe uma área plana útil. O sistema não deduz essa área a partir da caixa externa nem reconhece obstáculos da malha. Formato esperado: milímetros, base horizontal voltada para cima, até16MB e80mil triângulos.

Testes geométricos verificam limites, superfície fechada, furos, rampa, colisões, rotações, entradas inválidas e preservação de medidas na organização.
