# TV Tracker – Beginner-Friendly Setup Guide

This page explains **in plain language** how to get the TV Tracker running on a normal Windows or Mac computer. No previous programming or GitHub experience is required.

---

## 1. Install the only program you need (Node.js)

1. Open your web browser (Chrome, Edge, Safari … any is fine).
2. Go to **https://nodejs.org**.
3. You will see two big green buttons. Click the one that says **“LTS”** (that stands for *Long-Term Support* – it is the safe choice).
4. When the download finishes, open the file and click **Next →** until it says **Finish**. This installs two tools we need: **Node.js** and **npm**.

## 2. Get the TV Tracker files from GitHub

There are two easy ways. If the words *clone*, *repository*, or *branch* sound scary, use **Option A**.

### Option A – Download as a ZIP (easiest)

1. Visit the project page: **https://github.com/lowbass/lowbass-tv-tracker** (or whichever address your helper gave you).
2. Look for a green button that says **Code**. Click it, then click **Download ZIP**.
3. A file called something like `lowbass-tv-tracker-main.zip` will download. Double-click it to unzip (your computer will create a folder with the same name).
4. Move that new folder to a place that is easy to find (for example, your **Desktop**).

### Option B – Using Git (a little more advanced)
If you already have Git installed and feel comfortable with the command prompt, you can run:
```bash
git clone https://github.com/lowbass/lowbass-tv-tracker.git
```
You can then skip the un-zipping part.

## 3. Open the project folder in the Command Prompt / Terminal

1. Press the **Windows key**, type **cmd**, and press **Enter** (on Mac, open **Terminal** from *Applications → Utilities*).
2. In the black window that appears, type **`cd`** (that means “change directory”), press the **space bar**, **drag the project folder** you unpacked in step 2 into the window, and press **Enter**.
   *Example (don’t type this literally):*
   ```bash
   cd C:\Users\YourName\Desktop\lowbass-tv-tracker-main
   ```

## 4. Install the project’s libraries (this may take a few minutes)

Still inside the command prompt window:
```bash
npm install
```
This downloads everything the **front-end** part needs.

Now install the **back-end** part:
```bash
cd simple-backend
npm install
```
When that finishes, **stay** in the `simple-backend` folder for the next step.

## 5. Start the back-end server

In the same window:
```bash
npm start
```
You should see messages like **“TV Tracker Simple Backend running on http://localhost:3002”**. Keep this window **open** – the server needs to stay running.

## 6. Start the front-end (the part you see in the browser)

1. Open a **new** Command Prompt window (or a new tab in Terminal).
2. **Change directory** back to the main project folder (same `cd` trick as before, but **not** into `simple-backend`).
3. Run:
   ```bash
   npm run dev
   ```
4. After a few seconds you will see something like **“Local: http://localhost:5173/”**.  
   Open your web browser and go to that address.  
   **Voilà !** You are now using your own copy of TV Tracker.

## 7. (Optional) Secure it with a password

If you plan to put this on the internet (for example with Railway or Render), you can protect it with a username and password:
1. In the *first* Command Prompt window (the one still inside `simple-backend`), press **Ctrl +C** once to stop the server.
2. Type the following commands, replacing the words in CAPITAL LETTERS with your own secret values:
   ```bash
   set AUTH_USERNAME=YOUR_USERNAME
   set AUTH_PASSWORD=YOUR_PASSWORD
   npm start
   ```
   (On Mac/Linux use `export` instead of `set`.)
3. From now on, anyone who visits will be asked for those credentials.

## Troubleshooting

• **“`npm` is not recognized as an internal or external command”**  
  Node.js was not installed correctly. Try reinstalling from https://nodejs.org.

• **Port already in use**  
  Another program is using port 3002 or 5173. Close that program or restart your computer and try again.

If you get stuck, email or message the person who sent you this project – they will be happy to help.

> Enjoy keeping track of your favourite shows!