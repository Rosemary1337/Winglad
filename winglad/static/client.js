const ws = new WebSocket('ws://' + window.location.host + '/ws');

ws.onclose = () => console.log('Disconnected');

function send(data) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

ws.onmessage = (event) => {
    try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'error') {
            alert("Controller Error: " + msg.message);
        }
    } catch (e) {
        console.error("Failed to parse message", e);
    }
};

let editMode = false;
let currentConfigBtn = null;

let leftInputStyle = 'JOYSTICK';
let elementSizes = {};
let gyroEnabled = false;
let gyroSensitivity = 5;
let steerSensitivity = 10;
let gyroInvertX = false;
let gyroInvertY = false;
let showDebug = false;
let globalLX = 128;
let globalLY = 128;

let debugInfo = { gyro: "", steer: "" };
function updateDebugDisplay() {
    if (!showDebug) return;
    const d = document.getElementById('gyro-debug');
    if (!d) return;
    let parts = [];
    if (debugInfo.gyro) parts.push(debugInfo.gyro);
    if (debugInfo.steer) parts.push(debugInfo.steer);
    d.innerText = parts.join("\n——————\n");
}

function loadLayout() {
    const savedLayout = localStorage.getItem('ctrl_layout');
    const savedLeftStyle = localStorage.getItem('ctrl_left_style');
    const savedSizes = localStorage.getItem('ctrl_sizes');

    if (savedLayout) {
        document.getElementById('right-zone').innerHTML = savedLayout;
    }

    if (savedLeftStyle) leftInputStyle = savedLeftStyle;
    if (savedSizes) elementSizes = JSON.parse(savedSizes);

    setDropdownValue('left-input-style', leftInputStyle);


    if (elementSizes['JOYSTICK']) {
        document.getElementById('joystick-size-input').value = elementSizes['JOYSTICK'];
    }

    const savedGyroSens = localStorage.getItem('ctrl_gyro_sens');
    const savedSteerSens = localStorage.getItem('ctrl_steer_sens');
    const savedInvertX = localStorage.getItem('ctrl_invert_x');
    const savedInvertY = localStorage.getItem('ctrl_invert_y');
    const savedShowDebug = localStorage.getItem('ctrl_show_debug');

    if (savedGyroSens) {
        gyroSensitivity = parseInt(savedGyroSens);
        document.getElementById('gyro-sensitivity-input').value = gyroSensitivity;
    }
    if (savedSteerSens) {
        steerSensitivity = parseInt(savedSteerSens);
        document.getElementById('steer-sensitivity-input').value = steerSensitivity;
    }

    if (savedInvertX !== null) {
        gyroInvertX = savedInvertX === 'true';
        document.getElementById('gyro-invert-x-check').checked = gyroInvertX;
    }
    if (savedInvertY !== null) {
        gyroInvertY = savedInvertY === 'true';
        document.getElementById('gyro-invert-y-check').checked = gyroInvertY;
    }
    if (savedShowDebug !== null) {
        showDebug = savedShowDebug === 'true';
        document.getElementById('show-debug-check').checked = showDebug;
        document.getElementById('gyro-debug').style.display = showDebug ? 'block' : 'none';
    }

    renderLeftZone();
    reattachListeners();
}

function saveLayout() {
    localStorage.setItem('ctrl_layout', document.getElementById('right-zone').innerHTML);
    localStorage.setItem('ctrl_left_style', leftInputStyle);
    localStorage.setItem('ctrl_sizes', JSON.stringify(elementSizes));
    localStorage.setItem('ctrl_gyro_sens', gyroSensitivity);
    localStorage.setItem('ctrl_steer_sens', steerSensitivity);
    localStorage.setItem('ctrl_invert_x', gyroInvertX);
    localStorage.setItem('ctrl_invert_y', gyroInvertY);
    localStorage.setItem('ctrl_show_debug', showDebug);
}

function setupCustomDropdowns() {
    const dropdowns = document.querySelectorAll('.custom-select');

    dropdowns.forEach(dropdown => {
        const selectedDisplay = dropdown.querySelector('.selected-value');
        const optionsList = dropdown.querySelector('.options-list');
        const options = dropdown.querySelectorAll('.option');

        selectedDisplay.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select').forEach(other => {
                if (other !== dropdown) other.classList.remove('open');
            });
            dropdown.classList.toggle('open');
        };

        options.forEach(option => {
            option.onclick = (e) => {
                e.stopPropagation();
                const value = option.getAttribute('data-value');
                const text = option.innerText;

                selectedDisplay.innerText = text;
                dropdown.setAttribute('data-value', value);
                dropdown.classList.remove('open');

                handleDropdownChange(dropdown.id, value);
            };
        });
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select').forEach(d => d.classList.remove('open'));
    });
}

