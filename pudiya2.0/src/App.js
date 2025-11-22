import { useEffect, useMemo, useState } from 'react';
import {
  BrowserRouter as Router,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import './App.css';
import { auth, db, isFirebaseConfigured } from './firebase';

const LOGO_SRC = `${process.env.PUBLIC_URL || ''}/pudi-logo.jpg`;

const INTENSITY_OPTIONS = [
  { value: 'low', label: 'Low', hint: 'Steady and calm', icon: '🌤' },
  { value: 'medium', label: 'Medium', hint: 'Needs attention', icon: '⚠️' },
  { value: 'high', label: 'High', hint: 'Critical response', icon: '🔥' },
];

const STATUS_OPTIONS = [
  { value: 'return_pudi', label: 'Return Pudi', icon: '🔁' },
  { value: 'kawa_pudi', label: 'Kawa Pudi', icon: '🍽' },
  { value: 'asarana_pudi', label: 'Asarana Pudi', icon: '🆘' },
];

const intensityLookup = INTENSITY_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option;
  return acc;
}, {});

const statusLookup = STATUS_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option;
  return acc;
}, {});

const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="loading-orbital">
      <div className="loading-logo-container">
        <img src={LOGO_SRC} alt="Pudi logo" className="loading-logo-image" />
      </div>
      <span className="orbital-dot" />
      <span className="orbital-dot" />
      <span className="orbital-dot" />
    </div>
    <div className="loading-glow" />
    <p className="loading-text">PuDi PaGe Is LoAdiNg !</p>
  </div>
);

// Removed Firebase config warning card
const MissingFirebaseAlert = () => null;

const getUserInitials = (user) => {
  const source = user?.displayName ?? user?.email ?? '';
  return source
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PD';
};

