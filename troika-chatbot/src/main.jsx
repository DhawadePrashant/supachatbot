// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

function createShadowHost() {
  const host = document.createElement("supa-agent");
  // keep it near the end of <body> to sit above most theme elements
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  // (optional) load a font INSIDE shadow
  const font = document.createElement("link");
  font.rel = "stylesheet";
  font.href =
    "https://fonts.googleapis.com/css2?family=Amaranth&family=Poppins:wght@400;500;600&display=swap";
  shadow.appendChild(font);

  // (optional) load your external CSS INSIDE shadow (instead of document.head)
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "https://api.0804.in/chatbot-loader/troika-chatbot-ui.css";
  shadow.appendChild(css);

  // mount point inside shadow
  const mount = document.createElement("div");
  shadow.appendChild(mount);

  return { shadow, mount };
}

window.renderSupaChatbot = ({ chatbotId }) => {
  const { shadow, mount } = createShadowHost();

  ReactDOM.createRoot(mount).render(
    <React.StrictMode>
      <App chatbotId={chatbotId} shadowRoot={shadow} />
    </React.StrictMode>
  );
};