function setDropdownValue(id, value) {
    const dropdown = document.getElementById(id);
    if (!dropdown) return;

    const options = dropdown.querySelectorAll('.option');
    let foundText = null;
    options.forEach(opt => {
        if (opt.getAttribute('data-value') === value) foundText = opt.innerText;
    });

    if (foundText) {
        dropdown.querySelector('.selected-value').innerText = foundText;
        dropdown.setAttribute('data-value', value);
    }
}

function handleDropdownChange(id, value) {
    if (id === 'left-input-style') {
        leftInputStyle = value;
        renderLeftZone();
        saveLayout();
        reattachListeners();
    } else if (id === 'joystick-mode-select') {
        setMode(value);
    }
}

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const configModal = document.getElementById('config-modal');
const container = document.getElementById('container');

settingsBtn.onclick = () => settingsModal.style.display = 'flex';
document.getElementById('close-settings-btn').onclick = () => settingsModal.style.display = 'none';
document.getElementById('close-config-btn').onclick = () => configModal.style.display = 'none';

setupCustomDropdowns();

document.getElementById('toggle-edit-btn').onclick = () => {
    editMode = !editMode;
    document.body.classList.toggle('edit-mode', editMode);
    settingsModal.style.display = 'none';
};

document.getElementById('reset-layout-btn').onclick = () => {
    if (confirm('Reset layout to default?')) {
        localStorage.removeItem('ctrl_layout');
        localStorage.removeItem('ctrl_left_style');
        localStorage.removeItem('ctrl_sizes');
        location.reload();
    }
};

document.getElementById('add-btn-btn').onclick = () => {
    const btn = document.createElement('button');
    btn.className = 'game-btn';
    btn.innerText = 'N';
    btn.setAttribute('data-id', 'A');
    btn.style.top = '50%';
    btn.style.left = '50%';
    btn.style.position = 'absolute';
    document.getElementById('right-zone').appendChild(btn);
    attachButtonListeners(btn);
    settingsModal.style.display = 'none';
    saveLayout();
};


document.getElementById('joystick-size-input').oninput = (e) => {
    const size = e.target.value;
    elementSizes['JOYSTICK'] = size;
    const joystickArea = document.getElementById('joystick-area');
    if (joystickArea) {
        joystickArea.style.width = size + 'px';
        joystickArea.style.height = size + 'px';
    }
};
document.getElementById('joystick-size-input').onchange = () => saveLayout();


document.getElementById('joystick-size-input').onchange = () => saveLayout();

document.getElementById('gyro-enabled-check').onchange = (e) => {
    gyroEnabled = e.target.checked;
    if (gyroEnabled) {
        requestGyroPermission();
    } else {
        debugInfo.gyro = "";
        updateDebugDisplay();
    }
};

let steeringEnabled = false;
let initialSteerValue = null;
let prevValX = 128;

document.getElementById('steering-enabled-check').onchange = (e) => {
    steeringEnabled = e.target.checked;
    initialSteerValue = null;
    if (!steeringEnabled) {
        globalLX = 128;
        send({ type: 'axes', axes: { 'LX': 128, 'LY': globalLY } });
        debugInfo.steer = "";
        updateDebugDisplay();
    }
    if (steeringEnabled) requestSteeringPermission();
};

document.getElementById('gyro-invert-x-check').onchange = (e) => {
    gyroInvertX = e.target.checked;
    saveLayout();
};
document.getElementById('gyro-invert-y-check').onchange = (e) => {
    gyroInvertY = e.target.checked;
    saveLayout();
};
document.getElementById('show-debug-check').onchange = (e) => {
    showDebug = e.target.checked;
    document.getElementById('gyro-debug').style.display = showDebug ? 'block' : 'none';
    if (showDebug) updateDebugDisplay();
    saveLayout();
};

document.getElementById('fullscreen-check').onchange = (e) => {
    if (e.target.checked) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
};

