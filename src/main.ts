import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import './style.css'

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!
const statusText = document.querySelector<HTMLElement>('#statusText')!
const toyButtons = document.querySelector<HTMLElement>('#toyButtons')!
const toast = document.querySelector<HTMLElement>('#toast')!
const dayButton = document.querySelector<HTMLButtonElement>('#dayButton')!
const pauseButton = document.querySelector<HTMLButtonElement>('#pauseButton')!
const resetButton = document.querySelector<HTMLButtonElement>('#resetButton')!

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
}

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xf4ead9)
scene.fog = new THREE.FogExp2(0xf4ead9, 0.025)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.03

const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100)
const cameraHome = new THREE.Vector3(11.8, 9.5, 13.2)
camera.position.copy(cameraHome)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 1.25, 0)
controls.enableDamping = true
controls.dampingFactor = 0.055
controls.minDistance = 8
controls.maxDistance = 25
controls.minPolarAngle = 0.38
controls.maxPolarAngle = Math.PI * 0.49
controls.autoRotate = true
controls.autoRotateSpeed = 0.36
controls.enablePan = false
controls.update()

let resumeAutoRotateAt = 0
controls.addEventListener('start', () => {
  controls.autoRotate = false
  resumeAutoRotateAt = performance.now() + 9000
})

const hemi = new THREE.HemisphereLight(0xfff7e8, 0x9aa6a0, 2.35)
scene.add(hemi)

const sun = new THREE.DirectionalLight(0xffe1b9, 4.2)
sun.position.set(-6, 11, 8)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = -11
sun.shadow.camera.right = 11
sun.shadow.camera.top = 11
sun.shadow.camera.bottom = -11
sun.shadow.bias = -0.0005
scene.add(sun)

const windowGlow = new THREE.PointLight(0xffcda4, 12, 10, 1.8)
windowGlow.position.set(-5.2, 4.8, -4.9)
scene.add(windowGlow)

const fill = new THREE.PointLight(0xb8d8ee, 6, 10, 2)
fill.position.set(5, 5, 1)
scene.add(fill)

const room = new THREE.Group()
scene.add(room)

function material(color: number, roughness = 0.72): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })
}

function roundedBox(
  w: number,
  h: number,
  d: number,
  color: number,
  radius = 0.12,
  roughness = 0.72,
): THREE.Mesh {
  const geometry = new RoundedBoxGeometry(w, h, d, 5, Math.min(radius, w / 2, h / 2, d / 2))
  const mesh = new THREE.Mesh(geometry, material(color, roughness))
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function cylinder(radius: number, height: number, color: number, segments = 24): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, segments),
    material(color),
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function sphere(radius: number, color: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 30, 20), material(color))
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

const floor = roundedBox(13.2, 0.36, 11.5, palette.sand, 0.28, 0.9)
floor.position.y = -0.28
room.add(floor)

const matColors = [palette.peach, palette.butter, palette.mint, palette.sky, palette.lavender, 0xe9c4a4]
for (let x = -3; x <= 3; x += 1) {
  for (let z = -2; z <= 2; z += 1) {
    const tile = roundedBox(1.48, 0.12, 1.48, matColors[(x + z + 18) % matColors.length], 0.13, 0.88)
    tile.position.set(x * 1.48, 0.02, z * 1.48 + 0.28)
    tile.receiveShadow = true
    room.add(tile)
  }
}

const backWall = roundedBox(13.2, 5.6, 0.32, palette.warmWhite, 0.16, 0.95)
backWall.position.set(0, 2.45, -5.7)
room.add(backWall)
const leftWall = roundedBox(0.32, 5.6, 11.5, 0xf7efe1, 0.16, 0.95)
leftWall.position.set(-6.6, 2.45, 0)
room.add(leftWall)

