import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import './style.css'

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!
const statusText = document.querySelector<HTMLElement>('#statusText')!
const toyButtons = document.querySelector<HTMLElement>('#toyButtons')!
const toast = document.querySelector<HTMLElement>('#toast')!
const dayButton = document.querySelector<HTMLButtonElement>('#dayButton')!
const pauseButton = document.querySelector<HTMLButtonElement>('#pauseButton')!
const resetButton = document.querySelector<HTMLButtonElement>('#resetButton')!
const cinemaButton = document.querySelector<HTMLButtonElement>('#cinemaButton')!
const autoBadge = document.querySelector<HTMLElement>('#autoBadge')!

const C = {
  white: 0xfffbf3, sand: 0xe8d8bd, peach: 0xf2aa83, coral: 0xe98269,
  butter: 0xf1cc72, sage: 0xa9bda0, mint: 0xa8cfc1, sky: 0x94b9cf,
  blue: 0x6d8fa3, lavender: 0xb4a9c9, cocoa: 0x8a6a58, dark: 0x403a36,
  pink: 0xf58fa1,
}

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xf4ead9)
scene.fog = new THREE.FogExp2(0xf4ead9, .021)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.02

const camera = new THREE.PerspectiveCamera(33, innerWidth / innerHeight, .1, 100)
const cameraHome = new THREE.Vector3(12.4, 9.6, 14.2)
camera.position.copy(cameraHome)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 1.3, 0)
controls.enableDamping = true
controls.dampingFactor = .055
controls.minDistance = 7.2
controls.maxDistance = 25
controls.maxPolarAngle = Math.PI * .495
controls.enablePan = false
controls.autoRotate = true
controls.autoRotateSpeed = .2
controls.update()

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .16, .58, .9)
composer.addPass(bloom)

const hemi = new THREE.HemisphereLight(0xfff8e8, 0x93a09c, 2.4)
const sun = new THREE.DirectionalLight(0xffdfb4, 4.3)
sun.position.set(-6.5, 11, 7.5)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = -12
sun.shadow.camera.right = 12
sun.shadow.camera.top = 12
sun.shadow.camera.bottom = -12
const fill = new THREE.PointLight(0xbadcf1, 6, 11, 2)
fill.position.set(5.4, 5.1, 1.6)
const lamp = new THREE.PointLight(0xffc578, 5, 5.5, 2)
lamp.position.set(5.45, 1.72, -3.45)
scene.add(hemi, sun, fill, lamp)

function mat(color: number, roughness = .74) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })
}
function box(w: number, h: number, d: number, color: number, radius = .12, roughness = .74) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 5, Math.min(radius, w / 2, h / 2, d / 2)), mat(color, roughness))
  m.castShadow = true
  m.receiveShadow = true
  return m
}
function sphere(r: number, color: number, roughness = .72) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 30, 22), mat(color, roughness))
  m.castShadow = true
  m.receiveShadow = true
  return m
}
function cylinder(r: number, h: number, color: number) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), mat(color))
  m.castShadow = true
  m.receiveShadow = true
  return m
}
function shadow(r: number, opacity = .12) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ color: 0x5b4537, transparent: true, opacity, depthWrite: false }))
  m.rotation.x = -Math.PI / 2
  m.position.y = .13
  return m
}

const world = new THREE.Group()
scene.add(world)
const floor = box(13.2, .36, 11.5, C.sand, .28, .92)
floor.position.y = -.28
world.add(floor)
const tileColors = [C.peach, C.butter, C.mint, C.sky, C.lavender, 0xe9c4a4]
for (let x = -3; x <= 3; x += 1) for (let z = -2; z <= 2; z += 1) {
  const t = box(1.48, .12, 1.48, tileColors[(x + z + 20) % tileColors.length], .13, .9)
  t.position.set(x * 1.48, .02, z * 1.48 + .28)
  world.add(t)
}
const backWall = box(13.2, 5.6, .32, C.white, .16, .96)
backWall.position.set(0, 2.45, -5.7)
const leftWall = box(.32, 5.6, 11.5, 0xf7efe1, .16, .96)
leftWall.position.set(-6.6, 2.45, 0)
world.add(backWall, leftWall)

const outside = new THREE.Group()
outside.position.set(-2.75, 3.35, -5.42)
world.add(outside)
const sky = new THREE.Mesh(new THREE.PlaneGeometry(3.56, 2.22), new THREE.MeshBasicMaterial({ color: 0x9fd2ef }))
outside.add(sky)
const sunMoon = sphere(.22, 0xffd879, .8)
sunMoon.position.set(1.05, .55, .08)
outside.add(sunMoon)
const clouds: THREE.Group[] = []
for (let i = 0; i < 5; i += 1) {
  const g = new THREE.Group()
  ;[[0,0,.15],[.17,-.01,.12],[-.16,-.02,.11]].forEach(([x,y,r]) => {
    const p = sphere(r, C.white, 1)
    p.position.set(x,y,0)
    g.add(p)
  })
  g.position.set(-1.5 + i * .75, .36 - (i % 2) * .3, .1)
  clouds.push(g)
  outside.add(g)
}
const birds: THREE.Group[] = []
for (let i = 0; i < 3; i += 1) {
  const g = new THREE.Group()
  const wm = new THREE.MeshBasicMaterial({ color: 0x647587, side: THREE.DoubleSide })
  const a = new THREE.Mesh(new THREE.PlaneGeometry(.16,.035), wm)
  const b = a.clone()
  a.position.x = -.07
  b.position.x = .07
  g.add(a,b)
  g.position.set(-1.4 - i * .7, .05 + i * .22, .12)
  birds.push(g)
  outside.add(g)
}
const frame = box(4.05, 2.72, .14, C.white, .1)
frame.position.set(-2.75, 3.35, -5.2)
world.add(frame)
const crossH = box(3.64,.08,.08,C.white,.04)
crossH.position.set(-2.75,3.35,-5.1)
const crossV = box(.08,2.25,.08,C.white,.04)
crossV.position.set(-2.75,3.35,-5.1)
world.add(crossH,crossV)

