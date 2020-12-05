const Blockchain = require('../blockchain');
const Block = require('./block');
const { cryptoHash } = require('../util');
const Wallet = require('../wallet');
const Transaction = require('../wallet/transaction');


describe('Blockchain', () => {
    
    let blockchain, newChain, originalChain, errorMock;
   
    beforeEach(() => {
        blockchain = new Blockchain(); 
        newChain = new Blockchain();
        errorMock = jest.fn();
        
        originalChain = blockchain.chain;
        global.console.error = errorMock;
    });
   
    it('contains a `chain` Array instance', () => {
        expect(blockchain.chain instanceof Array).toBe(true)
    });
   
    it('starts with the genesis block',() => {
        expect(blockchain.chain[0]).toEqual(Block.genesis());
    });
   
    it('add a new block to the chain', () => {
        const newData = 'foo bar';
        blockchain.addBlock({ data: newData });
        expect(blockchain.chain[blockchain.chain.length-1].data).toEqual(newData);
    });
   
    describe('isValidChain', () => {
        describe('when the chain does not starts with the genesis block', () => {
            it('return false', () => {
                blockchain.chain[0] = { data: 'fake-genesis' };
               
                expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
            });
        });
       
       describe('when the chain starts with the genesis block and has multiple block', () => {
            beforeEach(() => {
               blockchain.addBlock({ data: 'Bears' }); 
               blockchain.addBlock({ data: 'Beets' }); 
               blockchain.addBlock({ data: 'Bettstar Galatica'}); 
               
            });
            describe('and a lastHash Reference has changed', () => {
                it('return false', () => {
                    blockchain.chain[2].lastHash = 'broken-lastHash';
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                    
                }); 
            });
            describe('and the chain contains a blocks sn invalid field', () => {
                it('return false', () => {
                    blockchain.chain[2].data = 'some-bad-and-evil-data';
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });
            describe('and the chain contains a block with a jumped difficulty',() => {
                it('return false', () => {
                    const lastBlock = blockchain.chain[blockchain.chain.length-1];
                    const lastHash = lastBlock.hash;
                    const timestamp = Date.now();
                    const nonce = 0;
                    const data = [];
                    const difficulty = lastBlock.difficulty - 3;
                    
                    const hash = cryptoHash(timestamp, lastHash, difficulty, nonce, data);
                    
                    const badBlock = new Block({
                       timestamp, lastHash, hash, nonce, difficulty, data 
                    });
                    
                    blockchain.chain.push(badBlock);
                    
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                })
            });
            describe('and the chain does not contain amy invalid blocks', () => {
                    it('return true', () => {
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(true);
                });
            });
        });
    });
    
    describe('replaceChain()', () => {
        let logMock;
        
        beforeEach(() => {
           logMock = jest.fn();
           

           global.console.log = logMock;
        });
        
        describe('when the new chain is not longer', () => {
            beforeEach(() => {
                newChain.chain[0] = { new: 'chain'};
                blockchain.replaceChain(newChain.chain);
            });
            
            it('does not replace the chain', () => {
                expect(blockchain.chain).toEqual(originalChain);
            });
            
            it('logs an error', () => {
               expect(errorMock).toHaveBeenCalled(); 
            });
        });
        
        describe('when the new chain is longer', () => {
            beforeEach(() => {
               newChain.addBlock({ data: 'Bears' }); 
               newChain.addBlock({ data: 'Beets' }); 
               newChain.addBlock({ data: 'Bettstar Galatica'});
            });
            
            describe('and the chain is invalid', () => {
                beforeEach(() => {
                    newChain.chain[2].hash = 'some-fake-hash';
                    blockchain.replaceChain(newChain.chain);
                });
                
                it('does not replace the chain', () => {
                    expect(blockchain.chain).toEqual(originalChain);
                });
                
                it('logs an error', () => {
                    expect(errorMock).toHaveBeenCalled(); 
                });
            });
            
            describe('and the chain is valid', () => {
                beforeEach(() => {
                    blockchain.replaceChain(newChain.chain);
                });
                
                it('replace the chain', () => {
                    expect(blockchain.chain).toEqual(newChain.chain);
                });
                
                it('logs about the chain replacement', () => {
                    expect(logMock).toHaveBeenCalled();
                });
            });
        });
        
        describe('and the `validateTransactions` flags is true', () => {
            it('calls validTransctionData()', () => {
                const validTransctionDataMock = jest.fn();
                
                blockchain.validTransctionData = validTransctionDataMock;
                newChain.addBlock({ data: 'foo' });
                blockchain.replaceChain(newChain.chain, true);
                
                expect(validTransctionDataMock).toHaveBeenCalled();
            });
        });
    });
    
    describe('validTransctionData()', () => {
        let transaction, rewardTransaction, wallet;
        
        beforeEach(() => {
            wallet = new Wallet();
            
            transaction = wallet.createTransaction({ recipient: 'foo-address', amount: 67 });
            rewardTransaction = Transaction.rewardTransaction({ minerWallet: wallet });
             
        });
        
        describe('and the transaction data is valid', () => {
           it('rethrn true', () => {
               newChain.addBlock({ data: [transaction, rewardTransaction] });
               expect(blockchain.validTransctionData({ chain: newChain.chain })).toBe(true);
               expect(errorMock).not.toHaveBeenCalled(); 
           });
        });
        
        describe('and the transaction data had multipe rewards', () => {
            it('return false', () => {
                newChain.addBlock({ data: [transaction, rewardTransaction, rewardTransaction] });
                expect(blockchain.validTransctionData({ chain: newChain.chain })).toBe(false);
                 expect(errorMock).toHaveBeenCalled(); 
            });
        });
        
        describe('and the transaction data has at last one malformed outputMap', () => {
           describe('and the transaction is not a rewards transaction', () => {
               it('return false', () => {
                   transaction.outputMap[wallet.publicKey] = 99999;
                   
                   newChain.addBlock({ data: [transaction, rewardTransaction] });
                   
                   expect(blockchain.validTransctionData({ chain: newChain.chain })).toBe(false);
                    expect(errorMock).toHaveBeenCalled(); 
               });
           });
           
           describe('and the transaction is a rewards transaction', () => {
               it('return false', () => {
                   rewardTransaction.outputMap[wallet.publicKey] = 99999;
                   
                   newChain.addBlock({ data: [transaction, rewardTransaction] });
                   
                   expect(blockchain.validTransctionData({ chain: newChain.chain })).toBe(false);
                   expect(errorMock).toHaveBeenCalled(); 
               });
           });
           
           describe('and the transaction data has at last one malformed input', () => {
              it('return false and logs error', () => {
                  wallet.balance = 9000;
                  
                  const evilOutputMap = {
                      [wallet.publicKey]: 8900,
                      fooRecipient: 100
                  };
                  
                  const evilTransaction = {
                      input: {
                          timestamp: Date.now(),
                          amount: wallet.balance,
                          address: wallet.publicKey,
                          signature: wallet.sign(evilOutputMap)
                      },
                      outputMap: evilOutputMap
                  }
                  
                  newChain.addBlock({ data: [evilTransaction, rewardTransaction] });
                  expect(blockchain.validTransctionData({ chain: newChain.chain })).toBe(false);
                  expect(errorMock).toHaveBeenCalled();
              });
           });
           
           describe('and a block contains multipe identidal transaction', () => {
               it('return false and logs error', () => {
                   newChain.addBlock({
                       data: [transaction, transaction, transaction, rewardTransaction]
                   });
                   
                   expect(blockchain.validTransctionData({ chain: newChain.chain })).toBe(false);
                   expect(errorMock).toHaveBeenCalled();
               })
           });
        });
    });
});

              