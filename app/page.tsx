import Dashboard from '@/components/Dashboard'

export default function Home() {
  return <Dashboard environmentUrl={process.env.DT_ENV_URL} />
}
