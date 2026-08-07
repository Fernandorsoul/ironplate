# Contribuindo com IronPlate

Obrigado por contribuir com o IronPlate! Este documento descreve como contribuir com o projeto.

## Começando

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Git
- Expo CLI (opcional)

### Setup do Ambiente

```bash
# Fork o repositório no GitHub

# Clone seu fork
git clone https://github.com/SEU_USUARIO/ironplate.git
cd ironplate

# Adicione o remote upstream
git remote add upstream https://github.com/Fernandorsoul/ironplate.git

# Instale dependências
npm install

# Rode o app
npm run web
```

## Fluxo de Trabalho

### 1. Crie uma Branch

```bash
# Atualize seu fork
git fetch upstream
git checkout master
git merge upstream/master

# Crie uma branch descritiva
git checkout -b feature/nova-feature
# ou
git checkout -b fix/corrigir-bug
```

### 2. Faça suas Mudanças

- Siga os padrões de código existentes
- Escreva testes para novas features
- Atualize a documentação se necessário

### 3. Commit suas Mudanças

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Formato: tipo: descrição
git commit -m "feat: adicionar filtro de alimentos"
git commit -m "fix: corrigir cálculo de macros"
git commit -m "docs: atualizar README"
git commit -m "test: adicionar testes para useMacros"
```

**Tipos de commit:**
- `feat:` Nova feature
- `fix:` Bug fix
- `docs:` Documentação
- `style:` Formatação (não afeta código)
- `refactor:` Refatoração (sem mudança de funcionalidade)
- `test:` Testes
- `chore:` Manutenção (dependências, config)

### 4. Push e Pull Request

```bash
# Push sua branch
git push origin feature/nova-feature

# Crie um Pull Request no GitHub
```

### 5. Pull Request

No PR, inclua:
- **Descrição clara** das mudanças
- **Screenshots** se for mudança de UI
- **Issues relacionadas** (se houver)
- **Checklist** de testes realizados

## Padrões de Código

### TypeScript

```typescript
// Use interfaces para props
interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

// Use function components
export function Button({ title, onPress, disabled }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
}
```

### Hooks

```typescript
// Prefixo use
export function useCustomHook(data: Data[]) {
  // Use useMemo para cálculos
  const result = useMemo(() => {
    return processData(data);
  }, [data]);

  return result;
}
```

### Estilos

```typescript
// Use StyleSheet.create
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
```

## Testes

### Testes Unitários

```bash
# Rode todos os testes
npm test

# Rode testes específicos
npm test -- --testPathPattern=calculations

# Rode com coverage
npm run test:coverage
```

### Testes E2E

```bash
# Rode todos os testes E2E
npm run test:e2e

# Rode smoke tests
npm run test:smoke
```

### Escrevendo Testes

```typescript
// Teste unitário
describe('calculateBMR', () => {
  it('calculates BMR for male', () => {
    const profile = { weight: 80, height: 180, age: 25, gender: 'male' };
    expect(calculateBMR(profile)).toBe(1805);
  });
});
```

## Estrutura de Arquivos

```
src/
├── components/     # Componentes reutilizáveis
├── constants/      # Configurações estáticas
├── context/        # Estado global
├── hooks/          # Custom hooks
├── screens/        # Telas
├── services/       # Serviços de dados
├── types/          # Definições TypeScript
└── utils/          # Funções utilitárias
```

### Criando um Novo Componente

1. Crie em `src/components/`
2. Exporte em `src/components/index.ts`
3. Escreva testes em `__tests__/`
4. Documente as props com interfaces

### Criando uma Nova Tela

1. Crie em `src/screens/`
2. Adicione rota em `App.tsx`
3. Escreva testes E2E em `e2e/`

## Issues

### Reportando Bugs

Inclua:
- **Descrição clara** do bug
- **Passos para reproduzir**
- **Comportamento esperado** vs atual
- **Screenshots** se aplicável
- **Ambiente** (OS, Node version, etc.)

### Solicitando Features

Inclua:
- **Problema** que resolve
- **Solução proposta**
- **Alternativas** consideradas
- **Mockups** se aplicável

## Code Review

### Para Revisores

- Verifique se os testes passam
- Revise a lógica de negócio
- Confirme que a documentação está atualizada
- Aprove com pelo menos 1 approval

### Para Autores

- Responda a todos os comentários
- Faça mudanças solicitadas
- Re-solicite review após mudanças

## Perguntas?

- Abra uma [Issue](https://github.com/Fernandorsoul/ironplate/issues)
- Comente em um PR existente

Obrigado por contribuir! 🚀
