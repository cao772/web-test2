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

const palette = {
  cream: 0xf6efe2,
  warmWhite: 0xfffbf3,
  sand: 0xe9d9bd,
  peach: 0xf2aa83,
  coral: 0xe98269,
  butter: 0xf1cc72,
  sage: 0xa9bda0,
  mint: 0xa8cfc1,
  sky: 0x94b9cf,
  blue: 0x6d8fa3,
  lavender: 0xb4a9c9,
  cocoa: 0x8a6a58,
  dark: 0x403a36,
  pink: 0xf58fa1,
}

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xf4ead9)
scene.fog = new THREE.FogExp2(0xf4ead9, 0.022)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.02

const camera = new THREE.PerspectiveCamera(33, window.innerWidth / window.innerHeight, 0.1, 100)
const cameraHome = new THREE.Vector3(11.8, 9.1, 13.6)
camera.position.copy(cameraHome)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 1.25, 0)
controls.enableDamping = true
controls.dampingFactor = 0.055
controls.minDistance = 7.2
controls.maxDistance = 24
controls.minPolarAngle = 0.35
controls.maxPolarAngle = Math.PI * 0.495
controls.autoRotate = true
controls.autoRotateSpeed = 0.26
controls.enablePan = false
controls.update()

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.13, 0.55, 0.92)
composer.addPass(bloom)

const hemi = new THREE.HemisphereLight(0xfff8e8, 0x93a09c, 2.4)
scene.add(hemi)

const sun = new THREE.DirectionalLight(0xffdfb4, 4.25)
sun.position.set(-6, 11, 7)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = -11
sun.shadow.camera.right = 11
sun.shadow.camera.top = 11
sun.shadow.camera.bottom = -11
sun.shadow.bias = -0.00055
scene.add(sun)

const windowGlow = new THREE.PointLight(0xffc896, 11, 11, 1.7)
windowGlow.position.set(-4.6, 4.2, -4.8)
scene.add(windowGlow)

const fill = new THREE.PointLight(0xbadcf1, 6, 11, 2)
fill.position.set(5.4, 5.1, 1.6)
scene.add(fill)

const lampLight = new THREE.PointLight(0xffc578, 5, 5.5, 2)
lampLight.position.set(5.45, 1.72, -3.45)
scene.add(lampLight)

function material(color: number, roughness = 0.74) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })
}

function roundedBox(w: number, h: number, d: number, color: number, radius = 0.12, roughness = 0.74) {
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(w, h, d, 5, Math.min(radius, w / 2, h / 2, d / 2)),
    material(color, roughness),
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function sphere(radius: number, color: number, roughness = 0.72) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 30, 22), material(color, roughness))
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function cylinder(radius: number, height: number, color: number, segments = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material(color))
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function contactShadow(radius: number, opacity = 0.12) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 40),
    new THREE.MeshBasicMaterial({ color: 0x5b4537, transparent: true, opacity, depthWrite: false }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.13
  return mesh
}

const room = new THREE.Group()
scene.add(room)

const floor = roundedBox(13.2, 0.36, 11.5, palette.sand, 0.28, 0.92)
floor.position.y = -0.28
room.add(floor)

const matColors = [palette.peach, palette.butter, palette.mint, palette.sky, palette.lavender, 0xe9c4a4]
for (let x = -3; x <= 3; x += 1) {
  for (let z = -2; z <= 2; z += 1) {
    const tile = roundedBox(1.48, 0.12, 1.48, matColors[(x + z + 20) % matColors.length], 0.13, 0.9)
    tile.position.set(x * 1.48, 0.02, z * 1.48 + 0.28)
    room.add(tile)
  }
}

const backWall = roundedBox(13.2, 5.6, 0.32, palette.warmWhite, 0.16, 0.96)
backWall.position.set(0, 2.45, -5.7)
room.add(backWall)
const leftWall = roundedBox(0.32, 5.6, 11.5, 0xf7efe1, 0.16, 0.96)
leftWall.position.set(-6.6, 2.45, 0)
room.add(leftWall)