const shelf = box(3.35,1.52,.82,0xd8b68f,.18)
shelf.position.set(3.78,.78,-5.03)
world.add(shelf)
const couch = new THREE.Group()
const seat = box(2.65,.56,1.35,0xc9b6d8,.28,.92)
seat.position.y=.52
const couchBack = box(2.65,1.28,.5,0xb3a0c6,.28,.93)
couchBack.position.set(0,1.12,-.47)
couch.add(seat,couchBack)
couch.position.set(4.42,.08,2.72)
couch.rotation.y=-.22
world.add(couch)
const lampBase = cylinder(.28,.18,C.cocoa)
lampBase.position.set(5.45,.27,-3.75)
const lampStem = cylinder(.055,1.3,C.cocoa)
lampStem.position.set(5.45,.98,-3.75)
const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(.3,.52,.64,30),mat(C.butter))
lampShade.position.set(5.45,1.68,-3.75)
world.add(lampBase,lampStem,lampShade)

type Obstacle = { minX:number; maxX:number; minZ:number; maxZ:number }
const obstacles: Obstacle[] = [
  { minX:2.2,maxX:5.5,minZ:-5.6,maxZ:-4.3 },
  { minX:3.0,maxX:5.8,minZ:1.65,maxZ:3.75 },
  { minX:4.95,maxX:5.9,minZ:-4.45,maxZ:-3.1 },
]

const castle = new THREE.Group()
const ladderBase = new THREE.Vector3(-2.78,.2,-2.48)
const ladderTop = new THREE.Vector3(-2.95,2.38,-3.13)
const bridgeEnd = new THREE.Vector3(-4.35,2.38,-3.22)
const slideEnd = new THREE.Vector3(-4.85,.2,-1.78)
{
  const platform = box(2.35,.22,1.55,C.mint,.14)
  platform.position.set(0,2.2,0)
  castle.add(platform)
  for (const x of [-.9,.9]) {
    const tower = box(.72,2.35,.72,x<0?C.peach:C.sky,.2)
    tower.position.set(x,1.17,-.18)
    castle.add(tower)
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.55,.78,4),mat(x<0?C.coral:C.blue))
    cap.rotation.y=Math.PI/4
    cap.position.set(x,2.72,-.18)
    castle.add(cap)
  }
  for (let i=0;i<5;i+=1) {
    const rung=box(.6,.08,.09,C.cocoa,.04)
    rung.position.set(.92,.5+i*.36,.62)
    castle.add(rung)
  }
  const slideCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-.9,2.26,.45),new THREE.Vector3(-1.15,1.8,.75),new THREE.Vector3(-1.22,1.02,1.05),new THREE.Vector3(-1.05,.35,1.55)])
  const slide = new THREE.Mesh(new THREE.TubeGeometry(slideCurve,40,.24,14,false),mat(C.butter,.48))
  slide.castShadow=true
  castle.add(slide)
  castle.position.set(-3.8,.05,-3.55)
  world.add(castle)
  obstacles.push({ minX:-5.35,maxX:-2.55,minZ:-4.65,maxZ:-2.35 })
}

const GRID=.45, MIN_X=-5.75, MAX_X=5.75, MIN_Z=-4.85, MAX_Z=4.85
const cols=Math.floor((MAX_X-MIN_X)/GRID)+1, rows=Math.floor((MAX_Z-MIN_Z)/GRID)+1
function toGrid(v:THREE.Vector3){return{x:THREE.MathUtils.clamp(Math.round((v.x-MIN_X)/GRID),0,cols-1),z:THREE.MathUtils.clamp(Math.round((v.z-MIN_Z)/GRID),0,rows-1)}}
function toWorld(x:number,z:number){return new THREE.Vector3(MIN_X+x*GRID,.2,MIN_Z+z*GRID)}
function blocked(x:number,z:number){return obstacles.some(o=>x>o.minX-.34&&x<o.maxX+.34&&z>o.minZ-.34&&z<o.maxZ+.34)}
function findPath(from:THREE.Vector3,to:THREE.Vector3){
  const s=toGrid(from),g=toGrid(to),key=(x:number,z:number)=>`${x},${z}`
  const open=new Set([key(s.x,s.z)]),came=new Map<string,string>(),score=new Map([[key(s.x,s.z),0]]),pos=new Map<string,{x:number;z:number}>([[key(s.x,s.z),s]])
  let guard=0
  while(open.size&&guard++<5000){
    let ck='',best=Infinity
    for(const k of open){const p=pos.get(k)!;const q=(score.get(k)??9999)+Math.abs(p.x-g.x)+Math.abs(p.z-g.z);if(q<best){best=q;ck=k}}
    const c=pos.get(ck)!
    if(c.x===g.x&&c.z===g.z){const out:THREE.Vector3[]=[];let k=ck;while(k!==key(s.x,s.z)){const p=pos.get(k)!;out.unshift(toWorld(p.x,p.z));k=came.get(k)!}if(out.length)out[out.length-1].copy(to).setY(.2);return out}
    open.delete(ck)
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]] as const){const nx=c.x+dx,nz=c.z+dz;if(nx<0||nx>=cols||nz<0||nz>=rows)continue;const wp=toWorld(nx,nz);const goal=nx===g.x&&nz===g.z;if(!goal&&blocked(wp.x,wp.z))continue;const nk=key(nx,nz),ns=(score.get(ck)??9999)+1;if(ns>=(score.get(nk)??9999))continue;came.set(nk,ck);score.set(nk,ns);pos.set(nk,{x:nx,z:nz});open.add(nk)}
  }
  return [to.clone().setY(.2)]
}