const windowFrame = roundedBox(4.0, 2.65, 0.14, palette.warmWhite, 0.1)
windowFrame.position.set(-2.7, 3.35, -5.48)
room.add(windowFrame)
const windowPane = new THREE.Mesh(
  new THREE.PlaneGeometry(3.55, 2.2),
  new THREE.MeshPhysicalMaterial({
    color: 0xbfdcec,
    transparent: true,
    opacity: 0.52,
    roughness: 0.18,
    transmission: 0.38,
    thickness: 0.2,
  }),
)
windowPane.position.set(-2.7, 3.35, -5.38)
room.add(windowPane)
for (const x of [-4.55, -0.85]) {
  const curtain = roundedBox(0.56, 3.0, 0.28, 0xe6b6a3, 0.22, 0.96)
  curtain.position.set(x, 3.15, -5.28)
  room.add(curtain)
}
const crossH = roundedBox(3.65, 0.08, 0.08, palette.warmWhite, 0.04)
crossH.position.set(-2.7, 3.35, -5.28)
room.add(crossH)
const crossV = roundedBox(0.08, 2.25, 0.08, palette.warmWhite, 0.04)
crossV.position.set(-2.7, 3.35, -5.28)
room.add(crossV)

for (let i = 0; i < 4; i += 1) {
  const cloud = new THREE.Group()
  for (const [x, y, r] of [[0, 0, .25], [.25, -.03, .2], [-.25, -.04, .18]] as const) {
    const puff = sphere(r, palette.warmWhite)
    puff.position.set(x, y, 0)
    cloud.add(puff)
  }
  cloud.position.set(2.3 + i * 0.72, 4.6 - (i % 2) * 0.2, -5.25)
  room.add(cloud)
}

const shelf = roundedBox(3.4, 1.55, 0.8, 0xd8b68f, 0.18)
shelf.position.set(3.7, 0.78, -5.05)
room.add(shelf)
for (let i = 0; i < 3; i += 1) {
  const opening = roundedBox(0.82, 0.83, 0.12, 0xf1dfc7, 0.08)
  opening.position.set(2.7 + i, 0.72, -4.6)
  room.add(opening)
}
for (let i = 0; i < 7; i += 1) {
  const book = roundedBox(0.18, 0.58 + (i % 3) * 0.05, 0.38, matColors[i % matColors.length], 0.04)
  book.position.set(2.48 + i * 0.24, 1.0, -4.48)
  book.rotation.z = (i % 2 ? -1 : 1) * 0.035
  room.add(book)
}

const couch = new THREE.Group()
const couchSeat = roundedBox(2.7, 0.55, 1.35, 0xc8b6d8, 0.28, 0.9)
couchSeat.position.y = 0.52
couch.add(couchSeat)
const couchBack = roundedBox(2.7, 1.3, 0.5, 0xb3a0c6, 0.28, 0.92)
couchBack.position.set(0, 1.13, -0.47)
couch.add(couchBack)
for (const x of [-0.7, 0.65]) {
  const pillow = roundedBox(0.78, 0.68, 0.28, x < 0 ? palette.butter : palette.mint, 0.22, 0.95)
  pillow.position.set(x, 0.98, 0.2)
  pillow.rotation.z = x < 0 ? -0.12 : 0.11
  couch.add(pillow)
}
couch.position.set(4.45, 0.08, 2.75)
couch.rotation.y = -0.2
room.add(couch)

const rug = new THREE.Mesh(
  new THREE.CylinderGeometry(2.15, 2.15, 0.06, 64),
  material(0xe4c9ad, 1),
)
rug.scale.z = 0.65
rug.position.set(4.25, 0.16, 2.55)
rug.receiveShadow = true
room.add(rug)

const lampBase = cylinder(0.28, 0.18, palette.cocoa)
lampBase.position.set(5.55, 0.27, -3.75)
room.add(lampBase)
const lampStem = cylinder(0.06, 1.3, palette.cocoa)
lampStem.position.set(5.55, 0.98, -3.75)
room.add(lampStem)
const lampShade = new THREE.Mesh(
  new THREE.CylinderGeometry(0.3, 0.52, 0.64, 30, 1, false),
  material(palette.butter),
)
lampShade.position.set(5.55, 1.68, -3.75)
lampShade.castShadow = true
room.add(lampShade)
const lampLight = new THREE.PointLight(0xffc87b, 6, 5, 2)
lampLight.position.set(5.55, 1.65, -3.6)
room.add(lampLight)