const windowFrame = roundedBox(4.05, 2.72, 0.14, palette.warmWhite, 0.1)
windowFrame.position.set(-2.75, 3.35, -5.47)
room.add(windowFrame)
const pane = new THREE.Mesh(
  new THREE.PlaneGeometry(3.58, 2.24),
  new THREE.MeshPhysicalMaterial({ color: 0xbfdcec, transparent: true, opacity: 0.46, roughness: 0.12, transmission: 0.48, thickness: 0.2 }),
)
pane.position.set(-2.75, 3.35, -5.37)
room.add(pane)
for (const x of [-4.58, -0.92]) {
  const curtain = roundedBox(0.58, 3.02, 0.28, 0xe7b6a3, 0.22, 0.96)
  curtain.position.set(x, 3.15, -5.26)
  room.add(curtain)
}
const crossH = roundedBox(3.64, 0.08, 0.08, palette.warmWhite, 0.04)
crossH.position.set(-2.75, 3.35, -5.26)
room.add(crossH)
const crossV = roundedBox(0.08, 2.25, 0.08, palette.warmWhite, 0.04)
crossV.position.set(-2.75, 3.35, -5.26)
room.add(crossV)

for (let i = 0; i < 4; i += 1) {
  const cloud = new THREE.Group()
  for (const [x, y, r] of [[0, 0, .25], [.25, -.03, .2], [-.25, -.04, .18]] as const) {
    const puff = sphere(r, palette.warmWhite, 1)
    puff.position.set(x, y, 0)
    cloud.add(puff)
  }
  cloud.position.set(2.15 + i * .78, 4.55 - (i % 2) * .2, -5.25)
  room.add(cloud)
}

const shelf = roundedBox(3.35, 1.52, .82, 0xd8b68f, .18)
shelf.position.set(3.78, .78, -5.03)
room.add(shelf)
for (let i = 0; i < 7; i += 1) {
  const book = roundedBox(.18, .56 + (i % 3) * .06, .38, matColors[i % matColors.length], .04)
  book.position.set(2.55 + i * .25, 1.05, -4.47)
  book.rotation.z = (i % 2 ? -1 : 1) * .045
  room.add(book)
}

const couch = new THREE.Group()
const couchSeat = roundedBox(2.65, .56, 1.35, 0xc9b6d8, .28, .92)
couchSeat.position.y = .52
couch.add(couchSeat)
const couchBack = roundedBox(2.65, 1.28, .5, 0xb3a0c6, .28, .93)
couchBack.position.set(0, 1.12, -.47)
couch.add(couchBack)
for (const x of [-.7, .63]) {
  const pillow = roundedBox(.76, .66, .28, x < 0 ? palette.butter : palette.mint, .22, .96)
  pillow.position.set(x, .98, .2)
  pillow.rotation.z = x < 0 ? -.12 : .11
  couch.add(pillow)
}
couch.position.set(4.42, .08, 2.72)
couch.rotation.y = -.22
room.add(couch)

const rug = new THREE.Mesh(new THREE.CylinderGeometry(2.16, 2.16, .06, 64), material(0xe4c9ad, 1))
rug.scale.z = .64
rug.position.set(4.22, .16, 2.52)
rug.receiveShadow = true
room.add(rug)

const lampBase = cylinder(.28, .18, palette.cocoa)
lampBase.position.set(5.45, .27, -3.75)
room.add(lampBase)
const lampStem = cylinder(.055, 1.3, palette.cocoa)
lampStem.position.set(5.45, .98, -3.75)
room.add(lampStem)
const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(.3, .52, .64, 30), material(palette.butter))
lampShade.position.set(5.45, 1.68, -3.75)
lampShade.castShadow = true
room.add(lampShade)

const dustCount = 90
const dustPositions = new Float32Array(dustCount * 3)
for (let i = 0; i < dustCount; i += 1) {
  dustPositions[i * 3] = THREE.MathUtils.randFloatSpread(11)
  dustPositions[i * 3 + 1] = THREE.MathUtils.randFloat(.45, 5)
  dustPositions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(9)
}
const dustGeometry = new THREE.BufferGeometry()
dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
const dust = new THREE.Points(
  dustGeometry,
  new THREE.PointsMaterial({ color: 0xfff4d8, size: .035, transparent: true, opacity: .36, depthWrite: false }),
)
scene.add(dust)

