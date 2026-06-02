'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

const DURATION_LABELS = { '1': '1 ano', '2': '2 anos', '3': '3 anos', 'vitalicio': 'Vitalício' }

function getDaysLeft(purchaseDate, duration) {
  if (duration === 'vitalicio') return Infinity
  const d = new Date(purchaseDate)
  d.setFullYear(d.getFullYear() + parseInt(duration))
  return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24))
}

function getStatus(purchaseDate, duration) {
  if (!purchaseDate) return 'Ativo'
  const days = getDaysLeft(purchaseDate, duration)
  if (days === Infinity) return 'Ativo'
  if (days < 0) return 'Vencido'
  if (days <= 60) return 'Vencendo'
  return 'Ativo'
}

function getExpiryDate(purchaseDate, duration) {
  if (!purchaseDate || duration === 'vitalicio') return null
  const d = new Date(purchaseDate)
  d.setFullYear(d.getFullYear() + parseInt(duration))
  return d
}

const STATUS_STYLE = {
  'Ativo': { bg: '#dcfce7', color: '#16a34a' },
  'Vencendo': { bg: '#fef3c7', color: '#d97706' },
  'Vencido': { bg: '#fee2e2', color: '#dc2626' },
}

const PAYMENT_STYLE = {
  'Aprovado': { bg: '#dcfce7', color: '#16a34a' },
  'Pendente': { bg: '#fef3c7', color: '#d97706' },
  'Reembolsado': { bg: '#fee2e2', color: '#dc2626' },
}

const emptyForm = { name: '', email: '', whatsapp: '', course: '', platform: 'Hotmart', purchase_date: '', duration: '1', payment_status: 'Aprovado', progress: 0, notes: '' }

