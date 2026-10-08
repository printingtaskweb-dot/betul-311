import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2, Mail, LogIn, ShieldCheck, ArrowRight, User, Phone,
  ChevronDown, Clock, CheckCircle, ArrowUpCircle, LogOut, Search,
  MapPin, X, BadgeCheck, AlertCircle, Briefcase, Crosshair, Crown,
  Plus, Wand2,
} from 'lucide-react';

import { FormInput } from '../components/auth/FormInput';
import { PasswordInput } from '../components/auth/PasswordInput';
import { AlertBanner } from '../components/auth/AlertBanner';

interface Department { id: string; name: string; slug: string; icon: string; }
interface City { id: string; name: string; state: string | null; district: string | null; slug: string | null; }
interface Designation {
  id: string; department_id: string; tier: number;
  name: string; name_hi: string | null;
  maps_to_role: string; scope_description: string | null;
}
interface AuthorityRole {
  code: string; name: string; name_hi: string | null;
  rank: number; parent_code: string | null; scope_level: string;
  maps_to_role: string; can_approve: boolean; can_view_all: boolean;
  description: string | null;
}
interface StaffMatch {
  id: string; full_name: string | null; role: string;
  authority_role: string | null; hierarchy_code: string | null;
  hierarchy_rank: number | null; staff_code: string | null;
  city_id: string | null; city_name: string | null; district: string | null;
  department_id: string | null; department_name: string | null;
  designation_id: string | null; designation_name: string | null;
  tier: number | null; supervisor_id: string | null; distance_km: number | null;
}

type Mode = 'login' | 'register' | 'upgrade' | 'pending';
type RegisterKind = 'department' | 'authority';
type Discovery = 'search' | 'chain' | 'custom';

const TIER_LABELS: Record<number, string> = {
  1: 'Head Officer', 2: 'Ward / Area Officer',
  3: 'Supervisor',   4: 'Operational Staff',
};

const CHAIN_STEPS: { key: string; label: string; hi: string;
  authority: string | null; requiresDept: boolean }[] = [
  { key: 'commissioner', label: 'Municipal Commissioner',
    hi: 'नगर आयुक्त', authority: 'municipal_commissioner', requiresDept: false },
  { key: 'deputy', label: 'Deputy Commissioner',
    hi: 'उप आयुक्त', authority: 'deputy_commissioner', requiresDept: false },
  { key: 'head', label: 'Head Officer',
    hi: 'विभाग प्रमुख', authority: 'department_head', requiresDept: true },
  { key: 'area', label: 'Ward / Area Officer',
    hi: 'वार्ड अधिकारी', authority: 'area_officer', requiresDept: true },
  { key: 'supervisor', label: 'Supervisor',
    hi: 'पर्यवेक्षक', authority: 'supervisor', requiresDept: true },
];

