'use client'

import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import styles from './GraphDetail.module.css'

type GraphKey = 'vykonnost' | 'dochazka' | 'slozeni'

type GraphDetailProps = {
  graph: GraphKey
  trendData: Array<{ month: string; trend: number; attendance: number }>
  attendanceData: Array<{ month: string; value: number }>
  compositionData: Array<{ name: string; value: number }>
}

export default function GraphDetail({ graph, trendData, attendanceData, compositionData }: GraphDetailProps) {
  if (graph === 'vykonnost') {
    return (
      <section className={styles.wrap}>
        <div className={styles.head}>
          <div>
            <h2 className={styles.title}>Výkonnostní trend týmu</h2>
            <p className={styles.desc}>Detailní pohled na simulaci formy a docházky v čase.</p>
          </div>
          <Link href="/grafy" className={styles.back}>Zpět na grafy</Link>
        </div>
        <div className={styles.chartPad}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--color-text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }} />
              <Line dataKey="attendance" stroke="var(--color-text-muted)" strokeWidth={2} dot={false} />
              <Line dataKey="trend" stroke="var(--color-primary)" strokeWidth={2.4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    )
  }

  if (graph === 'dochazka') {
    return (
      <section className={styles.wrap}>
        <div className={styles.head}>
          <div>
            <h2 className={styles.title}>Docházka podle měsíců</h2>
            <p className={styles.desc}>Měsíční průběh zapojení hráčů do tréninkového procesu.</p>
          </div>
          <Link href="/grafy" className={styles.back}>Zpět na grafy</Link>
        </div>
        <div className={styles.chartPad}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendanceData} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--color-text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }} />
              <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    )
  }

  const pieData = compositionData.map((item, i) => ({
    ...item,
    fill: i === 0 ? 'var(--color-primary)' : 'var(--color-primary-muted)',
  }))

  return (
    <section className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Složení týmu</h2>
          <p className={styles.desc}>Podíl hráčů a vedení v aktuální soupisce klubu.</p>
        </div>
        <Link href="/grafy" className={styles.back}>Zpět na grafy</Link>
      </div>
      <div className={styles.chartPad}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={110} outerRadius={170} stroke="transparent" paddingAngle={3} />
            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