const formatRelativeTime = (date) => {
  if (!date) {
    return 'Unknown';
  }
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  const weeks = Math.round(days / 7);
  if (weeks < 5) {
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  const months = Math.round(days / 30);
  if (months < 12) {
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }
  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
};

const formatDateDisplay = (value) => {
  if (!value) {
    return 'Not set';
  }
  try {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (error) {
    return value;
  }
};

const Navbar = ({ user, onSignOut }) => {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith('/login') || location.pathname.startsWith('/register');

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="navbar-logo-link">
          <img src={LOGO_SRC} alt="Pudi logo" className="navbar-logo-image" />
          <span className="navbar-logo-text">PUDi DaShBoArD</span>
        </Link>
      </div>
      <div className="navbar-actions">
        {user ? (
          <>
            {!isAuthPage && (
              <Link to="/" className="navbar-button ghost-button">
                Dashboard
              </Link>
            )}
            <div className="user-chip">
              <span className="user-initials">{getUserInitials(user)}</span>
              <span className="user-name">{user.displayName ?? user.email}</span>
            </div>
            <button className="navbar-button" type="button" onClick={onSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link className={`navbar-button ghost-button${location.pathname === '/login' ? ' is-active' : ''}`} to="/login">
              Sign in
            </Link>
            <Link className={`navbar-button${location.pathname === '/register' ? ' is-active' : ''}`} to="/register">
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
};

const SkeletonLine = ({ className }) => (
  <span className={`skeleton-line ${className ?? ''}`} />
);

const StatCard = ({ label, value, delta, loading }) => (
  <article className="card stat-card">
    {loading ? (
      <>
        <SkeletonLine className="skeleton-title" />
        <SkeletonLine className="skeleton-value" />
        <SkeletonLine className="skeleton-delta" />
      </>
    ) : (
      <>
        <p className="stat-label">{label}</p>
        <h3 className="stat-value">{value}</h3>
        {delta ? <span className={`stat-delta ${delta.tone ? `delta-${delta.tone}` : ''}`}>{delta.text}</span> : null}
      </>
    )}
  </article>
);

const ActivityCard = ({ title, items, loading }) => (
  <article className="card activity-card">
    <h3 className="card-title">{title}</h3>
    <div className="card-content">
      {loading
        ? Array.from({ length: 4 }).map((_, index) => (
            <div className="activity-row" key={`skeleton-${index}`}>
              <SkeletonLine className="skeleton-activity-icon" />
              <SkeletonLine className="skeleton-activity-text" />
            </div>
          ))
        : items.length > 0
        ? items.map((item) => (
            <div className="activity-row" key={`${item.label}-${item.meta}`}>
              <span className="activity-icon" aria-hidden>
                {item.icon}
              </span>
              <div className="activity-text">
                <p className="activity-label">{item.label}</p>
                <span className="activity-meta">{item.meta}</span>
              </div>
            </div>
          ))
        : (
            <p className="empty-hint">No recent activity yet.</p>
          )}
    </div>
  </article>
);

const PerformanceCard = ({ loading, entries }) => {
  const chartHeights = useMemo(() => {
    if (loading) {
      return [];
    }
    if (!entries.length) {
      return Array.from({ length: 12 }, (_, index) => 35 + (index % 4) * 12);
    }
    return entries.slice(0, 18).map((entry, index) => {
      const base = entry.intensity === 'high' ? 92 : entry.intensity === 'medium' ? 68 : 40;
      const jitter = (index % 5) * 4;
      return Math.min(100, Math.max(28, base - jitter));
    });
  }, [loading, entries]);

  return (
    <article className="card performance-card">
      <div className="card-header">
        <h3>Performance Pulse</h3>
        {!loading && <span className="badge badge-live">Live</span>}
      </div>
      {loading ? (
        <div className="chart-skeleton">
          <SkeletonLine className="skeleton-chart" />
          <SkeletonLine className="skeleton-chart" />
          <SkeletonLine className="skeleton-chart" />
        </div>
      ) : (
        <div className="chart-grid" aria-label="Pudi intensity spark chart">
          {chartHeights.map((height, index) => (
            <span className="chart-bar" key={`bar-${index}`} style={{ height: `${height}%`, '--bar-index': index }} />
          ))}
        </div>
      )}
    </article>
  );
};

const PudiFormModal = ({ isOpen, initialData, onClose, onSubmit, isSaving }) => {
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    intensity: 'medium',
    status: 'return_pudi',
    notes: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title ?? '',
        date: initialData.date ?? '',
        intensity: initialData.intensity ?? 'medium',
        status: initialData.status ?? 'return_pudi',
        notes: initialData.notes ?? '',
      });
    } else {
      setFormData({
        title: '',
        date: new Date().toISOString().slice(0, 10),
        intensity: 'medium',
        status: 'return_pudi',
        notes: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2>{initialData ? 'Update Pudi' : 'Upload Pudi'}</h2>
            <p className="modal-subtitle">Fill the latest pudi intel so everyone stays aligned.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close form">
            ×
          </button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="input-group">
            <span className="input-label">Pudiya</span>
            <input
              className="input-control"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter pudiya name"
              required
            />
          </label>

          <div className="input-grid">
            <label className="input-group">
              <span className="input-label">Pudiya dipu dawasa</span>
              <input
                className="input-control"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </label>

            <label className="input-group">
              <span className="input-label">Pudiye hati</span>
              <select className="input-control" name="intensity" value={formData.intensity} onChange={handleChange}>
                {INTENSITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="input-group">
            <span className="input-label">Pudiye current situation</span>
            <select className="input-control" name="status" value={formData.status} onChange={handleChange}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="input-group">
            <span className="input-label">Notes (optional)</span>
            <textarea
              className="input-control"
              name="notes"
              rows={3}
              placeholder="Add extra context for the team"
              value={formData.notes}
              onChange={handleChange}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : initialData ? 'Update Pudi' : 'Publish Pudi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PudiBoard = ({ entries, loading, onEdit, currentUser }) => {
  if (loading) {
    return (
      <section className="pudi-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <article className="card pudi-card" key={`skeleton-pudi-${index}`}>
            <SkeletonLine className="skeleton-title" />
            <SkeletonLine className="skeleton-value" />
            <SkeletonLine className="skeleton-delta" />
          </article>
        ))}
      </section>
    );
  }

  if (!entries.length) {
    return (
      <div className="empty-state">
        <h3>No pudi intel yet</h3>
        <p>Share the first pudi update so the squad can jump in.</p>
      </div>
    );
  }

  return (
    <section className="pudi-grid">
      {entries.map((entry) => {
        const intensity = intensityLookup[entry.intensity] ?? intensityLookup.medium;
        const status = statusLookup[entry.status] ?? statusLookup.return_pudi;
        const createdAt = entry.createdAt?.toDate ? entry.createdAt.toDate() : entry.createdAt ? new Date(entry.createdAt) : null;
        const updatedAt = entry.updatedAt?.toDate ? entry.updatedAt.toDate() : entry.updatedAt ? new Date(entry.updatedAt) : null;

        return (
          <article className="card pudi-card" key={entry.id}>
            <header className="pudi-card-header">
              <div>
                <h3>{entry.title}</h3>
                <p className="pudi-meta">
                  {formatDateDisplay(entry.date)} • {intensity.icon} {intensity.label}
                </p>
              </div>
              {entry.ownerId === currentUser?.uid ? (
                <button className="icon-button" type="button" onClick={() => onEdit(entry)}>
                  ✏️
                </button>
              ) : null}
            </header>

            {entry.notes ? <p className="pudi-notes">{entry.notes}</p> : null}

            <div className="pudi-tags">
              <span className={`chip chip-${entry.intensity}`}>{intensity.icon} {intensity.label}</span>
              <span className={`chip chip-status`}>{status.icon} {status.label}</span>
            </div>

            <footer className="pudi-footer">
              <span className="pudi-owner">By {entry.ownerName ?? 'Unknown'} </span>
              <span className="pudi-updated">Updated {formatRelativeTime(updatedAt ?? createdAt)}</span>
            </footer>
          </article>
        );
      })}
    </section>
  );
};

const Dashboard = ({ user }) => {
  const [entries, setEntries] = useState([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setIsLoadingEntries(false);
      return () => undefined;
    }

    const pudiQuery = query(collection(db, 'pudiEntries'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      pudiQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
        setEntries(data);
        setIsLoadingEntries(false);
      },
      () => {
        setError('Could not load pudis right now. Try again shortly.');
        setIsLoadingEntries(false);
      }
    );

    return unsubscribe;
  }, []);

  const stats = useMemo(() => {
    const total = entries.length;
    const high = entries.filter((entry) => entry.intensity === 'high').length;
    const medium = entries.filter((entry) => entry.intensity === 'medium').length;
    const low = entries.filter((entry) => entry.intensity === 'low').length;
    const returns = entries.filter((entry) => entry.status === 'return_pudi').length;
    const asarana = entries.filter((entry) => entry.status === 'asarana_pudi').length;

    return [
      {
        label: 'Active Pudi',
        value: total.toString(),
        delta: { text: `${high} high intensity`, tone: high > 0 ? 'alert' : 'neutral' },
      },
      {
        label: 'Pudi Rate',
        value: `${medium} medium`,
        delta: { text: `${low} staying chill`, tone: 'up' },
      },
      {
        label: 'Pudiya Vulnerabilities (Pudiye damage wena aya)',
        value: `${asarana} critical`,
        delta: { text: `${returns} recovering`, tone: returns > 0 ? 'up' : 'alert' },
      },
      {
        label: 'Money Spent for Pudi Recovery',
        value: `$${(asarana * 420 + high * 150).toLocaleString()}`,
        delta: { text: 'Est. allocation', tone: 'neutral' },
      },
    ];
  }, [entries]);

  const recentActivity = useMemo(() => {
    return entries.slice(0, 4).map((entry) => ({
      icon: intensityLookup[entry.intensity]?.icon ?? '⚡',
      label: entry.title,
      meta: `${statusLookup[entry.status]?.label ?? 'Status'} • ${formatRelativeTime(
        entry.updatedAt?.toDate ? entry.updatedAt.toDate() : entry.updatedAt ? new Date(entry.updatedAt) : null
      )}`,
    }));
  }, [entries]);

  const openCreateModal = () => {
    setEditingEntry(null);
    setIsModalOpen(true);
    setError('');
  };

  const openEditModal = (entry) => {
    setEditingEntry({
      ...entry,
      date: entry.date
        ? typeof entry.date === 'string'
          ? entry.date.includes('-')
            ? entry.date
            : new Date(entry.date).toISOString().slice(0, 10)
          : entry.date?.toDate
          ? entry.date.toDate().toISOString().slice(0, 10)
          : new Date(entry.date).toISOString().slice(0, 10)
        : '',
    });
    setIsModalOpen(true);
    setError('');
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
    setError('');
  };

  const handleSave = async (data) => {
    if (!user || !isFirebaseConfigured || !db) {
      setError('Sign in and configure Firebase to save pudis.');
      return;
    }

    setIsSaving(true);
    setError('');

    const payload = {
      title: data.title.trim(),
      date: data.date,
      intensity: data.intensity,
      status: data.status,
      notes: data.notes?.trim() ?? '',
      ownerId: user.uid,
      ownerName: user.displayName ?? user.email,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingEntry) {
        const docRef = doc(db, 'pudiEntries', editingEntry.id);
        await updateDoc(docRef, payload);
      } else {
        await addDoc(collection(db, 'pudiEntries'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
      setEditingEntry(null);
    } catch (error) {
      setError('Saving failed. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Shakya Pudi Command Center</h1>
          <p className="dashboard-subtitle">Track every pudi signal and keep the crew ready.</p>
        </div>
        <button className="primary-button" type="button" onClick={openCreateModal}>
          Upload Pudi
        </button>
      </header>

      {error ? <div className="inline-error">{error}</div> : null}

      <section className="stat-grid">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} loading={isLoadingEntries} />
        ))}
      </section>

      <section className="content-grid">
        <PerformanceCard loading={isLoadingEntries} entries={entries} />
        <div className="side-column">
          <ActivityCard title="Activity Stream" items={recentActivity} loading={isLoadingEntries} />
          <ActivityCard
            title="Roadmap"
            items={[
              { icon: '🛡', label: 'Fortify vulnerable pudi', meta: 'ETA: 3 days' },
              { icon: '🚨', label: 'High alert response playbook', meta: 'ETA: 1 week' },
              { icon: '🧰', label: 'Recovery toolkit rollout', meta: 'ETA: 10 days' },
              { icon: '📡', label: 'Realtime telemetry upgrade', meta: 'ETA: 2 weeks' },
            ]}
            loading={isLoadingEntries}
          />
        </div>
      </section>

      <PudiBoard entries={entries} loading={isLoadingEntries} onEdit={openEditModal} currentUser={user} />

      <PudiFormModal
        isOpen={isModalOpen}
        initialData={editingEntry}
        onClose={handleModalClose}
        onSubmit={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
};

const formatAuthError = (error) => {
  if (!error) {
    return '';
  }
  const errorCode = error.code ?? '';
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try signing in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
      return 'Check your email and password and try again.';
    case 'auth/user-not-found':
      return 'No account found for that email. Register first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isFirebaseConfigured || !auth) {
    return <MissingFirebaseAlert />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Welcome back, Pudi watcher</h1>
        <p className="auth-subtitle">Sign in with your email and password to manage the dashboard.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="input-group">
            <span className="input-label">Email</span>
            <input
              className="input-control"
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label className="input-group">
            <span className="input-label">Password</span>
            <input
              className="input-control"
              type="password"
              name="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          {error ? <div className="inline-error">{error}</div> : null}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="auth-switch">
          No account yet? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isFirebaseConfigured || !auth) {
    return <MissingFirebaseAlert />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      if (form.name.trim()) {
        await updateProfile(userCredential.user, { displayName: form.name.trim() });
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Create your Pudi profile</h1>
        <p className="auth-subtitle">Register with a name, email, and password to upload pudis.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="input-group">
            <span className="input-label">Display name</span>
            <input
              className="input-control"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Shakya Pudi"
              required
            />
          </label>

          <label className="input-group">
            <span className="input-label">Email</span>
            <input
              className="input-control"
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label className="input-group">
            <span className="input-label">Password</span>
            <input
              className="input-control"
              type="password"
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </label>

          <label className="input-group">
            <span className="input-label">Confirm password</span>
            <input
              className="input-control"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
            />
          </label>

          {error ? <div className="inline-error">{error}</div> : null}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="auth-switch">
          Already onboard? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const appTimer = setTimeout(() => setIsAppLoading(false), 1600);
    return () => clearTimeout(appTimer);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthReady(true);
      return () => undefined;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  const handleSignOut = async () => {
    if (!auth) {
      return;
    }
    await signOut(auth);
  };

  if (isAppLoading || !authReady) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <div className="app-shell">
        <Navbar user={currentUser} onSignOut={handleSignOut} />
        <main className="dashboard-wrapper">
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute user={currentUser}>
                  {isFirebaseConfigured ? <Dashboard user={currentUser} /> : <MissingFirebaseAlert />}
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={currentUser ? <Navigate to="/" replace /> : <LoginPage />} />
            <Route path="/register" element={currentUser ? <Navigate to="/" replace /> : <RegisterPage />} />
            <Route path="*" element={<Navigate to={currentUser ? '/' : '/login'} replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
