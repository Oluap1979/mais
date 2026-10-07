import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Plus, Pencil, Trash, MapPin, Users, User, Info, Search } from 'lucide-react';
import { useToast } from './ui/toast';
import type { Celula, Membro } from '../types/database';

interface CelulasViewProps {
  celulas: Celula[];
  membros: Membro[];
  onSaveCelula: (celula: Partial<Celula>) => Promise<void>;
  onDeleteCelula: (id: string) => Promise<void>;
  isOpenModal: boolean;
  onOpenModal: (open: boolean) => void;
}

export function CelulasView({
  celulas,
  membros,
  onSaveCelula,
  onDeleteCelula,
  isOpenModal,
  onOpenModal,
}: CelulasViewProps) {
  const { toastSuccess, toastError } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [liderId, setLiderId] = useState('');
  const [endereco, setEndereco] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<{ nome?: string }>({});

  const handleOpenNew = () => {
    setEditingId(null);
    setNome('');
    setLiderId('');
    setEndereco('');
    setObservacoes('');
    setErrors({});
    onOpenModal(true);
  };

  const handleOpenEdit = (cel: Celula) => {
    setEditingId(cel.id);
    setNome(cel.nome);
    setLiderId(cel.lider_id || '');
    setEndereco(cel.endereco || '');
    setObservacoes(cel.observacoes || '');
    setErrors({});
    onOpenModal(true);
  };

  const validate = () => {
    const err: { nome?: string } = {};
    if (!nome.trim()) {
      err.nome = 'Nome da célula é obrigatório';
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
      const selectedLider = membros.find((m) => m.id === liderId);
      await onSaveCelula({
        id: editingId || undefined,
        nome,
        lider_id: liderId || null,
        lider_nome: selectedLider ? selectedLider.nome : 'Sem líder',
        endereco,
        observacoes,
      });
      toastSuccess('✅ Sucesso! Operação realizada.');
      onOpenModal(false);
    } catch {
      toastError('❌ Erro. Tente novamente.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteCelula(id);
      setDeleteConfirmId(null);
      toastSuccess('✅ Sucesso! Operação realizada.');
    } catch {
      toastError('❌ Erro. Tente novamente.');
    }
  };

  // Contagem de membros por célula dinamicamente
  const getMembrosCount = (celulaId: string, baseCount?: number) => {
    const directCount = membros.filter((m) => m.celula_id === celulaId).length;
    return directCount > 0 ? directCount : (baseCount || 0);
  };

  const filteredCelulas = celulas.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.endereco?.toLowerCase().includes(search.toLowerCase()) ||
    c.lider_nome?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Topo da página com botão "Nova Célula" idêntico ao de "Novo Membro" (bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Células da Igreja</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Grupos de comunhão, discipulado e crescimento nos lares
          </p>
        </div>

        {/* Botão Nova Célula */}
        <button
          onClick={handleOpenNew}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-semibold shadow-xs cursor-pointer active:bg-blue-800"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Célula</span>
        </button>
      </div>

      {/* Busca rápida */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Buscar célula por nome, líder ou bairro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      {/* Lista de cards representando cada célula */}
      {filteredCelulas.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-dashed border-gray-300">
          <Users className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">Nenhuma célula encontrada</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Cadastre um novo grupo para descentralizar o cuidado pastoral e abençoar lares.
          </p>
          <button
            onClick={handleOpenNew}
            className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Cadastrar Primeira Célula</span>
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCelulas.map((cel) => {
            const count = getMembrosCount(cel.id, cel.membros_count);
            const liderNome = cel.lider_nome || (cel.lider_id ? membros.find(m => m.id === cel.lider_id)?.nome : 'Não informado');

            return (
              /* Cada Card do Shadcn mostra o "Nome da Célula" em text-lg font-semibold, "Líder" em text-gray-700, "Endereço" e "Número de Membros". Botões de edição e exclusão (ícones Pencil e Trash do Lucide React) em cada card. */
              <Card
                key={cel.id}
                className="flex flex-col justify-between border border-gray-200 bg-white hover:border-blue-300 transition-all shadow-xs hover:shadow-md rounded-xl overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    {/* Nome da Célula em text-lg font-semibold */}
                    <CardTitle className="text-lg font-semibold text-gray-900 leading-snug">
                      {cel.nome}
                    </CardTitle>
                    {/* Número de Membros badge */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                      <Users className="h-3 w-3" />
                      <span>{count} membros</span>
                    </span>
                  </div>

                  <div className="space-y-2 mt-4 text-sm">
                    {/* Líder em text-gray-700 */}
                    <div className="flex items-start gap-2.5 text-gray-700">
                      <User className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs text-gray-400 block leading-none mb-0.5">Líder</span>
                        <span className="font-medium text-gray-700">{liderNome}</span>
                      </div>
                    </div>

                    {/* Endereço */}
                    <div className="flex items-start gap-2.5 text-gray-600">
                      <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs text-gray-400 block leading-none mb-0.5">Endereço</span>
                        <span className="text-xs text-gray-600 leading-tight">
                          {cel.endereco || 'Endereço não cadastrado'}
                        </span>
                      </div>
                    </div>

                    {/* Observações */}
                    {cel.observacoes && (
                      <div className="flex items-start gap-2.5 text-gray-500 pt-1">
                        <Info className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                        <span className="text-xs italic text-gray-500 line-clamp-2">
                          {cel.observacoes}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé do card com botões de edição e exclusão (ícones Pencil e Trash do Lucide React) */}
                <div className="border-t border-gray-100 bg-gray-50/70 px-5 py-3 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium">
                    Grupo Ativo
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cel)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100/50 rounded-md transition-colors cursor-pointer"
                      title="Editar Célula"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(cel.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-100/50 rounded-md transition-colors cursor-pointer"
                      title="Excluir Célula"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* O modal de cadastro de célula terá campos Input para "Nome da Célula", "Líder" (Select de membros existentes), "Endereço", e um Textarea para "Observações". */}
      <Dialog open={isOpenModal} onOpenChange={onOpenModal}>
        <DialogHeader>
          <DialogTitle>{editingId ? 'Editar Célula' : 'Nova Célula'}</DialogTitle>
          <DialogDescription>
            Preencha os dados do grupo nos lares para acompanhamento dos encontros semanais.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Input para "Nome da Célula" */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Nome da Célula
            </label>
            <Input
              placeholder="Ex: Célula Emanuel (Famílias)"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              error={errors.nome}
            />
          </div>

          {/* "Líder" (Select de membros existentes) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Líder da Célula
            </label>
            <Select
              value={liderId}
              onChange={(e) => setLiderId(e.target.value)}
            >
              <option value="">Selecione um líder entre os membros cadastrados</option>
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({m.email})
                </option>
              ))}
            </Select>
          </div>

          {/* Input para "Endereço" */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Endereço
            </label>
            <Input
              placeholder="Rua, Número, Bairro e Cidade"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
            />
          </div>

          {/* Textarea para "Observações" */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Observações
            </label>
            <Textarea
              placeholder="Dia e horário dos encontros, faixa etária ou direcionamento ministerial..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>

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
              Salvar Célula
            </button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Confirmação de exclusão de célula */}
      <Dialog
        open={Boolean(deleteConfirmId)}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogHeader>
          <DialogTitle>Excluir Célula</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover esta célula? Os membros vinculados a ela não serão excluídos,
            apenas ficarão desvinculados de grupo.
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
