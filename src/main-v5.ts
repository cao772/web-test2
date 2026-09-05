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
  warmWhite: 0xfffbf3,
  sand: 0xe8d8bd,
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
scene.fog = new THREE.FogExp2(0xf4ead9, 0.021)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.02

const camera = new THREE.PerspectiveCamera(33, window.innerWidth / window.innerHeight, 0.1, 100)
const cameraHome = new THREE.Vector3(12.4, 9.6, 14.2)
camera.position.copy(cameraHome)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 1.3, 0)
controls.enableDamping = true
controls.dampingFactor = 0.055
controls.minDistance = 7.2
controls.maxDistance = 25
controls.minPolarAngle = 0.35
controls.maxPolarAngle = Math.PI * 0.495
controls.autoRotate = true
controls.autoRotateSpeed = 0.22
controls.enablePan = false
controls.update()

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.16, 0.58, 0.9)
composer.addPass(bloom)

const hemi = new THREE.HemisphereLight(0xfff8e8, 0x93a09c, 2.4)
scene.add(hemi)
const sunLight = new THREE.DirectionalLight(0xffdfb4, 4.3)
sunLight.position.set(-6.5, 11, 7.5)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(2048, 2048)
sunLight.shadow.camera.left = -12
sunLight.shadow.camera.right = 12
sunLight.shadow.camera.top = 12
sunLight.shadow.camera.bottom = -12
sunLight.shadow.bias = -0.00055
scene.add(sunLight)
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

function shadowDisc(radius: number, opacity = 0.12) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 40),
    new THREE.MeshBasicMaterial({ color: 0x5b4537, transparent: true, opacity, depthWrite: false }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.13
  return mesh
}

const world = new THREE.Group()
scene.add(world)
const floor = roundedBox(13.2, 0.36, 11.5, palette.sand, 0.28, 0.92)
floor.position.y = -0.28
world.add(floor)

const matColors = [palette.peach, palette.butter, palette.mint, palette.sky, palette.lavender, 0xe9c4a4]
for (let x = -3; x <= 3; x += 1) {
  for (let z = -2; z <= 2; z += 1) {
    const tile = roundedBox(1.48, 0.12, 1.48, matColors[(x + z + 20) % matColors.length], 0.13, 0.9)
    tile.position.set(x * 1.48, 0.02, z * 1.48 + 0.28)
    world.add(tile)
  }
}

const backWall = roundedBox(13.2, 5.6, 0.32, palette.warmWhite, 0.16, 0.96)
backWall.position.set(0, 2.45, -5.7)
world.add(backWall)
const leftWall = roundedBox(0.32, 5.6, 11.5, 0xf7efe1, 0.16, 0.96)
leftWall.position.set(-6.6, 2.45, 0)
world.add(leftWall)

const windowMask = new THREE.Mesh(new THREE.PlaneGeometry(4.05, 2.72), material(0xcde6f4, 0.95))
windowMask.position.set(-2.75, 3.35, -5.48)
world.add(windowMask)
const outside = new THREE.Group()
outside.position.set(-2.75, 3.35, -5.43)
world.add(outside)
const sky = new THREE.Mesh(
  new THREE.PlaneGeometry(3.56, 2.22),
  new THREE.MeshBasicMaterial({ color: 0x9fd2ef }),
)
sky.position.z = 0.01
outside.add(sky)
const sunMoon = sphere(.22, 0xffd879, 0.8)
sunMoon.position.set(1.05, .55, .08)
outside.add(sunMoon)
const windowClouds: THREE.Group[] = []
for (let i = 0; i < 5; i += 1) {
  const g = new THREE.Group()
  for (const [x, y, r] of [[0, 0, .15], [.17, -.01, .12], [-.16, -.02, .11]] as const) {
    const puff = sphere(r, palette.warmWhite, 1)
    puff.position.set(x, y, 0)
    g.add(puff)
  }
  g.position.set(-1.5 + i * .75, .36 - (i % 2) * .32, .1)
  g.scale.setScalar(.8 + (i % 3) * .12)
  windowClouds.push(g)
  outside.add(g)
}
const birds: THREE.Group[] = []
for (let i = 0; i < 3; i += 1) {
  const g = new THREE.Group()
  const wingMat = new THREE.MeshBasicMaterial({ color: 0x647587, side: THREE.DoubleSide })
  const wingA = new THREE.Mesh(new THREE.PlaneGeometry(.16, .035), wingMat)
  const wingB = wingA.clone()
  wingA.rotation.z = .35
  wingB.rotation.z = -.35
  wingA.position.x = -.07
  wingB.position.x = .07
  g.add(wingA, wingB)
  g.position.set(-1.4 - i * .7, .05 + i * .22, .12)
  birds.push(g)
  outside.add(g)
}
const frame = roundedBox(4.05, 2.72, .14, palette.warmWhite, .1)
frame.position.set(-2.75, 3.35, -5.28)
world.add(frame)
const crossH = roundedBox(3.64, .08, .08, palette.warmWhite, .04)
crossH.position.set(-2.75, 3.35, -5.18)
world.add(crossH)
const crossV = roundedBox(.08, 2.25, .08, palette.warmWhite, .04)
crossV.position.set(-2.75, 3.35, -5.18)
world.add(crossV)
for (const x of [-4.58, -.92]) {
  const curtain = roundedBox(.58, 3.02, .28, 0xe7b6a3, .22, .96)
  curtain.position.set(x, 3.15, -5.14)
  world.add(curtain)
}

const shelf = roundedBox(3.35, 1.52, .82, 0xd8b68f, .18)
shelf.position.set(3.78, .78, -5.03)
world.add(shelf)
for (let i = 0; i < 7; i += 1) {
  const book = roundedBox(.18, .56 + (i % 3) * .06, .38, matColors[i % matColors.length], .04)
  book.position.set(2.55 + i * .25, 1.05, -4.47)
  book.rotation.z = (i % 2 ? -1 : 1) * .045
  world.add(book)
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
  couch.add(pillow)
}
couch.position.set(4.42, .08, 2.72)
couch.rotation.y = -.22
world.add(couch)

const lampBase = cylinder(.28, .18, palette.cocoa)
lampBase.position.set(5.45, .27, -3.75)
world.add(lampBase)
const lampStem = cylinder(.055, 1.3, palette.cocoa)
lampStem.position.set(5.45, .98, -3.75)
world.add(lampStem)
const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(.3, .52, .64, 30), material(palette.butter))
lampShade.position.set(5.45, 1.68, -3.75)
lampShade.castShadow = true
world.add(lampShade)