document.addEventListener('fullscreenchange', () => {
    document.getElementById('fullscreen-check').checked = !!document.fullscreenElement;
});
document.addEventListener('webkitfullscreenchange', () => {
    document.getElementById('fullscreen-check').checked = !!document.webkitFullscreenElement;
});
document.addEventListener('mozfullscreenchange', () => {
    document.getElementById('fullscreen-check').checked = !!document.mozFullScreenElement;
});
document.addEventListener('MSFullscreenChange', () => {
    document.getElementById('fullscreen-check').checked = !!document.msFullscreenElement;
});

document.getElementById('gyro-sensitivity-input').oninput = (e) => {
    gyroSensitivity = parseInt(e.target.value);
};
document.getElementById('gyro-sensitivity-input').onchange = () => saveLayout();

document.getElementById('steer-sensitivity-input').oninput = (e) => {
    steerSensitivity = parseInt(e.target.value);
};
document.getElementById('steer-sensitivity-input').onchange = () => saveLayout();



let gyroLastUpdate = 0;

function handleMotion(e) {
    if (!gyroEnabled) return;

    const now = Date.now();
    if (now - gyroLastUpdate < 16) return;
    gyroLastUpdate = now;

    const rate = e.rotationRate;
    if (!rate) return;

    const mult = gyroSensitivity * 0.1;

    let dx = 0;
    let dy = 0;

    if (rate.alpha !== null) dx = -rate.alpha * mult;
    if (rate.beta !== null) dy = -rate.beta * mult;

    if (gyroInvertX) dx = -dx;
    if (gyroInvertY) dy = -dy;

    if (Math.abs(dx) < 0.2) dx = 0;
    if (Math.abs(dy) < 0.2) dy = 0;

    if (showDebug) {
        const makeBar = (val, max, size = 15) => {
            const p = Math.floor(Math.max(0, Math.min(size, ((val / max) + 1) * 0.5 * size)));
            let b = "";
            for (let i = 0; i <= size; i++) b += (i === p) ? "●" : "—";
            return b;
        };

        const maxRate = 10;
        const barX = makeBar(rate.alpha || 0, maxRate);
        const barY = makeBar(rate.beta || 0, maxRate);

        debugInfo.gyro = `GYRO (Mouse Look)\n` +
            `X: [${barX}] (${dx.toFixed(1)})\n` +
            `Y: [${barY}] (${dy.toFixed(1)})\n` +
            `Sens: ${gyroSensitivity} | Inv: ${gyroInvertX ? 'X' : ''}${gyroInvertY ? 'Y' : ''}`;
        updateDebugDisplay();
    }

    if (dx !== 0 || dy !== 0) {
        send({ type: 'gyro', x: Math.round(dx), y: Math.round(dy) });
    }
}


function requestGyroPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    window.addEventListener('devicemotion', handleMotion);
                } else {
                    alert('Gyro permission denied');
                    gyroEnabled = false;
                    document.getElementById('gyro-enabled-check').checked = false;
                }
            })
            .catch(console.error);
    } else {
        window.addEventListener('devicemotion', handleMotion);
    }
}

function handleSteering(e) {
    if (!steeringEnabled) {
        return;
    }

    const debug = document.getElementById('gyro-debug');

    const isLandscape = window.innerWidth > window.innerHeight;
    let steerValue = isLandscape ? e.beta : e.gamma;

    if (steerValue === null) {
        if (showDebug) {
            debugInfo.steer = "STEER: No Orientation Data";
            updateDebugDisplay();
        }
        return;
    }

    if (initialSteerValue === null) {
        initialSteerValue = steerValue;
    }

    let relSteer = (steerValue - initialSteerValue);

    const MAX_TILT = Math.max(5, 70 - (steerSensitivity * 2.5));
    const delta = Math.max(-MAX_TILT, Math.min(MAX_TILT, relSteer));

    let rawValX = ((delta / MAX_TILT) + 1) * 127.5;

    const alpha = 0.25;
    let valX = prevValX + (rawValX - prevValX) * alpha;
    prevValX = valX;

    valX = Math.floor(Math.max(0, Math.min(255, valX)));

    if (Math.abs(valX - 128) < 10) valX = 128;

    if (showDebug) {
        const barSize = 15;
        const pos = Math.floor((valX / 255) * barSize);
        let bar = "";
        for (let i = 0; i <= barSize; i++) {
            bar += (i === pos) ? "●" : "—";
        }

        debugInfo.steer = `WHEEL (${isLandscape ? 'Landscape' : 'Portrait'})\n` +
            `Raw-B: ${e.beta ? e.beta.toFixed(1) : 0}° (Steer)\n` +
            `Raw-G: ${e.gamma ? e.gamma.toFixed(1) : 0}° (Pitch)\n` +
            `Rel Steer: ${relSteer.toFixed(1)}° (Max: ±${MAX_TILT.toFixed(1)}°)\n` +
            `OUT: [${bar}] (${valX})`;
        updateDebugDisplay();
    }

    globalLX = valX;
    send({ type: 'axes', axes: { 'LX': globalLX, 'LY': globalLY } });
}

