# Estrutura do banco de dados

[← Voltar ao README](../README.md)

## Visão geral

O projeto usa o **Firebase Realtime Database** (banco JSON, hierárquico — não é relacional). Todos os dados ficam sob o nó raiz `rooms`, uma sala por chave:

```text
rooms/{roomId}
├── metadata
│   ├── title
│   ├── createdAt
│   ├── isRevealed
│   ├── timerEndsAt
│   └── hostId
├── participants
│   └── {userId}
│       ├── name
│       ├── role
│       └── joinedAt
└── votes
    └── {userId} = "1" | "2" | "3" | "5" | "8" | "13" | "21" | "?" | "☕"
```

Exemplo real:

```json
{
  "rooms": {
    "k7m2q9x4t8b3n6v5c2z9w4r7p8": {
      "metadata": {
        "title": "Refinamento - Sprint 45",
        "createdAt": 1700000000000,
        "isRevealed": false,
        "hostId": "user-uuid-123"
      },
      "participants": {
        "user-uuid-123": { "name": "Alex Dev", "role": "VOTER", "joinedAt": 1700000005000 },
        "user-uuid-456": { "name": "Sarah PM", "role": "OBSERVER", "joinedAt": 1700000010000 }
      },
      "votes": {
        "user-uuid-123": "5"
      }
    }
  }
}
```

O `roomId` é um token aleatório de 26 caracteres base32 (~130 bits) gerado por `createRoomId` em `src/lib/utils.ts`; ele **não** deriva do título. Links antigos no formato `slug-sufixo` continuam válidos para leitura.

> Em modo local (sem variáveis do Firebase), a mesma estrutura é gravada no `localStorage` sob a chave `pp:room:{roomId}` — veja `src/services/localService.ts`.

---

## Campos de `metadata`

Fica em `rooms/{roomId}/metadata`. É o "cabeçalho" da sala, compartilhado por todos.

| Campo | Tipo | Uso |
|---|---|---|
| `title` | `string` | Nome da sala exibido no cabeçalho. Definido na criação. Se vier inválido, `normalizeRoom` usa `"Planning Poker"` como fallback. |
| `createdAt` | `number` (epoch ms) | Momento de criação da sala (`Date.now()`). Serve como metadado/auditoria; hoje não é exibido na interface. |
| `isRevealed` | `boolean` | **Chave do sigilo da rodada.** Enquanto `false`, o hook `usePokerRoom` remove os valores de `votes` do estado exposto (mostra apenas quem votou). Ao virar `true`, as cartas são reveladas e as estatísticas são calculadas. |
| `timerEndsAt` | `number \| null` (epoch ms) | Timestamp absoluto de quando o timer opcional de 30s termina. Se existir e a rodada não estiver revelada, todos os clientes contam o tempo e tentam revelar ao chegar a zero. É limpo (`null`) ao revelar, resetar ou cancelar o timer. |
| `hostId` | `string \| null` | Id do participante com permissão de revelar/resetar a rodada. Recebe o **primeiro participante** que criou/entrou. Quando o host sai, passa para o participante mais antigo restante; se abandonar a sala, outro cliente assume via transação atômica (`claimHost`). |

Detalhes importantes:

- O timer não é um contador sendo decrementado no banco; é um **instante absoluto**. Cada cliente calcula o restante com `timerEndsAt - Date.now()`.
- A revelação automática é segura contra corrida: `completeRoundTimer` só altera se `timerEndsAt` ainda for o esperado e o horário já passou, então apenas o primeiro cliente vence.
- `normalizeRoom` mantém o `hostId` gravado mesmo se aquele participante já não existe, justamente para os clientes detectarem "host abandonado" e assumirem.

---

## Campos de `participants`

Cada participante é uma **chave** `{userId}` (UUID anônimo do navegador). O `id` **não é gravado dentro do objeto** — ele é a própria chave (`toStoredParticipant` em `src/services/normalize.ts`).

