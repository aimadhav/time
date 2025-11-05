import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AddressLabel } from '@/components/AddressLabel';

export interface Receipt {
  id: number;
  hours: number;
  original_rate: number;
  purchase_price: number;
  description: string;
  seller?: string;
}

export interface ReceiptCardProps {
  receipt: Receipt;
  onList?: (receiptId: number, priceInStroops: number) => Promise<void>;
  onRedeem?: (receipt: Receipt) => Promise<void>;
  isListing?: boolean;
  isRedeeming?: boolean;
  listed?: boolean;
}

export const ReceiptCard: React.FC<ReceiptCardProps> = ({
  receipt,
  onList,
  onRedeem,
  isListing = false,
  isRedeeming = false,
  listed = false,
}) => {
  const [resalePrice, setResalePrice] = useState<number>(0);
  const [isListingMode, setIsListingMode] = useState(false);

  const originalRateXLM = receipt.original_rate / 10000000;
  const purchasePriceXLM = receipt.purchase_price / 10000000;

  const handleListClick = async () => {
    if (!resalePrice || resalePrice <= 0) {
      alert('Please enter a valid price');
      return;
    }
    const priceInStroops = Math.round(resalePrice * 10000000);
    await onList?.(receipt.id, priceInStroops);
    setIsListingMode(false);
    setResalePrice(0);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Receipt #{receipt.id}</CardTitle>
        <CardDescription className="flex flex-col gap-1">
          <span>{receipt.hours} hours</span>
          {receipt.seller && (
            <span className="inline-flex items-center gap-2 text-muted-foreground text-xs">
              Seller:
              <AddressLabel address={receipt.seller} showAddress allowManage size="sm" />
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Original Rate</p>
            <p className="text-sm font-semibold">{originalRateXLM} XLM/h</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Purchase Price</p>
            <p className="text-sm font-semibold">{purchasePriceXLM} XLM</p>
          </div>
        </div>

        {receipt.description && (
          <p className="text-sm text-foreground border-l-2 border-primary pl-3">{receipt.description}</p>
        )}

        {isListingMode && (
          <div className="space-y-2 p-3 bg-muted rounded">
            <p className="text-sm font-medium">Set Resale Price (XLM)</p>
            <Input
              type="number"
              step="0.1"
              min="0"
              placeholder="Enter resale price"
              value={resalePrice || ''}
              onChange={(e) => setResalePrice(parseFloat(e.target.value) || 0)}
                disabled={isListing}
            />
          </div>
        )}

        {listed && <Badge variant="secondary">Listed for Sale</Badge>}
      </CardContent>

      <CardFooter className="flex gap-2">
        {!listed && (
          <>
            {!isListingMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsListingMode(true)}
                disabled={isListing || isRedeeming}
                className="flex-1"
              >
                List for Sale
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={handleListClick}
                  disabled={isListing}
                  className="flex-1"
                >
                  {isListing ? 'Listing...' : 'Confirm List'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsListingMode(false)}
                  disabled={isListing}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </>
            )}
          </>
        )}

        <Button
          variant="destructive"
          size="sm"
          onClick={() => onRedeem?.(receipt)}
          disabled={isRedeeming || isListing}
          className="flex-1"
        >
          {isRedeeming ? 'Redeeming...' : '🔥 Redeem'}
        </Button>
      </CardFooter>
    </Card>
  );
};