function requestSteeringPermission() {
    const debug = document.getElementById('gyro-debug');
    if (showDebug) debug.style.display = 'block';
    debug.innerText = "Steering: Requesting Permission...";

    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        alert("WARNING: Steering (Tilt) requires HTTPS on most mobile browsers!\nIf you see no data, try use HTTPS.");
    }

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    debug.innerText = "Steering: Granted. Tilt your phone!";
                    window.addEventListener('deviceorientation', handleSteering);
                } else {
                    alert('Steering permission denied');
                    debug.innerText = "Steering: Denied";
                    steeringEnabled = false;
                    document.getElementById('steering-enabled-check').checked = false;
                }
            })
            .catch(e => {
                debug.innerText = "Steering: Error " + e;
                console.error(e);
            });
    } else {
        if (window.DeviceOrientationEvent) {
            debug.innerText = "Steering: Active. Tilt your phone!";
            window.addEventListener('deviceorientation', handleSteering);
        } else {
            debug.innerText = "Steering: Not Supported";
            alert("Your device/browser does not support DeviceOrientation.");
        }
    }
}

document.getElementById('save-config-btn').onclick = () => {
    if (currentConfigBtn) {
        currentConfigBtn.innerText = document.getElementById('btn-label-input').value;
        const selectedValue = document.getElementById('btn-id-select').getAttribute('data-value');
        const customKeyInput = document.getElementById('btn-custom-key-input').value;

        if (selectedValue && (selectedValue.startsWith('KEY_') || selectedValue.startsWith('BTN_'))) {
            currentConfigBtn.setAttribute('data-key', selectedValue);
            currentConfigBtn.setAttribute('data-id', 'CUSTOM');
        } else if (selectedValue) {
            currentConfigBtn.setAttribute('data-id', selectedValue);
            currentConfigBtn.removeAttribute('data-key');
        } else if (customKeyInput) {
            currentConfigBtn.setAttribute('data-key', customKeyInput);
            currentConfigBtn.removeAttribute('data-id');
            currentConfigBtn.setAttribute('data-id', 'CUSTOM');
        }

        const newSize = document.getElementById('btn-size-input').value;
        currentConfigBtn.style.width = newSize + 'px';
        currentConfigBtn.style.height = newSize + 'px';
        currentConfigBtn.style.fontSize = (newSize / 2.5) + 'px';

        configModal.style.display = 'none';
        saveLayout();
    }
};

document.getElementById('delete-btn-btn').onclick = () => {
    if (currentConfigBtn) {
        currentConfigBtn.remove();
        configModal.style.display = 'none';
        saveLayout();
    }
};

function renderLeftZone() {
    const leftZone = document.getElementById('left-zone');
    leftZone.innerHTML = '';

    if (leftInputStyle === 'JOYSTICK') {
        const area = document.createElement('div');
        area.id = 'joystick-area';
        const knob = document.createElement('div');
        knob.id = 'joystick-knob';
        area.appendChild(knob);
        leftZone.appendChild(area);

        if (elementSizes['JOYSTICK']) {
            area.style.width = elementSizes['JOYSTICK'] + 'px';
            area.style.height = elementSizes['JOYSTICK'] + 'px';
        }

    } else if (leftInputStyle === 'DPAD') {
        const container = document.createElement('div');
        container.className = 'dpad-container';

        const directions = [
            { id: 'DPAD_UP', cls: 'dpad-up', label: '▲' },
            { id: 'DPAD_LEFT', cls: 'dpad-left', label: '◀' },
            { id: 'DPAD_RIGHT', cls: 'dpad-right', label: '▶' },
            { id: 'DPAD_DOWN', cls: 'dpad-down', label: '▼' }
        ];

        directions.forEach(dir => {
            const btn = document.createElement('button');
            btn.className = `dpad-btn ${dir.cls} game-btn`;
            btn.setAttribute('data-id', dir.id);
            btn.innerText = dir.label;
            container.appendChild(btn);
        });

        leftZone.appendChild(container);

    } else if (leftInputStyle === 'LR_BUTTONS') {
        const container = document.createElement('div');
        container.className = 'lr-container';

        const lBtn = document.createElement('button');
        lBtn.className = 'lr-btn game-btn';
        lBtn.setAttribute('data-id', 'DPAD_LEFT');
        lBtn.innerText = '◀';

        const rBtn = document.createElement('button');
        rBtn.className = 'lr-btn game-btn';
        rBtn.setAttribute('data-id', 'DPAD_RIGHT');
        rBtn.innerText = '▶';

        container.appendChild(lBtn);
        container.appendChild(rBtn);
        leftZone.appendChild(container);
    }
}


