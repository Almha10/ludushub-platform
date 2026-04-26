'use client';
import { useState, useEffect, use, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { 
  Users, Trophy, Building2, ShieldAlert, Check, Sword, 
  Megaphone, Settings2, Activity, Globe, Share2, 
  LayoutDashboard, MessageSquare, Gamepad2, MapPin, X, Info
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { 
  fetchClubById, 
  fetchClubMembers, 
  applyToClub,
  fetchClubAnnouncements,
  getMyMembership,
  getMyApplication,
  fetchUserProfile
} from '@/lib/dataService';
import styles from './page.module.css';

const TABS = [
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { id: 'roster', label: 'التشكيلة', icon: Users },
  { id: 'announcements', label: 'الإعلانات', icon: Megaphone },
  { id: 'tournaments', label: 'البطولات', icon: Trophy },
];

export default function ClubDetailsPage({ params }) {
  const resolvedParams = use(params);
  const clubId = resolvedParams.id; 
  
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  
  // Auth / Role Security
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('visitor'); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState('overview'); 
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [appMessage, setAppMessage] = useState('');
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    let isMounted = true;
    
    async function init() {
      const startTime = performance.now();
      if (isMounted) setLoading(true);
      
      console.group(`[ClubPage-Details-Init] ID: ${clubId}`);
      try {
        // Step 1: Sequential Auth & Identity
        console.log(`[Step 1] Fetching session and club identity...`);
        
        let user = null;
        try {
          const { data } = await supabase.auth.getUser();
          user = data?.user;
        } catch (authErr) {
          // Gracefully handle "Lock broken" - we can proceed as visitor if needed
          if (authErr.message?.includes('Lock broken')) {
            console.warn("[ClubPage] Auth lock competition detected. Proceeding as cached user if possible.");
            const { data: { session } } = await supabase.auth.getSession();
            user = session?.user;
          } else {
            throw authErr;
          }
        }

        if (!isMounted) return;
        setCurrentUser(user);

        let clubData = await fetchClubById(clubId);
        if (!clubData) {
          console.log(`[Step 1-Fallback] UUID not found, trying Owner ID...`);
          clubData = await fetchClubById(clubId, true);
        }

        if (!isMounted) return;
        if (!clubData) {
          console.error(`[Step 1 Fail] Club truly NOT FOUND for ID: ${clubId}`);
          setFetchError("النادي غير موجود");
          return;
        }
        
        setClub(clubData);

        // Step 2: Parallel Fetch metadata
        console.log(`[Step 2] Dispatching parallel tasks...`);
        const detailTasks = [
          fetchClubMembers(clubData.id),
          fetchClubAnnouncements(clubData.id)
        ];

        if (user) {
          detailTasks.push(getMyMembership(clubData.id));
          detailTasks.push(getMyApplication(clubData.id));
          detailTasks.push(fetchUserProfile(user.id));
        }

        const results = await Promise.all(detailTasks);
        
        if (!isMounted) return;
        
        setMembers(results[0]);
        setAnnouncements(results[1]);

        if (user) {
          const membership = results[2];
          const application = results[3];
          const profileData = results[4];
          
          setUserProfile(profileData);
          const isDirectOwner = (clubData.owner_user_id === user.id);
          
          if (membership) {
            const role = (membership.role || 'Member').toLowerCase();
            setUserRole(role);
            setIsAdmin(isDirectOwner || ['owner', 'admin', 'club_admin'].includes(role));
          } else if (isDirectOwner) {
            setUserRole('owner');
            setIsAdmin(true);
          } else if (application) {
            setUserRole('pending');
            setIsAdmin(false);
          } else {
            setUserRole('visitor');
            setIsAdmin(false);
          }
        }

        console.log(`[ClubPage-Details-Init] SUCCESS loaded in ${(performance.now() - startTime).toFixed(2)}ms`);
      } catch (err) {
        console.error(`[ClubPage-Details-Init] FATAL Error:`, err.message || err);
        if (isMounted) setFetchError("حدث خطأ أثناء تحميل البيانات");
      } finally {
        if (isMounted) setLoading(false);
        console.groupEnd();
      }
    }

    init();
    return () => { isMounted = false; };
  }, [clubId]);

  const handleApply = async () => {
    if (!currentUser) {
      setFeedback({ type: 'error', message: 'يرجى تسجيل الدخول أولاً' });
      return;
    }
    if (!appMessage.trim()) {
      setFeedback({ type: 'error', message: 'يرجى كتابة رسالة الانضمام' });
      return;
    }

    if (!userProfile) {
      setFeedback({ type: 'error', message: 'يجب إكمال ملفك الشخصي أولاً للانضمام كلاعب' });
      return;
    }

    setSubmissionLoading(true);
    try {
      if (isAdmin) {
        setFeedback({ type: 'info', message: 'أنت بالفعل أحد إداريي النادي' });
        return;
      }
      await applyToClub(club.id, currentUser.id, appMessage);
      setUserRole('pending');
      setShowApplyModal(false);
      setFeedback({ type: 'success', message: 'تم إرسال طلبك بنجاح!' });
    } catch (err) {
      console.error('[ClubPage] handleApply error:', err);
      // Ensure we get a meaningful message even if the error object is weird
      const errorMsg = err.message || (typeof err === 'string' ? err : 'حدث خطأ غير متوقع');
      setFeedback({ type: 'error', message: errorMsg });
    } finally {
      setSubmissionLoading(false);
      setTimeout(() => setFeedback({ type: '', message: '' }), 5000);
    }
  };

  const shareClub = () => {
    navigator.clipboard.writeText(window.location.href);
    setFeedback({ type: 'success', message: 'تم نسخ الرابط!' });
    setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  if (loading) {
    return (
      <div className={styles.clubWrapper}>
        <div className={styles.heroSection} style={{ background: '#0B0F14' }}>
          <div className={styles.headerContent}>
            <div className={styles.logoContainer}>
              <div className={`${styles.clubLogo} ${styles.skeletonPulse}`} style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div className={styles.mainInfo}>
              <div className={styles.skeletonPulse} style={{ height: '4rem', width: '300px', marginBottom: '1rem', borderRadius: '12px' }} />
              <div className={styles.skeletonPulse} style={{ height: '1.5rem', width: '500px', borderRadius: '8px' }} />
            </div>
          </div>
        </div>
        <div className={styles.loadingOverlay}>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.loadingSpinner}
          >
            <Building2 size={40} className={styles.spinnerIcon} />
            <span>جاري المزامنة...</span>
          </motion.div>
        </div>
      </div>
    );
  }

  if (fetchError || !club) {
    return (
      <div className={styles.errorState}>
        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
          <ShieldAlert size={80} color="#f43f5e" />
        </motion.div>
        <h1>{fetchError || "النادي غير موجود"}</h1>
        <Link href="/clubs" className="secondary-button" style={{marginTop: '1rem'}}>العودة للأندية</Link>
      </div>
    );
  }

  return (
    <div className={styles.clubWrapper}>
      {/* Toast Feedback */}
      <AnimatePresence>
        {feedback.message && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className={`${styles.toast} ${styles[`toast_${feedback.type}`]}`}
          >
            {feedback.type === 'success' ? <Check size={18} /> : (feedback.type === 'error' ? <ShieldAlert size={18} /> : <Info size={18} />)}
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Hero Section */}
      <section className={styles.heroSection}>
        <motion.img 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          src={club.banner_url || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop"} 
          className={styles.bannerImage} 
          alt="Club Banner" 
        />
        <div className={styles.bannerOverlay} />
        
        <div className={styles.headerContent}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={styles.logoContainer}
          >
            <div className={styles.clubLogo}>
              {club.logo_url ? <img src={club.logo_url} alt="Logo" /> : club.tag}
            </div>
            {club.is_verified && <div className={styles.badge}>VERIFIED</div>}
          </motion.div>

          <div className={styles.mainInfo}>
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={styles.clubName}
            >
              {club.name}
            </motion.h1>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={styles.clubTagline}
            >
              {club.bio || "تعريف النادي والرسالة التي يطمح لتحقيقها في عالم الرياضات الإلكترونية."}
            </motion.p>
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className={styles.quickStats}
            >
              <div className={styles.statItem}>
                <span className={styles.statValue}>{club.power_level || 0}</span>
                <span className={styles.statLabel}>القوة</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{members.length}</span>
                <span className={styles.statLabel}>لاعب</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{club.trophies || 0}</span>
                <span className={styles.statLabel}>إنجاز</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. Navigation */}
      <nav className={styles.stickyNav}>
        <div className={styles.navContainer}>
          <div className={styles.tabs}>
            {TABS.map(t => (
              <button 
                key={t.id}
                className={`${styles.tab} ${activeTab === t.id ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <t.icon size={18} style={{marginLeft: '8px'}} />
                {t.label}
              </button>
            ))}
          </div>

          <div className={styles.actions}>
            {isAdmin && (
              <Link href={`/clubs/${club.id}/dashboard`} className={styles.adminLinkBtn}>
                <Settings2 size={18} style={{marginLeft: '8px'}} />
                إدارة النادي
              </Link>
            )}
            
            {!isAdmin && userRole === 'visitor' && club.is_recruiting && (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={styles.applyBtn} 
                onClick={() => setShowApplyModal(true)}
              >
                طلب انضمام
              </motion.button>
            )}
            
            {!isAdmin && userRole === 'visitor' && !club.is_recruiting && (
              <div className={styles.closedTag}>التسجيل مغلق</div>
            )}

            {!isAdmin && userRole !== 'visitor' && (
              <div className={styles.roleTag}>
                <Check size={18} /> {userRole === 'pending' ? 'طلبك قيد المراجعة' : `أنت عضو (${userRole})`}
              </div>
            )}
            <button className={styles.iconButton} onClick={shareClub} title="مشاركة">
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className={styles.contentMain}>
        <div className={styles.leftCol}>
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview" 
                initial="hidden" 
                animate="visible" 
                variants={containerVariants}
                className={styles.card}
              >
                <motion.h2 variants={itemVariants} className={styles.sectionTitle}><Building2 /> نبذة عن المنظمة</motion.h2>
                <motion.div variants={itemVariants} className={styles.bioText}>
                  {club.bio || "لا يوجد وصف لهذا النادي حالياً."}
                </motion.div>
                
                <motion.h3 variants={itemVariants} style={{ marginTop: '3rem' }} className={styles.sectionTitle}><Gamepad2 /> الألعاب المعتمدة</motion.h3>
                <motion.div variants={itemVariants} className={styles.gamesList}>
                   {club.games && club.games.length > 0 ? club.games.map(g => (
                     <div key={g} className={styles.gamePill}>{g}</div>
                   )) : <p className={styles.emptyText}>لم يتم تحديد ألعاب بعد.</p>}
                </motion.div>

                {club.location && (
                  <motion.div variants={itemVariants} className={styles.locationInfo}>
                    <MapPin size={18} />
                    <span>المقر الرئيسي: {club.location}</span>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === 'roster' && (
              <motion.div 
                key="roster" 
                initial="hidden" 
                animate="visible" 
                variants={containerVariants}
                className={styles.rosterGrid}
              >
                {members.length === 0 ? (
                  <p className={styles.emptyFull}>لا يوجد أعضاء مسجلين في التشكيلة حالياً.</p>
                ) : (
                  members.map(m => (
                    <motion.div key={m.id} variants={itemVariants} className={styles.memberCard}>
                      <div className={styles.memberAvatar}>
                        {m.profiles?.avatar_url ? (
                          <img src={m.profiles.avatar_url} alt={m.profiles.username} />
                        ) : (
                          m.profiles?.username?.charAt(0) || <Users size={30} />
                        )}
                      </div>
                      <div className={styles.memberInfo}>
                        <h4>{m.profiles?.username || "لاعب مجهول"}</h4>
                        <p>@{m.profiles?.player_tag || "no_tag"}</p>
                        <span className={`${styles.roleBadge} ${styles[`role_${m.role.toLowerCase()}`]}`}>
                          {m.role}
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {activeTab === 'announcements' && (
              <motion.div 
                key="announcements" 
                initial="hidden" 
                animate="visible" 
                variants={containerVariants}
                className={styles.annList}
              >
                {announcements.length === 0 ? (
                  <div className={styles.emptyFull}>
                    <Megaphone size={40} opacity={0.2} />
                    <p>لا توجد إعلانات نشطة من قبل إدارة النادي.</p>
                  </div>
                ) : announcements.map(ann => (
                  <motion.div key={ann.id} variants={itemVariants} className={styles.annCard}>
                    <div className={styles.annHeader}>
                      <h3>{ann.title}</h3>
                      <span className={styles.annDate}>{new Date(ann.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                    <p className={styles.annContent}>{ann.content}</p>
                    <div className={styles.annFooter}>
                      <Info size={14} /> إعلان رسمي
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {activeTab === 'tournaments' && (
              <motion.div 
                key="tournaments" 
                initial="hidden" 
                animate="visible" 
                variants={containerVariants}
                className={styles.emptyFull}
              >
                <Trophy size={60} opacity={0.15} />
                <h3>البطولات القادمة</h3>
                <p>سيبدأ عرض البطولات التي يشارك فيها النادي قريباً.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className={styles.sidebar}>
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            className={styles.widget}
          >
            <h3 className={styles.widgetTitle}><Activity /> حالة النادي</h3>
            <div className={`${styles.recruitmentBadge} ${club.is_recruiting ? styles.activeRecruit : styles.closedRecruit}`}>
               {club.is_recruiting ? "استقطاب المواهب متاح" : "باب الانضمام مغلق"}
            </div>
            {club.is_recruiting && (
              <p className={styles.widgetSubText}>نحن نبحث عن لاعبين طموحين للانضمام لصفوفنا.</p>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.1 }}
            className={styles.widget}
          >
            <h3 className={styles.widgetTitle}><Globe /> الروابط الرسمية</h3>
            <div className={styles.socialList}>
              <a href="#" className={styles.socialLink}><MessageSquare size={18} /> Discord</a>
              <a href="#" className={styles.socialLink}><Sword size={18} /> Twitter (X)</a>
              <a href="#" className={styles.socialLink}><Globe size={18} /> الموقع الرسمي</a>
            </div>
          </motion.div>

          {club.trophies > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.2 }}
              className={styles.widget}
            >
              <h3 className={styles.widgetTitle}><Trophy /> الإنجازات</h3>
              <div className={styles.trophyCount}>
                <span className={styles.trophyIcon}>🏆</span>
                <div>
                  <span className={styles.countText}>{club.trophies}</span>
                  <p>بطولة محققة</p>
                </div>
              </div>
            </motion.div>
          )}
        </aside>
      </main>

      {/* Join Modal */}
      <AnimatePresence>
        {showApplyModal && (
          <div className={styles.modal} onClick={() => setShowApplyModal(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={styles.modalBody} 
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>طلب انضمام إلى {club.name}</h3>
                <button className={styles.closeBtn} onClick={() => setShowApplyModal(false)}><X /></button>
              </div>
              
              <div className={styles.modalField}>
                <label>عرّف عن نفسك وخبراتك للأعضاء</label>
                <textarea 
                  rows={5} 
                  className={styles.modalInput} 
                  placeholder="لماذا تود الانضمام؟ أخبرنا عن مستواك في الألعاب التي تمثلها..." 
                  value={appMessage}
                  onChange={e => setAppMessage(e.target.value)}
                />
              </div>

              <div className={styles.modalActions}>
                <button 
                  className={styles.confirmBtn} 
                  onClick={handleApply} 
                  disabled={submissionLoading}
                >
                  {submissionLoading ? 'جاري الإرسال...' : 'إرسال طلب الانضمام'}
                </button>
                <button className={styles.cancelBtn} onClick={() => setShowApplyModal(false)}>إلغاء</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .neon-text {
          text-shadow: 0 0 10px rgba(56, 189, 248, 0.5), 0 0 20px rgba(56, 189, 248, 0.2);
        }
      `}</style>
    </div>
  );
}
