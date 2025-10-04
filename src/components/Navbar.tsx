import React, { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { User } from '@/types'
import { supabase } from '@/utils/supabase'
import Modal from '@/components/Modal'

const Navbar: React.FC<{ user: User | null, onLogout: () => void }> = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false)
  const isInstructor = !!user && user.role === 'Instructor'
  const canManageUsers = !!user && (user.role === 'super_admin' || user.role === 'admin')
  const canModifyClass = canManageUsers
  const canManageClass = !!user && (user.role === 'super_admin' || user.role === 'admin' || user.role === 'Instructor')

  // Cierra por click fuera
  const ddRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (open && ddRef.current && !ddRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // ====== Modal Cambiar usuario/contraseña ======
  const [credOpen, setCredOpen] = useState(false)
  const [username, setUsername] = useState(user?.username || '')
  const [currPw, setCurrPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // si cambia el usuario (prop), rehidratar el input
    setUsername(user?.username || '')
  }, [user?.username])

  const openCreds = () => {
    if (!user) return
    setUsername(user.username || '')
    setCurrPw('')
    setNewPw('')
    setNewPw2('')
    setCredOpen(true)
  }

  const saveCreds = async () => {
    if (!user) return
    // Validaciones
    if (!username.trim()) { alert('El usuario no puede estar vacío.'); return }
    if (!currPw.trim()) { alert('Debes introducir tu contraseña actual.'); return }

    if (newPw || newPw2) {
      if (newPw.length < 8) { alert('La nueva contraseña debe tener al menos 8 caracteres.'); return }
      if (newPw !== newPw2) { alert('Las contraseñas no coinciden.'); return }
    }

    setSaving(true)
    try {
      // 1) Verificar contraseña actual (plaintext según tu esquema actual)
      const { data: row, error } = await supabase
        .from('users')
        .select('id, password')
        .eq('id', user.id)
        .single()

      if (error || !row) throw new Error(error?.message || 'No se pudo validar el usuario.')
      if (row.password !== currPw) { alert('La contraseña actual es incorrecta.'); return }

      // 2) Preparar update
      const update: any = { username: username.trim() }
      if (newPw) update.password = newPw

      const { error: upErr } = await supabase
        .from('users')
        .update(update)
        .eq('id', user.id)

      if (upErr) throw new Error(upErr.message)

      alert('Credenciales actualizadas correctamente.')
      setCredOpen(false)
    } catch (e:any) {
      alert('Error actualizando credenciales: ' + (e?.message || e))
    } finally {
      setSaving(false)
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

          {/* Manage Class se mueve a More, así que ya no va aquí */}
        </div>
      </div>

      <div style={{display:'flex', alignItems:'center', gap:12}}>
        {/* Al hacer click en el usuario -> abre modal de cambio de usuario/contraseña */}
        <button
          className="user-pill"
          onClick={openCreds}
          title="Cambiar usuario / contraseña"
          style={{ cursor:'pointer' }}
        >
          {user ? `${user.display_name} · ${user.role}` : 'No conectado'}
        </button>

        <div ref={ddRef} className={`dropdown ${open?'open':''}`}>
          <button className="btn" onClick={()=>setOpen(o=>!o)}>More ▾</button>
          <div className="dropdown-menu">
            {/* En móvil, mostramos también rutas principales dentro del menú */}
            <Link to="/" className="dropdown-item only-mobile" onClick={()=>setOpen(false)}>
              Check Class Setting
            </Link>
            {isInstructor && (
              <Link to="/my-classes" className="dropdown-item only-mobile" onClick={()=>setOpen(false)}>
                My Classes
              </Link>
            )}

            {/* Manage Class ahora vive en More para todos los que pueden usarla */}
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
            {canManageUsers && (
              <Link to="/props" className="dropdown-item" onClick={()=>setOpen(false)}>
                Manage props
              </Link>
            )}
            {canModifyClass && (
              <Link to="/modify" className="dropdown-item" onClick={()=>setOpen(false)}>
                Modify Class
              </Link>
            )}
            {user && (
              <a
                href="#"
                className="dropdown-item"
                onClick={(e)=>{ e.preventDefault(); setOpen(false); onLogout(); }}
              >
                Log out
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Modal Cambiar usuario / contraseña */}
      <Modal
        open={credOpen}
        onClose={()=>setCredOpen(false)}
        title="Change user / passwd"
        footer={
          <>
            <button className="btn" onClick={()=>setCredOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn primary" onClick={saveCreds} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="grid grid-1" style={{ gap: 12 }}>
          <div>
            <label>User</label>
            <input
              className="input"
              value={username}
              onChange={e=>setUsername(e.target.value)}
              placeholder="New user"
            />
          </div>
          <div>
            <label>Current passwd</label>
            <input
              type="password"
              className="input"
              value={currPw}
              onChange={e=>setCurrPw(e.target.value)}
              placeholder="Current passwd"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label>New passwd</label>
            <input
              type="password"
              className="input"
              value={newPw}
              onChange={e=>setNewPw(e.target.value)}
              placeholder="(opcional) mín. 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label>Confirm new passwd</label>
            <input
              type="password"
              className="input"
              value={newPw2}
              onChange={e=>setNewPw2(e.target.value)}
              placeholder="Repeat the new passwd"
              autoComplete="new-password"
            />
          </div>
          <div className="small">
            Note: If you don’t want to change the password, leave the new password fields empty.
          </div>
        </div>
      </Modal>
    </nav>
  )
}

export default Navbar
