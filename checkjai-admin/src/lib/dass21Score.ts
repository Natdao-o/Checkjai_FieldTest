/**
 * DASS-21 — ตัวเลือกต่อข้อ: 0 ไม่เลย, 1 บางครั้ง, 2 บ่อยครั้ง, 3 เกือบตลอดเวลา
 * คะแนนที่ใช้เทียบเกณฑ์ = (ผลรวมดิบของแต่ละด้าน) × 2
 */

/** หมายเลขข้อ (1-based) ตามมาตรฐาน DASS-21 */
export const DASS21_DEPRESSION_Q = [3, 5, 10, 13, 16, 17, 21] as const
export const DASS21_ANXIETY_Q = [2, 4, 7, 9, 15, 19, 20] as const
export const DASS21_STRESS_Q = [1, 6, 8, 11, 12, 14, 18] as const

export type DassSeverity =
  | 'normal'
  | 'mild'
  | 'moderate'
  | 'severe'
  | 'extremely_severe'

export type DassSubscaleResult = {
  /** ผลรวมดิบ 0–21 (7 ข้อ × 0–3) */
  raw: number
  /** คะแนนที่นำไปเทียบเกณฑ์ = raw × 2 */
  doubled: number
  severity: DassSeverity
  /** ข้อความระดับภาษาไทย */
  labelTh: string
}

export type Dass21Result = {
  depression: DassSubscaleResult
  anxiety: DassSubscaleResult
  stress: DassSubscaleResult
}

const SEVERITY_LABELS: Record<DassSeverity, string> = {
  normal: 'ปกติ',
  mild: 'เล็กน้อย',
  moderate: 'ปานกลาง',
  severe: 'รุนแรง',
  extremely_severe: 'รุนแรงมาก',
}

function sumForQuestions(
  answers: readonly (number | null | undefined)[],
  questionNumbers1Based: readonly number[],
): number {
  let s = 0
  for (const q of questionNumbers1Based) {
    const v = answers[q - 1]
    if (v === null || v === undefined) continue
    const n = Number(v)
    if (Number.isNaN(n) || n < 0 || n > 3) continue
    s += n
  }
  return s
}

export function getSeverityDepressionInfo(doubled: number): { severity: DassSeverity; labelTh: string; color: string } {
  if (doubled <= 9) return { severity: 'normal', labelTh: 'ปกติ', color: '#166534' }
  if (doubled <= 13) return { severity: 'mild', labelTh: 'เล็กน้อย', color: '#0369a1' }
  if (doubled <= 20) return { severity: 'moderate', labelTh: 'ปานกลาง', color: '#d97706' }
  if (doubled <= 27) return { severity: 'severe', labelTh: 'รุนแรง', color: '#dc2626' }
  return { severity: 'extremely_severe', labelTh: 'รุนแรงมาก', color: '#7f1d1d' }
}

export function getSeverityAnxietyInfo(doubled: number): { severity: DassSeverity; labelTh: string; color: string } {
  if (doubled <= 7) return { severity: 'normal', labelTh: 'ปกติ', color: '#166534' }
  if (doubled <= 9) return { severity: 'mild', labelTh: 'เล็กน้อย', color: '#0369a1' }
  if (doubled <= 14) return { severity: 'moderate', labelTh: 'ปานกลาง', color: '#d97706' }
  if (doubled <= 19) return { severity: 'severe', labelTh: 'รุนแรง', color: '#dc2626' }
  return { severity: 'extremely_severe', labelTh: 'รุนแรงมาก', color: '#7f1d1d' }
}

export function getSeverityStressInfo(doubled: number): { severity: DassSeverity; labelTh: string; color: string } {
  if (doubled <= 14) return { severity: 'normal', labelTh: 'ปกติ', color: '#166534' }
  if (doubled <= 18) return { severity: 'mild', labelTh: 'เล็กน้อย', color: '#0369a1' }
  if (doubled <= 25) return { severity: 'moderate', labelTh: 'ปานกลาง', color: '#d97706' }
  if (doubled <= 33) return { severity: 'severe', labelTh: 'รุนแรง', color: '#dc2626' }
  return { severity: 'extremely_severe', labelTh: 'รุนแรงมาก', color: '#7f1d1d' }
}

