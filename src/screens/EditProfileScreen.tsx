import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { UserProfile, ActivityLevel, Goal, Sport } from '../types';
import { ACTIVITY_LEVELS } from '../constants/foods';
import { ProfileAvatar } from '../components';

const PROFILE_PHOTO_SIZE = 512;
const PROFILE_PHOTO_MAX_LENGTH = 2_000_000;

export default function EditProfileScreen({ navigation }: any) {
  const { profile, setProfile, logout } = useApp();
  
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [birthDate, setBirthDate] = useState(profile?.birthDate || '');
  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [weight, setWeight] = useState(profile?.weight?.toString() || '');
  const [height, setHeight] = useState(profile?.height?.toString() || '');
  const [gender, setGender] = useState<'male' | 'female'>(profile?.gender || 'male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile?.activityLevel || 'moderate');
  const [goal, setGoal] = useState<Goal>(profile?.goal || 'maintenance');
  const [sport, setSport] = useState<Sport>(profile?.sport || 'bodybuilding');
  const [photoUri, setPhotoUri] = useState(profile?.photoUri);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso às fotos para escolher uma imagem de perfil.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    setIsProcessingPhoto(true);
    try {
      const context = ImageManipulator.manipulate(result.assets[0].uri);
      context.resize({ width: PROFILE_PHOTO_SIZE, height: PROFILE_PHOTO_SIZE });
      const renderedImage = await context.renderAsync();
      const optimizedImage = await renderedImage.saveAsync({
        base64: true,
        compress: 0.7,
        format: SaveFormat.JPEG,
      });

      if (!optimizedImage.base64) {
        throw new Error('Image conversion did not return base64 data');
      }

      const dataUri = `data:image/jpeg;base64,${optimizedImage.base64}`;
      if (dataUri.length > PROFILE_PHOTO_MAX_LENGTH) {
        throw new Error('Optimized profile photo exceeds the supported size');
      }
      setPhotoUri(dataUri);
    } catch (error) {
      console.error('Error processing profile photo:', error);
      Alert.alert('Erro', 'Não foi possível processar a foto. Escolha outra imagem.');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleSave = async () => {
    setStatusMessage('');
    setStatusType('');

    if (!name.trim()) {
      setStatusMessage('Digite seu nome');
      setStatusType('error');
      return;
    }
    if (!age || !weight || !height) {
      setStatusMessage('Preencha idade, peso e altura');
      setStatusType('error');
      return;
    }

    setSaving(true);
    try {
      const updatedProfile: UserProfile = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        birthDate: birthDate || undefined,
        age: parseInt(age),
        weight: parseFloat(weight),
        height: parseFloat(height),
        gender,
        activityLevel,
        goal,
        sport,
        photoUri,
      };
      await setProfile(updatedProfile);
      setStatusMessage('Perfil salvo com sucesso!');
      setStatusType('success');
      
      // Navigate back after delay
      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 1500);
    } catch (error) {
      console.error('Error saving profile:', error);
      setStatusMessage('Erro ao salvar perfil');
      setStatusType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const getGoalLabel = (g: Goal) => {
    switch (g) {
      case 'bulking': return 'Bulking (+15%)';
      case 'cutting_conservative': return 'Cutting Conservador (-15%)';
      case 'cutting_preparation': return 'Preparação (-20%)';
      case 'cutting_precontest': return 'Pré-Competição (-25%)';
      case 'maintenance': return 'Manutenção';
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Editar Perfil</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Status message */}
      {statusMessage ? (
        <View style={[styles.statusCard, statusType === 'success' ? styles.statusSuccess : styles.statusError]}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      ) : null}

      {/* Photo */}
      <View style={styles.photoSection}>
        <TouchableOpacity
          style={styles.photoPlaceholder}
          onPress={handlePickPhoto}
          disabled={isProcessingPhoto}
        >
          <ProfileAvatar name={name} photoUri={photoUri} size={100} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePickPhoto} disabled={isProcessingPhoto}>
          <Text style={styles.changePhotoText}>
            {isProcessingPhoto ? 'Processando foto...' : 'Escolher foto de perfil'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Personal Info */}
      <Text style={styles.sectionTitle}>Informações Pessoais</Text>
      
      <Text style={styles.label}>Nome *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Seu nome" placeholderTextColor={COLORS.textMuted} />

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="seu@email.com" placeholderTextColor={COLORS.textMuted} keyboardType="email-address" autoCapitalize="none" />

      <Text style={styles.label}>Telefone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="(11) 99999-9999" placeholderTextColor={COLORS.textMuted} keyboardType="phone-pad" />

      <Text style={styles.label}>Data de Nascimento</Text>
      <TextInput style={styles.input} value={birthDate} onChangeText={setBirthDate} placeholder="DD/MM/AAAA" placeholderTextColor={COLORS.textMuted} />

      {/* Physical Data */}
      <Text style={styles.sectionTitle}>Dados Físicos</Text>
      
      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.label}>Idade *</Text>
          <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="25" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>Peso (kg) *</Text>
          <TextInput style={styles.input} value={weight} onChangeText={setWeight} placeholder="75" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
        </View>
      </View>

      <Text style={styles.label}>Altura (cm) *</Text>
      <TextInput style={styles.input} value={height} onChangeText={setHeight} placeholder="175" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />

      <Text style={styles.label}>Gênero</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.optionButton, gender === 'male' && styles.optionButtonActive]} onPress={() => setGender('male')}>
          <Text style={[styles.optionText, gender === 'male' && styles.optionTextActive]}>Masculino</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.optionButton, gender === 'female' && styles.optionButtonActive]} onPress={() => setGender('female')}>
          <Text style={[styles.optionText, gender === 'female' && styles.optionTextActive]}>Feminino</Text>
        </TouchableOpacity>
      </View>

      {/* Activity Level */}
      <Text style={styles.sectionTitle}>Nível de Atividade</Text>
      {(Object.keys(ACTIVITY_LEVELS) as ActivityLevel[]).map(level => (
        <TouchableOpacity key={level} style={[styles.optionButton, activityLevel === level && styles.optionButtonActive]} onPress={() => setActivityLevel(level)}>
          <Text style={[styles.optionText, activityLevel === level && styles.optionTextActive]}>{ACTIVITY_LEVELS[level].label}</Text>
        </TouchableOpacity>
      ))}

      {/* Goal */}
      <Text style={styles.sectionTitle}>Objetivo</Text>
      {(['maintenance', 'bulking', 'cutting_conservative', 'cutting_preparation', 'cutting_precontest'] as Goal[]).map(g => (
        <TouchableOpacity key={g} style={[styles.optionButton, goal === g && styles.optionButtonActive]} onPress={() => setGoal(g)}>
          <Text style={[styles.optionText, goal === g && styles.optionTextActive]}>{getGoalLabel(g)}</Text>
        </TouchableOpacity>
      ))}

      {/* Sport */}
      <Text style={styles.sectionTitle}>Modalidade</Text>
      <View style={styles.row}>
        {(['bodybuilding', 'bjj', 'both'] as Sport[]).map(s => (
          <TouchableOpacity key={s} style={[styles.optionButton, styles.thirdWidth, sport === s && styles.optionButtonActive]} onPress={() => setSport(s)}>
            <Text style={[styles.optionText, sport === s && styles.optionTextActive]}>
              {s === 'bodybuilding' ? 'Bodybuilding' : s === 'bjj' ? 'BJJ' : 'Ambos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Buttons */}
      <TouchableOpacity style={[styles.saveButton, (saving || isProcessingPhoto) && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving || isProcessingPhoto}>
        <Text style={styles.saveButtonText}>{saving ? 'Salvando...' : 'Salvar Alterações'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sair da Conta</Text>
      </TouchableOpacity>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.md, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.xl, marginBottom: SPACING.lg },
  backButton: { color: COLORS.primary, fontSize: FONT_SIZE.md },
  title: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text },
  statusCard: { padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.md },
  statusSuccess: { backgroundColor: '#00B89433', borderWidth: 1, borderColor: '#00B894' },
  statusError: { backgroundColor: '#FF6B6B33', borderWidth: 1, borderColor: '#FF6B6B' },
  statusText: { color: COLORS.text, fontSize: FONT_SIZE.md, textAlign: 'center', fontWeight: '600' },
  photoSection: { alignItems: 'center', marginBottom: SPACING.xl },
  photoPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  changePhotoText: { color: COLORS.primary, marginTop: SPACING.sm, fontWeight: '600' },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: 'bold', color: COLORS.primary, marginTop: SPACING.lg, marginBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: SPACING.xs },
  label: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  input: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: FONT_SIZE.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  halfField: { flex: 1 },
  thirdWidth: { flex: 1 },
  optionButton: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  optionButtonActive: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceLight },
  optionText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md },
  optionTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  saveButton: { backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.xl },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: 'bold' },
  logoutButton: { backgroundColor: COLORS.error, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.md },
  logoutButtonText: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: 'bold' },
});
