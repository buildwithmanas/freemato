# 🍕 Freemato

**Freemato is a free, open-source alternative to food delivery apps that charge 30%+ commission on each order.** 

By design, any restaurant can self-host it, giving you complete ownership over your customers, menu, and margins. Operating at 0% commission, you only pay exactly what the food costs to make.

Freemato is fundamentally built on conversational messaging interfaces:
- **WhatsApp**
- **Telegram**

Usually, using the official **WhatsApp Business API** and **Telegram Bots** gives your customers the absolute best possible experience—interactive menus with clickable buttons, lightning-fast order tracking, and a professional storefront appearance.

However, if you do not have a verified WhatsApp Business account yet, Freemato allows you to simply connect your **Personal WhatsApp** number by scanning a QR code! 
*Note: Using Personal WhatsApp comes with some minor connection risks and does not provide the premium user experience (no clickable button menus; customers will type out orders using numbers or plain text instead).*

---

## 🚀 Easy Setup Guide (For Restaurant Owners)

We've designed Freemato so that you don't need a computer science degree to run it. If you can click a few buttons and copy-paste some text, you can launch your own delivery application!

### Step 1: Install Required Software
You need three basic tools installed on your computer to run Freemato:
1. **Node.js**: [Download and install it here](https://nodejs.org/) (Select the "LTS" version. Keep clicking "Next" until it finishes).
2. **MongoDB Community Server**: [Download and install here](https://www.mongodb.com/try/download/community). (This is where your restaurant data safely lives on your computer. Just use the default installation settings!).
3. **Ngrok**: [Sign up for free and download here](https://ngrok.com/). This magical tool creates a secure public tunnel so WhatsApp and Telegram can reach your laptop. Unzip it and follow their website's quick 1-step instruction to attach your Auth Token.

### Step 2: Download Freemato
Download this project to your computer and open the folder.

### Step 3: Install & Start Your Server
1. **Start Ngrok:** Open your `ngrok` program and type `ngrok http 3000` and press Enter. It will generate a public URL (like `https://xyz.ngrok-free.app`). **Leave this window running in the background.**
2. From inside the Freemato folder, double-click the `setup.bat` file (if you are on Windows) to automatically install everything the system needs.
3. Once that finishes, **open a terminal** in that folder and start the system by typing:
   ```cmd
   npm start
   ```
   *Congratulations! Your AI delivery server is now running locally.*

### Step 4: The Configuration Wizard
Open your regular web browser (like Chrome or Safari) and go to:
**👉 http://localhost:3000/restaurant**

You will be greeted by the **Freemato Setup Wizard**! Here is what the wizard will walk you through:

1. **Restaurant GPS Locating:** Simply pinpoint your restaurant's location on our interactive map.
2. **Menu Initialization:** You can choose to automatically load a sample menu (great for testing) or skip and add your real menu later from your new Dashboard.
3. **Communication Channels Setup:** 
   - **Telegram:** Use `@BotFather` on Telegram to get your easy, free tokens for your Customer Bot and Rider Bot.
   - **WhatsApp:** Paste in your official Business API token, OR scan the live QR code right from your screen to use Personal WhatsApp.
4. **Network Setup:** To let WhatsApp reach your laptop, the wizard will help you link an `ngrok` URL (a secure tunnel connection).

### Step 5: Start Taking Orders!
Once the wizard finishes, you will immediately land in your Restaurant CRM Dashboard! 
- Watch new orders pop up in real time on the screen.
- Manage your menu prices and items.
- Register your delivery riders.
- Customers simply text your bot on Telegram or WhatsApp and say *"Hi"* — Freemato's Artificial Intelligence does all the talking and takes their order for you automatically!

---

*This platform was built to democratize food delivery. Enjoy taking back your independence!*
