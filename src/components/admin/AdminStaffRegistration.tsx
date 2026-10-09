import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import {
  Mail, ShieldCheck, ArrowRight, User, Phone, ChevronDown, ChevronLeft,
  Search, MapPin, X, BadgeCheck, Briefcase, Crown, Copy, Wand2, Plus,
} from 'lucide-react';
import { FormInput } from '../auth/FormInput';
import { PasswordInput } from '../auth/PasswordInput';
import { AlertBanner } from '../auth/AlertBanner';

/* Separate client: creating the new user must NOT replace the admin's session */
const provisionClient = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'sb-admin-provision',
    },
  },
);

interface Department { id: string; name: string; slug: string; icon: string; }
interface City { id: string; name: string; state: string | null; slug: string | null; }
interface Designation {
  designation_id: string; tier: number; name: string; name_hi: string | null;
  hierarchy_code: string | null; maps_to_role: string | null;
}
interface StaffMatch {
  id: string; full_name: string | null; role: string; hierarchy_code: string | null;
  staff_code: string | null; department_name: string | null; designation_name: string | null;
}

type Stage = 'account' | 'city' | 'role' | 'level' | 'officer' | 'details' | 'done';

const MANUAL_CITIES = [
  { key: 'indore', name: 'Indore' },
  { key: 'bhopal', name: 'Bhopal' },
  { key: 'betul', name: 'Betul' },
  { key: 'chhindwara', name: 'Chhindwara' },
];

const genPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  return Array.from(arr, n => chars[n % chars.length]).join('');
};

