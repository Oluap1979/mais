import React, { useState } from 'react';
import { Menu, Church, Settings, Database, RefreshCw } from 'lucide-react';
import type { UserSession } from '../types/database';
import type { NavItemKey } from './Sidebar';
import { isSupabaseConfigured } from '../lib/supabase';

interface HeaderProps {
  currentPath: NavItemKey;
  onOpenMobileMenu: () => void;
  user: UserSession | null;
  onOpenConfig?: () => void;
  onRefresh?: () => Promise<void> | void;
}

const titles: Record<NavItemKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Painel Geral', subtitle: 'Visão consolidada e métricas da comunidade' },
  membros: { title: 'Gestão de Membros', subtitle: 'Rol de membros e integração da congregação' },
  celulas: { title: 'Rede de Células', subtitle: 'Grupos nos lares e líderes de comunhão' },
  secretaria: { title: 'Secretaria Eclesiástica', subtitle: 'Atas de reunião, certificados e ofícios' },
  financeiro: { title: 'Gestão Financeira', subtitle: 'Dízimos, ofertas, relatórios e saídas' },
};

export function Header({ currentPath, onOpenMobileMenu, user, onOpenConfig, onRefresh }: HeaderProps) {
  const current = titles[currentPath] || titles.dashboard;
  const isConnected = isSupabaseConfigured();
  const [refreshing, setRefreshing] = useState(false);

  const handleSync = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/95 px-4 sm:px-8 backdrop-blur-xs">
      {/* Left zone: Mobile toggle + titles */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Abrir Menu Principal"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">{current.title}</h2>
          <p className="hidden sm:block text-xs text-gray-500">{current.subtitle}</p>
        </div>
      </div>

      {/* Right zone: Church community, database connection status, settings & profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Status do Banco de Dados Conectado */}
        <button
          type="button"
          onClick={onOpenConfig}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
            isConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
          }`}
          title={isConnected ? 'Banco de dados Supabase Conectado' : 'Configurar conexão com o Supabase'}
        >
          <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <Database className="h-3.5 w-3.5" />
          <span className="hidden md:inline">
            {isConnected ? 'Supabase Conectado' : 'Conectar Banco'}
          </span>
        </button>

        {/* Botão de sincronização rápida com o banco */}
        {onRefresh && (
          <button
            type="button"
            onClick={handleSync}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors text-xs font-medium cursor-pointer"
            title="Sincronizar tabelas agora com o banco de dados"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden xl:inline">Sincronizar</span>
          </button>
        )}

        <div className="hidden lg:flex items-center gap-2 text-xs text-gray-600 font-medium">
          <Church className="h-4 w-4 text-blue-600" />
          <span className="text-gray-900 font-semibold">{user?.igreja || 'Mais Igreja'}</span>
        </div>

        {onOpenConfig && (
          <button
            type="button"
            onClick={onOpenConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors text-xs font-semibold cursor-pointer shadow-2xs"
            title="Configurações da Igreja e do Sistema"
          >
            <Settings className="h-3.5 w-3.5 text-blue-600" />
            <span className="hidden sm:inline">Configurações</span>
          </button>
        )}

        <div className="h-5 w-px bg-gray-200 hidden sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold shadow-xs">
            {user?.nome ? user.nome.slice(0, 2).toUpperCase() : 'MI'}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-gray-900 leading-tight">{user?.nome?.split(' ')[0]}</span>
            <span className="text-[11px] text-gray-500 leading-tight">{user?.cargo || 'Liderança'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
