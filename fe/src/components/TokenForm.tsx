import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export interface TokenFormData {
  hourlyRate: number;
  hoursAvailable: number;
  description: string;
  title?: string;
}

export interface TokenFormProps {
  onSubmit: (data: TokenFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export const TokenForm: React.FC<TokenFormProps> = ({
  onSubmit,
  isLoading = false,
  error = null,
}) => {
  const [formData, setFormData] = useState<TokenFormData>({
    hourlyRate: 0,
    hoursAvailable: 0,
    description: '',
    title: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'hourlyRate' || name === 'hoursAvailable' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
      setFormData({
        hourlyRate: 0,
        hoursAvailable: 0,
        description: '',
        title: '',
      });
    } catch (err) {
      console.error('Form submission failed:', err);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Create Time Token</CardTitle>
        <CardDescription>Mint a new time token and list it on the marketplace</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && <div className="p-3 bg-red-100 border border-red-300 rounded text-red-800 text-sm">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="title">Title (Optional)</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., 'Web Development Consulting'"
              value={formData.title}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe your service..."
              value={formData.description}
              onChange={handleChange}
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate (XLM)</Label>
              <Input
                id="hourlyRate"
                name="hourlyRate"
                type="number"
                step="0.1"
                min="0"
                placeholder="10.5"
                value={formData.hourlyRate || ''}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hoursAvailable">Hours Available</Label>
              <Input
                id="hoursAvailable"
                name="hoursAvailable"
                type="number"
                step="1"
                min="0"
                placeholder="100"
                value={formData.hoursAvailable || ''}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Creating Token...' : 'Create Token'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
