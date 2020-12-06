import React, { Component } from 'react';

class App extends Component {
    state = { walletInfo: { address: 'footv64', balance: 999 }};
    componentDidMount() {
        fetch('http://localhost:3000/api/wallet-info')
          .then(response => response.json())
          .then(data => console.log(data));
    };
    render() {
        const { address, balance } = this.state.walletInfo;
        return (
            <div>
                <div>
                    welcome to the Blockchain ...
                </div>
                <div>Address:{address}</div>
                <div>Balance:{balance}</div>
            </div>
        );
    }
}

export default App;