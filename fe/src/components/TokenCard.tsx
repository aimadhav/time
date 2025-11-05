import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign } from "lucide-react";
import { TimeToken } from "@/lib/stellar";
import { AddressLabel } from "@/components/AddressLabel";

interface TokenCardProps {
  token: TimeToken & { id: number };
  onPurchase?: (tokenId: number) => void;
  isOwner?: boolean;
}

export default function TokenCard({ token, onPurchase, isOwner }: TokenCardProps) {
  const hourlyRate = parseInt(token.hourly_rate) / 10000000;

  return (
    <Card className="bg-gradient-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{token.description}</CardTitle>
            <CardDescription>
              <AddressLabel address={token.seller} allowManage size="sm" />
            </CardDescription>
          </div>
          {isOwner && (
            <Badge variant="secondary" className="ml-2">
              Your Token
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="w-4 h-4 text-primary" />
            <span>Hourly Rate</span>
          </div>
          <span className="text-lg font-bold text-primary">{hourlyRate} XLM</span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 text-accent" />
            <span>Available</span>
          </div>
          <span className="text-lg font-bold text-accent">{token.hours_available}h</span>
        </div>
      </CardContent>
      
      {!isOwner && onPurchase && (
        <CardFooter>
          <Button 
            onClick={() => onPurchase(token.id)} 
            className="w-full bg-gradient-hero hover:opacity-90"
            disabled={token.hours_available === 0}
          >
            {token.hours_available === 0 ? 'Sold Out' : 'Purchase Time'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
