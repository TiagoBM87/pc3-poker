# ♠ PC3 Poker — Planning Poker serverless

Aplicação de Planning Poker leve, em tempo real e pensada para squads que trabalham atrás de VPNs e proxies corporativos. Sem backend próprio: o estado das salas vive no Firebase Realtime Database.

> **Modo demo:** sem variáveis de ambiente do Firebase, o app roda automaticamente com um backend local (`localStorage` + `BroadcastChannel`), permitindo testar o fluxo completo entre abas do mesmo navegador.

## Stack

- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- React Router DOM com `HashRouter` (compatível com GitHub Pages)
- Firebase Realtime Database
- `canvas-confetti` para celebrar consenso

## Funcionalidades

- Criar sala com código único gerado a partir do título (ex.: `sprint-planning-a4k9`).
- Entrar por código ou link completo.
- Papéis de **votante** e **observador**.
- Cartas Fibonacci: `1, 2, 3, 5, 8, 13, 21, ?, ☕`.
- Votos ocultos até a revelação — ninguém vê o valor dos outros antes da hora.
- **Host** (primeiro a entrar) controla a revelação e o início de novas rodadas; ao sair, o papel passa para o participante mais antigo.
- **Timer opcional de 30s por rodada:** o host pode ativar a contagem na barra inferior; todos veem o countdown e as cartas são reveladas automaticamente no fim (o host também pode cancelar ou revelar antes).
- Link compartilhado sempre pede nome e papel antes de entrar na sala.
- Estatísticas ao revelar: média, maior, menor, moda e indicação de consenso.
- Confete automático quando há consenso.
- Presença: participantes são removidos ao sair da sala ou fechar a aba. No Firebase, o fechamento da aba limpa a presença na hora (DELETE via REST com `keepalive`), com `onDisconnect` como rede de segurança.
- Long-polling forçado no Firebase para contornar bloqueio de WebSockets.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. Sem `.env.local`, o app entra em **modo local (demo)**.

Para testar com dois participantes no modo demo, abra a sala em duas abas: cada aba usa uma identidade própria (`sessionStorage`), e o estado é sincronizado via `BroadcastChannel`.

### Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Type-check + build de produção em `dist/` |
| `npm run preview` | Pré-visualiza o build |
| `npm run typecheck` | Apenas verificação de tipos |

## Configurando o Firebase

1. Crie um projeto em <https://console.firebase.google.com>.
2. Ative **Realtime Database** (modo de teste para começar).
3. Em **Configurações do projeto → Seus apps → Web**, copie as credenciais.
4. Crie `.env.local` a partir de `.env.example`:

```bash
cp .env.example .env.local
```

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://seu-projeto-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

5. Publique as regras de `database.rules.json` (Firebase Console → Realtime Database → Rules) ou via CLI:

```bash
firebase deploy --only database
```

> As regras incluídas são abertas para facilitar o início. Para uso em produção, restrinja por domínio/autenticação e valide os valores dos votos. Como o app é anônimo por design, uma regra simples é limitar `write` ao domínio do GitHub Pages usando `auth` anônimo ou App Check.
>
> A liberação vale só para `rooms/{roomId}`: listar todas as salas (`GET /rooms.json`) continua negado, então não é possível descobrir códigos de sala por varredura.

### Estrutura no banco

```text
rooms/{roomId}
├── metadata/{title, createdAt, isRevealed, timerEndsAt, hostId}
├── participants/{userId}/{name, role, joinedAt}
└── votes/{userId} = "1" | "2" | "3" | "5" | "8" | "13" | "21" | "?" | "☕"
```

## Deploy no GitHub Pages

O workflow `.github/workflows/deploy.yml` faz build e publica `dist/` no branch `gh-pages` a cada push em `main`.

