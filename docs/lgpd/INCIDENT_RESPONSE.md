# Plano de Resposta a Incidentes de Segurança com Dados Pessoais

**Aplicativo:** IronPlate
**Controlador:** RSoul Fábrica de Software
**Base legal do documento:** Art. 48 da Lei nº 13.709/2018 (LGPD)
**Última atualização:** 28/08/2026

## 1. O que constitui um incidente

Incidente de segurança com dados pessoais é qualquer evento adverso, confirmado ou sob investigação, que comprometa a confidencialidade, a integridade ou a disponibilidade de dados pessoais tratados pelo IronPlate.

Exemplos de incidentes:

- acesso não autorizado à API ou ao banco de dados (Neon);
- vazamento ou exposição de credenciais e segredos de infraestrutura (por exemplo, credenciais do banco de dados ou tokens da plataforma de hospedagem);
- exposição acidental de dados pessoais em logs, mensagens de erro ou repositórios;
- perda, furto ou comprometimento de dispositivo com acesso administrativo;
- ataque bem-sucedido contra a API ou o aplicativo (por exemplo, enumeração de contas, força bruta ou injeção);
- exclusão, corrupção ou indisponibilidade não planejada de dados pessoais.

Situações que normalmente NÃO são incidentes notificáveis:

- tentativas de acesso bloqueadas pelos controles existentes (por exemplo, pelo rate limiting);
- falhas operacionais sem exposição ou comprometimento de dados pessoais.

Em caso de dúvida, o evento deve ser registrado e avaliado pelo Encarregado.

## 2. Papéis e responsabilidades

| Papel | Quem | Responsabilidades |
| --- | --- | --- |
| Coordenador da resposta e Encarregado (DPO) | Fernando Ramos — RSoul Fábrica de Software | Receber relatos; coordenar a resposta; decidir sobre a necessidade de notificação; comunicar a ANPD e os titulares |
| Equipe técnica | Desenvolvimento RSoul | Contenção, investigação, correção e recuperação |
| Patrocinador | Direção da RSoul | Aprovar comunicações e decisões com impacto no negócio |

Qualquer pessoa da organização que identificar um possível incidente deve comunicá-lo imediatamente ao Encarregado.

## 3. Fluxo de resposta

### Etapa 1 — Detecção e registro

- Registrar a data e a hora da detecção, a descrição do evento, os sistemas afetados e as evidências disponíveis;
- notificar o Encarregado imediatamente;
- preservar as evidências (logs, mensagens, telas) — não apagar nada durante a investigação.

### Etapa 2 — Contenção (meta: até 4 horas)

- Revogar ou rotacionar credenciais e tokens suspeitos;
- bloquear acessos ou endpoints comprometidos;
- em caso de comprometimento de contas, orientar a redefinição de senhas.

### Etapa 3 — Avaliação (meta: até 24 horas)

- Confirmar se houve efetivamente comprometimento de dados pessoais;
- identificar as categorias de dados afetadas (cadastro, perfil, saúde, uso), o volume e os titulares impactados;
- classificar o risco: há risco ou dano relevante aos titulares (por exemplo, exposição de dados de saúde ou de credenciais)? Se sim, o incidente é notificável.

### Etapa 4 — Notificação (prazo: 72 horas a partir do conhecimento do incidente)

- Quando houver risco ou dano relevante aos titulares, comunicar o incidente à ANPD e aos titulares afetados em até 72 horas, contadas do conhecimento do incidente, nos termos do Art. 48 da LGPD;
- utilizar os templates das seções 5 (ANPD) e 6 (titulares) deste documento;
- se as informações ainda estiverem incompletas, enviar comunicação parcial dentro do prazo e complementá-la em seguida.

### Etapa 5 — Erradicação e recuperação

- Corrigir a vulnerabilidade ou a causa raiz;
- restaurar dados a partir de backups íntegros, se necessário;
- validar que o serviço voltou a operar com segurança antes de liberar o acesso.

### Etapa 6 — Lições aprendidas (meta: até 15 dias)

- Elaborar relatório pós-incidente com cronologia, causa raiz, impactos e plano de ação;
- atualizar controles e documentos (ROPA e este plano), se aplicável;
- orientar a equipe sobre as medidas preventivas adotadas.

## 4. Registro de incidentes

Todos os incidentes — inclusive os que não forem notificados à ANPD — devem ser registrados com os seguintes campos:

| Campo | Descrição |
| --- | --- |
| Número e data | Identificação sequencial do registro e data de abertura |
| Descrição do evento | O que aconteceu |
| Sistemas e dados afetados | Sistemas, categorias de dados e volume |
| Titulares afetados | Quantidade estimada |
| Risco ou dano relevante | Sim ou não, com justificativa |
| Notificação à ANPD | Sim ou não, com data |
| Comunicação aos titulares | Sim ou não, com data |
| Medidas adotadas | Contenção, correção e prevenção |
| Status | Aberto, em análise ou encerrado |

## 5. TEMPLATE — Comunicação à ANPD

Preencher os campos entre colchetes e enviar pelo canal oficial da ANPD (https://www.gov.br/anpd).

> À Autoridade Nacional de Proteção de Dados — ANPD
>
> Comunicação de incidente de segurança com dados pessoais (Art. 48 da LGPD)
>
> 1. Descrição da natureza do incidente: [descrever o ocorrido]
> 2. Data do incidente: [dd/mm/aaaa] — Data do conhecimento: [dd/mm/aaaa]
> 3. Medidas de segurança, técnicas e administrativas adotadas pelo controlador: [listar; por exemplo, criptografia em trânsito e em repouso, hash de senhas com salt, rate limiting, consultas parametrizadas]
> 4. Riscos e danos potenciais aos titulares: [descrever]
> 5. Motivos de eventual demora na comunicação, se aplicável: [justificar]
> 6. Medidas técnicas e organizacionais adotadas para conter o incidente: [descrever]
> 7. Medidas para mitigar os riscos e danos aos titulares: [descrever]
> 8. Categorias e número de titulares afetados: [indicar, ou estimativa justificada]
> 9. Categorias e número de registros de dados pessoais afetados: [indicar]
> 10. Dados do controlador: RSoul Fábrica de Software
> 11. Dados do Encarregado (DPO): Fernando Ramos — privacy@rsoul.com.br
>
> [Local], [data].

## 6. TEMPLATE — Comunicação aos titulares

Preencher os campos entre colchetes e enviar por um canal direto com o titular (por exemplo, o e-mail cadastrado).

> Assunto: Comunicado importante sobre a segurança dos seus dados — IronPlate
>
> Prezado(a) [nome do titular],
>
> Em [data do conhecimento], tomamos conhecimento de um incidente de segurança ocorrido em [data do incidente], que envolveu [descrição simples e transparente do ocorrido].
>
> Dados pessoais que podem ter sido afetados: [listar as categorias; por exemplo, dados de cadastro, dados de saúde].
>
> Possíveis riscos: [explicar em linguagem clara e acessível].
>
> Medidas que já adotamos: [listar; por exemplo, revogação de acessos, correção da falha, reforço de controles].
>
> O que você pode fazer: [por exemplo, alterar a sua senha no aplicativo e ficar atento a mensagens suspeitas].
>
> Seguimos à disposição para esclarecimentos pelo e-mail privacy@rsoul.com.br (Encarregado de Proteção de Dados: Fernando Ramos).
>
> Atenciosamente,
> RSoul Fábrica de Software

## 7. Contatos

| Contato | Detalhe |
| --- | --- |
| Encarregado (DPO) | Fernando Ramos — privacy@rsoul.com.br |
| ANPD | https://www.gov.br/anpd |
