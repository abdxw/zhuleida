/**
 * 通勤地图找房 - 主应用
 */

import { MapView } from '@/components/MapView';

function App() {
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🏠 通勤地图找房</h1>
        <p style={styles.subtitle}>输入工作地点，画出通勤圈，一眼看清圈内房价</p>
      </header>

      <main style={styles.main}>
        <MapView
          workLocation={[116.369329, 39.987312]} // 北大医学部
          commuteMinutes={45}
        />
      </main>

      <footer style={styles.footer}>
        <p>做着玩玩，没人用自己用 😄</p>
      </footer>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#f5f5f5',
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '24px 40px',
    textAlign: 'center',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
  },
  subtitle: {
    margin: '8px 0 0',
    fontSize: '14px',
    opacity: 0.9,
  },
  main: {
    flex: 1,
    padding: '20px',
  },
  footer: {
    textAlign: 'center',
    padding: '16px',
    color: '#666',
    fontSize: '14px',
    background: 'white',
    borderTop: '1px solid #eee',
  },
};

export default App;