type Obstacle = { minX: number; maxX: number; minZ: number; maxZ: number }
const obstacles: Obstacle[] = [
  { minX: 2.2, maxX: 5.5, minZ: -5.6, maxZ: -4.3 },
  { minX: 3.0, maxX: 5.8, minZ: 1.65, maxZ: 3.75 },
  { minX: 4.95, maxX: 5.9, minZ: -4.45, maxZ: -3.1 },
]

const castle = new THREE.Group()
const castleOrigin = new THREE.Vector3(-3.8, .05, -3.55)
const ladderBase = new THREE.Vector3(-2.78, .2, -2.48)
const ladderTop = new THREE.Vector3(-2.95, 2.38, -3.13)
const bridgeEnd = new THREE.Vector3(-4.35, 2.38, -3.22)
const slideEnd = new THREE.Vector3(-4.85, .2, -1.78)
{
  const platform = roundedBox(2.35, .22, 1.55, palette.mint, .14)
  platform.position.set(0, 2.2, 0)
  castle.add(platform)
  for (const x of [-.9, .9]) {
    const tower = roundedBox(.72, 2.35, .72, x < 0 ? palette.peach : palette.sky, .2)
    tower.position.set(x, 1.17, -.18)
    castle.add(tower)
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.55, .78, 4), material(x < 0 ? palette.coral : palette.blue))
    cap.rotation.y = Math.PI / 4
    cap.position.set(x, 2.72, -.18)
    cap.castShadow = true
    castle.add(cap)
  }
  const bridge = roundedBox(1.45, .11, .55, 0xd7bb96, .08)
  bridge.position.set(-.05, 2.35, .02)
  castle.add(bridge)
  for (let i = 0; i < 5; i += 1) {
    const rung = roundedBox(.6, .08, .09, palette.cocoa, .04)
    rung.position.set(.92, .5 + i * .36, .62)
    castle.add(rung)
  }
  const railA = roundedBox(.08, 1.85, .08, palette.cocoa, .04)
  const railB = railA.clone()
  railA.position.set(.63, 1.18, .62)
  railB.position.set(1.21, 1.18, .62)
  castle.add(railA, railB)
  const slideCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.9, 2.26, .45),
    new THREE.Vector3(-1.15, 1.8, .75),
    new THREE.Vector3(-1.22, 1.02, 1.05),
    new THREE.Vector3(-1.05, .35, 1.55),
  ])
  const slide = new THREE.Mesh(new THREE.TubeGeometry(slideCurve, 40, .24, 14, false), material(palette.butter, .48))
  slide.castShadow = true
  slide.receiveShadow = true
  castle.add(slide)
  castle.position.copy(castleOrigin)
  world.add(castle)
  obstacles.push({ minX: -5.35, maxX: -2.55, minZ: -4.65, maxZ: -2.35 })
}

const GRID = .45
const MIN_X = -5.75
const MAX_X = 5.75
const MIN_Z = -4.85
const MAX_Z = 4.85
const cols = Math.floor((MAX_X - MIN_X) / GRID) + 1
const rows = Math.floor((MAX_Z - MIN_Z) / GRID) + 1

function toGrid(v: THREE.Vector3) {
  return {
    x: THREE.MathUtils.clamp(Math.round((v.x - MIN_X) / GRID), 0, cols - 1),
    z: THREE.MathUtils.clamp(Math.round((v.z - MIN_Z) / GRID), 0, rows - 1),
  }
}
function toWorld(x: number, z: number) { return new THREE.Vector3(MIN_X + x * GRID, .2, MIN_Z + z * GRID) }
function keyOf(x: number, z: number) { return `${x},${z}` }
function blockedWorld(x: number, z: number) {
  return obstacles.some((o) => x > o.minX - .34 && x < o.maxX + .34 && z > o.minZ - .34 && z < o.maxZ + .34)
}
function blockedGrid(x: number, z: number) {
  const p = toWorld(x, z)
  return blockedWorld(p.x, p.z)
}
function simplifyPath(path: THREE.Vector3[]) {
  if (path.length < 3) return path
  const out = [path[0]]
  let lastDir = new THREE.Vector2(path[1].x - path[0].x, path[1].z - path[0].z).normalize()
  for (let i = 1; i < path.length - 1; i += 1) {
    const dir = new THREE.Vector2(path[i + 1].x - path[i].x, path[i + 1].z - path[i].z).normalize()
    if (dir.distanceTo(lastDir) > .05) out.push(path[i])
    lastDir = dir
  }
  out.push(path[path.length - 1])
  return out
}
function findPath(from: THREE.Vector3, to: THREE.Vector3) {
  const start = toGrid(from)
  const goal = toGrid(to)
  const open = new Set<string>([keyOf(start.x, start.z)])
  const came = new Map<string, string>()
  const g = new Map<string, number>([[keyOf(start.x, start.z), 0]])
  const f = new Map<string, number>([[keyOf(start.x, start.z), Math.abs(start.x - goal.x) + Math.abs(start.z - goal.z)]])
  const coords = new Map<string, { x: number; z: number }>([[keyOf(start.x, start.z), start]])
  let guard = 0
  while (open.size && guard < 5000) {
    guard += 1
    let currentKey = ''
    let best = Infinity
    for (const k of open) {
      const score = f.get(k) ?? Infinity
      if (score < best) { best = score; currentKey = k }
    }
    const current = coords.get(currentKey)!
    if (current.x === goal.x && current.z === goal.z) {
      const result: THREE.Vector3[] = []
      let k = currentKey
      while (k !== keyOf(start.x, start.z)) {
        const c = coords.get(k)!
        result.unshift(toWorld(c.x, c.z))
        k = came.get(k)!
      }
      if (result.length) result[result.length - 1].copy(to).setY(.2)
      return simplifyPath(result)
    }
    open.delete(currentKey)
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
      const nx = current.x + dx
      const nz = current.z + dz
      if (nx < 0 || nx >= cols || nz < 0 || nz >= rows) continue
      const isGoal = nx === goal.x && nz === goal.z
      if (!isGoal && blockedGrid(nx, nz)) continue
      const k = keyOf(nx, nz)
      coords.set(k, { x: nx, z: nz })
      const tentative = (g.get(currentKey) ?? Infinity) + 1
      if (tentative >= (g.get(k) ?? Infinity)) continue
      came.set(k, currentKey)
      g.set(k, tentative)
      f.set(k, tentative + Math.abs(nx - goal.x) + Math.abs(nz - goal.z))
      open.add(k)
    }
  }
  return [to.clone().setY(.2)]
}

