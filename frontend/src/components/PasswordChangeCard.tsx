import { useState, type FormEvent } from 'react';
import { Lock, KeyRound, ShieldCheck, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { changeUserPassword } from '../services/auth.service';
import { ApiError } from '../services/api';

interface PasswordChangeCardProps {
  token: string | null;
  accountEmail?: string;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

export const PasswordChangeCard = ({
  token,
  accountEmail,
  onSuccess,
  title = 'Security & Password Information',
  subtitle = 'Manage your account authentication credentials and security settings'
}: PasswordChangeCardProps) => {
  const [isChanging, setIsChanging] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Requirements checks for new password
  const hasMinLength = newPassword.length >= 6;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword !== '' && newPassword === confirmPassword;

  const handleOpenChange = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsChanging(true);
  };

  const handleCancel = () => {
    setIsChanging(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!token) {
      setErrorMsg('Authentication session expired. Please log in again.');
      return;
    }

    if (!currentPassword) {
      setErrorMsg('Please enter your current password.');
      return;
    }

    if (!hasMinLength) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await changeUserPassword({ currentPassword, newPassword }, token);
      setSuccessMsg(res.message || 'Password successfully updated!');
      setIsChanging(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onSuccess) {
        onSuccess();
      }
      setTimeout(() => {
        setSuccessMsg(null);
      }, 5000);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to update password. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feature-card password-security-card" style={{ padding: '1.75rem 2rem', margin: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Lock size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
              {title}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
              {subtitle}
            </p>
          </div>
        </div>

        {!isChanging && (
          <button
            type="button"
            onClick={handleOpenChange}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1.15rem',
              fontSize: '0.86rem',
              borderRadius: '8px'
            }}
            id="btn-trigger-change-password"
          >
            <KeyRound size={15} />
            <span>Change Password</span>
          </button>
        )}
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1rem',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 600,
            marginBottom: '1.25rem'
          }}
        >
          <CheckCircle2 size={18} color="#059669" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 600,
            marginBottom: '1.25rem'
          }}
        >
          <AlertCircle size={18} color="#dc2626" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* VIEW MODE: Password Info */}
      {!isChanging ? (
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Current Password Status
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', letterSpacing: '0.2em', marginTop: '0.2rem' }}>
              ••••••••••••
            </div>
            {accountEmail && (
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.25rem' }}>
                Account identifier: <strong style={{ color: '#334155' }}>{accountEmail}</strong>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ffffff', padding: '0.4rem 0.85rem', borderRadius: '9999px', border: '1px solid #e2e8f0' }}>
            <ShieldCheck size={16} color="#059669" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
              Encrypted & Protected (bcrypt)
            </span>
          </div>
        </div>
      ) : (
        /* EDIT / CHANGE PASSWORD FORM */
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.1rem'
            }}
          >
            {/* Current Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                Current Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingRight: '2.5rem', margin: 0 }}
                  placeholder="Enter your existing password"
                  id="input-current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: 0
                  }}
                  tabIndex={-1}
                  aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                New Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingRight: '2.5rem', margin: 0 }}
                  placeholder="At least 6 characters"
                  id="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: 0
                  }}
                  tabIndex={-1}
                  aria-label={showNew ? 'Hide new password' : 'Show new password'}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength indicators */}
              {newPassword && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 600, color: hasMinLength ? '#059669' : '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    {hasMinLength ? '✓' : '•'} 6+ characters
                  </span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 600, color: hasUpper ? '#059669' : '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    {hasUpper ? '✓' : '•'} Uppercase (A-Z)
                  </span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 600, color: hasLower ? '#059669' : '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    {hasLower ? '✓' : '•'} Lowercase (a-z)
                  </span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 600, color: hasNumber ? '#059669' : '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    {hasNumber ? '✓' : '•'} Number (0-9)
                  </span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 600, color: hasSpecial ? '#059669' : '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    {hasSpecial ? '✓' : '•'} Special char (!@#$)
                  </span>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                Confirm New Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingRight: '2.5rem', margin: 0 }}
                  placeholder="Re-enter your new password"
                  id="input-confirm-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: 0
                  }}
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {confirmPassword && (
                <div style={{ fontSize: '0.76rem', fontWeight: 600, marginTop: '0.35rem', color: passwordsMatch ? '#059669' : '#dc2626' }}>
                  {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleCancel}
              className="btn-cancel-edit"
              style={{ padding: '0.6rem 1.25rem', fontSize: '0.88rem' }}
              id="btn-cancel-password"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !currentPassword || !newPassword || !passwordsMatch}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1.5rem',
                fontSize: '0.88rem'
              }}
              id="btn-submit-change-password"
            >
              {isSubmitting ? 'Updating Password...' : 'Save New Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
export default PasswordChangeCard;
