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
  grass: 0x9fb798,
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
const cameraHome = new THREE.Vector3(12.2, 9.5, 14.1)
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
controls.autoRotateSpeed = 0.24
controls.enablePan = false
controls.update()

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.15, 0.58, 0.9)
composer.addPass(bloom)

const hemi = new THREE.HemisphereLight(0xfff8e8, 0x93a09c, 2.4)
scene.add(hemi)
const sun = new THREE.DirectionalLight(0xffdfb4, 4.3)
sun.position.set(-6.5, 11, 7.5)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = -12
sun.shadow.camera.right = 12
sun.shadow.camera.top = 12
sun.shadow.camera.bottom = -12
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

const dustCount = 110
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

type Obstacle = { minX: number; maxX: number; minZ: number; maxZ: number }
const obstacles: Obstacle[] = [
  { minX: 2.2, maxX: 5.5, minZ: -5.6, maxZ: -4.3 },
  { minX: 3.05, maxX: 5.8, minZ: 1.65, maxZ: 3.75 },
  { minX: 4.95, maxX: 5.9, minZ: -4.45, maxZ: -3.1 },
]

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
function toWorld(x: number, z: number) {
  return new THREE.Vector3(MIN_X + x * GRID, .2, MIN_Z + z * GRID)
}
function nodeKey(x: number, z: number) { return `${x},${z}` }
function blockedWorld(x: number, z: number) {
  return obstacles.some((o) => x > o.minX - .34 && x < o.maxX + .34 && z > o.minZ - .34 && z < o.maxZ + .34)
}
function blockedGrid(x: number, z: number) {
  const p = toWorld(x, z)
  return blockedWorld(p.x, p.z)
}

