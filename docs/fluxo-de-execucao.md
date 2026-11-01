# Fluxo de execução

[← Voltar ao README](../README.md)

Esta documentação descreve como a aplicação se comporta em execução: navegação, criação/entrada em salas, votação, revelação, timer e presença. Os diagramas usam **Mermaid** e são renderizados diretamente no GitHub.

## Mapa de camadas

| Camada | Arquivos | Responsabilidade |
|---|---|---|
| Bootstrap / rotas | `src/main.tsx`, `src/App.tsx` | Renderiza o app e define `#/` e `#/room/:roomId` com `HashRouter`. |
| Telas | `src/views/HomeView.tsx`, `src/views/RoomView.tsx` | Criação/entrada na sala e composição da mesa (header, cartas, estatísticas). |
| Componentes | `src/components/*` | `JoinGate`, `CardDeck`, `VoteTable`, `StatsPanel`, `RoundTimer`, etc. |
| Orquestração | `src/hooks/usePokerRoom.ts` | Assina a sala, faz join, sanitiza votos, controla timer e presença. |
| Contrato | `src/services/contract.ts` | Interface única usada pela UI. |
| Backend | `src/services/firebaseService.ts`, `src/services/localService.ts` | Implementações Firebase Realtime Database e localStorage. |
| Seleção de backend | `src/services/roomService.ts` | Usa Firebase quando as variáveis `VITE_FIREBASE_*` existem; caso contrário, modo local. |
| Normalização | `src/services/normalize.ts` | Valida e aplica defaults aos dados vindos do banco. |
| Identidade / estatísticas | `src/lib/identity.ts`, `src/lib/stats.ts` | UUID anônimo persistido e cálculo de média/moda/consenso. |

---

## 1. Navegação e entrada na sala

```mermaid
flowchart TD
    A[main.tsx] --> B[App.tsx<br/>HashRouter]
    B -->|"#/"| C[HomeView]
    B -->|"#/room/:roomId"| D[RoomView]

    C -->|Criar sala| E[saveIdentity + createRoom]
    C -->|Entrar com código/link| F[parseRoomId + getRoom]
    E --> G[Navega para /room/:roomId]
    F --> G
    G --> D

    D --> H{Entrada confirmada<br/>nesta aba?}
    H -->|Não| I[JoinGate<br/>nome + papel]
    I --> J[saveIdentity + markRoomEntryConfirmed]
    J --> K
    H -->|Sim| K[usePokerRoom]

    K --> L[subscribe + normalizeRoom]
    K --> M[joinRoom]
    L --> N[(Realtime Database<br/>rooms/roomId)]
    M --> N
```

**Leitura do fluxo:**

- A rota é sempre resolvida no cliente (`HashRouter`), então recarregar a página funciona no GitHub Pages.
- Abrir um link de sala **sempre** passa pelo `JoinGate` na primeira vez daquela aba. A confirmação fica em `sessionStorage`; recarregar a mesma aba não pergunta de novo.
- Só depois de existir identidade e confirmação de entrada o hook `usePokerRoom` é habilitado.
- O hook assina a sala e faz o join; a partir daí toda mudança chega por `onValue`.

---

## 2. Criação de sala

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant H as HomeView
    participant ID as identity.ts
    participant RS as roomService
    participant DB as Realtime Database

    U->>H: informa nome, papel e título
    H->>H: validateName()
    H->>ID: saveIdentity(nome, papel)
    ID-->>H: Identity { id, name, role }

    loop até 3 tentativas
        H->>H: createRoomId(título)
        H->>RS: createRoom(roomId, title, participant)
        RS->>DB: get rooms/roomId
        alt sala já existe
            DB-->>RS: snapshot existente
            RS-->>H: false
        else sala livre
            DB-->>RS: vazio
            RS->>DB: set metadata + participants + votes
            RS->>DB: registra onDisconnect
            RS-->>H: true
        end
    end

    H->>ID: markRoomEntryConfirmed(roomId)
    H->>H: navigate(/room/roomId)
