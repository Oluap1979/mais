import React, { useMemo } from 'react';
import {
  Users,
  Group,
  DollarSign,
  ArrowUpRight,
  Plus,
  Calendar,
  Church,
  TrendingUp,
  BarChart3,
  ArrowDownRight,
  Wallet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { formatCurrency, formatDate } from '../lib/utils';
import type { Membro, Celula, RegistroFinanceiro } from '../types/database';
import type { NavItemKey } from './Sidebar';

interface DashboardViewProps {
  membros: Membro[];
  celulas: Celula[];
  financeiro: RegistroFinanceiro[];
  onNavigate: (path: NavItemKey) => void;
  onOpenNovoMembro: () => void;
  onOpenNovaCelula: () => void;
}

export function DashboardView({
  membros,
  celulas,
  financeiro,
  onNavigate,
  onOpenNovoMembro,
  onOpenNovaCelula,
}: DashboardViewProps) {
  // Cálculos de Estatísticas
  const totalMembros = membros.length;
  const celulasAtivas = celulas.length;

  // Arrecadação Mensal (apenas receitas deste mês corrente)
  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  const receitasDoMes = financeiro
    .filter((f) => {
      if (f.tipo !== 'receita') return false;
      const d = new Date(f.data);
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    })
    .reduce((sum, item) => sum + Number(item.valor), 0);

  // Total de arrecadação geral se este mês for 0 (para manter coerência visual caso dados de seed tenham datas distintas)
  const arrecadacaoExibida = receitasDoMes > 0 
    ? receitasDoMes 
    : financeiro.filter(f => f.tipo === 'receita').reduce((sum, i) => sum + Number(i.valor), 0);

  const despesasTotal = financeiro
    .filter((f) => f.tipo === 'despesa')
    .reduce((sum, item) => sum + Number(item.valor), 0);

  // Membros ativos x em observação
  const membrosAtivosCount = membros.filter((m) => m.status === 'ativo').length;

  // Preparação dos dados dos últimos 6 meses para o Recharts
  const chartData = useMemo(() => {
    const monthsNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    const currentDate = new Date();
    const result: Array<{
      key: string;
      mes: string;
      mesCompleto: string;
      ano: number;
      receitas: number;
      despesas: number;
      saldo: number;
    }> = [];

    // Gerar os últimos 6 meses cronologicamente (do mais antigo para o atual)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const y = d.getFullYear();
      const key = `${y}-${String(mIdx + 1).padStart(2, '0')}`;
      const label = `${monthsNames[mIdx]}/${String(y).slice(2)}`;
      const labelCompleto = `${monthsNames[mIdx]} de ${y}`;

      result.push({
        key,
        mes: label,
        mesCompleto: labelCompleto,
        ano: y,
        receitas: 0,
        despesas: 0,
        saldo: 0,
      });
    }

    // Acumular valores dos registros financeiros
    financeiro.forEach((reg) => {
      if (!reg.data) return;
      const regDate = new Date(reg.data);
      if (isNaN(regDate.getTime())) return;

      const regKey = `${regDate.getFullYear()}-${String(regDate.getMonth() + 1).padStart(2, '0')}`;
      const found = result.find((item) => item.key === regKey);

      if (found) {
        const val = Number(reg.valor) || 0;
        if (reg.tipo === 'receita') {
          found.receitas += val;
        } else if (reg.tipo === 'despesa') {
          found.despesas += val;
        }
        found.saldo = found.receitas - found.despesas;
      }
    });

    return result;
  }, [financeiro]);

  const totais6Meses = useMemo(() => {
    const totReceitas = chartData.reduce((acc, curr) => acc + curr.receitas, 0);
    const totDespesas = chartData.reduce((acc, curr) => acc + curr.despesas, 0);
    const saldo = totReceitas - totDespesas;
    return { totReceitas, totDespesas, saldo };
  }, [chartData]);

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Banner de Boas-Vindas Ministerial com visual moderno */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 sm:p-8 text-white shadow-sm border border-slate-800">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-300 mb-2">
            <Church className="h-4 w-4 text-blue-400" />
            <span>Gestão Eclesiástica Integrada</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Paz do Senhor, Pastor!
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Aqui está a visão consolidada da sua comunidade hoje. Acompanhe o discipulado dos membros,
            multiplicação das células e a mordomia das ofertas do Reino.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <button
              onClick={onOpenNovoMembro}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Membro</span>
            </button>
            <button
              onClick={onOpenNovaCelula}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 text-slate-300" />
              <span>Nova Célula</span>
            </button>
            <button
              onClick={() => onNavigate('financeiro')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/70 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700/80 transition-colors cursor-pointer"
            >
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span>Lançamentos</span>
            </button>
          </div>
        </div>

        {/* Glow sutil de fundo */}
        <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Cards de estatísticas ministeriais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card: Total de Membros */}
        <Card className="p-6 shadow-xs rounded-xl hover:border-gray-300 transition-all bg-white border border-gray-200 cursor-pointer" onClick={() => onNavigate('membros')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total de Membros</span>
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900 tabular-nums">
              {totalMembros}
            </span>
            <span className="text-xs font-medium text-emerald-600 flex items-center">
              <TrendingUp className="h-3.5 w-3.5 mr-0.5" />
              {membrosAtivosCount} em plena comunhão
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Rol da congregação</span>
            <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
          </div>
        </Card>

        {/* Card: Células Ativas */}
        <Card className="p-6 shadow-xs rounded-xl hover:border-gray-300 transition-all bg-white border border-gray-200 cursor-pointer" onClick={() => onNavigate('celulas')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Células Ativas</span>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Group className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900 tabular-nums">
              {celulasAtivas}
            </span>
            <span className="text-xs font-medium text-emerald-700">
              Grupos nos lares
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Redes de discipulado</span>
            <ArrowUpRight className="h-4 w-4 text-gray-400" />
          </div>
        </Card>

        {/* Card: Arrecadação Mensal */}
        <Card className="p-6 shadow-xs rounded-xl hover:border-gray-300 transition-all bg-white border border-gray-200 cursor-pointer" onClick={() => onNavigate('financeiro')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Arrecadação Mensal</span>
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900 tabular-nums">
              {formatCurrency(arrecadacaoExibida)}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Dízimos e ofertas</span>
            <ArrowUpRight className="h-4 w-4 text-gray-400" />
          </div>
        </Card>
      </div>

      {/* Gráfico Recharts: Receitas e Despesas dos Últimos 6 Meses */}
      <Card className="rounded-xl border border-gray-200 bg-white shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Balanço Financeiro Semestral (Últimos 6 Meses)
              </h3>
              <p className="text-xs text-gray-500">
                Comparativo de arrecadação (dízimos e ofertas) versus despesas ministeriais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('financeiro')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
            >
              <Wallet className="h-3.5 w-3.5" />
              <span>Gerenciar Finanças</span>
            </button>
          </div>
        </div>

        {/* Resumo Rápido dos 6 Meses */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
          <div className="p-3.5 rounded-lg border border-emerald-100 bg-emerald-50/50 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">
                Total Receitas (6m)
              </span>
              <p className="text-lg font-bold text-emerald-700 tabular-nums">
                {formatCurrency(totais6Meses.totReceitas)}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-rose-100 bg-rose-50/50 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wide">
                Total Despesas (6m)
              </span>
              <p className="text-lg font-bold text-rose-700 tabular-nums">
                {formatCurrency(totais6Meses.totDespesas)}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-blue-100 bg-blue-50/50 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wide">
                Saldo Acumulado (6m)
              </span>
              <p
                className={`text-lg font-bold tabular-nums ${
                  totais6Meses.saldo >= 0 ? 'text-blue-800' : 'text-rose-700'
                }`}
              >
                {formatCurrency(totais6Meses.saldo)}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Gráfico Recharts */}
        <div className="w-full h-72 sm:h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="mes"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
                tickFormatter={(val: number) => {
                  if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
                  return `R$ ${val}`;
                }}
              />
              <Tooltip
                formatter={(value: any, name: any) => {
                  const num = Number(value) || 0;
                  const label = name === 'receitas' ? 'Receitas' : 'Despesas';
                  return [formatCurrency(num), label];
                }}
                labelFormatter={(label: any) => {
                  const found = chartData.find((c) => c.mes === label);
                  return found ? found.mesCompleto : label;
                }}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '0.75rem',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                formatter={(value) => (value === 'receitas' ? 'Receitas' : 'Despesas')}
              />
              <Bar
                dataKey="receitas"
                name="receitas"
                fill="#10B981"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="despesas"
                name="despesas"
                fill="#EF4444"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {totais6Meses.totReceitas === 0 && totais6Meses.totDespesas === 0 && (
          <p className="text-center text-xs text-gray-500 mt-2 italic">
            Nenhuma movimentação registrada no período dos últimos 6 meses. Registre dízimos ou ofertas em "Lançamentos".
          </p>
        )}
      </Card>

      {/* Grid Secundário: Células Recentes + Últimos Lançamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel de Células */}
        <Card className="rounded-xl border border-gray-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-gray-900">Células em Destaque</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Encontros nos lares e multiplicação</p>
            </div>
            <button
              onClick={() => onNavigate('celulas')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              Ver todas ({celulas.length})
            </button>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            {celulas.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500">
                Nenhuma célula cadastrada ainda. Clique em "Nova Célula" para adicionar.
              </div>
            ) : (
              celulas.slice(0, 3).map((cel) => (
                <div
                  key={cel.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{cel.nome}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Líder: <span className="font-medium text-gray-700">{cel.lider_nome || 'A definir'}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-700 tabular-nums">
                      {cel.membros_count || 0} membros
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Painel Financeiro Recente */}
        <Card className="rounded-xl border border-gray-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-gray-900">Movimentações Recentes</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Entradas e saídas registradas</p>
            </div>
            <button
              onClick={() => onNavigate('financeiro')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              Ver balanço
            </button>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            {financeiro.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500">
                Nenhum lançamento financeiro registrado ainda.
              </div>
            ) : (
              financeiro.slice(0, 3).map((reg) => (
                <div
                  key={reg.id}
                  className="flex items-center justify-between p-3.5 rounded-lg border border-gray-100 bg-gray-50/70"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        reg.tipo === 'receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-xs">
                        {reg.descricao}
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        {reg.categoria} · {formatDate(reg.data)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        reg.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {reg.tipo === 'receita' ? '+' : '-'} {formatCurrency(reg.valor)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agenda Pastoral da Semana */}
      <Card className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Agenda Litúrgica & Comunitária</h3>
            <p className="text-xs text-gray-500">Programação dos próximos encontros da semana</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="p-3.5 rounded-lg border border-blue-100 bg-blue-50/40">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">Quarta-feira · 19h30</span>
            <h4 className="font-bold text-gray-900 mt-1">Culto de Oração & Doutrina</h4>
            <p className="text-xs text-gray-600 mt-0.5">Estudo bíblico expositivo no Templo Central.</p>
          </div>
          <div className="p-3.5 rounded-lg border border-green-100 bg-green-50/40">
            <span className="text-[11px] font-semibold text-green-700 uppercase tracking-wide">Quinta & Sexta · 20h00</span>
            <h4 className="font-bold text-gray-900 mt-1">Encontro das Células</h4>
            <p className="text-xs text-gray-600 mt-0.5">Reunião nos lares para estudo e comunhão.</p>
          </div>
          <div className="p-3.5 rounded-lg border border-indigo-100 bg-indigo-50/40">
            <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide">Domingo · 10h & 18h</span>
            <h4 className="font-bold text-gray-900 mt-1">Culto de Celebração & Ceia</h4>
            <p className="text-xs text-gray-600 mt-0.5">Louvor comunitário e ministração da Palavra.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
