import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import TokenCard from "@/components/TokenCard";
import { SecondaryMarketCard, SecondaryListing } from "@/components/SecondaryMarketCard";
import {
  getTokenCount,
  getToken,
  purchaseToken,
  TimeToken,
  getReceiptCount,
  getListing,
  getReceipt,
  buyFromSecondary,
} from "@/lib/stellar";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useIdentity, useIdentityRegistry } from "@/context/IdentityContext";
import { useWallet } from "@/context/WalletContext";

interface TokenWithId extends TimeToken {
  id: number;
}

export default function Marketplace() {
  const [tokens, setTokens] = useState<TokenWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedToken, setSelectedToken] = useState<TokenWithId | null>(null);
  const [purchaseHoursInput, setPurchaseHoursInput] = useState("1");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [secondaryListings, setSecondaryListings] = useState<SecondaryListing[]>([]);
  const [loadingSecondary, setLoadingSecondary] = useState(true);
  const [secondaryPurchaseId, setSecondaryPurchaseId] = useState<number | null>(null);
  const { publicKey } = useWallet();
  const walletAddress = useMemo(() => {
    if (publicKey) {
      return publicKey;
    }
    if (typeof window !== "undefined") {
      return window.sessionStorage.getItem("walletAddress");
    }
    return null;
  }, [publicKey]);
  const { hasIdentity: buyerHasIdentity, openEditor: openBuyerIdentityEditor } = useIdentity(walletAddress);
  const { getIdentity } = useIdentityRegistry();

  useEffect(() => {
    loadTokens();
    loadSecondaryMarket();
  }, []);

  const ensureBuyerIdentity = (actionDescription: string) => {
    if (!walletAddress) {
      toast.error("Please connect your wallet first");
      return false;
    }
    if (!buyerHasIdentity) {
      toast.error(`Add your display name before ${actionDescription}.`);
      openBuyerIdentityEditor();
      return false;
    }
    return true;
  };

  const loadTokens = async () => {
    try {
      setLoading(true);
      const count = await getTokenCount();
      const loadedTokens: TokenWithId[] = [];

      for (let i = 1; i <= count; i++) {
        const token = await getToken(i);
        if (token && token.hours_available > 0) {
          loadedTokens.push({ ...token, id: i });
        }
      }

      setTokens(loadedTokens);
    } catch (error) {
      console.error("Failed to load tokens:", error);
      toast.error("Failed to load marketplace tokens");
    } finally {
      setLoading(false);
    }
  };

  const loadSecondaryMarket = async () => {
    try {
      setLoadingSecondary(true);
      const receiptCount = await getReceiptCount();
      if (receiptCount === 0) {
        setSecondaryListings([]);
        return;
      }

      const listings: SecondaryListing[] = [];
      for (let i = 1; i <= receiptCount; i++) {
        const listing = await getListing(i);
        if (!listing?.is_active) {
          continue;
        }

        const receipt = await getReceipt(i);
        if (!receipt) {
          continue;
        }

        const remainingHours = Number((receipt as any).hours ?? (receipt as any).hours_remaining ?? 0);
        if (!Number.isFinite(remainingHours) || remainingHours <= 0) {
          continue;
        }

        const normalizedReceipt = {
          ...receipt,
          hours: remainingHours,
        };

        listings.push({
          receipt_id: i,
          listing,
          receipt: normalizedReceipt,
        });
      }

      setSecondaryListings(listings);
    } catch (error) {
      console.error("Failed to load secondary market:", error);
      toast.error("Failed to load secondary listings");
    } finally {
      setLoadingSecondary(false);
    }
  };

  const handlePurchase = (tokenId: number) => {
    const token = tokens.find(t => t.id === tokenId);
    if (token) {
      setSelectedToken(token);
      setPurchaseHoursInput("1");
    }
  };

  const handleSecondaryPurchase = async (receiptId: number) => {
    if (!walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!ensureBuyerIdentity("buying from the secondary market")) {
      return;
    }

    const listing = secondaryListings.find((item) => item.receipt_id === receiptId);
    if (!listing) {
      toast.error("Listing not found");
      return;
    }

    setSecondaryPurchaseId(receiptId);
    try {
      const success = await buyFromSecondary(
        walletAddress,
        receiptId,
        listing.listing.seller,
        listing.listing.price.toString()
      );

      if (success) {
        toast.success("Successfully purchased receipt from secondary market!\nXLM payment sent to seller.");
        loadSecondaryMarket();
      } else {
        toast.error("Secondary purchase failed. Please try again.");
      }
    } catch (error: any) {
      console.error("Secondary purchase error:", error);
      toast.error(error.message || "An error occurred during secondary purchase");
    } finally {
      setSecondaryPurchaseId(null);
    }
  };

  const confirmPurchase = async () => {
    if (!selectedToken) return;

    const parsedHours = parseInt(purchaseHoursInput, 10);
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      toast.error("Enter a valid number of hours (minimum 1)");
      return;
    }

    if (!walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!ensureBuyerIdentity("purchasing a token")) {
      return;
    }

    setIsPurchasing(true);
    try {
      const success = await purchaseToken(
        walletAddress,
        selectedToken.id,
        parsedHours,
        selectedToken.seller,
        selectedToken.hourly_rate
      );
      
      if (success) {
        toast.success(`Successfully purchased ${parsedHours} hour(s)!`);
        setSelectedToken(null);
        setPurchaseHoursInput("1");
        loadTokens();
      } else {
        toast.error("Purchase failed. Please try again.");
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      toast.error(error.message || "An error occurred during purchase");
    } finally {
      setIsPurchasing(false);
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredTokens = tokens.filter((token) => {
    if (!normalizedQuery) {
      return true;
    }
    const sellerIdentity = getIdentity(token.seller);
    return (
      token.description.toLowerCase().includes(normalizedQuery) ||
      token.seller.toLowerCase().includes(normalizedQuery) ||
      (sellerIdentity?.name?.toLowerCase().includes(normalizedQuery) ?? false)
    );
  });

  const purchaseHoursValue = (() => {
    const parsed = parseInt(purchaseHoursInput, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  })();

  const totalCost = selectedToken 
    ? (parseInt(selectedToken.hourly_rate) / 10000000) * purchaseHoursValue 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Time Token Marketplace</h1>
          <p className="text-muted-foreground text-lg mb-6">
            Discover and purchase time from experts across various fields
          </p>
          
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by description or seller..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              {searchQuery ? "No tokens found matching your search" : "No time tokens available yet"}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTokens.map((token) => (
              <TokenCard
                key={token.id}
                token={token}
                onPurchase={handlePurchase}
              />
            ))}
          </div>
        )}
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-semibold">Secondary Market</h2>
                <p className="text-muted-foreground">
                  Trade previously purchased receipts from other buyers.
                </p>
              </div>
              <Button variant="outline" onClick={loadSecondaryMarket} disabled={loadingSecondary}>
                {loadingSecondary ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Refreshing
                  </>
                ) : (
                  "Refresh Listings"
                )}
              </Button>
            </div>

            {loadingSecondary ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : secondaryListings.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <p className="text-muted-foreground">
                  No receipts listed on the secondary market yet.
                  Purchase time tokens and customers can relist receipts here.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {secondaryListings.map((listing) => (
                  <SecondaryMarketCard
                    key={listing.receipt_id}
                    listing={listing}
                    onBuy={() => handleSecondaryPurchase(listing.receipt_id)}
                    isLoading={secondaryPurchaseId === listing.receipt_id}
                  />
                ))}
              </div>
            )}
          </div>

      </div>

      <Dialog open={!!selectedToken} onOpenChange={() => setSelectedToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Time Token</DialogTitle>
            <DialogDescription>
              {selectedToken?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Number of Hours</Label>
              <Input
                id="hours"
                type="number"
                min="1"
                max={selectedToken?.hours_available || 1}
                value={purchaseHoursInput}
                onChange={(e) => setPurchaseHoursInput(e.target.value)}
              />
            </div>
            
            <div className="p-4 bg-card rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hourly Rate:</span>
                <span className="font-medium">{selectedToken ? (parseInt(selectedToken.hourly_rate) / 10000000) : 0} XLM</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hours:</span>
                <span className="font-medium">{purchaseHoursValue || "-"}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span>Total Cost:</span>
                <span className="text-primary">{totalCost.toFixed(2)} XLM</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedToken(null)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmPurchase} 
              disabled={isPurchasing}
              className="bg-gradient-hero hover:opacity-90"
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Purchase'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
