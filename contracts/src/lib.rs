#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

#[contracttype]
pub struct TimeToken {
    pub seller: Address,
    pub hourly_rate: i128,
    pub hours_available: u32,
    pub description: String,
}

#[contracttype]
pub enum DataKey {
    TokenCounter,
    Token(u64),
    SellerTokens(Address),
}

#[contract]
pub struct TimeMarketplace;

#[contractimpl]
impl TimeMarketplace {
    /// Initialize the contract
    pub fn initialize(env: Env) {
        env.storage().instance().set(&DataKey::TokenCounter, &0u64);
    }

    /// Mint a new time token
    pub fn mint_time_token(
        env: Env,
        seller: Address,
        hourly_rate: i128,
        hours_available: u32,
        description: String,
    ) -> u64 {
        seller.require_auth();

        let mut counter: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TokenCounter)
            .unwrap_or(0);

        counter += 1;

        let token = TimeToken {
            seller: seller.clone(),
            hourly_rate,
            hours_available,
            description,
        };

        env.storage().instance().set(&DataKey::Token(counter), &token);
        env.storage().instance().set(&DataKey::TokenCounter, &counter);

        // Track seller's tokens
        let mut seller_tokens: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::SellerTokens(seller.clone()))
            .unwrap_or(Vec::new(&env));
        
        seller_tokens.push_back(counter);
        env.storage()
            .instance()
            .set(&DataKey::SellerTokens(seller), &seller_tokens);

        counter
    }

    /// Get token details
    pub fn get_token(env: Env, token_id: u64) -> Option<TimeToken> {
        env.storage().instance().get(&DataKey::Token(token_id))
    }

    /// Purchase time token
    pub fn purchase_token(env: Env, token_id: u64, buyer: Address, hours: u32) -> bool {
        buyer.require_auth();

        let mut token: TimeToken = match env.storage().instance().get(&DataKey::Token(token_id)) {
            Some(t) => t,
            None => return false,
        };

        if token.hours_available < hours {
            return false;
        }

        token.hours_available -= hours;
        env.storage().instance().set(&DataKey::Token(token_id), &token);

        true
    }

    /// Update token availability
    pub fn update_availability(env: Env, token_id: u64, seller: Address, new_hours: u32) -> bool {
        seller.require_auth();

        let mut token: TimeToken = match env.storage().instance().get(&DataKey::Token(token_id)) {
            Some(t) => t,
            None => return false,
        };

        if token.seller != seller {
            return false;
        }

        token.hours_available = new_hours;
        env.storage().instance().set(&DataKey::Token(token_id), &token);
        true
    }

    /// Delete a token
    pub fn delete_token(env: Env, token_id: u64, seller: Address) -> bool {
        seller.require_auth();

        let token: TimeToken = match env.storage().instance().get(&DataKey::Token(token_id)) {
            Some(t) => t,
            None => return false,
        };

        if token.seller != seller {
            return false;
        }

        env.storage().instance().remove(&DataKey::Token(token_id));
        true
    }

    /// Get all tokens by seller
    pub fn get_seller_tokens(env: Env, seller: Address) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&DataKey::SellerTokens(seller))
            .unwrap_or(Vec::new(&env))
    }

    /// Get total token count
    pub fn get_token_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::TokenCounter).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
