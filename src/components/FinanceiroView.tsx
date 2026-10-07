import React, { useState } from 'react';
import { Card, CardTitle } from './ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from './ui/table';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Button } from './ui/button';
import { DatePicker } from './ui/date-picker';
import { Plus, DollarSign, TrendingUp, TrendingDown, Wallet, Trash2, Search, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { useToast } from './ui/toast';
import type { RegistroFinanceiro, FinancialType } from '../types/database';

interface FinanceiroViewProps {
  financeiro: RegistroFinanceiro[];
  onSaveFinanceiro: (registro: Partial<RegistroFinanceiro>) => Promise<void>;
  onDeleteFinanceiro: (id: string) => Promise<void>;
}

export function FinanceiroView({
  financeiro,
  onSaveFinanceiro,
  onDeleteFinanceiro,
}: FinanceiroViewProps) {
  const { toastSuccess, toastError } = useToast();

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Estados de formulário
  const [tipo, setTipo] = useState<FinancialType>('receita');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [categoria, setCategoria] = useState('Dízimos');
  const [search, setSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'all' | 'receita' | 'despesa'>('all');

  const [errors, setErrors] = useState<{ descricao?: string; valor?: string }>({});

  // Categorias predefinidas
  const categoriasReceita = [
    'Dízimos',
    'Ofertas de Culto',
    'Ofertas Missionárias',
    'Ação Social',
    'Campanhas de Construção',
    'Eventos & Conferências',
    'Outras Entradas',
  ];

  const categoriasDespesa = [
    'Infraestrutura & Aluguel',
    'Contas de Consumo (Luz, Água, Net)',
    'Ministério Pastoral & Preletores',
    'Missões & Sustento de Campos',
    'Ação Social & Cestas Básicas',
    'Som, Iluminação & Multimídia',
    'Manutenção & Reformas',
    'Secretaria & Contabilidade',
  ];

  const totalReceitas = financeiro
    .filter((f) => f.tipo === 'receita')
    .reduce((sum, item) => sum + Number(item.valor), 0);

  const totalDespesas = financeiro
    .filter((f) => f.tipo === 'despesa')
    .reduce((sum, item) => sum + Number(item.valor), 0);

  const saldoLiquido = totalReceitas - totalDespesas;

  const handleOpenNew = (t: FinancialType = 'receita') => {
    setTipo(t);
    setDescricao('');
    setValor('');
    setData(new Date().toISOString().split('T')[0]);
    setCategoria(t === 'receita' ? 'Dízimos' : 'Infraestrutura & Aluguel');
    setErrors({});
    setIsOpenModal(true);
  };

  const validate = () => {
    const err: { descricao?: string; valor?: string } = {};
    if (!descricao.trim()) {
      err.descricao = 'Descrição é obrigatória';
    }
    const num = Number(valor.replace(',', '.'));
    if (!valor || isNaN(num) || num <= 0) {
      err.valor = 'Informe um valor válido maior que zero';
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toastError('❌ Erro. Tente novamente.');
      return;
    }

    try {
      await onSaveFinanceiro({
        tipo,
        descricao,
        valor: Number(valor.replace(',', '.')),
        data,
        categoria,
      });
      toastSuccess('✅ Sucesso! Operação realizada.');
      setIsOpenModal(false);
    } catch {
      toastError('❌ Erro. Tente novamente.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteFinanceiro(id);
      setDeleteConfirmId(null);
      toastSuccess('✅ Sucesso! Operação realizada.');
    } catch {
      toastError('❌ Erro. Tente novamente.');
    }
  };

  const filteredRegistros = financeiro.filter((reg) => {
    const matchesSearch =
      reg.descricao.toLowerCase().includes(search.toLowerCase()) ||
      reg.categoria.toLowerCase().includes(search.toLowerCase());
    const matchesTipo = tipoFiltro === 'all' || reg.tipo === tipoFiltro;
    return matchesSearch && matchesTipo;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Mordomia & Gestão Financeira</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Controle transparente de dízimos, ofertas, missões e manutenção do templo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenNew('receita')}
            className="inline-flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Entrada</span>
          </button>
          <button
            onClick={() => handleOpenNew('despesa')}
            className="inline-flex items-center justify-center gap-1.5 bg-rose-600 text-white px-4 py-2 rounded-md hover:bg-rose-700 transition-colors text-sm font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Despesa</span>
          </button>
        </div>
      </div>

      {/* Cards de Resumo Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Entradas */}
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">Total de Entradas</span>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ArrowUpCircle className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-emerald-700 tabular-nums">
              {formatCurrency(totalReceitas)}
            </span>
            <p className="text-xs text-gray-500 mt-1">Dízimos, ofertas e doações</p>
          </div>
        </Card>

        {/* Saídas */}
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">Total de Despesas</span>
            <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <ArrowDownCircle className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-rose-700 tabular-nums">
              {formatCurrency(totalDespesas)}
            </span>
            <p className="text-xs text-gray-500 mt-1">Custos operacionais e ministério</p>
          </div>
        </Card>

        {/* Saldo Operacional */}
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">Saldo Eclesiástico</span>
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={`text-2xl font-extrabold tabular-nums ${
                saldoLiquido >= 0 ? 'text-blue-700' : 'text-red-600'
              }`}
            >
              {formatCurrency(saldoLiquido)}
            </span>
            <p className="text-xs text-gray-500 mt-1">Superávit disponível em caixa</p>
          </div>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar lançamentos por descrição ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as any)}
            className="bg-white"
          >
            <option value="all">Todas as Operações</option>
            <option value="receita">Apenas Receitas (+)</option>
            <option value="despesa">Apenas Despesas (-)</option>
          </Select>
        </div>
      </div>

      {/* Tabela de Lançamentos */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Valor (R$)</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRegistros.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-40 text-center text-gray-500">
                <div className="flex flex-col items-center justify-center gap-2">
                  <span className="font-semibold text-gray-700">
                    {financeiro.length === 0
                      ? 'Nenhum lançamento contábil registrado ainda.'
                      : 'Nenhum registro encontrado com os filtros aplicados.'}
                  </span>
                  <p className="text-xs text-gray-400">
                    {financeiro.length === 0
                      ? 'Clique em "+ Nova Entrada" ou "+ Nova Despesa" acima para lançar dízimos, ofertas ou contas.'
                      : 'Tente alterar os termos de busca ou o filtro de tipo.'}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredRegistros.map((reg) => (
              <TableRow key={reg.id}>
                {/* Data */}
                <TableCell className="tabular-nums text-xs font-medium text-gray-600">
                  {formatDate(reg.data)}
                </TableCell>

                {/* Descrição */}
                <TableCell>
                  <span className="font-semibold text-gray-900 block">{reg.descricao}</span>
                </TableCell>

                {/* Categoria */}
                <TableCell>
                  <span className="text-xs text-slate-600 font-medium">
                    {reg.categoria}
                  </span>
                </TableCell>

                {/* Tipo: Clean unboxed indicator */}
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        reg.tipo === 'receita' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      aria-hidden="true"
                    />
                    <span className={reg.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'}>
                      {reg.tipo === 'receita' ? 'Entrada' : 'Saída'}
                    </span>
                  </div>
                </TableCell>

                {/* Valor */}
                <TableCell className="text-right">
                  <span
                    className={`font-bold tabular-nums ${
                      reg.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {reg.tipo === 'receita' ? '+' : '-'} {formatCurrency(reg.valor)}
                  </span>
                </TableCell>

                {/* Ação */}
                <TableCell className="text-right">
                  <button
                    onClick={() => setDeleteConfirmId(reg.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Excluir Lançamento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Modal de Novo Lançamento Financeiro */}
      <Dialog open={isOpenModal} onOpenChange={setIsOpenModal}>
        <DialogHeader>
          <DialogTitle>Novo Lançamento Financeiro</DialogTitle>
          <DialogDescription>
            Registre dízimos, ofertas ou despesas eclesiásticas com prestação de contas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Tipo de Operação */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Tipo de Movimentação
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTipo('receita');
                  setCategoria('Dízimos');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  tipo === 'receita'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>Receita / Entrada</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipo('despesa');
                  setCategoria('Infraestrutura & Aluguel');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  tipo === 'despesa'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <TrendingDown className="h-4 w-4" />
                <span>Despesa / Saída</span>
              </button>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Descrição
            </label>
            <Input
              placeholder={
                tipo === 'receita'
                  ? 'Ex: Dízimos do culto matutino de domingo'
                  : 'Ex: Conta de energia do templo sede'
              }
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              error={errors.descricao}
            />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Valor (R$)
            </label>
            <Input
              type="text"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              error={errors.valor}
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Categoria
            </label>
            <Select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {(tipo === 'receita' ? categoriasReceita : categoriasDespesa).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>

          {/* Data */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Data da Movimentação
            </label>
            <DatePicker
              value={data}
              onChange={setData}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpenModal(false)}
            >
              Cancelar
            </Button>
            <button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-md transition-colors font-medium text-sm shadow-xs cursor-pointer active:bg-blue-800"
            >
              Salvar Lançamento
            </button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog
        open={Boolean(deleteConfirmId)}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogHeader>
          <DialogTitle>Excluir Lançamento Financeiro</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja apagar este registro do livro contábil da igreja?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
          >
            Confirmar Exclusão
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