type Toy={key:string;label:string;emoji:string;group:THREE.Group;target:()=>THREE.Vector3}
const toys:Toy[]=[]
function registerToy(key:string,label:string,emoji:string,group:THREE.Group,target:()=>THREE.Vector3){group.traverse(o=>o.userData.toyKey=key);world.add(group);toys.push({key,label,emoji,group,target})}
castle.traverse(o=>o.userData.toyKey='castle')
toys.push({key:'castle',label:'城堡滑梯',emoji:'♜',group:castle,target:()=>ladderBase.clone()})

const blockGroup=new THREE.Group()
blockGroup.position.set(-3.75,.11,2.72)
world.add(blockGroup)
const blocks:THREE.Mesh[]=[]
const looseVelocity=new Map<THREE.Mesh,THREE.Vector3>()
;[C.coral,C.butter,C.sky,C.mint,C.lavender].forEach((color,i)=>{
  const b=box(.48,.48,.48,color,.09)
  const homes=[[-.45,.25,0],[.05,.25,.08],[.5,.25,0],[-.2,.75,.04],[.3,.75,.02]]
  b.position.set(homes[i][0],homes[i][1],homes[i][2])
  b.userData.status='home'
  b.userData.stackIndex=-1
  blocks.push(b)
  blockGroup.add(b)
})
blockGroup.traverse(o=>o.userData.toyKey='blocks')
toys.push({key:'blocks',label:'积木',emoji:'▦',group:blockGroup,target:()=>new THREE.Vector3(-3.05,.2,2.35)})
const buildSpot=new THREE.Vector3(-1.55,.18,2.45)
let towerCount=0

const ballGroup=new THREE.Group()
const ballVelocity=new THREE.Vector3()
const ball=sphere(.36,0xf2bf79,.48)
ballGroup.add(ball,shadow(.34,.14))
ballGroup.position.set(2.05,.47,.85)
registerToy('ball','软球','○',ballGroup,()=>ballGroup.position.clone().setY(.2))

const jellyGroup=new THREE.Group()
const jellyHome=new THREE.Vector3(.55,.04,3.62)
jellyGroup.position.copy(jellyHome)
const jellyGeo=new THREE.SphereGeometry(.64,36,28)
const jellyBase=new Float32Array(jellyGeo.attributes.position.array as ArrayLike<number>)
const jellyMesh=new THREE.Mesh(jellyGeo,new THREE.MeshPhysicalMaterial({color:C.pink,roughness:.045,transmission:.86,transparent:true,opacity:.9,ior:1.31,thickness:1.7,clearcoat:1}))
jellyMesh.position.y=.72
jellyGroup.add(jellyMesh,shadow(.62,.15))
registerToy('jelly','果冻','●',jellyGroup,()=>new THREE.Vector3(.3,.2,2.7))
let jellyImpulse=0,jellyVel=0
const jellyDrift=new THREE.Vector3(),jellyDriftVel=new THREE.Vector3()

const trainGroup=new THREE.Group(),trainBody=new THREE.Group()
trainGroup.position.set(-.65,.02,-2.6)
const trainBase=box(1.35,.5,.66,C.coral,.13)
trainBase.position.y=.48
trainBody.add(trainBase)
trainGroup.add(trainBody)
const track=new THREE.Mesh(new THREE.TorusGeometry(1.66,.045,10,64),mat(C.cocoa))
track.rotation.x=Math.PI/2
track.scale.z=.63
track.position.y=.14
trainGroup.add(track)
registerToy('train','小火车','◉',trainGroup,()=>new THREE.Vector3(.35,.2,-1.95))

const musicGroup=new THREE.Group()
const musicBars:THREE.Mesh[]=[]
musicGroup.position.set(4.2,.04,-.6)
for(let i=0;i<6;i+=1){const b=box(.23,.14,.7-i*.045,tileColors[i],.05);b.position.set(-.72+i*.29,.33,0);musicBars.push(b);musicGroup.add(b)}
registerToy('music','木琴','≋',musicGroup,()=>new THREE.Vector3(3.42,.2,-.38))

const booksGroup=new THREE.Group()
booksGroup.position.set(-5,.02,-.35)
for(let i=0;i<3;i+=1){const b=box(1,.11,.72,[C.sky,C.butter,C.coral][i],.05);b.position.set(i*.05,.16+i*.12,0);booksGroup.add(b)}
registerToy('books','绘本','▤',booksGroup,()=>new THREE.Vector3(-4.15,.2,-.15))