export default function Dashboard() {
  const router = useRouter()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [view, setView] = useState('list') // list | detail | add
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('Todos')
  const [form, setForm] = useState(emptyForm)
  const [newTask, setNewTask] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadStudents() }, [])

  async function loadStudents() {
    setLoading(true)
    const res = await fetch('/api/students')
    if (res.status === 401) { router.push('/'); return }
    const data = await res.json()
    setStudents(data)
    setLoading(false)
  }

  async function syncHotmart() {
    setSyncing(true)
    const res = await fetch('/api/hotmart', { method: 'POST' })
    const data = await res.json()
    if (data.ok) { await loadStudents(); alert(`✅ ${data.synced} alunos sincronizados!`) }
    else alert('Erro na sincronização: ' + data.error)
    setSyncing(false)
  }

  async function saveStudent() {
    setSaving(true)
    const method = editMode ? 'PUT' : 'POST'
    const url = editMode ? `/api/students/${selected.id}` : '/api/students'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (editMode) {
      setStudents(prev => prev.map(s => s.id === selected.id ? { ...s, ...data } : s))
      setSelected(prev => ({ ...prev, ...data }))
      setEditMode(false)
    } else {
      setStudents(prev => [data, ...prev])
      setView('list')
    }
    setSaving(false)
  }

  async function deleteStudent(id) {
    if (!confirm('Remover este aluno?')) return
    await fetch(`/api/students/${id}`, { method: 'DELETE' })
    setStudents(prev => prev.filter(s => s.id !== id))
    setView('list')
  }

  async function addTask(studentId) {
    if (!newTask.trim()) return
    const res = await fetch(`/api/students/${studentId}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTask }) })
    const task = await res.json()
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, tasks: [...(s.tasks || []), task] } : s))
    setSelected(prev => ({ ...prev, tasks: [...(prev.tasks || []), task] }))
    setNewTask('')
  }

  async function toggleTask(studentId, task) {
    const res = await fetch(`/api/students/${studentId}/tasks`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: task.id, done: !task.done }) })
    const updated = await res.json()
    const updateTasks = tasks => tasks.map(t => t.id === task.id ? updated : t)
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, tasks: updateTasks(s.tasks || []) } : s))
    setSelected(prev => ({ ...prev, tasks: updateTasks(prev.tasks || []) }))
  }

  async function saveNotes(studentId, notes) {
    await fetch(`/api/students/${studentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...selected, notes }) })
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, notes } : s))
    setSelected(prev => ({ ...prev, notes }))
  }

  async function updateProgress(studentId, progress) {
    await fetch(`/api/students/${studentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...selected, progress }) })
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, progress } : s))
    setSelected(prev => ({ ...prev, progress }))
  }

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/')
  }

  const enriched = useMemo(() => students.map(s => ({
    ...s,
    status: getStatus(s.purchase_date, s.duration),
    daysLeft: s.purchase_date ? getDaysLeft(s.purchase_date, s.duration) : Infinity,
    expiryDate: getExpiryDate(s.purchase_date, s.duration),
  })), [students])

  const filtered = useMemo(() => enriched.filter(s => {
    const q = search.toLowerCase()
    const match = !q || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.course?.toLowerCase().includes(q)
    const statusMatch = filterStatus === 'Todos' || s.status === filterStatus
    return match && statusMatch
  }), [enriched, search, filterStatus])

  const stats = useMemo(() => ({
    total: enriched.length,
    ativos: enriched.filter(s => s.status === 'Ativo').length,
    vencendo: enriched.filter(s => s.status === 'Vencendo').length,
    vencidos: enriched.filter(s => s.status === 'Vencido').length,
  }), [enriched])

  const sel = selected ? enriched.find(s => s.id === selected.id) || selected : null

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f0f2f7; }
    ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .card { background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04); }
    .btn { border: none; border-radius: 10px; font-family: inherit; font-weight: 600; cursor: pointer; transition: all 0.15s; }
    .btn-primary { background: linear-gradient(135deg, #1e3a5f, #2563eb); color: #fff; padding: 10px 20px; font-size: 14px; }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn-secondary { background: #f1f5f9; color: #475569; padding: 10px 20px; font-size: 14px; }
    .btn-secondary:hover { background: #e2e8f0; }
    .btn-danger { background: #fee2e2; color: #dc2626; padding: 8px 16px; font-size: 13px; }
    .btn-danger:hover { background: #fecaca; }
    .btn-sync { background: linear-gradient(135deg, #059669, #10b981); color: #fff; padding: 10px 20px; font-size: 14px; }
    .btn-sync:hover { opacity: 0.9; }
    .input { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; color: #0f172a; font-size: 14px; width: 100%; font-family: inherit; transition: border 0.2s; outline: none; }
    .input:focus { border-color: #2563eb; background: #fff; }
    .row { display: flex; gap: 14px; }
    .badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 100px; font-size: 12px; font-weight: 700; }
    .student-row { display: grid; grid-template-columns: 2.5fr 1.5fr 1fr 1fr 1.2fr 60px; gap: 12px; align-items: center; padding: 14px 20px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.12s; }
    .student-row:hover { background: #f8fafc; }
    .student-row:last-child { border-bottom: none; }
    .progress-bar { background: #f1f5f9; border-radius: 100px; height: 6px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 100px; background: linear-gradient(90deg, #2563eb, #60a5fa); transition: width 0.4s; }
    .tab { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: inherit; transition: all 0.15s; }
    .tab-active { background: #eff6ff; color: #2563eb; }
    .tab-inactive { background: transparent; color: #94a3b8; }
    .task-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #f8fafc; border-radius: 10px; margin-bottom: 8px; border: 1px solid #f1f5f9; }
    .checkbox { width: 20px; height: 20px; border-radius: 6px; border: 2px solid #cbd5e1; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
    .checkbox-checked { background: #2563eb; border-color: #2563eb; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.2s ease; }
  `

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f7', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 20px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>S</div>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>Sameiro Educacional</div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Gestão de Alunos</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {view === 'list' && (
            <>
              <button className="btn btn-sync" onClick={syncHotmart} disabled={syncing}>
                {syncing ? '⟳ Sincronizando...' : '⟳ Sync Hotmart'}
              </button>
              <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setView('add') }}>+ Novo Aluno</button>
            </>
          )}
          <button className="btn btn-secondary" onClick={logout} style={{ fontSize: 13 }}>Sair</button>
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>

        {/* LIST */}
        {view === 'list' && (
          <div className="fade-in">
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Total de Alunos', value: stats.total, color: '#2563eb', bg: '#eff6ff', icon: '◈' },
                { label: 'Ativos', value: stats.ativos, color: '#16a34a', bg: '#dcfce7', icon: '●' },
                { label: 'Vencendo em breve', value: stats.vencendo, color: '#d97706', bg: '#fef3c7', icon: '◐' },
                { label: 'Vencidos', value: stats.vencidos, color: '#dc2626', bg: '#fee2e2', icon: '○' },
              ].map(stat => (
                <div key={stat.label} className="card" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{stat.label}</span>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, fontSize: 14 }}>{stat.icon}</div>
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <input className="input" style={{ flex: 1, minWidth: 240 }} placeholder="🔍  Buscar por nome, e-mail ou curso..." value={search} onChange={e => setSearch(e.target.value)} />
              <div style={{ display: 'flex', gap: 4 }}>
                {['Todos', 'Ativo', 'Vencendo', 'Vencido'].map(s => (
                  <button key={s} className={`tab ${filterStatus === s ? 'tab-active' : 'tab-inactive'}`} onClick={() => setFilterStatus(s)}>{s}</button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr 1fr 1fr 1.2fr 60px', gap: 12, padding: '12px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                {['Aluno', 'Curso', 'Plataforma', 'Status', 'Progresso', ''].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</div>
                ))}
              </div>
              {loading ? (
                <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Carregando alunos...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                  {students.length === 0 ? 'Nenhum aluno cadastrado. Clique em "Sync Hotmart" ou "Novo Aluno".' : 'Nenhum aluno encontrado.'}
                </div>
              ) : filtered.map(s => (
                <div key={s.id} className="student-row" onClick={() => { setSelected(s); setView('detail') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{(s.name || '?')[0].toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{s.email}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{s.course || '—'}</div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>{s.platform}</div>
                  <div>
                    <span className="badge" style={{ background: STATUS_STYLE[s.status]?.bg, color: STATUS_STYLE[s.status]?.color }}>{s.status}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>{s.progress || 0}%</div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${s.progress || 0}%` }} /></div>
                  </div>
                  <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 700 }}>Ver →</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DETAIL */}
        {view === 'detail' && sel && (
          <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <button className="btn btn-secondary" onClick={() => setView('list')}>← Voltar</button>
              <div style={{ flex: 1 }} />
              {!editMode && <button className="btn btn-secondary" onClick={() => { setForm({ name: sel.name, email: sel.email, whatsapp: sel.whatsapp || '', course: sel.course || '', platform: sel.platform || 'Hotmart', purchase_date: sel.purchase_date?.split('T')[0] || '', duration: sel.duration || '1', payment_status: sel.payment_status || 'Aprovado', progress: sel.progress || 0, notes: sel.notes || '' }); setEditMode(true) }}>✏️ Editar</button>}
              <button className="btn btn-danger" onClick={() => deleteStudent(sel.id)}>🗑 Remover</button>
            </div>

            {editMode ? (
              <div className="card" style={{ padding: 32, maxWidth: 700 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>Editar Aluno</h2>
                <StudentForm form={form} setForm={setForm} onSave={saveStudent} onCancel={() => setEditMode(false)} saving={saving} />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Profile */}
                <div className="card" style={{ padding: 28, gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                    <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 24, flexShrink: 0 }}>{(sel.name || '?')[0].toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{sel.name}</h2>
                        <span className="badge" style={{ background: STATUS_STYLE[sel.status]?.bg, color: STATUS_STYLE[sel.status]?.color }}>{sel.status}</span>
                        <span className="badge" style={{ background: PAYMENT_STYLE[sel.payment_status]?.bg, color: PAYMENT_STYLE[sel.payment_status]?.color }}>{sel.payment_status}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        {sel.email && <span style={{ fontSize: 13, color: '#64748b' }}>✉ {sel.email}</span>}
                        {sel.whatsapp && <span style={{ fontSize: 13, color: '#64748b' }}>📱 {sel.whatsapp}</span>}
                        {sel.course && <span style={{ fontSize: 13, color: '#64748b' }}>📚 {sel.course}</span>}
                        {sel.platform && <span style={{ fontSize: 13, color: '#64748b' }}>🏪 {sel.platform}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 6 }}>
                        {sel.purchase_date && <span style={{ fontSize: 13, color: '#64748b' }}>📅 Compra: {new Date(sel.purchase_date).toLocaleDateString('pt-BR')}</span>}
                        {sel.duration && <span style={{ fontSize: 13, color: '#64748b' }}>⏱ {DURATION_LABELS[sel.duration]}</span>}
                        {sel.expiryDate && (
                          <span style={{ fontSize: 13, color: sel.daysLeft <= 60 ? '#d97706' : '#64748b', fontWeight: sel.daysLeft <= 60 ? 600 : 400 }}>
                            🔚 Vence: {sel.expiryDate.toLocaleDateString('pt-BR')} {sel.daysLeft > 0 ? `(${sel.daysLeft} dias)` : '(Expirado)'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Progresso no Curso</div>
                  <div style={{ fontSize: 48, fontWeight: 800, color: '#2563eb' }}>{sel.progress || 0}%</div>
                  <div className="progress-bar" style={{ marginTop: 12, height: 10 }}>
                    <div className="progress-fill" style={{ width: `${sel.progress || 0}%` }} />
                  </div>
                  <input type="range" min={0} max={100} value={sel.progress || 0} onChange={e => updateProgress(sel.id, parseInt(e.target.value))} style={{ width: '100%', marginTop: 14, accentColor: '#2563eb' }} />
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Arraste para atualizar manualmente</div>
                </div>

                {/* Tasks */}
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Tarefas e Entregas</div>
                  {(sel.tasks || []).length === 0 && <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 12 }}>Nenhuma tarefa ainda</div>}
                  {(sel.tasks || []).map((t) => (
                    <div key={t.id} className="task-item">
                      <div className={`checkbox ${t.done ? 'checkbox-checked' : ''}`} onClick={() => toggleTask(sel.id, t)}>
                        {t.done && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 13, color: t.done ? '#94a3b8' : '#334155', textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <input className="input" placeholder="Nova tarefa..." value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask(sel.id)} />
                    <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '10px 16px' }} onClick={() => addTask(sel.id)}>+</button>
                  </div>
                </div>

                {/* Notes */}
                <div className="card" style={{ padding: 24, gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Observações & Histórico</div>
                  <textarea className="input" rows={4} style={{ resize: 'vertical' }} placeholder="Anote observações, histórico de conversas, situação do aluno..." value={sel.notes || ''} onChange={e => saveNotes(sel.id, e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADD */}
        {view === 'add' && (
          <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <button className="btn btn-secondary" onClick={() => setView('list')}>← Voltar</button>
            </div>
            <div className="card" style={{ padding: 32, maxWidth: 700 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 28 }}>Novo Aluno</h2>
              <StudentForm form={form} setForm={setForm} onSave={saveStudent} onCancel={() => setView('list')} saving={saving} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StudentForm({ form, setForm, onSave, onCancel, saving }) {
  const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row">
        <div style={{ flex: 1 }}><label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>Nome completo *</label><input className="input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="Ana Paula Ferreira" /></div>
        <div style={{ flex: 1 }}><label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>Email *</label><input className="input" value={form.email} onChange={e => f('email', e.target.value)} placeholder="ana@email.com" /></div>
      </div>
      <div className="row">
        <div style={{ flex: 1 }}><label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>WhatsApp</label><input className="input" value={form.whatsapp} onChange={e => f('whatsapp', e.target.value)} placeholder="11999990000" /></div>
        <div style={{ flex: 1 }}><label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>Curso</label><input className="input" value={form.course} onChange={e => f('course', e.target.value)} placeholder="Nome do curso" /></div>
      </div>
      <div className="row">
        <div style={{ flex: 1 }}><label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>Plataforma</label>
          <select className="input" value={form.platform} onChange={e => f('platform', e.target.value)}>
            {['Hotmart', 'Kiwify', 'Eduzz', 'Monetizze', 'Outra'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}><label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>Data de compra</label><input type="date" className="input" value={form.purchase_date} onChange={e => f('purchase_date', e.target.value)} /></div>
      </div>
      <div className="row">
        <div style={{ flex: 1 }}><label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>Duração do acesso</label>
          <select className="input" value={form.duration} onChange={e => f('duration', e.target.value)}>
            <option value="1">1 ano</option><option value="2">2 anos</option><option value="3">3 anos</option><option value="vitalicio">Vitalício</option>
          </select>
        </div>
        <div style={{ flex: 1 }}><label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>Status do pagamento</label>
          <select className="input" value={form.payment_status} onChange={e => f('payment_status', e.target.value)}>
            {['Aprovado', 'Pendente', 'Reembolsado'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div><label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>Observações</label><textarea className="input" rows={3} value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Notas sobre o aluno..." style={{ resize: 'vertical' }} /></div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Aluno'}</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}
