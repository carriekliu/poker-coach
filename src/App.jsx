import { useState } from 'react';
import { SetupScreen } from './screens/SetupScreen.jsx';
import { TableScreen } from './screens/TableScreen.jsx';
import { HandRankingsTrigger } from './components/HandRankings.jsx';

function App() {
  const [gameConfig, setGameConfig] = useState(null);
  const [boardCards, setBoardCards] = useState([]);

  return (
    <>
      {!gameConfig ? (
        <SetupScreen onStart={(cfg) => { setGameConfig(cfg); setBoardCards([]); }} />
      ) : (
        <TableScreen
          config={gameConfig}
          onBack={() => setGameConfig(null)}
        />
      )}
      {/* Hand rankings trigger sits above all screens; board prop enables impossible-hand greying */}
      <HandRankingsTrigger board={boardCards} />
    </>
  );
}

export default App;
