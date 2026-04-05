# Syllable Battle

Card game de silabas para navegador com foco em:

- visual de card game fantasy
- partida responsiva
- sala multiplayer por codigo
- relay minimo para jogo casual

## Rodar localmente

1. Instale as dependencias:
   - `npm install`
2. Rode o frontend:
   - `npm run dev`

Se quiser testar a sala com relay local:

1. Rode o relay:
   - `npm run relay`
2. Crie um `.env` com:
   - `VITE_BATTLE_ROOM_RELAY_URL=http://localhost:3010`
3. Rode o frontend:
   - `npm run dev`

## Deploy

O guia completo de deploy esta em:

- [DEPLOY.md](./DEPLOY.md)

## Android WebView

O repositorio agora inclui um app Android nativo em:

- `android-app/`

Esse app usa `WebView` proprio e carrega a versao hospedada do jogo em:

- `https://syllable-battle.vercel.app/`

Fluxo rapido:

1. Configure `ANDROID_HOME` ou `ANDROID_SDK_ROOT`.
2. Rode:
   - `npm run android:build`
3. Para instalar no dispositivo com `adb`:
   - `npm run android:install`

Se quiser mudar a URL remota do app Android, ajuste:

- `android-app/app/src/main/res/values/strings.xml`
