// Taken from https://developer.mozilla.org/en-US/docs/Glossary/Base64#Solution_.232_.E2.80.93_rewriting_atob%28%29_and_btoa%28%29_using_TypedArrays_and_UTF-8
async function bytesToBase64DataUrl(bytes, type = "application/octet-stream") {
  return await new Promise((resolve, reject) => {
    const reader = Object.assign(new FileReader(), {
      onload: () => resolve(reader.result),
      onerror: () => reject(reader.error),
    });
    reader.readAsDataURL(new File([bytes], "", { type }));
  });
}

async function dataUrlToBytes(dataUrl) {
  const res = await fetch(dataUrl);
  return new Uint8Array(await res.arrayBuffer());
}


function shuffledBlocks(width, height, blockSize) {
    if (width % blockSize !== 0 || height % blockSize !== 0) {
        throw new Error("Width and height must be multiples of blockSize!");
    }

    const blocks = [];
    const totalBlocksX = Math.floor(width / blockSize);
    const totalBlocksY = Math.floor(height / blockSize);
    const totalBlocks = totalBlocksX * totalBlocksY;

    for (let i = 0; i < totalBlocks; i++) {
        let x = i % totalBlocksX;
        let y = Math.floor(i / totalBlocksX);
        blocks.push([x, y]);
        let randomIndex = Math.floor(Math.random() * (i + 1));
        [blocks[i], blocks[randomIndex]] = [blocks[randomIndex], blocks[i]];
    }

    return blocks;
}

async function decodeImg(key) {
    const canvas = document.getElementById("picture");
    if(canvas === null) {
            return;
    }
    canvas.oncontextmenu = () => false;

    const ctx = canvas.getContext("2d");
    HTMLCanvasElement.prototype.getContext = () => {};
    
        
    const img = new Uint8ClampedArray(await dataUrlToBytes(canvas.dataset.img));
    const imgData = new ImageData(img, canvas.width, canvas.height);
    ctx.putImageData(imgData, 0, 0);

    const dec = new Uint8ClampedArray(await crypto.subtle.decrypt(
        {
            name: "AES-CTR",
            counter: new Uint8Array(16),
            length: 128 
        },
        key,
        img
    ));
    const decData = new ImageData(dec, canvas.width, canvas.height);

    const blockSize = 64;
    const blocks = shuffledBlocks(canvas.width, canvas.height, blockSize);
    for (const [bx, by] of blocks) {
            x = bx*blockSize;
            y = by*blockSize;
            ctx.putImageData(decData, 0, 0, x, y, blockSize, blockSize);
            await new Promise((resolve) => setTimeout(resolve, 25));
    }
}

async function decodeEmail(key) {
    const emails = document.querySelectorAll(".email");
    for (const a of emails) {
        const enc = await dataUrlToBytes(a.getAttribute("data-email"));
        const dec = new Uint8ClampedArray(await crypto.subtle.decrypt(
            {
                name: "AES-CTR",
                counter: new Uint8Array(16),
                length: 128 
            },
            key,
            enc
        ));

        const email = new TextDecoder().decode(dec);
        a.innerText = email;
        a.href = `mailto:${email}`; 
    };
}

async function getKey() {
    hostname = new TextEncoder().encode(window.location.hostname);
    padding = new Uint8Array(32);
    const keyBytes  = new Uint8Array(hostname.length + padding.length);
    keyBytes.set(hostname);
    keyBytes.set(padding, hostname.length);
    const key = await crypto.subtle.importKey(
        "raw",
        keyBytes.slice(0, 32),
        {name: "AES-CTR"},
        true,
        ["encrypt", "decrypt"]
    );
    return key;
}

window.onload = async () => {
        HTMLCanvasElement.prototype.toDataURL = () => {};
        HTMLCanvasElement.prototype.toBlob = () => {};
        HTMLCanvasElement.prototype.captureStream = () => {};

        const key = await getKey();
        decodeEmail(key);
        decodeImg(key);
}
