import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDepartments } from '../../hooks/useComplaints';
import { ComplaintTable } from '../../components/admin/ComplaintTable';
import type { Department } from '../../lib/supabase';
import { LogOut, LayoutDashboard } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { departments, loading } = useDepartments();
  const [activeDept, setActiveDept] = useState<Department | null>(null);

  // Auth guard
  if (!sessionStorage.getItem('imc_admin')) {
    navigate('/admin');
    return null;
  }

  const handleLogout = () => {
    sessionStorage.removeItem('imc_admin');
    navigate('/admin');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af, #4f46e5)',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LayoutDashboard size={22} color="#fff" />
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>Admin Dashboard</h1>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>IMC 311 – Complaint Management</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            border: '1.5px solid rgba(255,255,255,0.4)',
            background: 'transparent', color: '#fff',
            fontWeight: 600, cursor: 'pointer', fontSize: 13,
          }}
        >
          <LogOut size={14} /> Logout
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <div style={{
          width: 220, background: '#fff',
          borderRight: '1.5px solid #e5e7eb',
          padding: '20px 12px', flexShrink: 0,
        }}>
          <button
            onClick={() => setActiveDept(null)}
            style={{
              width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8,
              border: 'none', cursor: 'pointer', marginBottom: 4,
              background: activeDept === null ? '#eef2ff' : 'transparent',
              color: activeDept === null ? '#4f46e5' : '#374151',
              fontWeight: activeDept === null ? 700 : 500, fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            🗂️ All Complaints
          </button>

          <div style={{ margin: '12px 0 8px', fontSize: 11, fontWeight: 700, color: '#9ca3af', paddingLeft: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            By Department
          </div>

          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 36, background: '#f3f4f6', borderRadius: 8, marginBottom: 6 }} />
            ))
          ) : (
            departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setActiveDept(dept)}
                style={{
                  width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', marginBottom: 3,
                  background: activeDept?.id === dept.id ? `${dept.color}18` : 'transparent',
                  color: activeDept?.id === dept.id ? dept.color : '#374151',
                  fontWeight: activeDept?.id === dept.id ? 700 : 500,
                  fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
                  borderLeft: activeDept?.id === dept.id ? `3px solid ${dept.color}` : '3px solid transparent',
                }}
              >
                <span>{dept.icon}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.name}</span>
              </button>
            ))
          )}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: '24px', overflowX: 'auto' }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#111827' }}>
              {activeDept ? `${activeDept.icon} ${activeDept.name} Department` : '🗂️ All Complaints'}
            </h2>
            {activeDept && (
              <p style={{ margin: 0, color: '#9ca3af', fontSize: 13 }}>{activeDept.description}</p>
            )}
          </div>

          <ComplaintTable departmentSlug={activeDept?.slug} />
        </div>
      </div>
    </div>
  );
};
