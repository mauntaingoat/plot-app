import { useRef, useEffect } from 'react'
import * as THREE from 'three'

/**
 * Generative cityscape/neighborhood landscape.
 * Light mode, tangerine-tinted, low undulating surface.
 * Mouse-following light adds interactive depth.
 * Transparent bg — sits on top of the ivory hero section.
 */
export function CityScape() {
  const mountRef = useRef<HTMLDivElement>(null)
  const lightRef = useRef<THREE.PointLight | null>(null)

  useEffect(() => {
    const currentMount = mountRef.current
    if (!currentMount) return

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(
      75,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      100,
    )
    camera.position.set(0, 2, 3.5)
    camera.rotation.x = -0.35

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0) // transparent
    currentMount.appendChild(renderer.domElement)

    // Wider, denser plane for city-like surface
    const geometry = new THREE.PlaneGeometry(14, 10, 160, 160)

    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      wireframe: false,
      uniforms: {
        time: { value: 0 },
        pointLightPosition: { value: new THREE.Vector3(0, 2, 5) },
        color: { value: new THREE.Color('#FF6B3D') }, // tangerine
        bgColor: { value: new THREE.Color('#FAFAF8') }, // ivory
      },
      vertexShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vElevation;

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0) * 2.0 + 1.0;
          vec4 s1 = floor(b1) * 2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        void main() {
          vNormal = normal;
          vPosition = position;

          // Grid-aligned coordinates for urban feel
          float gridX = floor(position.x * 2.5) / 2.5;
          float gridY = floor(position.y * 2.5) / 2.5;

          // Base noise at grid scale — determines which blocks are "buildings"
          float blockNoise = snoise(vec3(gridX * 0.8, gridY * 0.8 - time * 0.1, 0.0));

          // Quantize into building heights (flat tops)
          float buildingHeight = floor(max(blockNoise, 0.0) * 5.0) / 5.0;
          buildingHeight *= 0.4; // scale down

          // Smooth transition at edges of each block (slight bevel)
          float edgeX = fract(position.x * 2.5);
          float edgeY = fract(position.y * 2.5);
          float edgeMask = smoothstep(0.0, 0.08, edgeX) * smoothstep(0.0, 0.08, 1.0 - edgeX)
                         * smoothstep(0.0, 0.08, edgeY) * smoothstep(0.0, 0.08, 1.0 - edgeY);

          // Streets are flat (where blockNoise < 0)
          float isBuilding = smoothstep(-0.05, 0.05, blockNoise);

          float displacement = buildingHeight * edgeMask * isBuilding;

          // Subtle large-scale undulation for natural variation
          displacement += snoise(vec3(position.x * 0.3, position.y * 0.3 - time * 0.08, 0.0)) * 0.06;

          vElevation = displacement;
          vec3 newPosition = position + normal * displacement;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform vec3 bgColor;
        uniform vec3 pointLightPosition;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vElevation;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 lightDir = normalize(pointLightPosition - vPosition);

          float diffuse = max(dot(normal, lightDir), 0.0);

          float fresnel = 1.0 - dot(normal, vec3(0.0, 0.0, 1.0));
          fresnel = pow(fresnel, 2.5);

          // Mix tangerine with ivory based on elevation + lighting
          float elevationMix = smoothstep(-0.1, 0.4, vElevation);
          vec3 surfaceColor = mix(bgColor, color, elevationMix * 0.35 + fresnel * 0.2);

          // Soft diffuse lighting
          vec3 finalColor = surfaceColor * (0.7 + diffuse * 0.4) + color * fresnel * 0.15;

          // Fade to transparent at edges
          float edgeFade = smoothstep(-6.0, -3.0, vPosition.x) * smoothstep(-4.0, -2.0, vPosition.y);

          gl_FragColor = vec4(finalColor, 0.6 + elevationMix * 0.3);
        }
      `,
      transparent: true,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2
    scene.add(mesh)

    const pointLight = new THREE.PointLight(0xffffff, 1, 100)
    pointLight.position.set(0, 2, 5)
    lightRef.current = pointLight
    scene.add(pointLight)

    // Ambient light for soft base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    let frameId: number
    const animate = (t: number) => {
      material.uniforms.time.value = t * 0.0003
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }
    animate(0)

    const handleResize = () => {
      if (!currentMount) return
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = -(e.clientY / window.innerHeight) * 2 + 1
      const pos = new THREE.Vector3(x * 5, 2, 2 - y * 2)
      if (lightRef.current) lightRef.current.position.copy(pos)
      if (material.uniforms.pointLightPosition) {
        material.uniforms.pointLightPosition.value = pos
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      if (currentMount && renderer.domElement.parentNode === currentMount) {
        currentMount.removeChild(renderer.domElement)
      }
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [])

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />
}
