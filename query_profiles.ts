import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://plbkxsutiixhhqnndrsy.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_U-35oLEPCPMdwJLMfiB6og_6E4qDaf6';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- ALL PROFILES ---');
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
  if (pError) console.error('Error fetching profiles:', pError);
  else console.log(JSON.stringify(profiles, null, 2));

  console.log('--- ALL PATIENTS ---');
  const { data: patients, error: patError } = await supabase.from('patients').select('*').limit(5);
  if (patError) console.error('Error fetching patients:', patError);
  else console.log(JSON.stringify(patients, null, 2));
}

run();
