// Simple AI Chatbot — rule-based brain, no API key, works offline.
// Same intents as chatbot.py, so the web and Python versions match.
const RULES = [
  { keys: ["hello", "hi", "hey", "namaste"], reply: "Hello! 👋 I'm your Simple AI Chatbot. Ask me about Python, Java, C, motivation, or just say 'what can you do?'." },
  { keys: ["your name", "who are you", "who made you", "who created you"], reply: "I'm Simple AI Chatbot, Project #01 of the 100+ AI Projects series by Aryan Kumar Shah. I'm a rule-based chatbot — I match what you type to an answer, no internet or API key needed." },
  { keys: ["what can you do", "help", "features", "options"], reply: "I can do this:\n• Greet you and chat\n• Give Python, Java and C tips\n• Tell jokes and motivate you\n• Tell the time and date\nTry a suggestion chip above, or type 'python tip'." },
  { keys: ["python"], reply: "Python tip 🐍: Use meaningful variable names, and test small pieces of code often. Example: print('Hello') is a complete program — start small, then grow it." },
  { keys: ["java"], reply: "Java tip ☕: Every Java program starts in a class with a main method. Remember: file name must match the public class name, e.g. Main.java → class Main." },
  { keys: [" c ", " c programming", "c language"], reply: "C tip: In C, always check your semicolons and brackets first when you get an error — most beginner errors are there, not in the logic." },
  { keys: ["joke", "funny", "laugh"], reply: "Why do programmers prefer dark mode? Because light attracts bugs! 😄" },
  { keys: ["motivat", "inspir", "sad", "tired", "give up"], reply: "Don't quit. Every good developer was once a beginner who kept going after the errors. One small project a day beats one big plan you never start. 💪" },
  { keys: ["thank"], reply: "You're welcome! 😊 Ask me anything else — try 'joke' or 'python tip'." },
  { keys: ["bye", "goodbye", "see you"], reply: "Goodbye! 👋 Come back anytime — I'll be here, no login needed." },
  { keys: ["time"], reply: () => "Right now it is " + new Date().toLocaleTimeString() + "." },
  { keys: ["date", "today"], reply: () => "Today is " + new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + "." },
];

function getReply(text) {
  const t = " " + text.toLowerCase() + " ";
  for (const rule of RULES) {
    if (rule.keys.some(k => t.includes(k))) {
      return typeof rule.reply === "function" ? rule.reply() : rule.reply;
    }
  }
  return "I didn't quite get that 🤔. Try: 'hello', 'what can you do?', 'python tip', 'joke', or 'motivate me'.";
}

const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");

function addMsg(text, who) {
  const div = document.createElement("div");
  div.className = "msg " + who;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}
function botReply(text) {
  const typing = addMsg("Typing…", "bot typing");
  setTimeout(() => { typing.textContent = getReply(text); chat.scrollTop = chat.scrollHeight; }, 450);
}
function send(text) {
  text = text.trim();
  if (!text) return;
  addMsg(text, "user");
  botReply(text);
}
form.addEventListener("submit", e => { e.preventDefault(); send(input.value); input.value = ""; input.focus(); });
document.getElementById("chips").addEventListener("click", e => { if (e.target.tagName === "BUTTON") send(e.target.textContent); });
document.getElementById("clearBtn").addEventListener("click", () => { chat.innerHTML = ""; addMsg("Chat cleared. Say hello to start again! 👋", "bot"); });
addMsg("Hello! 👋 I'm Simple AI Chatbot. Type 'hello' or tap a suggestion below to start.", "bot");
