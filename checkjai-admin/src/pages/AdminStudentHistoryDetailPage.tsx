import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, supabaseAdmin } from '../lib/supabase'
import type { StudentHistoryRow, StudentProfileLite } from '../types/assessmentAdmin'
import { DASS21_CHOICES_TH, DASS21_QUESTIONS_TH } from '../lib/dass21Score'
import { EQ_CHOICES_TH, EQ_QUESTIONS_TH } from '../lib/eqQuestions'
import { utils, writeFile } from 'xlsx'

function formatFullDateTh(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function AdminStudentHistoryDetailPage() {
  const navigate = useNavigate()
  const { studentId = '', submissionId = '' } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [student, setStudent] = useState<StudentProfileLite | null>(null)
  const [history, setHistory] = useState<StudentHistoryRow[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        let [{ data: sData }, { data: trData }] = await Promise.all([
          supabase
            .from('students')
            .select('student_id, full_name, faculty, major, year_level')
            .eq('student_id', studentId)
            .maybeSingle(),
          supabase
            .from('test_results')
            .select('id, student_id, stress_level, dass_score, eq_score, raw_answers, created_at')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false }),
        ])

        if (!sData || !trData || trData.length === 0) {
          const [adminS, adminTr] = await Promise.all([
            supabaseAdmin
              .from('students')
              .select('student_id, full_name, faculty, major, year_level')
              .eq('student_id', studentId)
              .maybeSingle(),
            supabaseAdmin
              .from('test_results')
              .select('id, student_id, stress_level, dass_score, eq_score, raw_answers, created_at')
              .eq('student_id', studentId)
              .order('created_at', { ascending: false }),
          ])
          if (adminS.data) sData = adminS.data
          if (adminTr.data && adminTr.data.length > 0) trData = adminTr.data
        }

        if (cancelled) return

        setStudent(
          sData
            ? {
                student_id: sData.student_id,
                full_name: sData.full_name,
                faculty: sData.faculty,
                major: sData.major,
                year_level: sData.year_level,
              }
            : {
                student_id: studentId,
                full_name: null,
                faculty: null,
                major: null,
                year_level: null,
              }
        )

        const rows: StudentHistoryRow[] = (trData || []).map((tr: any) => {
          const dass = tr.dass_score || {}
          const eq = tr.eq_score || {}
          const raw = tr.raw_answers || {}

          return {
            id: tr.id,
            created_at: tr.created_at,
            eq_total_score: Number(eq.total ?? 0),
            eq_answers: raw.eq_answers || [],
            dass_answers: raw.dass_answers || [],
            dass_depression: { raw: 0, doubled: Number(dass.depression ?? 0), severity: 'normal' as any, labelTh: '' },
            dass_anxiety: { raw: 0, doubled: Number(dass.anxiety ?? 0), severity: 'normal' as any, labelTh: '' },
            dass_stress: { raw: 0, doubled: Number(dass.stress ?? 0), severity: 'normal' as any, labelTh: tr.stress_level || '' },
          }
        })

        setHistory(rows)
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err)
          setError(`โหลดรายละเอียดไม่สำเร็จ: ${msg}`)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [studentId])

  const currentRecord = useMemo(() => {
    if (!history.length) return null
    if (submissionId) {
      return history.find((h) => String(h.id) === String(submissionId)) ?? history[0]
    }
    return history[0]
  }, [history, submissionId])

  const handleExportExcel = () => {
    if (!currentRecord) return

    const wb = utils.book_new()

    // 1. Profile Sheet
    const profileData = [
      ['ข้อมูลนักศึกษา'],
      ['รหัสนักศึกษา', student?.student_id || studentId],
      ['ชื่อ-นามสกุล', student?.full_name || '-'],
      ['คณะ', student?.faculty?.trim() || '-'],
      ['สาขา', student?.major?.trim() || '-'],
      ['ชั้นปี', student?.year_level ?? '-'],
      ['วันที่ทำแบบประเมิน', formatFullDateTh(currentRecord.created_at)],
    ]
    const profileWs = utils.aoa_to_sheet(profileData)
    utils.book_append_sheet(wb, profileWs, 'ข้อมูลส่วนตัว')

    // 2. DASS-21 Sheet
    const dassAnswers = currentRecord.dass_answers || []
    const dassExport = DASS21_QUESTIONS_TH.map((q, idx) => {
      const val = dassAnswers[idx]
      const choiceText = val !== undefined && val !== null ? DASS21_CHOICES_TH[val] || String(val) : 'ไม่ได้ตอบ'
      return {
        'ข้อที่': idx + 1,
        'คำถาม DASS-21': q,
        'คำตอบ': choiceText,
        'คะแนน (0-3)': val !== undefined && val !== null ? val : '-',
      }
    })
    const dassWs = utils.json_to_sheet(dassExport)
    utils.book_append_sheet(wb, dassWs, 'ผลลัพธ์ DASS-21')

    // 3. EQ Sheet
    const eqAnswers = currentRecord.eq_answers || []
    const eqExport = EQ_QUESTIONS_TH.map((q, idx) => {
      const val = eqAnswers[idx]
      const choiceText = val !== undefined && val !== null ? EQ_CHOICES_TH[val] || String(val) : 'ไม่ได้ตอบ'
      return {
        'ข้อที่': idx + 1,
        'คำถาม EQ': q,
        'คำตอบ': choiceText,
        'คะแนนดิบ (0-3)': val !== undefined && val !== null ? val : '-',
      }
    })
    const eqWs = utils.json_to_sheet(eqExport)
    utils.book_append_sheet(wb, eqWs, 'ผลลัพธ์ EQ')

    writeFile(wb, `CheckJai_Result_${student?.student_id || studentId}_${currentRecord.id}.xlsx`)
  }

  if (loading) {
    return (
      <div className="aj-searchPage">
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          กำลังโหลดรายละเอียด...
        </div>
      </div>
    )
  }

  if (error || !currentRecord) {
    return (
      <div className="aj-searchPage">
        <header className="aj-searchHeader">
          <button
            type="button"
            className="aj-searchBtnBack"
            onClick={() => navigate(`/admin/search/${studentId}/history`)}
          >
            ← ย้อนกลับ
          </button>
          <h1 className="aj-searchTitle">รายละเอียดผลการทำแบบประเมิน</h1>
        </header>
        <div style={{ padding: '40px', color: '#e11d48', background: '#ffe4e6', borderRadius: '8px' }}>
          {error || 'ไม่พบผลการประเมินชุดนี้'}
        </div>
      </div>
    )
  }

  return (
    <div className="aj-searchPage">
      <header className="aj-searchHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            className="aj-searchBtnBack"
            onClick={() => navigate(`/admin/search/${studentId}/history`)}
          >
            ← ย้อนกลับ
          </button>
          <h1 className="aj-searchTitle">รายละเอียดผลประเมิน ({formatFullDateTh(currentRecord.created_at)})</h1>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          📊 Export Excel ชุดนี้
        </button>
      </header>

      {/* Profile Header Card */}
      <section className="aj-searchPanel" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#0b1139' }}>ข้อมูลผู้ประเมิน</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div><strong>รหัสนักศึกษา:</strong> {student?.student_id || studentId}</div>
          <div><strong>ชื่อ-นามสกุล:</strong> {student?.full_name || '-'}</div>
          <div><strong>คณะ:</strong> {student?.faculty || '-'}</div>
          <div><strong>สาขาวิชา:</strong> {student?.major || '-'}</div>
          <div><strong>ชั้นปี:</strong> {student?.year_level || '-'}</div>
        </div>
      </section>

      {/* Summary Score Card */}
      <section className="aj-searchPanel" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#0b1139' }}>สรุปผลคะแนน</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>ภาวะซึมเศร้า (Depression)</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>{currentRecord.dass_depression?.doubled ?? 0} คะแนน</div>
          </div>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>ภาวะวิตกกังวล (Anxiety)</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>{currentRecord.dass_anxiety?.doubled ?? 0} คะแนน</div>
          </div>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>ความเครียด (Stress)</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>{currentRecord.dass_stress?.doubled ?? 0} คะแนน</div>
            <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px' }}>ระดับ: {currentRecord.dass_stress?.labelTh || 'ปกติ'}</div>
          </div>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>คะแนนรวม EQ</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>{currentRecord.eq_total_score ?? 0} คะแนน</div>
          </div>
        </div>
      </section>

      {/* DASS-21 Itemized Details */}
      <section className="aj-searchPanel" style={{ marginBottom: '24px', overflowX: 'auto' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#0b1139' }}>รายละเอียดคำตอบ DASS-21 (21 ข้อ)</h2>
        <table className="aj-searchTable">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>ข้อที่</th>
              <th>คำถาม DASS-21</th>
              <th style={{ width: '200px' }}>คำตอบ</th>
              <th style={{ width: '100px', textAlign: 'center' }}>คะแนน</th>
            </tr>
          </thead>
          <tbody>
            {DASS21_QUESTIONS_TH.map((q, idx) => {
              const val = currentRecord.dass_answers?.[idx]
              return (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{q}</td>
                  <td>{val !== undefined && val !== null ? DASS21_CHOICES_TH[val] || String(val) : 'ไม่ได้ตอบ'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{val !== undefined && val !== null ? val : '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {/* EQ Itemized Details */}
      <section className="aj-searchPanel" style={{ overflowX: 'auto' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#0b1139' }}>รายละเอียดคำตอบ EQ (52 ข้อ)</h2>
        <table className="aj-searchTable">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>ข้อที่</th>
              <th>คำถาม EQ</th>
              <th style={{ width: '200px' }}>คำตอบ</th>
              <th style={{ width: '100px', textAlign: 'center' }}>คะแนนดิบ</th>
            </tr>
          </thead>
          <tbody>
            {EQ_QUESTIONS_TH.map((q, idx) => {
              const val = currentRecord.eq_answers?.[idx]
              return (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{q}</td>
                  <td>{val !== undefined && val !== null ? EQ_CHOICES_TH[val] || String(val) : 'ไม่ได้ตอบ'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{val !== undefined && val !== null ? val : '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
