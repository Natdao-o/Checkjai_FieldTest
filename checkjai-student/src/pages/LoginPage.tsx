import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import PinkShell from '../components/PinkShell'
import { useStudent } from '../context/StudentContext'

const FACULTIES_AND_MAJORS: Record<string, string[]> = {
  'คณะวิศวกรรมศาสตร์และเทคโนโลยี': [
    'วิศวกรรมคอมพิวเตอร์',
    'วิศวกรรมไฟฟ้า',
    'วิศวกรรมเครื่องกล',
    'วิศวกรรมโยธา',
    'วิศวกรรมอุตสาหการ',
    'เทคโนโลยีสารสนเทศ',
  ],
  'คณะบริหารธุรกิจ': [
    'การบัญชี',
    'การตลาด',
    'การจัดการ',
    'การเงินและธนาคาร',
    'ธุรกิจดิจิทัล',
  ],
  'คณะศิลปศาสตร์': [
    'ภาษาอังกฤษเพื่อการสื่อสาร',
    'ภาษาไทยเพื่อการสื่อสาร',
    'การท่องเที่ยวและบริการ',
    'นิเทศศาสตร์',
  ],
}

const YEAR_LEVELS = ['ปี 1', 'ปี 2', 'ปี 3', 'ปี 4']

export default function LoginPage() {
  const navigate = useNavigate()
  const { setStudent } = useStudent()

  const [studentId, setStudentId] = useState('')
  const [fullName, setFullName] = useState('')
  const [faculty, setFaculty] = useState('')
  const [major, setMajor] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [error, setError] = useState('')

  function handleFacultyChange(selectedFaculty: string) {
    setFaculty(selectedFaculty)
    setMajor('') // Reset major when faculty changes
  }

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
    if (!faculty) {
      setError('กรุณาเลือกคณะ')
      return
    }
    if (!major) {
      setError('กรุณาเลือกสาขาวิชา')
      return
    }
    if (!yearLevel) {
      setError('กรุณาเลือกชั้นปี')
      return
    }

    // Save student profile to central State (Context + SessionStorage)
    setStudent({
      student_id: id,
      full_name: name,
      faculty,
      major,
      year_level: yearLevel,
    })

    // Redirect to assessment page
    navigate('/quiz/question')
  }

  const availableMajors = faculty ? FACULTIES_AND_MAJORS[faculty] || [] : []

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

        {/* 3. คณะ */}
        <div className="cj-field">
          <label className="cj-label" htmlFor="faculty">
            คณะ <span style={{ color: '#e11d48' }}>*</span>
          </label>
          <select
            id="faculty"
            className="cj-input"
            value={faculty}
            onChange={(e) => handleFacultyChange(e.target.value)}
            required
            style={{ appearance: 'auto' }}
          >
            <option value="">-- เลือกคณะ --</option>
            {Object.keys(FACULTIES_AND_MAJORS).map((fac) => (
              <option key={fac} value={fac}>
                {fac}
              </option>
            ))}
          </select>
        </div>

        {/* 4. สาขาวิชา */}
        <div className="cj-field">
          <label className="cj-label" htmlFor="major">
            สาขาวิชา <span style={{ color: '#e11d48' }}>*</span>
          </label>
          <select
            id="major"
            className="cj-input"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            required
            disabled={!faculty}
            style={{ appearance: 'auto' }}
          >
            <option value="">
              {!faculty ? '-- กรุณาเลือกคณะก่อน --' : '-- เลือกสาขาวิชา --'}
            </option>
            {availableMajors.map((maj) => (
              <option key={maj} value={maj}>
                {maj}
              </option>
            ))}
          </select>
        </div>

        {/* 5. ชั้นปี */}
        <div className="cj-field">
          <label className="cj-label" htmlFor="yearLevel">
            ชั้นปี <span style={{ color: '#e11d48' }}>*</span>
          </label>
          <select
            id="yearLevel"
            className="cj-input"
            value={yearLevel}
            onChange={(e) => setYearLevel(e.target.value)}
            required
            style={{ appearance: 'auto' }}
          >
            <option value="">-- เลือกชั้นปี --</option>
            {YEAR_LEVELS.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        {/* Submit Button */}
        <button className="cj-btn cj-btnPrimary" type="submit" style={{ marginTop: '12px' }}>
          เริ่มทำแบบประเมิน
        </button>
      </form>
    </PinkShell>
  )
}
