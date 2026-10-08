import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2, Mail, Lock, LogIn, Eye, EyeOff,
  ShieldCheck, ArrowRight, User, Phone, ChevronDown,
  Clock, CheckCircle, AlertCircle, ArrowUpCircle, LogOut,
  Search, MapPin, X, BadgeCheck
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface City {
  id: string;
  name: string;
  state: string | null;
  slug: string | null;
}

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

// Roles a self-registering user can request
const REQUESTABLE_ROLES = [
  { value: 'department_head',      label: 'Department Head',    needsCity: true,  needsDept: true,  needsSupervisor: false, color: '#7c3aed' },
  { value: 'supervisor',           label: 'Supervisor',         needsCity: true,  needsDept: true,  needsSupervisor: true,  color: '#2563eb' },
  { value: 'control_room',         label: 'Control Room',       needsCity: true,  needsDept: true,  needsSupervisor: true,  color: '#0891b2' },
  { value: 'management_viewer',    label: 'Management Viewer',  needsCity: true,  needsDept: true,  needsSupervisor: true,  color: '#db2777' },
  { value: 'field_employee',       label: 'Field Employee',     needsCity: true,  needsDept: true,  needsSupervisor: true,  color: '#16a34a' },
  { value: 'dept_staff',           label: 'Department Staff',   needsCity: true,  needsDept: true,  needsSupervisor: true,  color: '#ca8a04' },
];

