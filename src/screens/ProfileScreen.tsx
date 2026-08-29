import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { exportUserData } from '../services/database';

function buildExportFileName(date: Date): string {
  return `ironplate-export-${date.toISOString().slice(0, 10)}.json`;
}

export default function ProfileScreen({ navigation }: any) {
  const { profile, targetMacros, getWeeklySummary, weightHistory, deleteAccount } = useApp();
  const [isExporting, setIsExporting] = useState(false);

  const summary = useMemo(() => getWeeklySummary(), [getWeeklySummary, targetMacros]);

  const handleExportData = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const json = JSON.stringify(await exportUserData(), null, 2);
      const fileName = buildExportFileName(new Date());

      if (Platform.OS === 'web') {
        // Web: browser download through a Blob and a temporary anchor
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Mobile: write the JSON to the cache dir and share it.
        // Native-only modules are imported lazily so web builds are not affected.
        const [{ File, Paths }, Sharing] = await Promise.all([
          import('expo-file-system'),
          import('expo-sharing'),
        ]);
        const file = new File(Paths.cache, fileName);
        file.write(json);
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Exportar meus dados',
        });
      }

      Alert.alert('Sucesso', 'Seus dados foram exportados com sucesso.');
    } catch (error) {
      console.error('Export data error:', error);
      Alert.alert('Erro', 'Não foi possível exportar seus dados. Tente novamente mais tarde.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir Conta',
      'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita e todos os seus dados serão permanentemente removidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, excluir minha conta',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Confirmação Final',
              'Esta ação é irreversível. Todos os seus dados (perfil, refeições, histórico de peso, medidas) serão excluídos permanentemente.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Sim, excluir permanentemente',
                  style: 'destructive',
                  onPress: async () => {
                    const success = await deleteAccount();
                    if (success) {
                      Alert.alert('Sucesso', 'Sua conta foi excluída com sucesso.');
                      navigation.reset({ index: 0, routes: [{ name: 'PublicHome' }] });
                    } else {
                      Alert.alert('Erro', 'Não foi possível excluir sua conta. Tente novamente.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Voltar</Text>
      </TouchableOpacity>
      <Text style={styles.header}>Meu Perfil</Text>
      {profile ? (
        <>
          <View style={styles.profileCard}>
            {profile.photoUri ? (
              <Image source={{ uri: profile.photoUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileSport}>{profile.sport}</Text>
            <Text style={styles.profileGoal}>{profile.goal}</Text>
            <TouchableOpacity style={styles.editProfileButton} onPress={() => navigation.navigate('EditProfile')}>
              <Text style={styles.editProfileText}>Editar perfil e foto</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('BodyMeasurements')}>
            <Text style={styles.menuText}>Medidas Corporais</Text>
          </TouchableOpacity>

          <View style={styles.cardsContainer}>
            <View style={styles.card}>
              <Text style={[styles.cardTitle, { color: COLORS.calories }]}>Calorias</Text>
              <Text style={styles.cardValue}>{Math.round(targetMacros?.calories || 0)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={[styles.cardTitle, { color: COLORS.protein }]}>Proteína</Text>
              <Text style={styles.cardValue}>{Math.round(targetMacros?.protein || 0)}g</Text>
            </View>
            <View style={styles.card}>
              <Text style={[styles.cardTitle, { color: COLORS.carbs }]}>Carboidratos</Text>
              <Text style={styles.cardValue}>{Math.round(targetMacros?.carbs || 0)}g</Text>
            </View>
            <View style={styles.card}>
              <Text style={[styles.cardTitle, { color: summary.adherencePercent >= 80 ? COLORS.success : summary.adherencePercent >= 50 ? COLORS.warning : COLORS.error }]}>Aderência</Text>
              <Text style={styles.cardValue}>{Math.round(summary.adherencePercent || 0)}%</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <Text style={styles.statItem}>Último Peso: {weightHistory.length > 0 ? Math.round(weightHistory[weightHistory.length - 1].weight) : '-'}</Text>
            <Text style={styles.statItem}>Altura: {profile.height} cm</Text>
            <Text style={styles.statItem}>Idade: {profile.age} anos</Text>
          </View>

          <TouchableOpacity
            style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
            onPress={handleExportData}
            disabled={isExporting}
          >
            <Text style={styles.exportButtonText}>
              {isExporting ? 'Exportando...' : 'Exportar meus dados'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.deleteButtonText}>Excluir Minha Conta</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.emptyState}>Carregando...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  backButton: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  backButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  header: {
    fontSize: FONT_SIZE.hero,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: SPACING.xl,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 4,
    alignItems: 'center',
  },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: SPACING.md },
  avatarFallback: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  avatarText: { color: COLORS.text, fontSize: FONT_SIZE.hero, fontWeight: 'bold' },
  editProfileButton: { marginTop: SPACING.md, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.primary },
  editProfileText: { color: COLORS.primary, fontWeight: '600' },
  profileName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  profileSport: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  profileGoal: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
  },
  statItem: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  emptyState: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  cardsContainer: {
    flex: 1,
  },
  card: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text,
  },
  cardValue: {
    fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text,
  },
  menuItem: {
    flex: 1,
  },
  menuText: {
    fontSize: FONT_SIZE.md, color: COLORS.textSecondary,
  },
  exportButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xxl,
  },
  deleteButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
});
