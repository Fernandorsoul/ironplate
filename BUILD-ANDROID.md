# Build Android do IronPlate

Este guia descreve os perfis EAS existentes no repositório. Um build concluído não substitui os testes em aparelho físico, principalmente para Bluetooth, câmera, galeria, SecureStore, PDF e compartilhamento.

## Pré-requisitos

- Node.js 22.13 ou superior.
- Dependências instaladas com `npm ci`.
- Conta com acesso ao projeto Expo `fernandorsouls-team/fernando`.
- EAS CLI autenticado.
- Variáveis públicas de produção configuradas para o profile/build.

```bash
npm install --global eas-cli
eas login
eas whoami
```

Antes do build, valide o projeto:

```bash
npm test -- --runInBand
npm run typecheck
npm run lint
npx expo config --type public
```

## Perfis definidos em `eas.json`

| Profile | Artefato Android | Distribuição | Uso |
| --- | --- | --- | --- |
| `development` | Development build | Interna | Desenvolvimento com módulos nativos |
| `preview` | APK | Interna | Instalação direta e homologação |
| `production` | AAB | Loja | Google Play |

### APK de homologação

```bash
eas build --platform android --profile preview
```

### AAB de produção

```bash
eas build --platform android --profile production
```

### Envio à Google Play

```bash
eas submit --platform android --profile production
```

O profile de submit aponta para a track `production`. Confirme package, assinatura, versão e rollout no Play Console antes de concluir.

## Configuração relevante

- Package Android: `com.rsoul.ironplate`.
- Projeto EAS: `61e15f61-c0fc-47bd-8b0e-003e3a8de2f7`.
- `usesCleartextTraffic` está desabilitado; a API de produção precisa usar HTTPS.
- `react-native-ble-plx`, `expo-secure-store`, `expo-image-picker` e `expo-build-properties` são plugins nativos.
- O aplicativo não usa `expo-sqlite`. Dados do usuário são persistidos no Neon pela API.
- AsyncStorage é usado somente para remoção do cache legado.

## Variáveis do aplicativo nativo

No mínimo, o build distribuído precisa conhecer:

```text
EXPO_PUBLIC_API_BASE_URL=https://seu-dominio
EXPO_PUBLIC_APP_URL=https://seu-dominio
```

- `EXPO_PUBLIC_API_BASE_URL` aponta para a origem que atende `/api`.
- `EXPO_PUBLIC_APP_URL` precisa corresponder à origem canônica dos links de recuperação.
- Segredos como `DATABASE_URL`, `JWT_SECRET` e `RESEND_API_KEY` pertencem apenas à API/infraestrutura e não devem entrar no bundle Expo.

## Recursos nativos que exigem teste físico

### Balança Bluetooth

O BLE não funciona no build web. Em Android, teste:

1. solicitação e negação de permissões;
2. Android abaixo da API 31, que usa permissão de localização para scan;
3. Android 12 ou superior, com permissões Bluetooth;
4. Bluetooth desligado e ligado durante o fluxo;
5. descoberta, conexão, leitura estável, cancelamento e nova tentativa;
6. registro do peso no Neon após receber a leitura.

Os parsers implementados não garantem compatibilidade com todo modelo ou firmware. Consulte [BLESCALES.md](BLESCALES.md).

### Atenção às permissões geradas

Na revisão atual, `npx expo config --type public` resolve `BLUETOOTH`, `BLUETOOTH_ADMIN` e `BLUETOOTH_CONNECT` no bloco Android. O serviço também solicita `BLUETOOTH_SCAN` em Android 12+ e localização em versões anteriores. Portanto, antes de considerar o BLE pronto para distribuição:

1. gere/prebuild o projeto nativo;
2. inspecione o AndroidManifest final;
3. confirme que as permissões solicitadas em runtime também estão declaradas;
4. corrija `app.json`/config plugin se alguma estiver ausente;
5. repita o teste em aparelho nas versões de Android suportadas.

### Sessão

- Faça login, feche o aplicativo e abra novamente.
- Confirme a restauração via SecureStore.
- Confirme logout e invalidação local após resposta `401`.

### PDF e compartilhamento

- Exporte um plano alimentar.
- Exporte uma avaliação corporal.
- Confirme abertura do seletor de compartilhamento e integridade do arquivo.
- Teste conteúdo com caracteres especiais para validar o escape do HTML.

### Foto de perfil

- Teste seleção da galeria e câmera.
- Confirme persistência e nova exibição após reiniciar o app.

## Checklist de homologação

- [ ] CI do commit aprovado.
- [ ] `npx expo config --type public` sem erro.
- [ ] APK instalado em um Android compatível.
- [ ] Login, cadastro, onboarding e recuperação de senha testados.
- [ ] Peso manual e plano ativo persistem após reabrir o app.
- [ ] Grade de ações rápidas permanece dentro da tela pequena.
- [ ] PDFs e compartilhamento nativos testados.
- [ ] Permissões de câmera, galeria e BLE testadas.
- [ ] Balança real testada quando a release alterar BLE.
- [ ] API de produção usa HTTPS e a versão não contém segredos.

## Problemas comuns

### O app não alcança a API

- Confira `EXPO_PUBLIC_API_BASE_URL` no build.
- Não use `localhost` para um backend executado no computador sem configurar a rede do aparelho.
- Confirme HTTPS, CORS e disponibilidade de `/api`.

### O scan BLE não inicia

- Confirme Bluetooth e permissões do aplicativo.
- Em Android antigo, confirme também localização/GPS.
- Feche o aplicativo oficial da balança para evitar competição pela conexão.
- Valide as permissões efetivas no AndroidManifest gerado pelo build.

### O build de produção gera AAB, não APK

Esse é o comportamento definido em `eas.json`. Use o profile `preview` para obter um APK instalável diretamente.

## Referências internas

- Configuração Expo: `app.json`.
- Perfis EAS: `eas.json`.
- Serviço BLE: `src/services/bluetoothScale.ts`.
- Sessão: `src/services/session.ts`.
- Deploy web/API: [RELEASE.md](RELEASE.md).