function findPath(from: THREE.Vector3, to: THREE.Vector3) {
  const start = toGrid(from)
  const goal = toGrid(to)
  const open = new Set<string>([nodeKey(start.x, start.z)])
  const came = new Map<string, string>()
  const g = new Map<string, number>([[nodeKey(start.x, start.z), 0]])
  const f = new Map<string, number>([[nodeKey(start.x, start.z), Math.abs(start.x - goal.x) + Math.abs(start.z - goal.z)]])
  const coords = new Map<string, { x: number; z: number }>([[nodeKey(start.x, start.z), start]])

  let guard = 0
  while (open.size && guard < 5000) {
    guard += 1
    let currentKey = ''
    let currentScore = Infinity
    for (const key of open) {
      const score = f.get(key) ?? Infinity
      if (score < currentScore) { currentScore = score; currentKey = key }
    }
    const current = coords.get(currentKey)!
    if (current.x === goal.x && current.z === goal.z) {
      const result: THREE.Vector3[] = []
      let k = currentKey
      while (k !== nodeKey(start.x, start.z)) {
        const c = coords.get(k)!
        result.unshift(toWorld(c.x, c.z))
        k = came.get(k)!
      }
      if (result.length) result[result.length - 1].copy(to).setY(.2)
      return simplifyPath(result)
    }
    open.delete(currentKey)
    const neighbors = [[1,0],[-1,0],[0,1],[0,-1]] as const
    for (const [dx, dz] of neighbors) {
      const nx = current.x + dx
      const nz = current.z + dz
      if (nx < 0 || nx >= cols || nz < 0 || nz >= rows) continue
      const isGoal = nx === goal.x && nz === goal.z
      if (!isGoal && blockedGrid(nx, nz)) continue
      const key = nodeKey(nx, nz)
      coords.set(key, { x: nx, z: nz })
      const tentative = (g.get(currentKey) ?? Infinity) + 1
      if (tentative >= (g.get(key) ?? Infinity)) continue
      came.set(key, currentKey)
      g.set(key, tentative)
      f.set(key, tentative + Math.abs(nx - goal.x) + Math.abs(nz - goal.z))
      open.add(key)
    }
  }
  return [to.clone().setY(.2)]
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

type Toy = {
  key: string
  label: string
  emoji: string
  group: THREE.Group
  target: () => THREE.Vector3
}
const toys: Toy[] = []
function registerToy(key: string, label: string, emoji: string, group: THREE.Group, target: () => THREE.Vector3) {
  group.traverse((obj) => { obj.userData.toyKey = key })
  room.add(group)
  toys.push({ key, label, emoji, group, target })
}

const castleGroup = new THREE.Group()
const castleOrigin = new THREE.Vector3(-3.75, .05, -3.45)
const ladderBase = new THREE.Vector3(-2.78, .2, -2.48)
const ladderTop = new THREE.Vector3(-2.95, 2.38, -3.13)
const bridgeEnd = new THREE.Vector3(-4.35, 2.38, -3.22)
const slideEnd = new THREE.Vector3(-4.8, .2, -1.82)
{
  const platform = roundedBox(2.35, .22, 1.55, palette.mint, .14)
  platform.position.set(0, 2.2, 0)
  castleGroup.add(platform)
  for (const x of [-.9, .9]) {
    const tower = roundedBox(.72, 2.35, .72, x < 0 ? palette.peach : palette.sky, .2)
    tower.position.set(x, 1.17, -.18)
    castleGroup.add(tower)
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.55, .78, 4), material(x < 0 ? palette.coral : palette.blue))
    cap.rotation.y = Math.PI / 4
    cap.position.set(x, 2.72, -.18)
    cap.castShadow = true
    castleGroup.add(cap)
  }
  const bridge = roundedBox(1.45, .11, .55, 0xd7bb96, .08)
  bridge.position.set(-.05, 2.35, .02)
  castleGroup.add(bridge)
  for (const z of [-.3, .3]) {
    const rail = roundedBox(1.7, .08, .08, palette.cocoa, .04)
    rail.position.set(-.05, 2.75, z)
    castleGroup.add(rail)
  }
  for (let i = 0; i < 5; i += 1) {
    const rung = roundedBox(.6, .08, .09, palette.cocoa, .04)
    rung.position.set(.92, .5 + i * .36, .62)
    castleGroup.add(rung)
  }
  const ladderRailA = roundedBox(.08, 1.85, .08, palette.cocoa, .04)
  const ladderRailB = ladderRailA.clone()
  ladderRailA.position.set(.63, 1.18, .62)
  ladderRailB.position.set(1.21, 1.18, .62)
  castleGroup.add(ladderRailA, ladderRailB)
  const slideCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.9, 2.26, .45),
    new THREE.Vector3(-1.15, 1.8, .75),
    new THREE.Vector3(-1.22, 1.02, 1.05),
    new THREE.Vector3(-1.05, .35, 1.55),
  ])
  const slide = new THREE.Mesh(
    new THREE.TubeGeometry(slideCurve, 40, .24, 14, false),
    new THREE.MeshStandardMaterial({ color: palette.butter, roughness: .48, metalness: 0 }),
  )
  slide.castShadow = true
  slide.receiveShadow = true
  castleGroup.add(slide)
  for (let i = 0; i < 4; i += 1) {
    const flagPole = cylinder(.025, .8, palette.cocoa, 12)
    flagPole.position.set(i < 2 ? -.9 : .9, 3.18, -.18)
    castleGroup.add(flagPole)
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(.38, .24), material(i % 2 ? palette.coral : palette.lavender))
    flag.position.set((i < 2 ? -.9 : .9) + .19, 3.38, -.18)
    castleGroup.add(flag)
    break
  }
  castleGroup.position.copy(castleOrigin)
  registerToy('castle', '城堡滑梯', '♜', castleGroup, () => ladderBase.clone())
  obstacles.push({ minX: -5.35, maxX: -2.55, minZ: -4.65, maxZ: -2.35 })
}

