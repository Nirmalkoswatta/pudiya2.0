import { useEffect, useMemo, useState } from 'react';
import './App.css';

const LOGO_SRC = `${process.env.PUBLIC_URL || ''}/pudi-logo.jpg`;

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

const Navbar = () => (
  <header className="navbar">
    <div className="navbar-brand">
      <img src={LOGO_SRC} alt="Pudi logo" className="navbar-logo-image" />
      <span className="navbar-logo-text">PUDi DaShBoArD</span>
    </div>
    <div className="navbar-actions">
      <button className="navbar-button" type="button">
        Quick Insights
      </button>
      <div className="user-chip">
        <span className="user-initials">PD</span>
        <span className="user-name">Pudi Admin</span>
      </div>
    </div>
  </header>
);

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
        <span className={`stat-delta ${delta.startsWith('+') ? 'delta-up' : 'delta-down'}`}>
          {delta}
        </span>
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
        : items.map((item) => (
            <div className="activity-row" key={item.label}>
              <span className="activity-icon" aria-hidden>
                {item.icon}
              </span>
              <div className="activity-text">
                <p className="activity-label">{item.label}</p>
                <span className="activity-meta">{item.meta}</span>
              </div>
            </div>
          ))}
    </div>
  </article>
);

const PerformanceCard = ({ loading }) => {
  const chartHeights = useMemo(
    () => (loading ? [] : Array.from({ length: 18 }, () => 30 + Math.random() * 60)),
    [loading]
  );

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
        <div className="chart-grid" aria-label="Performance spark chart">
          {chartHeights.map((height, index) => (
            <span
              className="chart-bar"
              key={`bar-${index}`}
              style={{ height: `${height}%`, '--bar-index': index }}
            />
          ))}
        </div>
      )}
    </article>
  );
};

const Dashboard = ({ loading }) => {
  const stats = useMemo(
    () => [
      { label: 'Active Pudi', value: '1,284', delta: '+12.4%' },
      { label: 'Pudi Rate', value: '7.6%', delta: '+0.8%' },
      { label: 'Pudiya Vulnerabilities (Pudiye damage wena aya)', value: '92%', delta: '-1.1%' },
      { label: 'Money Spent for Pudi Recovery', value: '$18.2K', delta: '+5.6%' },
    ],
    []
  );

  const activities = useMemo(
    () => ({
      updates: [
        { icon: '⚡', label: 'Realtime peak reached', meta: 'Just now' },
        { icon: '🛒', label: '52 new PUDII', meta: '15 minutes ago' },
        { icon: '👤', label: '12 VIP PUDI', meta: '1 hour ago' },
        { icon: '💬', label: '7 support replies for Pudi', meta: '2 hours ago' },
      ],
      roadmap: [
        { icon: '🎯', label: 'Goals recalibration', meta: 'ETA: 3 days' },
        { icon: '🚀', label: 'Growth launch plan', meta: 'ETA: 1 week' },
        { icon: '🔒', label: 'Security audit', meta: 'ETA: 10 days' },
        { icon: '📊', label: 'Insights refresh', meta: 'ETA: 2 weeks' },
      ],
    }),
    []
  );

  return (
    <div className="dashboard">
      <section className="stat-grid">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} loading={loading} />
        ))}
      </section>

      <section className="content-grid">
        <PerformanceCard loading={loading} />
        <div className="side-column">
          <ActivityCard title="Activity Stream" items={activities.updates} loading={loading} />
          <ActivityCard title="Roadmap" items={activities.roadmap} loading={loading} />
        </div>
      </section>
    </div>
  );
};

function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    const appTimer = setTimeout(() => setIsAppLoading(false), 2000);
    const dataTimer = setTimeout(() => setIsDataLoading(false), 3200);

    return () => {
      clearTimeout(appTimer);
      clearTimeout(dataTimer);
    };
  }, []);

  if (isAppLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard-wrapper">
        <Dashboard loading={isDataLoading} />
      </main>
    </div>
  );
}

export default App;
