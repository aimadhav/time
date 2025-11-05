import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { Clock, Zap, Shield, TrendingUp, Users, Award } from "lucide-react";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-4">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Built on Stellar Blockchain</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Transform Your Time Into
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Tradeable Digital Assets
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Mint, buy, sell, and redeem time tokens. Connect with experts worldwide and monetize your knowledge on a transparent, decentralized marketplace.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/marketplace">
                <Button size="lg" className="bg-gradient-hero hover:opacity-90 text-lg px-8">
                  Explore Marketplace
                </Button>
              </Link>
              <Link to="/profile">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Create Time Token
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Time.Fun?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A revolutionary platform that brings transparency, security, and efficiency to time-based services
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Clock className="w-8 h-8" />}
              title="Tokenized Time"
              description="Convert your expertise into tradeable time tokens. Each token represents one hour of your availability."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="Blockchain Security"
              description="All transactions secured by Stellar blockchain with immutable records and transparent pricing."
            />
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8" />}
              title="Dynamic Pricing"
              description="Market-driven pricing ensures fair value based on supply, demand, and expertise level."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Global Marketplace"
              description="Connect with experts worldwide. No geographical barriers, no intermediaries."
            />
            <FeatureCard
              icon={<Award className="w-8 h-8" />}
              title="Reputation System"
              description="Build your on-chain reputation with verifiable credentials and transaction history."
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="Instant Transactions"
              description="Lightning-fast token minting, trading, and redemption powered by Stellar network."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg">Three simple steps to start trading time</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <StepCard
              number="01"
              title="Create Your Token"
              description="Connect your Freighter wallet and mint time tokens representing your available hours and expertise."
            />
            <StepCard
              number="02"
              title="Set Your Rate"
              description="Define your hourly rate in XLM. Market forces and your reputation will determine demand."
            />
            <StepCard
              number="03"
              title="Start Trading"
              description="List your tokens on the marketplace. Buyers can purchase and redeem time with you directly."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold">
              Ready to Monetize Your Time?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of experts already trading their time on the blockchain
            </p>
            <Link to="/profile">
              <Button size="lg" className="bg-gradient-hero hover:opacity-90 text-lg px-12">
                Get Started Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl bg-gradient-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center text-2xl font-bold text-primary-foreground mx-auto">
        {number}
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
