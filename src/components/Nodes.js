import React from 'react'
import { db } from 'redaxe'
import { selectNode, switchTab } from '../updaters/nodeDetails'
import Blockies from './Blockies'
import classNames from 'classnames'

const handleSelectNode = (event, data) => {
  switchTab('nodeDetails')
  selectNode(data)
  event.stopPropagation()
}

const isSelected = (selected, name) => {
  let query = new RegExp(name);
  return selected.match(query) ? true : false
}

const Node = ({ data }) => {
  let childNodes = null
  let selected = isSelected(db.get('selectedNode'),data.get('name'))
  let classes = classNames({
    node: true,
    selected
  })
  if(selected) {
    childNodes = <div className="child-nodes">
      {data.get('nodes').size > 0 ? data.get('nodes').map(node => <Node key={node.get('labelHash') + name} data={node} />) : ''}
    </div>
  }

  return <div className={classes}>
    <div onClick={(e) => handleSelectNode(e, data.get('name'))} className="node-details"><Blockies className="node-blockies" imageSize={25} address={data.get('owner')} /> {data.get('name')}</div>
    {childNodes}
  </div>
}


const Nodes = () => (
  <div className="nodes-root">
    <div className="nodes-inner">
      {db.get('nodes').map(node => <Node key={node.get('name')} data={node} />)}
    </div>
  </div>
)

export default Nodes
