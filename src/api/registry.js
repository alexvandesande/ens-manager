import getENS, { getNamehash, getENSEvent, getReverseRegistrarContract } from './ens'
import { fromJS } from 'immutable'
import { decryptHashes } from './preimage'
import { uniq, ensStartBlock } from '../lib/utils'
import getWeb3 from '../api/web3'

export async function claimReverseRecord(resolver){
  let { reverseRegistrar, web3 } = await getReverseRegistrarContract()
  return new Promise((resolve, reject) => {
    reverseRegistrar.claimWithResolver(web3.eth.accounts[0], resolver, { from: web3.eth.accounts[0] }, function(err, txId){
      if(err)
        reject(err)
      resolve(txId)
    })
  })
}

export async function setReverseRecordName(name){
  let { reverseRegistrar, web3 } = await getReverseRegistrarContract()
  return new Promise((resolve, reject) => {
    reverseRegistrar.setName(name, { from: web3.eth.accounts[0]}, function(err, txId){
      if(err)
        reject(err)
      resolve(txId)
    })
  })
}

export async function getOwner(name) {
  let { ENS , web3} = await getENS()
  return ENS.owner(name)
}

export async function getResolver(name){
  let { ENS, web3 } = await getENS()
  let node = await getNamehash(name)
  let registry = await ENS.registryPromise
  return registry.resolverAsync(node)
}

export async function getAddr(name){
  let { ENS } = await getENS()
  let resolver = await ENS.resolver(name)
  return resolver.addr()
}

export async function getName(address){
  let { ENS } = await getENS()
  let reverseResolver = await ENS.reverse(address)
  let resolverAddr = await reverseResolver.resolverAddress()
  let name = await reverseResolver.name()
  return {
    name,
    resolverAddr
  }
}

export async function getContent(name){
  let { ENS } = await getENS()
  let resolver = await ENS.resolver(name)
  return resolver.content()
}

export async function setAddr(name, address){
  let { ENS, web3 } = await getENS()
  let resolver = await ENS.resolver(name)
  return resolver.setAddr(address, { from: web3.eth.accounts[0]})
}

export async function setContent(name, content){
  let { ENS, web3 } = await getENS()
  let resolver = await ENS.resolver(name)
  return resolver.setContent(content, { from: web3.eth.accounts[0]})
}

export async function setResolver(name, resolver) {
  let { ENS, web3 } = await getENS()
  return ENS.setResolver(name, resolver, {from: web3.eth.accounts[0]})
}

export async function checkSubDomain(subDomain, domain) {
  let { ENS } = await getENS()
  return ENS.owner(subDomain + '.' + domain)
}

export async function buildSubDomain(label, node, owner) {
  let { web3 } = await getWeb3()
  let labelHash = web3.sha3(label)
  let resolver = await getResolver(label + '.' +  node)
  let subDomain = {
    resolver,
    labelHash,
    owner,
    label,
    node,
    name: label + '.' + node
  }
  console.log(subDomain)
  if(parseInt(resolver, 16) === 0) {
    return subDomain
  } else {
    let resolverAndNode = await getResolverDetails(subDomain)
    return resolverAndNode
  }
}

export async function createSubDomain(subDomain, domain) {
  let { ENS, web3 } = await getENS()
  let node = await getNamehash(domain)
  let registry = await ENS.registryPromise
  let txId = await registry.setSubnodeOwnerAsync(node, web3.sha3(subDomain), web3.eth.accounts[0], {from: web3.eth.accounts[0]});
  return { txId, owner: web3.eth.accounts[0]}
}

export async function deleteSubDomain(subDomain, domain){
  let { ENS, web3 } = await getENS()
  let name = subDomain + '.' + domain
  let node = await getNamehash(domain)
  let registry = await ENS.registryPromise
  let resolver = await getResolver(name)
  if(parseInt(resolver, 16) !== 0){
    await setSubnodeOwner(subDomain, domain, web3.eth.accounts[0])
    await setResolver(name, 0)
  }
  return registry.setSubnodeOwnerAsync(node, web3.sha3(subDomain), 0, {from: web3.eth.accounts[0]});
}

export async function setNewOwner(name, newOwner) {
  let { ENS, web3 } = await getENS()
  return ENS.setOwner(name, newOwner, {from: web3.eth.accounts[0]})
}

export async function setSubnodeOwner(label, node, newOwner) {
  console.log('setting subnode to ', newOwner)
  let { ENS, web3 } = await getENS()
  let owner = await ENS.owner(node)
  return ENS.setSubnodeOwner(label + '.' + node, newOwner, {from: web3.eth.accounts[0]})
}

export function getResolverDetails(node){
  let addr = getAddr(node.name)
  let content = getContent(node.name)
  return Promise.all([addr, content]).then(([addr, content]) => ({
    ...node,
    addr,
    content
  }))
}

export function getRootDomain(name){
  return Promise.all([getOwner(name), getResolver(name)])
    .then(([owner, resolver]) => ({
        name,
        label: name.split('.')[0],
        owner,
        resolver,
        nodes: []
      })
    ).then(node => {
      let hasResolver = parseInt(node.resolver, 16) !== 0
      if(hasResolver) {
        return getResolverDetails(node)
      }
      return Promise.resolve(node)
    })
}

export const getSubdomains = async name => {
  let startBlock = await ensStartBlock()
  let namehash = await getNamehash(name)
  let rawLogs = await getENSEvent('NewOwner', {node: namehash}, {fromBlock: startBlock, toBlock: 'latest'})
  let flattenedLogs = rawLogs.map(log => log.args)
  flattenedLogs.reverse()
  let logs = uniq(flattenedLogs, 'label').filter(node => parseInt(node.owner, 16) !== 0)
  let labels = await decryptHashes(...logs.map(log => log.label))
  let ownerPromises = labels.map(label => getOwner(`${label}.${name}`))
  let resolverPromises = labels.map(label => getResolver(`${label}.${name}`))

  return Promise.all([
    Promise.all(ownerPromises),
    Promise.all(resolverPromises)
  ]).then(([owners, resolvers, addr, content]) => {
    /* Maps owner and resolver onto nodes */
    return logs.map((log, index) => {
      let label
      let owner
      let decrypted

      if(labels[index] === null) {
        label = 'unknown' + logs[index].label.slice(-6)
        owner = log.owner
        decrypted = false
      } else {
        label = labels[index]
        owner = owners[index]
        decrypted = true
      }

      return {
        decrypted,
        label,
        owner,
        labelHash: logs[index].label,
        node: name,
        name: label + '.' + name,
        resolver: resolvers[index],
        nodes: []
      }
    })
  }).then(nodes => {
    /* Gets Resolver information for node if they have a resolver */
    let nodePromises = nodes.map(node => {
      let hasResolver = parseInt(node.resolver, 16) !== 0
      if(hasResolver) {
        return getResolverDetails(node)
      }
      return Promise.resolve(node)
    })
    return Promise.all(nodePromises)
  })
}
