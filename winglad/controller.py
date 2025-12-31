import uinput

class VirtualController:
    def __init__(self):
        self.events = (
            uinput.BTN_A, uinput.BTN_B, uinput.BTN_X, uinput.BTN_Y,
            uinput.BTN_TL, uinput.BTN_TR,
            uinput.BTN_SELECT, uinput.BTN_START, uinput.BTN_MODE,
            uinput.BTN_THUMBL, uinput.BTN_THUMBR,
            
            uinput.ABS_X + (-32768, 32767, 0, 0),
            uinput.ABS_Y + (-32768, 32767, 0, 0),
            uinput.ABS_RX + (-32768, 32767, 0, 0),
            uinput.ABS_RY + (-32768, 32767, 0, 0),
            uinput.ABS_Z + (0, 255, 0, 0),
            uinput.ABS_RZ + (0, 255, 0, 0),
            uinput.ABS_HAT0X + (-1, 1, 0, 0),
            uinput.ABS_HAT0Y + (-1, 1, 0, 0),

            uinput.KEY_A, uinput.KEY_B, uinput.KEY_C, uinput.KEY_D, uinput.KEY_E, uinput.KEY_F,
            uinput.KEY_G, uinput.KEY_H, uinput.KEY_I, uinput.KEY_J, uinput.KEY_K, uinput.KEY_L,
            uinput.KEY_M, uinput.KEY_N, uinput.KEY_O, uinput.KEY_P, uinput.KEY_Q, uinput.KEY_R,
            uinput.KEY_S, uinput.KEY_T, uinput.KEY_U, uinput.KEY_V, uinput.KEY_W, uinput.KEY_X,
            uinput.KEY_Y, uinput.KEY_Z,
            
            uinput.KEY_1, uinput.KEY_2, uinput.KEY_3, uinput.KEY_4, uinput.KEY_5,
            uinput.KEY_6, uinput.KEY_7, uinput.KEY_8, uinput.KEY_9, uinput.KEY_0,
            
            uinput.KEY_F1, uinput.KEY_F2, uinput.KEY_F3, uinput.KEY_F4, uinput.KEY_F5, uinput.KEY_F6,
            uinput.KEY_F7, uinput.KEY_F8, uinput.KEY_F9, uinput.KEY_F10, uinput.KEY_F11, uinput.KEY_F12,
            
            uinput.KEY_SPACE, uinput.KEY_ENTER, uinput.KEY_BACKSPACE, uinput.KEY_TAB, uinput.KEY_ESC,
            uinput.KEY_LEFTSHIFT, uinput.KEY_RIGHTSHIFT, 
            uinput.KEY_LEFTCTRL, uinput.KEY_RIGHTCTRL,
            uinput.KEY_LEFTALT, uinput.KEY_RIGHTALT,
            uinput.KEY_UP, uinput.KEY_DOWN, uinput.KEY_LEFT, uinput.KEY_RIGHT,
            uinput.KEY_CAPSLOCK, uinput.KEY_NUMLOCK, uinput.KEY_SCROLLLOCK,
            uinput.KEY_HOME, uinput.KEY_END, uinput.KEY_PAGEUP, uinput.KEY_PAGEDOWN,
            uinput.KEY_INSERT, uinput.KEY_DELETE,
            uinput.KEY_COMMA, uinput.KEY_DOT, uinput.KEY_SLASH, uinput.KEY_SEMICOLON,
            uinput.KEY_APOSTROPHE, uinput.KEY_LEFTBRACE, uinput.KEY_RIGHTBRACE, uinput.KEY_BACKSLASH,
            uinput.KEY_MINUS, uinput.KEY_EQUAL, uinput.KEY_GRAVE,

            uinput.REL_X, uinput.REL_Y,
            uinput.BTN_LEFT, uinput.BTN_RIGHT,
        )
        
        self.mode = 'GAMEPAD'
        self.pressed_keys = set()
        
        self.dpad_state = {'UP': 0, 'DOWN': 0, 'LEFT': 0, 'RIGHT': 0}

        try:
            self.device = uinput.Device(self.events, name="Microsoft X-Box 360 pad", 
                                      vendor=0x045e, product=0x028e, bustype=0x03)
            print("Virtual Controller created successfully.")
        except OSError as e:
            print(f"Error creating uinput device: {e}")
            raise e

    def set_mode(self, mode):
        self.mode = mode
        for key in list(self.pressed_keys):
            self.device.emit(key, 0)
        self.pressed_keys.clear()

    def handle_input(self, data):
        if data['type'] == 'mouse_move':
            x = int(data.get('x', 0))
            y = int(data.get('y', 0))
            self.device.emit(uinput.REL_X, x)
            self.device.emit(uinput.REL_Y, y)
            return

        elif data['type'] == 'gyro':
            x = int(data.get('x', 0))
            y = int(data.get('y', 0))
            self.device.emit(uinput.REL_X, x)
            self.device.emit(uinput.REL_Y, y)
            return
        
        elif data['type'] == 'key':
            key_name = data.get('key')
            val = int(data.get('val', 0))
            
            if key_name and (key_name.startswith('KEY_') or key_name.startswith('BTN_')):
                key_code = getattr(uinput, key_name, None)
                if key_code:
                    self.device.emit(key_code, val)
                else:
                    print(f"DEBUG: Unknown key code: {key_name}")
            return

        elif data['type'] == 'mouse_btn':
            btn = uinput.BTN_RIGHT if data.get('id') == 'RIGHT' else uinput.BTN_LEFT
            val = int(data.get('val', 0))
            self.device.emit(btn, val)
            return

        if data['type'] == 'btn':
            if self.mode == 'GAMEPAD':
                btn_map = {
                    'A': uinput.BTN_A, 'B': uinput.BTN_B, 'X': uinput.BTN_X, 'Y': uinput.BTN_Y,
                    'L1': uinput.BTN_TL, 'R1': uinput.BTN_TR,
                    'L3': uinput.BTN_THUMBL, 'R3': uinput.BTN_THUMBR,
                    'START': uinput.BTN_START, 'SELECT': uinput.BTN_SELECT, 'MODE': uinput.BTN_MODE,
                }
                if data['id'] in btn_map:
                    self.device.emit(btn_map[data['id']], int(data['val']))
                
                elif data['id'] == 'L2':
                    self.device.emit(uinput.ABS_Z, 255 if int(data['val']) else 0)
                elif data['id'] == 'R2':
                    self.device.emit(uinput.ABS_RZ, 255 if int(data['val']) else 0)
                
                elif data['id'].startswith('DPAD_'):
                    direction = data['id'].replace('DPAD_', '')
                    self.dpad_state[direction] = int(data['val'])
                    
                    hat_x = self.dpad_state['RIGHT'] - self.dpad_state['LEFT']
                    hat_y = self.dpad_state['DOWN'] - self.dpad_state['UP']
                    
                    self.device.emit(uinput.ABS_HAT0X, hat_x)
                    self.device.emit(uinput.ABS_HAT0Y, hat_y)

            else:
                key_map = {
                    'A': uinput.KEY_SPACE,
                    'B': uinput.KEY_LEFTSHIFT,
                    'X': uinput.KEY_E,
                    'Y': uinput.KEY_R,
                    'L1': uinput.KEY_1,
                    'R1': uinput.KEY_2,
                    'L2': uinput.KEY_Q,
                    'R2': uinput.KEY_F,
                    'START': uinput.KEY_ESC,
                    'SELECT': uinput.KEY_TAB,
                    'DPAD_UP': uinput.KEY_UP,       'DPAD_DOWN': uinput.KEY_DOWN,
                    'DPAD_LEFT': uinput.KEY_LEFT,   'DPAD_RIGHT': uinput.KEY_RIGHT
                }

                if self.mode == 'WASD' and data['id'].startswith('DPAD_'):
                     dpad_map = {
                         'DPAD_UP': uinput.KEY_W,
                         'DPAD_DOWN': uinput.KEY_S,
                         'DPAD_LEFT': uinput.KEY_A,
                         'DPAD_RIGHT': uinput.KEY_D
                     }
                     target_key = dpad_map.get(data['id'])
                else:
                    target_key = key_map.get(data['id'])
                
                if target_key:
                    self.device.emit(target_key, int(data['val']))
        
        elif data['type'] == 'axis':
            if data['id'] == 'LX' or data['id'] == 'LY':
                val = int(data['val'])
                
                if self.mode == 'GAMEPAD':
                    scaled_val = (val - 128) * 256
                    if data['id'] == 'LX': self.device.emit(uinput.ABS_X, scaled_val)
                    elif data['id'] == 'LY': self.device.emit(uinput.ABS_Y, scaled_val)
                
                else:
                    LOW_THRESHOLD = 64
                    HIGH_THRESHOLD = 192
                    
                    key_neg = None
                    key_pos = None
                    
                    if self.mode == 'WASD':
                        if data['id'] == 'LX':
                            key_neg = uinput.KEY_A
                            key_pos = uinput.KEY_D
                        elif data['id'] == 'LY':
                            key_neg = uinput.KEY_W
                            key_pos = uinput.KEY_S
                    
                    elif self.mode == 'ARROW':
                        if data['id'] == 'LX':
                            key_neg = uinput.KEY_LEFT
                            key_pos = uinput.KEY_RIGHT
                        elif data['id'] == 'LY':
                            key_neg = uinput.KEY_UP
                            key_pos = uinput.KEY_DOWN
                    
                    if key_neg and key_pos:
                        if val < LOW_THRESHOLD:
                            if key_neg not in self.pressed_keys:
                                self.device.emit(key_neg, 1)
                                self.pressed_keys.add(key_neg)
                        else:
                            if key_neg in self.pressed_keys:
                                self.device.emit(key_neg, 0)
                                self.pressed_keys.remove(key_neg)
                                
                        if val > HIGH_THRESHOLD:
                            if key_pos not in self.pressed_keys:
                                self.device.emit(key_pos, 1)
                                self.pressed_keys.add(key_pos)
                        else:
                            if key_pos in self.pressed_keys:
                                self.device.emit(key_pos, 0)
                                self.pressed_keys.remove(key_pos)

            elif data['id'] == 'RX': 
                scaled_val = (int(data['val']) - 128) * 256
                self.device.emit(uinput.ABS_RX, scaled_val)
            elif data['id'] == 'RY': 
                scaled_val = (int(data['val']) - 128) * 256
                self.device.emit(uinput.ABS_RY, scaled_val)

        elif data['type'] == 'axes':
            axes = data.get('axes', {})
            if 'LX' in axes:
                val = int(axes['LX'])
                if self.mode == 'GAMEPAD':
                    scaled_val = (val - 128) * 256
                    self.device.emit(uinput.ABS_X, scaled_val, syn=False)
            
            if 'LY' in axes:
                val = int(axes['LY'])
                if self.mode == 'GAMEPAD':
                    scaled_val = (val - 128) * 256
                    self.device.emit(uinput.ABS_Y, scaled_val, syn=False)
            
            if self.mode != 'GAMEPAD':
                if 'LX' in axes: self._handle_axis_logic('LX', int(axes['LX']))
                if 'LY' in axes: self._handle_axis_logic('LY', int(axes['LY']))

            self.device.syn()

    def _handle_axis_logic(self, axis_id, val):
        LOW_THRESHOLD = 64
        HIGH_THRESHOLD = 192
        
        key_neg = None; key_pos = None
        
        if self.mode == 'WASD':
            if axis_id == 'LX': key_neg = uinput.KEY_A; key_pos = uinput.KEY_D
            elif axis_id == 'LY': key_neg = uinput.KEY_W; key_pos = uinput.KEY_S
        elif self.mode == 'ARROW':
            if axis_id == 'LX': key_neg = uinput.KEY_LEFT; key_pos = uinput.KEY_RIGHT
            elif axis_id == 'LY': key_neg = uinput.KEY_UP; key_pos = uinput.KEY_DOWN
            
        if key_neg and key_pos:
            if val < LOW_THRESHOLD:
                if key_neg not in self.pressed_keys:
                    self.device.emit(key_neg, 1)
                    self.pressed_keys.add(key_neg)
            else:
                if key_neg in self.pressed_keys:
                    self.device.emit(key_neg, 0)
                    self.pressed_keys.remove(key_neg)
                    
            if val > HIGH_THRESHOLD:
                if key_pos not in self.pressed_keys:
                    self.device.emit(key_pos, 1)
                    self.pressed_keys.add(key_pos)
            else:
                if key_pos in self.pressed_keys:
                    self.device.emit(key_pos, 0)
                    self.pressed_keys.remove(key_pos)
