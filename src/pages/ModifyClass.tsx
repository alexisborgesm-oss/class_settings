
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { Class, User } from '@/types'

const ModifyClass: React.FC<{ user: User|null }> = ({ user }) => {
  const canSee = user && (user.role === 'super_admin' || user.role === 'admin')
  const [instructors, setInstructors] = useState<User[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [filterInstructor, setFilterInstructor] = useState<string>('')
  const [filterClass, setFilterClass] = useState<number|''>('')
  const [rows, setRows] = useState<{class_name:string,instructor_name:string}[]>([])

  useEffect(()=>{
    (async ()=>{
      const { data:users } = await supabase.from('users').select('*').eq('role','Instructor')
      setInstructors(users||[])
      const { data:classes } = await supabase.from('classes').select('*').order('name')
      setClasses(classes||[])
    })()
  }, [])

  const [icForInstr, setIcForInstr] = useState<Set<number>>(new Set())
  const [icForClass, setIcForClass] = useState<Set<string>>(new Set())
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
        .select('class:classes(name), instructor:users(display_name)')
        .match(params)
      setRows(((data as any)||[]).map((r:any)=>({ class_name: r.class.name, instructor_name: r.instructor.display_name })))
    })()
  }, [filterClass, filterInstructor])

  if (!canSee) return <div className="panel">No autorizado.</div>

  return (
    <div>
      <div className="panel grid grid-2">
        <div>
          <label>Clase</label>
          <select value={filterClass} onChange={e=>setFilterClass(e.target.value?Number(e.target.value):'')}>
            <option value="">- Todas -</option>
            {filteredClasses.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <label>Instructor</label>
          <select value={filterInstructor} onChange={e=>setFilterInstructor(e.target.value)}>
            <option value="">- Todos -</option>
            {filteredInstructors.map(i=>(<option key={i.id} value={i.id}>{i.display_name}</option>))}
          </select>
        </div>
      </div>

      <div className="panel">
        <table className="table">
          <thead><tr><th>Clase</th><th>Instructor</th></tr></thead>
          <tbody>
            {rows.map((r,idx)=>(<tr key={idx}><td>{r.class_name}</td><td>{r.instructor_name}</td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ModifyClass
