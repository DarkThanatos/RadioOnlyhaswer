/* ⚙️ CONFIGURACIÓN */
const STREAM_URL = "https://uk26freenew.listen2myradio.com/live.mp3?typeportmount=ice_5838_stream_53056691";
const METADATA_URL = "http://onlyhaswerradio.ddns.net:8000/status-json.xsl"; // Icecast status (HTTP)
const POLL_INTERVAL = 7000; // 7 segundos

/* 🎯 ELEMENTOS */
const playBtn = document.getElementById('playBtn');
const stationStatus = document.getElementById('stationStatus');
const listenersCount = document.getElementById('listenersCount');
const volRange = document.getElementById('volRange');
const muteBtn = document.getElementById('muteBtn');
const metaSong = document.getElementById('metaSong');
const copyBtn = document.getElementById('copyStream');

let isPlaying = false; 

/* 🎶 INICIALIZACIÓN DEL REPRODUCTOR HOWLER.JS */
const sound = new Howl({
  src: [STREAM_URL], 
  html5: true, 
  volume: parseFloat(volRange.value),
  preload: false,
  format: ['mp3'], 
  onplay: () => {
    isPlaying = true;
    playBtn.textContent = "⏸";
    stationStatus.textContent = "Reproduciendo";
  },
  onpause: () => {
    isPlaying = false;
    playBtn.textContent = "▶";
    stationStatus.textContent = "Pausado";
  },
  onloaderror: (id, error) => {
    console.error("Howler Load Error:", error);
    stationStatus.textContent = "Error: El stream no carga. (Verificar link)";
  },
});


/* ▶️ PLAY / PAUSE */
playBtn.addEventListener('click', () => {
  try {
    if (sound.playing()) {
      sound.pause();
    } else {
      if(sound.state() !== 'loaded') {
          sound.load();
          sound.once('load', () => sound.play());
      } else {
          sound.play();
      }
    }
  } catch (err) {
    console.warn("Play error:", err);
    stationStatus.textContent = "Error al reproducir.";
  }
});

/* 🎚️ VOLUMEN / MUTE */
volRange.addEventListener('input', (e)=> sound.volume(e.target.value));
muteBtn.addEventListener('click', ()=> {
  sound.mute(!sound.mute());
  muteBtn.textContent = sound.mute() ? "🔇 Silenciado" : "🔈 Silenciar";
});

/* 🔗 COPIAR LINK DEL STREAM */
copyBtn.addEventListener('click', async ()=>{
  try {
    await navigator.clipboard.writeText(STREAM_URL);
    copyBtn.textContent = "¡Copiado! ✓";
    setTimeout(()=> copyBtn.textContent = "🔗 Copiar Stream", 1600);
  } catch {
    copyBtn.textContent = "Error al Copiar";
    setTimeout(()=> copyBtn.textContent = "🔗 Copiar Stream", 1600);
  }
});


/* 📰 METADATA & LISTENERS */
async function fetchStatusJson(){
  try {
    // Usamos el endpoint HTTP para la metadata (si falla, es por HTTP/HTTPS)
    const res = await fetch(METADATA_URL, {mode:'cors'});
    if(!res.ok) throw new Error('no-ok');
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch(e){
      const jMatch = text.match(/\{[\s\S]*\}/);
      if(jMatch) json = JSON.parse(jMatch[0]);
    }
    if(json && json.icestats){
      const src = json.icestats.source;
      let mount = src;
      if(Array.isArray(src)){ mount = src.find(s => (s.listenurl && s.listenurl.includes('/stream')) || s.listenurl) || src[0]; }
      const title = (mount && (mount.title || mount.song)) || null;
      const listeners = mount && (mount.listeners || mount.currentlisteners || mount.streams);
      
      // Actualizar elementos
      if(title) metaSong.textContent = "Now Playing: " + title;
      if(listeners !== undefined) listenersCount.textContent = "Oyentes: " + listeners;
      
      return true;
    } else { throw new Error('no-json'); }
  } catch(err){ 
    console.debug("fetchStatusJson failed:", err); 
    return false; 
  }
}

async function tryFetchMetadata(){
  const ok = await fetchStatusJson();
  if(ok) return;
  
  // Fallback si el JSON falla
  metaSong.textContent = "Now Playing: Metadata no disponible 😔";
  listenersCount.textContent = "Oyentes: — (Error HTTP/HTTPS)";
}

tryFetchMetadata();
setInterval(tryFetchMetadata, POLL_INTERVAL);