import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { saveBodyMeasurement } from '../services/database';
import { generatePDF } from '../utils/pdfGenerator';

const InputField = React.memo(({ label, value, onChangeText, placeholder }: any) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType="numeric"
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textMuted}
    />
  </View>
));

const BodyMeasurementsScreen = ({ navigation }: any) => {
  const { userId, profile, setTodayWeight } = useApp();
  
  // Basic
  const [weight, setWeight] = useState(profile?.weight?.toString() || '');
  const [height, setHeight] = useState(profile?.height?.toString() || '');
  
  // Body fat
  const [bodyFatMethod, setBodyFatMethod] = useState<'bioimpedance' | 'skinfold' | 'visual'>('visual');
  const [bodyFat, setBodyFat] = useState('');
  
  // Bioimpedance
  const [resistance, setResistance] = useState('');
  const [reactance, setReactance] = useState('');
  const [phaseAngle, setPhaseAngle] = useState('');
  
  // === DOBRAS CUTÂNEAS (mm) - Padrão CREF/CRN ===
  // Protocolo Jackson & Pollock / Petroski
  const [triceps, setTriceps] = useState('');
  const [biceps, setBiceps] = useState('');
  const [subscapular, setSubscapular] = useState('');
  const [suprailiac, setSuprailiac] = useState('');
  const [abdominal, setAbdominal] = useState('');
  const [chestSkinfold, setChestSkinfold] = useState('');
  const [axillaryMid, setAxillaryMid] = useState('');
  const [thighSkinfold, setThighSkinfold] = useState('');
  const [calfSkinfold, setCalfSkinfold] = useState('');
  
  // === CIRCUNFERÊNCIAS (cm) - Padrão CREF ===
  // Membro Superior
  const [armRelaxedRight, setArmRelaxedRight] = useState('');
  const [armRelaxedLeft, setArmRelaxedLeft] = useState('');
  const [armFlexedRight, setArmFlexedRight] = useState('');
  const [armFlexedLeft, setArmFlexedLeft] = useState('');
  const [forearmRight, setForearmRight] = useState('');
  const [forearmLeft, setForearmLeft] = useState('');
  const [wristRight, setWristRight] = useState('');
  const [wristLeft, setWristLeft] = useState('');
  
  // Tronco
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [abdomen, setAbdomen] = useState('');
  const [hip, setHip] = useState('');
  
  // Membro Inferior
  const [thighProximalRight, setThighProximalRight] = useState('');
  const [thighProximalLeft, setThighProximalLeft] = useState('');
  const [thighMidRight, setThighMidRight] = useState('');
  const [thighMidLeft, setThighMidLeft] = useState('');
  const [calfRight, setCalfRight] = useState('');
  const [calfLeft, setCalfLeft] = useState('');
  const [ankleRight, setAnkleRight] = useState('');
  const [ankleLeft, setAnkleLeft] = useState('');
  
  // Other
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');

  const handleSave = async () => {
    setStatusMessage('');
    setStatusType('');

    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight < 30 || parsedWeight > 300) {
      setStatusMessage('Peso inválido (30-300 kg)');
      setStatusType('error');
      return;
    }

    if (!userId) {
      setStatusMessage('Usuário não autenticado');
      setStatusType('error');
      return;
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      await saveBodyMeasurement(userId, {
        date: today,
        weight: parsedWeight,
        height: height ? parseFloat(height) : undefined,
        bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
        bodyFatMethod,
        // Bioimpedance
        resistance: resistance ? parseFloat(resistance) : undefined,
        reactance: reactance ? parseFloat(reactance) : undefined,
        phaseAngle: phaseAngle ? parseFloat(phaseAngle) : undefined,
        // Skinfolds
        triceps: triceps ? parseFloat(triceps) : undefined,
        biceps: biceps ? parseFloat(biceps) : undefined,
        subscapular: subscapular ? parseFloat(subscapular) : undefined,
        suprailiac: suprailiac ? parseFloat(suprailiac) : undefined,
        abdominal: abdominal ? parseFloat(abdominal) : undefined,
        thighSkinfold: thighSkinfold ? parseFloat(thighSkinfold) : undefined,
        chestSkinfold: chestSkinfold ? parseFloat(chestSkinfold) : undefined,
        axillaryMid: axillaryMid ? parseFloat(axillaryMid) : undefined,
        calfSkinfold: calfSkinfold ? parseFloat(calfSkinfold) : undefined,
        // Circumferences - Upper limb
        armRelaxedRight: armRelaxedRight ? parseFloat(armRelaxedRight) : undefined,
        armRelaxedLeft: armRelaxedLeft ? parseFloat(armRelaxedLeft) : undefined,
        armFlexedRight: armFlexedRight ? parseFloat(armFlexedRight) : undefined,
        armFlexedLeft: armFlexedLeft ? parseFloat(armFlexedLeft) : undefined,
        forearmRight: forearmRight ? parseFloat(forearmRight) : undefined,
        forearmLeft: forearmLeft ? parseFloat(forearmLeft) : undefined,
        wristRight: wristRight ? parseFloat(wristRight) : undefined,
        wristLeft: wristLeft ? parseFloat(wristLeft) : undefined,
        // Trunk
        chestCircumference: chest ? parseFloat(chest) : undefined,
        waistCircumference: waist ? parseFloat(waist) : undefined,
        abdomenCircumference: abdomen ? parseFloat(abdomen) : undefined,
        hipCircumference: hip ? parseFloat(hip) : undefined,
        // Lower limb
        thighProximalRight: thighProximalRight ? parseFloat(thighProximalRight) : undefined,
        thighProximalLeft: thighProximalLeft ? parseFloat(thighProximalLeft) : undefined,
        thighMidRight: thighMidRight ? parseFloat(thighMidRight) : undefined,
        thighMidLeft: thighMidLeft ? parseFloat(thighMidLeft) : undefined,
        calfRight: calfRight ? parseFloat(calfRight) : undefined,
        calfLeft: calfLeft ? parseFloat(calfLeft) : undefined,
        ankleRight: ankleRight ? parseFloat(ankleRight) : undefined,
        ankleLeft: ankleLeft ? parseFloat(ankleLeft) : undefined,
        notes,
      });

      await setTodayWeight(parsedWeight);

      setStatusMessage('Medidas salvas com sucesso!');
      setStatusType('success');
      
      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 2000);
      
    } catch (error: any) {
      console.error('Error saving measurements:', error);
      setStatusMessage(`Erro: ${error?.message || 'Erro desconhecido'}`);
      setStatusType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const data = {
        profile, weight: parseFloat(weight) || 0, height: parseFloat(height) || profile?.height || 0,
        bodyFat: parseFloat(bodyFat) || undefined, bodyFatMethod,
        resistance: parseFloat(resistance) || undefined, reactance: parseFloat(reactance) || undefined, phaseAngle: parseFloat(phaseAngle) || undefined,
        triceps: parseFloat(triceps) || undefined, biceps: parseFloat(biceps) || undefined,
        subscapular: parseFloat(subscapular) || undefined, suprailiac: parseFloat(suprailiac) || undefined,
        abdominal: parseFloat(abdominal) || undefined, thighSkinfold: parseFloat(thighSkinfold) || undefined,
        chestSkinfold: parseFloat(chestSkinfold) || undefined, axillaryMid: parseFloat(axillaryMid) || undefined,
        calfSkinfold: parseFloat(calfSkinfold) || undefined,
        armRelaxedRight: parseFloat(armRelaxedRight) || undefined, armRelaxedLeft: parseFloat(armRelaxedLeft) || undefined,
        armFlexedRight: parseFloat(armFlexedRight) || undefined, armFlexedLeft: parseFloat(armFlexedLeft) || undefined,
        forearmRight: parseFloat(forearmRight) || undefined, forearmLeft: parseFloat(forearmLeft) || undefined,
        wristRight: parseFloat(wristRight) || undefined, wristLeft: parseFloat(wristLeft) || undefined,
        chestCircumference: parseFloat(chest) || undefined, waistCircumference: parseFloat(waist) || undefined,
        abdomenCircumference: parseFloat(abdomen) || undefined, hipCircumference: parseFloat(hip) || undefined,
        thighProximalRight: parseFloat(thighProximalRight) || undefined, thighProximalLeft: parseFloat(thighProximalLeft) || undefined,
        thighMidRight: parseFloat(thighMidRight) || undefined, thighMidLeft: parseFloat(thighMidLeft) || undefined,
        calfRight: parseFloat(calfRight) || undefined, calfLeft: parseFloat(calfLeft) || undefined,
        ankleRight: parseFloat(ankleRight) || undefined, ankleLeft: parseFloat(ankleLeft) || undefined,
        notes,
      };
      await generatePDF(data);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Avaliação Antropométrica</Text>
        <View style={{ width: 60 }} />
      </View>
      <Text style={styles.subtitle}>Padrão CREF/CRN</Text>

      {statusMessage ? (
        <View style={[styles.statusCard, statusType === 'success' ? styles.statusSuccess : styles.statusError]}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      ) : null}

      {/* Dados Básicos */}
      <Text style={styles.sectionTitle}>Dados Básicos</Text>
      <View style={styles.row}>
        <InputField label="Peso (kg) *" value={weight} onChangeText={setWeight} placeholder="75.5" />
        <InputField label="Altura (cm)" value={height} onChangeText={setHeight} placeholder="175" />
      </View>

      {/* Gordura Corporal */}
      <Text style={styles.sectionTitle}>Gordura Corporal</Text>
      <View style={styles.methodRow}>
        {(['visual', 'skinfold', 'bioimpedance'] as const).map(m => (
          <TouchableOpacity key={m} style={[styles.methodButton, bodyFatMethod === m && styles.methodButtonActive]} onPress={() => setBodyFatMethod(m)}>
            <Text style={[styles.methodText, bodyFatMethod === m && styles.methodTextActive]}>
              {m === 'visual' ? 'Visual' : m === 'skinfold' ? 'Dobras' : 'Bioimpedância'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <InputField label="% Gordura Corporal" value={bodyFat} onChangeText={setBodyFat} placeholder="15" />

      {/* Bioimpedância */}
      {bodyFatMethod === 'bioimpedance' && (
        <>
          <Text style={styles.sectionTitle}>Bioimpedância</Text>
          <View style={styles.row}>
            <InputField label="Resistência (Ω)" value={resistance} onChangeText={setResistance} placeholder="500" />
            <InputField label="Reactância (Ω)" value={reactance} onChangeText={setReactance} placeholder="50" />
          </View>
          <InputField label="Ângulo de Fase (°)" value={phaseAngle} onChangeText={setPhaseAngle} placeholder="7.0" />
        </>
      )}

      {/* Dobras Cutâneas */}
      {bodyFatMethod === 'skinfold' && (
        <>
          <Text style={styles.sectionTitle}>Dobras Cutâneas (mm) - Padrão CREF</Text>
          <View style={styles.row}>
            <InputField label="Tríceps" value={triceps} onChangeText={setTriceps} placeholder="10" />
            <InputField label="Bíceps" value={biceps} onChangeText={setBiceps} placeholder="5" />
          </View>
          <View style={styles.row}>
            <InputField label="Subescapular" value={subscapular} onChangeText={setSubscapular} placeholder="15" />
            <InputField label="Supra-ilíaca" value={suprailiac} onChangeText={setSuprailiac} placeholder="12" />
          </View>
          <View style={styles.row}>
            <InputField label="Abdominal" value={abdominal} onChangeText={setAbdominal} placeholder="20" />
            <InputField label="Peitoral" value={chestSkinfold} onChangeText={setChestSkinfold} placeholder="10" />
          </View>
          <View style={styles.row}>
            <InputField label="Axilar Média" value={axillaryMid} onChangeText={setAxillaryMid} placeholder="12" />
            <InputField label="Coxa" value={thighSkinfold} onChangeText={setThighSkinfold} placeholder="15" />
          </View>
          <InputField label="Panturrilha Medial" value={calfSkinfold} onChangeText={setCalfSkinfold} placeholder="10" />
        </>
      )}

      {/* CIRCUNFERÊNCIAS */}
      <Text style={styles.sectionTitle}>Circunferências (cm) - Padrão CREF</Text>
      
      {/* Membro Superior */}
      <Text style={styles.subsectionTitle}>Membro Superior</Text>
      <View style={styles.row}>
        <InputField label="Braço Relax. D" value={armRelaxedRight} onChangeText={setArmRelaxedRight} placeholder="30" />
        <InputField label="Braço Relax. E" value={armRelaxedLeft} onChangeText={setArmRelaxedLeft} placeholder="30" />
      </View>
      <View style={styles.row}>
        <InputField label="Braço Cont. D" value={armFlexedRight} onChangeText={setArmFlexedRight} placeholder="35" />
        <InputField label="Braço Cont. E" value={armFlexedLeft} onChangeText={setArmFlexedLeft} placeholder="35" />
      </View>
      <View style={styles.row}>
        <InputField label="Antebraço D" value={forearmRight} onChangeText={setForearmRight} placeholder="28" />
        <InputField label="Antebraço E" value={forearmLeft} onChangeText={setForearmLeft} placeholder="28" />
      </View>
      <View style={styles.row}>
        <InputField label="Punho D" value={wristRight} onChangeText={setWristRight} placeholder="17" />
        <InputField label="Punho E" value={wristLeft} onChangeText={setWristLeft} placeholder="17" />
      </View>

      {/* Tronco */}
      <Text style={styles.subsectionTitle}>Tronco</Text>
      <View style={styles.row}>
        <InputField label="Tórax/Peito" value={chest} onChangeText={setChest} placeholder="100" />
        <InputField label="Cintura" value={waist} onChangeText={setWaist} placeholder="80" />
      </View>
      <View style={styles.row}>
        <InputField label="Abdômen" value={abdomen} onChangeText={setAbdomen} placeholder="85" />
        <InputField label="Quadril" value={hip} onChangeText={setHip} placeholder="95" />
      </View>

      {/* Membro Inferior */}
      <Text style={styles.subsectionTitle}>Membro Inferior</Text>
      <View style={styles.row}>
        <InputField label="Coxa Prox. D" value={thighProximalRight} onChangeText={setThighProximalRight} placeholder="55" />
        <InputField label="Coxa Prox. E" value={thighProximalLeft} onChangeText={setThighProximalLeft} placeholder="55" />
      </View>
      <View style={styles.row}>
        <InputField label="Coxa Média D" value={thighMidRight} onChangeText={setThighMidRight} placeholder="50" />
        <InputField label="Coxa Média E" value={thighMidLeft} onChangeText={setThighMidLeft} placeholder="50" />
      </View>
      <View style={styles.row}>
        <InputField label="Panturrilha D" value={calfRight} onChangeText={setCalfRight} placeholder="38" />
        <InputField label="Panturrilha E" value={calfLeft} onChangeText={setCalfLeft} placeholder="38" />
      </View>
      <View style={styles.row}>
        <InputField label="Tornozelo D" value={ankleRight} onChangeText={setAnkleRight} placeholder="23" />
        <InputField label="Tornozelo E" value={ankleLeft} onChangeText={setAnkleLeft} placeholder="23" />
      </View>

      {/* Observações */}
      <Text style={styles.sectionTitle}>Observações</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        style={[styles.input, styles.textArea]}
        placeholder="Observações do profissional..."
        placeholderTextColor={COLORS.textMuted}
        multiline
        numberOfLines={3}
      />

      {/* Valores Calculados */}
      <View style={styles.calculatedSection}>
        <Text style={styles.calculatedTitle}>Composição Corporal</Text>
        <View style={styles.calculatedRow}>
          <View style={styles.calculatedItem}>
            <Text style={styles.calculatedLabel}>IMC</Text>
            <Text style={styles.calculatedValue}>
              {weight && height ? (parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1) : '---'}
            </Text>
          </View>
          <View style={styles.calculatedItem}>
            <Text style={styles.calculatedLabel}>Massa Magra</Text>
            <Text style={styles.calculatedValue}>
              {weight && bodyFat ? (parseFloat(weight) * (1 - parseFloat(bodyFat) / 100)).toFixed(1) : '---'} kg
            </Text>
          </View>
          <View style={styles.calculatedItem}>
            <Text style={styles.calculatedLabel}>Massa Gorda</Text>
            <Text style={styles.calculatedValue}>
              {weight && bodyFat ? (parseFloat(weight) * (parseFloat(bodyFat) / 100)).toFixed(1) : '---'} kg
            </Text>
          </View>
        </View>
        {waist && hip ? (
          <View style={styles.ratioRow}>
            <Text style={styles.ratioLabel}>RCQ: </Text>
            <Text style={styles.ratioValue}>{(parseFloat(waist) / parseFloat(hip)).toFixed(2)}</Text>
          </View>
        ) : null}
      </View>

      {/* Botões */}
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={handleSave} style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleExportPDF} style={[styles.button, styles.pdfButton]}>
          <Text style={styles.buttonText}>📄 Exportar PDF</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: SPACING.md, backgroundColor: COLORS.background },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.xl, marginBottom: SPACING.xs },
  backButton: { color: COLORS.primary, fontSize: FONT_SIZE.md },
  header: { fontSize: FONT_SIZE.xl, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  statusCard: { padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.md },
  statusSuccess: { backgroundColor: '#00B89433', borderWidth: 1, borderColor: '#00B894' },
  statusError: { backgroundColor: '#FF6B6B33', borderWidth: 1, borderColor: '#FF6B6B' },
  statusText: { color: COLORS.text, fontSize: FONT_SIZE.md, textAlign: 'center', fontWeight: '600' },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.primary, marginTop: SPACING.lg, marginBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: SPACING.xs },
  subsectionTitle: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.sm },
  row: { flexDirection: 'row', gap: SPACING.md },
  fieldContainer: { flex: 1, marginBottom: SPACING.md },
  label: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  input: { height: 44, borderColor: COLORS.border, borderWidth: 1, borderRadius: BORDER_RADIUS.sm, paddingHorizontal: SPACING.sm, fontSize: FONT_SIZE.sm, color: COLORS.text, backgroundColor: COLORS.surface },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: SPACING.sm },
  methodRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  methodButton: { flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  methodButtonActive: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceLight },
  methodText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  methodTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  calculatedSection: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.md },
  calculatedTitle: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.md },
  calculatedRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calculatedItem: { flex: 1, alignItems: 'center' },
  calculatedLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  calculatedValue: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.primary },
  ratioRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  ratioLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  ratioValue: { color: COLORS.primary, fontSize: FONT_SIZE.lg, fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  button: { flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  saveButton: { backgroundColor: COLORS.accent },
  pdfButton: { backgroundColor: COLORS.primary },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: FONT_SIZE.md, color: COLORS.background, fontWeight: 'bold' },
});

export default BodyMeasurementsScreen;
