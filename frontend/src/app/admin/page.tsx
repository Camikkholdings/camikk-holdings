'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AdminDossier,
  DOSSIER_STATUS_LIST,
  normalizeDossierStatus
} from '@/lib/adminData';

export default function AdminPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState<string>('admin@camikk.com');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<{ email: string; role: string } | null>(null);

  // Data states
  const [dossiers, setDossiers] = useState<AdminDossier[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [stats, setStats] = useState<any>(null);

  // Filters & Search
  const [dossierSearch, setDossierSearch] = useState<string>('');
  const [dossierStatusFilter, setDossierStatusFilter] = useState<string>('ALL');
  const [dossierStateFilter, setDossierStateFilter] = useState<string>('ALL');
  const [dossierDateFrom, setDossierDateFrom] = useState<string>('');
  const [dossierDateTo, setDossierDateTo] = useState<string>('');

  // Modals state

  const [selectedDossier, setSelectedDossier] = useState<AdminDossier | null>(null);
  const [dossierModalTab, setDossierModalTab] = useState<string>('overview');
  const [editDossierStatus, setEditDossierStatus] = useState<string>('');
  const [editStateFilingNumber, setEditStateFilingNumber] = useState<string>('');
  const [editAssignedEin, setEditAssignedEin] = useState<string>('');
  const [editDossierNotes, setEditDossierNotes] = useState<string>('');
  const [savingDossier, setSavingDossier] = useState<boolean>(false);
  const [showSsn, setShowSsn] = useState<boolean>(false);

  // Live New York Clock
  const [nyTime, setNyTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      try {
        const now = new Date();
        const formatted = new Intl.DateTimeFormat('es-ES', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        }).format(now);
        setNyTime(formatted);
      } catch {
        setNyTime(new Date().toLocaleTimeString());
      }
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check saved session on mount
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem('camikk_admin_session');
      const savedToken = localStorage.getItem('camikk_admin_token');

      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        const userObj = parsed?.user || parsed?.admin || { email: 'admin@camikk.com', role: 'SUPER_ADMIN' };
        if (parsed?.token || savedToken) {
          setIsAuthenticated(true);
          setAdminUser(userObj);
        }
      } else if (savedToken) {
        setIsAuthenticated(true);
        setAdminUser({ email: 'admin@camikk.com', role: 'SUPER_ADMIN' });
      }
    } catch {
      // ignore
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // Fetch data when authenticated
  const fetchData = async () => {
    if (!isAuthenticated) return;
    setLoadingData(true);
    try {
      const token = localStorage.getItem('camikk_admin_token') || 'demo-token';
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch LLC Dossiers
      const resD = await fetch('/api/admin/llcs', { headers });
      if (resD.ok) {
        const dataD = await resD.json();
        const listD = Array.isArray(dataD) ? dataD : (dataD.dossiers || []);
        setDossiers(listD);
      }

      // Fetch Stats
      const resS = await fetch('/api/admin/stats', { headers });
      if (resS.ok) {
        const dataS = await resS.json();
        setStats(dataS.stats || dataS);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoadingData(false);
    }
  };


  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmittingLogin(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Credenciales inválidas. Verifique correo y contraseña.');
        setIsSubmittingLogin(false);
        return;
      }

      // Success: Save user and token reliably
      const userObj = data.user || data.admin || { email: loginEmail, role: 'SUPER_ADMIN' };
      localStorage.setItem('camikk_admin_session', JSON.stringify({
        token: data.token,
        user: userObj
      }));
      localStorage.setItem('camikk_admin_token', data.token);

      setAdminUser(userObj);
      setIsAuthenticated(true);
    } catch (err: any) {
      setLoginError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('camikk_admin_session');
    localStorage.removeItem('camikk_admin_token');
    document.cookie = 'camikk_admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setIsAuthenticated(false);
    setAdminUser(null);
  };


  // Open LLC Dossier Modal
  const openDossierModal = (d: AdminDossier) => {
    setSelectedDossier(d);
    setDossierModalTab('overview');
    setEditDossierStatus(normalizeDossierStatus(d.status));
    setEditStateFilingNumber(d.stateFilingNumber || '');
    setEditAssignedEin(d.assignedEin || '');
    setEditDossierNotes(d.internalNotes || '');
    setShowSsn(false);
  };

  const handleSaveDossier = async () => {
    if (!selectedDossier) return;
    setSavingDossier(true);
    try {
      const res = await fetch(`/api/admin/llcs/${selectedDossier.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('camikk_admin_token') || ''}`
        },
        body: JSON.stringify({
          status: editDossierStatus,
          stateFilingNumber: editStateFilingNumber,
          assignedEin: editAssignedEin,
          internalNotes: editDossierNotes
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setDossiers(prev =>
          prev.map(item => item.id === selectedDossier.id ? updated.dossier : item)
        );
        setSelectedDossier(null);
        fetchData();
      } else {
        alert('Error al actualizar el expediente de la LLC.');
      }
    } catch (err) {
      alert('Error de conexión al guardar.');
    } finally {
      setSavingDossier(false);
    }
  };

  // Status badge renderer
  const renderStatusBadge = (rawStatus: string) => {
    const status = normalizeDossierStatus(rawStatus);
    switch (status) {
      case 'Pago pendiente':
        return (
          <span className="admin-badge" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
            Pago pendiente
          </span>
        );
      case 'Pago recibido':
        return (
          <span className="admin-badge" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
            Pago recibido
          </span>
        );
      case 'Formulario de información/documentación enviado':
        return (
          <span className="admin-badge" style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>
            Formulario enviado
          </span>
        );
      case 'Información/Documentación recibida':
        return (
          <span className="admin-badge" style={{ background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
            Informacion recibida
          </span>
        );
      case 'Documentación en revisión':
        return (
          <span className="admin-badge" style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a' }}>
            Doc. en revisión
          </span>
        );
      case 'Expediente LLC Listo para presentar al estado':
        return (
          <span className="admin-badge" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
            Listo p/ presentar
          </span>
        );
      case 'Expediente LLC Presentado al estado':
        return (
          <span className="admin-badge" style={{ background: '#f3e8ff', color: '#7e22ce', border: '1px solid #e9d5ff' }}>
            Presentado al estado
          </span>
        );
      case 'Tramite creación LLC en revisión estatal':
        return (
          <span className="admin-badge" style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5' }}>
            Revisión estatal
          </span>
        );
      case 'LLC aprobada':
        return (
          <span className="admin-badge" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
            LLC aprobada
          </span>
        );
      case 'EIN y documentos finales en proceso':
        return (
          <span className="admin-badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
            EIN en proceso
          </span>
        );
      case 'Completado / Entregado':
        return (
          <span className="admin-badge" style={{ background: '#002330', color: '#ffffff', border: '1px solid #002330' }}>
            Completado
          </span>
        );
      default:
        return <span className="admin-badge review">{status}</span>;
    }
  };

  // Filtered Dossiers
  const filteredDossiers = useMemo(() => {
    return dossiers.filter(d => {
      const matchSearch =
        d.submissionNumber.toLowerCase().includes(dossierSearch.toLowerCase()) ||
        d.company.name.toLowerCase().includes(dossierSearch.toLowerCase()) ||
        d.client.fullName.toLowerCase().includes(dossierSearch.toLowerCase()) ||
        d.company.state.toLowerCase().includes(dossierSearch.toLowerCase());

      const normStatus = normalizeDossierStatus(d.status);
      const matchStatus =
        dossierStatusFilter === 'ALL' || normStatus === dossierStatusFilter;

      const matchState =
        dossierStateFilter === 'ALL' || d.company.state.toLowerCase() === dossierStateFilter.toLowerCase();

      // Filtro de rango de fechas (Desde - Hasta)
      let matchDate = true;
      if (dossierDateFrom || dossierDateTo) {
        let itemDateStr = '';
        if (d.createdAt) {
          try {
            const parsed = new Date(d.createdAt);
            if (!isNaN(parsed.getTime())) {
              const y = parsed.getFullYear();
              const m = String(parsed.getMonth() + 1).padStart(2, '0');
              const day = String(parsed.getDate()).padStart(2, '0');
              itemDateStr = `${y}-${m}-${day}`;
            } else {
              itemDateStr = d.createdAt.slice(0, 10);
            }
          } catch {
            itemDateStr = d.createdAt.slice(0, 10);
          }
        }

        if (dossierDateFrom && itemDateStr && itemDateStr < dossierDateFrom) {
          matchDate = false;
        }
        if (dossierDateTo && itemDateStr && itemDateStr > dossierDateTo) {
          matchDate = false;
        }
      }

      return matchSearch && matchStatus && matchState && matchDate;
    });
  }, [dossiers, dossierSearch, dossierStatusFilter, dossierStateFilter, dossierDateFrom, dossierDateTo]);

  // Unique states in dossiers for dropdown
  const uniqueStates = useMemo(() => {
    const set = new Set<string>();
    dossiers.forEach(d => {
      if (d.company?.state) set.add(d.company.state);
    });
    return Array.from(set).sort();
  }, [dossiers]);

  // --- RENDER 1: AUTH LOADING ---
  if (authLoading) {
    return (
      <div className="admin-login-container">
        <div style={{ textAlign: 'center' }}>
          <div className="admin-login-brand">C</div>
          <p style={{ marginTop: 12, fontWeight: 700, color: '#94a3b8' }}>Verificando acceso seguro...</p>
        </div>
      </div>
    );
  }

  // --- RENDER 2: LOGIN SCREEN IF NOT AUTHENTICATED ---
  if (!isAuthenticated) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <div className="admin-login-brand">CH</div>
            <h1 className="admin-login-title">CAMIKK Holdings</h1>
            <p className="admin-login-subtitle">Panel de Control de Operaciones y Clientes</p>
          </div>

          {loginError && (
            <div className="admin-alert-error" style={{ marginBottom: 16 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="admin-login-form">
            <div className="admin-input-group">
              <label className="admin-input-label">Correo Electrónico Autorizado</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="admin@camikk.com"
                className="admin-input-field"
              />
            </div>

            <div className="admin-input-group">
              <label className="admin-input-label">Contraseña de Acceso</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="admin-input-field"
              />
            </div>

            <div style={{ fontSize: 12, color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: 8 }}>
              <strong>Credenciales de Demostración:</strong><br />
              Email: <code>admin@camikk.com</code><br />
              Clave: <code>Camikk2026!Admin</code>
            </div>

            <button
              type="submit"
              disabled={isSubmittingLogin}
              className="admin-login-btn"
            >
              {isSubmittingLogin ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" />
                  </svg>
                  <span>Iniciando Sesión...</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Ingresar al Panel Administrativo</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- RENDER 3: FULL ADMIN PORTAL ---
  return (
    <div className="admin-portal-wrapper">
      {/* 1. Header / Navbar */}
      <header className="admin-navbar">
        <div className="admin-nav-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #a44a1f 0%, #d97706 100%)',
                color: '#fff',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16
              }}
            >
              CH
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '0.02em', lineHeight: 1.1 }}>
                CAMIKK HOLDINGS
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Panel Central de Gestión
              </div>
            </div>
          </div>
          <span className="admin-badge-live">Sistema En Vivo</span>
        </div>

        <div className="admin-nav-right">
          <div className="admin-clock" title="Zona Horaria de Operación: America/New_York (EST)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>NY: {nyTime}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
            <span>{adminUser?.email || 'admin@camikk.com'}</span>
          </div>

          <button onClick={handleLogout} className="admin-btn-logout" title="Cerrar Sesión">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1400, width: '100%', margin: '0 auto', padding: '24px 24px 60px' }}>
        {/* Navigation / Header Bar */}
        <div className="admin-tab-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(229, 169, 59, 0.15)',
                color: '#e5a93b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 17, color: '#002330', letterSpacing: '-0.01em' }}>
                Registro de LLCs y Expedientes (Secciones A - H)
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 100,
                  background: '#f1f5f9',
                  color: '#334155'
                }}
              >
                {filteredDossiers.length !== dossiers.length
                  ? `${filteredDossiers.length} de ${dossiers.length}`
                  : dossiers.length}
              </span>
            </div>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={fetchData}
              disabled={loadingData}
              className="admin-btn-sm"
              title="Refrescar datos"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={loadingData ? 'animate-spin' : ''}
              >
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        <div>
            {/* KPI Cards for LLCs */}
            <div className="admin-kpi-grid">
              <div className="admin-kpi-card">
                <div className="admin-kpi-icon blue">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div>
                  <div className="admin-kpi-val">{filteredDossiers.length}</div>
                  <div className="admin-kpi-label">Total Expedientes</div>
                </div>
              </div>

              <div className="admin-kpi-card">
                <div className="admin-kpi-icon gold" style={{ background: '#fef3c7', color: '#b45309' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <div className="admin-kpi-val" style={{ color: '#b45309' }}>
                    {filteredDossiers.filter(d => normalizeDossierStatus(d.status) === 'Pago pendiente').length}
                  </div>
                  <div className="admin-kpi-label">Pagos Incompletos (Leads)</div>
                </div>
              </div>

              <div className="admin-kpi-card">
                <div className="admin-kpi-icon green">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div>
                  <div className="admin-kpi-val">
                    {filteredDossiers.filter(d => normalizeDossierStatus(d.status) !== 'Pago pendiente').length}
                  </div>
                  <div className="admin-kpi-label">Pagados / En Trámite</div>
                </div>
              </div>

              <div className="admin-kpi-card">
                <div className="admin-kpi-icon purple">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div>
                  <div className="admin-kpi-val">
                    ${filteredDossiers.filter(d => normalizeDossierStatus(d.status) !== 'Pago pendiente').reduce((acc, curr) => acc + (curr.totalAmount || 850), 0).toLocaleString()} USD
                  </div>
                  <div className="admin-kpi-label">Ingresos Confirmados</div>
                </div>
              </div>
            </div>

            {/* Toolbar for LLCs */}
            <div className="admin-toolbar">
              <div className="admin-search-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por N° expediente, nombre de empresa, cliente o estado..."
                  value={dossierSearch}
                  onChange={e => setDossierSearch(e.target.value)}
                  className="admin-search-input"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Estado:</label>
                <select
                  value={dossierStatusFilter}
                  onChange={e => setDossierStatusFilter(e.target.value)}
                  className="admin-filter-select"
                >
                  <option value="ALL">Todos los Estados</option>
                  {DOSSIER_STATUS_LIST.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>

                <label style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Estado EE.UU.:</label>
                <select
                  value={dossierStateFilter}
                  onChange={e => setDossierStateFilter(e.target.value)}
                  className="admin-filter-select"
                >
                  <option value="ALL">Todos</option>
                  {uniqueStates.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>Desde:</label>
                  <input
                    type="date"
                    value={dossierDateFrom}
                    onChange={e => setDossierDateFrom(e.target.value)}
                    className="admin-filter-select"
                    style={{ padding: '6px 10px', fontSize: 13, cursor: 'pointer' }}
                    title="Filtrar fecha desde"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>Hasta:</label>
                  <input
                    type="date"
                    value={dossierDateTo}
                    onChange={e => setDossierDateTo(e.target.value)}
                    className="admin-filter-select"
                    style={{ padding: '6px 10px', fontSize: 13, cursor: 'pointer' }}
                    title="Filtrar fecha hasta"
                  />
                </div>

                {(dossierDateFrom || dossierDateTo) && (
                  <button
                    onClick={() => { setDossierDateFrom(''); setDossierDateTo(''); }}
                    className="admin-btn-sm"
                    style={{
                      padding: '6px 10px',
                      fontSize: 12,
                      background: '#fef2f2',
                      color: '#dc2626',
                      borderColor: '#fca5a5'
                    }}
                    title="Restablecer filtro de fechas"
                  >
                    ✕ Limpiar fechas
                  </button>
                )}
              </div>
            </div>

            {/* Table of LLCs */}
            <div className="admin-table-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>N° Expediente & Fecha</th>
                    <th>Empresa Solicitada</th>
                    <th>Cliente / Titular</th>
                    <th>Estructura</th>
                    <th>Registered Office</th>
                    <th>Estado de Trámite</th>
                    <th>Total Pagado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDossiers.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                        No se encontraron expedientes de LLC con los filtros especificados.
                      </td>
                    </tr>
                  ) : (
                    filteredDossiers.map(d => {
                      const cleanPhone = d.client?.phone?.replace(/[^0-9]/g, '');
                      return (
                        <tr key={d.id}>
                          <td>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{d.submissionNumber}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              {(() => {
                                try {
                                  const p = new Date(d.createdAt);
                                  if (!isNaN(p.getTime())) {
                                    return p.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
                                  }
                                } catch {}
                                return d.createdAt;
                              })()}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 800, color: '#002330', fontSize: 14 }}>
                              {d.company.name}
                            </div>
                            <div style={{ fontSize: 12, color: '#a44a1f', fontWeight: 700 }}>
                              Estado: {d.company.state}
                            </div>
                            {d.company.secondChoice && (
                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                2da Op: {d.company.secondChoice}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{d.client.fullName}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{d.client.email}</div>
                            <div style={{ fontSize: 12, color: '#475569' }}>{d.client.phone}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700 }}>
                              {d.structure.totalMembers} {d.structure.totalMembers === 1 ? 'Miembro' : 'Miembros'}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              {d.structure.managementType}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                              Allentown, PA
                            </div>
                            {d.autoRenewRegisteredOffice ? (
                              <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
                                ✓ Renov. Auto ($127/a)
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                Renovación Manual
                              </span>
                            )}
                          </td>
                          <td>
                            {renderStatusBadge(d.status)}
                          </td>
                          <td>
                            {normalizeDossierStatus(d.status) === 'Pago pendiente' ? (
                              <span style={{ fontWeight: 800, color: '#d97706', fontSize: 13 }}>
                                Pendiente (${d.totalAmount || 850}.00)
                              </span>
                            ) : (
                              <span style={{ fontWeight: 800, color: '#16a34a' }}>
                                ${d.totalAmount || 850}.00 USD
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="admin-action-row">
                              <button
                                onClick={() => openDossierModal(d)}
                                className="admin-btn-sm primary"
                                title="Ver todo el expediente (Secciones A - H)"
                              >
                                Ver Expediente
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
      </main>

      {/* ========================================================
          MODAL: EXPEDIENTE COMPLETO LLC (SECCIONES A A H)
          ======================================================== */}
      {selectedDossier && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedDossier(null)}>
          <div className="admin-modal-dialog" style={{ width: 'min(100%, 1100px)' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="admin-modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                    Expediente: {selectedDossier.company.name}
                  </span>
                  <span style={{ fontSize: 13, color: '#2563eb', fontWeight: 800, background: '#eff6ff', padding: '3px 8px', borderRadius: 6 }}>
                    {selectedDossier.submissionNumber}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Estado LLC: <strong>{selectedDossier.company.state}</strong> | Solicitante: {selectedDossier.client.fullName} ({selectedDossier.client.email})
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="admin-btn-sm"
                  title="Imprimir o guardar como PDF"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  <span>Imprimir / PDF</span>
                </button>

                <button
                  onClick={() => setSelectedDossier(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Internal Navigation Tabs */}
            <div className="admin-modal-nav-tabs">
              <button
                type="button"
                onClick={() => setDossierModalTab('overview')}
                className={`admin-modal-nav-tab ${dossierModalTab === 'overview' ? 'active' : ''}`}
              >
                Control & Acciones
              </button>
              <button
                type="button"
                onClick={() => setDossierModalTab('sectionA')}
                className={`admin-modal-nav-tab ${dossierModalTab === 'sectionA' ? 'active' : ''}`}
              >
                A. Compañía
              </button>
              <button
                type="button"
                onClick={() => setDossierModalTab('sectionB')}
                className={`admin-modal-nav-tab ${dossierModalTab === 'sectionB' ? 'active' : ''}`}
              >
                B. Estructura
              </button>
              <button
                type="button"
                onClick={() => setDossierModalTab('sectionC')}
                className={`admin-modal-nav-tab ${dossierModalTab === 'sectionC' ? 'active' : ''}`}
              >
                C. Miembros ({selectedDossier.members?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setDossierModalTab('sectionD')}
                className={`admin-modal-nav-tab ${dossierModalTab === 'sectionD' ? 'active' : ''}`}
              >
                D. EIN / IRS
              </button>
              <button
                type="button"
                onClick={() => setDossierModalTab('sectionE')}
                className={`admin-modal-nav-tab ${dossierModalTab === 'sectionE' ? 'active' : ''}`}
              >
                E. Operating Agreement
              </button>
              <button
                type="button"
                onClick={() => setDossierModalTab('sectionF')}
                className={`admin-modal-nav-tab ${dossierModalTab === 'sectionF' ? 'active' : ''}`}
              >
                F. Registered Office
              </button>
              <button
                type="button"
                onClick={() => setDossierModalTab('sectionG')}
                className={`admin-modal-nav-tab ${dossierModalTab === 'sectionG' ? 'active' : ''}`}
              >
                G. Documentos ({selectedDossier.documents?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setDossierModalTab('sectionH')}
                className={`admin-modal-nav-tab ${dossierModalTab === 'sectionH' ? 'active' : ''}`}
              >
                H. Certificaciones & Firma
              </button>
            </div>

            {/* Modal Body */}
            <div className="admin-modal-body">
              {/* TAB 0: CONTROL & OVERVIEW */}
              {dossierModalTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="admin-dossier-section">
                    <div className="admin-section-title">Actualización de Estado y Registro Oficial</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                      <div>
                        <label className="admin-input-label">Estado del Trámite</label>
                        <select
                          value={normalizeDossierStatus(editDossierStatus)}
                          onChange={e => setEditDossierStatus(e.target.value)}
                          className="admin-input-field"
                        >
                          {DOSSIER_STATUS_LIST.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="admin-input-label">N° de Registro Estatal (Entity ID)</label>
                        <input
                          type="text"
                          value={editStateFilingNumber}
                          onChange={e => setEditStateFilingNumber(e.target.value)}
                          placeholder="ej: PA-7849102"
                          className="admin-input-field"
                        />
                      </div>

                      <div>
                        <label className="admin-input-label">EIN Asignado por el IRS</label>
                        <input
                          type="text"
                          value={editAssignedEin}
                          onChange={e => setEditAssignedEin(e.target.value)}
                          placeholder="ej: XX-XXXXXXX"
                          className="admin-input-field"
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <label className="admin-input-label">Notas Internas del Equipo Legal / Operativo</label>
                      <textarea
                        rows={3}
                        value={editDossierNotes}
                        onChange={e => setEditDossierNotes(e.target.value)}
                        placeholder="Anotaciones sobre presentación en el Departamento de Estado, observaciones de nombres..."
                        className="admin-input-field"
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="admin-kv-grid">
                    <div className="admin-dossier-section">
                      <div className="admin-section-title">
                        {normalizeDossierStatus(selectedDossier.status) === 'Pago pendiente' ? 'Pago Pendiente (Lead)' : 'Pago Realizado'}
                      </div>
                      <div
                        className="admin-kv-val"
                        style={{
                          color: normalizeDossierStatus(selectedDossier.status) === 'Pago pendiente' ? '#d97706' : '#16a34a',
                          fontSize: 20
                        }}
                      >
                        ${selectedDossier.totalAmount || 850}.00 USD
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        {normalizeDossierStatus(selectedDossier.status) === 'Pago pendiente'
                          ? 'Esperando pago del cliente'
                          : 'Fórmula: $725 CAMIKK Fee + State Filing Fee'}
                      </div>
                    </div>

                    <div className="admin-dossier-section">
                      <div className="admin-section-title">Renovación Registered Office</div>
                      <div className="admin-kv-val">
                        {selectedDossier.autoRenewRegisteredOffice ? (
                          <span style={{ color: '#16a34a' }}>Activada Voluntariamente ($127/año)</span>
                        ) : (
                          <span style={{ color: '#64748b' }}>No activada (Manual)</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        1er año incluido con CAMIKK
                      </div>
                    </div>

                    <div className="admin-dossier-section">
                      <div className="admin-section-title">Documentos Adjuntos</div>
                      <div className="admin-kv-val">
                        {selectedDossier.documents?.length || 0} Archivos
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        Identificaciones & Verificaciones
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB A: COMPAÑÍA */}
              {dossierModalTab === 'sectionA' && (
                <div className="admin-dossier-section">
                  <div className="admin-section-title">A. Información de la Compañía</div>
                  <div className="admin-kv-grid" style={{ marginBottom: 16 }}>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Estado de Registro</span>
                      <span className="admin-kv-val" style={{ color: '#a44a1f', fontWeight: 800 }}>
                        {selectedDossier.company.state}
                      </span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Nombre Aprobado / Solicitado</span>
                      <span className="admin-kv-val" style={{ fontWeight: 800 }}>
                        {selectedDossier.company.name}
                      </span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Segunda Opción de Nombre</span>
                      <span className="admin-kv-val">{selectedDossier.company.secondChoice || 'N/A'}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Tercera Opción de Nombre</span>
                      <span className="admin-kv-val">{selectedDossier.company.thirdChoice || 'N/A'}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Fecha Deseada de Inicio</span>
                      <span className="admin-kv-val">{selectedDossier.company.startDate || 'Inmediata'}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Actividad Principal</span>
                      <span className="admin-kv-val">{selectedDossier.company.activity}</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <span className="admin-kv-key">Descripción Detallada de Productos o Servicios</span>
                    <div className="admin-kv-val" style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginTop: 4 }}>
                      {selectedDossier.company.description}
                    </div>
                  </div>

                  <div className="admin-kv-grid">
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Dirección Principal</span>
                      <span className="admin-kv-val">{selectedDossier.company.address}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Ciudad / Estado / ZIP</span>
                      <span className="admin-kv-val">{selectedDossier.company.cityStateZip}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Teléfono del Negocio</span>
                      <span className="admin-kv-val">{selectedDossier.company.phone || 'N/A'}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Email del Negocio</span>
                      <span className="admin-kv-val">{selectedDossier.company.email || 'N/A'}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Sitio Web</span>
                      <span className="admin-kv-val">{selectedDossier.company.website || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB B: ESTRUCTURA Y ADMINISTRACIÓN */}
              {dossierModalTab === 'sectionB' && (
                <div className="admin-dossier-section">
                  <div className="admin-section-title">B. Estructura y Administración</div>
                  <div className="admin-kv-grid">
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Cantidad Total de Miembros</span>
                      <span className="admin-kv-val">{selectedDossier.structure.totalMembers}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Tipo de Gestión</span>
                      <span className="admin-kv-val">{selectedDossier.structure.managementType}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Autoridad para Firmar</span>
                      <span className="admin-kv-val">{selectedDossier.structure.signingAuthority}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">¿Managers No Propietarios?</span>
                      <span className="admin-kv-val">{selectedDossier.structure.hasNonOwnerManagers}</span>
                    </div>
                    {selectedDossier.structure.managerNames && (
                      <div className="admin-kv-item" style={{ gridColumn: 'span 2' }}>
                        <span className="admin-kv-key">Nombre de Managers</span>
                        <span className="admin-kv-val">{selectedDossier.structure.managerNames}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB C: MIEMBROS / PROPIETARIOS */}
              {dossierModalTab === 'sectionC' && (
                <div>
                  <div className="admin-section-title" style={{ marginBottom: 16 }}>
                    C. Información de Cada Miembro / Propietario ({selectedDossier.members?.length || 0})
                  </div>
                  {selectedDossier.members?.map((m, idx) => (
                    <div key={m.id || idx} className="admin-member-card">
                      <div className="admin-member-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                            {idx + 1}. {m.fullName}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 800, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 4 }}>
                            {m.title}
                          </span>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#16a34a' }}>
                          {m.ownershipPercentage}% Propiedad
                        </div>
                      </div>

                      <div className="admin-kv-grid">
                        <div className="admin-kv-item">
                          <span className="admin-kv-key">Dirección Residencial</span>
                          <span className="admin-kv-val">{m.address}</span>
                        </div>
                        <div className="admin-kv-item">
                          <span className="admin-kv-key">Ciudad / Estado / ZIP</span>
                          <span className="admin-kv-val">{m.cityStateZip}</span>
                        </div>
                        <div className="admin-kv-item">
                          <span className="admin-kv-key">Correo Electrónico</span>
                          <span className="admin-kv-val">{m.email}</span>
                        </div>
                        <div className="admin-kv-item">
                          <span className="admin-kv-key">Teléfono</span>
                          <span className="admin-kv-val">{m.phone}</span>
                        </div>
                        <div className="admin-kv-item">
                          <span className="admin-kv-key">Capital Inicial Aportado</span>
                          <span className="admin-kv-val">{m.initialCapital || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB D: INFORMACIÓN PARA EIN / IRS */}
              {dossierModalTab === 'sectionD' && (
                <div className="admin-dossier-section">
                  <div className="admin-section-title">D. Información para el EIN / IRS</div>
                  <div className="admin-kv-grid" style={{ marginBottom: 16 }}>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Responsable</span>
                      <span className="admin-kv-val" style={{ fontWeight: 800 }}>
                        {selectedDossier.ein.responsiblePartyName}
                      </span>
                    </div>

                    <div className="admin-kv-item">
                      <span className="admin-kv-key">SSN / ITIN</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <span className="admin-kv-val" style={{ fontFamily: 'monospace' }}>
                          {showSsn ? selectedDossier.ein.ssnOrItin : '•••-••-••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowSsn(!showSsn)}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: 4,
                            padding: '2px 6px',
                            fontSize: 10,
                            cursor: 'pointer'
                          }}
                        >
                          {showSsn ? 'Ocultar' : 'Ver'}
                        </button>
                      </div>
                    </div>

                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Dirección del Responsable</span>
                      <span className="admin-kv-val">{selectedDossier.ein.responsiblePartyAddress}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">¿Empleados en próx 12 meses?</span>
                      <span className="admin-kv-val">{selectedDossier.ein.hasEmployeesNext12Months}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Estimado Empleados</span>
                      <span className="admin-kv-val">{selectedDossier.ein.estimatedEmployeesCount || '0'}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Fecha Inicio Salarios</span>
                      <span className="admin-kv-val">{selectedDossier.ein.firstWageDate || 'N/A'}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Cierre Año Fiscal</span>
                      <span className="admin-kv-val">{selectedDossier.ein.fiscalYearEndMonth || 'Diciembre'}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Actividad para fines IRS</span>
                      <span className="admin-kv-val">{selectedDossier.ein.irsActivity}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">¿Solicitó EIN anteriormente?</span>
                      <span className="admin-kv-val">{selectedDossier.ein.previouslyApplied}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB E: OPERATING AGREEMENT */}
              {dossierModalTab === 'sectionE' && (
                <div className="admin-dossier-section">
                  <div className="admin-section-title">E. Operating Agreement</div>
                  <div className="admin-kv-grid" style={{ marginBottom: 16 }}>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Distribución Ganancias / Pérdidas</span>
                      <span className="admin-kv-val">{selectedDossier.operatingAgreement.profitLossDistribution}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">¿Distribución Proporcional al %?</span>
                      <span className="admin-kv-val">{selectedDossier.operatingAgreement.isDistributionProportional}</span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Toma de Decisiones</span>
                      <span className="admin-kv-val">{selectedDossier.operatingAgreement.decisionMaking}</span>
                    </div>
                  </div>

                  {selectedDossier.operatingAgreement.agreedDistributionExplanation && (
                    <div style={{ marginBottom: 14 }}>
                      <span className="admin-kv-key">Explicación de Distribución Acordada</span>
                      <div className="admin-kv-val" style={{ background: '#f8fafc', padding: 10, borderRadius: 6, marginTop: 4 }}>
                        {selectedDossier.operatingAgreement.agreedDistributionExplanation}
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: 14 }}>
                    <span className="admin-kv-key">Retiro o Venta de Participación</span>
                    <div className="admin-kv-val" style={{ background: '#f8fafc', padding: 10, borderRadius: 6, marginTop: 4 }}>
                      {selectedDossier.operatingAgreement.memberWithdrawalTerms || 'Según estipulaciones estándar del Operating Agreement'}
                    </div>
                  </div>

                  {selectedDossier.operatingAgreement.specialAgreements && (
                    <div>
                      <span className="admin-kv-key">Acuerdos Especiales entre Miembros</span>
                      <div className="admin-kv-val" style={{ background: '#f8fafc', padding: 10, borderRadius: 6, marginTop: 4 }}>
                        {selectedDossier.operatingAgreement.specialAgreements}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB F: REGISTERED OFFICE */}
              {dossierModalTab === 'sectionF' && (
                <div className="admin-dossier-section">
                  <div className="admin-section-title">F. Registered Office y Correspondencia</div>
                  <div className="admin-kv-grid" style={{ marginBottom: 16 }}>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Servicio Registered Office CAMIKK</span>
                      <span className="admin-kv-val" style={{ color: '#16a34a', fontWeight: 800 }}>
                        {selectedDossier.registeredOffice.confirmedService ? 'Confirmado (Incluido 1er año)' : 'No'}
                      </span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Suscripción Renovación Anual ($127)</span>
                      <span className="admin-kv-val" style={{ fontWeight: 800 }}>
                        {selectedDossier.autoRenewRegisteredOffice ? (
                          <span style={{ color: '#16a34a' }}>Activada por el Cliente</span>
                        ) : (
                          <span style={{ color: '#64748b' }}>No seleccionada (Manual)</span>
                        )}
                      </span>
                    </div>
                    <div className="admin-kv-item">
                      <span className="admin-kv-key">Persona de Contacto Principal</span>
                      <span className="admin-kv-val">{selectedDossier.registeredOffice.primaryContactPerson || selectedDossier.client.fullName}</span>
                    </div>
                  </div>

                  <div>
                    <span className="admin-kv-key">Dirección Preferida de Correspondencia</span>
                    <div className="admin-kv-val" style={{ background: '#f8fafc', padding: 10, borderRadius: 6, marginTop: 4 }}>
                      {selectedDossier.registeredOffice.preferredMailingAddress || 'Dirección de la compañía en Allentown, PA'}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB G: DOCUMENTOS Y VERIFICACIONES */}
              {dossierModalTab === 'sectionG' && (
                <div className="admin-dossier-section">
                  <div className="admin-section-title">G. Documentos y Verificaciones</div>
                  {(!selectedDossier.documents || selectedDossier.documents.length === 0) ? (
                    <div style={{ color: '#64748b', fontSize: 13 }}>No se han adjuntado documentos aún.</div>
                  ) : (
                    selectedDossier.documents.map((doc, idx) => {
                      const fileUrl = doc.viewUrl || doc.url || '#';
                      return (
                        <div key={doc.id || idx} className="admin-doc-item">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Abrir y ver documento"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 38,
                                height: 38,
                                borderRadius: 8,
                                background: '#eff6ff',
                                flexShrink: 0,
                                transition: 'background 0.15s',
                              }}
                            >
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                            </a>
                            <div style={{ minWidth: 0 }}>
                              <div>
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Clic para abrir y ver en nueva pestaña"
                                  style={{
                                    fontWeight: 700,
                                    fontSize: 13,
                                    color: '#0284c7',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    transition: 'color 0.15s, text-decoration 0.15s',
                                    cursor: 'pointer',
                                    wordBreak: 'break-word',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#0369a1';
                                    e.currentTarget.style.textDecoration = 'underline';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = '#0284c7';
                                    e.currentTarget.style.textDecoration = 'none';
                                  }}
                                >
                                  <span>{doc.originalName}</span>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8, flexShrink: 0 }}>
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                  </svg>
                                </a>
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                Tipo: <span style={{ fontWeight: 600, color: '#475569' }}>{doc.type}</span>
                                {doc.sizeBytes ? ` • ${(doc.sizeBytes / 1024).toFixed(0)} KB` : ''}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#f0f9ff',
                                color: '#0284c7',
                                borderColor: '#bae6fd',
                                textDecoration: 'none',
                                fontWeight: 600,
                              }}
                              title="Ver en nueva pestaña"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              <span>Ver</span>
                            </a>

                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={doc.originalName}
                              className="admin-btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                textDecoration: 'none',
                              }}
                              title="Descargar archivo"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                              <span>Descargar</span>
                            </a>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB H: CERTIFICACIONES Y FIRMA */}
              {dossierModalTab === 'sectionH' && (
                <div className="admin-dossier-section">
                  <div className="admin-section-title">H. Certificaciones Finales y Firma Electrónica</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
                      <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
                      <span>Confirma que toda la información proporcionada es verdadera y correcta.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
                      <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
                      <span>Autoriza a CAMIKK Holdings a preparar y presentar documentos ante el Estado e IRS.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
                      <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
                      <span>Entiende posibles requerimientos adicionales de agencias gubernamentales.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
                      <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
                      <span>Entiende que información incompleta puede retrasar el proceso.</span>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 10, padding: 18, marginTop: 12 }}>
                    <div className="admin-kv-key">Firma Electrónica Registrada</div>
                    <div style={{ fontSize: 24, fontFamily: 'cursive', color: '#002330', marginTop: 6, fontWeight: 700 }}>
                      {selectedDossier.certifications?.electronicSignature || selectedDossier.client.fullName}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      Firmado Digitalmente el: {selectedDossier.certifications?.signedDate || selectedDossier.createdAt}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="admin-modal-footer">
              <button
                type="button"
                onClick={() => setSelectedDossier(null)}
                className="admin-btn-sm"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSaveDossier}
                disabled={savingDossier}
                className="admin-btn-sm primary"
                style={{ padding: '8px 20px' }}
              >
                {savingDossier ? 'Guardando...' : 'Guardar Actualizaciones'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
