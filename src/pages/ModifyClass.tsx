// src/pages/ModifyClass.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { Class, ClassImage, ClassProp, PropItem, User } from '@/types'
import Modal from '@/components/Modal'

type Row = { class_id: number; class_name: string; instructor_id: string; instructor_name: string }

const ModifyClass: React.FC<{ user: User|null }> = ({ user }) => {
  const canSee = user && (user.role === 'super_admin' || user.role === 'admin')
  const [instructors, setInstructors] = useState<User[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [filterInstructor, setFilterInstructor] = useState<string>('')
  const [filterClass, setFilterClass] = useState<number|''>('')

  const [rows, setRows] = useState<Row[]>([])

  // para filtros cruzados
  const [icForInstr, setIcForInstr] = useState<Set<number>>(new Set())
  const [icForClass, setIcForClass] = useState<Set<string>>(new Set())

  // editor modal
  const [editTarget, setEditTarget] = useState<{ class_id:number; class_name:string; instructor_id:string; instructor_name:string }|null>(null)

  useEffect(()=>{
    (async ()=>{
      const { data:users } = await supabase.from('users').select('*').eq('role','Instructor')
      setInstructors(users||[])
      const { data:classes } = await supabase.from('classes').select('*').order('name')
      setClasses(classes||[])
    })()
  }, [])

  useEffect(()=>{
    (async ()=>{
      if (filterInstructor) {
        const { data } = await supabase.from('instructor_classes').select('*').eq('instructor_id', filterInstructor)
        setIcForInstr(new Set((data||[]).map(r=>r.class_id)))
      } else setIcForInstr(new Set())
      if (filterClass) {
        const { data } = await supabase.from('instructor_classes').select('*').eq('class_id', filterClass)
        setIcForClass(new Set((data||[]).map(r=>r.instructor_id)))
      } else setIcForClass(new Set())
    })()
  }, [filterInstructor, filterClass])

  const filteredClasses = useMemo(()=>{
    if (!filterInstructor) return classes
    return classes.filter(c=>icForInstr.has(c.id))
  }, [classes, filterInstructor, icForInstr])

  const filteredInstructors = useMemo(()=>{
    if (!filterClass) return instructors
    return instructors.filter(i=>icForClass.has(i.id))
  }, [instructors, filterClass, icForClass])

  useEffect(()=>{
    (async ()=>{
      if (!filterClass && !filterInstructor) { setRows([]); return }
      const params:any = {}
      if (filterClass) params.class_id = filterClass
      if (filterInstructor) params.instructor_id = filterInstructor
      const { data } = await supabase.from('instructor_classes')
        .select('class:classes(id,name), instructor:users(id,display_name)')
        .match(params)
      const mapped: Row[] = ((data as any)||[]).map((r:any)=>({
        class_id: r.class.id,
        class_name: r.class.name,
        instructor_id: r.instructor.id,
        instructor_name: r.instructor.display_name
      }))
      setRows(mapped)
    })()
  }, [filterClass, filterInstructor])

  if (!canSee) return <div className="panel">Not authorized.</div>

  return (
    <div>
      <div className="panel grid grid-2">
        <div>
          <label>Class</label>
          <select value={filterClass} onChange={e=>setFilterClass(e.target.value?Number(e.target.value):'')}>
            <option value="">— All —</option>
            {filteredClasses.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <label>Instructor</label>
          <select value={filterInstructor} onChange={e=>setFilterInstructor(e.target.value)}>
            <option value="">— All —</option>
            {filteredInstructors.map(i=>(<option key={i.id} value={i.id}>{i.display_name}</option>))}
          </select>
        </div>
      </div>

      <div className="panel">
        <table className="table">
          <thead><tr><th>Clase</th><th>Instructor</th><th style={{width:140}}></th></tr></thead>
          <tbody>
            {rows.map((r,idx)=>(
              <tr key={idx}>
                <td>{r.class_name}</td>
                <td>{r.instructor_name}</td>
                <td>
                  <button
                    className="btn"
                    onClick={()=>setEditTarget({
                      class_id: r.class_id,
                      class_name: r.class_name,
                      instructor_id: r.instructor_id,
                      instructor_name: r.instructor_name
                    })}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={3} className="small">Select a class or instructor to view results.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminEditModal
        open={!!editTarget}
        onClose={()=>setEditTarget(null)}
        classId={editTarget?.class_id || 0}
        className={editTarget?.class_name || ''}
        instructorId={editTarget?.instructor_id || ''}
        instructorName={editTarget?.instructor_name || ''}
      />
    </div>
  )
}

/* ===== Modal para editar (como admin/super_admin) el contenido de una Clase+Instructor ===== */
const AdminEditModal: React.FC<{
  open: boolean
  onClose: () => void
  classId: number
  className: string
  instructorId: string
  instructorName: string
}> = ({ open, onClose, classId, className, instructorId, instructorName }) => {
  const [allProps, setAllProps] = useState<PropItem[]>([])
  const [selectedPropId, setSelectedPropId] = useState<number|''>('')
  const [rowsProps, setRowsProps] = useState<(ClassProp & {prop:PropItem})[]>([])
  const [images, setImages] = useState<ClassImage[]>([])
  const [pendingImages, setPendingImages] = useState<File[]>([])
  const [note, setNote] = useState('')

  // Cargar datos al abrir
  useEffect(()=>{
    if (!open) return
    (async ()=>{
      const { data:p } = await supabase.from('props').select('*').order('name')
      setAllProps(p||[])
      const { data:cp } = await supabase.from('class_props').select('*, prop:props(*)')
        .eq('class_id', classId).eq('instructor_id', instructorId)
      setRowsProps((cp as any)||[])
      const { data:img } = await supabase.from('class_images').select('*')
        .eq('class_id', classId).eq('instructor_id', instructorId)
      setImages(img||[])
      const { data:n } = await supabase.from('class_notes').select('*')
        .eq('class_id', classId).eq('instructor_id', instructorId).limit(1)
      setNote(n && (n[0]?.note || '') || '')
      setPendingImages([])
    })()
  }, [open, classId, instructorId])

  // Props (inmediato)
  const addProp = async () => {
    if (!selectedPropId) return
    const { data, error } = await supabase.from('class_props')
      .insert({ class_id: classId, instructor_id: instructorId, prop_id: Number(selectedPropId) })
      .select('*, prop:props(*)').single()
    if (error) { alert(error.message); return }
    setRowsProps(prev=>[...(prev as any), data as any])
    setSelectedPropId('')
  }
  const removeProp = async (id:number) => {
    const { error } = await supabase.from('class_props').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setRowsProps(prev=>prev.filter(p=>p.id!==id))
  }

  // Imágenes
  const stageImage = (file: File) => setPendingImages(prev=>[...prev, file])
  const removePendingAt = (idx:number) => setPendingImages(prev=>prev.filter((_,i)=>i!==idx))
  const deleteImage = async (id:number) => {
    const { error } = await supabase.from('class_images').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setImages(prev=>prev.filter(p=>p.id!==id))
  }

  // Guardar TODO (pendientes + nota)
  const saveAll = async () => {
    try {
      // subir pendientes
      for (const file of pendingImages) {
        const ext = file.name.split('.').pop()
        const path = `class_${classId}/instr_${instructorId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('class-images').upload(path, file, { upsert: true })
        if (upErr) throw new Error('Storage error: ' + upErr.message)
        const { data:pub } = await supabase.storage.from('class-images').getPublicUrl(path)
        const { data, error:insErr } = await supabase.from('class_images')
          .insert({ class_id: classId, instructor_id: instructorId, url: pub.publicUrl })
          .select().single()
        if (insErr) throw new Error(insErr.message)
        setImages(prev=>[...prev, data!])
      }
      setPendingImages([])

      // guardar/actualizar nota
      const { data:existing } = await supabase.from('class_notes').select('*')
        .eq('class_id', classId).eq('instructor_id', instructorId).limit(1)
      if (existing && existing.length) {
        const { error } = await supabase.from('class_notes').update({ note }).eq('id', existing[0].id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('class_notes').insert({ class_id: classId, instructor_id: instructorId, note })
        if (error) throw new Error(error.message)
      }

      alert('Cambios guardados.')
    } catch (e:any) {
      alert('Error guardando: ' + (e?.message || e))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Editar · ${className} — ${instructorName}`}
      footer={
        <>
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn primary" onClick={saveAll}>Save all</button>
        </>
      }
    >
      <div className="grid grid-2">
        {/* PROPS */}
        <div>
          <h4>Props</h4>
          <div style={{display:'flex', gap:8}}>
            <select value={selectedPropId} onChange={e=>setSelectedPropId(e.target.value?Number(e.target.value):'')}>
              <option value="">— Prop —</option>
              {allProps.map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
            <button className="btn" onClick={addProp}>Add</button>
          </div>
          <ul style={{marginTop:12}}>
            {rowsProps.map(p=>(
              <li key={p.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
                <span>{p.prop.name}</span>
                <button className="btn danger" onClick={()=>removeProp(p.id)}>Remove</button>
              </li>
            ))}
            {!rowsProps.length && <li className="small">No props.</li>}
          </ul>
        </div>

        {/* IMÁGENES */}
        <div>
          <h4>Pictures</h4>
          <input type="file" accept="image/*" onChange={e=>e.target.files && stageImage(e.target.files[0])} />
          {pendingImages.length > 0 && (
            <div style={{marginTop:8}}>
              <div className="small">Pending upload:</div>
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
                  <a className="nav-link" href={img.url} target="_blank">Ver</a>
                  <button className="btn danger" onClick={()=>deleteImage(img.id)}>Delete</button>
                </li>
              ))}
              {images.length===0 && <li className="small">No saved pictures yet.</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* NOTA */}
      <div className="panel" style={{marginTop:12}}>
        <h4>Note (only one)</h4>
        <textarea className="input" rows={4} value={note} onChange={e=>setNote(e.target.value)} />
      </div>
    </Modal>
  )
}

export default ModifyClass
