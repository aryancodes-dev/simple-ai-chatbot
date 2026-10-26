"""Simple AI Chatbot v20 — Project #01 of the 100+ AI Projects series.
FREE PACK (web version also has voice, history, light/dark — terminal version
has the same brain, minus browser voice/UI):
  • MEMORY: "tell me more" / "simplify" / "show image of <last topic>" work
    without retyping, because the bot remembers the last topic.
  • LIVE: weather (Open-Meteo, free) + USD->INR currency (free exchange API).
    News headlines need a paid key, so v4 does not fake news.
  • IMAGES: 8 image URLs from Wikimedia Commons.
  • SEARCH: DuckDuckGo + Wikipedia in parallel, 9-sec timeout.
Honest limit: NOT ChatGPT — it searches and pastes, it does not think like a human.
Run:  python chatbot.py
Try: "weather in Kolkata", "1 dollar in rupees", "show image of Taj Mahal",
     then "tell me more", then "simplify this".
Only uses Python standard library.
"""
import concurrent.futures
import json
import random
import re
import urllib.parse
import urllib.request

JOKES = [
    "Why do programmers prefer dark mode? Because light attracts bugs!",
    "Why did the developer go broke? Because he used up all his cache.",
    "There are only 10 types of people: those who understand binary and those who don't.",
]
HEADERS = {"User-Agent": "SimpleAIChatbot/20.0"}
LAST_TOPIC = ""
LAST_ANSWER = ""


def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=9) as r:
        return json.loads(r.read().decode())


