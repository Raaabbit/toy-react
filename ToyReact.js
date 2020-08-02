/**
 * ElementWrapper 是一个 createElement 中使用的工具，根据参数转化为一个 DOM node
 */
class ElementWrapper {
  constructor(type) {
    this.type = type;
    this.props = Object.create(null);
    this.children = [];
  }
  get vdom() {
    return this;
  }
  setAttribute(name, val) {
    this.props[name] = val;
  }
  appendChild(vchild) {
    this.children.push(vchild)
  }
  mountTo(range) {
    this.range = range
    range.deleteContents();
    let element = document.createElement(this.type);

    for (let name in this.props) {
      let value = this.props[name];
      if (name.match(/^on([\s\S]+)$/)) {
        let eventName = RegExp.$1.replace(/^[\s\S]/, (s) => s.toLowerCase());
        element.addEventListener(eventName, value)
      }
      if (name === "className") {
        name = "class"
      }
      element.setAttribute(name, value)
    }

    for (const child of this.children) {
      let range = document.createRange();
      if (element.children.length) {
        range.setStartAfter(element.lastChild)
        range.setEndAfter(element.lastChild)
      } else {
        range.setStart(element, 0)
        range.setEnd(element, 0)
      }
      child.mountTo(range)
    }

    range.insertNode(element)
  }
}

/**
 * TextWrapper 是一个 createElement 中使用的工具，根据参数转化为一个 Text node
 */
class TextWrapper {
  constructor(text) {
    this.root = document.createTextNode(text)
    this.type = '#text'
    this.children = [];
    this.props = Object.create(null);
  }
  get vdom() {
    return this;
  }
  mountTo(range) {
    this.range = range;
    range.deleteContents();
    range.insertNode(this.root)
  }
}

/**
 * 让组件通过继承 Component 的方式，在自己的构造函数上拥有必要的方法，从而可以参与 createElement 中的解析过程
 */
export class Component {
  constructor() {
    this.children = [];
    this.props = Object.create(null);
  }
  get type() {
    return this.constructor.name
  }
  appendChild(children) {
    this.children.push(children)
  }
  // 将属性注入到实例上，我们也可以在构造方法中额外写一个props
  setAttribute(name, val) {
    this.props[name] = val
    this[name] = val
  }
  mountTo(range) {
    this.range = range
    this.update();
  }
  update() {
    let vdom = this.render && this.render();

    if (this.vdom) {
      // 更新操作
      let isSameNode = (node1, node2) => {
        if (node1.type !== node2.type) {
          return false;
        }
        for (const name in node1.props) {
          if (typeof node1.props[name] === "function"
            && typeof node2.props[name] === "function"
            && node1.props[name].toString() === node2.props[name].toString()) {
            continue;
          }
          if (typeof node1.props[name] === "object"
            && typeof node2.props[name] === "object"
            && JSON.stringify(node1.props[name]) === JSON.stringify(node2.props[name])) {
            continue;
          }
          if (node1.props[name] !== node2.props[name]) {
            return false
          }
        }
        if (Object.keys(node1.props).length !== Object.keys(node2.props).length) {
          return false
        }
        return true;
      }
      let isSameTree = (node1, node2) => {
        if (!isSameNode(node1, node2)) {
          return false;
        }
        if (node1.children.length !== node2.children.length) {
          return false;
        }
        for (let i = 0; i < node1.children.length; i++) {
          if (!isSameTree(node1.children[i], node2.children[i])) {
            return false
          }
        }
        return true
      }

      let replase = (oldTree, newTree) => {
        if (isSameTree(oldTree, newTree)) {
          return;
        }
        if (!isSameNode(oldTree, newTree)) {
          newTree.mountTo(oldTree.range)
        } else {
          for (let i = 0; i < newTree.children.length; i++) {
            replase(oldTree.children[i], newTree.children[i])
          }
        }
      }
      replase(this.vdom, vdom);
    } else {
      // 初次挂载
      vdom.mountTo(this.range)
    }
    this.vdom = vdom
  }
  setState(nextState) {
    let merge = (state, nextState) => {
      for (const key in nextState) {
        if (typeof nextState[key] === 'object' && nextState[key] !== null) {
          if (typeof state[key] !== 'object') {
            if (nextState[key] instanceof Array) {
              state[key] = []
            } else {
              state[key] = {};
            }
          }
          merge(state[key], nextState[key])
        } else {
          state[key] = nextState[key]
        }
      }
    }
    if (!this.state) {
      this.state = {}
    }
    merge(this.state, nextState)
    this.update()
  }
}

export const ToyReact = {
  createElement: (type, attrs, ...children) => {
    let element;
    // 按照 JSX 的 babel 解析规则，小写标签会被解析为字符串，而大写的标签名会被解析为一个构造函数
    // 参见 main.js 中的 FuncComponent，函数组件依然要依托于 JSX 的解析
    // console.log(type)
    if (typeof type === 'string') {
      element = new ElementWrapper(type)
    } else {
      element = new type;
    }
    for (const name in attrs) {
      if (attrs.hasOwnProperty(name)) {
        const attr = attrs[name];
        element.setAttribute(name, attr)
      }
    }
    let insertChildren = (children) => {
      for (const child of children) {
        if (typeof child === 'object' && child instanceof Array) {
          insertChildren(child)
        } else {
          if (child === null || child === void 0) {
            child = ''
          }
          // 在Toy中限制了发挥，实际上可以对更多的类型作出处理
          if (!(child instanceof Component) &&
            !(child instanceof ElementWrapper) &&
            !(child instanceof TextWrapper)) {
            child = String(child)
          }
          if (typeof child === 'string') {
            child = new TextWrapper(child)
          }
          element.appendChild(child);
        }
      }
    }
    insertChildren(children)
    return element;
  },
  render(vdom, ele) {
    let range = document.createRange();
    if (ele.children.length) {
      range.setStartAfter(ele.lastChild)
      range.setEndAfter(ele.lastChild)
    } else {
      range.setStart(ele, 0)
      range.setEnd(ele, 0)
    }
    vdom.mountTo(range)
  }
}