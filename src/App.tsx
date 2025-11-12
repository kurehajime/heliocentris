import './App.css'
import GameElement from './components/GameElement'

const App = () => (
  <div className="app-shell">
    <header>
      <h1>地動説テトリス</h1>
      <p>フェイズ3: 主要コンポーネントの仮実装</p>
    </header>
    <main>
      <GameElement />
    </main>
  </div>
)

export default App
