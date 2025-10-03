// src/pages/ManageClass.tsx
import React, { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { Class, ClassImage, ClassProp, PropItem, User } from '@/types'
import Modal from '@/components/Modal'
import { confirm } from '@/components/Confirm'

type Props = { user: User|null }

const ManageClass: React.FC<Props> = ({ user }) => {
  const [name, setName] = useState('')
  const [savedClass, setSavedClass] = useState<Class|null>(null)

  const [allInstructors, setAllInstructors] = useState<User[]>([])
  const [selectedInstructors, setSelectedInstructors] = useState<Set<string>>(new Set())
  const [openAssign, setOpenAssign] = useState(false)

  const [classes, setClasses] = useState<Class[]>([])

  const isInstructor = user?.role === 'Instructor'
  const isAdminish = user && (user.role === 'super_admin' || user.role === 'admin')

  // Cargar instructores y clases
  useEffect(()=>{
    (async ()=>{
      const { data:users } = await supabase.from('users').select('*').eq('role','Instructor')
      setAllInstructors(users||[])
      const { data:cls } = await supabase.from('classes').select('*').order('created_at', {ascending:false})
      setClasses(cls||[])
    })()
  }, [])

  // Guardar clase y (si es Instructor) ofrecer auto-asignarse
  const saveClass = async () => {
    if (!name.trim()) { alert('Escribe un nombre'); return }
    if (!(await confirm('¿Seguro que deseas guardar esta clase?'))) return

    const { data, error } = await supabase.from('classes').insert({ name }).select().single()
    if (error) { alert('Error guardando clase: '+error.message); return }

    setSavedClass(data)
    setClasses(prev=>[data, ...prev])

    if (isInstructor) {
      const asignarse = await confirm('¿Quieres asignarte esta clase?')
      if (asignarse) {
        const { error: errAssign } = await supabase.from('instructor_classes')
          .insert({ class_id: data.id, instructor_id: user!.id })
        if (errAssign) alert('Error asignándote la clase: ' + errAssign.message)
      }
    }
  }

  // Abrir modal de asignación para la clase actualmente en savedClass
  const openAssignModal = () => {
    if (!savedClass) return
    if (isInstructor) setSelectedInstructors(new Set([user!.id]))
    else setSelectedInstructors(new Set())
    setOpenAssign(true)
  }

  // Abrir modal de asignación desde una fila específica
  const openAssignFor = (cls: Class) => {
    setSavedClass(cls)
    if (isInstructor) setSelectedInstructors(new Set([user!.id]))
    else setSelectedInstructors(new Set())
    setOpenAssign(true)
  }

  const toggleInstructor = (id: string) => {
    if (isInstructor && id !== user!.id) return // bloquea seleccionar a otros
    setSelectedInstructors(prev=>{
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const assignInstructors = async () => {
    if (!savedClass) return
    if (!(await confirm('¿Confirmas asignar la clase a los instructores seleccionados?'))) return
    const payload = Array.from(selectedInstructors).map(instructor_id=>({
      instructor_id, class_id: savedClass.id
    }))
    if (!payload.length) { alert('Selecciona al menos un instructor.'); return }
    const { error } = await supabase.from('instructor_classes').insert(payload)
    if (error) { alert('Error asignando: '+error.message); return }
    setOpenAssign(false)
    alert('Asignaciones guardadas.')
  }

  const deleteClass = async (c: Class) => {
    if (!(await confirm('Eliminar la clase también borrará props, imágenes y nota asociadas. ¿Seguro?'))) return
    const { error } = await supabase.rpc('delete_class_cascade', { p_class_id: c.id })
    if (error) { alert('Error eliminando: '+error.message); return }
    setClasses(prev=>prev.filter(x=>x.id!==c.id))
  }

  // Modal "Asignado a:" (solo lectura)
  const [showAssigned, setShowAssigned] = useState<Class|null>(null)
  const [assigned, setAssigned] = useState<User[]>([])
  React.useEffect(()=>{
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
          <label>Nombre de la clase</label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Wall Yoga" />
        </div>
        <div style={{display:'flex', alignItems:'end', gap:8}}>
          <button className="btn primary" onClick={saveClass}>Save</button>
          {savedClass && <button className="btn accent" onClick={openAssignModal}>Asign instructor</button>}
        </div>
      </div>

      {/* Tabla de clases */}
      <div className="panel">
        <h3 style={{marginTop:0}}>Clases</h3>
        <table className="table">
          <thead>
            <tr><th>Nombre</th><th style={{width:420}}>Acciones</th></tr>
          </thead>
          <tbody>
            {classes.map(c=>{
              const canDelete = !!isAdminish
              const showEdit = isInstructor
              return (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>
                    <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                      <button className="btn" onClick={()=>setShowAssigned(c)}>Asignado a:</button>
                      <button className="btn accent" onClick={()=>openAssignFor(c)}>Asign instructor</button>
                      {canDelete && <button className="btn danger" onClick={()=>deleteClass(c)}>Eliminar</button>}
                      {showEdit && <EditInstructorClass classId={c.id} user={user!} />}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de ASIGNACIÓN (con checkboxes SIEMPRE mostrando TODOS los instructores) */}
      <Modal
        open={openAssign}
        onClose={()=>setOpenAssign(false)}
        title={`Asignar instructores - ${savedClass?.name ?? ''}`}
        footer={
          <>
            <button className="btn" onClick={()=>setOpenAssign(false)}>Cancelar</button>
            <button className="btn primary" onClick={assignInstructors}>Save</button>
          </>
        }
      >
        <div className="grid grid-2">
          {allInstructors.map(i=>(
            <label key={i.id} style={{display:'flex', gap:8, alignItems:'center', opacity: (isInstructor && i.id!==user?.id) ? 0.6 : 1}}>
              <input
                type="checkbox"
                checked={selectedInstructors.has(i.id)}
                onChange={()=>toggleInstructor(i.id)}
                disabled={isInstructor && i.id!==user?.id}
              />
              {i.display_name}
            </label>
          ))}
          {!allInstructors.length && <div className="small">No hay instructores creados.</div>}
        </div>
      </Modal>

      {/* Modal "Asignado a:" (solo lectura) */}
      <Modal open={!!showAssigned} onClose={()=>setShowAssigned(null)} title={`Asignado a - ${showAssigned?.name}`}>
        {assigned.length ? <ul>{assigned.map(a=><li key={a.id}>{a.display_name}</li>)}</ul>
        : <div className="small">La clase no ha sido asignada aún.</div>}
      </Modal>
    </div>
  )
}

/* ==== Editor del Instructor (actualizado con "Guardar todo") ==== */
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

  React.useEffect(()=>{
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
      <button className="btn" onClick={()=>setOpen(true)}>Editar</button>
      <Modal open={open} onClose={()=>setOpen(false)} title="Editar clase (tú)">
        <div className="grid grid-2">
          {/* ---- PROPS ---- */}
          <div>
            <h4>Props</h4>
            <div style={{display:'flex', gap:8}}>
              <select value={selectedPropId} onChange={e=>setSelectedPropId(e.target.value?Number(e.target.value):'')}>
                <option value="">- Prop -</option>
                {allProps.map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
              <button className="btn" onClick={addProp}>Añadir</button>
            </div>
            <ul style={{marginTop:12}}>
              {myProps.map(p=>(
                <li key={p.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
                  <span>{p.prop.name}</span>
                  <button className="btn danger" onClick={()=>removeProp(p.id)}>Quitar</button>
                </li>
              ))}
            </ul>
          </div>

          {/* ---- IMÁGENES ---- */}
          <div>
            <h4>Imágenes</h4>
            <input
              type="file"
              accept="image/*"
              onChange={e=>e.target.files && stageImage(e.target.files[0])}
            />
            {/* Pendientes de subir */}
            {pendingImages.length > 0 && (
              <div style={{marginTop:8}}>
                <div className="small">Pendientes de subir:</div>
                <ul>
                  {pendingImages.map((f,idx)=>(
                    <li key={idx} style={{display:'flex', gap:8, alignItems:'center', justifyContent:'space-between'}}>
                      <span style={{overflow:'hidden', textOverflow:'ellipsis'}}>{f.name}</span>
                      <button className="btn" onClick={()=>removePendingAt(idx)}>Quitar</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Ya guardadas */}
            <div style={{marginTop:12}}>
              <div className="small">Guardadas:</div>
              <ul>
                {images.map(img=>(
                  <li key={img.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
                    <a className="nav-link" href={img.url} target="_blank">Ver</a>
                    <button className="btn danger" onClick={()=>deleteImage(img.id)}>Eliminar</button>
                  </li>
                ))}
                {images.length===0 && <li className="small">No hay imágenes guardadas.</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* ---- NOTA + GUARDAR TODO ---- */}
        <div className="panel" style={{marginTop:12}}>
          <h4>Nota (una sola)</h4>
          <textarea className="input" rows={4} value={note} onChange={e=>setNote(e.target.value)} />
          <div style={{marginTop:8, display:'flex', justifyContent:'flex-end', gap:8}}>
            <button className="btn primary" onClick={saveAll}>Guardar todo</button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default ManageClass