const blockGroup = new THREE.Group()
const blockBaseY: number[] = []
{
  const cols2 = [palette.coral, palette.butter, palette.sky, palette.mint, palette.lavender]
  const positions: Array<[number, number, number, number]> = [[0,.25,0,0],[.48,.25,.05,.18],[-.44,.25,.08,-.12],[-.1,.7,.03,.08],[.36,.68,.04,-.18]]
  positions.forEach(([x,y,z,r], i) => {
    const b = roundedBox(.48,.48,.48,cols2[i],.09)
    b.position.set(x,y,z)
    b.rotation.y = r
    blockBaseY.push(y)
    blockGroup.add(b)
  })
  blockGroup.position.set(-3.8,.11,2.7)
  registerToy('blocks','积木','▦',blockGroup,() => new THREE.Vector3(-3.05,.2,2.35))
}

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
  for (const x of [-.47,.45]) {
    for (const z of [-.36,.36]) {
      const wheel = cylinder(.18,.12,palette.dark)
      wheel.rotation.x = Math.PI / 2
      wheel.position.set(x,.25,z)
      trainBody.add(wheel)
    }
  }
  trainGroup.add(trainBody)
  const track = new THREE.Mesh(new THREE.TorusGeometry(1.66,.045,10,64), material(palette.cocoa))
  track.rotation.x = Math.PI / 2
  track.scale.z = .63
  track.position.y = .14
  trainGroup.add(track)
  trainGroup.position.set(-.65,.02,-2.6)
  registerToy('train','小火车','◉',trainGroup,() => new THREE.Vector3(.35,.2,-1.95))
}

const ringGroup = new THREE.Group()
const rings: THREE.Mesh[] = []
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
    rings.push(ring)
    ringGroup.add(ring)
  })
  ringGroup.position.set(2.0,.03,2.7)
  registerToy('rings','套圈','◎',ringGroup,() => new THREE.Vector3(1.3,.2,2.15))
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
    book.rotation.y = (i - 1) * .08
    booksGroup.add(book)
  }
  const openL = roundedBox(.66,.04,.88,palette.warmWhite,.04,.96)
  const openR = openL.clone()
  openL.position.set(-.36,.55,0)
  openR.position.set(.36,.55,0)
  openL.rotation.z = -.08
  openR.rotation.z = .08
  bookPages.push(openL, openR)
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
const jellyHome = new THREE.Vector3(.45,.04,3.62)
const jellyDrift = new THREE.Vector3()
const jellyDriftVelocity = new THREE.Vector3()
{
  const jellyMaterial = new THREE.MeshPhysicalMaterial({
    color: palette.pink,
    roughness: .045,
    transmission: .86,
    transparent: true,
    opacity: .9,
    ior: 1.31,
    thickness: 1.7,
    clearcoat: 1,
    clearcoatRoughness: .07,
    emissive: 0x351014,
    emissiveIntensity: .08,
  })
  const geo = new THREE.SphereGeometry(.64,36,28)
  jellyBasePositions = new Float32Array(geo.attributes.position.array as ArrayLike<number>)
  jellyMesh = new THREE.Mesh(geo, jellyMaterial)
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
  jellyGroup.position.copy(jellyHome)
  registerToy('jelly','果冻','●',jellyGroup,() => jellyGroup.position.clone().add(new THREE.Vector3(-.25,.16,-.9)))
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
  const head2 = sphere(.3,palette.butter)
  head2.position.set(.63,1.35,0)
  rockerGroup.add(head2)
  rockerGroup.position.set(2.1,.06,-3.6)
  rockerGroup.rotation.y = -.38
  registerToy('rocker','木马','⌁',rockerGroup,() => new THREE.Vector3(1.35,.2,-3.0))
}