def wiki_summary(topic, long=False):
    try:
        data = fetch_json("https://en.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(topic))
        return data["extract"][:1500 if long else 700] if data.get("extract") else None
    except Exception:
        return None


def duck_answer(topic):
    try:
        url = "https://api.duckduckgo.com/?q=" + urllib.parse.quote(topic) + "&format=json&no_html=1&skip_disambig=1"
        data = fetch_json(url)
        return data["AbstractText"][:700] if data.get("AbstractText") else None
    except Exception:
        return None


def search_images(topic):
    try:
        url = ("https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch="
               + urllib.parse.quote(topic) + "&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json")
        data = fetch_json(url)
        pages = data.get("query", {}).get("pages", {}).values()
        imgs = [p["imageinfo"][0].get("thumburl") or p["imageinfo"][0].get("url")
                for p in pages if p.get("imageinfo")]
        return [u for u in imgs if u][:8]
    except Exception:
        return []


def live_weather(city):
    try:
        geo = fetch_json("https://geocoding-api.open-meteo.com/v1/search?name=" + urllib.parse.quote(city) + "&count=1")
        place = geo["results"][0]
        url = f"https://api.open-meteo.com/v1/forecast?latitude={place['latitude']}&longitude={place['longitude']}&current=temperature_2m,weather_code,wind_speed_10m"
        cur = fetch_json(url)["current"]
        return f"Weather in {place['name']}, {place['country']}: {cur['temperature_2m']}°C, wind {cur['wind_speed_10m']} km/h. (Live, Open-Meteo)"
    except Exception:
        return None


def live_currency(amount, frm, to):
    try:
        data = fetch_json("https://api.exchangerate-api.com/v4/latest/" + frm)
        rate = data["rates"][to]
        return f"{amount} {frm} = {amount * rate:.2f} {to} (Live rate: 1 {frm} = {rate} {to})"
    except Exception:
        return None


def extract_topic(text):
    t = re.sub(r"[?]", "", text.lower()).strip()
    t = re.sub(r"^(please\s+)?show\s+(me\s+)?(image|photo|picture|pic)s?(\s+of)?\s+", "", t)
    t = re.sub(r"^(please\s+)?(image|photo|picture|pic)s?(\s+of)?\s+", "", t)
    t = re.sub(r"^(please\s+)?(tell me about|what is|what are|who is|who was|where is|how many|explain|about)\s+", "", t)
    t = re.sub(r"\b(kya|hai|hain|batao|bataye|ka|ki|ke|ko)\b", " ", t)
    return re.sub(r"\s+", " ", t).strip() or text



def try_convert(text):
    import re as _re
    m = _re.search(r"convert\s+(\d+(?:\.\d+)?)\s*(km|miles?|kg|pounds?|celsius|fahrenheit)\s*(?:to|into)?\s*(miles?|km|kg|pounds?|fahrenheit|celsius)", text.lower())
    if not m:
        return None
    v = float(m.group(1)); frm, to = m.group(2), m.group(3)
    if "km" in frm and "mile" in to: return f"{v} km = {v*0.621371:.2f} miles"
    if "mile" in frm and "km" in to: return f"{v} miles = {v*1.60934:.2f} km"
    if "kg" in frm and "pound" in to: return f"{v} kg = {v*2.20462:.2f} pounds"
    if "celsius" in frm and "fahrenheit" in to: return f"{v}°C = {v*9/5+32:.1f}°F"
    return None

def try_bmi(text):
    import re as _re
    if "bmi" not in text.lower():
        return None
    m = _re.search(r"bmi.*?(\d+(?:\.\d+)?).*?(\d+(?:\.\d+)?)", text.lower())
    if not m: return None
    w, h = float(m.group(1)), float(m.group(2))
    bmi = w / ((h/100)**2)
    cat = "Underweight" if bmi < 18.5 else "Normal" if bmi < 25 else "Overweight" if bmi < 30 else "Obese"
    return f"BMI for {w} kg and {h} cm = {bmi:.1f} ({cat}). General guide only, not medical advice."

CHAT_LOG = []

def get_reply(text):
    global LAST_TOPIC, LAST_ANSWER
    t = " " + text.lower() + " "
    is_image = bool(re.search(r"\b(image|photo|picture|pic)\b", t))
    if "summarise our chat" in t or "summarize our chat" in t or "what did we talk about" in t:
        qs = [q for q in CHAT_LOG[-10:]]
        return "In this chat, you asked about:\n• " + "\n• ".join(qs) if qs else "Nothing yet in this chat."
    conv = try_convert(text)
    if conv: return conv
    bmi = try_bmi(text)
    if bmi: return bmi
    if "explain" in t and "for exam" in t:
        topic_e = extract_topic(text.replace("for exam", ""))
        w_e = wiki_summary(topic_e)
        if w_e: return "Exam notes — " + topic_e + ":\n• " + w_e[:500]
    if "quiz on" in t:
        topic_q = extract_topic(text.replace("quiz on", ""))
        return f"Quiz on {topic_q}:\n1. What is {topic_q}?\n2. Why is {topic_q} important?\n3. Give one example of {topic_q}?"
    if text.lower().startswith("run python:"):
        code = text.split(":", 1)[1].strip()
        try:
            import io, contextlib
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                exec(code, {})
            return "Python output:\n" + (buf.getvalue() or "(no output)")
        except Exception as e:
            return f"Python error: {e}"
    if ("tell me more" in t or "aur batao" in t) and LAST_TOPIC:
        return wiki_summary(LAST_TOPIC, long=True) or "No more detail found."
    if "simplify" in t and LAST_ANSWER:
        sentences = re.findall(r"[^.!?]+[.!?]+", LAST_ANSWER)
        return "In simple words: " + " ".join(sentences[:2]).strip()
    if "joke" in t:
        return random.choice(JOKES)
    if "weather" in t:
        m = re.search(r"weather (?:in|at|of)?\s*([a-z ]+)", t)
        city = re.sub(r"\b(today|now|tomorrow)\b", "", m.group(1)).strip() if m else "Kolkata"
        w = live_weather(city or "Kolkata")
        if w:
            return w
    if any(k in t for k in ["dollar", "usd", "rupee", "inr"]):
        m = re.search(r"(\d+(?:\.\d+)?)?\s*(dollar|usd|rupee|inr)", t)
        amt = float(m.group(1)) if m and m.group(1) else 1
        frm = "USD" if ("dollar" in t or "usd" in t) else "USD"
        to = "INR" if ("rupee" in t or "inr" in t) else "USD"
        if frm != to:
            c = live_currency(amt, frm, to)
            if c:
                return c
    topic = extract_topic(text)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        f_wiki = pool.submit(wiki_summary, topic)
        f_duck = pool.submit(duck_answer, topic)
        f_img = pool.submit(search_images, topic) if is_image else None
        best = f_duck.result() or f_wiki.result()
        images = f_img.result() if f_img else []
    out = best if best else "I could not find that in the search. Try a clearer topic."
    if images:
        out += "\nImages:\n" + "\n".join(images)
    LAST_TOPIC, LAST_ANSWER = topic, out
    return out


def main():
    print("Simple AI Chatbot v20 — ask anything, try 'tell me more' after an answer. Type 'bye' to exit.")
    while True:
        try:
            user = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBot: Goodbye!")
            break
        if not user:
            continue
        CHAT_LOG.append(user)
        print("Bot:", get_reply(user))
        if "bye" in " " + user.lower() + " ":
            break


if __name__ == "__main__":
    main()