const S = {
  label: { display: 'block', fontWeight: 700, fontSize: '0.82rem', marginBottom: 6, color: 'var(--gray-700)' } as React.CSSProperties,
  select: { width: '100%', padding: '11px 36px 11px 40px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', background: '#fff', outline: 'none', boxSizing: 'border-box', appearance: 'none', cursor: 'pointer' } as React.CSSProperties,
  input: { width: '100%', padding: '11px 14px 11px 40px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', background: '#fff', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
  btnPrimary: { width: '100%', padding: 13, border: 'none', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg,#15803d,#16a34a)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 } as React.CSSProperties,
  btnSecondary: { padding: '11px 16px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)', background: '#fff', color: 'var(--gray-700)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 } as React.CSSProperties,
  row: { padding: '10px 12px', border: 'none', borderBottom: '1px solid var(--gray-100)', background: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' } as React.CSSProperties,
  h2: { margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 900 } as React.CSSProperties,
  sub: { margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--gray-500)' } as React.CSSProperties,
};

interface Props { onDone?: () => void; }

export default function AdminStaffRegistration({ onDone }: Props) {
  const [stage, setStage] = useState<Stage>('account');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDesig, setSelectedDesig] = useState<Designation | null>(null);
  const [supervisor, setSupervisor] = useState<StaffMatch | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<StaffMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const [cities, setCities] = useState<City[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  /* ---------- loads (use the admin's own client) ---------- */
  useEffect(() => {
    supabase.from('cities').select('id, name, state, slug').eq('is_active', true).order('name')
      .then(({ data, error: e }) => {
        if (e) { setError('Could not load cities: ' + e.message); return; }
        setCities((data ?? []) as City[]);
      });
    supabase.from('departments').select('id, name, slug, icon').eq('is_active', true).order('name')
      .then(({ data }) => setDepartments((data ?? []) as Department[]));
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

  /* ---------- derived ---------- */
  const isDeptRole = roleKey.startsWith('dept:');
  const needsOfficer = roleKey !== 'municipal_commissioner';
  const needsDeputy = isDeptRole && !!selectedDesig &&
    (selectedDesig.hierarchy_code === 'department_head' || selectedDesig.tier === 1);

  const flow: Stage[] = ['account', 'city', 'role'];
  if (isDeptRole) flow.push('level');
  if (needsOfficer) flow.push('officer');
  flow.push('details');
  const stepIdx = flow.indexOf(stage);

  const manualCities = MANUAL_CITIES.map(m => ({
    ...m,
    dbCity: cities.find(c =>
      (c.name || '').trim().toLowerCase() === m.key ||
      (c.slug || '').trim().toLowerCase() === m.key) || null,
  }));
  const otherCities = cities.filter(c =>
    !MANUAL_CITIES.some(m => m.key === (c.name || '').trim().toLowerCase()));

  /* ---------- handlers ---------- */
  const goBack = () => {
    setError('');
    const i = flow.indexOf(stage);
    if (i > 0) setStage(flow[i - 1]);
  };

  const next = (from: Stage) => {
    setError('');
    const i = flow.indexOf(from);
    setStage(flow[i + 1]);
  };

  const validateAccount = () => {
    const mail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(mail)) { setError('Enter a valid email address'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setEmail(mail);
    next('account');
  };

  const validateRole = () => {
    if (!roleKey) { setError('Please select a role'); return; }
    // flow changes with roleKey, so compute the target manually
    setError('');
    if (roleKey.startsWith('dept:')) setStage('level');
    else if (roleKey !== 'municipal_commissioner') setStage('officer');
    else setStage('details');
  };

  const validateLevel = () => {
    if (!selectedDesig) { setError('Please select a level'); return; }
    setError('');
    setStage(needsOfficer ? 'officer' : 'details');
  };

  const runSearch = async () => {
    if (!searchTerm.trim() && !needsDeputy) { setError('Enter a search term'); return; }
    setSearching(true); setError('');
    try {
      const { data, error: e } = await supabase.rpc('search_approvers_for_signup', {
        p_search: searchTerm.trim(),
        p_city_id: selectedCity || null,
        p_department_id: isDeptRole ? (selectedDept || null) : null,
        p_lat: null,
        p_lng: null,
        p_limit: 25,
      });
      if (e) throw e;
      let list = (data ?? []) as StaffMatch[];
      if (needsDeputy) list = list.filter(m => m.hierarchy_code === 'deputy_commissioner');
      setSearchResults(list);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally { setSearching(false); }
  };

  const validateOfficer = () => {
    if (needsOfficer && !supervisor) {
      setError(needsDeputy ? 'Please select a Deputy Commissioner' : 'Please select a reporting officer');
      return;
    }
    setError(''); setStage('details');
  };

  const handleSubmit = async () => {
    setError('');
    if (!fullName.trim()) { setError('Please enter the full name'); return; }

    setLoading(true);
    try {
      // 1. Create the auth user on the separate client (admin session untouched)
      const { data, error: signErr } = await provisionClient.auth.signUp({ email, password });
      if (signErr) {
        if (/already registered|already exists/i.test(signErr.message)) {
          throw new Error('This email is already registered.');
        }
        throw signErr;
      }
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error('This email is already registered.');
      }
      if (!data.session) {
        throw new Error(
          'Account was created but Supabase requires email confirmation, so registration could not be completed. ' +
          'Turn off "Confirm email" in Supabase → Authentication → Providers → Email, or confirm this user manually.');
      }

      // 2. Register as staff — runs as the NEW user on the separate client
      if (isDeptRole) {
        const { error: rpcErr } = await provisionClient.rpc('register_as_staff', {
          target_role: (selectedDesig && selectedDesig.maps_to_role) || 'dept_staff',
          department_id: selectedDept,
          city_id: selectedCity,
          supervisor_id: supervisor ? supervisor.id : null,
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          designation_id: selectedDesig ? selectedDesig.designation_id : null,
          zone_id: null,
        });
        if (rpcErr) throw rpcErr;
      } else {
        const { error: rpcErr } = await provisionClient.rpc('register_authority_user', {
          p_authority_role: roleKey,
          p_city_id: selectedCity,
          p_supervisor_id: supervisor ? supervisor.id : null,
          p_full_name: fullName.trim(),
          p_phone: phone.trim() || null,
          p_designation_id: null,
          p_zone_id: null,
        });
        if (rpcErr) throw rpcErr;
      }

      await provisionClient.auth.signOut();

      setCreated({ email, password });
      setStage('done');
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally { setLoading(false); }
  };

  const reset = () => {
    setStage('account'); setEmail(''); setPassword(''); setSelectedCity('');
    setRoleKey(''); setSelectedDept(''); setSelectedDesig(null); setSupervisor(null);
    setSearchResults([]); setSearchTerm(''); setSearched(false);
    setFullName(''); setPhone(''); setError(''); setCreated(null); setCopied(false);
  };

  const copyCreds = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const NavRow = ({ onNext, label = 'Continue' }: { onNext: () => void; label?: string }) => (
    <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
      <button type="button" onClick={goBack} style={S.btnSecondary}><ChevronLeft size={15} /></button>
      <button type="button" onClick={onNext} style={{ ...S.btnPrimary, flex: 1 }}>
        {label} <ArrowRight size={15} />
      </button>
    </div>
  );

  /* ---------- render ---------- */
  return (
    <div style={{ maxWidth: 520, background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
      {stage !== 'done' && (
        <div style={{ display: 'flex', gap: 3, padding: '0 24px', marginTop: 16 }}>
          {flow.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= stepIdx ? '#16a34a' : 'var(--gray-200)' }} />
          ))}
        </div>
      )}

      <div style={{ padding: '20px 24px 24px' }}>
        <AlertBanner type="error" message={error} />

        {/* ACCOUNT */}
        {stage === 'account' && (
          <>
            <h2 style={S.h2}>Login credentials</h2>
            <p style={S.sub}>Set the email and password you will hand over to the staff member.</p>
            <FormInput icon={Mail} type="email" placeholder="Staff email address *"
              value={email} onChange={e => setEmail(e.target.value)} />
            <PasswordInput placeholder="Password * (min 6 characters)"
              value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" onClick={() => setPassword(genPassword())}
              style={{ ...S.btnSecondary, marginTop: 8, width: '100%' }}>
              <Wand2 size={14} /> Generate strong password
            </button>
            <button type="button" onClick={validateAccount} style={{ ...S.btnPrimary, marginTop: 16 }}>
              Continue <ArrowRight size={15} />
            </button>
          </>
        )}

        {/* CITY */}
        {stage === 'city' && (
          <>
            <h2 style={S.h2}>Select city</h2>
            <p style={S.sub}>Which city will this staff member work in?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {manualCities.map(m => {
                const id = m.dbCity ? m.dbCity.id : '';
                const active = !!id && selectedCity === id;
                return (
                  <button key={m.key} type="button" disabled={!m.dbCity}
                    onClick={() => { if (id) { setSelectedCity(id); setError(''); } }}
                    style={{
                      padding: '16px 12px', textAlign: 'left',
                      border: active ? '2px solid #16a34a' : '1.5px solid var(--gray-200)',
                      borderRadius: 'var(--radius-md)', background: active ? '#f0fdf4' : '#fff',
                      cursor: m.dbCity ? 'pointer' : 'not-allowed', opacity: m.dbCity ? 1 : 0.5,
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MapPin size={16} color={active ? '#16a34a' : '#9ca3af'} />
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: active ? '#15803d' : 'var(--gray-800)' }}>{m.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {otherCities.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Other cities</label>
                <div style={{ position: 'relative' }}>
                  <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} style={S.select}>
                    <option value="">— Select —</option>
                    {otherCities.map(c => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
                </div>
              </div>
            )}
            <NavRow onNext={() => {
              if (!selectedCity) { setError('Please select a city'); return; }
              setError(''); setStage('role');
            }} />
          </>
        )}

        {/* ROLE */}
        {stage === 'role' && (
          <>
            <h2 style={S.h2}>Select role</h2>
            <p style={S.sub}>Pick an officer role or a department</p>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <Crown size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
              <select value={roleKey}
                onChange={e => {
                  const v = e.target.value;
                  setRoleKey(v); setSelectedDesig(null); setSupervisor(null);
                  setSearchResults([]); setSearched(false);
                  setSelectedDept(v.startsWith('dept:') ? v.slice(5) : '');
                }}
                style={S.select}>
                <option value="">— Select Role —</option>
                <optgroup label="Authority">
                  <option value="municipal_commissioner">Municipal Commissioner</option>
                  <option value="deputy_commissioner">Deputy Commissioner</option>
                </optgroup>
                <optgroup label="Departments">
                  {departments.map(d => <option key={d.id} value={`dept:${d.id}`}>{d.icon} {d.name}</option>)}
                </optgroup>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
            </div>
            <NavRow onNext={validateRole} />
          </>
        )}

        {/* LEVEL */}
        {stage === 'level' && (
          <>
            <h2 style={S.h2}>Select level</h2>
            <p style={S.sub}>{departments.find(d => d.id === selectedDept)?.name || ''} — department chain</p>
            {designations.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-500)' }}>No levels available for this department.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {designations.map(d => {
                  const active = selectedDesig?.designation_id === d.designation_id;
                  return (
                    <button key={d.designation_id} type="button"
                      onClick={() => { setSelectedDesig(d); setSupervisor(null); setSearchResults([]); setSearched(false); }}
                      style={{
                        padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
                        border: active ? '2px solid #16a34a' : '1.5px solid var(--gray-200)',
                        borderRadius: 'var(--radius-md)', background: active ? '#f0fdf4' : '#fff',
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                      <Briefcase size={16} color={active ? '#16a34a' : '#9ca3af'} />
                      <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: active ? '#15803d' : 'var(--gray-800)' }}>{d.name}</p>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--gray-500)' }}>
                          {d.hierarchy_code ? d.hierarchy_code.replace(/_/g, ' ') : `Tier ${d.tier}`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <NavRow onNext={validateLevel} />
          </>
        )}

        {/* OFFICER */}
        {stage === 'officer' && (
          <>
            <h2 style={S.h2}>{needsDeputy ? 'Deputy Commissioner' : 'Reporting officer'}</h2>
            <p style={S.sub}>
              {needsDeputy
                ? 'Search by staff code or name (leave empty to list all)'
                : 'Search the senior officer by staff code or name'}
            </p>

            {supervisor ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f0fdf4', borderRadius: 'var(--radius-md)', border: '1.5px solid #bbf7d0', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <BadgeCheck size={20} color="#16a34a" />
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '0.88rem', color: '#065f46' }}>{supervisor.full_name}</p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#15803d' }}>
                      {(supervisor.designation_name || supervisor.hierarchy_code || '').replace(/_/g, ' ')}
                      {supervisor.staff_code ? ` • ${supervisor.staff_code}` : ''}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => { setSupervisor(null); setSearched(false); }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#16a34a', padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
                    <input type="text" placeholder="Staff code, name or ID" value={searchTerm}
                      onChange={e => { setSearchTerm(e.target.value); setSearched(false); }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }}
                      style={S.input} />
                  </div>
                  <button type="button" onClick={runSearch} disabled={searching}
                    style={{ padding: '0 16px', border: 'none', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg,#15803d,#16a34a)', color: '#fff', fontWeight: 800, fontSize: '0.82rem', cursor: searching ? 'wait' : 'pointer' }}>
                    {searching ? '…' : 'Find'}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div style={{ border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)', maxHeight: 260, overflowY: 'auto' }}>
                    {searchResults.map(m => (
                      <button key={m.id} type="button" style={S.row}
                        onClick={() => { setSupervisor(m); setSearchResults([]); setSearchTerm(''); }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>{m.full_name || 'Unnamed Staff'}</p>
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
                {searchResults.length === 0 && !searching && searched && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--gray-500)' }}>No matches found.</p>
                )}
              </>
            )}
            <NavRow onNext={validateOfficer} />
          </>
        )}

        {/* DETAILS */}
        {stage === 'details' && (
          <>
            <h2 style={S.h2}>Staff details</h2>
            <p style={S.sub}>Review and create the account</p>

            <div style={{ padding: '12px 14px', background: '#f9fafb', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem', color: 'var(--gray-700)' }}>
              <span><b>Email:</b> {email}</span>
              <span><b>City:</b> {cities.find(c => c.id === selectedCity)?.name}</span>
              {isDeptRole && <span><b>Dept:</b> {departments.find(d => d.id === selectedDept)?.name}</span>}
              {isDeptRole && selectedDesig && <span><b>Level:</b> {selectedDesig.name}</span>}
              {!isDeptRole && <span><b>Role:</b> {roleKey.replace(/_/g, ' ')}</span>}
              {supervisor && <span><b>Reports to:</b> {supervisor.full_name}{supervisor.staff_code ? ` (${supervisor.staff_code})` : ''}</span>}
            </div>

            <FormInput icon={User} placeholder="Full Name *" value={fullName} onChange={e => setFullName(e.target.value)} />
            <FormInput icon={Phone} placeholder="Mobile Number" value={phone} onChange={e => setPhone(e.target.value)} />

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button type="button" onClick={goBack} style={S.btnSecondary}><ChevronLeft size={15} /></button>
              <button type="button" onClick={handleSubmit} disabled={loading}
                style={{ ...S.btnPrimary, flex: 1, opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}>
                {loading ? 'Creating…' : <><ShieldCheck size={16} /> Create staff account</>}
              </button>
            </div>
          </>
        )}

        {/* DONE */}
        {stage === 'done' && created && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <BadgeCheck size={28} color="#16a34a" />
              </div>
              <h2 style={S.h2}>Staff account created</h2>
              <p style={{ ...S.sub, margin: 0 }}>Share these credentials with the staff member. The password is not shown again.</p>
            </div>

            <div style={{ padding: '14px 16px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', lineHeight: 1.9 }}>
              <div><b>Email:</b> {created.email}</div>
              <div><b>Password:</b> <code>{created.password}</code></div>
            </div>

            <p style={{ margin: '12px 0 0', fontSize: '0.75rem', color: '#b45309' }}>
              The account is pending. Approve it in the <b>Staff Approvals</b> tab so the staff member can log in.
            </p>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={copyCreds} style={{ ...S.btnSecondary, flex: 1 }}>
                <Copy size={14} /> {copied ? 'Copied!' : 'Copy credentials'}
              </button>
              <button type="button" onClick={reset} style={{ ...S.btnPrimary, flex: 1 }}>
                <Plus size={15} /> Register another
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
