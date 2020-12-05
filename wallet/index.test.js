const Wallet = require('./index');
const Transaction = require('./transaction');
const { verifySignature } = require('../util');
const Blockchain = require('../blockchain');
const { STARTING_BALANCE } =require('../config');


describe('Wallet', () => {
    let wallet;
    
    
    beforeEach(() => {
        wallet = new Wallet();
    });
    
    it('hash a `balance`', () => {
        expect(wallet).toHaveProperty('balance');
        
    });
    
    it('hash a `publicKey`', () => {
        
        expect(wallet).toHaveProperty('publicKey');
    });
    
    describe('signing data', () => {
        const data = 'foobar';
        
        it('verifyes is a signature', () => {
            expect(
                verifySignature({
                    publicKey: wallet.publicKey,
                    data,
                    signature: wallet.sign(data)
                })
            ).toBe(true);
        });
        
        it('does not verify an invaild signature ', () => {
            expect(
                verifySignature({
                    publicKey: wallet.publicKey,
                    data,
                    signature: new Wallet().sign(data)
                })
            ).toBe(false);
        });
    });
    
    describe('createTransaction()', () => {
       describe('and the amount exceeds teh balance', () => {
           it('the an error', () => {
              expect(() => wallet.createTransaction({ amount: 9999, recipient: 'foo-recipient' }))
                .toThrow('Amount exceeds balance');
           });
           
       });
       
       describe('and the amount is valid', () => {
           let transaction, amount, recipient;
           
           beforeEach(() => {
               amount = 50;
               recipient = 'foo-recipient';
               transaction = wallet.createTransaction({ amount, recipient });
               
           });
           
           it('creates an instsnce of `Transaction`', () => {
               expect(transaction instanceof Transaction).toBe(true);
           });
           
           it('matchs the transaction input with the wallet', () => {
               expect(transaction.input.address).toEqual(wallet.publicKey);
           });
           
           it('outputs teh amount the recipient', () => {
               expect(transaction.outputMap[recipient]).toEqual(amount);
           })
       });
       
       describe('and a chain is pased', () => {
           it('calls `Wallet.calculateBalance`', () => {
               const calculateBalanceMock = jest.fn();
               const originalCalculateBalance = Wallet.calculateBalance;
               
               Wallet.calculateBalance = calculateBalanceMock;
               
               wallet.createTransaction({
                   recipient: 'foo',
                   amount: 10,
                   chain: new Blockchain().chain
               });
               expect(calculateBalanceMock).toHaveBeenCalled();
               
               Wallet.calculateBalance = originalCalculateBalance;
           });
       });
    });
    
    describe('calculateBalance()', () => {
        let blockchain;
        
        beforeEach(() => {
            blockchain = new Blockchain();
        });
        
        
        describe('and there are no outputs for the wallet ', () => {
           it('return the `STARTING_BALANCE`', () => {
               expect(
                   Wallet.calculateBalance({
                       chain: blockchain.chain,
                       address: wallet.publicKey
                   })
               ).toEqual(STARTING_BALANCE);
               
           });
        });
        
        describe('and there are outputs for the wallet', () => {
            let transactionOne, transactionTwo;
            
            beforeEach(() => {
                transactionOne = new Wallet().createTransaction({
                    recipient: wallet.publicKey,
                    amount: 50
                });
                
                transactionTwo = new Wallet().createTransaction({
                    recipient: wallet.publicKey,
                    amount: 25
                });
                
                blockchain.addBlock({ data: [transactionOne, transactionTwo] }); 
            });
            
            it('adds thw sum of all outputs to the wallet balance', () => {
                
                expect(
                    Wallet.calculateBalance({
                        chain: blockchain.chain,
                        address: wallet.publicKey
                        
                    })
                ).toEqual(
                    STARTING_BALANCE + 
                    transactionOne.outputMap[wallet.publicKey] +
                    transactionTwo.outputMap[wallet.publicKey]
                );
            });
            
            describe('and the wallet has made a transaction', () => {
                let recentTransaction;
                
                beforeEach(() => {
                   recentTransaction = wallet.createTransaction({
                       recipient: 'foo-address',
                       amount: 30
                   });
                   blockchain.addBlock({ data: [recentTransaction] });
                });
                
                it('return the output amount of the recent transaction', () => {
                   expect(
                    Wallet.calculateBalance({
                        chain: blockchain.chain,
                        address: wallet.publicKey
                    })
                   ).toEqual(recentTransaction.outputMap[wallet.publicKey]);
                });
                
                describe('and there are output next to and after the recent transaction', () => {
                   let sameBlockTransaction, nextBlockTransaction;
                   
                   beforeEach(() => {
                       recentTransaction = wallet.createTransaction({
                           recipient: 'Later-foo-address',
                           amount: 60
                       });
                       
                       sameBlockTransaction = Transaction.rewardTransaction({ minerWallet: wallet });
                       blockchain.addBlock({ data: [recentTransaction, sameBlockTransaction] });
                       
                       nextBlockTransaction = new Wallet().createTransaction({
                           recipient: wallet.publicKey, amount: 75
                       });
                       
                       blockchain.addBlock({ data: [nextBlockTransaction] });
                   });
                   
                   it('includes the output amounts in the retruned balance', () => {
                        expect(
                            Wallet.calculateBalance({
                                chain: blockchain.chain,
                                address: wallet.publicKey
                            })
                        ).toEqual(
                            recentTransaction.outputMap[wallet.publicKey] +
                            sameBlockTransaction.outputMap[wallet.publicKey] +
                            nextBlockTransaction.outputMap[wallet.publicKey]
                        );
                    });
                });
            });
        });
    });
});