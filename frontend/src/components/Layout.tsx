import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth, useCurrentUser } from '../auth/useAuth'
import Avatar from './Avatar'
import Icon from './Icon'
import type { IconName } from './Icon'
import ThemeToggle from './ThemeToggle'

const LINKS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Dashboard', icon: 'home' },
  { to: '/subscriptions', label: 'Subscriptions', icon: 'layers' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { logout } = useAuth()
  const user = useCurrentUser()
  const { pathname } = useLocation()

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Subtrack</div>
        <nav className="nav">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className="nav-link">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="nav-active"
                      transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                    />
                  )}
                  <Icon name={link.icon} />
                  <span>{link.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <ThemeToggle />
          <div className="sidebar-user">
            <Avatar name={user.displayName} size={32} />
            <div className="sidebar-user-text">
              <strong>{user.displayName}</strong>
              <span>{user.email}</span>
            </div>
            <button className="icon-button" onClick={logout} aria-label="Sign out" title="Sign out">
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>
      {/* Keyed by path so each page plays its entrance animation when you navigate to it. */}
      <main className="content page" key={pathname}>
        {children}
      </main>
    </div>
  )
}
