
import React, { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { Role, User } from '@/types'
import { confirm } from '@/components/Confirm'

const ManageUsers: React.FC<{ user: User|null }> = ({ user }) => {
  const canSee = user && (user.role === 'super_admin' || user.role === 'admin')
  const [rows, setRows] = useState<User[]>([])
  const [edit, setEdit] = useState<Partial<User>>({})

  React.useEffect(()=>{
    (async ()=>{
      const { data } = await supabase.from('users').select('*').order('created_at', {ascending:false})
      setRows(data||[])
    })()
  }, [])

  if (!canSee) return <div className="panel">Not authorized.</div>

  const save = async () => {
    if (!edit.username || !edit.display_name || !edit.role || !edit.password) { alert('All fields are required'); return }
    if (edit.id) {
      const { error } = await supabase.from('users').update({
        username: edit.username, display_name: edit.display_name, role: edit.role, password: edit.password
      }).eq('id', edit.id)
      if (error) { alert(error.message); return }
      setRows(prev=>prev.map(r=>r.id===edit.id ? {...r, ...edit} as User : r))
    } else {
      const { data, error } = await supabase.from('users').insert({
        username: edit.username, display_name: edit.display_name, role: edit.role, password: edit.password
      }).select().single()
      if (error) { alert(error.message); return }
      setRows(prev=>[data as User, ...prev])
    }
    setEdit({})
  }

  const remove = async (u: User) => {
    if (!(await confirm('Delete user?'))) return
    const { error } = await supabase.from('users').delete().eq('id', u.id)
    if (error) { alert(error.message); return }
    setRows(prev=>prev.filter(r=>r.id!==u.id))
  }

  const roles: Role[] = ['super_admin','admin','Instructor','PA','standard']

  return (
    <div className="panel">
      <h3 style={{marginTop:0}}>Users</h3>
      <div className="grid" style={{gridTemplateColumns:'1fr 1fr 1fr 1fr auto', gap:8, marginBottom:12}}>
        <input className="input" placeholder="username" value={edit.username||''} onChange={e=>setEdit({...edit, username:e.target.value})} />
        <input className="input" placeholder="display name" value={edit.display_name||''} onChange={e=>setEdit({...edit, display_name:e.target.value})} />
        <select value={edit.role||''} onChange={e=>setEdit({...edit, role:e.target.value as Role})}>
          <option value="">- rol -</option>
          {roles.map(r=>(<option key={r} value={r}>{r}</option>))}
        </select>
        <input className="input" placeholder="password" value={edit.password||''} onChange={e=>setEdit({...edit, password:e.target.value})} />
        <button className="btn primary" onClick={save}>Save</button>
      </div>

      <table className="table">
        <thead><tr><th>Usuario</th><th>Name</th><th>Rol</th><th></th></tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id}>
              <td>{r.username}</td>
              <td>{r.display_name}</td>
              <td><span className="badge">{r.role}</span></td>
              <td style={{display:'flex', gap:8}}>
                <button className="btn" onClick={()=>setEdit(r)}>Edit</button>
                <button className="btn danger" onClick={()=>remove(r)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ManageUsers
