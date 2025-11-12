import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

export default function Controller() {
  const [dragging, setDragging] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 40, y: 40 });

  function moveJoystick(x, y) {
    const max = 50;
    const dx = x - 75;
    const dy = y - 75;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let newX = 50;
    let newY = 50;

    if (dist > max) {
      newX = 50 + (dx / dist) * max;
      newY = 50 + (dy / dist) * max;
    } else {
      newX = dx + 50;
      newY = dy + 50;
    }

    setJoystickPos({ x: newX, y: newY });
    console.log('Joystick move:', { dx, dy });
  }

  function resetJoystick() {
    setJoystickPos({ x: 40, y: 40 });
    console.log('Joystick released');
  }

  function handleDpadClick(direction) {
    console.log('D-pad:', direction);
    vibrate();
  }

  function handleButtonClick(button) {
    console.log('Button pressed:', button);
    vibrate();
  }

  function vibrate() {
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  }

  function showInputPopup() {
    const value = prompt('Enter input:');
    if (value) {
      console.log('Input submitted:', value);
    }
  }

  function showChoicePopup(choices) {
    const choice = prompt(`Choose one:\n${choices.join('\n')}`);
    if (choice) {
      console.log('Choice made:', choice);
    }
  }

  return (
    <Layout 
      title="Game Controller"
      description="Use your mobile device as a game controller for BuddyBox.tv party games. Virtual joystick, buttons, and D-pad controls."
      url="/controller"
      noindex={true}
    >
      <div className="controller-page">
        <h1>Game Controller</h1>
        
        <div className="controller">
          <div className="section">
            <div className="joystick-container">
              <div 
                className="joystick" 
                style={{ left: `${joystickPos.x}px`, top: `${joystickPos.y}px` }}
                onMouseDown={() => setDragging(true)}
                onTouchStart={() => setDragging(true)}
              />
            </div>
          </div>

          <div className="section">
            <div className="dpad">
              <div></div>
              <button onClick={() => handleDpadClick('up')}>↑</button>
              <div></div>
              <button onClick={() => handleDpadClick('left')}>←</button>
              <div></div>
              <button onClick={() => handleDpadClick('right')}>→</button>
              <div></div>
              <button onClick={() => handleDpadClick('down')}>↓</button>
              <div></div>
            </div>
          </div>

          <div className="section">
            <div className="buttons">
              <button className="btn-Y" onClick={() => handleButtonClick('Y')}>Y</button>
              <button className="btn-X" onClick={() => handleButtonClick('X')}>X</button>
              <button className="btn-B" onClick={() => handleButtonClick('B')}>B</button>
              <button className="btn-A" onClick={() => handleButtonClick('A')}>A</button>
            </div>
          </div>
        </div>

        <div className="utility-buttons">
          <button onClick={showInputPopup}>Input</button>
          <button onClick={() => showChoicePopup(['Attack', 'Defend', 'Run'])}>Choices</button>
        </div>
      </div>

      <style jsx>{`
        .controller-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #1a1a1a;
          color: white;
          padding: 20px;
        }

        h1 {
          color: white;
          margin-bottom: 40px;
        }

        .controller {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-around;
          max-width: 90%;
          max-height: 90%;
          flex-wrap: wrap;
          gap: 20px;
        }

        .section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
        }

        .joystick-container {
          position: relative;
          width: 150px;
          height: 150px;
          background: #222;
          border-radius: 50%;
          border: 2px solid #555;
        }

        .joystick {
          position: absolute;
          width: 70px;
          height: 70px;
          background: #888;
          border-radius: 50%;
          cursor: move;
        }

        .dpad {
          display: grid;
          gap: 10px;
          grid-template-columns: 60px 60px 60px;
          grid-template-rows: 60px 60px 60px;
        }

        .dpad button {
          width: 60px;
          height: 60px;
          background: #333;
          color: white;
          font-size: 24px;
          border: 2px solid #888;
          border-radius: 8px;
          cursor: pointer;
        }

        .buttons {
          display: grid;
          grid-template-areas: 
            ".    Y    ."
            "X    .    B"
            ".    A    .";
          grid-template-columns: 60px 60px 60px;
          grid-template-rows: 60px 60px 60px;
          gap: 10px;
        }

        .buttons button {
          width: 60px;
          height: 60px;
          background: #444;
          color: white;
          font-size: 22px;
          border-radius: 50%;
          border: 2px solid #aaa;
          cursor: pointer;
        }

        .btn-X { grid-area: X; }
        .btn-Y { grid-area: Y; }
        .btn-B { grid-area: B; }
        .btn-A { grid-area: A; }

        .utility-buttons {
          display: flex;
          gap: 10px;
          margin-top: 40px;
        }

        .utility-buttons button {
          padding: 10px 20px;
          font-size: 16px;
          background: #333;
          color: white;
          border: 2px solid #666;
          border-radius: 8px;
          cursor: pointer;
        }

        button:hover {
          background: #555;
        }

        button:active {
          background: #667eea;
        }
      `}</style>
    </Layout>
  );
}

