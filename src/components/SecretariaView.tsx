import React, { useState } from 'react';
import { Card, CardTitle } from './ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select } from './ui/select';
import { Button } from './ui/button';
import {
  Plus,
  FileText,
  Award,
  Scroll,
  Printer,
  Trash2,
  Search,
  Eye,
  SlidersHorizontal,
  Sparkles,
  BookOpen,
  Church,
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import { useToast } from './ui/toast';
import { DocumentoOficial } from './DocumentoOficial';
import { ConfigCabecalhoModal } from './ConfigCabecalhoModal';
import { getSavedHeaderConfig, type IgrejaHeaderConfig } from '../types/documentoConfig';
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
  const [isOpenConfigModal, setIsOpenConfigModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentoSecretaria | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [headerConfig, setHeaderConfig] = useState<IgrejaHeaderConfig>(() =>
    getSavedHeaderConfig(user?.igreja, user?.nome, user?.cargo)
  );

  // Form states
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('Carta de Recomendação');
  const [conteudo, setConteudo] = useState('');
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [errors, setErrors] = useState<{ titulo?: string; conteudo?: string }>({});

  const tiposDisponiveis = [
    'Carta de Recomendação',
    'Certificado de Batismo',
    'Certificado de Apresentação',
    'Declaração de Membro',
    'Certificado de Consagração',
    'Ata de Reunião',
    'Edital Eclesiástico',
    'Ofício Administrativo',
  ];

  const handleOpenNew = () => {
    setTitulo('');
    setTipo('Carta de Recomendação');
    handleApplyTemplate('Carta de Recomendação');
    setErrors({});
    setIsOpenModal(true);
  };

  const handleApplyTemplate = (tipoSelecionado: string) => {
    setTipo(tipoSelecionado);
    if (tipoSelecionado === 'Carta de Recomendação') {
      setTitulo('Carta Pastoral de Recomendação e Mudança');
      setConteudo(
        'Por meio desta, temos a honra e o grato dever cristão de recomendar à vossa fraterna comunhão o(a) estimado(a) irmão(ã) [NOME DO MEMBRO], portador(a) do RG [NÚMERO], membro em plena comunhão bíblica e comungante com esta Igreja local.\n\nDurante todo o período em que conviveu sob os nossos cuidados pastorais, deu testemunho de conduta cristã exemplar, irrepreensível e ilibada, participando ativamente dos santos cultos e trabalhos do Reino de Deus.\n\nSolicitamos que o(a) acolhais no Senhor com o mesmo amor fraternal com que sempre o(a) tivemos em nosso meio, concedendo-lhe todo o apoio e assistência espiritual necessária.'
      );
    } else if (tipoSelecionado === 'Certificado de Batismo') {
      setTitulo('Certificado de Batismo nas Águas');
      setConteudo(
        'Certificamos para a glória de Deus e para os devidos fins eclesiásticos que o(a) amado(a) irmão(ã) [NOME DO BATIZANDO], tendo professado voluntária e publicamente a sua fé no Senhor e Salvador Jesus Cristo, foi solenemente batizado(a) nas águas em conformidade com o mandamento bíblico e apostólico expresso no Santo Evangelho.'
      );
    } else if (tipoSelecionado === 'Certificado de Apresentação') {
      setTitulo('Certificado de Apresentação ao Senhor');
      setConteudo(
        'Certificamos que a criança [NOME DA CRIANÇA], nascida em [DATA DE NASCIMENTO], filha dos amados irmãos [NOME DO PAI] e [NOME DA MÃE], foi solenemente apresentada ao Senhor Jesus Cristo no templo sede desta Igreja, recebendo a santa oração intercessória e a bênção do Ministério Pastoral com a imposição de mãos.'
      );
    } else if (tipoSelecionado === 'Declaração de Membro') {
      setTitulo('Declaração de Membro em Plena Comunhão');
      setConteudo(
        'Declaramos para os devidos fins a quem interessar possa que o(a) senhor(a) [NOME DO MEMBRO], inscrito(a) no CPF sob o nº [000.000.000-00], é membro ativo e comungante desta Igreja, achando-se no pleno gozo de seus direitos e deveres espirituais e eclesiásticos, sem nada que desabone sua conduta moral e cristã.'
      );
    } else if (tipoSelecionado === 'Certificado de Consagração') {
      setTitulo('Certificado de Consagração Ministerial');
      setConteudo(
        'A Diretoria e o Ministério Pastoral desta Igreja certificam que o(a) amado(a) irmão(ã) [NOME DO OBREIRO], tendo dado provas de piedade, dedicação e vocação pelo Espírito Santo, foi solenemente consagrado(a) e empossado(a) ao nobre cargo de [DIÁCONO / PRESBÍTERO / EVANGELISTA / MISSIONÁRIO], com unção e imposição de mãos da liderança da Igreja.'
      );
    } else if (tipoSelecionado === 'Ata de Reunião') {
      setTitulo('Ata da Reunião Ministerial Ordinária');
      setConteudo(
        'Aos [DATA], às [HORÁRIO], reuniram-se na sede da congregação os membros da diretoria e liderança pastoral desta Igreja, sob a presidência do Pastor Titular, a fim de tratar dos seguintes assuntos: 1) Prestação de contas financeiras do mês anterior; 2) Planejamento das campanhas evangelísticas e cultos comemorativos; 3) Assuntos gerais do rebanho. Após exposição e discussão fraterna, todos os pontos de pauta foram aprovados por unânime deliberação.'
      );
    } else if (tipoSelecionado === 'Edital Eclesiástico') {
      setTitulo('Edital de Convocação de Assembleia Geral');
      setConteudo(
        'Pelo presente Edital, o Pastor Presidente desta Igreja, no uso de suas atribuições eclesiásticas e estatutárias, convoca todos os membros em plena comunhão para a Assembleia Geral Ordinária, a realizar-se no templo sede no dia [DATA], às [HORÁRIO], a fim de deliberar sobre a aprovação das contas anuais e eleição da nova diretoria para o próximo biênio.'
      );
    } else if (tipoSelecionado === 'Ofício Administrativo') {
      setTitulo('Ofício Pastoral Administrativo');
      setConteudo(
        'Cumprimentando-vos mui cordialmente com a graça e a paz de nosso Senhor e Salvador Jesus Cristo, servimo-nos do presente ofício para comunicar respeitosamente a esta nobre instituição [ASSUNTO / COMUNICADO OFICIAL], colocando-nos à inteira disposição para o que for necessário ao bom andamento dos trabalhos cristãos.'
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
      toastError('Preencha os campos obrigatórios.');
      return;
    }

    try {
      await onSaveDocumento({
        titulo,
        tipo,
        conteudo,
      });
      toastSuccess('Documento oficial registrado com sucesso!');
      setIsOpenModal(false);
    } catch {
      toastError('Erro ao registrar documento.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteDocumento(id);
      setDeleteConfirmId(null);
      if (selectedDoc?.id === id) setSelectedDoc(null);
      toastSuccess('Documento removido com sucesso.');
    } catch {
      toastError('Erro ao remover documento.');
    }
  };

  const handleUpdateConteudoViewer = async (novoConteudo: string, novoTitulo?: string) => {
    if (!selectedDoc) return;
    try {
      await onSaveDocumento({
        id: selectedDoc.id,
        titulo: novoTitulo || selectedDoc.titulo,
        conteudo: novoConteudo,
        tipo: selectedDoc.tipo,
      });
      setSelectedDoc((prev) =>
        prev
          ? {
              ...prev,
              titulo: novoTitulo || prev.titulo,
              conteudo: novoConteudo,
            }
          : null
      );
      toastSuccess('Alterações salvas no documento!');
    } catch {
      toastError('Erro ao salvar alterações no documento.');
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
      {/* Top Header com Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>Secretaria & Chancelaria Eclesiástica</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold border border-blue-200">
              A4 Profissional
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Emissão de certificados, cartas pastorais, atas e ofícios com cabeçalho timbrado personalizável para qualquer igreja
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpenConfigModal(true)}
            className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 px-3.5 py-2 rounded-lg hover:bg-gray-50 transition-colors text-xs font-semibold shadow-xs cursor-pointer active:scale-95"
            title="Personalizar Cabeçalho, CNPJ, Endereço e Link da Logo"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
            <span>Configurar Cabeçalho & Logo</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNew}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs font-bold shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Documento</span>
          </button>
        </div>
      </div>

      {/* Barra de Status e Identidade da Igreja para Impressão */}
      <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
            {headerConfig.logoUrl ? (
              <img
                src={headerConfig.logoUrl}
                alt={headerConfig.nomeIgreja}
                className="w-full h-full object-contain p-1"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Church className="w-5 h-5 text-blue-600" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">
                {headerConfig.nomeIgreja}
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Cabeçalho A4 Ativo
              </span>
            </div>
            <p className="text-gray-500 text-xs mt-0.5 truncate max-w-xl">
              {headerConfig.endereco || 'Endereço da igreja não configurado'}
              {headerConfig.bairro ? ` • ${headerConfig.bairro}` : ''}
              {headerConfig.cidadeEstado ? ` • ${headerConfig.cidadeEstado}` : ''}
              {headerConfig.cnpj ? ` • CNPJ: ${headerConfig.cnpj}` : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpenConfigModal(true)}
          className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Editar Logo & Dados da Igreja</span>
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

        <div className="w-full sm:w-64">
          <Select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="bg-white"
          >
            <option value="all">Todos os Tipos ({documentos.length})</option>
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
        <Card className="p-12 text-center bg-white border border-dashed border-gray-300 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-100">
            <BookOpen className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Nenhum documento encontrado</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Emita cartas pastorais de recomendação, certificados de batismo com moldura clássica, certidões ou atas de reunião.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={handleOpenNew}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Emitir Documento Oficial</span>
            </button>
            <button
              onClick={() => setIsOpenConfigModal(true)}
              className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Configurar Cabeçalho</span>
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => {
            const isCert =
              doc.tipo.toLowerCase().includes('batismo') ||
              doc.tipo.toLowerCase().includes('apresenta') ||
              doc.tipo.toLowerCase().includes('certificado') ||
              doc.tipo.toLowerCase().includes('consagra');
            const isRec = doc.tipo.toLowerCase().includes('recomenda');

            return (
              <Card
                key={doc.id}
                className="flex flex-col justify-between border border-gray-200/90 bg-white hover:border-blue-400 hover:shadow-lg transition-all rounded-2xl overflow-hidden group"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        isCert
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : isRec
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      {isCert ? <Award className="h-3 w-3" /> : isRec ? <Scroll className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                      <span>{doc.tipo}</span>
                    </span>

                    <span className="text-[11px] text-gray-400 tabular-nums">
                      {formatDate(doc.data_criacao)}
                    </span>
                  </div>

                  <CardTitle className="text-base font-bold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2">
                    {doc.titulo}
                  </CardTitle>

                  <p className="text-xs text-gray-600 mt-2.5 line-clamp-3 leading-relaxed">
                    {doc.conteudo}
                  </p>
                </div>

                <div className="border-t border-gray-100 bg-gray-50/80 px-5 py-3 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedDoc(doc)}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-bold cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Visualizar A4</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedDoc(doc);
                        setTimeout(() => window.print(), 350);
                      }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Imprimir / Salvar PDF"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(doc.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Criação de Documento */}
      <Dialog open={isOpenModal} onOpenChange={setIsOpenModal}>
        <DialogHeader>
          <DialogTitle>Novo Documento Eclesiástico</DialogTitle>
          <DialogDescription>
            Selecione um modelo pastoral pronto ou crie um documento personalizado para o arquivo oficial da igreja.
          </DialogDescription>
        </DialogHeader>

        {/* Modelos rápidos */}
        <div className="mb-4">
          <span className="text-xs text-gray-600 font-bold block mb-1.5">
            Modelos Canônicos Eclesiásticos:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {tiposDisponiveis.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleApplyTemplate(t)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium ${
                  tipo === t
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-blue-100 hover:text-blue-800 text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Tipo do Documento
            </label>
            <Select value={tipo} onChange={(e) => handleApplyTemplate(e.target.value)}>
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
              placeholder="Ex: Carta Pastoral de Recomendação e Mudança"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              error={errors.titulo}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Texto / Teor do Documento
            </label>
            <Textarea
              placeholder="Redija o teor completo do documento..."
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={7}
              error={errors.conteudo}
              className="font-sans leading-relaxed text-xs"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpenModal(false)}>
              Cancelar
            </Button>
            <button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors font-bold text-xs shadow-xs cursor-pointer active:scale-95"
            >
              Emitir e Salvar Documento
            </button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Modal Independente de Configuração do Cabeçalho da Igreja */}
      <ConfigCabecalhoModal
        open={isOpenConfigModal}
        onOpenChange={(open) => {
          setIsOpenConfigModal(open);
          if (!open) {
            setHeaderConfig(getSavedHeaderConfig(user?.igreja, user?.nome, user?.cargo));
          }
        }}
        user={user}
        onSaveSuccess={() => {
          setHeaderConfig(getSavedHeaderConfig(user?.igreja, user?.nome, user?.cargo));
          toastSuccess('Cabeçalho da igreja atualizado com sucesso!');
        }}
      />

      {/* Visualizador & Emissor Profissional de Documento Oficial A4 */}
      {selectedDoc && (
        <DocumentoOficial
          documento={selectedDoc}
          user={user || null}
          onClose={() => setSelectedDoc(null)}
          onUpdateConteudo={handleUpdateConteudoViewer}
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
