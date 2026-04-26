'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Calendar, Users, MonitorPlay, Cast, Target } from 'lucide-react';
import styles from './page.module.css';

// Mock DB translated into Arabic natively
const MOCK_MAPPING = {
  "trn_1": {
    id: "trn_1",
    title: "تصفيات الرياض: Valorant",
    game: "Valorant",
    host: "Team Falcons",
    status: "live",
    prize: "50,000 ريال",
    teams: 8,
    date: "15 - 20 أغسطس 2026",
    region: "الشرق الأوسط",
    banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80",
    participants: ["Twisted Minds", "Team Falcons", "Triple Esports", "R8 Esports", "Geekay Esports", "Onyx Ravens", "Nigma Galaxy", "NASR"],
    bracket: [
      {
        round: "ربع النهائي",
        matches: [
          { mId: 1, p1: "Falcons", p2: "NASR", s1: 2, s2: 0, status: "finished" },
          { mId: 2, p1: "Triple", p2: "Geekay", s1: 1, s2: 2, status: "finished" },
          { mId: 3, p1: "Twisted", p2: "R8", s1: 2, s2: 1, status: "finished" },
          { mId: 4, p1: "Onyx", p2: "Nigma", s1: 0, s2: 2, status: "finished" },
        ]
      },
      {
        round: "نصف النهائي",
        matches: [
          { mId: 5, p1: "Falcons", p2: "Geekay", s1: 1, s2: 0, status: "live" }, 
          { mId: 6, p1: "Twisted", p2: "Nigma", s1: null, s2: null, status: "upcoming" },
        ]
      },
      {
        round: "النهائي الكبير",
        matches: [
          { mId: 7, p1: "يُحدد لاحقاً", p2: "يُحدد لاحقاً", s1: null, s2: null, status: "upcoming" }
        ]
      }
    ]
  }
};

export default function TournamentDetails({ params }) {
  const trnId = params.id;
  const initialData = MOCK_MAPPING[trnId] || MOCK_MAPPING["trn_1"]; 
  
  const [tData, setTData] = useState(initialData);
  const [activeTab, setActiveTab] = useState('bracket');

  // Async Authentic RAWG Artwork mapping
  useEffect(() => {
    async function loadAuthenticBanner() {
      try {
        const res = await fetch(`/api/games?search=${encodeURIComponent(tData.game)}`);
        const result = await res.json();
        if (result?.results?.length > 0 && result.results[0].background_image) {
           setTData(prev => ({ ...prev, banner: result.results[0].background_image }));
        }
      } catch (err) {
        console.error("RAWG fetch fallback active", err);
      }
    }
    loadAuthenticBanner();
  }, [tData.game]);

  return (
    <div className={styles.tournamentWrapper} dir="rtl">
      
      {/* Dynamic Header */}
      <div className={styles.coverPhoto} style={{ backgroundImage: `linear-gradient(to top, #0b0f14 0%, rgba(11, 15, 20, 0.4) 100%), url('${tData.banner}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
         <div className={styles.headerMeta}>
           <span className={styles.hostTag}>مُقدمة بواسطة <strong>{tData.host}</strong> | {tData.region}</span>
           <h1>{tData.title}</h1>
           <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
              {tData.status === 'live' && <span style={{padding: '0.4rem 1rem', background: '#f43f5e', color: '#fff', borderRadius: '50px', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '1px'}}>🔴 مباشر الآن</span>}
              <span style={{padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '50px', fontWeight: 600, fontSize: '0.8rem'}}><Target size={14} style={{verticalAlign: 'middle', marginLeft:'5px'}}/> {tData.game}</span>
           </div>
         </div>
      </div>

      <div className={styles.container}>
        
        {/* Main Interface */}
        <div>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${activeTab === 'bracket' ? styles.activeTab : ''}`} onClick={() => setActiveTab('bracket')}>مجريات البطولة</button>
            <button className={`${styles.tab} ${activeTab === 'participants' ? styles.activeTab : ''}`} onClick={() => setActiveTab('participants')}>الفرق المشاركة ({tData.teams})</button>
          </div>

          <div className={styles.contentArea}>
            {activeTab === 'bracket' && (
              <motion.div initial={{opacity: 0, x: 10}} animate={{opacity: 1, x: 0}}>
                <div className={styles.bracketContainer}>
                  {tData.bracket.map((round, rIdx) => (
                    <div key={rIdx} className={styles.bracketColumn}>
                      <h4 style={{textAlign: 'center', marginBottom: '2rem', color: 'rgba(255,255,255,0.6)'}}>{round.round}</h4>
                      {round.matches.map(match => {
                         const isM1Win = match.s1 > match.s2;
                         const isM2Win = match.s2 > match.s1;
                         return (
                           <div key={match.mId} className={styles.matchup} style={{borderColor: match.status === 'live' ? '#f43f5e' : 'rgba(255,255,255,0.1)'}}>
                             {match.status === 'live' && <span style={{position:'absolute', top: '-10px', left: '10px', background: '#f43f5e', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>مباشر</span>}
                             <div className={`${styles.matchupTeam} ${match.status === 'finished' ? (isM1Win ? styles.winner : styles.loser) : ''}`}>
                               <span>{match.p1}</span>
                               <span className={styles.matchScore}>{match.s1 !== null ? match.s1 : '-'}</span>
                             </div>
                             <div className={`${styles.matchupTeam} ${match.status === 'finished' ? (isM2Win ? styles.winner : styles.loser) : ''}`}>
                               <span>{match.p2}</span>
                               <span className={styles.matchScore}>{match.s2 !== null ? match.s2 : '-'}</span>
                             </div>
                           </div>
                         );
                      })}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'participants' && (
              <motion.div initial={{opacity: 0, x: -10}} animate={{opacity: 1, x: 0}}>
                 <div className={styles.participantsGrid}>
                    {tData.participants.map((team, i) => (
                      <div key={i} className={styles.participantCard}>
                        <div style={{width: '30px', height: '30px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>{team[0]}</div>
                        <h4>{team}</h4>
                      </div>
                    ))}
                 </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Sidebar Information */}
        <aside>
           <div className={styles.sideCard}>
             <h3>تفاصيل البطولة</h3>
             <span className={styles.prizePoolLarge}>{tData.prize}</span>
             
             <div className={styles.statRow}>
               <span>اللعبة</span>
               <strong>{tData.game}</strong>
             </div>
             <div className={styles.statRow}>
               <span>النظام</span>
               <strong>خروج المغلوب</strong>
             </div>
             <div className={styles.statRow}>
               <span>التاريخ</span>
               <strong>{tData.date}</strong>
             </div>
             <div className={styles.statRow}>
               <span>الفرق</span>
               <strong>{tData.teams}</strong>
             </div>
             
             {tData.status === 'live' && (
               <button style={{width: '100%', marginTop: '2rem', padding: '1rem', background: '#6441a5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                 <Cast size={20} /> مشاهدة البث المباشر
               </button>
             )}
           </div>
        </aside>

      </div>
    </div>
  );
}