function attachButtonListeners(btn) {
    const press = (e) => {
        if (editMode) return;
        e.preventDefault();
        e.stopPropagation();
        btn.classList.add('pressed');

        const customKey = btn.getAttribute('data-key');
        if (customKey) {
            send({ type: 'key', key: customKey, val: 1 });
        } else {
            send({ type: 'btn', id: btn.getAttribute('data-id'), val: 1 });
        }
    };

    const release = (e) => {
        if (editMode) return;
        e.preventDefault();
        e.stopPropagation();
        btn.classList.remove('pressed');

        const customKey = btn.getAttribute('data-key');
        if (customKey) {
            send({ type: 'key', key: customKey, val: 0 });
        } else {
            send({ type: 'btn', id: btn.getAttribute('data-id'), val: 0 });
        }
    };

    btn.addEventListener('touchstart', press);
    btn.addEventListener('touchend', release);
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);

    let isDragging = false;
    let isPotentialTap = false;
    let startX, startY, initialLeft, initialTop;
    const DRAG_THRESHOLD = 5;

    const startDrag = (e, clientX, clientY) => {
        if (!editMode) return;
        e.stopPropagation();
        e.preventDefault();

        isDragging = false;
        isPotentialTap = true;
        startX = clientX;
        startY = clientY;
        initialLeft = btn.offsetLeft;
        initialTop = btn.offsetTop;
    };

    btn.addEventListener('touchstart', (e) => startDrag(e, e.touches[0].clientX, e.touches[0].clientY));
    btn.addEventListener('mousedown', (e) => {
        if (e.button === 0) startDrag(e, e.clientX, e.clientY);
    });

    const moveDrag = (clientX, clientY) => {
        if (!editMode) return;
        if (!isDragging && !isPotentialTap) return;

        const dx = clientX - startX;
        const dy = clientY - startY;

        if (isPotentialTap) {
            if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
                isDragging = true;
                isPotentialTap = false;
            } else {
                return;
            }
        }

        if (isDragging) {
            btn.style.left = `${initialLeft + dx}px`;
            btn.style.top = `${initialTop + dy}px`;
        }
    }

    btn.addEventListener('touchmove', (e) => {
        if (editMode) e.preventDefault();
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    });

    const mouseMoveHandler = (e) => moveDrag(e.clientX, e.clientY);
    document.addEventListener('mousemove', mouseMoveHandler);


    const endDrag = () => {
        if (editMode && isPotentialTap) {
            currentConfigBtn = btn;
            document.getElementById('btn-label-input').value = btn.innerText;

            const currentId = btn.getAttribute('data-id');
            const currentKey = btn.getAttribute('data-key');

            if (currentKey) {
                setDropdownValue('btn-id-select', "");
                setDropdownValue('btn-id-select', currentKey);

                if (document.getElementById('btn-id-select').getAttribute('data-value') !== currentKey) {
                    document.getElementById('btn-custom-key-input').value = currentKey;
                } else {
                    document.getElementById('btn-custom-key-input').value = "";
                }
            } else {
                setDropdownValue('btn-id-select', currentId);
                document.getElementById('btn-custom-key-input').value = "";
            }

            const currentSize = parseInt(window.getComputedStyle(btn).width);
            document.getElementById('btn-size-input').value = currentSize;
            configModal.style.display = 'flex';
        }

        if (isDragging) {
            isDragging = false;
            saveLayout();
        }
        isPotentialTap = false;
    };

    btn.addEventListener('touchend', endDrag);
    document.addEventListener('mouseup', (e) => {
        if (isDragging || isPotentialTap) endDrag();
    });
}

