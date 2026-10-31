'use client';
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
export default function Home() {
  const [socket, setSocket] = useState(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    const s = io(SOCKET_URL);
    s.on("joined", ({ code, playerId }) => { setCode(code); setPlayerId(playerId); });
    s.on("state", setRoom);
    s.on("gameError", setError);
    setSocket(s);
    return () => s.disconnect();
  }, []);

  const create = () => { setError(""); socket?.emit("createRoom", { name }); };
  const join = () => { setError(""); socket?.emit("joinRoom", { code, name }); };
  const buzz = () => socket?.emit("buzz", { code });
  const submit = () => { socket?.emit("submitAnswer", { code, answer }); setAnswer(""); };
  const start = () => socket?.emit("startGame", { code });
  const next = () => socket?.emit("nextRound", { code });
  const me = room?.players?.find(p => p.id === playerId);
  const locked = room?.buzzedBy && room.buzzedBy !== me?.name;
  const hasBuzzed = room?.buzzedBy === me?.name;

  return <main className="wrap">
    <header><div className="eyebrow">MULTIPLAYER CAR LOGO QUIZ</div><h1>LOGO <span>LEGENDS</span></h1><p>Know the badge. Beat the buzzer.</p></header>
    {!room ? <section className="panel">
      <label>Your name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter player name" maxLength={20}/>
      <div className="actions"><button onClick={create}>Create room</button><span>or</span><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="ROOM CODE" maxLength={6}/><button className="secondary" onClick={join}>Join</button></div>
      {error && <p className="error">{error}</p>}
    </section> : <>
      <section className="roombar"><div>ROOM <b>{room.code}</b></div><div>{room.players.length}/8 PLAYERS</div></section>
      <section className="panel">
        <h2>{room.status === "lobby" ? "Waiting room" : room.status === "finished" ? "Game over" : `Round ${room.round+1} / 10`}</h2>
        <div className="players">{room.players.map(p=><div className="player" key={p.id}><span>{p.name}{p.id===room.hostId?" ★":""}</span><b>{p.score}</b></div>)}</div>
        {room.status==="lobby" && <>{room.hostId===playerId ? <button onClick={start} disabled={room.players.length<2}>Start game (need 2+ players)</button>:<p>Waiting for the host to start…</p>}</>}
        {room.status==="playing" && <>
          <div className="clue"><small>LOGO CLUE</small><p>{room.question?.clue}</p></div>
          {room.answer ? <div className="result"><h3>{room.answer.exhausted?"No correct answer":room.answer.correct?`${room.answer.player} got it!`:"Incorrect — steal is open"}</h3><p>Answer: {room.answer.brand}</p>{room.hostId===playerId && <button onClick={next}>{room.round===9?"Show winner":"Next round"}</button>}</div> :
            <>{!room.buzzedBy ? <button className="buzz" onClick={buzz}>BUZZ IN</button> : <div className="buzzstate">{room.buzzedBy} buzzed first{hasBuzzed?" — enter your answer below.":" — your buzzer is locked."}</div>}
              {hasBuzzed && <div className="answer"><select value={answer} onChange={e=>setAnswer(e.target.value)}><option value="">Choose the brand…</option>{room.question?.options.map(x=><option key={x}>{x}</option>)}</select><button onClick={submit} disabled={!answer}>Submit</button></div>}
            </>}
        </>}
        {room.status==="finished" && <div className="result"><h2>🏆 { [...room.players].sort((a,b)=>b.score-a.score)[0]?.name} wins!</h2><button onClick={()=>location.reload()}>New room</button></div>}
      </section>
      {error && <p className="error">{error}</p>}
    </>}
    <footer>2–8 players · 10 rounds · 100 points per correct answer</footer>
  </main>;
}
