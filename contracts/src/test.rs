#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TimeMarketplace);
    let client = TimeMarketplaceClient::new(&env, &contract_id);

    client.initialize();
    
    let count = client.get_token_count();
    assert_eq!(count, 0);
}

#[test]
fn test_mint_time_token() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TimeMarketplace);
    let client = TimeMarketplaceClient::new(&env, &contract_id);

    let seller = Address::generate(&env);
    env.mock_all_auths();

    client.initialize();

    let token_id = client.mint_time_token(
        &seller,
        &100,
        &40,
        &String::from_str(&env, "Software Development Services"),
    );

    assert_eq!(token_id, 1);

    let token = client.get_token(&token_id).unwrap();
    assert_eq!(token.seller, seller);
    assert_eq!(token.hourly_rate, 100);
    assert_eq!(token.hours_available, 40);
}

#[test]
fn test_get_token() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TimeMarketplace);
    let client = TimeMarketplaceClient::new(&env, &contract_id);

    let seller = Address::generate(&env);
    env.mock_all_auths();

    client.initialize();

    let token_id = client.mint_time_token(
        &seller,
        &150,
        &20,
        &String::from_str(&env, "Consulting"),
    );

    let token = client.get_token(&token_id).unwrap();
    assert_eq!(token.hourly_rate, 150);
    assert_eq!(token.hours_available, 20);
}

#[test]
fn test_purchase_token() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TimeMarketplace);
    let client = TimeMarketplaceClient::new(&env, &contract_id);

    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    env.mock_all_auths();

    client.initialize();

    let token_id = client.mint_time_token(
        &seller,
        &100,
        &40,
        &String::from_str(&env, "Design Work"),
    );

    let result = client.purchase_token(&token_id, &buyer, &10);
    assert!(result);

    let token = client.get_token(&token_id).unwrap();
    assert_eq!(token.hours_available, 30);
}

#[test]
fn test_purchase_token_insufficient_hours() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TimeMarketplace);
    let client = TimeMarketplaceClient::new(&env, &contract_id);

    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    env.mock_all_auths();

    client.initialize();

    let token_id = client.mint_time_token(
        &seller,
        &100,
        &5,
        &String::from_str(&env, "Limited Hours"),
    );

    let result = client.purchase_token(&token_id, &buyer, &10);
    assert!(!result);

    let token = client.get_token(&token_id).unwrap();
    assert_eq!(token.hours_available, 5);
}

#[test]
fn test_update_availability() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TimeMarketplace);
    let client = TimeMarketplaceClient::new(&env, &contract_id);

    let seller = Address::generate(&env);
    env.mock_all_auths();

    client.initialize();

    let token_id = client.mint_time_token(
        &seller,
        &100,
        &40,
        &String::from_str(&env, "Tutoring"),
    );

    let result = client.update_availability(&token_id, &seller, &50);
    assert!(result);

    let token = client.get_token(&token_id).unwrap();
    assert_eq!(token.hours_available, 50);
}

#[test]
fn test_delete_token() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TimeMarketplace);
    let client = TimeMarketplaceClient::new(&env, &contract_id);

    let seller = Address::generate(&env);
    env.mock_all_auths();

    client.initialize();

    let token_id = client.mint_time_token(
        &seller,
        &100,
        &40,
        &String::from_str(&env, "To Be Deleted"),
    );

    let result = client.delete_token(&token_id, &seller);
    assert!(result);

    let token = client.get_token(&token_id);
    assert!(token.is_none());
}

#[test]
fn test_get_seller_tokens() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TimeMarketplace);
    let client = TimeMarketplaceClient::new(&env, &contract_id);

    let seller = Address::generate(&env);
    env.mock_all_auths();

    client.initialize();

    client.mint_time_token(
        &seller,
        &100,
        &40,
        &String::from_str(&env, "Service 1"),
    );

    client.mint_time_token(
        &seller,
        &150,
        &20,
        &String::from_str(&env, "Service 2"),
    );

    let tokens = client.get_seller_tokens(&seller);
    assert_eq!(tokens.len(), 2);
}

#[test]
fn test_get_token_count() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TimeMarketplace);
    let client = TimeMarketplaceClient::new(&env, &contract_id);

    let seller1 = Address::generate(&env);
    let seller2 = Address::generate(&env);
    env.mock_all_auths();

    client.initialize();

    client.mint_time_token(
        &seller1,
        &100,
        &40,
        &String::from_str(&env, "Service 1"),
    );

    client.mint_time_token(
        &seller2,
        &150,
        &20,
        &String::from_str(&env, "Service 2"),
    );

    let count = client.get_token_count();
    assert_eq!(count, 2);
}
