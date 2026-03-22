# Deploy do jogo

Este projeto pode ser publicado de forma simples com:

- frontend em Vercel
- relay de sala em Render

O frontend e o relay sao separados:

- o jogador acessa o frontend por um link do site
- o frontend conversa com o relay para criar/entrar na sala e trocar acoes

## 1. Publicar o relay na Render

Este projeto ja inclui:

- `server/relayServer.ts`
- `npm run relay`
- `render.yaml`

### Passos

1. Suba o projeto para um repositorio Git.
2. Entre em [Render](https://render.com/).
3. Crie um novo `Blueprint` ou `Web Service`.
4. Se usar o `render.yaml`, a Render deve detectar:
   - `buildCommand: npm install`
   - `startCommand: npm run relay`
   - `healthCheckPath: /health`
5. Publique.

Ao final, voce tera uma URL parecida com:

`https://syllable-battle-relay.onrender.com`

## 2. Publicar o frontend na Vercel

Este projeto ja inclui:

- `vercel.json`
- build de Vite padrao

### Variavel obrigatoria

Na Vercel, configure:

`VITE_BATTLE_ROOM_RELAY_URL=https://SEU-RELAY.onrender.com`

### Passos

1. Entre em [Vercel](https://vercel.com/).
2. Importe o repositorio.
3. Confirme o framework `Vite`.
4. Adicione a variavel:
   - `VITE_BATTLE_ROOM_RELAY_URL`
5. Faça o deploy.

Ao final, voce tera uma URL parecida com:

`https://syllable-battle.vercel.app`

## 3. Como testar entre 2 PCs

1. Abra o link do frontend nos 2 PCs.
2. Nos 2, entre em `Multiplayer`.
3. Em um, crie uma sala.
4. No outro, entre com o codigo.
5. Host inicia o duelo.
6. Cada jogador escolhe um deck.
7. Testem a partida.

## Observacoes

- A Render gratuita pode "dormir" depois de um tempo sem uso.
- O primeiro acesso ao relay pode demorar um pouco quando ele estiver acordando.
- Para jogo casual isso costuma ser aceitavel, mas o primeiro login/sala pode ficar lento.

## Fluxo local sem deploy

Se quiser testar localmente:

1. Rode o relay:
   - `npm run relay`
2. Crie um `.env` com:
   - `VITE_BATTLE_ROOM_RELAY_URL=http://localhost:3010`
3. Rode o frontend:
   - `npm run dev`
