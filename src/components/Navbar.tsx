import React, { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { supabase } from '@/utils/supabase'
import { User } from '@/types'

const Navbar: React.FC<{ user: User | null, onLogout: () => void }> = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false)

  // Roles normalizados (evita perder opciones por mayúsculas/minúsculas)
  const role = (user?.role || '').toLowerCase()
  const isInstructor = role === 'instructor'
  const canManageUsers = role === 'super_admin' || role === 'admin'
  const canModifyClass = canManageUsers
  const canManageClass = !!user && (isInstructor || canManageUsers)

  // Dropdown "More" close on outside click
  const ddRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (open && ddRef.current && !ddRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // --- Cambio de contraseña ---
  const [pwOpen, setPwOpen] = useState(false)
  const [currPw, setCurrPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  const resetPwForm = () => { setCurrPw(''); setNewPw(''); setNewPw2('') }

  const handleOpenPw = () => {
    if (!user) return
    resetPwForm()
    setPwOpen(true)
  }

  const changePassword = async () => {
    if (!user) return
    if (!currPw.trim() || !newPw.trim() || !newPw2.trim()) { alert('Completa todos los campos.'); return }
    if (newPw.length < 8) { alert('La nueva contraseña debe tener al menos 8 caracteres.'); return }
    if (newPw !== newPw2) { alert('La confirmación no coincide.'); return }

    setPwLoading(true)
    try {
      // Leer credenciales actuales
      const { data: row, error } = await supabase
        .from('users')
        .select('id, password, password_hash')
        .eq('id', user.id)
        .single()

      if (error || !row) { throw new Error(error?.message || 'No se pudo cargar el usuario') }

      // Cargar bcryptjs si está instalado
      let bcrypt: any = null
      try { bcrypt = await import('bcryptjs') } catch { /* si no está, seguimos en texto plano */ }

      // Verificación de contraseña actual
      let isValid = false
      if (row.password_hash && bcrypt?.compare) {
        isValid = await bcrypt.compare(currPw, row.password_hash)
      } else {
        // Fallback: comparación en texto plano con columna `password`
        isValid = !!row.password && row.password === currPw
      }
      if (!isValid) { alert('La contraseña actual es incorrecta.'); return }

      // Actualización
      if (bcrypt?.hash) {
        const hash = await bcrypt.hash(newPw, 10)
        const { error: upErr } = await supabase
          .from('users')
          .update({ password_hash: hash })
          .eq('id', user.id)
        if (upErr) throw new Error(upErr.message)
      } else {
        // Fallback: guardar en texto plano si no hay bcrypt instalado
        const { error: upErr } = await supabase
          .from('users')
          .update({ password: newPw })
          .eq('id', user.id)
        if (upErr) throw new Error(upErr.message)
      }

      alert('Contraseña actualizada correctamente.')
      setPwOpen(false)
      resetPwForm()
    } catch (e: any) {
      alert('Error al actualizar la contraseña: ' + (e?.message || e))
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <nav className="navbar">
      <div style={{display:'flex', gap:16, alignItems:'center'}}>
        <span className="brand">Class Settings</span>

        {/* Links visibles SOLO en escritorio */}
        <div className="nav-links only-desktop">
          <NavLink to="/" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Check Class Setting</NavLink>

          {/* My Classes al lado (solo instructores) */}
          {isInstructor && (
            <NavLink to="/my-classes" className={({isActive})=>`nav-link ${isActive?'active':''}`}>
              My Classes
            </NavLink>
          )}
        </div>
      </div>

      <div style={{display:'flex', alignItems:'center', gap:12}}>
        {/* Usuario visible también en móvil: clickable para cambiar contraseña */}
        <button
          className="user-pill"
          onClick={handleOpenPw}
          title="Change password"
          style={{ cursor:'pointer' }}
        >
          {user ? `${user.display_name} · ${user.role}` : 'No conectado'}
        </button>

        <div ref={ddRef} className={`dropdown ${open?'open':''}`}>
          <button className="btn" onClick={()=>setOpen(o=>!o)}>More ▾</button>
          <div className="dropdown-menu">
            {/* En móvil, mostramos principales dentro del menú */}
            <Link to="/" className="dropdown-item only-mobile" onClick={()=>setOpen(false)}>
              Check Class Setting
            </Link>
            {isInstructor && (
              <Link to="/my-classes" className="dropdown-item only-mobile" onClick={()=>setOpen(false)}>
                My Classes
              </Link>
            )}

            {/* Manage Class en More */}
            {canManageClass && (
              <Link to="/manage" className="dropdown-item" onClick={()=>setOpen(false)}>
                Manage Class
              </Link>
            )}

            {canManageUsers && (
              <Link to="/users" className="dropdown-item" onClick={()=>setOpen(false)}>
                Manage users
              </Link>
            )}
            {canModifyClass && (
              <Link to="/modify" className="dropdown-item" onClick={()=>setOpen(false)}>
                Modify Class
              </Link>
            )}

            {/* También desde aquí: cambiar contraseña */}
            {user && (
              <a
                href="#"
                className="dropdown-item"
                onClick={(e)=>{ e.preventDefault(); setOpen(false); handleOpenPw() }}
              >
                Change password…
              </a>
            )}

            {user && (
              <a
                href="#"
                className="dropdown-item"
                onClick={(e)=>{ e.preventDefault(); setOpen(false); onLogout(); }}
              >
                Salir
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Modal cambio de contraseña */}
      <PasswordModal
        open={pwOpen}
        onClose={()=>setPwOpen(false)}
        currPw={currPw}
        setCurrPw={setCurrPw}
        newPw={newPw}
        setNewPw={setNewPw}
        newPw2={newPw2}
        setNewPw2={setNewPw2}
        onSave={changePassword}
        loading={pwLoading}
      />
    </nav>
  )
}

const PasswordModal: React.FC<{
  open: boolean
  onClose: () => void
  currPw: string
  setCurrPw: (v: string) => void
  newPw: string
  setNewPw: (v: string) => void
  newPw2: string
  setNewPw2: (v: string) => void
  onSave: () => void
  loading: boolean
}> = ({ open, onClose, currPw, setCurrPw, newPw, setNewPw, newPw2, setNewPw2, onSave, loading }) => {
  if (!open) return null
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3 style={{margin:0}}>Change password</h3>
        </div>
        <div className="modal-body">
          <div className="grid grid-1" style={{gap:12}}>
            <div>
              <label>Current password</label>
              <input
                type="password"
                className="input"
                value={currPw}
                onChange={e=>setCurrPw(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div>
              <label>New password</label>
              <input
                type="password"
                className="input"
                value={newPw}
                onChange={e=>setNewPw(e.target.value)}
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label>Confirm new password</label>
              <input
                type="password"
                className="input"
                value={newPw2}
                onChange={e=>setNewPw2(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>
        <div className="modal-footer" style={{display:'flex', justifyContent:'flex-end', gap:8}}>
          <button className="btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn primary" onClick={onSave} disabled={loading}>
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Navbar