type Toy = {
  key: string
  label: string
  emoji: string
  group: THREE.Group
  target: THREE.Vector3
}
const toys: Toy[] = []

function registerToy(key: string, label: string, emoji: string, group: THREE.Group, target: THREE.Vector3) {
  group.traverse((obj) => {
    obj.userData.toyKey = key
  })
  room.add(group)
  toys.push({ key, label, emoji, group, target })
}

{
  const g = new THREE.Group()
  const cols = [palette.coral, palette.butter, palette.sky, palette.mint, palette.lavender]
  const positions: Array<[number, number, number, number]> = [
    [0, .25, 0, 0], [.48, .25, .05, .18], [-.44, .25, .08, -.12],
    [-.1, .7, .03, .08], [.36, .68, .04, -.18],
  ]
  positions.forEach(([x, y, z, r], i) => {
    const b = roundedBox(.48, .48, .48, cols[i], .09)
    b.position.set(x, y, z)
    b.rotation.y = r
    g.add(b)
  })
  g.position.set(-3.9, .11, 2.65)
  registerToy('blocks', '积木', '▦', g, new THREE.Vector3(-3.2, 0, 2.4))
}

{
  const g = new THREE.Group()
  const body = roundedBox(1.4, .52, .66, palette.coral, .13)
  body.position.y = .48
  g.add(body)
  const cabin = roundedBox(.62, .55, .58, palette.butter, .12)
  cabin.position.set(.32, .9, 0)
  g.add(cabin)
  const chimney = cylinder(.11, .42, palette.cocoa)
  chimney.position.set(-.45, .95, 0)
  g.add(chimney)
  for (const x of [-.47, .45]) {
    for (const z of [-.36, .36]) {
      const wheel = cylinder(.18, .12, palette.dark)
      wheel.rotation.x = Math.PI / 2
      wheel.position.set(x, .25, z)
      g.add(wheel)
    }
  }
  const trackMat = new THREE.Mesh(new THREE.TorusGeometry(1.65, .045, 10, 64), material(palette.cocoa))
  trackMat.rotation.x = Math.PI / 2
  trackMat.scale.z = .63
  trackMat.position.y = .14
  g.add(trackMat)
  g.position.set(-1.2, .02, -2.65)
  g.rotation.y = .25
  registerToy('train', '小火车', '◉', g, new THREE.Vector3(-.25, 0, -2.1))
}

{
  const g = new THREE.Group()
  const base = roundedBox(1.15, .18, .75, palette.mint, .18)
  base.position.y = .18
  g.add(base)
  const peg = cylinder(.08, 1.08, palette.cocoa)
  peg.position.y = .76
  g.add(peg)
  const ringColors = [palette.coral, palette.butter, palette.sky]
  ringColors.forEach((c, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.34 + i * .025, .055, 12, 32), material(c))
    ring.rotation.x = Math.PI / 2 + (i - 1) * .1
    ring.position.set((i - 1) * .08, .45 + i * .17, (i - 1) * .04)
    ring.castShadow = true
    g.add(ring)
  })
  g.position.set(2.0, .03, 2.7)
  registerToy('rings', '套圈', '◎', g, new THREE.Vector3(1.35, 0, 2.2))
}

{
  const g = new THREE.Group()
  const rail1 = roundedBox(1.8, .12, .12, palette.cocoa, .04)
  const rail2 = rail1.clone()
  rail1.position.z = -.28
  rail2.position.z = .28
  rail1.position.y = rail2.position.y = .2
  g.add(rail1, rail2)
  const cols = [palette.coral, palette.peach, palette.butter, palette.mint, palette.sky, palette.lavender]
  cols.forEach((c, i) => {
    const bar = roundedBox(.23, .14, .7 - i * .045, c, .05)
    bar.position.set(-.72 + i * .29, .33, 0)
    g.add(bar)
  })
  g.position.set(4.2, .04, -.6)
  g.rotation.y = -.28
  registerToy('music', '木琴', '≋', g, new THREE.Vector3(3.45, 0, -.4))
}

