import React, { useState, useEffect, useCallback } from 'react';
import { db, DEFAULT_USER, STORAGE_KEYS } from './lib/supabase';
import { ToastProvider, useToast } from './components/ui/toast';
import { LoadingSpinner } from './components/ui/loading-spinner';
import { Drawer } from './components/ui/drawer';
import { Sidebar, type NavItemKey } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { MembrosView } from './components/MembrosView';
import { CelulasView } from './components/CelulasView';
import { FinanceiroView } from './components/FinanceiroView';
import { SecretariaView } from './components/SecretariaView';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import type { Membro, Celula, RegistroFinanceiro, DocumentoSecretaria, UserSession } from './types/database';

function MainApp() {
  const [user, setUser] = useState<UserSession | null>(() => {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    if (pathname.includes('/login') || pathname.includes('/cadastro') || pathname.includes('/register')) {
      return null;
    }
    return db.getUser();
  });
  const [currentPath, setCurrentPath] = useState<NavItemKey>('dashboard');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);

  // Modais acionáveis de outros lugares (ex: Dashboard quick actions)
  const [openModalMembro, setOpenModalMembro] = useState(false);
  const [openModalCelula, setOpenModalCelula] = useState(false);

  // Estados de dados
  const [membros, setMembros] = useState<Membro[]>([]);
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [financeiro, setFinanceiro] = useState<RegistroFinanceiro[]>([]);
  const [secretaria, setSecretaria] = useState<DocumentoSecretaria[]>([]);

  // Inicialização de URL / Router simulado (suporta / ou /dashboard, /membros, /celulas, /cadastro etc.)
  useEffect(() => {
    const pathname = window.location.pathname;
    const initialUser = db.getUser();

    if (pathname.includes('/cadastro') || pathname.includes('/register')) {
      setAuthMode('register');
    }

    if (pathname.includes('/membros')) {
      setCurrentPath('membros');
    } else if (pathname.includes('/celulas')) {
      setCurrentPath('celulas');
    } else if (pathname.includes('/secretaria')) {
      setCurrentPath('secretaria');
    } else if (pathname.includes('/financeiro')) {
      setCurrentPath('financeiro');
    } else {
      setCurrentPath('dashboard');
    }

    // Se estiver na rota raiz / e usuário logado, mantém login
    if (initialUser) {
      setUser(initialUser);
    }
  }, []);

  // Carregamento de dados da comunidade
  const loadData = useCallback(async () => {
    setGlobalLoading(true);
    try {
      const [mems, cels, fins, secs] = await Promise.all([
        db.getMembros(),
        db.getCelulas(),
        db.getFinanceiro(),
        db.getSecretaria(),
      ]);
      setMembros(mems);
      setCelulas(cels);
      setFinanceiro(fins);
      setSecretaria(secs);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleNavigate = (path: NavItemKey) => {
    setCurrentPath(path);
    window.history.pushState({}, '', `/${path}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (loggedInUser: UserSession) => {
    setUser(loggedInUser);
    setCurrentPath('dashboard');
    window.history.pushState({}, '', '/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    setUser(null);
    window.history.pushState({}, '', '/login');
  };

  // Handlers de Membros
  const handleSaveMembro = async (membro: Partial<Membro>) => {
    setGlobalLoading(true);
    try {
      await db.saveMembro(membro);
      await loadData();
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleDeleteMembro = async (id: string) => {
    setGlobalLoading(true);
    try {
      await db.deleteMembro(id);
      await loadData();
    } finally {
      setGlobalLoading(false);
    }
  };

  // Handlers de Células
  const handleSaveCelula = async (celula: Partial<Celula>) => {
    setGlobalLoading(true);
    try {
      await db.saveCelula(celula);
      await loadData();
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleDeleteCelula = async (id: string) => {
    setGlobalLoading(true);
    try {
      await db.deleteCelula(id);
      await loadData();
    } finally {
      setGlobalLoading(false);
    }
  };

  // Handlers de Financeiro
  const handleSaveFinanceiro = async (reg: Partial<RegistroFinanceiro>) => {
    setGlobalLoading(true);
    try {
      await db.saveFinanceiro(reg);
      await loadData();
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleDeleteFinanceiro = async (id: string) => {
    setGlobalLoading(true);
    try {
      await db.deleteFinanceiro(id);
      await loadData();
    } finally {
      setGlobalLoading(false);
    }
  };

  // Handlers de Secretaria
  const handleSaveDocumento = async (doc: Partial<DocumentoSecretaria>) => {
    setGlobalLoading(true);
    try {
      await db.saveSecretaria(doc);
      await loadData();
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleDeleteDocumento = async (id: string) => {
    setGlobalLoading(true);
    try {
      await db.deleteSecretaria(id);
      await loadData();
    } finally {
      setGlobalLoading(false);
    }
  };

  // Tela de login se não houver usuário autenticado
  if (!user) {
    return (
      <>
        {globalLoading && <LoadingSpinner fullScreen />}
        <LoginView
          initialMode={authMode}
          onLoginSuccess={handleLoginSuccess}
          onSetLoading={setGlobalLoading}
          onOpenConfig={() => setConfigModalOpen(true)}
        />
        <SupabaseConfigModal
          open={configModalOpen}
          onOpenChange={setConfigModalOpen}
          onDataUpdated={loadData}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row antialiased text-gray-900 font-sans">
      {/* Loading Spinner global durante requisições de dados */}
      {globalLoading && <LoadingSpinner fullScreen />}

      {/* Sidebar Desktop Fixa à Esquerda (largura 250px, fundo bg-blue-800 com text-white) */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={handleNavigate}
        user={user}
        onLogout={handleLogout}
        onOpenConfig={() => setConfigModalOpen(true)}
      />

      {/* Drawer Responsivo para Dispositivos Móveis (< 768px / breakpoint md) */}
      <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <Sidebar
          currentPath={currentPath}
          onNavigate={handleNavigate}
          user={user}
          onLogout={handleLogout}
          onOpenConfig={() => {
            setMobileMenuOpen(false);
            setConfigModalOpen(true);
          }}
          isMobile
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
      </Drawer>

      {/* Conteúdo Principal (offset desktop de 250px para acomodar a sidebar fixa) */}
      <div className="flex-1 md:ml-[250px] flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <Header
          currentPath={currentPath}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          user={user}
          onOpenConfig={() => setConfigModalOpen(true)}
          onRefresh={loadData}
        />

        {/* Área de conteúdo principal, bg-gray-50 */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentPath === 'dashboard' && (
            <DashboardView
              membros={membros}
              celulas={celulas}
              financeiro={financeiro}
              onNavigate={handleNavigate}
              onOpenNovoMembro={() => {
                setCurrentPath('membros');
                setOpenModalMembro(true);
              }}
              onOpenNovaCelula={() => {
                setCurrentPath('celulas');
                setOpenModalCelula(true);
              }}
            />
          )}

          {currentPath === 'membros' && (
            <MembrosView
              membros={membros}
              celulas={celulas}
              onSaveMembro={handleSaveMembro}
              onDeleteMembro={handleDeleteMembro}
              isOpenModal={openModalMembro}
              onOpenModal={setOpenModalMembro}
            />
          )}

          {currentPath === 'celulas' && (
            <CelulasView
              celulas={celulas}
              membros={membros}
              onSaveCelula={handleSaveCelula}
              onDeleteCelula={handleDeleteCelula}
              isOpenModal={openModalCelula}
              onOpenModal={setOpenModalCelula}
            />
          )}

          {currentPath === 'secretaria' && (
            <SecretariaView
              documentos={secretaria}
              onSaveDocumento={handleSaveDocumento}
              onDeleteDocumento={handleDeleteDocumento}
              user={user}
            />
          )}

          {currentPath === 'financeiro' && (
            <FinanceiroView
              financeiro={financeiro}
              onSaveFinanceiro={handleSaveFinanceiro}
              onDeleteFinanceiro={handleDeleteFinanceiro}
            />
          )}
        </main>
      </div>

      {/* Modal de Configuração e SQL Supabase */}
      <SupabaseConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        onDataUpdated={() => {
          const freshUser = db.getUser();
          if (freshUser) setUser(freshUser);
          loadData();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
