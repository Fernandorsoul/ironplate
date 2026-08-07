// PDF Generator for Body Measurements Report - CREF/CRN Standard

import { Platform } from 'react-native';

interface PDFData {
  profile: any;
  weight: number;
  height: number;
  bodyFat?: number;
  bodyFatMethod?: string;
  resistance?: number;
  reactance?: number;
  phaseAngle?: number;
  // Skinfolds
  triceps?: number;
  biceps?: number;
  subscapular?: number;
  suprailiac?: number;
  abdominal?: number;
  chestSkinfold?: number;
  axillaryMid?: number;
  thighSkinfold?: number;
  calfSkinfold?: number;
  // Circumferences
  armRelaxedRight?: number;
  armRelaxedLeft?: number;
  armFlexedRight?: number;
  armFlexedLeft?: number;
  forearmRight?: number;
  forearmLeft?: number;
  wristRight?: number;
  wristLeft?: number;
  chestCircumference?: number;
  waistCircumference?: number;
  abdomenCircumference?: number;
  hipCircumference?: number;
  thighProximalRight?: number;
  thighProximalLeft?: number;
  thighMidRight?: number;
  thighMidLeft?: number;
  calfRight?: number;
  calfLeft?: number;
  ankleRight?: number;
  ankleLeft?: number;
  notes?: string;
}

