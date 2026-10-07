import React, { useState } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from './ui/table';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Button } from './ui/button';
import { DatePicker } from './ui/date-picker';
import { Plus, Search, Pencil, Trash2, UserPlus, Phone, Mail, Calendar, Church } from 'lucide-react';
import { formatPhone, formatDate } from '../lib/utils';
import { useToast } from './ui/toast';
import type { Membro, Celula, MemberStatus } from '../types/database';

interface MembrosViewProps {
  membros: Membro[];
  celulas: Celula[];
  onSaveMembro: (membro: Partial<Membro>) => Promise<void>;
  onDeleteMembro: (id: string) => Promise<void>;
  isOpenModal: boolean;
  onOpenModal: (open: boolean) => void;
}

export function MembrosView({
  membros,
  celulas,
  onSaveMembro,
  onDeleteMembro,
  isOpenModal,
  onOpenModal,
}: MembrosViewProps) {
  const { toastSuccess, toastError } = useToast();

  // Estados de formulário
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [celulaId, setCelulaId] = useState<string>('');
  const [status, setStatus] = useState<MemberStatus>('ativo');

  // Estados de busca e filtros
  const [search, setSearch] = useState('');
  const [filterCelula, setFilterCelula] = useState('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ nome?: string; email?: string; telefone?: string }>({});

  const handleOpenNew = () => {
    setEditingId(null);
    setNome('');
    setEmail('');
    setTelefone('');
    setDataNascimento('');
    setCelulaId('');
    setStatus('ativo');
    setErrors({});
    onOpenModal(true);
  };

  const handleOpenEdit = (m: Membro) => {
    setEditingId(m.id);
    setNome(m.nome);
    setEmail(m.email);
    setTelefone(m.telefone || '');
    setDataNascimento(m.data_nascimento || '');
    setCelulaId(m.celula_id || '');
    setStatus(m.status);
    setErrors({});
    onOpenModal(true);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setTelefone(formatted);
  };

  const validate = () => {
    const err: { nome?: string; email?: string; telefone?: string } = {};
    if (!nome.trim()) {
      err.nome = 'Nome completo é obrigatório';
    }
    if (!email.trim()) {
      err.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      err.email = 'Insira um e-mail válido';
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
      const selectedCel = celulas.find((c) => c.id === celulaId);
      await onSaveMembro({
        id: editingId || undefined,
        nome,
        email,
        telefone,
        data_nascimento: dataNascimento,
        celula_id: celulaId || null,
        celula_nome: selectedCel ? selectedCel.nome : 'Não vinculado',
        status,
      });
      toastSuccess('✅ Sucesso! Operação realizada.');
      onOpenModal(false);
    } catch (error) {
      toastError('❌ Erro. Tente novamente.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteMembro(id);
      setDeleteConfirmId(null);
      toastSuccess('✅ Sucesso! Operação realizada.');
    } catch {
      toastError('❌ Erro. Tente novamente.');
    }
  };

  // Filtragem da lista de membros
  const filteredMembros = membros.filter((m) => {
    const matchesSearch =
      m.nome.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      (m.telefone && m.telefone.includes(search));
    const matchesCelula = filterCelula === 'all' || m.celula_id === filterCelula;
    return matchesSearch && matchesCelula;
  });

  return (
    <div className="space-y-6">
      {/* Top Header com Botão Primário "Novo Membro" com bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Membros da Comunidade</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Total de {membros.length} membros registrados no rol eclesiástico
          </p>
        </div>

        {/* Botão Novo Membro */}
        <button
          onClick={handleOpenNew}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-semibold shadow-xs cursor-pointer active:bg-blue-800"
        >
          <UserPlus className="h-4 w-4" />
          <span>Novo Membro</span>
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        <div className="w-full sm:w-64">
          <Select
            value={filterCelula}
            onChange={(e) => setFilterCelula(e.target.value)}
            className="bg-white"
          >
            <option value="all">Todas as Células</option>
            {celulas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Tabela do Shadcn/UI com colunas "Nome", "Email", "Telefone", "Célula", "Status", "Ações" */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Célula</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMembros.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-40 text-center text-gray-500">
                <div className="flex flex-col items-center justify-center gap-2">
                  <span className="font-semibold text-gray-700">
                    {membros.length === 0
                      ? 'Nenhum membro cadastrado no rol eclesiástico ainda.'
                      : 'Nenhum membro encontrado com os filtros aplicados.'}
                  </span>
                  <p className="text-xs text-gray-400">
                    {membros.length === 0
                      ? 'Clique no botão "+ Novo Membro" no canto superior direito para cadastrar o primeiro membro da igreja.'
                      : 'Tente alterar os termos de busca ou o filtro de células.'}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredMembros.map((membro) => {
              const celulaRelacionada = celulas.find((c) => c.id === membro.celula_id);
              const nomeCelula = celulaRelacionada?.nome || membro.celula_nome || 'Sem Célula';

              return (
                <TableRow key={membro.id}>
                  {/* Nome */}
                  <TableCell>
                    <div className="font-semibold text-gray-900">{membro.nome}</div>
                    {membro.data_nascimento && (
                      <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        <span>Nasc: {formatDate(membro.data_nascimento)}</span>
                      </div>
                    )}
                  </TableCell>

                  {/* Email */}
                  <TableCell>
                    <span className="text-gray-600">{membro.email}</span>
                  </TableCell>

                  {/* Telefone */}
                  <TableCell>
                    <span className="text-gray-600 tabular-nums">{membro.telefone || '—'}</span>
                  </TableCell>

                  {/* Célula */}
                  <TableCell>
                    <span className="text-xs font-medium text-slate-700">
                      {nomeCelula}
                    </span>
                  </TableCell>

                  {/* Status: Clean dot indicator without candy pill enclosure */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          membro.status === 'ativo'
                            ? 'bg-emerald-500 ring-2 ring-emerald-100'
                            : membro.status === 'em_observacao'
                            ? 'bg-amber-500 ring-2 ring-amber-100'
                            : 'bg-slate-400 ring-2 ring-slate-100'
                        }`}
                        aria-hidden="true"
                      />
                      <span className={
                        membro.status === 'ativo'
                          ? 'text-emerald-800'
                          : membro.status === 'em_observacao'
                          ? 'text-amber-800'
                          : 'text-slate-600'
                      }>
                        {membro.status === 'ativo'
                          ? 'Ativo'
                          : membro.status === 'em_observacao'
                          ? 'Em Observação'
                          : 'Inativo'}
                      </span>
                    </div>
                  </TableCell>

                  {/* Ações */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(membro)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Editar Membro"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(membro.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Excluir Membro"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Modal do Shadcn para cadastro de membros com campos Input para "Nome completo", "Email", "Telefone" (com máscara), "Data de Nascimento" (Date Picker), e um Select para "Célula" (com opções pré-cadastradas). Botões "Cancelar" em variant ghost e "Salvar Membro" em bg-blue-600 text-white. */}
      <Dialog open={isOpenModal} onOpenChange={onOpenModal}>
        <DialogHeader>
          <DialogTitle>{editingId ? 'Editar Membro' : 'Novo Membro'}</DialogTitle>
          <DialogDescription>
            {editingId
              ? 'Atualize os dados eclesiásticos deste membro da comunidade.'
              : 'Cadastre um novo irmão ou congregado para acompanhamento pastoral.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Nome completo */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Nome completo
            </label>
            <Input
              placeholder="Ex: João da Silva Santos"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              error={errors.nome}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Email
            </label>
            <Input
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
          </div>

          {/* Telefone (com máscara) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Telefone
            </label>
            <Input
              type="tel"
              placeholder="(11) 99999-9999"
              value={telefone}
              onChange={handlePhoneChange}
              maxLength={15}
              error={errors.telefone}
            />
          </div>

          {/* Data de Nascimento (Date Picker do Shadcn/UI) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Data de Nascimento
            </label>
            <DatePicker
              value={dataNascimento}
              onChange={setDataNascimento}
              placeholder="DD/MM/AAAA"
            />
          </div>

          {/* Célula (Select do Shadcn com opções pré-cadastradas) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Célula
            </label>
            <Select
              value={celulaId}
              onChange={(e) => setCelulaId(e.target.value)}
            >
              <option value="">Não vinculado a nenhuma célula</option>
              {celulas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.lider_nome ? `Líder: ${c.lider_nome}` : 'Sem líder'})
                </option>
              ))}
            </Select>
          </div>

          {/* Status Ministerial */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Status Eclesiástico
            </label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as MemberStatus)}
            >
              <option value="ativo">Ativo (Em plena comunhão)</option>
              <option value="em_observacao">Em Observação (Novo convertido / Integração)</option>
              <option value="inativo">Inativo (Transferido / Afastado)</option>
            </Select>
          </div>

          {/* Botões "Cancelar" em variant ghost e "Salvar Membro" em bg-blue-600 text-white */}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenModal(false)}
            >
              Cancelar
            </Button>
            <button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-md transition-colors font-medium text-sm shadow-xs cursor-pointer active:bg-blue-800"
            >
              Salvar Membro
            </button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog
        open={Boolean(deleteConfirmId)}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogHeader>
          <DialogTitle>Excluir Membro</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover este membro do rol da igreja? Esta ação pode ser revertida
            apenas pelo suporte eclesiástico.
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