export function getSeverityEqInfo(score: number): { labelTh: string; color: string } {
  if (score <= 139) return { labelTh: 'ต่ำกว่าเกณฑ์', color: '#d97706' }
  if (score <= 169) return { labelTh: 'อยู่ในเกณฑ์ปกติ', color: '#166534' }
  return { labelTh: 'สูงกว่าเกณฑ์', color: '#2563eb' }
}

function severityDepression(doubled: number): DassSeverity {
  return getSeverityDepressionInfo(doubled).severity
}

function severityAnxiety(doubled: number): DassSeverity {
  return getSeverityAnxietyInfo(doubled).severity
}

function severityStress(doubled: number): DassSeverity {
  return getSeverityStressInfo(doubled).severity
}

function pack(
  raw: number,
  doubled: number,
  severity: DassSeverity,
): DassSubscaleResult {
  return {
    raw,
    doubled,
    severity,
    labelTh: SEVERITY_LABELS[severity],
  }
}

/**
 * @param answers อาเรย์ยาว 21 — ค่าแต่ละช่อง 0–3 ตามลำดับข้อ 1→21 (null/ขาด = ไม่นับในผลรวม)
 */
export function calculateDass21(
  answers: (number | null)[] | number[],
): Dass21Result {
  const rawD = sumForQuestions(answers, DASS21_DEPRESSION_Q)
  const rawA = sumForQuestions(answers, DASS21_ANXIETY_Q)
  const rawS = sumForQuestions(answers, DASS21_STRESS_Q)

  const dD = rawD * 2
  const dA = rawA * 2
  const dS = rawS * 2

  return {
    depression: pack(rawD, dD, severityDepression(dD)),
    anxiety: pack(rawA, dA, severityAnxiety(dA)),
    stress: pack(rawS, dS, severityStress(dS)),
  }
}

/** ตรวจว่ามีคำตอบครบ 21 ข้อ (แต่ละข้อเป็นตัวเลข 0–3) */
export function isDass21Complete(answers: (number | null)[]): boolean {
  if (!Array.isArray(answers) || answers.length < 21) return false
  for (let i = 0; i < 21; i++) {
    const v = answers[i]
    if (v === null || v === undefined || v < 0 || v > 3) return false
  }
  return true
}

/** ข้อความคำถาม DASS-21 (ลำดับข้อ 1–21) — ใช้กับ UI */
export const DASS21_QUESTIONS_TH: readonly string[] = [
  'รู้สึกว่ามันเป็นเรื่องยากที่จะผ่อนคลายอารมณ์',
  'มีปฏิกิริยาตอบสนองต่อสิ่งต่างๆ มากเกินไป',
  'รู้สึกวิตกกังวลมาก',
  'รู้สึกไม่ผ่อนคลาย',
  'รู้สึกว่ามีอาการกระวนกระวายใจ',
  'รู้สึกทนไม่ได้กับอะไรก็ตามที่ขัดขวางให้ไม่สามารถทำอะไรต่อจากที่กำลังกระทำอยู่ได้',
  'รู้สึกว่าตนเองค่อนข้างมีอารมณ์ฉุนเฉียวง่าย',
  'มีอาการปากแห้ง',
  'มีอาการหายใจลำบาก',
  'มีอาการสั่นตามร่างกาย',
  'รู้สึกกังวลกับเหตุการณ์ที่อาจทำให้รู้สึกตื่นกลัวและกระทำสิ่งใดโดยมิได้คิด',
  'รู้สึกมีอาการคล้ายกับอาการหวั่นวิตก',
  'รับรู้ถึงการทำงานของหัวใจในตอนที่ไม่ได้ออกแรง',
  'รู้สึกกลัวโดยไม่มีเหตุผล',
  'รู้สึกไม่ดีเลย',
  'รู้สึกทำกิจกรรมด้วยตนเองได้ค่อนข้างลำบาก',
  'รู้สึกว่าตนเองไม่มีเป้าหมาย',
  'รู้สึกจิตใจเหงาหงอยและเศร้าซึม',
  'ไม่รู้สึกกระตือรือร้นต่อสิ่งใด',
  'รู้สึกเป็นคนไม่มีคุณค่า',
  'รู้สึกว่าชีวิตไม่มีความหมาย',
]

