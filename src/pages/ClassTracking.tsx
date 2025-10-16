import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase'
import Modal from '@/components/Modal'
import { User, Class } from '@/types'

type Props = { user: User | null }

/**
 * Vista: Class Tracking
 * Solo visible para super_admin y admin.
 *
 * Tabla:
 *  - Instructor
 *  - # de clases asociadas
 *  - # de clases con actividad (props OR imágenes OR nota)
 *  - Botón Details => modal con nombres de clases SIN actividad
 *
 * Incluye:
 *  - Filtro por instructor (texto)
 *  - Ordenamiento por encabezados
 */
const ClassTracking: React.FC<Props> = ({ user }) => {
  const role = (user?.role || '').toLowerCase()
  const canView = role === 'super_admin' || role === 'admin'

  // Estado de datos
  const [loading, setLoading] = useState(true)
  const [instructors, setInstructors] = useState<Array<{ id: string; display_name: string }>>([])
  const [classesByInstr, setClassesByInstr] = useState<
    Record<string, Array<{ class_id: number; class_name: string }>>
  >({})
  const [activityByPair, setActivityByPair] = useState<Record<string, boolean>>({}) // key `${instrId}::${classId}` -> true si hay props/imgs/notas

  // UI
  const [q, setQ] = useState('') // filtro por instructor
  type SortKey = 'name' | 'total' | 'updated'
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Modal Details
  const [detailFor, setDetailFor] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    if (!canView) return
    ;(async () => {
      setLoading(true)
      try {
        // 1) Instructores
        const { data: instr } = await supabase
          .from('users')
          .select('id, display_name')
          .eq('role', 'Instructor')
          .order('display_name', { ascending: true })

        const safeInstr = (instr || []).map((r) => ({ id: r.id as string, display_name: r.display_name as string }))
        setInstructors(safeInstr)

        // 2) Relación instructor_clases -> lista de clases por instructor (con nombre)
        //    Hacemos un join manual: primero todas las instructor_classes, luego las classes
        const { data: ic } = await supabase
          .from('instructor_classes')
          .select('instructor_id, class_id')

        const { data: cls } = await supabase.from('classes').select('id, name')
        const byIdClassName = new Map<number, string>((cls || []).map((c) => [c.id as number, c.name as string]))

        const grouped: Record<string, Array<{ class_id: number; class_name: string }>> = {}
        ;(ic || []).forEach((row) => {
          const iid = row.instructor_id as string
          const cid = row.class_id as number
          const cname = byIdClassName.get(cid) || '(sin nombre)'
          if (!grouped[iid]) grouped[iid] = []
          // evitar duplicados por si vinieran repetidos
          if (!grouped[iid].some((x) => x.class_id === cid)) grouped[iid].push({ class_id: cid, class_name: cname })
        })
        setClassesByInstr(grouped)

        // 3) Actividad por (instructor, clase): existe al menos 1 prop/img/nota
        //    Consultas agregadas y luego combinamos resultados.
        const key = (iid: string, cid: number) => `${iid}::${cid}`
        const activity: Record<string, boolean> = {}

        // Props
        const { data: cp } = await supabase
          .from('class_props')
          .select('instructor_id, class_id')
        ;(cp || []).forEach((r) => (activity[key(r.instructor_id as string, r.class_id as number)] = true))

        // Imágenes
        const { data: ci } = await supabase
          .from('class_images')
          .select('instructor_id, class_id')
        ;(ci || []).forEach((r) => (activity[key(r.instructor_id as string, r.class_id as number)] = true))

        // Notas
        const { data: cn } = await supabase
          .from('class_notes')
          .select('instructor_id, class_id')
        ;(cn || []).forEach((r) => (activity[key(r.instructor_id as string, r.class_id as number)] = true))

        setActivityByPair(activity)
      } finally {
        setLoading(false)
      }
    })()
  }, [canView])

  const rows = useMemo(() => {
    // Construye filas: por instructor -> totales y actualizados
    const qn = q.trim().toLowerCase()
    const data = instructors
      .filter((i) => !qn || i.display_name.toLowerCase().includes(qn))
      .map((i) => {
        const list = classesByInstr[i.id] || []
        const total = list.length
        const updated = list.reduce((acc, c) => acc + (activityByPair[`${i.id}::${c.class_id}`] ? 1 : 0), 0)
        return {
          id: i.id,
          name: i.display_name,
          total,
          updated,
          missingClasses: list.filter((c) => !activityByPair[`${i.id}::${c.class_id}`]).map((c) => c.class_name),
        }
      })

    // sort
    const sorted = [...data].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      if (sortKey === 'total') cmp = a.total - b.total
      if (sortKey === 'updated') cmp = a.updated - b.updated
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [instructors, classesByInstr, activityByPair, q, sortKey, sortDir])

  if (!canView) {
    return <div className="panel">No tienes acceso a esta vista.</div>
  }

  const toggleSort = (k: 'name' | 'total' | 'updated') => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(k)
      setSortDir('asc')
    }
  }

  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>Class Tracking</h3>

      <div style={{ display: 'flex', gap: 12, alignItems: 'end', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label>Filter by instructor</label>
          <input
            className="input"
            placeholder="Type a name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="panel">
        {loading ? (
          <div className="small">Loading…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('name')}>
                  Instructor {sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ width: 160, cursor: 'pointer' }} onClick={() => toggleSort('total')}>
                  Total classes {sortKey === 'total' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ width: 210, cursor: 'pointer' }} onClick={() => toggleSort('updated')}>
                  Classes updated {sortKey === 'updated' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.total}</td>
                  <td>{r.updated}</td>
                  <td>
                    <button
                      className="btn"
                      onClick={() => setDetailFor({ id: r.id, name: r.name })}
                      disabled={(r.missingClasses || []).length === 0}
                      title={(r.missingClasses || []).length === 0 ? 'No pending classes' : 'View pending'}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="small">
                    No instructors match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de clases faltantes para el instructor seleccionado */}
      <DetailModal
        open={!!detailFor}
        onClose={() => setDetailFor(null)}
        instructor={detailFor}
        classesByInstr={classesByInstr}
        activity={activityByPair}
      />
    </div>
  )
}

