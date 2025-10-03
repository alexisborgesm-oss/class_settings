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

  useEffect(()=>{
    (async ()=>{
      const { data } = await supabase.from('users').select('*').eq('role','Instructor')
      setAllInstructors(data||[])
      const { data:cls } = await supabase.from('classes').select('*').order('created_at', {ascending:false})
      setClasses(cls||[])
    })()
  }, [])

  const saveClass = async () => {
    if (!name.trim()) { alert('Escribe un nombre'); return }
    if (!(await confirm('¿Seguro que deseas guardar esta clase?'))) return

    // 1) Guardar clase
    const { data, error } = await supabase.from('classes').insert({ name }).select().single()
    if (error) { alert('Error guardando clase: '+error.message); return }

    setSavedClass(data)
    setClasses(prev=>[data, ...prev])

    // 2) Si es Instructor, preguntar si quiere asignarse la clase (solo si guardó OK)
    if (isInstructor) {
      const asignarse = await confirm('¿Quieres asignarte esta clase?')
      if (asignarse) {
        const { error: errAssign } = await supabase.from('instructor_classes')
          .insert({ class_id: data.id, instructor_id: user!.id })
        if (errAssign) { alert('Error asignándote la clase: ' + errAssign.message) }
      }
    }
  }

  const openAssignModal = () => {
    if (!savedClass) return
    // Siempre mostramos TODOS los instructores.
    // Si es Instructor, solo puede seleccionarse a sí mismo: lo preseleccionamos.
    if (isInstructor) {
      setSelectedInstructors(new Set([user!.id]))
    } else {
      setSelectedInstructors(new Set())
    }
    setOpenAssign(true)
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
    if (!(await confirm('¿Confirmas asignar la clase a los instructores seleccionados?'))) return
    const payload = Array.from(selectedInstructors).map(instructor_id=>({
      instructor_id, class_id: savedClass.id
    }))
    if (!payload.length) { alert('Selecciona al menos un instructor.'); return }
    const { error } = await supabase.from('instructor_classes').insert(payload, { upsert: true })
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
      <div className="panel" style={{display:'grid', gridTemplateColumns:'2fr auto', gap:12}}>
        <div>
          <label>Nombre de la clase</label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Wall Yoga" />
        </div>
        <div style={{display:'flex', alignItems:'end', gap:8}}>
          <button className="btn primary" onClick={saveClass}>Save</button>
          {/* Botón visible para todos, solo si hay clase guardada */}
          {savedClass && <button className="btn accent" onClick={openAssignModal}>Asign instructor</button>}
        </div>
      </div>

      <div className="panel">
        <h3 style={{marginTop:0}}>Clases</h3>
        <table className="table">
          <thead>
            <tr><th>Nombre</th><th style={{width:340}}>Acciones</th></tr>
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

      {/* Modal: siempre lista todos los instructores.
          Si el usuario es Instructor, los check ajenos salen deshabilitados */}
      <Modal
        open={openAssign}
        onClose={()=>setOpenAssign(false)}
        title={`Asignar instructores - ${savedClass?.name}`}
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
        </div>
      </Modal>

      <Modal open={!!showAssigned} onClose={()=>setShowAssigned(null)} title={`Asignado a - ${showAssigned?.name}`}>
        {assigned.length ? <ul>{assigned.map(a=><li key={a.id}>{a.display_name}</li>)}</ul>
        : <div className="small">La clase no ha sido asignada aún.</div>}
      </Modal>
    </div>
  )
}

/* ==== Editor del Instructor (sin cambios en la lógica solicitada) ==== */
const EditInstructorClass: React.FC<{ classId: number, user: User }> = ({ classId, user }) => {
  const [open, setOpen] = useState(false)
  const [allProps, setAllProps] = useState<PropItem[]>([])
  const [selectedPropId, setSelectedPropId] = useState<number|''>('')
  const [myProps, setMyProps] = useState<(Class
