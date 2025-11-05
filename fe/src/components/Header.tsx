import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, Wallet, LogOut, AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useWallet } from "@/context/WalletContext";

export default function Header() {
  const location = useLocation();
  const { publicKey, isConnected, isConnecting, connect, disconnect, error, isFreighterAvailable } = useWallet();

  // Log state changes for debugging
  useEffect(() => {
    console.log('[Header] State update:', {
      isFreighterAvailable,
      isConnected,
      isConnecting,
      publicKey: publicKey ? 'present' : 'null'
    });
  }, [isFreighterAvailable, isConnected, isConnecting, publicKey]);

  useEffect(() => {
    if (error) {
      console.error('[Header] Error:', error);
      toast.error(error);
    }
  }, [error]);

  const handleConnectWallet = async () => {
    console.log('[Header] Connect button clicked');
    console.log('[Header] Current Freighter state:', {
      isAvailable: isFreighterAvailable,
      isConnecting
    });

    try {
      if (!isFreighterAvailable) {
        toast.error("Please install Freighter wallet", {
          action: {
            label: "Install",
            onClick: () => window.open("https://www.freighter.app/", "_blank")
          }
        });
        return;
      }

      await connect();
      console.log('[Header] Connection successful');
      toast.success("Wallet connected!");
    } catch (err: any) {
      console.error('[Header] Connection error:', err);
      toast.error(err.message || "Failed to connect wallet");
    }
  };

  const handleDisconnect = () => {
    console.log('[Header] Disconnect button clicked');
    disconnect();
    toast.success("Wallet disconnected!");
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-gradient-hero p-2 rounded-lg group-hover:shadow-[var(--glow-primary)] transition-all">
            <Clock className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Time.Fun
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === "/" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Home
          </Link>
          <Link
            to="/marketplace"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === "/marketplace" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Marketplace
          </Link>
          <Link
            to="/profile"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === "/profile" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Profile
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {/* Freighter Status */}
          {!isFreighterAvailable && !isConnected && (
            <div className="flex items-center gap-1 px-3 py-1 rounded bg-yellow-500/20 text-yellow-700 text-xs">
              <AlertCircle className="w-3 h-3" />
              <span>Install Freighter wallet</span>
            </div>
          )}

          {isConnected && publicKey ? (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="gap-2"
                disabled
              >
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline">{formatAddress(publicKey)}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleDisconnect}
                title="Disconnect"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleConnectWallet} 
              disabled={isConnecting || !isFreighterAvailable}
              className="gap-2 bg-gradient-hero hover:opacity-90"
            >
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
