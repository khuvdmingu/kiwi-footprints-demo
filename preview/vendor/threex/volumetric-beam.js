// 등대 빛줄기 재료 — threex.volumetricspotlight 의 재료(threex.volumetricspotlightmaterial.js, MIT, (c) 2013 Jerome Etienne,
//  https://github.com/jeromeetienne/threex.volumetricspotlight master 2015-05-21)를 ES 모듈로 옮긴 것.
//  원본은 같은 폴더에 그대로 둔다(threex.volumetricspotlightmaterial.js · LICENSE). 셰이더 식은 원본 그대로이고, 바꾼 것은
//   · 전역 THREEx·THREE 대신 import (three r187)
//   · 옛 uniform type 표기 제거, 출력에 tonemapping/colorspace include (threejs-shaders 스킬 "Common Mistakes": 안 넣으면 어둡게 나옴)
//   · 덧셈 섞기·양면을 기본으로 (원본 예제가 켜는 설정), 세기 uniform 하나(밤에만 켬)
import * as THREE from 'three';

export function volumetricBeamMaterial({ color = 0xffe2a8, attenuation = 5, anglePower = 1.2, strength = 1 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      attenuation: { value: attenuation },
      anglePower: { value: anglePower },
      spotPosition: { value: new THREE.Vector3() },
      lightColor: { value: new THREE.Color(color) },
      strength: { value: strength },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      uniform vec3 lightColor;
      uniform vec3 spotPosition;
      uniform float attenuation;
      uniform float anglePower;
      uniform float strength;
      void main() {
        float intensity = distance(vWorldPosition, spotPosition) / attenuation;
        intensity = 1.0 - clamp(intensity, 0.0, 1.0);
        vec3 normal = vec3(vNormal.x, vNormal.y, abs(vNormal.z));
        float angleIntensity = pow(dot(normal, vec3(0.0, 0.0, 1.0)), anglePower);
        intensity = intensity * angleIntensity * strength;
        gl_FragColor = vec4(lightColor, intensity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}