type Toy = { key: string; label: string; emoji: string; group: THREE.Group; target: () => THREE.Vector3 }
const toys: Toy[] = []
function registerToy(key: string, label: string, emoji: string, group: THREE.Group, target: () => THREE.Vector3) {
  group.traverse((obj) => { obj.userData.toyKey = key })
  world.add(group)
  toys.push({ key, label, emoji, group, target })
}
castle.traverse((obj) => { obj.userData.toyKey = 'castle' })
toys.push({ key: 'castle', label: '城堡滑梯', emoji: '♜', group: castle, target: () => ladderBase.clone() })

const blockGroup = new THREE.Group()
const blocks: THREE.Mesh[] = []
const looseBlockVelocity = new Map<THREE.Mesh, THREE.Vector3>()
{
  const colors = [palette.coral, palette.butter, palette.sky, palette.mint, palette.lavender]
  const positions = [[0,.25,0],[.48,.25,.05],[-.44,.25,.08],[-.1,.7,.03],[.36,.68,.04]] as const
  positions.forEach(([x,y,z], i) => {
    const b = roundedBox(.48,.48,.48,colors[i],.09)
    b.position.set(x,y,z)
    b.userData.home = new THREE.Vector3(x,y,z)
    b.userData.stackIndex = -1
    blocks.push(b)
    blockGroup.add(b)
  })
  blockGroup.position.set(-3.75,.11,2.72)
  registerToy('blocks','积木','▦',blockGroup,() => new THREE.Vector3(-3.0,.2,2.35))
}
const buildSpot = new THREE.Vector3(-1.65,.18,2.45)
let towerCount = 0

const trainGroup = new THREE.Group()
const trainBody = new THREE.Group()
{
  const body = roundedBox(1.38,.5,.66,palette.coral,.13)
  body.position.y = .48
  trainBody.add(body)
  const cabin = roundedBox(.62,.55,.58,palette.butter,.12)
  cabin.position.set(.32,.9,0)
  trainBody.add(cabin)
  const chimney = cylinder(.11,.42,palette.cocoa)
  chimney.position.set(-.45,.96,0)
  trainBody.add(chimney)
  trainGroup.add(trainBody)
  const track = new THREE.Mesh(new THREE.TorusGeometry(1.66,.045,10,64), material(palette.cocoa))
  track.rotation.x = Math.PI / 2
  track.scale.z = .63
  track.position.y = .14
  trainGroup.add(track)
  trainGroup.position.set(-.65,.02,-2.6)
  registerToy('train','小火车','◉',trainGroup,() => new THREE.Vector3(.35,.2,-1.95))
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
  registerToy('music','木琴','≋',musicGroup,() => new THREE.Vector3(3.42,.2,-.38))
}

const booksGroup = new THREE.Group()
const bookPages: THREE.Mesh[] = []
{
  for (let i = 0; i < 3; i += 1) {
    const book = roundedBox(1,.11,.72,[palette.sky,palette.butter,palette.coral][i],.05)
    book.position.set(i * .05,.16 + i * .12,i * -.025)
    booksGroup.add(book)
  }
  const openL = roundedBox(.66,.04,.88,palette.warmWhite,.04,.96)
  const openR = openL.clone()
  openL.position.set(-.36,.55,0)
  openR.position.set(.36,.55,0)
  openL.rotation.z = -.08
  openR.rotation.z = .08
  bookPages.push(openL,openR)
  booksGroup.add(openL,openR)
  booksGroup.position.set(-5.0,.02,-.35)
  booksGroup.rotation.y = .35
  registerToy('books','绘本','▤',booksGroup,() => new THREE.Vector3(-4.15,.2,-.15))
}

const jellyGroup = new THREE.Group()
let jellyMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial>
let jellyBasePositions: Float32Array
let jellyImpulse = 0
let jellyVelocity = 0
const jellyHome = new THREE.Vector3(.55,.04,3.62)
const jellyDrift = new THREE.Vector3()
const jellyDriftVelocity = new THREE.Vector3()
{
  const geo = new THREE.SphereGeometry(.64,36,28)
  jellyBasePositions = new Float32Array(geo.attributes.position.array as ArrayLike<number>)
  const jellyMat = new THREE.MeshPhysicalMaterial({
    color: palette.pink, roughness: .045, transmission: .86, transparent: true, opacity: .9,
    ior: 1.31, thickness: 1.7, clearcoat: 1, clearcoatRoughness: .07,
    emissive: 0x351014, emissiveIntensity: .08,
  })
  jellyMesh = new THREE.Mesh(geo, jellyMat)
  jellyMesh.position.y = .72
  jellyMesh.castShadow = true
  jellyGroup.add(jellyMesh, shadowDisc(.62,.15))
  for (const x of [-.23,.23]) {
    const eye = sphere(.055,palette.dark)
    eye.position.set(x,.83,.56)
    jellyGroup.add(eye)
  }
  jellyGroup.position.copy(jellyHome)
  registerToy('jelly','果冻','●',jellyGroup,() => new THREE.Vector3(.3,.2,2.7))
}

const ballGroup = new THREE.Group()
const ballVelocity = new THREE.Vector3()
{
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.36,28,20), material(0xf2bf79,.48))
  ball.castShadow = true
  ballGroup.add(ball, shadowDisc(.34,.14))
  ballGroup.position.set(2.05,.47,.85)
  registerToy('ball','软球','○',ballGroup,() => ballGroup.position.clone().setY(.2))
}

type AgentState = 'idle' | 'walking' | 'playing' | 'pickup' | 'carry' | 'handoff' | 'receive' | 'stack' | 'chase' | 'castle'
type Agent = {
  name: string
  group: THREE.Group
  root: THREE.Group
  leftArm: THREE.Group
  rightArm: THREE.Group
  leftLeg: THREE.Group
  rightLeg: THREE.Group
  handAnchor: THREE.Group
  eyes: THREE.Mesh[]
  path: THREE.Vector3[]
  pathIndex: number
  state: AgentState
  timer: number
  targetToy: Toy | null
  heldBlock: THREE.Mesh | null
  color: number
  castlePhase: number
  castleTime: number
}

