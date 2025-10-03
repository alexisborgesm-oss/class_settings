import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import CheckClass from '@/pages/CheckClass'
import ManageClass from '@/pages/ManageClass'
import ModifyClass from '@/pages/ModifyClass'
import ManageUsers from '@/pages/ManageUsers'
import AuthGate from '@/AuthGate'
import { User } from '@/types'
import './styles.css'

export default function App() {
  const [user, setUser] = useState<User|null>(null)
  const logout = () => { localStorage.removeItem('user'); setUser(null) }

  const app = (
    <BrowserRouter>
      <Navbar user={user} onLogout={logout} />
      <div className="container">
        <Routes>
          <Route path="/" element={<CheckClass user={user} />} />
          <Route path="/manage" element={<ManageClass user={user} />} />
          <Route path="/modify" element={<ModifyClass user={user} />} />
          <Route path="/users" element={<ManageUsers user={user} />} />
        </Routes>
      </div>
    </BrowserRouter>
  )

  return user ? app : <AuthGate onUser={setUser} />
}
