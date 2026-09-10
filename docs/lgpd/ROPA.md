# ROPA — Registro de Operações de Processamento de Dados Pessoais

**Aplicativo:** IronPlate
**Controlador:** RSoul Fábrica de Software
**Base legal do documento:** Art. 37 da Lei nº 13.709/2018 (LGPD)
**Última atualização:** 08/09/2026

Este documento registra as operações de tratamento de dados pessoais realizadas pelo aplicativo IronPlate, conforme previsto no Art. 37 da LGPD, e deve ser atualizado sempre que uma nova operação de tratamento for criada ou modificada.

## 1. Visão geral

O IronPlate é um aplicativo de nutrição e acompanhamento fitness. Os dados pessoais são tratados em dois ambientes:

| Ambiente | Descrição |
| --- | --- |
| Dispositivo do titular | Coleta dos dados no app e cache local (AsyncStorage) para funcionamento offline |
| Nuvem | API serverless hospedada na Vercel com banco de dados PostgreSQL gerenciado pela Neon |

### Agentes de tratamento

| Agente | Papel | Observações |
| --- | --- | --- |
| RSoul Fábrica de Software | Controlador | Toma as decisões sobre o tratamento de dados |
| Fernando Ramos | Encarregado (DPO) | Canal entre controlador, titulares e ANPD — ver [DPO.md](./DPO.md) |
| Vercel Inc. | Operador | Hospedagem e execução da API; tráfego exclusivamente HTTPS |
| Neon | Operador | Banco de dados PostgreSQL com criptografia em trânsito e em repouso |

### Transferência internacional

Os operadores Vercel e Neon possuem infraestrutura fora do Brasil. Eventuais transferências internacionais de dados ocorrem exclusivamente para a execução do serviço e com fornecedores que adotam medidas de segurança compatíveis com a LGPD (Art. 33).

## 2. Operações de tratamento por categoria de dados

### 2.1 Cadastro

| Item | Descrição |
| --- | --- |
| Dados tratados | Nome; e-mail; senha (nunca armazenada em texto puro — apenas hash SHA-256 com 10.000 iterações e salt único de 32 bytes); identificador interno da conta (UUID); datas de criação e atualização; tokens de recuperação de senha (uso único, validade de 15 minutos) |
| Finalidade | Criação da conta, autenticação, recuperação de acesso, identificação do titular e comunicações necessárias ao serviço |
| Base legal | Execução de contrato ou de procedimentos preliminares a contrato — Art. 7º, inciso V, da LGPD |
| Retenção | Enquanto a conta estiver ativa. Na exclusão da conta (função de exclusão no app / endpoint DELETE /api/users/delete), todos os registros são removidos imediatamente; cópias de segurança (backups) são eliminadas em até 90 dias, conforme política de privacidade publicada no app |
| Medidas de segurança | Hash de senha com salt único; rate limiting de autenticação (5 tentativas por minuto) e de cadastro (3 tentativas a cada 10 minutos); respostas de erro genéricas para impedir enumeração de e-mails; HTTPS obrigatório; consultas SQL parametrizadas |

### 2.2 Perfil

| Item | Descrição |
| --- | --- |
| Dados tratados | Idade; peso; altura; gênero; nível de atividade física; objetivo (ganho de massa, cutting ou manutenção); esporte (musculação ou jiu-jitsu) |
| Finalidade | Cálculo das necessidades calóricas e de macronutrientes; personalização de planos alimentares e de treino; geração de relatórios de progresso |
| Base legal | Execução de contrato — Art. 7º, inciso V, da LGPD |
| Retenção | Enquanto a conta estiver ativa; remoção imediata na exclusão da conta; backups eliminados em até 90 dias |
| Medidas de segurança | HTTPS obrigatório; consultas SQL parametrizadas; rate limiting geral (30 requisições por minuto); acesso do titular e, somente quando autorizado por consentimento granular ativo, de profissional verificado |

### 2.3 Saúde (dados sensíveis)

| Item | Descrição |
| --- | --- |
| Dados tratados | Composição corporal e bioimpedância: percentual de gordura corporal e método de aferição; resistência, reatância e ângulo de fase (obtidos por balança de bioimpedância via Bluetooth); massa muscular; músculo esquelético; água corporal (percentual e kg); massa óssea; proteína (percentual e massa); metabolismo basal; gordura visceral; dobras cutâneas (tricipital, bicipital, subescapular, suprailíaca, abdominal, peitoral, axilar média, coxa e panturrilha); perímetros corporais (braços, antebraços, punhos, tórax, cintura, abdômen, quadril, coxas, panturrilhas e tornozelos); métricas derivadas (massa magra, massa gorda, IMC e relação cintura-quadril); notas livres; peso e altura na data da medição |
| Finalidade | Acompanhamento da composição corporal e da evolução de bioimpedância; ajuste de planos nutricionais e de treino; relatórios de progresso do titular |
| Base legal | Consentimento do titular — Art. 11, inciso I, da LGPD (dados sensíveis) |
| Retenção | Enquanto a conta estiver ativa. A revogação encerra imediatamente o acesso profissional aos dados originais, sem apagar o histórico de consentimento e os documentos cuja retenção seja exigida; exclusão da conta e backups seguem os prazos aplicáveis |
| Medidas de segurança | Controles das demais categorias e proteção reforçada para dados sensíveis: acesso do titular e de profissional verificado apenas nas categorias consentidas; criptografia em trânsito (HTTPS) e em repouso; auditoria de acesso e revogação imediata |

### 2.4 Uso