{
  const g = new THREE.Group()
  for (let i = 0; i < 3; i += 1) {
    const book = roundedBox(1.0, .11, .72, [palette.sky, palette.butter, palette.coral][i], .05)
    book.position.set(i * .05, .16 + i * .12, i * -.025)
    book.rotation.y = (i - 1) * .08
    g.add(book)
  }
  const openLeft = roundedBox(.66, .04, .88, palette.warmWhite, .04, .95)
  const openRight = openLeft.clone()
  openLeft.position.set(-.36, .55, 0)
  openRight.position.set(.36, .55, 0)
  openLeft.rotation.z = -.08
  openRight.rotation.z = .08
  g.add(openLeft, openRight)
  g.position.set(-4.8, .02, -.9)
  g.rotation.y = .35
  registerToy('books', '绘本', '▤', g, new THREE.Vector3(-4.0, 0, -.55))
}

let jellyMesh: THREE.Mesh
{
  const g = new THREE.Group()
  const jellyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf48da0,
    roughness: 0.08,
    metalness: 0,
    transmission: 0.78,
    transparent: true,
    opacity: 0.88,
    ior: 1.28,
    thickness: 1.4,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  })
  jellyMesh = new THREE.Mesh(new THREE.SphereGeometry(.62, 48, 32), jellyMaterial)
  jellyMesh.scale.set(1.1, .88, 1.02)
  jellyMesh.position.y = .72
  jellyMesh.castShadow = true
  g.add(jellyMesh)
  for (const x of [-.23, .23]) {
    const eye = sphere(.055, palette.dark)
    eye.position.set(x, .83, .56)
    g.add(eye)
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.12, .025, 8, 24, Math.PI), material(palette.dark))
  mouth.rotation.z = Math.PI
  mouth.position.set(0, .61, .575)
  g.add(mouth)
  g.position.set(.4, .04, 3.55)
  registerToy('jelly', '果冻', '●', g, new THREE.Vector3(.25, 0, 2.65))
}

{
  const g = new THREE.Group()
  const rocker = new THREE.Mesh(new THREE.TorusGeometry(.88, .075, 10, 36, Math.PI * 1.15), material(palette.cocoa))
  rocker.rotation.z = Math.PI * .92
  rocker.position.y = .15
  g.add(rocker)
  const body = roundedBox(1.05, .46, .36, palette.butter, .2)
  body.position.y = .65
  g.add(body)
  const neck = roundedBox(.3, .72, .3, palette.butter, .14)
  neck.position.set(.45, 1.02, 0)
  neck.rotation.z = -.32
  g.add(neck)
  const head = sphere(.3, palette.butter)
  head.position.set(.63, 1.35, 0)
  g.add(head)
  const ear1 = roundedBox(.1, .28, .12, palette.butter, .05)
  const ear2 = ear1.clone()
  ear1.position.set(.5, 1.62, -.12)
  ear2.position.set(.5, 1.62, .12)
  ear1.rotation.z = -.22
  ear2.rotation.z = -.22
  g.add(ear1, ear2)
  g.position.set(2.1, .06, -3.6)
  g.rotation.y = -.38
  registerToy('rocker', '木马', '⌁', g, new THREE.Vector3(1.4, 0, -3.0))
}

const character = new THREE.Group()
const characterRoot = new THREE.Group()
character.add(characterRoot)

