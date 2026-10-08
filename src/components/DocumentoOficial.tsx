import React, { useState } from 'react';
import { Printer, X, Edit3, Check, Church, Award, Scroll, FileText } from 'lucide-react';
import { formatDateLong } from '../lib/utils';
import type { DocumentoSecretaria, UserSession } from '../types/database';

interface DocumentoOficialProps {
  documento: DocumentoSecretaria;
  user: UserSession | null;
  onClose: () => void;
}

export function DocumentoOficial({ documento, user, onClose }: DocumentoOficialProps) {
  // Configurações personalizáveis para a impressão do documento
  const [nomeIgreja, setNomeIgreja] = useState(user?.igreja || 'Igreja Evangélica Comunitária');
  const [cidadeEstado, setCidadeEstado] = useState('São Paulo - SP');
  const [nomePastor, setNomePastor] = useState(user?.nome || 'Pastor Presidente');
  const [cargoPastor, setCargoPastor] = useState(user?.cargo || 'Pastor Titular');
  const [nomeSecretario, setNomeSecretario] = useState('Secretaria Geral');
  const [isEditing, setIsEditing] = useState(false);

  // Data formatada por extenso para documentos oficiais
  const dataFormatada = formatDateLong(documento.data_criacao);

  const handlePrint = () => {
    window.print();
  };

  const isBatismo = documento.tipo.toLowerCase().includes('batismo');
  const isRecomendacao = documento.tipo.toLowerCase().includes('recomenda');
  const isApresentacao = documento.tipo.toLowerCase().includes('apresenta');
  const isAta = documento.tipo.toLowerCase().includes('ata');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-6 print:p-0 print:bg-white print:static">
      {/* Barra de Ferramentas / Ações (Não sai na impressão) */}
      <div className="no-print w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2 text-white">
          <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            {isBatismo ? <Award className="h-5 w-5" /> : isRecomendacao ? <Scroll className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{documento.titulo}</h3>
            <p className="text-xs text-slate-400">Pré-visualização de Documento Oficial A4 para Impressão</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5 text-blue-400" />
            <span>{isEditing ? 'Fechar Edição' : 'Personalizar Dados'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs cursor-pointer active:scale-95"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar Visualização"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Painel de Edição Rápida (Não sai na impressão) */}
      {isEditing && (
        <div className="no-print w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4 text-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-md animate-in fade-in duration-200">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Nome da Igreja / Ministério</label>
            <input
              type="text"
              value={nomeIgreja}
              onChange={(e) => setNomeIgreja(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-medium mb-1">Cidade / Estado</label>
            <input
              type="text"
              value={cidadeEstado}
              onChange={(e) => setCidadeEstado(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-medium mb-1">Pastor / Ministro</label>
            <input
              type="text"
              value={nomePastor}
              onChange={(e) => setNomePastor(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-medium mb-1">Secretário(a)</label>
            <input
              type="text"
              value={nomeSecretario}
              onChange={(e) => setNomeSecretario(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* FOLHA OFICIAL A4 (ESTA É A ÁREA QUE É IMPRESSA COM PERFEIÇÃO) */}
      {/* ========================================================= */}
      <div className="documento-oficial-print w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl rounded-sm p-10 sm:p-14 relative flex flex-col justify-between select-text print:shadow-none print:m-0 print:p-8 print:w-full print:max-w-none print:min-h-0">
        
        {/* Caso 1: CERTIFICADO DE BATISMO / APRESENTAÇÃO (ESTILO DIPLOMA / CERTIFICADO COM MOLDURA CLÁSSICA) */}
        {(isBatismo || isApresentacao) ? (
          <div className="h-full border-[6px] border-double border-slate-800 p-8 sm:p-10 flex flex-col justify-between relative bg-gradient-to-b from-amber-50/20 via-white to-amber-50/20">
            {/* Cantoneiras ornamentais clássicas */}
            <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-slate-800 pointer-events-none" />
            <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-slate-800 pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-slate-800 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-slate-800 pointer-events-none" />

            {/* Cabeçalho do Certificado */}
            <div className="text-center pt-2">
              {/* Emblema da Cruz / Igreja */}
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border-2 border-slate-800 mb-3 bg-white text-slate-800 shadow-xs">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M7 8h10" />
                </svg>
              </div>

              <h1 className="text-xl sm:text-2xl font-serif tracking-[0.2em] uppercase font-bold text-slate-900">
                {nomeIgreja}
              </h1>
              <p className="text-[11px] sm:text-xs tracking-widest uppercase text-slate-600 font-medium mt-1">
                Departamento de Secretaria Eclesiástica & Ministério Pastoral
              </p>

              {/* Linha ornamental */}
              <div className="flex items-center justify-center gap-3 my-5">
                <div className="h-[1px] w-16 bg-slate-400" />
                <span className="text-slate-500 text-xs font-serif">❖</span>
                <div className="h-[1px] w-16 bg-slate-400" />
              </div>

              {/* Título Principal em destaque */}
              <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-wide uppercase text-slate-950 mt-1">
                {documento.titulo}
              </h2>
            </div>

            {/* Corpo do Certificado */}
            <div className="my-8 text-center max-w-xl mx-auto">
              <p className="text-base sm:text-lg leading-relaxed text-slate-800 font-serif text-justify sm:text-center">
                {documento.conteudo}
              </p>

              {/* Versículo bíblico solene em itálico */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <p className="text-xs sm:text-sm italic font-serif text-slate-600 leading-relaxed">
                  {isBatismo ? (
                    <>
                      &ldquo;Portanto ide, fazei discípulos de todas as nações, batizando-os em nome do Pai, e do Filho, e do Espírito Santo; ensinando-os a guardar todas as coisas que eu vos tenho mandado.&rdquo;
                      <span className="block mt-1 font-semibold not-italic text-slate-700 tracking-wider">— MATEUS 28:19-20</span>
                    </>
                  ) : (
                    <>
                      &ldquo;Ensina a criança no caminho em que deve andar, e, ainda quando for velho, não se desviará dele.&rdquo;
                      <span className="block mt-1 font-semibold not-italic text-slate-700 tracking-wider">— PROVÉRBIOS 22:6</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Rodapé: Local, Data e Assinaturas */}
            <div className="pt-6">
              <p className="text-center text-xs font-serif text-slate-700 mb-10">
                Dado e passado em <span className="font-semibold">{cidadeEstado}</span>, aos{' '}
                <span className="font-semibold">{dataFormatada}</span>.
              </p>

              <div className="grid grid-cols-2 gap-8 max-w-lg mx-auto text-center">
                <div>
                  <div className="border-b border-slate-800 w-full mb-2" />
                  <p className="text-xs font-bold font-serif uppercase tracking-wider text-slate-900">{nomePastor}</p>
                  <p className="text-[10px] uppercase text-slate-600">{cargoPastor}</p>
                </div>

                <div>
                  <div className="border-b border-slate-800 w-full mb-2" />
                  <p className="text-xs font-bold font-serif uppercase tracking-wider text-slate-900">{nomeSecretario}</p>
                  <p className="text-[10px] uppercase text-slate-600">Secretaria Geral</p>
                </div>
              </div>

              {/* Selo eclesiástico circular decorativo */}
              <div className="mt-8 flex justify-center">
                <div className="w-16 h-16 rounded-full border border-dashed border-slate-400 flex flex-col items-center justify-center text-[8px] uppercase tracking-tighter text-slate-500 font-serif text-center px-1">
                  <span>Selo Oficial</span>
                  <span className="font-bold">REGISTRADO</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Caso 2: PAPEL TIMBRADO OFICIAL (CARTA DE RECOMENDAÇÃO, ATA, OFÍCIO, EDITAL) */
          <div className="flex flex-col justify-between h-full">
            <div>
              {/* Cabeçalho Oficial Timbrado */}
              <div className="border-b-2 border-slate-900 pb-5 mb-8">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <Church className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="text-lg font-serif font-bold uppercase tracking-wider text-slate-950">
                        {nomeIgreja}
                      </h1>
                      <p className="text-[11px] uppercase tracking-widest text-slate-600 font-medium">
                        Secretaria Geral &bull; Arquivo Eclesiástico
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {cidadeEstado} &bull; Documento Oficial
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {documento.tipo}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Reg: {documento.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Título do Documento */}
              <div className="text-center my-6">
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-950 uppercase tracking-wide">
                  {documento.titulo}
                </h2>
                <div className="w-12 h-[2px] bg-slate-900 mx-auto mt-2" />
              </div>

              {/* Vocativo / Saudação formal se for carta de recomendação */}
              {isRecomendacao && (
                <div className="mb-6 text-sm text-slate-800 font-serif leading-relaxed">
                  <p className="font-semibold text-slate-950 mb-1">
                    À Amada Igreja do Senhor Jesus Cristo e ao seu Nobre Ministério Pastoral,
                  </p>
                  <p className="italic text-slate-700">
                    &ldquo;A graça e a paz de nosso Senhor e Salvador Jesus Cristo sejam convosco.&rdquo;
                  </p>
                </div>
              )}

              {/* Conteúdo do Documento formatado */}
              <div className="text-sm sm:text-base leading-relaxed text-slate-800 font-serif text-justify whitespace-pre-wrap space-y-4 indent-8">
                {documento.conteudo}
              </div>

              {/* Encerramento fraterno */}
              {isRecomendacao && (
                <div className="mt-8 text-sm text-slate-800 font-serif">
                  <p>Sem mais para o momento, renovamos nossos protestos de fraterna estima cristã e estima no Senhor.</p>
                  <p className="mt-2 font-semibold italic text-slate-900">Fraternalmente em Cristo,</p>
                </div>
              )}
            </div>

            {/* Rodapé Oficial com Data e Assinaturas */}
            <div className="pt-10 mt-10 border-t border-slate-200">
              <p className="text-center text-xs font-serif text-slate-700 mb-12">
                {cidadeEstado}, {dataFormatada}.
              </p>

              <div className="grid grid-cols-2 gap-10 max-w-lg mx-auto text-center">
                <div>
                  <div className="border-b border-slate-800 w-full mb-2" />
                  <p className="text-xs font-bold font-serif uppercase tracking-wider text-slate-900">{nomePastor}</p>
                  <p className="text-[10px] uppercase text-slate-600">{cargoPastor}</p>
                </div>

                <div>
                  <div className="border-b border-slate-800 w-full mb-2" />
                  <p className="text-xs font-bold font-serif uppercase tracking-wider text-slate-900">{nomeSecretario}</p>
                  <p className="text-[10px] uppercase text-slate-600">Secretaria Geral</p>
                </div>
              </div>

              <div className="mt-10 pt-4 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 uppercase tracking-widest font-mono">
                <span>{nomeIgreja} &bull; Documento Chancelado</span>
                <span>Página 1 de 1</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
