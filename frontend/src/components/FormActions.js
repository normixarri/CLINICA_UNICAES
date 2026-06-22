import React from 'react';

function FormActions({
  primaryLabel = 'Guardar',
  secondaryLabel = 'Cancelar',
  onPrimary,
  onSecondary,
  primaryType = 'button',
  disabled = false
}) {
  return (
    <div style={styles.actions}>
      {onSecondary && (
        <button type="button" style={styles.secondaryButton} onClick={onSecondary}>
          {secondaryLabel}
        </button>
      )}
      <button type={primaryType} style={styles.primaryButton} onClick={onPrimary} disabled={disabled}>
        {primaryLabel}
      </button>
    </div>
  );
}

const styles = {
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  primaryButton: {
    backgroundColor: '#880C09',
    color: '#fff',
    border: '1px solid #880C09',
    borderRadius: '6px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  secondaryButton: {
    backgroundColor: '#fff',
    color: '#880C09',
    border: '1px solid #880C09',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer'
  }
};

export default FormActions;
