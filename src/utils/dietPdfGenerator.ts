// PDF Generator for Diet Plans

import { Platform, Alert } from 'react-native';
import { MealPlan, UserProfile } from '../types';
import { calculateTDEE, calculateTargetCalories, getMacroPercentages } from './calculations';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const getGoalLabel = (goal: string) => {
  switch (goal) {
    case 'bulking': return 'Bulking (+15% superávit calórico)';
    case 'cutting_conservative': return 'Cutting Conservador (-15% déficit)';
    case 'cutting_preparation': return 'Preparação (-20% déficit)';
    case 'cutting_precontest': return 'Pré-Competição (-25% déficit)';
    case 'maintenance': return 'Manutenção';
    default: return 'Personalizado';
  }
};

const getSportLabel = (sport: string) => {
  switch (sport) {
    case 'bodybuilding': return 'Bodybuilding';
    case 'bjj': return 'BJJ / Artes Marciais';
    case 'both': return 'Atleta (BB + BJJ)';
    default: return 'Atleta';
  }
};

const getTimingLabel = (timing: string) => {
  switch (timing) {
    case 'pre_workout': return 'Pré-treino';
    case 'post_workout': return 'Pós-treino';
    default: return 'Refeição';
  }
};

function generateMealHTML(meal: any): string {
  return `
  <div class="meal">
    <div class="meal-header">
      <span class="meal-name">${meal.name}</span>
      <span class="meal-timing">${getTimingLabel(meal.timing)}</span>
    </div>
    <div class="meal-macros">
      <span class="macro cal">Cal: <span>${meal.totalMacros.calories.toFixed(3)}</span></span>
      <span class="macro prot">P: <span>${meal.totalMacros.protein.toFixed(3)}g</span></span>
      <span class="macro carb">C: <span>${meal.totalMacros.carbs.toFixed(3)}g</span></span>
      <span class="macro fat">G: <span>${meal.totalMacros.fat.toFixed(3)}g</span></span>
    </div>
    <table class="food-table">
      <thead>
        <tr>
          <th>Alimento</th>
          <th>Porção</th>
          <th>Kcal</th>
          <th>Prot</th>
          <th>Carb</th>
          <th>Gord</th>
        </tr>
      </thead>
      <tbody>
        ${meal.foods.map((food: any) => `
        <tr>
          <td>${food.food.name}</td>
          <td class="food-grams">${food.grams}g</td>
          <td>${food.macros.calories.toFixed(3)}</td>
          <td>${food.macros.protein.toFixed(3)}g</td>
          <td>${food.macros.carbs.toFixed(3)}g</td>
          <td>${food.macros.fat.toFixed(3)}g</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function generateOptionHTML(plan: MealPlan, index: number): string {
  const percentages = getMacroPercentages(plan.totalMacros);
  
  return `
  <div class="option-section">
    <div class="option-header">
      <h2>Opção ${index + 1}: ${plan.name}</h2>
    </div>

    <div class="macros-summary">
      <div class="macro-box cal-box">
        <div class="macro-val">${plan.totalMacros.calories.toFixed(3)}</div>
        <div class="macro-lbl">Calorias</div>
      </div>
      <div class="macro-box prot-box">
        <div class="macro-val">${plan.totalMacros.protein.toFixed(3)}g</div>
        <div class="macro-lbl">Proteína (${percentages.protein}%)</div>
      </div>
      <div class="macro-box carb-box">
        <div class="macro-val">${plan.totalMacros.carbs.toFixed(3)}g</div>
        <div class="macro-lbl">Carboidratos (${percentages.carbs}%)</div>
      </div>
      <div class="macro-box fat-box">
        <div class="macro-val">${plan.totalMacros.fat.toFixed(3)}g</div>
        <div class="macro-lbl">Gordura (${percentages.fat}%)</div>
      </div>
    </div>

    ${plan.meals.map(meal => generateMealHTML(meal)).join('')}
  </div>`;
}

export async function generateDietPDF(plan: MealPlan, profile: UserProfile): Promise<void> {
  await generateDietOptionsPDF([plan], profile);
}

export async function generateDietOptionsPDF(plans: MealPlan[], profile: UserProfile): Promise<void> {
  console.log('[PDF] Generating PDF for', plans.length, 'options');

  const tdee = calculateTDEE(profile);
  const targetCalories = calculateTargetCalories(profile);

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const goalLabel = plans.length > 0 ? getGoalLabel(plans[0].goal) : 'Personalizado';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Plano Alimentar - IronPlate</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; color: #333; line-height: 1.4; font-size: 11px; }

    .header { text-align: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 3px solid #FF6B35; }
    .header h1 { color: #FF6B35; font-size: 20px; margin-bottom: 3px; }
    .header p { color: #666; font-size: 10px; }

    .section { margin-bottom: 15px; page-break-inside: avoid; }
    .section-title { background: #1A1A2E; color: white; padding: 6px 10px; font-size: 12px; font-weight: bold; margin-bottom: 8px; border-radius: 4px; }

    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
    .info-card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 5px; padding: 8px; text-align: center; }
    .info-card label { display: block; font-size: 9px; color: #666; margin-bottom: 2px; text-transform: uppercase; }
    .info-card .value { font-size: 14px; font-weight: bold; color: #1A1A2E; }
    .info-card .unit { font-size: 10px; color: #666; }
    .highlight { background: #FF6B3515; border-color: #FF6B35; }
    .highlight .value { color: #FF6B35; }

    .option-section { margin-bottom: 25px; border: 2px solid #FF6B35; border-radius: 8px; padding: 15px; page-break-before: always; }
    .option-header { background: #FF6B35; color: white; padding: 8px 12px; border-radius: 5px; margin-bottom: 12px; }
    .option-header h2 { font-size: 16px; margin: 0; }

    .macros-summary { display: flex; gap: 10px; margin-bottom: 15px; }
    .macro-box { flex: 1; text-align: center; padding: 10px 5px; border-radius: 6px; }
    .cal-box { background: #00CEC920; border: 1px solid #00CEC9; }
    .prot-box { background: #E1705520; border: 1px solid #E17055; }
    .carb-box { background: #FDCB6E20; border: 1px solid #FDCB6E; }
    .fat-box { background: #A29BFE20; border: 1px solid #A29BFE; }
    .macro-val { font-size: 18px; font-weight: bold; }
    .cal-box .macro-val { color: #00CEC9; }
    .prot-box .macro-val { color: #E17055; }
    .carb-box .macro-val { color: #FDCB6E; }
    .fat-box .macro-val { color: #A29BFE; }
    .macro-lbl { font-size: 9px; color: #666; margin-top: 3px; }

    .meal { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 10px; margin-bottom: 8px; }
    .meal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid #e9ecef; padding-bottom: 6px; }
    .meal-name { font-size: 13px; font-weight: bold; color: #1A1A2E; }
    .meal-timing { font-size: 9px; color: #666; background: #e9ecef; padding: 2px 6px; border-radius: 8px; }
    .meal-macros { display: flex; gap: 12px; margin-bottom: 6px; }
    .macro { font-size: 10px; }
    .macro span { font-weight: bold; }
    .macro.cal { color: #00CEC9; }
    .macro.prot { color: #E17055; }
    .macro.carb { color: #FDCB6E; }
    .macro.fat { color: #A29BFE; }

    .food-table { width: 100%; border-collapse: collapse; font-size: 10px; }
    .food-table th { background: #e9ecef; padding: 4px 6px; text-align: left; font-size: 9px; text-transform: uppercase; color: #666; }
    .food-table td { padding: 4px 6px; border-bottom: 1px dotted #e9ecef; }
    .food-grams { font-weight: bold; color: #FF6B35; }

    .footer { margin-top: 20px; padding-top: 12px; border-top: 2px solid #e9ecef; text-align: center; color: #666; font-size: 9px; }
    .notes { background: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 8px; margin-top: 12px; font-size: 10px; color: #856404; }

    @media print {
      body { padding: 15px; }
      .no-print { display: none; }
      .option-section { page-break-before: always; }
      .option-section:first-of-type { page-break-before: auto; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>IRONPLATE - Plano Alimentar</h1>
    <p>${plans.length} Opções de Cardápio</p>
    <p>${today}</p>
  </div>

  <div class="section">
    <div class="section-title">Dados do Paciente</div>
    <div class="info-grid">
      <div class="info-card"><label>Nome</label><div class="value">${profile.name}</div></div>
      <div class="info-card"><label>Idade</label><div class="value">${profile.age} <span class="unit">anos</span></div></div>
      <div class="info-card"><label>Peso</label><div class="value">${profile.weight} <span class="unit">kg</span></div></div>
      <div class="info-card"><label>Altura</label><div class="value">${profile.height} <span class="unit">cm</span></div></div>
    </div>
    <div class="info-grid">
      <div class="info-card"><label>Gênero</label><div class="value">${profile.gender === 'male' ? 'Masculino' : 'Feminino'}</div></div>
      <div class="info-card"><label>Modalidade</label><div class="value">${getSportLabel(profile.sport)}</div></div>
      <div class="info-card"><label>Atividade</label><div class="value">${profile.activityLevel}</div></div>
      <div class="info-card"><label>Objetivo</label><div class="value" style="font-size:10px">${goalLabel}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Metas Calóricas</div>
    <div class="info-grid">
      <div class="info-card"><label>TDEE</label><div class="value">${tdee} <span class="unit">kcal</span></div></div>
      <div class="info-card highlight"><label>Meta Diária</label><div class="value">${targetCalories} <span class="unit">kcal</span></div></div>
      <div class="info-card"><label>Refeições/Dia</label><div class="value">${plans[0]?.meals.length || 6}</div></div>
      <div class="info-card"><label>Opções</label><div class="value">${plans.length}</div></div>
    </div>
  </div>

  ${plans.map((plan, i) => generateOptionHTML(plan, i + 1)).join('')}

  <div class="notes">
    <strong>Observações Importantes:</strong>
    <ul style="margin-top:5px;margin-left:15px;">
      <li>Todas as informações nutricionais são baseadas na <strong>Tabela TACO</strong> (UNICAMP - 4ª edição)</li>
      <li>Porções em gramas (g) referem-se ao alimento cru, salvo indicação contrária</li>
      <li>Hidratação: mínimo 2-3 litros de água por dia</li>
      <li>Consulte um nutricionista para ajustes individualizados</li>
      <li>Varie entre as opções ao longo da semana para melhor aderência</li>
    </ul>
  </div>

  <div class="footer">
    <p><strong>IronPlate</strong> - Sistema de Nutrição para Atletas</p>
    <p>Plano gerado em ${today} | Dados nutricionais: Tabela TACO (UNICAMP)</p>
    <br/>
    <p>_______________________________________________</p>
    <p>Nutricionista Responsável</p>
    <p>CRN: _____________</p>
  </div>
</body>
</html>`;

  try {
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
      } else {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plano-alimentar-${plans.length}-opcoes-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } else {
      // Mobile: generate PDF and share
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartilhar Plano Alimentar',
        UTI: 'com.adobe.pdf',
      });
    }
    console.log('[PDF] PDF generated successfully with', plans.length, 'options');
  } catch (error) {
    console.error('[PDF] Error generating PDF:', error);
    Alert.alert('Erro', 'Não foi possível gerar o PDF');
  }
}
