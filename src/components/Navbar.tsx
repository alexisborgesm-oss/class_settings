// src/components/Navbar.tsx
import React, { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { User } from '@/types'

const Navbar: React.FC<{ user: User | null, onLogout: () => void }> = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false)
  const canManageUsers = user && (user.role === 'super_admin' || user.role === 'admin')
  const canModifyClass = canManageUsers

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
        <div className="nav-links">
          <NavLink to="/" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Check Class Setting</NavLink>
          <NavLink to="/manage" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Manage Class</NavLink>
        </div>
      </div>

      <div style={{display:'flex', alignItems:'center', gap:12}}>
        <span className="user-pill">{user ? `${user.display_name} · ${user.role}` : 'No conectado'}</span>

        <div ref={ddRef} className={`dropdown ${open?'open':''}`}>
          <button className="btn" onClick={()=>setOpen(o=>!o)}>More ▾</button>
          <div className="dropdown-menu">
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
            {user && (
              <button className="dropdown-item" onClick={()=>{ setOpen(false); onLogout(); }}>
                Salir
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
