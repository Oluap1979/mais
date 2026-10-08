import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select } from './ui/select';
import { Button } from './ui/button';
import { Plus, Briefcase, FileText, Award, Scroll, Printer, Trash2, Search, Eye } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { useToast } from './ui/toast';
import { DocumentoOficial } from './DocumentoOficial';
import type { DocumentoSecretaria, UserSession } from '../types/database';

interface SecretariaViewProps {
  documentos: DocumentoSecretaria[];
  onSaveDocumento: (doc: Partial<DocumentoSecretaria>) => Promise<void>;
  onDeleteDocumento: (id: string) => Promise<void>;
  user?: UserSession | null;
}

export function SecretariaView({
  documentos,
  onSaveDocumento,
  onDeleteDocumento,
  user,
}: SecretariaViewProps) {
  const { toastSuccess, toastError } = useToast();

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentoSecretaria | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('Ata de Reunião');
  const [conteudo, setConteudo] = useState('');
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [errors, setErrors] = useState<{ titulo?: string; conteudo?: string }>({});

  const tiposDisponiveis = [
    'Ata de Reunião',
    'Certificado de Batismo',
    'Carta de Recomendação',
    'Certificado de Apresentação',
    'Edital Eclesiástico',
    'Ofício Administrativo',
  ];

  const handleOpenNew = () => {
    setTitulo('');
    setTipo('Ata de Reunião');
    setConteudo('');
    setErrors({});
    setIsOpenModal(true);
  };

  const handleApplyTemplate = (tipoSelecionado: string) => {
    setTipo(tipoSelecionado);
    if (tipoSelecionado === 'Ata de Reunião') {
      setTitulo('Ata da Reunião Ministerial Ordinária');
      setConteudo(
        'Aos [DATA], reuniram-se na sede da igreja os membros da liderança pastoral para deliberações sobre o avanço dos ministérios, aprovação de contas e planejamento dos eventos do Reino de Deus. Todos os pontos de pauta foram aprovados por unanimidade em espírito de comunhão e oração.'
      );
    } else if (tipoSelecionado === 'Certificado de Batismo') {
      setTitulo('Certificado de Batismo nas Águas');
      setConteudo(
        'Certificamos para os devidos fins que o(a) amado(a) irmão(ã) [NOME DO MEMBRO], tendo professado publicamente a sua fé no Senhor Jesus Cristo, desceu às águas batismais em conformidade com a ordenança apostólica do Evangelho de Mateus 28:19.'
      );
    } else if (tipoSelecionado === 'Carta de Recomendação') {
      setTitulo('Carta Pastoral de Recomendação e Mudança');
      setConteudo(
        'Por meio desta, temos a honra de recomendar à vossa amorosa comunhão cristã o(a) estimado(a) irmão(ã) [NOME DO MEMBRO], membro exemplar e comungante desta igreja, que durante o período de convívio conosco testemunhou conduta cristã irrepreensível e fiel serviço no Reino.'
      );
    } else if (tipoSelecionado === 'Certificado de Apresentação') {
      setTitulo('Certificado de Apresentação de Criança');
      setConteudo(
        'Certificamos que a criança [NOME DA CRIANÇA], filha de [NOME DOS PAIS], foi solenemente apresentada ao Senhor Jesus Cristo no templo desta igreja, recebendo a oração e bênção pastoral conforme as Sagradas Escrituras.'
      );
    } else if (tipoSelecionado === 'Edital Eclesiástico') {
      setTitulo('Edital de Convocação Eclesiástica');
      setConteudo(
        'Convocamos todos os membros em comunhão desta congregação para a Assembleia Geral Eclesiástica Ordinária, a realizar-se no templo sede no dia [DATA], às [HORÁRIO], a fim de deliberar sobre assuntos de interesse da comunidade.'
      );
    } else if (tipoSelecionado === 'Ofício Administrativo') {
      setTitulo('Ofício Pastoral Administrativo');
      setConteudo(
        'Cumprimentando-o(a) cordialmente com a graça e a paz de nosso Senhor Jesus Cristo, servimo-nos do presente ofício para comunicar formalmente [ASSUNTO OU SOLICITAÇÃO], colocando-nos à disposição em espírito fraterno.'
      );
    }
  };

  const validate = () => {
    const err: { titulo?: string; conteudo?: string } = {};
    if (!titulo.trim()) err.titulo = 'Título do documento é obrigatório';
    if (!conteudo.trim()) err.conteudo = 'Conteúdo é obrigatório';
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
      await onSaveDocumento({
        titulo,
        tipo,
        conteudo,
      });
      toastSuccess('✅ Sucesso! Operação realizada.');
      setIsOpenModal(false);
    } catch {
      toastError('❌ Erro. Tente novamente.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteDocumento(id);
      setDeleteConfirmId(null);
      if (selectedDoc?.id === id) setSelectedDoc(null);
      toastSuccess('✅ Sucesso! Operação realizada.');
    } catch {
      toastError('❌ Erro. Tente novamente.');
    }
  };

  const filteredDocs = documentos.filter((d) => {
    const matchesSearch =
      d.titulo.toLowerCase().includes(search.toLowerCase()) ||
      d.conteudo.toLowerCase().includes(search.toLowerCase());
    const matchesTipo = filterTipo === 'all' || d.tipo === filterTipo;
    return matchesSearch && matchesTipo;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Secretaria & Arquivo Histórico</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Registro oficial de atas, certificados eclesiásticos e cartas de recomendação
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-semibold shadow-xs cursor-pointer active:bg-blue-800"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Documento</span>
        </button>
      </div>

      {/* Busca e Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por título ou termos do documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        <div className="w-full sm:w-60">
          <Select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="bg-white"
          >
            <option value="all">Todos os Documentos</option>
            {tiposDisponiveis.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Grid de Documentos */}
      {filteredDocs.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-dashed border-gray-300">
          <FileText className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">Nenhum documento registrado</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Crie atas de assembleia, certidões ou cartas pastorais com modelo oficial.
          </p>
          <button
            onClick={handleOpenNew}
            className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Emitir Primeiro Documento</span>
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              className="flex flex-col justify-between border border-gray-200 bg-white hover:border-blue-300 transition-all shadow-xs hover:shadow-md rounded-xl overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Scroll className="h-3 w-3" />
                    <span>{doc.tipo}</span>
                  </div>
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {formatDate(doc.data_criacao)}
                  </span>
                </div>

                <CardTitle className="text-base font-bold text-gray-900 line-clamp-2">
                  {doc.titulo}
                </CardTitle>

                <p className="text-xs text-gray-600 mt-2.5 line-clamp-3 leading-relaxed">
                  {doc.conteudo}
                </p>
              </div>

              <div className="border-t border-gray-100 bg-gray-50/70 px-5 py-3 flex items-center justify-between">
                <button
                  onClick={() => setSelectedDoc(doc)}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Visualizar</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSelectedDoc(doc);
                      setTimeout(() => window.print(), 200);
                    }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Imprimir"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(doc.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Criação de Documento */}
      <Dialog open={isOpenModal} onOpenChange={setIsOpenModal}>
        <DialogHeader>
          <DialogTitle>Novo Documento Eclesiástico</DialogTitle>
          <DialogDescription>
            Escolha um modelo ou elabore um documento personalizado para o arquivo da igreja.
          </DialogDescription>
        </DialogHeader>

        {/* Modelos rápidos */}
        <div className="mb-4">
          <span className="text-xs text-gray-500 font-medium block mb-1.5">Modelos prontos:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleApplyTemplate('Ata de Reunião')}
              className="text-xs px-2.5 py-1 rounded bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-700 transition-colors"
            >
              Ata de Reunião
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate('Certificado de Batismo')}
              className="text-xs px-2.5 py-1 rounded bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-700 transition-colors"
            >
              Certificado de Batismo
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate('Carta de Recomendação')}
              className="text-xs px-2.5 py-1 rounded bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-700 transition-colors"
            >
              Carta de Recomendação
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Tipo do Documento
            </label>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {tiposDisponiveis.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Título Oficial
            </label>
            <Input
              placeholder="Ex: Ata da 12ª Assembleia Geral Ordinária"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              error={errors.titulo}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Texto / Conteúdo
            </label>
            <Textarea
              placeholder="Redija o teor completo do documento..."
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={6}
              error={errors.conteudo}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpenModal(false)}>
              Cancelar
            </Button>
            <button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-md transition-colors font-medium text-sm shadow-xs cursor-pointer active:bg-blue-800"
            >
              Salvar Documento
            </button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Visualizador & Emissor Profissional de Documento Oficial A4 */}
      {selectedDoc && (
        <DocumentoOficial
          documento={selectedDoc}
          user={user || null}
          onClose={() => setSelectedDoc(null)}
        />
      )}

      {/* Confirmação de exclusão */}
      <Dialog
        open={Boolean(deleteConfirmId)}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogHeader>
          <DialogTitle>Excluir Documento</DialogTitle>
          <DialogDescription>
            Tem certeza de que deseja remover permanentemente este documento do arquivo eclesiástico?
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