type Toy = {
  key: string
  label: string
  emoji: string
  group: THREE.Group
  target: THREE.Vector3
}

const toys: Toy[] = []
function registerToy(key: string, label: string, emoji: string, group: THREE.Group, target: THREE.Vector3) {
  group.traverse((obj) => { obj.userData.toyKey = key })
  room.add(group)
  toys.push({ key, label, emoji, group, target })
}

const blockGroup = new THREE.Group()
{
  const cols = [palette.coral, palette.butter, palette.sky, palette.mint, palette.lavender]
  const positions: Array<[number, number, number, number]> = [[0,.25,0,0],[.48,.25,.05,.18],[-.44,.25,.08,-.12],[-.1,.7,.03,.08],[.36,.68,.04,-.18]]
  positions.forEach(([x,y,z,r], i) => {
    const b = roundedBox(.48,.48,.48,cols[i],.09)
    b.position.set(x,y,z)
    b.rotation.y = r
    blockGroup.add(b)
  })
  blockGroup.position.set(-3.9,.11,2.65)
  registerToy('blocks','积木','▦',blockGroup,new THREE.Vector3(-3.15,.18,2.35))
}

const trainGroup = new THREE.Group()
{
  const body = roundedBox(1.38,.5,.66,palette.coral,.13)
  body.position.y = .48
  trainGroup.add(body)
  const cabin = roundedBox(.62,.55,.58,palette.butter,.12)
  cabin.position.set(.32,.9,0)
  trainGroup.add(cabin)
  const chimney = cylinder(.11,.42,palette.cocoa)
  chimney.position.set(-.45,.96,0)
  trainGroup.add(chimney)
  for (const x of [-.47,.45]) {
    for (const z of [-.36,.36]) {
      const wheel = cylinder(.18,.12,palette.dark)
      wheel.rotation.x = Math.PI / 2
      wheel.position.set(x,.25,z)
      trainGroup.add(wheel)
    }
  }
  const track = new THREE.Mesh(new THREE.TorusGeometry(1.66,.045,10,64), material(palette.cocoa))
  track.rotation.x = Math.PI / 2
  track.scale.z = .63
  track.position.y = .14
  trainGroup.add(track)
  trainGroup.position.set(-1.2,.02,-2.65)
  registerToy('train','小火车','◉',trainGroup,new THREE.Vector3(-.2,.18,-2.05))
}

const ringGroup = new THREE.Group()
{
  const base = roundedBox(1.15,.18,.75,palette.mint,.18)
  base.position.y = .18
  ringGroup.add(base)
  const peg = cylinder(.08,1.08,palette.cocoa)
  peg.position.y = .76
  ringGroup.add(peg)
  ;[palette.coral,palette.butter,palette.sky].forEach((c,i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.34 + i * .025,.055,12,32), material(c))
    ring.rotation.x = Math.PI / 2 + (i - 1) * .1
    ring.position.set((i - 1) * .08,.45 + i * .17,(i - 1) * .04)
    ring.castShadow = true
    ringGroup.add(ring)
  })
  ringGroup.position.set(2.0,.03,2.7)
  registerToy('rings','套圈','◎',ringGroup,new THREE.Vector3(1.35,.18,2.2))
}

const musicGroup = new THREE.Group()
const musicBars: THREE.Mesh[] = []
{
  const railA = roundedBox(1.8,.12,.12,palette.cocoa,.04)
  const railB = railA.clone()
  railA.position.set(0,.2,-.28)
  railB.position.set(0,.2,.28)
  musicGroup.add(railA,railB)
  ;[palette.coral,palette.peach,palette.butter,palette.mint,palette.sky,palette.lavender].forEach((c,i) => {
    const bar = roundedBox(.23,.14,.7 - i * .045,c,.05)
    bar.position.set(-.72 + i * .29,.33,0)
    musicBars.push(bar)
    musicGroup.add(bar)
  })
  musicGroup.position.set(4.2,.04,-.6)
  musicGroup.rotation.y = -.28
  registerToy('music','木琴','≋',musicGroup,new THREE.Vector3(3.45,.18,-.4))
}

