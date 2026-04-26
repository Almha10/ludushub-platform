'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { Trophy, Calendar, Users, Target, Sword, Filter, Crosshair, MonitorPlay, Timer, Swords, Globe2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import styles from './page.module.css';

// Arabic Local Mock Data structured for Real Linking (initial state without dynamic images yet)
const INITIAL_TOURNAMENTS = [
  {
    id: "trn_1",
    title: "تصفيات الرياض: Valorant",
    game: "Valorant",
    host: "Team Falcons",
    hostId: "1", 
    status: "live",
    prize: "50,000 ريال",
    teams: 16,
    maxTeams: 32,
    date: "15 - 20 أغسطس 2026",
    region: "الشرق الأوسط",
    skill: "المحترفين",
    timeRemaining: "ينتهي بعد يومين",
    banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "trn_2",
    title: "بطولة نهاية الأسبوع - FC 24",
    game: "EA SPORTS FC 24", // Adjusted for better RAWG search
    host: "LudusHub Official",
    hostId: "0",
    status: "upcoming",
    prize: "10,000 ريال",
    teams: 64,
    maxTeams: 128,
    date: "22 أغسطس 2026",
    region: "السعودية",
    skill: "مفتوح للجميع",
    timeRemaining: "يغلق التسجيل بعد 5 ساعات",
    banner: "https://images.unsplash.com/photo-1518605368461-1ee7a1d1d8f6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "trn_3",
    title: "تحدي Elden Ring",
    game: "Elden Ring",
    host: "Twisted Minds",
    hostId: "2",
    status: "finished",
    prize: "المجد المطلق",
    teams: 8,
    maxTeams: 8,
    date: "10 أغسطس 2026",
    region: "عالمي",
    skill: "النخبة",
    timeRemaining: "انتهت",
    banner: "https://images.unsplash.com/photo-1605901309584-818e25960b8f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "trn_4",
    title: "حلبة الرياض: Overwatch 2",
    game: "Overwatch 2",
    host: "R8 Esports",
    hostId: "3",
    status: "upcoming",
    prize: "25,000 دولار",
    teams: 4,
    maxTeams: 8,
    date: "05 سبتمبر 2026",
    region: "السعودية",
    skill: "المحترفين",
    timeRemaining: "التسجيل متاح",
    banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
  }
];

