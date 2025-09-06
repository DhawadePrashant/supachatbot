import SupaChatbot from "./SupaChatbot"


function App() {

  return (
    <>
     <SupaChatbot
     chatbotId={"68ad8affb0bb3ffa06bc9835"}
    //  apiBase={"https://api.0804.in/api"}
     apiBase={"http://localhost:5000/api"}
     
     />
    </>
  )
}

export default App
