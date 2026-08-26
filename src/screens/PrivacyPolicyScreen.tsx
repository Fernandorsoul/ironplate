import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';

export default function PrivacyPolicyScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Política de Privacidade</Text>
        <Text style={styles.lastUpdate}>Última atualização: 25/08/2026</Text>

        <Text style={styles.sectionTitle}>1. Dados Coletados</Text>
        <Text style={styles.text}>
          Coletamos os seguintes dados para fornecer nossos serviços:
        </Text>
        <Text style={styles.bullet}>• Dados de cadastro: nome, email, senha (criptografada)</Text>
        <Text style={styles.bullet}>• Dados de perfil: idade, peso, altura, gênero</Text>
        <Text style={styles.bullet}>• Dados de saúde: composição corporal, bioimpedância, medidas corporais</Text>
        <Text style={styles.bullet}>• Dados de uso: refeições, exercícios, planos alimentares</Text>
        <Text style={styles.bullet}>• Dados de dispositivo: tipo de dispositivo, versão do app</Text>

        <Text style={styles.sectionTitle}>2. Finalidade do Tratamento</Text>
        <Text style={styles.text}>
          Os dados são utilizados para:
        </Text>
        <Text style={styles.bullet}>• Fornecer serviços de nutrição e acompanhamento fitness</Text>
        <Text style={styles.bullet}>• Personalizar planos alimentares e de treino</Text>
        <Text style={styles.bullet}>• Gerar relatórios e análises de progresso</Text>
        <Text style={styles.bullet}>• Melhorar continuamente nossos serviços</Text>
        <Text style={styles.bullet}>• Cumprir obrigações legais</Text>

        <Text style={styles.sectionTitle}>3. Base Legal</Text>
        <Text style={styles.text}>
          O tratamento dos dados é baseado em:
        </Text>
        <Text style={styles.bullet}>• <Text style={styles.bold}>Consentimento:</Text> para dados de saúde e perfil</Text>
        <Text style={styles.bullet}>• <Text style={styles.bold}>Execução de contrato:</Text> para fornecer os serviços contratados</Text>
        <Text style={styles.bullet}>• <Text style={styles.bold}>Legítimo interesse:</Text> para melhorias do serviço</Text>
        <Text style={styles.bullet}>• <Text style={styles.bold}>Obrigação legal:</Text> quando aplicável</Text>

        <Text style={styles.sectionTitle}>4. Dados Sensíveis</Text>
        <Text style={styles.text}>
          Dados de saúde (composição corporal, bioimpedância, medidas) são considerados dados sensíveis conforme Art. 5º II da LGPD e recebem proteção especial:
        </Text>
        <Text style={styles.bullet}>• Armazenamento criptografado</Text>
        <Text style={styles.bullet}>• Acesso restrito ao próprio usuário</Text>
        <Text style={styles.bullet}>• Não compartilhamento com terceiros</Text>
        <Text style={styles.bullet}>• Exclusão junto com a conta</Text>

        <Text style={styles.sectionTitle}>5. Retenção de Dados</Text>
        <Text style={styles.text}>
          Os dados são mantidos enquanto a conta estiver ativa. Após exclusão:
        </Text>
        <Text style={styles.bullet}>• Dados são removidos em até 30 dias</Text>
        <Text style={styles.bullet}>• Backups são atualizados em até 90 dias</Text>
        <Text style={styles.bullet}>• Dados anonimizados podem ser mantidos para estatísticas</Text>

        <Text style={styles.sectionTitle}>6. Direitos do Titular</Text>
        <Text style={styles.text}>
          Você tem direito a:
        </Text>
        <Text style={styles.bullet}>• Acessar seus dados</Text>
        <Text style={styles.bullet}>• Corrigir dados incompletos ou incorretos</Text>
        <Text style={styles.bullet}>• Solicitar exclusão da conta e dados</Text>
        <Text style={styles.bullet}>• Portabilidade dos dados (exportação)</Text>
        <Text style={styles.bullet}>• Revogar o consentimento</Text>
        <Text style={styles.bullet}>• Opor-se ao tratamento</Text>

        <Text style={styles.sectionTitle}>7. Compartilhamento</Text>
        <Text style={styles.text}>
          Não compartilhamos seus dados com terceiros, exceto:
        </Text>
        <Text style={styles.bullet}>• Quando exigido por lei</Text>
        <Text style={styles.bullet}>• Para proteger direitos e segurança</Text>
        <Text style={styles.bullet}>• Com seu consentimento explícito</Text>

        <Text style={styles.sectionTitle}>8. Segurança</Text>
        <Text style={styles.text}>
          Adotamos medidas técnicas para proteger seus dados:
        </Text>
        <Text style={styles.bullet}>• Criptografia em trânsito (HTTPS)</Text>
        <Text style={styles.bullet}>• Senhas hash com salt único</Text>
        <Text style={styles.bullet}>• Armazenamento seguro de dados sensíveis</Text>
        <Text style={styles.bullet}>• Monitoramento de acesso</Text>

        <Text style={styles.sectionTitle}>9. Contato do DPO</Text>
        <Text style={styles.text}>
          Para exercer seus direitos ou tirar dúvidas sobre privacidade:
        </Text>
        <Text style={styles.bullet}>Email: privacy@rsoul.com.br</Text>
        <Text style={styles.bullet}>Responsável: Departamento de Proteção de Dados - RSoul</Text>

        <Text style={styles.sectionTitle}>10. Alterações</Text>
        <Text style={styles.text}>
          Esta política pode ser atualizada. Notificaremos sobre mudanças significativas através do app ou email.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  lastUpdate: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  text: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: SPACING.sm,
  },
  bullet: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginLeft: SPACING.md,
    marginBottom: SPACING.xs,
  },
  bold: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xxl,
    marginBottom: SPACING.xxl,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
});