export default function DeptLogin() {
  const { user, profile, refreshProfile, signOut, language: rawLang } = useAuth();
  const navigate = useNavigate();
  const hi = rawLang === 'hi';
  const language: 'en' | 'hi' = hi ? 'hi' : 'en';

  const [mode, setMode]               = useState<Mode>('login');
  const [registerKind, setRegisterKind] = useState<RegisterKind>('department');
  const [registerType, setRegisterType] = useState<'existing' | 'new'>('existing');
  const [discovery, setDiscovery]     = useState<Discovery>('search');

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const [cities, setCities]                 = useState<City[]>([]);
  const [departments, setDepartments]       = useState<Department[]>([]);
  const [designations, setDesignations]     = useState<Designation[]>([]);
  const [authorityRoles, setAuthorityRoles] = useState<AuthorityRole[]>([]);

  const [selectedCity, setSelectedCity]           = useState('');
  const [selectedDept, setSelectedDept]           = useState('');
  const [selectedDesig, setSelectedDesig]         = useState<Designation | null>(null);
  const [selectedAuthority, setSelectedAuthority] = useState<AuthorityRole | null>(null);
  const [supervisor, setSupervisor]               = useState<StaffMatch | null>(null);

  // Chain walker state
  const [chainStepIndex, setChainStepIndex] = useState(0);
  const [chainResults, setChainResults]     = useState<StaffMatch[]>([]);
  const [chainLoading, setChainLoading]     = useState(false);
  const [chainPath, setChainPath]           = useState<Record<string, StaffMatch>>({});

  // Custom dept
  const [customDeptName, setCustomDeptName] = useState('');
  const [customDeptLoading, setCustomDeptLoading] = useState(false);

  const [coords, setCoords]         = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const [searchTerm, setSearchTerm]       = useState('');
  const [searchResults, setSearchResults] = useState<StaffMatch[]>([]);
  const [searching, setSearching]         = useState(false);

  // ---------- initial loads ----------
  useEffect(() => {
    supabase.from('cities').select('id, name, state, district, slug')
      .eq('is_active', true).order('name')
      .then(({ data }) => setCities((data ?? []) as City[]));
  }, []);
  useEffect(() => {
    supabase.from('departments').select('id, name, slug, icon')
      .eq('is_active', true).order('name')
      .then(({ data }) => setDepartments((data ?? []) as Department[]));
  }, []);
  useEffect(() => {
    supabase.rpc('list_hierarchy_roles')
      .then(({ data }) => setAuthorityRoles((data ?? []) as AuthorityRole[]));
  }, []);

  useEffect(() => {
    if (!selectedDept) { setDesignations([]); setSelectedDesig(null); return; }
    supabase.rpc('list_designations', { dept_id: selectedDept })
      .then(({ data }) => setDesignations((data ?? []) as Designation[]));
    setSelectedDesig(null); setSupervisor(null);
  }, [selectedDept]);

  useEffect(() => {
    if (!user) return;
    const staffRoles = [
      'dept_staff','admin','department_head','supervisor','control_room',
      'management_viewer','field_employee','municipal_administrator',
    ];
    if (profile?.role && staffRoles.includes(profile.role)) {
      navigate('/dept/dashboard', { replace: true });
    } else if (profile?.role === 'pending_staff') {
      setMode('pending');
    } else {
      setMode('upgrade');
      setEmail(user.email || '');
      setFullName(profile?.full_name ?? '');
      setPhone(profile?.phone ?? '');
    }
  }, [user, profile, navigate]);

  // ---------- styles ----------
  const labelStyle: React.CSSProperties = {
    display: 'block', fontWeight: 700, fontSize: '0.82rem',
    marginBottom: 6, color: 'var(--gray-700)',
  };
  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '11px 36px 11px 40px',
    border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
    fontSize: '0.9rem', background: '#fff', outline: 'none',
    boxSizing: 'border-box', appearance: 'none', cursor: 'pointer',
  };
  const cardBtn: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', padding: '10px 12px', border: 'none',
    borderBottom: '1px solid var(--gray-100)', background: '#fff',
    cursor: 'pointer', textAlign: 'left',
  };

  // ---------- geolocation ----------
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError(hi ? 'आपके ब्राउज़र में लोकेशन उपलब्ध नहीं है' : 'Geolocation not supported');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        setCoords({ lat, lng });
        const { data } = await supabase.rpc('nearest_city', {
          p_lat: lat, p_lng: lng, p_max_km: 200,
        });
        const nc = (data as any[] | null)?.[0];
        if (nc?.id) setSelectedCity(nc.id);
        else setError(hi ? 'निकटतम शहर नहीं मिला' : 'No nearby city found');
        setGeoLoading(false);
      },
      () => {
        setError(hi ? 'लोकेशन की अनुमति नहीं मिली' : 'Location permission denied');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // ---------- free search ----------
  const runSearch = async () => {
    if (!searchTerm.trim() && !selectedCity && !selectedDept && !coords) {
      setSearchResults([]); return;
    }
    setSearching(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc('search_approvers_for_signup', {
        p_search:        searchTerm.trim() || null,
        p_city_id:       selectedCity || null,
        p_department_id: registerKind === 'department' ? (selectedDept || null) : null,
        p_lat:           coords?.lat ?? null,
        p_lng:           coords?.lng ?? null,
        p_limit:         25,
      });
      if (rpcErr) throw rpcErr;
      setSearchResults((data ?? []) as StaffMatch[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally { setSearching(false); }
  };

  // ---------- chain walker ----------
  const loadChainStep = async (idx: number) => {
    const step = CHAIN_STEPS[idx];
    if (!step) return;
    if (!selectedCity && !coords) { setChainResults([]); return; }
    if (step.requiresDept && !selectedDept) { setChainResults([]); return; }
    setChainLoading(true);
    try {
      const parent =
        idx === 0 ? null :
        chainPath[CHAIN_STEPS[idx - 1].key]?.id ?? null;
      const { data, error: rpcErr } = await supabase.rpc('search_chain_step', {
        p_city_id:        selectedCity || null,
        p_department_id:  step.requiresDept ? (selectedDept || null) : null,
        p_parent_id:      parent,
        p_hierarchy_code: step.authority,
        p_search:         null,
        p_limit:          50,
      });
      if (rpcErr) throw rpcErr;
      setChainResults((data ?? []) as StaffMatch[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chain step failed');
    } finally { setChainLoading(false); }
  };

  useEffect(() => {
    if (discovery !== 'chain') return;
    loadChainStep(chainStepIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discovery, chainStepIndex, selectedCity, selectedDept]);

  const pickChainStep = (m: StaffMatch) => {
    const step = CHAIN_STEPS[chainStepIndex];
    setChainPath(prev => ({ ...prev, [step.key]: m }));
    if (chainStepIndex < CHAIN_STEPS.length - 1) {
      // Skip the "deputy"/"head" step if user already passed dept selection
      setChainStepIndex(i => i + 1);
    } else {
      // Last step picked — that's the reporting officer
      setSupervisor(m);
    }
  };

  const resetChain = () => {
    setChainPath({}); setChainStepIndex(0); setChainResults([]);
    setSupervisor(null);
  };

  // ---------- custom dept ----------
  const createCustomDept = async () => {
    if (customDeptName.trim().length < 3) {
      setError(hi ? 'विभाग का नाम बहुत छोटा है' : 'Department name too short');
      return;
    }
    setCustomDeptLoading(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc('suggest_department', {
        p_name: customDeptName.trim(), p_icon: '📁',
      });
      if (rpcErr) throw rpcErr;
      const id = (data as any)?.id;
      if (!id) throw new Error('No department id returned');
      // refresh list + select it
      const { data: refreshed } = await supabase.from('departments')
        .select('id, name, slug, icon').eq('is_active', true).order('name');
      setDepartments((refreshed ?? []) as Department[]);
      setSelectedDept(id);
      setCustomDeptName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create department');
    } finally { setCustomDeptLoading(false); }
  };

  // ---------- login ----------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;
      const { data: userProf } = await supabase
        .from('user_profiles').select('*').eq('id', data.user.id).single();
      const staffRoles = [
        'dept_staff','admin','department_head','supervisor','control_room',
        'management_viewer','field_employee','municipal_administrator',
      ];
      if (userProf?.role && staffRoles.includes(userProf.role)) navigate('/dept/dashboard');
      else if (userProf?.role === 'pending_staff') setMode('pending');
      else {
        setFullName(userProf?.full_name ?? '');
        setPhone(userProf?.phone ?? '');
        setMode('upgrade');
        setError(hi
          ? 'आपका खाता नागरिक के रूप में है। कृपया फॉर्म भरकर स्टाफ में जुड़ें।'
          : 'Your account is a citizen account. Please complete the form to join as staff.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally { setLoading(false); }
  };

  // ---------- submit ----------
  const submitRegistration = async (isNewAccount: boolean) => {
    setError('');
    if (!selectedCity) { setError(hi ? 'कृपया शहर चुनें' : 'Please select your city'); return; }

    if (registerKind === 'department') {
      if (!selectedDept)  { setError(hi ? 'कृपया विभाग चुनें' : 'Please select your department'); return; }
      if (!selectedDesig) { setError(hi ? 'कृपया पद चुनें' : 'Please select your designation'); return; }
      if (selectedDesig.tier !== 1 && !supervisor) {
        setError(hi ? 'कृपया रिपोर्टिंग अधिकारी चुनें' : 'Please select your reporting officer');
        return;
      }
    } else {
      if (!selectedAuthority) { setError(hi ? 'कृपया भूमिका चुनें' : 'Please select your authority role'); return; }
      if (!['platform_admin','mayor'].includes(selectedAuthority.code) && !supervisor) {
        setError(hi ? 'कृपया रिपोर्टिंग अधिकारी चुनें' : 'Please select your reporting officer');
        return;
      }
    }

    setLoading(true);
    try {
      let targetUserId = user?.id;
      let targetEmail  = user?.email || email;

      if (isNewAccount) {
        const { data, error: signErr } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(), password,
        });
        if (signErr) {
          if (/already registered|already exists/i.test(signErr.message)) {
            setRegisterType('existing');
            setError(hi
              ? 'यह ईमेल पहले से पंजीकृत है! पासवर्ड डालकर अपग्रेड करें।'
              : 'This email is already registered! Enter password to upgrade.');
            setLoading(false); return;
          }
          throw signErr;
        }
        targetUserId = data.user?.id;
        targetEmail  = data.user?.email || email;
      } else if (!targetUserId) {
        const { data: s, error: sErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(), password,
        });
        if (sErr) throw sErr;
        targetUserId = s.user.id;
        targetEmail  = s.user.email || email;
      }
      if (!targetUserId) throw new Error('Could not establish user session');

      const { error: upsertErr } = await supabase.from('user_profiles').upsert({
        id: targetUserId,
        email: targetEmail.trim().toLowerCase(),
        full_name: fullName.trim() || profile?.full_name || 'Staff Member',
        phone: phone.trim() || profile?.phone || null,
        language,
        role: 'pending_staff',
        city_id: selectedCity,
        supervisor_id: supervisor?.id || null,
        linked_department_id: registerKind === 'department' ? selectedDept : null,
        designation_id: registerKind === 'department' ? (selectedDesig?.id ?? null) : null,
        latitude:  coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      });
      if (upsertErr) throw upsertErr;

      if (registerKind === 'department') {
        const { error: rpcErr } = await supabase.rpc('register_as_staff', {
          target_role:    selectedDesig!.maps_to_role,
          department_id:  selectedDept,
          city_id:        selectedCity,
          supervisor_id:  supervisor?.id || null,
          full_name:      fullName.trim() || null,
          phone:          phone.trim() || null,
          designation_id: selectedDesig!.id,
          zone_id:        null,
        });
        if (rpcErr) throw rpcErr;
      } else {
        const { error: rpcErr } = await supabase.rpc('register_authority_user', {
          p_authority_role: selectedAuthority!.code,
          p_city_id:        selectedCity,
          p_supervisor_id:  supervisor?.id || null,
          p_full_name:      fullName.trim() || null,
          p_phone:          phone.trim() || null,
          p_designation_id: null,
          p_zone_id:        null,
        });
        if (rpcErr) throw rpcErr;
      }

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
    setMode('login'); setDiscovery('search');
    setEmail(''); setPassword(''); setFullName(''); setPhone('');
    setSelectedCity(''); setSelectedDept(''); setSelectedDesig(null);
    setSelectedAuthority(null); setSupervisor(null); resetChain(); setError('');
  };

  // ---------- pending screen ----------
  if (mode === 'pending') {
    return (
      <div style={{ minHeight: '100vh',
        background: 'linear-gradient(135deg,#0f4c2a 0%,#16a34a 50%,#4ade80 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 440, width: '100%', background: '#fff',
          borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          padding: 36, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fef3c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px' }}><Clock size={32} color="#d97706" /></div>
          <h2 style={{ margin: '0 0 10px', fontSize: '1.25rem', fontWeight: 900 }}>
            {hi ? 'अनुमोदन की प्रतीक्षा' : 'Awaiting Approval'}</h2>
          <p style={{ margin: '0 0 20px', fontSize: '0.88rem',
            color: 'var(--gray-600)', lineHeight: 1.7 }}>
            {hi ? 'आपका आवेदन आपके सीनियर अधिकारी तक भेज दिया गया है।'
                : 'Your application has been forwarded to your senior officer.'}</p>
          <div style={{ padding: '14px 18px', background: '#f0fdf4',
            borderRadius: 'var(--radius-md)', border: '1.5px solid #bbf7d0',
            marginBottom: 22, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <CheckCircle size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '0.85rem', color: '#15803d' }}>
                  {hi ? 'आवेदन सारांश' : 'Application Summary'}</p>
                {selectedDesig && (
                  <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#065f46' }}>
                    {hi ? 'पद:' : 'Designation:'}{' '}
                    <b>{hi && selectedDesig.name_hi ? selectedDesig.name_hi : selectedDesig.name}</b>
                  </p>
                )}
                {selectedAuthority && (
                  <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#065f46' }}>
                    {hi ? 'भूमिका:' : 'Role:'}{' '}
                    <b>{hi && selectedAuthority.name_hi ? selectedAuthority.name_hi : selectedAuthority.name}</b>
                  </p>
                )}
                {supervisor && (
                  <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#065f46' }}>
                    {hi ? 'रिपोर्टिंग:' : 'Reports to:'} <b>{supervisor.full_name}</b>
                    {supervisor.staff_code ? ` (${supervisor.staff_code})` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/')} style={{
            width: '100%', padding: '12px', border: 'none',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg,#15803d,#16a34a)',
            color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>
            {hi ? 'होम पर जाएं' : 'Go to Home'}</button>
          <button onClick={handleSignOutUser} style={{
            marginTop: 10, width: '100%', padding: '10px', border: 'none',
            background: 'none', color: 'var(--gray-400)', fontSize: '0.82rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 5 }}>
            <LogOut size={13} /> {hi ? 'लॉगआउट करें' : 'Log out / Switch User'}</button>
        </div>
      </div>
    );
  }

  // ---------- shared: staff result row ----------
  const renderStaffRow = (
    m: StaffMatch,
    onClick: (m: StaffMatch) => void,
  ) => (
    <button key={m.id} type="button" onClick={() => onClick(m)} style={cardBtn}>
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: 'var(--gray-900)' }}>
          {m.full_name || 'Unnamed Staff'}
        </p>
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--gray-500)' }}>
          {(m.designation_name || m.hierarchy_code || m.role || '').replace(/_/g, ' ')}
          {m.staff_code ? ` • ${m.staff_code}` : ''}
          {m.city_name ? ` • ${m.city_name}` : ''}
          {m.department_name ? ` • ${m.department_name}` : ''}
          {m.distance_km != null ? ` • ${m.distance_km} km` : ''}
        </p>
      </div>
      <ArrowRight size={14} color="var(--gray-400)" />
    </button>
  );

  // ---------- shared: reporting officer picker ----------
  const renderReportingSearch = () => (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>
        👨‍💼 {hi ? 'रिपोर्टिंग अधिकारी खोजें *' : 'Find your Reporting Officer *'}
      </label>
      {supervisor ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px', background: '#f0fdf4',
          borderRadius: 'var(--radius-md)', border: '1.5px solid #bbf7d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BadgeCheck size={18} color="#16a34a" />
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: '#065f46' }}>
                {supervisor.full_name}</p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#15803d' }}>
                {(supervisor.designation_name || supervisor.hierarchy_code || supervisor.role || '')
                  .replace(/_/g, ' ')}
                {supervisor.staff_code ? ` • ${supervisor.staff_code}` : ''}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => { setSupervisor(null); resetChain(); }}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#16a34a', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: 13, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
              <input type="text"
                placeholder={hi ? 'स्टाफ कोड, नाम या आईडी' : 'Staff code, name or ID'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }}
                style={{ width: '100%', padding: '11px 14px 11px 40px',
                  border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem', background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button type="button" onClick={runSearch} disabled={searching}
              style={{ padding: '0 16px', border: 'none', borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg,#15803d,#16a34a)',
                color: '#fff', fontWeight: 800, fontSize: '0.82rem',
                cursor: searching ? 'wait' : 'pointer' }}>
              {searching ? '...' : (hi ? 'खोजें' : 'Find')}
            </button>
          </div>
          <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: 'var(--gray-500)' }}>
            💡 {hi ? 'सीनियर का स्टाफ कोड पता हो तो सीधे खोजें।'
                  : 'Know your senior\'s staff code? Search directly.'}
          </p>
          {searchResults.length > 0 && (
            <div style={{ border: '1.5px solid var(--gray-200)',
              borderRadius: 'var(--radius-md)', maxHeight: 240,
              overflowY: 'auto', background: '#fff' }}>
              {searchResults.map(m => renderStaffRow(m, (mm) => {
                setSupervisor(mm);
                if (mm.city_id) setSelectedCity(mm.city_id);
                if (mm.department_id && registerKind === 'department') setSelectedDept(mm.department_id);
                setSearchResults([]); setSearchTerm('');
              }))}
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
  );

  // ---------- chain walker UI ----------
  const renderChainWalker = () => {
    const step = CHAIN_STEPS[chainStepIndex];
    const done = chainStepIndex >= CHAIN_STEPS.length;
    return (
      <div style={{ marginBottom: 14 }}>
        {/* progress */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          {CHAIN_STEPS.map((s, i) => {
            const picked = chainPath[s.key];
            const active = i === chainStepIndex;
            return (
              <span key={s.key} style={{
                fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px',
                borderRadius: 999,
                background: picked ? '#dcfce7' : active ? '#fef3c7' : 'var(--gray-100)',
                color: picked ? '#15803d' : active ? '#92400e' : 'var(--gray-500)',
              }}>
                {picked ? '✓ ' : ''}{hi ? s.hi : s.label}
              </span>
            );
          })}
        </div>

        {!selectedCity && !coords && (
          <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
            {hi ? 'कृपया पहले शहर चुनें।' : 'Please pick a city first.'}
          </p>
        )}

        {selectedCity && step && step.requiresDept && !selectedDept && (
          <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
            {hi ? 'अब विभाग चुनें।' : 'Now choose the department.'}
          </p>
        )}

        {!done && step && (!step.requiresDept || selectedDept) && (
          <>
            <label style={labelStyle}>
              {hi ? `चरण ${chainStepIndex + 1}: ${step.hi} चुनें`
                  : `Step ${chainStepIndex + 1}: Pick ${step.label}`}
            </label>
            {chainLoading ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Loading…</p>
            ) : chainResults.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                {hi ? 'इस स्तर पर कोई स्टाफ उपलब्ध नहीं मिला।'
                    : 'No staff found at this level.'}
              </p>
            ) : (
              <div style={{ border: '1.5px solid var(--gray-200)',
                borderRadius: 'var(--radius-md)', maxHeight: 260,
                overflowY: 'auto', background: '#fff' }}>
                {chainResults.map(m => renderStaffRow(m, pickChainStep))}
              </div>
            )}
            <button type="button" onClick={resetChain}
              style={{ marginTop: 8, background: 'none', border: 'none',
                color: 'var(--gray-500)', fontSize: '0.78rem', cursor: 'pointer' }}>
              ↺ {hi ? 'चेन रीसेट करें' : 'Reset chain'}
            </button>
          </>
        )}

        {done && (
          <div style={{ padding: '12px', background: '#f0fdf4',
            border: '1.5px solid #bbf7d0', borderRadius: 'var(--radius-md)' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#15803d' }}>
              ✓ {hi ? 'रिपोर्टिंग अधिकारी चुना गया' : 'Reporting officer selected'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#065f46' }}>
              {supervisor?.full_name} {supervisor?.staff_code ? `(${supervisor.staff_code})` : ''}
            </p>
          </div>
        )}
      </div>
    );
  };

  // ---------- shared: registration fields ----------
  const renderRegistrationFields = () => (
    <>
      {/* department vs authority */}
      <div style={{ display: 'flex', background: 'var(--gray-100)',
        padding: 4, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
        {[
          { id: 'department', label: hi ? '🏢 विभाग' : '🏢 Department', icon: Building2 },
          { id: 'authority',  label: hi ? '👑 प्राधिकरण' : '👑 Authority',  icon: Crown },
        ].map(t => {
          const Icon = t.icon;
          const active = registerKind === t.id;
          return (
            <button key={t.id} type="button"
              onClick={() => { setRegisterKind(t.id as RegisterKind);
                setSupervisor(null); resetChain(); setSearchResults([]); }}
              style={{ flex: 1, padding: '9px', border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: active ? '#fff' : 'transparent',
                color: active ? '#15803d' : 'var(--gray-600)',
                fontWeight: active ? 800 : 600, fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: active ? 'var(--shadow-sm)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* city + demo buttons + geo */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>🏙️ {hi ? 'शहर चुनें *' : 'Select City *'}</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <MapPin size={15} style={{ position: 'absolute', left: 13, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
            <select value={selectedCity} onChange={e => {
              setSelectedCity(e.target.value);
              resetChain();
            }} required
              style={{ ...selectStyle, color: selectedCity ? 'var(--gray-900)' : 'var(--gray-400)' }}>
              <option value="" disabled>{hi ? '— शहर चुनें —' : '— Select City —'}</option>
              {cities.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.state ? `, ${c.state}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
          </div>
          <button type="button" onClick={detectLocation} disabled={geoLoading}
            title={hi ? 'मेरी लोकेशन' : 'Use my location'}
            style={{ padding: '0 14px', border: '1.5px solid var(--green-200)',
              borderRadius: 'var(--radius-md)', background: '#f0fdf4',
              color: '#15803d', cursor: geoLoading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontWeight: 700, fontSize: '0.78rem' }}>
            <Crosshair size={14} />
            {geoLoading ? '...' : (hi ? 'लोकेशन' : 'Locate')}
          </button>
        </div>
        {/* demo cities quick-pick */}
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {cities.filter(c => /betul|chhindwara/i.test(c.name)).map(c => (
            <button key={c.id} type="button"
              onClick={() => { setSelectedCity(c.id); resetChain(); }}
              style={{ fontSize: '0.68rem', padding: '3px 9px', borderRadius: 999,
                background: selectedCity === c.id ? '#dcfce7' : 'var(--gray-100)',
                color: selectedCity === c.id ? '#15803d' : 'var(--gray-600)',
                border: 'none', cursor: 'pointer', fontWeight: 700 }}>
              {c.name}
            </button>
          ))}
        </div>
        {coords && (
          <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'var(--gray-500)' }}>
            📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </p>
        )}
      </div>

      {/* discovery tabs (department only) */}
      {registerKind === 'department' && (
        <div style={{ display: 'flex', background: 'var(--gray-100)',
          padding: 4, borderRadius: 'var(--radius-md)', marginBottom: 14 }}>
          {[
            { id: 'search', label: hi ? '🔍 आईडी से' : '🔍 By ID' },
            { id: 'chain',  label: hi ? '🪜 चेन' : '🪜 Walk chain' },
            { id: 'custom', label: hi ? '✍️ नया विभाग' : '✍️ Custom dept' },
          ].map(t => (
            <button key={t.id} type="button"
              onClick={() => { setDiscovery(t.id as Discovery); resetChain(); setSearchResults([]); }}
              style={{ flex: 1, padding: '7px', border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: discovery === t.id ? '#fff' : 'transparent',
                color: discovery === t.id ? '#15803d' : 'var(--gray-600)',
                fontWeight: discovery === t.id ? 800 : 600,
                fontSize: '0.72rem', cursor: 'pointer',
                boxShadow: discovery === t.id ? 'var(--shadow-sm)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* DEPARTMENT BRANCH */}
      {registerKind === 'department' && (
        <>
          {/* department selector — always visible in custom + chain + search */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>🏢 {hi ? 'विभाग चुनें *' : 'Select Department *'}</label>
            <div style={{ position: 'relative' }}>
              <Building2 size={15} style={{ position: 'absolute', left: 13, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
              <select value={selectedDept} onChange={e => {
                setSelectedDept(e.target.value); resetChain();
              }} required
                style={{ ...selectStyle, color: selectedDept ? 'var(--gray-900)' : 'var(--gray-400)' }}>
                <option value="" disabled>{hi ? '— विभाग चुनें —' : '— Select Department —'}</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* custom dept creation */}
          {discovery === 'custom' && (
            <div style={{ marginBottom: 14, padding: 12,
              background: 'var(--gray-50, #f9fafb)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--gray-300)' }}>
              <label style={labelStyle}>
                <Wand2 size={13} style={{ verticalAlign: -2 }} />{' '}
                {hi ? 'नया विभाग बनाएं' : 'Create a new department'}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="text"
                  placeholder={hi ? 'विभाग का नाम' : 'Department name'}
                  value={customDeptName}
                  onChange={e => setCustomDeptName(e.target.value)}
                  style={{ flex: 1, padding: '10px 12px',
                    border: '1.5px solid var(--gray-200)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.88rem', outline: 'none' }} />
                <button type="button" onClick={createCustomDept}
                  disabled={customDeptLoading}
                  style={{ padding: '0 14px', border: 'none',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg,#15803d,#16a34a)',
                    color: '#fff', fontWeight: 800, fontSize: '0.8rem',
                    cursor: customDeptLoading ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={13} />
                  {customDeptLoading ? '…' : (hi ? 'बनाएं' : 'Create')}
                </button>
              </div>
            </div>
          )}

          {/* designation picker */}
          {selectedDept && designations.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>🎯 {hi ? 'अपना पद चुनें *' : 'Your Designation *'}</label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={15} style={{ position: 'absolute', left: 13, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
                <select value={selectedDesig?.id ?? ''} required
                  onChange={e => {
                    const d = designations.find(x => x.id === e.target.value);
                    setSelectedDesig(d ?? null);
                    if (d?.tier === 1) setSupervisor(null);
                  }}
                  style={{ ...selectStyle,
                    color: selectedDesig ? 'var(--gray-900)' : 'var(--gray-400)' }}>
                  <option value="" disabled>{hi ? '— पद चुनें —' : '— Select Designation —'}</option>
                  {designations.map(d => (
                    <option key={d.id} value={d.id}>
                      {TIER_LABELS[d.tier]} — {hi && d.name_hi ? d.name_hi : d.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
              </div>
              {selectedDesig?.scope_description && (
                <p style={{ margin: '6px 0 0', fontSize: '0.72rem',
                  color: 'var(--gray-500)', fontStyle: 'italic' }}>
                  {selectedDesig.scope_description}
                </p>
              )}
            </div>
          )}

          {/* discovery-specific UI */}
          {selectedDesig && selectedDesig.tier !== 1 && (
            discovery === 'search' ? renderReportingSearch() :
            discovery === 'chain'  ? renderChainWalker()   :
            /* custom */             renderReportingSearch()
          )}
        </>
      )}

      {/* AUTHORITY BRANCH */}
      {registerKind === 'authority' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>👑 {hi ? 'भूमिका चुनें *' : 'Select Authority Role *'}</label>
            <div style={{ position: 'relative' }}>
              <Crown size={15} style={{ position: 'absolute', left: 13, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
              <select value={selectedAuthority?.code ?? ''} required
                onChange={e => {
                  const r = authorityRoles.find(x => x.code === e.target.value);
                  setSelectedAuthority(r ?? null); setSupervisor(null);
                }}
                style={{ ...selectStyle,
                  color: selectedAuthority ? 'var(--gray-900)' : 'var(--gray-400)' }}>
                <option value="" disabled>{hi ? '— भूमिका चुनें —' : '— Select Role —'}</option>
                {authorityRoles.map(r => (
                  <option key={r.code} value={r.code}>
                    {hi && r.name_hi ? r.name_hi : r.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
            </div>
            {selectedAuthority?.description && (
              <p style={{ margin: '6px 0 0', fontSize: '0.72rem',
                color: 'var(--gray-500)', fontStyle: 'italic' }}>
                {selectedAuthority.description}
              </p>
            )}
          </div>

          {selectedAuthority && !['platform_admin','mayor'].includes(selectedAuthority.code)
            && renderReportingSearch()}
        </>
      )}

      <FormInput icon={User} placeholder={hi ? 'पूरा नाम' : 'Full Name'}
        value={fullName} onChange={e => setFullName(e.target.value)} />
      <FormInput icon={Phone} placeholder={hi ? 'मोबाइल नंबर' : 'Mobile Number'}
        value={phone} onChange={e => setPhone(e.target.value)} />
    </>
  );

  // ---------- upgrade view ----------
  if (mode === 'upgrade' && user) {
    return (
      <div style={{ minHeight: '100vh',
        background: 'linear-gradient(135deg,#0f4c2a 0%,#16a34a 50%,#4ade80 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 480, background: '#fff',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#15803d,#16a34a)',
            padding: '26px 28px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px' }}><ArrowUpCircle size={28} color="#fff" /></div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>
              {hi ? 'स्टाफ के रूप में जुड़ें' : 'Join as Staff'}</h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.85)' }}>{user.email}</p>
          </div>
          <form onSubmit={handleUpgradeExisting} style={{ padding: '24px' }}>
            <AlertBanner type="error" message={error} />
            {renderRegistrationFields()}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '13px', border: 'none',
                borderRadius: 'var(--radius-md)',
                background: loading ? 'var(--gray-300)' : 'linear-gradient(135deg,#15803d,#16a34a)',
                color: '#fff', fontWeight: 800, fontSize: '0.95rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 14px rgba(22,163,74,0.35)' }}>
              {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : (
                <><ShieldCheck size={16} /> {hi ? 'आवेदन जमा करें' : 'Submit Application'}</>
              )}
            </button>
            <button type="button" onClick={handleSignOutUser}
              style={{ width: '100%', marginTop: 14, padding: '10px', border: 'none',
                background: 'none', color: 'var(--gray-500)', fontSize: '0.82rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 6 }}>
              <LogOut size={13} /> {hi ? 'दूसरे खाते से लॉगिन' : 'Use a different account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---------- main login / register ----------
  return (
    <div style={{ minHeight: '100vh',
      background: 'linear-gradient(135deg,#0f4c2a 0%,#16a34a 50%,#4ade80 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#fff',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg,#15803d,#16a34a)',
          padding: '28px 32px', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px' }}><Building2 size={28} color="#fff" /></div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>
            {hi ? 'विभाग पोर्टल' : 'Department Portal'}</h1>
          <p style={{ margin: '6px 0 0', fontSize: '0.82rem',
            color: 'rgba(255,255,255,0.85)' }}>
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
              style={{ flex: 1, padding: '13px', border: 'none', background: 'none',
                fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                color: mode === tab.id ? 'var(--green-700)' : 'var(--gray-400)',
                borderBottom: mode === tab.id ? '2.5px solid var(--green-600)'
                                              : '2.5px solid transparent',
                transition: 'all 0.2s', marginBottom: -2 }}>
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
                style={{ width: '100%', padding: '13px', border: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: loading ? 'var(--gray-300)' : 'linear-gradient(135deg,#15803d,#16a34a)',
                  color: '#fff', fontWeight: 800, fontSize: '0.95rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: loading ? 'none' : '0 4px 14px rgba(22,163,74,0.35)' }}>
                {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : (
                  <><LogIn size={16} /> {hi ? 'लॉगिन करें' : 'Login to Department'}</>
                )}
              </button>
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button type="button"
                  onClick={() => { setMode('register'); setError(''); }}
                  style={{ background: 'none', border: 'none', color: '#15803d',
                    fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                  {hi ? 'नागरिक खाता है? स्टाफ में अपग्रेड करें →'
                      : 'Have a citizen account? Join as Staff →'}
                </button>
              </div>
            </form>
          )}

          {mode === 'register' && (
            <div>
              <div style={{ display: 'flex', background: 'var(--gray-100)',
                padding: 4, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                {[
                  { id: 'existing', label: hi ? '👤 मौजूदा खाता' : '👤 Existing Account' },
                  { id: 'new',      label: hi ? '✨ नया खाता' : '✨ New Account' },
                ].map(t => (
                  <button key={t.id} type="button"
                    onClick={() => { setRegisterType(t.id as 'existing' | 'new'); setError(''); }}
                    style={{ flex: 1, padding: '8px', border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      background: registerType === t.id ? '#fff' : 'transparent',
                      color: registerType === t.id ? '#15803d' : 'var(--gray-600)',
                      fontWeight: registerType === t.id ? 800 : 600,
                      fontSize: '0.8rem', cursor: 'pointer',
                      boxShadow: registerType === t.id ? 'var(--shadow-sm)' : 'none' }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                padding: '10px 12px', background: 'var(--green-50)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--green-200)' }}>
                <AlertCircle size={15} color="var(--green-700)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--green-900)',
                  fontWeight: 600, lineHeight: 1.4 }}>
                  {registerType === 'existing'
                    ? (hi ? 'आपका खाता वैसा ही रहेगा, सिर्फ स्टाफ रोल जुड़ेगा।'
                          : 'Your account stays the same. We just add the staff role.')
                    : (hi ? 'नए स्टाफ खाते के लिए पंजीकरण।'
                          : 'Register a new staff account.')}
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
                  style={{ width: '100%', padding: '13px', border: 'none',
                    borderRadius: 'var(--radius-md)',
                    background: loading ? 'var(--gray-300)'
                                        : 'linear-gradient(135deg,#15803d,#16a34a)',
                    color: '#fff', fontWeight: 800, fontSize: '0.95rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: loading ? 'none' : '0 4px 14px rgba(22,163,74,0.35)' }}>
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
            style={{ width: '100%', marginTop: 14, padding: '8px', border: 'none',
              background: 'none', color: 'var(--gray-400)', fontSize: '0.82rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 5 }}>
            <ArrowRight size={13} style={{ transform: 'rotate(180deg)' }} />
            {hi ? 'होम पर वापस जाएं' : 'Back to Home'}
          </button>
        </div>
      </div>
    </div>
  );
}
