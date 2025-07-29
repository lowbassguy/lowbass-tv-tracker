# TV Tracker – How to Put It Online (Cloud Hosting)

This guide explains **in simple terms** how to put your TV tracker on the internet so you can access it from anywhere – your phone, work computer, or a friend's house.

---

## What is Cloud Hosting?

**Cloud hosting** means putting your TV tracker on someone else's computer (called a "server") that's connected to the internet 24/7. Instead of running it on your own computer, it runs "in the cloud" and you access it through a web address.

**Why would you want this?**
- Access your TV tracker from anywhere with internet
- Don't need to leave your computer running all the time
- Can share it with family members (if you want)
- No need to install anything on your computer

**The best part:** These hosting companies do all the technical work for you! You just click a button and they automatically set everything up.

---

## Which Hosting Service Should You Choose?

Here are your options, from easiest to most advanced:

| Service | Cost | Best For |
|---------|------|----------|
| **Railway** | Free (with limits) | First-time users, beginners |
| **Render** | Free (with limits) | People who want reliability |
| **Heroku** | ~$7/month | People who don't mind paying for premium service |

**Recommendation:** Start with Railway – it's the easiest and free!

---

## Option 1: Railway (Recommended for Beginners)

Railway is like a "magic button" that sets up your TV tracker online automatically.

### Step-by-Step Instructions:

1. **Click this button:** [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/tvmaze-tracker)

2. **Create an account:**
   - You'll be asked to sign up or log in
   - You can use your Google account or create a new account
   - This is free!

3. **Connect to GitHub:**
   - Railway will ask to connect to GitHub (where the TV tracker code lives)
   - Click "Authorize Railway" when asked
   - Don't worry – they're not going to mess with your other stuff

4. **Set up your project:**
   - Railway will show you a form
   - You can leave most settings as they are
   - Give your project a name like "My TV Tracker"

5. **Add password protection (recommended):**
   - Look for "Environment Variables" or "Variables" section
   - Add these two:
     - Name: `AUTH_USERNAME`, Value: choose any username you want
     - Name: `AUTH_PASSWORD`, Value: choose a strong password
   - **Important:** Write these down somewhere safe!

6. **Deploy!**
   - Click the "Deploy" button
   - Railway will spend about 3-5 minutes setting everything up
   - You'll see lots of technical messages – ignore them, they're normal

7. **Get your web address:**
   - When it's done, Railway will give you a web address (URL)
   - It will look something like: `https://your-tv-tracker.up.railway.app`
   - Click on it and your TV tracker will open!

**What you get for free:**
- 500 hours per month (about 16 hours per day)
- $5 in credit
- More than enough for personal use

---

## Option 2: Render (Good Alternative)

Render is another reliable hosting service that's beginner-friendly.

### Step-by-Step Instructions:

