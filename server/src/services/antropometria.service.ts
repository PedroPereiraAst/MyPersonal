import type { SexoBiologico, MetricaAntropometrica } from '../types/schemas.js';

export interface DiagnosticoAntropometrico {
  imc: number;
  classificacao_imc: string;
  bf_deurenberg: number;
  bf_gallagher: number;
  faixa_sugerida_min: number;
  faixa_sugerida_max: number;
  aviso_atleta_musculoso: boolean;
}

export class AntropometriaService {
  /**
   * Cálculo de IMC e classificação segundo a OMS
   */
  public static calcularIMC(pesoKg: number, alturaCm: number): { imc: number; classificacao: string } {
    if (!pesoKg || !alturaCm || alturaCm <= 0) {
      return { imc: 22.0, classificacao: 'Eutrófico' };
    }
    const alturaM = alturaCm / 100;
    const imcRaw = pesoKg / (alturaM * alturaM);
    const imc = Math.round(imcRaw * 10) / 10;

    let classificacao = 'Eutrófico (Peso adequado)';
    if (imc < 18.5) {
      classificacao = 'Abaixo do peso';
    } else if (imc < 25.0) {
      classificacao = 'Eutrófico (Peso adequado)';
    } else if (imc < 30.0) {
      classificacao = 'Sobrepeso (Atenção à massa magra)';
    } else if (imc < 35.0) {
      classificacao = 'Obesidade Grau I';
    } else if (imc < 40.0) {
      classificacao = 'Obesidade Grau II';
    } else {
      classificacao = 'Obesidade Grau III';
    }

    return { imc, classificacao };
  }

  /**
   * Fórmula Antropométrica de Deurenberg:
   * %BF = (1.20 * IMC) + (0.23 * Idade) - (10.8 * Sexo) - 5.4
   * Sexo: 1 para masculino, 0 para feminino.
   */
  public static calcularDeurenberg(imc: number, idade: number, sexo: SexoBiologico = 'masculino'): number {
    const sexoFator = sexo === 'feminino' ? 0 : 1;
    const bfRaw = 1.20 * imc + 0.23 * idade - 10.8 * sexoFator - 5.4;
    const pisoFisiologico = sexo === 'feminino' ? 10.0 : 4.0;
    const tetoFisiologico = 55.0;
    const bfClamped = Math.max(pisoFisiologico, Math.min(tetoFisiologico, bfRaw));
    return Math.round(bfClamped * 10) / 10;
  }

  /**
   * Fórmula Antropométrica de Gallagher:
   * %BF = (1.46 * IMC) + (0.14 * Idade) - (11.6 * Sexo) - 10.0
   */
  public static calcularGallagher(imc: number, idade: number, sexo: SexoBiologico = 'masculino'): number {
    const sexoFator = sexo === 'feminino' ? 0 : 1;
    const bfRaw = 1.46 * imc + 0.14 * idade - 11.6 * sexoFator - 10.0;
    const pisoFisiologico = sexo === 'feminino' ? 10.0 : 4.0;
    const tetoFisiologico = 55.0;
    const bfClamped = Math.max(pisoFisiologico, Math.min(tetoFisiologico, bfRaw));
    return Math.round(bfClamped * 10) / 10;
  }

  /**
   * Diagnóstico Antropométrico Completo com Calibração Biomecânica
   */
  public static diagnosticar(params: {
    pesoKg: number;
    alturaCm: number;
    idade: number;
    sexo?: SexoBiologico;
    nivelExperiencia?: string;
    objetivo?: string;
  }): DiagnosticoAntropometrico {
    const sexo = params.sexo || 'masculino';
    const { imc, classificacao } = this.calcularIMC(params.pesoKg, params.alturaCm);
    const bfDeurenberg = this.calcularDeurenberg(imc, params.idade, sexo);
    const bfGallagher = this.calcularGallagher(imc, params.idade, sexo);

    // Ajuste fisiológico para praticantes de musculação:
    // IMC elevado com experiência intermediária/avançada reflete hipertrofia muscular
    const isAvancado = (params.nivelExperiencia || '').toLowerCase().includes('avanç') ||
      (params.nivelExperiencia || '').toLowerCase().includes('intermed');
    const avisoAtleta = isAvancado && imc >= 25.0;

    let reducaoAtleta = 0;
    if (avisoAtleta) {
      reducaoAtleta = (params.nivelExperiencia || '').toLowerCase().includes('avanç') ? 5.0 : 2.5;
    }

    const baselineMedio = (bfDeurenberg + bfGallagher) / 2 - reducaoAtleta;
    const minFisio = sexo === 'feminino' ? 12 : 5;
    const faixaMin = Math.max(minFisio, Math.round((baselineMedio - 2.5) * 10) / 10);
    const faixaMax = Math.max(faixaMin + 2, Math.round((baselineMedio + 2.5) * 10) / 10);

    return {
      imc,
      classificacao_imc: classificacao,
      bf_deurenberg: bfDeurenberg,
      bf_gallagher: bfGallagher,
      faixa_sugerida_min: faixaMin,
      faixa_sugerida_max: faixaMax,
      aviso_atleta_musculoso: avisoAtleta,
    };
  }

  /**
   * Classifica a faixa de BF segundo o padrão estético/antropométrico
   */
  public static classificarBF(bfTextoOuNumero: string | number, sexo: SexoBiologico = 'masculino'): string {
    let bfNum = 15;
    if (typeof bfTextoOuNumero === 'number') {
      bfNum = bfTextoOuNumero;
    } else {
      const match = String(bfTextoOuNumero).match(/(\d+(?:\.\d+)?)/);
      if (match) bfNum = parseFloat(match[1]);
    }

    if (sexo === 'feminino') {
      if (bfNum < 14) return 'Extremamente Baixo (Competição)';
      if (bfNum <= 17) return 'Atlética / Muito Definida';
      if (bfNum <= 21) return 'Fitness / Definida';
      if (bfNum <= 25) return 'Eutrófica / Em Boa Forma';
      if (bfNum <= 30) return 'Média Saudável';
      return 'Gordura Elevada / Sobrepeso';
    } else {
      if (bfNum < 8) return 'Extremamente Baixo (Competição)';
      if (bfNum <= 11) return 'Atlético / Muito Definido';
      if (bfNum <= 15) return 'Fitness / Moderadamente Definido';
      if (bfNum <= 19) return 'Média Saudável';
      if (bfNum <= 24) return 'Levemente Elevado';
      return 'Gordura Elevada / Sobrepeso';
    }
  }

  /**
   * Monta o resumo antropométrico estruturado
   */
  public static montarMetrica(
    pesoKg: number,
    alturaCm: number,
    idade: number,
    sexo: SexoBiologico = 'masculino',
    densidadeMuscular: 'Baixa' | 'Média' | 'Alta' | 'Muito Alta' = 'Alta'
  ): MetricaAntropometrica {
    const { imc, classificacao } = this.calcularIMC(pesoKg, alturaCm);
    const bfDeurenberg = this.calcularDeurenberg(imc, idade, sexo);
    return {
      imc,
      classificacao_imc: classificacao,
      bf_deurenberg_referencia: bfDeurenberg,
      densidade_muscular: densidadeMuscular,
    };
  }
}
