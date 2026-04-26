'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Building2, Compass, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import styles from './page.module.css';
import { supabase } from '@/lib/supabaseClient';

function AuthGatewayContent() {
  const router = useRouter();
  
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState('login'); 
  const [selectedRole, setSelectedRole] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (searchParams.get('mode') === 'register') {
      setViewMode('selection');
    }
  }, [searchParams]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '', 
    favoriteGame: '', 
    clubName: '',
    licenseId: '',
    location: '',
    passwordConfirm: '',
    visitorRole: ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (viewMode !== 'login') {
         if (formData.password !== formData.passwordConfirm) {
            throw new Error("كلمتا المرور غير متطابقتين.");
         }
      }

      if (viewMode === 'login') {
        // Exclusively process Universal Login
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (signInError) throw signInError;
        
        let { data: profileData } = await supabase.from('profiles').select('role').eq('id', authData.user.id).single();
        
        // Auto-recovery: If profile doesn't exist but auth succeeded, create it now
        if (!profileData) {
          console.log("[AuthAudit] Profile missing, creating from metadata...");
          const meta = authData.user.user_metadata;
          const { data: newProfile, error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            role: meta?.role || 'player',
            username: meta?.username || authData.user.email.split('@')[0],
            club_name: meta?.club_name || null,
            location: meta?.location || null,
            bio: meta?.bio || null,
            player_tag: `AH-${Math.floor(Math.random() * 9000 + 1000)}`
          }).select('role').single();
          
          if (!profileError) profileData = newProfile;
          else console.error("[AuthAudit] Profile creation failed:", profileError);
        }

        const effectiveRole = profileData?.role || authData.user?.user_metadata?.role;
        console.log("[AuthAudit] Login successful, role:", effectiveRole);

        if (effectiveRole === 'club') {
          router.push('/club-dashboard');
        } else {
          router.push('/profile');
        }
      } else {
        // Exclusively process Role-Based Registration Matrix
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              role: selectedRole,
              username: formData.username,
              favorite_games: formData.favoriteGame ? [formData.favoriteGame] : [],
              club_name: formData.clubName,
              license_id: formData.licenseId,
              location: formData.location,
              bio: formData.visitorRole
            },
            // Automatically capture current testing domain (localhost or 192.168.X.X local network IP for Safari testing)
            emailRedirectTo: `${window.location.origin}/profile`
          }
        });

        if (authError) throw authError;

        // Immediate Club Initialization if registration is successful and role is club
        if (authData.user && selectedRole === 'club') {
          console.log("[AuthAudit] Initializing club record during registration...");
          await supabase.from('clubs').insert({
            id: authData.user.id,
            owner_user_id: authData.user.id,
            name: formData.clubName || 'Organization',
            tag: formData.username || 'ORG',
            location: formData.location || '',
            bio: 'مرحباً بكم في مقرنا الإلكتروني الجديد',
            is_recruiting: true,
            contact_email: formData.email
          });
          
          await supabase.from('club_members').insert({
             club_id: authData.user.id,
             user_id: authData.user.id,
             role: 'club_admin'
          });
        }

        setSuccessMsg('تم التسجيل بنجاح! فضلاً تحقق من بريدك الإلكتروني لتفعيل حسابك.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Structural Framer Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };
  const formVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.3 } }
  };

  return (
    <div className={styles.authWrapper}>
      {/* Dynamic blurred background retaining the Prince's Hero legacy */}
      <div className={styles.blurredBackground}></div>

      <div className={styles.contentContainer}>
        <AnimatePresence mode="wait">
          {viewMode === 'login' ? (
            /* =========================================
               UNIVERSAL LOGIN FORM
            ========================================= */
            <motion.div 
              key="login"
              className={styles.formContainer}
              variants={formVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className={`${styles.formBox} glass-panel`}>
                <div className={styles.titleWrapper}>
                  <h2 className={styles.formTitle}>تسجيل الدخول</h2>
                </div>
                
                <form onSubmit={handleAuth} className={styles.dynamicForm}>
                  <div className={styles.inputGroup}>
                    <div className={styles.bilingualLabel}>
                      <label>البريد الإلكتروني</label>
                    </div>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                  </div>
                  <div className={styles.inputGroup}>
                    <div className={styles.bilingualLabel}>
                      <label>كلمة المرور</label>
                    </div>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} required />
                  </div>

                  {error && <div className={styles.errorToast}>{error}</div>}

                  <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading ? 'جاري التحقق...' : 'دخول'}
                  </button>
                </form>

                <div className={styles.switchModeBlock}>
                  <span>مستخدم جديد؟</span>
                  <span 
                    className={styles.switchLinkAction} 
                    onClick={() => { setViewMode('selection'); setSelectedRole(null); }}
                  >
                    سجل الآن
                  </span>
                </div>
              </div>
            </motion.div>

          ) : viewMode === 'selection' ? (
            /* =========================================
               ROLE SELECTION GATEWAY
            ========================================= */
            <motion.div 
              key="selection"
              className={styles.selectionGrid}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <div className={styles.headerBlock}>
                <h1 className={styles.mainTitle}>اختر مسارك</h1>
                <p className={styles.subTitle}>حدد هويتك في مستقبل الألعاب لتبدأ</p>
                <div style={{marginTop: '1.5rem'}}>
                  <span style={{color: 'rgba(255,255,255,0.7)'}}>هل لديك حساب سابق؟ </span>
                  <span className={styles.switchLinkAction} onClick={() => setViewMode('login')}>سجل الدخول</span>
                </div>
              </div>

              <div className={styles.cardsRow}>
                <motion.div 
                  className={`${styles.roleCard} ${styles.playerCard} glass-panel hover-lift`}
                  variants={cardVariants}
                  onClick={() => { setSelectedRole('player'); setViewMode('register'); }}
                >
                  <div className={styles.iconWrapper}><User size={40} /></div>
                  <h2>لاعب</h2>
                  <p>صمم هويتك الرقمية ثلاثية الأبعاد وشارك إنجازاتك مع مجتمع الألعاب.</p>
                  <div className={styles.cardIndicator}><ArrowRight size={20} /></div>
                </motion.div>

                <motion.div 
                  className={`${styles.roleCard} ${styles.clubCard} glass-panel hover-lift`}
                  variants={cardVariants}
                  onClick={() => { setSelectedRole('club'); setViewMode('register'); }}
                >
                  <div className={styles.iconWrapper}><Building2 size={40} /></div>
                  <h2>نادي</h2>
                  <p>قم بإدارة فرقك الرياضية، استقطب المواهب، وانظم بطولات حصرية.</p>
                  <div className={styles.cardIndicator}><ArrowRight size={20} /></div>
                </motion.div>

                <motion.div 
                  className={`${styles.roleCard} ${styles.guestCard} glass-panel hover-lift`}
                  variants={cardVariants}
                  onClick={() => { setSelectedRole('guest'); setViewMode('register'); }}
                >
                  <div className={styles.iconWrapper}><Compass size={40} /></div>
                  <h2>زائر</h2>
                  <p>تصفح الأخبار، دليل الألعاب، واستكشف المساحات النشطة بحرية.</p>
                  <div className={styles.cardIndicator}><ArrowRight size={20} /></div>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            /* =========================================
               ROLE SPECIFIC REGISTRATION FORM
            ========================================= */
            <motion.div 
              key="register"
              className={styles.formContainer}
              variants={formVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <button 
                className={styles.backButton} 
                onClick={() => { setSelectedRole(null); setViewMode('selection'); }}
              >
                <ArrowLeft size={18} /> عودة للخيارات
              </button>

              <div className={`${styles.formBox} glass-panel ${styles[selectedRole + 'Theme']}`}>
                <h2 className={styles.formTitle}>
                  {selectedRole === 'player' ? 'تسجيل لاعب جديد' : 
                   selectedRole === 'club' ? 'تسجيل نادي رسمي' : 
                   'دخول كزائر'}
                </h2>

                <form onSubmit={handleAuth} className={styles.dynamicForm}>
                  
                  {successMsg ? (
                     <div className={styles.successToast}>
                       {successMsg}
                     </div>
                  ) : (
                    <>
                      {/* Account Basics for everyone */}
                      <div className={styles.inputGroup}>
                        <div className={styles.bilingualLabel}>
                          <label>البريد الإلكتروني</label>
                        </div>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                      </div>
                      <div className={styles.inputGroup}>
                        <div className={styles.bilingualLabel}>
                          <label>كلمة المرور</label>
                        </div>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} required />
                        <div className={styles.bilingualLabel}>
                          <label>تأكيد كلمة المرور</label>
                        </div>
                        <input type="password" name="passwordConfirm" value={formData.passwordConfirm} onChange={handleChange} required />
                      </div>

                      {/* Player specific */}
                      {selectedRole === 'player' && (
                        <>
                          <div className={styles.inputGroup}>
                            <div className={styles.bilingualLabel}>
                              <label>اسم اللاعب</label>
                            </div>
                            <input type="text" name="username" value={formData.username} onChange={handleChange} required />
                          </div>
                          <div className={styles.inputGroup}>
                            <label>اللعبة أو الفئة المفضلة</label>
                            <input type="text" name="favoriteGame" value={formData.favoriteGame} onChange={handleChange} placeholder="مثال: التصويب، RPG، Valornat" />
                          </div>
                        </>
                      )}

                      {/* Club specific */}
                      {selectedRole === 'club' && (
                        <>
                          <div className={styles.inputGroup}>
                            <label>اسم النادي الرسمي</label>
                            <input type="text" name="clubName" value={formData.clubName} onChange={handleChange} required />
                          </div>
                          <div className={styles.inputGroup}>
                            <label>رقم الترخيص (إن وجد)</label>
                            <input type="text" name="licenseId" value={formData.licenseId} onChange={handleChange} />
                          </div>
                          <div className={styles.inputGroup}>
                            <label>المدينة / المقر الرئيسي</label>
                            <input type="text" name="location" value={formData.location} onChange={handleChange} required />
                          </div>
                        </>
                      )}

                      {/* Guest specific */}
                      {selectedRole === 'guest' && (
                        <>
                          <div className={styles.inputGroup}>
                            <label>الاسم الكامل</label>
                            <input type="text" name="username" value={formData.username} onChange={handleChange} required />
                          </div>
                          <div className={styles.inputGroup}>
                            <label>المجال / الصفة</label>
                            <select className={styles.selectInput} name="visitorRole" value={formData.visitorRole} onChange={handleChange} required>
                               <option value="">-- تفضل باختيار صفتك --</option>
                               <option value="هاوٍ في الرياضات الإلكترونية">هاوٍ في الرياضات الإلكترونية</option>
                               <option value="لاعب محترف">لاعب محترف</option>
                               <option value="صانع محتوى">صانع محتوى</option>
                               <option value="محلل">محلل</option>
                               <option value="مدرب">مدرب</option>
                               <option value="مدير فريق">مدير فريق</option>
                               <option value="منظم بطولات">منظم بطولات</option>
                               <option value="مهتم بالمجتمع">مهتم بالمجتمع</option>
                               <option value="أخرى">أخرى</option>
                            </select>
                          </div>
                        </>
                      )}

                      {error && <div className={styles.errorToast}>{error}</div>}

                      <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? 'جاري التحضير...' : 'تسجيل حساب جديد'}
                      </button>
                    </>
                  )}
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function AuthGateway() {
  return (
    <Suspense fallback={
      <div style={{minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0B0F14'}}>
        <h2 style={{color: '#8B5CF6'}}>جاري تحميل الواجهة...</h2>
      </div>
    }>
      <AuthGatewayContent />
    </Suspense>
  );
}
