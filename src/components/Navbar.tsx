
import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { User } from '@/types'

const Navbar: React.FC<{ user: User | null }> = ({ user }) => {
  const [open, setOpen] = useState(false)
  const canManageUsers = user && (user.role === 'super_admin' || user.role === 'admin')
  const canModifyClass = canManageUsers

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

        <div className={`dropdown ${open?'open':''}`} onMouseLeave={()=>setOpen(false)}>
          <button className="btn" onClick={()=>setOpen(o=>!o)}>More ▾</button>
          <div className="dropdown-menu">
            {canManageUsers && <Link to="/users" className="dropdown-item" onClick={()=>setOpen(false)}>Manage users</Link>}
            {canModifyClass && <Link to="/modify" className="dropdown-item" onClick={()=>setOpen(false)}>Modify Class</Link>}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
