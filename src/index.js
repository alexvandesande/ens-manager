import app from './App';
import './css/main.css';
import ENS from 'ethereum-ens'
import {
  getAddr,
  namehash
} from './lib/ensutils'
import web3 from './lib/web3'
import './api/preimage'

//const ens = new ENS(web3)

//var resolver = ens.resolver('bitcoin.eth')
//
// console.log('resolver', resolver)
// console.log('name', resolver.node)
// console.log('ens', resolver.ens)
// resolver.addr().then(console.log)

//var address = ens.resolver('jefflau.test')//.addr().then(function(addr) { console.log(addr) });
// console.log(address)
// console.log(getAddr('jefflau.test'))

// console.log(fifsRegistrarContract.at(ens.resolver(namehash('ethereum.test'))).address)
// console.log(resolverContract.at(ens.resolver(namehash('bitcoin.eth'))).addr(namehash('bitcoin.eth')));


app.render()
