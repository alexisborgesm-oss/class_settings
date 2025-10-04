import React, { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { User } from '@/types'

const Navbar: React.FC<{ user: User | null, onLogout: () => void }> = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false)
  const canManageUsers = !!user && (user.role === 'super_admin' || user.role === 'admin')
  const canModifyClass = canManageUsers

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

  return (
    <nav className="navbar">
      <div style={{display:'flex', gap:16, alignItems:'center'}}>
        <span className="brand">Class Settings</span>

        {/* Links visibles SOLO en escritorio */}
        <div className="nav-links only-desktop">
          <NavLink to="/" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Check Class Setting</NavLink>
          <NavLink to="/manage" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Manage Class</NavLink>
        </div>
      </div>

      <div style={{display:'flex', alignItems:'center', gap:12}}>
        <span className="user-pill">{user ? `${user.display_name} · ${user.role}` : 'No conectado'}</span>

        <div ref={ddRef} className={`dropdown ${open?'open':''}`}>
          <button className="btn" onClick={()=>setOpen(o=>!o)}>More ▾</button>
          <div className="dropdown-menu">
            {/* En móvil, mostramos también las rutas principales dentro del menú */}
            <Link to="/" className="dropdown-item only-mobile" onClick={()=>setOpen(false)}>
              Check Class Setting
            </Link>
            <Link to="/manage" className="dropdown-item only-mobile" onClick={()=>setOpen(false)}>
              Manage Class
            </Link>

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
            {canModifyClass && (
              <Link to="/props" className="dropdown-item" onClick={()=>setOpen(false)}>
                Manage Props
              </Link>
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
    </nav>
  )
}

export default Navbar
