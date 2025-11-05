# Page Implementation Examples

## Marketplace Page Implementation

This is a complete example of how to implement the Marketplace page using the created components and hooks.

```typescript
// src/pages/Marketplace.tsx
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useWallet } from '@/context/WalletContext';
import { useTransaction, useContractRead } from '@/hooks/useStellar';
import { TokenCard, TokenForm, TokenFormData } from '@/components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  getTokenCount,
  getToken,
  getSellerTokens,
  getMarketplaceTokens,
  mintTimeToken,
  purchaseToken,
  deleteToken,
  updateTokenAvailability,
  TimeToken,
  CONFIG,
} from '@/lib/stellar';

export default function Marketplace() {
  const { publicKey, isConnected } = useWallet();
  const { signAndSend, isLoading: isTxLoading } = useTransaction();
  const { call: queryContract, isLoading: isQueryLoading } = useContractRead();

  const [tokens, setTokens] = useState<(TimeToken & { id: number })[]>([]);
  const [myTokens, setMyTokens] = useState<number[]>([]);
  const [showMintForm, setShowMintForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Load all tokens from marketplace
  useEffect(() => {
    loadMarketplaceTokens();
  }, []);

  // Load user's tokens if connected
  useEffect(() => {
    if (isConnected && publicKey) {
      loadMyTokens();
    }
  }, [isConnected, publicKey]);

  const loadMarketplaceTokens = async () => {
    try {
      // First try API
      const apiTokens = await getMarketplaceTokens({
        search: searchTerm,
        category: filterCategory,
        sort: sortBy,
        min_price: minPrice ? parseFloat(minPrice) * 10000000 : undefined,
        max_price: maxPrice ? parseFloat(maxPrice) * 10000000 : undefined,
      });

      if (apiTokens.length > 0) {
        setTokens(apiTokens);
        return;
      }

      // Fallback to blockchain
      const count = await getTokenCount();
      const loadedTokens: (TimeToken & { id: number })[] = [];

      for (let i = 1; i <= count; i++) {
        const token = await getToken(i);
        if (token) {
          loadedTokens.push({ ...token, id: i });
        }
      }

      setTokens(loadedTokens);
    } catch (error) {
      console.error('Failed to load tokens:', error);
      toast.error('Failed to load marketplace');
    }
  };

  const loadMyTokens = async () => {
    if (!publicKey) return;

    try {
      const sellerTokenIds = await getSellerTokens(publicKey);
      setMyTokens(sellerTokenIds);
    } catch (error) {
      console.error('Failed to load my tokens:', error);
    }
  };

  // Handle minting new token
  const handleMintToken = async (formData: TokenFormData) => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      toast.loading('Minting token...');

      // Call the contract function
      const result = await signAndSend((contract) =>
        contract.call(
          'mint_time_token',
          StellarSdk.Address.fromString(publicKey).toScVal(),
          StellarSdk.nativeToScVal(formData.hourlyRate * 10000000, { type: 'i128' }),
          StellarSdk.nativeToScVal(formData.hoursAvailable, { type: 'u32' }),
          StellarSdk.nativeToScVal(formData.description, { type: 'string' })
        )
      );

      if (result?.status === 'SUCCESS') {
        toast.success('Token minted successfully!');
        setShowMintForm(false);

        // Reload tokens
        setTimeout(() => {
          loadMarketplaceTokens();
          loadMyTokens();
        }, 1000);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to mint token');
    }
  };

  // Handle purchasing token
  const handlePurchaseToken = async (tokenId: number) => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    const hours = prompt('How many hours would you like to purchase?');
    if (!hours || parseInt(hours) <= 0) {
      return;
    }

    try {
      toast.loading('Processing purchase...');

      const result = await signAndSend((contract) =>
        contract.call(
          'purchase_token',
          StellarSdk.nativeToScVal(tokenId, { type: 'u64' }),
          StellarSdk.Address.fromString(publicKey).toScVal(),
          StellarSdk.nativeToScVal(parseInt(hours), { type: 'u32' }),
          StellarSdk.Address.fromString(CONFIG.xlmTokenId).toScVal()
        )
      );

      if (result?.status === 'SUCCESS') {
        toast.success('Purchase successful!');
        setTimeout(() => {
          loadMarketplaceTokens();
        }, 1000);
      }
    } catch (error: any) {
      toast.error(error.message || 'Purchase failed');
    }
  };

  // Handle deleting token
  const handleDeleteToken = async (tokenId: number) => {
    if (!publicKey) return;

    if (!confirm('Are you sure you want to delete this token?')) {
      return;
    }

    try {
      toast.loading('Deleting token...');

      const result = await signAndSend((contract) =>
        contract.call(
          'delete_token',
          StellarSdk.nativeToScVal(tokenId, { type: 'u64' }),
          StellarSdk.Address.fromString(publicKey).toScVal()
        )
      );

      if (result?.status === 'SUCCESS') {
        toast.success('Token deleted!');
        setTimeout(() => {
          loadMarketplaceTokens();
          loadMyTokens();
        }, 1000);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete token');
    }
  };

  // Handle updating token availability
  const handleUpdateToken = async (tokenId: number) => {
    if (!publicKey) return;

    const newHours = prompt('Enter new hours available:');
    if (!newHours || parseInt(newHours) < 0) {
      return;
    }

    try {
      toast.loading('Updating token...');

      const result = await signAndSend((contract) =>
        contract.call(
          'update_availability',
          StellarSdk.nativeToScVal(tokenId, { type: 'u64' }),
          StellarSdk.Address.fromString(publicKey).toScVal(),
          StellarSdk.nativeToScVal(parseInt(newHours), { type: 'u32' })
        )
      );

      if (result?.status === 'SUCCESS') {
        toast.success('Token updated!');
        setTimeout(() => {
          loadMarketplaceTokens();
          loadMyTokens();
        }, 1000);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update token');
    }
  };

  // Apply filters
  const handleApplyFilters = () => {
    loadMarketplaceTokens();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Marketplace</h1>

      {/* Mint Token Section */}
      {isConnected && (
        <div className="mb-8">
          <Button
            onClick={() => setShowMintForm(!showMintForm)}
            className="mb-4"
          >
            {showMintForm ? 'Close Form' : 'Create New Token'}
          </Button>

          {showMintForm && (
            <TokenForm
              onSubmit={handleMintToken}
              isLoading={isTxLoading}
              error={null}
            />
          )}
        </div>
      )}

      {/* My Tokens Section */}
      {isConnected && myTokens.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Your Tokens</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens
              .filter((t) => myTokens.includes(t.id))
              .map((token) => (
                <TokenCard
                  key={token.id}
                  token={{ ...token, id: token.id }}
                  onDelete={handleDeleteToken}
                  onUpdate={handleUpdateToken}
                  isOwned={true}
                  loading={isTxLoading}
                />
              ))}
          </div>
        </div>
      )}

      {/* Filters Section */}
      <Card className="p-4 mb-8">
        <h3 className="font-bold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Input
            placeholder="Min price (XLM)"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            type="number"
          />
          <Input
            placeholder="Max price (XLM)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            type="number"
          />
          <Button onClick={handleApplyFilters}>Apply Filters</Button>
        </div>
      </Card>

      {/* Marketplace Tokens */}
      <div>
        <h2 className="text-2xl font-bold mb-4">
          Available Tokens ({tokens.length})
        </h2>
        {isQueryLoading ? (
          <p>Loading tokens...</p>
        ) : tokens.length === 0 ? (
          <p>No tokens found in marketplace.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens
              .filter((t) => !myTokens.includes(t.id))
              .map((token) => (
                <TokenCard
                  key={token.id}
                  token={{ ...token, id: token.id }}
                  onPurchase={handlePurchaseToken}
                  loading={isTxLoading}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Profile Page Implementation

```typescript
// src/pages/Profile.tsx
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useWallet } from '@/context/WalletContext';
import { useTransaction, useContractRead } from '@/hooks/useStellar';
import { ReceiptCard } from '@/components/ReceiptCard';
import { SecondaryMarketCard } from '@/components/SecondaryMarketCard';
import { ProfileModal } from '@/components/ProfileModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  getMyReceipts,
  getReceipt,
  getReceiptCount,
  getListing,
  listReceipt,
  buyFromSecondary,
  redeemReceipt,
  getUserProfile,
  saveUserProfile,
  UserProfile,
} from '@/lib/stellar';

