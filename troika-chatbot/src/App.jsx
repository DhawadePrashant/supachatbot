// App.jsx
import React from "react";
import SupaChatbot from "./SupaChatbot";
import { StyleSheetManager } from "styled-components";

const App = ({ chatbotId, shadowRoot }) => {
  if (!chatbotId) return null;

  return (
    <StyleSheetManager target={shadowRoot}>
      <SupaChatbot
        chatbotId={chatbotId}
        apiBase="https://api.0804.in/api"
      />
    </StyleSheetManager>
  );
};

export default App;
