'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { Trophy, Users, Shield, Zap, TrendingUp, Activity, Star, ChevronDown, Rocket } from 'lucide-react';
import styles from './page.module.css';

export default function Home() {
  const tHero = useTranslations('Hero');
  const tAbout = useTranslations('About');
  const tSteps = useTranslations('Steps');
  const tFeatures = useTranslations('Features');
  const tExtra = useTranslations('HomeExtra');

  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const FALLBACK_GAMES = [
    { id: 'fb-1', name: "EA FC 24", background_image: "https://image.api.playstation.com/vulcan/ap/rnd/202307/1716/09a06ff2d6288ab5a3e1f57ce3eb95df4a71b28d0870fb37.png", added: 10500 },
    { id: 'fb-2', name: "Valorant", background_image: "https://creativereview.imgix.net/content/uploads/2020/09/VALORANT_JETT_RED_gallery_1920x1080.jpg", added: 9500 },
    { id: 'fb-3', name: "Elden Ring", background_image: "https://image.api.playstation.com/vulcan/ap/rnd/202110/2000/aGhopp3MHppi7kooGE2Dtt8C.png", added: 14200 }
  ];

  const [trendingGames, setTrendingGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);

  useEffect(() => {
    async function fetchTrending() {
      try {
        setLoadingGames(true);
        const res = await fetch('/api/games?page_size=3');
        if (!res.ok) throw new Error(`API returned status ${res.status}`);
        
        const data = await res.json();
        console.log('Trending Games API Response:', data);
        
        if (data.results && data.results.length > 0) {
          setTrendingGames(data.results);
        } else {
          console.warn('Trending Games API returned empty results, using fallback.');
          setTrendingGames(FALLBACK_GAMES);
        }
      } catch (err) {
        console.error('Error fetching trending games, applying fallback data:', err);
        setTrendingGames(FALLBACK_GAMES);
      } finally {
        setLoadingGames(false);
      }
    }
    fetchTrending();
  }, []);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.backgroundPattern}></div>

      {/* Hero Section - Classic High-Impact Layout */}
      <section className={styles.heroSection}>
        <motion.div 
          className={styles.heroBackground}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroFadeBottom}></div>
        <div className={styles.floatingGlow}></div>

        <div className={styles.heroContentContainer}>
          <motion.div 
            className={styles.heroContentRight}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeInUp} className={styles.quoteBlock}>
              <h1 className={styles.quoteText}>{tHero('quote')}</h1>
              <p className={styles.quoteAuthor}>{tHero('author')}</p>
              
              <Link href="/auth" className={`primary-button ${styles.cta}`}>
                {tHero('joinNow') || 'انضم الآن'}
              </Link>
            </motion.div>
          </motion.div>
        </div>

        <div className={styles.scrollIndicator}>
          <span>Scroll</span>
          <ChevronDown size={24} />
        </div>
      </section>

      {/* About Section */}
      <motion.section 
        className={styles.contentSection}
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className={`${styles.aboutContainer} ${styles.glassPanel} hover-glow`}>
          <h2 className={styles.sectionTitle}>{tAbout('title')}</h2>
          <p className={styles.aboutText}>{tAbout('description')}</p>
        </div>
      </motion.section>

      <div className={styles.sectionSeparator}></div>

      {/* Steps Section */}
      <motion.section 
        className={styles.contentSection}
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.div variants={fadeInUp} className={styles.sectionTitleWrapper}>
          <h2 className={styles.sectionTitle}>{tSteps('title')}</h2>
        </motion.div>
        
        <div className={styles.stepsGrid}>
          {[1, 2, 3].map((step) => {
            const icons = [<Rocket key={1} />, <Shield key={2} />, <Trophy key={3} />];
            return (
              <motion.div key={step} variants={fadeInUp} className={`${styles.stepCard} ${styles.glassPanel} hover-glow hover-lift`}>
                <div className={styles.stepNumber}>{step}</div>
                <div style={{ color: '#00FF9C', marginBottom: '0.5rem' }}>
                  {icons[step-1]}
                </div>
                <h3>{tSteps(`step${step}`)}</h3>
                <p>{tSteps(`step${step}Desc`)}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      <div className={styles.sectionSeparator}></div>

      {/* Dynamic Dashboard Sections */}
      <motion.section 
        className={styles.contentSection}
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className={styles.dashboardGrid}>
          
          {/* Trending Games */}
          <motion.div variants={fadeInUp} className={`${styles.glassPanel} hover-glow`} style={{ padding: '2rem' }}>
            <div className={styles.cardHeader}>
              <h3><TrendingUp size={28} color="#00FF9C" /> {tExtra('trendingGames')}</h3>
              <Link href="/games" className={styles.viewAllBtn}>{tExtra('viewAll')}</Link>
            </div>
            
            <div className={styles.trendingGamesGrid}>
              {loadingGames ? (
                /* Skeleton Loader */
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className={`${styles.gameCard} ${styles.skeleton}`} />
                ))
              ) : trendingGames.length > 0 ? (
                trendingGames.map((game) => {
                  const imageUrl = game.background_image || game.image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800';
                  const followers = game.added ? `${(game.added / 100).toFixed(1)}k` : '10k+';

                  return (
                    <Link 
                      href={`/spaces?game=${encodeURIComponent(game.name)}`} 
                      key={game.id} 
                      className={styles.gameCard} 
                      style={{ backgroundImage: `url(${imageUrl})` }}
                    >
                      <div className={styles.gameOverlay}>
                        <span className={styles.gameTitle}>{game.name}</span>
                        <span className={styles.gameViewers}>
                          <Users size={14} /> {followers} {tExtra('followers') || 'Followers'}
                        </span>
                      </div>
                    </Link>
                  );
                })
              ) : null}
            </div>
          </motion.div>

          {/* Activity Feed */}
          <motion.div variants={fadeInUp} className={`${styles.glassPanel} hover-glow`} style={{ padding: '2rem' }}>
            <div className={styles.cardHeader}>
              <h3><Activity size={28} color="#8B5CF6" /> {tExtra('liveActivity')}</h3>
            </div>
            
            <div className={styles.activityFeed}>
              {[1, 2, 3].map((item) => {
                const icons = [<Trophy key={1} className={styles.activityIcon + ' ' + styles.achievement} />, 
                               <Star key={2} className={styles.activityIcon + ' ' + styles.tournament} />, 
                               <Users key={3} className={styles.activityIcon + ' ' + styles.club} />];
                               
                const classNames = [styles.achievement, styles.tournament, styles.club];
                
                return (
                  <div key={item} className={styles.activityItem}>
                    <div className={`${styles.activityIcon} ${classNames[item-1]}`}>
                      {item === 1 ? <Trophy size={20} /> : item === 2 ? <Star size={20} /> : <Users size={20} />}
                    </div>
                    <div className={styles.activityContent}>
                      <span className={styles.activityText}>{tExtra(`activity${item}`)}</span>
                      <span className={styles.activityTime}>{tExtra(`activityTime${item}`)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
        
        {/* Top Players */}
        <motion.div variants={fadeInUp} className={`${styles.glassPanel} hover-glow`} style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          <div className={styles.cardHeader}>
            <h3><Star size={28} color="#FFD700" /> {tExtra('topPlayers')}</h3>
            <Link href="/spaces" className={styles.viewAllBtn}>{tExtra('viewAll')}</Link>
          </div>
          
          <div className={styles.topPlayersList}>
            {[
              { name: 'Mxsad', score: 'Level 99 • Grandmaster' },
              { name: 'RK_Falcon', score: 'Level 95 • Competitor' },
              { name: 'D7OOM', score: 'Level 92 • Elite' }
            ].map((player, i) => (
              <div key={i} className={styles.playerRow}>
                <div className={styles.playerRank}>#{i+1}</div>
                <div className={styles.playerAvatar}>
                  <img 
                    src={`https://avatar.iran.liara.run/public/${i+15}`} 
                    alt={player.name} 
                    onError={(e) => { e.target.src = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"; }}
                    style={{width:'100%', height:'100%', objectFit:'cover'}} 
                  />
                </div>
                <div className={styles.playerInfo}>
                  <span className={styles.playerName}>{player.name}</span>
                  <span className={styles.playerScore}>{player.score}</span>
                </div>
                <Link href="/profile" className={styles.playerViewBtn}>
                  {tExtra('view')}
                </Link>
              </div>
            ))}
          </div>
        </motion.div>
        
      </motion.section>

      {/* Features Grid */}
      <motion.section 
        className={styles.contentSection}
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className={styles.sectionSeparator}></div>
        <motion.div variants={fadeInUp} className={styles.sectionTitleWrapper}>
          <h2 className={styles.sectionTitle}>{tFeatures('title')}</h2>
        </motion.div>
        
        <div className={styles.featuresGrid}>
          {[1, 2, 3].map((feature) => {
             const icons = [<Shield key={1} />, <Users key={2} />, <Zap key={3} />];
             return (
              <motion.div key={feature} variants={fadeInUp} className={`${styles.featureCard} ${styles.glassPanel} hover-glow hover-lift`}>
                <div className={styles.featureIcon}>
                  {icons[feature-1]}
                </div>
                <h3 className="neon-text">{tFeatures(`feature${feature}`)}</h3>
                <p>{tFeatures(`feature${feature}Desc`)}</p>
              </motion.div>
             )
          })}
        </div>
      </motion.section>

      {/* Join Community CTA Section */}
      <motion.section 
        className={styles.ctaSection}
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className={styles.ctaContent}>
          <h2>{tExtra('joinCommunity')}</h2>
          <p>{tExtra('joinCommunityDesc')}</p>
          <Link href="/auth" className={styles.ctaButtonLarge}>
            {tExtra('createProfile')}
          </Link>
        </div>
      </motion.section>

    </div>
  );
}
