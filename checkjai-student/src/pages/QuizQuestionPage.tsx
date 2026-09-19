import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EQ_ANSWERS_KEY, saveEqAnswersJson } from '../lib/assessmentSession'
import { EQ_CHOICES_TH as choices, EQ_QUESTIONS_TH as questions } from '../lib/eqQuestions'
import TopBar from '../components/TopBar'
import { useStudent } from '../context/StudentContext'
import { getStudentId } from '../lib/auth'
import bgImage from '../assets/images/รูปสำหรับแบบทดสอบ-6.jpg'
import interImage from '../assets/images/รูปคั่นแบบทดสอบความฉลาดทางอารมณ์.jpg'

function parseStoredEq52(raw: string | null): (number | null)[] | null {
  if (!raw) return null
  try {
    const a = JSON.parse(raw) as unknown
    if (!Array.isArray(a) || a.length !== questions.length) return null
    for (const v of a) {
      if (typeof v !== 'number' || v < 0 || v > 3) return null
    }
    return a as (number | null)[]
  } catch {
    return null
  }
}

export default function QuizQuestionPage() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => Array.from({ length: questions.length }, () => null),
  )
  const { isIdentified } = useStudent()
  const [showInter, setShowInter] = useState(false)

  const currentAnswer = answers[index]

  useEffect(() => {
    if (!isIdentified) {
      navigate('/login', { replace: true })
      return
    }

    const stored = parseStoredEq52(sessionStorage.getItem(EQ_ANSWERS_KEY))
    if (stored) {
      navigate('/quiz/dass', { replace: true })
    }
  }, [isIdentified, navigate])

  function selectChoice(choiceIndex: number) {
    setAnswers((prev) => {
      const next = [...prev]
      next[index] = choiceIndex
      return next
    })
  }

  function nextQuestion() {
    if (currentAnswer === null) return
    if (index === questions.length - 1) {
      const final = [...answers]
      final[index] = currentAnswer
      saveEqAnswersJson(JSON.stringify(final))
      setShowInter(true)
      return
    }
    setIndex((prev) => prev + 1)
  }

  function prevQuestion() {
    if (index > 0) {
      setIndex((prev) => prev - 1)
    }
  }

  return (
    <div className="cj-home">
      <TopBar />

      <main 
        className="cj-quizQuestionMain"
        style={{
          backgroundImage: showInter ? 'none' : `url("${bgImage}")`,
          backgroundColor: '#fce7f3',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <section className="cj-quizHead">
          <span className="cj-quizHeadBar" aria-hidden="true" />
          <h1>แบบทดสอบ</h1>
        </section>

        <section className="cj-quizQuestionStage">
          {showInter ? (
            <article className="cj-quizQuestionCard" style={{ 
              background: 'white', 
              borderRadius: '50%', 
              width: '800px', 
              height: '800px', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center',
              boxShadow: '0 0 100px 50px white',
              padding: '60px',
              textAlign: 'center',
              border: 'none'
            }}>
              <img 
                src={interImage} 
                alt="Divider" 
                style={{ width: '220px', height: '220px', objectFit: 'contain', marginBottom: '40px' }} 
              />
              <p style={{ color: '#5b2b3b', fontSize: '20px', marginBottom: '12px', lineHeight: '1.6', fontWeight: '500' }}>
                ยังเหลืออีก 1 แบบทดสอบ หัวใจและความรู้สึกของเธอเราจะขอช่วยดูแลและรับฟังเอง
              </p>
              <p style={{ color: '#5b2b3b', fontSize: '20px', marginBottom: '50px', lineHeight: '1.6', fontWeight: '500' }}>
                อย่าพึ่งทิ้งเราไปไหนนะ...แบบทดสอบนี้เป็นแบบทดสอบสุขภาพจิตใจ DASS-21
              </p>
              <button 
                type="button" 
                className="cj-quizChoiceBtn" 
                onClick={() => navigate('/quiz/dass')}
                style={{ width: 'auto', padding: '14px 50px', fontSize: '20px' }}
              >
                ทำแบบทดสอบถัดไป
              </button>
            </article>
          ) : (
            <article className="cj-quizQuestionCard p-4 sm:p-6 md:p-[34px_28px_32px] w-full max-w-4xl mx-auto">
              <>
                  <p className="cj-quizProgress">
                    แบบประเมินความฉลาดทางอารมณ์ EQ ({index + 1}/{questions.length})
                  </p>
                  <p className="cj-quizQuestionText text-lg sm:text-xl md:text-[23px] font-semibold mb-6 md:mb-8 leading-snug md:leading-[1.5]">
                    ข้อ {index + 1}: {questions[index]}
                  </p>

                  <div className="cj-quizChoiceList">
                    {choices.map((choice, choiceIndex) => (
                      <button
                        key={choice}
                        type="button"
                        className={`cj-quizChoiceBtn w-full md:w-[min(360px,100%)] p-4 md:p-[10px_18px] text-base sm:text-lg md:text-[24px] transition-all duration-200 ${currentAnswer === choiceIndex ? 'is-selected ring-2 ring-pink-300' : 'hover:bg-pink-50'}`}
                        onClick={() => selectChoice(choiceIndex)}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>

                  <div className="cj-quizNav">
                    <button
                      type="button"
                      className="cj-quizSmallBtn"
                      onClick={prevQuestion}
                      disabled={index === 0}
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      type="button"
                      className="cj-quizSmallBtn"
                      onClick={nextQuestion}
                      disabled={currentAnswer === null}
                    >
                      {index === questions.length - 1 ? 'ส่งคำตอบ' : 'ข้อต่อไป'}
                    </button>
                  </div>
              </>
            </article>
          )}
        </section>
      </main>

      <footer className="cj-homeFooter" />
    </div>
  )
}