1. Envie o repositório para o GitHub.
2. Em **Settings → Secrets and variables → Actions**, cadastre os secrets `VITE_FIREBASE_*` usados no workflow.
3. Em **Settings → Pages**, selecione **Deploy from a branch** → branch `gh-pages` / `/ (root)`.
4. Faça push em `main` e acompanhe a aba **Actions**.

O `vite.config.ts` usa `base: './'`, então o build funciona tanto em `usuario.github.io/repo/` quanto em domínio próprio. O `HashRouter` evita 404 ao recarregar rotas.

## Estrutura do projeto

```text
src/
├── components/
│   ├── CardDeck.tsx      # barra inferior com cartas + timer/revelar/nova rodada
│   ├── Header.tsx        # título, contagem, copiar link, sair
│   ├── JoinGate.tsx      # nome/papel antes de entrar por um link
│   ├── PlayingCard.tsx   # face de carta de baralho reutilizável
│   ├── RoundTimer.tsx    # badge com countdown e barra de progresso
│   ├── StatsPanel.tsx    # média, min, max, moda e confete
│   ├── UserCard.tsx      # carta com flip 3D por participante
│   └── VoteTable.tsx     # grade de participantes
├── config/
│   ├── cards.ts          # valores das cartas
│   ├── firebase.ts       # init + long-polling
│   └── round.ts          # duração do timer da rodada
├── hooks/
│   └── usePokerRoom.ts   # assinatura em tempo real, sanitização e estatísticas
├── lib/
│   ├── identity.ts       # identidade anônima persistida
│   ├── stats.ts          # cálculo de média/moda/consenso
│   └── utils.ts          # cn, slugs, links, avatares
├── services/
│   ├── contract.ts       # interface do backend
│   ├── firebaseService.ts# implementação Realtime Database
│   ├── localService.ts   # backend demo (localStorage/BroadcastChannel)
│   ├── normalize.ts      # sanitização dos dados vindos do banco
│   └── roomService.ts    # seleciona Firebase ou modo local
├── types/poker.ts
├── views/
│   ├── HomeView.tsx
│   └── RoomView.tsx
├── App.tsx
├── main.tsx
└── index.css
```

## Decisões de implementação

- **Votos ocultos:** antes de `isRevealed === true`, o hook expõe apenas quais usuários votaram. O valor do próprio voto fica disponível somente para destacar a carta selecionada no deck. A ocultação é feita no cliente; as regras abertas do banco não impedem que alguém inspecione os votos via API — para sigilo real, use autenticação + regras por usuário.
- **Host:** não existe papel de moderador na especificação original. O primeiro participante a entrar recebe `metadata.hostId`; somente ele revela/reseta. Se o host sair ou fechar a aba, o participante mais antigo assume via transação atômica (`claimHost`).
- **Presença na hora:** com long-polling forçado, o `onDisconnect` do Firebase só percebe a queda da conexão depois de ~1 minuto. Por isso, ao fechar a aba (`pagehide`), o app apaga participante e voto via REST com `keepalive` e derruba a conexão (`goOffline`). O `onDisconnect` continua registrado para quedas de rede e crashes. Quem fica na sala detecta a ausência do host e assume na hora.
- **Host abandonado:** `normalizeRoom` preserva o `hostId` gravado mesmo quando aquele participante já saiu. Sem isso, o valor chegava como `null` ao cliente e a transação de `claimHost` abortava, deixando a sala sem moderador.
- **Entrada por link:** abrir um link de sala sempre exige confirmar nome e papel (tela `JoinGate`). A confirmação vale para a aba atual (`sessionStorage`), então recarregar a página não pergunta de novo.
- **Long-polling:** `forceLongPolling()` é chamado antes de `getDatabase()`; é a configuração recomendada para redes que bloqueiam WebSockets.
- **Sem autenticação:** a identidade é um UUID anônimo salvo no navegador. O link da sala é o segredo de acesso — trate-o como tal.
- **Modo local:** serve para desenvolvimento/demo. As salas não saem do navegador e continuam disponíveis para reentrada mesmo quando todos saem.
