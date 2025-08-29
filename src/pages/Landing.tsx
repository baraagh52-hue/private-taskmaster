import { motion } from "framer-motion";
import { Loader, Mic, Volume2, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextToSpeech } from "@/components/TextToSpeech";
import { SpeakButton } from "@/components/SpeakButton";

export default function Landing() {
  const demoText = "Welcome to your AI Accountability Assistant! I'm here to help you stay focused, track your goals, and maintain productive habits. Let's work together to achieve your objectives.";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col bg-gradient-to-br from-background to-secondary/20"
    >
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          
          {/* Logo and Title */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="flex justify-center">
              <div className="relative">
                <img
                  src="./logo.svg"
                  alt="AI Assistant Logo"
                  width={80}
                  height={80}
                  className="rounded-2xl shadow-lg"
                />
                <div className="absolute -top-2 -right-2 bg-primary rounded-full p-2">
                  <Brain className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              AI Accountability Assistant
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your personal AI companion for staying focused, tracking goals, and building productive habits with voice interaction.
            </p>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto"
          >
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Volume2 className="h-5 w-5 text-primary" />
                  Voice Interaction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Communicate naturally with your AI assistant using text-to-speech technology.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mic className="h-5 w-5 text-primary" />
                  Goal Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Set, monitor, and achieve your personal and professional objectives.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="h-5 w-5 text-primary" />
                  Smart Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Get personalized recommendations and insights to improve your productivity.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* TTS Demo Section */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Try Voice Interaction
                  <SpeakButton text={demoText} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {demoText}
                </p>
                <TextToSpeech text={demoText} showControls={true} />
              </CardContent>
            </Card>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="space-y-4"
          >
            <Button size="lg" className="px-8 py-3 text-lg">
              Get Started
            </Button>
            <p className="text-xs text-muted-foreground">
              No external dependencies • Browser-native TTS • Privacy-focused
            </p>
          </motion.div>

        </div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="border-t bg-background/50 backdrop-blur-sm"
      >
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-center">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Loader className="h-4 w-4 animate-spin" />
            <span>Powered by</span>
            <a
              href="https://vly.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80 transition-colors"
            >
              vly.ai
            </a>
          </div>
        </div>
      </motion.footer>
    </motion.div>
  );
}