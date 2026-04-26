'use client';
import { useState } from 'react';
import { Shield, Bell, AlertTriangle, User, Globe, Sliders, LogOut } from 'lucide-react';
import styles from './page.module.css';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);

  return (
    <div className={styles.wrapper}>
      <div className={styles.titleWrapper}>
        <h1 className={styles.titleHead}>الإعدادات</h1>
        <span className={styles.arSubtitle}>تحكم في حسابك وتفضيلاتك</span>
      </div>

      <div className={styles.settingsContainer}>
        
        {/* الحساب */}
        <div className={`${styles.settingsBlock} glass-panel`}>
          <div className={styles.blockTitle}>
            <User size={22} />
            <h2>الحساب</h2>
          </div>
          
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <h3>المعلومات الشخصية</h3>
              <p>تحديث اسم المستخدم والبريد الإلكتروني والصورة الرمزية.</p>
            </div>
            <button className="primary-button" style={{padding: '0.4rem 1rem'}}>تعديل</button>
          </div>
        </div>

        {/* الخصوصية والأمان */}
        <div className={`${styles.settingsBlock} glass-panel`}>
          <div className={styles.blockTitle}>
            <Shield size={22} />
            <h2>الخصوصية والأمان</h2>
          </div>
          
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <h3>تغيير كلمة المرور</h3>
              <p>قم بتحديث كلمة المرور الخاصة بحسابك لضمان الحماية.</p>
            </div>
            <button className="primary-button" style={{padding: '0.4rem 1rem'}}>تغيير</button>
          </div>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <h3>المصادقة الثنائية</h3>
              <p>أضف طبقة حماية إضافية لحسابك.</p>
            </div>
            <button className="secondary-button" style={{padding: '0.4rem 1rem'}}>تفعيل</button>
          </div>
        </div>

        {/* الإشعارات */}
        <div className={`${styles.settingsBlock} glass-panel`}>
          <div className={styles.blockTitle}>
            <Bell size={22} />
            <h2>الإشعارات</h2>
          </div>
          
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <h3>الإشعارات الديناميكية</h3>
              <p>إشعارات التحديات والرسائل والتحديثات.</p>
            </div>
            <div 
              className={`${styles.toggleSwitch} ${notifications ? styles.active : ''}`}
              onClick={() => setNotifications(!notifications)}
            >
              <div className={styles.toggleThumb}></div>
            </div>
          </div>
        </div>

        {/* اللغة */}
        <div className={`${styles.settingsBlock} glass-panel`}>
          <div className={styles.blockTitle}>
            <Globe size={22} />
            <h2>اللغة</h2>
          </div>
          
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <h3>لغة واجهة المستخدم</h3>
              <p>اختر اللغة المفضلة لعرض المنصة.</p>
            </div>
            <select className={styles.selectDropdown}>
              <option value="ar">العربية</option>
              <option value="en">الإنجليزية</option>
            </select>
          </div>
        </div>

        {/* التفضيلات */}
        <div className={`${styles.settingsBlock} glass-panel`}>
          <div className={styles.blockTitle}>
            <Sliders size={22} />
            <h2>التفضيلات</h2>
          </div>
          
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <h3>حالة الظهور</h3>
              <p>تحديد من يمكنه رؤية نشاطك وحالتك الخاصة.</p>
            </div>
            <select className={styles.selectDropdown}>
              <option value="public">الجميع</option>
              <option value="friends">الأصدقاء فقط</option>
              <option value="private">مخفي</option>
            </select>
          </div>
        </div>

        {/* إدارة الحساب (Danger Zone) */}
        <div className={`${styles.settingsBlock} glass-panel`} style={{borderColor: 'rgba(239, 68, 68, 0.2)'}}>
          <div className={`${styles.blockTitle} ${styles.dangerTitle}`}>
            <LogOut size={22} />
            <h2 style={{color: '#ef4444'}}>إدارة الحساب</h2>
          </div>
          
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <h3>حذف الحساب نهائياً</h3>
              <p>سيتم مسح جميع بياناتك، وتصنيفك، وهويتك الرقمية للأبد.</p>
            </div>
            <button className={styles.dangerBtn}>حذف الحساب</button>
          </div>
        </div>

      </div>
    </div>
  );
}
