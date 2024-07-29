import React, { useState, useEffect } from 'react';

const LEADERBOARD_KEY = 'navigationGameLeaderboard';

const Result = ({ gameSettings, gameResult }) => {
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const storedLeaderboard = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');

    const newEntry = {
      name: gameSettings.playerName,
      age: gameSettings.playerAge,
      gender: gameSettings.playerGender,
      time: gameResult.time,
      Residence: gameSettings.playerResidence,
      Education: gameSettings.playerEducation,
      map: gameSettings.mapChoice,
      language: gameSettings.playerLanguage,
      errors: gameResult.errors,
      score: gameResult.time + (gameResult.errors * 10)
    };

    // Check if the player already exists in the leaderboard
    const existingPlayerIndex = storedLeaderboard.findIndex(
      player => player.name === newEntry.name
    );

    let updatedLeaderboard;
    if (existingPlayerIndex !== -1) {
      // If the player exists, update their score if the new score is better
      if (newEntry.score < storedLeaderboard[existingPlayerIndex].score) {
        updatedLeaderboard = [
          ...storedLeaderboard.slice(0, existingPlayerIndex),
          newEntry,
          ...storedLeaderboard.slice(existingPlayerIndex + 1)
        ];
      } else {
        updatedLeaderboard = storedLeaderboard;
      }
    } else {
      // If the player doesn't exist, add them to the leaderboard
      updatedLeaderboard = [...storedLeaderboard, newEntry];
    }

    // Sort and limit to top 10
    updatedLeaderboard = updatedLeaderboard
      .sort((a, b) => a.score - b.score)
      .slice(0, 10);

    setLeaderboard(updatedLeaderboard);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updatedLeaderboard));
  }, [gameSettings, gameResult]);

  const downloadLeaderboard = () => {
    let csv = 'Rank,Name,Age,Gender,Time,Residence,Education,MapChoice,Language,Error,Score\n';
    leaderboard.forEach((player, index) => {
      csv += `${index + 1},${player.name},${player.age},${player.gender},${player.time},${player.Residence},${player.Education},${player.map},${player.language},${player.errors},${player.score}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'leaderboard.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="result-container">
      <h2>Game Results</h2>
      <div className="player-result">
        <p>Time Taken: {gameResult.time} seconds</p>
        <p>Errors: {gameResult.errors}</p>
        <p>Score: {gameResult.time + (gameResult.errors * 10)}</p>
      </div>
      <div className="leaderboard">
        <h3>Leaderboard</h3>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Time</th>
              <th>Errors</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((player, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{player.name}</td>
                <td>{player.time}s</td>
                <td>{player.errors}</td>
                <td>{player.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={downloadLeaderboard}>Download Leaderboard</button>
      </div>
    </div>
  );
};

export default Result;