const booksGroup = new THREE.Group()
{
  for (let i = 0; i < 3; i += 1) {
    const book = roundedBox(1,.11,.72,[palette.sky,palette.butter,palette.coral][i],.05)
    book.position.set(i * .05,.16 + i * .12,i * -.025)
    book.rotation.y = (i - 1) * .08
    booksGroup.add(book)
  }
  const openL = roundedBox(.66,.04,.88,palette.warmWhite,.04,.96)
  const openR = openL.clone()
  openL.position.set(-.36,.55,0)
  openR.position.set(.36,.55,0)
  openL.rotation.z = -.08
  openR.rotation.z = .08
  booksGroup.add(openL,openR)
  booksGroup.position.set(-4.8,.02,-.9)
  booksGroup.rotation.y = .35
  registerToy('books','绘本','▤',booksGroup,new THREE.Vector3(-4.0,.18,-.55))
}

const jellyGroup = new THREE.Group()
let jellyMesh: THREE.Mesh
let jellyImpulse = 0
let jellyVelocity = 0
{
  const jellyMaterial = new THREE.MeshPhysicalMaterial({
    color: palette.pink,
    roughness: .05,
    transmission: .84,
    transparent: true,
    opacity: .9,
    ior: 1.3,
    thickness: 1.6,
    clearcoat: 1,
    clearcoatRoughness: .08,
    emissive: 0x351014,
    emissiveIntensity: .08,
  })
  jellyMesh = new THREE.Mesh(new THREE.SphereGeometry(.64,48,36), jellyMaterial)
  jellyMesh.position.y = .72
  jellyMesh.castShadow = true
  jellyGroup.add(jellyMesh)
  jellyGroup.add(contactShadow(.62,.15))
  for (const x of [-.23,.23]) {
    const eye = sphere(.055,palette.dark)
    eye.position.set(x,.83,.56)
    jellyGroup.add(eye)
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.12,.025,8,24,Math.PI), material(palette.dark))
  mouth.rotation.z = Math.PI
  mouth.position.set(0,.61,.575)
  jellyGroup.add(mouth)
  jellyGroup.position.set(.4,.04,3.55)
  registerToy('jelly','果冻','●',jellyGroup,new THREE.Vector3(.25,.18,2.62))
}

const rockerGroup = new THREE.Group()
{
  const rocker = new THREE.Mesh(new THREE.TorusGeometry(.88,.075,10,36,Math.PI * 1.15), material(palette.cocoa))
  rocker.rotation.z = Math.PI * .92
  rocker.position.y = .15
  rockerGroup.add(rocker)
  const body = roundedBox(1.05,.46,.36,palette.butter,.2)
  body.position.y = .65
  rockerGroup.add(body)
  const neck = roundedBox(.3,.72,.3,palette.butter,.14)
  neck.position.set(.45,1.02,0)
  neck.rotation.z = -.32
  rockerGroup.add(neck)
  const head = sphere(.3,palette.butter)
  head.position.set(.63,1.35,0)
  rockerGroup.add(head)
  rockerGroup.position.set(2.1,.06,-3.6)
  rockerGroup.rotation.y = -.38
  registerToy('rocker','木马','⌁',rockerGroup,new THREE.Vector3(1.38,.18,-3.0))
}

const character = new THREE.Group()
const characterRoot = new THREE.Group()
character.add(characterRoot)
character.add(contactShadow(.55,.13))
character.userData.character = true