| Campo | Tipo | Uso |
|---|---|---|
| `name` | `string` | Nome exibido na carta do participante. Limitado a 40 caracteres na leitura. |
| `role` | `"VOTER" \| "OBSERVER"` | Define se a pessoa vota. Apenas `VOTER` entra na lista de votantes e pode receber votos; `OBSERVER` só acompanha. Valor inválido vira `"VOTER"` na normalização. |
| `joinedAt` | `number` (epoch ms) | Ordem de chegada. Usado para ordenar a mesa e para eleger o próximo host (o mais antigo). No Firebase é regravado a cada join/rejoin; no modo local, o valor existente é preservado. |

Presença/limpeza:

- Ao entrar, o app registra `onDisconnect` para apagar `participants/{userId}` e `votes/{userId}` quando a conexão cair.
- Ao fechar a aba, um `DELETE` via REST com `keepalive` remove os dois imediatamente (o `onDisconnect` sozinho pode demorar ~1 min com long-polling).
- Ao sair explicitamente, `leaveRoom` remove o participante, remove o voto e transfere o `hostId` se necessário.

---

## Campos de `votes`

É um mapa `{userId} -> valor da carta`. Não guarda nome, data ou id do votante — a chave já é o `userId`.

| Campo | Tipo | Uso |
|---|---|---|
| `votes/{userId}` | `"1" \| "2" \| "3" \| "5" \| "8" \| "13" \| "21" \| "?" \| "☕"` | Voto atual daquele participante. `null`/ausente = ainda não votou. `"?"` = "Não sei"; `"☕"` = "Pausa". |

Regras aplicadas na leitura (`normalizeRoom`):

- Só entram votos cujo valor está em `CARD_VALUES`.
- Só entram votos de usuários que existem em `participants`.
- Ao revelar, os valores passam a ser expostos; ao resetar (`resetVoting`), o nó inteiro `votes` é apagado (`votes: null`) e `isRevealed` volta para `false`.

As estatísticas (`average`, `mode`, `min`, `max`, `hasConsensus`) **não são persistidas**. São calculadas em memória por `calculateStats` (`src/lib/stats.ts`), somente após a revelação. Média, mínimo e máximo consideram apenas cartas numéricas; a moda considera todos os valores; consenso exige que todos os votos sejam a mesma carta numérica.

---

## Como os campos são usados no fluxo

1. **Criar sala** (`createRoom`): grava `metadata` (`title`, `createdAt`, `isRevealed: false`, `hostId` do criador), o criador em `participants` e `votes: {}`. Se a sala já existir, retorna `false`.
2. **Entrar** (`joinRoom`): grava/atualiza `participants/{userId}` e, se não houver host válido, atribui o host ao participante mais antigo via transação.
3. **Votar** (`castVote`): escreve `votes/{userId}`; passar `null` remove o voto.
4. **Revelar** (`setRevealed`): `isRevealed: true` e `timerEndsAt: null`.
5. **Nova rodada** (`resetVoting`): `isRevealed: false`, `timerEndsAt: null`, `votes: null`.
6. **Timer** (`startRoundTimer` / `clearRoundTimer` / `completeRoundTimer`): manipula `metadata.timerEndsAt`; ao zerar, vira `isRevealed: true`.
7. **Sair/desconectar**: remove `participants/{userId}`, `votes/{userId}` e reatribui `hostId`.

---

## Segurança e limitações

`database.rules.json` libera leitura e escrita apenas dentro de `rooms/{roomId}`:

```json
{ "rules": { "rooms": { "$roomId": { ".read": true, ".write": true } } } }
```

- Não há autenticação nem validação de valores nas regras; o link da sala funciona como segredo de acesso.
- Listar todas as salas (`GET /rooms.json`) continua negado, então não dá para descobrir códigos por varredura.
- A ocultação dos votos antes da revelação é feita **no cliente** (`usePokerRoom`). Alguém com acesso direto à API do banco ainda consegue ler `votes`. Para sigilo real, seria preciso autenticação + regras por usuário.
- Salas não são apagadas automaticamente quando todos saem: o nó `rooms/{roomId}` permanece no banco.

Arquivos principais: `src/types/poker.ts` (modelo), `src/services/firebaseService.ts` (escrita/leitura), `src/services/normalize.ts` (validação), `src/hooks/usePokerRoom.ts` (sanitização e uso na UI) e `README.md` (seção "Estrutura no banco").