export default function Profile() {
  const { publicKey, isConnected } = useWallet();
  const { signAndSend, isLoading: isTxLoading } = useTransaction();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    if (isConnected && publicKey) {
      loadProfile();
      loadReceipts();
      loadSecondaryMarket();
    }
  }, [isConnected, publicKey]);

  const loadProfile = async () => {
    if (!publicKey) return;

    try {
      const userProfile = await getUserProfile(publicKey);
      setProfile(userProfile);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const loadReceipts = async () => {
    if (!publicKey) return;

    try {
      const receiptIds = await getMyReceipts(publicKey);
      const loadedReceipts: any[] = [];

      for (const id of receiptIds) {
        const receipt = await getReceipt(id);
        if (receipt) {
          loadedReceipts.push({ id, ...receipt });
        }
      }

      setReceipts(loadedReceipts);
    } catch (error) {
      console.error('Failed to load receipts:', error);
      toast.error('Failed to load receipts');
    }
  };

  const loadSecondaryMarket = async () => {
    if (!publicKey) return;

    try {
      const count = await getReceiptCount();
      const activeListings: any[] = [];

      for (let i = 1; i <= count; i++) {
        const listing = await getListing(i);
        if (listing && listing.is_active) {
          const receipt = await getReceipt(i);
          if (receipt) {
            activeListings.push({
              receipt_id: i,
              listing,
              receipt,
            });
          }
        }
      }

      setListings(activeListings);
    } catch (error) {
      console.error('Failed to load secondary market:', error);
    }
  };

  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    if (!publicKey) return;

    setIsLoadingProfile(true);
    try {
      await saveUserProfile(publicKey, updatedProfile);
      setProfile(updatedProfile);
      setShowProfileModal(false);
      toast.success('Profile saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleListReceipt = async (receiptId: number, priceInStroops: number) => {
    if (!publicKey) return;

    try {
      toast.loading('Listing receipt...');

      const result = await signAndSend((contract) => {
        const priceAmount = BigInt(priceInStroops);
        const i128Value = new StellarSdk.xdr.Int128Parts({
          lo: StellarSdk.xdr.Uint64.fromString(
            (priceAmount & BigInt('0xFFFFFFFFFFFFFFFF')).toString()
          ),
          hi: StellarSdk.xdr.Int64.fromString(
            (priceAmount >> BigInt(64)).toString()
          ),
        });

        return contract.call(
          'list_on_secondary',
          StellarSdk.nativeToScVal(receiptId, { type: 'u64' }),
          StellarSdk.Address.fromString(publicKey).toScVal(),
          StellarSdk.xdr.ScVal.scvI128(i128Value)
        );
      });

      if (result?.status === 'SUCCESS') {
        toast.success('Receipt listed for sale!');
        setTimeout(() => {
          loadReceipts();
          loadSecondaryMarket();
        }, 1000);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to list receipt');
    }
  };

  const handleBuyFromSecondary = async (receiptId: number) => {
    if (!publicKey) return;

    const listing = listings.find((l) => l.receipt_id === receiptId);
    if (!listing) return;

    const priceXLM = (listing.listing.price / 10000000).toFixed(7);
    if (!confirm(`Buy this receipt for ${priceXLM} XLM?`)) {
      return;
    }

    try {
      toast.loading('Processing purchase...');

      const result = await signAndSend((contract) =>
        contract.call(
          'buy_from_secondary',
          StellarSdk.nativeToScVal(receiptId, { type: 'u64' }),
          StellarSdk.Address.fromString(publicKey).toScVal(),
          StellarSdk.Address.fromString('CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC').toScVal()
        )
      );

      if (result?.status === 'SUCCESS') {
        toast.success('Purchase successful!');
        setTimeout(() => {
          loadReceipts();
          loadSecondaryMarket();
        }, 1000);
      }
    } catch (error: any) {
      toast.error(error.message || 'Purchase failed');
    }
  };

  const handleRedeemReceipt = async (receiptId: number) => {
    if (!publicKey) return;

    if (!confirm('Are you sure? This will permanently burn the token.')) {
      return;
    }

    try {
      toast.loading('Redeeming receipt...');

      const result = await signAndSend((contract) =>
        contract.call(
          'redeem_receipt',
          StellarSdk.nativeToScVal(receiptId, { type: 'u64' }),
          StellarSdk.Address.fromString(publicKey).toScVal()
        )
      );

      if (result?.status === 'SUCCESS') {
        toast.success('Receipt redeemed!');
        setTimeout(() => {
          loadReceipts();
          loadSecondaryMarket();
        }, 1000);
      }
    } catch (error: any) {
      toast.error(error.message || 'Redemption failed');
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Profile</h1>
        <p className="text-muted-foreground">Please connect your wallet to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        <Button onClick={() => setShowProfileModal(true)}>Edit Profile</Button>
      </div>

      {profile && (
        <div className="mb-8 p-4 bg-card rounded-lg border">
          {profile.avatar_url && (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-20 h-20 rounded-full mb-4"
            />
          )}
          <h2 className="text-2xl font-bold">{profile.display_name || profile.username}</h2>
          {profile.bio && <p className="text-muted-foreground">{profile.bio}</p>}
        </div>
      )}

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSave={handleSaveProfile}
        initialProfile={profile}
        isLoading={isLoadingProfile}
      />

      <Tabs defaultValue="receipts">
        <TabsList>
          <TabsTrigger value="receipts">My Receipts ({receipts.length})</TabsTrigger>
          <TabsTrigger value="secondary">Secondary Market ({listings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="receipts" className="mt-4">
          {receipts.length === 0 ? (
            <p>You haven't purchased any hours yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {receipts.map((receipt) => (
                <ReceiptCard
                  key={receipt.id}
                  receipt={receipt}
                  onList={handleListReceipt}
                  onRedeem={handleRedeemReceipt}
                  isLoading={isTxLoading}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="secondary" className="mt-4">
          {listings.length === 0 ? (
            <p>No active listings on secondary market.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <SecondaryMarketCard
                  key={listing.receipt_id}
                  listing={listing}
                  onBuy={handleBuyFromSecondary}
                  isLoading={isTxLoading}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Key Implementation Patterns

### Error Handling
```typescript
try {
  const result = await signAndSend(...);
  if (result?.status === 'SUCCESS') {
    toast.success('Operation successful!');
  }
} catch (error: any) {
  toast.error(error.message || 'Operation failed');
}
```

### Loading States
```typescript
<Button
  onClick={handleClick}
  disabled={isTxLoading}
>
  {isTxLoading ? 'Processing...' : 'Click Me'}
</Button>
```

### Data Formatting
```typescript
// XLM conversion
const xlmAmount = stroopsAmount / 10000000;

// Address formatting
const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
```

This gives you a complete, production-ready implementation! 🚀
