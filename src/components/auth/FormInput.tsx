import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon;
}

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
  padding: '12px 12px 12px 36px',
  borderRadius: 10,
  border: '1.5px solid var(--gray-200)',
  fontSize: 14,
  color: 'var(--gray-900)',
  outline: 'none',
  background: 'var(--gray-50)',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

export const FormInput: React.FC<Props> = ({ icon: Icon, style, ...rest }) => (
  <div style={fieldStyle}>
    <Icon size={15} color="var(--gray-400)" style={iconStyle} />
    <input {...rest} style={{ ...inputStyle, ...style }} />
  </div>
);
