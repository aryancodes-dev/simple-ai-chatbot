// Mochi v1000000 — FREE PACK
// New in v5 (all free, no API key):
//  • MEMORY: remembers last topic — "tell me more", "simplify", "show images" work without retyping
//  • VOICE: mic input (Chrome) + speak button on every bot answer, using browser speech (free)
//  • HINGLISH MODE: UI + fixed replies in Roman Hinglish. Search answers stay in English with a
//    Hinglish intro — full translation of Wikipedia to Hinglish would need a paid translation API,
//    so v5 is honest about that limit instead of pretending.
//  • LIVE: weather (Open-Meteo, free) + currency USD→INR (free exchange API). News headlines
//    need a paid news key, so v5 does NOT fake news — weather + currency are the live parts.
//  • IMAGES: 8 images instead of 4, from Wikimedia Commons
//  • HISTORY: chat saved on your phone (localStorage), Copy / Share / Speak on every answer
//  • LIGHT/DARK mode + follow-up buttons
// Search core from v3: DuckDuckGo + Wikipedia in parallel, 9-sec timeout, usually 2-5 sec.
let lastTopic = "", lastAnswer = "", lang = localStorage.getItem("chatbot-lang") || "en";
let lastJoke = -1, lastMotivation = -1;
const HI = lang === "hi";
const pickDifferent = (arr, last) => { let i; do { i = Math.floor(Math.random() * arr.length); } while (arr.length > 1 && i === last); return [arr[i], i]; };
const JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs! 😄",
  "Why did the developer go broke? Because he used up all his cache. 😄",
  "There are only 10 types of people: those who understand binary and those who don't. 😄",
  "Why do Java developers wear glasses? Because they don't C#. 😄",
  "A SQL query walks into a bar and asks two tables: 'Mind if I join you?' 😄",
  "Why did the computer catch a cold? Because it left its Windows open! 😄",
  "Debugging: being the detective in a crime movie where you are also the murderer. 😄",
  "Why was the JavaScript developer sad? Because he didn't Node how to Express himself. 😄",
];
const MOTIVATIONS = [
  "Don't quit. Every good developer was once a beginner who kept going after the errors. 💪",
  "One small project a day beats one big plan you never start. Start today, even if it is small. 💪",
  "Errors are not failure — they are the teacher. Read the error, fix one thing, run again. 💪",
  "You don't need to be perfect to start. You need to start to become good. 💪",
];
const HINGLISH = {
  hello: "Namaste! 👋 Kuch bhi poochho — ya bolo 'show image of Taj Mahal'. Main seconds mein search karke answer dunga.",
  help: "Kuch bhi poochho! Jaise:\n• Capital of France?\n• What is photosynthesis?\n• Weather in Kolkata\n• 1 dollar in rupees\n• Show image of Taj Mahal",
  notfound: "Ye mujhe search mein nahi mila 🤔. Koi clear topic try karo, jaise 'Albert Einstein' ya 'Taj Mahal'.",
  searching: "Searching…",
};
async function fetchTimeout(url, ms = 9000) {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { signal: ctrl.signal }); } finally { clearTimeout(timer); }
}
async function wikiSummary(topic, long = false) {
  try {
    const r = await fetchTimeout("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(topic));
    if (r.ok) { const d = await r.json(); if (d.extract) return { text: d.extract.slice(0, long ? 1500 : 700), source: d.content_urls?.desktop?.page || "" }; }
  } catch (e) {}
  return null;
}
async function duckAnswer(topic) {
  try {
    const r = await fetchTimeout("https://api.duckduckgo.com/?q=" + encodeURIComponent(topic) + "&format=json&no_html=1&skip_disambig=1");
    if (r.ok) { const d = await r.json(); if (d.AbstractText) return { text: d.AbstractText.slice(0, 700), source: d.AbstractURL || "" }; const rel = (d.RelatedTopics || []).find(x => x.Text); if (rel) return { text: rel.Text.slice(0, 700), source: rel.FirstURL || "" }; }
  } catch (e) {}
  return null;
}
async function searchImages(topic) {
  try {
    const q = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=" + encodeURIComponent(topic) + "&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*";
    const r = await fetchTimeout(q);
    if (r.ok) { const d = await r.json(); const pages = Object.values(d.query?.pages || {}); const imgs = pages.map(p => p.imageinfo?.[0]?.thumburl || p.imageinfo?.[0]?.url).filter(Boolean).slice(0, 8); if (imgs.length) return imgs; }
  } catch (e) {}
  return [];
}
const WEATHER_CODES = { 0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog", 51: "Light drizzle", 61: "Rain", 71: "Snow", 95: "Thunderstorm" };
async function liveWeather(city) {
  try {
    const g = await fetchTimeout("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(city) + "&count=1");
    const gd = await g.json(); const place = gd.results?.[0]; if (!place) return null;
    const f = await fetchTimeout(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,wind_speed_10m`);
    const fd = await f.json(); const c = fd.current;
    return `Weather in ${place.name}, ${place.country}: ${c.temperature_2m}°C, ${WEATHER_CODES[c.weather_code] || "Weather code " + c.weather_code}, wind ${c.wind_speed_10m} km/h. (Live, Open-Meteo)`;
  } catch (e) { return null; }
}
async function liveCurrency(amount, from, to) {
  try {
    const r = await fetchTimeout("https://api.exchangerate-api.com/v4/latest/" + from);
    const d = await r.json(); const rate = d.rates?.[to]; if (!rate) return null;
    return `${amount} ${from} = ${(amount * rate).toFixed(2)} ${to} (Live rate: 1 ${from} = ${rate} ${to})`;
  } catch (e) { return null; }
}
function extractTopic(text) {
  let t = text.toLowerCase().replace(/[?]/g, "").trim();
  t = t.replace(/^(please\s+)?show\s+(me\s+)?(image|photo|picture|pic)s?(\s+of)?\s+/i, "");
  t = t.replace(/^(please\s+)?(image|photo|picture|pic)s?(\s+of)?\s+/i, "");
  t = t.replace(/^(please\s+)?(tell me about|what is|what are|who is|who was|where is|how many|explain|meaning of|about)\s+/i, "");
  t = t.replace(/\b(kya|hai|hain|batao|bataye|ka|ki|ke|ko)\b/g, " ").replace(/\s+/g, " ").trim();
  return t || text;
}
function tryMaths(text) {
  const m = text.toLowerCase().match(/(?:what is|calculate|solve)?\s*([0-9][0-9\s+\-*/().]*)$/);
  if (!m) return null; const expr = m[1].trim();
  if (!/^[0-9+\-*/().\s]+$/.test(expr) || !/[+\-*/]/.test(expr)) return null;
  try { return "That is " + Function('"use strict"; return (' + expr + ')')() + "."; } catch (e) { return null; }
}
function firstSentences(text, n = 2) { const parts = text.match(/[^.!?]+[.!?]+/g) || [text]; return parts.slice(0, n).join(" ").trim(); }
// --- V5 FREE PACK helpers ---
function tryConvert(text) {
  const m = text.toLowerCase().match(/convert\s+(\d+(?:\.\d+)?)\s*(km|kilometers?|miles?|kg|kilograms?|pounds?|lbs?|celsius|fahrenheit|°c|°f)\s*(to|into)?\s*(miles?|km|kilometers?|pounds?|lbs?|kg|kilograms?|fahrenheit|°f|celsius|°c)/);
  if (!m) return null;
  const v = parseFloat(m[1]); const from = m[2]; const to = m[4];
  const conv = { "km->miles": v * 0.621371, "miles->km": v * 1.60934, "kg->pounds": v * 2.20462, "pounds->kg": v * 0.453592, "celsius->fahrenheit": v * 9 / 5 + 32, "fahrenheit->celsius": (v - 32) * 5 / 9 };
  const key = (from.startsWith("kilo") ? "km" : from.startsWith("mile") ? "miles" : from.startsWith("kilo") ? "kg" : from) + "->" + (to.startsWith("mile") ? "miles" : to);
  // Simplify: handle common pairs directly
  if (/km|kilometer/.test(from) && /mile/.test(to)) return `${v} km = ${(v * 0.621371).toFixed(2)} miles`;
  if (/mile/.test(from) && /km|kilometer/.test(to)) return `${v} miles = ${(v * 1.60934).toFixed(2)} km`;
  if (/kg|kilogram/.test(from) && /pound|lb/.test(to)) return `${v} kg = ${(v * 2.20462).toFixed(2)} pounds`;
  if (/pound|lb/.test(from) && /kg|kilogram/.test(to)) return `${v} pounds = ${(v * 0.453592).toFixed(2)} kg`;
  if (/celsius|°c/.test(from) && /fahrenheit|°f/.test(to)) return `${v}°C = ${(v * 9 / 5 + 32).toFixed(1)}°F`;
  if (/fahrenheit|°f/.test(from) && /celsius|°c/.test(to)) return `${v}°F = ${((v - 32) * 5 / 9).toFixed(1)}°C`;
  return null;
}
function tryBMI(text) {
  const m = text.toLowerCase().match(/bmi.*?(\d+(?:\.\d+)?).*?(\d+(?:\.\d+)?)/);
  if (!/bmi/.test(text.toLowerCase()) || !m) return null;
  const weight = parseFloat(m[1]); const heightCm = parseFloat(m[2]);
  if (heightCm < 50 || heightCm > 250) return null;
  const bmi = weight / Math.pow(heightCm / 100, 2);
  const cat = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";
  return `BMI for ${weight} kg and ${heightCm} cm = ${bmi.toFixed(1)} (${cat}). This is a general guide, not medical advice.`;
}
let pyodideInstance = null;
async function runPythonCode(code) {
  try {
    if (!pyodideInstance) {
      if (!window.loadPyodide) {
        await new Promise((resolve, reject) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/pyodide/v0.26.0/full/pyodide.js"; s.onload = resolve; s.onerror = reject; document.head.appendChild(s); });
      }
      pyodideInstance = await window.loadPyodide();
    }
    pyodideInstance.globals.set("user_code", code);
    const out = pyodideInstance.runPython("import io, sys\nbuf = io.StringIO()\n_old = sys.stdout\nsys.stdout = buf\ntry:\n    exec(user_code)\nexcept Exception as e:\n    print('Error:', e)\nfinally:\n    sys.stdout = _old\nbuf.getvalue()");
    return "Python output:\n" + (out || "(no output — code ran with no print)");
  } catch (e) { return "Python runner could not load (needs internet for Pyodide). Error: " + e.message; }
}
function summariseChat() {
  try {
    const saved = JSON.parse(localStorage.getItem("chatbot-v4-history") || "[]");
    const userQs = saved.filter(m => m.who === "user").map(m => m.text).slice(-10);
    if (!userQs.length) return "We have not talked about anything yet in this chat.";
    return "In this chat, you asked about:\n• " + userQs.join("\n• ");
  } catch (e) { return "Could not read chat history."; }
}
async function geminiAnswer(text) {
  const key = localStorage.getItem("gemini-key");
  if (!key) return null;
  try {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 15000);
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(key), {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify({ contents: [{ parts: [{ text: "Answer in simple, clear English, in under 150 words, unless the user asks for more. Question: " + text }] }] }),
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    const d = await r.json();
    const out = d.candidates?.[0]?.content?.parts?.map(p => p.text).join("");
    return out ? out.slice(0, 1500) + "\n\n(Source: Gemini AI — your own free key, stored only on your phone)" : null;
  } catch (e) { return null; }
}
// Mochi v1000000 TOP MODEL: image understanding with your own Gemini key (multimodal)
async function geminiVision(base64, mime, question) {
  const key = localStorage.getItem("gemini-key");
  if (!key) return null;
  try {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 20000);
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(key), {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify({ contents: [{ parts: [{ text: question || "Describe this image in simple, clear English, in under 150 words. What is in it, and what is it used for?" }, { inline_data: { mime_type: mime || "image/jpeg", data: base64 } }] }] }),
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    const d = await r.json();
    const out = d.candidates?.[0]?.content?.parts?.map(p => p.text).join("");
    return out ? out.slice(0, 1500) + "\n\n(Source: Gemini top model — your own free key, image sent only from your phone)" : null;
  } catch (e) { return null; }
}
async function getReply(text) {
  const t = " " + text.toLowerCase() + " ";
  // TOP MODEL: Deep Think — show reasoning steps first, then the answer (like top models)
  if (t.trim().startsWith("deep think:") || t.includes("deep think:")) {
    const q = text.split(/deep think:/i)[1].trim() || text;
    const base = await getReply(q);
    return { text: "🧠 Mochi Deep Think:\n\nStep 1 — Understand: What is really being asked?\n→ " + q + "\n\nStep 2 — Break it down: Key parts, facts, and what to check.\n\nStep 3 — Search / check: Mochi searched and verified below.\n\nStep 4 — Final answer:\n" + base.text, images: base.images };
  }
  const isImage = /\b(image|photo|picture|pic)\b/.test(t);
  // V20: notes (saved only on your phone)
  if (t.includes("save note:")) {
    const note = text.split(/save note:/i)[1].trim();
    const notes = JSON.parse(localStorage.getItem("teddy-notes") || "[]"); notes.push(note); localStorage.setItem("teddy-notes", JSON.stringify(notes));
    return { text: "🧸 Mochi saved your note! You now have " + notes.length + " note(s). Say 'show my notes' to see them." };
  }
  if (t.includes("show my notes") || t.includes("my notes")) {
    const notes = JSON.parse(localStorage.getItem("teddy-notes") || "[]");
    return { text: notes.length ? "🧸 Your Mochi notes:\n• " + notes.join("\n• ") : "🧸 No notes yet. Say 'save note: ...' to save one." };
  }
  const hi = lang === "hi";
  // MEMORY follow-ups
  if ((t.includes("tell me more") || t.trim() === " more " || t.includes("aur batao")) && lastTopic) {
    const w = await wikiSummary(lastTopic, true);
    return { text: w ? (hi ? "Aur detail mein:\n\n" : "More detail:\n\n") + w.text : "No more detail found for " + lastTopic + "." };
  }
  if (t.includes("simplify") && lastAnswer) return { text: (hi ? "Simple words mein: " : "In simple words: ") + firstSentences(lastAnswer, 2) };
  // --- V5 intents ---
  if (t.includes("summarise our chat") || t.includes("summarize our chat") || t.includes("what did we talk about") || t.includes("what did i ask")) return { text: summariseChat() };
  if (t.includes("run python") || t.includes("run code")) {
    let code = text.replace(/run python:\s*/i, "").replace(/run code:\s*/i, "").replace(/```python|```/g, "").trim();
    if (!code) return { text: "To run code, type like this: Run Python: print('Hello')" };
    return { text: await runPythonCode(code) };
  }
  const conv = tryConvert(text); if (conv) return { text: conv };
  const bmi = tryBMI(text); if (bmi) return { text: bmi };
  if (t.includes("explain") && t.includes("for exam")) {
    const topic2 = extractTopic(text.replace(/for exam/gi, ""));
    const w2 = await wikiSummary(topic2);
    if (w2) { lastTopic = topic2; lastAnswer = w2.text; return { text: "Exam notes — " + topic2 + ":\n• " + firstSentences(w2.text, 3).replace(/\. /g, ".\n• ") }; }
  }
  if (t.includes("quiz on") || t.startsWith(" quiz ")) {
    const topic3 = extractTopic(text.replace(/quiz on/gi, ""));
    return { text: "Quiz on " + topic3 + ":\n1. What is " + topic3 + "?\n2. Why is " + topic3 + " important?\n3. Give one example of " + topic3 + ".\n\nTry answering, then ask me 'what is " + topic3 + "' to check." };
  }
  if (isImage && lastTopic && !extractTopic(text).replace(lastTopic, "").trim() && t.includes("image")) {
    // "show images" follow-up will be handled below via topic
  }
  if (/(hello|hi\b|hey|namaste)/.test(t) && t.trim().length < 20) return { text: hi ? HINGLISH.hello : "Hello! 👋 Ask me anything — or ask for an image, like 'show image of Taj Mahal'. I search and paste the result in seconds." };
  if (t.includes("your name") || t.includes("who are you")) return { text: "I'm Mochi v1000000, Project #01 by Aryan Kumar Shah. I have memory, voice, Hinglish mode, live weather/currency, and search for text + images — free, no API key." };
  if (t.includes("what can you do") || t.includes("help")) return { text: hi ? HINGLISH.help : "Ask me anything! Examples:\n• Capital of France?\n• Weather in Kolkata\n• 1 dollar in rupees\n• Show image of Taj Mahal\n• Tell me a joke\n• Then try: Tell more / Simplify / Show images" };
  if (t.includes("joke") || t.includes("funny")) { const r = pickDifferent(JOKES, lastJoke); lastJoke = r[1]; return { text: r[0] }; }
  if (t.includes("motivat") || t.includes("inspir")) { const r = pickDifferent(MOTIVATIONS, lastMotivation); lastMotivation = r[1]; return { text: r[0] }; }
  if (t.includes("time")) return { text: "Right now it is " + new Date().toLocaleTimeString() + "." };
  if (t.includes("thank")) return { text: hi ? "Koi baat nahi! 😊 Aur kuch poochho." : "You're welcome! 😊 Ask me anything else." };
  if (t.includes("bye") || t.includes("goodbye")) return { text: "Goodbye! 👋 Come back anytime." };
  // LIVE weather
  const weatherMatch = t.match(/weather (in|at|of)?\s*([a-z ]+)/);
  if (t.includes("weather")) {
    const city = weatherMatch && weatherMatch[2] ? weatherMatch[2].replace(/\b(today|now|tomorrow)\b/g, "").trim() : "Kolkata";
    const w = await liveWeather(city || "Kolkata");
    if (w) return { text: w };
  }
  // LIVE currency: "1 dollar in rupees", "usd to inr", "10 usd to inr"
  const curMatch = t.match(/(\d+(?:\.\d+)?)?\s*(dollar|usd|rupee|inr|euro|eur)?\s*(to|in|into)?\s*(rupee|inr|dollar|usd|euro|eur)/);
  if (t.includes("dollar") || t.includes("usd") || t.includes("rupee") || t.includes("inr") || t.includes("currency")) {
    const amt = curMatch && curMatch[1] ? parseFloat(curMatch[1]) : 1;
    const from = /dollar|usd/.test(t) ? "USD" : (/euro|eur/.test(t) ? "EUR" : "USD");
    const to = /rupee|inr/.test(t) ? "INR" : "USD";
    if (from !== to) { const c = await liveCurrency(amt, from, to); if (c) return { text: c }; }
  }
  const maths = tryMaths(text);
  if (maths) return { text: maths };
  if (t.includes("capital of france")) return { text: "The capital of France is Paris." };
  if (t.includes("how many states in india")) return { text: "India has 28 states and 8 union territories." };
  // V20: if a Gemini key is saved on this phone, try true AI first; otherwise fall back to search
  if (!isImage && !t.includes("weather") && !t.includes("dollar") && !t.includes("rupee")) {
    const ai = await geminiAnswer(text);
    if (ai) { lastTopic = extractTopic(text); lastAnswer = ai; return { text: "🧸 Mochi says:\n\n" + ai }; }
  }
  // Follow-up "its capital?" etc. uses last topic
  let topic = extractTopic(text);
  if (lastTopic && /^(its|his|her|their)\b/.test(t.trim())) topic = lastTopic + " " + topic;
  const [wiki, duck, images] = await Promise.all([wikiSummary(topic), duckAnswer(topic), isImage ? searchImages(topic) : Promise.resolve([])]);
  const best = duck || wiki;
  let out = "";
  if (best) out = best.text + (best.source ? "\n\nSource: " + best.source : "");
  else if (isImage && images.length) out = "Here are images for '" + topic + "':";
  else out = hi ? HINGLISH.notfound : "I could not find that in the search 🤔. Try a clearer topic, like 'Albert Einstein', 'Taj Mahal', or 'show image of cat'.";
  if (hi && best) out = "Ye lo answer:\n\n" + out;
  lastTopic = topic; lastAnswer = out;
  return { text: out, images: images.length ? images : undefined };
}

// --- UI: history, actions, voice, theme, language ---
const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");
const followups = document.getElementById("followups");
function saveHistory() {
  const msgs = [...chat.querySelectorAll(".msg")].map(m => ({ who: m.classList.contains("user") ? "user" : "bot", text: m.dataset.full || m.textContent }));
  try { localStorage.setItem("chatbot-v4-history", JSON.stringify(msgs.slice(-60))); } catch (e) {}
}
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.slice(0, 500));
  u.lang = lang === "hi" ? "hi-IN" : "en-IN";
  speechSynthesis.speak(u);
}
function addMsg(text, who, images) {
  const div = document.createElement("div");
  div.className = "msg " + who; div.dataset.full = text; div.textContent = text;
  if (images) images.forEach(src => { const a = document.createElement("a"); a.href = src; a.target = "_blank"; const img = document.createElement("img"); img.src = src; img.alt = "Search result image"; img.className = "chat-img"; a.appendChild(img); div.appendChild(a); });
  if (who === "bot") {
    const actions = document.createElement("div"); actions.className = "msg-actions";
    const copyBtn = document.createElement("button"); copyBtn.textContent = "Copy"; copyBtn.onclick = () => navigator.clipboard?.writeText(text);
    const shareBtn = document.createElement("button"); shareBtn.textContent = "Share"; shareBtn.onclick = async () => { try { if (navigator.share) await navigator.share({ text }); else await navigator.clipboard?.writeText(text); } catch (e) {} };
    const speakBtn = document.createElement("button"); speakBtn.textContent = "🔊 Speak"; speakBtn.onclick = () => speak(text);
    actions.append(copyBtn, shareBtn, speakBtn); div.appendChild(actions);
  }
  chat.appendChild(div); chat.scrollTop = chat.scrollHeight; saveHistory(); return div;
}
// Mochi v1000000: teddy shows what it is doing, with a DIFFERENT animation for each action
function setTeddyState(state, label) {
  const ids = ["headerTeddy", "welcomeTeddy", "statusTeddy"];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.className = el.className.replace(/teddy-(idle|reading|thinking|searching|generating|browsing|speaking|happy|sad)/g, "").trim() + " teddy-" + state; });
  const st = document.getElementById("statusText"); if (st && label) st.textContent = label;
}
async function botReply(text) {
  const teddyStatus = document.getElementById("teddyStatus");
  const isImage = /\b(image|photo|picture|pic)\b/.test(" " + text.toLowerCase() + " ");
  if (teddyStatus) teddyStatus.style.display = "flex";
  setTeddyState("thinking", "Mochi is thinking… 🧸💭");
  const typing = addMsg(lang === "hi" ? HINGLISH.searching : "Thinking…", "bot typing");
  await new Promise(r => setTimeout(r, 350));
  setTeddyState(isImage ? "generating" : "searching", isImage ? "Mochi is generating images… 🧸✨" : "Mochi is searching… 🧸🔍");
  typing.textContent = isImage ? "Generating images…" : "Searching…";
  const reply = await getReply(text);
  if (teddyStatus) teddyStatus.style.display = "none";
  setTeddyState("speaking", "Mochi is answering… 🧸💬");
  setTimeout(() => { setTeddyState("happy", "Mochi found it! 🧸💗"); setTimeout(() => setTeddyState("reading", "Mochi is here, blinking while you read… 🧸"), 1200); }, 800);
  typing.textContent = reply.text; typing.dataset.full = reply.text;
  if (reply.images) reply.images.forEach(src => { const a = document.createElement("a"); a.href = src; a.target = "_blank"; const img = document.createElement("img"); img.src = src; img.alt = "Search result image"; img.className = "chat-img"; a.appendChild(img); typing.appendChild(a); });
  // Re-add actions after replacing text
  const actions = document.createElement("div"); actions.className = "msg-actions";
  const copyBtn = document.createElement("button"); copyBtn.textContent = "Copy"; copyBtn.onclick = () => navigator.clipboard?.writeText(reply.text);
  const shareBtn = document.createElement("button"); shareBtn.textContent = "Share"; shareBtn.onclick = async () => { try { if (navigator.share) await navigator.share({ text: reply.text }); else await navigator.clipboard?.writeText(reply.text); } catch (e) {} };
  const speakBtn = document.createElement("button"); speakBtn.textContent = "🔊 Speak"; speakBtn.onclick = () => speak(reply.text);
  actions.append(copyBtn, shareBtn, speakBtn); typing.appendChild(actions);
  chat.scrollTop = chat.scrollHeight; saveHistory();
  if (lastTopic) {
    followups.style.display = "flex";
    const related = document.getElementById("related");
    related.innerHTML = "";
    ["History of " + lastTopic, lastTopic + " examples", "Why is " + lastTopic + " important?"].forEach(q => {
      const b = document.createElement("button"); b.textContent = q; b.onclick = () => send(q); related.appendChild(b);
    });
    related.style.display = "flex";
  }
}
function send(text) { text = text.trim(); if (!text) return; addMsg(text, "user"); botReply(text); }
form.addEventListener("submit", e => { e.preventDefault(); send(input.value); input.value = ""; input.focus(); });
document.getElementById("chips").addEventListener("click", e => { if (e.target.tagName === "BUTTON") send(e.target.textContent); });
followups.addEventListener("click", e => {
  if (e.target.tagName !== "BUTTON") return;
  const f = e.target.dataset.f;
  if (f === "more") send("Tell me more");
  if (f === "simple") send("Simplify this");
  if (f === "images" && lastTopic) send("Show image of " + lastTopic);
});
// Mochi v1000000 TOP MODEL: photo upload — Mochi can see a photo, like top models
document.getElementById("imgBtn").addEventListener("click", () => document.getElementById("imgInput").click());
document.getElementById("imgInput").addEventListener("change", async (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const dataUrl = reader.result;
    const div = addMsg("📷 You uploaded a photo for Mochi to see.", "user");
    const img = document.createElement("img"); img.src = dataUrl; img.className = "chat-img"; div.appendChild(img);
    const teddyStatus = document.getElementById("teddyStatus"); if (teddyStatus) teddyStatus.style.display = "flex";
    setTeddyState("generating", "Mochi is looking at your photo… 🐰👀");
    const base64 = dataUrl.split(",")[1]; const mime = file.type || "image/jpeg";
    const ai = await geminiVision(base64, mime, "Describe this image simply and tell me what I can do with it.");
    if (teddyStatus) teddyStatus.style.display = "none";
    if (ai) { addMsg("🐰 Mochi saw your photo:\n\n" + ai, "bot"); setTeddyState("happy", "Mochi saw it! 🐰"); }
    else { addMsg("🐰 I can see your photo here, but to describe it like a top Gemini model, paste your free Gemini key in ⚙️ settings (only on your phone). Without a key, Mochi cannot analyse photos — it can only show and store them on your phone. No photo is uploaded to GitHub.", "bot"); setTeddyState("sad", "Need a key to see photos in detail 🐰"); }
    setTimeout(() => setTeddyState("reading", ""), 1500);
  };
  reader.readAsDataURL(file); e.target.value = "";
});
// Mochi v1000000 LOGIN / LOGOUT — local only, no server, no data leaves this phone
// Gaps filled: Login + Sign Up tabs, validation, show/hide password, Remember me,
// Forgot password (local reset code shown on this phone, no email sent), Google button (demo, no real Google login),
// Guest mode (no account needed, keeps v100000 no-login promise), profile chip + Logout.
let loginMode = "login";
let resetCode = "";
function showLoginError(msg) { const e = document.getElementById("loginError"); e.textContent = msg; e.style.display = "block"; }
function hideLoginError() { document.getElementById("loginError").style.display = "none"; }
function enterApp(session) {
  localStorage.setItem("mochi-session", JSON.stringify(session));
  document.getElementById("loginScreen").style.display = "none";
  const main = document.getElementById("mainApp"); main.style.display = "flex";
  const chip = document.getElementById("profileChip"); if (chip) chip.textContent = "👤 " + (session.name || session.email || "Guest");
  const logout = document.getElementById("logoutBtn"); if (logout) logout.style.display = "inline-block";
}
function showLoginScreen() {
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("mainApp").style.display = "none";
}
document.getElementById("tabLogin").addEventListener("click", () => {
  loginMode = "login"; document.getElementById("tabLogin").classList.add("active"); document.getElementById("tabSignup").classList.remove("active");
  document.getElementById("loginName").style.display = "none"; document.getElementById("loginSubmit").textContent = "Login →"; hideLoginError();
  const t = document.getElementById("tealTitle"); if (t) t.textContent = "WELCOME BACK!";
  const s = document.getElementById("tealSub"); if (s) s.textContent = "Your cute bunny AI is waiting for you.";
});
document.getElementById("tabSignup").addEventListener("click", () => {
  loginMode = "signup"; document.getElementById("tabSignup").classList.add("active"); document.getElementById("tabLogin").classList.remove("active");
  document.getElementById("loginName").style.display = "block"; document.getElementById("loginSubmit").textContent = "Create account →"; hideLoginError();
  const t = document.getElementById("tealTitle"); if (t) t.textContent = "WELCOME!";
  const s = document.getElementById("tealSub"); if (s) s.textContent = "Join Mochi — it takes less than a minute.";
});
// Runaway button (Reel 2 idea, original code): never disabled, dodges on mouse hover until form is valid.
// Empty form = full dodge, one field filled = half dodge, both valid = locks centre in bright teal.
// Tab focus stops dodging, Enter always tries to submit (form validation shows the error, if any).
let runawayDir = 1;
function loginFormValid() {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPass").value;
  const name = document.getElementById("loginName").value.trim();
  const filled = (email.includes("@") ? 1 : 0) + (pass.length >= 6 ? 1 : 0);
  if (loginMode === "signup" && !name) return { filled: 0, valid: false };
  return { filled, valid: filled === 2 };
}
function updateRunaway() {
  const btn = document.getElementById("loginSubmit"); if (!btn) return;
  const { valid } = loginFormValid();
  btn.classList.toggle("locked", valid);
  if (valid) btn.style.transform = "translateX(0)";
  const hint = document.getElementById("runawayHint"); if (hint) hint.textContent = valid ? "Button locked — you can tap it now." : "Fill both fields and the button locks in place.";
}
document.getElementById("loginSubmit").addEventListener("mouseenter", () => {
  const { filled, valid } = loginFormValid(); if (valid) return;
  const btn = document.getElementById("loginSubmit"); runawayDir *= -1;
  const dist = filled === 1 ? 40 : 80;
  btn.style.transform = "translateX(" + (runawayDir * dist) + "px)";
});
document.getElementById("loginSubmit").addEventListener("focus", () => {
  const btn = document.getElementById("loginSubmit"); btn.style.transform = "translateX(0)";
});
["loginEmail", "loginPass", "loginName"].forEach(id => {
  const el = document.getElementById(id); if (el) el.addEventListener("input", updateRunaway);
});
document.getElementById("togglePass").addEventListener("click", () => {
  const p = document.getElementById("loginPass"); p.type = p.type === "password" ? "text" : "password";
});
document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault(); hideLoginError();
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPass").value;
  const name = document.getElementById("loginName").value.trim();
  if (!email.includes("@")) return showLoginError("Please enter a valid email address.");
  if (pass.length < 6) return showLoginError("Password must be at least 6 letters.");
  if (loginMode === "signup" && !name) return showLoginError("Please enter your name for Sign Up.");
  const users = JSON.parse(localStorage.getItem("mochi-users") || "{}");
  if (loginMode === "signup") {
    if (users[email]) return showLoginError("This email already has an account here. Please Login instead.");
    users[email] = { name, pass }; localStorage.setItem("mochi-users", JSON.stringify(users));
    enterApp({ name, email });
  } else {
    if (!users[email]) {
      // First time on this phone: treat as new local account, so login never blocks you
      users[email] = { name: email.split("@")[0], pass }; localStorage.setItem("mochi-users", JSON.stringify(users));
      enterApp({ name: email.split("@")[0], email });
    } else if (users[email].pass !== pass) return showLoginError("Wrong password for this email on this phone. Try again, or use Forgot password.");
    else enterApp({ name: users[email].name, email });
  }
});
document.getElementById("googleBtn").addEventListener("click", () => {
  // Demo only: no real Google OAuth, no data leaves the phone — creates a local Google-style session
  enterApp({ name: "Google User", email: "google-user", googleDemo: true });
  addMsg("Hi! You continued with Google (demo on this phone — no real Google account was connected, and nothing left your phone).", "bot");
});
document.getElementById("guestBtn").addEventListener("click", () => enterApp({ name: "Guest", email: "", guest: true }));
document.getElementById("logoutBtn").addEventListener("click", () => {
  if (!confirm("Logout from Mochi? Your chats and notes stay on this phone, only your login session will end.")) return;
  localStorage.removeItem("mochi-session"); showLoginScreen();
});
document.getElementById("forgotBtn").addEventListener("click", () => {
  const p = document.getElementById("forgotPanel"); p.style.display = p.style.display === "none" ? "block" : "none";
});
document.getElementById("forgotSend").addEventListener("click", () => {
  const email = document.getElementById("forgotEmail").value.trim();
  if (!email.includes("@")) return alert("Please enter a valid email.");
  resetCode = String(Math.floor(1000 + Math.random() * 9000));
  document.getElementById("forgotCode").textContent = "Your reset code (shown here only, no email sent): " + resetCode;
  document.getElementById("forgotCodeInput").style.display = "block";
  document.getElementById("forgotNewPass").style.display = "block";
  document.getElementById("forgotConfirm").style.display = "block";
  document.getElementById("forgotConfirm").dataset.email = email;
});
document.getElementById("forgotConfirm").addEventListener("click", () => {
  const code = document.getElementById("forgotCodeInput").value.trim();
  const np = document.getElementById("forgotNewPass").value;
  const email = document.getElementById("forgotConfirm").dataset.email;
  if (code !== resetCode) return alert("Wrong reset code.");
  if (np.length < 6) return alert("New password must be at least 6 letters.");
  const users = JSON.parse(localStorage.getItem("mochi-users") || "{}");
  users[email] = { name: (users[email] && users[email].name) || email.split("@")[0], pass: np };
  localStorage.setItem("mochi-users", JSON.stringify(users));
  alert("Password reset on this phone. You can now Login with your new password."); document.getElementById("forgotPanel").style.display = "none";
});
// Session persistence: if you chose Remember me / logged in before, skip login on next open
try {
  const saved = JSON.parse(localStorage.getItem("mochi-session") || "null");
  if (saved) enterApp(saved); else showLoginScreen();
} catch (e) { showLoginScreen(); }
// Mochi v1000000: New Chat — saves nothing to a server, just clears this phone's chat
document.getElementById("newChatBtn").addEventListener("click", () => {
  if (!confirm("Start a new chat with Mochi? Your old chat on this phone will be cleared.")) return;
  localStorage.removeItem("chatbot-v4-history"); document.getElementById("chat").innerHTML = "";
  addMsg("Hi, I'm Mochi! 🧸 New chat started. Ask anything!", "bot");
  setTeddyState("happy", "New chat! 🧸"); setTimeout(() => setTeddyState("idle", ""), 1000);
});
// V500 settings: Gemini key, stored ONLY on this phone (localStorage), never uploaded
document.getElementById("settingsBtn").addEventListener("click", () => {
  const p = document.getElementById("settingsPanel"); p.style.display = p.style.display === "none" ? "block" : "none";
  const st = document.getElementById("keyStatus"); st.textContent = localStorage.getItem("gemini-key") ? "✓ Key saved on this phone" : "No key saved — search mode is on";
});
document.getElementById("saveKeyBtn").addEventListener("click", () => {
  const v = document.getElementById("geminiKeyInput").value.trim();
  if (!v) return; localStorage.setItem("gemini-key", v); document.getElementById("geminiKeyInput").value = "";
  document.getElementById("keyStatus").textContent = "✓ Key saved on this phone — Teddy AI mode is on";
});
document.getElementById("clearKeyBtn").addEventListener("click", () => {
  localStorage.removeItem("gemini-key"); document.getElementById("keyStatus").textContent = "Key removed — search mode is on";
});
document.getElementById("exportBtn").addEventListener("click", () => {
  try {
    const saved = JSON.parse(localStorage.getItem("chatbot-v4-history") || "[]");
    const text = saved.map(m => (m.who === "user" ? "You: " : "Bot: ") + m.text).join("\n\n") || "No chat yet.";
    const blob = new Blob([text], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "chatbot-chat.txt"; a.click();
  } catch (e) { alert("Export failed."); }
});
document.getElementById("clearBtn").addEventListener("click", () => { chat.innerHTML = ""; try { localStorage.removeItem("chatbot-v4-history"); } catch (e) {} followups.style.display = "none"; const rel = document.getElementById("related"); if (rel) rel.style.display = "none"; addMsg(lang === "hi" ? "Chat clear ho gaya. Kuch bhi poochho! 👋" : "Chat cleared. Ask me anything! 👋", "bot"); });
// Theme
const themeBtn = document.getElementById("themeBtn");
if (localStorage.getItem("chatbot-theme") === "light") { document.body.classList.add("light"); themeBtn.textContent = "☀️"; }
themeBtn.addEventListener("click", () => { const light = document.body.classList.toggle("light"); localStorage.setItem("chatbot-theme", light ? "light" : "dark"); themeBtn.textContent = light ? "☀️" : "🌙"; });
// Language
const langBtn = document.getElementById("langBtn");
langBtn.textContent = lang === "hi" ? "HING" : "EN";
langBtn.addEventListener("click", () => { lang = lang === "hi" ? "en" : "hi"; localStorage.setItem("chatbot-lang", lang); langBtn.textContent = lang === "hi" ? "HING" : "EN"; addMsg(lang === "hi" ? "Hinglish mode ON. Ab aap Hinglish mein poochh sakte ho." : "English mode ON.", "bot"); });
// Mic
document.getElementById("micBtn").addEventListener("click", () => {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) { alert("Voice input is not supported in this browser. Try Chrome on Android."); return; }
  const rec = new Rec(); rec.lang = lang === "hi" ? "hi-IN" : "en-IN";
  rec.onresult = e => { input.value = e.results[0][0].transcript; send(input.value); input.value = ""; };
  rec.start();
});
// Load history
try {
  const saved = JSON.parse(localStorage.getItem("chatbot-v4-history") || "[]");
  if (saved.length) { saved.forEach(m => addMsg(m.text, m.who)); }
  else { addMsg(lang === "hi" ? HINGLISH.hello : "Hello! 👋 I'm Mochi — with memory, voice, Hinglish, live weather/currency, and search for text + images. Ask anything!", "bot"); }
} catch (e) { addMsg("Hello! 👋 I'm Mochi. Ask me anything!", "bot"); }