export default function DeptLogin() {
  const { user, profile, refreshProfile, signOut, language } = useAuth();
  const navigate = useNavigate();
  const hi = language === 'hi';

  type Mode = 'login' | 'register' | 'upgrade' | 'pending';
  const [mode, setMode] = useState<Mode>('login');
  const [registerType, setRegisterType] = useState<'existing' | 'new'>('existing');

  // Common fields
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [fullName, setFullName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Registration chain
  const [cities, setCities]             = useState<City[]>([]);
  const [departments, setDepartments]   = useState<Department[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedRole, setSelectedRole] = useState('field_employee');
  const [supervisor, setSupervisor]     = useState<StaffMatch | null>(null);

  // Supervisor search
  const [searchTerm, setSearchTerm]     = useState('');
  const [searchResults, setSearchResults] = useState<StaffMatch[]>([]);
  const [searching, setSearching]       = useState(false);
  const [showSearchBox, setShowSearchBox] = useState(false);

  // Load cities
  useEffect(() => {
    supabase.from('cities').select('id, name, state, slug').eq('is_active', true).order('name')
      .then(({ data }) => setCities(data ?? []));
  }, []);

  // Load departments
  useEffect(() => {
    supabase.from('departments').select('id, name, slug, icon').eq('is_active', true).order('name')
      .then(({ data }) => setDepartments(data ?? []));
  }, []);

  // Detect logged-in user
  useEffect(() => {
    if (!user) return;

    if (profile?.role === 'dept_staff' || profile?.role === 'admin' ||
        profile?.role === 'department_head' || profile?.role === 'supervisor' ||
        profile?.role === 'control_room' || profile?.role === 'management_viewer' ||
        profile?.role === 'field_employee' || profile?.role === 'municipal_administrator') {
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

  // ── STYLES ────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px 11px 40px',
    border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
    fontSize: '0.9rem', background: '#fff', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'var(--font-primary)',
  };
  const iconStyle: React.CSSProperties = {
    position: 'absolute', left: 13, top: '50%',
    transform: 'translateY(-50%)', color: 'var(--gray-400)',
    pointerEvents: 'none',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontWeight: 700, fontSize: '0.82rem',
    marginBottom: 6, color: 'var(--gray-700)',
  };

  // ── SEARCH SUPERVISOR ─────────────────────────────────────────
  const runSearch = async () => {
    if (!searchTerm.trim() && !selectedCity && !selectedDept) {
      setSearchResults([]);
      return;
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
    } finally {
      setSearching(false);
    }
  };

  const pickSupervisor = (match: StaffMatch) => {
    setSupervisor(match);
    if (match.city_id) setSelectedCity(match.city_id);
    if (match.department_id) setSelectedDept(match.department_id);
    setShowSearchBox(false);
    setSearchResults([]);
    setSearchTerm('');
  };

  const clearSupervisor = () => setSupervisor(null);

  // ── LOGIN ─────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;

      const { data: userProf } = await supabase
        .from('user_profiles').select('*').eq('id', data.user.id).single();

      const staffRoles = [
        'dept_staff','admin','department_head','supervisor','control_room',
        'management_viewer','field_employee','municipal_administrator'
      ];

      if (userProf && staffRoles.includes(userProf.role)) {
        navigate('/dept/dashboard');
      } else if (userProf?.role === 'pending_staff') {
        setMode('pending');
      } else {
        if (userProf?.full_name) setFullName(userProf.full_name);
        if (userProf?.phone) setPhone(userProf.phone);
        setMode('upgrade');
        setError(
          hi
            ? 'आपका खाता एक नागरिक के रूप में पंजीकृत है। कृपया विभाग स्टाफ में अपग्रेड करने के लिए नीचे फॉर्म भरें।'
            : 'Welcome! Your account is registered as a citizen. Please complete the form below to upgrade to staff.'
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally { setLoading(false); }
  };

  // ── SUBMIT REGISTRATION/UPGRADE ────────────────────────────────
  const submitRegistration = async (isNewAccount: boolean) => {
    setError(null);

    const roleConf = REQUESTABLE_ROLES.find(r => r.value === selectedRole);
    if (!roleConf) { setError('Invalid role'); return; }

    if (roleConf.needsCity && !selectedCity) {
      setError(hi ? 'कृपया शहर चुनें' : 'Please select your city'); return;
    }
    if (roleConf.needsDept && !selectedDept) {
      setError(hi ? 'कृपया विभाग चुनें' : 'Please select your department'); return;
    }
    if (roleConf.needsSupervisor && !supervisor) {
      setError(hi ? 'कृपया अपने सुपरवाइज़र को खोजें और चुनें' : 'Please search and select your supervisor');
      return;
    }

    setLoading(true);
    try {
      let targetUserId = user?.id;
      let targetEmail = user?.email || email;

      if (isNewAccount) {
        const { data, error: signErr } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        });
        if (signErr) {
          if (signErr.message.toLowerCase().includes('already registered') ||
              signErr.message.toLowerCase().includes('already exists')) {
            setRegisterType('existing');
            setError(hi
              ? 'यह ईमेल पहले से पंजीकृत है! कृपया पासवर्ड डालकर अपग्रेड करें।'
              : 'This email is already registered! Enter password to upgrade.');
            setLoading(false);
            return;
          }
          throw signErr;
        }
        targetUserId = data.user?.id;
        targetEmail = data.user?.email || email;
      } else if (!targetUserId) {
        const { data: signinData, error: signinErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (signinErr) throw signinErr;
        targetUserId = signinData.user.id;
        targetEmail = signinData.user.email || email;
      }

      if (!targetUserId) throw new Error('Could not establish user session');

      // Update base profile
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

      // Log the requested role via RPC (non-fatal if it fails)
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

  const handleUpgradeExisting = (e: React.FormEvent) => {
    e.preventDefault();
    submitRegistration(false);
  };
  const handleRegisterNew = (e: React.FormEvent) => {
    e.preventDefault();
    submitRegistration(true);
  };

  const handleSignOutUser = async () => {
    await signOut();
    setMode('login');
    setEmail(''); setPassword(''); setFullName(''); setPhone('');
    setSelectedCity(''); setSelectedDept(''); setSelectedRole('field_employee');
    setSupervisor(null); setError(null);
  };

  const selectedRoleConf = REQUESTABLE_ROLES.find(r => r.value === selectedRole);

  // ── PENDING SCREEN ────────────────────────────────────────────
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
          <h2 style={{ margin: '0 0 10px', fontSize: '1.25rem', fontWeight: 900, color: 'var(--gray-900)' }}>
            {hi ? 'अनुमोदन की प्रतीक्षा' : 'Awaiting Approval'}
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: 'var(--gray-600)', lineHeight: 1.7 }}>
            {hi
              ? 'आपका आवेदन आपके चुने हुए सुपरवाइज़र तक पहुँचा दिया गया है।'
              : 'Your application has been forwarded to your selected supervisor / approver.'}
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
                  {hi ? 'भूमिका:' : 'Requested role:'} <b>{selectedRoleConf?.label}</b>
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            style={{
              width: '100%', padding: '12px', border: 'none',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #15803d, #16a34a)',
              color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            {hi ? 'होम पर जाएं' : 'Go to Home'}
          </button>

          <button
            onClick={handleSignOutUser}
            style={{
              marginTop: 10, width: '100%', padding: '10px', border: 'none',
              background: 'none', color: 'var(--gray-400)', fontSize: '0.82rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 5,
            }}
          >
            <LogOut size={13} /> {hi ? 'लॉगआउट करें' : 'Log out / Switch User'}
          </button>
        </div>
      </div>
    );
  }

  // ── REUSABLE: ROLE + CITY + DEPT + SUPERVISOR PICKER ──────────
  const renderRegistrationFields = () => (
    <>
      {/* Role picker */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>🎯 {hi ? 'आप किस भूमिका में जुड़ना चाहते हैं?' : 'Which role are you joining as?'}</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {REQUESTABLE_ROLES.map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => {
                setSelectedRole(r.value);
                setSupervisor(null);
                setError(null);
              }}
              style={{
                padding: '9px 10px', borderRadius: 'var(--radius-md)',
                border: selectedRole === r.value ? `2px solid ${r.color}` : '1.5px solid var(--gray-200)',
                background: selectedRole === r.value ? `${r.color}11` : '#fff',
                color: selectedRole === r.value ? r.color : 'var(--gray-700)',
                fontWeight: selectedRole === r.value ? 800 : 600,
                fontSize: '0.78rem', cursor: 'pointer', textAlign: 'left',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* City */}
      {selectedRoleConf?.needsCity && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>🏙️ {hi ? 'शहर चुनें *' : 'Select City *'}</label>
          <div style={{ position: 'relative' }}>
            <MapPin size={15} style={iconStyle} />
            <ChevronDown size={14} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--gray-400)', pointerEvents: 'none',
            }} />
            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              required
              style={{
                ...inputStyle, paddingRight: 36, appearance: 'none', cursor: 'pointer',
                color: selectedCity ? 'var(--gray-900)' : 'var(--gray-400)',
              }}
            >
              <option value="" disabled>{hi ? '— शहर चुनें —' : '— Select City —'}</option>
              {cities.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.state ? `, ${c.state}` : ''}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Department */}
      {selectedRoleConf?.needsDept && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>🏢 {hi ? 'विभाग चुनें *' : 'Select Department *'}</label>
          <div style={{ position: 'relative' }}>
            <Building2 size={15} style={iconStyle} />
            <ChevronDown size={14} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--gray-400)', pointerEvents: 'none',
            }} />
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              required
              style={{
                ...inputStyle, paddingRight: 36, appearance: 'none', cursor: 'pointer',
                color: selectedDept ? 'var(--gray-900)' : 'var(--gray-400)',
              }}
            >
              <option value="" disabled>{hi ? '— विभाग चुनें —' : '— Select Department —'}</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Supervisor search */}
      {selectedRoleConf?.needsSupervisor && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>
            👨‍💼 {hi ? 'सुपरवाइज़र खोजें *' : 'Find your Supervisor *'}
          </label>

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
                  <p style={{ margin: 0, fontSize: '0.72rem',
