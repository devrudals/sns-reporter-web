const fs = require('fs');

const dashboardPath = 'src/app/(authenticated)/dashboard/page.tsx';
let dashboard = fs.readFileSync(dashboardPath, 'utf8');

if (!dashboard.includes('gte(')) {
  const target = `    .neq('status', 'draft')
    .order('created_at', { ascending: false });`;
  
  const replace = `    .neq('status', 'draft')
    .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });`;
    
  dashboard = dashboard.replace(target, replace);
  fs.writeFileSync(dashboardPath, dashboard);
  console.log('Dashboard query optimized.');
}

const contentsPath = 'src/app/(authenticated)/contents/page.tsx';
if (fs.existsSync(contentsPath)) {
  let contents = fs.readFileSync(contentsPath, 'utf8');
  if (!contents.includes('gte(')) {
    const target = `    .neq('status', 'draft')
    .order('created_at', { ascending: false });`;
    
    const replace = `    .neq('status', 'draft')
    .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });`;
      
    contents = contents.replace(target, replace);
    fs.writeFileSync(contentsPath, contents);
    console.log('Contents query optimized.');
  }
}
