import Home from "./components/record";
import VoiceRecorder from "./components/recorder";
import Register from "./components/register";
import {Route,Routes} from 'react-router-dom';
import { AuthProvider } from "./context/auth";
import Login from "./components/login";

const App: React.FC = () => {


  return (
      <AuthProvider>

        <Routes>
          <Route path="/home" element={<Home/>}/>
            <Route path="/" element={<Register/>}/>
            <Route path="/login" element={<Login/>}/>

            <Route path="/record" element={<VoiceRecorder/>}/>
            <Route path="/:username" element={<VoiceRecorder/>}/>

        </Routes>

      </AuthProvider>

      
  );
};

export default App;
