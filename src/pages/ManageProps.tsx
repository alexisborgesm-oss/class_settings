import React, { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { PropItem, User } from '@/types'
import { confirm } from '@/components/Confirm'

type Props = { user: User | null }

const ManageProps: React.FC<Props> = ({ user }) => {
  const [allProps, setAllProps] = useState<PropItem[]>([])
  const [name, setName] = useState('')
  const canDelete = !!user && (user.role === 'super_admin' || user.role === 'admin')

  const loadProps = async () => {
    const { data, error } = await supabase.from('props').select('*').order('name', { ascending: true })
    if (error) { alert('Error cargando props: ' + error.message); return }
    setAllProps(data || [])
  }

  useEffect(() => { loadProps() }, [])

  const createProp = async () => {
    const trimmed = name.trim()
    if (!trimmed) { alert('Write the name of the prop.'); return }
    const { error } = await supabase.from('props').insert({ name: trimmed })
    if (error) { alert('Error creando prop: ' + error.message); return }
    setName('')
    await loadProps()
  }

  const renameProp = async (p: PropItem) => {
    const nuevo = prompt('New prop name:', p.name)
    if (nuevo === null) return // cancelado
    const trimmed = nuevo.trim()
    if (!trimmed) { alert('Name can not be empty.'); return }
    const ok = await confirm(`¿Rename "${p.name}" a "${trimmed}"?`)
    if (!ok) return
    const { error } = await supabase.from('props').update({ name: trimmed }).eq('id', p.id)
    if (error) { alert('Error updating: ' + error.message); return }
    await loadProps()
  }

  const deleteProp = async (p: PropItem) => {
    if (!canDelete) { alert('Only admin or super_admin can delete props.'); return }
    const ok = await confirm(
      `¿Sure to delete "${p.name}"?\n` +
      'Note: if there are any class that depend on this prop, they could be affected.'
    )
    if (!ok) return
    const { error } = await supabase.from('props').delete().eq('id', p.id)
    if (error) { alert('Error deleting: ' + error.message); return }
    await loadProps()
  }

  return (
    <div>
      {/* Panel superior: crear prop */}
      <div className="panel" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
        <div>
          <label>Name</label>
          <input
            className="input"
            placeholder="Ej. Mat, Bloques, Correa…"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createProp() }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <button className="btn primary" onClick={createProp}>Save</button>
        </div>
      </div>

      {/* Panel listado */}
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>All the props</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Prop</th>
              <th style={{ width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allProps.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn" onClick={() => renameProp(p)}>Rename</button>
                    {canDelete && (
                      <button className="btn danger" onClick={() => deleteProp(p)}>Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!allProps.length && (
              <tr>
                <td colSpan={2} className="small">No props created yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ManageProps