const DetailModal: React.FC<{
  open: boolean
  onClose: () => void
  instructor: { id: string; name: string } | null
  classesByInstr: Record<string, Array<{ class_id: number; class_name: string }>>
  activity: Record<string, boolean>
}> = ({ open, onClose, instructor, classesByInstr, activity }) => {
  if (!open || !instructor) return null

  const all = classesByInstr[instructor.id] || []
  const pending = all.filter(c => !activity[`${instructor.id}::${c.class_id}`])
  const updated = all.filter(c =>  activity[`${instructor.id}::${c.class_id}`])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Details · ${instructor.name}`}
      footer={<button className="btn" onClick={onClose}>Close</button>}
    >
      <div className="grid grid-2" style={{ gap: 16 }}>
        <div>
          <h4 style={{ marginTop: 0 }}>Pending ({pending.length})</h4>
          {pending.length ? (
            <ul style={{ maxHeight: 300, overflow: 'auto' }}>
              {pending.map(c => <li key={c.class_id}>{c.class_name}</li>)}
            </ul>
          ) : (
            <div className="small">No pending classes.</div>
          )}
        </div>

        <div>
          <h4 style={{ marginTop: 0 }}>Updated ({updated.length})</h4>
          {updated.length ? (
            <ul style={{ maxHeight: 300, overflow: 'auto' }}>
              {updated.map(c => <li key={c.class_id}>{c.class_name}</li>)}
            </ul>
          ) : (
            <div className="small">No updated classes yet.</div>
          )}
        </div>
      </div>
    </Modal>
  )
}


export default ClassTracking
