import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import PinkShell from '../components/PinkShell'
import { useStudent } from '../context/StudentContext'

const DEFAULT_FACULTY = 'คณะวิศวกรรมศาสตร์และเทคโนโลยี'
const DEFAULT_MAJOR = 'เทคโนโลยีดิจิทัลและสารสนเทศ'
const DEFAULT_YEAR_LEVEL = 'ปี 1'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setStudent } = useStudent()

  const [studentId, setStudentId] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const id = studentId.trim()
    const name = fullName.trim()

    if (!id) {
      setError('กรุณากรอกรหัสนักศึกษา')
      return
    }
    if (!name) {
      setError('กรุณากรอกชื่อ-นามสกุล')
      return
    }

    // Save student profile with locked defaults to central state & localStorage progress
    setStudent({
      student_id: id,
      full_name: name,
      faculty: DEFAULT_FACULTY,
      major: DEFAULT_MAJOR,
      year_level: DEFAULT_YEAR_LEVEL,
    })

    // Redirect to assessment page
    navigate('/quiz/question')
  }

  return (
    <PinkShell title="ข้อมูลผู้ประเมิน" subtitle="กรุณากรอกข้อมูลระบุตัวตนก่อนเริ่มทำแบบประเมิน">
      <form className="cj-form" onSubmit={onSubmit}>
        {error ? <p className="cj-formError">{error}</p> : null}

        {/* 1. รหัสนักศึกษา */}
        <div className="cj-field">
          <label className="cj-label" htmlFor="studentId">
            รหัสนักศึกษา <span style={{ color: '#e11d48' }}>*</span>
          </label>
          <input
            id="studentId"
            className="cj-input"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="เช่น 6501234567"
            required
          />
        </div>

        {/* 2. ชื่อ-นามสกุล */}
        <div className="cj-field">
          <label className="cj-label" htmlFor="fullName">
            ชื่อ-นามสกุล <span style={{ color: '#e11d48' }}>*</span>
          </label>
          <input
            id="fullName"
            className="cj-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="เช่น นายสมชาย ใจดี"
            required
          />
        </div>

        {/* 3. คณะ (Locked / Disabled) */}
        <div className="cj-field">
          <label className="cj-label" htmlFor="faculty">
            คณะ
          </label>
          <input
            id="faculty"
            className="cj-input"
            value={DEFAULT_FACULTY}
            readOnly
            disabled
            style={{
              backgroundColor: '#f8fafc',
              color: '#475569',
              cursor: 'not-allowed',
              borderColor: '#cbd5e1',
              opacity: 0.9,
              fontWeight: 500,
            }}
          />
        </div>

        {/* 4. สาขาวิชา (Locked / Disabled) */}
        <div className="cj-field">
          <label className="cj-label" htmlFor="major">
            สาขาวิชา
          </label>
          <input
            id="major"
            className="cj-input"
            value={DEFAULT_MAJOR}
            readOnly
            disabled
            style={{
              backgroundColor: '#f8fafc',
              color: '#475569',
              cursor: 'not-allowed',
              borderColor: '#cbd5e1',
              opacity: 0.9,
              fontWeight: 500,
            }}
          />
        </div>

        {/* 5. ชั้นปี (Locked / Disabled) */}
        <div className="cj-field">
          <label className="cj-label" htmlFor="yearLevel">
            ชั้นปี
          </label>
          <input
            id="yearLevel"
            className="cj-input"
            value={DEFAULT_YEAR_LEVEL}
            readOnly
            disabled
            style={{
              backgroundColor: '#f8fafc',
              color: '#475569',
              cursor: 'not-allowed',
              borderColor: '#cbd5e1',
              opacity: 0.9,
              fontWeight: 500,
            }}
          />
        </div>

        {/* Submit Button */}
        <button className="cj-btn cj-btnPrimary" type="submit" style={{ marginTop: '12px' }}>
          เริ่มทำแบบประเมิน
        </button>
      </form>
    </PinkShell>
  )
}