export default function TournamentsHub() {
  const router = useRouter();
  const [activeGame, setActiveGame] = useState('جميع الألعاب');
  const [activeStatus, setActiveStatus] = useState('All');
  const [hasClub, setHasClub] = useState(false);
  const [tournaments, setTournaments] = useState(INITIAL_TOURNAMENTS);
  
  const gamesList = ['جميع الألعاب', 'Valorant', 'EA SPORTS FC 24', 'Elden Ring', 'Overwatch 2'];
  const statuses = [
    { id: 'All', label: 'الكل' },
    { id: 'live', label: 'مباشر الآن' },
    { id: 'upcoming', label: 'قادمة' },
    { id: 'finished', label: 'مكتملة' }
  ];

  // System Resolution Effects
  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role === 'club') setHasClub(true);
      }
    }
    checkRole();
  }, []);

  // Fetch true RAWG Images dynamically based on the associated game
  useEffect(() => {
    async function resolveImages() {
      const updatedTournaments = await Promise.all(
        tournaments.map(async (t) => {
          try {
            const res = await fetch(`/api/games?search=${encodeURIComponent(t.game)}`);
            const data = await res.json();
            
            if (data?.results?.length > 0 && data.results[0].background_image) {
               return { ...t, banner: data.results[0].background_image };
            }
            return t; // Keep fallback
          } catch (err) {
            console.error(`Failed to resolve image for ${t.game}`, err);
            return t; // Keep fallback
          }
        })
      );
      setTournaments(updatedTournaments);
    }
    resolveImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHostTournament = () => {
    if (hasClub) {
      router.push('/profile'); 
    } else {
      alert("يجب أن تكون حساب نادي (Club) لإنشاء البطولات. توجه إلى ملفك للترقية!");
      router.push('/profile');
    }
  };

  const filteredTournaments = tournaments.filter(t => {
    const matchGame = activeGame === 'جميع الألعاب' || t.game === activeGame;
    const matchStatus = activeStatus === 'All' || t.status === activeStatus;
    return matchGame && matchStatus;
  });

  return (
    <div className={styles.hubWrapper} dir="rtl">
      
      {/* Hero Header */}
      <div className={styles.heroSection}>
         <div className={styles.heroText}>
           <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}}>
             <div className={styles.socialProof}>
               <div className={styles.pulseDot}></div>
               12,450 لاعب يتنافسون الآن
             </div>
             <h1>ساحة الرياضات<br/>الإلكترونية</h1>
             <p>سجل في أضخم البطولات الحية، تتبع مسارات اللعب، واغتنم أضخم الجوائز. المجد ينتظر ناديك.</p>
             <div className={styles.heroActions}>
               <button className={styles.primaryCta} onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })}>استكشف البطولات</button>
               <button className={styles.secondaryCta} onClick={handleHostTournament}>+ نظّم بطولة</button>
             </div>
           </motion.div>
         </div>
         <div className={styles.heroVisual}></div>
      </div>

      <div className={styles.container}>
        
        {/* Sidebar Filters */}
        <aside className={styles.filtersSidebar}>
           <div className={styles.filterBlock}>
             <h3><Target size={18} /> تصفية حسب اللعبة</h3>
             <div className={styles.filterOptions}>
               {gamesList.map(game => (
                 <button 
                   key={game} 
                   className={`${styles.filterBtn} ${activeGame === game ? styles.activeFilter : ''}`}
                   onClick={() => setActiveGame(game)}
                 >
                   {game}
                 </button>
               ))}
             </div>
           </div>

           <div className={styles.filterBlock}>
             <h3><MonitorPlay size={18} /> حالة البطولة</h3>
             <div className={styles.filterOptions}>
               {statuses.map(st => (
                 <button 
                   key={st.id} 
                   className={`${styles.filterBtn} ${activeStatus === st.id ? styles.activeFilter : ''}`}
                   onClick={() => setActiveStatus(st.id)}
                 >
                   <span>{st.label}</span>
                 </button>
               ))}
             </div>
           </div>
        </aside>

        {/* Directory Grid */}
        <main className={styles.tournamentsGrid}>
           <AnimatePresence>
             {filteredTournaments.length === 0 ? (
               <motion.div initial={{opacity: 0}} animate={{opacity: 1}} style={{padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px'}}>
                 <Crosshair size={48} style={{color: 'rgba(255,255,255,0.2)', marginBottom: '1rem'}} />
                 <h3 style={{color: 'rgba(255,255,255,0.5)'}}>لا توجد بطولات نشطة تطابق بحثك حالياً.</h3>
               </motion.div>
             ) : (
               filteredTournaments.map((tournament, idx) => (
                 <motion.div 
                   key={tournament.id}
                   className={styles.tournamentCard}
                   initial={{opacity: 0, scale: 0.98}}
                   animate={{opacity: 1, scale: 1}}
                   transition={{delay: idx * 0.05, duration: 0.3}}
                 >
                   <Link href={`/tournaments/${tournament.id}`} className={styles.cardVisual}>
                      <img src={tournament.banner} alt={tournament.title} onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800'; }} />
                      {tournament.status === 'live' && <span className={`${styles.statusBadge} ${styles.statusLive}`}>🔴 مباشر الآن</span>}
                      {tournament.status === 'upcoming' && <span className={`${styles.statusBadge} ${styles.statusUpcoming}`}>قريباً</span>}
                      {tournament.status === 'finished' && <span className={`${styles.statusBadge} ${styles.statusFinished}`}>مكتملة</span>}
                   </Link>
                   
                   <div className={styles.cardContent}>
                      <div className={styles.metaRow}>
                        <Link href={`/games?name=${tournament.game}`} className={styles.gameLink} style={{textDecoration: 'none'}}>
                           <Swords size={14} style={{verticalAlign: 'middle', marginLeft: '4px'}}/>
                           {tournament.game} / {tournament.region}
                        </Link>
                        <span className={styles.skillLevelBadge}>{tournament.skill}</span>
                      </div>
                      
                      <Link href={`/tournaments/${tournament.id}`} style={{textDecoration: 'none'}}>
                        <h2>{tournament.title}</h2>
                      </Link>
                      
                      <p className={styles.orgHost}>
                        مُقدمة بواسطة: 
                        {tournament.hostId !== "0" ? (
                          <Link href={`/clubs/${tournament.hostId}`} style={{color: '#fff', textDecoration: 'none', marginRight: '5px', fontWeight: 'bold'}}>
                             {tournament.host}
                          </Link>
                        ) : (
                          <strong style={{color: '#fff', marginRight: '5px'}}>{tournament.host}</strong>
                        )}
                      </p>
                      
                      <div className={styles.statsRow}>
                        <div className={styles.statItem}>
                          <Users size={16} />
                          <span>{tournament.teams} / {tournament.maxTeams} فِرَق</span>
                        </div>
                        
                        {tournament.timeRemaining && tournament.status !== 'finished' && (
                           <div className={styles.urgencyBadge}>
                             <Timer size={14} /> {tournament.timeRemaining}
                           </div>
                        )}
                        
                        <div className={styles.prizePool}>
                          {tournament.prize}
                        </div>
                      </div>
                   </div>
                 </motion.div>
               ))
             )}
           </AnimatePresence>
        </main>

      </div>
    </div>
  );
}