/** ป้ายตัวเลือก (ค่า 0–3) */
export const DASS21_CHOICES_TH: readonly string[] = [
  'ไม่เลย',
  'บางครั้ง',
  'บ่อยครั้ง',
  'เกือบตลอดเวลา',
]

export type RiskLevelInfo = {
  status: string
  bgColor: string
  color: string
}

/**
  * คำนวณระดับความเสี่ยงภาพรวมตามเกณฑ์ DASS-21 (Depression, Anxiety, Stress)
  */
export function calculateOverallRiskStatus(
  dScore: number,
  aScore: number,
  sScore: number,
  stressLevel?: string
): RiskLevelInfo {
  const lvl = stressLevel || ''

  // 1. Extremely Severe (Extremely High Risk)
  if (dScore >= 28 || aScore >= 20 || sScore >= 34 || lvl.includes('รุนแรงมาก') || lvl.includes('Extremely Severe')) {
    return {
      status: 'Extremely High Risk 🚨',
      bgColor: '#fee2e2',
      color: '#7f1d1d',
    }
  }

  // 2. Severe (High Risk)
  if (dScore >= 21 || aScore >= 15 || sScore >= 26 || lvl.includes('รุนแรง') || lvl.includes('Severe')) {
    return {
      status: 'High Risk 🔴',
      bgColor: '#fee2e2',
      color: '#991b1b',
    }
  }

  // 3. Moderate (Moderate Risk)
  if (dScore >= 14 || aScore >= 10 || sScore >= 19 || lvl.includes('ปานกลาง') || lvl.includes('Moderate')) {
    return {
      status: 'Moderate Risk 🟡',
      bgColor: '#fef3c7',
      color: '#92400e',
    }
  }

  // 4. Mild (Mild Risk)
  if (dScore >= 10 || aScore >= 8 || sScore >= 15 || lvl.includes('เล็กน้อย') || lvl.includes('Mild')) {
    return {
      status: 'Mild Risk 🔵',
      bgColor: '#e0f2fe',
      color: '#0369a1',
    }
  }

  // 5. Normal (Low Risk)
  return {
    status: 'Low Risk 🟢',
    bgColor: '#dcfce7',
    color: '#166534',
  }
}

export function getStatusBadgeStyle(status: string) {
  if (status.includes('Extremely High')) {
    return { backgroundColor: '#fee2e2', color: '#7f1d1d' }
  }
  if (status.includes('High Risk') || status.includes('รุนแรง')) {
    return { backgroundColor: '#fee2e2', color: '#991b1b' }
  }
  if (status.includes('Moderate Risk') || status.includes('ปานกลาง') || status.includes('เฝ้าระวัง')) {
    return { backgroundColor: '#fef3c7', color: '#92400e' }
  }
  if (status.includes('Mild Risk') || status.includes('เล็กน้อย')) {
    return { backgroundColor: '#e0f2fe', color: '#0369a1' }
  }
  if (status.includes('Low Risk') || status.includes('ปกติ') || status.includes('ทำแบบประเมินแล้ว')) {
    return { backgroundColor: '#dcfce7', color: '#166534' }
  }
  return { backgroundColor: '#f1f5f9', color: '#475569' }
}

