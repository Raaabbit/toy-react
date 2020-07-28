import { ToyReact, Component } from './ToyReact'

class TestComponent extends Component{
  render() {
  return <span style={this.props.style}>{this.children}</span>
  }
}

const FucnComponent = (props, children) => (<div {...props}>{children || ''}</div>)

let a = (<div>
  <TestComponent style="color: red;">
    <div>1</div>
    <div>2</div>
    <div>3</div>
    <FucnComponent style="color: blue;">
      hello
    </FucnComponent>
  </TestComponent>
</div>)

ToyReact.render(a, document.body)