import React, { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { Class, ClassImage, ClassProp, PropItem, User } from '@/types'
import Modal from '@/components/Modal'
import { confirm } from '@/components/Confirm'

type Props = { user: User|null }

const ManageClass: React.FC<Props> = ({ user }) => {
  const [name, setName] = useState('')
  const [savedClass, setSavedClass] = useState<Class|null>(null)
  const [openUnassign, setOpenUnassign] = useState(false)
const [instructorsForUnassign, setInstructorsForUnassign] = useState<User[]>([])

  const [allInstructors, setAllInstructors] = useState<User[]>([])
  const [selectedInstructors, setSelectedInstructors] = useState<Set<string>>(new Set()) // lo que se guardará
  const [assignedForClass, setAssignedForClass] = useState<Set<string>>(new Set()) // ya asignados (visual)
  const [openAssign, setOpenAssign] = useState(false)

  const [classes, setClasses] = useState<Class[]>([])

  const isInstructor = user?.role === 'Instructor'
  const isAdminish = user && (user.role === 'super_admin' || user.role === 'admin')

  // Para limitar botón "Editar" solo a clases asignadas al instructor logueado
  const [assignedClassIds, setAssignedClassIds] = useState<Set<number>>(new Set())

  // Cargar instructores y clases
  useEffect(()=>{
    (async ()=>{
      const { data:users } = await supabase.from('users').select('*').eq('role','Instructor')
      setAllInstructors(users||[])
      const { data:cls } = await supabase.from('classes').select('*').order('created_at', {ascending:false})
      setClasses(cls||[])
    })()
  }, [])

  // Cargar clases asignadas al instructor logueado (para mostrar Editar solo donde corresponde)
  useEffect(() => {
    (async () => {
      if (!isInstructor || !user?.id) { setAssignedClassIds(new Set()); return }
      const { data, error } = await supabase
        .from('instructor_classes')
        .select('class_id')
        .eq('instructor_id', user.id)
      if (error) { console.error(error.message); setAssignedClassIds(new Set()); return }
      setAssignedClassIds(new Set((data || []).map(r => r.class_id)))
    })()
  }, [isInstructor, user?.id])

  // Guardar clase y (si es Instructor) ofrecer auto-asignarse
  const saveClass = async () => {
    if (!name.trim()) { alert('Write a name'); return }
    if (!(await confirm('¿Sure to save this class?'))) return

    const { data, error } = await supabase.from('classes').insert({ name }).select().single()
    if (error) { alert('Error saving class: '+error.message); return }

    setSavedClass(data)
    setClasses(prev=>[data, ...prev])

    if (isInstructor) {
      const asignarse = await confirm('¿Assign yourself this class?')
      if (asignarse) {
        const { error: errAssign } = await supabase.from('instructor_classes')
          .insert({ class_id: data.id, instructor_id: user!.id })
        if (errAssign) alert('Error asignándote la clase: ' + errAssign.message)
        // refresca asignaciones propias
        setAssignedClassIds(prev => new Set(prev).add(data.id))
      }
    }
  }

  // Carga asignados actuales para una clase (pre-marcado en el modal)
  const loadAssignedFor = async (classId: number) => {
    const { data, error } = await supabase
      .from('instructor_classes')
      .select('instructor_id')
      .eq('class_id', classId)

    if (error) { console.error('loadAssignedFor:', error.message); setAssignedForClass(new Set()); return }

    const already = new Set((data || []).map(r => r.instructor_id as string))
    setAssignedForClass(already)

    // Preselección:
    if (isInstructor) {
      // Instructor solo puede marcarse a sí mismo: si ya estaba, lo dejamos marcado; si no, vacío.
      setSelectedInstructors(already.has(user!.id) ? new Set([user!.id]) : new Set())
    } else {
      // Admin/Super Admin: preselecciona todos los ya asignados
      setSelectedInstructors(new Set(already))
    }
  }

  // Abrir modal de asignación para la clase recién guardada
  const openAssignModal = async () => {
    if (!savedClass) return
    await loadAssignedFor(savedClass.id)
    setOpenAssign(true)
  }

  // Abrir modal de asignación desde una fila específica
  const openAssignFor = async (cls: Class) => {
    setSavedClass(cls)
    await loadAssignedFor(cls.id)
    setOpenAssign(true)
  }
  // Abrir modal de UNASSIGN: carga SOLO instructores ya asociados y los preselecciona
const openUnassignFor = async (cls: Class) => {
  setSavedClass(cls)
  const { data, error } = await supabase
    .from('instructor_classes')
    .select('instructor:users(*)')
    .eq('class_id', cls.id)
  if (error) { alert('Error cargando instructores: ' + error.message); return }

  const list = ((data as any) || []).map((r: any) => r.instructor)
  setInstructorsForUnassign(list)
  setSelectedInstructors(new Set(list.map((u: User) => u.id))) // pre-marcados
  setOpenUnassign(true)
}

// Guardar UNASSIGN: desmarca => elimina asociación + borra props/imagenes/notas
const unassignInstructors = async () => {
  if (!savedClass) return
  const ok = await confirm(
    'Unassigning instructors will also delete props, images, and notes linked to this class for them.Continue?'
  )
  if (!ok) return

  const keep = new Set(selectedInstructors)
  const toRemove = instructorsForUnassign.filter(i => !keep.has(i.id))

  for (const instr of toRemove) {
    // 1) eliminar asociación
    const { error: e1 } = await supabase
      .from('instructor_classes')
      .delete()
      .eq('class_id', savedClass.id)
      .eq('instructor_id', instr.id)
    if (e1) { alert('Error unsuscribing: ' + e1.message); return }

    // 2) borrar dependencias (props, imágenes, notas) de esta combinación
    await supabase.from('class_props').delete().eq('class_id', savedClass.id).eq('instructor_id', instr.id)
    await supabase.from('class_images').delete().eq('class_id', savedClass.id).eq('instructor_id', instr.id)
    await supabase.from('class_notes').delete().eq('class_id', savedClass.id).eq('instructor_id', instr.id)
  }

  setOpenUnassign(false)
  alert('Desasignación completada.')
}


  const toggleInstructor = (id: string) => {
    // Si es Instructor, solo puede togglearse a sí mismo
    if (isInstructor && id !== user!.id) return
    setSelectedInstructors(prev=>{
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

 const assignInstructors = async () => {
  if (!savedClass) return
  if (!(await confirm('¿Confirm assigning this class to the selected instructors?'))) return

  const payload = Array.from(selectedInstructors).map(instructor_id => ({
    instructor_id,
    class_id: savedClass.id,
  }))
  if (!payload.length) { alert('Select at least one instructor.'); return }

  const { error } = await supabase
    .from('instructor_classes')
    .upsert(payload, { onConflict: ['instructor_id', 'class_id'] }) // ✅ evita duplicados

  if (error) { alert('Error asociating: ' + error.message); return }

  await loadAssignedFor(savedClass.id) // refresca pre-marcados
  setOpenAssign(false)
  alert('Assignments saved successfully.')
}


  const deleteClass = async (c: Class) => {
    if (!(await confirm('Deleting the class will also delete props, images, and the associated note. Continue'))) return
    const { error } = await supabase.rpc('delete_class_cascade', { p_class_id: c.id })
    if (error) { alert('Error deleting: '+error.message); return }
    setClasses(prev=>prev.filter(x=>x.id!==c.id))
  }

  // Modal "Asignado a:" (solo lectura)
  const [showAssigned, setShowAssigned] = useState<Class|null>(null)
  const [assigned, setAssigned] = useState<User[]>([])
  useEffect(()=>{
    (async ()=>{
      if (!showAssigned) return
      const { data } = await supabase.from('instructor_classes')
        .select('instructor:users(*)')
        .eq('class_id', showAssigned.id)
      setAssigned(((data as any)||[]).map((r:any)=>r.instructor))
    })()
  }, [showAssigned])

  return (
    <div>
      {/* Panel superior: crear clase + asignar la recién creada */}
      <div className="panel" style={{display:'grid', gridTemplateColumns:'2fr auto', gap:12}}>
        <div>
          <label>Name of the class</label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Wall Yoga" />
        </div>
        <div style={{display:'flex', alignItems:'end', gap:8}}>
          <button className="btn primary" onClick={saveClass}>Save</button>
          {savedClass && <button className="btn accent" onClick={openAssignModal}>Assign instructor</button>}
        </div>
      </div>

      {/* Tabla de clases */}
      <div className="panel">
        <h3 style={{marginTop:0}}>Classes</h3>
        <table className="table">
          <thead>
            <tr><th>Class name</th><th style={{width:420}}>Actions</th></tr>
          </thead>
          <tbody>
            {classes.map(c=>{
              const canDelete = !!isAdminish
              const showEdit = isInstructor && assignedClassIds.has(c.id) // <- solo si está asignada

              return (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>
                    <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                      <button className="btn" onClick={()=>setShowAssigned(c)}>Assigned to:</button>
                      <button className="btn accent" onClick={()=>openAssignFor(c)}>Assign instructor</button>
                      {canDelete && <button className="btn danger" onClick={()=>deleteClass(c)}>Delete</button>}
                      {showEdit && <EditInstructorClass classId={c.id} user={user!} />}
                      {isAdminish && <button className="btn" onClick={() => openUnassignFor(c)}>Unassign</button>}

                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de ASIGNACIÓN: muestra TODOS; ya asignados aparecen marcados.
          En instructor, los otros están deshabilitados. */}
      <Modal
        open={openAssign}
        onClose={()=>setOpenAssign(false)}
        title={`Assign instructors - ${savedClass?.name ?? ''}`}
        footer={
          <>
            <button className="btn" onClick={()=>setOpenAssign(false)}>Cancel</button>
            <button className="btn primary" onClick={assignInstructors}>Save</button>
          </>
        }
      >
        <div className="grid grid-2">
          {allInstructors.map(i=>(
            <label key={i.id} style={{display:'flex', gap:8, alignItems:'center', opacity: (isInstructor && i.id!==user?.id) ? 0.6 : 1}}>
              <input
                type="checkbox"
                // visual: marcamos los que YA están asignados o los que el usuario marcó ahora
                checked={assignedForClass.has(i.id) || selectedInstructors.has(i.id)}
                onChange={()=>toggleInstructor(i.id)}
                disabled={isInstructor && i.id!==user?.id}
              />
              {i.display_name}
            </label>
          ))}
          {!allInstructors.length && <div className="small">No instructors created yet.</div>}
        </div>
      </Modal>

      {/* Modal "Asignado a:" (solo lectura) */}
      <Modal open={!!showAssigned} onClose={()=>setShowAssigned(null)} title={`Assigned to - ${showAssigned?.name}`}>
        {assigned.length ? <ul>{assigned.map(a=><li key={a.id}>{a.display_name}</li>)}</ul>
        : <div className="small">This class has not been assigned yet.</div>}
      </Modal>
<Modal
  open={openUnassign}
  onClose={() => setOpenUnassign(false)}
  title={`Unassign instructors - ${savedClass?.name ?? ''}`}
  footer={
    <>
      <button className="btn" onClick={() => setOpenUnassign(false)}>Cancel</button>
      <button className="btn danger" onClick={unassignInstructors}>Unassign</button>
    </>
  }
>
  <div className="grid grid-2">
    {instructorsForUnassign.map(i => (
      <label key={i.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={selectedInstructors.has(i.id)}
          onChange={() => {
            setSelectedInstructors(prev => {
              const n = new Set(prev)
              if (n.has(i.id)) n.delete(i.id); else n.add(i.id)
              return n
            })
          }}
        />
        {i.display_name}
      </label>
    ))}
    {!instructorsForUnassign.length && <div className="small">No assigned instructors yet.</div>}
  </div>
</Modal>

      
    </div>
  )
}

/* ==== Editor del Instructor (sin cambios respecto a tus últimos requisitos) ==== */
const EditInstructorClass: React.FC<{ classId: number, user: User }> = ({ classId, user }) => {
  const [open, setOpen] = useState(false)

  // Props (CRUD inmediato)
  const [allProps, setAllProps] = useState<PropItem[]>([])
  const [selectedPropId, setSelectedPropId] = useState<number|''>('')
  const [myProps, setMyProps] = useState<(ClassProp & {prop:PropItem})[]>([])

  // Imágenes (guardadas) + imágenes pendientes de subir
  const [images, setImages] = useState<ClassImage[]>([])
  const [pendingImages, setPendingImages] = useState<File[]>([])

  // Nota
  const [note, setNote] = useState('')

  useEffect(()=>{
    (async ()=>{
      const { data:props } = await supabase.from('props').select('*').order('name')
      setAllProps(props||[])
      const { data:cp } = await supabase.from('class_props').select('*, prop:props(*)')
        .eq('class_id', classId).eq('instructor_id', user.id)
      setMyProps((cp as any)||[])
      const { data:imgs } = await supabase.from('class_images').select('*')
        .eq('class_id', classId).eq('instructor_id', user.id)
      setImages(imgs||[])
      const { data:notes } = await supabase.from('class_notes').select('*')
        .eq('class_id', classId).eq('instructor_id', user.id).limit(1)
      setNote(notes && (notes[0]?.note || '') || '')
      setPendingImages([]) // limpiar cola al abrir
    })()
  }, [classId, user.id, open])

  // ---- Props (inmediato) ----
  const addProp = async () => {
    if (!selectedPropId) return
    const { data, error } = await supabase.from('class_props')
      .insert({ class_id: classId, instructor_id: user.id, prop_id: Number(selectedPropId) })
      .select('*, prop:props(*)').single()
    if (error) { alert(error.message); return }
    setMyProps(prev=>[...(prev as any), data as any])
    setSelectedPropId('')
  }
  const removeProp = async (id:number) => {
    const { error } = await supabase.from('class_props').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setMyProps(prev=>prev.filter(p=>p.id!==id))
  }

  // ---- Imágenes (pendientes + guardadas) ----
  const stageImage = (file: File) => {
    setPendingImages(prev=>[...prev, file])
  }
  const removePendingAt = (idx: number) => {
    setPendingImages(prev=>prev.filter((_,i)=>i!==idx))
  }
  const deleteImage = async (id:number) => {
    const { error } = await supabase.from('class_images').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setImages(prev=>prev.filter(p=>p.id!==id))
  }

  // ---- Guardar TODO (imagenes pendientes + nota) ----
  const saveAll = async () => {
    try {
      // 1) Subir todas las pendientes
      for (const file of pendingImages) {
        const ext = file.name.split('.').pop()
        const path = `class_${classId}/instr_${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('class-images').upload(path, file, { upsert: true })
        if (upErr) throw new Error('Storage error: '+upErr.message)
        const { data:pub } = await supabase.storage.from('class-images').getPublicUrl(path)
        const { data, error:insErr } = await supabase.from('class_images')
          .insert({ class_id: classId, instructor_id: user.id, url: pub.publicUrl })
          .select().single()
        if (insErr) throw new Error(insErr.message)
        setImages(prev=>[...prev, data!])
      }
      setPendingImages([])

      // 2) Guardar / actualizar nota
      const { data:existing } = await supabase.from('class_notes').select('*')
        .eq('class_id', classId).eq('instructor_id', user.id).limit(1)

      if (existing && existing.length) {
        const { error } = await supabase.from('class_notes').update({ note }).eq('id', existing[0].id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('class_notes').insert({ class_id: classId, instructor_id: user.id, note })
        if (error) throw new Error(error.message)
      }

      alert('Todo guardado correctamente.')
    } catch (e:any) {
      alert('Error guardando: ' + (e?.message || e))
    }
  }

  return (
    <>
      <button className="btn" onClick={()=>setOpen(true)}>Edit</button>
      <Modal open={open} onClose={()=>setOpen(false)} title="Edit class (you)">
        <div className="grid grid-2">
          <div>
            <h4>Props</h4>
            <div style={{display:'flex', gap:8}}>
              <select value={selectedPropId} onChange={e=>setSelectedPropId(e.target.value?Number(e.target.value):'')}>
                <option value="">- Prop -</option>
                {allProps.map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
              <button className="btn" onClick={addProp}>Add</button>
            </div>
            <ul style={{marginTop:12}}>
              {myProps.map(p=>(
                <li key={p.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
                  <span>{p.prop.name}</span>
                  <button className="btn danger" onClick={()=>removeProp(p.id)}>Remove</button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Images</h4>
            <input type="file" accept="image/*" onChange={e=>e.target.files && setPendingImages(prev=>[...prev, e.target.files![0]])} />
            {pendingImages.length > 0 && (
              <div style={{marginTop:8}}>
                <div className="small">Pending to upload:</div>
                <ul>
                  {pendingImages.map((f,idx)=>(
                    <li key={idx} style={{display:'flex', gap:8, alignItems:'center', justifyContent:'space-between'}}>
                      <span style={{overflow:'hidden', textOverflow:'ellipsis'}}>{f.name}</span>
                      <button className="btn" onClick={()=>removePendingAt(idx)}>Remove</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div style={{marginTop:12}}>
              <div className="small">Saved:</div>
              <ul>
                {images.map(img=>(
                  <li key={img.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
                    <a className="nav-link" href={img.url} target="_blank">Open</a>
                    <button className="btn danger" onClick={()=>deleteImage(img.id)}>Delete</button>
                  </li>
                ))}
                {images.length===0 && <li className="small">No images yet.</li>}
              </ul>
            </div>
          </div>
        </div>
        <div className="panel" style={{marginTop:12}}>
          <h4>Note (single)</h4>
          <textarea className="input" rows={4} value={note} onChange={e=>setNote(e.target.value)} />
          <div style={{marginTop:8, display:'flex', justifyContent:'flex-end', gap:8}}>
            <button className="btn primary" onClick={saveAll}>Save all</button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default ManageClass
