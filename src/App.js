import React, { useEffect, useState, useRef } from "react";

const TOTAL_NUMBERS = 10;
const INITIAL_TIME = 30;
const TOTAL_LIVES = 3;
const TIMER_DECREASE_PER_LEVEL = 3;
const MAX_LEADERBOARD = 5;

// Predefined Roman numerals 1 → 10
function toRoman(num) {
  const map = {
    1: "I",
    2: "II",
    3: "III",
    4: "IV",
    5: "V",
    6: "VI",
    7: "VII",
    8: "VIII",
    9: "IX",
    10: "X"
  };
  return map[num] || num;
}

// Generate grid positions based on screen width
function getGridPositions() {
  const isMobile = window.innerWidth < 600;
  const cols = 5;
  const rows = isMobile ? 4 : 2; // 4 rows for mobile, 2 for desktop
  const cellWidth = 100 / cols;
  const cellHeight = 100 / rows;

  let positions = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      positions.push({
        top: `${row * cellHeight + cellHeight / 5}%`,
        left: `${col * cellWidth + cellWidth / 10}%`
      });
    }
  }
  return positions.sort(() => Math.random() - 0.5);
}

export default function App() {
  const [numbers, setNumbers] = useState([]);
  const [positions, setPositions] = useState([]);
  const [current, setCurrent] = useState(1);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [lives, setLives] = useState(TOTAL_LIVES);
  const [gameOver, setGameOver] = useState(false);
  const [fading, setFading] = useState(null);
  const [shaking, setShaking] = useState(null);
  const [flash, setFlash] = useState(false);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [bestScore, setBestScore] = useState(0); // new best score state

  // Audio refs
  const successSound = useRef(null);
  const errorSound = useRef(null);
  const levelCompleteSound = useRef(null);

  useEffect(() => {
    const savedBoard = JSON.parse(localStorage.getItem("leaderboard")) || [];
    setLeaderboard(savedBoard);

    // Update best score from leaderboard
    if (savedBoard.length > 0) {
      setBestScore(savedBoard[0].score);
    }

    startLevel(1, INITIAL_TIME);

    // Load audio from public folder
    successSound.current = new Audio("/sounds/success.mp3");
    errorSound.current = new Audio("/sounds/error.mp3");
    levelCompleteSound.current = new Audio("/sounds/level-complete.mp3");
  }, []);

  const startLevel = (lvl, timer) => {
    const nums = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1);
    setNumbers(nums.sort(() => Math.random() - 0.5));
    setPositions(getGridPositions());
    setCurrent(1);
    setTimeLeft(timer);
    setLives(TOTAL_LIVES);
    setGameOver(false);
    setFading(null);
    setShaking(null);
    setFlash(false);
    setLevel(lvl);
  };

  useEffect(() => {
    if (timeLeft <= 0 || lives <= 0) {
      endGame();
      return;
    }
    if (!gameOver) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, lives, gameOver]);

  const updateLeaderboard = (finalScore) => {
    if (finalScore === 0) return;
    let updated = [
      ...leaderboard,
      { score: finalScore, date: new Date().toLocaleString() }
    ];
    // Remove exact duplicates
    updated = updated.filter(
      (v, i, a) => i === a.findIndex((t) => t.score === v.score && t.date === v.date)
    );
    updated.sort((a, b) => b.score - a.score);
    if (updated.length > MAX_LEADERBOARD) updated = updated.slice(0, MAX_LEADERBOARD);
    setLeaderboard(updated);
    localStorage.setItem("leaderboard", JSON.stringify(updated));

    // Update best score if needed
    if (updated.length > 0) setBestScore(updated[0].score);
  };

  const endGame = () => {
    setGameOver(true);
    updateLeaderboard(score);
  };

  const handleClick = (num) => {
    if (gameOver) return;

    if (num === current) {
      successSound.current.play();
      setFading(num);
      setScore((prev) => prev + 1);

      setTimeout(() => {
        setNumbers((prev) => prev.filter((n) => n !== num));
        setCurrent((prev) => prev + 1);
        setFading(null);

        if (num === TOTAL_NUMBERS) {
          // Level complete sound
          levelCompleteSound.current.play();

          const nextLevel = level + 1;
          const nextTime = Math.max(
            INITIAL_TIME - (nextLevel - 1) * TIMER_DECREASE_PER_LEVEL,
            5
          );

          setTimeout(() => {
            startLevel(nextLevel, nextTime);
          }, 500);
        }
      }, 400);
    } else {
      errorSound.current.play();
      setShaking(num);
      setLives((prev) => prev - 1);
      setFlash(true);
      setTimeout(() => {
        setShaking(null);
        setFlash(false);
      }, 400);
    }
  };

  const restartGame = () => {
    setScore(0);
    startLevel(1, INITIAL_TIME);
  };

  const isMobile = window.innerWidth < 600;
  const numberSize = isMobile ? "45px" : "60px";
  const fontSize = isMobile ? "18px" : "20px";

  return (
    <div style={{ ...styles.container, backgroundColor: flash ? "#ff4b4b" : "" }}>
      <style>{shakeAnimation}</style>
      <h1 style={styles.title}>🎮 Number Order Game</h1>

      {/* Best Score displayed at top */}
      <h2 style={{ marginBottom: "15px" }}>🏆 Best Score: {bestScore}</h2>

      <div style={styles.info}>
        <span>⏰ {timeLeft}s</span>
        <span>❤️ {lives}</span>
        <span>Level: {level}</span>
        <span>Score: {score}</span>
      </div>

      <div style={styles.gameArea}>
        {!gameOver &&
          numbers.map((num, index) => (
            <button
              key={num}
              onClick={() => handleClick(num)}
              className={shaking === num ? "shake" : ""}
              style={{
                ...styles.numberButton,
                top: positions[index]?.top,
                left: positions[index]?.left,
                width: numberSize,
                height: numberSize,
                fontSize: fontSize,
                opacity: fading === num ? 0 : 1,
                transform: fading === num ? "scale(0.5)" : "scale(1)",
                transition: "all 0.4s ease"
              }}
            >
              {level >= 3 ? toRoman(num) : num}
            </button>
          ))}
      </div>

      {gameOver && (
        <div>
          <h2>{lives <= 0 ? "💀 No Lives Left!" : "⏰ Time's Up!"}</h2>
          <h3>Score: {score}</h3>
          <button style={styles.restartButton} onClick={restartGame}>
            Restart Game
          </button>

          <h2 style={{ marginTop: "20px" }}>🏆 High Score Leaderboard</h2>
          <ol style={{ textAlign: "left", maxWidth: "300px", margin: "10px auto" }}>
            {leaderboard.map((entry, index) => (
              <li key={index}>
                {entry.score} pts - <small>{entry.date}</small>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

const shakeAnimation = `
@keyframes shake {
  0% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-8px); }
  80% { transform: translateX(8px); }
  100% { transform: translateX(0); }
}

.shake {
  animation: shake 0.4s;
}
`;

const styles = {
  container: {
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    minHeight: "100vh",
    padding: "20px",
    color: "white",
    transition: "background-color 0.2s ease"
  },
  title: { fontSize: "32px", marginBottom: "10px" },
  info: {
    display: "flex",
    justifyContent: "space-around",
    fontSize: "18px",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "10px"
  },
  gameArea: {
    position: "relative",
    height: "400px",
    width: "80%",
    margin: "0 auto",
    backgroundColor: "white",
    borderRadius: "15px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
    overflow: "hidden"
  },
  numberButton: {
    position: "absolute",
    borderRadius: "50%",
    border: "none",
    fontWeight: "bold",
    color: "white",
    background: "linear-gradient(45deg, #ff416c, #ff4b2b)",
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
  },
  restartButton: {
    padding: "10px 20px",
    fontSize: "18px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    background: "#00c9ff",
    color: "white",
    marginTop: "15px"
  }
};