const body = roundedBox(.64, .9, .48, palette.sage, .25)
body.position.y = 1.02
characterRoot.add(body)
const head = sphere(.43, 0xe5b28f)
head.position.y = 1.72
characterRoot.add(head)
const hairCap = new THREE.Mesh(
  new THREE.SphereGeometry(.44, 28, 16, 0, Math.PI * 2, 0, Math.PI * .52),
  material(0x56463f),
)
hairCap.position.y = 1.83
hairCap.castShadow = true
characterRoot.add(hairCap)
for (const x of [-.16, .16]) {
  const eye = sphere(.035, palette.dark)
  eye.position.set(x, 1.74, .405)
  characterRoot.add(eye)
}
const leftArmPivot = new THREE.Group()
const rightArmPivot = new THREE.Group()
leftArmPivot.position.set(-.39, 1.25, 0)
rightArmPivot.position.set(.39, 1.25, 0)
for (const [pivot, side] of [[leftArmPivot, -1], [rightArmPivot, 1]] as const) {
  const arm = cylinder(.085, .68, 0xe5b28f)
  arm.position.y = -.28
  arm.rotation.z = side * .05
  pivot.add(arm)
  characterRoot.add(pivot)
}
const leftLegPivot = new THREE.Group()
const rightLegPivot = new THREE.Group()
leftLegPivot.position.set(-.18, .62, 0)
rightLegPivot.position.set(.18, .62, 0)
for (const pivot of [leftLegPivot, rightLegPivot]) {
  const leg = cylinder(.11, .62, 0x738b84)
  leg.position.y = -.27
  pivot.add(leg)
  const shoe = roundedBox(.23, .13, .36, palette.dark, .08)
  shoe.position.set(0, -.58, .08)
  pivot.add(shoe)
  characterRoot.add(pivot)
}
character.position.set(-.55, .22, .5)
character.scale.setScalar(.9)
scene.add(character)

let targetPosition: THREE.Vector3 | null = null
let activeToy: Toy | null = null
let paused = false
let isNight = false
let actionBounce = 0

function chooseToy(toy: Toy) {
  targetPosition = toy.target.clone()
  activeToy = toy
  statusText.textContent = `准备去玩${toy.label}`
  toast.textContent = `${toy.emoji} 去玩 ${toy.label}`
  toast.classList.add('show')
  window.setTimeout(() => toast.classList.remove('show'), 1500)
  controls.autoRotate = false
  resumeAutoRotateAt = performance.now() + 6000
}

toys.forEach((toy) => {
  const button = document.createElement('button')
  button.className = 'toy-button'
  button.innerHTML = `<span>${toy.emoji}</span><b>${toy.label}</b>`
  button.addEventListener('click', () => chooseToy(toy))
  toyButtons.appendChild(button)
})

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
function updatePointer(event: PointerEvent) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
}

renderer.domElement.addEventListener('pointermove', (event) => {
  updatePointer(event)
  raycaster.setFromCamera(pointer, camera)
  const intersections = raycaster.intersectObjects(toys.map((t) => t.group), true)
  renderer.domElement.style.cursor = intersections.length ? 'pointer' : 'grab'
})
renderer.domElement.addEventListener('pointerdown', () => {
  renderer.domElement.style.cursor = 'grabbing'
})
renderer.domElement.addEventListener('pointerup', (event) => {
  updatePointer(event)
  raycaster.setFromCamera(pointer, camera)
  const intersections = raycaster.intersectObjects(toys.map((t) => t.group), true)
  renderer.domElement.style.cursor = intersections.length ? 'pointer' : 'grab'
  if (!intersections.length) return
  const key = intersections[0].object.userData.toyKey as string | undefined
  const toy = toys.find((item) => item.key === key)
  if (toy) chooseToy(toy)
})

function setNight(value: boolean) {
  isNight = value
  document.body.classList.toggle('night', value)
  dayButton.textContent = value ? '☾' : '☀︎'
  statusText.textContent = value ? '夜灯亮起来了' : '阳光重新照进房间'
}

dayButton.addEventListener('click', () => setNight(!isNight))
pauseButton.addEventListener('click', () => {
  paused = !paused
  pauseButton.textContent = paused ? '▶' : 'Ⅱ'
  pauseButton.title = paused ? '继续探索' : '暂停探索'
  statusText.textContent = paused ? '暂停一下，看看房间' : activeToy ? `继续去玩${activeToy.label}` : '继续慢慢逛'
})
resetButton.addEventListener('click', () => {
  camera.position.copy(cameraHome)
  controls.target.set(0, 1.25, 0)
  controls.autoRotate = true
  controls.update()
  statusText.textContent = '镜头回到全景'
})