const body = roundedBox(.68,.92,.5,palette.sage,.26)
body.position.y = 1.02
characterRoot.add(body)
const collar = roundedBox(.5,.13,.51,palette.warmWhite,.07)
collar.position.y = 1.43
characterRoot.add(collar)
const head = sphere(.45,0xe6b18d,.78)
head.position.y = 1.78
characterRoot.add(head)
const hairCap = new THREE.Mesh(new THREE.SphereGeometry(.46,30,18,0,Math.PI * 2,0,Math.PI * .54), material(0x56463f,.95))
hairCap.position.y = 1.9
hairCap.castShadow = true
characterRoot.add(hairCap)
const hairTuft = sphere(.16,0x56463f,.95)
hairTuft.scale.set(1.3,.75,.9)
hairTuft.position.set(-.18,2.14,.02)
hairTuft.rotation.z = -.35
characterRoot.add(hairTuft)
for (const x of [-.16,.16]) {
  const eye = sphere(.038,palette.dark)
  eye.position.set(x,1.79,.42)
  characterRoot.add(eye)
  const cheek = sphere(.052,0xe99588)
  cheek.scale.set(1,.55,.35)
  cheek.position.set(x * 1.4,1.67,.405)
  characterRoot.add(cheek)
}
const smile = new THREE.Mesh(new THREE.TorusGeometry(.095,.018,8,24,Math.PI), material(palette.dark))
smile.rotation.z = Math.PI
smile.position.set(0,1.66,.44)
characterRoot.add(smile)

const leftArmPivot = new THREE.Group()
const rightArmPivot = new THREE.Group()
leftArmPivot.position.set(-.4,1.3,0)
rightArmPivot.position.set(.4,1.3,0)
for (const [pivot,side] of [[leftArmPivot,-1],[rightArmPivot,1]] as const) {
  const sleeve = cylinder(.11,.36,palette.sage)
  sleeve.position.y = -.15
  sleeve.rotation.z = side * .04
  pivot.add(sleeve)
  const arm = cylinder(.082,.42,0xe6b18d)
  arm.position.y = -.48
  pivot.add(arm)
  characterRoot.add(pivot)
}
const leftLegPivot = new THREE.Group()
const rightLegPivot = new THREE.Group()
leftLegPivot.position.set(-.18,.62,0)
rightLegPivot.position.set(.18,.62,0)
for (const pivot of [leftLegPivot,rightLegPivot]) {
  const leg = cylinder(.11,.62,0x728b84)
  leg.position.y = -.27
  pivot.add(leg)
  const shoe = roundedBox(.24,.13,.38,palette.dark,.08)
  shoe.position.set(0,-.58,.08)
  pivot.add(shoe)
  characterRoot.add(pivot)
}
character.position.set(-.55,.2,.5)
character.scale.setScalar(.92)
scene.add(character)

let targetPosition: THREE.Vector3 | null = null
let activeToy: Toy | null = null
let paused = false
let isNight = false
let cinematic = true
let lastManualAction = performance.now()
let idleSince = performance.now()
let actionPhase = 0
let actionTime = 0
let toyActionClock = 0
let followCharacter = false
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function showToast(message: string) {
  toast.textContent = message
  toast.classList.add('show')
  window.setTimeout(() => toast.classList.remove('show'), 1450)
}

function chooseToy(toy: Toy, manual = true) {
  targetPosition = toy.target.clone()
  activeToy = toy
  actionTime = 0
  actionPhase = 0
  statusText.textContent = `准备去玩${toy.label}`
  if (manual) {
    lastManualAction = performance.now()
    showToast(`${toy.emoji} 去玩 ${toy.label}`)
  }
  controls.autoRotate = false
  idleSince = performance.now()
}

toys.forEach((toy) => {
  const button = document.createElement('button')
  button.className = 'toy-button'
  button.innerHTML = `<span>${toy.emoji}</span><b>${toy.label}</b>`
  button.addEventListener('click', () => chooseToy(toy, true))
  toyButtons.appendChild(button)
})

function pokeJelly(power = 1) {
  jellyImpulse = Math.min(1.45, jellyImpulse + .65 * power)
  jellyVelocity += .8 * power
}

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
function updatePointer(event: PointerEvent) {
  pointer.x = event.clientX / window.innerWidth * 2 - 1
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
}
function intersectionsAtPointer() {
  raycaster.setFromCamera(pointer,camera)
  return raycaster.intersectObjects([...toys.map((t) => t.group),character],true)
}

