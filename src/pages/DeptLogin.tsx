import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2, Mail, Lock, LogIn, ShieldCheck, ArrowRight,
  User, Phone, ChevronDown, Clock, CheckCircle,
  ArrowUpCircle, LogOut, Search, MapPin, X, BadgeCheck,
  AlertCircle,
} from 'lucide-react';

import { FormInput } from '../components/auth/FormInput';
import { PasswordInput } from '../components/auth/PasswordInput';
import { AlertBanner } from '../components/auth/AlertBanner';

interface Department { id: string; name: string; slug: string; icon: string; }
interface City { id: string; name: string; state: string | null; slug: string | null; }
interface StaffMatch {
  id: string;
  full_name: string | null;
  role: string;
  staff_code: string | null;
  city_id: string | null;
  city_name: string | null;
  department_id: string | null;
  department_name: string | null;
  supervisor_id: string | null;
}

const REQUESTABLE_ROLES = [
  { value: 'department_head',   label: 'Department Head',   needsSupervisor: false, color: '#7c3aed' },
  { value: 'supervisor',        label: 'Supervisor',        needsSupervisor: true,  color: '#2563eb' },
  { value: 'control_room',      label: 'Control Room',      needsSupervisor: true,  color: '#0891b2' },
  { value: 'management_viewer', label: 'Management Viewer', needsSupervisor: true,  color: '#db2777' },
  { value: 'field_employee',    label: 'Field Employee',    needsSupervisor: true,  color: '#16a34a' },
  { value: 'dept_staff',        label: 'Department Staff',  needsSupervisor: true,  color: '#ca8a04' },
];

type Mode = 'login' | 'register' | 'upgrade' | 'pending';