type AgentState='idle'|'walking'|'playing'|'pickup'|'carry'|'stack'|'chase'|'castle'|'wave'|'wait'|'tag'|'ballPass'
type Agent={name:string;group:THREE.Group;root:THREE.Group;leftArm:THREE.Group;rightArm:THREE.Group;leftLeg:THREE.Group;rightLeg:THREE.Group;hand:THREE.Group;eyes:THREE.Mesh[];path:THREE.Vector3[];pathIndex:number;state:AgentState;timer:number;targetToy:Toy|null;held:THREE.Mesh|null;assignedBlock:THREE.Mesh|null;castlePhase:number;castleTime:number}
function createAgent(name:string,color:number,skin:number,hair:number,start:THREE.Vector3,accent:number):Agent{
  const group=new THREE.Group(),root=new THREE.Group()
  group.add(root,shadow(.55,.13))
  group.position.copy(start)
  const torso=box(.68,.92,.5,color,.26)
  torso.position.y=1.02
  root.add(torso)
  const bib=box(.48,.54,.515,accent,.14)
  bib.position.set(0,.98,.025)
  root.add(bib)
  const head=sphere(.45,skin,.78)
  head.position.y=1.78
  root.add(head)
  const cap=new THREE.Mesh(new THREE.SphereGeometry(.46,30,18,0,Math.PI*2,0,Math.PI*.54),mat(hair,.95))
  cap.position.y=1.9
  root.add(cap)
  const eyes:THREE.Mesh[]=[]
  for(const x of [-.16,.16]){const e=sphere(.038,C.dark);e.position.set(x,1.79,.42);eyes.push(e);root.add(e)}
  const leftArm=new THREE.Group(),rightArm=new THREE.Group()
  leftArm.position.set(-.4,1.3,0)
  rightArm.position.set(.4,1.3,0)
  for(const p of [leftArm,rightArm]){const a=cylinder(.09,.72,skin);a.position.y=-.35;p.add(a);root.add(p)}
  const leftLeg=new THREE.Group(),rightLeg=new THREE.Group()
  leftLeg.position.set(-.18,.62,0)
  rightLeg.position.set(.18,.62,0)
  for(const p of [leftLeg,rightLeg]){const l=cylinder(.11,.62,accent);l.position.y=-.27;p.add(l);const s=box(.24,.13,.38,C.dark,.08);s.position.set(0,-.58,.08);p.add(s);root.add(p)}
  const hand=new THREE.Group()
  hand.position.set(0,1.02,.65)
  root.add(hand)
  group.userData.agentName=name
  world.add(group)
  return{name,group,root,leftArm,rightArm,leftLeg,rightLeg,hand,eyes,path:[],pathIndex:0,state:'idle',timer:0,targetToy:null,held:null,assignedBlock:null,castlePhase:-1,castleTime:0}
}
const tao:Agent=createAgent('陶陶',C.sage,0xe6b18d,0x56463f,new THREE.Vector3(-.35,.2,.55),0x728b84)
const momo:Agent=createAgent('沫沫',C.lavender,0xe8b995,0x4d403c,new THREE.Vector3(1,.2,1.15),0x7d7392)
const agents:Agent[]=[tao,momo]

let paused=false,isNight=false,cinematic=true
let follow:Agent|null=null
let idleSince=performance.now(),lastManual=performance.now()
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
let socialMode:'none'|'tag'|'pass'|'wave'='none',socialTimer=0,tagLeader:Agent=tao

function showToast(s:string){toast.textContent=s;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1450)}
function resetPose(a:Agent){a.leftArm.rotation.set(0,0,0);a.rightArm.rotation.set(0,0,0);a.leftLeg.rotation.set(0,0,0);a.rightLeg.rotation.set(0,0,0);a.root.rotation.set(0,0,0);a.root.position.y=0}
function moveAgent(a:Agent,target:THREE.Vector3,next:AgentState,toy:Toy|null=null){a.path=findPath(a.group.position,target);a.pathIndex=0;a.state='walking';a.timer=0;a.targetToy=toy;a.group.userData.nextState=next}
function blockWorldPos(b:THREE.Mesh){return b.getWorldPosition(new THREE.Vector3())}
function settledLooseBlocks(){return blocks.filter(b=>b.userData.status==='loose'&&!looseVelocity.has(b)&&b.parent===world)}
function homeBlocks(){return blocks.filter(b=>b.userData.status==='home'&&b.parent===blockGroup)}
function recoverableBlocks(){return [...settledLooseBlocks(),...homeBlocks()]}
function takeBlock(a:Agent,b:THREE.Mesh){b.updateMatrixWorld(true);b.parent?.remove(b);a.hand.add(b);b.position.set(0,0,0);b.rotation.set(.08,.08,.08);b.userData.status='held';a.held=b;a.assignedBlock=null;looseVelocity.delete(b)}
function stackBlock(a:Agent){if(!a.held)return;const b=a.held;a.hand.remove(b);world.add(b);const i=towerCount;b.position.set(buildSpot.x+(i%2)*.07,.28+i*.5,buildSpot.z+(i%2)*.04);b.rotation.set(0,(i%2)*.08,0);b.userData.status='tower';b.userData.stackIndex=i;towerCount+=1;a.held=null}
function scatterTower(origin:THREE.Vector3,impulse:THREE.Vector3){let n=0;for(const b of blocks){if(b.userData.status!=='tower'||b.parent!==world)continue;if(b.position.distanceTo(origin)>1.25)continue;b.userData.status='loose';b.userData.stackIndex=-1;const v=b.position.clone().sub(origin).setY(0);if(v.lengthSq()<.001)v.set(Math.random()-.5,0,Math.random()-.5);v.normalize().multiplyScalar(.8+Math.random());v.addScaledVector(impulse,.28);v.y=1.2+Math.random()*.8;looseVelocity.set(b,v);n+=1}towerCount=blocks.filter(b=>b.userData.status==='tower').length;if(n){statusText.textContent='哎呀，积木被撞散了！';autoBadge.textContent='发现散落积木';idleSince=performance.now()-5000}}
function pokeJelly(power=1,source?:THREE.Vector3){jellyImpulse=Math.min(1.8,jellyImpulse+.75*power);jellyVel+=power;if(source){const p=jellyGroup.position.clone().sub(source).setY(0);if(p.lengthSq()>.001)jellyDriftVel.addScaledVector(p.normalize(),.95*power)}}
function kickToward(from:Agent,target:THREE.Vector3,power=3.6){const d=target.clone().sub(ballGroup.position).setY(0);if(d.lengthSq()<.001)d.set(1,0,.3);ballVelocity.addScaledVector(d.normalize(),power);from.leftLeg.rotation.x=-1}

