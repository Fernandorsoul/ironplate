import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import * as Database from '../services/database';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const handleVerifyEmail = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Erro', 'Digite um email válido');
      return;
    }

    setLoading(true);
    try {
      const user = await Database.getUserByEmail(email.trim());
      if (user) {
        setUserId(user.id);
        setStep('reset');
      } else {
        Alert.alert('Erro', 'Email não encontrado');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível verificar o email');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      if (userId) {
        await Database.resetPassword(userId, newPassword);
        Alert.alert('Sucesso', 'Senha alterada com sucesso!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível alterar a senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Recuperar Senha</Text>

        {step === 'email' ? (
          <>
            <Text style={styles.subtitle}>
              Digite seu email para verificar sua conta
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyEmail}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Verificando...' : 'Verificar Email'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Digite sua nova senha
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nova senha (mínimo 6 caracteres)"
              placeholderTextColor={COLORS.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <TextInput
              style={styles.input}
              placeholder="Confirmar nova senha"
              placeholderTextColor={COLORS.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Alterando...' : 'Alterar Senha'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  backButton: {
    marginBottom: SPACING.lg,
  },
  backText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.md,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
});
