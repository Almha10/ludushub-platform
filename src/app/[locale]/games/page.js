import Image from 'next/image';
import { Link } from '@/i18n/routing';
import styles from './page.module.css';

async function getGames() {
  const res = await fetch(`https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&page_size=15`, { 
    next: { revalidate: 3600 } 
  });
  
  if (!res.ok) {
    return { results: [] };
  }
  
  return res.json();
}

export default async function GamesDirectory() {
  const data = await getGames();
  const games = data.results || [];

  return (
    <div className={styles.container}>
      <div className={styles.headerBlock}>
        <h1 className={styles.title}>دليل الألعاب</h1>
        <p className={styles.subtitle}>اكتشف الألعاب، انضم للمساحات، وابحث عن الأندية.</p>
      </div>

      <div className={styles.grid}>
        {games.map(game => (
          <div key={game.id} className={`${styles.card} glass-panel`}>
            <div className={styles.imageWrapper}>
              {game.background_image ? (
                <img 
                  src={game.background_image}
                  alt={game.name}
                  className={styles.image}
                />
              ) : (
                <div className={styles.imagePlaceholder} />
              )}
              <div className={styles.overlayTags}>
                <span className={styles.ratingBadge}>⭐ {game.rating}</span>
              </div>
            </div>
            
            <div className={styles.cardContent}>
              <h3 className={styles.gameTitle}>{game.name}</h3>
              
              <div className={styles.statsRow}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>المساحات النشطة</span>
                  <span className={styles.statValue}>{(game.id % 50) + 10}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>الأندية</span>
                  <span className={styles.statValue}>{(game.id % 20) + 3}</span>
                </div>
              </div>

              <div className={styles.platforms}>
                {game.parent_platforms?.slice(0, 3).map(p => (
                  <span key={p.platform.id} className={styles.platformBadge}>
                    {p.platform.name}
                  </span>
                ))}
              </div>

              <div className={styles.ctaGroup}>
                <Link href={`/spaces?game=${encodeURIComponent(game.name)}`} className={`${styles.btn} ${styles.btnPrimary}`}>
                  انضم للمساحة
                </Link>
                <Link href={`/clubs?game=${encodeURIComponent(game.name)}`} className={`${styles.btn} ${styles.btnSecondary}`}>
                  عرض الأندية
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
