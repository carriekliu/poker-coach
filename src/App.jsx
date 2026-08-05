import { useState } from 'react';
import { SetupScreen } from './screens/SetupScreen.jsx';

function App() {
  const [gameConfig, setGameConfig] = useState(null);

  if (!gameConfig) {
    return <SetupScreen onStart={setGameConfig} />;
  }

  // Placeholder — next screen will go here.
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>
        {gameConfig.players} players · {gameConfig.smallBlind}/{gameConfig.bigBlind} blinds ·{' '}
        {gameConfig.startingStack.toLocaleString()} starting stack
      </p>
      <button onClick={() => setGameConfig(null)}>← Back to setup</button>
    </div>
  );
}

export default App;