function reattachListeners() {
    document.querySelectorAll('.game-btn').forEach(attachButtonListeners);

    if (leftInputStyle === 'JOYSTICK') {
        attachJoystickListeners();
    }
}

function attachJoystickListeners() {
    const joystickArea = document.getElementById('joystick-area');
    if (!joystickArea) return;

    const joystickKnob = document.getElementById('joystick-knob');
    let joystickTouchId = null;

    const size = joystickArea.offsetWidth;
    const maxDist = (size / 2) * 0.6;

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    joystickArea.addEventListener('touchstart', (e) => {
        if (editMode) {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.touches[0];
            isDragging = true;
            startX = touch.clientX;
            startY = touch.clientY;
            initialLeft = joystickArea.offsetLeft;
            initialTop = joystickArea.offsetTop;
            return;
        }

        e.preventDefault();

        if (joystickTouchId !== null) return;

        const touch = e.changedTouches[0];
        joystickTouchId = touch.identifier;

        joystickArea.classList.add('active');
        const rect = joystickArea.getBoundingClientRect();
        updateJoystick(touch.clientX, touch.clientY, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }, { passive: false });

    joystickArea.addEventListener('touchmove', (e) => {
        if (editMode) {
            if (!isDragging) return;
            e.preventDefault();
            const touch = e.touches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            joystickArea.style.left = `${initialLeft + dx}px`;
            joystickArea.style.top = `${initialTop + dy}px`;
            return;
        }

        if (joystickTouchId === null) return;
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickTouchId) {
                const touch = e.changedTouches[i];
                const rect = joystickArea.getBoundingClientRect();
                updateJoystick(touch.clientX, touch.clientY, rect.left + rect.width / 2, rect.top + rect.height / 2);
                break;
            }
        }
    }, { passive: false });

    const resetJoystick = () => {
        joystickTouchId = null;
        joystickArea.classList.remove('active');
        joystickKnob.style.transform = `translate(-50%, -50%)`;
        globalLY = 128;
        if (!steeringEnabled) globalLX = 128;
        send({ type: 'axes', axes: { 'LX': globalLX, 'LY': globalLY } });
    };

    joystickArea.addEventListener('touchend', (e) => {
        if (editMode) {
            if (isDragging) {
                isDragging = false;
                saveLayout();
            }
            return;
        }

        if (joystickTouchId === null) return;
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickTouchId) {
                resetJoystick();
                break;
            }
        }
    });

    joystickArea.addEventListener('touchcancel', (e) => {
        if (joystickTouchId !== null) {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === joystickTouchId) {
                    resetJoystick();
                    break;
                }
            }
        }
    });

    joystickArea.addEventListener('mousedown', (e) => {
        if (!editMode) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = joystickArea.offsetLeft;
        initialTop = joystickArea.offsetTop;

        const onMove = (moveEvent) => {
            if (!isDragging) return;
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            joystickArea.style.left = `${initialLeft + dx}px`;
            joystickArea.style.top = `${initialTop + dy}px`;
        };

        const onUp = () => {
            isDragging = false;
            saveLayout();
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });

    function updateJoystick(touchX, touchY, centerX, centerY) {
        let dx = touchX - centerX;
        let dy = touchY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDist) {
            const angle = Math.atan2(dy, dx);
            dx = Math.cos(angle) * maxDist;
            dy = Math.sin(angle) * maxDist;
        }
        joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        const valX = Math.floor(((dx / maxDist) + 1) * 127.5);
        const valY = Math.floor(((dy / maxDist) + 1) * 127.5);

        globalLY = valY;
        if (!steeringEnabled) {
            globalLX = valX;
        }

        send({ type: 'axes', axes: { 'LX': globalLX, 'LY': globalLY } });
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        globalLX = 128;
        globalLY = 128;
        send({ type: 'axes', axes: { 'LX': 128, 'LY': 128 } });
    }
});

let currentMode = localStorage.getItem('ctrl_mode') || 'GAMEPAD';
setDropdownValue('joystick-mode-select', currentMode);

function setMode(mode) {
    currentMode = mode;
    localStorage.setItem('ctrl_mode', mode);
    send({ type: 'mode', mode: mode });
}

ws.onopen = () => {
    console.log('Connected to WebSocket');
    setMode(currentMode);
};

