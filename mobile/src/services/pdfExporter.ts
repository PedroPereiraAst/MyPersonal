import { Platform } from 'react-native';

export async function exportarFichaTreinoPDF(treinoData: any, nomeAluno: string): Promise<void> {
  const t = treinoData?.treino || treinoData;
  const sessoes = t?.sessoes || [];

  const htmlSessoes = sessoes
    .map((sessao: any, idx: number) => {
      const letra = String.fromCharCode(65 + idx);
      const exerciciosHtml = (sessao.exercicios || [])
        .map(
          (ex: any, eIdx: number) => `
        <tr style="background-color: ${eIdx % 2 === 0 ? '#f8fafc' : '#ffffff'};">
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${eIdx + 1}. ${ex.nome}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #0f172a;">${ex.series_trabalho}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #0f172a;">${ex.reps}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #0f172a;">${ex.rir_alvo}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #0284c7; font-weight: bold;">${ex.descanso_segundos}s</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-style: italic; color: #64748b;">${ex.foco_biomecanico || '-'}</td>
        </tr>
      `
        )
        .join('');

      return `
        <div style="margin-bottom: 24px; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background: #ffffff;">
          <div style="background-color: #0f172a; color: #00e676; padding: 12px 16px; font-size: 16px; font-weight: bold;">
            Treino ${letra} - ${sessao.nome}
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background-color: #e2e8f0; color: #1e293b; text-align: left;">
                <th style="padding: 10px;">Exercício</th>
                <th style="padding: 10px; text-align: center;">Séries</th>
                <th style="padding: 10px; text-align: center;">Reps</th>
                <th style="padding: 10px; text-align: center;">RIR</th>
                <th style="padding: 10px; text-align: center;">Descanso</th>
                <th style="padding: 10px;">Cadência / Foco</th>
              </tr>
            </thead>
            <tbody>
              ${exerciciosHtml}
            </tbody>
          </table>
        </div>
      `;
    })
    .join('');

  const htmlFull = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Ficha de Treino - ${nomeAluno}</title>
        <style>
          body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; background-color: #ffffff; margin: 0; }
          .header { border-bottom: 3px solid #00c853; padding-bottom: 12px; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: bold; color: #0f172a; margin: 0; }
          .subtitle { font-size: 14px; color: #64748b; margin-top: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">MyPersonal • Ficha de Treino</div>
          <div class="subtitle">Aluno: <strong>${nomeAluno || 'Atleta'}</strong> | Divisão: <strong>${t?.divisao_nome || 'Personalizada'}</strong> (${t?.frequencia_semanal || 4}x por semana)</div>
        </div>

        ${htmlSessoes}

        <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          Documento gerado pelo MyPersonal AI Personal Trainer
        </div>
      </body>
    </html>
  `;

  try {
    // Tenta carregar os módulos nativos do Expo se disponíveis
    let PrintModule: any = null;
    let SharingModule: any = null;

    try {
      PrintModule = require('expo-print');
      SharingModule = require('expo-sharing');
    } catch {
      PrintModule = null;
      SharingModule = null;
    }

    if (Platform.OS !== 'web' && PrintModule?.printToFileAsync && SharingModule?.shareAsync) {
      const { uri } = await PrintModule.printToFileAsync({ html: htmlFull });
      await SharingModule.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      return;
    }

    if (Platform.OS !== 'web' && PrintModule?.printAsync) {
      await PrintModule.printAsync({ html: htmlFull });
      return;
    }

    // Fallback limpo para Web / Navegador Browser
    if (typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlFull);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    }
  } catch (err: any) {
    console.error('Erro ao exportar PDF:', err);
    if (typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlFull);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }
  }
}
