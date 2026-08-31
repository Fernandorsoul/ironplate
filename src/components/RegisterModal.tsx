import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SHADOWS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';

type RegisterModalProps = {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
  onPrivacyPolicy: () => void;
};

export function RegisterModal({
  visible,
  onClose,
  onLogin,
  onPrivacyPolicy,
}: RegisterModalProps) {
  const { register } = useApp();
  const { width } = useWindowDimensions();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const isCompact = width < 640;

  useEffect(() => {
    if (!visible) {
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setAcceptedPrivacy(false);
    }
  }, [visible]);

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Nome obrigatório', 'Digite seu nome para criar a conta.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Email inválido', 'Digite um email válido para continuar.');
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      Alert.alert('Senha inválida', 'Use pelo menos 8 caracteres, incluindo uma letra e um número.');
      return;
    }
    // Comparação local para feedback imediato; o servidor continua responsável pela validação final.
    // eslint-disable-next-line security/detect-possible-timing-attacks
    if (password !== confirmPassword) {
      Alert.alert('Senhas diferentes', 'A confirmação precisa ser igual à senha informada.');
      return;
    }
    if (!acceptedPrivacy) {
      Alert.alert('Privacidade', 'Aceite a Política de Privacidade para continuar.');
      return;
    }

    setLoading(true);
    try {
      const success = await register(name.trim(), email.trim(), password);
      if (!success) {
        Alert.alert('Não foi possível criar a conta', 'Este email já pode estar cadastrado.');
      }
    } catch (error) {
      Alert.alert('Erro ao criar conta', 'O cadastro não pôde ser concluído agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={[styles.backdrop, isCompact && styles.backdropCompact]} onPress={onClose}>
          <Pressable
            accessibilityRole="none"
            style={[styles.card, isCompact && styles.cardCompact]}
            onPress={(event) => event.stopPropagation()}
          >
            <ScrollView
              contentContainerStyle={styles.cardContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <View style={styles.brandMark}>
                  <Ionicons name="barbell" size={20} color={COLORS.text} />
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Fechar cadastro"
                  hitSlop={12}
                  style={styles.closeButton}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Ionicons name="close" size={23} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.eyebrow}>COMECE SUA EVOLUÇÃO</Text>
              <Text accessibilityRole="header" style={styles.title}>Crie sua conta</Text>
              <Text style={styles.subtitle}>
                Leva menos de um minuto. Depois, personalizamos suas metas e seu plano.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Nome completo</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={19} color={COLORS.textMuted} />
                  <TextInput
                    accessibilityLabel="Nome completo"
                    style={styles.input}
                    placeholder="Como você quer ser chamado?"
                    placeholderTextColor={COLORS.textMuted}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={19} color={COLORS.textMuted} />
                  <TextInput
                    accessibilityLabel="Email de cadastro"
                    style={styles.input}
                    placeholder="voce@email.com"
                    placeholderTextColor={COLORS.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Senha</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={19} color={COLORS.textMuted} />
                  <TextInput
                    accessibilityLabel="Senha de cadastro"
                    style={styles.input}
                    placeholder="Crie uma senha segura"
                    placeholderTextColor={COLORS.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="next"
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    hitSlop={10}
                    onPress={() => setShowPassword((current) => !current)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.passwordHint}>Mínimo de 8 caracteres, com uma letra e um número.</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Confirmar senha</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="shield-checkmark-outline" size={19} color={COLORS.textMuted} />
                  <TextInput
                    accessibilityLabel="Confirmar senha"
                    style={styles.input}
                    placeholder="Digite a senha novamente"
                    placeholderTextColor={COLORS.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="done"
                    onSubmitEditing={() => { void handleRegister(); }}
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                    hitSlop={10}
                    onPress={() => setShowConfirmPassword((current) => !current)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.privacyRow}>
                <TouchableOpacity
                  accessibilityRole="checkbox"
                  accessibilityLabel="Aceitar Política de Privacidade"
                  accessibilityState={{ checked: acceptedPrivacy }}
                  style={[styles.checkbox, acceptedPrivacy && styles.checkboxChecked]}
                  onPress={() => setAcceptedPrivacy((current) => !current)}
                  disabled={loading}
                >
                  {acceptedPrivacy && <Ionicons name="checkmark" size={17} color={COLORS.text} />}
                </TouchableOpacity>
                <View style={styles.privacyCopy}>
                  <Text style={styles.privacyText}>Li e aceito a </Text>
                  <TouchableOpacity onPress={onPrivacyPolicy} disabled={loading}>
                    <Text style={styles.privacyLink}>Política de Privacidade</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.submitButton, loading && styles.buttonDisabled]}
                onPress={() => { void handleRegister(); }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <>
                    <Text style={styles.submitText}>Criar conta</Text>
                    <Ionicons name="arrow-forward" size={19} color={COLORS.text} />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.loginRow}>
                <Text style={styles.loginPrompt}>Já tem uma conta? </Text>
                <TouchableOpacity onPress={onLogin} disabled={loading}>
                  <Text style={styles.loginLink}>Entrar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: 'rgba(7, 9, 19, 0.84)',
  },
  backdropCompact: { justifyContent: 'flex-end', padding: 0 },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '94%',
    overflow: 'hidden',
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: '#33394F',
    backgroundColor: '#151827',
    ...SHADOWS.medium,
  },
  cardCompact: {
    maxWidth: '100%',
    maxHeight: '96%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  cardContent: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  brandMark: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#202536',
  },
  eyebrow: {
    marginBottom: SPACING.sm,
    color: COLORS.primary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  title: { color: COLORS.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    lineHeight: 21,
  },
  fieldGroup: { marginBottom: SPACING.md },
  label: {
    marginBottom: SPACING.sm,
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  inputContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: '#343A50',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#0F1220',
  },
  input: {
    minWidth: 0,
    flex: 1,
    paddingVertical: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
  },
  passwordHint: {
    marginTop: SPACING.sm,
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    lineHeight: 17,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: '#495067',
    borderRadius: 6,
    backgroundColor: '#0F1220',
  },
  checkboxChecked: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  privacyCopy: { minWidth: 0, flex: 1, flexDirection: 'row', flexWrap: 'wrap', paddingTop: 2 },
  privacyText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, lineHeight: 20 },
  privacyLink: { color: COLORS.primaryLight, fontSize: FONT_SIZE.sm, fontWeight: '800', lineHeight: 20 },
  submitButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  buttonDisabled: { opacity: 0.65 },
  submitText: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '800' },
  loginRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  loginPrompt: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  loginLink: { color: COLORS.primaryLight, fontSize: FONT_SIZE.sm, fontWeight: '800' },
});