function startRecovery(manual=false){
  socialMode='none'
  const pool=recoverableBlocks()
  if(!pool.length){statusText.textContent='积木已经收拾好啦';idleSince=performance.now();return}
  const first=pool[0],second=pool[1]??null
  tao.assignedBlock=first
  moveAgent(tao,blockWorldPos(first).setY(.2),'pickup',toys.find(t=>t.key==='blocks')??null)
  if(second){momo.assignedBlock=second;moveAgent(momo,blockWorldPos(second).setY(.2),'pickup',toys.find(t=>t.key==='blocks')??null)}
  else moveAgent(momo,buildSpot.clone().add(new THREE.Vector3(.65,0,.2)),'wait',null)
  statusText.textContent=manual?'一起把积木收回来':'TA 们发现积木散了，先收拾房间'
  autoBadge.textContent='分工收拾积木'
}
function startBallPass(manual=false){socialMode='pass';socialTimer=0;moveAgent(tao,ballGroup.position.clone().add(new THREE.Vector3(-.6,0,0)).setY(.2),'ballPass',toys.find(t=>t.key==='ball')??null);moveAgent(momo,new THREE.Vector3(2.5,.2,-.5),'wait',null);statusText.textContent=manual?'陶陶把球传给沫沫':'TA 们决定互相传球';autoBadge.textContent='双人传球'}
function startTag(){socialMode='tag';socialTimer=0;tagLeader=Math.random()>.5?tao:momo;const runner=tagLeader===tao?momo:tao;tagLeader.state='tag';runner.state='tag';statusText.textContent=`${tagLeader.name}开始追${runner.name}`;autoBadge.textContent='追逐游戏'}
function startWave(){socialMode='wave';socialTimer=0;tao.state='wave';momo.state='wave';statusText.textContent='TA 们停下来互相招手';autoBadge.textContent='打招呼'}
function startCastle(){socialMode='none';moveAgent(tao,ladderBase.clone(),'castle',toys.find(t=>t.key==='castle')??null);moveAgent(momo,slideEnd.clone().add(new THREE.Vector3(.8,0,.4)),'wait',null);statusText.textContent='陶陶去爬城堡，沫沫在出口等';autoBadge.textContent='城堡冒险'}
function startToy(toy:Toy){
  if(toy.key==='blocks'){startRecovery(true);return}
  if(toy.key==='ball'){startBallPass(true);return}
  if(toy.key==='castle'){startCastle();return}
  socialMode='none'
  moveAgent(tao,toy.target(),'playing',toy)
  moveAgent(momo,toy.target().clone().add(new THREE.Vector3(.65,0,.35)),'playing',toy)
  statusText.textContent=`一起去玩${toy.label}`
  autoBadge.textContent=`双人 · ${toy.label}`
}

toys.forEach(toy=>{const b=document.createElement('button');b.className='toy-button';b.innerHTML=`<span>${toy.emoji}</span><b>${toy.label}</b>`;b.onclick=()=>{lastManual=performance.now();showToast(`${toy.emoji} ${toy.label}`);startToy(toy)};toyButtons.appendChild(b)})
const socialActions:Array<[string,string,()=>void]>=[['追逐','↝',startTag],['招手','⌁',startWave]]
socialActions.forEach(([label,emoji,fn])=>{const b=document.createElement('button');b.className='toy-button';b.innerHTML=`<span>${emoji}</span><b>${label}</b>`;b.onclick=()=>{lastManual=performance.now();fn()};toyButtons.appendChild(b)})

const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2()
function pointerAt(e:PointerEvent){pointer.x=e.clientX/innerWidth*2-1;pointer.y=-(e.clientY/innerHeight)*2+1}
function pickables(){return[...toys.map(t=>t.group),...agents.map(a=>a.group)]}
renderer.domElement.addEventListener('pointermove',e=>{pointerAt(e);raycaster.setFromCamera(pointer,camera);renderer.domElement.style.cursor=raycaster.intersectObjects(pickables(),true).length?'pointer':'grab'})
renderer.domElement.addEventListener('pointerup',e=>{pointerAt(e);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(pickables(),true);if(!hits.length)return;let o:THREE.Object3D|null=hits[0].object;while(o&&!o.userData.toyKey&&!o.userData.agentName)o=o.parent;if(!o)return;if(o.userData.agentName){follow=follow?.name===o.userData.agentName?null:agents.find(a=>a.name===o!.userData.agentName)??null;cinematic=true;showToast(follow?`◉ 跟随${follow.name}`:'⌂ 双人全景');return}const toy=toys.find(t=>t.key===o!.userData.toyKey);if(toy){if(toy.key==='jelly')pokeJelly(1.3,camera.position);lastManual=performance.now();startToy(toy)}})

function setNight(v:boolean){isNight=v;document.body.classList.toggle('night',v);dayButton.textContent=v?'☾':'☀︎';showToast(v?'☾ 月亮出来了':'☀︎ 太阳出来了')}
dayButton.onclick=()=>setNight(!isNight)
pauseButton.onclick=()=>{paused=!paused;pauseButton.textContent=paused?'▶':'Ⅱ';autoBadge.textContent=paused?'已暂停':'双人自主中'}
cinemaButton.onclick=()=>{cinematic=!cinematic;follow=null;cinemaButton.classList.toggle('active',cinematic)}
resetButton.onclick=()=>{camera.position.copy(cameraHome);controls.target.set(0,1.3,0);controls.autoRotate=true;follow=null;controls.update()}
controls.addEventListener('start',()=>{controls.autoRotate=false;follow=null;lastManual=performance.now()})