1. **Click this button:** [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

2. **Create a Render account:**
   - Sign up for free using your email or Google account

3. **Connect GitHub:**
   - Render will ask to connect to your GitHub account
   - Click "Connect GitHub" and authorize Render

4. **Configure your service:**
   - Render will show you a setup form
   - Most settings can stay as default
   - Give your service a name like "My TV Tracker"

5. **Set up permanent storage (important!):**
   - In the Render dashboard, look for "Disks" 
   - Click "Add Disk"
   - Name: `tv-tracker-data`
   - Mount Path: `/var/data`
   - Size: 1GB (this is free)
   - **Why this matters:** Without this, you'll lose your TV show data when Render updates your app

6. **Add password protection:**
   - Look for "Environment Variables"
   - Add these:
     - `AUTH_USERNAME` = your chosen username
     - `AUTH_PASSWORD` = your chosen password
     - `DB_PATH` = `/var/data/tv-tracker.db`

7. **Deploy:**
   - Click "Deploy"
   - Wait 5-10 minutes for setup to complete
   - Render will give you a web address when it's ready

**What you get for free:**
- 750 hours per month
- Basic service with some limitations
- Good for personal use

---

## Option 3: Heroku (Premium Option)

Heroku is a paid service but very reliable and professional.

### Step-by-Step Instructions:

1. **Click this button:** [![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

2. **Create Heroku account:**
   - You'll need to provide a credit card, but they won't charge it immediately
   - The minimum cost is about $7/month

3. **Configure your app:**
   - Give your app a name (this will be part of your web address)
   - Choose a region close to you

4. **Add password protection:**
   - In the "Config Variables" section, add:
     - `AUTH_USERNAME` = your username
     - `AUTH_PASSWORD` = your password

5. **Deploy:**
   - Click "Deploy app"
   - Wait for deployment to complete
   - Your app will be available at `https://your-app-name.herokuapp.com`

**Cost:** About $7-10 per month, but very reliable and fast.

---

## Setting Up Password Protection (Important!)

**Why you need this:** Once your TV tracker is online, anyone who knows the web address could potentially access it. Adding a username and password keeps it private.

**For all services above:**
1. Look for "Environment Variables" or "Config Variables"
2. Add these two variables:
   - `AUTH_USERNAME` = any username you want (like "john" or "mytracker")
   - `AUTH_PASSWORD` = a strong password (at least 12 characters, mix of letters, numbers, symbols)

**Write these down!** You'll need them every time you want to access your TV tracker.

---

## After Your TV Tracker is Online

### Accessing Your TV Tracker:
1. Go to the web address your hosting service gave you
2. Enter the username and password you set up
3. Start tracking your shows!

### Sharing with Family:
- Give them the web address and login details
- Everyone can use the same account
- All your show data will be shared between users

### Managing Your Account:
- You can log into Railway/Render/Heroku anytime to check usage
- You can change your password or other settings
- Most services will email you if there are any issues

---

## Troubleshooting Common Problems

### "App won't start" or "Application Error"
**What this means:** Something went wrong during setup.
**How to fix it:**
1. Go to your hosting service's dashboard
2. Look for "Logs" or "Build Logs"
3. If you see red text, that's the error
4. Contact the person who shared this tracker with you for help

### "Can't save shows" or "Shows disappear"
**What this means:** Your data storage isn't set up correctly.
**How to fix it:**
- **For Render:** Make sure you added the "Disk" (see Option 2, step 5)
- **For Railway/Heroku:** Contact support or the person who shared this with you

### "Forgot my password"
**How to fix it:**
1. Go to your hosting service dashboard
2. Find "Environment Variables" or "Config Variables"
3. Change the `AUTH_PASSWORD` value to a new password
4. Restart/redeploy your app
5. Use the new password to log in

### "Website is slow"
**What this means:** Free hosting tiers sometimes "sleep" when not used.
**How to fix it:**
- The first visit each day might be slow (30-60 seconds)
- After that, it should be fast
- This is normal for free hosting

### "Monthly limits exceeded"
**What this means:** You've used up your free hours for the month.
**How to fix it:**
- Wait until next month for free hours to reset
- Or upgrade to a paid plan for unlimited usage

---

## Cost Breakdown

### Railway (Free Tier):
- **Cost:** $0
- **Limits:** 500 hours/month + $5 credit
- **Good for:** 1-2 people using occasionally

### Render (Free Tier):
- **Cost:** $0  
- **Limits:** 750 hours/month
- **Good for:** Personal use, small family

### Heroku:
- **Cost:** ~$7-10/month
- **Limits:** No hour limits
- **Good for:** Heavy users, always available

---

## Still Need Help?

If you get stuck at any point:
1. **Check the hosting service's help center** – they have guides for common problems
2. **Contact the person who shared this TV tracker** – they'll be familiar with the setup
3. **Don't panic!** These services are designed to be beginner-friendly

**Remember:** Once it's set up, you won't need to think about the technical stuff again. You'll just have a personal TV tracker that works from anywhere!

---

## Privacy and Security Notes

- **Your data is private:** Only people with your username/password can access your TV tracker
- **Your shows are safe:** Hosting services back up your data automatically
- **No one can see your viewing history:** The data stays in your private database
- **You control access:** You can change your password anytime

Enjoy tracking your shows from anywhere! 📺