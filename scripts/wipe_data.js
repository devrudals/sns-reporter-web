const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually since dotenv might not be available globally in the shell easily
const envPath = path.resolve(__dirname, '../.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

let url = '';
let key = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    url = line.split('=')[1].trim();
  }
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    key = line.split('=')[1].trim();
  }
});

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function wipeData() {
  console.log("Starting data wipe...");

  // 1. Delete all rows from contents table
  console.log("Deleting all records from 'contents' table...");
  const { error: contentsError } = await supabase
    .from('contents')
    .delete()
    .neq('id', 0); // Delete all rows

  if (contentsError) {
    console.error("Failed to delete contents:", contentsError);
  } else {
    console.log("Successfully deleted all contents.");
  }

  // 2. Delete all rows from final_works table (if exists, but we saw it in check_schema? Let's check table list)
  // Wait, check_schema.js printed only contents table? The schema had 'title', 'author_name', 'status' which looks like contents table.
  // The app uses contents table for both proposal and final_work, wait!
  // In `src/app/api/upload/route.ts` it uploads to `final_works` storage bucket.
  
  // Let's empty the storage bucket 'final_works'
  console.log("Fetching files from 'final_works' storage bucket...");
  const { data: files, error: listError } = await supabase.storage.from('final_works').list();
  
  if (listError) {
    console.error("Failed to list files in bucket:", listError);
  } else if (files && files.length > 0) {
    const filePaths = files.map(f => f.name);
    console.log(`Deleting ${filePaths.length} files from 'final_works' bucket...`);
    const { error: removeError } = await supabase.storage.from('final_works').remove(filePaths);
    if (removeError) {
      console.error("Failed to delete files:", removeError);
    } else {
      console.log("Successfully deleted all files from storage.");
    }
  } else {
    console.log("No files found in storage.");
  }

  console.log("Data wipe complete.");
}

wipeData();
