import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import bgImage from '../assets/images/รูปสำหรับแบบทดสอบ-1.jpg'
import resultImage from '../assets/images/ผลลัพธ์รูปดอกไม้.jpg'
import { clearEqAnswers, readEqAnswersJson, EQ_ANSWERS_KEY } from '../lib/assessmentSession'
import {
  DASS21_CHOICES_TH,
  DASS21_QUESTIONS_TH,
  calculateDass21,
} from '../lib/dass21Score'
import { calculateEqTotal } from '../lib/eqScore'
import { supabase } from '../lib/supabase'
import { useStudent } from '../context/StudentContext'

function parseEq52(raw: string | null): number[] | null {
  if (!raw) return null
  try {
    const a = JSON.parse(raw) as unknown
    if (!Array.isArray(a) || a.length !== 52) return null
    const out: number[] = []
    for (const v of a) {
      if (typeof v !== 'number' || v < 0 || v > 3) return null
      out.push(v)
    }
    return out
  } catch {
    return null
  }
}

export default function DassQuestionPage() {
  const navigate = useNavigate()
  const { student, isIdentified } = useStudent()

  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => Array.from({ length: DASS21_QUESTIONS_TH.length }, () => null),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const currentAnswer = answers[index]

  useEffect(() => {
    if (!isIdentified || !student?.student_id) {
      navigate('/login', { replace: true })
      return
    }

    const raw = readEqAnswersJson()
    if (!parseEq52(raw)) {
      navigate('/quiz/question', { replace: true })
    }
  }, [isIdentified, student, navigate])

  function selectChoice(choiceIndex: number) {
    setAnswers((prev) => {
      const next = [...prev]
      next[index] = choiceIndex
      return next
    })
  }

  function nextQuestion() {
    if (currentAnswer === null) return
    if (index === DASS21_QUESTIONS_TH.length - 1) {
      void submitBoth(finalAnswers())
      return
    }
    setIndex((prev) => prev + 1)
  }

  function finalAnswers(): number[] {
    const out = answers.map((a, i) => (i === index ? (currentAnswer as number) : (a as number)))
    return out
  }

  async function submitBoth(dass: number[]) {
    setError(null)
    setSaving(true)

    if (!student?.student_id) {
      setError('ไม่พบข้อมูลนักศึกษา กรุณาระบุตัวตนก่อน')
      setSaving(false)
      navigate('/login', { replace: true })
      return
    }

    const rawEq = sessionStorage.getItem(EQ_ANSWERS_KEY)
    const eq = parseEq52(rawEq)
    if (!eq) {
      setSaving(false)
      navigate('/quiz/question', { replace: true })
      return
    }

    const dr = calculateDass21(dass)
    const eqResult = calculateEqTotal(eq)

    try {
      // Step A: Upsert/Insert student profile into 'students' table using anon client
      const { error: studentErr } = await supabase.from('students').upsert(
        {
          student_id: student.student_id,
          full_name: student.full_name,
          faculty: student.faculty,
          major: student.major,
          year_level: student.year_level,
        },
        { onConflict: 'student_id' }
      )

      if (studentErr) {
        // Fallback to direct insert if upsert encounters RLS update restriction
        const { error: insertErr } = await supabase.from('students').insert({
          student_id: student.student_id,
          full_name: student.full_name,
          faculty: student.faculty,
          major: student.major,
          year_level: student.year_level,
        })
        if (
          insertErr &&
          !insertErr.message?.includes('duplicate key') &&
          insertErr.code !== '23505'
        ) {
          console.warn('Student profile insert warning:', insertErr.message)
        }
      }

      // Step B: Insert test results into 'test_results' table using anon client (without .select())
      const { error: testResultErr } = await supabase.from('test_results').insert({
        student_id: student.student_id,
        dass_score: {
          depression: dr.depression.doubled,
          anxiety: dr.anxiety.doubled,
          stress: dr.stress.doubled,
        },
        eq_score: {
          total: eqResult.total,
        },
        stress_level: dr.stress.labelTh,
        raw_answers: {
          dass_answers: dass,
          eq_answers: eq,
        },
      })

      if (testResultErr) {
        setError(`บันทึกผลคะแนนไม่สำเร็จ: ${testResultErr.message}`)
        setSaving(false)
        return
      }

      clearEqAnswers()
      setDone(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`เกิดข้อผิดพลาด: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  function prevQuestion() {
    if (index > 0) {
      setIndex((prev) => prev - 1)
    }
  }

  if (done) {
    return (
      <div className="cj-home">
        <TopBar />

        <main
          className="cj-quizQuestionMain"
          style={{
            display: 'flex',
            flexDirection: 'column',
            background: '#fce7f3',
            minHeight: '100vh',
          }}
        >
          <section className="cj-quizHead">
            <span className="cj-quizHeadBar" aria-hidden="true" />
            <h1>แบบทดสอบ</h1>
          </section>
          <section className="cj-quizQuestionStage">
            <article
              className="cj-quizQuestionCard"
              style={{
                width: 'min(900px, 100%)',
                background: 'white',
                display: 'flex',
                padding: 0,
                overflow: 'hidden',
                alignItems: 'stretch',
              }}
            >
              <div style={{ flex: 1, minHeight: '400px' }}>
                <img
                  src={resultImage}
                  alt="Success"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div
                style={{
                  flex: 1.2,
                  padding: '40px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    color: '#5b2b3b',
                    fontSize: '24px',
                    fontWeight: '700',
                    marginBottom: '16px',
                  }}
                >
                  พยายามได้ดีมากๆเลยเจ้าคนเก่ง
                </p>
                <p style={{ color: '#5b2b3b', fontSize: '20px', marginBottom: '8px' }}>
                  ขอบคุณที่มาเล่าความรู้สึกของเธอ
                </p>
                <p style={{ color: '#5b2b3b', fontSize: '20px', marginBottom: '32px' }}>
                  ให้เราฟังผ่านแบบทดสอบนะ
                </p>
                <button
                  type="button"
                  className="cj-quizSmallBtn"
                  onClick={() => navigate('/')}
                  style={{
                    padding: '12px 32px',
                    fontSize: '16px',
                    background: '#fce7f3',
                    color: '#d44b7d',
                    fontWeight: '700',
                  }}
                >
                  กลับไปยังหน้าหลัก
                </button>
              </div>
            </article>
          </section>
          <div
            style={{
              marginTop: 'auto',
              padding: '20px 40px',
              textAlign: 'right',
              color: '#d44b7d',
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            ทำแบบทดสอบสำเร็จ<br />
            {new Date().toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </main>
        <footer className="cj-homeFooter" />
      </div>
    )
  }

  return (
    <div className="cj-home">
      <TopBar />

      <main
        className="cj-quizQuestionMain"
        style={{
          backgroundImage: `url("${bgImage}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '100vh',
        }}
      >
        <section className="cj-quizHead">
          <span className="cj-quizHeadBar" aria-hidden="true" />
          <h1>แบบทดสอบ</h1>
        </section>

        <section className="cj-quizQuestionStage">
          <article className="cj-quizQuestionCard">
            <p className="cj-quizProgress">
              DASS-21 ({index + 1}/{DASS21_QUESTIONS_TH.length})
            </p>
            <p className="cj-quizQuestionText">
              ข้อ {index + 1}: {DASS21_QUESTIONS_TH[index]}
            </p>

            <div className="cj-quizChoiceList">
              {DASS21_CHOICES_TH.map((choice, choiceIndex) => (
                <button
                  key={choice}
                  type="button"
                  className={`cj-quizChoiceBtn ${currentAnswer === choiceIndex ? 'is-selected' : ''}`}
                  onClick={() => selectChoice(choiceIndex)}
                >
                  {choice}
                </button>
              ))}
            </div>

            {error ? (
              <p className="cj-quizDesc" style={{ color: 'var(--cj-danger, #b42318)' }}>
                {error}
              </p>
            ) : null}

            <div className="cj-quizNav">
              <button
                type="button"
                className="cj-quizSmallBtn"
                onClick={prevQuestion}
                disabled={index === 0 || saving}
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                className="cj-quizSmallBtn"
                onClick={nextQuestion}
                disabled={currentAnswer === null || saving}
              >
                {index === DASS21_QUESTIONS_TH.length - 1
                  ? saving
                    ? 'กำลังบันทึก...'
                    : 'ส่งคำตอบ'
                  : 'ข้อต่อไป'}
              </button>
            </div>
          </article>
        </section>
      </main>

      <footer className="cj-homeFooter" />
    </div>
  )
}
