import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

console.log({ supabaseUrl, hasKey: !!supabaseKey }) // Verifica variabili

async function runTest() {
  console.log('🔍 Verifica connessione a Supabase...')
  const { data, error } = await supabase.from('vendors').select('*').limit(5)

  if (error) {
    console.error('❌ Errore:', error.message)
  } else {
    console.log('✅ Connessione riuscita!')
    console.table(data)
  }
}

runTest()
