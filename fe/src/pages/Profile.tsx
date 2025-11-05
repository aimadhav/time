import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import TokenCard from "@/components/TokenCard";
import { ReceiptCard, Receipt } from "@/components/ReceiptCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getSellerTokens,
  getToken,
  mintTimeToken,
  updateTokenAvailability,
  deleteToken,
  getMyReceipts,
  getReceipt,
  getListing,
  listReceipt,
  TimeToken,
} from "@/lib/stellar";
import {
  getMeetingsForAddress,
  getRedeemedReceipts,
  markReceiptRedeemed,
  MeetingRecord,
  recordMeeting,
} from "@/lib/meetings";
import { toast } from "sonner";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIdentity } from "@/context/IdentityContext";
import { useWallet } from "@/context/WalletContext";
import { AddressLabel } from "@/components/AddressLabel";

interface TokenWithId extends TimeToken {
  id: number;
}

type ReceiptWithStatus = Receipt & { listed: boolean };

export default function Profile() {
  const [tokens, setTokens] = useState<TokenWithId[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const { publicKey } = useWallet();
  const { identity: selfIdentity, setIdentity: saveIdentity, clearIdentity: removeIdentity } = useIdentity(walletAddress);
  const identityNameInputRef = useRef<HTMLInputElement | null>(null);
  const [identityForm, setIdentityForm] = useState({
    name: "",
    description: "",
  });
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);
  const [editingToken, setEditingToken] = useState<TokenWithId | null>(null);
  const [newHours, setNewHours] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingTokenId, setDeletingTokenId] = useState<number | null>(null);
  const [listingReceiptId, setListingReceiptId] = useState<number | null>(null);
  const [redeemingReceiptId, setRedeemingReceiptId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    hourlyRate: "",
    hoursAvailable: "",
    description: "",
  });
  const [purchasedReceipts, setPurchasedReceipts] = useState<ReceiptWithStatus[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.sessionStorage.getItem("walletAddress") : null;
    const address = publicKey ?? stored;

    if (address && address !== walletAddress) {
      setWalletAddress(address);
      loadUserTokens(address);
      loadPurchasedReceipts(address);
      loadMeetings(address);
    } else if (!address && walletAddress) {
      setWalletAddress(null);
      setTokens([]);
      setPurchasedReceipts([]);
      setMeetings([]);
    }
  }, [publicKey, walletAddress]);

  useEffect(() => {
    setIdentityForm({
      name: selfIdentity?.name ?? "",
      description: selfIdentity?.description ?? "",
    });
  }, [selfIdentity?.name, selfIdentity?.description]);

  const loadUserTokens = async (address: string) => {
    try {
      setLoading(true);
      const tokenIds = await getSellerTokens(address);
      const loadedTokens: TokenWithId[] = [];

      for (const id of tokenIds) {
        const token = await getToken(id);
        if (token) {
          loadedTokens.push({ ...token, id });
        }
      }

      setTokens(loadedTokens);
    } catch (error) {
      console.error("Failed to load user tokens:", error);
      toast.error("Failed to load your tokens");
    } finally {
      setLoading(false);
    }
  };

  const requireIdentity = (actionDescription: string) => {
    if (!walletAddress) {
      return false;
    }
    if (!selfIdentity?.name) {
      toast.error(`Add your display name before ${actionDescription}.`);
      identityNameInputRef.current?.focus();
      return false;
    }
    return true;
  };

  const handleIdentitySubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    const trimmedName = identityForm.name.trim();
    if (!trimmedName) {
      toast.error("Please enter a name");
      identityNameInputRef.current?.focus();
      return;
    }
    const trimmedDescription = identityForm.description.trim();

    setIsSavingIdentity(true);
    try {
      saveIdentity({
        name: trimmedName,
        description: trimmedDescription ? trimmedDescription : undefined,
      });
      setIdentityForm({
        name: trimmedName,
        description: trimmedDescription,
      });
      toast.success("Display name saved");
    } catch (error) {
      console.error("Failed to save identity", error);
      toast.error("Unable to save your name");
    } finally {
      setIsSavingIdentity(false);
    }
  };

  const handleIdentityClear = () => {
    if (!walletAddress) {
      return;
    }
    removeIdentity();
    setIdentityForm({ name: "", description: "" });
    toast.success("Display name removed");
  };

  const handleMintToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!requireIdentity("minting a time token")) {
      return;
    }

    const { hourlyRate, hoursAvailable, description } = formData;

    if (!hourlyRate || !hoursAvailable || !description) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsMinting(true);
    try {
      const tokenId = await mintTimeToken(
        walletAddress,
        parseFloat(hourlyRate),
        parseInt(hoursAvailable),
        description
      );

      if (tokenId !== null) {
        toast.success("Time token minted successfully!");
        setFormData({ hourlyRate: "", hoursAvailable: "", description: "" });
        loadUserTokens(walletAddress);
      } else {
        toast.error("Failed to mint token. Please try again.");
      }
    } catch (error: any) {
      console.error("Minting error:", error);
      toast.error(error.message || "An error occurred while minting");
    } finally {
      setIsMinting(false);
    }
  };

  const loadPurchasedReceipts = async (address: string) => {
    try {
      setLoadingReceipts(true);
      const receiptIds = await getMyReceipts(address);
      const redeemedIds = new Set(getRedeemedReceipts(address));
      const receipts: ReceiptWithStatus[] = [];

      for (const id of receiptIds) {
        if (redeemedIds.has(String(id))) {
          continue;
        }

        const rawReceipt = await getReceipt(id);
        if (!rawReceipt) {
          continue;
        }

        if (rawReceipt.seller && rawReceipt.seller === address) {
          continue;
        }

        const toNumber = (value: unknown): number => {
          if (typeof value === 'number') return value;
          if (typeof value === 'bigint') return Number(value);
          if (typeof value === 'string' && value.trim().length > 0) {
            const parsed = Number(value);
            return Number.isNaN(parsed) ? 0 : parsed;
          }
          return 0;
        };

        const normalizedReceipt: Receipt = {
          id,
          hours: toNumber((rawReceipt as any).hours ?? (rawReceipt as any).hours_purchased),
          original_rate: toNumber((rawReceipt as any).original_rate),
          purchase_price: toNumber((rawReceipt as any).purchase_price),
          description: typeof rawReceipt.description === 'string' ? rawReceipt.description : 'Purchased time token',
          seller: (rawReceipt as any).seller,
        };

        if (!Number.isFinite(normalizedReceipt.hours) || normalizedReceipt.hours <= 0) {
          continue;
        }

        let listed = false;
        try {
          const listing = await getListing(id);
          listed = Boolean(listing?.is_active);
        } catch (listingError) {
          console.warn('Unable to fetch listing info for receipt', id, listingError);
        }

        receipts.push({ ...normalizedReceipt, listed });
      }

      setPurchasedReceipts(receipts);
    } catch (error) {
      console.error('Failed to load purchased receipts:', error);
      toast.error('Failed to load your purchased tokens');
    } finally {
      setLoadingReceipts(false);
    }
  };

  const loadMeetings = (address: string) => {
    const records = getMeetingsForAddress(address);
    setMeetings(records);
  };

  const handleListReceipt = async (receiptId: number, priceInStroops: number) => {
    if (!walletAddress) return;

    if (!requireIdentity("listing a receipt")) {
      return;
    }

    setListingReceiptId(receiptId);
    try {
      const success = await listReceipt(walletAddress, receiptId, priceInStroops);
      if (success) {
        toast.success('Receipt listed successfully');
        await loadPurchasedReceipts(walletAddress);
      } else {
        toast.error('Listing failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Failed to list receipt:', error);
      toast.error(error.message || 'Failed to list receipt');
    } finally {
      setListingReceiptId(null);
    }
  };

  const handleRedeemReceipt = async (receipt: Receipt) => {
    if (!walletAddress) return;

    if (!requireIdentity("redeeming a receipt")) {
      return;
    }

    setRedeemingReceiptId(receipt.id);
    try {
      markReceiptRedeemed(walletAddress, receipt.id);
      setPurchasedReceipts((prev) => prev.filter((item) => item.id !== receipt.id));
      const normalizedSeller = (() => {
        const candidate = typeof receipt.seller === 'string' ? receipt.seller.trim() : '';
        if (candidate) {
          return candidate;
        }
        const inferred = tokens.find((token) => token.id === receipt.id)?.seller;
        if (inferred) {
          return inferred.trim();
        }
        return walletAddress;
      })();

      const result = recordMeeting({
        receiptId: receipt.id,
        seller: normalizedSeller,
        buyer: walletAddress,
        hours: receipt.hours,
        description: receipt.description,
      });

      const relevantRecords = [result.seller, result.buyer].filter(
        (entry) => entry.seller === walletAddress || entry.buyer === walletAddress
      );
      if (relevantRecords.length > 0) {
        setMeetings((prev) => {
          const filtered = prev.filter(
            (existing) =>
              !relevantRecords.some(
                (incoming) =>
                  incoming.receiptId === existing.receiptId && incoming.role === existing.role
              )
          );
          return [...relevantRecords, ...filtered];
        });
      }
      loadMeetings(walletAddress);
      toast.success('Receipt marked as completed');
    } catch (error: any) {
      console.error('Failed to mark receipt as completed:', error);
      toast.error(error?.message || 'Failed to record completion');
    } finally {
      setRedeemingReceiptId(null);
    }
  };

  const handleUpdateAvailability = async () => {
    if (!editingToken || !walletAddress) return;

    if (!requireIdentity("updating availability")) {
      return;
    }

    setIsUpdating(true);
    try {
      const success = await updateTokenAvailability(walletAddress, editingToken.id, newHours);
      if (success) {
        toast.success("Token availability updated!");
        setEditingToken(null);
        loadUserTokens(walletAddress);
      }
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error.message || "Failed to update availability");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteToken = async (tokenId: number) => {
    if (!walletAddress) return;

    if (!requireIdentity("deleting a token")) {
      return;
    }

    setDeletingTokenId(tokenId);
    try {
      const success = await deleteToken(walletAddress, tokenId);
      if (success) {
        toast.success("Token deleted successfully!");
        loadUserTokens(walletAddress);
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete token");
    } finally {
      setDeletingTokenId(null);
    }
  };

  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <Card className="max-w-md mx-auto text-center">
            <CardHeader>
              <CardTitle>Connect Your Wallet</CardTitle>
              <CardDescription>
                Please connect your Freighter wallet to access your profile and mint time tokens
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Your Display Name</CardTitle>
                <CardDescription>
                  Set how other traders see your wallet address and leave an optional note.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleIdentitySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="identity-name">Name</Label>
                    <Input
                      id="identity-name"
                      ref={identityNameInputRef}
                      value={identityForm.name}
                      onChange={(event) => setIdentityForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="e.g., Jane Smith"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="identity-description">Description (optional)</Label>
                    <Textarea
                      id="identity-description"
                      value={identityForm.description}
                      onChange={(event) => setIdentityForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Add a short note to help others recognise you"
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" disabled={isSavingIdentity || !identityForm.name.trim()}>
                      {isSavingIdentity ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving
                        </>
                      ) : (
                        'Save Identity'
                      )}
                    </Button>
                    {selfIdentity && (
                      <Button type="button" variant="outline" onClick={handleIdentityClear}>
                        Remove Name
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Mint New Time Token
                </CardTitle>
                <CardDescription>
                  Create a new token representing your available time and expertise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleMintToken} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="e.g., 1-on-1 Web3 Development Mentorship"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly Rate (XLM)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="10.00"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hoursAvailable">Hours Available</Label>
                    <Input
                      id="hoursAvailable"
                      type="number"
                      min="1"
                      placeholder="10"
                      value={formData.hoursAvailable}
                      onChange={(e) => setFormData({ ...formData, hoursAvailable: e.target.value })}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-hero hover:opacity-90"
                    disabled={isMinting}
                  >
                    {isMinting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Minting Token...
                      </>
                    ) : (
                      'Mint Time Token'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* User's Tokens */}
          <div className="space-y-10">
            <h2 className="text-2xl font-bold mb-6">Your Time Tokens</h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : tokens.length === 0 ? (
              <Card className="bg-gradient-card border-border">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    You haven't minted any time tokens yet. Create your first token to get started!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tokens.map((token) => (
                  <div key={token.id} className="relative">
                    <TokenCard token={token} isOwner />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingToken(token);
                          setNewHours(token.hours_available);
                        }}
                        disabled={deletingTokenId === token.id}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteToken(token.id)}
                        disabled={deletingTokenId === token.id}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        {deletingTokenId === token.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <h2 className="text-2xl font-bold mb-6">Purchased Time</h2>

              {loadingReceipts ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : purchasedReceipts.length === 0 ? (
                <Card className="bg-gradient-card border-border">
                  <CardContent className="py-10 text-center">
                    <p className="text-muted-foreground">
                      You haven&apos;t purchased any time tokens yet. Browse the marketplace to get started!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {purchasedReceipts.map((receipt) => (
                    <ReceiptCard
                      key={receipt.id}
                      receipt={receipt}
                      listed={receipt.listed}
                      isListing={listingReceiptId === receipt.id}
                      isRedeeming={redeemingReceiptId === receipt.id}
                      onList={(id, price) => handleListReceipt(id, price)}
                      onRedeem={(r) => handleRedeemReceipt(r)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-6">Your Meetings</h2>

              {!walletAddress ? (
                <Card className="bg-gradient-card border-border">
                  <CardContent className="py-10 text-center">
                    <p className="text-muted-foreground">Connect your wallet to track completed meetings.</p>
                  </CardContent>
                </Card>
              ) : meetings.length === 0 ? (
                <Card className="bg-gradient-card border-border">
                  <CardContent className="py-10 text-center">
                    <p className="text-muted-foreground">
                      Meetings you complete as a seller will appear here once your clients redeem their receipts.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {meetings.map((meeting) => (
                    <Card key={meeting.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-base">
                          <span>{meeting.description || 'Completed session'}</span>
                          <span className="text-sm font-semibold text-primary">{meeting.hours}h</span>
                        </CardTitle>
                        <CardDescription className="flex flex-col gap-1 text-xs">
                          <span className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-2">
                              Role:
                              <span className="font-medium">
                                {meeting.role === 'seller' ? 'Seller' : 'Buyer'}
                              </span>
                            </span>
                            <span>{new Date(meeting.timestamp).toLocaleString()}</span>
                          </span>
                          <span className="inline-flex items-center gap-2">
                            {meeting.role === 'seller' ? 'With buyer:' : 'With seller:'}
                            <AddressLabel
                              address={meeting.role === 'seller' ? meeting.buyer : meeting.seller}
                              showAddress
                              size="sm"
                              allowManage
                            />
                          </span>
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!editingToken} onOpenChange={() => setEditingToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Token Availability</DialogTitle>
            <DialogDescription>
              {editingToken?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newHours">New Hours Available</Label>
              <Input
                id="newHours"
                type="number"
                min="0"
                value={newHours}
                onChange={(e) => setNewHours(parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              Current availability: {editingToken?.hours_available} hours
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingToken(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateAvailability} 
              disabled={isUpdating}
              className="bg-gradient-hero hover:opacity-90"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Availability'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
