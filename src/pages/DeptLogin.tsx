import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2, Mail, ShieldCheck, ArrowRight, User, Phone,
  ChevronDown, ChevronLeft, Clock, CheckCircle, LogOut, Search,
  MapPin, X, BadgeCheck, Briefcase, Crosshair, Crown, Plus,
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
  maps_to_role: string | null;
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

type Stage = 'account' | 'city' | 'role' | 'level' | 'officer' | 'details' | 'pending';

const PRIORITY_CITIES = ['betul', 'bhopal', 'chhindwara', 'indore'];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function DeptLogin() {
  const { user, profile, refreshProfile, signOut, language: rawLang } = useAuth();
  const navigate = useNavigate();
  const hi = rawLang === 'hi';

  const [stage, setStage] = useState<Stage>('account');

  /* account */
  const [accountType, setAccountType] = useState<'existing' | 'new'>('existing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  /* city */
  const [selectedCity, setSelectedCity] = useState('');

  /* role — one of: '', 'municipal_commissioner', 'deputy_commissioner', 'dept:<uuid>' */
  const [roleKey, setRoleKey] = useState('');
  const [selectedDept, setSelectedDept] = useState('');       // uuid when dept
  const [selectedAuthority, setSelectedAuthority] = useState<AuthorityRole | null>(null);

  /* level */
  const [selectedDesig, setSelectedDesig] = useState<Designation | null>(null);

  /* officer */
  const [supervisor, setSupervisor] = useState<StaffMatch | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<StaffMatch[]>([]);
  const [searching, setSearching] = useState(false);

  /* details */
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  /* data */
  const [cities, setCities] = useState<City[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [authorityRoles, setAuthorityRoles] = useState<AuthorityRole[]>([]);

  /* ui */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Loads                                                            */
  /* ---------------------------------------------------------------- */
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
    supabase.rpc('list_chain_for_dept', { p_dept_id: selectedDept })
      .then(({ data, error: e }) => {
        if (e) { setError(e.message); return; }
        setDesignations((data ?? []) as Designation[]);
        setSelectedDesig(null);
      });
  }, [selectedDept]);

  useEffect(() => {
    if (!user || !profile) return;
    const staffRoles = [
      'dept_staff', 'admin', 'department_head', 'supervisor', 'control_room',
      'management_viewer', 'field_employee', 'municipal_administrator',
    ];
    const role = profile.role;
    if (role && staffRoles.includes(role)) {
      navigate('/dept/dashboard', { replace: true });
    } else if (role === 'pending_staff') {
      setStage('pending');
    }
  }, [user, profile, navigate]);

  /* ---------------------------------------------------------------- */
  /*  Derived                                                          */
  /* ---------------------------------------------------------------- */
  const isLoggedIn = !!user;

  const sortedCities = [...cities].sort((a, b) => {
    const ai = PRIORITY_CITIES.indexOf((a.name || '').toLowerCase());
    const bi = PRIORITY_CITIES.indexOf((b.name || '').toLowerCase());
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const isDeptRole = roleKey.startsWith('dept:');
  const isAuthorityRole = roleKey === 'municipal_commissioner' || roleKey === 'deputy_commissioner';

  /* do we need the officer step? */
  const needsOfficer = (() => {
    if (roleKey === 'municipal_commissioner') return false; // top role
    if (roleKey === 'deputy_commissioner') return true;
    if (isDeptRole) {
      // department_head may skip (SQL allows null supervisor for it)
      return selectedDesig ? selectedDesig.tier !== 1 : true;
    }
    return true;
  })();

  /* which stages are in the flow */
  const flow: Stage[] = ['account', 'city', 'role'];
  if (isDeptRole) flow.push('level');
  if (needsOfficer) flow.push('officer');
  flow.push('details');

  const stepIdx = flow.indexOf(stage);

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */
  const goBack = () => {
    setError('');
    const i = flow.indexOf(stage);
    if (i > 0) setStage(flow[i - 1]);
  };

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
        const list = (data as any[] | null) ?? [];
        const nc = list[0];
        if (nc && nc.id) setSelectedCity(nc.id as string);
        setGeoLoading(false);
      },
      () => {
        setError(hi ? 'लोकेशन की अनुमति नहीं मिली' : 'Location permission denied');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const runSearch = async () => {
    if (!searchTerm.trim()) {
      setError(hi ? 'खोज शब्द दर्ज करें' : 'Enter a search term');
      return;
    }
    setSearching(true); setError('');
    try {
      const { data, error: e } = await supabase.rpc('search_approvers_for_signup', {
        p_search:        searchTerm.trim(),
        p_city_id:       selectedCity || null,
        p_department_id: isDeptRole ? (selectedDept || null) : null,
        p_lat:           coords ? coords.lat : null,
        p_lng:           coords ? coords.lng : null,
        p_limit:         25,
      });
      if (e) throw e;
      setSearchResults((data ?? []) as StaffMatch[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally { setSearching(false); }
  };

  /* stage guards */
  const goToCity = () => {
    if (!isLoggedIn) {
      if (!email.trim()) { setError(hi ? 'ईमेल आवश्यक है' : 'Email is required'); return; }
      if (!password)     { setError(hi ? 'पासवर्ड आवश्यक है' : 'Password is required'); return; }
    }
    setError(''); setStage('city');
  };

  const goToRole = () => {
    if (!selectedCity) { setError(hi ? 'कृपया शहर चुनें' : 'Please select a city'); return; }
    setError(''); setStage('role');
  };

  const goToNextFromRole = () => {
    if (!roleKey) { setError(hi ? 'कृपया भूमिका चुनें' : 'Please select a role'); return; }
    setError('');
    if (isDeptRole) setStage('level');
    else if (needsOfficer) setStage('officer');
    else setStage('details');
  };

  const goToOfficerFromLevel = () => {
    if (!selectedDesig) { setError(hi ? 'कृपया स्तर चुनें' : 'Please select a level'); return; }
    setError('');
    if (needsOfficer) setStage('officer');
    else setStage('details');
  };

  const goToDetails = () => {
    if (needsOfficer && !supervisor) {
      setError(hi ? 'कृपया रिपोर्टिंग अधिकारी चुनें' : 'Please select a reporting officer');
      return;
    }
    setError(''); setStage('details');
  };

  const handleSubmit = async () => {
    setError('');
    if (!fullName.trim()) {
      setError(hi ? 'कृपया पूरा नाम भरें' : 'Please enter your full name');
      return;
    }
    setLoading(true);
    try {
      let userId = user?.id;
      let userEmail = user?.email || email.trim().toLowerCase();

      if (!userId) {
        if (accountType === 'new') {
          const { data, error: signErr } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(), password,
          });
          if (signErr) {
            if (/already registered|already exists/i.test(signErr.message)) {
              throw new Error(hi
                ? 'यह ईमेल पहले से पंजीकृत है। कृपया मौजूदा खाता चुनें।'
                : 'Email already registered. Please choose Existing Account.');
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
      if (!userId) throw new Error('Could not establish session');

      const { error: upsertErr } = await supabase.from('user_profiles').upsert({
        id: userId,
        email: userEmail,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        role: 'pending_staff',
        city_id: selectedCity || null,
        supervisor_id: supervisor ? supervisor.id : null,
        linked_department_id: isDeptRole ? selectedDept : null,
        designation_id: isDeptRole && selectedDesig ? selectedDesig.designation_id : null,
        latitude:  coords ? coords.lat : null,
        longitude: coords ? coords.lng : null,
        approval_status: 'pending',
      });
      if (upsertErr) throw upsertErr;

      if (isDeptRole) {
        const { error: rpcErr } = await supabase.rpc('register_as_staff', {
          target_role:    (selectedDesig && selectedDesig.maps_to_role) || 'dept_staff',
          department_id:  selectedDept,
          city_id:        selectedCity,
          supervisor_id:  supervisor ? supervisor.id : null,
          full_name:      fullName.trim(),
          phone:          phone.trim() || null,
          designation_id: selectedDesig ? selectedDesig.designation_id : null,
          zone_id:        null,
        });
        if (rpcErr) throw rpcErr;
      } else {
        const { error: rpcErr } = await supabase.rpc('register_authority_user', {
          p_authority_role: roleKey,
          p_city_id:        selectedCity,
          p_supervisor_id:  supervisor ? supervisor.id : null,
          p_full_name:      fullName.trim(),
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

  const handleSignOut = async () => {
    await signOut();
    setStage('account'); setAccountType('existing');
    setEmail(''); setPassword(''); setFullName(''); setPhone('');
    setSelectedCity(''); setRoleKey(''); setSelectedDept('');
    setSelectedDesig(null); setSelectedAuthority(null); setSupervisor(null);
    setSearchResults([]); setSearchTerm(''); setError('');
  };

  /* ---------------------------------------------------------------- */
  /*  Styles                                                           */
  /* ---------------------------------------------------------------- */
  const S = {
    label: { display: 'block', fontWeight: 700, fontSize: '0.82rem', marginBottom: 6, color: 'var(--gray-700)' } as React.CSSProperties,
    select: { width: '100%', padding: '11px 36px 11px 40px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', background: '#fff', outline: 'none', boxSizing: 'border-box', appearance: 'none', cursor: 'pointer' } as React.CSSProperties,
    input: { width: '100%', padding: '11px 14px 11px 40px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', background: '#fff', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
    btnPrimary: { width: '100%', padding: '13px', border: 'none', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg,#15803d,#16a34a)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(22,163,74,0.35)' } as React.CSSProperties,
    btnSecondary: { padding: '11px 16px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)', background: '#fff', color: 'var(--gray-700)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 } as React.CSSProperties,
    toggleRow: { display: 'flex', background: 'var(--gray-100)', padding: 4, borderRadius: 'var(--radius-md)', marginBottom: 16 } as React.CSSProperties,
    toggleBtn: (active: boolean) => ({ flex: 1, padding: '10px', border: 'none', borderRadius: 'var(--radius-sm)', background: active ? '#fff' : 'transparent', color: active ? '#15803d' : 'var(--gray-600)', fontWeight: active ? 800 : 600, fontSize: '0.82rem', cursor: 'pointer', boxShadow: active ? 'var(--shadow-sm)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }) as React.CSSProperties,
    card: { padding: '10px 12px', border: 'none', borderBottom: '1px solid var(--gray-100)', background: '#fff', cursor: 'pointer', textAlign: 'left' as const, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' } as React.CSSProperties,
  };

  /* ---------------------------------------------------------------- */
  /*  Pending screen                                                   */
  /* ---------------------------------------------------------------- */
  if (stage === 'pending') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f4c2a 0%,#16a34a 50%,#4ade80 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 440, width: '100%', background: '#fff', borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: 36, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Clock size={32} color="#d97706" />
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: '1.25rem', fontWeight: 900 }}>
            {hi ? 'अनुमोदन की प्रतीक्षा' : 'Awaiting Approval'}
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: 'var(--gray-600)', lineHeight: 1.7 }}>
            {hi ? 'आपका आवेदन सीनियर अधिकारी को भेजा गया है।' : 'Your application has been sent to your senior officer.'}
          </p>
          <button onClick={() => navigate('/')} style={S.btnPrimary}>
            {hi ? 'होम पर जाएं' : 'Go to Home'}
          </button>
          <button onClick={handleSignOut} style={{ marginTop: 10, width: '100%', padding: '10px', border: 'none', background: 'none', color: 'var(--gray-400)', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <LogOut size={13} /> {hi ? 'लॉगआउट करें' : 'Log out / Switch User'}
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  MAIN                                                             */
  /* ---------------------------------------------------------------- */
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f4c2a 0%,#16a34a 50%,#4ade80 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        {/* header */}
        <div style={{ background: 'linear-gradient(135deg,#15803d,#16a34a)', padding: '22px 26px', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <Building2 size={26} color="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#fff' }}>
            {hi ? 'स्टाफ के रूप में जुड़ें' : 'Join as Staff'}
          </h1>
          {isLoggedIn && (
            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)' }}>
              {user?.email}
            </p>
          )}
        </div>

        {/* progress bar */}
        <div style={{ display: 'flex', gap: 3, padding: '0 24px', marginTop: 16 }}>
          {flow.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= stepIdx ? '#16a34a' : 'var(--gray-200)' }} />
          ))}
        </div>

        <div style={{ padding: '20px 24px 24px' }}>
          <AlertBanner type="error" message={error} />

          {/* ===================== ACCOUNT ===================== */}
          {stage === 'account' && (
            <>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 900 }}>
                {hi ? 'खाता चुनें' : 'Choose account'}
              </h2>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                {hi ? 'मौजूदा खाते में अपग्रेड करें या नया बनाएं'
                    : 'Upgrade existing or create a new account'}
              </p>

              {!isLoggedIn && (
                <>
                  <div style={S.toggleRow}>
                    <button type="button" onClick={() => setAccountType('existing')} style={S.toggleBtn(accountType === 'existing')}>
                      <User size={14} /> {hi ? 'मौजूदा खाता' : 'Existing'}
                    </button>
                    <button type="button" onClick={() => setAccountType('new')} style={S.toggleBtn(accountType === 'new')}>
                      <Plus size={14} /> {hi ? 'नया खाता' : 'New'}
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
                <div style={{ padding: '12px 14px', background: '#f0fdf4', borderRadius: 'var(--radius-md)', border: '1.5px solid #bbf7d0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <BadgeCheck size={18} color="#16a34a" />
                  <span style={{ fontSize: '0.82rem', color: '#065f46', fontWeight: 600 }}>
                    {hi ? 'आप पहले से लॉग इन हैं — खाता अपग्रेड होगा।'
                        : 'You are logged in — account will be upgraded.'}
                  </span>
                </div>
              )}

              <button type="button" onClick={goToCity} style={{ ...S.btnPrimary, marginTop: 8 }}>
                {hi ? 'आगे' : 'Continue'} <ArrowRight size={15} />
              </button>
            </>
          )}

          {/* ===================== CITY ===================== */}
          {stage === 'city' && (
            <>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 900 }}>
                {hi ? 'शहर चुनें' : 'Select city'}
              </h2>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                {hi ? 'आप किस शहर में काम करते हैं?' : 'Which city do you work in?'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {sortedCities.filter(c => PRIORITY_CITIES.indexOf((c.name || '').toLowerCase()) >= 0).map(c => (
                  <button key={c.id} type="button" onClick={() => setSelectedCity(c.id)}
                    style={{
                      padding: '16px 12px',
                      border: selectedCity === c.id ? '2px solid #16a34a' : '1.5px solid var(--gray-200)',
                      borderRadius: 'var(--radius-md)',
                      background: selectedCity === c.id ? '#f0fdf4' : '#fff',
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MapPin size={16} color={selectedCity === c.id ? '#16a34a' : '#9ca3af'} />
                      <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem', color: selectedCity === c.id ? '#15803d' : 'var(--gray-800)' }}>
                          {c.name}
                        </p>
                        {c.state && (
                          <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--gray-500)' }}>{c.state}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {sortedCities.filter(c => PRIORITY_CITIES.indexOf((c.name || '').toLowerCase()) < 0).length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={S.label}>{hi ? 'अन्य शहर' : 'Other cities'}</label>
                  <div style={{ position: 'relative' }}>
                    <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}
                      style={{ ...S.select, color: selectedCity ? 'var(--gray-900)' : 'var(--gray-400)' }}>
                      <option value="">{hi ? '— चुनें —' : '— Select —'}</option>
                      {sortedCities.filter(c => PRIORITY_CITIES.indexOf((c.name || '').toLowerCase()) < 0).map(c => (
                        <option key={c.id} value={c.id}>{c.name}, {c.state}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
                  </div>
                </div>
              )}

              <button type="button" onClick={detectLocation} disabled={geoLoading}
                style={{ width: '100%', padding: '11px', border: '1.5px dashed var(--green-300)', borderRadius: 'var(--radius-md)', background: '#f0fdf4', color: '#15803d', fontWeight: 700, fontSize: '0.82rem', cursor: geoLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Crosshair size={15} />
                {geoLoading ? (hi ? 'लोकेट कर रहे हैं…' : 'Locating…')
                             : (hi ? 'मेरी लोकेशन का उपयोग करें' : 'Use my location')}
              </button>

              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button type="button" onClick={goBack} style={S.btnSecondary}>
                  <ChevronLeft size={15} />
                </button>
                <button type="button" onClick={goToRole} style={{ ...S.btnPrimary, flex: 1 }}>
                  {hi ? 'आगे' : 'Continue'} <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}

          {/* ===================== ROLE ===================== */}
          {stage === 'role' && (
            <>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 900 }}>
                {hi ? 'भूमिका चुनें' : 'Select your role'}
              </h2>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                {hi ? 'अधिकारी चुनें या विभाग चुनें' : 'Pick an officer role or a department'}
              </p>

              <div style={{ position: 'relative', marginBottom: 14 }}>
                <Crown size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
                <select
                  value={roleKey}
                  onChange={e => {
                    const v = e.target.value;
                    setRoleKey(v);
                    setSelectedDesig(null);
                    setSupervisor(null);
                    if (v.startsWith('dept:')) {
                      setSelectedDept(v.slice(5));
                      setSelectedAuthority(null);
                    } else {
                      setSelectedDept('');
                      const a = authorityRoles.find(r => r.code === v);
                      setSelectedAuthority(a ?? null);
                    }
                  }}
                  style={{ ...S.select, color: roleKey ? 'var(--gray-900)' : 'var(--gray-400)' }}>
                  <option value="">{hi ? '— भूमिका चुनें —' : '— Select Role —'}</option>
                  <optgroup label={hi ? 'प्राधिकरण' : 'Authority'}>
                    <option value="municipal_commissioner">
                      {hi ? 'नगर आयुक्त (Municipal Commissioner)' : 'Municipal Commissioner'}
                    </option>
                    <option value="deputy_commissioner">
                      {hi ? 'उप आयुक्त (Deputy Commissioner)' : 'Deputy Commissioner'}
                    </option>
                  </optgroup>
                  <optgroup label={hi ? 'विभाग' : 'Departments'}>
                    {departments.map(d => (
                      <option key={d.id} value={`dept:${d.id}`}>{d.icon} {d.name}</option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button type="button" onClick={goBack} style={S.btnSecondary}>
                  <ChevronLeft size={15} />
                </button>
                <button type="button" onClick={goToNextFromRole} style={{ ...S.btnPrimary, flex: 1 }}>
                  {hi ? 'आगे' : 'Continue'} <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}

          {/* ===================== LEVEL ===================== */}
          {stage === 'level' && (
            <>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 900 }}>
                {hi ? 'अपना स्तर चुनें' : 'Select your level'}
              </h2>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                {departments.find(d => d.id === selectedDept)?.name || ''}
                {' — '}
                {hi ? 'विभाग श्रृंखला' : 'department chain'}
              </p>

              {designations.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                  {hi ? 'इस विभाग में कोई स्तर उपलब्ध नहीं है।'
                      : 'No levels available for this department.'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {designations.map(d => {
                    const active = selectedDesig?.designation_id === d.designation_id;
                    return (
                      <button key={d.designation_id} type="button" onClick={() => setSelectedDesig(d)}
                        style={{
                          padding: '12px 14px',
                          border: active ? '2px solid #16a34a' : '1.5px solid var(--gray-200)',
                          borderRadius: 'var(--radius-md)',
                          background: active ? '#f0fdf4' : '#fff',
                          cursor: 'pointer', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                        <Briefcase size={16} color={active ? '#16a34a' : '#9ca3af'} />
                        <div>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: active ? '#15803d' : 'var(--gray-800)' }}>
                            {hi && d.name_hi ? d.name_hi : d.name}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--gray-500)' }}>
                            {d.hierarchy_code ? d.hierarchy_code.replace(/_/g, ' ') : `Tier ${d.tier}`}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button type="button" onClick={goBack} style={S.btnSecondary}>
                  <ChevronLeft size={15} />
                </button>
                <button type="button" onClick={goToOfficerFromLevel} style={{ ...S.btnPrimary, flex: 1 }}>
                  {needsOfficer ? (hi ? 'आगे' : 'Continue') : (hi ? 'विवरण' : 'Details')}{' '}
                  <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}

          {/* ===================== OFFICER ===================== */}
          {stage === 'officer' && (
            <>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 900 }}>
                {hi ? 'रिपोर्टिंग अधिकारी' : 'Reporting officer'}
              </h2>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                {hi ? 'सीनियर का स्टाफ आईडी या नाम से खोजें'
                    : 'Search senior by staff ID or name'}
              </p>

              {supervisor ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f0fdf4', borderRadius: 'var(--radius-md)', border: '1.5px solid #bbf7d0', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BadgeCheck size={20} color="#16a34a" />
                    <div>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: '0.88rem', color: '#065f46' }}>
                        {supervisor.full_name}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#15803d' }}>
                        {(supervisor.designation_name || supervisor.hierarchy_code || '').replace(/_/g, ' ')}
                        {supervisor.staff_code ? ` • ${supervisor.staff_code}` : ''}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSupervisor(null)}
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
                        placeholder={hi ? 'स्टाफ कोड, नाम या आईडी' : 'Staff code, name or ID'}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }}
                        style={S.input} />
                    </div>
                    <button type="button" onClick={runSearch} disabled={searching}
                      style={{ padding: '0 16px', border: 'none', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg,#15803d,#16a34a)', color: '#fff', fontWeight: 800, fontSize: '0.82rem', cursor: searching ? 'wait' : 'pointer' }}>
                      {searching ? '…' : (hi ? 'खोजें' : 'Find')}
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div style={{ border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)', maxHeight: 260, overflowY: 'auto', background: '#fff' }}>
                      {searchResults.map(m => (
                        <button key={m.id} type="button"
                          onClick={() => { setSupervisor(m); setSearchResults([]); setSearchTerm(''); }}
                          style={S.card}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: 'var(--gray-900)' }}>
                              {m.full_name || 'Unnamed Staff'}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                              {(m.designation_name || m.hierarchy_code || m.role || '').replace(/_/g, ' ')}
                              {m.staff_code ? ` • ${m.staff_code}` : ''}
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

              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button type="button" onClick={goBack} style={S.btnSecondary}>
                  <ChevronLeft size={15} />
                </button>
                <button type="button" onClick={goToDetails} style={{ ...S.btnPrimary, flex: 1 }}>
                  {hi ? 'आगे' : 'Continue'} <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}

          {/* ===================== DETAILS ===================== */}
          {stage === 'details' && (
            <>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 900 }}>
                {hi ? 'आपका विवरण' : 'Your details'}
              </h2>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                {hi ? 'अंतिम जानकारी भरें और आवेदन जमा करें'
                    : 'Fill final details and submit'}
              </p>

              <div style={{ padding: '12px 14px', background: '#f9fafb', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)', marginBottom: 16 }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-500)' }}>
                  {hi ? 'आवेदन सारांश' : 'Application Summary'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {cities.find(c => c.id === selectedCity) && (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-700)' }}>
                      <b>{hi ? 'शहर:' : 'City:'}</b> {cities.find(c => c.id === selectedCity)?.name}
                    </p>
                  )}
                  {isDeptRole && (
                    <>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-700)' }}>
                        <b>{hi ? 'विभाग:' : 'Dept:'}</b> {departments.find(d => d.id === selectedDept)?.name}
                      </p>
                      {selectedDesig && (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-700)' }}>
                          <b>{hi ? 'स्तर:' : 'Level:'}</b>{' '}
                          {hi && selectedDesig.name_hi ? selectedDesig.name_hi : selectedDesig.name}
                        </p>
                      )}
                    </>
                  )}
                  {!isDeptRole && roleKey && (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-700)' }}>
                      <b>{hi ? 'भूमिका:' : 'Role:'}</b>{' '}
                      {roleKey === 'municipal_commissioner'
                        ? (hi ? 'नगर आयुक्त' : 'Municipal Commissioner')
                        : roleKey === 'deputy_commissioner'
                        ? (hi ? 'उप आयुक्त' : 'Deputy Commissioner')
                        : roleKey}
                    </p>
                  )}
                  {supervisor && (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-700)' }}>
                      <b>{hi ? 'रिपोर्टिंग:' : 'Reports to:'}</b> {supervisor.full_name}
                      {supervisor.staff_code ? ` (${supervisor.staff_code})` : ''}
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

              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button type="button" onClick={goBack} style={S.btnSecondary}>
                  <ChevronLeft size={15} />
                </button>
                <button type="button" onClick={handleSubmit} disabled={loading}
                  style={{ ...S.btnPrimary, flex: 1, background: loading ? 'var(--gray-300)' : S.btnPrimary.background, cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : (
                    <><ShieldCheck size={16} /> {hi ? 'आवेदन जमा करें' : 'Submit Application'}</>
                  )}
                </button>
              </div>
            </>
          )}

          <button type="button" onClick={() => navigate('/')}
            style={{ width: '100%', marginTop: 16, padding: '8px', border: 'none', background: 'none', color: 'var(--gray-400)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <ArrowRight size={13} style={{ transform: 'rotate(180deg)' }} />
            {hi ? 'होम पर वापस जाएं' : 'Back to Home'}
          </button>
        </div>
      </div>
    </div>
  );
}
