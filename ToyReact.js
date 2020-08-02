/**
 * ElementWrapper 是一个 createElement 中使用的工具，根据参数转化为一个 DOM node
 */
class ElementWrapper {
  constructor(type) {
    this.root = document.createElement(type)
  }
  setAttribute(name, val) {
    if (name.match(/^on([\s\S]+)$/)) {
      let eventName = RegExp.$1.replace(/^[\s\S]/, (s) => s.toLowerCase());
      this.root.addEventListener(eventName, val)
    }
    if (name === "className") {
      name = "class"
    }
    this.root.setAttribute(name, val)
  }
  appendChild(child) {
    let range = document.createRange();
    if (this.root.children.length) {
      range.setStartAfter(this.root.lastChild)
      range.setEndAfter(this.root.lastChild)
    } else {
      range.setStart(this.root, 0)
      range.setEnd(this.root, 0)
    }
    child.mountTo(range)
  }
  mountTo(range) {
    range.deleteContents();
    range.insertNode(this.root)
  }
}

/**
 * TextWrapper 是一个 createElement 中使用的工具，根据参数转化为一个 Text node
 */
class TextWrapper {
  constructor(text) {
    this.root = document.createTextNode(text)
  }
  mountTo(range) { 
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
    // 需要的一切都可以在构造方法中拓展
    // this.props = {}
    // 这样创建会少一些默认方法，尽量纯洁
    this.props = Object.create(null);
  }
  appendChild(children) {
    this.children.push(children)
  }
  // 将属性注入到实例上，我们也可以在构造方法中额外写一个props
  setAttribute(name, val) {
    this.props[name] = val
  }
  mountTo(range) {
    this.range = range
    this.update();
  }
  update() {
    let placeholder = document.createComment('temp')
    let range = document.createRange()
    range.setStart(this.range.endContainer, this.range.endOffset);
    range.setEnd(this.range.endContainer, this.range.endOffset);
    range.insertNode(placeholder)
    this.range.deleteContents();

    let vdom = this.render && this.render();
    vdom.mountTo(this.range)
  }
  setState(nextState) {
    let merge = (state, nextState) => {
      for (const key in nextState) {
        if (typeof nextState[key] === 'object') {
          if (typeof nextState[key] !== 'object') {
            state[key] = {}
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
          // 在Toy中限制了发挥，实际上可以对更多的类型作出处理
          if (!(child instanceof Component) &&
            !(child instanceof ElementWrapper)&&
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