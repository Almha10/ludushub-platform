import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Download, Bot, Ghost, Swords, Skull, ShieldAlert, Zap, UserRound, Pencil, Check, Camera } from 'lucide-react';
import styles from './PlayerCard.module.css';

const PRESET_ICONS = [
  { id: 'Bot', icon: Bot },
  { id: 'Ghost', icon: Ghost },
  { id: 'Swords', icon: Swords },
  { id: 'Skull', icon: Skull },
  { id: 'ShieldAlert', icon: ShieldAlert },
  { id: 'Zap', icon: Zap }
];

const IconMap = { Bot, Ghost, Swords, Skull, ShieldAlert, Zap };

export default function PlayerCard({ 
  username, 
  tag, 
  bio, 
  stats, 
  avatar_url, 
  clubs = [],
  theme = "Cyberpunk", 
  onUpdateName, 
  onUpdateBio,
  onUploadAvatar, 
  onSelectPreset,
  isVerified = false,
  status = 'متصل',
  roleDisplay = 'لاعب',
  lastActivity = 'الآن'
}) {
  const cardRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editName, setEditName] = useState(username);
  const [editBio, setEditBio] = useState(bio);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  const handleSaveName = () => {
    setIsEditing(false);
    if (editName && editName !== username) {
      onUpdateName?.(editName);
    }
  };

  const handleSaveBio = () => {
    setIsEditingBio(false);
    if (editBio !== bio) {
      onUpdateBio?.(editBio);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && onUploadAvatar) {
      await onUploadAvatar(file);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: null, useCORS: true });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `LudusHub-${username}-ID.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to capture image:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const getThemeClass = () => {
    switch(theme) {
      case "Neon Saudi": return styles.themeNeonSaudi;
      case "Minimalist": return styles.themeMinimalist;
      default: return styles.themeCyberpunk;
    }
  };

  return (
    <div className={styles.cardWrapper}>
      <motion.div
        ref={cardRef}
        className={`${styles.card} ${getThemeClass()} ${sidePanelOpen ? styles.sidePanelActive : ''}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        dir="rtl"
      >
        {/* Side ID Strip */}
        <div className={styles.sideStripe} onClick={() => setSidePanelOpen(!sidePanelOpen)}>
          <div className={styles.sideCode}>AH-{tag?.replace('#', '') || 'GUEST'}</div>
          <Zap size={14} className={styles.sideIcon} />
        </div>

        {/* Header: Network Status & Network Name */}
        <div className={styles.header}>
          <div className={styles.statusGroup}>
            <span className={`${styles.statusDot} ${status === 'متصل' ? styles.online : styles.offline}`}></span>
            <span className={styles.statusText}>{status}</span>
          </div>
          <div className={styles.brand}>LUDUSHUB <span className={styles.identityText}>IDENTITY</span></div>
        </div>

        {/* Profile Core: Avatar + Bio Column */}
        <div className={styles.profileCore}>
          <div className={styles.avatarContainer}>
            <div className={styles.avatarMain} onClick={() => fileInputRef.current.click()}>
              {avatar_url?.startsWith('http') ? (
                <img src={avatar_url} alt="Avatar" className={styles.avatarImg} />
              ) : avatar_url && IconMap[avatar_url] ? (
                (() => { const ActiveIcon = IconMap[avatar_url]; return <ActiveIcon size={32} />; })() 
              ) : (
                <UserRound size={32} />
              )}
              <div className={styles.avatarHover}><Camera size={16} /></div>
            </div>
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
          </div>

          <div className={styles.nameSection}>
            <div className={styles.nameRow}>
              {isEditing ? (
                <div className={styles.editWrap}>
                  <input 
                    className={styles.editInput} 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    autoFocus
                  />
                </div>
              ) : (
                <>
                  <h2 className={styles.name} onClick={() => setIsEditing(true)}>{username}</h2>
                  {isVerified && <ShieldAlert size={14} className={styles.verified} />}
                </>
              )}
            </div>
            <div className={styles.subRow}>
              <span className={styles.roleTag}>{roleDisplay}</span>
              <span className={styles.playerNum}>{tag}</span>
            </div>
          </div>
        </div>

        {/* Bio Section - Compact */}
        <div className={styles.bioBox}>
          {isEditingBio ? (
            <textarea 
              className={styles.bioTextarea}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              onBlur={handleSaveBio}
              autoFocus
            />
          ) : (
            <p className={styles.bioText} onClick={() => setIsEditingBio(true)}>
              {bio || "اكتشف عالم الألعاب التنافسي في LudusHub..."}
            </p>
          )}
        </div>

        {/* Stats Grid - Ultra Compact */}
        <div className={styles.statsRow}>
          <div className={styles.statPoint}>
            <span className={styles.statV}>{stats.followers || 0}</span>
            <span className={styles.statL}>تابع</span>
          </div>
          <div className={styles.statDivider}></div>
          <div className={styles.statPoint}>
            <span className={styles.statV}>{stats.achievements || 0}</span>
            <span className={styles.statL}>إنجاز</span>
          </div>
          <div className={styles.statDivider}></div>
          <div className={styles.statPoint}>
            <span className={styles.statV}>{stats.level || 1}</span>
            <span className={styles.statL}>مستوى</span>
          </div>
        </div>

        {/* Lists: Games & Clubs */}
        <div className={styles.interestsSection}>
          <div className={styles.interestGroup}>
            <span className={styles.interestLabel}>الألعاب الشائعة</span>
            <div className={styles.pills}>
              {stats.games?.length > 0 ? (
                stats.games.slice(0, 3).map(g => <span key={g} className={styles.pill}>{g}</span>)
              ) : (
                <span className={styles.emptyHint}>لا توجد ألعاب</span>
              )}
            </div>
          </div>
          <div className={styles.interestGroup}>
            <span className={styles.interestLabel}>الأندية</span>
            <div className={styles.pills}>
              {clubs.length > 0 ? (
                clubs.slice(0, 2).map(c => <span key={c.id || c} className={`${styles.pill} ${styles.clubPill}`}>{c.name || c}</span>)
              ) : (
                <span className={styles.emptyHint}>لم ينضم لنادي</span>
              )}
            </div>
          </div>
        </div>

        {/* Functional Side Panel Overlay */}
        {sidePanelOpen && (
          <motion.div 
            className={styles.idOverlay}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className={styles.idClose} onClick={() => setSidePanelOpen(false)}><X size={20} /></div>
            <div className={styles.idInner}>
              <div className={styles.qrContainer}>
                <QRCodeSVG 
                  value={tag ? `https://ludushub.com/player/${encodeURIComponent(tag.replace('#', ''))}` : 'https://ludushub.com'} 
                  size={140} 
                  bgColor="transparent" 
                  fgColor="#fff" 
                />
              </div>
              <div className={styles.idTagText}>{tag}</div>
              <div className={styles.idSubText}>Digital Identity Verified</div>
            </div>
          </motion.div>
        )}
      </motion.div>

      <button className={`${styles.downloadButton} secondary-button`} onClick={handleDownload} disabled={isDownloading}>
        <Download size={14} />
        <span>{isDownloading ? "جاري..." : "حفظ الهوية"}</span>
      </button>
    </div>
  );
}
