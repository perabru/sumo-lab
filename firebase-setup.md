# Firebase do Sumô Lab

Projeto: `controle-de-leito`. O site usa a configuração web fornecida pelo proprietário e o SDK modular 13.4.0. A versão foi conferida na documentação oficial e no CDN em 25/11/2026. A configuração web identifica o projeto; ela não concede permissão administrativa.

## Ativação no console

1. Abra https://console.firebase.google.com/project/controle-de-leito/authentication/providers.
2. Habilite **Google** e **E-mail/senha**. No Google, selecione o e-mail de suporte do projeto.
3. Em **Authentication → Configurações → Domínios autorizados**, adicione `perabru.github.io`. Informe só o domínio, sem `https://` nem caminho do repositório. Inclua um eventual domínio próprio quando ele for usado. `localhost` só é necessário para desenvolvimento local.
4. Abra https://console.firebase.google.com/project/controle-de-leito/database e confirme que a instância desejada é `https://controle-de-leito.firebaseio.com`.
5. Leia as regras existentes antes de editar. O arquivo `firebase.rules.fragment.json` contém **apenas a propriedade `sumoLab`**, para ser incorporada dentro do objeto `rules` atual. Preserve todas as demais propriedades.
6. Use o simulador de regras ou o Emulator Suite para testar: usuário autenticado lendo e gravando seu próprio UID; outro UID e visitante sem login devem ser recusados; configuração com campos desconhecidos ou PWM acima de 255 deve ser recusada.
7. Publique as regras revisadas e teste cadastro, Google, saída e salvamento no endereço final do GitHub Pages.

**Atenção às permissões herdadas:** uma regra `.read: true` ou `.write: true` em um ancestral já permite acesso a seus descendentes. O fragmento não consegue revogar essa permissão. Se houver uma liberação ampla na raiz ou em `sumoLab/users`, é necessário revisar essa regra com o responsável pelo projeto, preservando a operação dos outros aplicativos. Não publique regras abertas para resolver `Permission denied`.

## O que é salvo

Cada aluno acessa somente `sumoLab/users/SEU_UID`. O documento contém:

- `profile`: nome de exibição e nome do robô;
- `progress`: mapa de aulas concluídas, resultado do questionário (0–100) e confirmação da montagem;
- `config`: placa, velocidades, distância, tempos e orientação dos motores;
- `schemaVersion` e data de atualização do servidor.

Senhas ficam no Firebase Authentication, nunca neste banco. Não são solicitadas permissões de leitura do Gmail. Nenhuma credencial de administrador, chave privada ou arquivo de conta de serviço deve ser colocado no GitHub.

## API usada pela interface

```js
import {
  subscribeAuth, signInGoogle, signInEmail, signUpEmail,
  resetPassword, logout, saveStudentData, loadStudentData,
  authErrorMessage
} from './auth.js';

const stop = subscribeAuth((user, status) => {
  // status.loading: aguardando Firebase. status.error: erro real.
  // user é null ou { uid, displayName, email, photoURL, emailVerified }.
});

await saveStudentData({
  profile: { name: 'Nome do aluno', robotName: 'Meu Sumô' },
  progress: {
    completed: { fundamentos: true },
    quizScore: 80,
    assemblyChecked: true
  },
  config: {
    board: 'uno', mode: 'autonomous', attack: 255, search: 85, escape: 210,
    distance: 50, edgeLevel: 'LOW',
    invertLeft: false, invertRight: false,
    startDelay: 5000, escapeMs: 350, turnMs: 300
  }
});
```

`saveStudentData` substitui somente o documento do próprio aluno, sem tocar em outros caminhos. Passe o estado completo mais recente. `loadStudentData` devolve `null` para uma conta ainda sem registro. O import é dinâmico; as aulas públicas continuam utilizáveis se o Firebase estiver indisponível.

## Falha de rede e progresso local

A interface deve exibir **Salvo na conta** apenas depois que `saveStudentData` resolver. Se uma gravação demorar, a mensagem indica que o resultado ainda não foi confirmado; o SDK pode concluir a sincronização ao recuperar a conexão. Não apresente erro de rede como login bem-sucedido e não crie usuário fictício.

O rascunho local pode ser mantido com uma chave específica por UID, com a indicação **Salvo neste navegador**. Não carregue o rascunho de uma conta em outra. Ao entrar, leia os dados remotos antes de gravar para evitar sobrescrever o progresso de outro dispositivo. Em computador compartilhado, oriente a usar **Sair** ao concluir.

As regras protegem o acesso entre contas, mas o progresso e o questionário são autodeclarados pelo navegador. Um certificado educacional gerado nesse site não equivale a uma validação presencial nem oferece prova antifraude. Uma emissão institucional verificável exige avaliação do responsável e emissão no servidor.

## Erros comuns

| Erro | Correção |
|---|---|
| `auth/unauthorized-domain` | Autorizar o domínio exato em Authentication. |
| `auth/operation-not-allowed` | Habilitar o provedor de login. |
| `auth/popup-blocked` | Permitir a janela de login e clicar novamente. |
| `PERMISSION_DENIED` | Conferir as regras, UID e formato do documento. |
| `auth/network-request-failed` | Conferir conexão e bloqueios de rede. |

## Referências oficiais

- https://firebase.google.com/docs/web/setup
- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/auth/web/password-auth
- https://firebase.google.com/docs/auth/web/auth-state-persistence
- https://firebase.google.com/docs/database/web/read-and-write
- https://firebase.google.com/docs/database/security/rules-conditions

Não foram feitas alterações administrativas no projeto Firebase durante a criação desses arquivos.
