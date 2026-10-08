import React from 'react';
import { t } from '../../lib/i18n';

type Mode = 'login' | 'register';

interface Props {
  mode: Mode;
  onChange: (m: Mode) => void;
  language: 'en' | 'hi';
}

export const AuthTabs: React.FC<Props> = ({ mode, onChange, language }) => (
  <div style={{ display: 'flex', borderBottom: '1.5px solid var(--gray-100)' }}>
    {(['login', 'register'] as Mode[]).map((m) => (
      <button
        key={m}
        onClick={() => onChange(m)}
        style={{
          flex: 1,
          padding: '16px 0',
          border: 'none',
          cursor: 'pointer',
          background: 'transparent',
          fontWeight: 700,
          fontSize: 15,
          color: mode === m ? 'var(--green-700)' : 'var(--gray-400)',
          borderBottom:
            mode === m ? '2.5px solid var(--green-600)' : '2.5px solid transparent',
          transition: 'all 0.2s',
        }}
      >
        {m === 'login' ? t(language, 'login') : t(language, 'register')}
      </button>
    ))}
  </div>
);
