import React from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import ResultsPage from './pages/ResultsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AccountPage from './pages/AccountPage';
import TripHistoryPage from './pages/TripHistoryPage';
import TripDetailPage from './pages/TripDetailPage';
import RequireAuth from './components/RequireAuth';
import UserMenu from './components/UserMenu';

function Mark() {
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="0.5" y="0.5" width="21" height="21" rx="3.5" stroke="#15171A" />
        <path d="M5 16 L11 5 L17 16" stroke="#15171A" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
        <line x1="7.5" y1="12" x2="14.5" y2="12" stroke="#B7472A" strokeWidth="1.4" />
      </svg>
      <span className="font-serif text-[20px] leading-none tracking-editorial text-ink">
        Ledger
      </span>
      <span className="hidden text-[11px] font-medium uppercase tracking-widelabel text-ink-40 sm:inline">
        / travel
      </span>
    </Link>
  );
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `relative inline-flex items-center text-[13px] font-medium transition ${
          isActive ? 'text-ink' : 'text-ink-60 hover:text-ink'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {children}
          {isActive && <span className="absolute -bottom-[18px] left-0 right-0 h-px bg-ink" />}
        </>
      )}
    </NavLink>
  );
}

function App() {
  return (
    <div className="relative z-10 min-h-screen">
      <header className="sticky top-0 z-30 border-b border-ink-10 bg-paper/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-6 px-6 py-4 lg:px-10">
          <Mark />

          <nav className="hidden items-center gap-7 md:flex">
            <NavItem to="/">Optimize</NavItem>
            <NavItem to="/trips">Trips</NavItem>
            <NavItem to="/account">Account</NavItem>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-widelabel text-ink-60 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-moss" />
              Live · v0.6
            </span>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="relative">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/account"
            element={(
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            )}
          />
          <Route
            path="/trips"
            element={(
              <RequireAuth>
                <TripHistoryPage />
              </RequireAuth>
            )}
          />
          <Route
            path="/trips/:id"
            element={(
              <RequireAuth>
                <TripDetailPage />
              </RequireAuth>
            )}
          />
        </Routes>
      </main>

      <footer className="mt-24 border-t border-ink-10 bg-paper-soft/40">
        <div className="mx-auto flex max-w-[1180px] flex-col items-start justify-between gap-6 px-6 py-10 text-[12px] text-ink-60 sm:flex-row sm:items-center lg:px-10">
          <div className="flex items-center gap-3">
            <span className="font-mono uppercase tracking-widelabel">Ledger</span>
            <span className="text-ink-20">·</span>
            <span>An optimizer for points, miles and cards.</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-ink">Privacy</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-ink">Terms</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-ink">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
