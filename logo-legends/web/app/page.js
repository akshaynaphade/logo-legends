"use client";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://logo-legends.onrender.com";
const marks = { Koenigsegg:"K", Pagani:"P", Genesis:"G", Rimac:"R", Spyker:"S", Isuzu:"I", Lancia:"L", Wiesmann:"W", Lucid:"L", Abarth:"A", Bugatti:"B", Maserati:"M", Bentley:"B", "Aston Martin":"AM", Lincoln:"L", Lotus:"L", Polestar:"P", Saab:"S", Morgan:"M", TVR:"T", Suzuki:"S", Daihatsu:"D", Hino:"H", "Alfa Romeo":"AR", Fiat:"F", DS:"DS", Rivian:"R", Fisker:"F", "Faraday Future":"FF", Cupra:"C", Alpine:"A" };

export default function Home() {
  const [socket,setSocket]=useState(null), [name,setName]=useState(""), [code,setCode]=useState("");
  const [room,setRoom]=useState(null), [playerId,setPlayerId]=useState(""), [error,setError]=useState(""), [answer,setAnswer]=useState("");
  useEffect(()=>{ const s=io(SOCKET_URL); s.on("joined",({code,playerId})=>{setCode(code);setPlayerId(playerId)}); s.on("state",setRoom); s.on("gameError",setError); setSocket(s); return()=>s.disconnect(); },[]);
  const create=()=>{setError("");socket?.emit("createRoom",{name})}, join=()=>{setError("");socket?.emit("joinRoom",{code,name})};
  const me=room?.players?.find(p=>p.id===playerId), alreadyAnswered=room?.answeredPlayerIds?.includes(playerId);
  const canBuzz=room?.status==="playing"&&!room.buzzedBy&&!alreadyAnswered;
  const submit=()=>{socket?.emit("submitAnswer",{code,answer});setAnswer("")};
  return <main className="shell">
    <header className="top"><div className="brandmark">LL</div><div><div className="eyebrow">MULTIPLAYER AUTOMOTIVE QUIZ</div><h1>LOGO <span>LEGENDS</span></h1></div><div className="live">● LIVE ARENA</div></header>
    {!room?<section className="glass hero"><p className="eyebrow">THE BADGE. THE BUZZER. THE BATTLE.</p><h2>Know the badge.<br/><span>Beat the buzzer.</span></h2><p className="muted">Challenge friends in a real-time car-logo showdown.</p><label>Player name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" maxLength={20}/><div className="actions"><button onClick={create}>Create room ↗</button><div className="join"><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="ROOM CODE" maxLength={6}/><button className="secondary" onClick={join}>Join</button></div></div>{error&&<p className="error">{error}</p>}</section>:<><div className="roomline"><span>ROOM <b>{room.code}</b></span><span>{room.players.length}/8 PLAYERS</span><span>ROUND {Math.min(room.round+1,10)} / 10</span></div><div className="layout"><section className="glass game">
      <div className="gamehead"><span className="eyebrow">{room.status==="lobby"?"WAITING ROOM":room.status==="finished"?"FINAL RESULTS":"IDENTIFY THE MARQUE"}</span><span className="pill">+100 PTS</span></div>
      {room.status==="lobby"?<><h2>Players assemble.</h2><p className="muted">Share the room code, then start the battle.</p>{room.hostId===playerId?<button onClick={()=>socket?.emit("startGame",{code})} disabled={room.players.length<2}>Start game · need 2+ players</button>:<p className="muted">Waiting for host to start…</p>}</>:room.status==="playing"?<>
        <div className="cluebox"><div className="eyebrow">CLUE {room.round+1}</div><p>{room.question?.clue}</p></div>
        {room.answer?<div className="result"><h2>{room.answer.exhausted?"Round exhausted":room.answer.correct?`${room.answer.player} got it!`:"Nope — next player!"}</h2><p>Answer: <b>{room.answer.brand}</b></p>{room.hostId===playerId&&<button onClick={()=>socket?.emit("nextRound",{code})}>{room.round===9?"Finish game":"Next round →"}</button>}</div>:<>
          <div className="answers">{room.question?.options.map(opt=><button key={opt} className="answerTile" disabled={!canBuzz||room.buzzedBy!==playerId} onClick={()=>{setAnswer(opt);socket?.emit("submitAnswer",{code,answer:opt})}}><span className="logoMark">{marks[opt]||opt.slice(0,2)}</span><span>{opt}</span></button>)}</div>
          <button className={`buzz ${canBuzz?"ready":"locked"}`} disabled={!canBuzz} onClick={()=>socket?.emit("buzz",{code})}>{alreadyAnswered?"LOCKED FOR THIS ROUND":room.buzzedBy?`${room.buzzedBy} HAS THE BUZZ`:"BUZZ IN"}</button>
          {room.buzzedById===playerId&&<p className="muted">Choose the brand logo and name above.</p>}
        </>}
      </>:<div className="result"><h2>🏆 { [...room.players].sort((a,b)=>b.score-a.score)[0]?.name} wins!</h2><button onClick={()=>location.reload()}>New room</button></div>}
    </section><aside className="glass sidebar"><div className="gamehead"><h3>Leaderboard</h3><span className="pill">LIVE</span></div>{[...room.players].sort((a,b)=>b.score-a.score).map((p,i)=><div className="player" key={p.id}><span><i>{String(i+1).padStart(2,"0")}</i>{p.name}{p.id===room.hostId?" ★":""}</span><b>{p.score}</b></div>)}<div className="tip"><b>Fair-play rule</b><p>One attempt per player each round. A wrong answer locks that player out; the others can steal.</p></div></aside></div>{error&&<p className="error">{error}</p>}</>}
    <footer>2–8 PLAYERS <span>•</span> 10 ROUNDS <span>•</span> REAL-TIME BATTLE</footer>
  </main>;
}
