// src/pages/CheckClass.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { Class, ClassImage, ClassProp, ClassNote, PropItem, User } from '@/types'
import ImageCarousel from '@/components/ImageCarousel'

const CheckClass: React.FC<{ user: User|null }> = () => {
  const [instructors, setInstructors] = useState<User[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [filterInstructor, setFilterInstructor] = useState<string>('')
  const [filterClass, setFilterClass] = useState<number|''>('')

  const [props_, setProps] = useState<(ClassProp & {prop:PropItem})[]>([])
  const [images, setImages] = useState<ClassImage[]>([])
  const [note, setNote] = useState<string>('')

  // cargar instructores y clases
  useEffect(()=>{
    (async ()=>{
      const { data:users } = await supabase.from('users').select('*').eq('role','Instructor')
      setInstructors(users||[])
      const { data:cls } = await supabase.from('classes').select('*').order('name', {ascending:true})
      setClasses(cls||[])
    })()
  }, [])

  // cuando se elige instructor, limitar clases
  const [selectedInstructorClassIds, setSelectedInstructorClassIds] = useState<Set<number>>(new Set())
  useEffect(()=>{
    (async ()=>{
      if (!filterInstructor) { setSelectedInstructorClassIds(new Set()); return }
      const { data } = await supabase.from('instructor_classes').select('*').eq('instructor_id', filterInstructor)
      setSelectedInstructorClassIds(new Set((data||[]).map(r=>r.class_id)))
    })()
  }, [filterInstructor])

  const filteredClasses = useMemo(()=>{
    if (!filterInstructor) return classes
    return classes.filter(c=>selectedInstructorClassIds.has(c.id))
  }, [classes, filterInstructor, selectedInstructorClassIds])

  // cuando se elige clase, limitar instructores
  const [instructorHasClass, setInstructorHasClass] = useState<Set<string>>(new Set())
  useEffect(()=>{
    (async ()=>{
      if (!filterClass) { setInstructorHasClass(new Set()); return }
      const { data } = await supabase.from('instructor_classes').select('*').eq('class_id', filterClass)
      setInstructorHasClass(new Set((data||[]).map(r=>r.instructor_id)))
    })()
  }, [filterClass])

  const filteredInstructors = useMemo(()=>{
    if (!filterClass) return instructors
    return instructors.filter(i=>instructorHasClass.has(i.id))
  }, [instructors, filterClass, instructorHasClass])

  // cargar props, imágenes y nota cuando hay ambos filtros
  useEffect(()=>{
    (async ()=>{
      if (!filterClass || !filterInstructor) {
        setProps([]); setImages([]); setNote(''); 
        return
      }

      const { data:cp } = await supabase
        .from('class_props')
        .select('*, prop:props(*)')
        .eq('class_id', filterClass)
        .eq('instructor_id', filterInstructor)
      setProps((cp as any)||[])

      const { data:imgs } = await supabase.from('class_images')
        .select('*')
        .eq('class_id', filterClass)
        .eq('instructor_id', filterInstructor)
      setImages(imgs||[])

      const { data:notes } = await supabase.from('class_notes')
        .select('*')
        .eq('class_id', filterClass)
        .eq('instructor_id', filterInstructor)
        .limit(1)
      const n = (notes as ClassNote[]|null)?.[0]?.note || ''
      setNote(n)
    })()
  }, [filterClass, filterInstructor])

  return (
    <div>
      <div className="panel grid grid-2">
        <div>
          <label>Instructor</label>
          <select value={filterInstructor} onChange={e=>setFilterInstructor(e.target.value)}>
            <option value="">- Select -</option>
            {filteredInstructors.map(i=>(
              <option key={i.id} value={i.id}>{i.display_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Class</label>
          <select value={filterClass} onChange={e=>setFilterClass(e.target.value?Number(e.target.value):'')}>
            <option value="">- Select -</option>
            {filteredClasses.map(c=>(
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Props y Nota lado a lado */}
      <div className="panel">
        <h3 style={{marginTop:0}}>Details</h3>
        {filterInstructor && filterClass ? (
          <div className="grid grid-2">
            <div>
              <h4 style={{marginTop:0}}>Props needed</h4>
              {props_.length ? (
                <ul>
                  {props_.map(p=>(<li key={p.id}>{p.prop.name}</li>))}
                </ul>
              ) : (
                <div className="small">No registered props for this combination.</div>
              )}
            </div>
            <div>
              <h4 style={{marginTop:0}}>Notes</h4>
              {note ? (
                <div className="panel" style={{padding:'12px', whiteSpace:'pre-wrap'}}>{note}</div>
              ) : (
                <div className="small">No notes for this combination.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="small">Select instructor and class to see Props and Note.</div>
        )}
      </div>

      <div className="panel">
        <h3 style={{marginTop:0}}>Reference Images</h3>
        <ImageCarousel urls={images.map(i=>i.url)} />
      </div>
    </div>
  )
}

export default CheckClass
