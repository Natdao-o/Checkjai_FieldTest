import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, supabaseAdmin } from '../lib/supabase'

export interface DirectoryStudentRow {
  student_id: string
  full_name: string
  faculty: string
  major: string
  year_level: string
  latest_submission_at: string | null
  status: string
  d_score: number | null
  a_score: number | null
  s_score: number | null
  eq_total_score: number | null
}

export default function AdminSearchPage() {
  const navigate = useNavigate()

  const [studentQ, setStudentQ] = useState('')
  const [faculty, setFaculty] = useState('')
  const [major, setMajor] = useState('')
  const [yearLevel, setYearLevel] = useState('')

  const [faculties, setFaculties] = useState<string[]>([])
  const [majors, setMajors] = useState<string[]>([])
  const [facultyMajorMap, setFacultyMajorMap] = useState<Record<string, string[]>>({})

  const [rows, setRows] = useState<DirectoryStudentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('students')
        .select(`
          student_id,
          full_name,
          faculty,
          major,
          year_level,
          created_at,
          test_results (
            id,
            stress_level,
            dass_score,
            eq_score,
            created_at
          )
        `)

      if (faculty) query = query.eq('faculty', faculty)
      if (major) query = query.eq('major', major)
      if (yearLevel) query = query.eq('year_level', yearLevel)

      let { data, error: qErr } = await query

      if ((!data || data.length === 0) && !qErr) {
        let adminQuery = supabaseAdmin
          .from('students')
          .select(`
            student_id,
            full_name,
            faculty,
            major,
            year_level,
            created_at,
            test_results (
              id,
              stress_level,
              dass_score,
              eq_score,
              created_at
            )
          `)

        if (faculty) adminQuery = adminQuery.eq('faculty', faculty)
        if (major) adminQuery = adminQuery.eq('major', major)
        if (yearLevel) adminQuery = adminQuery.eq('year_level', yearLevel)

        const adminRes = await adminQuery
        if (adminRes.data && adminRes.data.length > 0) {
          data = adminRes.data
          qErr = adminRes.error
        }
      }

      if (qErr) {
        setError(`ดึงข้อมูลนักศึกษาไม่สำเร็จ: ${qErr.message}`)
        setLoading(false)
        return
      }

      const allRows: DirectoryStudentRow[] = (data || []).map((s: any) => {
        const results = Array.isArray(s.test_results) ? s.test_results : []
        // Sort latest test result first
        results.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        const latest = results[0]

        const dass = latest?.dass_score || {}
        const eq = latest?.eq_score || {}

        return {
          student_id: s.student_id,
          full_name: s.full_name || s.student_id,
          faculty: s.faculty || '-',
          major: s.major || '-',
          year_level: s.year_level || '-',
          latest_submission_at: latest?.created_at || null,
          status: latest ? (latest.stress_level || 'ทำแบบประเมินแล้ว') : 'ยังไม่ได้ทำแบบประเมิน',
          d_score: latest ? Number(dass.depression ?? 0) : null,
          a_score: latest ? Number(dass.anxiety ?? 0) : null,
          s_score: latest ? Number(dass.stress ?? 0) : null,
          eq_total_score: latest ? Number(eq.total ?? 0) : null,
        }
      })

      // Extract faculties and majors dropdowns
      const facSet = new Set<string>()
      const majSet = new Set<string>()
      const map: Record<string, string[]> = {}

      allRows.forEach((r) => {
        if (r.faculty && r.faculty !== '-') {
          facSet.add(r.faculty)
          if (!map[r.faculty]) map[r.faculty] = []
          if (r.major && r.major !== '-' && !map[r.faculty].includes(r.major)) {
            map[r.faculty].push(r.major)
          }
        }
        if (r.major && r.major !== '-') majSet.add(r.major)
      })

      setFaculties(Array.from(facSet).sort())
      setMajors(Array.from(majSet).sort())
      setFacultyMajorMap(map)

      // Filter by text search query
      const filtered = allRows.filter((r) => {
        if (!studentQ.trim()) return true
        const q = studentQ.trim().toLowerCase()
        return r.student_id.toLowerCase().includes(q) || r.full_name.toLowerCase().includes(q)
      })

      setRows(filtered)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`เกิดข้อผิดพลาด: ${msg}`)
    } finally {
      setLoading(false)
    }
  }, [studentQ, faculty, major, yearLevel])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return (
    <div className="aj-searchPage aj-admin-theme">
      <header className="aj-searchHeader">
        <h1 className="aj-searchTitle">รายชื่อและผลการประเมินนักศึกษา (Directory)</h1>
      </header>

      {/* Filter & Search Bar */}
      <section className="aj-searchPanel" style={{ marginBottom: '24px' }}>
        <div className="aj-searchGrid">
          <label className="aj-searchField">
            <span>ค้นหา (รหัสนักศึกษา / ชื่อ-นามสกุล)</span>
            <input
              type="text"
              className="aj-searchInput"
              value={studentQ}
              onChange={(e) => setStudentQ(e.target.value)}
              placeholder="พิมพ์รหัสนักศึกษา หรือ ชื่อ..."
            />
          </label>

          <label className="aj-searchField">
            <span>คณะ</span>
            <select
              value={faculty}
              onChange={(e) => {
                setFaculty(e.target.value)
                setMajor('')
              }}
              className="aj-searchSelect"
            >
              <option value="">ทั้งหมดทุกคณะ</option>
              {faculties.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <label className="aj-searchField">
            <span>สาขาวิชา</span>
            <select
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              className="aj-searchSelect"
            >
              <option value="">ทั้งหมดทุกสาขาวิชา</option>
              {(faculty ? facultyMajorMap[faculty] || [] : majors).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label className="aj-searchField">
            <span>ชั้นปี</span>
            <select
              value={yearLevel}
              onChange={(e) => setYearLevel(e.target.value)}
              className="aj-searchSelect"
            >
              <option value="">ทั้งหมดทุกชั้นปี</option>
              <option value="ปี 1">ปี 1</option>
              <option value="ปี 2">ปี 2</option>
              <option value="ปี 3">ปี 3</option>
              <option value="ปี 4">ปี 4</option>
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <div style={{ color: '#e11d48', padding: '12px 16px', background: '#ffe4e6', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      ) : null}

      {/* Directory Table */}
      <section className="aj-searchPanel" style={{ margin: 0, overflowX: 'auto' }}>
        <table className="aj-searchTable">
          <thead>
            <tr>
              <th>รหัสนักศึกษา</th>
              <th>ชื่อ-นามสกุล</th>
              <th>คณะ</th>
              <th>สาขาวิชา</th>
              <th>ชั้นปี</th>
              <th>สถานะผลประเมินล่าสุด</th>
              <th>คะแนน (D/A/S)</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  {loading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบข้อมูลนักศึกษาตามเงื่อนไขที่เลือก'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.student_id}>
                  <td><strong>{row.student_id}</strong></td>
                  <td>{row.full_name}</td>
                  <td>{row.faculty}</td>
                  <td>{row.major}</td>
                  <td>{row.year_level}</td>
                  <td>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: row.status.includes('รุนแรง') || row.status.includes('High') ? '#fee2e2' : row.latest_submission_at ? '#dcfce7' : '#f1f5f9',
                        color: row.status.includes('รุนแรง') || row.status.includes('High') ? '#991b1b' : row.latest_submission_at ? '#166534' : '#475569',
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td style={{ color: '#64748b' }}>
                    {row.d_score !== null ? `D:${row.d_score} / A:${row.a_score} / S:${row.s_score}` : '-'}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/search/${row.student_id}/history`)}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      ดูประวัติ
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