const tmp=new THREE.Vector3()
function walk(a:Agent,delta:number,elapsed:number){if(!a.path.length||a.pathIndex>=a.path.length)return false;const w=a.path[a.pathIndex];tmp.copy(w).sub(a.group.position);tmp.y=0;const d=tmp.length();if(d<.11){a.pathIndex+=1;if(a.pathIndex>=a.path.length){a.path=[];a.pathIndex=0;resetPose(a);a.state=(a.group.userData.nextState as AgentState|undefined)??'idle';a.timer=0;if(a.state==='castle'){a.castlePhase=0;a.castleTime=0}return false}return true}tmp.normalize();a.group.position.addScaledVector(tmp,Math.min(delta*1.65,d));a.group.rotation.y=THREE.MathUtils.lerp(a.group.rotation.y,Math.atan2(tmp.x,tmp.z),Math.min(1,delta*8));const q=elapsed*10+(a===momo?1.4:0);a.leftLeg.rotation.x=Math.sin(q)*.5;a.rightLeg.rotation.x=-Math.sin(q)*.5;a.leftArm.rotation.x=a.held?-.85:-Math.sin(q)*.42;a.rightArm.rotation.x=a.held?-.85:Math.sin(q)*.42;a.root.position.y=Math.abs(Math.sin(q))*.035;return true}
function castleAnim(a:Agent,delta:number){if(a.castlePhase<0)return false;a.castleTime+=delta;if(a.castlePhase===0){const t=THREE.MathUtils.clamp(a.castleTime/2.7,0,1);a.group.position.lerpVectors(ladderBase,ladderTop,t);const q=a.castleTime*8;a.leftArm.rotation.x=-.8+Math.sin(q)*.55;a.rightArm.rotation.x=-.8-Math.sin(q)*.55;if(t>=1){a.castlePhase=1;a.castleTime=0}return true}if(a.castlePhase===1){const t=THREE.MathUtils.clamp(a.castleTime/1.9,0,1);a.group.position.lerpVectors(ladderTop,bridgeEnd,t);if(t>=1){a.castlePhase=2;a.castleTime=0;showToast('↘ 滑下来！')}return true}const t=THREE.MathUtils.clamp(a.castleTime/2.25,0,1),p1=new THREE.Vector3(-5,1.65,-2.62),aa=bridgeEnd.clone().lerp(p1,t),bb=p1.clone().lerp(slideEnd,t);a.group.position.copy(aa.lerp(bb,t));a.root.rotation.x=-.22;a.leftArm.rotation.x=-1.15;a.rightArm.rotation.x=-1.15;if(t>=1){a.castlePhase=-1;a.state='idle';resetPose(a);a.group.position.copy(slideEnd);idleSince=performance.now()}return true}

function animateAgent(a:Agent,delta:number,elapsed:number){
  if(walk(a,delta,elapsed)||castleAnim(a,delta))return
  a.timer+=delta
  const sway=Math.sin(elapsed*4+(a===momo?1.2:0))
  if(a.state==='pickup'){
    a.leftArm.rotation.x=-.9
    a.rightArm.rotation.x=-1.15
    if(a.timer>.65&&!a.held&&a.assignedBlock)takeBlock(a,a.assignedBlock)
    if(a.timer>1.0&&a.held)moveAgent(a,buildSpot.clone().add(new THREE.Vector3(a===tao?-.35:.35,0,a===tao?.25:-.25)),'stack',toys.find(t=>t.key==='blocks')??null)
    return
  }
  if(a.state==='stack'){
    a.leftArm.rotation.x=-1.05
    a.rightArm.rotation.x=-1.05
    if(a.timer>.7&&a.held){stackBlock(a);statusText.textContent=`积木塔恢复到 ${towerCount}/5`;autoBadge.textContent=`收拾 ${towerCount}/5`}
    if(a.timer>1.15){a.state='idle';a.targetToy=null;resetPose(a);if(agents.every(x=>x.state==='idle'&&!x.path.length)){if(recoverableBlocks().length)setTimeout(()=>startRecovery(false),350);else{statusText.textContent='房间收拾好啦';autoBadge.textContent='双人自主中';idleSince=performance.now()}}}
    return
  }
  if(a.state==='ballPass'){
    a.group.lookAt(ballGroup.position.x,a.group.position.y,ballGroup.position.z)
    if(a.timer>.65&&a.timer<.75){const target=a===tao?momo:tao;kickToward(a,target.group.position,3.1);showToast(`○ ${a.name}传球给${target.name}`)}
    if(a.timer>1.1){const receiver=a===tao?momo:tao;a.state='wait';moveAgent(receiver,ballGroup.position.clone().setY(.2),'ballPass',toys.find(t=>t.key==='ball')??null)}
    return
  }
  if(a.state==='tag'){
    const leader=tagLeader,runner=leader===tao?momo:tao
    if(a===runner){if(a.timer>.9){const p=a.group.position.clone().add(new THREE.Vector3(Math.sin(elapsed*1.7)*2.2,0,Math.cos(elapsed*1.3)*1.7));p.x=THREE.MathUtils.clamp(p.x,MIN_X+.5,MAX_X-.5);p.z=THREE.MathUtils.clamp(p.z,MIN_Z+.5,MAX_Z-.5);moveAgent(a,p,'tag');a.timer=0}}
    else if(a.timer>.45){moveAgent(a,runner.group.position.clone(),'tag');a.timer=0}
    a.leftArm.rotation.x=-sway*.5
    a.rightArm.rotation.x=sway*.5
    return
  }
  if(a.state==='wave'){
    a.rightArm.rotation.z=-1.55
    a.rightArm.rotation.x=Math.sin(elapsed*7)*.35-.3
    const other=a===tao?momo:tao
    a.group.lookAt(other.group.position)
    return
  }
  if(a.state==='wait'){
    a.leftArm.rotation.x=Math.sin(elapsed*1.5)*.06
    a.rightArm.rotation.x=-a.leftArm.rotation.x
    return
  }
  if(a.state==='playing'){
    a.leftArm.rotation.x=-.45+sway*.25
    a.rightArm.rotation.x=-.45-sway*.25
    if(a.targetToy?.key==='music')a.rightArm.rotation.x=-1.05+Math.sin(elapsed*8)*.35
    if(a.targetToy?.key==='jelly'&&Math.sin(elapsed*4+a.timer)>.94)pokeJelly(.22,a.group.position)
    if(a.timer>4.5){a.state='idle';a.targetToy=null;resetPose(a);idleSince=performance.now()}
    return
  }
  a.leftArm.rotation.x=Math.sin(elapsed*1.4+(a===momo?.8:0))*.05
  a.rightArm.rotation.x=-a.leftArm.rotation.x
  a.root.position.y=Math.sin(elapsed*1.7+(a===momo?1.2:0))*.012
}

