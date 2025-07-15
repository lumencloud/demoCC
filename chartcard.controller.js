const w = 1200;
const h = 800;

const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

const width = window.innerWidth
    ? window.innerWidth
    : document.documentElement.clientWidth
    ? document.documentElement.clientWidth
    : screen.width;

const height = window.innerHeight
    ? window.innerHeight
    : document.documentElement.clientHeight
    ? document.documentElement.clientHeight
    : screen.height;

const left = dualScreenLeft + (width - w) / 2;
const top = dualScreenTop + (height - h) / 2;

const newTabConfig = `width=${w},height=${h},top=${top},left=${left},scrollbars=yes,resizable=yes`;
