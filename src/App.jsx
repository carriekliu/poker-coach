import { useState } from 'react';
import { SetupScreen } from './screens/SetupScreen.jsx';
import { TableScreen } from './screens/TableScreen.jsx';
import { IntroFlow } from './screens/IntroFlow.jsx';
import { HandRankingsTrigger } from './components/HandRankings.jsx';

const INTRO_KEY = 'pokerCoach.introComplete';

function App() {
  const [introComplete, setIntroComplete] = useState(
    () => localStorage.getItem(INTRO_KEY) === '1'
  );
  const [gameConfig, setGameConfig] = useState(null);
  const [boardCards, setBoardCards] = useState([]);

  function completeIntro() {
    localStorage.setItem(INTRO_KEY, '1');
    setIntroComplete(true);
  }

  function reopenIntro() {
    setIntroComplete(false);
  }

  if (!introComplete) {
    return <IntroFlow onComplete={completeIntro} />;
  }

  return (
    <>
      {!gameConfig ? (
        <SetupScreen
          onStart={(cfg) => { setGameConfig(cfg); setBoardCards([]); }}
          onShowIntro={reopenIntro}
        />
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