```

O `roomId` é um token aleatório de 26 caracteres base32 (~130 bits), sem relação com o título. Se houver colisão, o `HomeView` tenta novamente (até 3 vezes). O criador já nasce como `hostId` e como primeiro participante.

---

## 3. Entrada por link compartilhado

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant V as RoomView
    participant ID as identity.ts
    participant G as JoinGate
    participant HK as usePokerRoom
    participant RS as roomService
    participant DB as Realtime Database

    U->>V: abre #/room/:roomId
    V->>ID: isRoomEntryConfirmed(roomId)

    alt entrada não confirmada nesta aba
        ID-->>V: false
        V->>G: renderiza JoinGate
        U->>G: confirma nome + papel
        G->>ID: saveIdentity + markRoomEntryConfirmed
        G-->>V: setIdentity(...)
    else entrada já confirmada
        ID-->>V: true
        V->>ID: getIdentity()
    end

    V->>HK: usePokerRoom(roomId, identity)
    HK->>RS: subscribe(roomId)
    RS->>DB: onValue rooms/roomId
    DB-->>HK: snapshot
    HK->>HK: normalizeRoom(raw)

    HK->>RS: joinRoom(roomId, participant)
    RS->>DB: set participants/userId
    RS->>DB: ensureHost (transação)
    RS->>DB: registra onDisconnect
```

**Detalhes:**

- `joinRoom` grava `name`, `role` e `joinedAt`.
- Se a sala ainda não tiver host válido, `ensureHost` usa transação para eleger o participante mais antigo sem duas abas virarem host ao mesmo tempo.
- `onDisconnect` remove presença e voto se a conexão cair.
- Se a sala não existir, `RoomView` mostra "Sala não encontrada".

---

## 4. Estados de uma rodada

```mermaid
stateDiagram-v2
    state "Votação (isRevealed=false)" as Voting
    state "Timer ativo (timerEndsAt preenchido)" as Timer
    state "Revelada (isRevealed=true)" as Revealed

    [*] --> Voting: createRoom / resetVoting
    Voting --> Voting: castVote
    Voting --> Timer: startRoundTimer
    Timer --> Timer: countdown
    Timer --> Voting: clearRoundTimer
    Timer --> Revealed: completeRoundTimer
    Voting --> Revealed: setRevealed
    Revealed --> Voting: resetVoting
    Revealed --> [*]: sair da sala
```

- **Votação:** `votes` recebe valores, mas só quem votou é exposto aos outros.
- **Timer:** `metadata.timerEndsAt` é um timestamp absoluto; todos os clientes contam o tempo.
- **Revelada:** os valores de `votes` são expostos e as estatísticas são calculadas.
- **Nova rodada:** limpa `votes`, zera o timer e volta `isRevealed` para `false`.

---

## 5. Votação e revelação

```mermaid
sequenceDiagram
    autonumber
    actor Votante
    actor Host
    participant CD as CardDeck
    participant HK as usePokerRoom
    participant RS as roomService
    participant DB as Realtime Database
    participant UI as Todos os clientes

    Votante->>CD: clica na carta
    CD->>HK: castVote(valor)
    HK->>RS: castVote(roomId, userId, valor)
    RS->>DB: set votes/userId = valor
    DB-->>UI: onValue rooms/roomId
    UI->>UI: normalizeRoom + sanitização

    Note over UI: isRevealed=false:<br/>mostra apenas quem votou<br/>e o próprio voto

    Host->>CD: Revelar cartas
    CD->>HK: revealCards()
    HK->>RS: setRevealed(roomId, true)
    RS->>DB: update metadata/isRevealed=true<br/>timerEndsAt=null
    DB-->>UI: onValue rooms/roomId
    UI->>UI: votes expostos + calculateStats()
    UI-->>Votante: cartas viradas + estatísticas
```

**Pontos de controle na UI:**

