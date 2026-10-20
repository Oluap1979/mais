import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Calendar, Clock, MapPin, AlignLeft, Palette, Trash2, Check, Sparkles } from 'lucide-react';
import { useToast } from './ui/toast';
import type { AgendaItem } from '../types/database';

interface AgendaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendaItem?: AgendaItem | null;
  onSave: (item: Partial<AgendaItem>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const colorOptions: Array<{ key: AgendaItem['cor']; label: string; bgClass: string; borderClass: string; textClass: string }> = [
  { key: 'blue', label: 'Azul (Doutrina / Ensino)', bgClass: 'bg-blue-500', borderClass: 'border-blue-400', textClass: 'text-blue-700' },
  { key: 'green', label: 'Verde (Células / Comunhão)', bgClass: 'bg-emerald-500', borderClass: 'border-emerald-400', textClass: 'text-emerald-700' },
  { key: 'indigo', label: 'Índigo (Celebração / Ceia)', bgClass: 'bg-indigo-500', borderClass: 'border-indigo-400', textClass: 'text-indigo-700' },
  { key: 'purple', label: 'Roxo (Jovens / Vigília)', bgClass: 'bg-purple-500', borderClass: 'border-purple-400', textClass: 'text-purple-700' },
  { key: 'amber', label: 'Âmbar (Oração / Clamor)', bgClass: 'bg-amber-500', borderClass: 'border-amber-400', textClass: 'text-amber-700' },
  { key: 'rose', label: 'Rosa (Mulheres / Família)', bgClass: 'bg-rose-500', borderClass: 'border-rose-400', textClass: 'text-rose-700' },
];

export function AgendaModal({
  open,
  onOpenChange,
  agendaItem,
  onSave,
  onDelete,
}: AgendaModalProps) {
  const { toastSuccess, toastError } = useToast();

  const [titulo, setTitulo] = useState('');
  const [diaHorario, setDiaHorario] = useState('');
  const [descricao, setDescricao] = useState('');
  const [local, setLocal] = useState('');
  const [cor, setCor] = useState<AgendaItem['cor']>('blue');
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (agendaItem) {
      setTitulo(agendaItem.titulo || '');
      setDiaHorario(agendaItem.dia_horario || '');
      setDescricao(agendaItem.descricao || '');
      setLocal(agendaItem.local || 'Templo Central');
      setCor(agendaItem.cor || 'blue');
    } else {
      setTitulo('');
      setDiaHorario('Domingo · 19h00');
      setDescricao('');
      setLocal('Templo Central');
      setCor('blue');
    }
    setConfirmDelete(false);
  }, [agendaItem, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim()) {
      toastError('Informe o título do culto ou encontro.');
      return;
    }
    if (!diaHorario.trim()) {
      toastError('Informe o dia e horário do agendamento.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        id: agendaItem?.id,
        titulo: titulo.trim(),
        dia_horario: diaHorario.trim(),
        descricao: descricao.trim(),
        local: local.trim() || 'Templo Central',
        cor: cor || 'blue',
      });
      toastSuccess(agendaItem ? '✅ Agendamento atualizado com sucesso!' : '✅ Novo agendamento adicionado à programação!');
      onOpenChange(false);
    } catch {
      toastError('Erro ao salvar agendamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!agendaItem?.id || !onDelete) return;
    setLoading(true);
    try {
      await onDelete(agendaItem.id);
      toastSuccess('🗑️ Agendamento removido da programação.');
      onOpenChange(false);
    } catch {
      toastError('Erro ao excluir agendamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-gray-900">
              {agendaItem ? 'Editar Agendamento Semanal' : 'Novo Agendamento Litúrgico & Comunitário'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Configure cultos, vigílias, reuniões de células ou eventos semanais da comunidade.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Título do Culto / Encontro *
          </label>
          <Input
            placeholder="Ex: Culto de Ensino & Doutrina, Vigília dos Jovens"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="bg-white text-gray-900 text-sm font-semibold"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              <span>Dia e Horário *</span>
            </label>
            <Input
              placeholder="Ex: Quarta-feira · 19h30"
              value={diaHorario}
              onChange={(e) => setDiaHorario(e.target.value)}
              className="bg-white text-gray-900 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
              <span>Local / Espaço</span>
            </label>
            <Input
              placeholder="Ex: Templo Central, Nave Principal"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              className="bg-white text-gray-900 text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <AlignLeft className="h-3.5 w-3.5 text-blue-600" />
            <span>Descrição / Objetivo</span>
          </label>
          <textarea
            placeholder="Ex: Louvor congregacional, ministração expositiva da Palavra e oração com a família."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          />
        </div>

        {/* Paleta de Cores do Card */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5 text-blue-600" />
            <span>Destaque / Cor do Agendamento</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {colorOptions.map((opt) => {
              const isSelected = cor === opt.key;
              return (
                <button
                  type="button"
                  key={opt.key}
                  onClick={() => setCor(opt.key)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/80 shadow-xs ring-2 ring-blue-500/30'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className={`h-4 w-4 rounded-full ${opt.bgClass} mb-1 flex items-center justify-center`}>
                    {isSelected && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
                  </span>
                  <span className="text-[10px] text-gray-700 truncate w-full text-center">
                    {opt.key}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ações do Rodapé */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
          {agendaItem && onDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-rose-600 font-semibold">Confirmar?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer"
                >
                  Sim, Excluir
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Excluir</span>
              </button>
            )
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Salvando...' : agendaItem ? 'Salvar Alterações' : 'Adicionar Agendamento'}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
