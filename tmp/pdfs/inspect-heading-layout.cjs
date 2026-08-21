const path = require('path');
const { chromium } = require('playwright');
(async()=>{
  const file = path.resolve(__dirname,'iris-feature-catalog-qa/iris-os-end-user-feature-catalog.html');
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:816,height:1056}});
  await page.goto('file:///'+file.replace(/\\/g,'/'));
  const rows=await page.evaluate(()=>[...document.querySelectorAll('.page h2')].map((el,i)=>({i:i+1,text:el.textContent,rect:(()=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})(),style:{fontSize:getComputedStyle(el).fontSize,whiteSpace:getComputedStyle(el).whiteSpace,overflow:getComputedStyle(el).overflow}})));
  console.log(JSON.stringify(rows,null,2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
