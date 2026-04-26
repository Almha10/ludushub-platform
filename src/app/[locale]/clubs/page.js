'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { 
  Users, Trophy, MapPin, Building2, Flame, Crosshair, 
  Star, Search, ArrowRight, ShieldCheck, Globe
} from 'lucide-react';
import { fetchClubs } from '@/lib/dataService';
import styles from './page.module.css';

export default function ClubsDirectory() {
  const t = useTranslations('Clubs');
  const searchParams = useSearchParams();
  const gameFilter = searchParams.get('game');
  
  const [searchQuery, setSearchQuery] = useState("");
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClubs() {
      setLoading(true);
      try {
        const data = await fetchClubs(gameFilter);
        setClubs(data);
      } catch (err) {
        console.error("Failed to load clubs:", err);
      } finally {
        setLoading(false);
      }
    }
    loadClubs();
  }, [gameFilter]);

  const filteredClubs = clubs.filter(club => {
    return club.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           club.tag.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className={styles.clubsWrapper}>
      
      {/* Dynamic Header */}
      <header className={styles.headerBanner}>
        <img 
          src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop" 
          alt="Clubs Background" 
          className={styles.bannerImg}
        />
        <div className={styles.overlay}></div>
        <div className={styles.headerContent}>
          <motion.div 
            initial={{ y: 30, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className={styles.title}>{gameFilter ? `أندية ${gameFilter}` : "مجتمع المحترفين"}</h1>
            <p className={styles.subtitle}>
              {gameFilter 
                ? `اكتشف أقوى فرق ${gameFilter} في المنطقة وتواصل معهم للانضمام.` 
                : "البيت الرسمي لأقوى المنظمات والفرق التنافسية. اكتشف مسارك نحو الاحتراف."}
            </p>
          </motion.div>
          
          <motion.div
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             transition={{ delay: 0.4 }}
          >
            <Link href="/auth?role=club" className={styles.createBtn}>
              <Building2 size={24} />
              تسجيل منظمة جديدة
            </Link>
          </motion.div>
        </div>
      </header>

      <div className={styles.container}>
        {/* Modern Toolbar */}
        <section className={styles.toolbar}>
          <div className={styles.statsBlock}>
            <div className={styles.countText}>
              <Globe size={24} />
              <span>إجمالي المقرات: <b className={styles.highlight}>{clubs.length}</b></span>
            </div>
            {gameFilter && (
               <Link href="/clubs" className={styles.clearFilter}>تصفية كافة الألعاب</Link>
            )}
          </div>
          
          <div className={styles.searchBox}>
            <Search className={styles.searchIcon} size={20} style={{position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4}} />
            <input 
              type="text" 
              placeholder="ابحث عن اسم النادي أو الوسم (Tag)..." 
              className={styles.searchInput} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{paddingRight: '3.5rem'}}
            />
          </div>
        </section>

        {/* Directory Grid */}
        <div className={styles.grid}>
          {loading ? (
             [1, 2, 3, 4, 5, 6].map(i => <div key={i} className={styles.skeletonCard} />)
          ) : (
            <AnimatePresence>
              {filteredClubs.map((club) => (
                <motion.div 
                  key={club.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={styles.clubCard}
                >
                  <div className={styles.cardCover}>
                    <div className={styles.bannerOverlay} style={{ background: `linear-gradient(45deg, var(--accent), transparent)` }} />
                    <div className={styles.badgesWrapper}>
                      {club.is_verified && (
                        <span className={styles.clubBadge}>
                          <ShieldCheck size={14} color="#38bdf8" /> موثق
                        </span>
                      )}
                      <span className={styles.clubBadge}>
                        <Star size={12} color="#fb923c" /> نادٍ نشط
                      </span>
                    </div>
                    {club.is_recruiting && (
                      <span className={styles.recruitingBadge}>Recruiting</span>
                    )}
                  </div>
                  
                  <div className={styles.cardBody}>
                    <Link href={`/clubs/${club.id}`} className={styles.logoCircle}>
                      {club.logo_url ? <img src={club.logo_url} alt={club.tag} /> : club.tag}
                    </Link>
                    
                    <h3 className={styles.clubName}>{club.name}</h3>
                    <div className={styles.clubMeta}>
                      <MapPin size={14} /> {club.location || "السعودية"}
                    </div>

                    <div className={styles.powerLevelWrapper}>
                      <div className={styles.powerLabel}>
                        <span>Power Index</span>
                        <b>{club.power_level}%</b>
                      </div>
                      <div className={styles.powerBar}>
                        <motion.div 
                           className={styles.powerFill} 
                           initial={{ width: 0 }}
                           animate={{ width: `${club.power_level}%` }}
                           transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    <div className={styles.clubStats}>
                      <div className={styles.statBox}>
                        <span>{club.members_count || 0}</span>
                        <label>لاعبين</label>
                      </div>
                      <div className={styles.statBox}>
                        <span>{club.trophies || 0}</span>
                        <label>كؤوس</label>
                      </div>
                    </div>

                    <div className={styles.gamesList}>
                      {club.games?.slice(0, 3).map(game => (
                        <span key={game} className={`${styles.gamePill} ${gameFilter && game === gameFilter ? styles.activeGamePill : ''}`}>
                          {game}
                        </span>
                      ))}
                      {(club.games?.length > 3) && <span className={styles.gamePill}>+{club.games.length - 3}</span>}
                    </div>

                    <Link href={`/clubs/${club.id}`} className={styles.joinBtn}>
                       عرض ملف المنظمة
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
        
        {!loading && filteredClubs.length === 0 && (
           <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }}
             className={styles.emptyState}
           >
              <Flame size={80} className={styles.emptyIcon} />
              <h3>لم نعثر على أي نتائج</h3>
              <p>حاول البحث بكلمات مختلفة أو تصفية ألعاب أخرى.</p>
              <button className={styles.clearFilter} style={{marginTop: '2rem'}} onClick={() => setSearchQuery("")}>مسح البحث</button>
           </motion.div>
        )}
      </div>
    </div>
  );
}
