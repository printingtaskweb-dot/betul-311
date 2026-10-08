import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {}

const fieldStyle: React.CSSProperties = {
  position: 'relative',
  marginBottom: 12,
};

const iconStyle: React.CSSProperties = {
  position: 'absolute',
  left: 12,
  top: '50%',
  transform: 'translateY(-50%)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 44px 12px 36px',
  borderRadius: 10,
  border: '1.5px solid var(--gray-200)',
  fontSize: 14,
  color: 'var(--gray-900)',
  outline: 'none',
  background: 'var(--gray-50)',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

const toggleBtnStyle: React.CSSProperties = {
  position: 'absolute',
  right: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  padding: 0,
};

export const PasswordInput: React.FC<Props> = ({ style, ...rest }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={fieldStyle}>
      <Lock size={15} color="var(--gray-400)" style={iconStyle} />
      <input
        {...rest}
        type={show ? 'text' : 'password'}
        style={{ ...inputStyle, ...style }}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        style={toggleBtnStyle}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show
          ? <EyeOff size={16} color="var(--gray-400)" />
          : <Eye size={16} color="var(--gray-400)" />}
      </button>
    </div>
  );
};