const ballGroup = new THREE.Group()
const ballHome = new THREE.Vector3(-2.15,.38,3.8)
const ballVelocity = new THREE.Vector3()
{
  const ball = sphere(.36, palette.coral, .48)
  const band = new THREE.Mesh(new THREE.TorusGeometry(.28,.025,10,32), material(palette.warmWhite,.55))
  band.rotation.x = Math.PI / 2
  ballGroup.add(ball, band, contactShadow(.34,.12))
  ballGroup.position.copy(ballHome)
  registerToy('ball','软球','●',ballGroup,() => ballGroup.position.clone().add(new THREE.Vector3(.65,-.18,-.45)))
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
const eyes: THREE.Mesh[] = []
for (const x of [-.16,.16]) {
  const eye = sphere(.038,palette.dark)
  eye.position.set(x,1.79,.42)
  eyes.push(eye)
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
character.position.set(-.35,.2,.55)
character.scale.setScalar(.92)
scene.add(character)

const footprintGroup = new THREE.Group()
scene.add(footprintGroup)
type Footprint = { mesh: THREE.Mesh; life: number }
const footprints: Footprint[] = []
let footprintTimer = 0
function addFootprint() {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(.075,16),
    new THREE.MeshBasicMaterial({ color: 0x7b6759, transparent: true, opacity: .12, depthWrite: false }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.copy(character.position)
  mesh.position.y = .135
  const side = footprints.length % 2 ? .11 : -.11
  mesh.position.x += Math.cos(character.rotation.y) * side
  mesh.position.z -= Math.sin(character.rotation.y) * side
  footprintGroup.add(mesh)
  footprints.push({ mesh, life: 7 })
  if (footprints.length > 32) {
    const old = footprints.shift()!
    footprintGroup.remove(old.mesh)
    old.mesh.geometry.dispose()
    ;(old.mesh.material as THREE.Material).dispose()
  }
}

let activeToy: Toy | null = null
let walkPath: THREE.Vector3[] = []
let walkIndex = 0
let paused = false
let isNight = false
let cinematic = true
let followCharacter = false
let lastManualAction = performance.now()
let idleSince = performance.now()
let actionTime = 0
let castlePhase = -1
let castleTime = 0
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function showToast(message: string) {
  toast.textContent = message
  toast.classList.add('show')
  window.setTimeout(() => toast.classList.remove('show'), 1450)
}

function kickBall() {
  const dir = ballGroup.position.clone().sub(character.position).setY(0)
  if (dir.lengthSq() < .001) dir.set(1,0,.4)
  dir.normalize()
  ballVelocity.addScaledVector(dir, 3.4)
  ballVelocity.y = 0
}

function pokeJelly(power = 1, source?: THREE.Vector3) {
  jellyImpulse = Math.min(1.7, jellyImpulse + .72 * power)
  jellyVelocity += .95 * power
  if (source) {
    const push = jellyGroup.position.clone().sub(source).setY(0)
    if (push.lengthSq() > .001) jellyDriftVelocity.addScaledVector(push.normalize(), .9 * power)
  }
}

function chooseToy(toy: Toy, manual = true) {
  activeToy = toy
  actionTime = 0
  castlePhase = -1
  const target = toy.target()
  walkPath = findPath(character.position, target)
  walkIndex = 0
  statusText.textContent = `正在绕开障碍去${toy.label}`
  autoBadge.textContent = `路径 ${Math.max(1, walkPath.length)} 段`
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
  if (key === 'jelly') pokeJelly(1.3, camera.position)
  if (key === 'ball') ballVelocity.add(new THREE.Vector3(1.1,0,-.7))
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
  controls.target.set(0,1.3,0)
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

function resetPose() {
  leftLegPivot.rotation.set(0,0,0)
  rightLegPivot.rotation.set(0,0,0)
  leftArmPivot.rotation.set(0,0,0)
  rightArmPivot.rotation.set(0,0,0)
  characterRoot.rotation.set(0,0,0)
  characterRoot.position.y = 0
}

function animateWalk(delta: number, elapsed: number) {
  if (!walkPath.length || walkIndex >= walkPath.length) return false
  const waypoint = walkPath[walkIndex]
  temp.copy(waypoint).sub(character.position)
  temp.y = 0
  const distance = temp.length()
  if (distance < .11) {
    walkIndex += 1
    if (walkIndex >= walkPath.length) {
      walkPath = []
      walkIndex = 0
      resetPose()
      if (activeToy?.key === 'castle') {
        castlePhase = 0
        castleTime = 0
        statusText.textContent = '开始爬城堡啦'
        autoBadge.textContent = '攀爬中'
      } else {
        actionTime = 0
        statusText.textContent = activeToy ? `正在玩${activeToy.label}` : '到达目的地'
        autoBadge.textContent = '互动中'
        if (activeToy?.key === 'jelly') pokeJelly(1.15, character.position)
        if (activeToy?.key === 'ball') kickBall()
      }
      return false
    }
    return true
  }
  temp.normalize()
  character.position.addScaledVector(temp, Math.min(delta * 1.62, distance))
  const desired = Math.atan2(temp.x,temp.z)
  character.rotation.y = THREE.MathUtils.lerp(character.rotation.y,desired,Math.min(1,delta * 8))
  const walk = elapsed * 10
  leftLegPivot.rotation.x = Math.sin(walk) * .5
  rightLegPivot.rotation.x = -Math.sin(walk) * .5
  leftArmPivot.rotation.x = -Math.sin(walk) * .42
  rightArmPivot.rotation.x = Math.sin(walk) * .42
  characterRoot.position.y = Math.abs(Math.sin(walk)) * .04
  characterRoot.rotation.z = Math.sin(walk * .5) * .025
  footprintTimer += delta
  if (footprintTimer > .28) { footprintTimer = 0; addFootprint() }
  return true
}

function animateCastleAdventure(delta: number) {
  if (castlePhase < 0) return false
  castleTime += delta
  if (castlePhase === 0) {
    const duration = 2.7
    const t = THREE.MathUtils.clamp(castleTime / duration, 0, 1)
    character.position.lerpVectors(ladderBase, ladderTop, t)
    character.rotation.y = Math.PI
    const climb = castleTime * 8
    leftArmPivot.rotation.x = -.8 + Math.sin(climb) * .55
    rightArmPivot.rotation.x = -.8 - Math.sin(climb) * .55
    leftLegPivot.rotation.x = Math.sin(climb) * .42
    rightLegPivot.rotation.x = -Math.sin(climb) * .42
    characterRoot.position.y = Math.sin(climb * 2) * .025
    if (t >= 1) { castlePhase = 1; castleTime = 0; statusText.textContent = '走过小桥' }
    return true
  }
  if (castlePhase === 1) {
    const duration = 1.9
    const t = THREE.MathUtils.clamp(castleTime / duration, 0, 1)
    character.position.lerpVectors(ladderTop, bridgeEnd, t)
    character.rotation.y = -Math.PI / 2
    const walk = castleTime * 9
    leftLegPivot.rotation.x = Math.sin(walk) * .38
    rightLegPivot.rotation.x = -Math.sin(walk) * .38
    leftArmPivot.rotation.x = -Math.sin(walk) * .3
    rightArmPivot.rotation.x = Math.sin(walk) * .3
    if (t >= 1) { castlePhase = 2; castleTime = 0; statusText.textContent = '滑下去！'; showToast('↘ 滑滑梯') }
    return true
  }
  if (castlePhase === 2) {
    const duration = 2.25
    const t = THREE.MathUtils.clamp(castleTime / duration, 0, 1)
    const p0 = bridgeEnd
    const p1 = new THREE.Vector3(-5.0, 1.65, -2.62)
    const p2 = slideEnd
    const a = p0.clone().lerp(p1,t)
    const b = p1.clone().lerp(p2,t)
    character.position.copy(a.lerp(b,t))
    character.rotation.y = -2.55
    characterRoot.rotation.x = -.22
    leftArmPivot.rotation.x = -1.15
    rightArmPivot.rotation.x = -1.15
    if (t >= 1) {
      castlePhase = -1
      castleTime = 0
      activeToy = null
      resetPose()
      character.position.copy(slideEnd)
      idleSince = performance.now()
      statusText.textContent = '滑完啦，继续探索'
      autoBadge.textContent = '自动探索中'
    }
    return true
  }
  return false
}

function animatePlay(delta: number) {
  if (!activeToy || walkPath.length || castlePhase >= 0) return
  actionTime += delta
  const s = Math.sin(actionTime * 5)
  characterRoot.position.y = .015 + Math.abs(Math.sin(actionTime * 3)) * .018
  characterRoot.rotation.z = s * .025
  leftArmPivot.rotation.x = -.45 + s * .28
  rightArmPivot.rotation.x = -.45 - s * .28
  if (activeToy.key === 'books') {
    characterRoot.rotation.x = -.1 + Math.sin(actionTime * 2) * .02
    leftArmPivot.rotation.x = -.85
    rightArmPivot.rotation.x = -.85
  } else if (activeToy.key === 'music') {
    rightArmPivot.rotation.x = -1.08 + Math.sin(actionTime * 8) * .35
  } else if (activeToy.key === 'rocker') {
    characterRoot.rotation.z = Math.sin(actionTime * 3.5) * .08
  } else if (activeToy.key === 'blocks') {
    rightArmPivot.rotation.x = -1.1 + Math.sin(actionTime * 4) * .24
  } else if (activeToy.key === 'rings') {
    leftArmPivot.rotation.x = -1.05 + Math.sin(actionTime * 4.5) * .2
  } else if (activeToy.key === 'jelly' && Math.sin(actionTime * 4.2) > .93) {
    pokeJelly(.34, character.position)
  } else if (activeToy.key === 'ball' && Math.sin(actionTime * 2.4) > .94) {
    kickBall()
  }
  if (actionTime > 5.6) {
    activeToy = null
    actionTime = 0
    resetPose()
    idleSince = performance.now()
    statusText.textContent = '玩够啦，准备继续逛'
    autoBadge.textContent = '自动探索中'
  }
}

function animateCharacter(delta: number, elapsed: number) {
  if (paused) return
  if (animateCastleAdventure(delta)) return
  if (animateWalk(delta, elapsed)) return
  if (activeToy) {
    animatePlay(delta)
  } else {
    leftArmPivot.rotation.x = Math.sin(elapsed * 1.4) * .05
    rightArmPivot.rotation.x = -Math.sin(elapsed * 1.4) * .05
    leftLegPivot.rotation.x *= .88
    rightLegPivot.rotation.x *= .88
    characterRoot.position.y = Math.sin(elapsed * 1.7) * .012
    characterRoot.rotation.z *= .9
  }
  const blinkCycle = elapsed % 4.8
  const blink = blinkCycle > 4.62 ? .12 : 1
  eyes.forEach((eye) => { eye.scale.y = THREE.MathUtils.lerp(eye.scale.y, blink, .5) })
}

function animateToys(delta: number, elapsed: number) {
  const active = activeToy?.key
  const trainAngle = elapsed * (active === 'train' ? .75 : .08)
  trainBody.position.set(Math.cos(trainAngle) * .55, 0, Math.sin(trainAngle) * .34)
  trainBody.rotation.y = -trainAngle + Math.PI / 2
  rockerGroup.rotation.z = active === 'rocker' ? Math.sin(elapsed * 3.5) * .12 : THREE.MathUtils.lerp(rockerGroup.rotation.z,0,.06)
  ringGroup.rotation.y = active === 'rings' ? Math.sin(elapsed * 2.8) * .09 : THREE.MathUtils.lerp(ringGroup.rotation.y,0,.06)
  rings.forEach((ring, i) => {
    ring.position.y = .45 + i * .17 + (active === 'rings' ? Math.max(0, Math.sin(elapsed * 5 - i)) * .12 : 0)
  })
  blockGroup.children.forEach((child,i) => {
    const pulse = active === 'blocks' && Math.floor(elapsed * 2.4) % blockGroup.children.length === i ? .12 : 0
    child.position.y = THREE.MathUtils.lerp(child.position.y, blockBaseY[i] + pulse, .2)
    child.rotation.y += active === 'blocks' ? delta * (.12 + i * .03) : 0
  })
  musicBars.forEach((bar,i) => {
    const pulse = active === 'music' && Math.floor(elapsed * 8) % musicBars.length === i ? .12 : 0
    bar.position.y = THREE.MathUtils.lerp(bar.position.y,.33 + pulse,.22)
  })
  booksGroup.rotation.z = active === 'books' ? Math.sin(elapsed * 2) * .025 : THREE.MathUtils.lerp(booksGroup.rotation.z,0,.08)
  if (active === 'books') {
    bookPages[0].rotation.z = -.08 - Math.max(0, Math.sin(elapsed * 2.4)) * .22
    bookPages[1].rotation.z = .08 + Math.max(0, Math.sin(elapsed * 2.4)) * .22
  } else {
    bookPages[0].rotation.z = THREE.MathUtils.lerp(bookPages[0].rotation.z,-.08,.08)
    bookPages[1].rotation.z = THREE.MathUtils.lerp(bookPages[1].rotation.z,.08,.08)
  }
  castleGroup.rotation.y = Math.sin(elapsed * .7) * .006
}

function animateJelly(delta: number, elapsed: number) {
  if (paused) return
  const spring = -jellyImpulse * 10.5
  jellyVelocity += spring * delta
  jellyVelocity *= Math.pow(.08,delta)
  jellyImpulse += jellyVelocity * delta
  jellyImpulse *= Math.pow(.62,delta)

  jellyDriftVelocity.addScaledVector(jellyDrift, -5.4 * delta)
  jellyDriftVelocity.multiplyScalar(Math.pow(.13, delta))
  jellyDrift.addScaledVector(jellyDriftVelocity, delta)
  jellyGroup.position.copy(jellyHome).add(jellyDrift)

  const geo = jellyMesh.geometry
  const attr = geo.attributes.position as THREE.BufferAttribute
  const squash = THREE.MathUtils.clamp(jellyImpulse,-.3,.62)
  for (let i = 0; i < attr.count; i += 1) {
    const bx = jellyBasePositions[i * 3]
    const by = jellyBasePositions[i * 3 + 1]
    const bz = jellyBasePositions[i * 3 + 2]
    const ny = by / .64
    const waist = 1 - ny * ny
    const wave = Math.sin(elapsed * 5.2 + ny * 3.4 + bx * 4) * .012 * (1 + Math.abs(squash))
    const lateral = 1 + squash * .28 * waist + Math.sin(elapsed * 2.15) * .018
    attr.setXYZ(i, bx * lateral + wave, by * (1 - squash * .42) + wave * .55, bz * lateral - wave)
  }
  attr.needsUpdate = true
  geo.computeVertexNormals()
  jellyMesh.position.y = .72 + Math.max(0,squash) * .11
  jellyMesh.rotation.y += delta * .22
  jellyGroup.rotation.z = Math.sin(elapsed * 2.7) * squash * .09

  if (character.position.distanceTo(jellyGroup.position) < 1.0 && activeToy?.key !== 'jelly' && walkPath.length) {
    pokeJelly(.1, character.position)
  }
}

function resolveBallObstacle() {
  const x = ballGroup.position.x
  const z = ballGroup.position.z
  const r = .36
  for (const o of obstacles) {
    if (x + r < o.minX || x - r > o.maxX || z + r < o.minZ || z - r > o.maxZ) continue
    const left = Math.abs((x + r) - o.minX)
    const right = Math.abs((o.maxX) - (x - r))
    const top = Math.abs((z + r) - o.minZ)
    const bottom = Math.abs((o.maxZ) - (z - r))
    const min = Math.min(left,right,top,bottom)
    if (min === left) { ballGroup.position.x = o.minX - r; ballVelocity.x = -Math.abs(ballVelocity.x) * .72 }
    else if (min === right) { ballGroup.position.x = o.maxX + r; ballVelocity.x = Math.abs(ballVelocity.x) * .72 }
    else if (min === top) { ballGroup.position.z = o.minZ - r; ballVelocity.z = -Math.abs(ballVelocity.z) * .72 }
    else { ballGroup.position.z = o.maxZ + r; ballVelocity.z = Math.abs(ballVelocity.z) * .72 }
  }
}

function animateBall(delta: number) {
  if (paused) return
  ballGroup.position.addScaledVector(ballVelocity, delta)
  ballVelocity.multiplyScalar(Math.pow(.12, delta))
  const r = .36
  if (ballGroup.position.x < MIN_X + r) { ballGroup.position.x = MIN_X + r; ballVelocity.x = Math.abs(ballVelocity.x) * .78 }
  if (ballGroup.position.x > MAX_X - r) { ballGroup.position.x = MAX_X - r; ballVelocity.x = -Math.abs(ballVelocity.x) * .78 }
  if (ballGroup.position.z < MIN_Z + r) { ballGroup.position.z = MIN_Z + r; ballVelocity.z = Math.abs(ballVelocity.z) * .78 }
  if (ballGroup.position.z > MAX_Z - r) { ballGroup.position.z = MAX_Z - r; ballVelocity.z = -Math.abs(ballVelocity.z) * .78 }
  resolveBallObstacle()
  ballGroup.rotation.z -= ballVelocity.x * delta / r
  ballGroup.rotation.x += ballVelocity.z * delta / r
}

function animateFootprints(delta: number) {
  for (let i = footprints.length - 1; i >= 0; i -= 1) {
    const f = footprints[i]
    f.life -= delta
    const mat = f.mesh.material as THREE.MeshBasicMaterial
    mat.opacity = Math.min(.12, Math.max(0, f.life / 7 * .12))
    if (f.life <= 0) {
      footprintGroup.remove(f.mesh)
      f.mesh.geometry.dispose()
      mat.dispose()
      footprints.splice(i,1)
    }
  }
}

function animateLighting(delta: number, elapsed: number) {
  const bgTarget = new THREE.Color(isNight ? 0x273143 : 0xf4ead9)
  ;(scene.background as THREE.Color).lerp(bgTarget,Math.min(1,delta * 1.5))
  scene.fog!.color.lerp(bgTarget,Math.min(1,delta * 1.5))
  hemi.intensity = THREE.MathUtils.lerp(hemi.intensity,isNight ? .72 : 2.4,Math.min(1,delta * 1.6))
  sun.intensity = THREE.MathUtils.lerp(sun.intensity,isNight ? .62 : 4.3,Math.min(1,delta * 1.6))
  windowGlow.intensity = THREE.MathUtils.lerp(windowGlow.intensity,isNight ? 1.8 : 11,Math.min(1,delta * 1.6))
  fill.intensity = THREE.MathUtils.lerp(fill.intensity,isNight ? 8.5 : 6,Math.min(1,delta * 1.6))
  lampLight.intensity = THREE.MathUtils.lerp(lampLight.intensity,isNight ? 18 : 5,Math.min(1,delta * 1.8))
  bloom.strength = THREE.MathUtils.lerp(bloom.strength,isNight ? .26 : .15,Math.min(1,delta * 1.5))
  renderer.toneMappingExposure = THREE.MathUtils.lerp(renderer.toneMappingExposure,isNight ? .84 : 1.02,Math.min(1,delta * 1.5))
  const dustMat = dust.material as THREE.PointsMaterial
  dustMat.opacity = isNight ? .18 + Math.sin(elapsed) * .025 : .34 + Math.sin(elapsed * .7) * .035
}

function animateCamera(delta: number) {
  if (!cinematic || paused) return
  if (followCharacter) {
    desiredTarget.copy(character.position).add(new THREE.Vector3(0,1.15,0))
    controls.target.lerp(desiredTarget,Math.min(1,delta * 2.5))
    cameraOffset.set(4.5,3.25,5.3).applyAxisAngle(new THREE.Vector3(0,1,0),character.rotation.y)
    temp.copy(character.position).add(cameraOffset)
    camera.position.lerp(temp,Math.min(1,delta * .72))
    controls.autoRotate = false
    return
  }
  if (walkPath.length || activeToy || castlePhase >= 0) {
    const focus = activeToy?.group.getWorldPosition(new THREE.Vector3()) ?? character.position
    desiredTarget.copy(character.position).lerp(focus,.4)
    desiredTarget.y = castlePhase >= 0 ? Math.max(1.2, character.position.y + .25) : 1.08
    controls.target.lerp(desiredTarget,Math.min(1,delta * 1.7))
    controls.autoRotate = false
    if (castlePhase >= 0) {
      temp.set(2.8,3.2,4.2).add(character.position)
      camera.position.lerp(temp, Math.min(1, delta * .42))
    }
  } else if (performance.now() - lastManualAction > 5000) {
    desiredTarget.set(0,1.3,0)
    controls.target.lerp(desiredTarget,Math.min(1,delta * .8))
    controls.autoRotate = !reducedMotion
  }
}

function maybeAutoExplore() {
  if (paused || walkPath.length || activeToy || castlePhase >= 0 || reducedMotion) return
  const now = performance.now()
  if (now - idleSince < 3600 || now - lastManualAction < 5000) return
  const toy = toys[Math.floor(Math.random() * toys.length)]
  chooseToy(toy,false)
  statusText.textContent = `TA 自己发现了${toy.label}`
  autoBadge.textContent = `去${toy.label}`
}

function animate() {
  const delta = Math.min(clock.getDelta(),.05)
  const elapsed = clock.elapsedTime
  animateCharacter(delta,elapsed)
  animateToys(delta,elapsed)
  animateJelly(delta,elapsed)
  animateBall(delta)
  animateFootprints(delta)
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