renderer.domElement.addEventListener('pointermove',(event) => {
  updatePointer(event)
  renderer.domElement.style.cursor = intersectionsAtPointer().length ? 'pointer' : 'grab'
})
renderer.domElement.addEventListener('pointerdown',() => { renderer.domElement.style.cursor = 'grabbing' })
renderer.domElement.addEventListener('pointerup',(event) => {
  updatePointer(event)
  const hits = intersectionsAtPointer()
  renderer.domElement.style.cursor = hits.length ? 'pointer' : 'grab'
  if (!hits.length) return
  let obj: THREE.Object3D | null = hits[0].object
  while (obj && !obj.userData.toyKey && !obj.userData.character) obj = obj.parent
  if (!obj) return
  if (obj.userData.character) {
    followCharacter = !followCharacter
    cinematic = followCharacter || cinematic
    cinemaButton.classList.toggle('active',cinematic)
    statusText.textContent = followCharacter ? '镜头开始跟着 TA' : '镜头回到自由观察'
    showToast(followCharacter ? '◉ 跟随镜头' : '⌂ 自由镜头')
    return
  }
  const key = obj.userData.toyKey as string | undefined
  const toy = toys.find((item) => item.key === key)
  if (!toy) return
  if (key === 'jelly') pokeJelly(1.15)
  chooseToy(toy,true)
})

function setNight(value: boolean) {
  isNight = value
  document.body.classList.toggle('night',value)
  dayButton.textContent = value ? '☾' : '☀︎'
  statusText.textContent = value ? '夜灯亮起来了' : '阳光重新照进房间'
  showToast(value ? '☾ 夜晚模式' : '☀︎ 白天模式')
}

dayButton.addEventListener('click',() => setNight(!isNight))
pauseButton.addEventListener('click',() => {
  paused = !paused
  pauseButton.textContent = paused ? '▶' : 'Ⅱ'
  pauseButton.title = paused ? '继续探索' : '暂停探索'
  statusText.textContent = paused ? '暂停一下，看看房间' : activeToy ? `继续去玩${activeToy.label}` : '继续慢慢逛'
  autoBadge.textContent = paused ? '已暂停' : '自动探索中'
})
cinemaButton.addEventListener('click',() => {
  cinematic = !cinematic
  followCharacter = false
  cinemaButton.classList.toggle('active',cinematic)
  statusText.textContent = cinematic ? '电影镜头已开启' : '自由镜头已开启'
})
resetButton.addEventListener('click',() => {
  camera.position.copy(cameraHome)
  controls.target.set(0,1.25,0)
  controls.autoRotate = true
  followCharacter = false
  controls.update()
  statusText.textContent = '镜头回到全景'
})

controls.addEventListener('start',() => {
  controls.autoRotate = false
  followCharacter = false
  lastManualAction = performance.now()
})

const clock = new THREE.Clock()
const temp = new THREE.Vector3()
const desiredTarget = new THREE.Vector3()
const cameraOffset = new THREE.Vector3()

