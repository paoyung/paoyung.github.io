var port, writer, historyIndex = -1;
function getElmt(e) {return document.getElementById(e);}
const lineHistory = [];
const bufferSize = 256;
const eot = new Uint8Array([0xfd, 0xfe, 0xff]);
const btnConn = getElmt("btnConn");

async function connectSerial() {
    try {
        // Prompt user to select any serial port.
        port = await navigator.serial.requestPort(
            { filters: [
                {usbVendorId:0x1a86},   /* CH34X */
                {usbVendorId:0x10c4},   /* CP210x */
                {usbVendorId:0x067b}    /* PL2303 */
            ] }
        );
        await port.open({ baudRate: getElmt("baud").value, bufferSize});
        let settings = {};

        if (Object.keys(settings).length > 0) await port.setSignals(settings);
        writer = port.writable.getWriter();
        btnConn.className = "connOk";
        btnConn.disabled = true;
        await listenToPort();
    } catch (e){
        btnConn.className = "connNy";
        btnConn.disabled = false;
        alert("設備連線異常, 原因：" + e);
    }
}

async function sendSerialLine() {
    dataToSend = getElmt("lineToSend").value;
    lineHistory.unshift(dataToSend);
    historyIndex = -1; // No history entry selected
    await sendWithEot(dataToSend);
    getElmt("lineToSend").value = "";
}

async function listenToPort() {
    var buffer = new ArrayBuffer(bufferSize);
    const reader = port.readable.getReader({mode: "byob"});
    // let buffer = new ArrayBuffer(bufferSize);
    while (port.readable) {
        let offset = 0;
        while (offset < buffer.byteLength) {
            const { value, done } = await reader.read(
                new Uint8Array(buffer, offset)
            );
            if (done) {
                console.log('[readLoop] DONE', done);
                break;
            }
            buffer = value.buffer;
            offset += value.byteLength;
            console.log(offset);
            if (offset > 3) {
                // 取得倒數3個
                let t = new Uint8Array(buffer.slice(offset-3, offset));
                if (t[0]==0xfd && t[1]==0xfe && t[2]==0xff) {
                    // 直接截掉eot
                    let data = new Uint8Array(buffer.slice(0, offset-3));
                    appendToTerminal(data);
                    break
                }
            }
        }
    }
}

const serialResultsDiv = getElmt("serialResults");
async function appendToTerminal(newStuff) {
    let data = u8AsStr(newStuff);
    serialResultsDiv.innerHTML += data;
    if (serialResultsDiv.innerHTML.length > 300){
        serialResultsDiv.innerHTML = serialResultsDiv.innerHTML.slice(serialResultsDiv.innerHTML.length - 300);
    }
    //scroll down to bottom of div
    serialResultsDiv.scrollTop = serialResultsDiv.scrollHeight;
}

function scrollHistory(direction) {
    // Clamp the value between -1 and history length
    historyIndex = Math.max(Math.min(historyIndex + direction, lineHistory.length - 1), -1);
    if (historyIndex >= 0) {
        getElmt("lineToSend").value = lineHistory[historyIndex];
    } else {
        getElmt("lineToSend").value = "";
    }
}

function strAsU8(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    return data;
}

function u8AsStr(ar) {
    const decoder = new TextDecoder();
    const data = decoder.decode(ar)
    return data
}

function addEot(ar) {
    const newArray = new Uint8Array(ar.length + 3);
    newArray.set(ar);
    newArray.set(eot, ar.length);
    return newArray;
}

async function sendWithEot(str) {
    if (port && port.writable) {
        let data = strAsU8(str);
        await writer.write(addEot(data));
    } else {
        alert("請先正確連線！");
    }
}

getElmt("lineToSend").addEventListener("keyup", async function (event) {
    if (event.keyCode === 13) {
        sendSerialLine();
    } else if (event.keyCode === 38) { // Key up
        scrollHistory(1);
    } else if (event.keyCode === 40) { // Key down
        scrollHistory(-1);
    }
})
getElmt("baud").value = (localStorage.baud == undefined ? 9600 : localStorage.baud);