function createAgent(name: string, color: number, skin: number, hair: number, start: THREE.Vector3, accent: number) {
  const group = new THREE.Group()
  const root = new THREE.Group()
  group.add(root, shadowDisc(.55,.13))
  group.position.copy(start)
  const torso = roundedBox(.68,.92,.5,color,.26)
  torso.position.y = 1.02
  root.add(torso)
  const bib = roundedBox(.48,.54,.515,accent,.14)
  bib.position.set(0,.98,.025)
  root.add(bib)
  for (const x of [-.17,.17]) {
    const strap = roundedBox(.09,.55,.055,accent,.03)
    strap.position.set(x,1.31,.27)
    root.add(strap)
  }
  const head = sphere(.45,skin,.78)
  head.position.y = 1.78
  root.add(head)
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(.46,30,18,0,Math.PI * 2,0,Math.PI * .54), material(hair,.95))
  hairCap.position.y = 1.9
  root.add(hairCap)
  for (const x of [-.3,.3]) {
    const ear = sphere(.085,skin,.8)
    ear.position.set(x,1.78,0)
    root.add(ear)
  }
  const eyes: THREE.Mesh[] = []
  for (const x of [-.16,.16]) {
    const eye = sphere(.038,palette.dark)
    eye.position.set(x,1.79,.42)
    eyes.push(eye)
    root.add(eye)
  }
  const leftArm = new THREE.Group()
  const rightArm = new THREE.Group()
  leftArm.position.set(-.4,1.3,0)
  rightArm.position.set(.4,1.3,0)
  for (const [pivot,side] of [[leftArm,-1],[rightArm,1]] as const) {
    const sleeve = cylinder(.11,.36,color)
    sleeve.position.y = -.15
    pivot.add(sleeve)
    const arm = cylinder(.082,.42,skin)
    arm.position.y = -.48
    pivot.add(arm)
    const hand = sphere(.1,skin,.8)
    hand.position.y = -.72
    pivot.add(hand)
    root.add(pivot)
    pivot.rotation.z = side * .03
  }
  const leftLeg = new THREE.Group()
  const rightLeg = new THREE.Group()
  leftLeg.position.set(-.18,.62,0)
  rightLeg.position.set(.18,.62,0)
  for (const pivot of [leftLeg,rightLeg]) {
    const leg = cylinder(.11,.62,accent)
    leg.position.y = -.27
    pivot.add(leg)
    const shoe = roundedBox(.24,.13,.38,palette.dark,.08)
    shoe.position.set(0,-.58,.08)
    pivot.add(shoe)
    root.add(pivot)
  }
  const handAnchor = new THREE.Group()
  handAnchor.position.set(0,1.05,.64)
  root.add(handAnchor)
  group.userData.agentName = name
  world.add(group)
  const agent: Agent = {
    name, group, root, leftArm, rightArm, leftLeg, rightLeg, handAnchor, eyes,
    path: [], pathIndex: 0, state: 'idle', timer: 0, targetToy: null, heldBlock: null,
    color, castlePhase: -1, castleTime: 0,
  }
  return agent
}

const tao = createAgent('陶陶', palette.sage, 0xe6b18d, 0x56463f, new THREE.Vector3(-.35,.2,.55), 0x728b84)
const momo = createAgent('沫沫', palette.lavender, 0xe8b995, 0x4d403c, new THREE.Vector3(1.0,.2,1.15), 0x7d7392)
const agents = [tao, momo]

