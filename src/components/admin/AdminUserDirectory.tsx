import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  Copy,
  Check,
  X,
  Filter,
  RefreshCw,
} from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string | null;
  staff_code: string | null;
  linked_department_id: string | null;
  ward_number: string | null;
  city_id: string | null;
  authority_role: string | null;
  hierarchy_code: string | null;
  is_admin: boolean | null;
  created_at: string | null;
  approval_status: string | null;
  // joined
  department?: { id: string; name: string; icon: string } | null;
}

interface UserComplaint {
  id: string;
  ticket_number: string;
  description: string;
  status: string;
  created_at: string;
  address: string | null;
}

export const AdminUserDirectory: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Complaints modal for selected user
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userComplaints, setUserComplaints] = useState<UserComplaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id, full_name, phone, email, role, staff_code, linked_department_id,
          ward_number, city_id, authority_role, hierarchy_code, is_admin,
          created_at, approval_status,
          department:linked_department_id(id, name, icon)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.warn('Error fetching user profiles:', error.message);
        // Fallback without join if foreign key relationship is missing
        const { data: fallbackData } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        setUsers(fallbackData || []);
      } else {
        // Map data to ensure department object is correctly typed
        const mapped = (data || []).map((u: any) => ({
          ...u,
          department: Array.isArray(u.department) ? u.department[0] : u.department,
        }));
        setUsers(mapped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openUserComplaints = async (user: UserProfile) => {
    setSelectedUser(user);
    setLoadingComplaints(true);
    setUserComplaints([]);
    try {
      // Query complaints created by user id, or phone number, or email
      let query = supabase.from('complaints').select('id, ticket_number, description, status, created_at, address');

      if (user.phone) {
        query = query.or(`created_by.eq.${user.id},citizen_phone.eq.${user.phone}`);
      } else {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(25);
      if (!error && data) {
        setUserComplaints(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComplaints(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.staff_code && u.staff_code.toLowerCase().includes(q)) ||
      (u.ward_number && u.ward_number.toLowerCase().includes(q));

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'citizen' && (u.role === 'citizen' || !u.role)) ||
      (roleFilter === 'staff' && (u.role?.includes('staff') || u.role === 'supervisor' || u.role === 'field_employee')) ||
      (roleFilter === 'head' && (u.role === 'department_head' || u.role === 'municipal_administrator')) ||
      (roleFilter === 'admin' && (u.is_admin || u.role === 'admin'));

    return matchesSearch && matchesRole;
  });

  // Summary counts
  const totalCount = users.length;
  const staffCount = users.filter((u) => u.role && u.role !== 'citizen').length;
  const citizenCount = users.filter((u) => !u.role || u.role === 'citizen').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Top Header & Stats ── */}
      <div
        style={{
          background: 'var(--theme-component, #d9d9d9)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          border: '1.5px solid var(--theme-component-border, #bfbfbf)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 900, color: 'var(--gray-900)' }}>
            User & Staff Directory
          </h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-600)' }}>
            Search citizens and officers by Name, Mobile, Email, Staff Code, or Ward.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Quick Metrics */}
          <div style={{ display: 'flex', gap: 8 }}>
            <span
              style={{
                background: 'var(--theme-bg, #fff4e7)',
                border: '1px solid var(--theme-component-border, #bfbfbf)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.76rem',
                fontWeight: 800,
                color: 'var(--theme-primary, #660033)',
              }}
            >
              Total: {totalCount}
            </span>
            <span
              style={{
                background: 'var(--theme-bg, #fff4e7)',
                border: '1px solid var(--theme-component-border, #bfbfbf)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.76rem',
                fontWeight: 800,
                color: 'var(--theme-primary, #660033)',
              }}
            >
              Staff: {staffCount}
            </span>
            <span
              style={{
                background: 'var(--theme-bg, #fff4e7)',
                border: '1px solid var(--theme-component-border, #bfbfbf)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.76rem',
                fontWeight: 800,
                color: 'var(--theme-primary, #660033)',
              }}
            >
              Citizens: {citizenCount}
            </span>
          </div>

          <button
            onClick={fetchUsers}
            style={{
              background: 'var(--theme-bg, #fff4e7)',
              border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Search Bar & Role Filters ── */}
      <div
        style={{
          background: 'var(--theme-component, #d9d9d9)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
          border: '1.5px solid var(--theme-component-border, #bfbfbf)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Main Search Input */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--gray-500)',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by User Name, Mobile Number, Email, Staff ID, or Ward..."
            style={{
              width: '100%',
              padding: '11px 16px 11px 42px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              background: 'var(--theme-bg, #fff4e7)',
              fontSize: '0.88rem',
              color: 'var(--gray-900)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--gray-500)',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Role Filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--gray-600)', marginRight: 4 }}>
            <Filter size={13} style={{ display: 'inline', marginRight: 4 }} />
            Role Filter:
          </span>
          {[
            { key: 'all', label: 'All Users' },
            { key: 'citizen', label: 'Citizens' },
            { key: 'staff', label: 'Department Staff' },
            { key: 'head', label: 'Dept Heads & Administrators' },
            { key: 'admin', label: 'Admins' },
          ].map((r) => (
            <button
              key={r.key}
              onClick={() => setRoleFilter(r.key)}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid',
                borderColor: roleFilter === r.key ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)',
                background: roleFilter === r.key ? 'var(--theme-primary, #660033)' : 'var(--theme-bg, #fff4e7)',
                color: roleFilter === r.key ? '#fff' : 'var(--gray-800)',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Users Directory List / Table ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="shimmer"
              style={{ height: 80, borderRadius: 'var(--radius-md)', background: 'var(--theme-component, #d9d9d9)' }}
            />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div
          style={{
            background: 'var(--theme-component, #d9d9d9)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px 20px',
            textAlign: 'center',
            border: '1.5px dashed var(--theme-component-border, #bfbfbf)',
          }}
        >
          <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>🔍</div>
          <h4 style={{ margin: '0 0 4px', fontWeight: 800, color: 'var(--gray-900)' }}>
            No users found
          </h4>
          <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '0.84rem' }}>
            No user matching "{searchQuery}" under the selected role filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredUsers.map((u) => {
            const isStaff = u.role && u.role !== 'citizen';
            const isHead = u.role === 'department_head' || u.role === 'municipal_administrator';

            return (
              <div
                key={u.id}
                style={{
                  background: 'var(--theme-component, #d9d9d9)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                  padding: '14px 18px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* User Info Column */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 260 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: isHead
                        ? 'linear-gradient(135deg, #660033, #800040)'
                        : isStaff
                        ? 'var(--primary-gradient)'
                        : 'var(--gray-400)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {u.full_name ? u.full_name[0].toUpperCase() : u.email ? u.email[0].toUpperCase() : 'U'}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--gray-900)' }}>
                        {u.full_name || 'Unnamed Citizen'}
                      </span>

                      {/* Role Pill */}
                      <span
                        style={{
                          background: isHead
                            ? 'var(--theme-primary, #660033)'
                            : isStaff
                            ? 'rgba(102,0,51,0.15)'
                            : 'var(--theme-bg, #fff4e7)',
                          color: isHead ? '#fff' : 'var(--theme-primary, #660033)',
                          border: '1px solid var(--theme-component-border, #bfbfbf)',
                          borderRadius: 'var(--radius-full)',
                          padding: '1px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          textTransform: 'capitalize',
                        }}
                      >
                        {(u.role || 'citizen').replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Contact row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                      {u.phone && (
                        <a
                          href={`tel:${u.phone}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.78rem',
                            color: 'var(--theme-primary, #660033)',
                            textDecoration: 'none',
                            fontWeight: 700,
                          }}
                        >
                          <Phone size={12} />
                          {u.phone}
                        </a>
                      )}

                      {u.email && (
                        <a
                          href={`mailto:${u.email}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.78rem',
                            color: 'var(--gray-700)',
                            textDecoration: 'none',
                          }}
                        >
                          <Mail size={12} />
                          {u.email}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Department & Staff Code Column */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  {u.department && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-800)' }}>
                      <span>{u.department.icon}</span>
                      <span>{u.department.name}</span>
                    </div>
                  )}

                  {u.staff_code && (
                    <button
                      onClick={() => handleCopy(u.staff_code!, u.id)}
                      title="Click to copy Staff ID"
                      style={{
                        background: 'var(--theme-bg, #fff4e7)',
                        border: '1px solid var(--theme-component-border, #bfbfbf)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '3px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: 'var(--theme-primary, #660033)',
                      }}
                    >
                      <span>ID: {u.staff_code}</span>
                      {copiedId === u.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  )}

                  {u.ward_number && (
                    <span style={{ fontSize: '0.76rem', color: 'var(--gray-600)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <MapPin size={12} /> Ward {u.ward_number}
                    </span>
                  )}
                </div>

                {/* Action: View Complaints */}
                <div>
                  <button
                    onClick={() => openUserComplaints(u)}
                    style={{
                      background: 'var(--primary-gradient)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '7px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <FileText size={13} />
                    View Activity
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── USER COMPLAINTS MODAL ── */}
      {selectedUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedUser(null);
          }}
        >
          <div
            style={{
              background: 'var(--theme-component, #d9d9d9)',
              borderRadius: 'var(--radius-xl)',
              border: '2px solid var(--theme-component-border, #bfbfbf)',
              width: '100%',
              maxWidth: 580,
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'var(--header-gradient, linear-gradient(135deg, #4d0026 0%, #660033 50%, #800040 100%))',
                padding: '14px 20px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  Activity: {selectedUser.full_name || selectedUser.email || 'User'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.74rem', color: 'rgba(255,255,255,0.8)' }}>
                  Complaints filed or handled by this user
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: 5,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '16px 20px' }}>
              {/* Profile Details Bar */}
              <div
                style={{
                  background: 'var(--theme-bg, #fff4e7)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--theme-component-border, #bfbfbf)',
                  padding: '12px 14px',
                  marginBottom: 16,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  fontSize: '0.78rem',
                }}
              >
                <div><b>Phone:</b> {selectedUser.phone || 'N/A'}</div>
                <div><b>Email:</b> {selectedUser.email || 'N/A'}</div>
                <div><b>Role:</b> {selectedUser.role || 'citizen'}</div>
                <div><b>Staff Code:</b> {selectedUser.staff_code || 'N/A'}</div>
              </div>

              <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                Registered Complaints ({userComplaints.length})
              </h4>

              {loadingComplaints ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-600)' }}>
                  Loading complaints...
                </div>
              ) : userComplaints.length === 0 ? (
                <div
                  style={{
                    background: 'var(--theme-bg, #fff4e7)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px 16px',
                    textAlign: 'center',
                    border: '1.5px dashed var(--theme-component-border, #bfbfbf)',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--gray-600)' }}>
                    No complaints recorded for this user yet.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {userComplaints.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        background: 'var(--theme-bg, #fff4e7)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--theme-component-border, #bfbfbf)',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--theme-primary, #660033)' }}>
                            #{c.ticket_number}
                          </span>
                          <span
                            style={{
                              background: c.status === 'resolved' ? '#dcfce7' : '#fef3c7',
                              color: c.status === 'resolved' ? '#15803d' : '#b45309',
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                            }}
                          >
                            {c.status}
                          </span>
                        </div>
                        <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--gray-700)', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.description}
                        </p>
                      </div>

                      <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserDirectory;
