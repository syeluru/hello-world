# Windows 11 always-on setup

This guide turns a Windows 11 touchscreen PC into a fridge display that:

- never sleeps, and comes back on its own after power cuts and Windows Update restarts;
- goes black after 10 minutes without a tap, then wakes as soon as someone taps it or says "Hello assistant".

It takes about 20 minutes.

## Why Windows never turns the screen off

On most Windows 11 touch PCs, when Windows turns the display off, the whole PC drops into *Modern Standby*. In that state, a tap often won't wake it and the microphone stops listening.

So Windows is set to **never** turn the screen off. The dashboard blacks out the screen itself instead. The PC stays fully awake, so a tap or "Hello assistant" wakes it instantly. The tap that wakes the screen only wakes it; it won't check off whatever item was underneath.

To change the timeout, edit `SCREEN_OFF_MINUTES` in `start-kiosk.bat`. Set it to `0` to keep the dashboard on all the time.

> The backlight stays slightly lit on a black screen. That's normal for an LCD and uses only a few watts.

---

## 1. Install the dashboard

1. Install **Node.js LTS** from <https://nodejs.org> (use the default options).
2. Install **Google Chrome**. Edge also works, but Chrome's speech recognition tends to be more reliable.
3. Copy the `fridge-dashboard` folder to `C:\fridge-dashboard`.
4. Double-click `start-kiosk.bat`. The dashboard opens full-screen. To get out, press **Alt+F4**, or plug in a keyboard and press **Ctrl+W**.

## 2. Run the setup script (power settings)

Right-click **`setup-windows.bat`** and choose **Run as administrator**. It:

- sets the screen, sleep, and hibernate timeouts to **Never** while plugged in;
- turns off the password prompt when the PC wakes;
- turns off edge swipes, so a stray swipe can't open widgets or notifications over the dashboard.

At the end it runs `powercfg /a`. If you see **"Standby (S0 Low Power Idle)"**, your PC uses Modern Standby, which is why step 2 matters.

<details>
<summary>Or do it by hand</summary>

- **Settings → System → Power & battery → Screen, sleep & hibernate timeouts**: set every "When plugged in" option to **Never**.
- **Settings → Accounts → Sign-in options → "If you've been away, when should Windows require you to sign in again?"**: **Never**.
</details>

## 3. Sign in automatically (so it recovers after restarts)

Without this, a power cut or update restart leaves the PC stuck at the lock screen.

1. **Settings → Accounts → Sign-in options**:
   - Turn **off** "For improved security, only allow Windows Hello sign-in for Microsoft accounts".
   - **Dynamic lock**: off.
   - Under *Additional settings*, turn **on** "Use my sign-in info to automatically finish setting up after an update".
2. Download **Autologon** from Microsoft Sysinternals (<https://learn.microsoft.com/sysinternals/downloads/autologon>). Run it, enter the account password, and click **Enable**. It works with Microsoft accounts and local accounts, and it stores the password encrypted.

> Tip: a separate local account just for the fridge (e.g. "Kitchen") keeps your personal account off a shared screen.

## 4. Start the dashboard at sign-in

1. Press **Win+R**, type `shell:startup`, and press Enter.
2. Right-click `start-kiosk.bat` → **Show more options → Create shortcut**, then move the shortcut into that Startup folder.

If the server ever crashes, it restarts itself within 5 seconds.

## 5. Keep Windows from getting in the way

- **Windows Update restarts:** Settings → Windows Update → Advanced options → **Active hours** → *Manually*, e.g. 6:00 AM–11:00 PM. Restarts then happen overnight, and steps 3 and 4 bring the dashboard back.
- **Notifications:** Settings → System → Notifications → turn on **Do not disturb**. Under *Additional settings*, uncheck the three "welcome / suggestions / tips" boxes.
- **Screen saver:** Settings → Personalization → Lock screen → Screen saver → **(None)**.
- **Touch gestures:** Settings → Bluetooth & devices → Touch → turn off **Three- and four-finger touch gestures**.
- **Microphone:** Settings → Privacy & security → Microphone → turn on **Microphone access** and **Let desktop apps access your microphone**.
- **Brightness:** Settings → System → Display → turn off **Change brightness based on content**, and pick a comfortable fixed level. The dashboard switches to dark colors from 9pm to 6am.

## 6. Protect the battery (if the PC has one)

A battery kept at 100% around the clock wears out and can swell. Most manufacturers let you cap the charge at about 80%:

| Brand | Where |
|---|---|
| Microsoft Surface | Surface app → Battery → **Smart charging** (or the UEFI "Battery limit" mode) |
| Lenovo | Lenovo Vantage → Power → **Conservation mode** |
| Dell | Dell Power Manager / Dell Optimizer → **Primarily AC use** |
| HP | BIOS → **Adaptive Battery Optimizer** / HP Battery Health Manager |
| ASUS | MyASUS → **Battery Health Charging → Maximum lifespan (60%)** |
| Others | Settings → System → Power & battery → **Smart charging**, if listed |

## 7. Test it

1. Restart the PC. It should sign in on its own and open the dashboard full-screen.
2. Leave it alone for 10 minutes. The screen should go black.
3. Tap it. The dashboard should come back instantly.
4. Let it go black again, then say **"Hello assistant, add milk to the grocery list"**. The screen should wake and Milk should appear on the list.
5. Leave it overnight and check it the next morning.

## Troubleshooting

| Problem | Fix |
|---|---|
| Screen goes dark and a tap doesn't wake it (only the power button does) | Windows turned the display off. Set step 2's screen timeout back to **Never**; the dashboard handles the screen instead. |
| "Tap to allow the microphone" | Check the step 5 microphone settings, then tap the pill in the top-right corner. |
| Voice stops after a while | Usually a network drop, since Chrome's speech recognition runs in the cloud. It retries on its own; tapping the pill restarts it right away. |
| Stuck at the lock screen after a restart | Re-run Autologon (step 3). Windows Update sometimes clears it. |
| Dashboard didn't open after sign-in | Make sure the shortcut is in `shell:startup` and Node.js is installed (`node -v` in Terminal). |

<details>
<summary>Optional: let Windows switch the screen off for real</summary>

This only works on PCs **without** Modern Standby, where `powercfg /a` lists "Standby (S3)" and not "S0 Low Power Idle".

1. Set `SCREEN_OFF_MINUTES=0` in `start-kiosk.bat`. The dashboard then stops holding the screen on.
2. Set Settings → System → Power & battery → "When plugged in, turn off my screen after" to 10 minutes, and leave sleep at **Never**.
3. Test whether a tap wakes the screen. Many touchscreens don't wake from display-off. If yours doesn't, undo these two changes.
</details>
