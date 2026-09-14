import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeCanvasBackgroundProps {
  scrollYProgress?: number;
}

export const ThreeCanvasBackground: React.FC<ThreeCanvasBackgroundProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Scene, Camera, Renderer ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 50;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // --- 3D Particle Cloud (HireMate Tech Colors) ---
    const particleCount = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    const palette = [
      new THREE.Color('#03bfff'), // Cyan / Primary
      new THREE.Color('#8b5cf6'), // Purple / AI
      new THREE.Color('#10b981'), // Emerald / Success
      new THREE.Color('#f59e0b'), // Amber / Warning
      new THREE.Color('#38bdf8'), // Sky Blue
    ];

    for (let i = 0; i < particleCount; i++) {
      // Cylindrical / Tunnel Distribution for deep forward motion
      const radius = 15 + Math.random() * 45;
      const theta = Math.random() * Math.PI * 2;
      const z = (Math.random() - 0.5) * 160;

      positions[i * 3] = radius * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(theta);
      positions[i * 3 + 2] = z;

      const chosenColor = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = chosenColor.r;
      colors[i * 3 + 1] = chosenColor.g;
      colors[i * 3 + 2] = chosenColor.b;

      scales[i] = Math.random() * 2.5 + 0.8;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    // Create custom smooth circle texture for particles
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
      grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // --- Floating Wireframe Polyhedra for 3D depth accents ---
    const shapesGroup = new THREE.Group();
    const geomIco = new THREE.IcosahedronGeometry(4, 0);
    const matIco = new THREE.MeshBasicMaterial({
      color: 0x03bfff,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    const icoMesh = new THREE.Mesh(geomIco, matIco);
    icoMesh.position.set(-25, 10, -20);
    shapesGroup.add(icoMesh);

    const geomTorus = new THREE.TorusGeometry(5, 0.4, 8, 24);
    const matTorus = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    const torusMesh = new THREE.Mesh(geomTorus, matTorus);
    torusMesh.position.set(28, -15, -30);
    shapesGroup.add(torusMesh);

    scene.add(shapesGroup);

    // --- Mouse Interaction ---
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // --- Scroll Interaction (Warp / Camera Travel) ---
    let targetScrollZ = 50;
    let currentScrollZ = 50;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      const scrollRatio = scrollY / maxScroll;
      // As user scrolls down, camera plunges through the tunnel (-80 units travel)
      targetScrollZ = 50 - scrollRatio * 90;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // --- Resize Handler ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- Animation Loop ---
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      // Smooth camera scroll travel lerp
      currentScrollZ += (targetScrollZ - currentScrollZ) * 0.08;
      camera.position.z = currentScrollZ;

      // Subtle camera tilt with mouse
      camera.position.x = mouseX * 6;
      camera.position.y = -mouseY * 6;
      camera.lookAt(0, 0, currentScrollZ - 60);

      // Particle slow organic rotation
      particles.rotation.y = elapsedTime * 0.04;
      particles.rotation.z = elapsedTime * 0.02;

      // Rotate geometric meshes
      icoMesh.rotation.x = elapsedTime * 0.3;
      icoMesh.rotation.y = elapsedTime * 0.4;
      torusMesh.rotation.x = elapsedTime * 0.2;
      torusMesh.rotation.y = elapsedTime * 0.5;

      renderer.render(scene, camera);
    };

    animate();

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      geomIco.dispose();
      matIco.dispose();
      geomTorus.dispose();
      matTorus.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="hm-webgl-background-canvas" aria-hidden="true" />;
};
