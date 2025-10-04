import React, { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { Class, ClassImage, ClassProp, PropItem, User } from '@/types'
import Modal from '@/components/Modal'
import { confirm } from '@/components/Confirm'

type Props = { user: User | null }

const MyClasses: React.FC<Props> = ({ user }) => {
  const isInstructor = user?.role === 'Instructor'
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)

  // Cargar clases asignadas al instructor logueado
  useEffect(() => {
    (async () => {
      if (!isInstructor || !user?.id) { setClasses([]); setLoading(false); return }
      const { data, error } = await supabase
        .from('instructor_classes')
        .select('class:classes(id,name)')
        .eq('instructor_id', user.id)

      if (error) {
        console.error('Error cargando mis clases:', error.message)
        setClasses([])
      } else {
        const cls = ((data as any) || []).map((r: any) => r.class as Class)
        setClasses(cls)
      }
      setLoading(false)
    })()
  }, [isInstructor, user?.id])

  if (!isInstructor) {
    // La vista “no está visible” para otros roles; mostramos un aviso por si acceden directo.
    return <div className="panel">No authorized.</div>
  }

  return (
    <div>
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>My Classes</h3>

        {loading ? (
          <div className="small">Loading…</div>
        ) : classes.length === 0 ? (
          <div className="small">
            You don't have any class assigned yet. Go to <b>Manage Class</b> to assign a class to yourself or create a new class.
           
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Class</th>
                <th style={{ width: 320 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <MyClassRow key={c.id} user={user!} cls={c} onUnassigned={() => {
                  // quitar de la lista cuando se desasigne
                  setClasses(prev => prev.filter(x => x.id !== c.id))
                }} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const MyClassRow: React.FC<{ user: User, cls: Class, onUnassigned: () => void }> = ({ user, cls, onUnassigned }) => {
  const [editOpen, setEditOpen] = useState(false)

  // UNASSIGN
  const unassign = async () => {
    const ok = await confirm(
      `If you unassign "${cls.name}" all props, pictures and notes from this clase will be deleted. ¿Continue?`
    )
    if (!ok) return

    // 1) borrar dependencias de esta combinación (clase + instructor)
    await supabase.from('class_props').delete().eq('class_id', cls.id).eq('instructor_id', user.id)
    await supabase.from('class_images').delete().eq('class_id', cls.id).eq('instructor_id', user.id)
    await supabase.from('class_notes').delete().eq('class_id', cls.id).eq('instructor_id', user.id)
    // 2) borrar asociación
    const { error } = await supabase
      .from('instructor_classes')
      .delete()
      .eq('class_id', cls.id)
      .eq('instructor_id', user.id)

    if (error) { alert('Error desasignando: ' + error.message); return }
    onUnassigned()
    alert('You have been unassigned from the class, and all related items were successfully deleted.')
  }

  return (
    <tr>
      <td>{cls.name}</td>
      <td>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => setEditOpen(true)}>Edit</button>
          <button className="btn danger" onClick={unassign}>Unassign</button>
        </div>
      </td>

      {/* Modal de edición de la clase (para este instructor) */}
      <td style={{ display: 'none' }} /> {/* evita warnings de estructura */}
      <InstructorEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        user={user}
        classId={cls.id}
        className={cls.name}
      />
    </tr>
  )
}

/* ===== Modal para que el Instructor edite Props, Imágenes y Nota de UNA clase ===== */
const InstructorEditModal: React.FC<{
  open: boolean
  onClose: () => void
  user: User
  classId: number
  className: string
}> = ({ open, onClose, user, classId, className }) => {
  const [allProps, setAllProps] = useState<PropItem[]>([])
  const [selectedPropId, setSelectedPropId] = useState<number | ''>('')
  const [myProps, setMyProps] = useState<(ClassProp & { prop: PropItem })[]>([])

  const [images, setImages] = useState<ClassImage[]>([])
  const [pendingImages, setPendingImages] = useState<File[]>([])

  const [note, setNote] = useState('')

  // Cargar datos al abrir
  useEffect(() => {
    if (!open) return
    ;(async () => {
      const { data: props } = await supabase.from('props').select('*').order('name')
      setAllProps(props || [])

      const { data: cp } = await supabase
        .from('class_props')
        .select('*, prop:props(*)')
        .eq('class_id', classId)
        .eq('instructor_id', user.id)
      setMyProps((cp as any) || [])

      const { data: imgs } = await supabase
        .from('class_images')
        .select('*')
        .eq('class_id', classId)
        .eq('instructor_id', user.id)
      setImages(imgs || [])

      const { data: notes } = await supabase
        .from('class_notes')
        .select('*')
        .eq('class_id', classId)
        .eq('instructor_id', user.id)
        .limit(1)
      setNote((notes && notes[0]?.note) || '')
      setPendingImages([])
    })()
  }, [open, classId, user.id])

  // ---- Props (CRUD inmediato) ----
  const addProp = async () => {
    if (!selectedPropId) return
    const { data, error } = await supabase
      .from('class_props')
      .insert({ class_id: classId, instructor_id: user.id, prop_id: Number(selectedPropId) })
      .select('*, prop:props(*)')
      .single()
    if (error) { alert('Error añadiendo prop: ' + error.message); return }
    setMyProps(prev => ([...(prev as any), data as any]))
    setSelectedPropId('')
  }

  const removeProp = async (id: number) => {
    const { error } = await supabase.from('class_props').delete().eq('id', id)
    if (error) { alert('Error quitando prop: ' + error.message); return }
    setMyProps(prev => prev.filter(p => p.id !== id))
  }

  // ---- Imágenes (pendientes + guardadas) ----
  const stageImage = (file: File) => setPendingImages(prev => [...prev, file])
  const removePendingAt = (idx: number) => setPendingImages(prev => prev.filter((_, i) => i !== idx))
  const deleteImage = async (id: number) => {
    const { error } = await supabase.from('class_images').delete().eq('id', id)
    if (error) { alert('Error eliminando imagen: ' + error.message); return }
    setImages(prev => prev.filter(p => p.id !== id))
  }

  // ---- Save: sube pendientes y guarda/actualiza nota ----
  const saveAll = async () => {
    try {
      for (const file of pendingImages) {
        const ext = file.name.split('.').pop()
        const path = `class_${classId}/instr_${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('class-images').upload(path, file, { upsert: true })
        if (upErr) throw new Error('Storage: ' + upErr.message)
        const { data: pub } = await supabase.storage.from('class-images').getPublicUrl(path)
        const { data, error: insErr } = await supabase
          .from('class_images')
          .insert({ class_id: classId, instructor_id: user.id, url: pub.publicUrl })
          .select()
          .single()
        if (insErr) throw new Error(insErr.message)
        setImages(prev => [...prev, data!])
      }
      setPendingImages([])

      const { data: existing } = await supabase
        .from('class_notes')
        .select('*')
        .eq('class_id', classId)
        .eq('instructor_id', user.id)
        .limit(1)

      if (existing && existing.length) {
        const { error } = await supabase.from('class_notes').update({ note }).eq('id', existing[0].id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('class_notes').insert({ class_id: classId, instructor_id: user.id, note })
        if (error) throw new Error(error.message)
      }

      alert('Changes saved successfully.')
    } catch (e: any) {
      alert('Error saving: ' + (e?.message || e))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit · ${className}`}
      footer={
        <>
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn primary" onClick={saveAll}>Save</button>
        </>
      }
    >
      <div className="grid grid-2">
        {/* PROPS */}
        <div>
          <h4>Props</h4>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={selectedPropId}
              onChange={e => setSelectedPropId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">— Prop —</option>
              {allProps.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
            <button className="btn" onClick={addProp}>Add</button>
          </div>
          <ul style={{ marginTop: 12 }}>
            {myProps.map(p => (
              <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span>{p.prop.name}</span>
                <button className="btn danger" onClick={() => removeProp(p.id)}>Remove</button>
              </li>
            ))}
            {!myProps.length && <li className="small">No props.</li>}
          </ul>
        </div>

        {/* IMÁGENES */}
        <div>
          <h4>Imágenes</h4>
        
          <label className="btn" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
  Select File
  <input
    type="file"
    accept="image/*"
    onChange={(e) => e.target.files && stageImage(e.target.files[0])}
    style={{ display: 'none' }}
  />
</label>

          {pendingImages.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div className="small">Pending upload:</div>
              <ul>
                {pendingImages.map((f, idx) => (
                  <li key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                    <button className="btn" onClick={() => removePendingAt(idx)}>Quitar</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <div className="small">Saved:</div>
            <ul>
              {images.map(img => (
                <li key={img.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <a className="nav-link" href={img.url} target="_blank">Show</a>
                  <button className="btn danger" onClick={() => deleteImage(img.id)}>Delete</button>
                </li>
              ))}
              {images.length === 0 && <li className="small">No saved pictures.</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* NOTA */}
      <div className="panel" style={{ marginTop: 12 }}>
        <h4>Nota</h4>
        <textarea className="input" rows={4} value={note} onChange={e => setNote(e.target.value)} />
      </div>
    </Modal>
  )
}

export default MyClasses
