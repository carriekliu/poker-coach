import { useState } from 'react';
import { SetupScreen } from './screens/SetupScreen.jsx';
import { HandRankingsTrigger } from './components/HandRankings.jsx';

function App() {
  const [gameConfig, setGameConfig] = useState(null);
  // board will be an array of card integers once the game screen is built.
  // Passing undefined here means the rankings sheet shows all hands as reachable.
  const [board] = useState(null);

  return (
    <>
      {!gameConfig ? (
        <SetupScreen onStart={setGameConfig} />
      ) : (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>
            {gameConfig.players} players · {gameConfig.smallBlind}/{gameConfig.bigBlind} blinds ·{' '}
            {gameConfig.startingStack.toLocaleString()} starting stack
          </p>
          <button onClick={() => setGameConfig(null)}>← Back to setup</button>
        </div>
      )}
      <HandRankingsTrigger board={board} />
    </>
  );
}

export default App;
