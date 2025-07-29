# TV Tracker – How to Run It on Your Computer

This guide explains **in simple terms** how to get the TV Tracker working on your Windows or Mac computer. You don't need any programming experience – just follow these steps!

---

## What You're Going to Do

You're going to:
1. Install one free program (Node.js) that helps run the TV tracker
2. Download the TV tracker files from the internet
3. Tell your computer to set everything up
4. Start using your personal TV tracker!

The whole process takes about 10-15 minutes.

---

## Step 1: Install Node.js (the helper program)

1. Open your web browser (Chrome, Safari, Edge – any browser works).
2. Go to **https://nodejs.org**
3. You'll see two green download buttons. Click the one labeled **"LTS"** (this stands for "Long-Term Support" and is the safe choice).
4. When the file finishes downloading, double-click it to open it.
5. Click **"Next"** through all the screens until you see **"Finish"**.

**What just happened?** You installed two tools that help run web applications on your computer: Node.js and npm.

---

## Step 2: Get the TV Tracker Files

You have two options. If you've never used GitHub before, choose **Option A**.

### Option A: Download as a ZIP file (easiest)

1. Go to **https://github.com/lowbass/lowbass-tv-tracker** in your web browser.
2. Look for a green button that says **"Code"**. Click it.
3. In the menu that appears, click **"Download ZIP"**.
4. A file called something like `lowbass-tv-tracker-main.zip` will download to your computer.
5. Find that file (probably in your Downloads folder) and double-click it to unzip it.
6. You'll now have a folder called `lowbass-tv-tracker-main`. Move this folder somewhere easy to find, like your Desktop.

### Option B: Using Git (if you know what that is)

If you already have Git installed:
```bash
git clone https://github.com/lowbass/lowbass-tv-tracker.git
```

---

## Step 3: Open the Command Prompt or Terminal

This is where you'll type some commands to set everything up.

**On Windows:**
1. Press the **Windows key** on your keyboard
2. Type **cmd** and press **Enter**
3. A black window will open – this is the Command Prompt

**On Mac:**
1. Press **Command + Space** to open Spotlight
2. Type **terminal** and press **Enter**
3. A window will open – this is the Terminal

---

## Step 4: Navigate to Your TV Tracker Folder

In the black window that just opened:

1. Type **cd** (which means "change directory")
2. Press the **space bar** once
3. **Drag the TV tracker folder** from your Desktop (or wherever you put it) into the black window
4. Press **Enter**

**Example of what this might look like:**
```
cd C:\Users\YourName\Desktop\lowbass-tv-tracker-main
```

**What just happened?** You told your computer to "go into" the TV tracker folder so it can work with the files inside.

---

## Step 5: Install the Required Components

Now you'll install all the pieces the TV tracker needs to work.

**First, install the main components:**
```bash
npm install
```
Type that and press Enter. You'll see lots of text scrolling by – this is normal! It might take 2-3 minutes.

**Next, install the database components:**
```bash
cd simple-backend
npm install
```
This will take another minute or two.

**What just happened?** Your computer downloaded and installed all the code libraries that the TV tracker needs to work properly.

---

## Step 6: Start the Database Server

While still in the same black window:
```bash
npm start
```

You should see a message like **"TV Tracker Simple Backend running on http://localhost:3002"**.

**Important:** Keep this window open! The database server needs to keep running for the TV tracker to work.

---

## Step 7: Start the TV Tracker Website

1. Open a **new** Command Prompt or Terminal window (keep the first one open!)
2. Navigate back to your TV tracker folder using the same **cd** command from Step 4, but **don't** go into the `simple-backend` folder this time
3. Type this command:
   ```bash
   npm run dev
   ```
4. After a few seconds, you'll see a message like **"Local: http://localhost:5173/"**

5. **Open your web browser** and go to that address: **http://localhost:5173/**

**Congratulations!** Your TV tracker is now running on your computer!

---

## Step 8: Using Your TV Tracker

- The website will open in your browser
- You can search for TV shows, add them to your list, and track which episodes you've watched
- Your data is saved on your computer – nobody else can see it
- To use it again later, just repeat Steps 6 and 7

---

## Step 9: Adding Password Protection (Optional)

If you want to add a username and password:

1. In the **first** Command Prompt window (the one running the database), press **Ctrl + C** to stop the server
2. Type these commands, replacing the CAPITAL words with your own choices:
   ```bash
   set AUTH_USERNAME=YOUR_USERNAME
   set AUTH_PASSWORD=YOUR_PASSWORD
   npm start
   ```
   *(On Mac, use `export` instead of `set`)*
3. Now anyone who tries to use your TV tracker will need to enter that username and password

---

## If Something Goes Wrong

**"npm is not recognized as an internal or external command"**
- Node.js wasn't installed correctly. Go back to Step 1 and try installing it again.

**"Port already in use" or similar error**
- Another program is using the same "port" (connection point). Try restarting your computer and starting over from Step 6.

**The website won't load**
- Make sure both Command Prompt/Terminal windows are still open and running
- Check that you're going to the right address (usually http://localhost:5173/)

**Still stuck?**
- Contact the person who shared this TV tracker with you – they'll be happy to help!

---

## Stopping the TV Tracker

When you're done using the TV tracker:
1. Close your web browser
2. In both Command Prompt/Terminal windows, press **Ctrl + C** (or **Command + C** on Mac)
3. Close the windows

Your data will be saved and ready for next time!