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
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminPanel } from './components/AdminPanel';
import { LicenseActivationModal } from './components/LicenseActivationModal';
import type { Membro, Celula, RegistroFinanceiro, DocumentoSecretaria, UserSession, ChurchLicense } from './types/database';
import { Key, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';

function MainApp() {
  const { toastSuccess, toastError } = useToast();

  const [user, setUser] = useState<UserSession | null>(() => {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    if (pathname.includes('/login') || pathname.includes('/cadastro') || pathname.includes('/register')) {
      return null;
    }
    return db.getUser();
  });

  const [adminToken, setAdminToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  });

  const [currentPath, setCurrentPath] = useState<NavItemKey>('dashboard');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [adminLoginModalOpen, setAdminLoginModalOpen] = useState(false);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);

  // Licença
  const [license, setLicense] = useState<ChurchLicense | null>(null);

  // Modais acionáveis
  const [openModalMembro, setOpenModalMembro] = useState(false);
  const [openModalCelula, setOpenModalCelula] = useState(false);

  // Estados de dados
  const [membros, setMembros] = useState<Membro[]>([]);
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [financeiro, setFinanceiro] = useState<RegistroFinanceiro[]>([]);
  const [secretaria, setSecretaria] = useState<DocumentoSecretaria[]>([]);

  useEffect(() => {
    const pathname = window.location.pathname;
    const initialUser = db.getUser();

    if (pathname.includes('/cadastro') || pathname.includes('/register')) {
      setAuthMode('register');
    }

    if (initialUser) {
      setUser(initialUser);
    }
  }, []);

  // Carregamento de licença e dados
  const loadLicenseAndData = useCallback(async () => {
    if (!user) return;
    setGlobalLoading(true);
    try {
      const lic = await db.getLicense(user.email, user.id);
      setLicense(lic);

      if (lic.status === 'trial_expired') {
        setLicenseModalOpen(true);
      }

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
  }, [user]);

  useEffect(() => {
    if (user && !adminToken) {
      loadLicenseAndData();
    }
  }, [user, adminToken, loadLicenseAndData]);

  const handleNavigate = (path: NavItemKey) => {
    if (license?.status === 'trial_expired') {
      setLicenseModalOpen(true);
      return;
    }
    setCurrentPath(path);
    window.history.pushState({}, '', `/${path}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (loggedInUser: UserSession) => {
    setUser(loggedInUser);
    setAdminToken(null);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
    setCurrentPath('dashboard');
    window.history.pushState({}, '', '/dashboard');
  };

  const handleLogout = () => {
    db.setUser(null);
    setUser(null);
    setLicense(null);
    window.history.pushState({}, '', '/login');
  };

  const handleLogoutAdmin = () => {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
    setAdminToken(null);
  };

  // Handlers de dados
  const handleSaveMembro = async (membro: Partial<Membro>) => {
    setGlobalLoading(true);
    try {
      await db.saveMembro(membro);
      await loadLicenseAndData();
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleDeleteMembro = async (id: string) => {
    setGlobalLoading(true);
    try {
      await db.deleteMembro(id);
      await loadLicenseAndData();
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleSaveCelula = async (celula: Partial<Celula>) => {
    setGlobalLoading(true);
    try {
      await db.saveCelula(celula);
      await loadLicenseAndData();
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleDeleteCelula = async (id: string) => {
    setGlobalLoading(true);
    try {
      await db.deleteCelula(id);
      await loadLicenseAndData();
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleSaveFinanceiro = async (reg: Partial<RegistroFinanceiro>) => {
    setGlobalLoading(true);
    try {
      await db.saveFinanceiro(reg);
      await loadLicenseAndData();
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleDeleteFinanceiro = async (id: string) => {
    setGlobalLoading(true);
    try {
      await db.deleteFinanceiro(id);
      await loadLicenseAndData();
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleSaveDocumento = async (doc: Partial<DocumentoSecretaria>) => {
    setGlobalLoading(true);
    try {
      await db.saveSecretaria(doc);
      await loadLicenseAndData();
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleDeleteDocumento = async (id: string) => {
    setGlobalLoading(true);
    try {
      await db.deleteSecretaria(id);
      await loadLicenseAndData();
    } finally {
      setGlobalLoading(false);
    }
  };

  // Se o admin estiver autenticado com token válido, mostra o Painel Administrativo
  if (adminToken) {
    return (
      <ToastProvider>
        {globalLoading && <LoadingSpinner fullScreen />}
        <AdminPanel adminToken={adminToken} onLogoutAdmin={handleLogoutAdmin} />
      </ToastProvider>
    );
  }

  // Se não houver usuário logado, exibe tela de login / registro / teste grátis / token
  if (!user) {
    return (
      <>
        {globalLoading && <LoadingSpinner fullScreen />}
        <LoginView
          initialMode={authMode}
          onLoginSuccess={handleLoginSuccess}
          onSetLoading={setGlobalLoading}
          onOpenAdminLogin={() => setAdminLoginModalOpen(true)}
          onOpenConfig={() => setConfigModalOpen(true)}
        />
        <AdminLoginModal
          open={adminLoginModalOpen}
          onOpenChange={setAdminLoginModalOpen}
          onAdminLoginSuccess={(token) => {
            setAdminToken(token);
          }}
        />
        <SupabaseConfigModal
          open={configModalOpen}
          onOpenChange={setConfigModalOpen}
          onDataUpdated={loadLicenseAndData}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row antialiased text-gray-900 font-sans">
      {globalLoading && <LoadingSpinner fullScreen />}

      {/* Banner de Aviso de Teste Grátis */}
      {license && license.status === 'trial' && (
        <div className="fixed top-0 inset-x-0 z-40 bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 mx-auto">
            <Clock className="h-4 w-4 shrink-0 animate-pulse" />
            <span>
              Período de Teste Grátis: Restam <strong className="underline">{license.daysRemaining} dia(s)</strong> para o fim do experimento de 14 dias.
            </span>
            <button
              onClick={() => setLicenseModalOpen(true)}
              className="ml-3 px-3 py-1 rounded bg-white text-amber-900 font-bold hover:bg-amber-50 transition-colors shadow-xs cursor-pointer"
            >
              Ativar Licença Permanente com Token
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Desktop */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={handleNavigate}
        user={user}
        onLogout={handleLogout}
        onOpenConfig={() => setConfigModalOpen(true)}
      />

      {/* Drawer Mobile */}
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

      {/* Conteúdo Principal */}
      <div className={`flex-1 md:ml-[250px] flex flex-col min-w-0 min-h-screen ${license?.status === 'trial' ? 'pt-10' : ''}`}>
        <Header
          currentPath={currentPath}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          user={user}
          onOpenConfig={() => setConfigModalOpen(true)}
          onRefresh={loadLicenseAndData}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {license?.status === 'trial_expired' ? (
            <div className="p-8 bg-white rounded-2xl border border-rose-200 shadow-xl text-center max-w-xl mx-auto my-12 space-y-4">
              <div className="h-16 w-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Seu Período de Teste Expirou</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Os 14 dias de teste gratuito da sua congregação terminaram. Seus dados, membros e finanças estão preservados com segurança. Para continuar utilizando o sistema, ative sua licença permanente com o token fornecido pela administração.
              </p>
              <button
                onClick={() => setLicenseModalOpen(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <Key className="h-4 w-4" />
                <span>Ativar Licença Permanente com Token</span>
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </main>
      </div>

      {/* Modais de Licença e Configuração */}
      <LicenseActivationModal
        open={licenseModalOpen}
        onOpenChange={setLicenseModalOpen}
        user={user}
        onActivated={loadLicenseAndData}
        isExpired={license?.status === 'trial_expired'}
      />

      <AdminLoginModal
        open={adminLoginModalOpen}
        onOpenChange={setAdminLoginModalOpen}
        onAdminLoginSuccess={(token) => {
          setAdminToken(token);
        }}
      />

      <SupabaseConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        onDataUpdated={() => {
          const freshUser = db.getUser();
          if (freshUser) setUser(freshUser);
          loadLicenseAndData();
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
