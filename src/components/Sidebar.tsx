import React from 'react';
import { LayoutDashboard, Users, Group, Briefcase, DollarSign, Church, LogOut, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import type { UserSession } from '../types/database';

export type NavItemKey = 'dashboard' | 'membros' | 'celulas' | 'secretaria' | 'financeiro';

interface SidebarProps {
  currentPath: NavItemKey;
  onNavigate: (path: NavItemKey) => void;
  user: UserSession | null;
  onLogout: () => void;
  onOpenConfig?: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  currentPath,
  onNavigate,
  user,
  onLogout,
  onOpenConfig,
  isMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const menuItems = [
    { key: 'dashboard' as NavItemKey, label: 'Início', icon: LayoutDashboard },
    { key: 'membros' as NavItemKey, label: 'Membros', icon: Users },
    { key: 'celulas' as NavItemKey, label: 'Células', icon: Group },
    { key: 'secretaria' as NavItemKey, label: 'Secretaria', icon: Briefcase },
    { key: 'financeiro' as NavItemKey, label: 'Financeiro', icon: DollarSign },
  ];

  const handleSelect = (key: NavItemKey) => {
    onNavigate(key);
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside
      className={cn(
        'w-[250px] bg-slate-900 text-slate-100 flex flex-col shrink-0 select-none justify-between h-full border-r border-slate-800',
        !isMobile && 'hidden md:flex md:fixed md:inset-y-0 md:left-0 z-30 shadow-sm'
      )}
    >
      {/* Top Logo */}
      <div className="flex flex-col">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800/80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <Church className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-tight">Mais Igreja</h1>
            <p className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">Gestão Eclesiástica</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex flex-col gap-1 px-3 py-4">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Menu Principal
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleSelect(item.key)}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all text-left w-full cursor-pointer',
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer with User info & logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        {user && (
          <div className="mb-3 px-1">
            <p className="text-xs font-semibold text-white truncate">{user.nome}</p>
            <p className="text-[11px] text-slate-400 truncate">{user.cargo}</p>
          </div>
        )}

        <div className="flex flex-col gap-1">
          {onOpenConfig && (
            <button
              onClick={() => {
                onOpenConfig();
                if (isMobile && onCloseMobile) onCloseMobile();
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-md transition-colors w-full cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5 text-blue-400" />
              <span>Configurações</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-md transition-colors w-full cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