function attachBackgroundListeners() {
    const bg = document.getElementById('container');
    let bgTouchId = null;
    let bgTouchMode = null;
    let lastX = 0, lastY = 0;
    let startX = 0, startY = 0;
    let startTime = 0;
    const SENSITIVITY = 1.5;
    const TAP_THRESHOLD = 10;
    const TAP_TIME = 200;

    bg.addEventListener('touchstart', (e) => {
        if (editMode) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const target = touch.target;

            const isControl = target.closest('.game-btn') ||
                target.closest('.menu-btn') ||
                target.closest('#joystick-area') ||
                target.closest('#settings-btn') ||
                target.closest('.modal') ||
                target.closest('.dpad-container') ||
                target.closest('.lr-container');

            if (!isControl) {
                if (bgTouchId === null) {
                    bgTouchId = touch.identifier;
                    lastX = touch.clientX;
                    lastY = touch.clientY;
                    startX = touch.clientX;
                    startY = touch.clientY;
                    startTime = Date.now();

                    const screenWidth = window.innerWidth;
                    if (touch.clientX < screenWidth / 2) {
                        bgTouchMode = 'MOVE';
                    } else {
                        bgTouchMode = 'RIGHT_DRAG';
                        send({ type: 'mouse_btn', id: 'RIGHT', val: 1 });
                    }

                    break;
                }
            }
        }
    }, { passive: false });

    bg.addEventListener('touchmove', (e) => {
        if (bgTouchId === null) return;
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === bgTouchId) {
                const touch = e.changedTouches[i];
                const dx = (touch.clientX - lastX) * SENSITIVITY;
                const dy = (touch.clientY - lastY) * SENSITIVITY;

                lastX = touch.clientX;
                lastY = touch.clientY;

                if (dx !== 0 || dy !== 0) {
                    send({ type: 'mouse_move', x: Math.round(dx), y: Math.round(dy) });
                }
                break;
            }
        }
    }, { passive: false });

    const resetBg = (touch) => {
        if (bgTouchMode === 'RIGHT_DRAG') {
            send({ type: 'mouse_btn', id: 'RIGHT', val: 0 });
        } else if (bgTouchMode === 'MOVE' && touch) {
            const dt = Date.now() - startTime;
            const dist = Math.sqrt(Math.pow(touch.clientX - startX, 2) + Math.pow(touch.clientY - startY, 2));

            if (dt < TAP_TIME && dist < TAP_THRESHOLD) {
                send({ type: 'mouse_btn', id: 'LEFT', val: 1 });
                setTimeout(() => {
                    send({ type: 'mouse_btn', id: 'LEFT', val: 0 });
                }, 50);
            }
        }

        bgTouchId = null;
        bgTouchMode = null;
    };

    bg.addEventListener('touchend', (e) => {
        if (bgTouchId === null) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === bgTouchId) {
                resetBg(e.changedTouches[i]);
                break;
            }
        }
    });

    bg.addEventListener('touchcancel', (e) => {
        if (bgTouchId !== null) {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === bgTouchId) {
                    resetBg(null);
                    break;
                }
            }
        }
    });

    bg.addEventListener('mousedown', (e) => {
        const isControl = e.target.closest('.game-btn') ||
            e.target.closest('.menu-btn') ||
            e.target.closest('#joystick-area') ||
            e.target.closest('#settings-btn') ||
            e.target.closest('.modal') ||
            e.target.closest('.dpad-container') ||
            e.target.closest('.lr-container');

        if (isControl) return;
        if (editMode) return;

        bgTouchId = 'mouse';
        lastX = e.clientX;
        lastY = e.clientY;
        startX = e.clientX;
        startY = e.clientY;
        startTime = Date.now();

        if (e.clientX < window.innerWidth / 2) {
            bgTouchMode = 'MOVE';
        } else {
            bgTouchMode = 'RIGHT_DRAG';
            send({ type: 'mouse_btn', id: 'RIGHT', val: 1 });
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (bgTouchId !== 'mouse') return;
        e.preventDefault();

        const dx = (e.clientX - lastX) * SENSITIVITY;
        const dy = (e.clientY - lastY) * SENSITIVITY;

        lastX = e.clientX;
        lastY = e.clientY;

        if (dx !== 0 || dy !== 0) {
            send({ type: 'mouse_move', x: Math.round(dx), y: Math.round(dy) });
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (bgTouchId === 'mouse') {
            resetBg(e);
        }
    });
}

loadLayout();
attachBackgroundListeners();
