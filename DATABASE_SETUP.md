# Configuração do Banco de Dados Neon - IronPlate

## Arquitetura

```
┌─────────────────┐     fetch()      ┌─────────────────┐     SQL      ┌─────────────────┐
│                 │ ───────────────→ │                 │ ──────────→ │                 │
│  APK (Android)  │                  │  Vercel API     │             │  Neon Postgres  │
│                 │ ←─────────────── │                 │ ←────────── │                 │
└─────────────────┘                  └─────────────────┘             └─────────────────┘
        │                                    │
        │                                    │
        ▼                                    ▼
EXPO_PUBLIC_API_BASE_URL            DATABASE_URL
=https://ironplate-phi.vercel.app   =postgresql://neondb_owner:...
```

## Configuração Atual

### 1. APK (Cliente - React Native)

**Arquivo:** `.env`

```bash
# URL da API que o APK usa para se comunicar com o servidor
EXPO_PUBLIC_API_BASE_URL=https://ironplate-phi.vercel.app

# URL do app para links de recuperação de senha
EXPO_PUBLIC_APP_URL=https://ironplate-phi.vercel.app
```

**Como funciona:**
- O APK **NUNCA** conecta diretamente ao banco de dados
- Usa `fetch()` para chamar a API do Vercel
- A URL base é configurada via `EXPO_PUBLIC_API_BASE_URL`
- Código em `src/services/database.ts` (linha 28-40)

### 2. API do Vercel (Servidor)

**Arquivo:** `.env`

```bash
# Conexão pooled para a API (recomendado para serverless)
DATABASE_URL=postgresql://neondb_owner:npg_x3zw5WMKTVSO@ep-twilight-frost-acz6bvo6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Conexão direta para migrações (opcional)
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_x3zw5WMKTVSO@ep-twilight-frost-acz6bvo6.sa-east-1.aws.neon.tech/neondb?sslmode=require
```

**Como funciona:**
- Cada request do APK chega na API do Vercel
- A API usa `@neondatabase/serverless` para conectar ao Neon
- Código em `api/middleware/db.ts` (linha 10-12)
- Usa conexão pooled para melhor performance em serverless

### 3. Migrações (Desenvolvimento)

**Arquivo:** `drizzle.config.ts`

```bash
# Usa DATABASE_URL_UNPOOLED para migrações
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_x3zw5WMKTVSO@ep-twilight-frost-acz6bvo6.sa-east-1.aws.neon.tech/neondb?sslmode=require
```

**Como funciona:**
- Migrações são executadas localmente com `npm run db:migrate`
- Usa conexão direta (não pooled) para evitar problemas com transações
- Código em `scripts/migrate.ts`

## Verificação da Configuração

### ✅ APK está configurado corretamente?

```typescript
// src/services/database.ts (linha 28-40)
const configuredApiBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';

function resolveApiBase(): string {
  // Web: usa same-origin /api
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  // Native (APK): usa EXPO_PUBLIC_API_BASE_URL
  return `${configuredApiBase}/api`;
}
```

### ✅ API está configurada corretamente?

```typescript
// api/middleware/db.ts (linha 10-12)
export function getSql(): NeonQueryFunction<false, false> | null {
  const url = process.env.DATABASE_URL;
  return url ? neon(url) : null;
}
```

### ✅ Variáveis de ambiente no EAS Build?

```json
// eas.json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://ironplate-phi.vercel.app",
        "EXPO_PUBLIC_APP_URL": "https://ironplate-phi.vercel.app"
      }
    }
  }
}
```

## Como o APK Acessa o Banco

### Fluxo de uma requisição:

1. **Usuário abre o APK** → App carrega com `EXPO_PUBLIC_API_BASE_URL`
2. **Usuário faz login** → APK chama `fetch('https://ironplate-phi.vercel.app/api/users/auth')`
3. **API recebe request** → Usa `DATABASE_URL` para conectar ao Neon
4. **API consulta banco** → Executa SQL via `@neondatabase/serverless`
5. **API retorna resposta** → JSON enviado de volta ao APK
6. **APK exibe dados** → Renderiza na tela

### Exemplo de código no APK:

```typescript
// src/services/database.ts
export async function authenticateUser(email: string, password: string) {
  const response = await apiFetch('/users/auth', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, false);
  if (!response.ok) return null;
  return await response.json() as AuthenticatedUser;
}
```

## Segurança

### ✅ O que está correto:

1. **APK nunca acessa o banco diretamente** → Não expõe credenciais
2. **DATABASE_URL fica no servidor** → Nunca no cliente
3. **JWT para autenticação** → Tokens seguros com expiração
4. **CORS configurado** → Apenas origens permitidas
5. **Rate limiting** → Proteção contra abuso
6. **Validação Zod** → Todos os inputs validados

### ⚠️ Recomendações:

1. **Rotacione a senha do banco** periodicamente
2. **Use variáveis de ambiente no Vercel** → Nunca commite `.env`
3. **Habilite SSL** → Já está com `sslmode=require`
4. **Monitore logs** → Use o dashboard do Vercel

## Troubleshooting

### APK não conecta à API:

1. Verifique se `EXPO_PUBLIC_API_BASE_URL` está correto
2. Verifique se o Vercel está online
3. Teste a API diretamente: `curl https://ironplate-phi.vercel.app/api/users/auth`

### API não conecta ao banco:

1. Verifique se `DATABASE_URL` está configurado no Vercel
2. Verifique se o Neon está online
3. Teste a conexão: `psql $DATABASE_URL`

### Migrações falham:

1. Verifique se `DATABASE_URL_UNPOOLED` está configurado
2. Use conexão direta (não pooled)
3. Execute: `npm run db:migrate`

## Próximos Passos

1. ✅ Configuração completa
2. ✅ APK configurado para usar API
3. ✅ API configurada para usar Neon
4. 🔄 Testar no dispositivo real
5. 🔄 Gerar APK: `eas build --platform android --profile preview`

## URLs Importantes

- **API:** https://ironplate-phi.vercel.app
- **Neon Console:** https://console.neon.tech
- **Vercel Dashboard:** https://vercel.com/dashboard
- **EAS Build:** https://expo.dev/builds