export default function DeptLogin() {
  const { user, profile, refreshProfile, signOut, language } = useAuth();
  const navigate = useNavigate();
  const hi = language === 'hi';

  const [mode, setMode] = useState<Mode>('login');
  const [registerType, setRegisterType] = useState<'existing' | 'new'>('existing');

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [fullName, setFullName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const [cities, setCities]             = useState<City[]>([]);
  const [departments, setDepartments]   = useState<Department[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedRole, setSelectedRole] = useState('field_employee');
  const [supervisor, setSupervisor]     = useState<StaffMatch | null>(null);

  const [searchTerm, setSearchTerm]       = useState('');
  const [searchResults, setSearchResults] = useState<StaffMatch[]>([]);
  const [searching, setSearching]         = useState(false);

  useEffect(() => {
    supabase.from('cities').select('id, name, state, slug').eq('is_active', true).order('name')
      .then(({ data }) => setCities(data ?? []));
  }, []);

  useEffect(() => {
    supabase.from('departments').select('id, name, slug, icon').eq('is_active', true).order('name')
      .then(({ data }) => setDepartments(data ?? []));
  }, []);

  useEffect(() => {
    if (!user) return;
    const staffRoles = [
      'dept_staff','admin','department_head','supervisor','control_room',
      'management_viewer','field_employee','municipal_administrator',
    ];
    if (profile && staffRoles.includes(profile.role)) {
      navigate('/dept/dashboard', { replace: true });
    } else if (profile?.role === 'pending_staff') {
      setMode('pending');
    } else {
      setMode('upgrade');
      setEmail(user.email || '');
      if (profile?.full_name) setFullName(profile.full_name);
      if (profile?.phone) setPhone(profile.phone);
    }
  }, [user, profile, navigate]);

  const labelStyle: React.CSSProperties = {
    display: 'block', fontWeight: 700, fontSize: '0.82rem',
    marginBottom: 6, color: 'var(--gray-700)',
  };

  const runSearch = async () => {
    if (!searchTerm.trim() && !selectedCity && !selectedDept) {
      setSearchResults([]); return;
    }
    setSearching(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc('search_staff_for_signup', {
        search_term: searchTerm.trim() || null,
        city_filter: selectedCity || null,
        role_filter: null,
      });
      if (rpcErr) throw rpcErr;
      setSearchResults(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally { setSearching(false); }
  };

  const pickSupervisor = (match: StaffMatch) => {
    setSupervisor(match);
    if (match.city_id) setSelectedCity(match.city_id);
    if (match.department_id) setSelectedDept(match.department_id);
    setSearchResults([]);
    setSearchTerm('');
  };

  const clearSupervisor = () => setSupervisor(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;

      const { data: userProf } = await supabase
        .from('user_profiles').select('*').eq('id', data.user.id).single();

      const staffRoles = [
        'dept_staff','admin','department_head','supervisor','control_room',
        'management_viewer','field_employee','municipal_administrator',
      ];

      if (userProf && staffRoles.includes(userProf.role)) {
        navigate('/dept/dashboard');
      } else if (userProf?.role === 'pending_staff') {
        setMode('pending');
      } else {
        if (userProf?.full_name) setFullName(userProf.full_name);
        if (userProf?.phone) setPhone(userProf.phone);
        setMode('upgrade');
        setError(hi
          ? 'आपका खाता नागरिक के रूप में है। कृपया नीचे फॉर्म भरकर स्टाफ में जुड़ें।'
          : 'Your account is a citizen account. Please complete the form to join as staff.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally { setLoading(false); }
  };

  const submitRegistration = async (isNewAccount: boolean) => {
    setError('');
    const roleConf = REQUESTABLE_ROLES.find(r => r.value === selectedRole);
    if (!roleConf) { setError('Invalid role'); return; }

    if (!selectedCity) { setError(hi ? 'कृपया शहर चुनें' : 'Please select your city'); return; }
    if (!selectedDept) { setError(hi ? 'कृपया विभाग चुनें' : 'Please select your department'); return; }
    if (roleConf.needsSupervisor && !supervisor) {
      setError(hi ? 'कृपया सुपरवाइज़र खोजें और चुनें' : 'Please search and select your supervisor');
      return;
    }

    setLoading(true);
    try {
      let targetUserId = user?.id;
      let targetEmail = user?.email || email;

      if (isNewAccount) {
        const { data, error: signErr } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(), password,
        });
        if (signErr) {
          if (signErr.message.toLowerCase().includes('already registered') ||
              signErr.message.toLowerCase().includes('already exists')) {
            setRegisterType('existing');
            setError(hi
              ? 'यह ईमेल पहले से पंजीकृत है! पासवर्ड डालकर अपग्रेड करें।'
              : 'This email is already registered! Enter password to upgrade.');
            setLoading(false); return;
          }
          throw signErr;
        }
        targetUserId = data.user?.id;
        targetEmail = data.user?.email || email;
      } else if (!targetUserId) {
        const { data: signinData, error: signinErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(), password,
        });
        if (signinErr) throw signinErr;
        targetUserId = signinData.user.id;
        targetEmail = signinData.user.email || email;
      }

      if (!targetUserId) throw new Error('Could not establish user session');

      const { error: upsertErr } = await supabase.from('user_profiles').upsert({
        id: targetUserId,
        email: targetEmail.trim().toLowerCase(),
        full_name: fullName.trim() || profile?.full_name || 'Staff Member',
        phone: phone.trim() || profile?.phone || null,
        language,
        role: 'pending_staff',
        linked_department_id: selectedDept || null,
        city_id: selectedCity || null,
        supervisor_id: supervisor?.id || null,
      });
      if (upsertErr) throw upsertErr;

      await supabase.rpc('register_as_staff', {
        target_role: selectedRole,
        department_id: selectedDept || null,
        city_id: selectedCity || null,
        supervisor_id: supervisor?.id || null,
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
      });

      await refreshProfile();
      setMode('pending');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally { setLoading(false); }
  };

  const handleUpgradeExisting = (e: React.FormEvent) => { e.preventDefault(); submitRegistration(false); };
  const handleRegisterNew     = (e: React.FormEvent) => { e.preventDefault(); submitRegistration(true);  };

  const handleSignOutUser = async () => {
    await signOut();
    setMode('login');
    setEmail(''); setPassword(''); setFullName(''); setPhone('');
    setSelectedCity(''); setSelectedDept(''); setSelectedRole('field_employee');
    setSupervisor(null); setError('');
  };

  const selectedRoleConf = REQUESTABLE_ROLES.find(r => r.value === selectedRole);

  // ───────────── PENDING SCREEN ─────────────
  if (mode === 'pending') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f4c2a 0%, #16a34a 50%, #4ade80 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{
          maxWidth: 440, width: '100%', background: '#fff',
          borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          padding: 36, textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: '#fef3c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <Clock size={32} color="#d97706" />
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: '1.25rem', fontWeight: 900 }}>
            {hi ? 'अनुमोदन की प्रतीक्षा' : 'Awaiting Approval'}
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: 'var(--gray-600)', lineHeight: 1.7 }}>
            {hi
              ? 'आपका आवेदन आपके सुपरवाइज़र / एडमिन तक भेज दिया गया है।'
              : 'Your application has been forwarded to your supervisor / admin.'}
          </p>
          <div style={{
            padding: '14px 18px', background: '#f0fdf4', borderRadius: 'var(--radius-md)',
            border: '1.5px solid #bbf7d0', marginBottom: 22, textAlign: 'left',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <CheckCircle size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '0.85rem', color: '#15803d' }}>
                  {hi ? 'आवेदन सारांश' : 'Application Summary'}
                </p>
                {supervisor && (
                  <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#065f46' }}>
                    {hi ? 'सुपरवाइज़र:' : 'Supervisor:'} <b>{supervisor.full_name}</b>
                    {supervisor.staff_code ? ` (${supervisor.staff_code})` : ''}
                  </p>
                )}
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#065f46' }}>
                  {hi ? 'भूमिका:' : 'Role:'} <b>{selectedRoleConf?.label}</b>
                </p>
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/')} style={{
            width: '100%', padding: '12px', border: 'none',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #15803d, #16a34a)',
            color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
          }}>
            {hi ? 'होम पर जाएं' : 'Go to Home'}
          </button>
          <button onClick={handleSignOutUser} style={{
            marginTop: 10, width: '100%', padding: '10px', border: 'none',
            background: 'none', color: 'var(--gray-400)', fontSize: '0.82rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 5,
          }}>
            <LogOut size={13} /> {hi ? 'लॉगआउट करें' : 'Log out / Switch User'}
          </button>
        </div>
      </div>
    );
  }

  // ───────────── SHARED: REGISTRATION FIELDS ─────────────
  const renderRegistrationFields = () => (
    <>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>🎯 {hi ? 'आप किस भूमिका में जुड़ना चाहते हैं?' : 'Which role are you joining as?'}</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {REQUESTABLE_ROLES.map(r => (
            <button key={r.value} type="button"
              onClick={() => { setSelectedRole(r.value); setSupervisor(null); setError(''); }}
              style={{
                padding: '9px 10px', borderRadius: 'var(--radius-md)',
                border: selectedRole === r.value ? `2px solid ${r.color}` : '1.5px solid var(--gray-200)',
                background: selectedRole === r.value ? `${r.color}11` : '#fff',
                color: selectedRole === r.value ? r.color : 'var(--gray-700)',
                fontWeight: selectedRole === r.value ? 800 : 600,
                fontSize: '0.78rem', cursor: 'pointer', textAlign: 'left',
              }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>🏙️ {hi ? 'शहर चुनें *' : 'Select City *'}</label>
        <div style={{ position: 'relative' }}>
          <MapPin size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
          <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} required
            style={{
              width: '100%', padding: '11px 36px 11px 40px',
              border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem', background: '#fff', outline: 'none', boxSizing: 'border-box',
              appearance: 'none', cursor: 'pointer',
              color: selectedCity ? 'var(--gray-900)' : 'var(--gray-400)',
            }}>
            <option value="" disabled>{hi ? '— शहर चुनें —' : '— Select City —'}</option>
            {cities.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.state ? `, ${c.state}` : ''}</option>
            ))}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>🏢 {hi ? 'विभाग चुनें *' : 'Select Department *'}</label>
        <div style={{ position: 'relative' }}>
          <Building2 size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
          <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} required
            style={{
              width: '100%', padding: '11px 36px 11px 40px',
              border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem', background: '#fff', outline: 'none', boxSizing: 'border-box',
              appearance: 'none', cursor: 'pointer',
              color: selectedDept ? 'var(--gray-900)' : 'var(--gray-400)',
            }}>
            <option value="" disabled>{hi ? '— विभाग चुनें —' : '— Select Department —'}</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
            ))}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
        </div>
      </div>

      {selectedRoleConf?.needsSupervisor && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>👨‍💼 {hi ? 'सुपरवाइज़र खोजें *' : 'Find your Supervisor *'}</label>

          {supervisor ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', background: '#f0fdf4',
              borderRadius: 'var(--radius-md)', border: '1.5px solid #bbf7d0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BadgeCheck size={18} color="#16a34a" />
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: '#065f46' }}>
                    {supervisor.full_name}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#15803d' }}>
                    {supervisor.role.replace(/_/g, ' ')}
                    {supervisor.staff_code ? ` • ${supervisor.staff_code}` : ''}
                  </p>
                </div>
              </div>
              <button type="button" onClick={clearSupervisor}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#16a34a', padding: 4 }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
                  <input type="text"
                    placeholder={hi ? 'स्टाफ कोड या नाम से खोजें' : 'Search by staff code or name'}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }}
                    style={{
                      width: '100%', padding: '11px 14px 11px 40px',
                      border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
                      fontSize: '0.9rem', background: '#fff', outline: 'none', boxSizing: 'border-box',
                    }} />
                </div>
                <button type="button" onClick={runSearch} disabled={searching}
                  style={{
                    padding: '0 16px', border: 'none', borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, #15803d, #16a34a)',
                    color: '#fff', fontWeight: 800, fontSize: '0.82rem',
                    cursor: searching ? 'wait' : 'pointer',
                  }}>
                  {searching ? '...' : (hi ? 'खोजें' : 'Find')}
                </button>
              </div>

              <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                💡 {hi ? 'सुपरवाइज़र का स्टाफ कोड पता हो तो सीधे खोजें।' : 'Know the staff code? Search directly to skip city/dept.'}
              </p>

              {searchResults.length > 0 && (
                <div style={{
                  border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
                  maxHeight: 220, overflowY: 'auto', background: '#fff',
                }}>
                  {searchResults.map(m => (
                    <button key={m.id} type="button" onClick={() => pickSupervisor(m)}
                      style={{
                        width: '100%', padding: '10px 12px', border: 'none',
                        borderBottom: '1px solid var(--gray-100)',
                        background: '#fff', cursor: 'pointer', textAlign: 'left',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: 'var(--gray-900)' }}>
                          {m.full_name || 'Unnamed Staff'}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                          {m.role.replace(/_/g, ' ')}
                          {m.staff_code ? ` • ${m.staff_code}` : ''}
                          {m.city_name ? ` • ${m.city_name}` : ''}
                          {m.department_name ? ` • ${m.department_name}` : ''}
                        </p>
                      </div>
                      <ArrowRight size={14} color="var(--gray-400)" />
                    </button>
                  ))}
                </div>
              )}

              {searchResults.length === 0 && !searching && searchTerm && (
                <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                  {hi ? 'कोई परिणाम नहीं मिला।' : 'No matches found.'}
                </p>
              )}
            </>
          )}
        </div>
      )}

      <FormInput
        icon={User}
        placeholder={hi ? 'पूरा नाम' : 'Full Name'}
        value={fullName}
        onChange={e => setFullName(e.target.value)}
      />
      <FormInput
        icon={Phone}
        placeholder={hi ? 'मोबाइल नंबर' : 'Phone Number'}
        value={phone}
        onChange={e => setPhone(e.target.value)}
      />
    </>
  );

  // ───────────── UPGRADE VIEW (logged-in citizen) ─────────────
  if (mode === 'upgrade' && user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f4c2a 0%, #16a34a 50%, #4ade80 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
      }}>
        <div style={{
          width: '100%', maxWidth: 480, background: '#fff',
          borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #15803d, #16a34a)',
            padding: '26px 28px', textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px',
            }}>
              <ArrowUpCircle size={28} color="#fff" />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>
              {hi ? 'स्टाफ के रूप में जुड़ें' : 'Join as Staff'}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)' }}>
              {user.email}
            </p>
          </div>

          <form onSubmit={handleUpgradeExisting} style={{ padding: '24px' }}>
            <AlertBanner type="error" message={error} />
            {renderRegistrationFields()}

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '13px', border: 'none',
                borderRadius: 'var(--radius-md)',
                background: loading ? 'var(--gray-300)' : 'linear-gradient(135deg, #15803d, #16a34a)',
                color: '#fff', fontWeight: 800, fontSize: '0.95rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 14px rgba(22,163,74,0.35)',
              }}>
              {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : (
                <><ShieldCheck size={16} /> {hi ? 'आवेदन जमा करें' : 'Submit Application'}</>
              )}
            </button>

            <button type="button" onClick={handleSignOutUser}
              style={{
                width: '100%', marginTop: 14, padding: '10px', border: 'none',
                background: 'none', color: 'var(--gray-500)', fontSize: '0.82rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <LogOut size={13} /> {hi ? 'दूसरे खाते से लॉगिन करें' : 'Use a different account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ───────────── MAIN LOGIN / REGISTER ─────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f4c2a 0%, #16a34a 50%, #4ade80 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 480, background: '#fff',
        borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #15803d, #16a34a)',
          padding: '28px 32px', textAlign: 'center',
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Building2 size={28} color="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>
            {hi ? 'विभाग पोर्टल' : 'Department Portal'}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }}>
            {hi ? 'IMC 311 — नगर निगम विभागीय समाधान' : 'IMC 311 — Municipal Department Console'}
          </p>
        </div>

        <div style={{ display: 'flex', borderBottom: '2px solid var(--gray-100)' }}>
          {[
            { id: 'login',    label: hi ? '🔑 स्टाफ लॉगिन' : '🔑 Staff Login' },
            { id: 'register', label: hi ? '🏢 स्टाफ के रूप में जुड़ें' : '🏢 Join as Staff' },
          ].map(tab => (
            <button key={tab.id}
              onClick={() => { setMode(tab.id as Mode); setError(''); }}
              style={{
                flex: 1, padding: '13px', border: 'none', background: 'none',
                fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                color: mode === tab.id ? 'var(--green-700)' : 'var(--gray-400)',
                borderBottom: mode === tab.id ? '2.5px solid var(--green-600)' : '2.5px solid transparent',
                transition: 'all 0.2s', marginBottom: -2,
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '24px' }}>
          <AlertBanner type="error" message={error} />

          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <FormInput required type="email" icon={Mail}
                placeholder={hi ? 'ईमेल पता *' : 'Email Address *'}
                value={email} onChange={e => setEmail(e.target.value)} />
              <PasswordInput required
                placeholder={hi ? 'पासवर्ड *' : 'Password *'}
                value={password} onChange={e => setPassword(e.target.value)} />
              <button type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '13px', border: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: loading ? 'var(--gray-300)' : 'linear-gradient(135deg, #15803d, #16a34a)',
                  color: '#fff', fontWeight: 800, fontSize: '0.95rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: loading ? 'none' : '0 4px 14px rgba(22,163,74,0.35)',
                }}>
                {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : (
                  <><LogIn size={16} /> {hi ? 'लॉगिन करें' : 'Login to Department'}</>
                )}
              </button>

              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button type="button"
                  onClick={() => { setMode('register'); setError(''); }}
                  style={{ background: 'none', border: 'none', color: '#15803d', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                  {hi ? 'नागरिक खाता है? स्टाफ में अपग्रेड करें →' : 'Have a citizen account? Join as Staff →'}
                </button>
              </div>
            </form>
          )}

          {mode === 'register' && (
            <div>
              <div style={{
                display: 'flex', background: 'var(--gray-100)',
                padding: 4, borderRadius: 'var(--radius-md)', marginBottom: 16,
              }}>
                {[
                  { id: 'existing', label: hi ? '👤 मौजूदा खाता' : '👤 Existing Account' },
                  { id: 'new',      label: hi ? '✨ नया खाता' : '✨ New Account' },
                ].map(t => (
                  <button key={t.id} type="button"
                    onClick={() => { setRegisterType(t.id as 'existing' | 'new'); setError(''); }}
                    style={{
                      flex: 1, padding: '8px', border: 'none', borderRadius: 'var(--radius-sm)',
                      background: registerType === t.id ? '#fff' : 'transparent',
                      color: registerType === t.id ? '#15803d' : 'var(--gray-600)',
                      fontWeight: registerType === t.id ? 800 : 600,
                      fontSize: '0.8rem', cursor: 'pointer',
                      boxShadow: registerType === t.id ? 'var(--shadow-sm)' : 'none',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                padding: '10px 12px', background: 'var(--green-50)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--green-200)',
              }}>
                <AlertCircle size={15} color="var(--green-700)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--green-900)', fontWeight: 600, lineHeight: 1.4 }}>
                  {registerType === 'existing'
                    ? (hi ? 'आपका खाता वैसा ही रहेगा, सिर्फ स्टाफ रोल जुड़ेगा।' : 'Your account stays the same. We just add the staff role.')
                    : (hi ? 'नए स्टाफ खाते के लिए पंजीकरण।' : 'Register a new staff account.')}
                </span>
              </div>

              <form onSubmit={registerType === 'existing' ? handleUpgradeExisting : handleRegisterNew}>
                {renderRegistrationFields()}

                <FormInput required type="email" icon={Mail}
                  placeholder={hi ? 'ईमेल पता *' : 'Email Address *'}
                  value={email} onChange={e => setEmail(e.target.value)} />

                <PasswordInput required
                  placeholder={hi ? 'पासवर्ड *' : 'Password *'}
                  value={password} onChange={e => setPassword(e.target.value)} />

                <button type="submit" disabled={loading}
                  style={{
                    width: '100%', padding: '13px', border: 'none',
                    borderRadius: 'var(--radius-md)',
                    background: loading ? 'var(--gray-300)' : 'linear-gradient(135deg, #15803d, #16a34a)',
                    color: '#fff', fontWeight: 800, fontSize: '0.95rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: loading ? 'none' : '0 4px 14px rgba(22,163,74,0.35)',
                  }}>
                  {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : (
                    <><ShieldCheck size={16} /> {registerType === 'existing'
                      ? (hi ? 'अपग्रेड आवेदन भेजें' : 'Submit Upgrade Request')
                      : (hi ? 'पंजीकरण करें' : 'Submit Registration')}</>
                  )}
                </button>
              </form>
            </div>
          )}

          <button type="button" onClick={() => navigate('/')}
            style={{
              width: '100%', marginTop: 14, padding: '8px', border: 'none',
              background: 'none', color: 'var(--gray-400)', fontSize: '0.82rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 5,
            }}>
            <ArrowRight size={13} style={{ transform: 'rotate(180deg)' }} />
            {hi ? 'होम पर वापस जाएं' : 'Back to Home'}
          </button>
        </div>
      </div>
    </div>
  );
}
