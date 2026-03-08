import { useState, type CSSProperties, type FormEvent } from 'react';

export interface SearchSuggestion {
  id: string;
  label: string;
  query: string;
  description?: string;
}

interface SearchBoxProps {
  value: string;
  suggestions: SearchSuggestion[];
  loading?: boolean;
  error?: string | null;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  onSuggestionSelect: (suggestion: SearchSuggestion) => void;
}

export function SearchBox({
  value,
  suggestions,
  loading = false,
  error,
  placeholder = '输入地名、写字楼或小区',
  onChange,
  onSubmit,
  onSuggestionSelect,
}: SearchBoxProps) {
  const [focused, setFocused] = useState(false);

  const visibleSuggestions = focused ? suggestions.slice(0, 6) : [];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(value.trim());
    setFocused(false);
  };

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleSubmit}>
        <input
          style={styles.input}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            window.setTimeout(() => setFocused(false), 120);
          }}
        />
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? '搜索中...' : '搜索'}
        </button>
      </form>

      {visibleSuggestions.length > 0 && (
        <div style={styles.dropdown}>
          {visibleSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              style={styles.option}
              onMouseDown={(event) => {
                event.preventDefault();
                onSuggestionSelect(suggestion);
                setFocused(false);
              }}
            >
              <span style={styles.optionLabel}>{suggestion.label}</span>
              {suggestion.description && (
                <span style={styles.optionMeta}>{suggestion.description}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'relative',
    minWidth: 0,
  },
  form: {
    display: 'flex',
    gap: '10px',
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '46px',
    borderRadius: '14px',
    border: '1px solid #d6d9e0',
    padding: '0 16px',
    fontSize: '15px',
    outline: 'none',
    background: '#fff',
  },
  button: {
    height: '46px',
    border: 0,
    borderRadius: '14px',
    padding: '0 18px',
    background: '#16213e',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  dropdown: {
    position: 'absolute',
    top: '52px',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid #e7e9ef',
    borderRadius: '16px',
    boxShadow: '0 18px 40px rgba(22, 33, 62, 0.12)',
    overflow: 'hidden',
    zIndex: 20,
  },
  option: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    border: 0,
    background: '#fff',
    padding: '12px 14px',
    textAlign: 'left',
    cursor: 'pointer',
  },
  optionLabel: {
    fontSize: '14px',
    color: '#152033',
  },
  optionMeta: {
    fontSize: '12px',
    color: '#72809b',
  },
  error: {
    margin: '8px 0 0',
    color: '#b42318',
    fontSize: '13px',
  },
};
