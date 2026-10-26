"""Simple AI Chatbot — Project #01 of the 100+ AI Projects series.
Rule-based chatbot. No API key, no internet needed.
Run:  python chatbot.py
Type 'bye' to exit.
Same intents as the web version (app.js).
"""
import datetime


def get_reply(text: str) -> str:
    t = " " + text.lower() + " "
    if any(k in t for k in ["hello", "hi", "hey", "namaste"]):
        return "Hello! I'm your Simple AI Chatbot. Ask me about Python, Java, C, motivation, or type 'help'."
    if any(k in t for k in ["your name", "who are you", "who made you", "who created you"]):
        return "I'm Simple AI Chatbot, Project #01 by Aryan Kumar Shah. I match what you type to an answer — no API key needed."
    if any(k in t for k in ["what can you do", "help", "features"]):
        return "I can greet you, give Python/Java/C tips, tell jokes, motivate you, and tell the time/date. Try 'python tip'."
    if "python" in t:
        return "Python tip: Use meaningful variable names, and test small pieces of code often. print('Hello') is a complete program — start small."
    if "java" in t:
        return "Java tip: Every Java program starts in a class with a main method. File name must match the public class name, e.g. Main.java -> class Main."
    if " c " in t or "c programming" in t:
        return "C tip: Check semicolons and brackets first when you get an error — most beginner errors are there."
    if any(k in t for k in ["joke", "funny"]):
        return "Why do programmers prefer dark mode? Because light attracts bugs!"
    if any(k in t for k in ["motivat", "inspir", "sad", "tired"]):
        return "Don't quit. Every good developer was once a beginner who kept going after the errors. One small project a day beats a big plan you never start."
    if "thank" in t:
        return "You're welcome! Ask me anything else."
    if "time" in t:
        return "Right now it is " + datetime.datetime.now().strftime("%I:%M %p") + "."
    if "date" in t or "today" in t:
        return "Today is " + datetime.date.today().strftime("%A, %d %B %Y") + "."
    if any(k in t for k in ["bye", "goodbye"]):
        return "Goodbye! Come back anytime."
    return "I didn't quite get that. Try: 'hello', 'help', 'python tip', 'joke', or 'motivate me'."


def main():
    print("Simple AI Chatbot — type 'bye' to exit.")
    while True:
        try:
            user = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBot: Goodbye!")
            break
        if not user:
            continue
        reply = get_reply(user)
        print("Bot:", reply)
        if any(k in " " + user.lower() + " " for k in ["bye", "goodbye"]):
            break


if __name__ == "__main__":
    main()
