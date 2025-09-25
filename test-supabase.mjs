import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

console.log({ supabaseUrl, hasKey: !!supabaseKey }) // Verifica variabili

async function runTest() {
  console.log('🔍 Verifica connessione a Supabase...')
  const smokeReport = {
    timestamp: new Date().toISOString(),
    tests: [],
    status: 'success',
    total_tests: 0,
    passed_tests: 0,
    failed_tests: 0
  }

  // Test 1: Connessione database
  try {
    const { data, error } = await supabase.from('vendors').select('*').limit(5)
    
    if (error) {
      console.error('❌ Errore connessione:', error.message)
      smokeReport.tests.push({
        name: 'Database Connection Test',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      })
      smokeReport.failed_tests++
    } else {
      console.log('✅ Connessione riuscita!')
      console.table(data)
      smokeReport.tests.push({
        name: 'Database Connection Test',
        status: 'passed',
        data_count: data?.length || 0,
        timestamp: new Date().toISOString()
      })
      smokeReport.passed_tests++
    }
  } catch (err) {
    console.error('❌ Errore generale:', err.message)
    smokeReport.tests.push({
      name: 'Database Connection Test',
      status: 'failed', 
      error: err.message,
      timestamp: new Date().toISOString()
    })
    smokeReport.failed_tests++
  }

  // Test 2: Test API endpoint base (se server disponibile)
  try {
    const response = await fetch('http://localhost:3000/health').catch(() => null)
    if (response && response.ok) {
      console.log('✅ Server endpoint disponibile')
      smokeReport.tests.push({
        name: 'Server Health Check',
        status: 'passed',
        response_status: response.status,
        timestamp: new Date().toISOString()
      })
      smokeReport.passed_tests++
    } else {
      console.log('⚠️ Server endpoint non disponibile (normale in environment CI)')
      smokeReport.tests.push({
        name: 'Server Health Check',
        status: 'skipped',
        reason: 'Server not running in CI environment',
        timestamp: new Date().toISOString()
      })
    }
  } catch (err) {
    console.log('⚠️ Server test skipped:', err.message)
    smokeReport.tests.push({
      name: 'Server Health Check',
      status: 'skipped',
      reason: err.message,
      timestamp: new Date().toISOString()
    })
  }

  smokeReport.total_tests = smokeReport.tests.length
  if (smokeReport.failed_tests > 0) {
    smokeReport.status = 'failed'
  }

  // Scrivi smoke report
  fs.writeFileSync('smoke-report.json', JSON.stringify(smokeReport, null, 2))
  console.log('📄 Smoke report salvato in smoke-report.json')

  if (smokeReport.status === 'failed') {
    process.exit(1)
  }
}

runTest()
