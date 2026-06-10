import { NavLink, Outlet } from 'react-router-dom';

import Icon from './Icon.jsx';
import { useTheme } from '../context/theme.js';

const links = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/products', label: 'Products', icon: 'package' },
  { to: '/customers', label: 'Customers', icon: 'users' },
  { to: '/orders', label: 'Orders', icon: 'orders' },
];

function Brand() {
  return (
    <>
      <span className="brand-mark" aria-hidden="true">
        <Icon name="boxes" size={20} />
      </span>
      <span>Inventory&nbsp;&amp;&nbsp;Orders</span>
    </>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      className="icon-btn icon-btn--bordered"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={18} />
    </button>
  );
}

export default function Layout() {
  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <Brand />
        </div>
        <div className="sidebar__section">Menu</div>
        <nav className="nav" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
            >
              <Icon name={link.icon} size={19} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="topbar">
        <div className="topbar__brand">
          <Brand />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <ThemeToggle />
        </div>
      </header>

      <main id="main" className="main">
        <div className="content">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="bottom-nav" aria-label="Primary">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `bottom-nav__link${isActive ? ' bottom-nav__link--active' : ''}`}
          >
            <Icon name={link.icon} size={21} />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
