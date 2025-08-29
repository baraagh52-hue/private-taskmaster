// TODO: REPLACE THIS LANDING PAGE WITH AN ELEGANT, THEMATIC, AND WELL-DESIGNED LANDING PAGE RELEVANT TO THE PROJECT
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Brain, 
  Timer, 
  Mic, 
  Volume2, 
  Target, 
  TrendingUp, 
  Shield, 
  Zap,
  ArrowRight,
  Play
} from "lucide-react";
import { useEffect, useRef } from "react";
import * as THREE from "three";

// Three.js animated background component
function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Create floating particles
    const particleCount = 100;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 20;
      positions[i + 1] = (Math.random() - 0.5) * 20;
      positions[i + 2] = (Math.random() - 0.5) * 20;

      // Neon colors
      const colorChoice = Math.random();
      if (colorChoice < 0.33) {
        colors[i] = 0; colors[i + 1] = 1; colors[i + 2] = 0.53; // #00ff88
      } else if (colorChoice < 0.66) {
        colors[i] = 1; colors[i + 1] = 0; colors[i + 2] = 0.5; // #ff0080
      } else {
        colors[i] = 0; colors[i + 1] = 0.53; colors[i + 2] = 1; // #0088ff
      }
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);

    camera.position.z = 5;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      particleSystem.rotation.x += 0.001;
      particleSystem.rotation.y += 0.002;
      
      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 -z-10" />;
}

export default function Landing() {
  const { isAuthenticated, user } = useAuth();

  const features = [
    {
      icon: Brain,
      title: "Local AI Assistant",
      description: "Phi-3 mini model running entirely on your machine for complete privacy",
      color: "text-[#00ff88]"
    },
    {
      icon: Timer,
      title: "Smart Check-ins",
      description: "Periodic accountability prompts every 15-30 minutes to keep you focused",
      color: "text-[#ff0080]"
    },
    {
      icon: Mic,
      title: "Voice Interaction",
      description: "Speak naturally with your AI assistant using built-in speech recognition",
      color: "text-[#0088ff]"
    },
    {
      icon: Volume2,
      title: "Audio Feedback",
      description: "Hear your AI assistant's responses with text-to-speech technology",
      color: "text-[#00ff88]"
    },
    {
      icon: Target,
      title: "Goal Tracking",
      description: "Set specific tasks and track your progress throughout each session",
      color: "text-[#ff0080]"
    },
    {
      icon: TrendingUp,
      title: "Progress Analytics",
      description: "Visualize your productivity patterns and improvement over time",
      color: "text-[#0088ff]"
    }
  ];

  const benefits = [
    {
      icon: Shield,
      title: "Complete Privacy",
      description: "All data stays on your device - no cloud, no tracking, no data collection"
    },
    {
      icon: Zap,
      title: "Instant Response",
      description: "Local processing means immediate AI feedback without internet delays"
    },
    {
      icon: Brain,
      title: "Personalized Learning",
      description: "Your AI assistant learns your patterns and adapts to your workflow"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
      <ThreeBackground />
      
      {/* Navigation */}
      <nav className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-2"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-[#00ff88] to-[#0088ff] rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold">AI Accountability</span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {isAuthenticated ? (
              <Button 
                className="bg-[#00ff88] text-black hover:bg-[#00ff88]/90 font-semibold shadow-[0_0_20px_rgba(0,255,136,0.3)]"
                onClick={() => window.location.href = "/dashboard"}
              >
                Dashboard
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="border-[#00ff88] text-[#00ff88] hover:bg-[#00ff88] hover:text-black"
                onClick={() => window.location.href = "/auth"}
              >
                Sign In
              </Button>
            )}
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-[#00ff88] via-[#0088ff] to-[#ff0080] bg-clip-text text-transparent">
              Stay Focused
            </h1>
            <h2 className="text-3xl md:text-5xl font-semibold mb-8 text-white">
              With Your Personal AI Coach
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              A self-hosted AI accountability assistant powered by Phi-3 mini. 
              Get gentle nudges, track your progress, and stay productive with 
              complete privacy and local processing.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button 
              size="lg"
              className="bg-gradient-to-r from-[#00ff88] to-[#0088ff] text-black hover:from-[#00ff88]/90 hover:to-[#0088ff]/90 font-bold text-lg px-8 py-4 shadow-[0_0_30px_rgba(0,255,136,0.4)] group"
              onClick={() => window.location.href = isAuthenticated ? "/dashboard" : "/auth"}
            >
              <Play className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
              {isAuthenticated ? "Start Session" : "Get Started"}
            </Button>
            
            <Button 
              size="lg"
              variant="outline"
              className="border-[#ff0080] text-[#ff0080] hover:bg-[#ff0080] hover:text-black font-semibold text-lg px-8 py-4"
            >
              Learn More
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h3 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Powerful Features
            </h3>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Everything you need to stay accountable and productive, 
              running entirely on your own hardware.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-black/40 border-gray-800 p-6 hover:border-[#00ff88]/50 transition-all duration-300 group hover:shadow-[0_0_20px_rgba(0,255,136,0.1)]">
                  <feature.icon className={`w-12 h-12 ${feature.color} mb-4 group-hover:scale-110 transition-transform`} />
                  <h4 className="text-xl font-semibold mb-3 text-white">{feature.title}</h4>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h3 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Why Self-Hosted?
            </h3>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Take control of your data and productivity with a solution 
              that works entirely offline.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-[#ff0080] to-[#0088ff] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(255,0,128,0.3)]">
                  <benefit.icon className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-2xl font-semibold mb-4 text-white">{benefit.title}</h4>
                <p className="text-gray-400 text-lg leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="bg-gradient-to-r from-black/60 to-gray-900/60 border-[#00ff88]/30 p-12 shadow-[0_0_40px_rgba(0,255,136,0.2)]">
              <h3 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                Ready to Stay Focused?
              </h3>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Start your first accountability session and experience 
                the power of AI-driven productivity coaching.
              </p>
              <Button 
                size="lg"
                className="bg-gradient-to-r from-[#00ff88] to-[#0088ff] text-black hover:from-[#00ff88]/90 hover:to-[#0088ff]/90 font-bold text-xl px-12 py-6 shadow-[0_0_30px_rgba(0,255,136,0.4)]"
                onClick={() => window.location.href = isAuthenticated ? "/dashboard" : "/auth"}
              >
                {isAuthenticated ? "Go to Dashboard" : "Start Free"}
              </Button>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400">
            Built with privacy in mind. Your data never leaves your device.
          </p>
        </div>
      </footer>
    </div>
  );
}