export async function generatePDF(data: PDFData): Promise<void> {
  const { profile, weight, height, bodyFat, bodyFatMethod } = data;
  
  const bmi = weight && height ? (weight / Math.pow(height / 100, 2)).toFixed(1) : '---';
  const leanMass = weight && bodyFat ? (weight * (1 - bodyFat / 100)).toFixed(1) : '---';
  const fatMass = weight && bodyFat ? (weight * (bodyFat / 100)).toFixed(1) : '---';
  const waistHipRatio = data.waistCircumference && data.hipCircumference 
    ? (data.waistCircumference / data.hipCircumference).toFixed(2) : '---';
  
  const today = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  const tr = (v?: number) => v ? `<td>${v}</td>` : '<td>---</td>';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Avaliação Antropométrica - IronPlate</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; line-height: 1.5; font-size: 13px; }
    .header { text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #FF6B35; }
    .header h1 { color: #FF6B35; font-size: 24px; margin-bottom: 3px; }
    .header p { color: #666; font-size: 12px; }
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .section-title { background: #1A1A2E; color: white; padding: 8px 12px; font-size: 14px; font-weight: bold; margin-bottom: 10px; border-radius: 4px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 10px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px; }
    .card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 10px; }
    .card label { display: block; font-size: 10px; color: #666; margin-bottom: 3px; text-transform: uppercase; }
    .card .value { font-size: 16px; font-weight: bold; color: #1A1A2E; }
    .card .unit { font-size: 12px; color: #666; }
    .highlight { background: #FF6B3515; border-color: #FF6B35; }
    .highlight .value { color: #FF6B35; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #e9ecef; }
    th { background: #f8f9fa; font-size: 10px; text-transform: uppercase; color: #666; font-weight: bold; }
    .sub-header { background: #e9ecef; font-weight: bold; font-size: 11px; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 2px solid #e9ecef; text-align: center; color: #666; font-size: 11px; }
    .notes { background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px; margin-top: 15px; }
    .notes h4 { color: #856404; margin-bottom: 8px; font-size: 12px; }
    .notes p { color: #856404; font-size: 12px; }
    @media print { body { padding: 15px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>IRONPLATE - Avaliação Antropométrica</h1>
    <p>Padrão CREF/CRN - Conselho Regional de Educação Física e Nutrição</p>
    <p>${today}</p>
  </div>

  <div class="section">
    <div class="section-title">Dados do Paciente</div>
    <div class="grid">
      <div class="card"><label>Nome</label><div class="value">${profile?.name || '---'}</div></div>
      <div class="card"><label>Idade</label><div class="value">${profile?.age || '---'} <span class="unit">anos</span></div></div>
      <div class="card"><label>Gênero</label><div class="value">${profile?.gender === 'male' ? 'Masculino' : 'Feminino'}</div></div>
      <div class="card"><label>Esporte</label><div class="value">${profile?.sport === 'bodybuilding' ? 'Bodybuilding' : profile?.sport === 'bjj' ? 'BJJ' : 'Atleta'}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Composição Corporal</div>
    <div class="grid">
      <div class="card highlight"><label>Peso</label><div class="value">${weight} <span class="unit">kg</span></div></div>
      <div class="card"><label>Altura</label><div class="value">${height} <span class="unit">cm</span></div></div>
      <div class="card"><label>IMC</label><div class="value">${bmi}</div></div>
      <div class="card"><label>% Gordura</label><div class="value">${bodyFat || '---'} <span class="unit">%</span></div></div>
      <div class="card"><label>Massa Magra</label><div class="value">${leanMass} <span class="unit">kg</span></div></div>
      <div class="card"><label>Massa Gorda</label><div class="value">${fatMass} <span class="unit">kg</span></div></div>
      <div class="card"><label>RCQ</label><div class="value">${waistHipRatio}</div></div>
    </div>
    ${bodyFatMethod ? `<p style="font-size:11px;color:#666;margin-top:5px;">Método: <strong>${bodyFatMethod === 'visual' ? 'Visual' : bodyFatMethod === 'skinfold' ? 'Dobras Cutâneas' : 'Bioimpedância'}</strong></p>` : ''}
  </div>

  ${data.resistance || data.reactance ? `
  <div class="section">
    <div class="section-title">Bioimpedância</div>
    <div class="grid-3">
      ${data.resistance ? `<div class="card"><label>Resistência</label><div class="value">${data.resistance} <span class="unit">Ω</span></div></div>` : ''}
      ${data.reactance ? `<div class="card"><label>Reactância</label><div class="value">${data.reactance} <span class="unit">Ω</span></div></div>` : ''}
      ${data.phaseAngle ? `<div class="card"><label>Ângulo de Fase</label><div class="value">${data.phaseAngle} <span class="unit">°</span></div></div>` : ''}
    </div>
  </div>` : ''}

  ${data.triceps || data.biceps || data.subscapular ? `
  <div class="section">
    <div class="section-title">Dobras Cutâneas (mm) - Padrão CREF</div>
    <table>
      <thead><tr><th>Dobra</th><th>Valor (mm)</th></tr></thead>
      <tbody>
        ${data.triceps ? `<tr><td>Tríceps</td><td>${data.triceps}</td></tr>` : ''}
        ${data.biceps ? `<tr><td>Bíceps</td><td>${data.biceps}</td></tr>` : ''}
        ${data.subscapular ? `<tr><td>Subescapular</td><td>${data.subscapular}</td></tr>` : ''}
        ${data.suprailiac ? `<tr><td>Supra-ilíaca</td><td>${data.suprailiac}</td></tr>` : ''}
        ${data.abdominal ? `<tr><td>Abdominal</td><td>${data.abdominal}</td></tr>` : ''}
        ${data.chestSkinfold ? `<tr><td>Peitoral</td><td>${data.chestSkinfold}</td></tr>` : ''}
        ${data.axillaryMid ? `<tr><td>Axilar Média</td><td>${data.axillaryMid}</td></tr>` : ''}
        ${data.thighSkinfold ? `<tr><td>Coxa</td><td>${data.thighSkinfold}</td></tr>` : ''}
        ${data.calfSkinfold ? `<tr><td>Panturrilha Medial</td><td>${data.calfSkinfold}</td></tr>` : ''}
      </tbody>
    </table>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Circunferências (cm) - Padrão CREF</div>
    <table>
      <thead><tr><th>Local</th><th>Direita (cm)</th><th>Esquerda (cm)</th></tr></thead>
      <tbody>
        <tr class="sub-header"><td colspan="3">MEMBRO SUPERIOR</td></tr>
        <tr><td>Braço Relaxado</td>${tr(data.armRelaxedRight)}${tr(data.armRelaxedLeft)}</tr>
        <tr><td>Braço Contraído</td>${tr(data.armFlexedRight)}${tr(data.armFlexedLeft)}</tr>
        <tr><td>Antebraço</td>${tr(data.forearmRight)}${tr(data.forearmLeft)}</tr>
        <tr><td>Punho</td>${tr(data.wristRight)}${tr(data.wristLeft)}</tr>
        <tr class="sub-header"><td colspan="3">TRONCO</td></tr>
        <tr><td>Tórax/Peito</td>${tr(data.chestCircumference)}<td>---</td></tr>
        <tr><td>Cintura</td>${tr(data.waistCircumference)}<td>---</td></tr>
        <tr><td>Abdômen</td>${tr(data.abdomenCircumference)}<td>---</td></tr>
        <tr><td>Quadril</td>${tr(data.hipCircumference)}<td>---</td></tr>
        <tr class="sub-header"><td colspan="3">MEMBRO INFERIOR</td></tr>
        <tr><td>Coxa Proximal</td>${tr(data.thighProximalRight)}${tr(data.thighProximalLeft)}</tr>
        <tr><td>Coxa Média</td>${tr(data.thighMidRight)}${tr(data.thighMidLeft)}</tr>
        <tr><td>Panturrilha</td>${tr(data.calfRight)}${tr(data.calfLeft)}</tr>
        <tr><td>Tornozelo</td>${tr(data.ankleRight)}${tr(data.ankleLeft)}</tr>
      </tbody>
    </table>
  </div>

  ${data.notes ? `
  <div class="notes">
    <h4>Observações do Profissional</h4>
    <p>${data.notes}</p>
  </div>` : ''}

  <div class="footer">
    <p><strong>IronPlate</strong> - Sistema de Nutrição para Atletas</p>
    <p>Relatório gerado em ${today}</p>
    <br/>
    <p>_______________________________________________</p>
    <p>Profissional Responsável</p>
    <p>CRN/CRF: _____________ | CREF: _____________</p>
  </div>

  <div class="no-print" style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="background:#FF6B35;color:white;border:none;padding:12px 24px;font-size:14px;border-radius:6px;cursor:pointer;">
      Imprimir / Salvar PDF
    </button>
  </div>
</body>
</html>`;

  if (Platform.OS === 'web') {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  }
}
