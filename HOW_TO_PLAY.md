# Hex Paint Wars — Game Manual

Welcome to **Hex Paint Wars**, a minimalist, real-time multiplayer territory painting game.

---

## 🎮 How to Play

1. **Designation**: Enter your Operator username and choose a color, then click **DEPLOY**.
2. **Paint Grid**: Click or tap on any hex cell on the board to paint it in your signature color.
3. **Energy (EP)**:
   - Painting a cell costs **10 EP**.
   - Your energy regenerates rapidly at a rate of **10 EP per second** (up to 100 EP).
4. **Anti-Spam Limiter**: There is a **200ms cooldown** between paint actions (maximum 5 clicks/second). Clicking too fast triggers a recharge lock.
5. **Tile Decay**: Every painted cell lasts for **10 seconds**.
   - Over 10 seconds, the cell will smoothly fade in opacity on the canvas.
   - At the 10-second mark, the cell reverts to a neutral slate unless repainted to refresh its timer.

---

## 🏆 How to Win

Each round has two end conditions:
*   **Time Limit**: The round runs for **3 minutes (180 seconds)**. When the timer hits `00:00`, the player with the most painted cells wins.
*   **Grid Dominance**: If any player captures **50% of the entire grid** (1,800 out of 3,600 cells) simultaneously, they win instantly.

When a round ends:
1. A victory screen overlays showing the winner and final scores.
2. Gameplay freezes for a **10-second intermission lobby**.
3. After 10 seconds, the board is wiped clean, energy is reset, and the next round begins.

---

## 🌐 How Other Players Can Join (Multiplayer)

### Option A: Local Network / Wi-Fi (Multi-Device)
1. **Find Host IP**: The host player finds their local computer IP address (e.g. `192.168.1.50`).
2. **Connect**: Other players open their browser on their phones, tablets, or laptops on the same Wi-Fi and type:
   `http://<HOST-IP>:3000` (e.g., `http://192.168.1.50:3000`)
3. **Play**: Once they deploy, their browser dynamically connects to the frontend and initiates WebSocket sync to the host on port 3001.

### Option B: Local PC (Multiple Tabs)
1. Open `http://localhost:3000` in your browser.
2. Open another tab or an incognito window at `http://localhost:3000`.
3. Choose a different name and color, and paint on the same grid in real-time.

---

## 🤖 Offline Sandbox Mode
If the WebSocket server is offline, the client defaults to **Sandbox Mode**:
- You play against **4 AI bots** (*Vanguard Alpha*, *Nebula Core*, *Solaris Unit*, and *Aegis Command*).
- Bots automatically paint and decay tiles, and victory calculations run locally.
