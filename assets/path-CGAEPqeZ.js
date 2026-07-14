const s="/dreamgate/";function n(t){if(t.startsWith("http://")||t.startsWith("https://"))return t;const r=s.endsWith("/")?s:`${s}/`,e=t.startsWith("/")?t.slice(1):t;return`${r}${e}`}export{n as p};
