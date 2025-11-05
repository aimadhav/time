import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AddressLabel } from '@/components/AddressLabel';

export interface SecondaryListing {
  receipt_id: number;
  receipt: {
    hours: number;
    original_rate: number;
    purchase_price: number;
    description: string;
  };
  listing: {
    price: number;
    seller: string;
    is_active: boolean;
  };
}

export interface SecondaryMarketCardProps {
  listing: SecondaryListing;
  onBuy?: (receiptId: number) => Promise<void>;
  isLoading?: boolean;
}

export const SecondaryMarketCard: React.FC<SecondaryMarketCardProps> = ({
  listing,
  onBuy,
  isLoading = false,
}) => {
  const toNumber = (value: number | bigint | string) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const originalRate = toNumber(listing.receipt.original_rate);
  const originalPrice = toNumber(listing.receipt.purchase_price);
  const resalePrice = toNumber(listing.listing.price);

  const originalRateXLM = originalRate / 10000000;
  const originalPriceXLM = originalPrice / 10000000;
  const resalePriceXLM = resalePrice / 10000000;

  const markupBase = originalPrice === 0 ? 0 : (resalePrice / originalPrice - 1) * 100;
  const markup = markupBase.toFixed(1);
  const royalty = ((resalePrice * 0.05) / 10000000).toFixed(7);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>🎫 Receipt #{listing.receipt_id}</CardTitle>
            <CardDescription>{listing.receipt.hours} hours • {listing.receipt.description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Original Rate</p>
            <p className="text-sm font-semibold">{originalRateXLM} XLM/h</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Original Price</p>
            <p className="text-sm font-semibold">{originalPriceXLM} XLM</p>
          </div>
        </div>

        <div className="p-3 bg-primary/10 rounded">
          <p className="text-xs text-muted-foreground mb-1">Resale Price</p>
          <p className="text-lg font-bold text-primary">
            {resalePriceXLM} XLM
            {Number(markup) > 0 && <span className="text-sm ml-2 text-orange-500">(+{markup}% markup)</span>}
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Seller:</span>
            <AddressLabel
              address={listing.listing.seller}
              showAddress
              allowManage
              size="sm"
              className="justify-end text-right"
            />
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Royalty to Original Seller:</span>
            <span className="font-semibold">{royalty} XLM (5%)</span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          onClick={() => onBuy?.(listing.receipt_id)}
          disabled={isLoading || !listing.listing.is_active}
        >
          {isLoading ? 'Processing...' : `Buy for ${resalePriceXLM} XLM`}
        </Button>
      </CardFooter>
    </Card>
  );
};
