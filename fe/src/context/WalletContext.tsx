import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import * as freighterApi from '@stellar/freighter-api';

export interface WalletContextType {
  publicKey: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
  isFreighterAvailable: boolean;
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFreighterAvailable, setIsFreighterAvailable] = useState(false);

  useEffect(() => {
    console.log('🔍 [WalletContext] Checking Freighter availability...');
    
    const checkFreighter = async () => {
      try {
        // Use the freighter-api package to check if Freighter is installed
        const result = await freighterApi.isConnected();
        const isAvailable = result && !result.error;
        
        console.log('🔍 [WalletContext] Freighter check result:', { isAvailable, result });
        setIsFreighterAvailable(isAvailable);
        
        if (isAvailable) {
          console.log('✅ [WalletContext] Freighter is available!');
          
          // Try to restore saved connection
          const savedAddress = sessionStorage.getItem('walletAddress');
          if (savedAddress) {
            console.log('🔄 [WalletContext] Attempting to restore session:', savedAddress);
            try {
              const addressResult = await freighterApi.getAddress();
              if (addressResult && !addressResult.error && addressResult.address === savedAddress) {
                setPublicKey(savedAddress);
                console.log('✅ [WalletContext] Session restored successfully');
              } else {
                sessionStorage.removeItem('walletAddress');
                console.log('⚠️ [WalletContext] Session invalid, cleared');
              }
            } catch (err) {
              console.error('❌ [WalletContext] Error restoring session:', err);
              sessionStorage.removeItem('walletAddress');
            }
          }
        } else {
          console.log('❌ [WalletContext] Freighter not available');
        }
      } catch (err) {
        console.error('❌ [WalletContext] Error checking Freighter:', err);
        setIsFreighterAvailable(false);
      }
    };

    checkFreighter();
  }, []);

  const connect = useCallback(async () => {
    console.log('🔌 [WalletContext] connect() called');
    console.log('🔌 [WalletContext] isFreighterAvailable:', isFreighterAvailable);
    
    if (!isFreighterAvailable) {
      const errorMsg = 'Freighter wallet is not installed. Please install it from freighter.app';
      console.error('❌ [WalletContext]', errorMsg);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      console.log('🔌 [WalletContext] Requesting address from Freighter...');
      const addressResult = await freighterApi.getAddress();
      
      console.log('🔌 [WalletContext] Address result:', addressResult);
      
      if (addressResult.error) {
        throw new Error(addressResult.error.message || 'Failed to get address');
      }
      
      if (!addressResult.address) {
        throw new Error('No address returned from Freighter');
      }
      
      console.log('✅ [WalletContext] Connected successfully:', addressResult.address);
      setPublicKey(addressResult.address);
      sessionStorage.setItem('walletAddress', addressResult.address);
    } catch (err: any) {
      console.error('❌ [WalletContext] Connection error:', err);
      console.error('❌ [WalletContext] Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      const errorMessage = err.message || 'Failed to connect wallet. Please make sure Freighter is installed.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  }, [isFreighterAvailable]);

  const disconnect = useCallback(() => {
    console.log('[WalletContext] disconnect() called');
    setPublicKey(null);
    setError(null);
    sessionStorage.removeItem('walletAddress');
  }, []);

  const value: WalletContextType = {
    publicKey,
    isConnected: publicKey !== null,
    isConnecting,
    connect,
    disconnect,
    error,
    isFreighterAvailable,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = (): WalletContextType => {
  const context = React.useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};
