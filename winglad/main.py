import aiohttp
from aiohttp import web
from . import controller
import json
import os
import errno
import sys
import subprocess
import qrcode
import netifaces
from pathlib import Path

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
RULES_FILE = BASE_DIR / "99-ctrl-controller.rules"

gamepad = None
init_error = None

def ensure_uinput_ready():
    if not os.path.exists('/dev/uinput'):
        print("uinput device not found. Attempting to load module...")
        try:
            cmd = ["modprobe", "uinput"] if os.getuid() == 0 else ["sudo", "modprobe", "uinput"]
            subprocess.run(cmd, check=True, capture_output=True)
            print("Successfully loaded uinput module.")
        except Exception as e:
            print(f"Failed to load uinput module: {e}")
            return False

    if os.path.exists('/dev/uinput') and not os.access('/dev/uinput', os.W_OK):
        if os.getuid() == 0:
            try:
                os.chmod('/dev/uinput', 0o666)
                print("Adjusted /dev/uinput permissions.")
            except Exception:
                pass
    return True

def initialize_gamepad():
    global gamepad, init_error
    
    ensure_uinput_ready()
    
    try:
        if os.access('/dev/uinput', os.W_OK):
            gamepad = controller.VirtualController()
        else:
            print("No write access to /dev/uinput. Attempting to fix...")
            ensure_uinput_ready()
            if os.access('/dev/uinput', os.W_OK):
                gamepad = controller.VirtualController()
            else:
                init_error = "No write access to /dev/uinput. Try running 'winglad-setup' to fix permissions permanently."
                print(f"WARNING: {init_error}")

    except OSError as e:
        if e.errno == errno.ENODEV:
            print("Received ENODEV (No such device). This usually means uinput module is not loaded.")
            print("Forcing uinput module reload...")
            
            try:
                cmd = ["modprobe", "uinput"] if os.getuid() == 0 else ["sudo", "modprobe", "uinput"]
                subprocess.run(cmd, check=True, capture_output=True)
                print("Module reload command executed.")
            except Exception as mod_err:
                 print(f"Failed to reload module: {mod_err}")

            try:
                gamepad = controller.VirtualController()
                return
            except Exception as final_e:
                 init_error = f"Still failed after reload: {final_e}"
                 print(f"CRITICAL ERROR: {init_error}")

            init_error = "uinput module not loaded. Run 'winglad-setup' or 'sudo modprobe uinput'."
            print(f"\nCRITICAL ERROR: {init_error}\n")
        else:
            init_error = f"Controller init failed: {e}"
            print(f"Failed to initialize controller: {e}")
    except Exception as e:
        init_error = f"Controller init failed: {e}"
        print(f"Failed to initialize controller: {e}")
    except Exception as e:
        init_error = f"Controller init failed: {e}"
        print(f"Failed to initialize controller: {e}")

async def handle(request):
    return web.FileResponse(STATIC_DIR / 'index.html')

async def websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    print("Client connected")
    
    if not gamepad and init_error:
        await ws.send_json({'type': 'error', 'message': init_error})

    async for msg in ws:
        if msg.type == aiohttp.WSMsgType.TEXT:
            if msg.data == 'close':
                await ws.close()
            else:
                try:
                    data = json.loads(msg.data)
                    if gamepad:
                        if data.get('type') == 'mode':
                            gamepad.set_mode(data.get('mode'))
                        else:
                            gamepad.handle_input(data)
                    else:
                        print("DEBUG: Gamepad is None! Ignoring input.")
                        if init_error:
                             await ws.send_json({'type': 'error', 'message': init_error})
                except Exception as e:
                    print(f"Error handling message: {e}")
        elif msg.type == aiohttp.WSMsgType.ERROR:
            print('ws connection closed with exception %s',
                  ws.exception())

    print('websocket connection closed')
    return ws

def get_local_ip():
    try:
        gws = netifaces.gateways()
        default_gateway = gws.get('default', {}).get(netifaces.AF_INET)
        if default_gateway:
            interface = default_gateway[1]
            addrs = netifaces.ifaddresses(interface)
            return addrs[netifaces.AF_INET][0]['addr']
    except Exception:
        pass
    
    for interface in netifaces.interfaces():
        try:
            addrs = netifaces.ifaddresses(interface)
            if netifaces.AF_INET in addrs:
                for addr_info in addrs[netifaces.AF_INET]:
                    ip = addr_info['addr']
                    if not ip.startswith('127.'):
                        return ip
        except Exception:
            continue
    return '127.0.0.1'

def setup_permissions():
    print("Setting up permissions for Winglad...")
    
    commands = [
        ["sudo", "modprobe", "uinput"],
        ["sudo", "cp", str(RULES_FILE), "/etc/udev/rules.d/"],
        ["sudo", "udevadm", "control", "--reload-rules"],
        ["sudo", "udevadm", "trigger"],
        ["sudo", "chmod", "666", "/dev/uinput"]
    ]
    
    for cmd in commands:
        print(f"Running: {' '.join(cmd)}")
        try:
            subprocess.run(cmd, check=True)
        except subprocess.CalledProcessError as e:
            print(f"Error running command: {e}")
            sys.exit(1)
            
    user = os.environ.get('SUDO_USER') or os.environ.get('USER')
    print(f"Adding user {user} to 'input' group...")
    try:
        subprocess.run(["sudo", "usermod", "-aG", "input", user], check=True)
        print("Done! You may need to logout and login for group changes to take effect.")
    except subprocess.CalledProcessError:
        print("Warning: Could not add user to input group.")

    print("\nPermissions setup complete. You can now run 'winglad'.")

def main():
    initialize_gamepad()
    
    app = web.Application()
    app.router.add_get('/', handle)
    app.router.add_get('/ws', websocket_handler)
    app.router.add_static('/static/', path=STATIC_DIR, name='static')

    host = '0.0.0.0'
    port = 8080
    
    local_ip = get_local_ip()
    url = f"http://{local_ip}:{port}"
    
    print(f"\nServer starting on http://{host}:{port}")
    print(f"Local access URL: {url}")
    print("\nScan this QR code to connect:\n")
    
    qr = qrcode.QRCode()
    qr.add_data(url)
    qr.make(fit=True)
    qr.print_ascii(invert=True)
    
    try:
        web.run_app(app, host=host, port=port, print=None)
    except KeyboardInterrupt:
        print("\nExiting...")

if __name__ == '__main__':
    main()
