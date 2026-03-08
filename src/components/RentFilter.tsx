import type { CSSProperties } from 'react';

interface RentFilterProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (range: [number, number]) => void;
}

export function RentFilter({ min, max, value, onChange }: RentFilterProps) {
  const [currentMin, currentMax] = value;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <strong>租金范围</strong>
        <span style={styles.value}>
          ¥{currentMin.toLocaleString()} - ¥{currentMax.toLocaleString()}
        </span>
      </div>

      <div style={styles.control}>
        <label style={styles.label}>
          最低租金
          <input
            style={styles.slider}
            type="range"
            min={min}
            max={max}
            step={500}
            value={currentMin}
            onChange={(event) => {
              const nextMin = Math.min(Number(event.target.value), currentMax);
              onChange([nextMin, currentMax]);
            }}
          />
        </label>

        <label style={styles.label}>
          最高租金
          <input
            style={styles.slider}
            type="range"
            min={min}
            max={max}
            step={500}
            value={currentMax}
            onChange={(event) => {
              const nextMax = Math.max(Number(event.target.value), currentMin);
              onChange([currentMin, nextMax]);
            }}
          />
        </label>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'grid',
    gap: '10px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    color: '#22314d',
  },
  value: {
    fontSize: '13px',
    color: '#54637d',
  },
  control: {
    display: 'grid',
    gap: '10px',
  },
  label: {
    display: 'grid',
    gap: '6px',
    fontSize: '12px',
    color: '#69778f',
  },
  slider: {
    width: '100%',
  },
};
