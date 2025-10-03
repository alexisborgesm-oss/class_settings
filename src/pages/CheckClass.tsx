
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { Class, ClassImage, ClassProp, PropItem, User } from '@/types'
import ImageCarousel from '@/components/ImageCarousel'

const CheckClass: React.FC<{ user: User|null }> = () => {
  const [instructors, setInstructors] = useState<User[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [filterInstructor, setFilterInstructor] = useState<string>('')
  const [filterClass, setFilterClass] = useState<number|''>('')
  const [props_, setProps] = useState<(ClassProp & {prop:PropItem})[]>([])
  const [images, setImages] = useState<ClassImage[]>([])

  useEffect(()=>{
    (async ()=>{
      const { data:users } = await supabase.from('users').select('*').eq('role','Instructor')
      setInstructors(users||[])
      const { data:classes } = await supabase.from('classes').select('*').order('name', {ascending:true})
      setClasses(classes||[])
    })()
  }, [])

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

  useEffect(()=>{
    (async ()=>{
      if (!filterClass || !filterInstructor) { setProps([]); setImages([]); return }
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
    })()
  }, [filterClass, filterInstructor])

  return (
    <div>
      <div className="panel grid grid-2">
        <div>
          <label>Instructor</label>
          <select value={filterInstructor} onChange={e=>setFilterInstructor(e.target.value)}>
            <option value="">- Selecciona -</option>
            {instructors.map(i=>(<option key={i.id} value={i.id}>{i.display_name}</option>))}
          </select>
        </div>
        <div>
          <label>Clase</label>
          <select value={filterClass} onChange={e=>setFilterClass(e.target.value?Number(e.target.value):'')}>
            <option value="">- Selecciona -</option>
            {filteredClasses.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
      </div>

      <div className="panel">
        <h3 style={{marginTop:0}}>Props necesarios</h3>
        {props_.length ? (
          <ul>
            {props_.map(p=>(<li key={p.id}>{p.prop.name}</li>))}
          </ul>
        ) : (<div className="small">Selecciona instructor y clase para ver props.</div>)}
      </div>

      <div className="panel">
        <h3 style={{marginTop:0}}>Imagenes de referencia</h3>
        <ImageCarousel urls={images.map(i=>i.url)} />
      </div>
    </div>
  )
}

export default CheckClass
