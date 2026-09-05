import {readFile} from 'node:fs/promises'

const [index,lab,play,boot]=await Promise.all([
  readFile('index.html','utf8'),
  readFile('lab.html','utf8'),
  readFile('src/main-play.ts','utf8'),
  readFile('src/boot-play.ts','utf8'),
])
const checks=[
  ['首页是 Play Mode',index.includes('小小世界 · Play Mode')],
  ['首页启动 play bootloader',index.includes('/src/boot-play.ts')&&!index.includes('/src/boot-v22.ts')],
  ['首页包含 3D canvas',index.includes('id="scene"')],
  ['首页包含玩具交互区',index.includes('id="toyGrid"')],
  ['首页包含角色状态区',index.includes('id="brain"')],
  ['首页可进入实验室',index.includes('/lab.html')],
  ['V22 实验室独立保留',lab.includes('/src/boot-v22.ts')&&lab.includes('V22')],
  ['Play runtime 创建 WebGLRenderer',play.includes('new THREE.WebGLRenderer')],
  ['Play runtime 创建两个角色',play.includes("makeAgent('陶陶'")&&play.includes("makeAgent('沫沫'" )],
  ['Play runtime 使用 V16 策略评分',play.includes('toyStrategyScore')&&play.includes('socialStrategyScore')],
  ['Play boot 有可见失败兜底',boot.includes('可玩模式启动失败')],
] as const
for(const [name,pass] of checks)console.log(`${pass?'✓':'✗'} ${name}`)
const failed=checks.filter(([,pass])=>!pass)
if(failed.length)throw new Error(`Play Mode contract failed: ${failed.map(([name])=>name).join(', ')}`)