let paused = false
let isNight = false
let cinematic = true
let followAgent: Agent | null = null
let lastManualAction = performance.now()
let idleSince = performance.now()
let cooperativeBuild = false
let handoffPending = false
let currentManualToy: Toy | null = null
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function showToast(message: string) {
  toast.textContent = message
  toast.classList.add('show')
  window.setTimeout(() => toast.classList.remove('show'), 1450)
}
function moveAgent(agent: Agent, target: THREE.Vector3, nextState: AgentState, toy: Toy | null = null) {
  agent.path = findPath(agent.group.position, target)
  agent.pathIndex = 0
  agent.state = 'walking'
  agent.timer = 0
  agent.targetToy = toy
  agent.group.userData.nextState = nextState
}
function resetPose(agent: Agent) {
  agent.leftLeg.rotation.set(0,0,0)
  agent.rightLeg.rotation.set(0,0,0)
  agent.leftArm.rotation.set(0,0,0)
  agent.rightArm.rotation.set(0,0,0)
  agent.root.rotation.set(0,0,0)
  agent.root.position.y = 0
}
function availableBlock() {
  return blocks.find((b) => b.userData.stackIndex === -1 && b.parent === blockGroup && !looseBlockVelocity.has(b)) ?? null
}
function worldBlockPosition(block: THREE.Mesh) {
  return block.getWorldPosition(new THREE.Vector3())
}
function pickupBlock(agent: Agent, block: THREE.Mesh) {
  block.updateMatrixWorld(true)
  const worldPos = worldBlockPosition(block)
  block.parent?.remove(block)
  agent.handAnchor.add(block)
  block.position.set(0,0,0)
  block.rotation.set(.1,.1,.1)
  agent.heldBlock = block
  block.userData.stackIndex = -2
  looseBlockVelocity.delete(block)
  agent.group.lookAt(worldPos.x, agent.group.position.y, worldPos.z)
}
function placeBlock(agent: Agent) {
  const block = agent.heldBlock
  if (!block) return
  agent.handAnchor.remove(block)
  world.add(block)
  const index = towerCount
  block.position.set(buildSpot.x + (index % 2) * .08, .28 + index * .5, buildSpot.z + (index % 2) * .04)
  block.rotation.set(0, (index % 2) * .08, 0)
  block.userData.stackIndex = index
  towerCount += 1
  agent.heldBlock = null
}
function dropTowerFromImpact(origin: THREE.Vector3, impulse: THREE.Vector3) {
  for (const block of blocks) {
    if (block.userData.stackIndex < 0 || block.parent !== world) continue
    if (block.position.distanceTo(origin) > 1.2) continue
    block.userData.stackIndex = -1
    const dir = block.position.clone().sub(origin).setY(0)
    if (dir.lengthSq() < .001) dir.set(Math.random()-.5,0,Math.random()-.5)
    dir.normalize().multiplyScalar(.9 + Math.random() * .8)
    dir.addScaledVector(impulse, .25)
    dir.y = 1.2 + Math.random() * .8
    looseBlockVelocity.set(block, dir)
  }
  towerCount = blocks.filter((b) => b.userData.stackIndex >= 0).length
}
function pokeJelly(power = 1, source?: THREE.Vector3) {
  jellyImpulse = Math.min(1.8, jellyImpulse + .75 * power)
  jellyVelocity += 1.0 * power
  if (source) {
    const push = jellyGroup.position.clone().sub(source).setY(0)
    if (push.lengthSq() > .001) jellyDriftVelocity.addScaledVector(push.normalize(), .95 * power)
  }
}
function kickBall(agent: Agent) {
  const dir = ballGroup.position.clone().sub(agent.group.position).setY(0)
  if (dir.lengthSq() < .001) dir.set(1,0,.4)
  dir.normalize()
  ballVelocity.addScaledVector(dir, 3.6)
  agent.leftLeg.rotation.x = -1.0
  agent.rightLeg.rotation.x = .35
}
function startCooperativeBuild(manual = false) {
  cooperativeBuild = true
  currentManualToy = toys.find((t) => t.key === 'blocks') ?? null
  const block = availableBlock()
  if (!block) {
    statusText.textContent = '积木都搭好啦'
    cooperativeBuild = false
    return
  }
  moveAgent(tao, worldBlockPosition(block).setY(.2), 'pickup', currentManualToy)
  moveAgent(momo, new THREE.Vector3(-.45,.2,2.42), 'receive', currentManualToy)
  handoffPending = false
  statusText.textContent = manual ? '两个人一起去搭积木' : 'TA 们决定一起搭积木'
  autoBadge.textContent = '协作搭建'
}
function startChaseBall(manual = false) {
  const toy = toys.find((t) => t.key === 'ball') ?? null
  currentManualToy = toy
  moveAgent(tao, ballGroup.position.clone().add(new THREE.Vector3(-.7,0,0)).setY(.2), 'chase', toy)
  moveAgent(momo, ballGroup.position.clone().add(new THREE.Vector3(.7,0,.2)).setY(.2), 'chase', toy)
  statusText.textContent = manual ? '两个人一起追球' : 'TA 们突然开始追球'
  autoBadge.textContent = '追球中'
}
function startCastle() {
  currentManualToy = toys.find((t) => t.key === 'castle') ?? null
  moveAgent(tao, ladderBase.clone(), 'castle', currentManualToy)
  moveAgent(momo, slideEnd.clone().add(new THREE.Vector3(.8,0,.45)), 'playing', currentManualToy)
  statusText.textContent = '陶陶去爬城堡，沫沫在下面等 TA'
  autoBadge.textContent = '城堡冒险'
}
function startToyPlay(toy: Toy) {
  currentManualToy = toy
  if (toy.key === 'blocks') { startCooperativeBuild(true); return }
  if (toy.key === 'ball') { startChaseBall(true); return }
  if (toy.key === 'castle') { startCastle(); return }
  moveAgent(tao, toy.target(), 'playing', toy)
  const offset = toy.target().clone().add(new THREE.Vector3(.7,0,.4))
  moveAgent(momo, offset, 'playing', toy)
  statusText.textContent = `两个人一起去玩${toy.label}`
  autoBadge.textContent = `去${toy.label}`
}

toys.forEach((toy) => {
  const button = document.createElement('button')
  button.className = 'toy-button'
  button.innerHTML = `<span>${toy.emoji}</span><b>${toy.label}</b>`
  button.addEventListener('click', () => {
    lastManualAction = performance.now()
    showToast(`${toy.emoji} 一起去玩 ${toy.label}`)
    startToyPlay(toy)
  })
  toyButtons.appendChild(button)
})

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
function updatePointer(event: PointerEvent) {
  pointer.x = event.clientX / window.innerWidth * 2 - 1
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
}
function pickables() { return [...toys.map((t) => t.group), ...agents.map((a) => a.group)] }
renderer.domElement.addEventListener('pointermove', (event) => {
  updatePointer(event)
  raycaster.setFromCamera(pointer,camera)
  renderer.domElement.style.cursor = raycaster.intersectObjects(pickables(),true).length ? 'pointer' : 'grab'
})
renderer.domElement.addEventListener('pointerup', (event) => {
  updatePointer(event)
  raycaster.setFromCamera(pointer,camera)
  const hits = raycaster.intersectObjects(pickables(),true)
  if (!hits.length) return
  let obj: THREE.Object3D | null = hits[0].object
  while (obj && !obj.userData.toyKey && !obj.userData.agentName) obj = obj.parent
  if (!obj) return
  if (obj.userData.agentName) {
    followAgent = followAgent?.name === obj.userData.agentName ? null : agents.find((a) => a.name === obj!.userData.agentName) ?? null
    cinematic = true
    cinemaButton.classList.add('active')
    showToast(followAgent ? `◉ 跟随${followAgent.name}` : '⌂ 双人全景')
    return
  }
  const toy = toys.find((t) => t.key === obj!.userData.toyKey)
  if (!toy) return
  if (toy.key === 'jelly') pokeJelly(1.3,camera.position)
  if (toy.key === 'ball') ballVelocity.add(new THREE.Vector3(1.1,0,-.7))
  lastManualAction = performance.now()
  startToyPlay(toy)
})

function setNight(value: boolean) {
  isNight = value
  document.body.classList.toggle('night',value)
  dayButton.textContent = value ? '☾' : '☀︎'
  showToast(value ? '☾ 月亮出来了' : '☀︎ 太阳出来了')
}
dayButton.addEventListener('click', () => setNight(!isNight))
pauseButton.addEventListener('click', () => {
  paused = !paused
  pauseButton.textContent = paused ? '▶' : 'Ⅱ'
  autoBadge.textContent = paused ? '已暂停' : '双人自主中'
})
cinemaButton.addEventListener('click', () => {
  cinematic = !cinematic
  followAgent = null
  cinemaButton.classList.toggle('active',cinematic)
})
resetButton.addEventListener('click', () => {
  camera.position.copy(cameraHome)
  controls.target.set(0,1.3,0)
  controls.autoRotate = true
  followAgent = null
  controls.update()
})
controls.addEventListener('start', () => {
  controls.autoRotate = false
  followAgent = null
  lastManualAction = performance.now()
})

