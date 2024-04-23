const rcedit = require('rcedit');
const { argv } = require('node:process');

(async()=>{
  const exePath = argv[2]||'demo.exe';
  const iconPath = argv[3]||'favicon.ico';
  await rcedit(exePath, {'icon':iconPath})
})();

