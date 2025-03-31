var port, writer;
function getElmt(e) {return document.getElementById(e);}

const bufferSize = 512;
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
        // await port.open({ baudRate: getElmt("baud").value});
        await port.open({ baudRate: getElmt("baud").value, bufferSize});
        let settings = {};

        // if (localStorage.dtrOn == "true") settings.dataTerminalReady = true;
        // if (localStorage.rtsOn == "true") settings.requestToSend = true;
        if (Object.keys(settings).length > 0) await port.setSignals(settings);
        
        writer = port.writable.getWriter();
        writer.write(addEot(strAsU8(';hello')));
        setTimeout(()=>{
            writer.write(addEot(strAsU8(';shei')));
        }, 500);
        btnConn.className = "connOk";
        btnConn.disabled = true;
        btnConn.innerText = "已連線";
        await listenToPort();
    } catch (e){
        btnConn.className = "connNy";
        btnConn.disabled = false;
        btnConn.innerText = "連接設備";
        alert("設備連線異常, 原因：" + e);
    }
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
                // Allow the serial port to be closed later.
                console.log('[readLoop] DONE', done);
                // reader.releaseLock();
                break;
            }
            buffer = value.buffer;
            offset += value.byteLength;
            console.log(offset);
            if (offset > 3) {
                // 取得倒數3個
                let t = new Uint8Array(buffer.slice(offset-3, offset));
                if (t[0]==0xfd && t[1]==0xfe && t[2]==0xff) {
                    let data = new Uint8Array(buffer.slice(0, offset-3));
                    // console.log(u8AsStr(data));
                    wasmBindings.zegama_parse(data);
                    break
                }
            }
        }
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
    newArray.set(new Uint8Array([0xfd, 0xfe, 0xff]), ar.length);
    return newArray;
}

function isConnected() {
    if (port && port.writable) return true;
    else return false;
}

function debounceMs(n, ms) {
    var target = getElmt(n);
    target.disabled = true;
    setTimeout(()=>{
        target.disabled = false;
    }, ms)
}

const baudList = getElmt("baudList");
bl = [9600, 14400, 19200, 38400, 57600, 115200];
bl.forEach((e)=>{
    const newOption = document.createElement("option");
    newOption.value = e;
    baudList.appendChild(newOption);
});
getElmt("baud").value = (localStorage.baud == undefined ? 9600 : localStorage.baud);

const baud = getElmt("baud");
const btnConn = getElmt("btnConn");

baud.onclick = ()=>{baud.value=""};
baud.onchange = ()=>{localStorage.baud = baud.value};
btnConn.onclick = connectSerial;


var kVars = {};
for(var idx=1; idx<=3; idx++){
    var r_nme = "k"+idx+"OfstRng";
    var v_nme = "k"+idx+"OfstVal";
    kVars[r_nme] = getElmt(r_nme);
    kVars[v_nme] = getElmt(v_nme);
}

function addPlus(n) {
    if(n >= 0) n = "+"+n;
    return n;
}

function setOfstVal(idx, v) {
    var r_nme = "k"+idx+"OfstRng";
    var v_nme = "k"+idx+"OfstVal";
    kVars[r_nme].value = v;
    kVars[v_nme].innerHTML = addPlus(v);

}

function getOfstVal(idx) {
    var r_nme = "k"+idx+"OfstRng";
    return kVars[r_nme].value;
}

function setKQuanity(kq) {
    getElmt("kQuanity").value = kq;
}

function getKQuanity() {
    return getElmt("kQuanity").value;
}

function setMode(mode) {
    return getElmt("bootMode").value = mode;
}

function getMode() {
    return getElmt("bootMode").value;
}

var tmRslt;
function showRslt(msg, ok) {
    clearTimeout(tmRslt);
    var runRslt = getElmt("runRslt");
    runRslt.innerText = msg;
    if (ok) runRslt.style.color = "green";
    else runRslt.style.color = "brown";
    tmRslt = setTimeout(()=>{
        runRslt.innerText = "";
    }, 1500);
}

function showMacAddr(mac) {
    var ma = getElmt("ma");
    ma.innerText = mac;
}

kVars["k1OfstRng"].oninput = ()=> {
    kVars["k1OfstVal"].innerHTML = addPlus(kVars["k1OfstRng"].value);
}
kVars["k2OfstRng"].oninput = ()=> {
    kVars["k2OfstVal"].innerHTML = addPlus(kVars["k2OfstRng"].value);
}
kVars["k3OfstRng"].oninput = ()=> {
    kVars["k3OfstVal"].innerHTML = addPlus(kVars["k3OfstRng"].value);
}

