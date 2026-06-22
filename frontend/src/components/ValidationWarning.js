import React from 'react';

function ValidationWarning({ message }) {
  if (!message) return null;

  return (
    <span style={styles.message}>
      <span style={styles.icon}>!</span>
      {message}
    </span>
  );
}

export const validationStyles = {
  inputError: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.18)'
  },
  warningBox: {
    color: '#78350f',
    backgroundColor: '#fffbeb',
    border: '1px solid #fbbf24',
    borderRadius: '8px',
    padding: '10px 12px',
    fontWeight: '800'
  }
};

const styles = {
  message: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    color: '#78350f',
    backgroundColor: '#fffbeb',
    border: '1px solid #fbbf24',
    borderRadius: '6px',
    padding: '7px 9px',
    fontSize: '12px',
    fontWeight: '800',
    lineHeight: 1.25,
    width: 'fit-content',
    maxWidth: '100%'
  },
  icon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '17px',
    height: '17px',
    minWidth: '17px',
    borderRadius: '4px',
    backgroundColor: '#f59e0b',
    color: '#fff',
    fontWeight: '900',
    lineHeight: 1
  }
};

export default ValidationWarning;
