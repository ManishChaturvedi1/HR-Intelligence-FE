import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LayoutDashboard, Users, PlusCircle, ChevronLeft, ChevronRight,
  Activity, Target, CheckCircle, TrendingUp, BarChart2, LogOut
} from 'lucide-react';
import { useAuth } from './AuthContext.jsx';
import { SignIn } from '@clerk/clerk-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  ScatterChart, Scatter
} from 'recharts';

const API_URL = "http://localhost:8000";

const CHART_COLORS = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#0284C7', '#65A30D'];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '8px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
  fontFamily: 'Inter, sans-serif',
  fontSize: '12px',
  color: '#0F172A'
};

const AXIS_STYLE = { fontSize: 11, fill: '#94A3B8', fontFamily: 'Inter, sans-serif' };

// ============================================================
// SIDEBAR NAV DATA
// ============================================================
const NAV_ITEMS = [
  { id: 'analytics', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'predict', label: 'New Prediction', icon: PlusCircle },
];

// ============================================================
// SIDEBAR COMPONENT
// ============================================================
function Sidebar({ active, onNavigate, collapsed, onToggle }) {
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">
          <img src="/favicon.png" alt="HR" />
        </div>
        <div>
          <div className="sidebar__logo-text">HR Intelligence</div>
          <div className="sidebar__logo-sub">Attrition Platform</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar__nav">
        <div className="sidebar__section-label">Main Menu</div>

        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item${active === id ? ' active' : ''}`}
            onClick={() => onNavigate(id)}
            title={collapsed ? label : ''}
          >
            <span className="nav-item__icon"><Icon size={16} /></span>
            <span className="nav-item__label">{label}</span>
          </button>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="sidebar__footer">
        <button className="collapse-btn" onClick={onToggle} title="Toggle sidebar">
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>
    </aside>
  );
}

// ============================================================
// NAVBAR COMPONENT
// ============================================================
function Navbar({ activeTab }) {
  const { user, logout } = useAuth();
  const titles = {
    analytics: { title: 'Dashboard Overview', sub: 'Company-wide attrition analytics & demographics' },
    employees: { title: 'Employee Directory', sub: 'Browse and review predicted attrition by employee' },
    predict: { title: 'New Prediction', sub: 'Predict attrition risk for a new employee entry' },
  };
  const { title, sub } = titles[activeTab] || {};

  return (
    <header className="navbar">
      <div>
        <div className="navbar__title">{title}</div>
        <div style={{ fontSize: 11, color: 'var(--clr-text-muted)', marginTop: 1 }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--clr-text)' }}>{user.name}</div>
            <div style={{ fontSize: 10, color: 'var(--clr-text-muted)' }}>{user.email}</div>
          </div>
        )}
        <div className="navbar__badge">
          <span className="navbar__badge-dot"></span>
          API Live
        </div>
        <button onClick={logout} title="Sign out" style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
          background: 'transparent', border: '1px solid var(--clr-border)',
          borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 12,
          color: 'var(--clr-text-secondary)', fontFamily: 'inherit',
        }}>
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </header>
  );
}

// ============================================================
// SECTION HEADING
// ============================================================
function SectionHeader({ title, sub, actions }) {
  return (
    <div className="flex-between mb-6">
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--clr-text)', margin: 0 }}>{title}</h2>
        {sub && <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', marginTop: 2 }}>{sub}</p>}
      </div>
      {actions}
    </div>
  );
}

// ============================================================
// REUSABLE FORM PRIMITIVES — defined OUTSIDE components to prevent focus loss
// (Defining these inside a component causes React to remount on every keystroke)
// ============================================================
function Field({ label, name, value, onChange, type = 'text', ...rest }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" type={type} name={name} value={value}
        onChange={onChange} autoComplete="off" {...rest} />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <select className="form-select" name={name} value={value} onChange={onChange}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  );
}

// ============================================================
// FACTORS RENDERER
// ============================================================
function ReasonsList({ reasonsStr }) {
  if (!reasonsStr) return <span className="text-muted text-xs">No specific factors identified.</span>;
  try {
    const factors = JSON.parse(reasonsStr);
    if (Array.isArray(factors) && factors.length > 0 && typeof factors[0] === 'object') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          {factors.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12 }}>
              <span style={{ color: f.impact === 'negative' ? 'var(--clr-danger)' : 'var(--clr-success)' }}>
                {f.impact === 'negative' ? '⚠' : '✓'}
              </span>
              <div style={{ lineHeight: 1.3 }}>
                <span style={{ fontWeight: 600, color: 'var(--clr-text)' }}>{f.metric}: </span>
                <span className="text-secondary">{f.desc}</span>
              </div>
            </div>
          ))}
        </div>
      );
    }
  } catch (e) { /* fallback */ }
  return <div className="text-sm mt-1">{reasonsStr}</div>;
}

// ============================================================
// PREDICT FORM TAB
// ============================================================
function PredictForm({ onPredictionComplete }) {
  const [formData, setFormData] = useState({
    name: '', email: '',
    age: '30', gender: 'Male', department: 'Research & Development',
    job_role: 'Research Scientist', salary: '5000', years_at_company: '3',
    job_satisfaction: '3', work_life_balance: '3', overtime: false,
    performance_rating: '3', last_promotion_years: '1'
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const NUMBER_FIELDS = ['age', 'salary', 'years_at_company', 'job_satisfaction',
    'work_life_balance', 'performance_rating', 'last_promotion_years'];

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setResult(null);
    const payload = { ...formData };
    NUMBER_FIELDS.forEach(f => { payload[f] = Number(payload[f]); });
    try {
      const r = await axios.post(`${API_URL}/predict`, payload);
      setResult(r.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'API connection failed.');
    } finally {
      setLoading(false);
    }
  };

  // shorthand so JSX isn't repetitive
  const f = (name) => ({ name, value: formData[name], onChange: handle });

  return (
    <div className="anim-fade">
      <SectionHeader title="New Attrition Prediction" sub="Fill in employee details to run the ML model" />

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Form */}
        <div className="card p-6">
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid-2" style={{ gap: 14 }}>
              <Field label="Full Name"     {...f('name')} required placeholder="e.g. Alok Sharma" />
              <Field label="Email Address" {...f('email')} type="email" required placeholder="alok@company.com" />
            </div>
            <div className="grid-2" style={{ gap: 14 }}>
              <Field label="Age" {...f('age')} type="number" min="18" max="70" step="1" required />
              <SelectField label="Gender" {...f('gender')} options={['Male', 'Female']} />
            </div>
            <div className="grid-2" style={{ gap: 14 }}>
              <SelectField label="Department" {...f('department')} options={[
                { value: 'Research & Development', label: 'R & D' },
                { value: 'Sales', label: 'Sales' },
                { value: 'Human Resources', label: 'Human Resources' }
              ]} />
              <SelectField label="Job Role" {...f('job_role')} options={[
                'Research Scientist', 'Sales Executive', 'Laboratory Technician',
                'Manager', 'Healthcare Representative', 'Human Resources'
              ]} />
            </div>
            <div className="grid-2" style={{ gap: 14 }}>
              <Field label="Monthly Salary ($)" {...f('salary')} type="number" min="0" step="100" required />
              <Field label="Years at Company"   {...f('years_at_company')} type="number" min="0" max="40" step="1" required />
            </div>
            <div className="grid-2" style={{ gap: 14 }}>
              <Field label="Job Satisfaction (1–4)"  {...f('job_satisfaction')} type="number" min="1" max="4" step="1" required />
              <Field label="Work-Life Balance (1–4)"  {...f('work_life_balance')} type="number" min="1" max="4" step="1" required />
            </div>
            <div className="grid-2" style={{ gap: 14, alignItems: 'end' }}>
              <Field label="Performance Rating (1–4)" {...f('performance_rating')} type="number" min="1" max="4" step="1" required />
              <div className="form-group">
                <label className="form-label">Works Overtime</label>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  padding: '8px 12px', border: '1px solid var(--clr-border)',
                  borderRadius: 'var(--radius-sm)', background: 'var(--clr-bg)',
                }}>
                  <input type="checkbox" name="overtime" checked={formData.overtime} onChange={handle}
                    style={{ width: 15, height: 15, accentColor: 'var(--clr-accent)', cursor: 'pointer', flexShrink: 0 }} />
                  <span className="text-sm text-secondary">Yes, works overtime</span>
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn--primary btn--full" disabled={loading} style={{ marginTop: 4, padding: '11px 16px' }}>
              {loading
                ? <><Activity size={14} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…</>
                : <><Target size={14} /> Run Prediction</>
              }
            </button>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </form>
        </div>

        {/* Result */}
        <div className="card p-6" style={{ minHeight: 300, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 16px 0' }}>Model Output</h3>

          {!result && !error && !loading && (
            <div className="flex-center flex-col flex-1 text-muted" style={{ gap: 8, flex: 1 }}>
              <BarChart2 size={32} style={{ opacity: 0.25 }} />
              <span className="text-sm">Submit the form to run prediction</span>
            </div>
          )}

          {loading && (
            <div className="flex-center flex-col flex-1" style={{ gap: 10, flex: 1, color: 'var(--clr-accent)' }}>
              <Activity size={28} style={{ animation: 'spin 1s linear infinite' }} />
              <span className="text-sm text-secondary">Running RandomForest model…</span>
            </div>
          )}

          {error && (
            <div style={{ padding: 12, background: 'var(--clr-danger-muted)', border: '1px solid var(--clr-danger)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-danger)' }}>
              <span className="font-semibold">Error: </span>{error}
            </div>
          )}

          {result && !loading && (
            <div className="anim-fade flex-col flex-1" style={{ display: 'flex', gap: 16, flex: 1 }}>
              {/* Risk Badge */}
              <div style={{
                padding: '16px 20px',
                background: result.attrition_risk ? 'var(--clr-danger-muted)' : 'var(--clr-success-muted)',
                border: `1px solid ${result.attrition_risk ? 'var(--clr-danger)' : 'var(--clr-success)'}`,
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', gap: 12
              }}>
                <div style={{ color: result.attrition_risk ? 'var(--clr-danger)' : 'var(--clr-success)' }}>
                  {result.attrition_risk ? <Target size={24} /> : <CheckCircle size={24} />}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: result.attrition_risk ? 'var(--clr-danger)' : 'var(--clr-success)' }}>
                    {result.attrition_risk ? 'High Flight Risk' : 'Low Flight Risk'}
                  </div>
                  <div className="text-xs text-secondary" style={{ marginTop: 2 }}>
                    {result.attrition_risk ? 'Employee is likely to leave the company.' : 'Employee is likely to stay.'}
                  </div>
                </div>
              </div>

              {/* Probability */}
              <div>
                <div className="flex-between mb-2">
                  <span className="text-sm text-secondary">Attrition Probability</span>
                  <span className="font-bold text-base">{(result.probability * 100).toFixed(1)}%</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{
                    width: `${result.probability * 100}%`,
                    background: result.probability > 0.5
                      ? 'linear-gradient(90deg, #D97706, #DC2626)'
                      : 'linear-gradient(90deg, #059669, #2563EB)'
                  }} />
                </div>
                <div className="flex-between mt-2">
                  <span className="text-xs text-muted">Low Risk</span>
                  <span className="text-xs text-muted">High Risk</span>
                </div>
              </div>

              {/* Factors & Reasons */}
              <div style={{ padding: '12px', background: result.attrition_risk ? 'var(--clr-danger-muted)' : 'var(--clr-success-muted)', borderRadius: 'var(--radius-sm)', border: `1px solid ${result.attrition_risk ? 'var(--clr-danger)' : 'var(--clr-success)'}40` }}>
                <div className="text-xs font-semibold" style={{ color: result.attrition_risk ? 'var(--clr-danger)' : 'var(--clr-success)' }}>
                  {result.attrition_risk ? 'Identified Risk Factors' : 'Stabilizing Factors'}
                </div>
                <ReasonsList reasonsStr={result.reasons} />
              </div>

              {/* Note */}
              <div style={{ padding: '10px 12px', background: 'var(--clr-bg)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--clr-accent)' }}>
                <span className="text-xs text-secondary"><strong>Note:</strong> Prediction is based on a RandomForest classifier trained on the IBM HR Analytics dataset (86% accuracy).</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BULK CSV UPLOAD COMPONENT
// ============================================================
const CSV_TEMPLATE_HEADERS = [
  'Name', 'Email', 'Age', 'Gender', 'Department', 'JobRole',
  'MonthlyIncome', 'YearsAtCompany', 'JobSatisfaction',
  'WorkLifeBalance', 'OverTime', 'PerformanceRating', 'YearsSinceLastPromotion'
];
const CSV_TEMPLATE_ROW = [
  'Alok Sharma', 'alok@acme.com', '32', 'Male', 'Research & Development',
  'Research Scientist', '6000', '4', '3', '3', 'No', '3', '2'
];

function BulkUpload() {
  const [file, setFile] = useState(null);
  const [dragging, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const pickFile = (f) => {
    if (!f || !f.name.endsWith('.csv')) { setError('Please select a .csv file.'); return; }
    setFile(f); setError(''); setResult(null);
  };

  const onDrop = (e) => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files[0]); };

  const downloadTemplate = () => {
    const rows = [CSV_TEMPLATE_HEADERS.join(','), CSV_TEMPLATE_ROW.join(',')];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'employee_bulk_template.csv'; a.click();
  };

  const upload = async () => {
    if (!file) return;
    setLoading(true); setError(''); setResult(null);
    const form = new FormData(); form.append('file', file);
    try {
      const { data } = await axios.post('http://localhost:8000/predict/bulk', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="anim-fade">
      <SectionHeader title="Bulk Upload CSV" sub="Predict attrition for multiple employees at once" />

      <div className="grid-2" style={{ alignItems: 'start', gap: 20 }}>
        {/* Left: upload panel */}
        <div className="card p-6" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="font-semibold text-base">Upload Employee CSV</div>
              <div className="text-xs text-muted" style={{ marginTop: 3 }}>Use our template to match column format</div>
            </div>
            <button className="btn btn--outline" onClick={downloadTemplate} style={{ fontSize: 12 }}>
              ⬇ Template
            </button>
          </div>

          {/* Column chips */}
          <div style={{ padding: '10px 12px', background: 'var(--clr-bg)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--clr-accent)' }}>
            <div className="text-xs font-semibold text-secondary mb-2">Required columns:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {CSV_TEMPLATE_HEADERS.map(h => (
                <span key={h} style={{
                  fontSize: 10, padding: '2px 7px', background: 'var(--clr-accent-muted)',
                  color: 'var(--clr-accent)', borderRadius: 4, fontFamily: 'monospace'
                }}>{h}</span>
              ))}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: 6 }}>OverTime: Yes/No · Ratings: 1–4</div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById('csv-file-input').click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--clr-accent)' : 'var(--clr-border)'}`,
              borderRadius: 'var(--radius-lg)', padding: '32px 20px', textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.15s',
              background: dragging ? 'var(--clr-accent-muted)' : 'var(--clr-bg)',
            }}
          >
            <input id="csv-file-input" type="file" accept=".csv" style={{ display: 'none' }}
              onChange={e => pickFile(e.target.files[0])} />
            <div style={{ fontSize: 26, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text)', marginBottom: 4 }}>
              {file ? file.name : 'Drop CSV here or click to browse'}
            </div>
            <div className="text-xs text-muted">
              {file ? `${(file.size / 1024).toFixed(1)} KB · Ready` : '.csv files only'}
            </div>
          </div>

          {error && (
            <div style={{
              padding: '9px 12px', background: 'var(--clr-danger-muted)',
              border: '1px solid var(--clr-danger)', borderRadius: 'var(--radius-sm)',
              color: 'var(--clr-danger)', fontSize: 12
            }}>{error}</div>
          )}

          <button className="btn btn--primary btn--full" onClick={upload}
            disabled={!file || loading} style={{ padding: '10px' }}>
            {loading
              ? <><Activity size={14} style={{ animation: 'spin 1s linear infinite' }} /> Processing rows…</>
              : <><Target size={14} /> Run Bulk Prediction</>
            }
          </button>
          <style>{`@keyframes spin{100%{transform:rotate(360deg)}}`}</style>
        </div>

        {/* Right: results */}
        <div className="card p-6" style={{ minHeight: 300 }}>
          <div className="font-semibold text-base mb-4">Results</div>

          {!result && !loading && (
            <div className="flex-center" style={{ height: 200, flexDirection: 'column', gap: 8, color: 'var(--clr-text-muted)' }}>
              <div style={{ fontSize: 32, opacity: 0.2 }}>📊</div>
              <span className="text-sm">Upload a CSV to see predictions</span>
            </div>
          )}
          {loading && (
            <div className="flex-center" style={{ height: 200, flexDirection: 'column', gap: 10, color: 'var(--clr-accent)' }}>
              <Activity size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <span className="text-sm text-secondary">Running model on all rows…</span>
            </div>
          )}
          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {[
                  { label: 'Processed', val: result.processed, clr: 'var(--clr-accent)' },
                  { label: 'High Risk', val: result.high_risk, clr: 'var(--clr-danger)' },
                  { label: 'Low Risk', val: result.low_risk, clr: 'var(--clr-success)' },
                  { label: 'Errors', val: result.errors, clr: 'var(--clr-warning)' },
                ].map(({ label, val, clr }) => (
                  <div key={label} style={{
                    textAlign: 'center', padding: '10px 4px',
                    background: 'var(--clr-bg)', borderRadius: 'var(--radius-sm)'
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: clr }}>{val}</div>
                    <div className="text-xs text-muted">{label}</div>
                  </div>
                ))}
              </div>
              <div style={{
                maxHeight: 320, overflowY: 'auto', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--clr-border)'
              }}>
                <table className="data-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr><th>Row</th><th>Name</th><th>Role</th>
                      <th>Key Factors</th>
                      <th style={{ textAlign: 'center' }}>Risk</th><th style={{ textAlign: 'right' }}>Prob.</th></tr>
                  </thead>
                  <tbody>
                    {result.results.map(r => (
                      <tr key={r.row}>
                        <td className="text-muted">{r.row}</td>
                        <td className="font-medium">{r.name}</td>
                        <td className="text-secondary">{r.job_role}</td>
                        <td style={{ maxWidth: 220, padding: '4px 8px' }}>
                          {(() => {
                            if (!r.reasons) return '-';
                            try {
                              const factors = JSON.parse(r.reasons);
                              if (Array.isArray(factors) && factors[0]?.metric) {
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {factors.slice(0, 2).map((f, i) => (
                                      <div key={i} className="text-xs" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        <span style={{ color: f.impact === 'negative' ? 'var(--clr-danger)' : 'var(--clr-success)' }}>{f.impact === 'negative' ? '⚠ ' : '✓ '}</span>
                                        <span style={{ fontWeight: 500 }}>{f.metric}</span>
                                      </div>
                                    ))}
                                    {factors.length > 2 && <div className="text-xs text-muted">+{factors.length - 2} more</div>}
                                  </div>
                                );
                              }
                            } catch (e) { }
                            return <div className="text-xs text-secondary" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.reasons}</div>;
                          })()}
                        </td>
                        <td style={{ textAlign: 'center' }}><span className={`badge ${r.attrition_risk ? 'badge--danger' : 'badge--success'}`}>
                          {r.attrition_risk ? 'High' : 'Low'}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 600, color: r.attrition_risk ? 'var(--clr-danger)' : 'var(--clr-success)' }}>
                            {r.probability}%</span>
                        </td>
                      </tr>
                    ))}
                    {result.error_details?.map(e => (
                      <tr key={`err-${e.row}`} style={{ background: 'var(--clr-danger-muted)' }}>
                        <td className="text-muted">{e.row}</td>
                        <td colSpan={5} style={{ color: 'var(--clr-danger)', fontSize: 11 }}>⚠ {e.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// UPLOAD WRAPPER (PREDICT PAGE)
// ============================================================
function PredictPage({ onPredictionComplete }) {
  const [mode, setMode] = useState('single'); // 'single' or 'bulk'

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--clr-bg)', padding: 4, borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
        <button className={mode === 'single' ? 'btn btn--primary' : 'btn btn--outline'}
          onClick={() => setMode('single')} style={{ border: 'none', padding: '6px 16px', borderRadius: 'var(--radius-sm)' }}>
          Single Prediction
        </button>
        <button className={mode === 'bulk' ? 'btn btn--primary' : 'btn btn--outline'}
          onClick={() => setMode('bulk')} style={{ border: 'none', padding: '6px 16px', borderRadius: 'var(--radius-sm)' }}>
          Bulk Upload CSV
        </button>
      </div>

      {mode === 'single' && <PredictForm onPredictionComplete={onPredictionComplete} />}
      {mode === 'bulk' && <BulkUpload />}
    </div>
  );
}

// ============================================================
// EMPLOYEE DETAIL MODAL
// ============================================================
function EmployeeDetail({ employee, onClose }) {
  if (!employee) return null;
  const pred = employee.predictions?.slice(-1)[0] ?? null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, background: 'var(--clr-bg-dark)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clr-accent)', fontWeight: 700 }}>
              {employee.name ? employee.name.charAt(0) : '#'}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--clr-text)' }}>{employee.name || 'Anonymous Employee'}</div>
              <div style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>{employee.email}</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {/* Prediction Summary if available */}
          {pred && (
            <div className="card p-5 mb-6" style={{ background: pred.attrition_risk ? 'var(--clr-danger-muted)' : 'var(--clr-success-muted)', border: 'none' }}>
              <div className="flex-between mb-4">
                <div>
                  <div className="detail-label" style={{ color: pred.attrition_risk ? 'var(--clr-danger)' : 'var(--clr-success)' }}>Prediction Result</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: pred.attrition_risk ? 'var(--clr-danger)' : 'var(--clr-success)' }}>
                    {pred.attrition_risk ? 'High Attrition Risk' : 'Retained / Low Risk'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="detail-label" style={{ color: pred.attrition_risk ? 'var(--clr-danger)' : 'var(--clr-success)' }}>Confidence</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: pred.attrition_risk ? 'var(--clr-danger)' : 'var(--clr-success)' }}>{Math.round(pred.probability * 100)}%</div>
                </div>
              </div>
              <ReasonsList reasonsStr={pred.reasons} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Department</span>
                <span className="detail-value">{employee.department}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Role</span>
                <span className="detail-value">{employee.job_role}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Monthly Salary</span>
                <span className="detail-value">${employee.salary?.toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Age / Gender</span>
                <span className="detail-value">{employee.age} yrs · {employee.gender}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Tenure</span>
                <span className="detail-value">{employee.years_at_company} years at company</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Promotion</span>
                <span className="detail-value">{employee.last_promotion_years} years since last promotion</span>
              </div>
            </div>

            <div style={{ background: 'var(--clr-bg)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--clr-border)' }}>
              <div className="detail-label mb-4">Sentiment Metrics</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div className="flex-between mb-1"><span className="text-xs">Job Satisfaction</span><span className="text-xs font-bold">{employee.job_satisfaction}/4</span></div>
                  <div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${(employee.job_satisfaction / 4) * 100}%`, background: 'var(--clr-accent)' }} /></div>
                </div>
                <div>
                  <div className="flex-between mb-1"><span className="text-xs">Work-Life Balance</span><span className="text-xs font-bold">{employee.work_life_balance}/4</span></div>
                  <div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${(employee.work_life_balance / 4) * 100}%`, background: 'var(--clr-accent)' }} /></div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <span className="badge badge--neutral">Overtime: {employee.overtime ? 'Required' : 'None'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 24px', background: 'var(--clr-bg)', borderTop: '1px solid var(--clr-border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn--outline" onClick={onClose}>Close Overview</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EMPLOYEE LIST TAB
// ============================================================
function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmp, setSelectedEmp] = useState(null);

  // Filter & pagination state
  const [search, setSearch] = useState('');
  const [deptFilter, setDept] = useState('All');
  const [riskFilter, setRisk] = useState('All');
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    // Fetch a large batch; filtering/paging done client-side
    axios.get(`${API_URL}/employees?limit=500`)
      .then(r => { setEmployees(r.data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const departments = ['All', ...Array.from(new Set(employees.map(e => e.department))).sort()];

  const filtered = employees.filter(emp => {
    const pred = emp.predictions?.slice(-1)[0] ?? null;
    const nameMatch = (emp.name || `Employee #${emp.id}`).toLowerCase().includes(search.toLowerCase())
      || (emp.job_role || '').toLowerCase().includes(search.toLowerCase())
      || (emp.email || '').toLowerCase().includes(search.toLowerCase());
    const deptMatch = deptFilter === 'All' || emp.department === deptFilter;
    const riskMatch = riskFilter === 'All'
      || (riskFilter === 'High' && pred?.attrition_risk)
      || (riskFilter === 'Low' && pred && !pred.attrition_risk)
      || (riskFilter === 'Pending' && !pred);
    return nameMatch && deptMatch && riskMatch;
  });

  const shown = pageSize === 'All' ? filtered : filtered.slice(0, Number(pageSize));

  return (
    <div className="anim-fade">
      <SectionHeader
        title="Employee Directory"
        sub="Newest records shown first · filtered client-side"
        actions={<span className="badge badge--neutral">{filtered.length} of {employees.length} records</span>}
      />

      {/* ── Filter Bar ── */}
      <div className="card p-5 mb-4" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {/* Search */}
        <div className="form-group" style={{ flex: '1 1 220px', minWidth: 180, marginBottom: 0 }}>
          <label className="form-label">Search</label>
          <div style={{ position: 'relative' }}>
            <input
              className="form-input"
              placeholder="Name, role, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
            <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
        </div>

        {/* Department */}
        <div className="form-group" style={{ flex: '1 1 160px', minWidth: 140, marginBottom: 0 }}>
          <label className="form-label">Department</label>
          <select className="form-select" value={deptFilter} onChange={e => setDept(e.target.value)}>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Risk */}
        <div className="form-group" style={{ flex: '1 1 130px', minWidth: 120, marginBottom: 0 }}>
          <label className="form-label">Attrition Risk</label>
          <select className="form-select" value={riskFilter} onChange={e => setRisk(e.target.value)}>
            <option value="All">All</option>
            <option value="High">High Risk</option>
            <option value="Low">Low Risk</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        {/* Rows per page */}
        <div className="form-group" style={{ flex: '0 0 auto', minWidth: 110, marginBottom: 0 }}>
          <label className="form-label">Show rows</label>
          <select className="form-select" value={pageSize} onChange={e => setPageSize(e.target.value)}>
            {[10, 25, 50, 100, 'All'].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {/* Clear */}
        {(search || deptFilter !== 'All' || riskFilter !== 'All') && (
          <button className="btn btn--outline" style={{ height: 34, alignSelf: 'flex-end', fontSize: 12 }}
            onClick={() => { setSearch(''); setDept('All'); setRisk('All'); }}>
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="card">
        {loading && (
          <div className="flex-center" style={{ padding: 48, color: 'var(--clr-text-muted)', gap: 8 }}>
            <Activity size={18} style={{ animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin{100%{transform:rotate(360deg)}}`}</style>
            Loading records…
          </div>
        )}
        {error && <div style={{ padding: 20, color: 'var(--clr-danger)' }}>Error: {error}</div>}

        {!loading && !error && shown.length === 0 && (
          <div className="flex-center" style={{ padding: 48, color: 'var(--clr-text-muted)', flexDirection: 'column', gap: 8 }}>
            <Users size={28} style={{ opacity: 0.2 }} />
            <span className="text-sm">No employees match the current filters.</span>
          </div>
        )}

        {!loading && !error && shown.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Tenure</th>
                  <th>Salary</th>
                  <th>Risk</th>
                  <th>Probability</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((emp, idx) => {
                  const pred = emp.predictions?.slice(-1)[0] ?? null;
                  return (
                    <tr key={emp.id} onClick={() => setSelectedEmp(emp)}>
                      <td className="text-muted text-xs">{idx + 1}</td>
                      <td>
                        <div className="font-medium">{emp.name || `Employee #${emp.id}`}</div>
                        <div className="text-xs text-muted">{emp.age} yrs · {emp.gender}</div>
                      </td>
                      <td className="text-secondary">{emp.department}</td>
                      <td className="text-secondary">{emp.job_role}</td>
                      <td>{emp.years_at_company} yr{emp.years_at_company !== 1 ? 's' : ''}</td>
                      <td>${emp.salary.toLocaleString()}</td>
                      <td>
                        {pred
                          ? <span className={`badge ${pred.attrition_risk ? 'badge--danger' : 'badge--success'}`}>
                            {pred.attrition_risk ? 'High Risk' : 'Low Risk'}
                          </span>
                          : <span className="badge badge--neutral">Pending</span>
                        }
                      </td>
                      <td>
                        {pred ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 4, background: 'var(--clr-bg-dark)', borderRadius: 9999, overflow: 'hidden', minWidth: 60 }}>
                              <div style={{ height: '100%', width: `${pred.probability * 100}%`, background: pred.attrition_risk ? 'var(--clr-danger)' : 'var(--clr-success)', borderRadius: 9999 }} />
                            </div>
                            <span className="text-xs text-muted">{Math.round(pred.probability * 100)}%</span>
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer row count */}
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--clr-bg-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-xs text-muted">
                Showing <strong>{shown.length}</strong> of <strong>{filtered.length}</strong> filtered results
                {filtered.length !== employees.length && ` (${employees.length} total)`}
              </span>
              {filtered.length > shown.length && (
                <span className="text-xs text-muted">Increase "Show rows" to see more</span>
              )}
            </div>
          </div>
        )}

        <EmployeeDetail
          employee={selectedEmp}
          onClose={() => setSelectedEmp(null)}
        />
      </div>
    </div>
  );
}

// ============================================================
// ANALYTICS DASHBOARD
// ============================================================
function AnalyticsDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/stats`)
      .then(r => { setStats(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex-center" style={{ height: 300, color: 'var(--clr-text-muted)', gap: 10 }}>
        <Activity size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span className="text-sm">Loading analytics data…</span>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const TS = CHART_TOOLTIP_STYLE;
  const AS = AXIS_STYLE;
  const CG = <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />;

  return (
    <div className="anim-fade">
      <SectionHeader title="Analytics Overview" sub="Live statistics derived from your SQL Server database" />

      {/* KPIs */}
      <div className="grid-4 mb-6">
        <div className="kpi-card">
          <div className="kpi-card__icon" style={{ background: 'var(--clr-accent-muted)', color: 'var(--clr-accent)' }}><Users size={20} /></div>
          <div>
            <div className="kpi-card__label">Total Employees</div>
            <div className="kpi-card__value">{stats.total_employees.toLocaleString()}</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__icon" style={{ background: 'var(--clr-danger-muted)', color: 'var(--clr-danger)' }}><Target size={20} /></div>
          <div>
            <div className="kpi-card__label">High Flight Risk</div>
            <div className="kpi-card__value">{stats.high_risk_count.toLocaleString()}</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__icon" style={{ background: 'var(--clr-warning-muted)', color: 'var(--clr-warning)' }}><Activity size={20} /></div>
          <div>
            <div className="kpi-card__label">Attrition Rate</div>
            <div className="kpi-card__value">{stats.high_risk_percent}%</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__icon" style={{ background: 'var(--clr-success-muted)', color: 'var(--clr-success)' }}><TrendingUp size={20} /></div>
          <div>
            <div className="kpi-card__label">Model Accuracy</div>
            <div className="kpi-card__value">86.05%</div>
            <div className="kpi-card__sub">Random Forest</div>
          </div>
        </div>
      </div>

      {/* Row 1: Age Distribution + Gender */}
      <div className="grid-2 mb-6">
        <div className="chart-card">
          <div className="chart-card__title">Age Distribution</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.age_groups} barSize={32}>
              {CG}
              <XAxis dataKey="name" tick={AS} axisLine={false} tickLine={false} />
              <YAxis tick={AS} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TS} />
              <Bar dataKey="value" name="Employees" radius={[4, 4, 0, 0]}>
                {stats.age_groups.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card__title">Gender Demographics</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={stats.genders} cx="50%" cy="50%" innerRadius={70} outerRadius={95}
                paddingAngle={4} dataKey="value" stroke="none">
                {stats.genders.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TS} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--clr-text-secondary)', fontFamily: 'Inter' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Satisfaction + Overtime */}
      <div className="grid-2 mb-6">
        <div className="chart-card">
          <div className="chart-card__title">Job Satisfaction vs Attrition Risk</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.satisfaction}>
              {CG}
              <XAxis dataKey="name" tick={AS} axisLine={false} tickLine={false} />
              <YAxis tick={AS} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TS} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--clr-text-secondary)', fontFamily: 'Inter' }} />
              <Bar dataKey="Low Risk" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
              <Bar dataKey="High Risk" stackId="a" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card__title">Overtime Impact on Attrition</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.overtime} barSize={52}>
              {CG}
              <XAxis dataKey="name" tick={AS} axisLine={false} tickLine={false} />
              <YAxis tick={AS} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TS} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--clr-text-secondary)', fontFamily: 'Inter' }} />
              <Bar dataKey="Low Risk" stackId="a" fill="#2563EB" />
              <Bar dataKey="High Risk" stackId="a" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Scatter + Job Roles */}
      <div className="grid-2">
        <div className="chart-card">
          <div className="chart-card__title">Salary vs Tenure — Flight Risk Map</div>
          <div className="chart-card__subtitle text-muted" style={{ marginBottom: 16 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', display: 'inline-block' }}></span>High Risk
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block', marginLeft: 10 }}></span>Low Risk
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 0, right: 10, bottom: 0, left: -10 }}>
              {CG}
              <XAxis type="number" dataKey="tenure" name="Years at Company" tick={AS} axisLine={false} tickLine={false} label={{ value: 'Tenure (yrs)', position: 'insideBottom', offset: -2, style: { fontSize: 10, fill: '#94A3B8' } }} />
              <YAxis type="number" dataKey="salary" name="Monthly Salary" tick={AS} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TS} />
              <Scatter name="Low Risk" data={stats.scatter.filter(d => d.risk === 0)} fill="#059669" opacity={0.5} />
              <Scatter name="High Risk" data={stats.scatter.filter(d => d.risk === 1)} fill="#DC2626" opacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card__title">Top Job Roles by Headcount</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.roles.slice(0, 6)} layout="vertical">
              <XAxis type="number" tick={AS} axisLine={false} tickLine={false} hide />
              <YAxis dataKey="name" type="category" tick={AS} axisLine={false} tickLine={false} width={130} />
              <Tooltip contentStyle={TS} />
              <Bar dataKey="value" name="Employees" radius={[0, 4, 4, 0]}>
                {stats.roles.slice(0, 6).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP SHELL
// ============================================================
export default function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');
  const [collapsed, setCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', flexDirection: 'column', gap: 10, color: 'var(--clr-text-muted)' }}>
        <Activity size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{100%{transform:rotate(360deg)}}`}</style>
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--clr-bg-dark)' }}>
        <SignIn routing="hash" forceRedirectUrl="/" />
      </div>
    );
  }

  return (
    <div className="shell">
      <Sidebar
        active={activeTab}
        onNavigate={setActiveTab}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />

      <div className="main-area">
        <Navbar activeTab={activeTab} />
        <main className="content">
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'employees' && <EmployeeList />}
          {activeTab === 'predict' && <PredictPage onPredictionComplete={() => setActiveTab('employees')} />}
        </main>
      </div>
    </div>
  );
}
