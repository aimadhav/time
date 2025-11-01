import React, { useEffect, useState } from 'react';
import { getAvailableTokens, purchaseToken } from './token-manager';

const Marketplace = () => {
    const [tokens, setTokens] = useState([]);

    useEffect(() => {
        const fetchTokens = async () => {
            const availableTokens = await getAvailableTokens();
            setTokens(availableTokens);
        };

        fetchTokens();
    }, []);

    const handlePurchase = async (tokenId) => {
        try {
            await purchaseToken(tokenId);
            alert('Token purchased successfully!');
            // Refresh the token list after purchase
            const availableTokens = await getAvailableTokens();
            setTokens(availableTokens);
        } catch (error) {
            alert('Error purchasing token: ' + error.message);
        }
    };

    return (
        <div className="marketplace">
            <h1>Marketplace</h1>
            <ul>
                {tokens.map(token => (
                    <li key={token.id}>
                        <span>{token.name} - {token.price} XLM</span>
                        <button onClick={() => handlePurchase(token.id)}>Purchase</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Marketplace;