function animateCharacter(delta: number, elapsed: number) {
  if (paused) return
  if (targetPosition) {
    temp.copy(targetPosition).sub(character.position)
    temp.y = 0
    const distance = temp.length()
    if (distance > .23) {
      temp.normalize()
      character.position.addScaledVector(temp,Math.min(delta * 1.65,distance))
      const desired = Math.atan2(temp.x,temp.z)
      character.rotation.y = THREE.MathUtils.lerp(character.rotation.y,desired,Math.min(1,delta * 8))
      const walk = elapsed * 10
      leftLegPivot.rotation.x = Math.sin(walk) * .5
      rightLegPivot.rotation.x = -Math.sin(walk) * .5
      leftArmPivot.rotation.x = -Math.sin(walk) * .42
      rightArmPivot.rotation.x = Math.sin(walk) * .42
      characterRoot.position.y = Math.abs(Math.sin(walk)) * .04
      characterRoot.rotation.z = Math.sin(walk * .5) * .025
    } else {
      targetPosition = null
      actionTime = 0
      actionPhase = Math.random() * Math.PI * 2
      leftLegPivot.rotation.x = 0
      rightLegPivot.rotation.x = 0
      statusText.textContent = activeToy ? `正在玩${activeToy.label}` : '发现了一件好玩的东西'
      if (activeToy?.key === 'jelly') pokeJelly(1.2)
      idleSince = performance.now()
    }
  } else if (activeToy) {
    actionTime += delta
    const s = Math.sin(actionTime * 5 + actionPhase)
    characterRoot.position.y = .015 + Math.abs(Math.sin(actionTime * 3)) * .018
    characterRoot.rotation.z = s * .025
    leftArmPivot.rotation.x = -.45 + s * .28
    rightArmPivot.rotation.x = -.45 - s * .28
    if (activeToy.key === 'books') {
      characterRoot.rotation.x = -.1 + Math.sin(actionTime * 2) * .02
    } else if (activeToy.key === 'music') {
      rightArmPivot.rotation.x = -1.05 + Math.sin(actionTime * 8) * .35
    } else if (activeToy.key === 'rocker') {
      characterRoot.rotation.z = Math.sin(actionTime * 3.5) * .08
    } else if (activeToy.key === 'jelly' && Math.sin(actionTime * 4) > .93) {
      pokeJelly(.28)
    }
    if (actionTime > 5.6) {
      activeToy = null
      actionTime = 0
      characterRoot.rotation.x = 0
      idleSince = performance.now()
      statusText.textContent = '玩够啦，准备继续逛'
    }
  } else {
    leftArmPivot.rotation.x = Math.sin(elapsed * 1.4) * .05
    rightArmPivot.rotation.x = -Math.sin(elapsed * 1.4) * .05
    leftLegPivot.rotation.x *= .88
    rightLegPivot.rotation.x *= .88
    characterRoot.position.y = Math.sin(elapsed * 1.7) * .012
    characterRoot.rotation.z *= .9
  }
}

function animateToys(delta: number, elapsed: number) {
  toyActionClock += delta
  const active = activeToy?.key
  trainGroup.rotation.y += active === 'train' ? delta * .48 : delta * .035
  rockerGroup.rotation.z = active === 'rocker' ? Math.sin(elapsed * 3.5) * .12 : THREE.MathUtils.lerp(rockerGroup.rotation.z,0,.06)
  ringGroup.rotation.y = active === 'rings' ? Math.sin(elapsed * 2.8) * .09 : THREE.MathUtils.lerp(ringGroup.rotation.y,0,.06)
  blockGroup.children.forEach((child,i) => {
    const targetY = active === 'blocks' && i === Math.floor(elapsed * 2) % blockGroup.children.length ? .06 : 0
    child.position.y += (child.userData.baseY ?? child.position.y) === undefined ? 0 : 0
    child.rotation.y += active === 'blocks' ? delta * (.12 + i * .03) : 0
    child.position.y += (targetY - (child.position.y % 1 < .12 ? 0 : 0)) * 0
  })
  musicBars.forEach((bar,i) => {
    const base = .33
    const pulse = active === 'music' && Math.floor(elapsed * 8) % musicBars.length === i ? .12 : 0
    bar.position.y = THREE.MathUtils.lerp(bar.position.y,base + pulse,.22)
  })
  booksGroup.rotation.z = active === 'books' ? Math.sin(elapsed * 2) * .025 : THREE.MathUtils.lerp(booksGroup.rotation.z,0,.08)
}

function animateJelly(delta: number, elapsed: number) {
  if (paused) return
  const spring = -jellyImpulse * 8.8
  jellyVelocity += spring * delta
  jellyVelocity *= Math.pow(.17,delta)
  jellyImpulse += jellyVelocity * delta
  jellyImpulse *= Math.pow(.64,delta)
  const breathing = Math.sin(elapsed * 2.15) * .025
  const squash = THREE.MathUtils.clamp(jellyImpulse,-.28,.55)
  jellyMesh.scale.set(1.08 + squash * .24 - breathing,.88 - squash * .34 + breathing * .8,1.04 + squash * .22 - breathing)
  jellyMesh.position.y = .72 + Math.max(0,squash) * .13
  jellyMesh.rotation.y += delta * .24
  jellyGroup.rotation.z = Math.sin(elapsed * 2.7) * squash * .08
}