function animateSocial(delta:number){if(socialMode==='none')return;socialTimer+=delta;if(socialMode==='wave'&&socialTimer>3.2){agents.forEach(a=>{a.state='idle';resetPose(a)});socialMode='none';idleSince=performance.now()}if(socialMode==='tag'){const d=tao.group.position.distanceTo(momo.group.position);if(d<.72||socialTimer>8){showToast(d<.72?'✦ 抓到啦！':'↝ 换个游戏');agents.forEach(a=>{a.path=[];a.state='idle';resetPose(a)});socialMode='none';idleSince=performance.now()}}if(socialMode==='pass'&&socialTimer>8){agents.forEach(a=>{a.path=[];a.state='idle';resetPose(a)});socialMode='none';idleSince=performance.now()}}
function animateBlocks(delta:number){for(const [b,v] of looseVelocity){v.y-=3.8*delta;b.position.addScaledVector(v,delta);b.rotation.x+=v.z*delta*.7;b.rotation.z-=v.x*delta*.7;if(b.position.y<.26){b.position.y=.26;v.y=Math.abs(v.y)*.28;v.x*=.82;v.z*=.82;if(v.length()<.18){looseVelocity.delete(b);b.userData.status='loose'}}}}
function animateJelly(delta:number,elapsed:number){const spring=-jellyImpulse*10.5;jellyVel+=spring*delta;jellyVel*=Math.pow(.08,delta);jellyImpulse+=jellyVel*delta;jellyImpulse*=Math.pow(.62,delta);jellyDriftVel.addScaledVector(jellyDrift,-5.4*delta);jellyDriftVel.multiplyScalar(Math.pow(.13,delta));jellyDrift.addScaledVector(jellyDriftVel,delta);jellyGroup.position.copy(jellyHome).add(jellyDrift);const attr=jellyMesh.geometry.attributes.position as THREE.BufferAttribute,sq=THREE.MathUtils.clamp(jellyImpulse,-.3,.62);for(let i=0;i<attr.count;i+=1){const x=jellyBase[i*3],y=jellyBase[i*3+1],z=jellyBase[i*3+2],ny=y/.64,waist=1-ny*ny,w=Math.sin(elapsed*5.2+ny*3.4+x*4)*.012*(1+Math.abs(sq)),lat=1+sq*.28*waist+Math.sin(elapsed*2.15)*.018;attr.setXYZ(i,x*lat+w,y*(1-sq*.42)+w*.55,z*lat-w)}attr.needsUpdate=true;jellyMesh.geometry.computeVertexNormals()}
function resolveBallObstacle(){const x=ballGroup.position.x,z=ballGroup.position.z,r=.36;for(const o of obstacles){if(x+r<o.minX||x-r>o.maxX||z+r<o.minZ||z-r>o.maxZ)continue;const dl=Math.abs(x+r-o.minX),dr=Math.abs(o.maxX-(x-r)),dt=Math.abs(z+r-o.minZ),db=Math.abs(o.maxZ-(z-r)),m=Math.min(dl,dr,dt,db);if(m===dl){ballGroup.position.x=o.minX-r;ballVelocity.x=-Math.abs(ballVelocity.x)*.72}else if(m===dr){ballGroup.position.x=o.maxX+r;ballVelocity.x=Math.abs(ballVelocity.x)*.72}else if(m===dt){ballGroup.position.z=o.minZ-r;ballVelocity.z=-Math.abs(ballVelocity.z)*.72}else{ballGroup.position.z=o.maxZ+r;ballVelocity.z=Math.abs(ballVelocity.z)*.72}}}
function animateBall(delta:number){ballGroup.position.addScaledVector(ballVelocity,delta);ballVelocity.multiplyScalar(Math.pow(.12,delta));const r=.36;if(ballGroup.position.x<MIN_X+r){ballGroup.position.x=MIN_X+r;ballVelocity.x=Math.abs(ballVelocity.x)*.78}if(ballGroup.position.x>MAX_X-r){ballGroup.position.x=MAX_X-r;ballVelocity.x=-Math.abs(ballVelocity.x)*.78}if(ballGroup.position.z<MIN_Z+r){ballGroup.position.z=MIN_Z+r;ballVelocity.z=Math.abs(ballVelocity.z)*.78}if(ballGroup.position.z>MAX_Z-r){ballGroup.position.z=MAX_Z-r;ballVelocity.z=-Math.abs(ballVelocity.z)*.78}resolveBallObstacle();if(ballGroup.position.distanceTo(jellyGroup.position)<.95&&ballVelocity.lengthSq()>.15){pokeJelly(Math.min(1.2,ballVelocity.length()*.28),ballGroup.position);ballVelocity.multiplyScalar(-.58)}if(ballGroup.position.distanceTo(buildSpot)<1.15&&ballVelocity.lengthSq()>.22)scatterTower(ballGroup.position,ballVelocity);ballGroup.rotation.z-=ballVelocity.x*delta/r;ballGroup.rotation.x+=ballVelocity.z*delta/r}
function animateToys(elapsed:number){const active=new Set<string>();agents.forEach(a=>{if(a.targetToy)active.add(a.targetToy.key)});const q=elapsed*(active.has('train')?.9:.2);trainBody.position.set(Math.cos(q)*1.1,.02,Math.sin(q)*.68);trainBody.rotation.y=-q+Math.PI/2;musicBars.forEach((b,i)=>{b.position.y=THREE.MathUtils.lerp(b.position.y,.33+(active.has('music')&&Math.floor(elapsed*8)%6===i?.12:0),.2)})}
function animateOutside(delta:number,elapsed:number){clouds.forEach((g,i)=>{g.position.x+=delta*(.07+i*.01);if(g.position.x>1.8)g.position.x=-1.8});birds.forEach((g,i)=>{g.position.x+=delta*(.24+i*.04);if(g.position.x>1.8)g.position.x=-1.8;g.children.forEach((w,j)=>w.rotation.z=(j===0?1:-1)*(.25+Math.sin(elapsed*10+i)*.18))});(sky.material as THREE.MeshBasicMaterial).color.lerp(new THREE.Color(isNight?0x314967:0x9fd2ef),Math.min(1,delta*1.4));(sunMoon.material as THREE.MeshStandardMaterial).color.lerp(new THREE.Color(isNight?0xdbe8ff:0xffd879),Math.min(1,delta*1.4))}
function blink(elapsed:number){agents.forEach((a,i)=>{const b=Math.pow(Math.max(0,Math.sin(elapsed*.72+i*2.1)),26);a.eyes.forEach(e=>e.scale.y=Math.max(.08,1-b*.96))})}
function lighting(delta:number){const c=new THREE.Color(isNight?0x273143:0xf4ead9);(scene.background as THREE.Color).lerp(c,Math.min(1,delta*1.5));scene.fog!.color.lerp(c,Math.min(1,delta*1.5));hemi.intensity=THREE.MathUtils.lerp(hemi.intensity,isNight?.72:2.4,delta*1.5);sun.intensity=THREE.MathUtils.lerp(sun.intensity,isNight?.58:4.3,delta*1.5);lamp.intensity=THREE.MathUtils.lerp(lamp.intensity,isNight?18:5,delta*1.5);bloom.strength=THREE.MathUtils.lerp(bloom.strength,isNight?.27:.16,delta*1.5)}
const desired=new THREE.Vector3(),camOffset=new THREE.Vector3()
function animateCamera(delta:number){if(!cinematic||paused)return;if(follow){desired.copy(follow.group.position).add(new THREE.Vector3(0,1.15,0));controls.target.lerp(desired,Math.min(1,delta*2.4));camOffset.set(4.3,3.15,5.1).applyAxisAngle(new THREE.Vector3(0,1,0),follow.group.rotation.y);tmp.copy(follow.group.position).add(camOffset);camera.position.lerp(tmp,Math.min(1,delta*.7));controls.autoRotate=false;return}desired.copy(tao.group.position).lerp(momo.group.position,.5);desired.y=1.2;controls.target.lerp(desired,Math.min(1,delta*1.4));const busy=agents.some(a=>a.state!=='idle'||a.path.length);controls.autoRotate=!busy&&!reduced&&performance.now()-lastManual>5000}
function planner(){if(paused||reduced||socialMode!=='none')return;if(agents.some(a=>a.state!=='idle'||a.path.length||a.castlePhase>=0))return;const now=performance.now();if(now-idleSince<3200||now-lastManual<4800)return;const loose=recoverableBlocks();if(loose.length&&towerCount<blocks.length){startRecovery(false);return}const q=Math.random();if(q<.27)startBallPass(false);else if(q<.49)startTag();else if(q<.62)startWave();else if(q<.76)startCastle();else{const options=toys.filter(t=>!['blocks','ball','castle'].includes(t.key));const t=options[Math.floor(Math.random()*options.length)];if(t)startToy(t)}}

const clock=new THREE.Clock()
function animate(){const delta=Math.min(clock.getDelta(),.05),elapsed=clock.elapsedTime;if(!paused){agents.forEach(a=>animateAgent(a,delta,elapsed));animateSocial(delta);animateBlocks(delta);animateJelly(delta,elapsed);animateBall(delta);animateToys(elapsed);animateOutside(delta,elapsed);blink(elapsed);planner()}lighting(delta);animateCamera(delta);controls.update();composer.render()}
renderer.setAnimationLoop(animate)
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));composer.setSize(innerWidth,innerHeight);bloom.setSize(innerWidth,innerHeight)})
