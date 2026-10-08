import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2, Mail, LogIn, ShieldCheck, ArrowRight, User, Phone,
  ChevronDown, ChevronLeft, Clock, CheckCircle, LogOut, Search,
  MapPin, X, BadgeCheck, AlertCircle, Briefcase, Crosshair, Crown,
  Plus, Wand2,
} from 'lucide-react';

import { FormInput } from '../components/auth/FormInput';
import { PasswordInput } from '../components/auth/PasswordInput';
import { AlertBanner } from '../components/auth/AlertBanner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Department { id: string; name: string; slug: string; icon: string; }
interface City { id: string; name: string; state: string | null; district: string | null; slug: string | null; }
interface Designation {
  designation_id: string;
  tier: number;
  name: string;
  name_hi: string | null;
  hierarchy_code: string | null;
  maps_to_role: string;
  scope_description: string | null;
}
interface AuthorityRole {
  code: string; name: string; name_hi: string | null; rank: number;
  parent_code: string | null; scope_level: string; maps_to_role: string;
  can_approve: boolean; can_view_all: boolean; description: string | null;
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

type Stage =
  | 'account' | 'type' | 'city' | 'dept' | 'designation'
  | 'authority' | 'officer' | 'details' | 'pending';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const PRIORITY_CITIES = ['betul', 'chhindwara', 'bhopal', 'indore'];

const TIER_LABELS: Record<number, string> = {
  1: 'Head Officer / Department Head',
  2: 'Area / Zone Officer',
  3: 'Supervisor',
  4: 'Operational Staff',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function DeptLogin() {
  const { user, profile, refreshProfile, signOut, language: rawLang } = useAuth();
  const navigate = useNavigate();
  const hi = rawLang === 'hi';

  /* ---------- stage ---------- */
  const [stage, setStage] = useState<Stage>('account');

  /* ---------- account ---------- */
  const [accountType, setAccountType] = useState<'existing' | 'new'>('existing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  /* ---------- type ---------- */
  const [regType, setRegType] = useState<'department' | 'authority'>('department');

  /* ---------- department path ---------- */
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDesig, setSelectedDesig] = useState<Designation | null>(null);

  /* ---------- authority path ---------- */
  const [selectedAuthority, setSelectedAuthority] = useState<AuthorityRole | null>(null);

  /* ---------- officer ---------- */
  const [officerMode, setOfficerMode] = useState<'id' | 'chain'>('id');
  const [supervisor, setSupervisor] = useState<StaffMatch | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<StaffMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [chainPath, setChainPath] = useState<Record<string, StaffMatch>>({});
  const [chainResults, setChainResults] = useState<StaffMatch[]>([]);
  const [chainIdx, setChainIdx] = useState(0);
  const [chainLoading, setChainLoading] = useState(false);

  /* ---------- details ---------- */
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  /* ---------- data ---------- */
  const [cities, setCities] = useState<City[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [authorityRoles, setAuthorityRoles] = useState<AuthorityRole[]>([]);

  /* ---------- ui ---------- */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  /* ---------- custom dept ---------- */
  const [showCustomDept, setShowCustomDept] = useState(false);
  const [customDeptName, setCustomDeptName] = useState('');
  const [customDeptLoading, setCustomDeptLoading] = useState(false);

  /* ================================================================ */
  /*  Effects                                                          */
  /* ================================================================ */
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

  /* redirect if already staff / pending */
  useEffect(() => {
    if (!user || !profile) return;
    const staffRoles = [
      'dept_staff', 'admin', 'department_head', 'supervisor', 'control_room',
      'management_viewer', 'field_employee', 'municipal_administrator',
    ];
    if (staffRoles.includes(profile.role)) {
      navigate('/dept/dashboard', { replace: true });
    } else if (profile.role === 'pending_staff') {
      setStage('pending');
    }
  }, [user, profile, navigate]);

  /* load designations when department changes */
  useEffect(() => {
    if (!selectedDept) {
      setDesignations([]);
      setSelectedDesig(null);
      return;
    }
    supabase.rpc('list_chain_for_dept', { p_dept_id: selectedDept })
      .then(({ data, error: rpcErr }) => {
        if (rpcErr) { setError(rpcErr.message); return; }
        setDesignations((data ?? []) as Designation[]);
        setSelectedDesig(null);
      });
  }, [selectedDept]);

  /* chain step loader */
  useEffect(() => {
    if (stage !== 'officer' || officerMode !== 'chain') return;
    if (regType !== 'department') return;
    loadChainStep(chainIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, officerMode, chainIdx, selectedCity, selectedDept]);

  /* ================================================================ */
  /*  Derived                                                          */
  /* ================================================================ */
  const isLoggedIn = !!user;

  const sortedCities = [...cities].sort((a, b) => {
    const ai = PRIORITY_CITIES.indexOf(a.name.toLowerCase());
    const bi = PRIORITY_CITIES.indexOf(b.name.toLowerCase());
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.name.localeCompare(b.name);
  });

  /* designations above the user's tier (used for chain walk) */
  const chainSteps = selectedDesig
    ? designations
        .filter(d => d.tier < selectedDesig.tier)
        .sort((a, b) => a.tier - b.tier)
    : [];

  const needsOfficer = (() => {
    if (regType === 'authority') {
      return selectedAuthority
        ? !['platform_admin', 'mayor'].includes(selectedAuthority.code)
        : true;
    }
    return selectedDesig ? selectedDesig.tier !== 1 : true;
  })();

  /* ================================================================ */
  /*  Handlers                                                         */
  /* ================================================================ */
  const goBack = () => {
    setError('');
    if (stage === 'type') setStage('account');
    else if (stage === 'city') setStage('type');
    else if (stage === 'dept') { setStage('city'); setSelectedDept(''); setSelectedDesig(null); }
    else if (stage === 'designation') { setStage('dept'); setSelectedDesig(null); }
    else if (stage === 'authority') { setStage('city'); setSelectedAuthority(null); }
    else if (stage === 'officer') {
      setStage(regType === 'department' ? 'designation' : 'authority');
      setSupervisor(null); resetChain(); setSearchResults([]); setSearchTerm('');
    } else if (stage === 'details') setStage('officer');
  };

  const resetChain = () => {
    setChainPath({}); setChainIdx(0); setChainResults([]);
  };

  /* ---------- geolocation ---------- */
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

  /* ---------- officer search by ID ---------- */
  const runSearch = async () => {
    if (!searchTerm.trim() && !selectedCity && !selectedDept) {
      setError(hi ? 'कृपया खोज शब्द दर्ज करें' : 'Enter a search term');
      return;
    }
    setSearching(true); setError('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('search_approvers_for_signup', {
        p_search:        searchTerm.trim() || null,
        p_city_id:       selectedCity || null,
        p_department_id: regType === 'department' ? (selectedDept || null) : null,
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

  /* ---------- chain walk ---------- */
  const loadChainStep = async (idx: number) => {
    const step = chainSteps[idx];
    if (!step) { setChainResults([]); return; }
    if (!selectedCity && !coords) { setChainResults([]); return; }

    setChainLoading(true);
    try {
      const parent = idx === 0 ? null : chainPath[chainSteps[idx - 1].hierarchy_code ?? '']?.id ?? null;
      const { data, error: rpcErr } = await supabase.rpc('search_chain_step', {
        p_city_id:        selectedCity || null,
        p_department_id:  selectedDept || null,
        p_parent_id:      parent,
        p_hierarchy_code: step.hierarchy_code,
        p_search:         null,
        p_limit:          50,
      });
      if (rpcErr) throw rpcErr;
      setChainResults((data ?? []) as StaffMatch[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chain step failed');
    } finally { setChainLoading(false); }
  };

  const pickChainPerson = (m: StaffMatch) => {
    const step = chainSteps[chainIdx];
    if (!step) return;
    const key = step.hierarchy_code ?? String(step.tier);
    setChainPath(prev => ({ ...prev, [key]: m }));

    if (chainIdx < chainSteps.length - 1) {
      setChainIdx(i => i + 1);
    } else {
      // last step → this is the reporting officer
      setSupervisor(m);
    }
  };

  /* ---------- custom dept ---------- */
  const createCustomDept = async () => {
    if (customDeptName.trim().length < 3) {
      setError(hi ? 'विभाग का नाम बहुत छोटा है' : 'Department name too short');
      return;
    }
    setCustomDeptLoading(true); setError('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('suggest_department', {
        p_name: customDeptName.trim(), p_icon: '📁',
      });
      if (rpcErr) throw rpcErr;
      const id = (data as any)?.id;
      if (!id) throw new Error('No department id returned');

      const { data: refreshed } = await supabase.from('departments')
        .select('id, name, slug, icon').eq('is_active', true).order('name');
      setDepartments((refreshed ?? []) as Department[]);
      setSelectedDept(id);
      setCustomDeptName('');
      setShowCustomDept(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create department');
    } finally { setCustomDeptLoading(false); }
  };

  /* ---------- stage navigation guards ---------- */
  const goToType = () => {
    if (!isLoggedIn) {
      if (!email.trim()) { setError(hi ? 'ईमेल आवश्यक है' : 'Email is required'); return; }
      if (!password)     { setError(hi ? 'पासवर्ड आवश्यक है' : 'Password is required'); return; }
    }
    setError(''); setStage('type');
  };

  const goToCity = () => { setError(''); setStage('city'); };
  const goToDept = () => {
    if (!selectedCity) { setError(hi ? 'कृपया शहर चुनें' : 'Please select a city'); return; }
    setError(''); setStage(regType === 'department' ? 'dept' : 'authority');
  };
  const goToDesignation = () => {
    if (!selectedDept) { setError(hi ? 'कृपया विभाग चुनें' : 'Please select a department'); return; }
    setError(''); setStage('designation');
  };
  const goToOfficerFromDesig = () => {
    if (!selectedDesig) { setError(hi ? 'कृपया पद चुनें' : 'Please select a designation'); return; }
    setError('');
    if (!needsOfficer) { setStage('details'); return; }
    setStage('officer');
  };
  const goToOfficerFromAuthority = () => {
    if (!selectedAuthority) { setError(hi ? 'कृपया भूमिका चुनें' : 'Please select a role'); return; }
    setError('');
    if (!needsOfficer) { setStage('details'); return; }
    setStage('officer');
  };
  const goToDetails = () => {
    if (needsOfficer && !supervisor) {
      setError(hi ? 'कृपया रिपोर्टिंग अधिकारी चुनें' : 'Please select a reporting officer');
      return;
    }
    setError(''); setStage('details');
  };

  /* ---------- submit ---------- */
  const handleSubmit = async () => {
    setError('');
    if (!fullName.trim()) { setError(hi ? 'कृपया पूरा नाम भरें' : 'Please enter your full name'); return; }

    setLoading(true);
    try {
      let userId = user?.id;
      let userEmail = user?.email || email.trim().toLowerCase();

      /* sign up / sign in if not logged in */
      if (!userId) {
        if (accountType === 'new') {
          const { data, error: signErr } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(), password,
          });
          if (signErr) {
            if (/already registered|already exists/i.test(signErr.message)) {
              setAccountType('existing');
              throw new Error(hi
                ? 'यह ईमेल पहले से पंजीकृत है। कृपया मौजूदा खाता चुनें।'
                : 'This email is already registered. Please choose Existing Account.');
            }
            throw signErr;
          }
          userId = data.user?.id;
          userEmail = data.user?.email || userEmail;
        } else {
          const { data, error: signErr } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(), password,
          });
          if (signErr) throw signErr;
          userId = data.user.id;
          userEmail = data.user.email || userEmail;
        }
      }
      if (!userId) throw new Error('Could not establish user session');

      /* upsert profile */
      const { error: upsertErr } = await supabase.from('user_profiles').upsert({
        id: userId,
        email: userEmail,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        role: 'pending_staff',
        city_id: selectedCity || null,
        supervisor_id: supervisor?.id || null,
        linked_department_id: regType === 'department' ? selectedDept : null,
        designation_id: regType === 'department' ? (selectedDesig?.designation_id ?? null) : null,
        latitude:  coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        approval_status: 'pending',
      });
      if (upsertErr) throw upsertErr;

      /* call the appropriate RPC */
      if (regType === 'department') {
        const { error: rpcErr } = await supabase.rpc('register_as_staff', {
          target_role:    selectedDesig!.maps_to_role,
          department_id:  selectedDept,
          city_id:        selectedCity,
          supervisor_id:  supervisor?.id || null,
          full_name:      fullName.trim() || null,
          phone:          phone.trim() || null,
          designation_id: selectedDesig!.designation_id,
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
      setStage('pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally { setLoading(false); }
  };

  const handleSignOutUser = async () => {
    await signOut();
    setStage('account');
    setAccountType('existing');
    setEmail(''); setPassword(''); setFullName(''); setPhone('');
    setSelectedCity(''); setSelectedDept(''); setSelectedDesig(null);
    setSelectedAuthority(null); setSupervisor(null); resetChain();
    setSearchResults([]); setSearchTerm(''); setError('');
  };

  /* ================================================================ */
  /*  Styles                                                           */
  /* ================================================================ */
  const S = {
    label: {
      display: 'block', fontWeight: 700, fontSize: '0.82rem',
      marginBottom: 6, color: 'var(--gray-700)',
    } as React.CSSProperties,
    select: {
      width: '100%', padding: '11px 36px 11px 40px',
      border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
      fontSize: '0.9rem', background: '#fff', outline: 'none',
      boxSizing: 'border-box', appearance: 'none', cursor: 'pointer',
    } as React.CSSProperties,
    input: {
      width: '100%', padding: '11px 14px 11px 40px',
      border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
      fontSize: '0.9rem', background: '#fff', outline: 'none',
      boxSizing: 'border-box',
    } as React.CSSProperties,
    btnPrimary: {
      width: '100%', padding: '13px', border: 'none',
      borderRadius: 'var(--radius-md)',
      background: 'linear-gradient(135deg,#15803d,#16a34a)',
      color: '#fff', fontWeight: 800, fontSize: '0.95rem',
      cursor: 'pointer', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 8,
      boxShadow: '0 4px 14px rgba(22,163,74,0.35)',
    } as React.CSSProperties,
    btnSecondary: {
      padding: '11px 16px', border: '1.5px solid var(--gray-200)',
      borderRadius: 'var(--radius-md)', background: '#fff',
      color: 'var(--gray-700)', fontWeight: 700, fontSize: '0.85rem',
      cursor: 'pointer', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 6,
    } as React.CSSProperties,
    toggleRow: {
      display: 'flex', background: 'var(--gray-100)',
      padding: 4, borderRadius: 'var(--radius-md)', marginBottom: 16,
    } as React.CSSProperties,
    toggleBtn: (active: boolean) => ({
      flex: 1, padding: '10px', border: 'none',
      borderRadius: 'var(--radius-sm)',
      background: active ? '#fff' : 'transparent',
      color: active ? '#15803d' : 'var(--gray-600)',
      fontWeight: active ? 800 : 600, fontSize: '0.82rem',
      cursor: 'pointer',
      boxShadow: active ? 'var(--shadow-sm)' : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    }) as React.CSSProperties,
    card: {
      padding: '10px 12px', border: '1px solid var(--gray-100)',
      background: '#fff', cursor: 'pointer', textAlign: 'left' as const,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      width: '100%',
    } as React.CSSProperties,
  };

  /* ================================================================ */
  /*  Render helpers                                                   */
  /* ================================================================ */
  const StageHeader = ({ step, total, title, subtitle }: {
    step: number; total: number; title: string; subtitle?: string;
  }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i < step ? '#16a34a' : 'var(--gray-200)',
          }} />
        ))}
      </div>
      <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--gray-900)' }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--gray-500)' }}>
          {subtitle}
        </p>
      )}
    </div>
  );

  const StaffRow = ({ m, onClick }: { m: StaffMatch; onClick: (m: StaffMatch) => void }) => (
    <button type="button" onClick={() => onClick(m)} style={S.card}>
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

  const NavButtons = ({ onBack, onNext, nextLabel, nextDisabled }: {
    onBack?: () => void; onNext: () => void;
    nextLabel?: string; nextDisabled?: boolean;
  }) => (
    <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
      {onBack && (
        <button type="button" onClick={onBack} style={S.btnSecondary}>
          <ChevronLeft size={15} /> {hi ? 'पीछे' : 'Back'}
        </button>
      )}
      <button type="button" onClick={onNext} disabled={nextDisabled}
        style={{
          ...S.btnPrimary, flex: 1,
          opacity: nextDisabled ? 0.5 : 1,
          cursor: nextDisabled ? 'not-allowed' : 'pointer',
        }}>
        {nextLabel || (hi ? 'आगे बढ़ें' : 'Continue')} <ArrowRight size={15} />
      </button>
    </div>
  );

  /* ================================================================ */
  /*  PENDING screen                                                   */
  /* ================================================================ */
  if (stage === 'pending') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg,#0f4c2a 0%,#16a34a 50%,#4ade80 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{
          maxWidth: 440, width: '100%', background: '#fff',
          borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          padding: 36, textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: '#fef3c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Clock size={32} color="#d97706" />
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: '1.25rem', fontWeight: 900 }}>
            {hi ? 'अनुमोदन की प्रतीक्षा' : 'Awaiting Approval'}
          </h2>
          <p style={{
            margin: '0 0 20px', fontSize: '0.88rem',
            color: 'var(--gray-600)', lineHeight: 1.7,
          }}>
            {hi ? 'आपका आवेदन आपके सीनियर अधिकारी तक भेज दिया गया है।'
                : 'Your application has been forwarded to your senior officer.'}
          </p>

          <div style={{
            padding: '14px 18px', background: '#f0fdf4',
            borderRadius: 'var(--radius-md)', border: '1.5px solid #bbf7d0',
            marginBottom: 22, textAlign: 'left',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <CheckCircle size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '0.85rem', color: '#15803d' }}>
                  {hi ? 'आवेदन सारांश' : 'Application Summary'}
                </p>
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

          <button onClick={() => navigate('/')} style={S.btnPrimary}>
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

  /* ================================================================ */
  /*  MAIN WIZARD                                                      */
  /* ================================================================ */
  const totalSteps = regType === 'department' ? 7 : 6;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#0f4c2a 0%,#16a34a 50%,#4ade80 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 500, background: '#fff',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        {/* header */}
        <div style={{
          background: 'linear-gradient(135deg,#15803d,#16a34a)',
          padding: '22px 26px', textAlign: 'center',
        }}>
          <div style={{
            width: 50, height: 50, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 10px',
          }}>
            <Building2 size={24} color="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#fff' }}>
            {hi ? 'स्टाफ के रूप में जुड़ें' : 'Join as Staff'}
          </h1>
          {isLoggedIn && (
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>
              {user?.email}
            </p>
          )}
        </div>

        {/* body */}
        <div style={{ padding: '24px' }}>
          <AlertBanner type="error" message={error} />

          {/* ============ STAGE: ACCOUNT ============ */}
          {stage === 'account' && (
            <>
              <StageHeader step={1} total={totalSteps}
                title={hi ? 'खाता प्रकार चुनें' : 'Choose account type'}
                subtitle={hi ? 'क्या आपके पास पहले से खाता है?' : 'Do you already have an account?'} />

              {!isLoggedIn && (
                <>
                  <div style={S.toggleRow}>
                    <button type="button" onClick={() => setAccountType('existing')}
                      style={S.toggleBtn(accountType === 'existing')}>
                      <User size={14} /> {hi ? 'मौजूदा खाता' : 'Existing Account'}
                    </button>
                    <button type="button" onClick={() => setAccountType('new')}
                      style={S.toggleBtn(accountType === 'new')}>
                      <Plus size={14} /> {hi ? 'नया खाता' : 'New Account'}
                    </button>
                  </div>

                  <FormInput icon={Mail} type="email"
                    placeholder={hi ? 'ईमेल पता *' : 'Email Address *'}
                    value={email} onChange={e => setEmail(e.target.value)} />
                  <PasswordInput
                    placeholder={hi ? 'पासवर्ड *' : 'Password *'}
                    value={password} onChange={e => setPassword(e.target.value)} />
                </>
              )}

              {isLoggedIn && (
                <div style={{
                  padding: '12px 14px', background: '#f0fdf4',
                  borderRadius: 'var(--radius-md)', border: '1.5px solid #bbf7d0',
                  marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <BadgeCheck size={18} color="#16a34a" />
                  <span style={{ fontSize: '0.82rem', color: '#065f46', fontWeight: 600 }}>
                    {hi ? 'आप पहले से लॉग इन हैं — खाता अपग्रेड होगा।'
                        : 'You are logged in — this will upgrade your account.'}
                  </span>
                </div>
              )}

              <NavButtons onNext={goToType} />
            </>
          )}

          {/* ============ STAGE: TYPE ============ */}
          {stage === 'type' && (
            <>
              <StageHeader step={2} total={totalSteps}
                title={hi ? 'पंजीकरण प्रकार' : 'Registration type'}
                subtitle={hi ? 'आप किस रूप में जुड़ना चाहते हैं?' : 'How do you want to join?'} />

              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <button type="button" onClick={() => setRegType('department')}
                  style={{
                    flex: 1, padding: '20px 12px', border: regType === 'department'
                      ? '2px solid #16a34a' : '1.5px solid var(--gray-200)',
                    borderRadius: 'var(--radius-md)',
                    background: regType === 'department' ? '#f0fdf4' : '#fff',
                    cursor: 'pointer', textAlign: 'center',
                  }}>
                  <Building2 size={24} color={regType === 'department' ? '#16a34a' : '#9ca3af'}
                    style={{ margin: '0 auto 8px' }} />
                  <p style={{
                    margin: 0, fontWeight: 800, fontSize: '0.88rem',
                    color: regType === 'department' ? '#15803d' : 'var(--gray-700)',
                  }}>
                    {hi ? 'विभाग' : 'Department'}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                    {hi ? 'फील्ड स्टाफ, सुपरवाइज़र' : 'Field staff, supervisor'}
                  </p>
                </button>

                <button type="button" onClick={() => setRegType('authority')}
                  style={{
                    flex: 1, padding: '20px 12px', border: regType === 'authority'
                      ? '2px solid #16a34a' : '1.5px solid var(--gray-200)',
                    borderRadius: 'var(--radius-md)',
                    background: regType === 'authority' ? '#f0fdf4' : '#fff',
                    cursor: 'pointer', textAlign: 'center',
                  }}>
                  <Crown size={24} color={regType === 'authority' ? '#16a34a' : '#9ca3af'}
                    style={{ margin: '0 auto 8px' }} />
                  <p style={{
                    margin: 0, fontWeight: 800, fontSize: '0.88rem',
                    color: regType === 'authority' ? '#15803d' : 'var(--gray-700)',
                  }}>
                    {hi ? 'प्राधिकरण' : 'Authority'}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                    {hi ? 'आयुक्त, महापौर, प्रशासक' : 'Commissioner, Mayor, Admin'}
                  </p>
                </button>
              </div>

              <NavButtons onBack={goBack} onNext={goToCity} />
            </>
          )}

          {/* ============ STAGE: CITY ============ */}
          {stage === 'city' && (
            <>
              <StageHeader step={3} total={totalSteps}
                title={hi ? 'शहर चुनें' : 'Select city'}
                subtitle={hi ? 'अपना शहर चुनें या लोकेशन का उपयोग करें'
                            : 'Pick your city or use your location'} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {sortedCities.filter(c =>
                  PRIORITY_CITIES.includes(c.name.toLowerCase())
                ).map(c => (
                  <button key={c.id} type="button" onClick={() => setSelectedCity(c.id)}
                    style={{
                      padding: '14px 12px', border: selectedCity === c.id
                        ? '2px solid #16a34a' : '1.5px solid var(--gray-200)',
                      borderRadius: 'var(--radius-md)',
                      background: selectedCity === c.id ? '#f0fdf4' : '#fff',
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MapPin size={16} color={selectedCity === c.id ? '#16a34a' : '#9ca3af'} />
                      <div>
                        <p style={{
                          margin: 0, fontWeight: 800, fontSize: '0.88rem',
                          color: selectedCity === c.id ? '#15803d' : 'var(--gray-800)',
                        }}>{c.name}</p>
                        {c.state && (
                          <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--gray-500)' }}>
                            {c.state}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* other cities dropdown if needed */}
              {sortedCities.filter(c => !PRIORITY_CITIES.includes(c.name.toLowerCase())).length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={S.label}>{hi ? 'अन्य शहर' : 'Other cities'}</label>
                  <div style={{ position: 'relative' }}>
                    <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}
                      style={{
                        ...S.select,
                        color: selectedCity ? 'var(--gray-900)' : 'var(--gray-400)',
                      }}>
                      <option value="">{hi ? '— चुनें —' : '— Select —'}</option>
                      {sortedCities.filter(c =>
                        !PRIORITY_CITIES.includes(c.name.toLowerCase())
                      ).map(c => (
                        <option key={c.id} value={c.id}>{c.name}, {c.state}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} style={{
                      position: 'absolute', right: 12, top: '50%',
                      transform: 'translateY(-50%)', color: 'var(--gray-400)',
                      pointerEvents: 'none',
                    }} />
                  </div>
                </div>
              )}

              <button type="button" onClick={detectLocation} disabled={geoLoading}
                style={{
                  width: '100%', padding: '11px', border: '1.5px dashed var(--green-300)',
                  borderRadius: 'var(--radius-md)', background: '#f0fdf4',
                  color: '#15803d', fontWeight: 700, fontSize: '0.82rem',
                  cursor: geoLoading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                <Crosshair size={15} />
                {geoLoading ? (hi ? 'लोकेट कर रहे हैं…' : 'Locating…')
                             : (hi ? 'मेरी लोकेशन का उपयोग करें' : 'Use my location')}
              </button>

              {coords && (
                <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: 'var(--gray-500)', textAlign: 'center' }}>
                  📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </p>
              )}

              <NavButtons onBack={goBack} onNext={goToDept} />
            </>
          )}

          {/* ============ STAGE: DEPARTMENT ============ */}
          {stage === 'dept' && regType === 'department' && (
            <>
              <StageHeader step={4} total={totalSteps}
                title={hi ? 'विभाग चुनें' : 'Select department'}
                subtitle={hi ? 'आप किस विभाग में काम करते हैं?'
                            : 'Which department do you work in?'} />

              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Building2 size={15} style={{
                  position: 'absolute', left: 13, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--gray-400)',
                  pointerEvents: 'none',
                }} />
                <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
                  style={{
                    ...S.select,
                    color: selectedDept ? 'var(--gray-900)' : 'var(--gray-400)',
                  }}>
                  <option value="">{hi ? '— विभाग चुनें —' : '— Select Department —'}</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--gray-400)',
                  pointerEvents: 'none',
                }} />
              </div>

              <button type="button" onClick={() => setShowCustomDept(v => !v)}
                style={{
                  background: 'none', border: 'none', color: '#15803d',
                  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4, padding: 0,
                }}>
                <Wand2 size={13} /> {hi ? 'नया विभाग बनाएं' : 'Create new department'}
              </button>

              {showCustomDept && (
                <div style={{
                  marginTop: 12, padding: 12, background: '#f9fafb',
                  borderRadius: 'var(--radius-md)', border: '1px dashed var(--gray-300)',
                }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="text"
                      placeholder={hi ? 'विभाग का नाम' : 'Department name'}
                      value={customDeptName}
                      onChange={e => setCustomDeptName(e.target.value)}
                      style={{
                        flex: 1, padding: '10px 12px',
                        border: '1.5px solid var(--gray-200)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.88rem', outline: 'none',
                      }} />
                    <button type="button" onClick={createCustomDept}
                      disabled={customDeptLoading}
                      style={{
                        padding: '0 14px', border: 'none',
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg,#15803d,#16a34a)',
                        color: '#fff', fontWeight: 800, fontSize: '0.8rem',
                        cursor: customDeptLoading ? 'wait' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                      <Plus size={13} />
                      {customDeptLoading ? '…' : (hi ? 'बनाएं' : 'Create')}
                    </button>
                  </div>
                </div>
              )}

              <NavButtons onBack={goBack} onNext={goToDesignation} />
            </>
          )}

          {/* ============ STAGE: DESIGNATION ============ */}
          {stage === 'designation' && regType === 'department' && (
            <>
              <StageHeader step={5} total={totalSteps}
                title={hi ? 'अपना पद चुनें' : 'Select your designation'}
                subtitle={hi ? 'विभाग की भूमिका श्रृंखला में अपना स्थान चुनें'
                            : 'Pick your level in the department chain'} />

              {designations.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                  {hi ? 'इस विभाग में कोई पद उपलब्ध नहीं है।'
                      : 'No designations available for this department.'}
                </p>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  {/* vertical line */}
                  <div style={{
                    position: 'absolute', left: 9, top: 12, bottom: 12,
                    width: 2, background: 'var(--gray-200)',
                  }} />

                  {designations.map((d, i) => {
                    const active = selectedDesig?.designation_id === d.designation_id;
                    return (
                      <button key={d.designation_id} type="button"
                        onClick={() => {
                          setSelectedDesig(d);
                          setSupervisor(null); resetChain();
                        }}
                        style={{
                          position: 'relative', display: 'block', width: '100%',
                          padding: '12px 14px', marginBottom: 8,
                          border: active ? '2px solid #16a34a' : '1.5px solid var(--gray-200)',
                          borderRadius: 'var(--radius-md)',
                          background: active ? '#f0fdf4' : '#fff',
                          cursor: 'pointer', textAlign: 'left',
                        }}>
                        {/* dot */}
                        <div style={{
                          position: 'absolute', left: -20, top: '50%',
                          transform: 'translateY(-50%)',
                          width: 12, height: 12, borderRadius: '50%',
                          background: active ? '#16a34a' : '#d1d5db',
                          border: '2px solid #fff',
                          boxShadow: active ? '0 0 0 2px #bbf7d0' : 'none',
                        }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Briefcase size={15} color={active ? '#16a34a' : '#9ca3af'} />
                          <div>
                            <p style={{
                              margin: 0, fontWeight: 800, fontSize: '0.85rem',
                              color: active ? '#15803d' : 'var(--gray-800)',
                            }}>
                              {i + 1}. {hi && d.name_hi ? d.name_hi : d.name}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--gray-500)' }}>
                              {TIER_LABELS[d.tier] || `Tier ${d.tier}`}
                              {d.maps_to_role ? ` • ${d.maps_to_role}` : ''}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedDesig?.scope_description && (
                <p style={{
                  margin: '8px 0 0', fontSize: '0.75rem',
                  color: 'var(--gray-500)', fontStyle: 'italic',
                }}>
                  {selectedDesig.scope_description}
                </p>
              )}

              <NavButtons onBack={goBack} onNext={goToOfficerFromDesig}
                nextLabel={selectedDesig?.tier === 1
                  ? (hi ? 'विवरण भरें' : 'Enter details')
                  : undefined} />
            </>
          )}

          {/* ============ STAGE: AUTHORITY ============ */}
          {stage === 'authority' && regType === 'authority' && (
            <>
              <StageHeader step={4} total={totalSteps}
                title={hi ? 'भूमिका चुनें' : 'Select authority role'}
                subtitle={hi ? 'आप किस प्राधिकरण भूमिका में जुड़ना चाहते हैं?'
                            : 'Which authority role are you joining as?'} />

              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Crown size={15} style={{
                  position: 'absolute', left: 13, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--gray-400)',
                  pointerEvents: 'none',
                }} />
                <select value={selectedAuthority?.code ?? ''}
                  onChange={e => {
                    const r = authorityRoles.find(x => x.code === e.target.value);
                    setSelectedAuthority(r ?? null);
                    setSupervisor(null);
                  }}
                  style={{
                    ...S.select,
                    color: selectedAuthority ? 'var(--gray-900)' : 'var(--gray-400)',
                  }}>
                  <option value="">{hi ? '— भूमिका चुनें —' : '— Select Role —'}</option>
                  {authorityRoles.map(r => (
                    <option key={r.code} value={r.code}>
                      {hi && r.name_hi ? r.name_hi : r.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--gray-400)',
                  pointerEvents: 'none',
                }} />
              </div>

              {selectedAuthority?.description && (
                <p style={{
                  margin: '0 0 12px', fontSize: '0.75rem',
                  color: 'var(--gray-500)', fontStyle: 'italic',
                }}>
                  {selectedAuthority.description}
                </p>
              )}

              <NavButtons onBack={goBack} onNext={goToOfficerFromAuthority} />
            </>
          )}

          {/* ============ STAGE: OFFICER ============ */}
          {stage === 'officer' && (
            <>
              <StageHeader
                step={regType === 'department' ? 6 : 5}
                total={totalSteps}
                title={hi ? 'रिपोर्टिंग अधिकारी चुनें' : 'Select reporting officer'}
                subtitle={hi ? 'जिसके अधीन आप काम करेंगे' : 'Who will you report to?'} />

              {/* mode toggle */}
              <div style={S.toggleRow}>
                <button type="button" onClick={() => { setOfficerMode('id'); setSupervisor(null); }}
                  style={S.toggleBtn(officerMode === 'id')}>
                  <Search size={14} /> {hi ? 'आईडी से खोजें' : 'Search by ID'}
                </button>
                {regType === 'department' && (
                  <button type="button" onClick={() => {
                    setOfficerMode('chain'); setSupervisor(null);
                    setChainPath({}); setChainIdx(0);
                  }} style={S.toggleBtn(officerMode === 'chain')}>
                    <ChevronDown size={14} /> {hi ? 'चेन से चुनें' : 'Walk chain'}
                  </button>
                )}
              </div>

              {/* selected supervisor display */}
              {supervisor && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: '#f0fdf4',
                  borderRadius: 'var(--radius-md)', border: '1.5px solid #bbf7d0',
                  marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BadgeCheck size={18} color="#16a34a" />
                    <div>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: '#065f46' }}>
                        {supervisor.full_name}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#15803d' }}>
                        {(supervisor.designation_name || supervisor.hierarchy_code || '').replace(/_/g, ' ')}
                        {supervisor.staff_code ? ` • ${supervisor.staff_code}` : ''}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setSupervisor(null); resetChain(); }}
                    style={{
                      border: 'none', background: 'none', cursor: 'pointer',
                      color: '#16a34a', padding: 4,
                    }}>
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* ---------- BY ID ---------- */}
              {officerMode === 'id' && !supervisor && (
                <>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={15} style={{
                        position: 'absolute', left: 13, top: '50%',
                        transform: 'translateY(-50%)', color: 'var(--gray-400)',
                        pointerEvents: 'none',
                      }} />
                      <input type="text"
                        placeholder={hi ? 'स्टाफ कोड, नाम या आईडी' : 'Staff code, name or ID'}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
                        }}
                        style={S.input} />
                    </div>
                    <button type="button" onClick={runSearch} disabled={searching}
                      style={{
                        padding: '0 16px', border: 'none',
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg,#15803d,#16a34a)',
                        color: '#fff', fontWeight: 800, fontSize: '0.82rem',
                        cursor: searching ? 'wait' : 'pointer',
                      }}>
                      {searching ? '…' : (hi ? 'खोजें' : 'Find')}
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div style={{
                      border: '1.5px solid var(--gray-200)',
                      borderRadius: 'var(--radius-md)', maxHeight: 240,
                      overflowY: 'auto', background: '#fff',
                    }}>
                      {searchResults.map(m => (
                        <StaffRow key={m.id} m={m} onClick={mm => {
                          setSupervisor(mm);
                          if (mm.city_id) setSelectedCity(mm.city_id);
                          if (mm.department_id && regType === 'department')
                            setSelectedDept(mm.department_id);
                          setSearchResults([]); setSearchTerm('');
                        }} />
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

              {/* ---------- WALK CHAIN ---------- */}
              {officerMode === 'chain' && regType === 'department' && !supervisor && (
                <>
                  {chainSteps.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                      {hi ? 'इस पद के ऊपर कोई स्तर नहीं है।'
                          : 'No levels above this designation.'}
                    </p>
                  ) : (
                    <>
                      {/* progress pills */}
                      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
                        {chainSteps.map((s, i) => {
                          const key = s.hierarchy_code ?? String(s.tier);
                          const picked = chainPath[key];
                          const active = i === chainIdx;
                          return (
                            <span key={key} style={{
                              fontSize: '0.65rem', fontWeight: 700,
                              padding: '3px 8px', borderRadius: 999,
                              background: picked ? '#dcfce7' : active ? '#fef3c7' : 'var(--gray-100)',
                              color: picked ? '#15803d' : active ? '#92400e' : 'var(--gray-500)',
                            }}>
                              {picked ? '✓ ' : ''}{hi && s.name_hi ? s.name_hi : s.name}
                            </span>
                          );
                        })}
                      </div>

                      {chainSteps[chainIdx] && (
                        <>
                          <label style={S.label}>
                            {hi ? `चरण ${chainIdx + 1}: ${chainSteps[chainIdx].name} चुनें`
                                : `Step ${chainIdx + 1}: Pick ${chainSteps[chainIdx].name}`}
                          </label>
                          {chainLoading ? (
                            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                              {hi ? 'लोड हो रहा है…' : 'Loading…'}
                            </p>
                          ) : chainResults.length === 0 ? (
                            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                              {hi ? 'इस स्तर पर कोई स्टाफ नहीं मिला।'
                                  : 'No staff found at this level.'}
                            </p>
                          ) : (
                            <div style={{
                              border: '1.5px solid var(--gray-200)',
                              borderRadius: 'var(--radius-md)', maxHeight: 260,
                              overflowY: 'auto', background: '#fff',
                            }}>
                              {chainResults.map(m => (
                                <StaffRow key={m.id} m={m} onClick={pickChainPerson} />
                              ))}
                            </div>
                          )}
                          {chainIdx > 0 && (
                            <button type="button" onClick={() => {
                              setChainIdx(i => i - 1);
                              setChainPath(prev => {
                                const copy = { ...prev };
                                const k = chainSteps[chainIdx].hierarchy_code ?? String(chainSteps[chainIdx].tier);
                                delete copy[k];
                                return copy;
                              });
                            }} style={{
                              marginTop: 8, background: 'none', border: 'none',
                              color: 'var(--gray-500)', fontSize: '0.78rem',
                              cursor: 'pointer',
                            }}>
                              ← {hi ? 'पिछला चरण' : 'Previous step'}
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              )}

              <NavButtons onBack={goBack} onNext={goToDetails}
                nextDisabled={needsOfficer && !supervisor} />
            </>
          )}

          {/* ============ STAGE: DETAILS ============ */}
          {stage === 'details' && (
            <>
              <StageHeader
                step={regType === 'department' ? 7 : 6}
                total={totalSteps}
                title={hi ? 'आपका विवरण' : 'Your details'}
                subtitle={hi ? 'अंतिम जानकारी भरें और आवेदन जमा करें'
                            : 'Fill final details and submit'} />

              {/* summary */}
              <div style={{
                padding: '12px 14px', background: '#f9fafb',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)',
                marginBottom: 16,
              }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-500)' }}>
                  {hi ? 'आवेदन सारांश' : 'Application Summary'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-700)' }}>
                    <b>{hi ? 'प्रकार:' : 'Type:'}</b>{' '}
                    {regType === 'department' ? (hi ? 'विभाग' : 'Department') : (hi ? 'प्राधिकरण' : 'Authority')}
                  </p>
                  {selectedCity && cities.find(c => c.id === selectedCity) && (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-700)' }}>
                      <b>{hi ? 'शहर:' : 'City:'}</b>{' '}
                      {cities.find(c => c.id === selectedCity)?.name}
                    </p>
                  )}
                  {regType === 'department' && selectedDept && (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-700)' }}>
                      <b>{hi ? 'विभाग:' : 'Department:'}</b>{' '}
                      {departments.find(d => d.id === selectedDept)?.name}
                    </p>
                  )}
                  {regType === 'department' && selectedDesig && (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-700)' }}>
                      <b>{hi ? 'पद:' : 'Designation:'}</b>{' '}
                      {hi && selectedDesig.name_hi ? selectedDesig.name_hi : selectedDesig.name}
                    </p>
                  )}
                  {regType === 'authority' && selectedAuthority && (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-700)' }}>
                      <b>{hi ? 'भूमिका:' : 'Role:'}</b>{' '}
                      {hi && selectedAuthority.name_hi ? selectedAuthority.name_hi : selectedAuthority.name}
                    </p>
                  )}
                  {supervisor && (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-700)' }}>
                      <b>{hi ? 'रिपोर्टिंग:' : 'Reports to:'}</b>{' '}
                      {supervisor.full_name} {supervisor.staff_code ? `(${supervisor.staff_code})` : ''}
                    </p>
                  )}
                </div>
              </div>

              <FormInput icon={User}
                placeholder={hi ? 'पूरा नाम *' : 'Full Name *'}
                value={fullName} onChange={e => setFullName(e.target.value)} />
              <FormInput icon={Phone}
                placeholder={hi ? 'मोबाइल नंबर' : 'Mobile Number'}
                value={phone} onChange={e => setPhone(e.target.value)} />

              {!isLoggedIn && (
                <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                  {hi ? `खाता: ${email} (${accountType === 'new' ? 'नया' : 'मौजूदा'})`
                      : `Account: ${email} (${accountType === 'new' ? 'new' : 'existing'})`}
                </p>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button type="button" onClick={goBack} style={S.btnSecondary}>
                  <ChevronLeft size={15} /> {hi ? 'पीछे' : 'Back'}
                </button>
                <button type="button" onClick={handleSubmit} disabled={loading}
                  style={{
                    ...S.btnPrimary, flex: 1,
                    background: loading ? 'var(--gray-300)' : S.btnPrimary.background,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}>
                  {loading ? (
                    <span className="spinner" style={{ width: 18, height: 18 }} />
                  ) : (
                    <><ShieldCheck size={16} /> {hi ? 'आवेदन जमा करें' : 'Submit Application'}</>
                  )}
                </button>
              </div>
            </>
          )}

          {/* footer */}
          <button type="button" onClick={() => navigate('/')}
            style={{
              width: '100%', marginTop: 16, padding: '8px', border: 'none',
              background: 'none', color: 'var(--gray-400)', fontSize: '0.78rem',
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