| Item | Descrição |
| --- | --- |
| Dados tratados | Logs diários de refeições (alimentos, quantidades em gramas, macronutrientes e horários); logs de treinos (nome, tipo, duração, intensidade e horário); peso registrado no dia; notas livres; planos alimentares (nome, objetivo, refeições e macronutrientes totais); histórico de peso (data, peso e percentual de gordura); alimentos customizados (nome, categoria e macronutrientes) |
| Finalidade | Registro diário de alimentação e exercícios; análise de adesão e resumos semanais; geração e manutenção de planos alimentares; acompanhamento da evolução de peso |
| Base legal | Execução de contrato — Art. 7º, inciso V, da LGPD. Observação: registros do histórico de peso que contenham percentual de gordura recebem o mesmo nível de proteção da categoria Saúde |
| Retenção | Enquanto a conta estiver ativa; remoção imediata na exclusão da conta; backups eliminados em até 90 dias |
| Medidas de segurança | HTTPS obrigatório; consultas SQL parametrizadas; rate limiting; acesso do titular e acesso profissional condicionado a credencial verificada, vínculo ativo e categoria consentida |

### 2.5 Dados de dispositivo (conforme política de privacidade do app)

| Item | Descrição |
| --- | --- |
| Dados tratados | Tipo de dispositivo e versão do aplicativo |
| Finalidade | Diagnóstico de erros, compatibilidade e melhoria contínua do serviço |
| Base legal | Legítimo interesse — Art. 7º, inciso IX, da LGPD (uso limitado ao mínimo necessário) |
| Retenção | Pelo período necessário ao diagnóstico; não associados à conta |
| Medidas de segurança | Coleta mínima e sem associação a dados sensíveis |

### 2.6 Compartilhamento com profissionais

| Item | Descrição |
| --- | --- |
| Dados tratados | Identidade e registro verificado do profissional; finalidade e duração do vínculo; categorias solicitadas e concedidas; histórico de aceite, limitação e revogação; documentos produzidos no atendimento |
| Finalidade | Permitir acompanhamento por nutricionista e/ou profissional de educação física escolhido pelo aluno |
| Base legal | Consentimento específico, destacado e granular do titular, inclusive para dados sensíveis — Arts. 7º, I, e 11, I, da LGPD |
| Retenção | O acesso aos dados originais termina imediatamente na revogação ou expiração. Documentos produzidos pelo profissional são mantidos somente pelo prazo definido em obrigação legal ou contrato aplicável, com acesso do aluno |
| Medidas de segurança | Convite com token de uso único e prazo; token armazenado somente como hash; verificação profissional; vínculo ativo; autorização por categoria no servidor; consentimentos append-only; auditoria de convite, acesso, conteúdo e revogação |

### 2.7 CPF administrativo opcional

| Item | Descrição |
| --- | --- |
| Dados tratados | CPF informado e confirmado pelo aluno; finalidade operacional; data de autorização; apenas os **dois últimos dígitos** para exibição mascarada (minimização — a coluna legada `last_four` é preenchida só com o sufixo exibível) |
| Finalidade | Organização administrativa e localização exata de aluno que já pertence à carteira ativa do profissional |
| Base legal | Consentimento específico do titular e princípio da necessidade — Arts. 7º, I, e 6º, III, da LGPD |
| Retenção | Enquanto necessário e autorizado. O aluno pode corrigir ou remover o CPF; exclusão da conta remove o dado e seu índice. A revogação do vínculo encerra imediatamente a pesquisa pelo profissional |
| Medidas de segurança | AES-256-GCM em nível de aplicação; índice HMAC-SHA-256 com chave distinta; segredos apenas no servidor; respostas e exportações mascaradas; pesquisa somente por CPF completo dentro da carteira ativa; rate limit e auditoria sem CPF ou hash |

### 2.8 Auditoria (audit_logs)

| Item | Descrição |
| --- | --- |
| Dados tratados | Identificadores internos de ator e sujeito (UUID), ação, tipo e id da entidade, metadados operacionais (sem CPF, senha ou token em claro) |
| Finalidade | Trilha de segurança e prova de consentimento/acesso profissional |
| Base legal | Legítimo interesse e obrigação legal/regulatória de segurança — Arts. 7º, IX, e 46 da LGPD |
| Retenção | Trilha mantida para segurança. Na exclusão da conta, `actor_user_id`, `subject_user_id` e `metadata_json` são **anonimizados** (nulos); a ação permanece sem vínculo ao titular |
| Medidas de segurança | Logs sem segredos; exportação restrita ao próprio titular; rate limit e autenticação |

## 3. Direitos do titular (Art. 18 da LGPD)

O titular pode solicitar ao Encarregado, a qualquer momento:

- confirmação da existência de tratamento e acesso aos dados;
- correção de dados incompletos, inexatos ou desatualizados;
- anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;
- portabilidade dos dados;
- eliminação dos dados tratados com o seu consentimento;
- informação sobre o compartilhamento de dados com terceiros;
- revogação do consentimento.

Canais de atendimento: a função de exclusão de conta disponível no próprio app remove imediatamente os registros de todas as tabelas; os demais direitos podem ser exercidos pelo e-mail do Encarregado: privacy@rsoul.com.br.

## 4. Revisão

Este ROPA deve ser revisado pelo Encarregado sempre que houver mudança relevante nas operações de tratamento e, no mínimo, uma vez por ano.

### Histórico de revisões

| Data | Alteração |
| --- | --- |
| 10/09/2026 | Anonimização de auditoria na exclusão da conta; minimização do sufixo do CPF |
| 08/09/2026 | Inclusão de vínculos profissionais e consentimento granular |
| 28/08/2026 | Versão inicial do ROPA |
