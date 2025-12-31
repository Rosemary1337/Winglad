<p align="center">
  <img src="img/winglad-sm.png" alt="Winglad Logo" width="150" />
</p>

<h1 align="center">Winglad - Virtual Controller Server</h1>

<p align="center">
    <img src="https://img.shields.io/badge/python-3.7+-blue.svg" alt="Python Version">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
    <img src="https://img.shields.io/badge/version-0.1.0-orange.svg" alt="Version">
    <img src="https://img.shields.io/badge/category-Utility-purple.svg" alt="Category">
</p>

Winglad is a powerful virtual controller server that transforms your smartphone or web-enabled device into a fully customizable gamepad, keyboard, and mouse for Linux. Built with `uinput`, it offers low-latency hardware simulation with a modern, touch-optimized interface.

## Key Features

- **Comprehensive Input Support**:
  - **Xbox 360 Emulation**: Full gamepad support (Analogue Sticks, Triggers, D-Pad, A/B/X/Y, etc.).
  - **Full Keyboard & Mouse**: Map buttons to any keyboard key (A-Z, 0-9, F1-F12, modifiers) or mouse clicks.
  - **Background Trackpad**: Use empty screen space as a mouse trackpad (Tap to Click, Drag right side for Right-Click).

- **Advanced Customization**:
  - **Drag-and-Drop Editor**: Reposition any button or joystick directly on the screen.
  - **Custom Mapping**: Assign any standard gamepad button, keyboard key, or macro to any on-screen control.
  - **Resizable Controls**: Adjust the size of buttons and joysticks to fit your hand logic.
  - **Left Input Options**: Switch the left control zone between **Joystick**, **D-Pad**, or **L/R Buttons** (great for racing/platformers).

- **Motion Controls**:
  - **Gyroscope Mouse**: Aim and look around by moving your phone.
  - **Steering Mode**: Use phone tilt to control an analog axis (perfect for racing games).
  - **Inversion & Sensitivity**: Fine-tune controls with individual sensitivity and axis inversion settings.

- **Seamless Connection**:
  - **QR Code Pairing**: Instantly connect by scanning the QR code displayed in your terminal.
  - **WiFi Local Network**: Low-latency connection over your local WiFi.

## Modes

- **GAMEPAD**: Standard Xbox 360 controller output.
- **WASD**: Maps Left Joystick to W/A/S/D keys (Keyboard emulation for FPS).
- **ARROW**: Maps Left Joystick to Arrow Keys.

## Installation

Winglad can be installed locally using `pip`:

```bash
pip install .
```

## Permissions Setup (Linux)

To simulate hardware input devices, Winglad needs permission to access `/dev/uinput`. Run the setup tool once:

```bash
winglad-setup
```

This will:
1. Load the `uinput` kernel module.
2. Install `udev` rules to allow running without `sudo`.
3. Add your user to the `input` group.

*Note: You may need to log out and back in for group changes to take effect.*

## How to Run

Start the server:

```bash
winglad
```

1. A **QR Code** and URL (e.g., `http://192.168.1.5:8080`) will appear.
2. Scan the code or open the URL on your device.
3. **Usage**:
   - Tap the **⚙ Gear Icon** to open settings.
   - Click "Edit Layout" to move/resize buttons.
   - Click "Add Button" to create new custom controls.
   - Tap any button in "Edit Mode" to rebind its key or function.

## Project Structure

- `winglad/main.py`: Aiohttp Web Server & WebSocket handler.
- `winglad/controller.py`: `uinput` virtual device wrapper & mapping logic.
- `winglad/static/`: Frontend (Client-side JS, HTML, CSS).

## Troubleshooting

- **"uinput module not loaded"**: Run `winglad-setup` or `sudo modprobe uinput`.
- **"No write access to /dev/uinput"**: Run `winglad-setup` and restart your session.
- **Gyro/Steering not working**: Ensure you are accessing via **HTTPS** if not on localhost (browser security restriction), or use a browser that allows sensor access on HTTP (like some Android developer browsers). Since this runs on a local network, HTTP is standard, but some modern mobile browsers are strict about sensors.

## Contributing

Pull requests are open to everyone! If you have ideas for improvements, bug fixes, or new features, feel free to fork the repository and submit a pull request.
