const Transaction = require('./transaction');
class TransactionPool {
    constructor() {
        this.transactionMap = {};
    }
    
    clear() {
        this.transactionMap = {};
    }
    setTransaction(transaction) {
        this.transactionMap[transaction.id] = transaction;
    }
    
    setMap(transactionMap) {
        this.transactionMap = transactionMap;
    }
    
    existingTransaction({ inputAddress }) {
        const transaction = Object.values(this.transactionMap);
        return transaction.find(transaction => transaction.input.address === inputAddress);
    }
    
    validTransactions() {
        return Object.values(this.transactionMap).filter(
            transaction => Transaction.validTransaction(transaction)
        );
    }
}


module.exports = TransactionPool;