import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, supabaseAdmin } from '../lib/supabase'
import { adminFetch, clearTeacherSession, getTeacherToken } from '../lib/teacherSession'
import type { StudentHistoryRow, StudentProfileLite, BubbleLetterRow } from '../types/assessmentAdmin'

import { getSeverityDepressionInfo, getSeverityAnxietyInfo, getSeverityStressInfo, getSeverityEqInfo } from '../lib/dass21Score'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { utils, writeFile } from 'xlsx'

type ApiResponse = {
  ok?: boolean
  message?: string
  student?: StudentProfileLite
  history?: StudentHistoryRow[]
  bubble_letters?: BubbleLetterRow[]
}

function formatDateTh(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}


type RecordMetrics = {
  id: string
  dateLabel: string
  mentalWellbeing: number
  eqPercent: number
  overall: number
}

function clamp01To100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)))
}

function computeMetrics(record: StudentHistoryRow): RecordMetrics {
  const eqPercent = clamp01To100(((record.eq_total_score ?? 0) / 208) * 100)

  const d = record.dass_depression?.doubled ?? 0
  const a = record.dass_anxiety?.doubled ?? 0
  const s = record.dass_stress?.doubled ?? 0
  const dassAvg = (d + a + s) / 3
  // DASS ยิ่งสูงยิ่งเครียด/เสี่ยงมาก จึงกลับแกนให้ "สุขภาวะ" มากขึ้น = คะแนนสูงขึ้น
  const mentalWellbeing = clamp01To100(100 - (dassAvg / 42) * 100)

  const overall = clamp01To100((mentalWellbeing + eqPercent) / 2)
  return {
    id: record.id,
    dateLabel: formatDateTh(record.created_at),
    mentalWellbeing,
    eqPercent,
    overall,
  }
}