function animateLighting(delta: number, elapsed: number) {
  const bgTarget = new THREE.Color(isNight ? 0x273143 : 0xf4ead9)
  ;(scene.background as THREE.Color).lerp(bgTarget,Math.min(1,delta * 1.5))
  scene.fog!.color.lerp(bgTarget,Math.min(1,delta * 1.5))
  hemi.intensity = THREE.MathUtils.lerp(hemi.intensity,isNight ? .72 : 2.4,Math.min(1,delta * 1.6))
  sun.intensity = THREE.MathUtils.lerp(sun.intensity,isNight ? .62 : 4.25,Math.min(1,delta * 1.6))
  windowGlow.intensity = THREE.MathUtils.lerp(windowGlow.intensity,isNight ? 1.8 : 11,Math.min(1,delta * 1.6))
  fill.intensity = THREE.MathUtils.lerp(fill.intensity,isNight ? 8.5 : 6,Math.min(1,delta * 1.6))
  lampLight.intensity = THREE.MathUtils.lerp(lampLight.intensity,isNight ? 18 : 5,Math.min(1,delta * 1.8))
  bloom.strength = THREE.MathUtils.lerp(bloom.strength,isNight ? .24 : .13,Math.min(1,delta * 1.5))
  renderer.toneMappingExposure = THREE.MathUtils.lerp(renderer.toneMappingExposure,isNight ? .84 : 1.02,Math.min(1,delta * 1.5))
  const dustMat = dust.material as THREE.PointsMaterial
  dustMat.opacity = isNight ? .18 + Math.sin(elapsed) * .025 : .34 + Math.sin(elapsed * .7) * .035
}

function animateCamera(delta: number) {
  if (!cinematic || paused) return
  if (followCharacter) {
    desiredTarget.copy(character.position).add(new THREE.Vector3(0,1.1,0))
    controls.target.lerp(desiredTarget,Math.min(1,delta * 2.5))
    cameraOffset.set(4.5,3.2,5.3).applyAxisAngle(new THREE.Vector3(0,1,0),character.rotation.y)
    temp.copy(character.position).add(cameraOffset)
    camera.position.lerp(temp,Math.min(1,delta * .7))
    controls.autoRotate = false
    return
  }
  if (targetPosition || activeToy) {
    const focus = activeToy?.group.getWorldPosition(new THREE.Vector3()) ?? character.position
    desiredTarget.copy(character.position).lerp(focus,.42)
    desiredTarget.y = 1.05
    controls.target.lerp(desiredTarget,Math.min(1,delta * 1.7))
    controls.autoRotate = false
  } else if (performance.now() - lastManualAction > 5000) {
    desiredTarget.set(0,1.25,0)
    controls.target.lerp(desiredTarget,Math.min(1,delta * .8))
    controls.autoRotate = !reducedMotion
  }
}

function maybeAutoExplore() {
  if (paused || targetPosition || activeToy || reducedMotion) return
  const now = performance.now()
  if (now - idleSince < 3800 || now - lastManualAction < 5200) return
  const choices = toys.filter((toy) => toy !== activeToy)
  const toy = choices[Math.floor(Math.random() * choices.length)]
  chooseToy(toy,false)
  statusText.textContent = `TA 自己发现了${toy.label}`
  autoBadge.textContent = `正在去${toy.label}`
  window.setTimeout(() => { if (!paused) autoBadge.textContent = '自动探索中' },1800)
}

function animate() {
  const delta = Math.min(clock.getDelta(),.05)
  const elapsed = clock.elapsedTime
  animateCharacter(delta,elapsed)
  animateToys(delta,elapsed)
  animateJelly(delta,elapsed)
  animateLighting(delta,elapsed)
  animateCamera(delta)
  maybeAutoExplore()
  dust.rotation.y += paused ? 0 : delta * .012
  controls.update()
  composer.render()
}

renderer.setAnimationLoop(animate)

window.addEventListener('resize',() => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth,window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
  composer.setSize(window.innerWidth,window.innerHeight)
  bloom.setSize(window.innerWidth,window.innerHeight)
})
