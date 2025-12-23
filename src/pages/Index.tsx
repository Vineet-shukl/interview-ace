import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Play, ArrowRight, Mic, Video, BookOpen, BarChart3, Shield, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    { icon: BookOpen, title: "Question Library", description: "Curated questions by role & industry", color: "cyan" },
    { icon: Mic, title: "Practice Mode", description: "Record and review your responses", color: "purple" },
    { icon: Video, title: "AI Voice Interview", description: "Realistic stress interviews with AI", color: "magenta" },
    { icon: BarChart3, title: "Performance Tracking", description: "Track progress over time", color: "green" },
    { icon: Shield, title: "Cheating Detection", description: "MediaPipe-powered monitoring", color: "orange" },
    { icon: Zap, title: "Body Language Coach", description: "Real-time posture feedback", color: "blue" },
  ];

  return (
    <div className="min-h-screen bg-background bg-holographic overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-soft animation-delay-500" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-glow-primary">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-gradient">InterVue</span>
        </div>
        <Button variant="glass" onClick={() => navigate("/auth")}>
          Sign In
        </Button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto mb-20 animate-fade-in">
          <h1 className="text-5xl lg:text-7xl font-bold mb-6">
            <span className="text-foreground">Ace Your Next</span>
            <br />
            <span className="text-gradient">Interview</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            AI-powered interview preparation with real-time feedback, body language analysis, and stress interview
            simulation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl" onClick={() => navigate("/auth")}>
              <Play className="w-5 h-5" />
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Features Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="glass-hover rounded-2xl p-6 animate-fade-in-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-card/80 border border-border/50 flex items-center justify-center mb-4">
                <feature.icon className={`w-6 h-6 text-neon-${feature.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8 text-center text-muted-foreground text-sm">
        <p>© 2024 InterVue. Built with AI-powered interview technology.</p>
      </footer>
    </div>
  );
};

export default Index;
