import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDepartments } from '../../hooks/useComplaints';
import { ComplaintTable } from '../../components/admin/ComplaintTable';
import StaffApprovals from '../../admin/StaffApprovals';

import { supabase } from '../../lib/supabase';
import type { Department } from '../../lib/supabase';
import { LogOut, LayoutDashboard, Menu, X, ArrowLeft, Users } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const { departments, loading } = useDepartments();
  const [activeTab, setActiveTab] = useState<'complaints' | 'staff'>('complaints');
  const [activeDept, setActiveDept] = useState<Department | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingStaffCount, setPendingStaffCount] = useState<number>(0);

  // Auth guard: must be logged in AND admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin', { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  // Pending staff count (uses the approval-queue function, same list the
  // Staff Approvals tab shows, so the badge always matches)
  const fetchPendingCount = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('list_pending_approvals', { p_city_id: null });
      if (error) {
        console.error(error);
        setPendingStaffCount(0);
        return;
      }
      setPendingStaffCount(((data as unknown[] | null) ?? []).length);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (user && isAdmin) void fetchPendingCount();
  }, [activeTab, user, isAdmin, fetchPendingCount]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Prevent flash of dashboard before redirect
  if (authLoading || !user || !isAdmin) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top Bar ── */}
      <header
        style={{
          background: 'var(--header-gradient, linear-gradient(135deg, #4d0026 0%, #660033 50%, #800040 100%))',
          padding: '12px clamp(12px, 3vw, 24px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fff',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 8px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="mobile-dept-toggle"
            title="Toggle departments"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <button
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={14} /> Exit
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LayoutDashboard size={20} color="#a5b4fc" />
            <div>
              <h1 style={{ margin: 0, fontSize: 'clamp(0.95rem, 1.2vw, 1.2rem)', fontWeight: 800, color: '#fff' }}>
                Municipal Admin Dashboard
              </h1>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)' }}>
                {user?.email ? `Admin: ${user.email}` : 'IMC & Betul Grievance Console'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.8rem',
              transition: 'var(--transition)',
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* ── Main Area with Responsive Sidebar ── */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        <aside
          style={{
            width: 240,
            background: 'var(--theme-component, #d9d9d9)',
            borderRight: '1px solid var(--theme-component-border, #bfbfbf)',
            padding: '16px 12px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
          className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}
        >
          <button
            onClick={() => {
              setActiveTab('complaints');
              setActiveDept(null);
              setMobileMenuOpen(false);
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              marginBottom: 4,
              background: activeTab === 'complaints' && activeDept === null ? 'var(--theme-primary, #660033)' : 'transparent',
              color: activeTab === 'complaints' && activeDept === null ? '#fff' : 'var(--gray-700)',
              fontWeight: activeTab === 'complaints' && activeDept === null ? 800 : 600,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              transition: 'var(--transition)',
            }}
          >
            <span>🗂️</span> All Complaints
          </button>

          <button
            onClick={() => {
              setActiveTab('staff');
              setActiveDept(null);
              setMobileMenuOpen(false);
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              marginBottom: 12,
              background: activeTab === 'staff' ? 'var(--theme-primary, #660033)' : 'transparent',
              color: activeTab === 'staff' ? '#fff' : 'var(--gray-700)',
              fontWeight: activeTab === 'staff' ? 800 : 600,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'var(--transition)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={16} color={activeTab === 'staff' ? '#fff' : 'var(--gray-500)'} />
              <span>Staff Approvals</span>
            </div>
            {pendingStaffCount > 0 && (
              <span
                style={{
                  background: '#d97706',
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 12,
                }}
              >
                {pendingStaffCount}
              </span>
            )}
          </button>

          <div
            style={{
              margin: '6px 0 6px',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--gray-400)',
              paddingLeft: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Filter by Department
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="shimmer" style={{ height: 38, borderRadius: 8, marginBottom: 4 }} />
              ))
            ) : (
              departments.map((dept) => {
                const isActive = activeTab === 'complaints' && activeDept?.id === dept.id;
                return (
                  <button
                    key={dept.id}
                    onClick={() => {
                      setActiveTab('complaints');
                      setActiveDept(dept);
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      cursor: 'pointer',
                      background: isActive ? `${dept.color}15` : 'transparent',
                      color: isActive ? dept.color : 'var(--gray-700)',
                      fontWeight: isActive ? 800 : 500,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      borderLeft: isActive ? `3px solid ${dept.color}` : '3px solid transparent',
                      transition: 'var(--transition)',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{dept.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dept.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 90,
            }}
          />
        )}

        <main style={{ flex: 1, padding: 'clamp(14px, 2.5vw, 24px)', overflowX: 'hidden', minWidth: 0 }}>
          {activeTab === 'staff' ? (
            <div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-md)',
                      background: '#dcfce7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Users size={22} color="#15803d" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--gray-900)' }}>
                      Staff Approvals &amp; Roles
                    </h2>
                    <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.82rem' }}>
                      Approve or reject registrations, and update the role, department and level of existing staff
                    </p>
                  </div>
                </div>
              </div>

              <StaffApprovals onChanged={() => void fetchPendingCount()} />
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.6rem' }}>{activeDept ? activeDept.icon : '🗂️'}</span>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--gray-900)' }}>
                      {activeDept ? `${activeDept.name} Department` : 'All Municipal Complaints'}
                    </h2>
                    <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.82rem' }}>
                      {activeDept ? activeDept.description : 'Real-time feed across all civic categories'}
                    </p>
                  </div>
                </div>
              </div>

              <ComplaintTable departmentSlug={activeDept?.slug} />
            </div>
          )}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar {
            position: fixed !important;
            top: 56px;
            bottom: 0;
            left: -260px;
            z-index: 100;
            transition: left 0.3s ease;
            box-shadow: 4px 0 20px rgba(0,0,0,0.15);
          }
          .admin-sidebar.open {
            left: 0 !important;
          }
          .mobile-dept-toggle {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-dept-toggle {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
