
import React, { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { User } from '@/types'

const AuthGate: React.FC<{ onUser: (u: User|null)=>void }> = ({ onUser }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(()=>{
    const raw = localStorage.getItem('user')
    if (raw) {
      try { onUser(JSON.parse(raw)) } catch {}
    }
  }, [onUser])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data, error } = await supabase.from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .limit(1)
    if (error) { alert('Error consultando usuarios: '+error.message); return }
    if (!data || !data.length) { alert('Credenciales invalidas'); return }
    const user = data[0] as User
    localStorage.setItem('user', JSON.stringify(user))
    onUser(user)
  }

  return (
    <div className="container">
      <div className="panel" style={{maxWidth:480, margin:'10vh auto'}}>
        <h2>Entrar</h2>
        <form onSubmit={login} className="grid" style={{gap:12}}>
          <input className="input" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Usuario" />
          <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contrasena" />
          <button className="btn primary" type="submit">Entrar</button>
        </form>
        <p className="small" style={{marginTop:12}}>Usuario super_admin por defecto: <b>superadmin</b> / <b>Qaz123*</b></p>
      </div>
    </div>
  )
}

export default AuthGate
