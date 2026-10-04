import DangerZone from '../components/settings/DangerZone'
import EmailSection from '../components/settings/EmailSection'
import PasswordSection from '../components/settings/PasswordSection'
import ProfileSection from '../components/settings/ProfileSection'
import TwoFactorSection from '../components/settings/TwoFactorSection'

export default function SettingsPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="muted">Your profile, sign-in and security.</p>
        </div>
      </header>
      <div className="settings-grid">
        <div className="stagger">
          <ProfileSection />
          <EmailSection />
          <DangerZone />
        </div>
        <div className="stagger">
          <TwoFactorSection />
          <PasswordSection />
        </div>
      </div>
    </>
  )
}