export default function AdminStudentHistoryPage() {
  const navigate = useNavigate()
  const { studentId = '' } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [student, setStudent] = useState<StudentProfileLite | null>(null)
  const [history, setHistory] = useState<StudentHistoryRow[]>([])
  const [bubbleLetters, setBubbleLetters] = useState<BubbleLetterRow[]>([])
  const [metrics, setMetrics] = useState<RecordMetrics[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        let [{ data: sData, error: sErr }, { data: trData, error: trErr }] = await Promise.all([
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

        if (sErr) {
          setError(`ดึงข้อมูลนักศึกษาไม่สำเร็จ: ${sErr.message}`)
          return
        }

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

          const dDoubled = Number(dass.depression ?? 0)
          const aDoubled = Number(dass.anxiety ?? 0)
          const sDoubled = Number(dass.stress ?? 0)
          const eqTotal = Number(eq.total ?? 0)

          const dInfo = getSeverityDepressionInfo(dDoubled)
          const aInfo = getSeverityAnxietyInfo(aDoubled)
          const sInfo = getSeverityStressInfo(sDoubled)
          const eqInfo = getSeverityEqInfo(eqTotal)

          return {
            id: tr.id,
            created_at: tr.created_at,
            eq_total_score: eqTotal,
            eq_answers: raw.eq_answers || [],
            dass_answers: raw.dass_answers || [],
            dass_depression: { raw: 0, doubled: dDoubled, severity: dInfo.severity, labelTh: dInfo.labelTh } as any,
            dass_anxiety: { raw: 0, doubled: aDoubled, severity: aInfo.severity, labelTh: aInfo.labelTh } as any,
            dass_stress: { raw: 0, doubled: sDoubled, severity: sInfo.severity, labelTh: tr.stress_level || sInfo.labelTh } as any,
            eq_severity: eqInfo,
          }
        })

        setHistory(rows)
        setMetrics(rows.map((r) => computeMetrics(r)))
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err)
          setError(`เชื่อมต่อฐานข้อมูลไม่สำเร็จ: ${msg}`)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [studentId])

  const handleBulkExportExcel = () => {
    const wb = utils.book_new()

    // 1. Sheet: Profile
    const profileData = [
      ['ข้อมูลนักศึกษา'],
      ['รหัสนักศึกษา', student?.student_id || studentId],
      ['ชื่อ-นามสกุล', student?.full_name || '-'],
      ['คณะ', student?.faculty?.trim() || '-'],
      ['สาขา', student?.major?.trim() || '-'],
      ['ชั้นปี', student?.year_level ?? '-'],
      [''],
      ['จำนวนการทำแบบทดสอบ', history.length],
      ['จำนวนจดหมายฟองสบู่', bubbleLetters.length],
      ['วันที่ส่งออกข้อมูล', new Date().toLocaleDateString('th-TH')],
    ]
    const wsProfile = utils.aoa_to_sheet(profileData)
    utils.book_append_sheet(wb, wsProfile, 'ข้อมูลเบื้องต้น')

    // 2. Sheet: Trends (Graph Data)
    const trendHeader = [['วันที่ (ครั้งที่)', 'สุขภาพจิตใจ (%)', 'ความฉลาดทางอารมณ์ (%)', 'ภาพรวม (%)']]
    const trendRows = metrics.map((m) => [m.dateLabel, m.mentalWellbeing, m.eqPercent, m.overall])
    const wsTrend = utils.aoa_to_sheet([...trendHeader, ...trendRows])
    utils.book_append_sheet(wb, wsTrend, 'แนวโน้มสุขภาพจิต')

    // 3. Sheet: Assessment Records
    const recordsHeader = [['วันที่', 'D (ซึมเศร้า)', 'ระดับ D', 'A (วิตกกังวล)', 'ระดับ A', 'S (เครียด)', 'ระดับ S', 'คะแนน EQ รวม']]
    const recordsRows = history.map((h) => [
      formatDateTh(h.created_at),
      h.dass_depression?.doubled ?? 0,
      h.dass_depression?.labelTh ?? '-',
      h.dass_anxiety?.doubled ?? 0,
      h.dass_anxiety?.labelTh ?? '-',
      h.dass_stress?.doubled ?? 0,
      h.dass_stress?.labelTh ?? '-',
      h.eq_total_score ?? 0,
    ])
    const wsRecords = utils.aoa_to_sheet([...recordsHeader, ...recordsRows])
    utils.book_append_sheet(wb, wsRecords, 'ประวัติแบบทดสอบ')

    // 4. Sheet: Bubble Letters
    const bubbleHeader = [['วันที่', 'ข้อความความในใจ']]
    const bubbleRows = bubbleLetters.map((b) => [formatDateTh(b.created_at), b.content])
    const wsBubble = utils.aoa_to_sheet([...bubbleHeader, ...bubbleRows])
    utils.book_append_sheet(wb, wsBubble, 'จดหมายฟองสบู่')

    // Auto-size columns (rough estimation)
    const sheets = [wsProfile, wsTrend, wsRecords, wsBubble]
    sheets.forEach(ws => {
      ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }]
    })
    wsBubble['!cols'] = [{ wch: 20 }, { wch: 80 }] // Content column wider

    const fileName = `FullHistory_${studentId}_${new Date().toISOString().split('T')[0]}.xlsx`
    writeFile(wb, fileName)
  }

  return (
    <div className="aj-historyPage aj-admin-theme">
      <header className="aj-searchHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="aj-searchTitle">Student History</h1>
          <p className="aj-searchCrumb">
            <button type="button" className="aj-searchCrumbLink" onClick={() => navigate('/admin/search')}>
              Search
            </button>
            {' > History'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleBulkExportExcel}
          className="aj-searchBtnExport"
        >
          📊 Export All Data
        </button>
      </header>

      {error ? <p className="aj-searchBanner">{error}</p> : null}

      <section className="aj-historyProfile aj-searchPanel">
        <h2 className="aj-historyName">
          {student?.full_name || studentId}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px', color: '#64748b' }}>
          <p>รหัสนักศึกษา : <span style={{ color: '#1e293b', fontWeight: 600 }}>{student?.student_id || studentId}</span></p>
          <p>คณะ : <span style={{ color: '#1e293b', fontWeight: 600 }}>{student?.faculty?.trim() || '-'}</span></p>
          <p>ชั้นปี : <span style={{ color: '#1e293b', fontWeight: 600 }}>{student?.year_level != null ? student.year_level : '-'}</span></p>
          <p>สาขา : <span style={{ color: '#1e293b', fontWeight: 600 }}>{student?.major?.trim() || '-'}</span></p>
        </div>
      </section>

      <section className="aj-summarySection aj-searchPanel" style={{ marginBottom: '24px' }}>
        <h2 className="aj-summaryHead" style={{ border: 'none', marginBottom: '20px' }}>แนวโน้มสุขภาพจิตใจ (Mental Wellbeing Trend)</h2>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[...metrics].reverse() /* Oldest to Newest */}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dateLabel" fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="mentalWellbeing" name="สุขภาวะทางจิต" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6 }} />
              <Line type="monotone" dataKey="eqPercent" name="ความฉลาดทางอารมณ์" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="aj-summarySection aj-searchPanel">
        <h2 className="aj-summaryHead" style={{ border: 'none', marginBottom: '20px' }}>สรุปภาพรวมล่าสุด (Radar Summary)</h2>
        {loading ? (
          <p className="aj-searchTdMuted">กำลังคำนวณกราฟ...</p>
        ) : metrics.length === 0 ? (
          <p className="aj-searchTdMuted">ยังไม่มีข้อมูลสำหรับแสดงกราฟ</p>
        ) : (
          <div className="aj-summaryGraphWrap">
            <svg
              viewBox="0 0 520 340"
              className="aj-summaryGraphSvg"
              aria-label="กราฟสรุปจากทุก record"
            >
              {(() => {
                const cx = 260
                const cy = 175
                const radius = 118
                const axes = [
                  { key: 'mentalWellbeing', angle: -Math.PI / 2 },
                  { key: 'eqPercent', angle: (Math.PI * 1) / 6 },
                  { key: 'overall', angle: (Math.PI * 5) / 6 },
                ] as const

                const ringPoints = (ratio: number) =>
                  axes
                    .map((ax) => {
                      const x = cx + Math.cos(ax.angle) * radius * ratio
                      const y = cy + Math.sin(ax.angle) * radius * ratio
                      return `${x},${y}`
                    })
                    .join(' ')

                const colors = ['#b072d7', '#57b4ea', '#f2a56f', '#6fd3be', '#f38ac5']

                return (
                  <g>
                    {[0.2, 0.4, 0.6, 0.8, 1].map((r) => (
                      <polygon
                        key={r}
                        points={ringPoints(r)}
                        fill="none"
                        stroke="rgba(11,17,57,0.16)"
                        strokeWidth="1"
                      />
                    ))}
                    {axes.map((ax, idx) => {
                      const x = cx + Math.cos(ax.angle) * radius
                      const y = cy + Math.sin(ax.angle) * radius
                      return (
                        <line
                          key={`axis-${idx}`}
                          x1={cx}
                          y1={cy}
                          x2={x}
                          y2={y}
                          stroke="rgba(11,17,57,0.2)"
                          strokeWidth="1"
                        />
                      )
                    })}

                    {metrics.map((m, idx) => {
                      const points = axes
                        .map((ax) => {
                          const value = m[ax.key]
                          const ratio = value / 100
                          const x = cx + Math.cos(ax.angle) * radius * ratio
                          const y = cy + Math.sin(ax.angle) * radius * ratio
                          return `${x},${y}`
                        })
                        .join(' ')
                      const color = colors[idx % colors.length]
                      return (
                        <polygon
                          key={m.id}
                          points={points}
                          fill={color}
                          fillOpacity={0.28}
                          stroke={color}
                          strokeWidth="1.5"
                        />
                      )
                    })}

                    <text x={260} y={24} className="aj-summaryAxisLabel aj-summaryAxisLabel--top">
                      แบบทดสอบสุขภาพจิตใจ
                    </text>
                    <text x={388} y={206} className="aj-summaryAxisLabel aj-summaryAxisLabel--right">
                      แบบทดสอบความฉลาดทางอารมณ์
                    </text>
                    <text x={115} y={206} className="aj-summaryAxisLabel aj-summaryAxisLabel--left">
                      สรุปภาพรวม
                    </text>
                  </g>
                )
              })()}
            </svg>

            <div className="aj-summaryLegend">
              {metrics.map((m, idx) => (
                <p key={m.id} className="aj-summaryLegendItem">
                  <span className={`aj-summaryLegendDot c-${idx % 5}`} />
                  {m.dateLabel} — สุขภาวะ {m.mentalWellbeing} / EQ {m.eqPercent} / รวม {m.overall}
                </p>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="aj-searchPanel" style={{ marginTop: '24px' }}>
        <h2 className="aj-historyHead" style={{ border: 'none', marginBottom: '16px' }}>ประวัติการทำแบบทดสอบ</h2>
        {loading ? (
          <p className="aj-searchTdMuted">กำลังโหลด...</p>
        ) : history.length === 0 ? (
          <p className="aj-searchTdMuted">ยังไม่มีประวัติการส่งแบบทดสอบ</p>
        ) : (
          <div className="aj-historyList">
            {history.map((h) => {
              const to = `/admin/search/${encodeURIComponent(studentId)}/history/${h.id}`
              return (
                <button
                  key={h.id}
                  type="button"
                  className="aj-historyItem aj-historyItemBtn"
                  onClick={() => navigate(to)}
                >
                  <p className="aj-historyItemTitle">● แบบทดสอบ</p>
                  <p className="aj-historyItemLine">แบบทดสอบความฉลาดทางอารมณ์ EQ</p>
                  <p className="aj-historyItemLine">แบบทดสอบสุขภาพจิต DASS-21</p>
                  <p className="aj-historyItemDate">{formatDateTh(h.created_at)}</p>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Bubble Letters Section */}
      <section className="aj-searchPanel" style={{ marginTop: '24px' }}>
        <h2 className="aj-historyHead" style={{ border: 'none', marginBottom: '16px' }}>
          💌 จดหมายฟองสบู่ (ความในใจ)
        </h2>
        {loading ? (
          <p className="aj-searchTdMuted">กำลังโหลด...</p>
        ) : bubbleLetters.length === 0 ? (
          <p className="aj-searchTdMuted">ยังไม่มีข้อความระบายความรู้สึก</p>
        ) : (
          <div className="aj-historyList">
            {bubbleLetters.map((b) => (
              <div
                key={b.id}
                className="aj-historyItem"
                style={{ cursor: 'default', background: '#f8fafc', borderLeft: '4px solid #f472b6' }}
              >
                <p className="aj-historyItemTitle" style={{ color: '#db2777' }}>● ความในใจ</p>
                <div style={{ 
                  margin: '12px 0', 
                  padding: '12px', 
                  background: 'white', 
                  borderRadius: '8px',
                  fontSize: '16px',
                  color: '#334155',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}>
                  {b.content}
                </div>
                <p className="aj-historyItemDate">{formatDateTh(b.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
