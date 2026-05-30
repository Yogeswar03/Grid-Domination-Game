# Hex Paint Wars — Game Manual

Welcome to **Hex Paint Wars**, a minimalist, real-time multiplayer territory painting game.

---

## 🎮 Objective
Your goal is simple: paint as many hex cells on the grid in your signature color as you can. Secure the top spot on the leaderboard by maintaining the highest number of painted cells.

---

## ⚡ Game Rules & Mechanics

1. **Paint Any Cell**: Click on any hex cell on the grid to paint it. There are no complex adjacency limits—you can strike anywhere on the map!
2. **Energy Cost**: Painting a cell costs **10 EP** (Energy Points).
   - Your energy reserve caps at **100 EP**.
   - Energy regenerates rapidly at a rate of **10 EP per second** (1 paint stroke per second).
3. **Anti-Spam Cooldown**: To keep gameplay fair and prevent click-bot automation, there is a **200ms cooldown** (max 5 paint actions per second) between strokes. The paint button will display a `RECHARGING...` status if you click too fast.
4. **Tile Decay (Fade & Evaporate)**: Painted cells do not last forever! Every cell has a **10-second lifetime** from when it was last painted.
   - Over the 10 seconds, the cell will smoothly fade in opacity.
   - At the 10-second mark, the cell evaporates back to a neutral gray slate, ready to be painted again.
   - **Pro Tip**: Repaint your existing cells to refresh their 10-second decay timer!

---

## 🏆 How to Win

Each round has two ways to conclude:
*   **Time Limit**: The round runs for **3 minutes (180 seconds)**. When the timer hits `00:00`, the operator with the most painted cells is declared the winner.
*   **Instant Dominance**: If any operator manages to paint **50% of the grid** (1,800 out of 3,600 cells) at the same time, the round ends instantly in their victory.

### Round Reset Loop:
When a round concludes:
1. A fullscreen **Round Concluded** modal overlay displays the winner's call sign, color, and final score.
2. Gameplay is frozen for a **10-second intermission** countdown.
3. Once the countdown hits `0s`, the grid is wiped clean, operator energy is fully restored, and the next 3-minute paint round begins automatically.

---

## 🌐 How to Join & Play with Friends

### Option A: Local Computer (Multiple Tabs)
1. Open your browser and go to `http://localhost:3000`.
2. Enter your operator name, pick a color preset, and click **Deploy**.
3. Open a second browser tab (or window) at `http://localhost:3000`. Enter a different name, choose another color, and click **Deploy**.
4. Both operators are now connected to the same grid! Move your mouse in one window to see your cursor ring sync in real-time in the other.

### Option B: Local Network (Multiple Devices)
To play with friends on the same Wi-Fi or local network:
1. **Find Host IP**: The host player finds their local computer IP address (e.g. `192.168.1.50` on Windows by running `ipconfig` in Command Prompt).
2. **Connect**: Other players open their phone, tablet, or laptop browsers and type `http://<HOST-IP>:3000` (e.g. `http://192.168.1.50:3000`).
3. **Registration**: Once they deploy, their browsers connect to the Next.js frontend, which dynamically initiates a WebSocket sync to the host server at port `3001` (`ws://192.168.1.50:3001`).
4. You will now be painting on the same grid from different devices!

---

## 🤖 Offline Sandbox Mode
If the WebSocket sync server is disconnected, the client automatically defaults to **Offline Sandbox Mode**:
- You play on a local grid populated by **4 AI bots** (*Vanguard Alpha*, *Nebula Core*, *Solaris Unit*, and *Aegis Command*).
- Bots will randomly paint and expand their territories.
- The 10-second decay, 3-minute timer, and round conclusion loops run locally in your browser.
