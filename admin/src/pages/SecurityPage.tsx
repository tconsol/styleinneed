import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, ShieldAlert, Smartphone, KeyRound, Copy, Check,
  Download, RefreshCw, X, ArrowRight,
} from 'lucide-react';
import { twoFactorApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import { downloadBlob, stampedName } from '../utils/download';
import toast from 'react-hot-toast';

interface Status {
  enabled: boolean;
  pendingSetup: boolean;
  enabledAt?: string;
  recoveryCodesRemaining: number;
}

type Stage = 'idle' | 'scan' | 'codes';

export default function SecurityPage() {
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<Stage>('idle');
  const [busy, setBusy] = useState(false);

  const [secret, setSecret] = useState('');
  const [qr, setQr] = useState('');
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);

  // Shown exactly once, right after enabling or regenerating.
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);

  const [disabling, setDisabling] = useState(false);
  const [disableForm, setDisableForm] = useState({ password: '', token: '' });

  const load = () => {
    twoFactorApi.status()
      .then(({ data }) => setStatus(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startSetup = async () => {
    setBusy(true);
    try {
      const { data } = await twoFactorApi.setup();
      setSecret(data.data.secret);
      setQr(data.data.qrDataUrl);
      setToken('');
      setStage('scan');
    } catch { /* interceptor toasts */ } finally { setBusy(false); }
  };

  const confirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await twoFactorApi.enable(token.trim());
      setRecoveryCodes(data.data.recoveryCodes || []);
      setAcknowledged(false);
      setStage('codes');
      setSecret(''); setQr(''); setToken('');
      load();
      toast.success('Two-factor authentication is on');
    } catch { /* interceptor toasts */ } finally { setBusy(false); }
  };

  const regenerate = async () => {
    const code = window.prompt('Enter a current code from your authenticator app to reissue recovery codes:');
    if (!code) return;
    setBusy(true);
    try {
      const { data } = await twoFactorApi.regenerateRecoveryCodes(code.trim());
      setRecoveryCodes(data.data.recoveryCodes || []);
      setAcknowledged(false);
      setStage('codes');
      load();
    } catch { /* interceptor toasts */ } finally { setBusy(false); }
  };

  const disable = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await twoFactorApi.disable(disableForm.password, disableForm.token.trim());
      toast.success('Two-factor authentication is off');
      setDisabling(false);
      setDisableForm({ password: '', token: '' });
      setStage('idle');
      load();
    } catch { /* interceptor toasts */ } finally { setBusy(false); }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => toast.error('Could not copy'));
  };

  const saveCodes = () => {
    const body = [
      'Style In Need — admin recovery codes',
      `Account: ${user?.email || ''}`,
      `Issued: ${new Date().toLocaleString()}`,
      '',
      'Each code works once. Keep them somewhere only you can reach.',
      '',
      ...recoveryCodes,
    ].join('\n');
    downloadBlob(new Blob([body], { type: 'text/plain' }), stampedName('recovery-codes', 'txt'));
  };

  if (loading) {
    return <div className="flex justify-center py-20"><span className="w-6 h-6 border-2 border-brand-border border-t-primary rounded-full animate-spin" /></div>;
  }

  const on = !!status?.enabled;

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={18} className="text-brand-muted" />
          <h1 className="text-[18px] font-bold text-brand-text">Security</h1>
        </div>
        <p className="text-[12px] text-brand-muted">
          Protect your admin account with a second factor and a strong password.
        </p>
      </div>

      {/* Recovery codes — shown once, blocks everything else until acknowledged */}
      {stage === 'codes' && (
        <div className="card border-2" style={{ borderColor: 'var(--c-warning)' }}>
          <div className="flex items-center gap-2 mb-1">
            <KeyRound size={16} style={{ color: 'var(--c-warning)' }} />
            <h2 className="text-[14px] font-bold text-brand-text">Save your recovery codes</h2>
          </div>
          <p className="text-[11px] text-brand-muted mb-4">
            These are shown only now. Each one signs you in once if you lose your phone —
            store them somewhere safe and offline.
          </p>

          <div className="grid grid-cols-2 gap-2 p-4 rounded-xl mb-4" style={{ background: 'var(--c-input)' }}>
            {recoveryCodes.map((c) => (
              <span key={c} className="font-mono text-[13px] font-semibold text-brand-text tracking-wide">{c}</span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={saveCodes} className="btn-outline"><Download size={14} /> Download</button>
            <button
              onClick={() => { navigator.clipboard.writeText(recoveryCodes.join('\n')).catch(() => {}); toast.success('Copied'); }}
              className="btn-outline"
            >
              <Copy size={14} /> Copy all
            </button>
            <label className="flex items-center gap-2 text-[11px] text-brand-muted ml-auto cursor-pointer">
              <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
              I have saved them
            </label>
            <button
              onClick={() => { setRecoveryCodes([]); setStage('idle'); }}
              disabled={!acknowledged}
              className="btn-primary"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Two-factor */}
      <div className="card">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: on ? 'var(--c-success-soft)' : 'var(--c-warning-soft)' }}
          >
            {on
              ? <ShieldCheck size={18} style={{ color: 'var(--c-success)' }} />
              : <ShieldAlert size={18} style={{ color: 'var(--c-warning)' }} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[14px] font-bold text-brand-text">Two-Factor Authentication</h2>
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                style={on
                  ? { background: 'var(--c-success-soft)', color: 'var(--c-success)' }
                  : { background: 'var(--c-warning-soft)', color: 'var(--c-warning)' }}
              >
                {on ? 'On' : 'Off'}
              </span>
            </div>
            <p className="text-[11px] text-brand-muted mt-1">
              {on
                ? `A code from your authenticator app is required at every sign-in.${
                    status?.enabledAt ? ` Enabled ${new Date(status.enabledAt).toLocaleDateString()}.` : ''
                  }`
                : 'A stolen password alone would be enough to reach this dashboard. Add a code from an authenticator app.'}
            </p>

            {on && (
              <p className="text-[11px] mt-2" style={{ color: (status?.recoveryCodesRemaining ?? 0) <= 2 ? 'var(--c-danger)' : 'var(--c-muted)' }}>
                {status?.recoveryCodesRemaining ?? 0} recovery code(s) left
                {(status?.recoveryCodesRemaining ?? 0) <= 2 && ' — reissue them now'}
              </p>
            )}
          </div>
        </div>

        {/* Off → enrol */}
        {!on && stage !== 'scan' && stage !== 'codes' && (
          <button onClick={startSetup} disabled={busy} className="btn-primary mt-5">
            <Smartphone size={14} /> {busy ? 'Preparing…' : 'Set up two-factor'} <ArrowRight size={14} />
          </button>
        )}

        {/* Scan + verify */}
        {stage === 'scan' && (
          <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--c-border)' }}>
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="flex-shrink-0">
                {qr && (
                  <img
                    src={qr}
                    alt="Two-factor QR code"
                    className="w-[180px] h-[180px] rounded-xl"
                    style={{ border: '1px solid var(--c-border)', background: '#fff' }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-brand-text mb-1">1. Scan this code</p>
                <p className="text-[11px] text-brand-muted mb-3">
                  Use Google Authenticator, 1Password, Authy, or any TOTP app.
                </p>

                <p className="text-[12px] font-semibold text-brand-text mb-1">Can't scan?</p>
                <div className="flex items-center gap-2 mb-4">
                  <code className="flex-1 min-w-0 font-mono text-[11px] px-3 py-2 rounded-lg break-all" style={{ background: 'var(--c-input)', color: 'var(--c-text)' }}>
                    {secret}
                  </code>
                  <button type="button" onClick={copySecret} title="Copy secret"
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--c-input)', color: 'var(--c-muted)' }}>
                    {copied ? <Check size={14} style={{ color: 'var(--c-success)' }} /> : <Copy size={14} />}
                  </button>
                </div>

                <form onSubmit={confirmEnable}>
                  <label className="input-label">2. Enter the 6-digit code it shows</label>
                  <div className="flex items-center gap-2">
                    <input
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="000000"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      autoFocus
                      className="input-field text-center font-bold tracking-[0.3em] max-w-[160px]"
                    />
                    <button type="submit" disabled={busy || token.trim().length < 6} className="btn-primary">
                      {busy ? 'Verifying…' : 'Verify & turn on'}
                    </button>
                    <button type="button" onClick={() => { setStage('idle'); setSecret(''); setQr(''); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-muted" title="Cancel">
                      <X size={15} />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* On → manage */}
        {on && stage !== 'codes' && (
          <div className="mt-5 pt-5 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--c-border)' }}>
            <button onClick={regenerate} disabled={busy} className="btn-outline">
              <RefreshCw size={14} /> Reissue recovery codes
            </button>
            {!disabling && (
              <button onClick={() => setDisabling(true)} className="btn-outline" style={{ color: 'var(--c-danger)' }}>
                Turn off
              </button>
            )}
          </div>
        )}

        {/* Disable — password AND a live code, so an unattended session isn't enough */}
        {on && disabling && (
          <form onSubmit={disable} className="mt-4 p-4 rounded-xl space-y-3" style={{ background: 'var(--c-input)' }}>
            <p className="text-[11px] text-brand-muted">
              Confirm with your password and a current code to remove the second factor.
            </p>
            <div>
              <label className="input-label">Password</label>
              <input type="password" value={disableForm.password} autoComplete="current-password" required
                onChange={(e) => setDisableForm({ ...disableForm, password: e.target.value })}
                className="input-field" />
            </div>
            <div>
              <label className="input-label">Authenticator code</label>
              <input value={disableForm.token} inputMode="numeric" maxLength={6} required
                onChange={(e) => setDisableForm({ ...disableForm, token: e.target.value })}
                className="input-field max-w-[160px] text-center font-bold tracking-[0.3em]" placeholder="000000" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="btn-danger">
                {busy ? 'Turning off…' : 'Turn off two-factor'}
              </button>
              <button type="button" onClick={() => { setDisabling(false); setDisableForm({ password: '', token: '' }); }}
                className="btn-outline">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Password */}
      <div className="card flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--c-primary-soft)' }}>
          <KeyRound size={18} style={{ color: 'var(--c-primary)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[14px] font-bold text-brand-text">Password</h2>
          <p className="text-[11px] text-brand-muted mt-0.5">Change it and you'll be signed out everywhere.</p>
        </div>
        <Link to="/change-password" className="btn-outline flex-shrink-0">Change</Link>
      </div>
    </div>
  );
}
