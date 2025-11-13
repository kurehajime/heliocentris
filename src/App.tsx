import './App.css'

import { GameElement } from './components/GameElement'

function App() {
  return (
    <main className="app-root">
      <header>
        <h1>Heliocentris</h1>
        <p>地面を動かしてブロックを受け止める新感覚テトリス(仮)</p>
      </header>
      <GameElement />
    </main>
  )
}

export default App
