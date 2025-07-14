import { createContext } from "react";

type User = {
  id: number;
  username: string;
  email: string;
};


type AuthContextType = {
  user: User | null;
  setUser: (user: User) => void;
};

 export const AuthContext = createContext<AuthContextType | undefined>(undefined);
