/**
 * 通勤地图找房 - 主应用
 */

import type { CSSProperties } from 'react';
import { MapView } from '@/components/MapView';

function App() {
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <p style={styles.kicker}>Beijing Commute Finder</p>
            <h1 style={styles.title}>通勤地图找房</h1>
            <p style={styles.subtitle}>输入工作地点，画出通勤圈，一眼看清圈内房价</p>
          </div>
          <div style={styles.headerMeta}>
            <span style={styles.metaPill}>地图 + 列表联动</span>
            <span style={styles.metaPill}>租金筛选</span>
            <span style={styles.metaPill}>点击地图选点</span>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <MapView />
      </main>

      <footer style={styles.footer}>
        <p>当前是 MVP：地点搜索、通勤圈、租金筛选和圈内小区联动已经接通。</p>
      </footer>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(180deg, #fff8ef 0%, #f6f8fb 40%, #eef2f9 100%)',
  },
  header: {
    color: '#132238',
    padding: '32px 32px 12px',
  },
  headerInner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '18px',
    flexWrap: 'wrap',
  },
  kicker: {
    margin: 0,
    fontSize: '12px',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: '#a04f2f',
  },
  title: {
    margin: '8px 0 0',
    fontSize: '40px',
    lineHeight: 1.05,
    fontWeight: 800,
  },
  subtitle: {
    margin: '10px 0 0',
    fontSize: '15px',
    color: '#5c6a82',
  },
  headerMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  metaPill: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.82)',
    border: '1px solid rgba(19,34,56,0.08)',
    boxShadow: '0 10px 30px rgba(19,34,56,0.08)',
    fontSize: '13px',
    color: '#31425f',
  },
  main: {
    flex: 1,
    padding: '20px 32px 32px',
  },
  footer: {
    textAlign: 'center',
    padding: '16px',
    color: '#666',
    fontSize: '14px',
    background: 'rgba(255,255,255,0.7)',
    borderTop: '1px solid rgba(19,34,56,0.08)',
  },
};

export default App;
