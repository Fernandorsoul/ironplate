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

type LoginModalProps = {
  visible: boolean;
  onClose: () => void;
  onForgotPassword: () => void;
  onRegister: () => void;
};

export function LoginModal({
  visible,
  onClose,
  onForgotPassword,
  onRegister,
}: LoginModalProps) {
  const { login } = useApp();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const isCompact = width < 640;

  useEffect(() => {
    if (!visible) {
      setPassword('');
      setShowPassword(false);
    }
  }, [visible]);

  const handleLogin = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Email inválido', 'Digite um email válido para continuar.');
      return;
    }

    if (!password) {
      Alert.alert('Senha obrigatória', 'Digite sua senha para continuar.');
      return;
    }

    setLoading(true);
    try {
      const success = await login(email.trim(), password);
      if (!success) {
        Alert.alert('Não foi possível entrar', 'Confira seu email e sua senha e tente novamente.');
      }
    } catch (error) {
      Alert.alert('Erro ao entrar', 'O login não pôde ser concluído agora. Tente novamente.');
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
        <Pressable
          style={[styles.backdrop, isCompact && styles.backdropCompact]}
          onPress={onClose}
        >
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
                  accessibilityLabel="Fechar"
                  hitSlop={12}
                  style={styles.closeButton}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Ionicons name="close" size={23} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.eyebrow}>BEM-VINDO DE VOLTA</Text>
              <Text accessibilityRole="header" style={styles.title}>Entre na sua conta</Text>
              <Text style={styles.subtitle}>
                Continue de onde parou e acompanhe sua evolução.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={19} color={COLORS.textMuted} />
                  <TextInput
                    accessibilityLabel="Email"
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
                <View style={styles.passwordLabelRow}>
                  <Text style={styles.label}>Senha</Text>
                  <TouchableOpacity onPress={onForgotPassword} disabled={loading}>
                    <Text style={styles.forgotText}>Esqueceu a senha?</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={19} color={COLORS.textMuted} />
                  <TextInput
                    accessibilityLabel="Senha"
                    style={styles.input}
                    placeholder="Digite sua senha"
                    placeholderTextColor={COLORS.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="done"
                    onSubmitEditing={() => { void handleLogin(); }}
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
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.submitButton, loading && styles.buttonDisabled]}
                onPress={() => { void handleLogin(); }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <>
                    <Text style={styles.submitText}>Entrar</Text>
                    <Ionicons name="arrow-forward" size={19} color={COLORS.text} />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.registerRow}>
                <Text style={styles.registerPrompt}>Ainda não tem uma conta? </Text>
                <TouchableOpacity onPress={onRegister} disabled={loading}>
                  <Text style={styles.registerLink}>Cadastre-se</Text>
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
  keyboardView: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: 'rgba(7, 9, 19, 0.84)',
  },
  backdropCompact: {
    justifyContent: 'flex-end',
    padding: 0,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '92%',
    overflow: 'hidden',
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: '#33394F',
    backgroundColor: '#151827',
    ...SHADOWS.medium,
  },
  cardCompact: {
    maxWidth: '100%',
    maxHeight: '94%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  cardContent: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
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
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    lineHeight: 21,
  },
  fieldGroup: {
    marginBottom: SPACING.md,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    marginBottom: SPACING.sm,
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  forgotText: {
    marginBottom: SPACING.sm,
    color: COLORS.primaryLight,
    fontSize: FONT_SIZE.xs,
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
  buttonDisabled: {
    opacity: 0.65,
  },
  submitText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
  },
  registerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  registerPrompt: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
  registerLink: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
  },
});