const temp = new THREE.Vector3()
function walkAgent(agent: Agent, delta: number, elapsed: number) {
  if (!agent.path.length || agent.pathIndex >= agent.path.length) return false
  const waypoint = agent.path[agent.pathIndex]
  temp.copy(waypoint).sub(agent.group.position)
  temp.y = 0
  const distance = temp.length()
  if (distance < .11) {
    agent.pathIndex += 1
    if (agent.pathIndex >= agent.path.length) {
      agent.path = []
      agent.pathIndex = 0
      resetPose(agent)
      const next = (agent.group.userData.nextState as AgentState | undefined) ?? 'idle'
      agent.state = next
      agent.timer = 0
      if (next === 'castle') { agent.castlePhase = 0; agent.castleTime = 0 }
      return false
    }
    return true
  }
  temp.normalize()
  agent.group.position.addScaledVector(temp,Math.min(delta * 1.62,distance))
  const desired = Math.atan2(temp.x,temp.z)
  agent.group.rotation.y = THREE.MathUtils.lerp(agent.group.rotation.y,desired,Math.min(1,delta * 8))
  const walk = elapsed * 10 + (agent === momo ? 1.4 : 0)
  agent.leftLeg.rotation.x = Math.sin(walk) * .5
  agent.rightLeg.rotation.x = -Math.sin(walk) * .5
  agent.leftArm.rotation.x = -Math.sin(walk) * (agent.heldBlock ? .12 : .42)
  agent.rightArm.rotation.x = Math.sin(walk) * (agent.heldBlock ? .12 : .42)
  if (agent.heldBlock) {
    agent.leftArm.rotation.x = -.85
    agent.rightArm.rotation.x = -.85
  }
  agent.root.position.y = Math.abs(Math.sin(walk)) * .035
  return true
}

function animateCastle(agent: Agent, delta: number) {
  if (agent.castlePhase < 0) return false
  agent.castleTime += delta
  if (agent.castlePhase === 0) {
    const t = THREE.MathUtils.clamp(agent.castleTime / 2.7,0,1)
    agent.group.position.lerpVectors(ladderBase,ladderTop,t)
    agent.group.rotation.y = Math.PI
    const climb = agent.castleTime * 8
    agent.leftArm.rotation.x = -.8 + Math.sin(climb) * .55
    agent.rightArm.rotation.x = -.8 - Math.sin(climb) * .55
    agent.leftLeg.rotation.x = Math.sin(climb) * .42
    agent.rightLeg.rotation.x = -Math.sin(climb) * .42
    if (t >= 1) { agent.castlePhase = 1; agent.castleTime = 0 }
    return true
  }
  if (agent.castlePhase === 1) {
    const t = THREE.MathUtils.clamp(agent.castleTime / 1.9,0,1)
    agent.group.position.lerpVectors(ladderTop,bridgeEnd,t)
    agent.group.rotation.y = -Math.PI / 2
    if (t >= 1) { agent.castlePhase = 2; agent.castleTime = 0; showToast('↘ 滑下来！') }
    return true
  }
  const t = THREE.MathUtils.clamp(agent.castleTime / 2.25,0,1)
  const p1 = new THREE.Vector3(-5.0,1.65,-2.62)
  const a = bridgeEnd.clone().lerp(p1,t)
  const b = p1.clone().lerp(slideEnd,t)
  agent.group.position.copy(a.lerp(b,t))
  agent.root.rotation.x = -.22
  agent.leftArm.rotation.x = -1.15
  agent.rightArm.rotation.x = -1.15
  if (t >= 1) {
    agent.castlePhase = -1
    agent.state = 'idle'
    resetPose(agent)
    agent.group.position.copy(slideEnd)
    statusText.textContent = '陶陶滑下来啦，沫沫在下面接 TA'
    idleSince = performance.now()
  }
  return true
}

function animateAgentState(agent: Agent, delta: number, elapsed: number) {
  if (walkAgent(agent,delta,elapsed)) return
  if (animateCastle(agent,delta)) return
  agent.timer += delta
  const sway = Math.sin(elapsed * 4 + (agent === momo ? 1.2 : 0))
  if (agent.state === 'pickup') {
    agent.rightArm.rotation.x = -1.2
    agent.leftArm.rotation.x = -.75
    if (agent.timer > .7 && !agent.heldBlock) {
      const block = availableBlock()
      if (block) pickupBlock(agent,block)
    }
    if (agent.timer > 1.1 && agent.heldBlock) {
      handoffPending = true
      moveAgent(agent,new THREE.Vector3(-.55,.2,2.42),'handoff',agent.targetToy)
      moveAgent(momo,new THREE.Vector3(.05,.2,2.42),'receive',agent.targetToy)
    }
    return
  }
  if (agent.state === 'handoff') {
    agent.leftArm.rotation.x = -1.0
    agent.rightArm.rotation.x = -1.0
    if (agent === tao && handoffPending && agent.group.position.distanceTo(momo.group.position) < 1.0 && agent.heldBlock) {
      const block = agent.heldBlock
      agent.handAnchor.remove(block)
      momo.handAnchor.add(block)
      block.position.set(0,0,0)
      agent.heldBlock = null
      momo.heldBlock = block
      handoffPending = false
      agent.state = 'playing'
      momo.state = 'carry'
      momo.timer = 0
      showToast('🤝 把积木递给沫沫')
      statusText.textContent = '陶陶把积木递给沫沫'
      moveAgent(momo,buildSpot.clone().add(new THREE.Vector3(.5,0,0)),'stack',agent.targetToy)
    }
    return
  }
  if (agent.state === 'receive') {
    agent.leftArm.rotation.x = -1.05
    agent.rightArm.rotation.x = -1.05
    return
  }
  if (agent.state === 'carry') {
    agent.leftArm.rotation.x = -.9
    agent.rightArm.rotation.x = -.9
    return
  }
  if (agent.state === 'stack') {
    agent.leftArm.rotation.x = -1.1
    agent.rightArm.rotation.x = -1.1
    if (agent.timer > .8 && agent.heldBlock) {
      placeBlock(agent)
      statusText.textContent = `一起搭到第 ${towerCount} 块`
      autoBadge.textContent = `积木塔 ${towerCount}/5`
    }
    if (agent.timer > 1.25) {
      agent.state = 'idle'
      tao.state = 'idle'
      if (towerCount < blocks.length && cooperativeBuild) {
        window.setTimeout(() => startCooperativeBuild(false), 500)
      } else {
        cooperativeBuild = false
        idleSince = performance.now()
      }
    }
    return
  }
  if (agent.state === 'chase') {
    if (agent.timer < .75) {
      agent.group.lookAt(ballGroup.position.x,agent.group.position.y,ballGroup.position.z)
      agent.leftLeg.rotation.x = -1.0 + sway * .1
      agent.rightLeg.rotation.x = .35
    } else if (agent.timer < 1.0) {
      kickBall(agent)
    } else if (agent.timer > 1.8) {
      agent.state = 'idle'
      idleSince = performance.now()
    }
    return
  }
  if (agent.state === 'playing') {
    agent.leftArm.rotation.x = -.45 + sway * .25
    agent.rightArm.rotation.x = -.45 - sway * .25
    if (agent.targetToy?.key === 'music') agent.rightArm.rotation.x = -1.05 + Math.sin(elapsed * 8) * .35
    if (agent.targetToy?.key === 'books') {
      agent.leftArm.rotation.x = -.85
      agent.rightArm.rotation.x = -.85
      agent.root.rotation.x = -.08
    }
    if (agent.targetToy?.key === 'jelly' && Math.sin(elapsed * 4 + agent.timer) > .94) pokeJelly(.25,agent.group.position)
    if (agent.timer > 4.5) {
      agent.state = 'idle'
      agent.targetToy = null
      resetPose(agent)
      idleSince = performance.now()
    }
    return
  }
  agent.leftArm.rotation.x = Math.sin(elapsed * 1.4 + (agent === momo ? .8 : 0)) * .05
  agent.rightArm.rotation.x = -agent.leftArm.rotation.x
  agent.root.position.y = Math.sin(elapsed * 1.7 + (agent === momo ? 1.2 : 0)) * .012
}

