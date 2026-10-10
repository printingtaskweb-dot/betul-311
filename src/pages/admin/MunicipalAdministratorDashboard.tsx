import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  MapPin,
  Compass,
  RefreshCw,
  Eye,
  X,
  FileText,
} from 'lucide-react';

interface DepartmentSummary {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  headName: string | null;
  headPhone: string | null;
  headStaffCode: string | null;
  totalComplaints: number;
  resolvedComplaints: number;
  pendingComplaints: number;
  inProgressComplaints: number;
}

interface ComplaintRecord {
  id: string;
  ticket_number: string;
  department_id: string;
  citizen_name: string | null;
  citizen_phone: string | null;
  description: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  photo_url: string | null;
  status: string;
  created_at: string;
  department?: { name: string; icon: string } | null;
}

interface NearbyComplaint {
  id: string;
  ticket_number: string;
  description: string;
  address: string | null;
  status: string;
  distance_meters: number;
  latitude: number | null;
  longitude: number | null;
}

const COMMON_AREAS = [
  'All Areas',
  'Kothi Bazar',
  'Ganj',
  'Civil Lines',
  'Sadar Bazar',
  'Badora',
  'Nehru Park',
  'Railway Colony',
];

export const MunicipalAdministratorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();

  // Auth guard when accessed directly
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin', { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  // Primary data states
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [allComplaints, setAllComplaints] = useState<ComplaintRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Active filter states triggered by clicking card divs
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('All Areas');

  // Selected complaint detail modal
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRecord | null>(null);

  // PostGIS Nearby Radar states
  const [userLat, setUserLat] = useState<number>(21.9015); // Default Betul
  const [userLon, setUserLon] = useState<number>(77.9018);
  const [radiusMeters, setRadiusMeters] = useState<number>(5000);
  const [radarLoading, setRadarLoading] = useState(false);
  const [nearbyComplaints, setNearbyComplaints] = useState<NearbyComplaint[]>([]);
  const [radarError, setRadarError] = useState<string | null>(null);
  const [showRadarSection, setShowRadarSection] = useState(false);

  // Fetch full dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch departments
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (deptError) throw deptError;

      // 2. Fetch all complaints
      const { data: complaintsData, error: compError } = await supabase
        .from('complaints')
        .select(`
          id, ticket_number, department_id, citizen_name, citizen_phone,
          description, latitude, longitude, address, photo_url, status, created_at,
          department:department_id(name, icon)
        `)
        .order('created_at', { ascending: false });

      if (compError) throw compError;

      const complaintsList: ComplaintRecord[] = (complaintsData || []).map((c: any) => ({
        ...c,
        department: Array.isArray(c.department) ? c.department[0] : c.department,
      }));
      setAllComplaints(complaintsList);

      // 3. Fetch department heads / staff from user_profiles
      const { data: headsData } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone, staff_code, linked_department_id, role')
        .or('role.eq.department_head,role.eq.supervisor');

      // Map summary per department
      const summaries: DepartmentSummary[] = (deptData || []).map((d) => {
        const deptComplaints = complaintsList.filter((c) => c.department_id === d.id);
        const total = deptComplaints.length;
        const resolved = deptComplaints.filter((c) => c.status === 'resolved' || c.status === 'verified').length;
        const pending = deptComplaints.filter((c) => c.status === 'pending').length;
        const inProgress = deptComplaints.filter((c) => c.status === 'in_progress').length;

        const head = (headsData || []).find((h) => h.linked_department_id === d.id);

        return {
          id: d.id,
          name: d.name,
          slug: d.slug,
          icon: d.icon || '🏢',
          color: d.color || '#660033',
          headName: head?.full_name || null,
          headPhone: head?.phone || null,
          headStaffCode: head?.staff_code || null,
          totalComplaints: total,
          resolvedComplaints: resolved,
          pendingComplaints: pending,
          inProgressComplaints: inProgress,
        };
      });

      setDepartments(summaries);
    } catch (err: any) {
      console.error('Failed to load municipal dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // PostGIS Nearby Complaints trigger
  const runNearbyRadar = async () => {
    setRadarLoading(true);
    setRadarError(null);
    try {
      const { data, error } = await supabase.rpc('nearby_complaints', {
        user_lat: userLat,
        user_lon: userLon,
        radius_meters: radiusMeters,
      });

      if (error) {
        console.warn('PostGIS function error, falling back to client-side geo calculation:', error.message);
        // Fallback client-side calculation using haversine formula
        const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371e3; // metres
          const φ1 = (lat1 * Math.PI) / 180;
          const φ2 = (lat2 * Math.PI) / 180;
          const Δφ = ((lat2 - lat1) * Math.PI) / 180;
          const Δλ = ((lon2 - lon1) * Math.PI) / 180;
          const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };

        const calculated = allComplaints
          .filter((c) => c.latitude && c.longitude)
          .map((c) => {
            const dist = haversine(userLat, userLon, c.latitude!, c.longitude!);
            return {
              id: c.id,
              ticket_number: c.ticket_number,
              description: c.description,
              address: c.address,
              status: c.status,
              distance_meters: Math.round(dist),
              latitude: c.latitude,
              longitude: c.longitude,
            };
          })
          .filter((c) => c.distance_meters <= radiusMeters)
          .sort((a, b) => a.distance_meters - b.distance_meters);

        setNearbyComplaints(calculated);
        if (calculated.length === 0) {
          setRadarError(`No complaints found within ${Math.round(radiusMeters / 1000)}km radius.`);
        }
      } else {
        setNearbyComplaints(data || []);
      }
    } catch (err: any) {
      setRadarError(err.message || 'Error executing PostGIS nearby scan.');
    } finally {
      setRadarLoading(false);
    }
  };

  // Acquire current GPS location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(Number(pos.coords.latitude.toFixed(6)));
        setUserLon(Number(pos.coords.longitude.toFixed(6)));
      },
      (err) => {
        alert('Could not acquire current location: ' + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  // Metrics computation
  const totalCount = allComplaints.length;
  const pendingCount = allComplaints.filter((c) => c.status === 'pending').length;
  const inProgressCount = allComplaints.filter((c) => c.status === 'in_progress').length;
  const resolvedCount = allComplaints.filter((c) => c.status === 'resolved' || c.status === 'verified').length;
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  // Filter complaints list
  const filteredComplaints = allComplaints.filter((c) => {
    // Status filter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'resolved' && (c.status === 'resolved' || c.status === 'verified')) ||
      c.status === statusFilter;

    // Dept filter
    const matchesDept = selectedDeptId === 'all' || c.department_id === selectedDeptId;

    // Area filter
    const matchesArea =
      selectedArea === 'All Areas' ||
      (c.address && c.address.toLowerCase().includes(selectedArea.toLowerCase())) ||
      c.description.toLowerCase().includes(selectedArea.toLowerCase());

    // Search query
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.ticket_number.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.citizen_name && c.citizen_name.toLowerCase().includes(q)) ||
      (c.citizen_phone && c.citizen_phone.includes(q));

    return matchesStatus && matchesDept && matchesArea && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── TOP HEADER ── */}
      <div
        style={{
          background: 'var(--theme-component, #d9d9d9)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 22px',
          border: '1.5px solid var(--theme-component-border, #bfbfbf)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              color: '#fff',
            }}
          >
            🏛️
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: 'var(--gray-900)' }}>
              Municipal Administrator Console
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-600)' }}>
              City-wide Grievance Head Dashboard & PostGIS Locality Radar (Betul Municipal)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setShowRadarSection(!showRadarSection)}
            style={{
              background: showRadarSection ? 'var(--theme-primary, #660033)' : 'var(--theme-bg, #fff4e7)',
              color: showRadarSection ? '#fff' : 'var(--theme-primary, #660033)',
              border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              borderRadius: 'var(--radius-md)',
              padding: '9px 14px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'var(--transition)',
            }}
          >
            <Compass size={15} />
            {showRadarSection ? 'Hide GIS Radar' : '📍 PostGIS Radar'}
          </button>

          <button
            onClick={fetchDashboardData}
            style={{
              background: 'var(--theme-bg, #fff4e7)',
              border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              borderRadius: 'var(--radius-md)',
              padding: '9px 12px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── INTERACTIVE STAT CARDS (CLICK DIV TO FILTER & VIEW COMPLAINTS) ── */}
      <div>
        <p style={{ margin: '0 0 8px 4px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Platform Overview (Click any card to display filtered complaints)
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 12,
          }}
        >
          {/* Total Registered */}
          <div
            onClick={() => {
              setStatusFilter('all');
              setSelectedDeptId('all');
            }}
            style={{
              background: statusFilter === 'all' && selectedDeptId === 'all' ? 'var(--theme-primary, #660033)' : 'var(--theme-component, #d9d9d9)',
              color: statusFilter === 'all' && selectedDeptId === 'all' ? '#fff' : 'var(--gray-900)',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid',
              borderColor: statusFilter === 'all' && selectedDeptId === 'all' ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)',
              padding: '16px 18px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, opacity: 0.85 }}>Total Registered</span>
              <FileText size={18} />
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900 }}>{totalCount}</div>
            <div style={{ fontSize: '0.72rem', marginTop: 4, opacity: 0.8 }}>
              Click to view all complaints
            </div>
          </div>

          {/* Pending Resolution */}
          <div
            onClick={() => {
              setStatusFilter('pending');
              setSelectedDeptId('all');
            }}
            style={{
              background: statusFilter === 'pending' ? 'var(--theme-primary, #660033)' : 'var(--theme-component, #d9d9d9)',
              color: statusFilter === 'pending' ? '#fff' : 'var(--gray-900)',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid',
              borderColor: statusFilter === 'pending' ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)',
              padding: '16px 18px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, opacity: 0.85 }}>Pending Grievances</span>
              <Clock size={18} />
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900 }}>{pendingCount}</div>
            <div style={{ fontSize: '0.72rem', marginTop: 4, opacity: 0.8 }}>
              Click to view pending items
            </div>
          </div>

          {/* In Progress */}
          <div
            onClick={() => {
              setStatusFilter('in_progress');
              setSelectedDeptId('all');
            }}
            style={{
              background: statusFilter === 'in_progress' ? 'var(--theme-primary, #660033)' : 'var(--theme-component, #d9d9d9)',
              color: statusFilter === 'in_progress' ? '#fff' : 'var(--gray-900)',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid',
              borderColor: statusFilter === 'in_progress' ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)',
              padding: '16px 18px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, opacity: 0.85 }}>In Progress</span>
              <AlertCircle size={18} />
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900 }}>{inProgressCount}</div>
            <div style={{ fontSize: '0.72rem', marginTop: 4, opacity: 0.8 }}>
              Click to view assigned items
            </div>
          </div>

          {/* Resolved */}
          <div
            onClick={() => {
              setStatusFilter('resolved');
              setSelectedDeptId('all');
            }}
            style={{
              background: statusFilter === 'resolved' ? 'var(--theme-primary, #660033)' : 'var(--theme-component, #d9d9d9)',
              color: statusFilter === 'resolved' ? '#fff' : 'var(--gray-900)',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid',
              borderColor: statusFilter === 'resolved' ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)',
              padding: '16px 18px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, opacity: 0.85 }}>Resolved</span>
              <CheckCircle2 size={18} />
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900 }}>{resolvedCount}</div>
            <div style={{ fontSize: '0.72rem', marginTop: 4, opacity: 0.8 }}>
              Rate: {resolutionRate}% resolution
            </div>
          </div>

          {/* Total Departments */}
          <div
            onClick={() => {
              setSelectedDeptId('all');
            }}
            style={{
              background: 'var(--theme-component, #d9d9d9)',
              color: 'var(--gray-900)',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              padding: '16px 18px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, opacity: 0.85 }}>Departments</span>
              <Building2 size={18} />
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900 }}>{departments.length}</div>
            <div style={{ fontSize: '0.72rem', marginTop: 4, opacity: 0.8 }}>
              Municipal civic units
            </div>
          </div>
        </div>
      </div>

      {/* ── POSTGIS RADAR SECTION (TOGGLEABLE) ── */}
      {showRadarSection && (
        <div
          style={{
            background: 'var(--theme-component, #d9d9d9)',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--theme-component-border, #bfbfbf)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--gray-900)' }}>
                📍 PostGIS Nearby Complaints (Area Distance Radar)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                Uses PostgreSQL `public.nearby_complaints(user_lat, user_lon, radius_meters)` function.
              </p>
            </div>

            <button
              onClick={getCurrentLocation}
              style={{
                background: 'var(--theme-bg, #fff4e7)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                borderRadius: 'var(--radius-md)',
                padding: '7px 12px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--theme-primary, #660033)',
              }}
            >
              <MapPin size={14} /> Use My Current GPS
            </button>
          </div>

          {/* Coordinate Inputs & Radius */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, marginBottom: 4 }}>
                Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={userLat}
                onChange={(e) => setUserLat(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                  background: 'var(--theme-bg, #fff4e7)',
                  fontSize: '0.84rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, marginBottom: 4 }}>
                Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={userLon}
                onChange={(e) => setUserLon(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                  background: 'var(--theme-bg, #fff4e7)',
                  fontSize: '0.84rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, marginBottom: 4 }}>
                Search Radius
              </label>
              <select
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                  background: 'var(--theme-bg, #fff4e7)',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                <option value={1000}>1 Kilometer (1,000m)</option>
                <option value={2000}>2 Kilometers (2,000m)</option>
                <option value={5000}>5 Kilometers (5,000m)</option>
                <option value={10000}>10 Kilometers (10,000m)</option>
                <option value={25000}>25 Kilometers (25,000m)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={runNearbyRadar}
                disabled={radarLoading}
                style={{
                  width: '100%',
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'var(--primary-gradient)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Compass size={15} className={radarLoading ? 'animate-spin' : ''} />
                {radarLoading ? 'Scanning...' : 'Scan Nearby Area'}
              </button>
            </div>
          </div>

          {/* Radar Results */}
          {radarError && (
            <div style={{ fontSize: '0.8rem', color: '#b45309', background: '#fef3c7', padding: '8px 12px', borderRadius: 6 }}>
              {radarError}
            </div>
          )}

          {nearbyComplaints.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.88rem', fontWeight: 800 }}>
                Found {nearbyComplaints.length} nearby complaints within {radiusMeters / 1000} km:
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {nearbyComplaints.map((nc) => (
                  <div
                    key={nc.id}
                    style={{
                      background: 'var(--theme-bg, #fff4e7)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--theme-component-border, #bfbfbf)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--theme-primary, #660033)' }}>
                        #{nc.ticket_number}
                      </span>
                      <span
                        style={{
                          background: 'rgba(102,0,51,0.12)',
                          color: 'var(--theme-primary, #660033)',
                          borderRadius: 'var(--radius-full)',
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                        }}
                      >
                        📍 {nc.distance_meters}m away
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-800)', lineHeight: 1.4 }}>
                      {nc.description}
                    </p>

                    {nc.address && (
                      <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--gray-600)' }}>
                        {nc.address}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DEPARTMENT HEADS & SUMMARY (CLICK DIV TO FILTER) ── */}
      <div>
        <p style={{ margin: '0 0 8px 4px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Departments & Leadership (Click any department to view its complaints)
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {departments.map((dept) => {
            const isSelected = selectedDeptId === dept.id;
            return (
              <div
                key={dept.id}
                onClick={() => {
                  setSelectedDeptId(dept.id);
                  setStatusFilter('all');
                }}
                style={{
                  background: isSelected ? 'var(--theme-bg, #fff4e7)' : 'var(--theme-component, #d9d9d9)',
                  border: '2px solid',
                  borderColor: isSelected ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div>
                  {/* Dept Title */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.4rem' }}>{dept.icon}</span>
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                        {dept.name}
                      </h4>
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--theme-primary, #660033)' }}>
                        ● ACTIVE
                      </span>
                    )}
                  </div>

                  {/* Dept Head Information */}
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.4)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                      marginBottom: 12,
                      fontSize: '0.76rem',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: 'var(--gray-900)' }}>
                      Head: {dept.headName || 'Designated Dept Officer'}
                    </div>
                    {dept.headPhone && (
                      <div style={{ color: 'var(--theme-primary, #660033)', fontWeight: 700, marginTop: 2 }}>
                        📞 {dept.headPhone}
                      </div>
                    )}
                    {dept.headStaffCode && (
                      <div style={{ color: 'var(--gray-600)', fontSize: '0.7rem' }}>
                        Staff ID: {dept.headStaffCode}
                      </div>
                    )}
                  </div>
                </div>

                {/* Counters row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 8,
                    borderTop: '1px solid var(--theme-component-border, #bfbfbf)',
                    fontSize: '0.76rem',
                  }}
                >
                  <span>
                    Total: <b>{dept.totalComplaints}</b>
                  </span>
                  <span style={{ color: '#b45309' }}>
                    Pending: <b>{dept.pendingComplaints}</b>
                  </span>
                  <span style={{ color: '#15803d' }}>
                    Resolved: <b>{dept.resolvedComplaints}</b>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── REGISTERED COMPLAINTS VIEWER ── */}
      <div
        style={{
          background: 'var(--theme-component, #d9d9d9)',
          borderRadius: 'var(--radius-lg)',
          border: '1.5px solid var(--theme-component-border, #bfbfbf)',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* Section Header with Active Filter Pill */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: '0 0 2px', fontSize: '1.15rem', fontWeight: 900, color: 'var(--gray-900)' }}>
              Registered Complaints ({filteredComplaints.length})
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-600)' }}>
              Active filter: Status [<b>{statusFilter.toUpperCase()}</b>], Department [
              <b>{selectedDeptId === 'all' ? 'ALL' : departments.find((d) => d.id === selectedDeptId)?.name}</b>]
            </p>
          </div>

          {(statusFilter !== 'all' || selectedDeptId !== 'all' || selectedArea !== 'All Areas' || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setSelectedDeptId('all');
                setSelectedArea('All Areas');
                setSearchQuery('');
              }}
              style={{
                background: 'var(--theme-bg, #fff4e7)',
                border: '1px solid var(--theme-component-border, #bfbfbf)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                fontSize: '0.76rem',
                fontWeight: 800,
                color: 'var(--theme-primary, #660033)',
                cursor: 'pointer',
              }}
            >
              Reset Filters ↺
            </button>
          )}
        </div>

        {/* Search & Area Filter Bar */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket #, citizen name, phone, or address keyword..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 34px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                background: 'var(--theme-bg, #fff4e7)',
                fontSize: '0.84rem',
                color: 'var(--gray-900)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Area Selector */}
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              background: 'var(--theme-bg, #fff4e7)',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--gray-800)',
              cursor: 'pointer',
            }}
          >
            {COMMON_AREAS.map((a) => (
              <option key={a} value={a}>
                📍 {a}
              </option>
            ))}
          </select>
        </div>

        {/* Complaints Table */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="shimmer"
                style={{ height: 60, borderRadius: 'var(--radius-md)', background: 'var(--theme-component, #d9d9d9)' }}
              />
            ))}
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div
            style={{
              background: 'var(--theme-bg, #fff4e7)',
              borderRadius: 'var(--radius-md)',
              padding: '30px 16px',
              textAlign: 'center',
              border: '1.5px dashed var(--theme-component-border, #bfbfbf)',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--gray-600)' }}>
              No registered complaints match the current filter selection.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 600, overflowY: 'auto' }}>
            {filteredComplaints.map((c) => {
              const isResolved = c.status === 'resolved' || c.status === 'verified';
              const isPending = c.status === 'pending';

              return (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--theme-bg, #fff4e7)',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                    padding: '12px 16px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 240, flex: 1 }}>
                    <span style={{ fontSize: '1.3rem' }}>{c.department?.icon || '🏢'}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--theme-primary, #660033)' }}>
                          #{c.ticket_number}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-800)' }}>
                          {c.department?.name}
                        </span>
                        <span
                          style={{
                            background: isResolved ? '#dcfce7' : isPending ? '#fef3c7' : '#e0e7ff',
                            color: isResolved ? '#15803d' : isPending ? '#b45309' : '#3730a3',
                            borderRadius: 'var(--radius-full)',
                            padding: '1px 8px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                          }}
                        >
                          {c.status}
                        </span>
                      </div>

                      <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--gray-800)', lineHeight: 1.4 }}>
                        {c.description}
                      </p>

                      <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.74rem', color: 'var(--gray-600)' }}>
                        {c.citizen_name && <span>Citizen: <b>{c.citizen_name}</b></span>}
                        {c.citizen_phone && <span>📞 {c.citizen_phone}</span>}
                        {c.address && <span>📍 {c.address}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>

                    <button
                      onClick={() => setSelectedComplaint(c)}
                      style={{
                        background: 'var(--primary-gradient)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 12px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Eye size={13} /> View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── COMPLAINT DETAIL MODAL ── */}
      {selectedComplaint && (
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
            if (e.target === e.currentTarget) setSelectedComplaint(null);
          }}
        >
          <div
            style={{
              background: 'var(--theme-component, #d9d9d9)',
              borderRadius: 'var(--radius-xl)',
              border: '2px solid var(--theme-component-border, #bfbfbf)',
              width: '100%',
              maxWidth: 540,
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
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
                  Ticket #{selectedComplaint.ticket_number}
                </h3>
                <p style={{ margin: 0, fontSize: '0.74rem', color: 'rgba(255,255,255,0.8)' }}>
                  {selectedComplaint.department?.name} Department
                </p>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
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

            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedComplaint.photo_url && (
                <div style={{ borderRadius: 8, overflow: 'hidden', maxHeight: 240, border: '1px solid #bfbfbf' }}>
                  <img
                    src={selectedComplaint.photo_url}
                    alt="Complaint"
                    style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }}
                  />
                </div>
              )}

              <div style={{ background: 'var(--theme-bg, #fff4e7)', padding: '12px 14px', borderRadius: 8, border: '1px solid #bfbfbf' }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: 4 }}>Description</div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--gray-800)', lineHeight: 1.5 }}>
                  {selectedComplaint.description}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.8rem' }}>
                <div><b>Citizen Name:</b> {selectedComplaint.citizen_name || 'N/A'}</div>
                <div><b>Phone:</b> {selectedComplaint.citizen_phone || 'N/A'}</div>
                <div><b>Status:</b> {selectedComplaint.status.toUpperCase()}</div>
                <div><b>Date:</b> {new Date(selectedComplaint.created_at).toLocaleString()}</div>
                {selectedComplaint.address && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <b>Address:</b> {selectedComplaint.address}
                  </div>
                )}
                {selectedComplaint.latitude && selectedComplaint.longitude && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <b>GPS Coordinates:</b> {selectedComplaint.latitude}, {selectedComplaint.longitude}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MunicipalAdministratorDashboard;
