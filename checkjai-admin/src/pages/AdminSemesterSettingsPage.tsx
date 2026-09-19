import { useEffect, useState } from 'react'
import { adminFetch } from '../lib/teacherSession'
import '../../src/style.css'

type Semester = {
  id: string
  semester_name: string
  academic_year: string
  start_date: string
  end_date: string
  is_active: boolean
}

export default function AdminSemesterSettingsPage() {
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [year, setYear] = useState('2569')
  const [term, setTerm] = useState('1')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const loadSemesters = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch('/api/admin/semesters')
      const json = await res.json()
      if (res.ok && json.ok) {
        setSemesters(json.semesters || [])
      } else {
        setError(json.message || 'ไม่สามารถโหลดข้อมูลเทอมการศึกษาได้ในขณะนี้')
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อโหลดข้อมูลเทอมได้')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSemesters()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!start || !end) return
    setError(null)
    try {
      const res = await adminFetch('/api/admin/semesters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semester_name: term,
          academic_year: year,
          start_date: new Date(start).toISOString(),
          end_date: new Date(end).toISOString(),
        }),
      })
      if (res.ok) {
        setStart('')
        setEnd('')
        void loadSemesters()
      } else {
        const json = await res.json()
        setError(json.message || 'บันทึกไม่สำเร็จ')
      }
    } catch {
      setError('บันทึกไม่สำเร็จ')
    }
  }

  const handleActivate = async (id: string) => {
    try {
      const res = await adminFetch(`/api/admin/semesters/${id}/activate`, { method: 'POST' })
      if (res.ok) void loadSemesters()
    } catch {
      setError('เปิดใช้งานไม่สำเร็จ')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('ยืนยันการลบเทอมนี้?')) return
    try {
      const res = await adminFetch(`/api/admin/semesters/${id}`, { method: 'DELETE' })
      if (res.ok) void loadSemesters()
    } catch {
      setError('ลบไม่สำเร็จ')
    }
  }

  return (
    <div className="aj-searchPage">
      <header className="aj-searchHeader">
        <h1 className="aj-searchTitle">Semester Settings (ตั้งค่าภาคเรียน)</h1>
      </header>

      {error && (
        <p className="aj-searchBanner" style={{ background: '#fee2e2', color: '#991b1b', marginBottom: '16px' }}>
          {error}
        </p>
      )}

      <section className="aj-searchPanel" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#0b1139' }}>เพิ่มเทอมการศึกษาใหม่</h2>
        <form onSubmit={handleAdd} className="aj-searchGrid" style={{ alignItems: 'flex-end' }}>
          <label className="aj-searchField">
            <span>ปีการศึกษา</span>
            <input
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
              placeholder="เช่น 2569"
              className="aj-searchInput"
              required
            />
          </label>
          <label className="aj-searchField">
            <span>เทอม</span>
            <select value={term} onChange={(e) => setTerm(e.target.value)} className="aj-searchSelect">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="ฤดูร้อน">ฤดูร้อน</option>
            </select>
          </label>
          <label className="aj-searchField">
            <span>วันที่เริ่ม</span>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="aj-searchInput" required />
          </label>
          <label className="aj-searchField">
            <span>วันที่สิ้นสุด</span>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="aj-searchInput" required />
          </label>
          <button type="submit" className="aj-searchBtnPrimary" style={{ height: '42px' }}>
            บันทึกเทอมใหม่
          </button>
        </form>
      </section>

      <section className="aj-searchPanel aj-searchPanel--table" style={{ margin: 0 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#0b1139' }}>รายการเทอมทั้งหมด</h2>
        <div className="aj-searchTableWrap">
          <table className="aj-searchTable">
            <thead>
              <tr>
                <th>ปีการศึกษา</th>
                <th>เทอม</th>
                <th>ช่วงเวลา</th>
                <th style={{ textAlign: 'center' }}>สถานะ</th>
                <th style={{ textAlign: 'right' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="aj-searchTdMuted">
                    กำลังโหลด...
                  </td>
                </tr>
              )}
              {!loading && semesters.length === 0 && (
                <tr>
                  <td colSpan={5} className="aj-searchTdMuted">
                    ยังไม่มีข้อมูลเทอมการศึกษา
                  </td>
                </tr>
              )}
              {semesters.map((s) => (
                <tr key={s.id} style={s.is_active ? { background: '#f0f7ff' } : {}}>
                  <td>{s.academic_year}</td>
                  <td>{s.semester_name}</td>
                  <td>
                    {new Date(s.start_date).toLocaleDateString('th-TH')} - {new Date(s.end_date).toLocaleDateString('th-TH')}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {s.is_active ? (
                      <span className="aj-statusBadge aj-statusBadge--submitted" style={{ background: '#dcfce7', color: '#166534' }}>
                        Active
                      </span>
                    ) : (
                      <span className="aj-statusBadge aj-statusBadge--pending">Inactive</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {!s.is_active && (
                      <button
                        onClick={() => handleActivate(s.id)}
                        className="aj-searchLinkBtn"
                        style={{ marginRight: '12px', color: '#1e40af', textDecoration: 'none', fontWeight: 700 }}
                      >
                        Set Active
                      </button>
                    )}
                    <button onClick={() => handleDelete(s.id)} className="aj-searchLinkBtn" style={{ color: '#991b1b', textDecoration: 'none' }}>
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
