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

Conteúdo e diagramas didáticos próprios; fontes técnicas na seção do site. Referências Uiverse citadas em [CREDITS.md](CREDITS.md). Modelos Thingiverse não foram copiados nem redistribuídos. O STL próprio é um estudo de bandeja100×100×12mm sem furação; exige adaptação ao hardware e regulamento antes da impressão.