function animateBlocks(delta: number) {
  for (const [block,velocity] of looseBlockVelocity) {
    velocity.y -= 3.8 * delta
    block.position.addScaledVector(velocity,delta)
    block.rotation.x += velocity.z * delta * .7
    block.rotation.z -= velocity.x * delta * .7
    if (block.position.y < .26) {
      block.position.y = .26
      velocity.y = Math.abs(velocity.y) * .28
      velocity.x *= .82
      velocity.z *= .82
      if (velocity.length() < .18) looseBlockVelocity.delete(block)
    }
  }
}

function animateJelly(delta: number, elapsed: number) {
  const spring = -jellyImpulse * 10.5
  jellyVelocity += spring * delta
  jellyVelocity *= Math.pow(.08,delta)
  jellyImpulse += jellyVelocity * delta
  jellyImpulse *= Math.pow(.62,delta)
  jellyDriftVelocity.addScaledVector(jellyDrift,-5.4 * delta)
  jellyDriftVelocity.multiplyScalar(Math.pow(.13,delta))
  jellyDrift.addScaledVector(jellyDriftVelocity,delta)
  jellyGroup.position.copy(jellyHome).add(jellyDrift)
  const attr = jellyMesh.geometry.attributes.position as THREE.BufferAttribute
  const squash = THREE.MathUtils.clamp(jellyImpulse,-.3,.62)
  for (let i = 0; i < attr.count; i += 1) {
    const bx = jellyBasePositions[i * 3]
    const by = jellyBasePositions[i * 3 + 1]
    const bz = jellyBasePositions[i * 3 + 2]
    const ny = by / .64
    const waist = 1 - ny * ny
    const wave = Math.sin(elapsed * 5.2 + ny * 3.4 + bx * 4) * .012 * (1 + Math.abs(squash))
    const lateral = 1 + squash * .28 * waist + Math.sin(elapsed * 2.15) * .018
    attr.setXYZ(i,bx * lateral + wave,by * (1 - squash * .42) + wave * .55,bz * lateral - wave)
  }
  attr.needsUpdate = true
  jellyMesh.geometry.computeVertexNormals()
  jellyMesh.position.y = .72 + Math.max(0,squash) * .11
}

function resolveBallObstacle() {
  const x = ballGroup.position.x
  const z = ballGroup.position.z
  const r = .36
  for (const o of obstacles) {
    if (x + r < o.minX || x - r > o.maxX || z + r < o.minZ || z - r > o.maxZ) continue
    const left = Math.abs((x + r) - o.minX)
    const right = Math.abs(o.maxX - (x - r))
    const top = Math.abs((z + r) - o.minZ)
    const bottom = Math.abs(o.maxZ - (z - r))
    const min = Math.min(left,right,top,bottom)
    if (min === left) { ballGroup.position.x = o.minX - r; ballVelocity.x = -Math.abs(ballVelocity.x) * .72 }
    else if (min === right) { ballGroup.position.x = o.maxX + r; ballVelocity.x = Math.abs(ballVelocity.x) * .72 }
    else if (min === top) { ballGroup.position.z = o.minZ - r; ballVelocity.z = -Math.abs(ballVelocity.z) * .72 }
    else { ballGroup.position.z = o.maxZ + r; ballVelocity.z = Math.abs(ballVelocity.z) * .72 }
  }
}
function animateBall(delta: number) {
  ballGroup.position.addScaledVector(ballVelocity,delta)
  ballVelocity.multiplyScalar(Math.pow(.12,delta))
  const r = .36
  if (ballGroup.position.x < MIN_X + r) { ballGroup.position.x = MIN_X + r; ballVelocity.x = Math.abs(ballVelocity.x) * .78 }
  if (ballGroup.position.x > MAX_X - r) { ballGroup.position.x = MAX_X - r; ballVelocity.x = -Math.abs(ballVelocity.x) * .78 }
  if (ballGroup.position.z < MIN_Z + r) { ballGroup.position.z = MIN_Z + r; ballVelocity.z = Math.abs(ballVelocity.z) * .78 }
  if (ballGroup.position.z > MAX_Z - r) { ballGroup.position.z = MAX_Z - r; ballVelocity.z = -Math.abs(ballVelocity.z) * .78 }
  resolveBallObstacle()
  const jellyDistance = ballGroup.position.distanceTo(jellyGroup.position)
  if (jellyDistance < .95 && ballVelocity.lengthSq() > .15) {
    pokeJelly(Math.min(1.2,ballVelocity.length() * .28),ballGroup.position)
    ballVelocity.multiplyScalar(-.58)
  }
  if (ballGroup.position.distanceTo(buildSpot) < 1.15 && ballVelocity.lengthSq() > .22) {
    dropTowerFromImpact(ballGroup.position,ballVelocity)
  }
  ballGroup.rotation.z -= ballVelocity.x * delta / r
  ballGroup.rotation.x += ballVelocity.z * delta / r
}