- Clicar na carta já selecionada limpa o voto (`castVote(..., null)`).
- Observadores não recebem o deck clicável.
- O botão **Revelar cartas** só habilita para o host, com pelo menos um voto e com a rodada ainda fechada.
- O botão **Nova rodada** só habilita para o host quando existe voto ou a rodada está revelada.
- As estatísticas (`StatsPanel`) só aparecem após a revelação; o confete dispara quando há consenso.

---

## 6. Timer de 30 segundos

```mermaid
sequenceDiagram
    autonumber
    actor Host
    participant HK as usePokerRoom
    participant RS as roomService
    participant DB as Realtime Database
    participant C1 as Cliente A
    participant C2 as Cliente B

    Host->>HK: inicia timer
    HK->>RS: startRoundTimer(agora + 30s)
    RS->>DB: transação em metadata
    Note over DB: só grava se isRevealed=false
    DB-->>C1: timerEndsAt
    DB-->>C2: timerEndsAt

    loop a cada 250 ms
        C1->>C1: atualiza countdown
        C2->>C2: atualiza countdown
    end

    Note over C1,C2: ao atingir timerEndsAt,<br/>cada cliente chama completeRoundTimer
    C1->>RS: completeRoundTimer(timerEndsAt)
    C2->>RS: completeRoundTimer(timerEndsAt)
    RS->>DB: transação condicional
    Note over DB: o primeiro que encontrar o mesmo<br/>timerEndsAt e horário vencido<br/>grava isRevealed=true
    DB-->>C1: isRevealed=true
    DB-->>C2: isRevealed=true
    Note over C1,C2: as demais tentativas viram no-op
```

O timer pode ser cancelado pelo host (`clearRoundTimer`). Revelar manualmente ou iniciar nova rodada também limpa `timerEndsAt`. Como a decisão final é uma transação que compara o timestamp esperado, não há revelação duplicada nem sobrescrita fora de hora.

---

## 7. Presença e troca de host

```mermaid
flowchart TD
    A[Presença registrada no join] --> B{Como a sessão termina?}

    B -->|Botão Sair| C[cleanup do usePokerRoom chama leaveRoom]
    C --> C1[remove participante e voto]
    C1 --> C2[transfere hostId para o mais antigo]

    B -->|Fecha a aba| D[pagehide: DELETE REST keepalive<br/>+ goOffline]
    B -->|Rede cai ou crash| E[onDisconnect do Firebase]
    D --> F[remove participante e voto]
    E --> F

    F --> G[Clientes recebem onValue]
    C2 --> G
    G --> H{hostId existe entre<br/>os participantes?}
    H -->|Sim| I[A rodada continua]
    H -->|Não| J[O participante mais antigo chama claimHost]
    J --> K[Transação atômica define metadata/hostId]
    K --> L[Novo host pode revelar/resetar]
```

**Comportamentos importantes:**

- Fechar a aba limpa a presença imediatamente via REST com `keepalive`, sem esperar o timeout do long-polling.
- Restaurar a página pelo back/forward cache força um reload, porque a presença já foi removida.
- Se a presença do próprio usuário desaparecer (por exemplo, outra aba com a mesma identidade foi fechada), o hook tenta reentrar com um intervalo mínimo de 5 segundos.
- Quando o host sai, o participante mais antigo assume. A transação `claimHost` evita que dois clientes se declarem host ao mesmo tempo.

---

## 8. Observações de execução

- **O backend é escolhido uma vez:** `roomService.ts` decide entre Firebase e modo local no carregamento do módulo.
- **Ocultação de votos é no cliente:** antes da revelação, `usePokerRoom` remove `votes` do estado exposto. As regras abertas do banco não impedem leitura direta pela API.
- **Normalização centralizada:** todo dado vindo do banco passa por `normalizeRoom`, que aplica defaults, valida papéis/cartas e ignora votos de não participantes.
- **Salas não são apagadas automaticamente:** quando todos saem, o nó `rooms/{roomId}` permanece no banco.
- **Modo local:** replica o mesmo fluxo em `localStorage` + `BroadcastChannel`, sem rede e sem `onDisconnect`.

Para o significado de cada campo do banco, consulte [`banco-de-dados.md`](banco-de-dados.md).
