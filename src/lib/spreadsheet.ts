/**
 * Utilitários de manipulação e sincronização de Planilhas (CSV / Excel / TSV)
 * Compatível com acentuação padrão pt-BR (UTF-8 BOM) e detecção inteligente de delimitadores
 */

import type { Membro, Celula, RegistroFinanceiro, DocumentoSecretaria } from '../types/database';

/**
 * Faz download de dados em formato CSV formatado para Excel com BOM UTF-8
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  // UTF-8 BOM para garantir que o Microsoft Excel abra caracteres acentuados (ç, ã, é) sem falhas
  const BOM = '\uFEFF';
  
  const escapeCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(';'),
    ...rows.map(row => row.map(escapeCell).join(';'))
  ].join('\r\n');

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Analisa texto de planilha (CSV, TSV, valores colados do Excel ou Google Sheets)
 */
export function parseSpreadsheetText(text: string): { headers: string[]; rows: string[][] } {
  if (!text || !text.trim()) {
    return { headers: [], rows: [] };
  }

  // Detecta quebra de linha
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  // Detecta delimitador principal (; , \t)
  const firstLine = lines[0];
  const countSemicolon = (firstLine.match(/;/g) || []).length;
  const countTab = (firstLine.match(/\t/g) || []).length;
  const countComma = (firstLine.match(/,/g) || []).length;

  let delimiter = ';';
  if (countTab > countSemicolon && countTab > countComma) {
    delimiter = '\t';
  } else if (countComma > countSemicolon) {
    delimiter = ',';
  }

  // Função para quebrar linha respeitando aspas
  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim());
  const rows = lines.slice(1).map(l => splitLine(l).map(c => c.replace(/^["']|["']$/g, '').trim()));

  return { headers, rows };
}

/**
 * Converte linhas de planilha para Membros parciais
 */
export function parseMembrosFromRows(headers: string[], rows: string[][]): Partial<Membro>[] {
  const lowerHeaders = headers.map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  
  const nomeIdx = lowerHeaders.findIndex(h => h.includes('nome') || h === 'name' || h.includes('membro'));
  const emailIdx = lowerHeaders.findIndex(h => h.includes('email') || h.includes('e-mail') || h.includes('correio'));
  const telIdx = lowerHeaders.findIndex(h => h.includes('tel') || h.includes('fone') || h.includes('whatsapp') || h.includes('celular'));
  const celulaIdx = lowerHeaders.findIndex(h => h.includes('celula') || h.includes('grupo') || h.includes('rede'));
  const statusIdx = lowerHeaders.findIndex(h => h.includes('status') || h.includes('situacao'));
  const nascIdx = lowerHeaders.findIndex(h => h.includes('nasc') || h.includes('data') || h.includes('aniversario') || h.includes('birth'));

  return rows.map((row, i) => {
    const nome = nomeIdx >= 0 ? row[nomeIdx] : row[0] || `Membro ${i + 1}`;
    let email = emailIdx >= 0 ? row[emailIdx] : '';
    if (!email || !email.includes('@')) {
      const cleanName = nome.toLowerCase().replace(/[^a-z0-9]/g, '');
      email = `${cleanName || 'membro'}_${i + 1}@maisigreja.local`;
    }

    let status: 'ativo' | 'inativo' | 'em_observacao' = 'ativo';
    if (statusIdx >= 0 && row[statusIdx]) {
      const st = row[statusIdx].toLowerCase();
      if (st.includes('inat')) status = 'inativo';
      else if (st.includes('obs')) status = 'em_observacao';
    }

    return {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      telefone: telIdx >= 0 ? row[telIdx] || '' : '',
      celula_nome: celulaIdx >= 0 ? row[celulaIdx] || '' : '',
      status,
      data_nascimento: nascIdx >= 0 ? row[nascIdx] || '' : '',
    };
  }).filter(m => Boolean(m.nome));
}

/**
 * Converte linhas de planilha para Lançamentos Financeiros parciais
 */
export function parseFinanceiroFromRows(headers: string[], rows: string[][]): Partial<RegistroFinanceiro>[] {
  const lowerHeaders = headers.map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

  const descIdx = lowerHeaders.findIndex(h => h.includes('desc') || h.includes('historico') || h.includes('titulo'));
  const valorIdx = lowerHeaders.findIndex(h => h.includes('valor') || h.includes('quantia') || h.includes('preco') || h.includes('total'));
  const tipoIdx = lowerHeaders.findIndex(h => h.includes('tipo') || h.includes('natureza') || h.includes('e/s'));
  const catIdx = lowerHeaders.findIndex(h => h.includes('cat') || h.includes('conta') || h.includes('origem'));
  const dataIdx = lowerHeaders.findIndex(h => h.includes('data') || h.includes('dia') || h.includes('date'));

  return rows.map((row, i) => {
    const desc = descIdx >= 0 ? row[descIdx] : row[0] || `Registro ${i + 1}`;
    
    // Converte valor monetário (ex: "R$ 1.500,00" ou "1500" ou "1500.00")
    let rawVal = valorIdx >= 0 ? row[valorIdx] : '0';
    rawVal = rawVal.replace(/[R$\s]/g, '');
    if (rawVal.includes(',') && rawVal.includes('.')) {
      rawVal = rawVal.replace(/\./g, '').replace(',', '.');
    } else if (rawVal.includes(',')) {
      rawVal = rawVal.replace(',', '.');
    }
    const valor = Math.abs(parseFloat(rawVal) || 0);

    let tipo: 'receita' | 'despesa' = 'receita';
    if (tipoIdx >= 0 && row[tipoIdx]) {
      const t = row[tipoIdx].toLowerCase();
      if (t.includes('desp') || t.includes('sai') || t.includes('deb') || t.includes('-')) {
        tipo = 'despesa';
      }
    }

    let data = dataIdx >= 0 ? row[dataIdx] : '';
    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      data = new Date().toISOString().split('T')[0];
    }

    return {
      descricao: desc.trim(),
      valor,
      tipo,
      categoria: catIdx >= 0 ? row[catIdx] || 'Geral' : 'Geral',
      data,
    };
  }).filter(f => Boolean(f.descricao));
}

/**
 * Converte linhas de planilha para Células parciais
 */
export function parseCelulasFromRows(headers: string[], rows: string[][]): Partial<Celula>[] {
  const lowerHeaders = headers.map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

  const nomeIdx = lowerHeaders.findIndex(h => h.includes('nome') || h.includes('celula') || h.includes('grupo'));
  const liderIdx = lowerHeaders.findIndex(h => h.includes('lider') || h.includes('responsavel') || h.includes('pastor'));
  const endIdx = lowerHeaders.findIndex(h => h.includes('end') || h.includes('rua') || h.includes('local'));
  const obsIdx = lowerHeaders.findIndex(h => h.includes('obs') || h.includes('horario') || h.includes('dia') || h.includes('encontro'));

  return rows.map((row, i) => {
    const nome = nomeIdx >= 0 ? row[nomeIdx] : row[0] || `Célula ${i + 1}`;
    return {
      nome: nome.trim(),
      lider_nome: liderIdx >= 0 ? row[liderIdx] || 'Sem líder' : 'Sem líder',
      endereco: endIdx >= 0 ? row[endIdx] || '' : '',
      observacoes: obsIdx >= 0 ? row[obsIdx] || '' : '',
    };
  }).filter(c => Boolean(c.nome));
}