function animateToys(elapsed: number) {
  const activeKeys = new Set(agents.map((a) => a.targetToy?.key).filter(Boolean))
  const angle = elapsed * (activeKeys.has('train') ? .9 : .2)
  trainBody.position.set(Math.cos(angle) * 1.1,.02,Math.sin(angle) * .68)
  trainBody.rotation.y = -angle + Math.PI / 2
  musicBars.forEach((bar,i) => {
    const pulse = activeKeys.has('music') && Math.floor(elapsed * 8) % musicBars.length === i ? .12 : 0
    bar.position.y = THREE.MathUtils.lerp(bar.position.y,.33 + pulse,.2)
  })
  if (activeKeys.has('books')) {
    bookPages[0].rotation.z = -.08 - Math.sin(elapsed * 2.3) * .07
    bookPages[1].rotation.z = .08 + Math.sin(elapsed * 2.3) * .07
  }
}

function animateOutside(delta: number, elapsed: number) {
  windowClouds.forEach((cloud,i) => {
    cloud.position.x += delta * (.07 + i * .01)
    if (cloud.position.x > 1.8) cloud.position.x = -1.8
  })
  birds.forEach((bird,i) => {
    bird.position.x += delta * (.24 + i * .04)
    bird.position.y += Math.sin(elapsed * 3 + i) * delta * .03
    if (bird.position.x > 1.8) bird.position.x = -1.8
    bird.children.forEach((wing,j) => { wing.rotation.z = (j === 0 ? 1 : -1) * (.25 + Math.sin(elapsed * 10 + i) * .18) })
  })
  const skyMat = sky.material as THREE.MeshBasicMaterial
  skyMat.color.lerp(new THREE.Color(isNight ? 0x314967 : 0x9fd2ef),Math.min(1,delta * 1.4))
  const sunMat = sunMoon.material as THREE.MeshStandardMaterial
  sunMat.color.lerp(new THREE.Color(isNight ? 0xdbe8ff : 0xffd879),Math.min(1,delta * 1.4))
  sunMoon.position.y = THREE.MathUtils.lerp(sunMoon.position.y,isNight ? .4 : .55,Math.min(1,delta * 1.4))
}

function animateBlink(elapsed: number) {
  agents.forEach((agent,i) => {
    const blink = Math.pow(Math.max(0,Math.sin(elapsed * .72 + i * 2.1)),26)
    agent.eyes.forEach((eye) => { eye.scale.y = Math.max(.08,1 - blink * .96) })
  })
}

function animateLighting(delta: number) {
  const bgTarget = new THREE.Color(isNight ? 0x273143 : 0xf4ead9)
  ;(scene.background as THREE.Color).lerp(bgTarget,Math.min(1,delta * 1.5))
  scene.fog!.color.lerp(bgTarget,Math.min(1,delta * 1.5))
  hemi.intensity = THREE.MathUtils.lerp(hemi.intensity,isNight ? .72 : 2.4,Math.min(1,delta * 1.6))
  sunLight.intensity = THREE.MathUtils.lerp(sunLight.intensity,isNight ? .58 : 4.3,Math.min(1,delta * 1.6))
  fill.intensity = THREE.MathUtils.lerp(fill.intensity,isNight ? 8.5 : 6,Math.min(1,delta * 1.6))
  lampLight.intensity = THREE.MathUtils.lerp(lampLight.intensity,isNight ? 18 : 5,Math.min(1,delta * 1.8))
  bloom.strength = THREE.MathUtils.lerp(bloom.strength,isNight ? .27 : .16,Math.min(1,delta * 1.5))
  renderer.toneMappingExposure = THREE.MathUtils.lerp(renderer.toneMappingExposure,isNight ? .84 : 1.02,Math.min(1,delta * 1.5))
}

const desiredTarget = new THREE.Vector3()
const cameraOffset = new THREE.Vector3()
function animateCamera(delta: number) {
  if (!cinematic || paused) return
  if (followAgent) {
    desiredTarget.copy(followAgent.group.position).add(new THREE.Vector3(0,1.15,0))
    controls.target.lerp(desiredTarget,Math.min(1,delta * 2.4))
    cameraOffset.set(4.3,3.15,5.1).applyAxisAngle(new THREE.Vector3(0,1,0),followAgent.group.rotation.y)
    temp.copy(followAgent.group.position).add(cameraOffset)
    camera.position.lerp(temp,Math.min(1,delta * .7))
    controls.autoRotate = false
    return
  }
  const mid = tao.group.position.clone().lerp(momo.group.position,.5)
  mid.y = 1.2
  controls.target.lerp(mid,Math.min(1,delta * 1.4))
  const busy = agents.some((a) => a.state !== 'idle' || a.path.length)
  controls.autoRotate = !busy && !reducedMotion && performance.now() - lastManualAction > 5000
}

function planner() {
  if (paused || reducedMotion) return
  if (agents.some((a) => a.state !== 'idle' || a.path.length || a.castlePhase >= 0)) return
  const now = performance.now()
  if (now - idleSince < 3600 || now - lastManualAction < 5000) return
  const loose = blocks.filter((b) => b.userData.stackIndex === -1)
  const ballSpeed = ballVelocity.length()
  const choice = Math.random()
  if (loose.length && (towerCount < blocks.length) && choice < .48) {
    startCooperativeBuild(false)
  } else if (ballSpeed > .25 || choice < .72) {
    startChaseBall(false)
  } else if (choice < .84) {
    startCastle()
  } else {
    const toyChoices = toys.filter((t) => !['blocks','ball','castle'].includes(t.key))
    const toy = toyChoices[Math.floor(Math.random() * toyChoices.length)]
    moveAgent(tao,toy.target(),'playing',toy)
    moveAgent(momo,toy.target().clone().add(new THREE.Vector3(.65,0,.35)),'playing',toy)
    statusText.textContent = `TA 们决定一起去玩${toy.label}`
    autoBadge.textContent = `双人 · ${toy.label}`
  }
}

const clock = new THREE.Clock()
function animate() {
  const delta = Math.min(clock.getDelta(),.05)
  const elapsed = clock.elapsedTime
  if (!paused) {
    agents.forEach((agent) => animateAgentState(agent,delta,elapsed))
    animateBlocks(delta)
    animateJelly(delta,elapsed)
    animateBall(delta)
    animateToys(elapsed)
    animateOutside(delta,elapsed)
    animateBlink(elapsed)
    planner()
  }
  animateLighting(delta)
  animateCamera(delta)
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