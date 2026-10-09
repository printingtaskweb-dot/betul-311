import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { LocalNews, LocalNewsCategory } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useStorage } from '../hooks/useStorage';
import {
  MessageSquarePlus,
  Send,
  Heart,
  MapPin,
  Clock,
  Sparkles,
  AlertTriangle,
  Newspaper,
  Calendar,
  Lightbulb,
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

const CATEGORY_META: Record<LocalNewsCategory, { label: string; labelHi: string; icon: React.ReactNode; color: string }> = {
  news: { label: 'Local News', labelHi: 'स्थानीय समाचार', icon: <Newspaper size={14} />, color: '#660033' },
  alert: { label: 'Alert / Advisory', labelHi: 'सावधानी / सूचना', icon: <AlertTriangle size={14} />, color: '#8b0000' },
  event: { label: 'Community Event', labelHi: 'सामुदायिक कार्यक्रम', icon: <Calendar size={14} />, color: '#660033' },
  thought: { label: 'Citizen Thought', labelHi: 'नागरिक विचार', icon: <Lightbulb size={14} />, color: '#660033' },
  general: { label: 'General Update', labelHi: 'सामान्य अपडेट', icon: <Sparkles size={14} />, color: '#4d0026' },
};

const POPULAR_AREAS = [
  'All Areas',
  'Kothi Bazar',
  'Ganj',
  'Civil Lines',
  'Sadar Bazar',
  'Badora',
  'Malviya Ward',
  'Nehru Park Area',
  'Railway Colony',
];

export const NearbyNewsSection: React.FC = () => {
  const { language, profile } = useAuth();
  const { uploadPhoto, uploading } = useStorage();

  const [posts, setPosts] = useState<LocalNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState('All Areas');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  // Form State
  const [authorName, setAuthorName] = useState(profile?.full_name || '');
  const [authorPhone, setAuthorPhone] = useState(profile?.phone || '');
  const [area, setArea] = useState('');
  const [category, setCategory] = useState<LocalNewsCategory>('thought');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync author name if profile loads
  useEffect(() => {
    if (profile?.full_name && !authorName) setAuthorName(profile.full_name);
    if (profile?.phone && !authorPhone) setAuthorPhone(profile.phone);
  }, [profile]);

  // Fetch approved posts
  const fetchApprovedPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('local_news')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        // Table might not exist yet if user hasn't run sql script
        console.warn('Could not fetch local_news (table may not be created yet):', error.message);
        setPosts([]);
      } else {
        setPosts(data || []);
      }
    } catch (err) {
      console.error('Error fetching approved news:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedPosts();
  }, []);

  const handleLike = async (postId: string) => {
    if (likedPosts[postId]) return; // Already liked in this session

    // Optimistic UI update
    setLikedPosts((prev) => ({ ...prev, [postId]: true }));
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p))
    );

    try {
      // Try calling RPC if exists
      const { error: rpcError } = await supabase.rpc('increment_local_news_likes', { news_id: postId });
      if (rpcError) {
        // Fallback: direct update
        const currentPost = posts.find((p) => p.id === postId);
        if (currentPost) {
          await supabase
            .from('local_news')
            .update({ likes_count: (currentPost.likes_count || 0) + 1 })
            .eq('id', postId);
        }
      }
    } catch (err) {
      console.warn('Could not increment like:', err);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !area.trim() || !content.trim()) {
      setErrorMsg('Please enter your Name, Area/Locality, and your Thought/News.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      let uploadedUrl: string | null = null;
      if (photoFile) {
        uploadedUrl = await uploadPhoto(photoFile);
      }

      const { error } = await supabase.from('local_news').insert({
        author_name: authorName.trim(),
        author_phone: authorPhone.trim() || null,
        area: area.trim(),
        category,
        title: title.trim() || null,
        content: content.trim(),
        photo_url: uploadedUrl,
        status: 'pending', // Strictly submitted as pending for Admin verification!
      });

      if (error) {
        throw error;
      }

      setSubmittedSuccess(true);
      // Reset form
      setTitle('');
      setContent('');
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err: any) {
      console.error('Submit news error:', err);
      setErrorMsg(
        err.message?.includes('relation "public.local_news" does not exist')
          ? 'Notice: Database table "local_news" not found yet. Please run the provided SQL in Supabase SQL Editor.'
          : err.message || 'Failed to submit thought. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    const matchesArea =
      selectedArea === 'All Areas' || post.area.toLowerCase().includes(selectedArea.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    return matchesArea && matchesCategory;
  });

  const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return language === 'hi' ? 'अभी' : 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ${language === 'hi' ? 'पहले' : 'ago'}`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ${language === 'hi' ? 'पहले' : 'ago'}`;
    return `${Math.floor(diffSec / 86400)}d ${language === 'hi' ? 'पहले' : 'ago'}`;
  };

  return (
    <section className="app-container" style={{ marginTop: 28, marginBottom: 32 }}>
      {/* ── Section Header ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(102,0,51,0.1)',
                color: 'var(--theme-primary, #660033)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <ShieldCheck size={13} />
              {language === 'hi' ? 'सत्यापित नागरिक मंच' : 'ADMIN MODERATED COMMUNITY FEED'}
            </span>
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(1.2rem, 1.8vw, 1.6rem)',
              fontWeight: 900,
              color: 'var(--gray-900)',
              letterSpacing: '-0.02em',
            }}
          >
            📢 {language === 'hi' ? 'आस-पास के समाचार और विचार' : 'Nearby Area News & Community Thoughts'}
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--gray-600)', fontSize: '0.85rem' }}>
            {language === 'hi'
              ? 'अपने इलाके की गतिविधियां और विचार साझा करें। व्यवस्थापक द्वारा अनुमोदन के बाद ही सार्वजनिक दिखता है।'
              : 'Share local updates & civic thoughts from your ward. Displayed publicly upon municipal admin verification.'}
          </p>
        </div>

        {/* Share Button & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => fetchApprovedPosts()}
            style={{
              background: 'var(--theme-component, #d9d9d9)',
              border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              color: 'var(--gray-700)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.82rem',
              fontWeight: 700,
              transition: 'var(--transition)',
            }}
            title="Refresh news"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            {language === 'hi' ? 'ताज़ा करें' : 'Refresh'}
          </button>

          <button
            onClick={() => {
              setSubmittedSuccess(false);
              setErrorMsg(null);
              setIsModalOpen(true);
            }}
            style={{
              background: 'var(--primary-gradient, linear-gradient(135deg, #660033 0%, #800040 100%))',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '9px 18px',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(102,0,51,0.25)',
              transition: 'var(--transition)',
            }}
          >
            <MessageSquarePlus size={16} />
            {language === 'hi' ? 'विचार / समाचार साझा करें' : 'Share Local Thought / News'}
          </button>
        </div>
      </div>

      {/* ── Filters (Area & Category) ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          background: 'var(--theme-component, #d9d9d9)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          border: '1.5px solid var(--theme-component-border, #bfbfbf)',
          marginBottom: 18,
        }}
      >
        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--gray-600)', flexShrink: 0 }}>
            {language === 'hi' ? 'श्रेणी:' : 'Category:'}
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid',
              borderColor: selectedCategory === 'all' ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)',
              background: selectedCategory === 'all' ? 'var(--theme-primary, #660033)' : 'var(--theme-bg, #fff4e7)',
              color: selectedCategory === 'all' ? '#fff' : 'var(--gray-800)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {language === 'hi' ? 'सभी' : 'All'}
          </button>
          {(Object.keys(CATEGORY_META) as LocalNewsCategory[]).map((cat) => {
            const meta = CATEGORY_META[cat];
            const isSel = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid',
                  borderColor: isSel ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)',
                  background: isSel ? 'var(--theme-primary, #660033)' : 'var(--theme-bg, #fff4e7)',
                  color: isSel ? '#fff' : 'var(--gray-800)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {meta.icon}
                {language === 'hi' ? meta.labelHi : meta.label}
              </button>
            );
          })}
        </div>

        {/* Locality Quick Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--gray-600)', flexShrink: 0 }}>
            <MapPin size={13} style={{ display: 'inline', marginRight: 3 }} />
            {language === 'hi' ? 'क्षेत्र:' : 'Area:'}
          </span>
          {POPULAR_AREAS.map((a) => {
            const isSel = selectedArea === a;
            return (
              <button
                key={a}
                onClick={() => setSelectedArea(a)}
                style={{
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid',
                  borderColor: isSel ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)',
                  background: isSel ? 'var(--theme-primary, #660033)' : 'transparent',
                  color: isSel ? '#fff' : 'var(--gray-700)',
                  fontSize: '0.75rem',
                  fontWeight: isSel ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {a}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Posts Grid ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="shimmer"
              style={{
                height: 180,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--theme-component, #d9d9d9)',
              }}
            />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div
          style={{
            background: 'var(--theme-component, #d9d9d9)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px 20px',
            textAlign: 'center',
            border: '1.5px dashed var(--theme-component-border, #bfbfbf)',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>✍️</div>
          <h3 style={{ margin: '0 0 6px', fontWeight: 800, color: 'var(--gray-900)', fontSize: '1.1rem' }}>
            {language === 'hi' ? 'अभी कोई स्वीकृत समाचार या विचार नहीं है' : 'No Approved Local News Yet'}
          </h3>
          <p style={{ margin: '0 0 16px', color: 'var(--gray-600)', fontSize: '0.85rem', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
            {language === 'hi'
              ? 'अपने वार्ड या क्षेत्र का पहला विचार या सूचना साझा करें! व्यवस्थापक द्वारा अनुमोदन के बाद यह यहाँ दिखाई देगा।'
              : 'Be the first to share a positive thought, local update, or community alert from your ward!'}
          </p>
          <button
            onClick={() => {
              setSubmittedSuccess(false);
              setErrorMsg(null);
              setIsModalOpen(true);
            }}
            style={{
              background: 'var(--primary-gradient)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '8px 20px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <MessageSquarePlus size={16} />
            {language === 'hi' ? 'पहला विचार पोस्ट करें' : 'Post First Thought'}
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {filteredPosts.map((post) => {
            const meta = CATEGORY_META[post.category] || CATEGORY_META.general;
            const isLiked = likedPosts[post.id];

            return (
              <article
                key={post.id}
                className="card-hover"
                style={{
                  background: 'var(--theme-component, #d9d9d9)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div>
                  {/* Card Top: Area & Category Badges */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'var(--theme-bg, #fff4e7)',
                        border: '1px solid var(--theme-component-border, #bfbfbf)',
                        color: 'var(--theme-primary, #660033)',
                        borderRadius: 'var(--radius-full)',
                        padding: '3px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                      }}
                    >
                      <MapPin size={12} />
                      {post.area}
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'rgba(102,0,51,0.08)',
                        color: 'var(--theme-primary, #660033)',
                        borderRadius: 'var(--radius-full)',
                        padding: '3px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}
                    >
                      {meta.icon}
                      {language === 'hi' ? meta.labelHi : meta.label}
                    </span>
                  </div>

                  {/* Title (if present) */}
                  {post.title && (
                    <h3
                      style={{
                        margin: '0 0 6px',
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: 'var(--gray-900)',
                        lineHeight: 1.3,
                      }}
                    >
                      {post.title}
                    </h3>
                  )}

                  {/* Message Content */}
                  <p
                    style={{
                      margin: '0 0 12px',
                      fontSize: '0.88rem',
                      color: 'var(--gray-800)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {post.content}
                  </p>

                  {/* Attached Photo */}
                  {post.photo_url && (
                    <div
                      style={{
                        marginBottom: 12,
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        border: '1px solid var(--theme-component-border, #bfbfbf)',
                        maxHeight: 220,
                        background: '#000',
                      }}
                    >
                      <img
                        src={post.photo_url}
                        alt="Local thought attachment"
                        style={{
                          width: '100%',
                          height: '100%',
                          maxHeight: 220,
                          objectFit: 'cover',
                          display: 'block',
                        }}
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>

                {/* Footer: Author, Timestamp, Likes */}
                <div
                  style={{
                    paddingTop: 10,
                    borderTop: '1px solid var(--theme-component-border, #bfbfbf)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    fontSize: '0.76rem',
                    color: 'var(--gray-600)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'var(--primary-gradient)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                      }}
                    >
                      {post.author_name ? post.author_name[0].toUpperCase() : 'C'}
                    </div>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>
                        {post.author_name}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 6 }}>
                        <Clock size={11} />
                        {timeAgo(post.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Like Button */}
                  <button
                    onClick={() => handleLike(post.id)}
                    style={{
                      background: isLiked ? 'rgba(102,0,51,0.15)' : 'var(--theme-bg, #fff4e7)',
                      border: '1px solid var(--theme-component-border, #bfbfbf)',
                      borderRadius: 'var(--radius-full)',
                      padding: '4px 10px',
                      cursor: isLiked ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: isLiked ? 'var(--theme-primary, #660033)' : 'var(--gray-600)',
                      fontWeight: 700,
                      fontSize: '0.76rem',
                      transition: 'var(--transition)',
                    }}
                    title="Like this thought"
                  >
                    <Heart
                      size={13}
                      fill={isLiked ? 'var(--theme-primary, #660033)' : 'none'}
                      color={isLiked ? 'var(--theme-primary, #660033)' : 'currentColor'}
                    />
                    <span>{post.likes_count || 0}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Modal Dialog: Share Local Thought / News ── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setIsModalOpen(false);
          }}
        >
          <div
            style={{
              background: 'var(--theme-component, #d9d9d9)',
              borderRadius: 'var(--radius-xl)',
              border: '2px solid var(--theme-component-border, #bfbfbf)',
              width: '100%',
              maxWidth: 540,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
              position: 'relative',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'var(--header-gradient, linear-gradient(135deg, #4d0026 0%, #660033 50%, #800040 100%))',
                padding: '16px 20px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTopLeftRadius: 'calc(var(--radius-xl) - 2px)',
                borderTopRightRadius: 'calc(var(--radius-xl) - 2px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.4rem' }}>✍️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                    {language === 'hi' ? 'स्थानीय विचार या समाचार साझा करें' : 'Share Local Thought or News'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)' }}>
                    {language === 'hi' ? 'प्रशासनिक अनुमोदन के बाद प्रदर्शित होगा' : 'Moderated & Verified before public display'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => !submitting && setIsModalOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '20px' }}>
              {submittedSuccess ? (
                <div style={{ textAlign: 'center', padding: '24px 8px' }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: 'rgba(102,0,51,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 14px',
                      color: 'var(--theme-primary, #660033)',
                    }}
                  >
                    <CheckCircle2 size={36} />
                  </div>
                  <h4 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                    {language === 'hi' ? 'विचार सफलतापूर्वक प्राप्त हुआ!' : 'Submission Received for Review!'}
                  </h4>
                  <p style={{ margin: '0 0 20px', color: 'var(--gray-700)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    {language === 'hi'
                      ? 'धन्यवाद! आपकी पोस्ट प्रशासनिक समीक्षा (Admin Review) के लिए जमा हो गई है। नगर निगम एडमिन द्वारा स्वीकृति मिलने के बाद यह तुरंत सार्वजनिक बोर्ड पर दिखाई देगी।'
                      : 'Thank you! Your post has been submitted. It will become visible on the public feed immediately once reviewed and approved by the municipal admin team.'}
                  </p>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      background: 'var(--primary-gradient)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 24px',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'hi' ? 'ठीक है (Close)' : 'Done'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Notice Banner */}
                  <div
                    style={{
                      background: 'var(--theme-bg, #fff4e7)',
                      border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: '0.8rem',
                      color: 'var(--theme-primary, #660033)',
                      fontWeight: 600,
                    }}
                  >
                    <ShieldCheck size={20} style={{ flexShrink: 0 }} />
                    <span>
                      {language === 'hi'
                        ? '🛡️ सुरक्षा नियम: पोस्ट सीधे लाइव नहीं होगी। एडमिन द्वारा अनुमोदन के बाद ही जनसामान्य को दिखेगी।'
                        : '🛡️ Moderation Note: Submissions are held in pending queue and made public only after admin approval.'}
                    </span>
                  </div>

                  {errorMsg && (
                    <div
                      style={{
                        background: 'rgba(139,0,0,0.1)',
                        border: '1.5px solid #8b0000',
                        color: '#8b0000',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                      }}
                    >
                      {errorMsg}
                    </div>
                  )}

                  {/* Name and Phone */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: 4, color: 'var(--gray-700)' }}>
                        {language === 'hi' ? 'आपका नाम *' : 'Your Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="e.g. Ramesh Verma"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                          background: 'var(--theme-bg, #fff4e7)',
                          fontSize: '0.85rem',
                          color: 'var(--gray-900)',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: 4, color: 'var(--gray-700)' }}>
                        {language === 'hi' ? 'मोबाइल नंबर (वैकल्पिक)' : 'Mobile Phone (Optional)'}
                      </label>
                      <input
                        type="tel"
                        value={authorPhone}
                        onChange={(e) => setAuthorPhone(e.target.value)}
                        placeholder="10-digit mobile"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                          background: 'var(--theme-bg, #fff4e7)',
                          fontSize: '0.85rem',
                          color: 'var(--gray-900)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Area / Locality */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: 4, color: 'var(--gray-700)' }}>
                      <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />
                      {language === 'hi' ? 'इलाका / वार्ड / क्षेत्र *' : 'Area / Locality / Ward *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Kothi Bazar, Ganj Ward 12, Civil Lines..."
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                        background: 'var(--theme-bg, #fff4e7)',
                        fontSize: '0.85rem',
                        color: 'var(--gray-900)',
                      }}
                    />
                  </div>

                  {/* Category Picker */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: 4, color: 'var(--gray-700)' }}>
                      {language === 'hi' ? 'प्रकार चुनें' : 'Post Category'}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6 }}>
                      {(Object.keys(CATEGORY_META) as LocalNewsCategory[]).map((cat) => {
                        const meta = CATEGORY_META[cat];
                        const isSel = category === cat;
                        return (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => setCategory(cat)}
                            style={{
                              padding: '7px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1.5px solid',
                              borderColor: isSel ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)',
                              background: isSel ? 'var(--theme-primary, #660033)' : 'var(--theme-bg, #fff4e7)',
                              color: isSel ? '#fff' : 'var(--gray-800)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              justifyContent: 'center',
                            }}
                          >
                            {meta.icon}
                            {language === 'hi' ? meta.labelHi : meta.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional Title */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: 4, color: 'var(--gray-700)' }}>
                      {language === 'hi' ? 'शीर्षक (वैकल्पिक)' : 'Heading / Title (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Cleanliness awareness drive this Sunday"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                        background: 'var(--theme-bg, #fff4e7)',
                        fontSize: '0.85rem',
                        color: 'var(--gray-900)',
                      }}
                    />
                  </div>

                  {/* Content / Thought */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: 4, color: 'var(--gray-700)' }}>
                      {language === 'hi' ? 'आपका विचार या स्थानीय समाचार *' : 'Your Thought or News Details *'}
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your observation, civic idea, event notice or neighborhood update here..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                        background: 'var(--theme-bg, #fff4e7)',
                        fontSize: '0.85rem',
                        color: 'var(--gray-900)',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  {/* Optional Photo Upload */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: 4, color: 'var(--gray-700)' }}>
                      <ImageIcon size={13} style={{ display: 'inline', marginRight: 4 }} />
                      {language === 'hi' ? 'तस्वीर जोड़ें (वैकल्पिक)' : 'Attach Photo (Optional)'}
                    </label>

                    {photoPreview ? (
                      <div
                        style={{
                          position: 'relative',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                          maxHeight: 160,
                        }}
                      >
                        <img
                          src={photoPreview}
                          alt="Upload preview"
                          style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview(null);
                          }}
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            background: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: 28,
                            height: 28,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label
                        style={{
                          border: '1.5px dashed var(--theme-component-border, #bfbfbf)',
                          background: 'var(--theme-bg, #fff4e7)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: 'var(--theme-primary, #660033)',
                        }}
                      >
                        <Upload size={16} />
                        <span>{language === 'hi' ? 'गैलरी / कैमरा से तस्वीर चुनें' : 'Choose Photo (PNG / JPG)'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      disabled={submitting}
                      style={{
                        padding: '9px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                        background: 'transparent',
                        color: 'var(--gray-700)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                    </button>

                    <button
                      type="submit"
                      disabled={submitting || uploading}
                      style={{
                        padding: '9px 22px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: 'var(--primary-gradient)',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        opacity: submitting ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: 'var(--shadow-md)',
                      }}
                    >
                      <Send size={15} />
                      {submitting || uploading
                        ? (language === 'hi' ? 'भेजा जा रहा है...' : 'Submitting for Review...')
                        : (language === 'hi' ? 'समीक्षा हेतु भेजें' : 'Submit for Admin Review')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default NearbyNewsSection;
