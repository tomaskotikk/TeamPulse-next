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
          <Link href="/dashboard" className={styles.back}>Zpět na dashboard</Link>
        </div>
        <div className={styles.chartPad}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.09)" strokeDasharray="4 4" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }} />
              <Line dataKey="attendance" stroke="rgba(var(--red-rgb, 255, 51, 0), 0.45)" strokeWidth={2.3} dot={false} />
              <Line dataKey="trend" stroke="var(--red)" strokeWidth={3.2} dot={false} />
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
          <Link href="/dashboard" className={styles.back}>Zpět na dashboard</Link>
        </div>
        <div className={styles.chartPad}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendanceData} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }} />
              <Bar dataKey="value" fill="var(--red-dark)" radius={[8, 8, 3, 3]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    )
  }

  const pieData = compositionData.map((item, i) => ({
    ...item,
    fill: i === 0 ? 'var(--red)' : 'rgba(var(--red-rgb, 255, 51, 0), 0.45)',
  }))

  return (
    <section className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Složení týmu</h2>
          <p className={styles.desc}>Podíl hráčů a vedení v aktuální soupisce klubu.</p>
        </div>
        <Link href="/dashboard" className={styles.back}>Zpět na dashboard</Link>
      </div>
      <div className={styles.chartPad}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={110} outerRadius={170} stroke="transparent" paddingAngle={3} />
            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
