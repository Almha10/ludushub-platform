'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import styles from './Navbar.module.css';
import { Gamepad2, Globe, UserCircle, Settings, LogOut, ChevronDown, Bell, Search, Settings2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const MOCK_NOTIFICATIONS = [
  { id: 1, type: "mention", text: "@faisal_fc أشار إليك في مساحة FC 24", time: "منذ دقيقتين", unread: true },
  { id: 2, type: "join_request", text: "طلب انضمام جديد لفريق Falcons", time: "منذ ساعة", unread: true },
  { id: 3, type: "reply", text: "TariqTheTarnished رد على تعليقك", time: "منذ ساعتين", unread: false }
];

export default function Navbar({ locale }) {
  const t = useTranslations('Navigation');
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [session, setSession] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState('');
  const [userProfile, setUserProfile] = useState(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setDropdownOpen(false);
    setToastMessage('تم تسجيل الخروج بنجاح');
    setTimeout(() => {
      setToastMessage('');
      router.push(`/${locale}`);
    }, 2000);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // route to clubs or spaces based on logic, or a global search page
      router.push(`/${locale}/clubs?game=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  }

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session) {
          supabase.from('profiles').select('role, id').eq('id', session.user.id).single()
            .then(({ data }) => {
              setUserProfile(data);
            })
            .catch(err => console.error('[Navbar] Profile fetch error:', err));
        }
      })
      .catch(err => console.error('[Navbar] Session fetch error:', err));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        supabase.from('profiles').select('role, id').eq('id', session.user.id).single()
          .then(({ data }) => {
            setUserProfile(data);
          })
          .catch(err => console.error('[Navbar] Auth change profile fetch error:', err));
      } else {
        setUserProfile(null);
      }
    });

    const handleScroll = () => setIsScrolled(window.scrollY > 50);

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      {toastMessage && (
        <div className={styles.logoutToast}>{toastMessage}</div>
      )}
      <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : styles.transparent}`}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo}>
            <Gamepad2 size={28} className={styles.logoIcon} />
            <span className="neon-text">ArenaHub</span>
          </Link>

          <div className={styles.navLinks}>
            <Link href="/" className={styles.link}>{t('home')}</Link>
            <Link href="/tournaments" className={styles.link}>البطولات</Link>
            <Link href="/spaces" className={styles.link}>{t('spaces')}</Link>
            <Link href="/clubs" className={styles.link}>{t('clubs')}</Link>
            <Link href="/games" className={styles.link}>{t('games')}</Link>

            <div className={`${styles.searchWrapper} ${searchOpen ? styles.searchWrapperOpen : ''}`}>
              <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center' }}>
                <Search size={18} className={styles.searchIcon} onClick={() => setSearchOpen(!searchOpen)} />
                <input
                  type="text"
                  placeholder="ابحث عن مساحات، أندية..."
                  className={`${styles.searchInput} ${searchOpen ? styles.searchInputOpen : ''}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                />
              </form>
            </div>
          </div>

          <div className={styles.actions}>
            {session ? (
              <>
                {/* Notifications */}
                <div className={styles.notificationsMenu}>
                  <button className={styles.iconBtn} onClick={() => { setNotificationsOpen(!notificationsOpen); setDropdownOpen(false); }}>
                    <Bell size={20} />
                    <span className={styles.unreadBadge}>2</span>
                  </button>
                  {notificationsOpen && (
                    <div className={styles.dropdownModal} style={{ width: '300px', right: 0 }}>
                      <div className={styles.dropdownHeader}>الإشعارات</div>
                      {MOCK_NOTIFICATIONS.map(n => (
                        <div key={n.id} className={`${styles.notificationItem} ${n.unread ? styles.notificationUnread : ''}`}>
                          <p>{n.text}</p>
                          <small>{n.time}</small>
                        </div>
                      ))}
                      <div className={styles.dropdownFooter}>تحديد الكل كمقروء</div>
                    </div>
                  )}
                </div>

                {/* User Dropdown */}
                <div className={styles.userMenu}>
                  <button
                    className={styles.profileIconBtn}
                    onClick={() => { setDropdownOpen(!dropdownOpen); setNotificationsOpen(false); }}
                  >
                    <UserCircle size={20} />
                    <span>{t('profile') || 'الهوية'}</span>
                    <ChevronDown size={14} className={dropdownOpen ? styles.rotate : ''} />
                  </button>

                  {dropdownOpen && (
                    <div className={styles.dropdownModal}>
                      {userProfile?.role === 'club' ? (
                        <Link href="/club-dashboard" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                          <Settings2 size={18} /> لوحة تحكم النادي
                        </Link>
                      ) : (
                        <Link href="/profile" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                          <UserCircle size={18} /> هويتي الرقمية
                        </Link>
                      )}

                      <Link href="/settings" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                        <Settings size={18} /> الإعدادات
                      </Link>
                      <div className={styles.dropdownDivider}></div>
                      <button onClick={handleLogout} className={`${styles.dropdownItem} ${styles.logoutAction}`}>
                        <LogOut size={18} /> تسجيل الخروج
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/auth" className={styles.loginBtn}>
                  {t('login') || 'تسجيل الدخول'}
                </Link>
                <Link href="/auth?mode=register" className={styles.signupBtn}>
                  {t('signup') || 'سجل الآن'}
                </Link>
              </>
            )}
            <Link
              href={pathname}
              locale={locale === 'en' ? 'ar' : 'en'}
              className={styles.langToggle}
              style={{ minWidth: '70px', justifyContent: 'center' }}
            >
              <Globe size={20} />
              <span>{locale === 'en' ? 'AR' : 'EN'}</span>
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}
