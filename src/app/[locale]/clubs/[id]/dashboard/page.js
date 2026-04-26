'use client';
import { useState, useEffect, use, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useRouter } from '@/i18n/routing';
import { 
  Users, Trophy, Flame, Check, X, Settings, UserX, UserPlus, 
  Megaphone, Settings2, Activity, Globe, Trash2, Save, 
  LayoutDashboard, MessageSquare, ChevronLeft, AlertCircle, 
  Loader2, Info, Upload, ImageIcon, Camera
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { 
  fetchClubById, 
  fetchClubMembers, 
  fetchClubApplications, 
  updateApplicationStatus, 
  updateClubProfile,
  fetchClubAnnouncements,
  postClubAnnouncement,
  deleteClubAnnouncement,
  updateMemberRole,
  removeMember,
  uploadClubImage,
  removeClubImage
} from '@/lib/dataService';
import styles from './dashboard.module.css';

// ─── Image Upload Widget ───────────────────────────────────────────────────────
function ImageUploadWidget({ clubId, currentUrl, imageType, label, onSuccess, onError }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || null);

  // Sync preview when parent club data refreshes
  useEffect(() => { setPreview(currentUrl || null); }, [currentUrl]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local preview
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    setUploading(true);
    try {
      const { url, club } = await uploadClubImage(clubId, file, imageType);
      setPreview(url);
      onSuccess(club, `تم رفع ${label} بنجاح`);
    } catch (err) {
      console.error(`[ImageUpload] ${imageType} upload error:`, err);
      setPreview(currentUrl || null); // revert preview on failure
      onError(err.message || `فشل رفع ${label}`);
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!preview) return;
    setUploading(true);
    try {
      const updatedClub = await removeClubImage(clubId, imageType);
      setPreview(null);
      onSuccess(updatedClub, `تم حذف ${label}`);
    } catch (err) {
      onError(err.message || `فشل حذف ${label}`);
    } finally {
      setUploading(false);
    }
  };

  const isLogo = imageType === 'logo';

  return (
    <div className={styles.imageWidget}>
      <label className={styles.imageLabel}>{label}</label>
      <div className={`${styles.imagePreviewBox} ${isLogo ? styles.logoPreviewBox : styles.coverPreviewBox}`}>
        {preview ? (
          <img src={preview} alt={label} className={isLogo ? styles.previewLogo : styles.previewCover} />
        ) : (
          <div className={styles.previewPlaceholder}>
            {isLogo ? <ImageIcon size={36} opacity={0.3} /> : <Camera size={36} opacity={0.3} />}
            <span>{`لا توجد ${label}`}</span>
          </div>
        )}

        {uploading && (
          <div className={styles.uploadingOverlay}>
            <Loader2 size={30} className={styles.spinnerIcon} />
          </div>
        )}
      </div>

      <div className={styles.imageActions}>
        <button
          className={styles.btnUpload}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload size={16} />
          {preview ? 'تغيير' : 'رفع'} {label}
        </button>
        {preview && (
          <button
            className={styles.btnRemoveImg}
            onClick={handleRemove}
            disabled={uploading}
          >
            <Trash2 size={16} /> حذف
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <p className={styles.imageHint}>JPG، PNG، WebP أو GIF • الحد الأقصى 5MB</p>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function ClubManagementDashboard({ params }) {
  const resolvedParams = use(params);
  const clubId = resolvedParams.id;
  const router = useRouter();
  
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState('checking');
  
  const [activeTab, setActiveTab] = useState('overview'); 
  const [activeAppTab, setActiveAppTab] = useState('pending');

  const [editForm, setEditForm] = useState({});
  const [newAnn, setNewAnn] = useState({ title: '', content: '', type: 'info' });
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const showToast = (message, type = 'info') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 4500);
  };

  useEffect(() => {
    let isMounted = true;
    let realtimeChannel = null;
    
    async function auditPermissions() {
      const startTime = performance.now();
      if (isMounted) setLoading(true);
      
      console.group(`[Dashboard-Auth-Audit] ID: ${clubId}`);
      try {
        let user = null;
        try {
          const { data } = await supabase.auth.getUser();
          user = data?.user;
        } catch (authErr) {
          if (authErr.message?.includes('Lock broken')) {
            const { data: { session } } = await supabase.auth.getSession();
            user = session?.user;
          } else {
            throw authErr;
          }
        }

        if (!isMounted) return;

        if (!user) {
          console.error("[Dashboard] No session. Redirecting to auth.");
          setAuthStatus('unauthorized');
          router.push('/auth');
          return;
        }

        // Primary lookup: by club UUID
        let clubData = await fetchClubById(clubId);
        // Fallback: if RLS hides the row for non-members, try owner lookup using the current user's ID
        if (!clubData && user) clubData = await fetchClubById(user.id, true);

        if (!isMounted) return;
        if (!clubData) {
          console.error(`[Dashboard] Club not found for ID: ${clubId}`);
          setAuthStatus('unauthorized');
          return;
        }

        // Role check
        const membersData = await fetchClubMembers(clubData.id);
        const userMemberRecord = membersData.find(m => m.user_id === user.id);
        const isDirectOwner = (clubData.owner_user_id === user.id);
        const roleInMemberTable = userMemberRecord?.role?.toLowerCase() || 'none';
        const isManager = ['owner', 'admin', 'club_admin'].includes(roleInMemberTable);

        if (!isMounted) return;

        if (isDirectOwner || isManager) {
          console.log(`[Dashboard] Access GRANTED — ${isDirectOwner ? 'owner' : roleInMemberTable}`);
          setClub(clubData);
          setEditForm(clubData);
          setMembers(membersData);
          
          const [annData, appsData] = await Promise.all([
            fetchClubAnnouncements(clubData.id),
            fetchClubApplications(clubData.id),   // fetch ALL statuses
          ]);
          
          if (!isMounted) return;

          setAnnouncements(annData);
          setApplications(appsData);
          setAuthStatus('authorized');

          console.log(`[Dashboard] Loaded ${appsData.length} total applications (${appsData.filter(a => a.status === 'pending').length} pending)`);
          console.log(`[Dashboard] Auth + data fetch done in ${(performance.now() - startTime).toFixed(2)}ms`);

          // Realtime subscription for new applications
          realtimeChannel = supabase
            .channel(`dashboard_apps_${clubData.id}`)
            .on('postgres_changes', { 
              event: '*', 
              schema: 'public', 
              table: 'club_applications',
              filter: `club_id=eq.${clubData.id}` 
            }, async () => {
              const freshApps = await fetchClubApplications(clubData.id);
              if (isMounted) setApplications(freshApps);
            })
            .subscribe();
        } else {
          console.error(`[Dashboard] Access DENIED for User ${user.id}`);
          setAuthStatus('unauthorized');
          setTimeout(() => { if (isMounted) router.push(`/clubs/${clubId}`); }, 3000);
        }
      } catch (err) {
        console.error(`[Dashboard] FATAL Error:`, err.message || err);
        if (isMounted) setAuthStatus('unauthorized');
      } finally {
        if (isMounted) setLoading(false);
        console.groupEnd();
      }
    }
    
    auditPermissions();
    return () => {
      isMounted = false;
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, [clubId, router]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleUpdateProfile = async () => {
    setSubmissionLoading(true);
    try {
      // Don't include image fields in the text-form save — images have their own upload
      const { logo_url, cover_image_url, banner_url, ...formFields } = editForm;
      const updated = await updateClubProfile(club.id, formFields);
      setClub(prev => ({ ...prev, ...updated }));
      setEditForm(prev => ({ ...prev, ...updated }));
      showToast('تم تحديث بيانات النادي بنجاح', 'success');
    } catch (err) {
      showToast('فشل تحديث البيانات: ' + (err.message || ''), 'error');
    } finally {
      setSubmissionLoading(false);
    }
  };

  // Called by ImageUploadWidget on success
  const handleImageSuccess = (updatedClub, message) => {
    setClub(updatedClub);
    setEditForm(updatedClub);
    showToast(message, 'success');
  };

  const handleImageError = (message) => {
    showToast(message, 'error');
  };

  const handlePostAnn = async () => {
    if (!newAnn.title || !newAnn.content) return showToast('يرجى إكمال بيانات الإعلان', 'error');
    setSubmissionLoading(true);
    try {
      const ann = await postClubAnnouncement({ ...newAnn, club_id: club.id });
      setAnnouncements([ann, ...announcements]);
      setNewAnn({ title: '', content: '', type: 'info' });
      showToast('تم نشر الإعلان بنجاح', 'success');
    } catch (err) {
      showToast('فشل نشر الإعلان', 'error');
    } finally {
      setSubmissionLoading(false);
    }
  };

  const handleMemberRole = async (memberId, role) => {
    try {
      await updateMemberRole(memberId, role);
      setMembers(members.map(m => m.id === memberId ? { ...m, role } : m));
      showToast('تم تحديث رتبة اللاعب', 'success');
    } catch (err) {
      showToast('فشل تحديث الرتبة', 'error');
    }
  };

  const handleKickMember = async (memberId) => {
    if (!window.confirm("هل أنت متأكد من طرد هذا اللاعب؟")) return;
    try {
      await removeMember(memberId);
      setMembers(members.filter(m => m.id !== memberId));
      showToast('تم حذف اللاعب من التشكيلة', 'success');
    } catch (err) {
      showToast('فشل طرد اللاعب', 'error');
    }
  };

  // FIX: was passing 'approved'/'rejected'; now passes 'accepted'/'rejected' to match DB schema
  const handleReview = async (appId, decision) => {
    const newStatus = decision === 'accept' ? 'accepted' : 'rejected';
    const previousApps = [...applications];
    
    // Optimistic update
    setApplications(prev => prev.map(app => 
      app.id === appId ? { ...app, status: newStatus, reviewed_at: new Date().toISOString() } : app
    ));

    try {
      await updateApplicationStatus(appId, newStatus);
      const msg = newStatus === 'accepted' ? 'تم قبول اللاعب في النادي ✓' : 'تم رفض الطلب';
      showToast(msg, newStatus === 'accepted' ? 'success' : 'info');
      
      // Refresh members list if accepted
      if (newStatus === 'accepted') {
        const freshMembers = await fetchClubMembers(club.id);
        setMembers(freshMembers);
      }
    } catch (err) {
      console.error('[Dashboard] handleReview error:', err);
      showToast('حدث خطأ أثناء معالجة الطلب: ' + (err.message || ''), 'error');
      setApplications(previousApps); // rollback
    }
  };

  // Derived counts — always computed from live applications state
  const pendingCount = useMemo(
    () => applications.filter(a => a.status === 'pending').length,
    [applications]
  );

  const filteredApps = useMemo(() => {
    if (activeAppTab === 'pending') {
      return applications.filter(app => app.status === 'pending');
    }
    return applications.filter(app => app.status !== 'pending');
  }, [applications, activeAppTab]);

  // ─── Loading shell ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className={styles.dashboardWrapper}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={`${styles.clubTinyLogo} ${styles.skeletonPulse}`} />
          <div className={styles.skeletonPulse} style={{ width: '100px', height: '1.5rem', borderRadius: '4px' }} />
        </div>
        <nav className={styles.navLinks}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`${styles.skeletonPulse}`} style={{ height: '50px', borderRadius: '12px', margin: '0.4rem 0' }} />
          ))}
        </nav>
      </aside>
      <main className={styles.mainContainer}>
        <div className={styles.loadingOverlay}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
            <Settings2 size={40} color="#38bdf8" style={{ opacity: 0.5 }} />
          </motion.div>
          <p style={{ marginTop: '1rem', opacity: 0.4, fontWeight: 700 }}>جاري استرجاع البيانات...</p>
        </div>
      </main>
    </div>
  );

  if (authStatus === 'unauthorized') return (
    <div className={styles.unauthorizedScreen}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <AlertCircle size={100} color="#f43f5e" />
      </motion.div>
      <div className={styles.unauthContent}>
        <h1>دخول غير مصرح</h1>
        <p>لا تملك الصلاحيات الكافية للوصول إلى لوحة إدارة هذا النادي.</p>
        <p className={styles.redirectText}>سيتم نقلك لصفحة النادي العامة قريباً...</p>
      </div>
      <Link href={`/clubs/${clubId}`} className={styles.btnPrimary}>العودة الآن</Link>
    </div>
  );

  return (
    <div className={styles.dashboardWrapper}>
      {/* Toast */}
      <AnimatePresence>
        {feedback.message && (
          <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className={`${styles.toast} ${styles[`toast_${feedback.type}`]}`}
          >
            {feedback.type === 'success' ? <Check size={18} /> : (feedback.type === 'error' ? <X size={18} /> : <Info size={18} />)}
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.clubTinyLogo}>
            {club?.logo_url
              ? <img src={club.logo_url} alt="Logo" />
              : <span>{club?.tag?.slice(0, 2).toUpperCase()}</span>
            }
          </div>
          <div>
            <h2>مقر {club?.tag}</h2>
            <span className={styles.adminBadge}>ADMIN PANEL</span>
          </div>
        </div>
        
        <nav className={styles.navLinks}>
          <button className={`${styles.navItem} ${activeTab === 'overview' ? styles.activeNav : ''}`} onClick={() => setActiveTab('overview')}>
            <LayoutDashboard size={20} /> الإحصائيات
          </button>
          <button className={`${styles.navItem} ${activeTab === 'profile' ? styles.activeNav : ''}`} onClick={() => setActiveTab('profile')}>
            <Settings size={20} /> إعدادات النادي
          </button>
          <button className={`${styles.navItem} ${activeTab === 'members' ? styles.activeNav : ''}`} onClick={() => setActiveTab('members')}>
            <Users size={20} /> إدارة اللاعبين
          </button>
          <button className={`${styles.navItem} ${activeTab === 'apps' ? styles.activeNav : ''}`} onClick={() => setActiveTab('apps')}>
            <UserPlus size={20} /> طلبات الالتحاق
            {pendingCount > 0 && (
              <span className={styles.badgeCount}>{pendingCount}</span>
            )}
          </button>
          <button className={`${styles.navItem} ${activeTab === 'announcements' ? styles.activeNav : ''}`} onClick={() => setActiveTab('announcements')}>
            <Megaphone size={20} /> الإعلانات
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href={`/clubs/${club?.id}`} className={styles.backBtn}>
            <ChevronLeft size={18} /> العودة للصفحة العامة
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.mainContainer}>
        <header className={styles.contentHeader}>
          <div className={styles.headerInfo}>
            <h1 className="neon-text">
              {activeTab === 'overview' && 'لوحة القيادة والمراقبة'}
              {activeTab === 'profile' && 'تعديل هوية النادي'}
              {activeTab === 'members' && 'إدارة قائمة المحترفين'}
              {activeTab === 'apps' && 'طلبات الانضمام الجديدة'}
              {activeTab === 'announcements' && 'نشر أخبار المنظمة'}
            </h1>
            <p>أنت تتحكم في: <strong>{club?.name}</strong> • المستوى {club?.power_level}</p>
          </div>
          {activeTab === 'profile' && (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={styles.btnPrimary} 
              onClick={handleUpdateProfile} 
              disabled={submissionLoading}
            >
              {submissionLoading ? <Loader2 className="spinner" size={18} /> : <Save size={18} />}
              حفظ التغييرات
            </motion.button>
          )}
        </header>

        <div className={styles.contentScroll}>
          <AnimatePresence mode="wait">

            {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <div className={styles.statIcon}><Users color="#38bdf8" /></div>
                    <div>
                      <span className={styles.statLabel}>عدد اللاعبين</span>
                      <span className={styles.statValue}>{members.length}</span>
                    </div>
                  </div>
                  {/* FIX: was showing applications.length (total) — now shows pendingCount only */}
                  <div className={`${styles.statCard} ${pendingCount > 0 ? styles.alertStat : ''}`}>
                    <div className={styles.statIcon}><UserPlus color={pendingCount > 0 ? '#f43f5e' : '#38bdf8'} /></div>
                    <div>
                      <span className={styles.statLabel}>طلبات معلقة</span>
                      <span className={styles.statValue}>{pendingCount}</span>
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statIcon}><Flame color="#fb923c" /></div>
                    <div>
                      <span className={styles.statLabel}>مستوى القوة</span>
                      <span className={styles.statValue}>{club?.power_level || 0}</span>
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statIcon}><Trophy color="#facc15" /></div>
                    <div>
                      <span className={styles.statLabel}>إجمالي البطولات</span>
                      <span className={styles.statValue}>{club?.trophies || 0}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.sectionSplit}>
                  <div className={styles.sectionCard}>
                    <h3><Activity size={20} /> النشاط الأخير</h3>
                    <div className={styles.activityList}>
                      {pendingCount > 0 && (
                        <div className={styles.activityItem} style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('apps'); setActiveAppTab('pending'); }}>
                          <div className={styles.activityDot} style={{ background: '#f43f5e' }} />
                          <div>
                            <p>لديك <strong>{pendingCount}</strong> طلب انضمام معلق بانتظار مراجعتك</p>
                            <small>انقر هنا للمراجعة</small>
                          </div>
                        </div>
                      )}
                      <div className={styles.activityItem}>
                        <div className={styles.activityDot} />
                        <div>
                          <p>إجمالي الطلبات المستلمة: {applications.length}</p>
                          <small>منذ إنشاء النادي</small>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.sectionCard}>
                    <h3><Globe size={20} /> حالة الاتصال بالخادم</h3>
                    <div className={styles.serverStatus}>
                      <div className={styles.statusLive}>
                        <div className={styles.pulse} />
                        متصل - جميع الأنظمة مستقرة
                      </div>
                      <p className={styles.serverInfo}>يتم مزامنة البيانات مع Supabase Realtime DB.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── PROFILE / SETTINGS ───────────────────────────────────────── */}
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {/* Image Upload Section */}
                <div className={styles.sectionCard} style={{ marginBottom: '2rem' }}>
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Camera size={20} color="#38bdf8" /> صور النادي
                  </h3>
                  <div className={styles.imagesRow}>
                    <ImageUploadWidget
                      clubId={club.id}
                      currentUrl={club.logo_url}
                      imageType="logo"
                      label="شعار النادي"
                      onSuccess={handleImageSuccess}
                      onError={handleImageError}
                    />
                    <ImageUploadWidget
                      clubId={club.id}
                      currentUrl={club.cover_image_url || club.banner_url}
                      imageType="cover"
                      label="صورة الغلاف"
                      onSuccess={handleImageSuccess}
                      onError={handleImageError}
                    />
                  </div>
                </div>

                {/* Info Form */}
                <div className={styles.sectionCard}>
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Settings size={20} color="#38bdf8" /> معلومات النادي
                  </h3>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>اسم المنظمة الرسمي</label>
                      <input value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="مثلاً: فريق الصقور" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>الوسم المختصر (Tag)</label>
                      <input value={editForm.tag || ''} onChange={e => setEditForm({...editForm, tag: e.target.value})} placeholder="FALCONS" />
                    </div>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                      <label>النبذة التعريفية</label>
                      <textarea rows={5} value={editForm.bio || ''} onChange={e => setEditForm({...editForm, bio: e.target.value})} placeholder="اكتب وصفاً جذاباً لناديك..." />
                    </div>
                    <div className={styles.formGroup}>
                      <label>المقر / المدينة</label>
                      <input value={editForm.location || ''} onChange={e => setEditForm({...editForm, location: e.target.value})} placeholder="الرياض، السعودية" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>البريد الإلكتروني للتواصل</label>
                      <input value={editForm.contact_email || ''} onChange={e => setEditForm({...editForm, contact_email: e.target.value})} placeholder="club@example.com" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>حالة طلبات الانضمام</label>
                      <select value={String(editForm.is_recruiting)} onChange={e => setEditForm({...editForm, is_recruiting: e.target.value === 'true'})}>
                        <option value="true">مفتوح - جاري استقبال لاعبين</option>
                        <option value="false">مغلق - لا يتم استقبال لاعبين</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── MEMBERS ──────────────────────────────────────────────────── */}
            {activeTab === 'members' && (
              <motion.div key="members" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={styles.sectionCard}>
                 <div className={styles.sectionHeader}>
                    <h3>التشكيلة الحالية ({members.length})</h3>
                    <button className={styles.btnSecondary}><MessageSquare size={16} /> مراسلة الجميع</button>
                 </div>
                 <div className={styles.listContainer}>
                    {members.map(m => (
                      <div key={m.id} className={styles.listItem}>
                        <div className={styles.memberMain}>
                          <div className={styles.avatar}>
                            {m.profiles?.avatar_url ? <img src={m.profiles.avatar_url} alt="A" /> : (m.profiles?.username?.charAt(0) || <Users size={20}/>)}
                          </div>
                          <div>
                            <strong>{m.profiles?.username || "لاعب غير معروف"}</strong>
                            <p>@{m.profiles?.player_tag || "no_tag"}</p>
                          </div>
                        </div>
                        <div className={styles.memberActions}>
                           <select 
                             className={styles.roleSelect} 
                             value={m.role} 
                             onChange={(e) => handleMemberRole(m.id, e.target.value)}
                           >
                             <option value="Member">لاعب</option>
                             <option value="Admin">مدير</option>
                             <option value="Coach">مدرب</option>
                             <option value="Owner">مالك</option>
                           </select>
                           <button className={styles.kickBtn} onClick={() => handleKickMember(m.id)} title="طرد"><UserX size={18} /></button>
                        </div>
                      </div>
                    ))}
                    {members.length === 0 && <p className={styles.emptyMsg}>لا يوجد أعضاء في هذا النادي حالياً.</p>}
                 </div>
              </motion.div>
            )}

            {/* ── APPLICATIONS ─────────────────────────────────────────────── */}
            {activeTab === 'apps' && (
              <motion.div 
                key="apps" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }} 
              >
                <div className={styles.sectionHeader}>
                  <div className={styles.headerInfo}>
                    <h3 style={{marginBottom: '0.5rem'}}><Users size={24} /> إدارة الطلبات</h3>
                    <p>هنا يمكنك مراجعة اللاعبين الراغبين في الانضمام لفريقك</p>
                  </div>
                  <div className={styles.tabActions}>
                    <button 
                      className={`${styles.tabBtn} ${activeAppTab === 'pending' ? styles.activeTab : ''}`}
                      onClick={() => setActiveAppTab('pending')}
                    >
                      طلبات جديدة
                      {pendingCount > 0 && <span className={styles.tabBadge}>{pendingCount}</span>}
                    </button>
                    <button 
                      className={`${styles.tabBtn} ${activeAppTab === 'reviewed' ? styles.activeTab : ''}`}
                      onClick={() => setActiveAppTab('reviewed')}
                    >
                      سجل المراجعة ({applications.filter(a => a.status !== 'pending').length})
                    </button>
                  </div>
                </div>

                <div className={styles.appsGrid}>
                  {filteredApps.length === 0 ? (
                    <motion.div 
                      className={styles.emptyStateContainer}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className={styles.emptyIconWrapper}>
                        <UserPlus size={80} className={styles.pulseIcon} />
                      </div>
                      <h3>{activeAppTab === 'pending' ? 'لا توجد طلبات معلقة' : 'سجل المراجعة فارغ'}</h3>
                      <p>سيظهر اللاعبون الذين يطلبون الانضمام لناديك هنا فور إرسالهم للطلب.</p>
                      {activeAppTab === 'pending' && (
                        <button className={styles.btnSecondary} onClick={() => setActiveTab('announcements')}>
                          انشر إعلاناً لجذب اللاعبين
                        </button>
                      )}
                    </motion.div>
                  ) : (
                    filteredApps.map(app => {
                      const profile = app.profiles || {};
                      return (
                        <motion.div 
                          key={app.id} 
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`${styles.appCard} ${app.status !== 'pending' ? styles.reviewedApp : ''}`}
                        >
                          <div className={styles.appUser}>
                            <div className={styles.avatar}>
                              {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.username} />
                              ) : (
                                profile.username?.charAt(0) || <UserPlus size={24} />
                              )}
                            </div>
                            <div className={styles.userDetails}>
                              <div className={styles.userNameRow}>
                                <strong>{profile.username || "لاعب مجهول"}</strong>
                                <span className={styles.levelBadge}>LVL {profile.level || 1}</span>
                              </div>
                              <p>@{profile.player_tag || "no_tag"}</p>
                            </div>
                            <div className={styles.appDate}>
                              {new Date(app.created_at).toLocaleDateString('ar-SA')}
                            </div>
                          </div>

                          {app.message && (
                            <div className={styles.appMsgBody}>
                              &ldquo;{app.message}&rdquo;
                            </div>
                          )}

                          {app.status === 'pending' ? (
                            <div className={styles.appFootActions}>
                              <button 
                                className={styles.btnReject} 
                                onClick={() => handleReview(app.id, 'reject')}
                              >
                                <X size={18}/> رفض الطلب
                              </button>
                              <button 
                                className={styles.btnApprove} 
                                onClick={() => handleReview(app.id, 'accept')}
                              >
                                <Check size={18}/> قبول كعضو
                              </button>
                            </div>
                          ) : (
                            <div className={styles.reviewStatus}>
                              {app.status === 'accepted' ? (
                                <span className={styles.statusApproved}>
                                  <Check size={16} /> تم القبول بواسطة الإدارة
                                </span>
                              ) : (
                                <span className={styles.statusRejected}>
                                  <X size={16} /> تم رفض الطلب
                                </span>
                              )}
                              {app.reviewed_at && (
                                <small className={styles.reviewedDate}>
                                  راجعت بتاريخ {new Date(app.reviewed_at).toLocaleDateString('ar-SA')}
                                </small>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}

            {/* ── ANNOUNCEMENTS ────────────────────────────────────────────── */}
            {activeTab === 'announcements' && (
              <motion.div key="ann" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className={styles.sectionCard} style={{marginBottom: '2rem'}}>
                  <h3>نشر إعلان رسمي</h3>
                  <div className={styles.annForm}>
                    <div className={styles.formGroup}>
                      <label>عنوان الخبر</label>
                      <input value={newAnn.title} onChange={e => setNewAnn({...newAnn, title: e.target.value})} placeholder="مثلاً: تم فتح باب الانضمام لقسم فالورانت" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>محتوى الإعلان</label>
                      <textarea rows={4} value={newAnn.content} onChange={e => setNewAnn({...newAnn, content: e.target.value})} placeholder="اكتب تفاصيل الخبر هنا..." />
                    </div>
                    <button className={styles.btnPrimary} onClick={handlePostAnn} disabled={submissionLoading}>
                      {submissionLoading ? <Loader2 className="spinner" size={18} /> : <Megaphone size={18} />}
                      نشر الخبر الآن
                    </button>
                  </div>
                </div>

                <div className={styles.sectionCard}>
                  <h3>الأرشيف الإخباري</h3>
                  <div className={styles.annArchive}>
                    {announcements.map(a => (
                      <div key={a.id} className={styles.annArchiveItem}>
                        <div className={styles.annInfo}>
                          <strong>{a.title}</strong>
                          <p>{a.content.substring(0, 120)}{a.content.length > 120 ? '...' : ''}</p>
                          <small>{new Date(a.created_at).toLocaleDateString('ar-SA')}</small>
                        </div>
                        <button className={styles.btnIconDanger} onClick={async () => {
                           if(confirm("هل أنت متأكد من حذف هذا الخبر؟")) {
                             await deleteClubAnnouncement(a.id);
                             setAnnouncements(announcements.filter(prev => prev.id !== a.id));
                             showToast('تم حذف الإعلان', 'info');
                           }
                        }}><Trash2 size={18} /></button>
                      </div>
                    ))}
                    {announcements.length === 0 && <p className={styles.emptyMsg}>لا توجد إعلانات سابقة للقائمة.</p>}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      <style jsx global>{`
        .neon-text {
          text-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
