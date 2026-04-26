import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>&copy; LudusHub 2026. All rights reserved.</div>
        <div className={styles.links}>
          <a href="#" className={styles.link}>Twitter / X</a>
          <a href="#" className={styles.link}>Discord</a>
          <a href="#" className={styles.link}>Twitch</a>
        </div>
      </div>
    </footer>
  );
}