const clock = new THREE.Clock()
const temp = new THREE.Vector3()

function animateCharacter(delta: number, elapsed: number) {
  if (paused) return

  if (targetPosition) {
    temp.copy(targetPosition).sub(character.position)
    temp.y = 0
    const distance = temp.length()
    if (distance > .24) {
      temp.normalize()
      character.position.addScaledVector(temp, Math.min(delta * 1.65, distance))
      const desired = Math.atan2(temp.x, temp.z)
      character.rotation.y = THREE.MathUtils.lerp(character.rotation.y, desired, Math.min(1, delta * 7))
      const walk = elapsed * 9.5
      leftLegPivot.rotation.x = Math.sin(walk) * .5
      rightLegPivot.rotation.x = -Math.sin(walk) * .5
      leftArmPivot.rotation.x = -Math.sin(walk) * .42
      rightArmPivot.rotation.x = Math.sin(walk) * .42
      characterRoot.position.y = Math.abs(Math.sin(walk)) * .035
    } else {
      targetPosition = null
      leftLegPivot.rotation.x = 0
      rightLegPivot.rotation.x = 0
      leftArmPivot.rotation.x = -.18
      rightArmPivot.rotation.x = -.18
      actionBounce = 1
      statusText.textContent = activeToy ? `正在玩${activeToy.label}` : '发现了一件好玩的东西'
    }
  } else {
    leftArmPivot.rotation.x = Math.sin(elapsed * 1.4) * .05
    rightArmPivot.rotation.x = -Math.sin(elapsed * 1.4) * .05
    characterRoot.position.y = Math.sin(elapsed * 1.7) * .012
  }

  if (actionBounce > 0) {
    actionBounce = Math.max(0, actionBounce - delta * .65)
    const pulse = Math.sin((1 - actionBounce) * Math.PI * 4) * actionBounce
    characterRoot.rotation.z = pulse * .08
  } else {
    characterRoot.rotation.z *= .88
  }
}

function animateLighting(delta: number) {
  const targetBg = new THREE.Color(isNight ? 0x273142 : 0xf4ead9)
  const targetFog = new THREE.Color(isNight ? 0x273142 : 0xf4ead9)
  const bg = scene.background as THREE.Color
  bg.lerp(targetBg, Math.min(1, delta * 1.5))
  scene.fog!.color.lerp(targetFog, Math.min(1, delta * 1.5))
  hemi.intensity = THREE.MathUtils.lerp(hemi.intensity, isNight ? .75 : 2.35, Math.min(1, delta * 1.6))
  sun.intensity = THREE.MathUtils.lerp(sun.intensity, isNight ? .7 : 4.2, Math.min(1, delta * 1.6))
  windowGlow.intensity = THREE.MathUtils.lerp(windowGlow.intensity, isNight ? 2.5 : 12, Math.min(1, delta * 1.6))
  fill.intensity = THREE.MathUtils.lerp(fill.intensity, isNight ? 9 : 6, Math.min(1, delta * 1.6))
  lampLight.intensity = THREE.MathUtils.lerp(lampLight.intensity, isNight ? 18 : 6, Math.min(1, delta * 1.8))
  renderer.toneMappingExposure = THREE.MathUtils.lerp(renderer.toneMappingExposure, isNight ? .82 : 1.03, Math.min(1, delta * 1.5))
}

function animate() {
  requestAnimationFrame(animate)
  const delta = Math.min(clock.getDelta(), .05)
  const elapsed = clock.elapsedTime

  if (!paused) {
    jellyMesh.rotation.y += delta * .28
    const wobble = 1 + Math.sin(elapsed * 2.25) * .035
    jellyMesh.scale.set(1.1 / wobble, .88 * wobble, 1.02 / wobble)
  }

  if (!controls.autoRotate && performance.now() > resumeAutoRotateAt && !targetPosition) {
    controls.autoRotate = true
  }
  animateCharacter(delta, elapsed)
  animateLighting(delta)
  controls.update()
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})
